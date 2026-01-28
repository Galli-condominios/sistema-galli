-- Create table for unit members (without authentication)
CREATE TABLE public.unit_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nickname TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unit_members ENABLE ROW LEVEL SECURITY;

-- Policy: Unit residents can view members of their unit
CREATE POLICY "Unit residents can view their unit members"
ON public.unit_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.unit_users
    WHERE unit_users.unit_id = unit_members.unit_id
    AND unit_users.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.residents
    WHERE residents.unit_id = unit_members.unit_id
    AND residents.user_id = auth.uid()
    AND residents.is_active = true
  )
);

-- Policy: Primary unit users can insert members
CREATE POLICY "Primary users can add unit members"
ON public.unit_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.unit_users
    WHERE unit_users.unit_id = unit_members.unit_id
    AND unit_users.user_id = auth.uid()
    AND unit_users.is_primary = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.residents
    WHERE residents.unit_id = unit_members.unit_id
    AND residents.user_id = auth.uid()
    AND residents.is_active = true
    AND residents.resident_type = 'proprietario'
  )
);

-- Policy: Primary users can update their unit members
CREATE POLICY "Primary users can update unit members"
ON public.unit_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.unit_users
    WHERE unit_users.unit_id = unit_members.unit_id
    AND unit_users.user_id = auth.uid()
    AND unit_users.is_primary = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.residents
    WHERE residents.unit_id = unit_members.unit_id
    AND residents.user_id = auth.uid()
    AND residents.is_active = true
    AND residents.resident_type = 'proprietario'
  )
);

-- Policy: Primary users can delete their unit members
CREATE POLICY "Primary users can delete unit members"
ON public.unit_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.unit_users
    WHERE unit_users.unit_id = unit_members.unit_id
    AND unit_users.user_id = auth.uid()
    AND unit_users.is_primary = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.residents
    WHERE residents.unit_id = unit_members.unit_id
    AND residents.user_id = auth.uid()
    AND residents.is_active = true
    AND residents.resident_type = 'proprietario'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_unit_members_updated_at
BEFORE UPDATE ON public.unit_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();