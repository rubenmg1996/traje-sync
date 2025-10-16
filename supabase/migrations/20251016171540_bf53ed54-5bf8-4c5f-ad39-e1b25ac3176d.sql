-- Hacer la columna categoria nullable ya que no usamos categorías
ALTER TABLE productos ALTER COLUMN categoria DROP NOT NULL;