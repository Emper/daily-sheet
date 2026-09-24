import type { ReactNode } from 'react'
import type { Rng } from './rng'
import type { Taken } from './pick'

export type Grade = 1 | 2 | 3 | 4 | 5 | 6
/** Ciclo LOMLOE: 1 = 1o-2o, 2 = 3o-4o, 3 = 5o-6o */
export type Cycle = 1 | 2 | 3

export const cycleOf = (grade: Grade): Cycle => (grade <= 2 ? 1 : grade <= 4 ? 2 : 3)

export type Subject = 'mates' | 'lengua' | 'ingles' | 'logica' | 'entorno'

/**
 * El "formato" es como se ve y como se resuelve el ejercicio, no de que
 * asignatura es. El compositor lo usa para que no salgan cinco bloques
 * distintos que por dentro son todos "rellena el hueco".
 */
export type Format =
  | 'calculo'   // operaciones, columnas
  | 'tabla'     // rejilla que se completa
  | 'huecos'    // frases o palabras incompletas
  | 'texto'     // leer y responder
  | 'dibujo'    // trazar, dibujar, unir
  | 'copia'     // caligrafia / copiado
  | 'logica'    // series, acertijos, razonamiento

export interface SubjectMeta {
  label: string
  color: string
}

export const SUBJECTS: Record<Subject, SubjectMeta> = {
  mates: { label: 'Matemáticas', color: '#2563eb' },
  lengua: { label: 'Lengua', color: '#d97706' },
  ingles: { label: 'English', color: '#16a34a' },
  logica: { label: 'Lógica', color: '#7c3aed' },
  entorno: { label: 'Entorno', color: '#0891b2' },
}

/** Ajuste fino de dificultad sin tocar el curso que sale impreso. */
export type Level = -1 | 0 | 1

export const LEVELS: ReadonlyArray<{ value: Level; label: string }> = [
  { value: -1, label: 'Fácil' },
  { value: 0, label: 'Normal' },
  { value: 1, label: 'Reto' },
]

export const adjustGrade = (grade: Grade, level: Level): Grade =>
  Math.min(6, Math.max(1, grade + level)) as Grade

export interface GenContext {
  /** Curso ya ajustado por el nivel elegido: calibra la dificultad. */
  grade: Grade
  /**
   * Ciclo del curso REAL. Manda en todo lo que ocupa sitio: tipografía,
   * alto de renglón y `rowsFor`. Si esto siguiera al nivel, un niño de 2º
   * en modo "reto" recibiría bloques calibrados para letra de 6º y se le
   * saldría el contenido de la caja.
   */
  cycle: Cycle
  /** Ciclo del curso ajustado: manda en qué se coge del banco de contenido. */
  contentCycle: Cycle
  rng: Rng
  /**
   * Contenido ya gastado en esta tirada. Los generadores que tiran de un
   * banco deben elegir con `pickFresh` para no repetirse entre hojas.
   */
  taken: Taken
}

/** Un ejercicio ya generado y listo para pintarse en la hoja. */
export interface ExerciseInstance {
  typeId: string
  title: string
  instructions?: string
  subject: Subject
  format: Format
  /** Ancho en columnas de la rejilla de la hoja (la hoja tiene 2). */
  cols: 1 | 2
  /** Alto en filas de la rejilla. Ver ROW_MM en print.css. */
  rows: number
  /**
   * Si el bloque aprovecha el espacio de más. Los de texto y renglones sí
   * (más sitio para escribir); los que llevan un dibujo de tamaño fijo
   * —un sudoku, una esfera de reloj— solo ganarían hueco en blanco.
   */
  flexible?: boolean
  body: ReactNode
}

export interface ExerciseType {
  id: string
  /** Nombre interno, para el historial y la UI de depuracion. */
  name: string
  subject: Subject
  format: Format
  grades: readonly Grade[]
  /**
   * Cuánto se prioriza este tipo frente a los demás de su asignatura.
   * 1 es lo normal. Las operaciones básicas y las tablas son práctica
   * diaria y llevan 2; el laberinto o el sudoku son un premio y llevan
   * menos. Sin esto, con ocho tipos de matemáticas por curso, las sumas
   * salían una de cada cuatro hojas.
   */
  weight?: number
  generate(ctx: GenContext): ExerciseInstance | null
}

export interface Child {
  id: string
  name: string
  grade: Grade
  level: Level
}
