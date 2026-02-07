-- ============================================================
-- AUDIO SALVAGE UK - COMPLETE DATABASE EXPORT
-- Generated: 2026-02-07
-- ============================================================
-- This file contains the complete database schema and data
-- for migrating to an external Supabase project.
-- ============================================================

-- ============================================================
-- PART 1: ENUMS
-- ============================================================

CREATE TYPE public.user_role AS ENUM ('customer', 'admin', 'driver');
CREATE TYPE public.request_status AS ENUM ('new', 'accepted', 'scheduled', 'collected', 'completed', 'cancelled');
CREATE TYPE public.preferred_window AS ENUM ('anytime', 'morning', 'afternoon', 'evening');
CREATE TYPE public.preferred_day_range AS ENUM ('none', 'tomorrow', '3_days', 'week');

-- ============================================================
-- PART 2: TABLES
-- ============================================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'customer',
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postcode TEXT NOT NULL,
  driver_notes TEXT,
  avatar_url TEXT,
  coverage_areas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Requests table
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_driver_id UUID REFERENCES public.profiles(id),
  status request_status NOT NULL DEFAULT 'new',
  description TEXT NOT NULL,
  preferred_window preferred_window DEFAULT 'anytime',
  preferred_day_range preferred_day_range DEFAULT 'none',
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  collected_by UUID REFERENCES public.profiles(id),
  collected_by_name TEXT,
  collection_notes TEXT,
  collection_pin TEXT,
  collection_proof_photo_url TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancelled_by_name TEXT,
  cancellation_reason TEXT,
  archived_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Request photos table
CREATE TABLE public.request_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Collection proof photos table
CREATE TABLE public.collection_proof_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Driver invites table
CREATE TABLE public.driver_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  invite_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  coverage_areas TEXT[] DEFAULT '{}',
  profile_id UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Push tokens table
