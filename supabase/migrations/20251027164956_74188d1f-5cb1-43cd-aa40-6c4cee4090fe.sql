-- Agregar campos para tipo de entrega y dirección
ALTER TABLE encargos 
ADD COLUMN tipo_entrega TEXT DEFAULT 'recoger' CHECK (tipo_entrega IN ('recoger', 'domicilio')),
ADD COLUMN direccion_envio TEXT,
ADD COLUMN fecha_entrega_estimada TIMESTAMP WITH TIME ZONE;