-- Add DELETE policy for users to delete their own photos
CREATE POLICY "Users can delete photos of their requests"
ON public.request_photos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = request_photos.request_id
    AND requests.user_id = auth.uid()
  )
);

-- Add admin DELETE policy for request_photos
CREATE POLICY "Admins can delete any photo"
ON public.request_photos
FOR DELETE
USING (is_admin(auth.uid()));

-- Add admin UPDATE policy for request_photos
CREATE POLICY "Admins can update any photo"
ON public.request_photos
FOR UPDATE
USING (is_admin(auth.uid()));

-- Add admin INSERT policy for request_photos
CREATE POLICY "Admins can insert photos"
ON public.request_photos
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Add admin INSERT policy for profiles
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Add admin UPDATE policy for profiles
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()));

-- Add admin DELETE policy for requests
CREATE POLICY "Admins can delete any request"
ON public.requests
FOR DELETE
USING (is_admin(auth.uid()));

-- Add admin INSERT policy for requests
CREATE POLICY "Admins can insert requests"
ON public.requests
FOR INSERT
WITH CHECK (is_admin(auth.uid()));