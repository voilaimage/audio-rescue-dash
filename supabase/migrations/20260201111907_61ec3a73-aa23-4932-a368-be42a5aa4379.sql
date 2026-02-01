-- Drop all existing restrictive policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Drivers can view customer profiles for their assigned jobs" ON public.profiles;

-- Recreate as PERMISSIVE policies (standard RLS behavior - any matching policy grants access)

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- Admins can delete any profile
CREATE POLICY "Admins can delete any profile"
ON public.profiles FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Drivers can view customer profiles for their assigned jobs
CREATE POLICY "Drivers can view customer profiles for their assigned jobs"
ON public.profiles FOR SELECT
TO authenticated
USING (
  is_driver(auth.uid()) AND EXISTS (
    SELECT 1 FROM requests
    WHERE requests.user_id = profiles.id
      AND requests.assigned_driver_id = auth.uid()
      AND requests.status = ANY (ARRAY['accepted'::request_status, 'scheduled'::request_status, 'collected'::request_status])
  )
);