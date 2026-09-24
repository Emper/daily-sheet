import { pickFresh } from '../core/pick'
import type { ExerciseType, GenContext, Grade } from '../core/types'
import { Blank, Box, Clock, Lines, pad2, rowsFor } from './ui'

const G: readonly Grade[] = [1, 2, 3, 4, 5, 6]

/* ------------------------------------------------------------------ tablas */

const TABLES_BY_GRADE: Record<Grade, number[]> = {
  1: [2, 5, 10],
  2: [2, 3, 4, 5, 10],
  3: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  4: [3, 4, 6, 7, 8, 9],
  5: [6, 7, 8, 9, 11, 12],
  6: [7, 8, 9, 11, 12, 13],
}

const tablas: ExerciseType = {
  id: 'mates.tablas',
  weight: 2,
  name: 'Tabla de multiplicar',
  subject: 'mates',
  format: 'tabla',
  grades: G,
  generate({ grade, cycle, rng, taken }: GenContext) {
    const table = pickFresh(rng, TABLES_BY_GRADE[grade], taken, (n) => `table:${n}`)
    // A partir de 3o dejamos el hueco a veces en el factor, no siempre en
    // el resultado: obliga a pensar la division sin llamarla division.
    const invertible = grade >= 3
    const items = rng.sample([...Array(10).keys()].map((i) => i + 1), 8).map((n) => {
      const hidden = invertible && rng.bool(0.3) ? 'factor' : 'result'
      return { n, hidden }
    })

    return {
      typeId: tablas.id,
      title: `La tabla del ${table}`,
      instructions: 'Completa los huecos.',
      subject: 'mates',
      format: 'tabla',
      cols: 1,
      rows: rowsFor(cycle, 6),
      body: (
        <div className="grid2">
          {items.map(({ n, hidden }, i) => (
            <div key={i} className="mono-row">
              {hidden === 'factor' ? (
                <>
                  {table} × <Blank ch={3} /> = {table * n}
                </>
              ) : (
                <>
                  {table} × {n} = <Blank ch={4} />
                </>
              )}
            </div>
          ))}
        </div>
      ),
    }
  },
}

/* ------------------------------------------------- operaciones en columna */

interface ColumnOp {
  a: string
  b: string
  op: '+' | '−' | '×'
}

/**
 * Sin separador de millares: en una operación en vertical el niño escribe
 * una cifra por columna, y el punto de los miles rompe esa alineación.
 * La coma decimal sí se mantiene.
 */
const fmt = (n: number, dec = 0) =>
  n.toLocaleString('es-ES', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
    useGrouping: false,
  })

/** Rango de cifras de sumas y restas, por curso. */
const ADD_RANGE: Record<Grade, [number, number]> = {
  1: [10, 99],
  2: [100, 999],
  3: [1000, 9999],
  4: [10000, 99999],
  5: [100000, 999999],
  6: [100000, 999999],
}

function addOp(grade: Grade, rng: GenContext['rng']): ColumnOp {
  const isSub = rng.bool(grade === 1 ? 0.35 : 0.5)
  // En tercer ciclo entran los decimales, que es donde de verdad importa
  // colocar bien las cifras.
  if (grade >= 5 && rng.bool(0.4)) {
    const a = rng.int(5000, 99999) / 100
    const b = isSub ? rng.int(100, Math.round(a * 100) - 100) / 100 : rng.int(500, 50000) / 100
    return { a: fmt(a, 2), b: fmt(b, 2), op: isSub ? '−' : '+' }
  }
  const [lo, hi] = ADD_RANGE[grade]
  const a = rng.int(lo, hi)
  const b = isSub ? rng.int(Math.floor(lo / 2), a - 1) : rng.int(lo, hi)
  return { a: fmt(a), b: fmt(b), op: isSub ? '−' : '+' }
}

/** [rango del multiplicando, rango del multiplicador] */
const MUL_RANGE: Record<number, [[number, number], [number, number]]> = {
  2: [[12, 49], [2, 5]],
  3: [[12, 99], [2, 9]],
  4: [[112, 999], [11, 49]],
  5: [[1112, 9999], [12, 99]],
  6: [[1112, 99999], [112, 999]],
}

