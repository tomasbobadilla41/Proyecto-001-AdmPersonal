import { Skeleton } from './Skeleton'

interface TableSkeletonRowsProps {
  /** Cuántas columnas tiene la tabla (una barra por celda). */
  columns: number
  /** Cuántas filas placeholder mostrar mientras carga. */
  rows?: number
}

/** Filas de esqueleto para el `<tbody>` de una tabla mientras `isLoading` — mismo lugar donde hoy va un `<tr>` con "Cargando…". */
export function TableSkeletonRows({ columns, rows = 4 }: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row}>
          {Array.from({ length: columns }, (_, col) => (
            <td key={col} className="px-4 py-3">
              <Skeleton className="h-4 w-full max-w-[8rem]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
