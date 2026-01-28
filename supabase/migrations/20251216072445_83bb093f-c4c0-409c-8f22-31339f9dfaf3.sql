
-- Fix the organizations SELECT policy to handle NULL owner_id correctly
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

CREATE POLICY "Users can view their organizations" 
ON public.organizations 
FOR SELECT 
USING (
  id IN (SELECT get_user_organization_ids(auth.uid()))
  OR (owner_id IS NOT NULL AND owner_id = auth.uid())
);
