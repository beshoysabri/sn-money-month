import { useState } from 'react'
import { amount, MASK, monthName, percent, points, previousMonth, share } from '../../lib/format'
import { usePrivacy } from '../../lib/privacy'
import { verdict, type Attention } from '../../lib/report/insights'
import type { Commentary, Report, SectionKey } from '../../lib/report/types'
import { Sparkline } from '../charts/Sparkline'
import { Alert, Chevron, Low, Shared } from '../icons'
import { Money, Rich } from '../text'

function Delta({ value, goodWhenUp, kind = 'money', label }: { value: number; goodWhenUp: boolean; kind?: 'money' | 'points'; label: string }) {
  const hidden = usePrivacy()
  if (Math.abs(value) < (kind === 'points' ? 0.05 : 0.5)) return <span>Same as {label}</span>
  const good = value > 0 === goodWhenUp
  // The arrow carries the direction, so the number is shown without a sign.
  const text = kind === 'points' ? points(Math.abs(value)).replace(/^\+/, '') : amount(Math.abs(value), { currency: false, hidden })
  return (
    <span className={`delta ${good ? 'good' : 'bad'}`}>
      {value > 0 ? '▲' : '▼'} {text} vs {label}
    </span>
  )
}

export function MonthCard({ report }: { report: Report }) {
  const hidden = usePrivacy()
  const v = verdict(report)
  const s = report.summary
  const name = monthName(report.month)
  const prev = report.months.find((m) => m.month === previousMonth(report.month))
  const prevName = prev ? monthName(prev.month).slice(0, 3) : ''
  const series = report.months.length >= 2 ? report.months : []
  const rates = s?.rates
  const sameRates = rates && rates.m3 === rates.m6 && rates.m6 === rates.m12

  return (
    <section id="month" className="card month span2" aria-labelledby="month-title">
      <p className="eyebrow" id="month-title">
        The month
      </p>
      {s && v.kind !== 'none' && (
        <p className="hero">
          <span className="cur">EGP</span>
          <span className="fig">{hidden ? MASK : amount(v.amount, { currency: false })}</span>
          <span className="lbl">{v.kind === 'kept' ? `kept in ${name}` : `overspent in ${name}`}</span>
        </p>
      )}
      <p className="verdict">
        <Rich parts={v.sentence} />
      </p>
      {s && s.income > 0 && <SplitBar income={s.income} spending={s.spending} />}
      {s && (
        <div className="kpis">
          <div className="kpi">
            <span className="k">Income</span>
            <span className="v">
              <Money value={s.income} currency={false} />
            </span>
            <span className="s">
              {prev ? <Delta value={s.income - prev.income} goodWhenUp label={prevName} /> : <span />}
              <Sparkline values={series.map((m) => m.income)} label="Income by month" />
            </span>
          </div>
          <div className="kpi">
            <span className="k">Spending</span>
            <span className="v">
              <Money value={s.spending} currency={false} />
            </span>
            <span className="s">
              {prev ? (
                <Delta value={s.spending - prev.spending} goodWhenUp={false} label={prevName} />
              ) : (
                <span>{s.income > 0 ? `${share(s.spending, s.income)} of income` : ''}</span>
              )}
              <Sparkline values={series.map((m) => m.spending)} label="Spending by month" />
            </span>
          </div>
          <div className="kpi">
            <span className="k">Savings rate</span>
            <span className="v">{percent(s.rate)}</span>
            <span className="s">
              <span>
                {prev && s.rate !== null && prev.rate !== null && (
                  <>
                    <Delta value={s.rate - prev.rate} goodWhenUp kind="points" label={prevName} />
                    {' · '}
                  </>
                )}
                {rates &&
                  (sameRates
                    ? `${percent(rates.m3)} over the months with data`
                    : `3 mo ${percent(rates.m3)} · 6 mo ${percent(rates.m6)} · 12 mo ${percent(rates.m12)}`)}
              </span>
              <Sparkline values={series.map((m) => m.rate ?? 0)} zero label="Savings rate by month" />
            </span>
          </div>
        </div>
      )}
    </section>
  )
}

/** Spending as a share of income: what was spent, and what was kept or overspent. */
function SplitBar({ income, spending }: { income: number; spending: number }) {
  const kept = income - spending
  const scale = Math.max(income, spending)
  const spentWidth = (Math.min(spending, income) / scale) * 100
  const label =
    kept >= 0
      ? `Of ${amount(income)} income, ${share(spending, income)} was spent and ${share(kept, income)} kept`
      : `Spending was ${share(spending, income)} of income`
  return (
    <>
      <div className="split" role="img" aria-label={label}>
        <span className="spent" style={{ width: `${spentWidth}%` }} />
        {kept >= 0 ? (
          <span className="kept" style={{ width: `${100 - spentWidth}%` }} />
        ) : (
          <span className="over" style={{ width: `${(-kept / scale) * 100}%` }} />
        )}
      </div>
      <div className="split-legend">
        <span>
          <i className="key-spent" />
          {kept >= 0 ? (
            <>
              Spent <Money value={spending} currency={false} /> · {share(spending, income)}
            </>
          ) : (
            <>
              Income <Money value={income} currency={false} />
            </>
          )}
        </span>
        <span>
          {kept >= 0 ? (
            <>
              <i className="key-kept" />
              Kept {share(kept, income)} of <Money value={income} currency={false} />
            </>
          ) : (
            <>
              <i className="key-over" />
              Overspent <Money value={-kept} currency={false} />
            </>
          )}
        </span>
      </div>
    </>
  )
}

const ICONS = { budget: Alert, low: Low, shared: Shared }

export function NeedsAttention({ rows, onJump }: { rows: Attention[]; onJump: (section: SectionKey) => void }) {
  if (!rows.length) return null
  return (
    <section className="attn span2" aria-labelledby="attn-title">
      <p className="eyebrow" id="attn-title">
        Needs attention
      </p>
      <div className="attn-rows">
        {rows.map((row) => {
          const Icon = ICONS[row.icon]
          return (
            <button key={row.key} type="button" onClick={() => onJump(row.section)}>
              <span className={`ic ${row.tone}`}>
                <Icon />
              </span>
              <span>
                <Rich parts={row.parts} />
              </span>
              <span className="go">
                <Chevron />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function Brief({ commentary }: { commentary: Commentary }) {
  const [open, setOpen] = useState(false)
  const long = commentary.summary.join(' ').length > 220 || commentary.steps.length > 0
  return (
    <section className={`brief span2${open ? '' : ' clamp'}`} aria-labelledby="brief-title">
      <p className="eyebrow" id="brief-title">
        In brief
      </p>
      <p className="by">Written by Claude from the numbers in this report</p>
      <div className="brief-text">
        {commentary.summary.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {open && commentary.steps.length > 0 && (
        <ol className="steps">
          {commentary.steps.map((step, i) => (
            <li key={i}>
              {step.label && <strong>{step.label}: </strong>}
              {step.text}
            </li>
          ))}
        </ol>
      )}
      {long && (
        <button type="button" className="more" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Show less' : commentary.steps.length ? `Read more · ${commentary.steps.length} points` : 'Read more'}
        </button>
      )}
    </section>
  )
}
