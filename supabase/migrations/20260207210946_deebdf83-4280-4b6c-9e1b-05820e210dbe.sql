-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    business_name,
    contact_name,
    phone,
    address_line1,
    address_line2,
    city,
    postcode,
    driver_notes,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
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

-- Create trigger on auth.users to auto-create profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();