-- Add assigned_driver_id to requests table
ALTER TABLE public.requests 
ADD COLUMN assigned_driver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add coverage_areas to profiles for area-based auto-suggest
ALTER TABLE public.profiles 
ADD COLUMN coverage_areas text[] DEFAULT '{}';

-- Create index for faster driver assignment queries
CREATE INDEX idx_requests_assigned_driver ON public.requests(assigned_driver_id);
CREATE INDEX idx_profiles_coverage_areas ON public.profiles USING GIN(coverage_areas);

-- Update driver SELECT policy to only show assigned requests
DROP POLICY IF EXISTS "Drivers can view scheduled and accepted requests" ON public.requests;

CREATE POLICY "Drivers can view their assigned requests"
ON public.requests
FOR SELECT
USING (
  is_driver(auth.uid()) 
  AND assigned_driver_id = auth.uid()
  AND status IN ('accepted'::request_status, 'scheduled'::request_status, 'collected'::request_status)
);

-- Update driver profile visibility policy to match assigned requests only
DROP POLICY IF EXISTS "Drivers can view customer profiles for their jobs" ON public.profiles;

CREATE POLICY "Drivers can view customer profiles for their assigned jobs"
ON public.profiles
FOR SELECT
USING (
  is_driver(auth.uid()) 
  AND EXISTS (
    SELECT 1 FROM public.requests
    WHERE requests.user_id = profiles.id
    AND requests.assigned_driver_id = auth.uid()
    AND requests.status IN ('accepted'::request_status, 'scheduled'::request_status, 'collected'::request_status)
  )
);