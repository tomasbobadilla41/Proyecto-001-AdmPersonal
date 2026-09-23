# Contexto del Proyecto: AdmPersonal

## Idioma
- **IMPORTANTE:** Debes interactuar, explicar y responder a mis prompts SIEMPRE en español. 
- Los comentarios que dejes dentro del código, los mensajes de error en la UI (Toasts) y los mensajes de los commits de Git también deben estar redactados en español.

Pautas de desarrollo para este proyecto. Claude Code debe seguirlas en todo trabajo dentro de este repositorio.

## Stack
- **React** con **Vite** como bundler/dev server.
- **TypeScript** en todo el código (sin `.js`/`.jsx` nuevos).
- **Tailwind CSS** para estilos.
- **shadcn/ui** para componentes de interfaz interactivos (usar esta librería antes de crear componentes desde cero).
- **Lucide Icons** (`lucide-react`) para toda la iconografía. No mezclar con otras librerías de íconos.
- **Recharts** para visualización de datos y gráficos.

## Arquitectura y Almacenamiento
- **Cero Backend:** La aplicación no tiene base de datos externa. Toda la persistencia de datos debe realizarse localmente utilizando `localStorage`. 
- **Estado Global:** Utilizar el store existente para la gestión de ingresos, gastos fijos y gastos flexibles.

## Reglas de Negocio Financiero
- **Monedas:** La app maneja dos monedas: **ARS** (peso argentino) y **USD** (dólar estadounidense). Todo tipo, componente o utilidad que represente un monto debe dejar explícita la moneda (por ejemplo, un campo `currency: 'ARS' | 'USD'`), evitando números sin moneda asociada. Centralizar la lógica de formateo y conversión.
- **Regla 50/30/20:** La lógica principal del presupuesto se basa en dividir los ingresos en Gastos Fijos (50%), Gastos Flexibles/Ocio (30%) y Ahorro/Inversión (20%).
- **Cuotas y Recurrencia:** El sistema soporta gastos recurrentes y compras en cuotas, los cuales se generan mediante iteraciones (batch creation) hacia meses futuros (Ej: "TV (Cuota 1/6)").

## Estructura de carpetas (`/src`)
Mantener el código modular, separando responsabilidades en carpetas limpias dentro de `/src`:
```text
src/
  components/   # Componentes de UI (React y shadcn)
  store/        # Lógica de estado global y persistencia
  types/        # Tipos e interfaces de TypeScript compartidos
  utils/        # Funciones utilitarias (formateo, cálculos, conversiones)