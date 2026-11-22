import { useState } from 'react'
import { amount, monthName, previousMonth, share } from '../../lib/format'
import { usePrivacy } from '../../lib/privacy'
import { budgetLead, budgetSummary, change, spendingLead, spendingTotal } from '../../lib/report/insights'
import type { CategoryRow, Report } from '../../lib/report/types'
import { Money, Rich, Section } from '../text'

const TOP_CATEGORIES = 8

export function Spending({ report, note }: { report: Report; note?: string }) {
  const [all, setAll] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const total = spendingTotal(report)
  const cats = report.categories
  const max = Math.max(1, ...cats.map((c) => Math.max(c.amount, c.lastMonth ?? 0)))
  const budgets = new Map(report.budgets.map((b) => [b.category.toLowerCase(), b.budget]))
  const hasLast = cats.some((c) => c.lastMonth !== undefined)
  const prevShort = monthName(previousMonth(report.month)).slice(0, 3)
  const shown = all ? cats : cats.slice(0, TOP_CATEGORIES)

  return (
    <Section id="spending" eyebrow="Spending" title="Where it went" lead={<Rich parts={spendingLead(report)} />} note={note}>
      {hasLast && (
        <p className="legend-note">
          <i /> tick = {monthName(previousMonth(report.month))}
        </p>
      )}
      <div className="rows">
        {shown.map((c) => (
          <CategoryLine
            key={c.name}
            c={c}
            max={max}
            total={total}
            budget={budgets.get(c.name.toLowerCase())}
            prevShort={prevShort}
            open={open === c.name}
            onToggle={() => setOpen(open === c.name ? null : c.name)}
          />
        ))}
      </div>
      {cats.length > TOP_CATEGORIES && (
        <button type="button" className="more" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? `Show the top ${TOP_CATEGORIES}` : `Show all ${cats.length} categories`}
        </button>
      )}
      {report.moneyBack.length > 0 && (
        <p className="money-back">
          Money back:{' '}
          {report.moneyBack.map((c, i) => (
            <span key={c.name}>
              {i > 0 && ' · '}
              {c.name} <Money value={-c.amount} />
            </span>
          ))}
        </p>
      )}
    </Section>
  )
}

function CategoryLine({
  c,
  max,
  total,
  budget,
  prevShort,
  open,
  onToggle,
}: {
  c: CategoryRow
  max: number
  total: number
  budget?: number
  prevShort: string
  open: boolean
  onToggle: () => void
}) {
  const hidden = usePrivacy()
  const ch = change(c)
  const typical = change(c, 'typical')
  const delta = ch?.flagged ? (
    <span className={`delta ${ch.amount > 0 ? 'bad' : 'good'}`}>
      {ch.amount > 0 ? '▲' : '▼'} {amount(Math.abs(ch.amount), { currency: false, hidden })} vs {prevShort}
    </span>
  ) : null
  const bars = (
    <>
      <span className="fill" style={{ width: `${(c.amount / max) * 100}%` }} />
      {c.lastMonth !== undefined && <span className="tick" style={{ left: `calc(${(c.lastMonth / max) * 100}% - 1px)` }} />}
    </>
  )
  return (
    <button type="button" className="crow" aria-expanded={open} onClick={onToggle}>
      <span className="line">
        <span className="name">{c.name}</span>
        <span className="track inline-track" aria-hidden="true">
          {bars}
        </span>
        <span className="val">
          <Money value={c.amount} currency={false} />
          <span className="sh">{share(c.amount, total)}</span>
        </span>
        <span className="dl-wide">{delta}</span>
      </span>
      <span className="barline">
        <span className="track" aria-hidden="true">
          {bars}
        </span>
        {delta}
      </span>
      {open && (
        <span className="detail">
          <span>This month</span>
          <b>
            <Money value={c.amount} cents />
          </b>
          <span>Share of spending</span>
          <b>{share(c.amount, total)}</b>
          <span>Budget</span>
          <b>{budget !== undefined ? <Money value={budget} /> : 'none'}</b>
          {c.lastMonth !== undefined && (
            <>
              <span>Last month</span>
              <b>
                <Money value={c.lastMonth} /> ({<Money value={ch!.amount} signed currency={false} />})
              </b>
            </>
          )}
          {c.typical !== undefined && typical && (
            <>
              <span>Typical month</span>
              <b>
                <Money value={c.typical} /> ({<Money value={typical.amount} signed currency={false} />})
              </b>
            </>
          )}
        </span>
      )}
    </button>
  )
}

const SCALE = 150 // percent of budget the bullet bars span

export function Budgets({ report, note }: { report: Report; note?: string }) {
  const summary = budgetSummary(report)
  const rows = report.budgets
    .map((b) => ({ ...b, used: b.budget ? (b.spent / b.budget) * 100 : 0 }))
    .sort((a, b) => Number(b.spent - b.budget > 0.5) - Number(a.spent - a.budget > 0.5) || b.used - a.used)
  const title = summary.count ? `${summary.held} of ${summary.count} budgets held` : 'No budgets this month'

  return (
    <Section id="budgets" eyebrow="Budgets" title={title} lead={summary.count ? <Rich parts={budgetLead(summary)} /> : undefined} note={note}>
      {rows.map((b) => {
        const over = b.spent - b.budget > 0.5
        const inWidth = (Math.min(b.used, 100) / SCALE) * 100
        const target = (100 / SCALE) * 100
        const overWidth = over ? ((Math.min(b.used, SCALE) - 100) / SCALE) * 100 : 0
        return (
          <div className="brow" key={b.category}>
            <div className="line">
              <span>{b.category}</span>
              <span className="val">
                <Money value={b.spent} currency={false} /> of <Money value={b.budget} currency={false} /> · <b>{Math.round(b.used)}%</b>
              </span>
            </div>
            <div className="bullet" role="img" aria-label={`${b.category}: ${Math.round(b.used)}% of its budget`}>
              <span className="in" style={{ width: `${inWidth}%` }} />
              {over && <span className="over" style={{ left: `${target}%`, width: `${overWidth}%` }} />}
              <span className="target" style={{ left: `calc(${target}% - 1px)` }} />
            </div>
            {over ? (
              <p className="note bad">
                ▲ over by <Money value={b.spent - b.budget} />
              </p>
            ) : b.used >= 99.5 ? (
              <p className="note">On budget</p>
            ) : null}
          </div>
        )
      })}
      {summary.unbudgeted.length > 0 && (
        <p className="nobudget">
          Spending with no budget:{' '}
          {summary.unbudgeted.map((c, i) => (
            <span key={c.name}>
              {i > 0 && ' · '}
              <b>{c.name}</b> <Money value={c.amount} currency={false} />
            </span>
          ))}
        </p>
      )}
    </Section>
  )
}
