/** Geometria de la hoja. Cambiar aqui y en print.css a la vez. */
export const SHEET = {
  /** Filas de rejilla disponibles bajo la cabecera. */
  ROWS: 29,
  COLS: 2,
  /** Alto de una fila, en mm. Fila fina = el compositor ajusta mas fino. */
  ROW_MM: 6,
  GAP_MM: 3,
} as const

/** Presupuesto total de celdas de una hoja. */
export const BUDGET = SHEET.ROWS * SHEET.COLS

/** Filas que se reserva el bloque de check-in, anclado al pie. */
export const CHECKIN_ROWS = { plain: 3, withLine: 4 } as const

export const cost = (cols: number, rows: number) => cols * rows
