-- Fix registration failing due to profiles RLS being applied to internal trigger execution.
-- The restrictive policy was scoped to PUBLIC, which can block non-JWT contexts (e.g. auth.users trigger).
-- Scoping it to AUTHENTICATED preserves deny-by-default for end users while unblocking server-side inserts.

ALTER POLICY "Require authentication to access profiles"
ON public.profiles
TO authenticated;
