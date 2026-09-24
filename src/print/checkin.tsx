import type { ReactNode } from 'react'
import { pickFresh, type Taken } from '../core/pick'
import type { Rng } from '../core/rng'
import { CHECKIN_ROWS } from '../core/layout'
import type { Cycle } from '../core/types'

/**
 * El bloque de cierre de la hoja. No es un ejercicio: no hay respuesta
 * correcta. Es un termometro del dia que el nino colorea, y una excusa
 * para que en casa se hable de algo que si no no se pregunta.
 *
 * Todas las escalas son de trazo, sin relleno: se colorean y gastan
 * practicamente nada de tinta.
 */
export type Scale = 'faces5' | 'faces3' | 'stars' | 'energy' | 'scale10' | 'yesno'

interface Prompt {
  q: string
  scale: Scale
  /** Anade un renglon para escribir. */
  line?: boolean
}

const PROMPTS: Record<Cycle, Prompt[]> = {
  1: [
    { q: '¿Cómo te has sentido hoy en clase?', scale: 'faces3' },
    { q: '¿Qué tal te lo has pasado en el recreo?', scale: 'faces3' },
    { q: '¿Cuánta energía te queda ahora mismo?', scale: 'energy' },
    { q: '¿Has ayudado hoy a alguien?', scale: 'yesno' },
    { q: '¿Qué tal has trabajado hoy?', scale: 'stars' },
    { q: '¿Has aprendido algo nuevo hoy?', scale: 'yesno' },
    { q: '¿Has estado tranquilo o nervioso?', scale: 'faces3' },
    { q: '¿Te has reído mucho hoy?', scale: 'faces3' },
    { q: '¿Te ha costado mucho esta hoja?', scale: 'faces3' },
    { q: '¿Cómo te has portado hoy en el cole?', scale: 'stars' },
  ],
  2: [
    { q: '¿Cómo te has sentido hoy en el cole?', scale: 'faces5' },
    { q: '¿Qué tal te has concentrado en clase?', scale: 'stars' },
    { q: '¿Has tenido algún problema hoy?', scale: 'yesno', line: true },
    { q: '¿Cuánto cansancio tienes ahora mismo?', scale: 'energy' },
    { q: '¿Cómo te has llevado hoy con tus compañeros?', scale: 'faces5' },
    { q: '¿Estás contento con lo que has hecho hoy?', scale: 'stars' },
    { q: '¿Hubo algo hoy que te resultara difícil?', scale: 'yesno', line: true },
    { q: '¿Qué tal te has sentido al hacer esta hoja?', scale: 'faces5' },
    { q: 'Cuenta en una línea lo mejor del día.', scale: 'faces3', line: true },
    { q: '¿Has preguntado algo en clase hoy?', scale: 'yesno' },
  ],
  3: [
    { q: 'Del 1 al 10, ¿cómo ha ido el día?', scale: 'scale10' },
    { q: '¿Cuánto te has esforzado hoy?', scale: 'stars' },
    { q: '¿Ha habido algo que te haya preocupado?', scale: 'yesno', line: true },
    { q: '¿Qué tal andas de energía?', scale: 'energy' },
    { q: '¿Cómo te has sentido hoy con tus compañeros?', scale: 'faces5' },
    { q: 'Del 1 al 10, ¿cuánto has disfrutado el día?', scale: 'scale10' },
    { q: '¿Hay algo que te gustaría que mañana fuera distinto?', scale: 'yesno', line: true },
    { q: '¿Qué tal has gestionado hoy los nervios o el enfado?', scale: 'faces5' },
    { q: 'Escribe una cosa que hayas aprendido hoy.', scale: 'stars', line: true },
    { q: '¿Te has sentido escuchado hoy?', scale: 'faces5' },
  ],
}

/* ------------------------------------------------------------ escalas SVG */

const MOUTHS = [
  'M11 29 Q20 21 29 29', // triste
  'M12 28 Q20 24 28 28',
  'M12 26 L28 26', // neutra
  'M12 25 Q20 29 28 25',
  'M11 24 Q20 32 29 24', // contenta
]

const Face = ({ level }: { level: number }) => (
  <svg className="cin__glyph" viewBox="0 0 40 40" role="img" aria-hidden>
    <circle cx="20" cy="20" r="17" className="cin__stroke" />
    <circle cx="14" cy="15" r="1.7" className="cin__dot" />
    <circle cx="26" cy="15" r="1.7" className="cin__dot" />
    <path d={MOUTHS[level]} className="cin__stroke" />
  </svg>
)

const Star = () => (
  <svg className="cin__glyph" viewBox="0 0 40 40" role="img" aria-hidden>
    <path
      d="M20 3 L25.3 14.8 L38 16.3 L28.6 25.1 L31.1 37.7 L20 31.4 L8.9 37.7 L11.4 25.1 L2 16.3 L14.7 14.8 Z"
      className="cin__stroke"
    />
  </svg>
)

const Battery = () => (
  <svg className="cin__battery" viewBox="0 0 120 34" role="img" aria-hidden>
    <rect x="1.5" y="1.5" width="108" height="31" rx="4" className="cin__stroke" />
    <rect x="112" y="11" width="6.5" height="12" rx="2" className="cin__stroke" />
    {[1, 2, 3, 4].map((i) => (
      <line key={i} x1={1.5 + i * 21.6} y1="1.5" x2={1.5 + i * 21.6} y2="32.5" className="cin__stroke" />
    ))}
  </svg>
)

function renderScale(scale: Scale): ReactNode {
  switch (scale) {
    case 'faces5':
      return (
        <div className="cin__row">
          {[0, 1, 2, 3, 4].map((l) => (
            <Face key={l} level={l} />
          ))}
        </div>
      )
    case 'faces3':
      return (
        <div className="cin__row">
          {[0, 2, 4].map((l) => (
            <Face key={l} level={l} />
          ))}
        </div>
      )
    case 'stars':
      return (
        <div className="cin__row">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} />
          ))}
        </div>
      )
    case 'energy':
      return (
        <div className="cin__row cin__row--energy">
          <span className="cin__end">vacío</span>
          <Battery />
          <span className="cin__end">lleno</span>
        </div>
      )
    case 'scale10':
      return (
        <div className="cin__row cin__row--scale">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="cin__num">
              {i + 1}
            </span>
          ))}
        </div>
      )
    case 'yesno':
      return (
        <div className="cin__row cin__row--yesno">
          <span className="cin__choice">
            <Face level={4} /> Sí
          </span>
          <span className="cin__choice">
            <Face level={0} /> No
          </span>
        </div>
      )
  }
}

export interface CheckIn {
  /** La pregunta elegida. Sirve para depurar y para auditar repeticiones. */
  question: string
  rows: number
  body: ReactNode
}

export function makeCheckIn(cycle: Cycle, rng: Rng, taken: Taken): CheckIn {
  const p = pickFresh(rng, PROMPTS[cycle], taken, (x) => `checkin:${x.q}`)
  return {
    question: p.q,
    rows: p.line ? CHECKIN_ROWS.withLine : CHECKIN_ROWS.plain,
    body: (
      <div className="cin">
        <p className="cin__q">{p.q}</p>
        {renderScale(p.scale)}
        {p.line && <div className="cin__line" />}
      </div>
    ),
  }
}
