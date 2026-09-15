# CLAUDE.md

Pautas de desarrollo para este proyecto. Claude Code debe seguirlas en todo trabajo dentro de este repositorio.

## Stack

- **React** con **Vite** como bundler/dev server.
- **TypeScript** en todo el código (sin `.js`/`.jsx` nuevos).
- **Tailwind CSS** para estilos.
- **Lucide Icons** (`lucide-react`) para toda la iconografía. No mezclar con otras librerías de íconos.

## Monedas

- La app maneja dos monedas: **ARS** (peso argentino) y **USD** (dólar estadounidense).
- Todo tipo, componente o utilidad que represente un monto debe dejar explícita la moneda (por ejemplo, un campo `currency: 'ARS' | 'USD'` junto al monto), evitando números "pelados" sin moneda asociada.
- Centralizar la lógica de formateo y conversión de montos en utilidades compartidas (ver estructura de carpetas abajo) en lugar de duplicarla en los componentes.

## Estructura de carpetas (`/src`)

Mantener el código modular, separando responsabilidades en carpetas limpias dentro de `/src`:

```
src/
  components/   # Componentes de UI (React)
  types/        # Tipos e interfaces de TypeScript compartidos
  utils/        # Funciones utilitarias (formateo, cálculos, conversiones, etc.)
```

Evitar archivos monolíticos: si un componente crece demasiado o mezcla responsabilidades, dividirlo.

## Build y verificación

- Después de cada modificación grande (nueva feature, refactor, cambios en varios archivos), ejecutar:
  ```
  npm run build
  ```
  para asegurarse de que no haya errores de tipado ni de compilación antes de dar la tarea por terminada.
- Si `npm run build` falla, corregir los errores antes de continuar o de reportar el trabajo como finalizado.
