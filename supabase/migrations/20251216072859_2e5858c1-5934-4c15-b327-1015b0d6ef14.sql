
-- Tighten data isolation by scoping org-wide access through condominium -> organization membership.
-- This prevents users from seeing default/demo data from other organizations.

-- =========================
-- UNITS
-- =========================
DROP POLICY IF EXISTS "Authenticated users can view units" ON public.units;

CREATE POLICY "Authenticated users can view units"
ON public.units
FOR SELECT
USING (
  -- Residents can view their own unit
  EXISTS (
    SELECT 1
    FROM public.residents r
    WHERE r.user_id = auth.uid()
      AND r.unit_id = units.id
  )
  OR
  -- Admin/Síndico/Porteiro can view units belonging to their organizations
  (
    (public.has_role(auth.uid(), 'administrador'::app_role)
     OR public.has_role(auth.uid(), 'sindico'::app_role)
     OR public.has_role(auth.uid(), 'porteiro'::app_role))
    AND EXISTS (
      SELECT 1
      FROM public.condominiums c
      WHERE c.id = units.condominium_id
        AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  )
);

-- =========================
-- EMPLOYEES
-- =========================
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;

CREATE POLICY "Authenticated users can view employees"
ON public.employees
FOR SELECT
USING (
  (
    public.has_role(auth.uid(), 'administrador'::app_role)
    OR public.has_role(auth.uid(), 'sindico'::app_role)
    OR public.has_role(auth.uid(), 'porteiro'::app_role)
  )
  AND EXISTS (
    SELECT 1
    FROM public.condominiums c
    WHERE c.id = employees.condominium_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

-- =========================
-- COMMON AREAS
-- =========================
DROP POLICY IF EXISTS "Authenticated users can view common areas" ON public.common_areas;

CREATE POLICY "Authenticated users can view common areas"
ON public.common_areas
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.condominiums c
    WHERE c.id = common_areas.condominium_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

-- =========================
-- RESIDENTS (scope admin/síndico visibility)
-- =========================
DROP POLICY IF EXISTS "Admins can view all residents" ON public.residents;

CREATE POLICY "Admins can view all residents"
ON public.residents
FOR SELECT
USING (
  (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.condominiums c ON c.id = u.condominium_id
    WHERE u.id = residents.unit_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

-- Keep "Users can view their own resident info" as-is.

-- =========================
-- VEHICLES (scope admin/síndico visibility)
-- =========================
DROP POLICY IF EXISTS "Admins can view all vehicles" ON public.vehicles;

CREATE POLICY "Admins can view all vehicles"
ON public.vehicles
FOR SELECT
USING (
  (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.condominiums c ON c.id = u.condominium_id
    WHERE u.id = vehicles.unit_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Admins can manage vehicles" ON public.vehicles;

CREATE POLICY "Admins can manage vehicles"
ON public.vehicles
FOR ALL
USING (
  (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.condominiums c ON c.id = u.condominium_id
    WHERE u.id = vehicles.unit_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
)
WITH CHECK (
  (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.condominiums c ON c.id = u.condominium_id
    WHERE u.id = vehicles.unit_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

-- =========================
-- FINANCIAL CHARGES (scope admin/síndico)
-- =========================
DROP POLICY IF EXISTS "Admins can manage financial charges" ON public.financial_charges;

CREATE POLICY "Admins can manage financial charges"
ON public.financial_charges
FOR ALL
USING (
  (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.condominiums c
    WHERE c.id = financial_charges.condominium_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
)
WITH CHECK (
  (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.condominiums c
    WHERE c.id = financial_charges.condominium_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

-- =========================
-- PACKAGES (scope doorkeeper/admin/síndico)
-- =========================
DROP POLICY IF EXISTS "Doorkeepers can manage packages" ON public.packages;

CREATE POLICY "Doorkeepers can manage packages"
ON public.packages
FOR ALL
USING (
  (public.has_role(auth.uid(), 'porteiro'::app_role) OR public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.condominiums c ON c.id = u.condominium_id
    WHERE u.id = packages.unit_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
)
WITH CHECK (
  (public.has_role(auth.uid(), 'porteiro'::app_role) OR public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.condominiums c ON c.id = u.condominium_id
    WHERE u.id = packages.unit_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

-- =========================
-- RESERVATIONS (scope admin/síndico)
-- =========================
DROP POLICY IF EXISTS "Admins can update reservations" ON public.reservations;

CREATE POLICY "Admins can update reservations"
ON public.reservations
FOR UPDATE
USING (
  (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.condominiums c ON c.id = u.condominium_id
    WHERE u.id = reservations.unit_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Admins can delete reservations" ON public.reservations;

CREATE POLICY "Admins can delete reservations"
ON public.reservations
FOR DELETE
USING (
  (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'sindico'::app_role))
  AND EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.condominiums c ON c.id = u.condominium_id
    WHERE u.id = reservations.unit_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

-- Note: existing SELECT policy for reservations already allows admin/síndico unscoped; tighten it too.
DROP POLICY IF EXISTS "Residents can view their reservations" ON public.reservations;

CREATE POLICY "Residents can view their reservations"
ON public.reservations
FOR SELECT
USING (
  -- Resident sees own
  (resident_id IN (
    SELECT residents.id
    FROM public.residents
    WHERE residents.user_id = auth.uid()
  ))
  OR
  -- Admin/Síndico sees only within their orgs
  (
    (public.has_role(auth.uid(), 'administrador'::app_role) OR public.has_role(auth.uid(), 'sindico'::app_role))
    AND EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.condominiums c ON c.id = u.condominium_id
      WHERE u.id = reservations.unit_id
        AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  )
);
