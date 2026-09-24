import english from '../content/english.json'
import { pickFresh } from '../core/pick'
import type { Cycle, ExerciseType, GenContext, Grade } from '../core/types'
import {
  Blank,
  CHARS_PER_LINE,
  HEAD_MM,
  Lines,
  Scramble,
  TEXT_LINE_MM,
  WordBank,
  YesNo,
  lineHeightFor,
  mmToRows,
  rowsFor,
  scrambleMM,
  textLines,
} from './ui'

const G: readonly Grade[] = [1, 2, 3, 4, 5, 6]

function byCycle<T extends { cycle: number }>(items: readonly T[], cycle: Cycle): T[] {
  const exact = items.filter((i) => i.cycle === cycle)
  return exact.length ? exact : items.filter((i) => i.cycle === Math.max(1, cycle - 1))
}

/* -------------------------------------------------------------- fill the gaps */

const huecos: ExerciseType = {
  id: 'ingles.huecos',
  weight: 1.3,
  name: 'Fill in the gaps',
  subject: 'ingles',
  format: 'huecos',
  grades: G,
  generate({ cycle, contentCycle, rng }: GenContext) {
    const items = rng.sample(byCycle(english.gaps, contentCycle), 5)
    // Banco de palabras solo hasta 4o: en tercer ciclo que lo saquen solos.
    const bank = contentCycle < 3 ? rng.shuffle(items.map((i) => i.answer)) : null
    return {
      typeId: huecos.id,
      title: 'Fill in the gaps',
      instructions: bank
        ? 'Completa cada frase con una palabra del recuadro.'
        : 'Completa cada frase con la palabra adecuada.',
      subject: 'ingles',
      format: 'huecos',
      cols: 1,
      rows: rowsFor(cycle, 6),
      body: (
        <>
          {bank && <WordBank words={bank} />}
          <ol className="sentences">
            {items.map((it) => (
              <li key={it.id}>{it.sentence.replace('___', '__________')}</li>
            ))}
          </ol>
        </>
      ),
    }
  },
}

/* ----------------------------------------------------------- irregular verbs */

