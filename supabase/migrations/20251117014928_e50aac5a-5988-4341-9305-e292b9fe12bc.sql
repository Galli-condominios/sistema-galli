-- Tabela de áreas comuns
CREATE TABLE common_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  rules TEXT,
  requires_approval BOOLEAN DEFAULT true,
  cancellation_policy TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_common_areas_updated_at
BEFORE UPDATE ON common_areas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela de reservas
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_area_id UUID NOT NULL REFERENCES common_areas(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'cancelada')),
  guests_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(common_area_id, reservation_date, start_time)
);

CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela de convidados da reserva
CREATE TABLE reservation_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  companion_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de checklist da reserva
CREATE TABLE reservation_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de autorizações de visitantes
CREATE TABLE visitor_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_document TEXT NOT NULL,
  visitor_phone TEXT,
  service_type TEXT,
  authorization_date DATE NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  document_url TEXT,
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'utilizada', 'expirada', 'cancelada')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_visitor_authorizations_updated_at
BEFORE UPDATE ON visitor_authorizations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela de encomendas
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  logged_by UUID REFERENCES profiles(id),
  tracking_code TEXT,
  sender TEXT,
  description TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  collected_at TIMESTAMPTZ,
  status TEXT DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'coletada')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_packages_updated_at
BEFORE UPDATE ON packages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela de ocorrências/solicitações
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('reclamacao', 'sugestao', 'manutencao', 'limpeza', 'seguranca', 'outros')),
  location TEXT,
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'concluido', 'cancelado')),
  is_public BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_maintenance_requests_updated_at
BEFORE UPDATE ON maintenance_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela de histórico de atualizações das ocorrências
CREATE TABLE maintenance_request_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES profiles(id),
  old_status TEXT,
  new_status TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies para Common Areas
ALTER TABLE common_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view common areas"
ON common_areas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage common areas"
ON common_areas FOR ALL TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role));

-- RLS Policies para Reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Residents can view their reservations"
ON reservations FOR SELECT TO authenticated
USING (
  resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'sindico'::app_role)
);

CREATE POLICY "Residents can create reservations"
ON reservations FOR INSERT TO authenticated
WITH CHECK (resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update reservations"
ON reservations FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role));

CREATE POLICY "Admins can delete reservations"
ON reservations FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role));

-- RLS Policies para Reservation Guests
ALTER TABLE reservation_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view guests of their reservations"
ON reservation_guests FOR SELECT TO authenticated
USING (
  reservation_id IN (
    SELECT id FROM reservations WHERE resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'sindico'::app_role)
  OR has_role(auth.uid(), 'porteiro'::app_role)
);

CREATE POLICY "Residents can manage guests of their reservations"
ON reservation_guests FOR ALL TO authenticated
USING (
  reservation_id IN (
    SELECT id FROM reservations WHERE resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid())
  )
);

-- RLS Policies para Reservation Checklist
ALTER TABLE reservation_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist of their reservations"
ON reservation_checklist FOR SELECT TO authenticated
USING (
  reservation_id IN (
    SELECT id FROM reservations WHERE resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'sindico'::app_role)
);

CREATE POLICY "Residents can manage checklist of their reservations"
ON reservation_checklist FOR ALL TO authenticated
USING (
  reservation_id IN (
    SELECT id FROM reservations WHERE resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid())
  )
);

-- RLS Policies para Visitor Authorizations
ALTER TABLE visitor_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Residents can manage their authorizations"
ON visitor_authorizations FOR ALL TO authenticated
USING (resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid()));

CREATE POLICY "Doorkeepers can view authorizations"
ON visitor_authorizations FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'porteiro'::app_role) 
  OR has_role(auth.uid(), 'administrador'::app_role) 
  OR has_role(auth.uid(), 'sindico'::app_role)
);

CREATE POLICY "Doorkeepers can update authorization status"
ON visitor_authorizations FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'porteiro'::app_role) 
  OR has_role(auth.uid(), 'administrador'::app_role) 
  OR has_role(auth.uid(), 'sindico'::app_role)
);

-- RLS Policies para Packages
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doorkeepers can manage packages"
ON packages FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'porteiro'::app_role) 
  OR has_role(auth.uid(), 'administrador'::app_role) 
  OR has_role(auth.uid(), 'sindico'::app_role)
);

CREATE POLICY "Residents can view their packages"
ON packages FOR SELECT TO authenticated
USING (
  unit_id IN (SELECT unit_id FROM residents WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'administrador'::app_role)
  OR has_role(auth.uid(), 'sindico'::app_role)
  OR has_role(auth.uid(), 'porteiro'::app_role)
);

-- RLS Policies para Maintenance Requests
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view public requests"
ON maintenance_requests FOR SELECT TO authenticated
USING (
  is_public = true 
  OR resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid()) 
  OR has_role(auth.uid(), 'administrador'::app_role) 
  OR has_role(auth.uid(), 'sindico'::app_role)
);

CREATE POLICY "Residents can create requests"
ON maintenance_requests FOR INSERT TO authenticated
WITH CHECK (resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update requests"
ON maintenance_requests FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'administrador'::app_role) 
  OR has_role(auth.uid(), 'sindico'::app_role)
);

CREATE POLICY "Only sindico can delete requests"
ON maintenance_requests FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'sindico'::app_role));

-- RLS Policies para Maintenance Request Updates
ALTER TABLE maintenance_request_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view updates of visible requests"
ON maintenance_request_updates FOR SELECT TO authenticated
USING (
  request_id IN (
    SELECT id FROM maintenance_requests WHERE is_public = true
    OR resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'administrador'::app_role)
    OR has_role(auth.uid(), 'sindico'::app_role)
  )
);

CREATE POLICY "Admins can create updates"
ON maintenance_request_updates FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role) 
  OR has_role(auth.uid(), 'sindico'::app_role)
);

-- Storage bucket para documentos de visitantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('visitor-documents', 'visitor-documents', false);

-- RLS para visitor-documents bucket
CREATE POLICY "Residents can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'visitor-documents' 
  AND (
    has_role(auth.uid(), 'morador'::app_role)
    OR has_role(auth.uid(), 'administrador'::app_role)
    OR has_role(auth.uid(), 'sindico'::app_role)
  )
);

CREATE POLICY "Doorkeepers can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'visitor-documents'
  AND (
    has_role(auth.uid(), 'porteiro'::app_role) 
    OR has_role(auth.uid(), 'administrador'::app_role) 
    OR has_role(auth.uid(), 'sindico'::app_role)
  )
);