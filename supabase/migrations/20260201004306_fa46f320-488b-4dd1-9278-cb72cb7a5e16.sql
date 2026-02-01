-- Force RLS even for table owners (extra security layer)
ALTER TABLE public.requests FORCE ROW LEVEL SECURITY;