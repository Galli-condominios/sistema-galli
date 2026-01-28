-- Create financial_charges table for condominium fee management
CREATE TABLE public.financial_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
  charge_type TEXT NOT NULL, -- 'taxa_condominio', 'taxa_extra', 'multa', 'outros'
  amount NUMERIC(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'pago', 'atrasado'
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_method TEXT, -- 'boleto', 'pix', 'transferencia', 'cartao', etc.
  payment_reference TEXT, -- Reference for payment gateway integration
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_financial_charges_unit ON public.financial_charges(unit_id);
CREATE INDEX idx_financial_charges_status ON public.financial_charges(status);
CREATE INDEX idx_financial_charges_due_date ON public.financial_charges(due_date);
CREATE INDEX idx_financial_charges_condominium ON public.financial_charges(condominium_id);

-- Enable Row Level Security
ALTER TABLE public.financial_charges ENABLE ROW LEVEL SECURITY;

-- Admins can manage all financial charges
CREATE POLICY "Admins can manage financial charges"
ON public.financial_charges
FOR ALL
USING (
  has_role(auth.uid(), 'administrador'::app_role) OR 
  has_role(auth.uid(), 'sindico'::app_role)
);

-- Residents can view their own unit's charges
CREATE POLICY "Residents can view their unit charges"
ON public.financial_charges
FOR SELECT
USING (
  unit_id IN (
    SELECT unit_id FROM public.residents WHERE user_id = auth.uid()
  ) OR
  has_role(auth.uid(), 'administrador'::app_role) OR 
  has_role(auth.uid(), 'sindico'::app_role)
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_financial_charges_updated_at
BEFORE UPDATE ON public.financial_charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically update status to 'atrasado' when due date passes
CREATE OR REPLACE FUNCTION public.update_overdue_charges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.financial_charges
  SET status = 'atrasado'
  WHERE status = 'pendente' 
    AND due_date < CURRENT_DATE;
END;
$$;

-- Create table for payment webhooks (for future integration)
CREATE TABLE public.payment_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  charge_id UUID REFERENCES public.financial_charges(id) ON DELETE CASCADE,
  webhook_event TEXT NOT NULL,
  webhook_data JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_webhooks
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhooks
CREATE POLICY "Admins can view payment webhooks"
ON public.payment_webhooks
FOR ALL
USING (
  has_role(auth.uid(), 'administrador'::app_role) OR 
  has_role(auth.uid(), 'sindico'::app_role)
);