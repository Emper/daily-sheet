import type { Rng } from '../core/rng'
import type { ExerciseType, GenContext, Grade } from '../core/types'
import { rowsFor } from './ui'

const G: readonly Grade[] = [1, 2, 3, 4, 5, 6]

const N = 1, E = 2, S = 4, W = 8
const DX: Record<number, number> = { [N]: 0, [E]: 1, [S]: 0, [W]: -1 }
const DY: Record<number, number> = { [N]: -1, [E]: 0, [S]: 1, [W]: 0 }
const OPP: Record<number, number> = { [N]: S, [E]: W, [S]: N, [W]: E }

/**
 * Laberinto perfecto por DFS con vuelta atras: hay exactamente un camino
 * entre dos casillas cualesquiera, asi que siempre tiene solucion y nunca
 * tiene atajos. Cada celda guarda que paredes le quedan en pie.
 */
function carve(n: number, rng: Rng): number[] {
  const cells = new Array<number>(n * n).fill(N | E | S | W)
  const seen = new Array<boolean>(n * n).fill(false)
  const stack = [0]
  seen[0] = true

  while (stack.length) {
    const cur = stack[stack.length - 1]
    const cx = cur % n
    const cy = Math.floor(cur / n)
    const open = rng.shuffle([N, E, S, W]).filter((d) => {
      const nx = cx + DX[d]
      const ny = cy + DY[d]
      return nx >= 0 && nx < n && ny >= 0 && ny < n && !seen[ny * n + nx]
    })
    if (!open.length) {
      stack.pop()
      continue
    }
    const d = open[0]
    const next = (cy + DY[d]) * n + (cx + DX[d])
    cells[cur] &= ~d
    cells[next] &= ~OPP[d]
    seen[next] = true
    stack.push(next)
  }
  return cells
}

/** Un solo `path` con todas las paredes: mucho más ligero que una línea por pared. */
function wallsPath(cells: number[], n: number, u: number): string {
  const seg: string[] = []
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const c = cells[y * n + x]
      if (c & N) seg.push(`M${x * u} ${y * u}h${u}`)
      if (c & W) seg.push(`M${x * u} ${y * u}v${u}`)
      if (x === n - 1 && c & E) seg.push(`M${(x + 1) * u} ${y * u}v${u}`)
      if (y === n - 1 && c & S) seg.push(`M${x * u} ${(y + 1) * u}h${u}`)
    }
  }
  return seg.join('')
}

const SIZE: Record<Grade, number> = { 1: 8, 2: 9, 3: 11, 4: 12, 5: 14, 6: 15 }

const laberinto: ExerciseType = {
  id: 'logica.laberinto',
  weight: 0.7,
  name: 'Laberinto',
  subject: 'logica',
  format: 'dibujo',
  grades: G,
  generate({ grade, cycle, rng }: GenContext) {
    const n = SIZE[grade]
    const cells = carve(n, rng)
    // La entrada arriba a la izquierda y la salida abajo a la derecha.
    cells[0] &= ~N
    cells[n * n - 1] &= ~S
    const u = 10
    const pad = 6

    return {
      typeId: laberinto.id,
      title: 'Laberinto',
      instructions: 'Entra por arriba y sal por abajo sin cruzar ninguna pared.',
      subject: 'logica',
      format: 'dibujo',
      cols: 1,
      rows: rowsFor(cycle, 9, 7),
      flexible: false,
      body: (
        <svg
          className="maze"
          viewBox={`${-pad} ${-pad} ${n * u + pad * 2} ${n * u + pad * 2}`}
          role="img"
          aria-label="laberinto"
        >
          <path d={wallsPath(cells, n, u)} className="maze__wall" />
          <text x={u / 2} y={-1.5} className="maze__mark">
            ▼
          </text>
          <text x={n * u - u / 2} y={n * u + 5} className="maze__mark">
            ▼
          </text>
        </svg>
      ),
    }
  },
}

export default [laberinto]
