-- Add archived_at column to track when requests are archived
ALTER TABLE public.requests
ADD COLUMN archived_at timestamp with time zone DEFAULT NULL;