CREATE TABLE public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification queue table
CREATE TABLE public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rate limit attempts table
CREATE TABLE public.rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PART 3: ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_proof_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 4: SECURITY DEFINER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'::user_role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_driver(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'driver'::user_role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_driver(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('admin'::user_role, 'driver'::user_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_driver_invite_by_token(_token TEXT)
RETURNS TABLE(id UUID, contact_name TEXT, phone TEXT, status TEXT, coverage_areas TEXT[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, contact_name, phone, status, coverage_areas
  FROM public.driver_invites
  WHERE invite_token = _token
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_customer_profile_for_driver(_profile_id UUID)
RETURNS TABLE(id UUID, business_name TEXT, contact_name TEXT, phone TEXT, address_line1 TEXT, address_line2 TEXT, city TEXT, postcode TEXT, driver_notes TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _driver_id UUID := auth.uid();
  _request_id UUID;
BEGIN
  SELECT r.id INTO _request_id
  FROM public.requests r
  WHERE r.user_id = _profile_id
    AND r.assigned_driver_id = _driver_id
    AND r.status IN ('accepted', 'scheduled')
  LIMIT 1;

  IF _request_id IS NOT NULL THEN
    PERFORM public.log_audit_event(
      _driver_id,
      'view_customer_profile',
      'profile',
      _profile_id,
      jsonb_build_object('request_id', _request_id)
    );
  END IF;

  RETURN QUERY
  SELECT p.id, p.business_name, p.contact_name, p.phone, p.address_line1, p.address_line2, p.city, p.postcode, p.driver_notes
  FROM public.profiles p
  INNER JOIN public.requests r ON r.user_id = p.id
  WHERE p.id = _profile_id
    AND r.assigned_driver_id = _driver_id
    AND r.status IN ('accepted', 'scheduled')
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_audit_event(
  _user_id UUID,
  _action TEXT,
  _resource_type TEXT,
  _resource_id UUID DEFAULT NULL,
  _details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (_user_id, _action, _resource_type, _resource_id, _details);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _ip_address TEXT,
  _endpoint TEXT,
  _max_attempts INTEGER DEFAULT 5,
  _window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO _attempt_count
  FROM public.rate_limit_attempts
  WHERE ip_address = _ip_address
    AND endpoint = _endpoint
    AND success = false
    AND created_at > (now() - (_window_minutes || ' minutes')::interval);
  
  RETURN _attempt_count >= _max_attempts;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_rate_limit_attempt(
  _ip_address TEXT,
  _endpoint TEXT,
  _success BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limit_attempts (ip_address, endpoint, success)
  VALUES (_ip_address, _endpoint, _success);
  
  DELETE FROM public.rate_limit_attempts
  WHERE created_at < (now() - interval '1 hour');
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- ============================================================
-- PART 5: TRIGGERS
-- ============================================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_request_status_change
  AFTER UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_request_status_change();

-- ============================================================
-- PART 6: RLS POLICIES
-- ============================================================

-- === PROFILES ===
CREATE POLICY "Require authentication to access profiles" ON public.profiles AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view their own profile" ON public.profiles AS RESTRICTIVE FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles AS RESTRICTIVE FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles AS RESTRICTIVE FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles AS RESTRICTIVE FOR DELETE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert profiles" ON public.profiles AS RESTRICTIVE FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update any profile" ON public.profiles AS RESTRICTIVE FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete any profile" ON public.profiles AS RESTRICTIVE FOR DELETE USING (is_admin(auth.uid()));

-- === REQUESTS ===
CREATE POLICY "Require authentication to access requests" ON public.requests AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view their own requests" ON public.requests AS RESTRICTIVE FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own requests" ON public.requests AS RESTRICTIVE FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own requests" ON public.requests AS RESTRICTIVE FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own requests" ON public.requests AS RESTRICTIVE FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all requests" ON public.requests AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert requests" ON public.requests AS RESTRICTIVE FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update any request" ON public.requests AS RESTRICTIVE FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete any request" ON public.requests AS RESTRICTIVE FOR DELETE USING (is_admin(auth.uid()));
CREATE POLICY "Drivers can view their assigned requests" ON public.requests AS RESTRICTIVE FOR SELECT USING (is_driver(auth.uid()) AND assigned_driver_id = auth.uid() AND status IN ('accepted', 'scheduled', 'collected'));
CREATE POLICY "Drivers can update requests to collected" ON public.requests AS RESTRICTIVE FOR UPDATE USING (is_driver(auth.uid()) AND status IN ('accepted', 'scheduled'));

-- === REQUEST_PHOTOS ===
CREATE POLICY "Require authentication to access request_photos" ON public.request_photos AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view photos of their requests" ON public.request_photos AS RESTRICTIVE FOR SELECT USING (EXISTS (SELECT 1 FROM requests WHERE requests.id = request_photos.request_id AND requests.user_id = auth.uid()));
CREATE POLICY "Users can add photos to their requests" ON public.request_photos AS RESTRICTIVE FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM requests WHERE requests.id = request_photos.request_id AND requests.user_id = auth.uid()));
CREATE POLICY "Users can delete photos of their requests" ON public.request_photos AS RESTRICTIVE FOR DELETE USING (EXISTS (SELECT 1 FROM requests WHERE requests.id = request_photos.request_id AND requests.user_id = auth.uid()));
CREATE POLICY "Admins can view all photos" ON public.request_photos AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert photos" ON public.request_photos AS RESTRICTIVE FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update any photo" ON public.request_photos AS RESTRICTIVE FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete any photo" ON public.request_photos AS RESTRICTIVE FOR DELETE USING (is_admin(auth.uid()));
CREATE POLICY "Drivers can view photos of assigned requests" ON public.request_photos AS RESTRICTIVE FOR SELECT USING (is_driver(auth.uid()) AND EXISTS (SELECT 1 FROM requests WHERE requests.id = request_photos.request_id AND requests.assigned_driver_id = auth.uid() AND requests.status IN ('accepted', 'scheduled', 'collected')));

-- === COLLECTION_PROOF_PHOTOS ===
CREATE POLICY "Require authentication to access collection_proof_photos" ON public.collection_proof_photos AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view proof photos for their requests" ON public.collection_proof_photos AS RESTRICTIVE FOR SELECT USING (EXISTS (SELECT 1 FROM requests WHERE requests.id = collection_proof_photos.request_id AND requests.user_id = auth.uid()));
CREATE POLICY "Admins and drivers can view all proof photos" ON public.collection_proof_photos AS RESTRICTIVE FOR SELECT USING (is_admin_or_driver(auth.uid()));
CREATE POLICY "Admins and drivers can insert proof photos" ON public.collection_proof_photos AS RESTRICTIVE FOR INSERT WITH CHECK (is_admin_or_driver(auth.uid()));
CREATE POLICY "Admins and drivers can delete proof photos" ON public.collection_proof_photos AS RESTRICTIVE FOR DELETE USING (is_admin_or_driver(auth.uid()));

-- === DRIVER_INVITES ===
CREATE POLICY "Require authentication to access driver_invites" ON public.driver_invites AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can view all invites" ON public.driver_invites AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can create invites" ON public.driver_invites AS RESTRICTIVE FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update invites" ON public.driver_invites AS RESTRICTIVE FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete invites" ON public.driver_invites AS RESTRICTIVE FOR DELETE USING (is_admin(auth.uid()));

-- === PUSH_TOKENS ===
CREATE POLICY "Users can view their own push tokens" ON public.push_tokens AS RESTRICTIVE FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own push tokens" ON public.push_tokens AS RESTRICTIVE FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own push tokens" ON public.push_tokens AS RESTRICTIVE FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all push tokens" ON public.push_tokens AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));

-- === AUDIT_LOGS ===
CREATE POLICY "Require authentication to access audit_logs" ON public.audit_logs AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));

-- === NOTIFICATION_QUEUE ===
CREATE POLICY "Admins can view all notifications" ON public.notification_queue AS RESTRICTIVE FOR SELECT USING (is_admin(auth.uid()));

-- === RATE_LIMIT_ATTEMPTS ===
CREATE POLICY "Deny all direct access to rate_limit_attempts" ON public.rate_limit_attempts AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);

