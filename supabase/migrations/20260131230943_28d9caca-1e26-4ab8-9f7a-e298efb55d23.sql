-- Drop the insecure public access policy
DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.driver_invites;

-- Create a secure function to get invite by token (security definer bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_driver_invite_by_token(_token text)
RETURNS TABLE (
  id uuid,
  contact_name text,
  phone text,
  status text,
  coverage_areas text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    contact_name,
    phone,
    status,
    coverage_areas
  FROM public.driver_invites
  WHERE invite_token = _token
  LIMIT 1
$$;