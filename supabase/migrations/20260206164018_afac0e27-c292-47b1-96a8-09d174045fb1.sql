-- Create rate limiting table for tracking attempts
CREATE TABLE public.rate_limit_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient lookups by IP and endpoint within time window
CREATE INDEX idx_rate_limit_ip_endpoint_time 
ON public.rate_limit_attempts (ip_address, endpoint, created_at DESC);

-- Enable RLS (deny all direct access - only edge functions with service role can write)
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed - service role bypasses RLS
-- This table is only accessed by edge functions using service role key

-- Function to check rate limit (returns true if blocked)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _ip_address text,
  _endpoint text,
  _max_attempts integer DEFAULT 5,
  _window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _attempt_count integer;
BEGIN
  -- Count failed attempts in the time window
  SELECT COUNT(*) INTO _attempt_count
  FROM public.rate_limit_attempts
  WHERE ip_address = _ip_address
    AND endpoint = _endpoint
    AND success = false
    AND created_at > (now() - (_window_minutes || ' minutes')::interval);
  
  RETURN _attempt_count >= _max_attempts;
END;
$$;

-- Function to record an attempt
CREATE OR REPLACE FUNCTION public.record_rate_limit_attempt(
  _ip_address text,
  _endpoint text,
  _success boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limit_attempts (ip_address, endpoint, success)
  VALUES (_ip_address, _endpoint, _success);
  
  -- Clean up old entries (older than 1 hour) to prevent table bloat
  DELETE FROM public.rate_limit_attempts
  WHERE created_at < (now() - interval '1 hour');
END;
$$;

-- Add comment for documentation
COMMENT ON TABLE public.rate_limit_attempts IS 'Tracks rate limit attempts for edge functions to prevent brute force attacks';