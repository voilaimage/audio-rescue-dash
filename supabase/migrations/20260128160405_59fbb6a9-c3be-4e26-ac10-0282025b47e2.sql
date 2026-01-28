-- Fix infinite recursion in profiles table policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Fix infinite recursion in request_photos table policies  
DROP POLICY IF EXISTS "Admins can view all photos" ON public.request_photos;
CREATE POLICY "Admins can view all photos" 
ON public.request_photos 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Fix infinite recursion in requests table policies
DROP POLICY IF EXISTS "Admins can view all requests" ON public.requests;
CREATE POLICY "Admins can view all requests" 
ON public.requests 
FOR SELECT 
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update any request" ON public.requests;
CREATE POLICY "Admins can update any request" 
ON public.requests 
FOR UPDATE 
USING (is_admin(auth.uid()));