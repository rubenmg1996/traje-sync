-- Add foreign key constraints to incidencias table
ALTER TABLE public.incidencias
ADD CONSTRAINT incidencias_creado_por_fkey 
FOREIGN KEY (creado_por) 
REFERENCES public.employees(id) 
ON DELETE CASCADE;

ALTER TABLE public.incidencias
ADD CONSTRAINT incidencias_asignado_a_fkey 
FOREIGN KEY (asignado_a) 
REFERENCES public.employees(id) 
ON DELETE SET NULL;