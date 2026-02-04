-- Add restrictive policy to block anonymous access to profiles table
-- This policy requires authentication - anonymous users will be denied
CREATE POLICY "Require authentication to access profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Add restrictive policy to block anonymous access to requests table
-- This policy requires authentication - anonymous users will be denied
CREATE POLICY "Require authentication to access requests"
ON public.requests
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);