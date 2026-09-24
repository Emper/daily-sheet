import lengua from '../content/lengua.json'
import quotes from '../content/quotes.json'
import readings from '../content/readings.json'
import { pickFresh } from '../core/pick'
import type { Cycle, ExerciseType, GenContext, Grade } from '../core/types'
import {
  Blank,
  HEAD_MM,
  Lines,
  Scramble,
  scrambleMM,
  TEXT_LINE_MM,
  lineHeightFor,
  mmToRows,
  rowsFor,
  textLines,
} from './ui'

const G: readonly Grade[] = [1, 2, 3, 4, 5, 6]

/** El banco esta clasificado por ciclo; si un ciclo se queda corto tiramos del anterior. */
function byCycle<T extends { cycle: number }>(items: readonly T[], cycle: Cycle): T[] {
  const exact = items.filter((i) => i.cycle === cycle)
  if (exact.length) return exact
  return items.filter((i) => i.cycle === Math.max(1, cycle - 1))
}

/* ----------------------------------------------------------------- lectura */


/** Cómo se presenta el texto según su tipología. */
const READ_INTRO: Record<string, string> = {
  instructivo: 'Lee estas instrucciones',
  dialogado: 'Lee este diálogo',
  poético: 'Lee el poema',
  carta: 'Lee esta carta',
  noticia: 'Lee esta noticia',
  argumentativo: 'Lee este texto de opinión',
  biográfico: 'Lee esta biografía',
}

/**
 * Alto del bloque estimado a partir del texto real. Con 45 textos que van
 * de 28 a 154 palabras, un alto fijo por ciclo o desborda los largos o
 * desperdicia media hoja con los cortos.
 *
 * La estimación se hace tirando por lo alto a propósito: quedarse corto
 * recorta el texto, mientras que pasarse no cuesta nada, porque el
 * reparto de espacio sobrante estira los demás bloques igualmente.
 */
function readingRows(text: string, questions: number, cycle: Cycle): number {
  const paragraphs = text.split('\n')
  const textMM = textLines(text, cycle, 2) * TEXT_LINE_MM[cycle] + (paragraphs.length - 1) * 0.5
  // Cada pregunta: su enunciado más el renglón donde se contesta.
  const questionMM = questions * (TEXT_LINE_MM[cycle] * 0.9 + lineHeightFor(cycle) + 1.2)
  return mmToRows(HEAD_MM[cycle] + textMM + questionMM)
}

const lectura: ExerciseType = {
  id: 'lengua.lectura',
  weight: 1.4,
  name: 'Comprensión lectora',
  subject: 'lengua',
  format: 'texto',
  grades: G,
  generate({ cycle, contentCycle, rng, taken }: GenContext) {
    const r = pickFresh(rng, byCycle(readings, contentCycle), taken, (x) => `read:${x.id}`)
    const questions = r.questions.slice(0, cycle === 1 ? 2 : 3)
    const paragraphs = r.text.split('\n')
    const verso = paragraphs.length > 1

    return {
      typeId: lectura.id,
      title: r.title,
      instructions: `${READ_INTRO[r.kind] ?? 'Lee el texto'} y responde a las preguntas.`,
      subject: 'lengua',
      format: 'texto',
      cols: 2,
      rows: readingRows(r.text, questions.length, cycle),
      // El espacio de más no le sirve: los renglones de respuesta son
      // fijos y todo lo que sobra queda en blanco al pie del bloque. Que
      // se lo queden antes los ejercicios donde el niño escribe.
      flexible: false,
      body: (
        <>
          <div className={verso ? 'reading reading--lines' : 'reading'}>
            {paragraphs.map((line, i) =>
              line.trim() === '' ? (
                <div key={i} className="reading__gap" />
              ) : (
                <p key={i}>{line}</p>
              ),
            )}
          </div>
          <ol className="questions">
            {questions.map((q, i) => (
              <li key={i}>
                <span className="questions__q">{q}</span>
                <Lines n={1} cycle={cycle} />
              </li>
            ))}
          </ol>
        </>
      ),
    }
  },
}

/* --------------------------------------------------------------------- cita */

