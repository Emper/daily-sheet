import { pickFresh } from '../core/pick'
import type { Cycle, ExerciseType, GenContext, Grade } from '../core/types'
import type { Rng } from '../core/rng'
import { Blank, rowsFor } from './ui'

const G: readonly Grade[] = [1, 2, 3, 4, 5, 6]

/* ------------------------------------------------------------------- series */

interface Serie {
  terms: (number | null)[]
  label: string
}

function serieFor(grade: Grade, rng: Rng): Serie {
  const show = 6
  if (grade <= 2) {
    const step = rng.pick([1, 2, 2, 3, 5, 10])
    const start = rng.int(1, 20)
    const up = rng.bool(0.75)
    const terms = Array.from({ length: show }, (_, i) => start + (up ? i * step : -i * step))
    return {
      terms: blank(liftAboveZero(terms, grade), rng, 2),
      label: up ? `de ${step} en ${step}` : `restando ${step}`,
    }
  }
  if (grade <= 4) {
    const kind = rng.pick(['arit', 'geom', 'alterna'] as const)
    if (kind === 'geom') {
      const ratio = rng.pick([2, 3])
      const start = rng.pick([1, 2, 3])
      return { terms: blank(Array.from({ length: show }, (_, i) => start * ratio ** i), rng, 2), label: 'multiplicando' }
    }
    if (kind === 'alterna') {
      const a = rng.int(2, 9)
      const b = rng.int(2, 9)
      let v = rng.int(5, 30)
      const terms = [v]
      for (let i = 1; i < show; i++) {
        v = i % 2 ? v + a : v - b
        terms.push(v)
      }
      return { terms: blank(liftAboveZero(terms, grade), rng, 2), label: 'suma y resta alternas' }
    }
    const step = rng.int(3, 12)
    const start = rng.int(10, 60)
    return { terms: blank(Array.from({ length: show }, (_, i) => start + i * step), rng, 2), label: `de ${step} en ${step}` }
  }
  const kind = rng.pick(['cuadrados', 'fibo', 'geom', 'creciente'] as const)
  if (kind === 'cuadrados') {
    const off = rng.int(1, 4)
    return { terms: blank(Array.from({ length: show }, (_, i) => (i + off) ** 2), rng, 2), label: 'cuadrados' }
  }
  if (kind === 'fibo') {
    const terms = [rng.int(1, 5), rng.int(2, 7)]
    for (let i = 2; i < show; i++) terms.push(terms[i - 1] + terms[i - 2])
    return { terms: blank(terms, rng, 2), label: 'cada término es la suma de los dos anteriores' }
  }
  if (kind === 'geom') {
    const ratio = rng.pick([2, 3, 4])
    const start = rng.int(2, 6)
    return { terms: blank(Array.from({ length: show }, (_, i) => start * ratio ** i), rng, 2), label: 'multiplicando' }
  }
  // Paso que crece: +1, +2, +3...
  const start = rng.int(2, 9)
  const terms = [start]
  for (let i = 1; i < show; i++) terms.push(terms[i - 1] + i + 1)
  return { terms: blank(terms, rng, 2), label: 'el salto no siempre es el mismo' }
}

/**
 * Los números negativos no se estudian hasta 6º. Si una serie descendente
 * se pasa de cero, se sube entera: el salto es el mismo y la regla que el
 * niño tiene que descubrir no cambia.
 */
function liftAboveZero(terms: number[], grade: Grade): number[] {
  const min = Math.min(...terms)
  if (grade >= 6 || min >= 0) return terms
  return terms.map((t) => t - min)
}

/** Deja `n` huecos, nunca en las dos primeras posiciones (si no, no hay pista). */
function blank(terms: number[], rng: Rng, n: number): (number | null)[] {
  const out: (number | null)[] = terms.slice()
  const positions = rng.sample([...Array(terms.length - 2).keys()].map((i) => i + 2), n)
  for (const p of positions) out[p] = null
  return out
}

const series: ExerciseType = {
  id: 'logica.series',
  name: 'Series numéricas',
  subject: 'logica',
  format: 'logica',
  grades: G,
  generate({ grade, cycle, rng }: GenContext) {
    const items = Array.from({ length: 3 }, () => serieFor(grade, rng))
    return {
      typeId: series.id,
      title: 'Continúa la serie',
      instructions: 'Descubre la regla y completa los huecos.',
      subject: 'logica',
      format: 'logica',
      cols: 1,
      rows: rowsFor(cycle, 6),
      body: (
        <div className="series">
          {items.map((s, i) => (
            <div key={i} className="series__row">
              {s.terms.map((t, j) => (
                <span key={j} className="series__cell">
                  {t === null ? <Blank ch={4} /> : t}
                </span>
              ))}
              <span className="series__cell series__cell--next">
                <Blank ch={4} />
              </span>
            </div>
          ))}
        </div>
      ),
    }
  },
}

/* ------------------------------------------------------------------- sudoku */

type Board = number[]

function fullGrid(n: number, br: number, bc: number, rng: Rng): Board {
  const base = (r: number, c: number) => (bc * (r % br) + Math.floor(r / br) + c) % n
  const bands = rng.shuffle([...Array(n / br).keys()])
  const stacks = rng.shuffle([...Array(n / bc).keys()])
  const rowsIn = rng.shuffle([...Array(br).keys()])
  const colsIn = rng.shuffle([...Array(bc).keys()])
  const symbols = rng.shuffle([...Array(n).keys()].map((i) => i + 1))
  const rows = bands.flatMap((b) => rowsIn.map((r) => b * br + r))
  const cols = stacks.flatMap((s) => colsIn.map((c) => s * bc + c))
  const out: Board = new Array(n * n)
  rows.forEach((r, i) => cols.forEach((c, j) => (out[i * n + j] = symbols[base(r, c)])))
  return out
}

