-- Add SELECT policy for users to view their own request photos
CREATE POLICY "Users can view their own request photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'request-photos' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Add SELECT policy for admins to view all request photos
CREATE POLICY "Admins can view all request photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'request-photos' 
  AND is_admin(auth.uid())
);

-- Add SELECT policy for drivers to view request photos for their assigned jobs
CREATE POLICY "Drivers can view request photos for assigned jobs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'request-photos' 
  AND is_driver(auth.uid())
  AND EXISTS (
    SELECT 1 FROM requests r
    JOIN request_photos rp ON rp.request_id = r.id
    WHERE r.assigned_driver_id = auth.uid()
      AND r.status = ANY (ARRAY['accepted'::request_status, 'scheduled'::request_status, 'collected'::request_status])
      AND rp.file_url LIKE '%' || objects.name
  )
);