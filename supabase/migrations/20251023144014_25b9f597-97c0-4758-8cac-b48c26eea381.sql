-- Ensure public Storage bucket 'productos' exists and is public, and allow public read access
-- Create or update bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'productos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('productos', 'productos', true);
  ELSE
    -- Ensure it's public
    UPDATE storage.buckets SET public = true WHERE id = 'productos';
  END IF;
END$$;

-- Allow public read access to files in 'productos' bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Public read for productos'
  ) THEN
    CREATE POLICY "Public read for productos"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'productos');
  END IF;
END$$;
