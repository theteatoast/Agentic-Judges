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

  // Fetch history on load
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
      setError("Please upload a valid vide file (MP4, MOV, WebM).");
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

    // Simulate step progression
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
      fetchHistory(); // Refresh history
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

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <Orb
          hoverIntensity={2}
          rotateOnHover
          hue={0}
          forceHoverState={false}
          backgroundColor="#000000"
        />
      </div>
      <nav className="navbar animate-float">
        <div className="nav-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Agentic Judge
        </div>
        <div className="nav-links">
          <a href="#" className="nav-link">How it Works</a>
          <a href="#" className="nav-link">Pricing</a>
          <a href="#" className="nav-link">Docs</a>
        </div>
        <button className="nav-cta">Sign In</button>
      </nav>

      <div className="container">
        {/* Hero Section */}
        <section className="hero">
          <div className="badge">
            <span style={{ color: 'var(--accent-primary)' }}>✨</span>
            AI Analysis v1.0 Now Live • Try it Free →
          </div>
          <h1>
            Master Your Video Content<br />
            with Instant AI Feedback
          </h1>
          <p>
            Stop guessing if your content lands. Get actionable scores on clarity,
            engagement, and delivery in seconds powered by advanced LLMs.
          </p>

          <div className="hero-actions">
            <button className="btn btn-outline" onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })}>
              View Recent Analysis
            </button>
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
              Judge My Video →
            </button>
          </div>
        </section>

        {/* Upload Container (Glassmorphism) */}
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
                  <div style={{ marginBottom: '16px', color: 'var(--accent-primary)' }}>
                    <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: 'white' }}>
                    Upload Video for Analysis
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                    Drag & drop or click to browse (MP4, MOV, MKV)
                  </p>
                </>
              ) : (
                <div className="file-ready">
                  <h3 style={{ color: 'var(--accent-primary)', fontSize: '24px', marginBottom: '8px' }}>{file.name}</h3>
                  <p style={{ color: 'white', opacity: 0.8 }}>{formatFileSize(file.size)} • Ready to process</p>

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
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{
                width: '60px', height: '60px',
                border: '4px solid rgba(255,255,255,0.1)',
                borderTopColor: 'var(--accent-primary)',
                borderRadius: '50%',
                margin: '0 auto 24px',
                animation: 'spin 1s linear infinite'
              }} />
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Processing Video</h3>
              <p style={{ color: '#94a3b8' }}>{processingSteps[processingStep] || "Finalizing..."}</p>
            </div>
          )}

          {/* Results Grid */}
          {displayResult && !loading && (
            <div className="results-grid">
              {/* Score Card */}
              <div className="glass-card" style={{ gridColumn: 'span 4', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: '16px' }}>Overall Score</div>
                <div style={{ fontSize: '80px', fontWeight: '800', lineHeight: '1', color: 'white', marginBottom: '16px' }}>
                  {displayResult.score}
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${displayResult.score}%`, background: 'var(--accent-primary)' }} />
                </div>
                <button
                  onClick={handleReset}
                  className="btn btn-outline"
                  style={{ marginTop: '24px', fontSize: '14px', padding: '8px 16px', width: '100%' }}
                >
                  New Analysis
                </button>
              </div>

              {/* Details Card */}
              <div className="glass-card" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', color: 'var(--accent-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                    AI Feedback
                  </h3>
                  <div style={{ fontSize: '15px', lineHeight: '1.7', color: '#cbd5e1' }}>
                    {displayResult.feedback}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: 'var(--accent-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                    Transcript
                  </h3>
                  <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#94a3b8', maxHeight: '150px', overflowY: 'auto', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    {displayResult.transcript}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History Section */}
        <div style={{ marginTop: '80px', marginBottom: '80px' }}>
          <h2 style={{ fontSize: '24px', textAlign: 'center', marginBottom: '32px' }}>Recent Analyses</h2>
          {history.length > 0 ? (
            <div className="results-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {history.map((item) => (
                <div
                  key={item.id}
                  className="glass-card"
                  style={{ cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => {
                    setSelectedHistory(item);
                    setResult(null);
                    setFile(null);
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.video_filename}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{formatDate(item.created_at)}</div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-primary)' }}>{item.score}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8' }}>No history yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
