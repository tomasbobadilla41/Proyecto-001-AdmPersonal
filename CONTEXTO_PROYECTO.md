# Contexto del Proyecto — AdmPersonal

> Documento generado para dar contexto completo a un agente de IA que retome este proyecto. Última actualización: 2026-10-12.

## Qué es

App web personal de administración financiera (gastos, inversiones, inmuebles en alquiler, servicios/pagos recurrentes) para un único usuario con cuenta propia, con soporte multi-moneda ARS/USD. React + Vite + TypeScript + Tailwind + shadcn/ui.

## Stack técnico

- **Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS 4, shadcn/ui (sobre Radix), Lucide Icons, Recharts para gráficos.
- **Backend:** Supabase (Postgres + Auth). Cliente en `src/lib/supabase.ts`, credenciales en `.env.local` (no versionado).
- **Extras:** `jspdf`/`jspdf-autotable` y `papaparse` para exportar/importar gastos (CSV/PDF), `sonner` para toasts, `pdfjs-dist` para leer el texto de un PDF en el navegador (fallback sin IA del Lector de Facturas).
- **APIs externas:** Binance (precios cripto, `useBinancePrices.ts`/`binanceApi.ts`) y una API de dólar oficial (`useDolarOficial.ts`/`dolarApi.ts`), más `ipcApi.ts` (índice IPC para actualización de alquileres).

## Idioma del proyecto

Todo el trabajo (interacción, comentarios de código, mensajes de la UI, commits) debe redactarse en español — está definido en `CLAUDE.md`.

## Flujo de trabajo con Git

Desde el refactor del Centro de Pagos (migración `008`), cada implementación o mejora se hace en su propia rama (`feat/...`, `fix/...`, `chore/...`, `refactor/...`) y se mergea a `main` vía Pull Request — nunca commits directos a `main`. Convención completa en `CLAUDE.md`.

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
8. Refactor del Centro de Pagos (migración `008`): dropea `payment_services` y la reemplaza por una arquitectura relacional que separa el **Catálogo de Servicios Fijos** (`services`: title, category, account_number/payment_link opcionales, `sender_email`, `due_day`) de los **Pagos Mensuales** en sí, que siguen viviendo como `expenses` vinculados vía `expenses.service_id` (`ON DELETE SET NULL`, mismo patrón que `property_expenses` en Inmuebles). El Centro de Pagos ahora muestra un semáforo "Pagado"/"Pendiente" por servicio (cruza `service_id` contra los gastos del mes en curso) y un modal chico de "Registrar pago" que solo pide monto y moneda. `sender_email` queda como columna preparada para una futura automatización de lectura de facturas por Gmail (sin implementar todavía).

Lo único que sigue en `localStorage` intencionalmente es la preferencia de **tema visual** (`useTheme.tsx`) — no es dato de negocio, así que no se migra.

## Reglas de negocio implementadas

