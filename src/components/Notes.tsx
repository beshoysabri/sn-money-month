import { useState } from 'react'
import { MarkdownView } from './MarkdownView'

/** The note's text exactly as filed. */
export function TextView({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div className="inner page">
      <p className={error ? 'notice warn' : 'small'}>
        {error
          ? "Something in this report couldn't be drawn, so here is its text as filed. Nothing in the note was changed."
          : 'The note’s text, exactly as filed. Money Month never changes it.'}
      </p>
      <pre className="md">{text}</pre>
    </div>
  )
}

export function Waiting({ late }: { late: boolean }) {
  return (
    <div className="app">
      <div className="center small" role="status">
        {late ? 'Waiting for Standard Notes to send the note…' : 'Opening the report…'}
      </div>
    </div>
  )
}

/**
 * A note that isn't a finance report: shown as text, never changed. An empty,
 * unlocked note offers a box to paste a report into.
 */
export function NotAReport({ text, locked, onPaste }: { text: string; locked: boolean; onPaste: (text: string) => boolean }) {
  const [pasted, setPasted] = useState('')
  const [problem, setProblem] = useState('')
  const empty = !text.trim()

  const use = () => {
    if (onPaste(pasted)) setProblem('')
    else setProblem('That text isn’t a finance report. It should start with "# Finance report" and the month, like "# Finance report 2026-10".')
  }

  return (
    <div className="app">
      <main className="scroll">
        <div className="inner page">
          {empty ? (
            <section className="sec first">
              <p className="eyebrow">Money Month</p>
              <h1 className="title">Paste a finance report</h1>
              <p className="lead">
                Copy the text of a report (the <code>finance-report-YYYY-MM.md</code> file from FILES_DB) and paste it here. Money Month saves
                it in this note and shows it as a report.
              </p>
              {locked ? (
                <p className="notice">This note is locked, so nothing can be pasted into it.</p>
              ) : (
                <>
                  <label className="small" htmlFor="paste">
                    Report text
                  </label>
                  <textarea id="paste" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="# Finance report 2026-10" />
                  <button type="button" className="primary" disabled={!pasted.trim()} onClick={use}>
                    Use this report
                  </button>
                  {problem && (
                    <p className="notice warn" role="alert">
                      {problem}
                    </p>
                  )}
                </>
              )}
            </section>
          ) : (
            <section className="sec first">
              <p className="eyebrow">Money Month</p>
              <h1 className="title">This note isn&rsquo;t a finance report</h1>
              <p className="lead">
                Money Month shows notes that start with &ldquo;# Finance report&rdquo; and the month. This note is shown below as text and
                hasn&rsquo;t been changed; switch it back to another note type to edit it.
              </p>
              <div className="plain-note">
                <MarkdownView markdown={text} />
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
