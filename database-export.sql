-- ============================================================
-- Audio Salvage UK - Complete Database Export
-- Run this SQL in your external Supabase project's SQL Editor
-- ============================================================

-- ===================== EXTENSIONS =====================
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- ===================== ENUMS =====================
CREATE TYPE public.user_role AS ENUM ('customer', 'admin', 'driver');
CREATE TYPE public.request_status AS ENUM ('new', 'accepted', 'scheduled', 'collected', 'completed', 'cancelled');
CREATE TYPE public.preferred_window AS ENUM ('anytime', 'morning', 'afternoon', 'evening');
CREATE TYPE public.preferred_day_range AS ENUM ('none', 'tomorrow', '3_days', 'week');

-- ===================== TABLES =====================

-- Profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  email text NOT NULL,
  business_name text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  postcode text NOT NULL,
  driver_notes text,
  avatar_url text,
  role public.user_role NOT NULL DEFAULT 'customer'::user_role,
  coverage_areas text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Requests
CREATE TABLE public.requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  assigned_driver_id uuid REFERENCES public.profiles(id),
  description text NOT NULL,
  status public.request_status NOT NULL DEFAULT 'new'::request_status,
  preferred_window public.preferred_window DEFAULT 'anytime'::preferred_window,
  preferred_day_range public.preferred_day_range DEFAULT 'none'::preferred_day_range,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  accepted_at timestamptz,
  collected_at timestamptz,
  collected_by uuid REFERENCES public.profiles(id),
  collected_by_name text,
  collection_notes text,
  collection_proof_photo_url text,
  collection_pin text,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.profiles(id),
  cancelled_by_name text,
  cancellation_reason text,
  sort_order integer DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Request Photos
CREATE TABLE public.request_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.requests(id),
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Collection Proof Photos
CREATE TABLE public.collection_proof_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.requests(id),
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Driver Invites
CREATE TABLE public.driver_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_name text NOT NULL,
  phone text NOT NULL,
  invite_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
  status text NOT NULL DEFAULT 'pending'::text,
  coverage_areas text[] DEFAULT '{}'::text[],
  profile_id uuid REFERENCES public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Push Tokens
CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  device_token text NOT NULL,
  platform text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Notification Queue
CREATE TABLE public.notification_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.requests(id),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  old_status text,
  new_status text,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit Logs
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Rate Limit Attempts
CREATE TABLE public.rate_limit_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== FUNCTIONS =====================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin'::user_role)
$$;

