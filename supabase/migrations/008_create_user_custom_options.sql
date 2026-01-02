-- Create table to store user's custom categories and statuses
CREATE TABLE IF NOT EXISTS user_custom_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('category', 'status')),
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, type, value)
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_custom_options_user_id ON user_custom_options(user_id);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_user_custom_options_type ON user_custom_options(type);

-- Enable Row Level Security
ALTER TABLE user_custom_options ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own custom options
CREATE POLICY "Users can view their own custom options"
  ON user_custom_options
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own custom options
CREATE POLICY "Users can insert their own custom options"
  ON user_custom_options
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own custom options
CREATE POLICY "Users can delete their own custom options"
  ON user_custom_options
  FOR DELETE
  USING (auth.uid() = user_id);

