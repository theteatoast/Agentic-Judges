"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Orb from "./backgroundanimation";

interface JudgmentResult {
  id: string;
  video_filename: string;
  transcript: string;
  feedback: string;
  score: number;
  created_at: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface StructuredFeedback {
  summary?: string;
  clarity?: { score: number; comment: string };
  engagement?: { score: number; comment: string };
  structure?: { score: number; comment: string };
  delivery?: { score: number; comment: string };
  value?: { score: number; comment: string };
  tips?: string[];
}

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  clarity: { icon: '💡', color: '#a78bfa' },
  engagement: { icon: '🎯', color: '#f472b6' },
  structure: { icon: '🏗️', color: '#38bdf8' },
  delivery: { icon: '🎙️', color: '#34d399' },
  value: { icon: '💎', color: '#fbbf24' },
};

function parseFeedback(raw: string): StructuredFeedback | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.summary || parsed.clarity || parsed.tips) return parsed;
    return null;
  } catch {
    return null;
  }
}

function FeedbackDisplay({ result, onReset }: { result: JudgmentResult; onReset: () => void }) {
  const structured = parseFeedback(result.feedback);

  const categories = structured
    ? (['clarity', 'engagement', 'structure', 'delivery', 'value'] as const).filter(k => structured[k])
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top row: Score + Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px' }}>
        {/* Score card */}
        <div className="glass-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Overall Score</div>
          <div style={{
            fontSize: '64px', fontWeight: '800', lineHeight: '1', marginBottom: '12px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {result.score}
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{
              height: '100%', width: `${result.score}%`,
              background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
              borderRadius: '2px', transition: 'width 1s ease'
            }} />
          </div>
          <button onClick={onReset} className="btn btn-outline" style={{ fontSize: '13px', padding: '8px 14px', width: '100%' }}>
            New Analysis
          </button>
        </div>

        {/* Summary + Tips */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {structured?.summary && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✦ Summary
              </h3>
              <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#cbd5e1' }}>{structured.summary}</p>
            </div>
          )}
          {structured?.tips && structured.tips.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🚀 Tips to Improve
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {structured.tips.map((tip, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(167, 139, 250, 0.04)',
                    border: '1px solid rgba(167, 139, 250, 0.1)',
                    fontSize: '13px', lineHeight: '1.5', color: '#cbd5e1'
                  }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: '600', flexShrink: 0 }}>{i + 1}.</span>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Fallback for old plain-text feedback */}
          {!structured && (
            <div style={{ fontSize: '14px', lineHeight: '1.7', color: '#cbd5e1' }}>
              {result.feedback}
            </div>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      {categories.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {categories.map(key => {
            const cat = structured![key]!;
            const meta = CATEGORY_ICONS[key];
            return (
              <div key={key} className="glass-card" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'capitalize' }}>
                    {meta.icon} {key}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: meta.color }}>{cat.score}/10</span>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{
                    height: '100%', width: `${cat.score * 10}%`,
                    background: meta.color, borderRadius: '2px',
                    transition: 'width 0.8s ease'
                  }} />
                </div>
                <p style={{ fontSize: '12px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>{cat.comment}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Transcript */}
      <div className="glass-card">
        <h3 style={{ fontSize: '14px', color: 'var(--accent-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
          🎙️ Transcript
        </h3>
        <div style={{
          fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)',
          maxHeight: '160px', overflowY: 'auto',
          padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px'
        }}>
          {result.transcript}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [result, setResult] = useState<JudgmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<JudgmentResult[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<JudgmentResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/judge");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // silently fail
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      setFile(droppedFile);
      setError(null);
      setResult(null);
      setSelectedHistory(null);
    } else {
      setError("Please upload a valid video file (MP4, MOV, WebM).");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setResult(null);
      setSelectedHistory(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setProcessingStep(0);

    const stepTimer1 = setTimeout(() => setProcessingStep(1), 2000);
    const stepTimer2 = setTimeout(() => setProcessingStep(2), 5000);
    const stepTimer3 = setTimeout(() => setProcessingStep(3), 8000);

    try {
      const formData = new FormData();
      formData.append("video", file);

      const res = await fetch("/api/judge", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setResult(data);
      setFile(null);
      fetchHistory();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setLoading(false);
      setProcessingStep(0);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setSelectedHistory(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const displayResult = selectedHistory || result;

  const processingSteps = [
    "Extracting audio...",
    "Transcribing speech...",
    "Analyzing content...",
    "Finalizing report...",
  ];

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
      {/* ─── Navbar ─── */}
      <nav className="navbar">
        <div className="nav-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Evala
        </div>
        <div className="nav-links">
          <a href="#upload" className="nav-link">Upload</a>
          <a href="#history" className="nav-link">History</a>
        </div>
        <button className="nav-cta" onClick={scrollToUpload}>Get Started</button>
      </nav>

      {/* ─── Hero with Orb ─── */}
      <section className="hero-wrapper">
        <div className="hero-orb-container">
          <Orb
            hoverIntensity={2}
            rotateOnHover
            hue={0}
            forceHoverState={false}
            backgroundColor="#060010"
          />
        </div>

        <div className="hero-content">
          <div className="badge">
            <span className="badge-icon">✦</span>
            Agentic Content Feedback
          </div>
          <h1 className="hero-title">
            Your Personal<br />
            AI Judges
          </h1>
          <p className="hero-subtitle">
            Upload a video and get actionable feedback on what works, what doesn’t, and how to improve.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={scrollToUpload}>
              Start Judging
            </button>
            <button className="btn btn-outline" onClick={() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth" })}>
              View History
            </button>
          </div>
        </div>
      </section>

      {/* ─── Main Content ─── */}
      <div className="container">

        {/* Upload Section */}
        <div id="upload" ref={uploadRef} style={{ paddingTop: '40px' }}>
          <h2 style={{
            fontSize: '28px', fontWeight: '700', textAlign: 'center', marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            Upload & Analyze
          </h2>
          <p style={{
            textAlign: 'center', color: 'var(--text-secondary)', fontSize: '15px',
            marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px'
          }}>
            Drop your video and let the AI do the rest
          </p>

          <div className="upload-container">
            {!displayResult && !loading ? (
              <div
                className={`upload-zone-custom ${dragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {!file ? (
                  <>
                    {/* Upload icon with glow ring */}
                    <div style={{
                      width: '72px', height: '72px', borderRadius: '50%',
                      background: 'rgba(167, 139, 250, 0.08)',
                      border: '1px solid rgba(167, 139, 250, 0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 20px',
                    }}>
                      <svg width="28" height="28" fill="none" stroke="var(--accent-primary)" viewBox="0 0 24 24" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4" />
                        <path strokeLinecap="round" d="M20 16.7V19a2 2 0 01-2 2H6a2 2 0 01-2-2v-2.3" />
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '6px', color: 'white' }}>
                      Upload Video for Analysis
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '18px' }}>
                      Drag & drop or click to browse
                    </p>
                    {/* Format pills */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {['MP4', 'MOV', 'MKV', 'WebM'].map(fmt => (
                        <span key={fmt} style={{
                          fontSize: '11px', fontWeight: '500', padding: '4px 12px',
                          borderRadius: '100px', background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)',
                          letterSpacing: '0.5px'
                        }}>{fmt}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div>
                    {/* File ready icon */}
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '50%',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}>
                      <svg width="24" height="24" fill="none" stroke="var(--accent-secondary)" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{file.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{formatFileSize(file.size)}</p>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                        disabled={loading}
                      >
                        Analyze Now
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>
            ) : null}

            {/* Loading State */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '56px 24px' }}>
                <div className="spinner" />
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Analyzing Your Video</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{processingSteps[processingStep] || "Finalizing..."}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                textAlign: 'center', padding: '16px 20px', color: '#f87171', fontSize: '14px',
                background: 'rgba(248, 113, 113, 0.06)', borderRadius: '10px',
                border: '1px solid rgba(248, 113, 113, 0.15)', marginTop: '16px'
              }}>
                {error}
              </div>
            )}

            {/* Results */}
            {displayResult && !loading && (
              <FeedbackDisplay result={displayResult} onReset={handleReset} />
            )}
          </div>
        </div>

        {/* History Section */}
        <div id="history" style={{ paddingTop: '60px', paddingBottom: '100px' }}>
          <h2 style={{
            fontSize: '28px', fontWeight: '700', textAlign: 'center', marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            Recent Analyses
          </h2>
          <p style={{
            textAlign: 'center', color: 'var(--text-secondary)', fontSize: '15px',
            marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px'
          }}>
            Click any past analysis to view details
          </p>

          {history.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {history.map((item) => (
                <div
                  key={item.id}
                  className="history-card"
                  onClick={() => {
                    setSelectedHistory(item);
                    setResult(null);
                    setFile(null);
                    uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden', flex: 1 }}>
                    {/* Video file icon */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                      background: 'rgba(167, 139, 250, 0.08)',
                      border: '1px solid rgba(167, 139, 250, 0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="18" height="18" fill="none" stroke="var(--accent-primary)" viewBox="0 0 24 24" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{
                        fontWeight: '600', fontSize: '14px', marginBottom: '2px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {item.video_filename}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatDate(item.created_at)}</div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '22px', fontWeight: '800', marginLeft: '16px',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    {item.score}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
              background: 'rgba(14, 8, 30, 0.4)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <svg width="22" height="22" fill="none" stroke="var(--text-secondary)" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                No analyses yet. Upload a video to get started.
              </p>
            </div>
          )}
        </div>
      </div>

    </>
  );
}
