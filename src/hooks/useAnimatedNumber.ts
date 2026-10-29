import { useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION_MS = 600

/** Suaviza el final de la animación (arranca rápido, frena antes de llegar). */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Anima un número contando desde el valor anterior hasta `target` cada vez que cambia
 * (carga inicial del Dashboard, cambio de mes, un gasto nuevo que recalcula el total) —
 * en vez de que el monto salte de golpe. Arranca en 0 en el primer render.
 */
export function useAnimatedNumber(target: number, durationMs: number = DEFAULT_DURATION_MS): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const to = target
    if (from === to) return

    let frameId: number
    const startTime = performance.now()

    function tick(now: number) {
      const progress = Math.min((now - startTime) / durationMs, 1)
      setValue(from + (to - from) * easeOutCubic(progress))
      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }
    frameId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frameId)
  }, [target, durationMs])

  return value
}
