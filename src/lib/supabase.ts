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
  coverage_areas: string[];
  created_at: string;
  updated_at: string;
};

export type Request = {
  id: string;
  user_id: string;
  assigned_driver_id: string | null;
  description: string;
  preferred_window: 'anytime' | 'morning' | 'afternoon' | 'evening' | null;
  preferred_day_range: 'none' | 'tomorrow' | '3_days' | 'week' | null;
  status: 'new' | 'accepted' | 'scheduled' | 'collected' | 'completed' | 'cancelled';
  scheduled_start: string | null;
  scheduled_end: string | null;
  accepted_at: string | null;
  collected_at: string | null;
  collected_by: string | null;
  collected_by_name: string | null;
  collection_notes: string | null;
  collection_proof_photo_url: string | null;
  collection_pin: string | null;
  archived_at: string | null;
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

// Limited profile data returned by get_customer_profile_for_driver RPC
// This excludes sensitive PII like email
export type DriverViewProfile = {
  id: string;
  business_name: string;
  contact_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postcode: string;
  driver_notes: string | null;
};

export type RequestWithPhotos = Request & {
  request_photos: RequestPhoto[];
  collection_proof_photos?: CollectionProofPhoto[];
  profiles?: Profile | DriverViewProfile;
  assigned_driver?: Profile;
};
