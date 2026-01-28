-- =============================================
-- FASE 1: Sistema de Usuários por Unidade
-- =============================================

-- Tabela unit_users: múltiplos usuários por unidade
CREATE TABLE public.unit_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(unit_id, user_id)
);

-- Índices para performance
CREATE INDEX idx_unit_users_unit_id ON public.unit_users(unit_id);
CREATE INDEX idx_unit_users_user_id ON public.unit_users(user_id);

-- Função para validar limite de 5 usuários por unidade
CREATE OR REPLACE FUNCTION public.validate_unit_users_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.unit_users WHERE unit_id = NEW.unit_id) >= 5 THEN
    RAISE EXCEPTION 'Limite máximo de 5 usuários por unidade atingido';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para validar limite
CREATE TRIGGER check_unit_users_limit
  BEFORE INSERT ON public.unit_users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_unit_users_limit();

-- Função para garantir apenas 1 titular por unidade
CREATE OR REPLACE FUNCTION public.validate_primary_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.unit_users 
    SET is_primary = false 
    WHERE unit_id = NEW.unit_id AND id != NEW.id AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para titular único
CREATE TRIGGER ensure_single_primary
  BEFORE INSERT OR UPDATE ON public.unit_users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_primary_user();

-- RLS para unit_users
ALTER TABLE public.unit_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their unit members"
  ON public.unit_users FOR SELECT
  USING (
    unit_id IN (SELECT unit_id FROM public.unit_users WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'administrador')
    OR has_role(auth.uid(), 'sindico')
  );

CREATE POLICY "Primary users can manage unit members"
  ON public.unit_users FOR ALL
  USING (
    (unit_id IN (SELECT unit_id FROM public.unit_users WHERE user_id = auth.uid() AND is_primary = true))
    OR has_role(auth.uid(), 'administrador')
    OR has_role(auth.uid(), 'sindico')
  )
  WITH CHECK (
    (unit_id IN (SELECT unit_id FROM public.unit_users WHERE user_id = auth.uid() AND is_primary = true))
    OR has_role(auth.uid(), 'administrador')
    OR has_role(auth.uid(), 'sindico')
  );

-- =============================================
-- FASE 2: Sistema de Grupos por Bloco
-- =============================================