CREATE OR REPLACE FUNCTION public.is_driver(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'driver'::user_role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_driver(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role IN ('admin'::user_role, 'driver'::user_role))
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, email, business_name, contact_name, phone, address_line1, address_line2, city, postcode, driver_notes, role)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'Business'),
    COALESCE(NEW.raw_user_meta_data->>'contact_name', 'Contact'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address_line1', ''),
    NULLIF(NEW.raw_user_meta_data->>'address_line2', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'postcode', ''),
    NULLIF(NEW.raw_user_meta_data->>'driver_notes', ''),
    'customer'::user_role
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_request_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.notification_queue (request_id, user_id, event_type, old_status, new_status)
    VALUES (NEW.id, NEW.user_id, 'status_changed', OLD.status, NEW.status);
    IF NEW.assigned_driver_id IS NOT NULL THEN
      INSERT INTO public.notification_queue (request_id, user_id, event_type, old_status, new_status)
      VALUES (NEW.id, NEW.assigned_driver_id, 'status_changed', OLD.status, NEW.status);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_audit_event(_user_id uuid, _action text, _resource_type text, _resource_id uuid DEFAULT NULL, _details jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (_user_id, _action, _resource_type, _resource_id, _details);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_ip_address text, _endpoint text, _max_attempts integer DEFAULT 5, _window_minutes integer DEFAULT 15)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _attempt_count integer;
BEGIN
  SELECT COUNT(*) INTO _attempt_count FROM public.rate_limit_attempts
  WHERE ip_address = _ip_address AND endpoint = _endpoint AND success = false
    AND created_at > (now() - (_window_minutes || ' minutes')::interval);
  RETURN _attempt_count >= _max_attempts;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_rate_limit_attempt(_ip_address text, _endpoint text, _success boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.rate_limit_attempts (ip_address, endpoint, success) VALUES (_ip_address, _endpoint, _success);
  DELETE FROM public.rate_limit_attempts WHERE created_at < (now() - interval '1 hour');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_driver_invite_by_token(_token text)
RETURNS TABLE(id uuid, contact_name text, phone text, status text, coverage_areas text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id, contact_name, phone, status, coverage_areas FROM public.driver_invites WHERE invite_token = _token LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_customer_profile_for_driver(_profile_id uuid)
RETURNS TABLE(id uuid, business_name text, contact_name text, phone text, address_line1 text, address_line2 text, city text, postcode text, driver_notes text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _driver_id uuid := auth.uid();
  _request_id uuid;
BEGIN
  SELECT r.id INTO _request_id FROM public.requests r
  WHERE r.user_id = _profile_id AND r.assigned_driver_id = _driver_id AND r.status IN ('accepted', 'scheduled') LIMIT 1;
  IF _request_id IS NOT NULL THEN
    PERFORM public.log_audit_event(_driver_id, 'view_customer_profile', 'profile', _profile_id, jsonb_build_object('request_id', _request_id));
  END IF;
  RETURN QUERY SELECT p.id, p.business_name, p.contact_name, p.phone, p.address_line1, p.address_line2, p.city, p.postcode, p.driver_notes
  FROM public.profiles p INNER JOIN public.requests r ON r.user_id = p.id
  WHERE p.id = _profile_id AND r.assigned_driver_id = _driver_id AND r.status IN ('accepted', 'scheduled') LIMIT 1;
END;
$$;

-- ===================== TRIGGERS =====================

-- Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-update updated_at on requests
CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Notification queue trigger on status change
CREATE TRIGGER on_request_status_change
  AFTER UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_request_status_change();

-- ===================== RLS =====================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_proof_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "Require authentication to access profiles" ON public.profiles AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view their own profile" ON public.profiles AS RESTRICTIVE FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles AS RESTRICTIVE FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles AS RESTRICTIVE FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles AS RESTRICTIVE FOR DELETE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert profiles" ON public.profiles AS RESTRICTIVE FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update any profile" ON public.profiles AS RESTRICTIVE FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete any profile" ON public.profiles AS RESTRICTIVE FOR DELETE USING (is_admin(auth.uid()));

-- requests policies
CREATE POLICY "Require authentication to access requests" ON public.requests AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view their own requests" ON public.requests AS RESTRICTIVE FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own requests" ON public.requests AS RESTRICTIVE FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own requests" ON public.requests AS RESTRICTIVE FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own requests" ON public.requests AS RESTRICTIVE FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all requests" ON public.requests AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert requests" ON public.requests AS RESTRICTIVE FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update any request" ON public.requests AS RESTRICTIVE FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete any request" ON public.requests AS RESTRICTIVE FOR DELETE USING (is_admin(auth.uid()));
CREATE POLICY "Drivers can view their assigned requests" ON public.requests AS RESTRICTIVE FOR SELECT USING (is_driver(auth.uid()) AND assigned_driver_id = auth.uid() AND status = ANY (ARRAY['accepted'::request_status, 'scheduled'::request_status, 'collected'::request_status]));
CREATE POLICY "Drivers can update requests to collected" ON public.requests AS RESTRICTIVE FOR UPDATE USING (is_driver(auth.uid()) AND status = ANY (ARRAY['accepted'::request_status, 'scheduled'::request_status]));

-- request_photos policies
CREATE POLICY "Require authentication to access request_photos" ON public.request_photos AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view photos of their requests" ON public.request_photos AS RESTRICTIVE FOR SELECT USING (EXISTS (SELECT 1 FROM requests WHERE requests.id = request_photos.request_id AND requests.user_id = auth.uid()));
CREATE POLICY "Users can add photos to their requests" ON public.request_photos AS RESTRICTIVE FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM requests WHERE requests.id = request_photos.request_id AND requests.user_id = auth.uid()));
CREATE POLICY "Users can delete photos of their requests" ON public.request_photos AS RESTRICTIVE FOR DELETE USING (EXISTS (SELECT 1 FROM requests WHERE requests.id = request_photos.request_id AND requests.user_id = auth.uid()));
CREATE POLICY "Admins can view all photos" ON public.request_photos AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert photos" ON public.request_photos AS RESTRICTIVE FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update any photo" ON public.request_photos AS RESTRICTIVE FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete any photo" ON public.request_photos AS RESTRICTIVE FOR DELETE USING (is_admin(auth.uid()));
CREATE POLICY "Drivers can view photos of assigned requests" ON public.request_photos AS RESTRICTIVE FOR SELECT USING (is_driver(auth.uid()) AND EXISTS (SELECT 1 FROM requests WHERE requests.id = request_photos.request_id AND requests.assigned_driver_id = auth.uid() AND requests.status = ANY (ARRAY['accepted'::request_status, 'scheduled'::request_status, 'collected'::request_status])));

-- collection_proof_photos policies
CREATE POLICY "Require authentication to access collection_proof_photos" ON public.collection_proof_photos AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view proof photos for their requests" ON public.collection_proof_photos AS RESTRICTIVE FOR SELECT USING (EXISTS (SELECT 1 FROM requests WHERE requests.id = collection_proof_photos.request_id AND requests.user_id = auth.uid()));
CREATE POLICY "Admins and drivers can view all proof photos" ON public.collection_proof_photos AS RESTRICTIVE FOR SELECT USING (is_admin_or_driver(auth.uid()));
CREATE POLICY "Admins and drivers can insert proof photos" ON public.collection_proof_photos AS RESTRICTIVE FOR INSERT WITH CHECK (is_admin_or_driver(auth.uid()));
CREATE POLICY "Admins and drivers can delete proof photos" ON public.collection_proof_photos AS RESTRICTIVE FOR DELETE USING (is_admin_or_driver(auth.uid()));

-- driver_invites policies
CREATE POLICY "Require authentication to access driver_invites" ON public.driver_invites AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can view all invites" ON public.driver_invites AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can create invites" ON public.driver_invites AS RESTRICTIVE FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update invites" ON public.driver_invites AS RESTRICTIVE FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete invites" ON public.driver_invites AS RESTRICTIVE FOR DELETE USING (is_admin(auth.uid()));

-- push_tokens policies
CREATE POLICY "Users can view their own push tokens" ON public.push_tokens AS RESTRICTIVE FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own push tokens" ON public.push_tokens AS RESTRICTIVE FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own push tokens" ON public.push_tokens AS RESTRICTIVE FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all push tokens" ON public.push_tokens AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));

-- notification_queue policies
CREATE POLICY "Users can view their own notifications" ON public.notification_queue AS RESTRICTIVE FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all notifications" ON public.notification_queue AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));

-- audit_logs policies
CREATE POLICY "Require authentication to access audit_logs" ON public.audit_logs AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));

-- rate_limit_attempts policies
CREATE POLICY "Deny all direct access to rate_limit_attempts" ON public.rate_limit_attempts AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);

-- ===================== STORAGE BUCKETS =====================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('request-photos', 'request-photos', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('collection-proofs', 'collection-proofs', false) ON CONFLICT DO NOTHING;

-- Storage policies for avatars (public read, authenticated write)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for request-photos
CREATE POLICY "Users can upload request photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'request-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view request photos" ON storage.objects FOR SELECT USING (bucket_id = 'request-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete request photos" ON storage.objects FOR DELETE USING (bucket_id = 'request-photos' AND auth.uid() IS NOT NULL);

-- Storage policies for collection-proofs
CREATE POLICY "Authenticated users can upload collection proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'collection-proofs' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view collection proofs" ON storage.objects FOR SELECT USING (bucket_id = 'collection-proofs' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete collection proofs" ON storage.objects FOR DELETE USING (bucket_id = 'collection-proofs' AND auth.uid() IS NOT NULL);

-- ===================== REALTIME =====================
-- Enable if needed:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_queue;
