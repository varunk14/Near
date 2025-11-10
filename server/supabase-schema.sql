-- Supabase Database Schema for Near
-- Run this SQL in your Supabase SQL Editor

-- Create Studios table (MVP 9: Added user_id for authentication)
CREATE TABLE IF NOT EXISTS studios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- MVP 9: Link to authenticated user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_studios_created_at ON studios(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

-- MVP 9: Updated policies for authentication
-- Anyone can read studios (for joining)
CREATE POLICY "Anyone can read studios"
  ON studios
  FOR SELECT
  USING (true);

-- Only authenticated users can create studios
CREATE POLICY "Authenticated users can create studios"
  ON studios
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update/delete their own studios
CREATE POLICY "Users can update their own studios"
  ON studios
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own studios"
  ON studios
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create Recordings table (MVP 8, MVP 9: Added owner_id, MVP 10: Added final_file_path)
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
  recording_id TEXT NOT NULL UNIQUE, -- The unique recording ID (e.g., rec_1234567890_abc123)
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- MVP 9: Studio owner (who created the studio)
  user_id TEXT, -- The user ID from the WebRTC session (e.g., user_1234567890_xyz)
  user_name TEXT, -- Optional user name
  file_paths TEXT[] NOT NULL, -- Array of R2 file paths (chunks)
  final_file_path TEXT, -- MVP 10: Path to the merged final file
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
CREATE INDEX IF NOT EXISTS idx_recordings_owner_id ON recordings(owner_id); -- MVP 9
CREATE INDEX IF NOT EXISTS idx_studios_user_id ON studios(user_id); -- MVP 9

-- Enable Row Level Security (RLS)
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- MVP 9: Updated policies for authentication
-- Users can read recordings from studios they own
CREATE POLICY "Users can read their own recordings"
  ON recordings
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Anyone can create recordings (guests can record in studios)
CREATE POLICY "Anyone can create recordings"
  ON recordings
  FOR INSERT
  WITH CHECK (true);

-- Users can update recordings from their studios
CREATE POLICY "Users can update their own recordings"
  ON recordings
  FOR UPDATE
  USING (auth.uid() = owner_id);

