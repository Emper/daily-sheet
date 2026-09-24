import type { Rng } from './rng'

/**
 * Registro de lo ya gastado en esta tirada de impresion. Se comparte entre
 * todas las hojas y todos los ninos: si hoy salen cinco paginas, la frase
 * del dia, el texto de lectura y la pregunta de cierre son distintos en
 * las cinco.
 */
export type Taken = Set<string>

/**
 * Elige un elemento que no se haya usado todavia. Si ya se han gastado
 * todos, vuelve a la lista entera: repetirse es peor que quedarse sin
 * ejercicio, pero solo cuando no queda alternativa.
 */
export function pickFresh<T>(
  rng: Rng,
  items: readonly T[],
  taken: Taken,
  key: (item: T) => string,
): T {
  const fresh = items.filter((i) => !taken.has(key(i)))
  const chosen = rng.pick(fresh.length ? fresh : items)
  taken.add(key(chosen))
  return chosen
}
