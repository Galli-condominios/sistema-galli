
-- Create default organization if not exists
INSERT INTO public.organizations (id, name, slug, plan, max_condominiums)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Organização Padrão',
  'default',
  'free',
  100
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations WHERE slug = 'default'
);

-- Get the default organization ID
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  SELECT id INTO default_org_id FROM public.organizations WHERE slug = 'default' LIMIT 1;
  
  -- Link condominiums without organization to default
  UPDATE public.condominiums 
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;
  
  -- Add all existing admin/sindico users to default organization
  INSERT INTO public.user_organization_members (user_id, organization_id, role)
  SELECT DISTINCT ur.user_id, default_org_id, 'admin'
  FROM public.user_roles ur
  WHERE ur.role IN ('administrador', 'sindico')
    AND NOT EXISTS (
      SELECT 1 FROM public.user_organization_members uom 
      WHERE uom.user_id = ur.user_id AND uom.organization_id = default_org_id
    );
END $$;
