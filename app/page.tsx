"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface JudgmentResult {
  id: string;
  video_filename: string;
  transcript: string;
  feedback: string;
  score: number;
  created_at: string;
}

function scoreClass(score: number): string {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
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
      setError("Please drop a valid video file.");
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
    { label: "Extracting audio from video...", icon: "🎵" },
    { label: "Transcribing speech with AI...", icon: "📝" },
    { label: "Analyzing content quality...", icon: "🧠" },
    { label: "Generating feedback...", icon: "✨" },
  ];

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-badge">
          <span className="header-badge-dot" />
          AI-Powered
        </div>
        <h1>Agentic Judge</h1>
        <p>
          Upload your video and get instant AI feedback on clarity, engagement,
          and overall content quality.
        </p>
      </header>

      {/* Error */}
      {error && (
        <div className="error-card fade-in-up">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* Processing */}
      {loading && (
        <div className="processing-card fade-in-up">
          <div className="processing-spinner" />
          <h3>Analyzing Your Video</h3>
          <p>This may take a moment...</p>
          <div className="processing-steps">
            {processingSteps.map((step, i) => (
              <div
                key={i}
                className={`processing-step ${i < processingStep
                    ? "done"
                    : i === processingStep
                      ? "active"
                      : ""
                  }`}
              >
                <span className="processing-step-icon">
                  {i < processingStep ? "✓" : step.icon}
                </span>
                {step.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {displayResult && !loading && (
        <div className="results-section fade-in-up">
          <div className="results-header">
            <h2>
              {selectedHistory ? "📋 Past Judgment" : "✨ Judgment Results"}
            </h2>
            <button className="new-btn" onClick={handleReset}>
              + New Upload
            </button>
          </div>

          {/* Score */}
          <div className="score-card fade-in-up delay-1">
            <div className={`score-value ${scoreClass(displayResult.score)}`}>
              {displayResult.score}
            </div>
            <div className="score-label">Overall Score</div>
            <div className="score-bar-container">
              <div
                className={`score-bar ${scoreClass(displayResult.score)}`}
                style={{ width: `${displayResult.score}%` }}
              />
            </div>
          </div>

          {/* Feedback */}
          <div className="detail-card fade-in-up delay-2">
            <div className="detail-card-header">
              <span className="detail-card-icon">💬</span>
              <span className="detail-card-title">AI Feedback</span>
            </div>
            <div className="detail-card-content">{displayResult.feedback}</div>
          </div>

          {/* Transcript */}
          <div className="detail-card fade-in-up delay-3">
            <div className="detail-card-header">
              <span className="detail-card-icon">📝</span>
              <span className="detail-card-title">Transcript</span>
            </div>
            <div className="detail-card-content">{displayResult.transcript}</div>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {!loading && !displayResult && (
        <>
          <div
            className={`upload-zone ${dragging ? "dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-zone-content">
              <span className="upload-icon">🎬</span>
              <h3>Drop your video here</h3>
              <p>or click to browse files</p>
              <p className="file-types">
                MP4, WebM, MOV, AVI, MKV • Max 60 seconds • Max 50MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="upload-input"
              onChange={handleFileSelect}
            />
          </div>

          {/* Selected File */}
          {file && (
            <div className="selected-file fade-in-up">
              <span className="selected-file-icon">🎥</span>
              <div className="selected-file-info">
                <div className="selected-file-name">{file.name}</div>
                <div className="selected-file-size">
                  {formatFileSize(file.size)}
                </div>
              </div>
              <button className="selected-file-remove" onClick={handleReset}>
                ✕
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={!file || loading}
          >
            {loading ? "Processing..." : "🚀 Judge My Content"}
          </button>
        </>
      )}

      {/* History */}
      <div className="history-section">
        <h2>
          <span>📚</span> Past Judgments
        </h2>
        {history.length === 0 ? (
          <div className="empty-state">
            No judgments yet. Upload your first video to get started!
          </div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div
                key={item.id}
                className="history-item"
                onClick={() => {
                  setSelectedHistory(item);
                  setResult(null);
                  setFile(null);
                  setError(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <div
                  className={`history-item-score ${scoreClass(item.score)}`}
                  style={{
                    color:
                      item.score >= 70
                        ? "var(--success)"
                        : item.score >= 40
                          ? "var(--warning)"
                          : "var(--danger)",
                  }}
                >
                  {item.score}
                </div>
                <div className="history-item-info">
                  <div className="history-item-name">
                    {item.video_filename}
                  </div>
                  <div className="history-item-date">
                    {formatDate(item.created_at)}
                  </div>
                </div>
                <span className="history-item-arrow">→</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
