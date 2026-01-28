-- Allow admins to create maintenance requests
CREATE POLICY "Admins can create requests"
ON public.maintenance_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'administrador'::app_role) 
  OR has_role(auth.uid(), 'sindico'::app_role)
);