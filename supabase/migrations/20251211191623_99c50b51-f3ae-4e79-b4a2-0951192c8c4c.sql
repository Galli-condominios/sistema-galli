-- Drop old delete policy
DROP POLICY IF EXISTS "Only sindico can delete requests" ON public.maintenance_requests;

-- Create new delete policy allowing both sindico and administrador
CREATE POLICY "Admins can delete requests" 
ON public.maintenance_requests 
FOR DELETE 
USING (has_role(auth.uid(), 'sindico'::app_role) OR has_role(auth.uid(), 'administrador'::app_role));