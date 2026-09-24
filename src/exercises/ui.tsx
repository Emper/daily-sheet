import { SHEET } from '../core/layout'
import type { Cycle } from '../core/types'

/**
 * Cuántos caracteres entran en una línea de un bloque de dos columnas
 * (~184 mm útiles) y cuánto mide esa línea, por ciclo. Calibrado contra
 * Nunito, que es la fuente fijada de la hoja.
 */
export const CHARS_PER_LINE: Record<Cycle, number> = { 1: 78, 2: 90, 3: 100 }
export const TEXT_LINE_MM: Record<Cycle, number> = { 1: 5.9, 2: 5.2, 3: 4.7 }
/** Título más instrucciones de un bloque, en mm. */
export const HEAD_MM: Record<Cycle, number> = { 1: 13, 2: 11.5, 3: 10.5 }

/**
 * Líneas que ocupará un texto. En un bloque de una columna caben algo
 * menos de la mitad de caracteres que en uno de dos (0,43, no 0,5): en
 * una columna estrecha las palabras largas saltan antes de línea.
 */
export function textLines(text: string, cycle: Cycle, cols: 1 | 2): number {
  const cpl = cols === 2 ? CHARS_PER_LINE[cycle] : Math.floor(CHARS_PER_LINE[cycle] * 0.43)
  return text
    .split('\n')
    .reduce((n, p) => n + (p.trim() === '' ? 0.5 : Math.ceil(p.length / cpl)), 0)
}

/**
 * De milímetros a filas de rejilla, con un 6 % de margen. Quedarse corto
 * recorta el contenido; pasarse no cuesta nada, porque el reparto del
 * espacio sobrante estira los demás bloques igualmente.
 */
export const mmToRows = (mm: number) =>
  Math.ceil((mm * 1.06 + SHEET.GAP_MM) / (SHEET.ROW_MM + SHEET.GAP_MM))

/**
 * Caracteres manuscritos que caben en un renglón de un bloque de una
 * columna (~84 mm). No tiene nada que ver con la letra impresa: un niño
 * de 1º escribe con letras de 4-5 mm, uno de 6º con letras de unos 2,3.
 */
export const HAND_CPL: Record<Cycle, number> = { 1: 20, 2: 28, 3: 36 }

/** Renglones que hacen falta para escribir `text` a mano. */
export const handLines = (text: string, cycle: Cycle, max = 2) =>
  Math.min(max, Math.max(1, Math.ceil(text.length / HAND_CPL[cycle])))

/**
 * Frase desordenada: fichas con las palabras y debajo los renglones para
 * escribirla en orden. Compartido por lengua e inglés, que es el mismo
 * ejercicio en dos idiomas.
 */
export function Scramble({ words, shuffled, cycle }: { words: string[]; shuffled: string[]; cycle: Cycle }) {
  return (
    <div className="scramble">
      <div className="scramble__words">
        {shuffled.map((w, j) => (
          <span key={j} className="scramble__word">
            {w}
          </span>
        ))}
      </div>
      <Lines n={handLines(words.join(' '), cycle)} cycle={cycle} />
    </div>
  )
}

/** Alto en mm de una frase desordenada: fichas más renglones de escritura. */
export function scrambleMM(words: string[], cycle: Cycle): number {
  const budget = Math.floor(CHARS_PER_LINE[cycle] * 0.43)
  const chipLines = Math.ceil(words.reduce((n, w) => n + w.length + 3, 0) / budget)
  const writeLines = handLines(words.join(' '), cycle)
  return chipLines * TEXT_LINE_MM[cycle] * 1.3 + writeLines * (lineHeightFor(cycle) + 1) + 2
}

/** Marca de sí o no a trazo, sin depender de que la fuente tenga ✓ y ✗. */
export const YesNo = ({ yes }: { yes: boolean }) => (
  <svg className="yn" viewBox="0 0 20 20" role="img" aria-label={yes ? 'sí' : 'no'}>
    <circle cx="10" cy="10" r="8.5" className="yn__ring" />
    {yes ? (
      <path d="M5.5 10.5 L8.7 13.5 L14.5 6.8" className="yn__mark" />
    ) : (
      <path d="M6.5 6.5 L13.5 13.5 M13.5 6.5 L6.5 13.5" className="yn__mark" />
    )}
  </svg>
)

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
