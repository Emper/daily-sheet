import { useEffect, useMemo, useRef, useState } from 'react'
import { planDay } from '../core/composer'
import { BUDGET } from '../core/layout'
import { PACKS, packById } from '../core/packs'
import { subjectsWithTypes } from '../core/registry'
import { loadPrefs, newChild, pushHistory, savePrefs, type Prefs } from '../core/storage'
import { LEVELS, SUBJECTS, adjustGrade, type Child, type Grade, type Level, type Subject } from '../core/types'
import { Sheet } from '../print/Sheet'
import '../exercises' // registra todos los tipos de ejercicio

const GRADES: Grade[] = [1, 2, 3, 4, 5, 6]
const todayIso = () => new Date().toISOString().slice(0, 10)
const LONG_DATE = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

export default function App() {
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs)
  // La hoja es siempre la de hoy: la fecha se fija al abrir la app y se
  // imprime en la cabecera, pero no se elige.
  const [dateIso] = useState(todayIso)
  const [salts, setSalts] = useState<Record<string, number>>({})
  const [debug, setDebug] = useState(false)

  // El historial se lee por referencia: al anotar una hoja impresa no
  // queremos que se regeneren las hojas que el usuario está viendo.
  const historyRef = useRef(prefs.history)

  const setPrefs = (next: Prefs) => {
    historyRef.current = next.history
    setPrefsState(next)
    savePrefs(next)
  }

  const { children, pack: packId, subjects } = prefs
  const pack = packById(packId)
  // Lista vacía = todas. Así el filtro se adapta solo según crece el catálogo.
  const available = useMemo(subjectsWithTypes, [])
  const active = subjects.length ? subjects : available
  const date = useMemo(() => new Date(`${dateIso}T12:00:00`), [dateIso])

  // El título es el nombre por defecto del PDF al "Guardar como PDF",
  // así que lleva la fecha: si no, todos los ficheros se llaman igual.
  useEffect(() => {
    document.title = `Hoja diaria ${dateIso}`
  }, [dateIso])

  const plans = useMemo(() => {
    // Un único registro para toda la tirada: ni los tipos de ejercicio ni
    // el contenido concreto se repiten entre hojas ni entre hermanos.
    const taken = new Set<string>()
    return children.map((child) => ({
      child,
      sheets: planDay({
        grade: child.grade,
        level: child.level,
        pack: packId,
        subjects,
        taken,
        seed: `${dateIso}|${child.id}|${salts[child.id] ?? 0}`,
        history: historyRef.current[child.id] ?? [],
      }),
    }))
  }, [children, dateIso, salts, packId, subjects])

  const updateChild = (id: string, patch: Partial<Child>) =>
    setPrefs({ ...prefs, children: children.map((c) => (c.id === id ? { ...c, ...patch } : c)) })

  const removeChild = (id: string) =>
    setPrefs({ ...prefs, children: children.filter((c) => c.id !== id) })

  const reroll = (id: string) => setSalts((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 }))

  const rerollAll = () =>
    setSalts((s) => Object.fromEntries(children.map((c) => [c.id, (s[c.id] ?? 0) + 1])))

  const toggleSubject = (s: Subject) => {
    const next = active.includes(s) ? active.filter((x) => x !== s) : [...active, s]
    if (!next.length) return // nunca dejamos la hoja sin asignaturas
    setPrefs({ ...prefs, subjects: next.length === available.length ? [] : next })
  }

  const print = () => {
    // Una hoja cuenta como "gastada" cuando se imprime, no cuando se ve.
    let next = prefs
    for (const { child, sheets } of plans) {
      for (const sheet of sheets) {
        next = pushHistory(next, child.id, sheet.exercises.map((e) => e.typeId))
      }
    }
    setPrefs(next)
    window.print()
  }

  return (
    <div className="app">
      <aside className="controls">
        <div>
          <h1 className="controls__title">Hoja diaria</h1>
          <p className="controls__date">{LONG_DATE.format(date)}</p>
        </div>

        <label className="field">
          <span>Sesión de hoy</span>
          <select value={packId} onChange={(e) => setPrefs({ ...prefs, pack: e.target.value })}>
            {PACKS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <small className="field__hint">{pack.hint}</small>
        </label>

        <div className="kids">
          {children.map((c) => (
            <div key={c.id} className="kid">
              <div className="kid__top">
                <input
                  className="kid__name"
                  value={c.name}
                  onChange={(e) => updateChild(c.id, { name: e.target.value })}
                  aria-label="Nombre"
                />
                <button
                  onClick={() => removeChild(c.id)}
                  title="Quitar"
                  disabled={children.length === 1}
                >
                  ✕
                </button>
              </div>
              <div className="kid__row">
                <select
                  value={c.grade}
                  onChange={(e) => updateChild(c.id, { grade: Number(e.target.value) as Grade })}
                  aria-label="Curso"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}º Primaria
                    </option>
                  ))}
                </select>
                <select
                  value={c.level}
                  onChange={(e) => updateChild(c.id, { level: Number(e.target.value) as Level })}
                  aria-label="Nivel"
                  title="Ajusta la dificultad sin cambiar el curso impreso"
                >
                  {LEVELS.map((l) => (
                    <option
                      key={l.value}
                      value={l.value}
                      /* En 1º "fácil" y en 6º "reto" no tienen a dónde ir. */
                      disabled={adjustGrade(c.grade, l.value) === c.grade && l.value !== 0}
                    >
                      {l.label}
                    </option>
                  ))}
                </select>
                <button onClick={() => reroll(c.id)} title="Generar otra hoja para este niño">
                  ↻
                </button>
              </div>
            </div>
          ))}
          <button className="ghost" onClick={() => setPrefs({ ...prefs, children: [...children, newChild()] })}>
            + Añadir niño
          </button>
        </div>

        <button className="primary" onClick={print}>
          Imprimir / Guardar PDF
        </button>
        <button className="secondary" onClick={rerollAll}>
          ↻ Regenerar la hoja de hoy
        </button>

        <details className="adv">
          <summary>Ajustes</summary>

          <p className="adv__label">Asignaturas</p>
          <div className="adv__subjects">
            {available.map((s) => {
              const on = active.includes(s)
              return (
                <label key={s} className="check">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={on && active.length === 1}
                    onChange={() => toggleSubject(s)}
                  />
                  <span style={{ color: SUBJECTS[s].color }}>{SUBJECTS[s].label}</span>
                </label>
              )
            })}
          </div>

          <label className="check adv__spaced">
            <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
            <span>Ver composición</span>
          </label>

          {debug && (
            <ul className="debug">
              {plans.map(({ child, sheets }) =>
                sheets.map((plan, i) => (
                  <li key={`${child.id}-${i}`}>
                    <strong>{child.name}</strong>
                    {sheets.length > 1 && ` (${i + 1}/${sheets.length})`} · receta{' '}
                    <em>{plan.recipe}</em> · {plan.usedCells}/{BUDGET} celdas
                    <ol>
                      {plan.exercises.map((e, j) => (
                        <li key={j}>
                          {e.typeId}{' '}
                          <span className="debug__dim">
                            ({e.cols}×{e.rows} @ {e.row},{e.col})
                          </span>
                        </li>
                      ))}
                    </ol>
                  </li>
                )),
              )}
            </ul>
          )}
        </details>

        <p className="tip">
          Al imprimir, elige <strong>A4</strong>, márgenes <strong>predeterminados</strong> y
          desactiva encabezados y pies del navegador.
        </p>
      </aside>

      <main className="preview">
        {plans.map(({ child, sheets }) =>
          sheets.map((plan, i) => (
            <Sheet
              key={`${child.id}-${i}`}
              child={child}
              plan={plan}
              date={date}
              index={sheets.length > 1 ? { n: i + 1, of: sheets.length } : undefined}
            />
          )),
        )}
      </main>
    </div>
  )
}
