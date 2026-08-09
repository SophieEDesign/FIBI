-- Allow authenticated users to upsert (UPDATE) their own screenshot/thumbnail objects
DROP POLICY IF EXISTS "Users can update their own screenshots" ON storage.objects;

CREATE POLICY "Users can update their own screenshots"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
