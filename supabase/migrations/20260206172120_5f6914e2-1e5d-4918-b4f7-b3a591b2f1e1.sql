-- Add a restrictive policy to block all direct user access to rate_limit_attempts
-- Edge functions use service role key which bypasses RLS, so this won't affect them
CREATE POLICY "Deny all direct access to rate_limit_attempts"
ON public.rate_limit_attempts
AS RESTRICTIVE
FOR ALL
USING (false)
WITH CHECK (false);