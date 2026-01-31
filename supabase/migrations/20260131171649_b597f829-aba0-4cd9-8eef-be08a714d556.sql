-- Drop the overly permissive driver policy
DROP POLICY IF EXISTS "Drivers can view customer profiles" ON public.profiles;

-- Create a more restrictive policy that only allows drivers to see profiles
-- for customers who have requests in accepted, scheduled, or collected status
CREATE POLICY "Drivers can view customer profiles for their jobs"
ON public.profiles
FOR SELECT
USING (
  is_driver(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM public.requests
    WHERE requests.user_id = profiles.id
    AND requests.status IN ('accepted'::request_status, 'scheduled'::request_status, 'collected'::request_status)
  )
);