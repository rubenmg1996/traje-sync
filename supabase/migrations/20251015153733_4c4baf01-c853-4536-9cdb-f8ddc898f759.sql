-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefono TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('empleado', 'administrador')),
  fecha_alta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clockings table
CREATE TABLE public.clockings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clockings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Anyone authenticated can view employees"
ON public.employees FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert employees"
ON public.employees FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = auth.uid() AND rol = 'administrador'
  )
);

CREATE POLICY "Admins can update employees"
ON public.employees FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = auth.uid() AND rol = 'administrador'
  )
);

CREATE POLICY "Admins can delete employees"
ON public.employees FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = auth.uid() AND rol = 'administrador'
  )
);

-- RLS Policies for clockings
CREATE POLICY "Anyone authenticated can view clockings"
ON public.clockings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Employees can insert their own clockings"
ON public.clockings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = employee_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can insert any clocking"
ON public.clockings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = auth.uid() AND rol = 'administrador'
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_clockings_employee_id ON public.clockings(employee_id);
CREATE INDEX idx_clockings_fecha_hora ON public.clockings(fecha_hora DESC);
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employees_activo ON public.employees(activo);