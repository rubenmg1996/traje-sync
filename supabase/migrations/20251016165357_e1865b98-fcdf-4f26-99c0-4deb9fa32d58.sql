-- Eliminar el constraint existente
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_tipo_check;

-- Crear el nuevo constraint incluyendo 'stock_bajo'
ALTER TABLE notifications ADD CONSTRAINT notifications_tipo_check 
CHECK (tipo IN ('fichaje_tardio', 'fichaje_corregido', 'stock_bajo'));