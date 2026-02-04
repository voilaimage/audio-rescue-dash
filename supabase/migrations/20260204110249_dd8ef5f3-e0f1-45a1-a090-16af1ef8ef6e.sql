-- Create a restricted view for driver access to customer profiles
-- This view excludes sensitive PII (email, phone) that drivers don't need
CREATE VIEW public.profiles_driver_view
WITH (security_invoker=on) AS
  SELECT 
    id,
    business_name,
    contact_name,
    address_line1,
    address_line2,
    city,
    postcode,
    driver_notes,
    role
  FROM public.profiles;

-- Comment explaining the view's purpose
COMMENT ON VIEW public.profiles_driver_view IS 'Restricted view for driver access to customer profiles. Excludes email, phone, avatar_url, coverage_areas, created_at, updated_at to protect customer PII.';

-- Drop the existing driver SELECT policy that gives full profile access
DROP POLICY IF EXISTS "Drivers can view customer profiles for their assigned jobs" ON public.profiles;

-- Create new driver SELECT policy that returns no direct rows
-- Drivers must use the profiles_driver_view instead
CREATE POLICY "Drivers cannot directly access profiles"
ON public.profiles
FOR SELECT
USING (
  -- Allow drivers to view ONLY their own profile directly
  (is_driver(auth.uid()) AND id = auth.uid())
);

-- Grant SELECT on the view to authenticated users
-- The view's security_invoker=on means RLS on base table still applies
-- But since the base table now denies driver access to customer profiles,
-- we need a different approach

-- Actually, let's reconsider: The view with security_invoker means the base table RLS applies.
-- We need drivers to access customer profiles but only specific columns.
-- The solution is to use a SECURITY DEFINER function instead.

-- Drop the view we just created since security_invoker won't work for this case
DROP VIEW IF EXISTS public.profiles_driver_view;

-- Drop the policy we just created
DROP POLICY IF EXISTS "Drivers cannot directly access profiles" ON public.profiles;

-- Create a SECURITY DEFINER function that returns limited profile data for drivers
CREATE OR REPLACE FUNCTION public.get_customer_profile_for_driver(_profile_id uuid)
RETURNS TABLE (
  id uuid,
  business_name text,
  contact_name text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  driver_notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.business_name,
    p.contact_name,
    p.phone,
    p.address_line1,
    p.address_line2,
    p.city,
    p.postcode,
    p.driver_notes
  FROM public.profiles p
  INNER JOIN public.requests r ON r.user_id = p.id
  WHERE p.id = _profile_id
    AND r.assigned_driver_id = auth.uid()
    AND r.status IN ('accepted', 'scheduled')
  LIMIT 1
$$;

-- Comment on the function
COMMENT ON FUNCTION public.get_customer_profile_for_driver IS 'Returns limited customer profile data for drivers. Only works for customers with assigned jobs to the calling driver. Excludes email to protect customer PII.';

-- Now update the profiles RLS policy for drivers
-- We need to KEEP the existing policy but make it work alongside the function
-- The existing policy allows drivers to see full profiles for assigned jobs
-- We'll remove it and drivers must use the function instead

DROP POLICY IF EXISTS "Drivers can view customer profiles for their assigned jobs" ON public.profiles;