function mulOp(grade: Grade, rng: GenContext['rng']): ColumnOp {
  const [[alo, ahi], [blo, bhi]] = MUL_RANGE[Math.min(6, Math.max(2, grade))]
  return { a: fmt(rng.int(alo, ahi)), b: fmt(rng.int(blo, bhi)), op: '×' }
}

const ColumnOpView = ({ op }: { op: ColumnOp }) => (
  <div className="col-op">
    <div className="col-op__row">{op.a}</div>
    <div className="col-op__row col-op__row--last">
      <span className="col-op__sign">{op.op}</span>
      {op.b}
    </div>
    <div className="col-op__space" />
  </div>
)

const sumas: ExerciseType = {
  id: 'mates.sumas',
  weight: 2,
  name: 'Sumas y restas',
  subject: 'mates',
  format: 'calculo',
  grades: G,
  generate({ grade, cycle, rng }: GenContext) {
    const ops = Array.from({ length: 4 }, () => addOp(grade, rng))
    return {
      typeId: sumas.id,
      title: ops.every((o) => o.op === '+') ? 'Sumas' : 'Sumas y restas',
      instructions: 'Resuelve colocando bien las cifras.',
      subject: 'mates',
      format: 'calculo',
      cols: 1,
      rows: rowsFor(cycle, 7),
      body: (
        <div className="grid2 grid2--ops">
          {ops.map((op, i) => (
            <ColumnOpView key={i} op={op} />
          ))}
        </div>
      ),
    }
  },
}

const multiplicar: ExerciseType = {
  id: 'mates.multiplicar',
  weight: 1.6,
  name: 'Multiplicaciones',
  subject: 'mates',
  format: 'calculo',
  // En 2º entra la multiplicación sencilla de dos cifras por una.
  grades: [2, 3, 4, 5, 6],
  generate({ grade, cycle, rng }: GenContext) {
    const ops = Array.from({ length: 4 }, () => mulOp(grade, rng))
    return {
      typeId: multiplicar.id,
      title: 'Multiplicaciones',
      instructions: 'Resuelve colocando bien las cifras.',
      subject: 'mates',
      format: 'calculo',
      cols: 1,
      rows: rowsFor(cycle, 8),
      body: (
        <div className="grid2 grid2--ops">
          {ops.map((op, i) => (
            <ColumnOpView key={i} op={op} />
          ))}
        </div>
      ),
    }
  },
}

/* ---------------------------------------------------------- divisiones */

/** [rango del divisor, rango del cociente] */
const DIV_RANGE: Record<number, [[number, number], [number, number]]> = {
  3: [[2, 9], [11, 99]],
  4: [[2, 9], [101, 999]],
  5: [[11, 99], [101, 999]],
  6: [[11, 999], [101, 999]],
}

/** Caja de división a la española: dividendo, barra, divisor y cociente. */
const DivisionView = ({ n, d }: { n: string; d: string }) => (
  <div className="div-op">
    <div className="div-op__left">
      <div className="div-op__num">{n}</div>
      <div className="div-op__work" />
    </div>
    <div className="div-op__right">
      <div className="div-op__div">{d}</div>
      <div className="div-op__quot" />
    </div>
  </div>
)

const dividir: ExerciseType = {
  id: 'mates.dividir',
  weight: 1.4,
  name: 'Divisiones',
  subject: 'mates',
  format: 'calculo',
  grades: [3, 4, 5, 6],
  generate({ grade, cycle, rng }: GenContext) {
    const [[dlo, dhi], [qlo, qhi]] = DIV_RANGE[Math.min(6, Math.max(3, grade))]
    const ops = Array.from({ length: 2 }, () => {
      const d = rng.int(dlo, dhi)
      const q = rng.int(qlo, qhi)
      // Con resto la mayoría de las veces: la división exacta es la excepción.
      const r = rng.bool(0.65) ? rng.int(1, d - 1) : 0
      return { n: fmt(d * q + r), d: fmt(d) }
    })
    return {
      typeId: dividir.id,
      title: 'Divisiones',
      instructions: grade <= 4 ? 'Divide y escribe el resto.' : 'Divide. Indica cociente y resto.',
      subject: 'mates',
      format: 'calculo',
      cols: 1,
      rows: rowsFor(cycle, 8),
      body: (
        <div className="grid2 grid2--div">
          {ops.map((op, i) => (
            <DivisionView key={i} n={op.n} d={op.d} />
          ))}
        </div>
      ),
    }
  },
}

