import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NotAReport, TextView, Waiting } from './components/Notes'
import { Header, ReportView } from './components/ReportView'
import { PrivacyContext } from './lib/privacy'
import { previewLine } from './lib/report/insights'
import { readReport } from './lib/report/read'
import { THEME_EVENT, type BridgeState, type StandardNotesBridge } from './lib/sn/bridge'
import { applyTheme, readTheme } from './lib/theme'

const STANDALONE: BridgeState = { registered: false, note: null, componentData: {}, host: {} }
const noop = () => () => {}

/**
 * Inside Standard Notes the bridge brings the note; outside it (local dev, the
 * README's screenshots) the editor shows a demo report with made-up numbers.
 */
export default function App({ bridge, demo }: { bridge: StandardNotesBridge | null; demo?: string }) {
  const sn = useSyncExternalStore(bridge?.subscribe ?? noop, bridge?.getSnapshot ?? (() => STANDALONE))
  const [localHidden, setLocalHidden] = useState(false)
  const [textView, setTextView] = useState(false)
  const [late, setLate] = useState(false)

  useEffect(() => {
    if (!bridge) return
    const timer = setTimeout(() => setLate(true), 4000)
    return () => clearTimeout(timer)
  }, [bridge])

  useEffect(() => {
    const sync = () => applyTheme(readTheme())
    sync()
    window.addEventListener(THEME_EVENT, sync)
    return () => window.removeEventListener(THEME_EVENT, sync)
  }, [])

  const demoNote = useMemo(() => (demo !== undefined ? { uuid: 'demo', text: demo, locked: true } : null), [demo])
  const note = bridge ? sn.note : demoNote
  const result = useMemo(() => (note ? readReport(note.text) : null), [note])
  const hidden = bridge ? sn.componentData.privacy === true : localHidden
  const toggleHidden = () => (bridge ? bridge.setComponentData({ privacy: !hidden }) : setLocalHidden(!hidden))

  if (!note || !result) return <Waiting late={late} />

  if (result.kind === 'not-report') {
    const usePasted = (text: string) => {
      const pasted = readReport(text)
      if (pasted.kind !== 'report' || !bridge) return false
      return bridge.save(note.uuid, text, previewLine(pasted.report))
    }
    return <NotAReport text={note.text} locked={note.locked || !bridge} onPaste={usePasted} />
  }

  const report = result.report
  return (
    <PrivacyContext.Provider value={hidden}>
      <div className="app">
        <Header report={report} hidden={hidden} onHidden={toggleHidden} textView={textView} onTextView={() => setTextView(!textView)} />
        <main className="scroll" id="scroll">
          {!bridge && <p className="demo-note inner">Demo report · every number here is made up</p>}
          {textView ? (
            <TextView text={note.text} />
          ) : (
            <ErrorBoundary fallback={<TextView text={note.text} error />}>
              <ReportView report={report} />
            </ErrorBoundary>
          )}
        </main>
      </div>
    </PrivacyContext.Provider>
  )
}
