import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";
import ffmpeg from "fluent-ffmpeg";

// Allow large video uploads (50MB) - Configured in next.config.ts

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const { spawn } = require("child_process");

// Extract audio from video using native ffmpeg spawn
function extractAudio(videoPath: string, audioPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`[judge] CWD: ${process.cwd()}`);
        console.log(`[judge] ffmpeg input: ${videoPath}`);
        console.log(`[judge] ffmpeg output: ${audioPath}`);

        // First check if ffmpeg is verifying
        const check = spawn("ffmpeg", ["-version"]);
        check.on("error", (err: Error) => {
            console.error("[judge] Error spawning ffmpeg (version check):", err);
        });

        const args = [
            "-i", videoPath,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            "-f", "wav",
            "-y", // force overwrite
            audioPath
        ];

        console.log(`[judge] Spawning: ffmpeg ${args.join(" ")}`);

        const ffmpegProcess = spawn("ffmpeg", args);

        let stderr = "";
        ffmpegProcess.stderr.on("data", (data: Buffer) => {
            stderr += data.toString();
        });

        ffmpegProcess.on("close", (code: number) => {
            if (code === 0) {
                console.log("[judge] ffmpeg success");
                resolve();
            } else {
                console.error(`[judge] ffmpeg failed with code ${code}`);
                // Check if error is due to missing audio stream
                if (stderr.includes("Output file does not contain any stream")) {
                    reject(new Error("No audio track found in the video. Please upload a video with sound."));
                } else {
                    console.error(`[judge] ffmpeg stderr:\n${stderr}`);
                    reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
                }
            }
        });

        ffmpegProcess.on("error", (err: Error) => {
            console.error("[judge] Failed to start ffmpeg process:", err);
            reject(err);
        });
    });
}

// Transcribe audio using Groq Whisper
async function transcribeAudio(audioPath: string): Promise<string> {
    const fs = await import("fs");
    // fs.createReadStream works with relative paths in CWD
    const file = fs.createReadStream(audioPath);

    const transcription = await groq.audio.transcriptions.create({
        file: file,
        model: "whisper-large-v3-turbo",
        language: "en",
        response_format: "text",
    });

    return transcription as unknown as string;
}

// Judge content using Groq LLM
async function judgeContent(
    transcript: string
): Promise<{ feedback: string; score: number }> {
    // ... (same as before) ...
    const systemPrompt = `You are an expert content judge and coach. Your role is to evaluate spoken content from videos and provide actionable feedback.

Evaluate the content on these criteria:
1. **Clarity** (Is the message clear and easy to follow?)
2. **Engagement** (Is it interesting and attention-grabbing?)
3. **Structure** (Is it well-organized with a clear beginning, middle, and end?)
4. **Delivery** (Based on the transcript, does the speaker seem confident and natural?)
5. **Value** (Does the content provide value to the audience?)

You MUST respond in this exact JSON format:
{
  "score": <number from 1-100>,
  "feedback": "<Your detailed feedback as a single string with sections separated by newlines>"
}

Be constructive, specific, and encouraging. Give practical tips for improvement.`;

    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: systemPrompt },
            {
                role: "user",
                content: `Please judge the following video transcript:\n\n"${transcript}"`,
            },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    try {
        const parsed = JSON.parse(content);
        return {
            feedback: parsed.feedback || "No feedback generated.",
            score: Math.min(100, Math.max(1, parseInt(parsed.score) || 50)),
        };
    } catch {
        return { feedback: content, score: 50 };
    }
}

export async function POST(request: NextRequest) {
    let videoPath = "";
    let audioPath = "";

    try {
        // ... (file parsing logic remains) ...
        // 1. Parse the uploaded file
        console.log("[judge] Parsing form data...");
        const formData = await request.formData();
        const file = formData.get("video") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No video file provided" }, { status: 400 });
        }

        console.log(`[judge] File received: ${file.name} (${file.size} bytes, type: ${file.type})`);

        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 50MB." },
                { status: 400 }
            );
        }

        // ... (validation checks) ...
        const validTypes = [
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "video/x-msvideo",
            "video/x-matroska",
        ];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Please upload an MP4, WebM, MOV, AVI, or MKV file." },
                { status: 400 }
            );
        }

        // 2. Save video to ROOT directory
        const id = uuidv4();
        const ext = file.name.split(".").pop() || "mp4";
        videoPath = `${id}.${ext}`;
        audioPath = `${id}.wav`;

        console.log(`[judge] Saving video to ${videoPath}`);
        const bytes = await file.arrayBuffer();
        await writeFile(videoPath, Buffer.from(bytes));
        console.log("[judge] Video saved successfully.");

        // 3. Extract audio with ffmpeg
        console.log("[judge] Extracting audio with ffmpeg...");
        await extractAudio(videoPath, audioPath);
        console.log("[judge] Audio extracted successfully.");

        // 4. Transcribe...
        console.log("[judge] Transcribing with Groq Whisper...");
        const transcript = await transcribeAudio(audioPath);
        console.log(`[judge] Transcript received: "${String(transcript).substring(0, 100)}..."`);

        if (!transcript || String(transcript).trim().length === 0) {
            throw new Error("No speech detected in video.");
        }

        // 5. Judge...
        console.log("[judge] Sending to Groq LLM...");
        const { feedback, score } = await judgeContent(String(transcript).trim());

        // 6. Save...
        const { error: dbError } = await supabase.from("judgments").insert({
            id, video_filename: file.name, transcript: String(transcript).trim(), feedback, score
        });
        if (dbError) console.error("[judge] Supabase error:", dbError);

        return NextResponse.json({
            id, video_filename: file.name, transcript: String(transcript).trim(), feedback, score, created_at: new Date().toISOString()
        });

    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("[judge] ❌ API error:", errMsg);

        if (errMsg.includes("No audio track found") || errMsg.includes("No speech detected")) {
            return NextResponse.json({ error: errMsg }, { status: 422 });
        }

        return NextResponse.json(
            { error: `Failed to process video: ${errMsg}` },
            { status: 500 }
        );
    } finally {
        try {
            if (videoPath) await unlink(videoPath);
            if (audioPath) await unlink(audioPath);
        } catch { }
    }
}

// GET: Fetch past judgments
export async function GET() {
    try {
        const { data, error } = await supabase
            .from("judgments")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) {
            return NextResponse.json({ error: "Failed to fetch judgments" }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: "Failed to fetch judgments" }, { status: 500 });
    }
}
