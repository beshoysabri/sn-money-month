import { monthTitle } from '../lib/format'
import { chipsFor, jumpTo } from '../lib/navigation'
import { needsAttention } from '../lib/report/insights'
import type { Report, SectionKey } from '../lib/report/types'
import { Eye, EyeOff } from './icons'
import { About, ExtraSections } from './sections/About'
import { Freedom, Weeks, Worth } from './sections/Ahead'
import { Largest, SharedCosts, Subscriptions } from './sections/Lists'
import { Budgets, Spending } from './sections/Money'
import { Brief, MonthCard, NeedsAttention } from './sections/Month'

export function Header({
  report,
  hidden,
  onHidden,
  textView,
  onTextView,
}: {
  report: Report
  hidden: boolean
  onHidden: () => void
  textView: boolean
  onTextView: () => void
}) {
  const waiting = report.quality?.waiting ?? 0
  return (
    <header className="bar">
      <div className="inner">
        <div className="bar-top">
          <div className="bar-title">
            <h1 className="month-title">{monthTitle(report.month)}</h1>
            <div className="status">
              <span>{report.status === 'draft' ? 'Draft report' : report.status === 'final' ? 'Final report' : 'Finance report'}</span>
              {waiting > 0 && (
                <button type="button" className="pill warn" onClick={() => jumpTo('about')}>
                  {waiting} to review
                </button>
              )}
            </div>
          </div>
          <div className="tools">
            <button type="button" className="tool" aria-pressed={hidden} aria-label={hidden ? 'Show amounts' : 'Hide amounts'} onClick={onHidden}>
              {hidden ? <EyeOff /> : <Eye />}
            </button>
            <button type="button" className="tool" aria-pressed={textView} onClick={onTextView}>
              Text
            </button>
          </div>
        </div>
        {!textView && (
          <nav className="chips" aria-label="Sections">
            {chipsFor(report).map((c) => (
              <button key={c.id} type="button" className="chip" onClick={() => jumpTo(c.id)}>
                {c.label}
              </button>
            ))}
          </nav>
        )}
      </div>
      {hidden && <div className="hidden-banner">Amounts hidden · percentages still show</div>}
    </header>
  )
}

function notesBySection(report: Report): Partial<Record<SectionKey, string>> {
  const notes: Partial<Record<SectionKey, string>> = {}
  for (const step of report.commentary?.steps ?? []) {
    if (!step.section) continue
    const text = step.text.charAt(0).toUpperCase() + step.text.slice(1)
    notes[step.section] = notes[step.section] ? `${notes[step.section]} ${text}` : text
  }
  return notes
}

export function ReportView({ report }: { report: Report }) {
  const notes = notesBySection(report)
  return (
    <div className="inner page">
      <MonthCard report={report} />
      <NeedsAttention rows={needsAttention(report)} onJump={jumpTo} />
      {report.commentary && <Brief commentary={report.commentary} />}
      {report.categories.length > 0 && <Spending report={report} note={notes.spending} />}
      {report.present.includes('budgets') && !report.extra.some((x) => /^budgets$/i.test(x.heading)) && (
        <Budgets report={report} note={notes.budgets} />
      )}
      {report.forecast.length > 0 && <Weeks report={report} note={notes.forecast} />}
      {report.netWorth && <Worth report={report} note={notes.worth} />}
      {report.freedom && <Freedom report={report} note={notes.freedom} />}
      {report.subscriptions && <Subscriptions report={report} note={notes.subscriptions} />}
      {report.shared && <SharedCosts report={report} note={notes.shared} />}
      {report.largest.length > 0 && <Largest report={report} note={notes.largest} />}
      <ExtraSections report={report} />
      <About report={report} />
    </div>
  )
}
