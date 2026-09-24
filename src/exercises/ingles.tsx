import english from '../content/english.json'
import { pickFresh } from '../core/pick'
import type { Cycle, ExerciseType, GenContext, Grade } from '../core/types'
import { Blank, Lines, WordBank, rowsFor } from './ui'

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

export default [huecos, verbos, vocab, writing]
