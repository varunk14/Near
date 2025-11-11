-- Fix studios table: Add missing user_id column
-- Run this in Supabase SQL Editor

-- Add user_id column if it doesn't exist
ALTER TABLE studios 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_studios_user_id ON studios(user_id);

-- Update RLS policies if needed (drop and recreate to ensure they're correct)
DROP POLICY IF EXISTS "Anyone can read studios" ON studios;
DROP POLICY IF EXISTS "Authenticated users can create studios" ON studios;
DROP POLICY IF EXISTS "Users can update their own studios" ON studios;
DROP POLICY IF EXISTS "Users can delete their own studios" ON studios;

-- Recreate policies
CREATE POLICY "Anyone can read studios"
  ON studios
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create studios"
  ON studios
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own studios"
  ON studios
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own studios"
  ON studios
  FOR DELETE
  USING (auth.uid() = user_id);

