import english from '../content/english.json'
import { pickFresh } from '../core/pick'
import type { Rng } from '../core/rng'
import type { Cycle, ExerciseType, GenContext, Grade } from '../core/types'

const G: readonly Grade[] = [1, 2, 3, 4, 5, 6]

type Dir = readonly [number, number]

/**
 * Direcciones permitidas por ciclo. En 1º-2º solo se lee como se lee un
 * libro (→ y ↓); después entra la diagonal, y en 5º-6º también al revés.
 */
const DIRS: Record<Cycle, readonly Dir[]> = {
  1: [[1, 0], [0, 1]],
  2: [[1, 0], [0, 1], [1, 1]],
  3: [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [1, -1]],
}

/** Lado de la cuadrícula y tamaño de celda: manda la letra (ciclo real). */
const GRID: Record<Cycle, { n: number; cell: number }> = {
  1: { n: 8, cell: 5.8 },
  2: { n: 10, cell: 5.3 },
  3: { n: 11, cell: 4.9 },
}

const WORDS: Record<Cycle, number> = { 1: 5, 2: 6, 3: 7 }
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * Coloca las palabras de la más larga a la más corta, que es cuando más
 * cuesta encontrarles sitio. Una palabra puede cruzarse con otra si
 * comparten la letra del cruce. Si alguna no cabe tras muchos intentos se
 * descarta, y solo se listan las que de verdad están en la sopa.
 */
function build(words: string[], n: number, dirs: readonly Dir[], rng: Rng) {
  const grid = new Array<string>(n * n).fill('')
  const placed: string[] = []

  for (const w of [...words].sort((a, b) => b.length - a.length)) {
    for (let attempt = 0; attempt < 150; attempt++) {
      const [dx, dy] = rng.pick(dirs)
      const x0 = rng.int(0, n - 1)
      const y0 = rng.int(0, n - 1)
      const x1 = x0 + dx * (w.length - 1)
      const y1 = y0 + dy * (w.length - 1)
      if (x1 < 0 || x1 >= n || y1 < 0 || y1 >= n) continue

      let fits = true
      for (let i = 0; i < w.length && fits; i++) {
        const c = grid[(y0 + dy * i) * n + (x0 + dx * i)]
        if (c && c !== w[i]) fits = false
      }
      if (!fits) continue

      for (let i = 0; i < w.length; i++) grid[(y0 + dy * i) * n + (x0 + dx * i)] = w[i]
      placed.push(w)
      break
    }
  }

  for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = ABC[rng.int(0, 25)]
  return { grid, placed }
}

const sopa: ExerciseType = {
  id: 'ingles.sopa',
  name: 'Word search',
  subject: 'ingles',
  format: 'dibujo',
  grades: G,
  generate({ cycle, contentCycle, rng, taken }: GenContext) {
    const { n, cell } = GRID[cycle]
    const pool = english.vocab.filter((v) => v.cycle === contentCycle)
    // Misma clave que el ejercicio de vocabulario: en una tirada, la sopa y
    // la traducción nunca repiten tema entre sí.
    const set = pickFresh(rng, pool.length ? pool : english.vocab, taken, (x) => `vocab:${x.topic}`)
    const candidates = set.words.map(([en]) => en.toUpperCase()).filter((w) => w.length <= n)
    const { grid, placed } = build(rng.sample(candidates, WORDS[cycle]), n, DIRS[contentCycle], rng)

    return {
      typeId: sopa.id,
      title: `Word search: ${set.topic}`,
      instructions: 'Find the words and tick them.',
      subject: 'ingles',
      format: 'dibujo',
      cols: 1,
      // Medido: en 1º la lista de palabras, con letra grande, es más alta que la
      // cuadrícula de 8x8 y con 7 filas se salía 1,9 mm.
      rows: 8,
      flexible: false,
      body: (
        <div className="sopa">
          <div
            className="sopa__grid"
            style={{ gridTemplateColumns: `repeat(${n}, ${cell}mm)`, gridAutoRows: `${cell}mm` }}
          >
            {grid.map((ch, i) => (
              <span key={i} className="sopa__cell">
                {ch}
              </span>
            ))}
          </div>
          <ul className="sopa__list">
            {[...placed].sort().map((w) => (
              <li key={w}>
                <span className="sopa__tick" />
                {w.toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
      ),
    }
  },
}

export default [sopa]