/* ----------------------------------------------------------------- relojes */

function timeFor(grade: Grade, rng: GenContext['rng']) {
  const h = rng.int(1, 12)
  if (grade <= 2) return { h, m: rng.pick([0, 30]) }
  if (grade <= 4) return { h, m: rng.pick([0, 15, 30, 45]) }
  return { h, m: rng.int(0, 11) * 5 }
}

const relojes: ExerciseType = {
  id: 'mates.relojes',
  name: 'Relojes',
  subject: 'mates',
  format: 'dibujo',
  grades: G,
  generate({ grade, cycle, rng }: GenContext) {
    // Sin horas repetidas dentro del mismo bloque: salían dos relojes
    // pidiendo lo mismo uno al lado del otro.
    const seen = new Set<string>()
    const times: Array<{ h: number; m: number }> = []
    for (let guard = 0; times.length < 4 && guard < 60; guard++) {
      const t = timeFor(grade, rng)
      const key = `${t.h}:${t.m}`
      if (seen.has(key)) continue
      seen.add(key)
      times.push(t)
    }
    const flip = rng.bool() ? 0 : 1
    const items = times.map((t, i) => ({
      ...t,
      // Alternamos los dos sentidos: leer la esfera y representarla.
      hands: i % 2 === flip,
    }))
    return {
      typeId: relojes.id,
      title: '¿Qué hora es?',
      instructions:
        'Si el reloj tiene agujas, escribe la hora debajo. Si está vacío, dibuja las agujas.',
      subject: 'mates',
      format: 'dibujo',
      cols: 2,
      rows: rowsFor(cycle, 6, 3),
      flexible: false,
      body: (
        <div className="clocks">
          {items.map((it, i) => (
            <div key={i} className="clocks__item">
              <Clock h={it.h} m={it.m} hands={it.hands} />
              <div className="clocks__label">
                {it.hands ? <Blank ch={7} /> : `${it.h}:${pad2(it.m)}`}
              </div>
            </div>
          ))}
        </div>
      ),
    }
  },
}

/* ---------------------------------------------------------------- problemas */

const NAMES = ['Lucía', 'Mateo', 'Alma', 'Bruno', 'Vega', 'Dani', 'Nora', 'Iker', 'Sara', 'Hugo']

