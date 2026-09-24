import { HISTORY_DEPTH } from './composer'
import type { Child, Grade, Level, Subject } from './types'

const KEY = 'daily-sheet:v1'

export interface Prefs {
  children: Child[]
  /** Pack activo (forma de la sesión de hoy). */
  pack: string
  /** Asignaturas habilitadas. Vacío = todas las que tengan ejercicios. */
  subjects: Subject[]
  /** Historial de tipos por niño: { [childId]: string[][] } */
  history: Record<string, string[][]>
}

const DEFAULT: Prefs = {
  children: [
    { id: 'c1', name: 'Peque', grade: 2, level: 0 },
    { id: 'c2', name: 'Mayor', grade: 4, level: 0 },
  ],
  pack: 'variado',
  subjects: [],
  history: {},
}

/** Rellena lo que falte: las preferencias guardadas pueden ser de una versión anterior. */
function migrate(raw: Partial<Prefs>): Prefs {
  const children = (raw.children?.length ? raw.children : DEFAULT.children).map((c) => ({
    ...c,
    level: (c.level ?? 0) as Level,
  }))
  return {
    children,
    pack: raw.pack ?? DEFAULT.pack,
    subjects: raw.subjects ?? [],
    history: raw.history ?? {},
  }
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? migrate(JSON.parse(raw) as Partial<Prefs>) : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* modo incógnito o cuota llena: la app funciona igual, sin memoria */
  }
}

export function pushHistory(prefs: Prefs, childId: string, typeIds: string[]): Prefs {
  const prev = prefs.history[childId] ?? []
  return {
    ...prefs,
    history: { ...prefs.history, [childId]: [typeIds, ...prev].slice(0, HISTORY_DEPTH) },
  }
}

export const newChild = (): Child => ({
  id: `c${Date.now().toString(36)}`,
  name: 'Nuevo',
  grade: 3 as Grade,
  level: 0,
})
