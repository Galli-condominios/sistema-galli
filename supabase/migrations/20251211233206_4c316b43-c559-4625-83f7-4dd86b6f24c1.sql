-- Add max_vehicles column to units table
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS max_vehicles INTEGER DEFAULT 2;

-- Add RLS policy for residents to manage their unit vehicles
CREATE POLICY "Residents can manage their unit vehicles"
ON public.vehicles
FOR ALL
TO authenticated
USING (
  unit_id IN (
    SELECT unit_id FROM public.residents WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  unit_id IN (
    SELECT unit_id FROM public.residents WHERE user_id = auth.uid() AND is_active = true
  )
);