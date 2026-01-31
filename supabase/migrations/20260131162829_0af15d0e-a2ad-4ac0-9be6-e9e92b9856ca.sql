-- MIGRATION PART 1: Add enum values and columns first
-- Add 'driver' to the user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'driver';

-- Add 'collected' to the request_status enum
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'collected' AFTER 'scheduled';

-- Add new columns to requests table for scheduling and collection
ALTER TABLE public.requests 
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS collection_notes TEXT,
  ADD COLUMN IF NOT EXISTS collection_proof_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS collection_pin TEXT;

-- Create collection_proof_photos table for multiple proof photos
CREATE TABLE IF NOT EXISTS public.collection_proof_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on collection_proof_photos
ALTER TABLE public.collection_proof_photos ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for collection proof photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('collection-proofs', 'collection-proofs', false)
ON CONFLICT (id) DO NOTHING;