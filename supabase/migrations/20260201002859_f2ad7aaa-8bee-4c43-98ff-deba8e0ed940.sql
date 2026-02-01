-- Force RLS even for table owners (extra security layer)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;