-- Tabela block_groups
CREATE TABLE public.block_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  block TEXT,
  is_default BOOLEAN DEFAULT false,
  message_permission TEXT DEFAULT 'members' CHECK (message_permission IN ('members', 'admins_only')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para performance
CREATE INDEX idx_block_groups_condominium ON public.block_groups(condominium_id);

-- Adicionar coluna block_group_id na tabela units
ALTER TABLE public.units ADD COLUMN block_group_id UUID REFERENCES public.block_groups(id);

-- RLS para block_groups
ALTER TABLE public.block_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups of their condominium"
  ON public.block_groups FOR SELECT
  USING (
    condominium_id IN (
      SELECT c.id FROM public.condominiums c
      WHERE c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    )
  );

CREATE POLICY "Admins can manage block groups"
  ON public.block_groups FOR ALL
  USING (
    (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
    AND condominium_id IN (
      SELECT c.id FROM public.condominiums c
      WHERE c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    )
  )
  WITH CHECK (
    (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
    AND condominium_id IN (
      SELECT c.id FROM public.condominiums c
      WHERE c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    )
  );

-- =============================================
-- FASE 3: Feed de Mensagens
-- =============================================

-- Tabela feed_messages
CREATE TABLE public.feed_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.block_groups(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', NULL)),
  is_global BOOLEAN DEFAULT false,
  reactions JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_feed_messages_condominium ON public.feed_messages(condominium_id);
CREATE INDEX idx_feed_messages_group ON public.feed_messages(group_id);
CREATE INDEX idx_feed_messages_expires ON public.feed_messages(expires_at);
CREATE INDEX idx_feed_messages_author ON public.feed_messages(author_id);

-- Tabela feed_comments
CREATE TABLE public.feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.feed_messages(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para performance
CREATE INDEX idx_feed_comments_message ON public.feed_comments(message_id);

-- RLS para feed_messages
ALTER TABLE public.feed_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their groups or global"
  ON public.feed_messages FOR SELECT
  USING (
    expires_at > now() AND (
      is_global = true
      OR group_id IN (
        SELECT u.block_group_id FROM public.units u
        JOIN public.residents r ON r.unit_id = u.id
        WHERE r.user_id = auth.uid()
      )
      OR has_role(auth.uid(), 'administrador')
      OR has_role(auth.uid(), 'sindico')
    )
  );

CREATE POLICY "Users can create messages in their groups"
  ON public.feed_messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND (
      -- Admins can post globally
      (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
      OR
      -- Members can post to their group if permission allows
      (group_id IN (
        SELECT u.block_group_id FROM public.units u
        JOIN public.residents r ON r.unit_id = u.id
        WHERE r.user_id = auth.uid()
      ) AND EXISTS (
        SELECT 1 FROM public.block_groups bg
        WHERE bg.id = group_id AND bg.message_permission = 'members'
      ))
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.feed_messages FOR UPDATE
  USING (author_id = auth.uid() OR has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'));

CREATE POLICY "Users can delete their own messages"
  ON public.feed_messages FOR DELETE
  USING (author_id = auth.uid() OR has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'));

-- RLS para feed_comments
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on visible messages"
  ON public.feed_comments FOR SELECT
  USING (
    message_id IN (SELECT id FROM public.feed_messages)
  );

CREATE POLICY "Users can create comments"
  ON public.feed_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    message_id IN (SELECT id FROM public.feed_messages)
  );

CREATE POLICY "Users can delete their own comments"
  ON public.feed_comments FOR DELETE
  USING (author_id = auth.uid() OR has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'));

-- =============================================
-- FASE 4: Mediação entre Vizinhos
-- =============================================

-- Tabela neighbor_mediations
CREATE TABLE public.neighbor_mediations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  requester_resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  target_unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  occurrence_datetime TIMESTAMPTZ NOT NULL,
  complaint_reason TEXT NOT NULL,
  requested_action TEXT NOT NULL,
  status TEXT DEFAULT 'pending_response' CHECK (status IN (
    'pending_response', 'responded', 'awaiting_resolution', 
    'mediation_requested', 'mediation_in_progress', 'resolved', 'closed'
  )),
  response_deadline TIMESTAMPTZ NOT NULL,
  mediation_available_at TIMESTAMPTZ NOT NULL,
  syndic_intervention_requested BOOLEAN DEFAULT false,
  syndic_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_mediations_condominium ON public.neighbor_mediations(condominium_id);
CREATE INDEX idx_mediations_requester ON public.neighbor_mediations(requester_resident_id);
CREATE INDEX idx_mediations_target ON public.neighbor_mediations(target_unit_id);
CREATE INDEX idx_mediations_status ON public.neighbor_mediations(status);

-- Tabela mediation_responses
CREATE TABLE public.mediation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mediation_id UUID NOT NULL REFERENCES public.neighbor_mediations(id) ON DELETE CASCADE,
  responder_resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  response_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para performance
CREATE INDEX idx_mediation_responses_mediation ON public.mediation_responses(mediation_id);

-- RLS para neighbor_mediations
ALTER TABLE public.neighbor_mediations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mediations they are involved in"
  ON public.neighbor_mediations FOR SELECT
  USING (
    requester_resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid())
    OR target_unit_id IN (SELECT unit_id FROM public.residents WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'administrador')
    OR has_role(auth.uid(), 'sindico')
  );

CREATE POLICY "Residents can create mediations"
  ON public.neighbor_mediations FOR INSERT
  WITH CHECK (
    requester_resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid())
  );

CREATE POLICY "Involved parties and admins can update mediations"
  ON public.neighbor_mediations FOR UPDATE
  USING (
    requester_resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid())
    OR target_unit_id IN (SELECT unit_id FROM public.residents WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'administrador')
    OR has_role(auth.uid(), 'sindico')
  );

-- RLS para mediation_responses
ALTER TABLE public.mediation_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses for their mediations"
  ON public.mediation_responses FOR SELECT
  USING (
    mediation_id IN (SELECT id FROM public.neighbor_mediations)
  );

CREATE POLICY "Target unit residents can respond"
  ON public.mediation_responses FOR INSERT
  WITH CHECK (
    responder_resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid())
    AND mediation_id IN (
      SELECT id FROM public.neighbor_mediations nm
      WHERE nm.target_unit_id IN (SELECT unit_id FROM public.residents WHERE user_id = auth.uid())
    )
  );

-- =============================================
-- Habilitar Realtime
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.neighbor_mediations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mediation_responses;