DROP POLICY IF EXISTS "auth_read_photos" ON storage.objects;
CREATE POLICY "auth_read_own_photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
UPDATE storage.buckets SET public = false WHERE id = 'client-photos';