import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fuente auto-hospedada (Nunito, OFL 1.1). La maquetación de la hoja está
// calibrada en milímetros contra estas métricas concretas: si dependiera
// de la fuente del sistema, el mismo A4 se cortaría en un Windows o en un
// Android. Solo el subconjunto latino; el resto no hace falta en español.
//
// Se descartó Atkinson Hyperlegible, que es excelente para legibilidad
// pero trae el cero tachado: en una hoja de cálculo de 2º eso despista,
// porque aquí no se escribe así.
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-400-italic.css'
import '@fontsource/nunito/latin-700.css'
import App from './app/App'
import './app/app.css'
import './print/print.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
