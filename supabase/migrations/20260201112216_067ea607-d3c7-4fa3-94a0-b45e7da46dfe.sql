-- Drop the existing driver policy
DROP POLICY IF EXISTS "Drivers can view customer profiles for their assigned jobs" ON public.profiles;

-- Recreate with stricter status filter - only accepted and scheduled, NOT collected
CREATE POLICY "Drivers can view customer profiles for their assigned jobs"
ON public.profiles FOR SELECT
TO authenticated
USING (
  is_driver(auth.uid()) AND EXISTS (
    SELECT 1 FROM requests
    WHERE requests.user_id = profiles.id
      AND requests.assigned_driver_id = auth.uid()
      AND requests.status = ANY (ARRAY['accepted'::request_status, 'scheduled'::request_status])
  )
);