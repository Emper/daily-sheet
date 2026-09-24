import type { Cycle } from '../core/types'

/**
 * Alto de un bloque en filas de rejilla, escalado por ciclo.
 *
 * El cuerpo de letra va de 12,5 pt en 1er ciclo a 10 pt en 3o: un bloque
 * calibrado para 6o se desborda un 25% en 2o. `base` se mide siempre para
 * tercer ciclo; `fixed` son las filas que ocupa algo que NO escala con la
 * tipografia (una esfera de reloj, una rejilla de sudoku).
 */
export const rowsFor = (cycle: Cycle, base: number, fixed = 0) =>
  Math.round(fixed + (base - fixed) * (cycle === 1 ? 1.25 : cycle === 2 ? 1.1 : 1))

/** Alto de renglon segun ciclo: un nino de 1o necesita el doble que uno de 6o. */
export const lineHeightFor = (cycle: Cycle) => (cycle === 1 ? 10 : cycle === 2 ? 8 : 7)

/**
 * Renglones para escribir. En primer ciclo se pinta doble pauta (la linea
 * de apoyo superior) porque a esa edad todavia se esta fijando la altura
 * de las letras.
 */
export function Lines({ n, cycle }: { n: number; cycle: Cycle }) {
  const h = lineHeightFor(cycle)
  return (
    <div className="lines">
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          className={cycle === 1 ? 'line line--pauta' : 'line'}
          style={{ height: `${h}mm` }}
        />
      ))}
    </div>
  )
}

/** Hueco en linea para rellenar dentro de una frase. */
export const Blank = ({ ch = 8 }: { ch?: number }) => (
  <span className="blank" style={{ width: `${ch}ch` }} />
)

/** Casilla cuadrada para una respuesta corta. */
export const Box = ({ mm = 9 }: { mm?: number }) => (
  <span className="box" style={{ width: `${mm}mm`, height: `${mm}mm` }} />
)

export const WordBank = ({ words }: { words: string[] }) => (
  <div className="wordbank">
    {words.map((w) => (
      <span key={w} className="wordbank__item">
        {w}
      </span>
    ))}
  </div>
)

const HOUR_LABELS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

/**
 * Esfera de reloj analogico. Con `hands` pintadas el nino escribe la hora;
 * sin ellas, la esfera esta vacia y el nino dibuja las agujas.
 */
export function Clock({ h, m, hands }: { h: number; m: number; hands: boolean }) {
  const hourAngle = ((h % 12) * 30 + m * 0.5 - 90) * (Math.PI / 180)
  const minAngle = (m * 6 - 90) * (Math.PI / 180)
  const at = (angle: number, len: number) => ({
    x: 50 + Math.cos(angle) * len,
    y: 50 + Math.sin(angle) * len,
  })
  const hourEnd = at(hourAngle, 21)
  const minEnd = at(minAngle, 32)

  return (
    <svg className="clock" viewBox="0 0 100 100" role="img" aria-label="reloj">
      <circle cx="50" cy="50" r="45" className="clock__face" />
      {HOUR_LABELS.map((label, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        const tick = at(a, 40)
        const outer = at(a, 45)
        const text = at(a, 33)
        return (
          <g key={label}>
            <line x1={tick.x} y1={tick.y} x2={outer.x} y2={outer.y} className="clock__tick" />
            <text x={text.x} y={text.y} className="clock__num">
              {label}
            </text>
          </g>
        )
      })}
      {[...Array(60).keys()]
        .filter((i) => i % 5 !== 0)
        .map((i) => {
          const a = (i * 6 - 90) * (Math.PI / 180)
          const p1 = at(a, 42)
          const p2 = at(a, 45)
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="clock__tick--min" />
        })}
      {hands && (
        <>
          <line x1="50" y1="50" x2={hourEnd.x} y2={hourEnd.y} className="clock__hand clock__hand--h" />
          <line x1="50" y1="50" x2={minEnd.x} y2={minEnd.y} className="clock__hand clock__hand--m" />
        </>
      )}
      <circle cx="50" cy="50" r="2.5" className="clock__pin" />
    </svg>
  )
}

export const pad2 = (n: number) => String(n).padStart(2, '0')
