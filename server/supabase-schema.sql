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