function problemFor(grade: Grade, rng: GenContext['rng']): string {
  const who = rng.pick(NAMES)
  const other = rng.pick(NAMES.filter((n) => n !== who))
  const r = (min: number, max: number) => rng.int(min, max)

  if (grade <= 2) {
    return rng.pick([
      `${who} tenía ${r(12, 40)} cromos y le regalaron ${r(5, 20)} más. ¿Cuántos tiene ahora?`,
      `En la clase hay ${r(18, 26)} niños. Hoy han faltado ${r(2, 6)}. ¿Cuántos han venido?`,
      `${who} compra ${r(3, 6)} bollos de ${r(2, 5)} € cada uno. ¿Cuánto paga?`,
      `Un paquete trae ${r(6, 10)} galletas. ${who} abre ${r(2, 4)} paquetes. ¿Cuántas galletas hay?`,
    ])
  }
  if (grade <= 4) {
    return rng.pick([
      `${who} ahorra ${r(4, 9)} € cada semana. ¿Cuánto tendrá al cabo de ${r(6, 14)} semanas?`,
      `Un autobús lleva ${r(45, 60)} plazas. Se suben ${r(20, 35)} personas y en la siguiente parada bajan ${r(5, 12)} y suben ${r(8, 18)}. ¿Cuántas van dentro?`,
      `${who} y ${other} reparten ${r(48, 120)} caramelos en partes iguales entre ${r(3, 6)} amigos. ¿Cuántos toca a cada uno y cuántos sobran?`,
      `Una caja pesa ${r(250, 900)} g. ¿Cuánto pesan ${r(4, 9)} cajas? Da la respuesta en kilos y gramos.`,
    ])
  }
  return rng.pick([
    `${who} compra una bici de ${r(180, 420)} € con un descuento del ${rng.pick([10, 15, 20, 25])} %. ¿Cuánto paga?`,
    `Un depósito de ${r(200, 900)} litros está lleno a ${rng.pick(['3/4', '2/5', '5/8'])} de su capacidad. ¿Cuántos litros tiene?`,
    `${who} recorre ${r(12, 45)} km en ${r(40, 120)} minutos en bici. ¿Cuál es su velocidad media en km/h?`,
    `Un rectángulo mide ${r(8, 24)} cm de largo y su perímetro es de ${r(50, 90)} cm. ¿Cuánto mide el lado corto y cuál es su área?`,
    `${who} y ${other} pintan una valla. ${who} pinta ${rng.pick(['2/5', '3/7', '1/3'])} y ${other} pinta ${rng.pick(['1/4', '2/7', '1/5'])}. ¿Qué fracción queda sin pintar?`,
  ])
}

const problemas: ExerciseType = {
  id: 'mates.problemas',
  weight: 1.3,
  name: 'Problema',
  subject: 'mates',
  format: 'texto',
  grades: G,
  generate({ grade, cycle, rng }: GenContext) {
    return {
      typeId: problemas.id,
      title: 'Problema',
      instructions: 'Escribe la operación y la respuesta con una frase completa.',
      subject: 'mates',
      format: 'texto',
      cols: 1,
      rows: rowsFor(cycle, 7),
      body: (
        <>
          <p className="statement">{problemFor(grade, rng)}</p>
          <Lines n={cycle === 1 ? 2 : 3} cycle={cycle} />
        </>
      ),
    }
  },
}

/* ----------------------------------------------------------------- medidas */

const medidas: ExerciseType = {
  id: 'mates.medidas',
  name: 'Unidades de medida',
  subject: 'mates',
  format: 'calculo',
  grades: [2, 3, 4, 5, 6],
  generate({ grade, cycle, rng }: GenContext) {
    const easy: Array<[string, string]> = [
      ['1 m', 'cm'],
      ['2 km', 'm'],
      ['1 kg', 'g'],
      ['3 l', 'ml'],
      ['1 hora', 'minutos'],
      ['1 día', 'horas'],
      ['5 m', 'cm'],
      ['1 €', 'céntimos'],
    ]
    const hard: Array<[string, string]> = [
      ['2,5 km', 'm'],
      ['1.250 g', 'kg'],
      ['0,75 l', 'ml'],
      ['3,2 m', 'mm'],
      ['180 min', 'horas'],
      ['4.500 cm', 'm'],
      ['2 t', 'kg'],
      ['0,4 hl', 'l'],
    ]
    const pool = grade <= 3 ? easy : rng.bool(0.6) ? hard : easy
    // Con la letra de 1er ciclo, "1 hora = ____ minutos" no cabe a dos
    // columnas: se pisaba con la de al lado.
    const single = cycle === 1
    const items = rng.sample(pool, single ? 4 : 6)
    return {
      typeId: medidas.id,
      title: 'Cambia de unidad',
      instructions: 'Completa las equivalencias.',
      subject: 'mates',
      format: 'calculo',
      cols: 1,
      rows: rowsFor(cycle, 6),
      body: (
        <div className={single ? 'grid2 grid2--single' : 'grid2'}>
          {items.map(([from, to], i) => (
            <div key={i} className="mono-row">
              {from} = <Blank ch={6} /> {to}
            </div>
          ))}
        </div>
      ),
    }
  },
}

/* ------------------------------------------------------------- comparacion */

