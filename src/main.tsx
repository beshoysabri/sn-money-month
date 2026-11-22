import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Section titles are set in Source Serif 4, bundled so phones without a good
// serif get it; browsers only download it where the font stack reaches it.
import '@fontsource-variable/source-serif-4'
import './styles.css'
import App from './App.tsx'
import { StandardNotesBridge } from './lib/sn/bridge'
import demo from './sample/demo-report.md?raw'

// The bridge must exist before React mounts: Standard Notes registers the
// editor while the iframe loads, and a late listener misses that message.
const embedded = window.parent !== window
const bridge = embedded ? new StandardNotesBridge(window) : null
if (embedded) document.body.classList.add('sn-embedded')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App bridge={bridge} demo={embedded ? undefined : demo} />
  </StrictMode>,
)
