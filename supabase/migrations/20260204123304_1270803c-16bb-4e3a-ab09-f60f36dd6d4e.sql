-- Add cancellation tracking columns
ALTER TABLE public.requests
ADD COLUMN cancelled_by uuid DEFAULT NULL,
ADD COLUMN cancelled_by_name text DEFAULT NULL,
ADD COLUMN cancellation_reason text DEFAULT NULL;

-- Add foreign key constraint for cancelled_by
ALTER TABLE public.requests
ADD CONSTRAINT requests_cancelled_by_fkey 
FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;