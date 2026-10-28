-- ============================================
-- Migración 010: Elimina políticas RLS duplicadas en expenses
-- ============================================
-- `expenses` es la única tabla creada a mano desde el dashboard antes de
-- adoptar las migraciones versionadas (ver comentario en 001). Quedaron dos
-- juegos de políticas conviviendo: las originales del dashboard
-- ("Los usuarios pueden...") y las que documenta/mantiene 001 y 009
-- ("Insertar propios gastos", etc). Postgres combina políticas permisivas
-- del mismo comando con OR, así que la política vieja de INSERT/UPDATE
-- (que solo chequea `auth.uid() = user_id`, sin validar `service_id`)
-- alcanzaba sola para esquivar el check de pertenencia cruzada agregado en
-- la migración 009 — se confirmó en vivo: un usuario podía insertar un
-- `expense` con el `service_id` de otro usuario y la vieja política lo
-- dejaba pasar igual. Verificado contra pg_policies que ninguna otra tabla
-- tiene este duplicado.

DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios gastos" ON expenses;
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios gastos" ON expenses;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios gastos" ON expenses;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios gastos" ON expenses;
