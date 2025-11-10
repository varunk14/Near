-- Supabase Database Schema for Near
-- Run this SQL in your Supabase SQL Editor

-- Create Studios table
CREATE TABLE IF NOT EXISTS studios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_studios_created_at ON studios(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read studios
CREATE POLICY "Anyone can read studios"
  ON studios
  FOR SELECT
  USING (true);

-- Create a policy that allows anyone to insert studios
CREATE POLICY "Anyone can create studios"
  ON studios
  FOR INSERT
  WITH CHECK (true);

-- Note: For MVP 5, we're allowing public access.
-- In MVP 9, we'll add user authentication and restrict access.

-- Create Recordings table (MVP 8)
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
  recording_id TEXT NOT NULL UNIQUE, -- The unique recording ID (e.g., rec_1234567890_abc123)
  user_id TEXT, -- The user ID from the WebRTC session (e.g., user_1234567890_xyz)
  user_name TEXT, -- Optional user name
  file_paths TEXT[] NOT NULL, -- Array of R2 file paths (chunks)
  chunk_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'recording', -- 'recording', 'completed', 'processing', 'ready'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_recordings_studio_id ON recordings(studio_id);
CREATE INDEX IF NOT EXISTS idx_recordings_recording_id ON recordings(recording_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read recordings (for now)
CREATE POLICY "Anyone can read recordings"
  ON recordings
  FOR SELECT
  USING (true);

-- Create a policy that allows anyone to insert recordings
CREATE POLICY "Anyone can create recordings"
  ON recordings
  FOR INSERT
  WITH CHECK (true);

-- Create a policy that allows anyone to update recordings
CREATE POLICY "Anyone can update recordings"
  ON recordings
  FOR UPDATE
  USING (true);

-- Note: In MVP 9, we'll restrict access based on user authentication.

