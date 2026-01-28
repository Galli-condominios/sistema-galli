-- Update RLS policies for user management system

-- Profiles table: Allow admins and síndicos to view all profiles
CREATE POLICY "Admins and síndicos can manage profiles"
ON public.profiles
FOR ALL
USING (
  has_role(auth.uid(), 'administrador'::app_role) OR 
  has_role(auth.uid(), 'sindico'::app_role)
);

-- Profiles table: Allow porteiros to view profiles
CREATE POLICY "Porteiros can view profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'porteiro'::app_role)
);

-- User roles table: Prevent direct modifications (only via edge function)
-- Keep existing policies for reading, but no INSERT/UPDATE/DELETE from client