
-- Create push_tokens table to store device tokens
CREATE TABLE public.push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_token)
);

-- Enable RLS on push_tokens table
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view their own push tokens"
ON public.push_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can insert their own push tokens"
ON public.push_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete their own push tokens"
ON public.push_tokens
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all tokens
CREATE POLICY "Admins can view all push tokens"
ON public.push_tokens
FOR SELECT
USING (is_admin(auth.uid()));

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_push_tokens_updated_at
BEFORE UPDATE ON public.push_tokens
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create table for notification queue
CREATE TABLE public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable RLS on notification_queue
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Admins can view notifications
CREATE POLICY "Admins can view all notifications"
ON public.notification_queue
FOR SELECT
USING (is_admin(auth.uid()));

-- Create function to trigger notifications on request status change
CREATE OR REPLACE FUNCTION public.handle_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status actually changed
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Queue notification for the request owner
    INSERT INTO public.notification_queue (request_id, user_id, event_type, old_status, new_status)
    VALUES (NEW.id, NEW.user_id, 'status_changed', OLD.status, NEW.status);
    
    -- If assigned to a driver, also notify the driver
    IF NEW.assigned_driver_id IS NOT NULL THEN
      INSERT INTO public.notification_queue (request_id, user_id, event_type, old_status, new_status)
      VALUES (NEW.id, NEW.assigned_driver_id, 'status_changed', OLD.status, NEW.status);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on requests table
CREATE TRIGGER notify_on_request_status_change
AFTER UPDATE ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_request_status_change();
