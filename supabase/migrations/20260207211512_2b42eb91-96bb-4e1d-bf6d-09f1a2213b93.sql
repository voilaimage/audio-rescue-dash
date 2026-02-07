-- Add RLS policy for notification_queue so users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notification_queue
FOR SELECT
USING (auth.uid() = user_id);