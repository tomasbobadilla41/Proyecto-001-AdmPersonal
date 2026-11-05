-- ============================================
-- Migración 016: Perfiles, permisos por usuario y códigos de invitación
-- ============================================
-- La app pasa de "un solo usuario" a un grupo cerrado (amigos y familia) que
-- se registra solo, pero únicamente con un código de invitación.
--
--   profiles          → 1 fila por usuario: rol (admin | member) y nombre.
--   user_permissions  → funciones habilitadas por usuario (invoice_ai, mp_sync).
--   invite_codes      → códigos que genera un admin para habilitar registros.
--
-- La validación del código la hace el Auth Hook "Before User Created"
-- (`hook_before_user_created`), que corre en el servidor de Supabase Auth
-- antes de crear la cuenta: no se puede saltear llamando directo a la API.
--
-- ⚠️ Pasos manuales después de aplicar esta migración (dashboard de Supabase):
--   1. Authentication → Hooks → "Before User Created" → Postgres →
--      función public.hook_before_user_created.
--   2. Darte rol admin y el permiso mp_sync (SQL Editor, reemplazando el email):
--        UPDATE public.profiles SET role = 'admin' WHERE email = '<TU_EMAIL>';
--        INSERT INTO public.user_permissions (user_id, permission)
--          SELECT id, 'mp_sync' FROM public.profiles WHERE email = '<TU_EMAIL>'
--          ON CONFLICT DO NOTHING;
--   3. Recién ahí habilitar Authentication → Providers → Email →
--      "Allow new users to sign up".

-- --------------------------------------------
-- Tipos
-- --------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
-- Para sumar un permiso nuevo: ALTER TYPE public.app_permission ADD VALUE '...'.
CREATE TYPE public.app_permission AS ENUM ('invoice_ai', 'mp_sync');

-- --------------------------------------------
-- Tablas
-- --------------------------------------------
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9-]{6,32}$'),
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0 AND used_count <= max_uses),
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT CHECK (char_length(note) <= 120),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Copia del email: auth.users no es legible desde el cliente y el admin
  -- necesita ver la lista de usuarios.
  email TEXT NOT NULL,
  full_name TEXT,
  role public.app_role NOT NULL DEFAULT 'member',
  invited_with UUID REFERENCES public.invite_codes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_permissions (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission public.app_permission NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, permission)
);

-- --------------------------------------------
-- Helpers de autorización (usados por RLS y por las Edge Functions)
-- --------------------------------------------
-- SECURITY DEFINER para que las políticas de profiles puedan consultar
-- profiles sin recursión de RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p public.app_permission)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND permission = p
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(public.app_permission) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(public.app_permission) TO authenticated;

-- --------------------------------------------
-- RLS
-- --------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- profiles: cada uno ve el suyo; el admin ve y edita todos. Los perfiles los
-- crea el trigger de alta (no hay INSERT desde el cliente) y no se borran a
-- mano (se van en cascada al borrar el usuario de auth).
CREATE POLICY "Ver propio perfil o admin" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Admin actualiza perfiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- user_permissions: cada uno ve los suyos; solo el admin otorga/quita.
CREATE POLICY "Ver propios permisos o admin" ON public.user_permissions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admin otorga permisos" ON public.user_permissions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin quita permisos" ON public.user_permissions
  FOR DELETE TO authenticated USING (public.is_admin());

-- invite_codes: exclusivamente admin.
CREATE POLICY "Admin gestiona invitaciones" ON public.invite_codes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- El cliente solo puede cambiar el rol y el nombre de un perfil, y en
-- invitaciones no puede tocar el contador de usos.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (role, full_name) ON public.profiles TO authenticated;
REVOKE UPDATE ON public.invite_codes FROM authenticated, anon;
GRANT UPDATE (active, expires_at, max_uses, note) ON public.invite_codes TO authenticated;

-- Nunca dejar la app sin admin (por ejemplo, que el único admin se baje el rol).
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF OLD.role = 'admin' AND NEW.role <> 'admin' AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE role = 'admin' AND id <> OLD.id
  ) THEN
    RAISE EXCEPTION 'Tiene que quedar al menos un administrador.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_keep_one_admin
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();

-- Completa granted_by con quien otorga el permiso (no se confía en el cliente).
CREATE OR REPLACE FUNCTION public.set_granted_by()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.granted_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_permissions_set_granted_by
  BEFORE INSERT ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_granted_by();

CREATE OR REPLACE FUNCTION public.set_invite_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.created_by := auth.uid();
  NEW.used_count := 0;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invite_codes_set_created_by
  BEFORE INSERT ON public.invite_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_invite_created_by();

-- --------------------------------------------
-- Alta de usuario: perfil + permisos por defecto
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  invite_id UUID;
BEGIN
  SELECT id INTO invite_id
  FROM public.invite_codes
  WHERE code = upper(trim(NEW.raw_user_meta_data ->> 'invite_code'));

  INSERT INTO public.profiles (id, email, full_name, invited_with)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    invite_id
  );

  -- Por defecto todos los miembros pueden leer facturas con IA. mp_sync y el
  -- rol admin se otorgan a mano.
  INSERT INTO public.user_permissions (user_id, permission) VALUES (NEW.id, 'invoice_ai');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Usuarios que ya existían: perfil de miembro + invoice_ai (como hasta ahora,
-- que todos podían usar Gemini). El admin se asigna a mano (ver arriba).
INSERT INTO public.profiles (id, email, full_name)
SELECT id, COALESCE(email, ''), NULLIF(trim(raw_user_meta_data ->> 'full_name'), '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_permissions (user_id, permission)
SELECT id, 'invoice_ai' FROM public.profiles
ON CONFLICT DO NOTHING;

-- --------------------------------------------
-- Auth Hook: Before User Created → exige un código de invitación válido
-- --------------------------------------------
-- Consume un uso del código de forma atómica (UPDATE ... WHERE used_count <
-- max_uses), así dos registros simultáneos no pueden pasarse del límite.
-- Devuelve {} para permitir el alta o {"error": {...}} para rechazarla; el
-- mensaje le llega tal cual al formulario de registro.
-- Sin SECURITY DEFINER (recomendación de Supabase para hooks): corre como
-- supabase_auth_admin, al que se le dan permisos mínimos más abajo.
CREATE OR REPLACE FUNCTION public.hook_before_user_created(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  invite_code TEXT := upper(trim(event -> 'user' -> 'user_metadata' ->> 'invite_code'));
  consumed_id UUID;
BEGIN
  IF invite_code IS NULL OR invite_code = '' THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Necesitás un código de invitación para crear una cuenta.'
    ));
  END IF;

  UPDATE public.invite_codes
  SET used_count = used_count + 1
  WHERE code = invite_code
    AND active
    AND used_count < max_uses
    AND (expires_at IS NULL OR expires_at > NOW())
  RETURNING id INTO consumed_id;

  IF consumed_id IS NULL THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'El código de invitación no es válido, venció o ya no tiene usos disponibles.'
    ));
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

-- Solo Supabase Auth puede ejecutar el hook.
REVOKE EXECUTE ON FUNCTION public.hook_before_user_created(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hook_before_user_created(JSONB) TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT, UPDATE (used_count) ON public.invite_codes TO supabase_auth_admin;
CREATE POLICY "Auth consume invitaciones" ON public.invite_codes
  AS PERMISSIVE FOR SELECT TO supabase_auth_admin USING (TRUE);
CREATE POLICY "Auth actualiza usos de invitaciones" ON public.invite_codes
  AS PERMISSIVE FOR UPDATE TO supabase_auth_admin USING (TRUE) WITH CHECK (TRUE);
