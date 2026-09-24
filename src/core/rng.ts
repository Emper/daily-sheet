/**
 * PRNG determinista. La misma semilla produce siempre la misma hoja,
 * de modo que "la hoja del 18 de septiembre de Marta" es reproducible
 * sin guardar nada en ningun sitio.
 */
export interface Rng {
  next(): number
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  sample<T>(items: readonly T[], n: number): T[]
  shuffle<T>(items: readonly T[]): T[]
  bool(p?: number): boolean
}

export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function createRng(seed: string | number): Rng {
  let a = (typeof seed === 'string' ? hashSeed(seed) : seed) >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const shuffle = <T,>(items: readonly T[]): T[] => {
    const out = items.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  return {
    next,
    int,
    shuffle,
    pick: (items) => items[int(0, items.length - 1)],
    sample: (items, n) => shuffle(items).slice(0, n),
    bool: (p = 0.5) => next() < p,
  }
}
