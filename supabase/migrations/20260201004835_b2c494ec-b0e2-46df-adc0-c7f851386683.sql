-- Fix unrestricted storage upload paths for request-photos bucket
-- Drop the overly permissive policy that allows uploads to any path
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;

-- Create a more restrictive policy that validates the upload path
-- Path format: user_id/request_id/filename
-- This ensures users can only upload to their own requests
CREATE POLICY "Users can upload photos to their own requests"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'request-photos' 
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.user_id = auth.uid()
      AND requests.id::text = (storage.foldername(name))[2]
    )
  );

-- Also allow admins to upload photos to any request
CREATE POLICY "Admins can upload photos to any request"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'request-photos'
    AND is_admin(auth.uid())
  );