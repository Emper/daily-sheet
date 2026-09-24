/**
 * Comprobacion del compositor sobre muchas hojas: mide variedad real.
 * Ejecutar con: npm run check
 */
import '../src/exercises/index.ts'
import { planDay, planSheet } from '../src/core/composer.ts'
import { PACKS } from '../src/core/packs.ts'
import { subjectsWithTypes, typesForGrade } from '../src/core/registry.ts'
import { BUDGET } from '../src/core/layout.ts'
import { allTypes } from '../src/core/registry.ts'
import readings from '../src/content/readings.json' with { type: 'json' }
import type { Cycle, Grade, Level, Subject } from '../src/core/types.ts'

const DAYS = 120
const grades: Grade[] = [1, 2, 3, 4, 5, 6]
let problems = 0

/** Peso declarado de cada tipo, para saber qué repeticiones son buscadas. */
const weightOf = new Map(allTypes().map((t) => [t.id, t.weight ?? 1]))

for (const grade of grades) {
  const typeCount = new Map<string, number>()
  const subjectCount = new Map<string, number>()
  let cells = 0
  let blocks = 0
  let monotone = 0
  let repeatNextDay = 0
  let staleRepeat = 0
  let history: string[][] = []

  for (let d = 0; d < DAYS; d++) {
    const seed = `2026-01-${d}|kid|0`
    const { exercises, usedCells } = planSheet({ grade, seed, history })
    const ids = exercises.map((e) => e.typeId)
    const subjects = new Set(exercises.map((e) => e.subject))
    const formats = new Set(exercises.map((e) => e.format))

    if (subjects.size < 3 || formats.size < 3) monotone++
    if (history[0]) {
      const again = ids.filter((id) => history[0].includes(id))
      repeatNextDay += again.length
      // Repetir una tabla de multiplicar o unas sumas al día siguiente es
      // el objetivo, no un defecto: son práctica diaria y los números
      // cambian. Lo que aburre es repetir el laberinto o el sudoku.
      staleRepeat += again.filter((id) => (weightOf.get(id) ?? 1) <= 1).length
    }

    for (const e of exercises) {
      typeCount.set(e.typeId, (typeCount.get(e.typeId) ?? 0) + 1)
      subjectCount.set(e.subject, (subjectCount.get(e.subject) ?? 0) + 1)
    }
    cells += usedCells
    blocks += exercises.length
    history = [ids, ...history].slice(0, 5)
  }

  const unused = allTypes()
    .filter((t) => t.grades.includes(grade) && !typeCount.has(t.id))
    .map((t) => t.id)

  const fill = ((cells / DAYS / BUDGET) * 100).toFixed(0)
  console.log(`\n=== ${grade}º Primaria =======================================`)
  console.log(`  bloques/hoja: ${(blocks / DAYS).toFixed(1)}   relleno: ${fill}% del A4`)
  console.log(`  hojas monótonas (<3 asignaturas o <3 formatos): ${monotone}/${DAYS}`)
  console.log(
    `  repeticiones día a día: ${(repeatNextDay / DAYS).toFixed(2)}/hoja  ` +
      `(buscadas ${((repeatNextDay - staleRepeat) / DAYS).toFixed(2)} · no buscadas ${(staleRepeat / DAYS).toFixed(2)})`,
  )
  console.log(
    `  asignaturas: ` +
      [...subjectCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([s, n]) => `${s} ${((n / blocks) * 100).toFixed(0)}%`)
        .join('  '),
  )
  if (unused.length) console.log(`  NUNCA usados: ${unused.join(', ')}`)

  if (monotone > DAYS * 0.1) { console.log('  ⚠ demasiadas hojas monótonas'); problems++ }
  if (staleRepeat / DAYS > 0.7) {
    console.log('  ⚠ demasiada repetición día a día: faltan tipos en el catálogo')
    problems++
  }
  if (Number(fill) < 80) { console.log('  ⚠ las hojas quedan medio vacías'); problems++ }
  if (unused.length) problems++
}

