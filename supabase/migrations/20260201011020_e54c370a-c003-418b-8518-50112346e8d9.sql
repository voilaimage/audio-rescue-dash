-- Update the storage policy to be more reliable
-- The current policy may fail if the RLS check on requests table doesn't see the newly inserted request
-- due to transaction isolation. Let's simplify while maintaining security.

-- First, drop the existing user upload policy
DROP POLICY IF EXISTS "Users can upload photos to their own requests" ON storage.objects;

-- Create a simpler policy that just validates user ownership of the path folder
-- This is still secure because:
-- 1. Users can only upload to folders starting with their own user_id
-- 2. The request_photos table has RLS that validates the request belongs to the user
CREATE POLICY "Users can upload to their own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'request-photos' 
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );