# Contexto del Proyecto — AdmPersonal

> Documento generado para dar contexto completo a un agente de IA que retome este proyecto. Última actualización: 2026-10-11.

## Qué es

App web personal de administración financiera (gastos, inversiones, inmuebles en alquiler, servicios/pagos recurrentes) para un único usuario con cuenta propia, con soporte multi-moneda ARS/USD. React + Vite + TypeScript + Tailwind + shadcn/ui.

## Stack técnico

- **Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS 4, shadcn/ui (sobre Radix), Lucide Icons, Recharts para gráficos.
- **Backend:** Supabase (Postgres + Auth). Cliente en `src/lib/supabase.ts`, credenciales en `.env.local` (no versionado).
- **Extras:** `jspdf`/`jspdf-autotable` y `papaparse` para exportar/importar gastos (CSV/PDF), `sonner` para toasts.
- **APIs externas:** Binance (precios cripto, `useBinancePrices.ts`/`binanceApi.ts`) y una API de dólar oficial (`useDolarOficial.ts`/`dolarApi.ts`), más `ipcApi.ts` (índice IPC para actualización de alquileres).

## Idioma del proyecto

Todo el trabajo (interacción, comentarios de código, mensajes de la UI, commits) debe redactarse en español — está definido en `CLAUDE.md`.

## Estado de la migración localStorage → Supabase (eje central de los últimos commits)

Terminada para **todos los módulos de negocio**. Cada módulo sigue el mismo patrón: tabla en Postgres con RLS por `user_id` → archivo `*Api.ts` en `src/services/` con las queries → Context/Provider en `src/hooks/use*Store.tsx` que expone estado + funciones async (ya no sync) → consumido por páginas/componentes.

Módulos migrados (orden cronológico por PRs, todos mergeados a `main`):

1. Auth + rutas protegidas (Supabase Auth, `useAuth.tsx`, `AuthView`, `UpdatePasswordView`).
2. Gastos (`expenses` — tabla creada originalmente a mano desde el dashboard de Supabase; ya tiene su migración versionada en `001_create_expenses_table.sql`, reconstruida verificando el esquema real contra `information_schema.columns` de la tabla en producción).
3. Ingresos (sueldo) y cotización del dólar manual (`incomes`, `exchange_rates` — migración `002`).
4. Portfolio Tracker cripto + CEDEARs (`portfolio_holdings` — migración `003`).
5. Directorio de Servicios / Centro de Pagos (`payment_services` — migración `004`; migración `005` agregó `ON DELETE CASCADE` en las FK hacia `auth.users`, era un fix sobre lo anterior).
6. Inmuebles — módulo grande con 5 tablas relacionadas: `properties`, `property_service_configs`, `property_expenses`, `property_incomes`, `lease_contracts` (migración `006`).
7. Servicios de streaming personalizados (`custom_streaming_services` — migración `007`).

Lo único que sigue en `localStorage` intencionalmente es la preferencia de **tema visual** (`useTheme.tsx`) — no es dato de negocio, así que no se migra.

## Reglas de negocio implementadas

- **Regla 50/30/20** (`utils/budgetRule.ts`): ingresos divididos en Gastos Fijos (50%), Flexibles/Ocio (30%), Ahorro/Inversión (20%).
- **Multi-moneda explícita**: todo tipo de dato monetario lleva `currency: 'ARS' | 'USD'` (`types/money.ts`), formateo/conversión centralizado en `utils/currency.ts`.
- **Gastos fijos vs. flexibles** con categorías predefinidas como única fuente de verdad en `types/finance.ts` (`EXPENSE_CATEGORIES`), de donde derivan los selects del formulario.
- **Gastos recurrentes y en cuotas** (`utils/installments.ts`): se generan por batch hacia meses futuros, comparten `recurringGroupId`, y se muestran como "TV (Cuota 1/6)".
- **Portfolio Tracker**: cada compra (cripto o CEDEAR) es un registro independiente; el PPC se calcula agregando registros, no se guarda promediado. Cripto cotiza en USD (vía Binance), CEDEARs en ARS (BYMA).
- **Módulo Inmuebles**: contratos de alquiler con actualización por índice (IPC/ICL o fijo), checklist de servicios por propiedad con estado (`PAID`/`PENDING`/`AUTO_DEBIT`), y relación "viva" entre gasto y configuración de servicio (FK `ON DELETE SET NULL` + snapshot del nombre para no perder histórico si se borra/renombra el servicio).

## Estructura de carpetas (ya alineada con las convenciones del `CLAUDE.md`)

```
src/
  components/   # dashboard, expenses, investments, payments, realestate, layout, settings, ui (shadcn), common
  hooks/        # un Provider+hook por store de dominio (gastos, ingresos, portfolio, inmuebles, etc.)
  pages/        # una vista por sección del menú (Dashboard, Gastos, Inversiones, Pagos, Inmuebles, Config, Auth)
  services/     # capa de acceso a Supabase, un archivo *Api.ts por tabla/dominio
  types/        # finance.ts, money.ts, realEstate.ts, navigation.ts
  utils/        # budgetRule, currency, installments, portfolio, realEstate, leaseContract, chartTheme, etc.
  lib/          # supabase.ts (cliente), utils.ts (helpers shadcn/cn)
supabase/migrations/   # SQL versionado completo, incluyendo 001 (expenses)
```

## Seguridad / Auth

- Toda la app está detrás de `AuthGate` (`App.tsx`): sin sesión activa se muestra `AuthView`, con sesión se montan en cascada todos los `*StoreProvider`.
- RLS activado y versionado en las 7 migraciones (`001` a `007`), incluyendo `expenses`.

## Historial de commits relevante (de más viejo a más nuevo)

```
MVP Listo: Gastos, Dashboard y Real Estate
Agregado soporte para crear gastos repetitivos por X meses y sumamos colores
Agrega compras en cuotas con tarjeta de credito
feat: integra Supabase Auth, protección de rutas y menú de usuario
feat: refactoriza Inversiones a Portfolio Tracker con precios en vivo de Binance
feat: migra el store de gastos de localStorage a Supabase
feat: migra ingresos (sueldo) y cotización del dólar a Supabase
feat: migra el Portfolio Tracker (cripto + CEDEARs) a Supabase
feat: migra el directorio de servicios (Centro de Pagos) a Supabase
fix: agrega ON DELETE CASCADE a las FK hacia auth.users
feat: migra el módulo de Inmuebles (5 tablas relacionadas) a Supabase
feat: migra los servicios de streaming personalizados a Supabase
```

## Posibles próximos pasos (inferidos, no confirmados con el usuario)

- Revisar si hace falta un mecanismo de migración de datos para usuarios que todavía tengan información vieja en `localStorage` del navegador (distinto del `DataMigrationCenter`, que hoy es solo import/export CSV/PDF de gastos, no una migración de datos legacy).
