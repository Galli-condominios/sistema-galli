-- Fase 1.1: Criar tabela organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan TEXT DEFAULT 'free',
  max_condominiums INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fase 1.2: Criar tabela user_organization_members
CREATE TABLE public.user_organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Fase 1.3: Adicionar organization_id à tabela condominiums
ALTER TABLE public.condominiums 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Fase 1.4: Função helper para verificar acesso à organização
CREATE OR REPLACE FUNCTION public.has_organization_access(_user_id uuid, _organization_id uuid)
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
  )
$$;

-- Fase 1.5: Habilitar RLS nas novas tabelas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organization_members ENABLE ROW LEVEL SECURITY;

-- Fase 1.6: RLS Policies para organizations
CREATE POLICY "Users can view their organizations"
ON public.organizations
FOR SELECT
USING (
  id IN (
    SELECT organization_id FROM public.user_organization_members 
    WHERE user_id = auth.uid()
  )
  OR owner_id = auth.uid()
);

CREATE POLICY "Organization owners can update their org"
ON public.organizations
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Fase 1.7: RLS Policies para user_organization_members
CREATE POLICY "Users can view members of their organizations"
ON public.user_organization_members
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization owners/admins can manage members"
ON public.user_organization_members
FOR ALL
USING (
  organization_id IN (
    SELECT o.id FROM public.organizations o
    WHERE o.owner_id = auth.uid()
  )
  OR (
    organization_id IN (
      SELECT organization_id FROM public.user_organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

CREATE POLICY "Users can insert themselves as members"
ON public.user_organization_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Fase 1.8: Atualizar RLS de condominiums para filtrar por organização
DROP POLICY IF EXISTS "Admins can manage condominiums" ON public.condominiums;
DROP POLICY IF EXISTS "Authenticated users can view condominiums" ON public.condominiums;

CREATE POLICY "Users can view condominiums of their organization"
ON public.condominiums
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_organization_members 
    WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'administrador')
  OR has_role(auth.uid(), 'sindico')
);

CREATE POLICY "Admins can manage condominiums of their organization"
ON public.condominiums
FOR ALL
USING (
  (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
  AND (
    organization_id IN (
      SELECT organization_id FROM public.user_organization_members 
      WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  )
);

-- Fase 1.9: Trigger para atualizar updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();