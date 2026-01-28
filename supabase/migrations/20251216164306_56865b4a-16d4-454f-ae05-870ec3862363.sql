-- =============================================
-- FASE 1: Tabelas de Leitura de Consumo
-- =============================================

-- Tabela de Leituras de Água
CREATE TABLE public.water_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  reading_month INTEGER NOT NULL CHECK (reading_month >= 1 AND reading_month <= 12),
  reading_year INTEGER NOT NULL CHECK (reading_year >= 2020),
  previous_reading NUMERIC NOT NULL DEFAULT 0,
  current_reading NUMERIC NOT NULL,
  consumption_m3 NUMERIC GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
  rate_per_m3 NUMERIC NOT NULL,
  calculated_amount NUMERIC GENERATED ALWAYS AS ((current_reading - previous_reading) * rate_per_m3) STORED,
  financial_charge_id UUID REFERENCES public.financial_charges(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unit_id, reading_month, reading_year)
);

-- Tabela de Leituras de Energia (Veículos Elétricos)
CREATE TABLE public.electricity_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  garage_identifier TEXT NOT NULL,
  meter_serial TEXT,
  reading_month INTEGER NOT NULL CHECK (reading_month >= 1 AND reading_month <= 12),
  reading_year INTEGER NOT NULL CHECK (reading_year >= 2020),
  previous_reading NUMERIC NOT NULL DEFAULT 0,
  current_reading NUMERIC NOT NULL,
  consumption_kwh NUMERIC GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
  rate_per_kwh NUMERIC NOT NULL,
  calculated_amount NUMERIC GENERATED ALWAYS AS ((current_reading - previous_reading) * rate_per_kwh) STORED,
  financial_charge_id UUID REFERENCES public.financial_charges(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unit_id, garage_identifier, reading_month, reading_year)
);

-- Tabela de Tarifas Vigentes
CREATE TABLE public.utility_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  utility_type TEXT NOT NULL CHECK (utility_type IN ('gas', 'water', 'electricity')),
  rate_per_unit NUMERIC NOT NULL,
  unit_label TEXT NOT NULL DEFAULT 'm³',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- FASE 2: Sistema de Despesas e Rateio
-- =============================================

-- Tabela de Despesas do Condomínio
CREATE TABLE public.condominium_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  expense_month INTEGER NOT NULL CHECK (expense_month >= 1 AND expense_month <= 12),
  expense_year INTEGER NOT NULL CHECK (expense_year >= 2020),
  category TEXT NOT NULL CHECK (category IN ('obras', 'manutencao', 'limpeza', 'seguranca', 'higiene', 'conservacao', 'administrativo', 'outros')),
  description TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  invoice_url TEXT,
  invoice_number TEXT,
  supplier_name TEXT,
  is_apportioned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Rateios Calculados
CREATE TABLE public.expense_apportionments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.condominium_expenses(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  apportioned_amount NUMERIC NOT NULL,
  financial_charge_id UUID REFERENCES public.financial_charges(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(expense_id, unit_id)
);

-- Adicionar campo de detalhamento na tabela de cobranças
ALTER TABLE public.financial_charges 
ADD COLUMN IF NOT EXISTS breakdown_details JSONB DEFAULT NULL;

-- Adicionar novos tipos de cobrança
ALTER TABLE public.financial_charges 
DROP CONSTRAINT IF EXISTS financial_charges_charge_type_check;

-- =============================================
-- RLS Policies
-- =============================================

-- Water Readings
ALTER TABLE public.water_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage water readings"
ON public.water_readings FOR ALL
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1 FROM condominiums c
    WHERE c.id = water_readings.condominium_id
    AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1 FROM condominiums c
    WHERE c.id = water_readings.condominium_id
    AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
  )
);

CREATE POLICY "Residents can view their water readings"
ON public.water_readings FOR SELECT
USING (
  unit_id IN (SELECT unit_id FROM residents WHERE user_id = auth.uid())
);

-- Electricity Readings
ALTER TABLE public.electricity_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage electricity readings"
ON public.electricity_readings FOR ALL
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1 FROM condominiums c
    WHERE c.id = electricity_readings.condominium_id
    AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1 FROM condominiums c
    WHERE c.id = electricity_readings.condominium_id
    AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
  )
);

CREATE POLICY "Residents can view their electricity readings"
ON public.electricity_readings FOR SELECT
USING (
  unit_id IN (SELECT unit_id FROM residents WHERE user_id = auth.uid())
);

-- Utility Rates
ALTER TABLE public.utility_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage utility rates"
ON public.utility_rates FOR ALL
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1 FROM condominiums c
    WHERE c.id = utility_rates.condominium_id
    AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1 FROM condominiums c
    WHERE c.id = utility_rates.condominium_id
    AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
  )
);

CREATE POLICY "Users can view utility rates of their condominium"
ON public.utility_rates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM condominiums c
    WHERE c.id = utility_rates.condominium_id
    AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
  )
);

-- Condominium Expenses
ALTER TABLE public.condominium_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage condominium expenses"
ON public.condominium_expenses FOR ALL
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1 FROM condominiums c
    WHERE c.id = condominium_expenses.condominium_id
    AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1 FROM condominiums c
    WHERE c.id = condominium_expenses.condominium_id
    AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
  )
);

CREATE POLICY "Residents can view expenses of their condominium"
ON public.condominium_expenses FOR SELECT
USING (
  condominium_id IN (
    SELECT u.condominium_id FROM units u
    JOIN residents r ON r.unit_id = u.id
    WHERE r.user_id = auth.uid()
  )
);

-- Expense Apportionments
ALTER TABLE public.expense_apportionments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expense apportionments"
ON public.expense_apportionments FOR ALL
USING (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1 FROM condominium_expenses ce
    JOIN condominiums c ON c.id = ce.condominium_id
    WHERE ce.id = expense_apportionments.expense_id
    AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
  )
)
WITH CHECK (
  (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1 FROM condominium_expenses ce
    JOIN condominiums c ON c.id = ce.condominium_id
    WHERE ce.id = expense_apportionments.expense_id
    AND c.organization_id IN (SELECT get_user_organization_ids(auth.uid()))
  )
);

CREATE POLICY "Residents can view their apportionments"
ON public.expense_apportionments FOR SELECT
USING (
  unit_id IN (SELECT unit_id FROM residents WHERE user_id = auth.uid())
);

-- =============================================
-- Triggers para updated_at
-- =============================================

CREATE TRIGGER update_water_readings_updated_at
BEFORE UPDATE ON public.water_readings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_electricity_readings_updated_at
BEFORE UPDATE ON public.electricity_readings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_utility_rates_updated_at
BEFORE UPDATE ON public.utility_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_condominium_expenses_updated_at
BEFORE UPDATE ON public.condominium_expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_apportionments_updated_at
BEFORE UPDATE ON public.expense_apportionments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();