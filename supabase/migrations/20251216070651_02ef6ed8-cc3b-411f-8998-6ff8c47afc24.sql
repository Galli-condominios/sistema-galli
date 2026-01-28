-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.user_organization_members;
DROP POLICY IF EXISTS "Organization owners/admins can manage members" ON public.user_organization_members;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON public.user_organization_members;
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view condominiums of their organization" ON public.condominiums;
DROP POLICY IF EXISTS "Admins can manage condominiums of their organization" ON public.condominiums;

-- Create security definer function to get user's organization IDs
CREATE OR REPLACE FUNCTION public.get_user_organization_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_organization_members
  WHERE user_id = _user_id
$$;

-- Create security definer function to check if user owns an organization
CREATE OR REPLACE FUNCTION public.is_organization_owner(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = _organization_id AND owner_id = _user_id
  )
$$;

-- Create security definer function to check if user is org admin
CREATE OR REPLACE FUNCTION public.is_organization_admin(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_organization_members
    WHERE user_id = _user_id 
      AND organization_id = _organization_id 
      AND role IN ('owner', 'admin')
  )
$$;

-- Fixed RLS for user_organization_members
CREATE POLICY "Users can view members of their organizations"
ON public.user_organization_members
FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
);

CREATE POLICY "Organization owners/admins can manage members"
ON public.user_organization_members
FOR ALL
USING (
  public.is_organization_owner(auth.uid(), organization_id)
  OR public.is_organization_admin(auth.uid(), organization_id)
);

CREATE POLICY "Users can insert themselves as members"
ON public.user_organization_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Fixed RLS for organizations
CREATE POLICY "Users can view their organizations"
ON public.organizations
FOR SELECT
USING (
  id IN (SELECT public.get_user_organization_ids(auth.uid()))
  OR owner_id = auth.uid()
);

-- Fixed RLS for condominiums
CREATE POLICY "Users can view condominiums of their organization"
ON public.condominiums
FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  OR has_role(auth.uid(), 'administrador')
  OR has_role(auth.uid(), 'sindico')
);

CREATE POLICY "Admins can manage condominiums of their organization"
ON public.condominiums
FOR ALL
USING (
  (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
  AND (
    organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    OR organization_id IS NULL
  )
);