const verbos: ExerciseType = {
  id: 'ingles.verbos',
  name: 'Irregular verbs',
  subject: 'ingles',
  format: 'tabla',
  grades: [3, 4, 5, 6],
  generate({ cycle, contentCycle, rng }: GenContext) {
    const pool = contentCycle >= 3 ? english.verbs : english.verbs.filter((v) => v.cycle === 2)
    const items = rng.sample(pool, 5)
    // Ocultamos una columna distinta en cada fila para que no se rellene en automatico.
    const columns = ['past', 'participle', 'es'] as const
    return {
      typeId: verbos.id,
      title: 'Irregular verbs',
      instructions: 'Completa la tabla.',
      subject: 'ingles',
      format: 'tabla',
      cols: 1,
      rows: rowsFor(cycle, 6),
      body: (
        <table className="vtable">
          <thead>
            <tr>
              <th>Infinitive</th>
              <th>Past simple</th>
              <th>Past participle</th>
              <th>Español</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => {
              const hide = rng.pick(columns)
              const cell = (key: (typeof columns)[number]) =>
                hide === key ? <Blank ch={9} /> : v[key]
              return (
                <tr key={v.base}>
                  <td>{v.base}</td>
                  <td>{cell('past')}</td>
                  <td>{cell('participle')}</td>
                  <td>{cell('es')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ),
    }
  },
}

/* ------------------------------------------------------------------- vocab */

const vocab: ExerciseType = {
  id: 'ingles.vocab',
  weight: 1.2,
  name: 'Vocabulary',
  subject: 'ingles',
  format: 'tabla',
  grades: G,
  generate({ cycle, contentCycle, rng, taken }: GenContext) {
    const set = pickFresh(rng, byCycle(english.vocab, contentCycle), taken, (x) => `vocab:${x.topic}`)
    const items = rng.sample(set.words, 6)
    // La mitad en un sentido y la mitad en el otro: traducir de vuelta
    // cuesta mas y es lo que de verdad fija el vocabulario.
    const half = Math.ceil(items.length / 2)
    // Con la letra de 1er ciclo, «enfermero/a → ______» no cabe a dos
    // columnas y se pisa con la de al lado.
    const single = cycle === 1
    return {
      typeId: vocab.id,
      title: `Vocabulary: ${set.topic}`,
      instructions: 'Traduce cada palabra.',
      subject: 'ingles',
      format: 'tabla',
      cols: 1,
      rows: rowsFor(cycle, 6),
      body: (
        <div className={single ? 'grid2 grid2--single' : 'grid2'}>
          {items.map(([en, es], i) => (
            <div key={en} className="mono-row">
              {i < half ? (
                <>
                  {en} → <Blank ch={8} />
                </>
              ) : (
                <>
                  {es} → <Blank ch={8} />
                </>
              )}
            </div>
          ))}
        </div>
      ),
    }
  },
}

/* ------------------------------------------------------------------ writing */

const WRITING_PROMPTS: Record<Cycle, string[]> = {
  1: [
    'Draw your favourite animal and write three words about it.',
    'Write three things you can see in your bedroom.',
    'Write the days of the week in order.',
  ],
  2: [
    'Write three sentences about what you did last weekend.',
    'Describe your best friend in three sentences.',
    'Write three things you can do and one thing you cannot do.',
  ],
  3: [
    'Write four sentences about what you will do next summer.',
    'Compare two cities you know. Use "bigger", "more interesting"...',
    'Write a short email to a friend inviting them to your birthday.',
  ],
}

const writing: ExerciseType = {
  id: 'ingles.writing',
  name: 'Writing',
  subject: 'ingles',
  format: 'copia',
  grades: G,
  generate({ cycle, contentCycle, rng, taken }: GenContext) {
    return {
      typeId: writing.id,
      title: 'Writing',
      instructions: pickFresh(rng, WRITING_PROMPTS[contentCycle], taken, (x) => `wprompt:${x}`),
      subject: 'ingles',
      format: 'copia',
      cols: 1,
      rows: rowsFor(cycle, 6),
      body: <Lines n={cycle === 1 ? 3 : cycle === 2 ? 4 : 5} cycle={cycle} />,
    }
  },
}


/* ------------------------------------------------------- numbers in words */

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/** Inglés británico, que es el que se enseña aquí: "three hundred and five". */
function inWords(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '')
  const rest = n % 100
  return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` and ${inWords(rest)}` : ''}`
}

const NUM_RANGE: Record<Cycle, [number, number]> = { 1: [1, 20], 2: [21, 99], 3: [101, 999] }

const numeros: ExerciseType = {
  id: 'ingles.numeros',
  name: 'Numbers',
  subject: 'ingles',
  format: 'huecos',
  grades: G,
  generate({ cycle, contentCycle, rng }: GenContext) {
    const [lo, hi] = NUM_RANGE[contentCycle]
    const n = cycle === 1 ? 4 : 6
    const nums = rng.sample(
      Array.from({ length: hi - lo + 1 }, (_, i) => lo + i),
      n,
    )
    // En los dos sentidos: escribir con letra lo que se ve en cifra, y al revés.
    const half = n / 2
    const rowMM = lineHeightFor(cycle) + 1.5

    return {
      typeId: numeros.id,
      title: 'Numbers',
      // Instrucciones en inglés, pero al nivel del inglés que lee el niño.
      instructions: contentCycle === 1 ? 'Write the numbers.' : 'Write the numbers in words, or in figures.',
      subject: 'ingles',
      format: 'huecos',
      cols: 1,
      rows: mmToRows(HEAD_MM[cycle] + n * rowMM),
      body: (
        <div className="fills">
          {nums.map((x, i) =>
            i < half ? (
              <div key={x} className="fill-row">
                <span className="fill-row__cue fill-row__cue--num">{x}</span>
                <span className="fill-row__line" />
              </div>
            ) : (
              <div key={x} className="fill-row">
                <span className="fill-row__cue">{inWords(x)}</span>
                <span className="fill-row__line fill-row__line--short" />
              </div>
            ),
          )}
        </div>
      ),
    }
  },
}

/* ------------------------------------------------------------- word order */

const orden: ExerciseType = {
  id: 'ingles.orden',
  name: 'Word order',
  subject: 'ingles',
  format: 'logica',
  grades: G,
  generate({ cycle, contentCycle, rng }: GenContext) {
    const items = rng.sample(byCycle(english.order, contentCycle), 2)
    const bodyMM = items.reduce((mm, it) => mm + scrambleMM(it.words, cycle), 0)
    return {
      typeId: orden.id,
      title: 'Word order',
      instructions:
        contentCycle === 1
          ? 'Put the words in order.'
          : 'Put the words in order. Start with a capital letter and end with a full stop.',
      subject: 'ingles',
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

/* ------------------------------------------------------ reading true/false */

const readingEn: ExerciseType = {
  id: 'ingles.reading',
  name: 'Reading',
  subject: 'ingles',
  format: 'texto',
  grades: G,
  generate({ cycle, contentCycle, rng, taken }: GenContext) {
    const r = pickFresh(rng, byCycle(english.readings, contentCycle), taken, (x) => `eread:${x.id}`)
    // En 1er ciclo, sí/no; después, verdadero/falso. Respuesta cerrada a
    // propósito: se comprueba que han entendido, no que sepan redactar.
    const [yes, no] = contentCycle === 1 ? ['yes', 'no'] : ['T', 'F']
    // Cada afirmación comparte línea con las dos casillas, así que tiene
    // algo menos de ancho que el texto.
    const cpl = Math.floor(CHARS_PER_LINE[cycle] * 0.43 * 0.75)
    const tfMM = r.tf.reduce(
      (mm, [st]) => mm + Math.ceil(String(st).length / cpl) * TEXT_LINE_MM[cycle] + 2,
      0,
    )
    const textMM = textLines(r.text, cycle, 1) * TEXT_LINE_MM[cycle] + 2

    return {
      typeId: readingEn.id,
      title: r.title,
      instructions:
        contentCycle === 1 ? 'Read and tick yes or no.' : 'Read and tick True (T) or False (F).',
      subject: 'ingles',
      format: 'texto',
      cols: 1,
      rows: mmToRows(HEAD_MM[cycle] + textMM + tfMM),
      // Como la lectura de lengua: el espacio de más se le queda en blanco.
      flexible: false,
      body: (
        <>
          <p className="reading reading--en">{r.text}</p>
          <ol className="tf">
            {r.tf.map(([st], i) => (
              <li key={i} className="tf__row">
                <span className="tf__text">{st}</span>
                <span className="tf__opts">
                  <span className="tf__opt">{yes}</span>
                  <span className="tf__opt">{no}</span>
                </span>
              </li>
            ))}
          </ol>
        </>
      ),
    }
  },
}

/* ----------------------------------------------------------- short answers */

const respuestas: ExerciseType = {
  id: 'ingles.respuestas',
  name: 'Short answers',
  subject: 'ingles',
  format: 'copia',
  grades: [2, 3, 4, 5, 6],
  generate({ cycle, contentCycle, rng }: GenContext) {
    const n = cycle === 1 ? 3 : 4
    const items = rng.sample(byCycle(english.answers, contentCycle), n).map((it) => ({
      ...it,
      yes: rng.bool(),
    }))
    const itemMM = TEXT_LINE_MM[cycle] + lineHeightFor(cycle) + 2

    return {
      typeId: respuestas.id,
      title: 'Short answers',
      instructions:
        contentCycle === 1
          ? 'Answer: Yes, I can. / No, it isn\'t.'
          : 'Answer with a short answer: Yes, she does. / No, they weren\'t.',
      subject: 'ingles',
      format: 'copia',
      cols: 1,
      rows: mmToRows(HEAD_MM[cycle] + n * itemMM),
      body: (
        <div className="answers">
          {items.map((it, i) => (
            <div key={i} className="answers__item">
              <span className="answers__q">{it.q}</span>
              <div className="fill-row">
                <YesNo yes={it.yes} />
                <span className="fill-row__line" />
              </div>
            </div>
          ))}
        </div>
      ),
    }
  },
}

export default [huecos, verbos, vocab, writing, numeros, orden, readingEn, respuestas]