/** Cuenta soluciones hasta un maximo: nos basta con saber si hay mas de una. */
function countSolutions(board: Board, n: number, br: number, bc: number, cap = 2): number {
  const idx = board.indexOf(0)
  if (idx === -1) return 1
  const r = Math.floor(idx / n)
  const c = idx % n
  let found = 0
  for (let v = 1; v <= n; v++) {
    let ok = true
    for (let k = 0; k < n && ok; k++) {
      if (board[r * n + k] === v || board[k * n + c] === v) ok = false
    }
    const r0 = Math.floor(r / br) * br
    const c0 = Math.floor(c / bc) * bc
    for (let dr = 0; dr < br && ok; dr++) {
      for (let dc = 0; dc < bc && ok; dc++) {
        if (board[(r0 + dr) * n + (c0 + dc)] === v) ok = false
      }
    }
    if (!ok) continue
    board[idx] = v
    found += countSolutions(board, n, br, bc, cap - found)
    board[idx] = 0
    if (found >= cap) return found
  }
  return found
}

/** Va quitando casillas mientras la solucion siga siendo la unica posible. */
function dig(full: Board, n: number, br: number, bc: number, target: number, rng: Rng): Board {
  const board = full.slice()
  let removed = 0
  for (const i of rng.shuffle([...Array(n * n).keys()])) {
    if (removed >= target) break
    const backup = board[i]
    board[i] = 0
    if (countSolutions(board.slice(), n, br, bc) === 1) removed++
    else board[i] = backup
  }
  return board
}

const sudoku: ExerciseType = {
  id: 'logica.sudoku',
  weight: 0.7,
  name: 'Sudoku',
  subject: 'logica',
  format: 'dibujo',
  grades: G,
  generate({ grade, cycle, rng }: GenContext) {
    const [n, br, bc, holes] =
      grade <= 2 ? ([4, 2, 2, 8] as const) : grade <= 4 ? ([6, 2, 3, 18] as const) : ([6, 2, 3, 22] as const)
    const board = dig(fullGrid(n, br, bc, rng), n, br, bc, holes, rng)
    return {
      typeId: sudoku.id,
      title: `Sudoku ${n}×${n}`,
      instructions: `Cada fila, cada columna y cada bloque llevan los números del 1 al ${n} sin repetir.`,
      subject: 'logica',
      format: 'dibujo',
      cols: 1,
      rows: rowsFor(cycle, 7, 5),
      flexible: false,
      body: (
        <div
          className="sudoku"
          style={{ ['--n' as string]: n, ['--br' as string]: br, ['--bc' as string]: bc }}
        >
          {board.map((v, i) => {
            const r = Math.floor(i / n)
            const c = i % n
            const cls = [
              'sudoku__cell',
              r % br === 0 ? 'sudoku__cell--top' : '',
              c % bc === 0 ? 'sudoku__cell--left' : '',
              r === n - 1 ? 'sudoku__cell--bottom' : '',
              c === n - 1 ? 'sudoku__cell--right' : '',
            ].join(' ')
            return (
              <div key={i} className={cls}>
                {v || ''}
              </div>
            )
          })}
        </div>
      ),
    }
  },
}

/* ------------------------------------------------------------ codigo secreto */

const SECRET_WORDS: Record<Cycle, string[]> = {
  1: ['SOL', 'LUNA', 'CASA', 'GATO', 'FLOR', 'PAN', 'MAR', 'NUBE', 'PATO', 'RISA'],
  2: ['TORMENTA', 'AVENTURA', 'MONTAÑA', 'VOLCAN', 'CAMINO', 'ESTRELLA', 'BOSQUE', 'PUENTE'],
  3: [
    'BIBLIOTECA', 'MURCIELAGO', 'CALENDARIO', 'TELESCOPIO',
    'LABERINTO', 'ORQUESTA', 'MICROSCOPIO', 'ARQUITECTO',
  ],
}

const codigo: ExerciseType = {
  id: 'logica.codigo',
  weight: 0.7,
  name: 'Código secreto',
  subject: 'logica',
  format: 'logica',
  grades: G,
  generate({ cycle, rng, taken }: GenContext) {
    const word = pickFresh(rng, SECRET_WORDS[cycle], taken, (w) => `secret:${w}`)
    const letters = [...new Set(word.split(''))]
    // En 1º la clave va de una cifra: descifrar ya es bastante trabajo.
    const pool =
      cycle === 1
        ? [...Array(9).keys()].map((i) => i + 1)
        : [...Array(90).keys()].map((i) => i + 10)
    const codes = rng.sample(pool, letters.length)
    const key = new Map(letters.map((l, i) => [l, codes[i]]))
    // La clave se da desordenada alfabeticamente para que haya que buscarla.
    const legend = rng.shuffle(letters)
    return {
      typeId: codigo.id,
      title: 'Código secreto',
      instructions: 'Usa la clave para descifrar la palabra escondida.',
      subject: 'logica',
      format: 'logica',
      cols: 1,
      rows: rowsFor(cycle, 6, 2),
      flexible: false,
      body: (
        <>
          <div className="legend">
            {legend.map((l) => (
              <span key={l} className="legend__item">
                {l} = {key.get(l)}
              </span>
            ))}
          </div>
          <div className="cipher">
            {word.split('').map((l, i) => (
              <span key={i} className="cipher__cell">
                <span className="cipher__num">{key.get(l)}</span>
                <span className="cipher__slot" />
              </span>
            ))}
          </div>
        </>
      ),
    }
  },
}

export default [series, sudoku, codigo]
