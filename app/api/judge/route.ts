import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { v4 as uuidv4 } from "uuid";
import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";
import ffmpeg from "fluent-ffmpeg";

// Allow large video uploads (50MB)
export const config = {
    api: {
        bodyParser: false,
        responseLimit: false,
    },
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Ensure tmp directory exists
const TMP_DIR = join(tmpdir(), "agentic-judges");

async function ensureTmpDir() {
    try {
        await mkdir(TMP_DIR, { recursive: true });
    } catch {
        // directory already exists
    }
}

// Extract audio from video using ffmpeg
function extractAudio(videoPath: string, audioPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .noVideo()
            .audioCodec("pcm_s16le")
            .audioFrequency(16000)
            .audioChannels(1)
            .format("wav")
            .output(audioPath)
            .on("end", () => resolve())
            .on("error", (err: Error) => reject(err))
            .run();
    });
}

// Transcribe audio using Groq Whisper
async function transcribeAudio(audioPath: string): Promise<string> {
    const fs = await import("fs");
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
        await ensureTmpDir();

        // 1. Parse the uploaded file
        const formData = await request.formData();
        const file = formData.get("video") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No video file provided" }, { status: 400 });
        }

        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 50MB." },
                { status: 400 }
            );
        }

        // Validate file type
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

        // 2. Save video to temp directory
        const id = uuidv4();
        const ext = file.name.split(".").pop() || "mp4";
        videoPath = join(TMP_DIR, `${id}.${ext}`);
        audioPath = join(TMP_DIR, `${id}.wav`);

        const bytes = await file.arrayBuffer();
        await writeFile(videoPath, Buffer.from(bytes));

        // 3. Extract audio with ffmpeg
        await extractAudio(videoPath, audioPath);

        // 4. Transcribe with Groq Whisper
        const transcript = await transcribeAudio(audioPath);

        if (!transcript || transcript.trim().length === 0) {
            return NextResponse.json(
                { error: "Could not transcribe audio. The video may have no speech." },
                { status: 422 }
            );
        }

        // 5. Judge with Groq LLM
        const { feedback, score } = await judgeContent(transcript.trim());

        // 6. Save to Supabase
        const { error: dbError } = await supabase.from("judgments").insert({
            id,
            video_filename: file.name,
            transcript: transcript.trim(),
            feedback,
            score,
        });

        if (dbError) {
            console.error("Supabase error:", dbError);
            // Don't fail the request if DB save fails — still return the result
        }

        // 7. Return response
        return NextResponse.json({
            id,
            video_filename: file.name,
            transcript: transcript.trim(),
            feedback,
            score,
            created_at: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Judge API error:", error);
        return NextResponse.json(
            { error: "Failed to process video. Please try again." },
            { status: 500 }
        );
    } finally {
        // Cleanup temp files
        try {
            if (videoPath) await unlink(videoPath);
            if (audioPath) await unlink(audioPath);
        } catch {
            // ignore cleanup errors
        }
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
