import { supabase } from "@/integrations/supabase/client";

export { supabase };

export type Profile = {
  id: string;
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postcode: string;
  driver_notes: string | null;
  avatar_url: string | null;
  role: 'customer' | 'admin' | 'driver';
  created_at: string;
  updated_at: string;
};

export type Request = {
  id: string;
  user_id: string;
  description: string;
  preferred_window: 'anytime' | 'morning' | 'afternoon' | 'evening' | null;
  preferred_day_range: 'none' | 'tomorrow' | '3_days' | 'week' | null;
  status: 'new' | 'accepted' | 'scheduled' | 'collected' | 'completed' | 'cancelled';
  scheduled_start: string | null;
  scheduled_end: string | null;
  accepted_at: string | null;
  collected_at: string | null;
  collected_by: string | null;
  collection_notes: string | null;
  collection_proof_photo_url: string | null;
  collection_pin: string | null;
  created_at: string;
  updated_at: string;
};

export type RequestPhoto = {
  id: string;
  request_id: string;
  file_url: string;
  created_at: string;
};

export type CollectionProofPhoto = {
  id: string;
  request_id: string;
  file_url: string;
  created_at: string;
};

export type RequestWithPhotos = Request & {
  request_photos: RequestPhoto[];
  collection_proof_photos?: CollectionProofPhoto[];
  profiles?: Profile;
};
