-- Add cancelled_at column to track when requests are cancelled
ALTER TABLE public.requests
ADD COLUMN cancelled_at timestamp with time zone DEFAULT NULL;