import type { ReactNode } from 'react'
import type { Rng } from '../core/rng'
import type { Cycle, ExerciseType, GenContext, Grade } from '../core/types'
import { rowsFor } from './ui'

const G: readonly Grade[] = [1, 2, 3, 4, 5, 6]

type Kind = 'circle' | 'square' | 'triangle' | 'diamond' | 'arrow'
const KINDS: Kind[] = ['circle', 'square', 'triangle', 'diamond']

const PATHS: Record<Kind, ReactNode> = {
  circle: <circle cx="12" cy="12" r="9" />,
  square: <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />,
  triangle: <path d="M12 3 L21 20 H3 Z" />,
  diamond: <path d="M12 2 L22 12 L12 22 L2 12 Z" />,
  arrow: <path d="M12 2.5 L19 12 H15 V21.5 H9 V12 H5 Z" />,
}

function Glyph({ kind, filled, rot }: { kind: Kind; filled?: boolean; rot?: number }) {
  return (
    <svg className="fig" viewBox="0 0 24 24" role="img" aria-hidden>
      <g
        className={filled ? 'fig__shape fig__shape--on' : 'fig__shape'}
        transform={rot ? `rotate(${rot} 12 12)` : undefined}
      >
        {PATHS[kind]}
      </g>
    </svg>
  )
}

/** Cuenta creciente: n puntos en una o dos filas. */
function Cluster({ n }: { n: number }) {
  const cols = Math.min(3, n)
  return (
    <svg className="fig" viewBox="0 0 24 24" role="img" aria-hidden>
      <g className="fig__shape fig__shape--on">
        {Array.from({ length: n }, (_, i) => (
          <circle
            key={i}
            cx={4 + (i % cols) * (16 / Math.max(1, cols - 1 || 1))}
            cy={n <= 3 ? 12 : 7 + Math.floor(i / cols) * 10}
            r="2.6"
          />
        ))}
      </g>
    </svg>
  )
}

interface Serie {
  label: string
  cells: ReactNode[]
}

/** Patrón que se repite: ABAB o ABCABC, con relleno alterno a partir de 3º. */
function repeatSerie(cycle: Cycle, rng: Rng): Serie {
  const period = cycle === 1 ? rng.pick([2, 3]) : 3
  const base = rng.sample(KINDS, period)
  const alternaRelleno = cycle >= 2 && rng.bool(0.5)
  const cells = Array.from({ length: 6 }, (_, i) => (
    <Glyph
      key={i}
      kind={base[i % period]}
      filled={alternaRelleno ? Math.floor(i / period) % 2 === 1 : false}
    />
  ))
  return { label: 'patrón', cells }
}

/** Giro constante: la misma flecha rotando un ángulo fijo en cada paso. */
function rotateSerie(cycle: Cycle, rng: Rng): Serie {
  const step = cycle === 1 ? 90 : rng.pick([45, 90, -90, 135, -45])
  const start = rng.int(0, 3) * 90
  const cells = Array.from({ length: 5 }, (_, i) => (
    <Glyph key={i} kind="arrow" rot={start + i * step} />
  ))
  return { label: 'giro', cells }
}

/** Cuenta que crece: paso fijo en 1er ciclo, paso creciente a partir de 5º. */
function growSerie(cycle: Cycle, rng: Rng): Serie {
  const start = rng.int(1, 2)
  if (cycle === 3 && rng.bool(0.6)) {
    // 1, 2, 4, 7, 11... el salto sube de uno en uno
    const seq = [start]
    for (let i = 1; i < 5; i++) seq.push(seq[i - 1] + i)
    return { label: 'crece', cells: seq.map((n, i) => <Cluster key={i} n={Math.min(n, 6)} />) }
  }
  const step = rng.int(1, 2)
  return {
    label: 'crece',
    cells: Array.from({ length: 5 }, (_, i) => <Cluster key={i} n={Math.min(start + i * step, 6)} />),
  }
}

const figuras: ExerciseType = {
  id: 'logica.figuras',
  name: 'Secuencias de figuras',
  subject: 'logica',
  format: 'logica',
  grades: G,
  generate({ cycle, rng }: GenContext) {
    const makers =
      cycle === 1
        ? [repeatSerie, growSerie, repeatSerie]
        : rng.shuffle([repeatSerie, rotateSerie, growSerie])
    const series = makers.slice(0, 3).map((make) => make(cycle, rng))

    return {
      typeId: figuras.id,
      title: '¿Qué figura sigue?',
      instructions: 'Descubre el patrón y dibuja la figura que falta.',
      subject: 'logica',
      format: 'logica',
      cols: 1,
      rows: rowsFor(cycle, 7, 4),
      body: (
        <div className="figs">
          {series.map((s, i) => (
            <div key={i} className="figs__row">
              {s.cells}
              <span className="figs__slot" />
            </div>
          ))}
        </div>
      ),
    }
  },
}

export default [figuras]
