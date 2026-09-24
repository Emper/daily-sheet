import { SHEET } from './layout'

export interface Placement {
  row: number
  col: number
}

/**
 * Empaquetado 2D de la rejilla de la hoja.
 *
 * Antes el presupuesto era de area ("me quedan 12 celdas"), y eso miente:
 * un bloque de 1 columna y 7 filas no cabe en 12 celdas repartidas como
 * 6 filas sueltas en dos columnas. CSS lo colocaba igual, le daba filas
 * implicitas de alto cero y el bloque salia mas corto de lo declarado,
 * recortando el contenido sin avisar.
 *
 * Aqui se decide la posicion exacta de cada bloque y la hoja se pinta con
 * coordenadas explicitas, asi que lo que cabe es exactamente lo que se ve.
 */
export class Packer {
  private cells: boolean[][]

  constructor(
    private rows: number = SHEET.ROWS,
    private cols: number = SHEET.COLS,
  ) {
    this.cells = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false))
  }

  /** Reserva las ultimas `n` filas completas (el check-in vive ahi). */
  reserveBottom(n: number): void {
    for (let r = this.rows - n; r < this.rows; r++) this.cells[r].fill(true)
  }

  private fits(row: number, col: number, w: number, h: number): boolean {
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) if (this.cells[r][c]) return false
    }
    return true
  }

  /** Primer hueco válido de arriba a abajo y de izquierda a derecha. */
  place(w: number, h: number): Placement | null {
    if (h > this.rows || w > this.cols) return null
    for (let row = 0; row <= this.rows - h; row++) {
      for (let col = 0; col <= this.cols - w; col++) {
        if (!this.fits(row, col, w, h)) continue
        for (let r = row; r < row + h; r++) {
          for (let c = col; c < col + w; c++) this.cells[r][c] = true
        }
        return { row, col }
      }
    }
    return null
  }

  /** ¿Está libre la fila `row` en las columnas [col, col+w)? */
  rowFreeAt(row: number, col: number, w: number): boolean {
    if (row < 0 || row >= this.rows) return false
    for (let c = col; c < col + w; c++) if (this.cells[row][c]) return false
    return true
  }

  fillRow(row: number, col: number, w: number): void {
    for (let c = col; c < col + w; c++) this.cells[row][c] = true
  }

  get freeCells(): number {
    return this.cells.flat().filter((x) => !x).length
  }

  /** Última fila con algo puesto, -1 si la rejilla está vacía. */
  lastUsedRow(upTo: number): number {
    for (let r = Math.min(upTo, this.rows) - 1; r >= 0; r--) {
      if (this.cells[r].some(Boolean)) return r
    }
    return -1
  }
}
