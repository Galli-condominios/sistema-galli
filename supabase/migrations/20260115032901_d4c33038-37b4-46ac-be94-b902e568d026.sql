-- Fix existing admin user by linking to organization
INSERT INTO public.user_organization_members (user_id, organization_id, role)
SELECT 
  '5c6db48c-573b-499e-b88c-833734b136b1',
  organization_id,
  'admin'
FROM public.user_organization_members
WHERE user_id = (
  SELECT owner_id FROM public.organizations LIMIT 1
)
ON CONFLICT DO NOTHING;