/* ============================ packs ============================ */
console.log('\n\n=== Packs =============================================')
for (const pack of PACKS) {
  let sheets = 0, empties = 0, blocks = 0, maxBlocks = 0, overlap = 0, pairs = 0
  for (const grade of grades) {
    for (let d = 0; d < 30; d++) {
      const day = planDay({ grade, pack: pack.id, seed: `p${pack.id}-${grade}-${d}` })
      if (day.length !== pack.sheets) {
        console.log(`  ⚠ ${pack.id}: devolvió ${day.length} hojas, esperaba ${pack.sheets}`)
        problems++
      }
      for (const sheet of day) {
        sheets++
        blocks += sheet.exercises.length
        maxBlocks = Math.max(maxBlocks, sheet.exercises.length)
        if (sheet.exercises.length < 2) empties++
      }
      // ¿se repiten los tipos entre las hojas del mismo día?
      for (let i = 1; i < day.length; i++) {
        pairs++
        const prev = new Set(day[i - 1].exercises.map((e) => e.typeId))
        overlap += day[i].exercises.filter((e) => prev.has(e.typeId)).length
      }
    }
  }
  const per = (blocks / sheets).toFixed(1)
  const dup = pairs ? (overlap / pairs).toFixed(2) : '—'
  console.log(
    `  ${pack.label.padEnd(18)} ${String(pack.sheets)} hoja(s) · ${per} bloques/hoja ` +
      `(máx ${maxBlocks}) · repetidos entre hojas del día: ${dup}`,
  )
  if (empties) { console.log(`    ⚠ ${empties} hoja(s) casi vacías`); problems++ }
  if (pack.maxBlocks && maxBlocks > pack.maxBlocks) {
    console.log(`    ⚠ se pasa del tope de ${pack.maxBlocks} bloques`); problems++
  }
  if (pairs && overlap / pairs > 1) {
    console.log('    ⚠ las hojas del mismo día se parecen demasiado'); problems++
  }
}

/* =========================== niveles =========================== */
console.log('\n=== Niveles ===========================================')
for (const grade of [2, 4, 6] as Grade[]) {
  const sig = (level: Level) =>
    Array.from({ length: 20 }, (_, d) =>
      planSheet({ grade, level, seed: `lvl-${grade}-${d}` })
        .exercises.map((e) => `${e.typeId}:${e.title}:${e.instructions ?? ''}`)
        .join(),
    ).join('|')
  const easy = sig(-1), normal = sig(0), hard = sig(1)
  const changes = (easy !== normal ? 1 : 0) + (hard !== normal ? 1 : 0)
  console.log(`  ${grade}º: fácil/normal/reto dan hojas distintas: ${changes}/2`)
  // En 1º "fácil" y en 6º "reto" chocan con el tope: ahí solo puede cambiar
  // uno de los dos sentidos, y la UI deshabilita el que no hace nada.
  const expected = grade === 1 || grade === 6 ? 1 : 2
  if (changes < expected) { console.log(`    ⚠ el nivel no cambia nada (esperaba ${expected}/2)`); problems++ }
}

/* ===================== filtros de asignatura ==================== */
console.log('\n=== Filtros de asignatura =============================')
const available = subjectsWithTypes()
console.log(`  asignaturas con ejercicios: ${available.join(', ')}`)
for (const subject of available) {
  let min = Infinity, total = 0
  for (const grade of grades) {
    for (let d = 0; d < 15; d++) {
      const n = planSheet({ grade, seed: `f${subject}-${grade}-${d}`, subjects: [subject as Subject] })
        .exercises.length
      min = Math.min(min, n)
      total += n
    }
  }
  console.log(`  solo ${subject.padEnd(7)}: ${(total / (grades.length * 15)).toFixed(1)} bloques/hoja (mín ${min})`)
  if (min === 0) { console.log('    ⚠ puede salir una hoja vacía'); problems++ }
}

