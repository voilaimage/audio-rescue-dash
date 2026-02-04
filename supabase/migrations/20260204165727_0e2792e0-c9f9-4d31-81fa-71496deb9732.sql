-- Add restrictive policy to block anonymous access to audit_logs table
CREATE POLICY "Require authentication to access audit_logs"
ON public.audit_logs
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Add restrictive policy to block anonymous access to collection_proof_photos table
CREATE POLICY "Require authentication to access collection_proof_photos"
ON public.collection_proof_photos
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Add restrictive policy to block anonymous access to driver_invites table
CREATE POLICY "Require authentication to access driver_invites"
ON public.driver_invites
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Add restrictive policy to block anonymous access to request_photos table
CREATE POLICY "Require authentication to access request_photos"
ON public.request_photos
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);