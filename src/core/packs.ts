/**
 * Packs: la forma de la sesión de hoy.
 *
 * Por defecto la herramienta decide sola (`variado`). Los demás packs
 * existen para los días en que sí quieres mandar tú: apretar en mates,
 * salir del paso en ocho minutos, o aprovechar un sábado.
 */
import type { Subject } from './types'

export interface Pack {
  id: string
  label: string
  hint: string
  /**
   * Reparto propio por asignatura. Manda sobre `recipes`: un pack temático
   * tiene que poder ser más estricto de lo que permite cualquier receta.
   */
  quota?: Partial<Record<Subject, number>>
  /** Hojas por niño. Varias hojas se planifican juntas, sin repetirse entre sí. */
  sheets: number
  /** Ids de recetas permitidas. Vacío = todas. */
  recipes?: readonly string[]
  /** Fracción de la hoja que se llena. 1 = hoja entera. */
  fill?: number
  maxBlocks?: number
  /**
   * Alto máximo de un bloque. En media hoja, una comprensión lectora se
   * come el sitio entero y deja una hoja de un solo ejercicio.
   */
  maxBlockRows?: number
}

export const PACKS: readonly Pack[] = [
  {
    id: 'variado',
    label: 'Variado',
    hint: 'Una hoja equilibrada. Decide la herramienta.',
    sheets: 1,
  },
  {
    id: 'mates',
    label: 'Repaso de mates',
    hint: 'Solo números: cálculo, medida, problemas y lógica.',
    sheets: 1,
    quota: { mates: 5, logica: 1 },
  },
  {
    id: 'letras',
    label: 'Letras y lenguas',
    hint: 'Solo lengua e inglés.',
    sheets: 1,
    quota: { lengua: 3, ingles: 3 },
  },
  {
    id: 'expres',
    label: 'Exprés',
    hint: 'Media hoja, unos 8 minutos.',
    sheets: 1,
    fill: 0.62,
    maxBlocks: 4,
    maxBlockRows: 7,
  },
  {
    id: 'finde',
    label: 'Fin de semana',
    hint: 'Dos hojas seguidas, sin repetirse entre ellas.',
    sheets: 2,
  },
  {
    id: 'maraton',
    label: 'Maratón',
    hint: 'Tres hojas. Hoy hay tiempo.',
    sheets: 3,
  },
]

export const packById = (id: string): Pack => PACKS.find((p) => p.id === id) ?? PACKS[0]
