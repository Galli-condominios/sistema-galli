-- =============================================
-- FASE 1: Sistema de Chat por Grupos
-- =============================================

-- 1. Criar tabela de relacionamento N:N entre grupos e condomínios
CREATE TABLE public.block_group_condominiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_group_id UUID NOT NULL REFERENCES public.block_groups(id) ON DELETE CASCADE,
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(block_group_id, condominium_id)
);

-- 2. Migrar dados existentes para a nova tabela de relacionamento
INSERT INTO public.block_group_condominiums (block_group_id, condominium_id)
SELECT id, condominium_id FROM public.block_groups WHERE condominium_id IS NOT NULL;

-- 3. Adicionar campos extras na tabela block_groups
ALTER TABLE public.block_groups 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'users';

-- 4. Criar tabela de mensagens do chat (substituindo feed_messages para grupos)
CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.block_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'file')),
  reply_to_id UUID REFERENCES public.group_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Criar índices para performance
CREATE INDEX idx_group_messages_group ON public.group_messages(group_id);
CREATE INDEX idx_group_messages_created ON public.group_messages(group_id, created_at DESC);
CREATE INDEX idx_group_messages_author ON public.group_messages(author_id);
CREATE INDEX idx_block_group_condominiums_group ON public.block_group_condominiums(block_group_id);
CREATE INDEX idx_block_group_condominiums_condo ON public.block_group_condominiums(condominium_id);

-- 6. Criar tabela de leitura de mensagens (para controle de não lidas)
CREATE TABLE public.group_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  group_id UUID NOT NULL REFERENCES public.block_groups(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  last_read_message_id UUID REFERENCES public.group_messages(id) ON DELETE SET NULL,
  UNIQUE(user_id, group_id)
);

CREATE INDEX idx_group_message_reads_user ON public.group_message_reads(user_id);

-- 7. Habilitar Realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- 8. Habilitar RLS
ALTER TABLE public.block_group_condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_message_reads ENABLE ROW LEVEL SECURITY;

-- 9. RLS para block_group_condominiums
CREATE POLICY "Admins can manage group condominiums"
  ON public.block_group_condominiums FOR ALL
  USING (
    has_role(auth.uid(), 'administrador'::app_role) OR 
    has_role(auth.uid(), 'sindico'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrador'::app_role) OR 
    has_role(auth.uid(), 'sindico'::app_role)
  );

CREATE POLICY "Users can view group condominiums"
  ON public.block_group_condominiums FOR SELECT
  USING (
    condominium_id IN (
      SELECT c.id FROM public.condominiums c
      WHERE c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    )
  );

-- 10. RLS para group_messages
CREATE POLICY "Users can view messages from their groups"
  ON public.group_messages FOR SELECT
  USING (
    -- Admins e síndicos podem ver tudo da organização
    (
      (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role))
      AND EXISTS (
        SELECT 1 FROM public.block_group_condominiums bgc
        JOIN public.condominiums c ON c.id = bgc.condominium_id
        WHERE bgc.block_group_id = group_messages.group_id
        AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
      )
    )
    OR
    -- Moradores podem ver mensagens de grupos de seus condomínios
    EXISTS (
      SELECT 1 FROM public.block_group_condominiums bgc
      JOIN public.units u ON u.condominium_id = bgc.condominium_id
      JOIN public.residents r ON r.unit_id = u.id
      WHERE bgc.block_group_id = group_messages.group_id
      AND r.user_id = auth.uid() 
      AND r.is_active = true
    )
  );

CREATE POLICY "Users can insert messages in their groups"
  ON public.group_messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      -- Admins podem sempre enviar
      has_role(auth.uid(), 'administrador'::app_role) 
      OR has_role(auth.uid(), 'sindico'::app_role)
      OR
      -- Moradores podem enviar se o grupo permite
      (
        EXISTS (
          SELECT 1 FROM public.block_groups bg
          WHERE bg.id = group_id
          AND bg.message_permission = 'members'
        )
        AND EXISTS (
          SELECT 1 FROM public.block_group_condominiums bgc
          JOIN public.units u ON u.condominium_id = bgc.condominium_id
          JOIN public.residents r ON r.unit_id = u.id
          WHERE bgc.block_group_id = group_id
          AND r.user_id = auth.uid() 
          AND r.is_active = true
        )
      )
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON public.group_messages FOR DELETE
  USING (
    author_id = auth.uid() 
    OR has_role(auth.uid(), 'administrador'::app_role) 
    OR has_role(auth.uid(), 'sindico'::app_role)
  );

-- 11. RLS para group_message_reads
CREATE POLICY "Users can manage their own read status"
  ON public.group_message_reads FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 12. Função para atualizar last_message no grupo
CREATE OR REPLACE FUNCTION public.update_group_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.block_groups
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = now()
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_group_last_message
AFTER INSERT ON public.group_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_group_last_message();