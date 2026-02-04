
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- No direct INSERT policy needed - only SECURITY DEFINER functions (log_audit_event) can insert
-- The log_audit_event function runs as definer and bypasses RLS