/* ==================== tirada completa sin repetir ==================== */
console.log('\n=== Una tirada no repite nada =========================')
for (const pack of PACKS) {
  let dupTypes = 0, dupCheckIn = 0, runs = 0, pages = 0, blocks = 0, floor = 0
  // Un pack temático solo puede tirar de sus asignaturas, así que su
  // mínimo inevitable de repeticiones es mayor.
  const theme = pack.quota ? Object.keys(pack.quota) : null
  const available = new Set(
    [2, 4].flatMap((g) =>
      typesForGrade(g as Grade)
        .filter((t) => !theme || theme.includes(t.subject))
        .map((t) => t.id),
    ),
  ).size
  for (let d = 0; d < 40; d++) {
    // Dos hermanos, como en casa: comparten el registro de lo ya usado.
    const taken = new Set<string>()
    const day = [2, 4].flatMap((grade) =>
      planDay({ grade: grade as Grade, pack: pack.id, taken, seed: `run${pack.id}-${d}-${grade}` }),
    )
    runs++
    pages += day.length
    const types = day.flatMap((s) => s.exercises.map((e) => e.typeId))
    const qs = day.map((s) => s.checkIn.question)
    blocks += types.length
    // Con más bloques que tipos, repetir es aritmética, no un defecto.
    floor += Math.max(0, types.length - available)
    dupTypes += types.length - new Set(types).size
    dupCheckIn += qs.length - new Set(qs).size
  }
  const label = `${pack.label} (${(pages / runs).toFixed(0)} pág.)`.padEnd(26)
  console.log(
    `  ${label} ${(blocks / pages).toFixed(1)} bloques/hoja · repetidos ` +
      `${(dupTypes / runs).toFixed(1)}/tirada (inevitables ${(floor / runs).toFixed(1)}) · ` +
      `cierres repetidos: ${(dupCheckIn / runs).toFixed(2)}`,
  )
  if (dupCheckIn > 0) { console.log('    ⚠ se repite el bloque de cierre'); problems++ }
  if (dupTypes > floor * 1.15 + runs) {
    console.log('    ⚠ se repite bastante más de lo inevitable'); problems++
  }
}

/* ===================== los packs temáticos cumplen ==================== */
console.log('\n=== Packs temáticos ===================================')
for (const pack of PACKS.filter((p) => p.quota)) {
  const want = Object.keys(pack.quota!)
  let inTheme = 0, total = 0
  for (const grade of grades) {
    for (let d = 0; d < 30; d++) {
      for (const sheet of planDay({ grade, pack: pack.id, seed: `q${pack.id}-${grade}-${d}` })) {
        for (const e of sheet.exercises) {
          total++
          if (want.includes(e.subject)) inTheme++
        }
      }
    }
  }
  const pct = (inTheme / total) * 100
  console.log(`  ${pack.label.padEnd(18)} ${pct.toFixed(0)}% de bloques en ${want.join('/')}`)
  if (pct < 95) { console.log('    ⚠ se cuela demasiado de otras asignaturas'); problems++ }
}

/* ====================== banco de lecturas ====================== */
console.log('\n=== Banco de lecturas =================================')
for (const cycle of [1, 2, 3] as Cycle[]) {
  const bank = readings.filter((r) => r.cycle === cycle)
  const words = bank.map((r) => r.text.split(/\s+/).length)
  const kinds = new Set(bank.map((r) => r.kind))
  console.log(
    `  ciclo ${cycle}: ${bank.length} textos · ${Math.min(...words)}-${Math.max(...words)} ` +
      `palabras · ${kinds.size} tipologías`,
  )
  if (kinds.size < 6) {
    console.log('    ⚠ poca variedad de tipología textual'); problems++
  }
}

// ¿Sale cada texto? ¿Y cada cuántas hojas se repite uno?
for (const grade of grades) {
  const bank = readings.filter((r) => r.cycle === (grade <= 2 ? 1 : grade <= 4 ? 2 : 3))
  const vistos = new Set<string>()
  let lecturas = 0
  let history: string[][] = []
  const DAYS_LONG = 400
  for (let d = 0; d < DAYS_LONG; d++) {
    const { exercises } = planSheet({ grade, seed: `lect-${grade}-${d}`, history })
    for (const e of exercises) {
      if (e.typeId === 'lengua.lectura') {
        lecturas++
        vistos.add(e.title)
      }
    }
    history = [exercises.map((e) => e.typeId), ...history].slice(0, 5)
  }
  const cadaCuanto = (DAYS_LONG / lecturas) * bank.length
  console.log(
    `  ${grade}º: sale una lectura cada ${(DAYS_LONG / lecturas).toFixed(1)} hojas · ` +
      `${vistos.size}/${bank.length} textos usados · un texto se repite cada ~${cadaCuanto.toFixed(0)} hojas`,
  )
  if (vistos.size < bank.length) {
    console.log(`    ⚠ hay textos que no salen nunca`); problems++
  }
}

console.log(problems ? `\n${problems} aviso(s).` : '\nTodo en orden.')
