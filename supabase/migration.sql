-- Create the judgments table for Agentic Judge
CREATE TABLE IF NOT EXISTS judgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_filename TEXT NOT NULL,
  transcript TEXT NOT NULL,
  feedback TEXT NOT NULL,
  score INTEGER CHECK (score >= 1 AND score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional, disable for MVP)
-- ALTER TABLE judgments ENABLE ROW LEVEL SECURITY;

-- Create index for ordering by date
CREATE INDEX idx_judgments_created_at ON judgments (created_at DESC);
