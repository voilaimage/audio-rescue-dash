-- Drop obsolete storage policy that allows anyone to view request photos
DROP POLICY IF EXISTS "Anyone can view request photos" ON storage.objects;

-- Add FORCE RLS to collection_proof_photos table to prevent owner bypass
ALTER TABLE public.collection_proof_photos FORCE ROW LEVEL SECURITY;