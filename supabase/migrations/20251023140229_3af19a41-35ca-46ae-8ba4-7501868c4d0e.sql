-- Ensure public bucket for product images and permissive read access
-- Create bucket 'productos' if not exists and make it public
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;

-- Allow public read access to files in 'productos' bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can read productos'
  ) THEN
    CREATE POLICY "Public can read productos" 
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'productos');
  END IF;
END$$;

-- Allow authenticated users to manage files in 'productos' bucket from the app (uploads/updates/deletes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can upload productos'
  ) THEN
    CREATE POLICY "Authenticated can upload productos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'productos');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can update productos'
  ) THEN
    CREATE POLICY "Authenticated can update productos"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'productos')
    WITH CHECK (bucket_id = 'productos');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can delete productos'
  ) THEN
    CREATE POLICY "Authenticated can delete productos"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'productos');
  END IF;
END$$;