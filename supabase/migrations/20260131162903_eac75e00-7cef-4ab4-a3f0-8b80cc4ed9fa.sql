-- MIGRATION PART 2: Create functions and RLS policies (after enum values are committed)

-- Create a security definer function to check if user is a driver
CREATE OR REPLACE FUNCTION public.is_driver(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = 'driver'::user_role
  )
$$;

-- Create a function to check if user is admin or driver
CREATE OR REPLACE FUNCTION public.is_admin_or_driver(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role IN ('admin'::user_role, 'driver'::user_role)
  )
$$;

-- RLS Policies for collection_proof_photos

-- Users can view proof photos for their own requests
CREATE POLICY "Users can view proof photos for their requests"
ON public.collection_proof_photos
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.requests
  WHERE requests.id = collection_proof_photos.request_id
    AND requests.user_id = auth.uid()
));

-- Admins and drivers can view all proof photos
CREATE POLICY "Admins and drivers can view all proof photos"
ON public.collection_proof_photos
FOR SELECT
USING (is_admin_or_driver(auth.uid()));

-- Admins and drivers can insert proof photos
CREATE POLICY "Admins and drivers can insert proof photos"
ON public.collection_proof_photos
FOR INSERT
WITH CHECK (is_admin_or_driver(auth.uid()));

-- Admins and drivers can delete proof photos
CREATE POLICY "Admins and drivers can delete proof photos"
ON public.collection_proof_photos
FOR DELETE
USING (is_admin_or_driver(auth.uid()));

-- Update existing requests policies to allow drivers to view scheduled/accepted requests
CREATE POLICY "Drivers can view scheduled and accepted requests"
ON public.requests
FOR SELECT
USING (
  is_driver(auth.uid()) 
  AND status IN ('accepted'::request_status, 'scheduled'::request_status, 'collected'::request_status)
);

-- Drivers can update requests (to mark as collected)
CREATE POLICY "Drivers can update requests to collected"
ON public.requests
FOR UPDATE
USING (
  is_driver(auth.uid())
  AND status IN ('accepted'::request_status, 'scheduled'::request_status)
);

-- Drivers can view profiles to get pickup info
CREATE POLICY "Drivers can view customer profiles"
ON public.profiles
FOR SELECT
USING (is_driver(auth.uid()));

-- Storage policies for collection-proofs bucket
CREATE POLICY "Admins and drivers can upload collection proofs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'collection-proofs' 
  AND is_admin_or_driver(auth.uid())
);

CREATE POLICY "Admins and drivers can view collection proofs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'collection-proofs' 
  AND is_admin_or_driver(auth.uid())
);

CREATE POLICY "Users can view their own collection proofs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'collection-proofs'
  AND EXISTS (
    SELECT 1 FROM public.requests r
    JOIN public.collection_proof_photos p ON p.request_id = r.id
    WHERE r.user_id = auth.uid()
      AND p.file_url LIKE '%' || storage.objects.name
  )
);