-- ============================================================
-- PART 7: STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('request-photos', 'request-photos', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('collection-proofs', 'collection-proofs', false);

-- Storage policies for avatars (public bucket)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for request-photos (private bucket)
CREATE POLICY "Users can view their own request photos" ON storage.objects FOR SELECT USING (bucket_id = 'request-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload request photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'request-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all request photos" ON storage.objects FOR SELECT USING (bucket_id = 'request-photos' AND is_admin(auth.uid()));

-- Storage policies for collection-proofs (private bucket)  
CREATE POLICY "Admins and drivers can view collection proofs" ON storage.objects FOR SELECT USING (bucket_id = 'collection-proofs' AND is_admin_or_driver(auth.uid()));
CREATE POLICY "Admins and drivers can upload collection proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'collection-proofs' AND is_admin_or_driver(auth.uid()));
CREATE POLICY "Users can view their own collection proofs" ON storage.objects FOR SELECT USING (bucket_id = 'collection-proofs' AND EXISTS (SELECT 1 FROM requests WHERE requests.id::text = (storage.foldername(name))[1] AND requests.user_id = auth.uid()));

-- ============================================================
-- PART 8: DATA EXPORT
-- ============================================================

-- Note: User accounts must be recreated manually in the new Supabase project
-- The UUIDs below correspond to the auth.users IDs

-- Profiles data
INSERT INTO public.profiles (id, role, business_name, contact_name, phone, email, address_line1, address_line2, city, postcode, driver_notes, avatar_url, coverage_areas, created_at, updated_at) VALUES
('2ee2d932-192d-4202-9706-4b649d5d175f', 'admin', 'yoga', 'Samuel Taylor', '07393406989', 'admin@audiosalvageuk.co.uk', 'Unit C3', 'Leyton industrial Est', 'London', 'E10 7QP', 'use alleyway', 'https://lyfieowqpaxzfsdnkvfa.supabase.co/storage/v1/object/public/avatars/2ee2d932-192d-4202-9706-4b649d5d175f/avatar.jpg?t=1769618360917', '{}', '2026-01-28 16:34:46.00343+00', '2026-02-05 11:43:14.080585+00'),
('22499cad-8197-4e9e-a138-aa7c12b52862', 'driver', 'Driver', 'Johnathan Taylor', '07393406989', 'driver-07393406989@audio-salvage.driver', 'N/A', NULL, 'N/A', 'N/A', NULL, NULL, '{}', '2026-01-31 18:52:23.295486+00', '2026-01-31 22:43:34.749384+00'),
('0fce5ba9-5263-4371-99bb-b51fb4543c03', 'driver', 'Driver', 'Samuel Taylor', '07932922640', 'driver-07932922640@audio-salvage.driver', 'N/A', NULL, 'N/A', 'N/A', NULL, NULL, '{}', '2026-01-31 20:00:19.186904+00', '2026-02-01 12:20:14.604791+00'),
('42dec2be-ac12-48c2-a859-10c0afafd143', 'customer', 'reapp ltd', 'john', '07932922640', 'sam@appleselloff.com', 'Unit C3', 'Leyton Industrial Est', 'London', 'E10 7QP', 'use the alley way', NULL, '{}', '2026-02-01 01:02:32.138877+00', '2026-02-01 01:02:32.138877+00'),
('8a361811-dfb3-4ff5-b1e0-8cb7c2e37f22', 'customer', 'Formd', 'Mike', '07660333997', 'sam@appleselliff.com', '22', 'Gdkfk dkrkxkx', 'LONDON', 'E18 7DD', NULL, 'https://lyfieowqpaxzfsdnkvfa.supabase.co/storage/v1/object/public/avatars/8a361811-dfb3-4ff5-b1e0-8cb7c2e37f22/avatar.jpg?t=1769949320661', '{}', '2026-02-01 12:32:40.616942+00', '2026-02-01 12:35:20.349569+00');

-- Driver invites data
INSERT INTO public.driver_invites (id, contact_name, phone, invite_token, status, coverage_areas, profile_id, completed_at, created_at) VALUES
('0bb18108-46fd-4882-b867-a27afa4a8f68', 'Samuel Taylor', '07932922640', '4555a02f742e01f2757c3f37ccc02cc8', 'completed', '{}', '0fce5ba9-5263-4371-99bb-b51fb4543c03', '2026-02-01 12:20:14.639+00', '2026-02-01 12:19:20.46923+00');

-- Note: Requests, request_photos, collection_proof_photos, audit_logs, and notification_queue 
-- data would need the referenced user IDs to exist first in auth.users and profiles

-- ============================================================
-- PART 9: REALTIME CONFIGURATION
-- ============================================================

-- Enable realtime for requests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;

-- ============================================================
-- END OF EXPORT
-- ============================================================
