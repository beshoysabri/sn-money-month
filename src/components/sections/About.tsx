import { day, monthName } from '../../lib/format'
import type { Report } from '../../lib/report/types'
import { Alert, Change, Check, Doc } from '../icons'
import { MarkdownView } from '../MarkdownView'
import { Section } from '../text'

export function About({ report }: { report: Report }) {
  const q = report.quality
  const name = monthName(report.month)
  return (
    <Section id="about" eyebrow="About this report" title="Notes on the data">
      <div className="facts">
        {q && (
          <div className="fact">
            {q.waiting ? <Alert /> : <Check />}
            <span>
              {q.waiting
                ? `${q.waiting} transaction${q.waiting === 1 ? '' : 's'} wait${q.waiting === 1 ? 's' : ''} for review, ${q.fromMonth} of them from ${name}. Totals may still change.`
                : 'All transactions reviewed.'}
            </span>
          </div>
        )}
        {report.adjustments.map((a) => (
          <div className="fact" key={a}>
            <Change />
            <span>{a}</span>
          </div>
        ))}
        {report.present.includes('adjustments') && !report.adjustments.length && (
          <div className="fact">
            <Check />
            <span>No changes to earlier months.</span>
          </div>
        )}
        <div className="fact">
          <Doc />
          <span>
            {report.status === 'draft' ? 'Draft report' : 'Report'}
            {report.closed ? `, closed ${day(report.closed, true)}` : ''} by the finance system. Report format {report.format}.
          </span>
        </div>
        {report.warnings.map((w) => (
          <div className="fact warn" key={w}>
            <Alert />
            <span>{w}</span>
          </div>
        ))}
      </div>
      <details>
        <summary>What the numbers mean</summary>
        <p>
          <b>Savings rate</b>: income minus spending, divided by income. Spending is expenses plus fees minus refunds; moving money
          between your own accounts doesn&rsquo;t count.
        </p>
        <p>
          <b>Net worth</b>: cash, savings and investments minus what&rsquo;s used on cards and what&rsquo;s left on loans, on the date
          shown.
        </p>
        <p>
          <b>The weeks ahead</b>: cash minus card debt. Spending lowers it the day it happens; paying a card doesn&rsquo;t move it.
        </p>
      </details>
    </Section>
  )
}

/** Sections this version doesn't know, shown as they were written. */
export function ExtraSections({ report }: { report: Report }) {
  return (
    <>
      {report.extra.map((x, i) => (
        <section className="sec" key={`${x.heading}-${i}`} aria-label={x.heading}>
          <p className="eyebrow">From the report</p>
          <h2 className="title">{x.heading}</h2>
          <MarkdownView markdown={x.markdown} />
        </section>
      ))}
    </>
  )
}
