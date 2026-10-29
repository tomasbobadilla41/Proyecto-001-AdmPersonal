import { Skeleton } from './Skeleton'

/** Placeholder genérico para una tarjeta en una grilla (servicios, propiedades) mientras `isLoading`. */
export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
      <div className="mt-2 flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  )
}
