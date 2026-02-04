
-- Create audit_logs table to track data access
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb,
  ip_address text
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (is_admin(auth.uid()));

-- System can insert logs (via security definer functions)
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Create logging function
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _user_id uuid,
  _action text,
  _resource_type text,
  _resource_id uuid DEFAULT NULL,
  _details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (_user_id, _action, _resource_type, _resource_id, _details);
END;
$$;

-- Update get_customer_profile_for_driver to log access
CREATE OR REPLACE FUNCTION public.get_customer_profile_for_driver(_profile_id uuid)
RETURNS TABLE(
  id uuid,
  business_name text,
  contact_name text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  driver_notes text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _driver_id uuid := auth.uid();
  _request_id uuid;
BEGIN
  -- Get the request ID for logging
  SELECT r.id INTO _request_id
  FROM public.requests r
  WHERE r.user_id = _profile_id
    AND r.assigned_driver_id = _driver_id
    AND r.status IN ('accepted', 'scheduled')
  LIMIT 1;

  -- Log the access attempt
  IF _request_id IS NOT NULL THEN
    PERFORM public.log_audit_event(
      _driver_id,
      'view_customer_profile',
      'profile',
      _profile_id,
      jsonb_build_object('request_id', _request_id)
    );
  END IF;

  -- Return the profile data
  RETURN QUERY
  SELECT 
    p.id,
    p.business_name,
    p.contact_name,
    p.phone,
    p.address_line1,
    p.address_line2,
    p.city,
    p.postcode,
    p.driver_notes
  FROM public.profiles p
  INNER JOIN public.requests r ON r.user_id = p.id
  WHERE p.id = _profile_id
    AND r.assigned_driver_id = _driver_id
    AND r.status IN ('accepted', 'scheduled')
  LIMIT 1;
END;
$$;
