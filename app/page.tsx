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
          Agentic Judge
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
            AI-Powered Video Analysis
          </div>
          <h1 className="hero-title">
            Judge Your Videos<br />
            with AI Precision
          </h1>
          <p className="hero-subtitle">
            Upload any video and get instant AI feedback on clarity,
            engagement, and delivery. Powered by advanced LLMs.
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
                    <div style={{ marginBottom: '14px', color: 'var(--accent-primary)' }}>
                      <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px', color: 'white' }}>
                      Upload Video for Analysis
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      Drag & drop or click to browse · MP4, MOV, MKV
                    </p>
                  </>
                ) : (
                  <div>
                    <h3 style={{ color: 'var(--accent-primary)', fontSize: '20px', fontWeight: '600', marginBottom: '6px' }}>{file.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{formatFileSize(file.size)} · Ready to analyze</p>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                        disabled={loading}
                      >
                        Start Analysis
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
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div className="spinner" />
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Processing Video</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{processingSteps[processingStep] || "Finalizing..."}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#f87171', fontSize: '14px' }}>
                {error}
              </div>
            )}

            {/* Results */}
            {displayResult && !loading && (
              <div className="results-grid">
                {/* Score */}
                <div className="glass-card" style={{ gridColumn: 'span 4', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>Score</div>
                  <div style={{ fontSize: '72px', fontWeight: '800', lineHeight: '1', color: 'white', marginBottom: '14px' }}>
                    {displayResult.score}
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginBottom: '20px' }}>
                    <div style={{
                      height: '100%',
                      width: `${displayResult.score}%`,
                      background: `linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))`,
                      borderRadius: '2px',
                      transition: 'width 1s ease'
                    }} />
                  </div>
                  <button
                    onClick={handleReset}
                    className="btn btn-outline"
                    style={{ fontSize: '13px', padding: '8px 16px', width: '100%' }}
                  >
                    New Analysis
                  </button>
                </div>

                {/* Details */}
                <div className="glass-card" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', color: 'var(--accent-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      AI Feedback
                    </h3>
                    <div style={{ fontSize: '14px', lineHeight: '1.7', color: '#cbd5e1' }}>
                      {displayResult.feedback}
                    </div>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '14px', color: 'var(--accent-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      Transcript
                    </h3>
                    <div style={{
                      fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)',
                      maxHeight: '140px', overflowY: 'auto',
                      padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px'
                    }}>
                      {displayResult.transcript}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Section */}
        <div id="history" style={{ paddingTop: '20px', paddingBottom: '100px' }}>
          <h2 className="section-title">Recent Analyses</h2>
          {history.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
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
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.video_filename}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatDate(item.created_at)}</div>
                  </div>
                  <div style={{
                    fontSize: '20px', fontWeight: '700',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginLeft: '16px'
                  }}>
                    {item.score}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
              No analyses yet. Upload a video to get started.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
