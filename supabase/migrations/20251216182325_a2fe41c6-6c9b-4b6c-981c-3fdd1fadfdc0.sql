-- Create security definer function to check if user is a resident of a unit
CREATE OR REPLACE FUNCTION public.is_resident_of_unit(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.residents
    WHERE user_id = _user_id AND unit_id = _unit_id
  )
$$;

-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can view units" ON public.units;

-- Recreate policy using security definer function
CREATE POLICY "Authenticated users can view units" 
ON public.units 
FOR SELECT 
USING (
  public.is_resident_of_unit(auth.uid(), id)
  OR (
    (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role) OR has_role(auth.uid(), 'porteiro'::app_role))
    AND EXISTS (
      SELECT 1
      FROM condominiums c
      WHERE c.id = units.condominium_id 
      AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    )
  )
);