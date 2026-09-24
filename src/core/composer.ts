import { BUDGET, SHEET } from './layout'
import { makeCheckIn, type CheckIn } from '../print/checkin'
import { Packer, type Placement } from './packer'
import type { Taken } from './pick'
import { packById, type Pack } from './packs'
import { createRng, type Rng } from './rng'
import { typesForGrade } from './registry'
import {
  adjustGrade,
  cycleOf,
  type ExerciseInstance,
  type ExerciseType,
  type Format,
  type Grade,
  type Level,
  type Subject,
} from './types'

/**
 * Recetas de hoja. Cada receta dice cuantos bloques de cada asignatura
 * se intentan meter. Sortear entre varias recetas es lo que hace que la
 * hoja del martes no tenga la misma forma que la del lunes, sin que por
 * eso un dia salga toda de matematicas.
 */
interface Recipe {
  id: string
  name: string
  quota: Partial<Record<Subject, number>>
}

const RECIPES: readonly Recipe[] = [
  { id: 'equilibrada', name: 'equilibrada', quota: { mates: 2, lengua: 2, ingles: 1, logica: 1 } },
  { id: 'letras', name: 'letras', quota: { lengua: 3, ingles: 2, mates: 1 } },
  { id: 'numeros', name: 'números', quota: { mates: 3, lengua: 1, ingles: 1, logica: 1 } },
  { id: 'idiomas', name: 'idiomas', quota: { ingles: 3, lengua: 1, mates: 1, logica: 1 } },
  { id: 'mixta', name: 'mixta', quota: { mates: 2, lengua: 2, ingles: 2 } },
  { id: 'logica', name: 'lógica', quota: { logica: 2, mates: 2, lengua: 1, ingles: 1 } },
]

/** Como maximo dos bloques del mismo formato por hoja. */
const MAX_PER_FORMAT = 2
/**
 * Tope duro de bloques. El objetivo son ~15 min de trabajo: en 5o-6o la
 * letra es mas pequena y cabria mas, pero "cabe" no es "conviene".
 */
const MAX_BLOCKS = 8
/** Empujon a los formatos que aun no han salido, para que la hoja no sea monotona. */
const NEW_FORMAT_BONUS = 0.4
/** Cuantas hojas atras miramos para no repetir el mismo tipo. */
export const HISTORY_DEPTH = 5

export interface PlanInput {
  grade: Grade
  seed: string
  /** Ajuste de dificultad sin cambiar el curso impreso. */
  level?: Level
  /** Id del pack elegido. */
  pack?: string
  /** Asignaturas habilitadas. Vacío o ausente = todas. */
  subjects?: readonly Subject[]
  /** Ids de tipos usados en hojas recientes, la mas reciente primero. */
  history?: string[][]
  /**
   * Registro compartido por toda la tirada. Si se pasa el mismo Set a
   * varias llamadas, las hojas no repiten ni tipos ni contenido entre sí.
   */
  taken?: Taken
}

export type PlacedExercise = ExerciseInstance & Placement

export interface Sheet {
  recipe: string
  exercises: PlacedExercise[]
  checkIn: CheckIn
  /** Fila (0-based) donde se ancla el check-in. */
  checkInRow: number
  usedCells: number
}

/**
 * Penalizacion por recencia: un tipo que salio ayer casi nunca vuelve hoy,
 * uno que salio hace cinco hojas es practicamente libre otra vez.
 */
function recencyPenalty(typeId: string, history: string[][]): number {
  const idx = history.findIndex((sheet) => sheet.includes(typeId))
  if (idx === -1) return 0
  return (HISTORY_DEPTH - idx) / HISTORY_DEPTH
}

interface Ctx {
  grade: Grade
  cycle: ReturnType<typeof cycleOf>
  contentCycle: ReturnType<typeof cycleOf>
  taken: Taken
}

const typeKey = (id: string) => `type:${id}`