const comparar: ExerciseType = {
  id: 'mates.comparar',
  name: 'Mayor, menor o igual',
  subject: 'mates',
  format: 'tabla',
  grades: [1, 2, 3, 4],
  generate({ grade, cycle, rng }: GenContext) {
    const max = grade <= 2 ? 99 : grade === 3 ? 9999 : 99999
    const items = Array.from({ length: 6 }, () => {
      const a = rng.int(Math.floor(max / 10), max)
      const b = rng.bool(0.25) ? a : rng.int(Math.floor(max / 10), max)
      return [a, b] as const
    })
    return {
      typeId: comparar.id,
      title: '¿Mayor, menor o igual?',
      instructions: 'Escribe >, < o = en cada casilla.',
      subject: 'mates',
      format: 'tabla',
      cols: 1,
      rows: rowsFor(cycle, 6),
      body: (
        <div className="grid2">
          {items.map(([a, b], i) => (
            <div key={i} className="mono-row">
              {a.toLocaleString('es-ES')} <Box mm={8} /> {b.toLocaleString('es-ES')}
            </div>
          ))}
        </div>
      ),
    }
  },
}


/* --------------------------------------------------------------- fracciones */

const DENOMS: Record<Grade, number[]> = {
  1: [2, 4],
  2: [2, 3, 4],
  3: [2, 3, 4, 6],
  4: [2, 3, 4, 5, 6, 8],
  5: [3, 4, 5, 6, 8, 10],
  6: [3, 4, 5, 6, 8, 10, 12],
}

/**
 * Trama diagonal en vez de relleno macizo: se ve igual de claro y gasta
 * una fracción de la tinta. El id tiene que ser único en todo el documento
 * porque en una tirada hay varias hojas a la vez.
 */
const Hatch = ({ id }: { id: string }) => (
  <defs>
    <pattern id={id} width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="2.6" className="frac__hatch" />
    </pattern>
  </defs>
)

function FracBar({ parts, shaded, uid }: { parts: number; shaded: number; uid: string }) {
  const w = 100 / parts
  return (
    <svg className="frac" viewBox="0 0 100 30" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden>
      <Hatch id={uid} />
      {Array.from({ length: parts }, (_, i) => (
        <rect
          key={i}
          x={i * w}
          y={1}
          width={w}
          height={28}
          className="frac__cell"
          fill={i < shaded ? `url(#${uid})` : 'none'}
        />
      ))}
    </svg>
  )
}

function FracPie({ parts, shaded, uid }: { parts: number; shaded: number; uid: string }) {
  const cx = 22, cy = 22, r = 20
  const at = (i: number) => {
    const a = ((i / parts) * 360 - 90) * (Math.PI / 180)
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`
  }
  const large = 1 / parts > 0.5 ? 1 : 0
  return (
    <svg className="frac frac--pie" viewBox="0 0 44 44" role="img" aria-hidden>
      <Hatch id={uid} />
      {Array.from({ length: parts }, (_, i) => (
        <path
          key={i}
          d={`M${cx} ${cy} L${at(i)} A${r} ${r} 0 ${large} 1 ${at(i + 1)} Z`}
          className="frac__cell"
          fill={i < shaded ? `url(#${uid})` : 'none'}
        />
      ))}
    </svg>
  )
}

