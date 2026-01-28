-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('sindico', 'administrador', 'morador', 'porteiro');

-- Create enum for resident type
CREATE TYPE public.resident_type AS ENUM ('proprietario', 'inquilino');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'morador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create condominiums table
CREATE TABLE public.condominiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create units table
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE NOT NULL,
  unit_number TEXT NOT NULL,
  floor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(condominium_id, unit_number)
);

-- Create residents table
CREATE TABLE public.residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  resident_type resident_type NOT NULL,
  contract_start_date DATE,
  contract_end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  resident_id UUID REFERENCES public.residents(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  plate TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create access_logs table
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_document TEXT NOT NULL,
  visitor_type TEXT NOT NULL CHECK (visitor_type IN ('visitante', 'prestador_servico')),
  service_company TEXT,
  service_type TEXT,
  entry_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  exit_time TIMESTAMPTZ,
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create gas_readings table
CREATE TABLE public.gas_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  reading_month INTEGER NOT NULL CHECK (reading_month >= 1 AND reading_month <= 12),
  reading_year INTEGER NOT NULL,
  reading_value DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, reading_month, reading_year)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gas_readings ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to handle new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'morador')
  );
  
  -- Also insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'morador')
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for condominiums
CREATE POLICY "Authenticated users can view condominiums"
  ON public.condominiums FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage condominiums"
  ON public.condominiums FOR ALL
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for units
CREATE POLICY "Authenticated users can view units"
  ON public.units FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage units"
  ON public.units FOR ALL
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for residents
CREATE POLICY "Users can view their own resident info"
  ON public.residents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all residents"
  ON public.residents FOR SELECT
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can manage residents"
  ON public.residents FOR ALL
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for vehicles
CREATE POLICY "Users can view vehicles for their unit"
  ON public.vehicles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents
      WHERE residents.user_id = auth.uid()
      AND residents.unit_id = vehicles.unit_id
    )
  );

CREATE POLICY "Admins can view all vehicles"
  ON public.vehicles FOR SELECT
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can manage vehicles"
  ON public.vehicles FOR ALL
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for employees
CREATE POLICY "Authenticated users can view employees"
  ON public.employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage employees"
  ON public.employees FOR ALL
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for access_logs
CREATE POLICY "Admins can view all access logs"
  ON public.access_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'porteiro'));

CREATE POLICY "Doormen can create access logs"
  ON public.access_logs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'porteiro') OR public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Doormen can update access logs"
  ON public.access_logs FOR UPDATE
  USING (public.has_role(auth.uid(), 'porteiro') OR public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for gas_readings
CREATE POLICY "Users can view gas readings for their unit"
  ON public.gas_readings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.residents
      WHERE residents.user_id = auth.uid()
      AND residents.unit_id = gas_readings.unit_id
    )
  );

CREATE POLICY "Admins can view all gas readings"
  ON public.gas_readings FOR SELECT
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can manage gas readings"
  ON public.gas_readings FOR ALL
  USING (public.has_role(auth.uid(), 'sindico') OR public.has_role(auth.uid(), 'administrador'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_condominiums_updated_at
  BEFORE UPDATE ON public.condominiums
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_residents_updated_at
  BEFORE UPDATE ON public.residents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gas_readings_updated_at
  BEFORE UPDATE ON public.gas_readings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();