/** Genera y, si de verdad cabe en la rejilla, devuelve el bloque ya colocado. */
function tryPlace(
  type: ExerciseType,
  ctx: Ctx,
  rng: Rng,
  packer: Packer,
  maxRows: number,
): PlacedExercise | null {
  const made = type.generate({ ...ctx, rng })
  if (!made) return null
  if (made.rows > maxRows) return null
  const at = packer.place(made.cols, made.rows)
  return at ? { ...made, ...at } : null
}

export function planSheet({
  grade,
  seed,
  level = 0,
  pack: packId,
  subjects,
  history = [],
  taken = new Set<string>(),
}: PlanInput): Sheet {
  const rng = createRng(seed)
  const pack: Pack = packById(packId ?? 'variado')

  // El curso ajustado calibra la dificultad; el ciclo real manda en el
  // tamaño de letra y por tanto en cuánto ocupa cada bloque.
  const effGrade = adjustGrade(grade, level)
  const ctx: Ctx = {
    grade: effGrade,
    cycle: cycleOf(grade),
    contentCycle: cycleOf(effGrade),
    taken,
  }

  // El check-in va siempre, asi que se sortea primero y se descuenta su
  // sitio del presupuesto: nunca compite con los ejercicios por el hueco.
  const checkIn = makeCheckIn(ctx.cycle, rng, taken)

  // Un pack temático trae su propio reparto; si no, se sortea una receta.
  const recipePool = pack.recipes?.length
    ? RECIPES.filter((r) => pack.recipes!.includes(r.id))
    : RECIPES
  const recipe: Recipe = pack.quota
    ? { id: pack.id, name: pack.label.toLowerCase(), quota: pack.quota }
    : rng.pick(recipePool.length ? recipePool : RECIPES)

  const enabled = subjects?.length ? new Set(subjects) : null
  // Un pack temático también acota el relleno: si no, se colaba lengua en
  // mitad de un "repaso de mates" para tapar un hueco.
  const theme = pack.quota ? new Set(Object.keys(pack.quota) as Subject[]) : null
  const byUser = typesForGrade(effGrade).filter((t) => !enabled || enabled.has(t.subject))
  const inTheme = theme ? byUser.filter((t) => theme.has(t.subject)) : byUser
  // Si el usuario ha desactivado justo las asignaturas del pack, manda él.
  const pool = inTheme.length ? inTheme : byUser

  const usableRows = Math.max(checkIn.rows + 5, Math.round(SHEET.ROWS * (pack.fill ?? 1)))
  const maxBlocks = pack.maxBlocks ?? MAX_BLOCKS
  const maxBlockRows = pack.maxBlockRows ?? SHEET.ROWS

  const chosen: PlacedExercise[] = []
  const usedTypes = new Set<string>()
  const formatCount = new Map<Format, number>()
  const packer = new Packer(usableRows)
  packer.reserveBottom(checkIn.rows)

  const canUse = (t: ExerciseType, allowTaken: boolean) =>
    !usedTypes.has(t.id) &&
    (allowTaken || !taken.has(typeKey(t.id))) &&
    (formatCount.get(t.format) ?? 0) < MAX_PER_FORMAT &&
    chosen.length < maxBlocks

  const score = (t: ExerciseType) =>
    rng.next() * (t.weight ?? 1) -
    recencyPenalty(t.id, history) +
    (formatCount.has(t.format) ? 0 : NEW_FORMAT_BONUS)

  const commit = (t: ExerciseType, made: PlacedExercise) => {
    chosen.push(made)
    usedTypes.add(t.id)
    taken.add(typeKey(t.id))
    formatCount.set(t.format, (formatCount.get(t.format) ?? 0) + 1)
  }

  // Orden de asignaturas barajado: si el presupuesto se acaba, no es
  // siempre matematicas la que se queda dentro y logica la que cae.
  const slots: Subject[] = []
  for (const [subject, n] of Object.entries(recipe.quota) as [Subject, number][]) {
    if (enabled && !enabled.has(subject)) continue
    for (let i = 0; i < n; i++) slots.push(subject)
  }

  const runSlots = (allowTaken: boolean) => {
    for (const subject of rng.shuffle(slots)) {
      const candidates = pool
        .filter((t) => t.subject === subject && canUse(t, allowTaken))
        .map((t) => ({ t, s: score(t) }))
        .sort((a, b) => b.s - a.s)

      for (const { t } of candidates) {
        const made = tryPlace(t, ctx, rng, packer, maxBlockRows)
        if (made) {
          commit(t, made)
          break
        }
      }
    }
  }

  // Relleno: si sobra sitio, metemos lo que quepa de cualquier asignatura
  // antes que dejar un hueco en blanco.
  const runFiller = (allowTaken: boolean) => {
    if (packer.freeCells < 5) return
    const fillers = pool
      .filter((t) => canUse(t, allowTaken))
      .map((t) => ({ t, s: score(t) }))
      .sort((a, b) => b.s - a.s)
    for (const { t } of fillers) {
      if (packer.freeCells < 5) break
      if (!canUse(t, allowTaken)) continue
      const made = tryPlace(t, ctx, rng, packer, maxBlockRows)
      if (made) commit(t, made)
    }
  }

  // Primera pasada sin repetir nada de lo ya usado en esta tirada. Si aún
  // queda sitio se repite lo que haga falta: con ~15 tipos y tres hojas por
  // niño el catálogo no da para llenarlas sin repetir ninguno, y media hoja
  // en blanco es peor que un ejercicio repetido.
  runSlots(false)
  runFiller(false)
  if (packer.freeCells >= 5) {
    runSlots(true)
    runFiller(true)
  }

  // Reparto del espacio sobrante. Con el empaquetado a huecos exactos
  // siempre quedaban filas sueltas que ningún bloque podía ocupar, y se
  // veían como un agujero al final de la hoja. Los bloques crecen hacia
  // abajo por turnos: así el sobrante se reparte en vez de acumularse, y
  // el aire de más se usa para escribir.
  const baseRows = new Map(chosen.map((e) => [e, e.rows]))
  const cap = (e: PlacedExercise) => {
    const base = baseRows.get(e) ?? e.rows
    return Math.max(base + 2, Math.round(base * 1.5))
  }
  const grow = (accepts: (e: PlacedExercise) => boolean) => {
    let changed = true
    while (changed) {
      changed = false
      for (const e of chosen) {
        if (!accepts(e) || e.rows >= cap(e)) continue
        if (!packer.rowFreeAt(e.row + e.rows, e.col, e.cols)) continue
        packer.fillRow(e.row + e.rows, e.col, e.cols)
        e.rows++
        changed = true
      }
    }
  }
  // Primero los que ganan algo con el espacio; los de dibujo fijo solo si
  // aún queda hueco, porque en ellos el aire de más es aire y ya está.
  grow((e) => e.flexible !== false)
  grow(() => true)

  // Orden de lectura: la numeración que ve el niño va de arriba abajo y
  // de izquierda a derecha, no en el orden en que los eligió el sorteo.
  chosen.sort((a, b) => a.row - b.row || a.col - b.col)

  // El check-in tenía reservado el pie, pero si los ejercicios no llegan
  // hasta abajo sube a pegarse al último bloque: así el hueco que sobra
  // queda al final de la hoja, como un margen, y no como un agujero.
  const bottom = usableRows - checkIn.rows
  const checkInRow = Math.min(packer.lastUsedRow(bottom) + 1, bottom)

  return {
    recipe: recipe.name,
    exercises: chosen,
    checkIn,
    checkInRow,
    usedCells: BUDGET - packer.freeCells,
  }
}

/**
 * Las hojas de un mismo día se planifican juntas: la segunda recibe los
 * tipos de la primera como historial, así un "fin de semana" no le da al
 * niño dos veces la tabla del 7.
 */
export function planDay(input: PlanInput): Sheet[] {
  const pack = packById(input.pack ?? 'variado')
  const taken = input.taken ?? new Set<string>()
  const out: Sheet[] = []
  let history = input.history ?? []
  for (let i = 0; i < pack.sheets; i++) {
    const sheet = planSheet({ ...input, seed: `${input.seed}#${i}`, history, taken })
    out.push(sheet)
    history = [sheet.exercises.map((e) => e.typeId), ...history].slice(0, HISTORY_DEPTH)
  }
  return out
}
