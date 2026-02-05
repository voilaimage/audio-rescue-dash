-- Add DELETE policy for collection-proofs bucket to allow admins to remove proof photos
CREATE POLICY "Admins can delete collection proofs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'collection-proofs'
  AND is_admin(auth.uid())
);