- **Regla 50/30/20** (`utils/budgetRule.ts`): ingresos divididos en Gastos Fijos (50%), Flexibles/Ocio (30%), Ahorro/Inversión (20%).
- **Multi-moneda explícita**: todo tipo de dato monetario lleva `currency: 'ARS' | 'USD'` (`types/money.ts`), formateo/conversión centralizado en `utils/currency.ts`.
- **Gastos fijos vs. flexibles** con categorías predefinidas como única fuente de verdad en `types/finance.ts` (`EXPENSE_CATEGORIES`), de donde derivan los selects del formulario.
- **Gastos recurrentes y en cuotas** (`utils/installments.ts`): se generan por batch hacia meses futuros, comparten `recurringGroupId`, y se muestran como "TV (Cuota 1/6)".
- **Portfolio Tracker**: cada compra (cripto o CEDEAR) es un registro independiente; el PPC se calcula agregando registros, no se guarda promediado. Cripto cotiza en USD (vía Binance), CEDEARs en ARS (BYMA).
- **Módulo Inmuebles**: contratos de alquiler con actualización por índice (IPC/ICL o fijo), checklist de servicios por propiedad con estado (`PAID`/`PENDING`/`AUTO_DEBIT`), y relación "viva" entre gasto y configuración de servicio (FK `ON DELETE SET NULL` + snapshot del nombre para no perder histórico si se borra/renombra el servicio).
- **Centro de Pagos**: cada servicio fijo del catálogo (`services`) se marca "Pagado este mes" o "Pendiente" cruzando su `id` contra los `expenses` con ese `service_id` cargados en el mes/año en curso — no hay un estado persistido, se calcula en el cliente a partir de los gastos reales.

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
docs: agrega flujo de trabajo con ramas por feature/fix a CLAUDE.md
feat: refactoriza el Centro de Pagos a catálogo de servicios + pagos mensuales
```

## Lector de Facturas (Drag & Drop + Gemini, Human-in-the-loop)

El Centro de Pagos tiene una zona de "arrastrá tu factura en PDF acá" (`InvoiceDropzone`, justo debajo del encabezado de la página, antes de la grilla de servicios) que lee la factura con IA y precarga el pago — pero **siempre con confirmación manual del usuario**, nada se inserta en `expenses` solo.

**Se descartó a propósito la idea anterior de automatizarlo por completo** (un cron job sondeando Gmail cada tanto, leyendo mails no leídos de cada `sender_email` configurado). Se abandonó por dos problemas de fondo, no por falta de esfuerzo en resolverlos:
- La mayoría de los proveedores (Edenor, Metrogas) no adjuntan el PDF en el mail — mandan un botón a su propio portal, así que tarde o temprano había que bajar el archivo a mano igual.
- La API de Gemini (tier gratuito) devuelve `503` con bastante frecuencia bajo carga — automatizar algo que depende de un servicio que falla solo, sin que nadie se entere, es frágil. Con el flujo manual, si falla, el usuario lo ve al toque en un toast y reintenta con un clic.

Flujo actual:
1. El usuario descarga la factura (de donde sea: mail, portal del proveedor) y la arrastra (o la selecciona con clic) sobre el dropzone.
2. El frontend convierte el PDF a Base64 y llama a `supabase.functions.invoke('parse-invoice', { body: { pdfBase64 } })`.
3. La Edge Function `supabase/functions/parse-invoice/index.ts` (sin Supabase client, es un passthrough autenticado a Gemini — `verify_jwt = true` en `config.toml`, a diferencia del `false` por defecto del scaffold, para que no cualquiera sin sesión gaste la cuota) le pega a `gemini-3.8-flash` (`generateContent`, modelo configurable por el secreto `GEMINI_MODEL`, con fallback a `gemini-3.8-flash` en el código — `gemini-1.5-flash` ya daba 404, deprecado) pidiendo `responseSchema` estricto: `{ monto_total: number, numero_cliente: string, categoria_sugerida: string }`. `categoria_sugerida` está acotada por `enum` a la misma lista que `EXPENSE_CATEGORIES.FIJO` de `src/types/finance.ts` (+ `"Otro"` como salida si no está seguro) — **hay que mantener esa lista sincronizada a mano** entre los dos archivos, la Edge Function (Deno) no puede importar código del frontend (Vite/Node).
4. **Resiliencia ante fallas de Gemini**: el `503` (modelo sobrecargado) es bastante común en el tier gratuito, así que hay dos redes de seguridad:
   - La Edge Function reintenta sola hasta 3 veces (con backoff de 1s/2s) ante `503`/`429` de Gemini, antes de darse por vencida — el usuario ni se entera de la mayoría de estos baches.
   - El cliente (`parseInvoicePdf` en `src/services/parseInvoiceApi.ts`) llama a `supabase.functions.invoke` con `timeout: 25000` — sin esto, si la llamada entera se cuelga (sesión vencida, red, lo que sea, no solo Gemini), la UI quedaba esperando para siempre en "IA analizando factura…" sin ningún error ni forma de reintentar más que recargar la página. Ahora siempre termina en éxito o en un toast de error claro.
   - Si después de todo eso sigue fallando, la función devuelve un error (status 502).
   - **Fallback sin IA cuando Gemini no responde del todo** (`parseInvoicePdf` en `src/services/parseInvoiceApi.ts`): un `503` transitorio ya lo resuelven los reintentos de arriba, pero un `429` persistente (cuota diaria gratuita agotada — probado en vivo: 20s después seguía fallando, no es un pico momentáneo) no se arregla reintentando. Ahí, antes de rendirse, el cliente extrae el texto del PDF él mismo con `pdfjs-dist` (`src/utils/pdfText.ts`) y busca monto/cliente/categoría con patrones fijos por proveedor conocido (`src/utils/invoiceRegexFallback.ts`, hoy Edenor y Metrogas — ambos con "TOTAL A PAGAR $ X.XXX,XX" en el mismo formato). Solo cubre a los proveedores ya vistos; para cualquier otro no matchea nada y se propaga el error original de Gemini. El resultado (`ParsedInvoice`) lleva un campo `source: 'ia' | 'regex'` — si vino del fallback, la UI muestra un toast avisando que son datos sin IA para que se revisen antes de confirmar. **Probado en vivo** con la cuota de Gemini realmente agotada: Gemini falló los 3 reintentos (429), el fallback extrajo el texto, detectó "Edenor", sacó el monto y la cuenta, y matcheó igual que si hubiese respondido Gemini.
   - Costo real de Gemini con billing habilitado (si en algún momento hace falta subir el límite gratuito): `gemini-3.8-flash` son ~$0.75/M tokens de entrada, ~$3.75/M de salida — una factura son unos cientos de tokens, fracciones de centavo por factura. El límite gratuito es de *cantidad de requests*, no de plata.
   - La cuota de la API (`GEMINI_API_KEY`, ligada a un proyecto de Google Cloud) es independiente de cualquier suscripción personal a Gemini (Google AI Pro/Ultra) — esa es para la app/chat de Gemini y Google AI Studio, no le da cuota a este uso programático.
5. El frontend busca un servicio que matchee, en dos pasos (`InvoiceDropzone.tsx`):
   - Primero por `account_number`, comparando **solo los dígitos** de ambos lados (`onlyDigits`), no el string exacto: las facturas reales suelen traer el número de cuenta formateado con espacios (ej. Edenor: "0 151 791 868"), distinto a como lo carga el usuario en el servicio (ej. "0151791868").
   - Si no matcheó por cuenta, prueba por `categoria_sugerida` — pero **solo si hay un único servicio de esa categoría** en el catálogo (si hay dos o más, no adivina, sería ambiguo). Tiene sentido para este usuario: en Personal solo va a tener una "Luz", los alquiler/expensas de propiedades se gestionan aparte en el módulo Inmuebles.
   - Probado con una factura real de Edenor: Gemini interpretó bien el formato argentino de moneda (`$ 30.528,06` → `30528.06`) y el número de cuenta con espacios matcheó tras normalizar.
6. **Si matchea** (por cuenta o por categoría), se abre automáticamente el modal de "Registrar Pago" de ese servicio con el monto ya precargado — el usuario solo tiene que revisar y confirmar.
7. **Si no matchea ningún servicio**, en vez de solo un toast de error, se abre el drawer de "Configurar nuevo servicio" con `account_number` y la categoría sugerida ya precargados (editables — el usuario los corrige si Gemini se equivocó, y completa el título a mano). Al crear el servicio, se encadena automáticamente al modal de "Registrar Pago" con el monto ya precargado — mismo resultado final que si hubiese matcheado de entrada. Para esto `useServicesStore.addService` pasó a devolver el `ServiceConfig` insertado (con su `id` real de Postgres) en vez de solo `boolean`, así se puede abrir el modal de pago para ese servicio recién creado sin tener que releer el store.
   - **Bug encontrado y arreglado**: `ServiceConfigFormDrawer` cerraba el drawer (`onClose()`) inmediatamente después de llamar a `onSubmit`, sin esperar a que el alta (async) terminara — eso pisaba el monto pendiente antes de poder usarlo para encadenar al modal de pago, así que el alta vía IA quedaba siempre sin el monto precargado. Ahora el drawer solo llama a `onSubmit`; el padre (`PaymentsHubPage`) es el único que cierra, cuando corresponde.

**Atajo por tarjeta, sin pasar por el matching**: cada `ServiceConfigCard` tiene también su propio botón de "Subir factura" (ícono de upload, al lado de "Registrar Pago") — como ya se sabe de qué servicio es (la subieron en esa tarjeta puntual), no hace falta matchear por cuenta/categoría: solo se extrae el monto y se abre "Registrar Pago" directo para ese servicio. Si el `numero_cliente` leído no coincide con el `account_number` configurado, se muestra un toast de advertencia (no bloqueante, por si se equivocaron de archivo) pero igual se precarga el monto. Pensado para el caso típico de este usuario: un servicio como "Luz" es siempre el mismo, no hace falta que el sistema adivine cuál es.

**Nota sobre lo que se intentó antes y se tiró**: en un primer intento se armó una Edge Function (`process-invoices`) con OAuth de Gmail (refresh token generado con un script local, polling por cron) — se deployó, se probó, funcionó técnicamente, pero se abandonó por los motivos de arriba antes de programar el cron. Se borró todo (la función de Supabase, los secrets `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REFRESH_TOKEN`, el script `get_google_token.ts`) — si en algún momento aparece un proveedor que sí manda el PDF adjunto y vale la pena retomar el polling, hay que reconstruirlo de cero (nada grave: es poco código, la parte de Gemini se reusa tal cual en `parse-invoice`).

## Posibles próximos pasos (inferidos, no confirmados con el usuario)

- Revisar si hace falta un mecanismo de migración de datos para usuarios que todavía tengan información vieja en `localStorage` del navegador (distinto del `DataMigrationCenter`, que hoy es solo import/export CSV/PDF de gastos, no una migración de datos legacy).
