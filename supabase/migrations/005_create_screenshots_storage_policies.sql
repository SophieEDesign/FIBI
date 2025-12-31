-- Create storage policies for screenshots bucket
-- This assumes the 'screenshots' bucket already exists

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can upload their own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can read screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own screenshots" ON storage.objects;

-- Allow authenticated users to upload their own screenshots
CREATE POLICY "Users can upload their own screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read screenshots (public bucket, but explicit policy)
CREATE POLICY "Users can read screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'screenshots');

-- Allow authenticated users to delete their own screenshots
CREATE POLICY "Users can delete their own screenshots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

