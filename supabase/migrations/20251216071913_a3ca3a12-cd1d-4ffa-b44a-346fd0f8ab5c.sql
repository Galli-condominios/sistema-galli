-- Phase 1: Clean up data and prevent future issues

-- Remove user "marcos paulo" (condofacil) from "Organização Padrão" if they have multiple memberships
-- This prevents users created in one organization from seeing data from another organization
DELETE FROM public.user_organization_members
WHERE user_id IN (
  SELECT uom.user_id
  FROM public.user_organization_members uom
  JOIN public.organizations o ON uom.organization_id = o.id
  WHERE o.slug = 'default'
  GROUP BY uom.user_id
  HAVING COUNT(*) > 0
  AND EXISTS (
    SELECT 1 
    FROM public.user_organization_members uom2
    JOIN public.organizations o2 ON uom2.organization_id = o2.id
    WHERE uom2.user_id = uom.user_id
    AND o2.slug != 'default'
  )
)
AND organization_id = (SELECT id FROM public.organizations WHERE slug = 'default');

-- Ensure RLS on condominiums checks organization membership properly
-- Drop existing policies and recreate with stricter rules
DROP POLICY IF EXISTS "Users can view condominiums of their organization" ON public.condominiums;
DROP POLICY IF EXISTS "Admins can manage condominiums of their organization" ON public.condominiums;

-- Create stricter policy: users can only see condominiums from organizations they belong to
CREATE POLICY "Users can view condominiums of their organization" 
ON public.condominiums
FOR SELECT
USING (
  organization_id IN (
    SELECT get_user_organization_ids(auth.uid())
  )
);

-- Admins can manage only their organization's condominiums
CREATE POLICY "Admins can manage condominiums of their organization" 
ON public.condominiums
FOR ALL
USING (
  (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
  AND organization_id IN (SELECT get_user_organization_ids(auth.uid()))
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
  AND organization_id IN (SELECT get_user_organization_ids(auth.uid()))
);