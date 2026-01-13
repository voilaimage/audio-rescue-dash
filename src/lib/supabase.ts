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
  role: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
};

export type Request = {
  id: string;
  user_id: string;
  description: string;
  preferred_window: 'anytime' | 'morning' | 'afternoon' | 'evening';
  preferred_day_range: 'none' | 'tomorrow' | '3_days' | 'week';
  status: 'new' | 'accepted' | 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
};

export type RequestPhoto = {
  id: string;
  request_id: string;
  file_url: string;
  created_at: string;
};

export type RequestWithPhotos = Request & {
  request_photos: RequestPhoto[];
  profiles?: Profile;
};