const fracciones: ExerciseType = {
  id: 'mates.fracciones',
  name: 'Fracciones',
  subject: 'mates',
  format: 'dibujo',
  grades: G,
  generate({ grade, cycle, rng }: GenContext) {
    // Sufijo propio de esta instancia: dos hojas en la misma tirada no
    // pueden compartir el id del patrón.
    const uid = rng.int(0, 1e9).toString(36)
    // Sin repetir fracción dentro del mismo bloque: salían dos veces 1/3.
    const usadas = new Set<string>()
    const items: Array<{ parts: number; shaded: number; write: boolean; pie: boolean; uid: string }> = []
    for (let guard = 0; items.length < 4 && guard < 80; guard++) {
      const parts = rng.pick(DENOMS[grade])
      const shaded = rng.int(1, parts - 1)
      const key = `${shaded}/${parts}`
      if (usadas.has(key)) continue
      usadas.add(key)
      items.push({
        parts,
        shaded,
        // La mitad al revés: se da la fracción y el niño colorea. Pedir lo
        // mismo en los dos sentidos cuesta más y enseña más.
        write: items.length < 2,
        pie: grade >= 4 ? rng.bool(0.5) : false,
        uid: `h${uid}-${items.length}`,
      })
    }

    return {
      typeId: fracciones.id,
      title: 'Fracciones',
      instructions: 'Escribe la fracción coloreada. Donde ya está escrita, coloréala tú.',
      subject: 'mates',
      format: 'dibujo',
      cols: 1,
      rows: rowsFor(cycle, 7, 4),
      body: (
        <div className="fracs">
          {items.map((it, i) => (
            <div key={i} className="fracs__item">
              {it.pie ? (
                <FracPie parts={it.parts} shaded={it.write ? it.shaded : 0} uid={it.uid} />
              ) : (
                <FracBar parts={it.parts} shaded={it.write ? it.shaded : 0} uid={it.uid} />
              )}
              <div className="fracs__label">
                {it.write ? (
                  <span className="fracs__slot" />
                ) : (
                  <span className="frac-num">
                    <span>{it.shaded}</span>
                    <span>{it.parts}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ),
    }
  },
}

/* ------------------------------------------------------------------ dinero */

/** Valores en céntimos, para no arrastrar los errores del coma flotante. */
const PURSE: Record<Grade, number[]> = {
  1: [50, 100, 200],
  2: [10, 20, 50, 100, 200],
  3: [5, 10, 20, 50, 100, 200, 500],
  4: [5, 10, 20, 50, 100, 200, 500, 1000],
  5: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000],
  6: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000],
}

const euros = (cents: number) =>
  (cents / 100).toLocaleString('es-ES', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })

const Piece = ({ c }: { c: number }) =>
  c >= 500 ? (
    <span className="note">{euros(c)} €</span>
  ) : (
    <span className="coin">{c < 100 ? `${c}c` : `${c / 100} €`}</span>
  )

const dinero: ExerciseType = {
  id: 'mates.dinero',
  name: 'Monedas y billetes',
  subject: 'mates',
  format: 'dibujo',
  grades: G,
  generate({ grade, cycle, rng }: GenContext) {
    const purse = PURSE[grade]
    const rows = Array.from({ length: 3 }, (_, i) => {
      // A partir de 3o una de las tres es de vuelta, no de contar.
      if (grade >= 3 && i === 2) {
        const price = rng.int(grade >= 5 ? 250 : 120, grade >= 5 ? 4800 : 900)
        const paid = Math.ceil(price / (grade >= 5 ? 1000 : 500)) * (grade >= 5 ? 1000 : 500)
        return { kind: 'change' as const, price, paid }
      }
      const n = rng.int(3, grade <= 2 ? 4 : 5)
      return {
        kind: 'count' as const,
        pieces: Array.from({ length: n }, () => rng.pick(purse)).sort((a, b) => b - a),
      }
    })

    return {
      typeId: dinero.id,
      title: '¿Cuánto dinero hay?',
      instructions: 'Suma el dinero de cada fila.',
      subject: 'mates',
      format: 'dibujo',
      cols: 1,
      rows: rowsFor(cycle, 7),
      body: (
        <div className="money">
          {rows.map((r, i) =>
            r.kind === 'count' ? (
              <div key={i} className="money__row">
                <span className="money__pieces">
                  {r.pieces.map((c, j) => (
                    <Piece key={j} c={c} />
                  ))}
                </span>
                <span className="money__eq">
                  = <Blank ch={5} /> €
                </span>
              </div>
            ) : (
              <div key={i} className="money__row money__row--text">
                Pagas {euros(r.price)} € con un billete de {euros(r.paid)} €. Te devuelven{' '}
                <Blank ch={5} /> €
              </div>
            ),
          )}
        </div>
      ),
    }
  },
}


export default [
  tablas, sumas, multiplicar, dividir, relojes, problemas,
  medidas, comparar, fracciones, dinero,
]
