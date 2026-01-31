-- Create driver invites table for pending registrations
CREATE TABLE public.driver_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  coverage_areas TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  profile_id UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.driver_invites ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invites
CREATE POLICY "Admins can view all invites"
ON public.driver_invites FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create invites"
ON public.driver_invites FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update invites"
ON public.driver_invites FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete invites"
ON public.driver_invites FOR DELETE
USING (is_admin(auth.uid()));

-- Public can read their own invite by token (for setup page)
CREATE POLICY "Anyone can view invite by token"
ON public.driver_invites FOR SELECT
USING (true);