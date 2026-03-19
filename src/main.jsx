import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PatternForge from './PatternForge.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PatternForge />
  </StrictMode>,
)
