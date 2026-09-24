import { useLayoutEffect, useRef, useState } from 'react'
import type { Sheet as SheetPlan } from '../core/composer'
import { SUBJECTS, cycleOf, type Child } from '../core/types'

const DATE_FMT = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function Sheet({
  child,
  plan,
  date,
  index,
}: {
  child: Child
  plan: SheetPlan
  date: Date
  /** Solo cuando el pack genera varias hojas por niño. */
  index?: { n: number; of: number }
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState<string[]>([])

  // Las alturas de los bloques son estimaciones del generador. En vez de
  // fiarnos, medimos lo que ha salido de verdad y avisamos en pantalla
  // (nunca al imprimir) si un bloque se sale de su caja.
  //
  // Los bloques llevan overflow:hidden, asi que scrollHeight no delata
  // nada: el contenido se recorta pero sigue maquetandose en su sitio.
  // Lo que si delata es donde acaba el ultimo hijo respecto a la caja.
  useLayoutEffect(() => {
    const el = gridRef.current
    if (!el) return
    const spills = [...el.querySelectorAll<HTMLElement>('.block')]
      .filter((block) => {
        // 2px ≈ 0,5 mm: por debajo de eso es redondeo de layout, no un
        // recorte que se vea en el papel. Se mira abajo y a la derecha:
        // una rejilla de dos columnas con texto largo se sale de lado.
        const box = block.getBoundingClientRect()
        return [...block.querySelectorAll<HTMLElement>('.block__body *')].some((node) => {
          const r = node.getBoundingClientRect()
          return r.bottom > box.bottom + 2 || r.right > box.right + 2
        })
      })
      .map((block) => block.dataset.type ?? '?')
    setOverflow(spills)
  }, [plan])

  const cycle = cycleOf(child.grade)
  const checkInRow = plan.checkInRow + 1

  return (
    <article className={`sheet sheet--c${cycle}`}>
      <header className="sheet__head">
        <div className="sheet__who">
          <span className="sheet__name">{child.name}</span>
          <span className="sheet__grade">{child.grade}º</span>
        </div>
        <div className="sheet__date">
          {index && <span className="sheet__idx">Hoja {index.n} de {index.of}</span>}
          {DATE_FMT.format(date)}
        </div>
      </header>

      {overflow.length > 0 && (
        <p className="overflow-warning">
          Se sale de su caja: <code>{overflow.join(', ')}</code>. Sube las <code>rows</code> de
          ese tipo o quítale contenido.
        </p>
      )}

      <div className="sheet__grid" ref={gridRef}>
        {plan.exercises.map((ex, i) => (
          <section
            key={`${ex.typeId}-${i}`}
            className="block"
            data-type={ex.typeId}
            style={{
              gridColumn: `${ex.col + 1} / span ${ex.cols}`,
              gridRow: `${ex.row + 1} / span ${ex.rows}`,
              ['--subject' as string]: SUBJECTS[ex.subject].color,
            }}
          >
            <div className="block__head">
              <h2 className="block__title">
                <span className="block__n">{i + 1}</span>
                {ex.title}
              </h2>
              <span className="block__tag">{SUBJECTS[ex.subject].label}</span>
            </div>
            {ex.instructions && <p className="block__inst">{ex.instructions}</p>}
            <div className="block__body">{ex.body}</div>
          </section>
        ))}

        {/* Anclado al pie de la rejilla: el compositor ya le reservó el sitio. */}
        <section
          className="block block--checkin"
          style={{ gridColumn: '1 / -1', gridRow: `${checkInRow} / span ${plan.checkIn.rows}` }}
        >
          {plan.checkIn.body}
        </section>
      </div>
    </article>
  )
}
