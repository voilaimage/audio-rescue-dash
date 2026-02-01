-- Force RLS even for table owners (belt and suspenders security)
ALTER TABLE public.request_photos FORCE ROW LEVEL SECURITY;

-- Add policy for drivers to view photos of their assigned requests
CREATE POLICY "Drivers can view photos of assigned requests"
ON public.request_photos
FOR SELECT
USING (
  is_driver(auth.uid()) AND EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = request_photos.request_id
    AND requests.assigned_driver_id = auth.uid()
    AND requests.status IN ('accepted', 'scheduled', 'collected')
  )
);