const cita: ExerciseType = {
  id: 'lengua.cita',
  name: 'Frase del día',
  subject: 'lengua',
  format: 'copia',
  grades: G,
  generate({ cycle, contentCycle, rng, taken }: GenContext) {
    const q = pickFresh(rng, byCycle(quotes, contentCycle), taken, (x) => `quote:${x.id}`)
    return {
      typeId: cita.id,
      title: 'La frase del día',
      instructions:
        contentCycle === 1
          ? 'Cópiala con buena letra.'
          : 'Cópiala con buena letra y explica en una línea qué te sugiere.',
      subject: 'lengua',
      format: 'copia',
      cols: 2,
      rows: rowsFor(cycle, 5),
      body: (
        <>
          <blockquote className="quote">
            «{q.text}»<cite>— {q.author}</cite>
          </blockquote>
          <Lines n={cycle === 1 ? 2 : 2} cycle={cycle} />
        </>
      ),
    }
  },
}

/* --------------------------------------------------------------- ortografía */

const ortografia: ExerciseType = {
  id: 'lengua.ortografia',
  weight: 1.3,
  name: 'Ortografía',
  subject: 'lengua',
  format: 'huecos',
  grades: G,
  generate({ cycle, contentCycle, rng }: GenContext) {
    const items = rng.sample(byCycle(lengua.spelling, contentCycle), 6)
    const rules = [...new Set(items.map((i) => i.rule))].join(' · ')
    return {
      typeId: ortografia.id,
      title: 'Ortografía',
      instructions: `Completa cada palabra. Reglas de hoy: ${rules}.`,
      subject: 'lengua',
      format: 'huecos',
      cols: 1,
      rows: rowsFor(cycle, 6),
      body: (
        <div className="grid2">
          {items.map((it) => (
            <div key={it.id} className="mono-row">
              {it.word.replace('_', '▁▁')}
            </div>
          ))}
        </div>
      ),
    }
  },
}

/* --------------------------------------------------------- ordenar palabras */

const orden: ExerciseType = {
  id: 'lengua.orden',
  name: 'Ordenar la frase',
  subject: 'lengua',
  format: 'logica',
  grades: G,
  generate({ cycle, contentCycle, rng }: GenContext) {
    const items = rng.sample(byCycle(lengua.sentenceOrder, contentCycle), 2)
    // Antes cada frase tenía un solo renglón, y en 3er ciclo una frase de
    // diez palabras escrita a mano no cabe en uno.
    const bodyMM = items.reduce((mm, it) => mm + scrambleMM(it.words, cycle), 0)
    return {
      typeId: orden.id,
      title: 'Ordena las palabras',
      instructions: 'Escribe la frase en orden, con mayúscula inicial y punto final.',
      subject: 'lengua',
      format: 'logica',
      cols: 1,
      rows: mmToRows(HEAD_MM[cycle] + bodyMM),
      body: (
        <>
          {items.map((it, i) => (
            <Scramble key={i} words={it.words} shuffled={rng.shuffle(it.words)} cycle={cycle} />
          ))}
        </>
      ),
    }
  },
}

/* ------------------------------------------------------ familia de palabras */

const familias: ExerciseType = {
  id: 'lengua.familias',
  name: 'Familia de palabras',
  subject: 'lengua',
  format: 'tabla',
  grades: G,
  generate({ cycle, contentCycle, rng, taken }: GenContext) {
    const it = pickFresh(rng, byCycle(lengua.wordFamilies, contentCycle), taken, (x) => `fam:${x.prompt}`)
    const n = contentCycle === 1 ? 4 : 6
    return {
      typeId: familias.id,
      title: 'Familia de palabras',
      instructions: `Escribe ${n} palabras de la familia de «${it.prompt}».`,
      subject: 'lengua',
      format: 'tabla',
      cols: 1,
      rows: rowsFor(cycle, 6),
      body: (
        <>
          <div className="grid2">
            {Array.from({ length: n }, (_, i) => (
              <div key={i} className="mono-row">
                {i + 1}. <Blank ch={14} />
              </div>
            ))}
          </div>
          <p className="hint">Pista: {it.hint}</p>
        </>
      ),
    }
  },
}

export default [lectura, cita, ortografia, orden, familias]
