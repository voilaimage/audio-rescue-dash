-- Enable and force RLS on driver_invites to ensure admin-only SELECT policy is enforced
ALTER TABLE public.driver_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_invites FORCE ROW LEVEL SECURITY;