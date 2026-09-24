import type { ExerciseType, Grade, Subject } from './types'

const types = new Map<string, ExerciseType>()

export function register(...defs: ExerciseType[]): void {
  for (const def of defs) {
    if (types.has(def.id)) throw new Error(`Tipo de ejercicio duplicado: ${def.id}`)
    types.set(def.id, def)
  }
}

export const allTypes = (): ExerciseType[] => [...types.values()]

export const typesForGrade = (grade: Grade): ExerciseType[] =>
  allTypes().filter((t) => t.grades.includes(grade))

/**
 * Asignaturas que de verdad tienen ejercicios. `entorno` existe en el
 * modelo pero aún no tiene contenido: si se ofreciera como filtro, dejarla
 * sola daría una hoja vacía.
 */
export const subjectsWithTypes = (): Subject[] => [...new Set(allTypes().map((t) => t.subject))]
