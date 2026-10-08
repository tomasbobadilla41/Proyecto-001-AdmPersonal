-- ============================================
-- Servicios de streaming que el usuario agregó a mano (además de los
-- precargados en DEFAULT_STREAMING_SERVICES, que no viven en la base).
-- ============================================
CREATE TABLE custom_streaming_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE (user_id, name)
);

ALTER TABLE custom_streaming_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver propios servicios de streaming" ON custom_streaming_services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar propios servicios de streaming" ON custom_streaming_services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propios servicios de streaming" ON custom_streaming_services FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propios servicios de streaming" ON custom_streaming_services FOR DELETE USING (auth.uid() = user_id);
