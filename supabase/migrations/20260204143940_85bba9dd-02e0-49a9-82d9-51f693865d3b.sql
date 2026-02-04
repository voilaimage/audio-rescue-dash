-- Add sort_order column to requests table for manual ordering
ALTER TABLE public.requests 
ADD COLUMN sort_order integer DEFAULT 0;

-- Create an index for efficient ordering
CREATE INDEX idx_requests_sort_order ON public.requests(sort_order);