-- Create super_admin_credentials table for isolated Super Admin authentication
CREATE TABLE public.super_admin_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  must_change_password BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS - access only through edge functions with service role
ALTER TABLE public.super_admin_credentials ENABLE ROW LEVEL SECURITY;

-- No RLS policies - table is only accessed via service role in edge functions

-- Add trigger for updated_at
CREATE TRIGGER update_super_admin_credentials_updated_at
  BEFORE UPDATE ON public.super_admin_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default credentials (password will be hashed by edge function on first init)
-- The password "admin123" will be stored as a bcrypt hash
INSERT INTO public.super_admin_credentials (email, password_hash, must_change_password)
VALUES (
  'admin@galli.com',
  -- This is bcrypt hash for "admin123" with cost 10
  '$2a$10$rQEY7fJlHZ5V9OZxfYxSqeZHhD1O8B0xP1LuTkK8dJqnKTQZvXmHi',
  false
);