-- Add column to store the driver name at time of collection
-- This preserves the driver info even if the driver is later deleted
ALTER TABLE public.requests 
ADD COLUMN collected_by_name text;

-- Add comment for documentation
COMMENT ON COLUMN public.requests.collected_by_name IS 'Stores the driver contact_name at time of collection for historical reference';