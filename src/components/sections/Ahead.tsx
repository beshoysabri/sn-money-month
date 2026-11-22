import { useState } from 'react'
import { amount, day, percent } from '../../lib/format'
import { usePrivacy } from '../../lib/privacy'
import { forecastLead, milestones, plainText, readLate, worthLead } from '../../lib/report/insights'
import type { Report } from '../../lib/report/types'
import { ForecastChart } from '../charts/ForecastChart'
import { Money, Rich, Section } from '../text'

export function Weeks({ report, note }: { report: Report; note?: string }) {
  const [table, setTable] = useState(false)
  const hidden = usePrivacy()
  const lead = forecastLead(report)
  const n = report.forecast.length
  return (
    <Section id="forecast" eyebrow="The weeks ahead" title={`Cash minus card debt, ${n} week${n === 1 ? '' : 's'}`} lead={<Rich parts={lead} />} note={note}>
      <ForecastChart weeks={report.forecast} label={`Projected balance by week. ${plainText(lead, hidden)}`} />
      <p className="small">Spending lowers this balance the day it happens; paying a card doesn't move it.</p>
      <button type="button" className="tbl-toggle" aria-expanded={table} onClick={() => setTable(!table)}>
        {table ? 'Hide the table' : 'Show as table'}
      </button>
      {table && (
        <div className="scroll-x">
          <table className="data">
            <thead>
              <tr>
                <th>Week of</th>
                <th>In</th>
                <th>Out</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {report.forecast.map((w) => (
                <tr key={w.week}>
                  <td>{day(w.week)}</td>
                  <td>
                    <Money value={w.inflow} currency={false} />
                  </td>
                  <td>
                    <Money value={w.outflow} currency={false} />
                  </td>
                  <td>
                    <Money value={w.balance} currency={false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

export function Worth({ report, note }: { report: Report; note?: string }) {
  const [accounts, setAccounts] = useState(false)
  const w = report.netWorth!
  const steps: [string, number][] = [
    ['Cash', w.cash],
    ['Savings', w.savings],
    ['Investments', w.investments],
    ['Cards', -w.cards],
    ['Loans', -w.loans],
  ]
  let running = 0
  const spans = steps.map(([label, value]) => {
    const from = running
    running += value
    return { label, value, from, to: running }
  })
  const lo = Math.min(0, w.net, ...spans.flatMap((s) => [s.from, s.to]))
  const hi = Math.max(0, w.net, ...spans.flatMap((s) => [s.from, s.to]))
  const x = (v: number) => ((v - lo) / (hi - lo || 1)) * 100
  const late = readLate(report)

  const row = (label: string, value: number, from: number, to: number, kind: 'asset' | 'debt' | 'total') => {
    const left = x(Math.min(from, to))
    const width = Math.max(x(Math.max(from, to)) - left, value === 0 ? 0 : 0.6)
    return (
      <div className={`wrow ${kind === 'total' ? 'total' : ''}`} key={label}>
        <span>{label}</span>
        <span className="wt" aria-hidden="true">
          <span className="wz" style={{ left: `${x(0)}%` }} />
          <span className={`wb ${kind === 'total' ? (value < 0 ? 'bad' : 'good') : kind}`} style={{ left: `${left}%`, width: `${width}%` }} />
        </span>
        <span className="wv">{value === 0 ? '0' : <Money value={value} signed={kind !== 'total'} currency={false} />}</span>
      </div>
    )
  }

  return (
    <Section id="worth" eyebrow="Net worth" title="What you own and what you owe" lead={<Rich parts={worthLead(report)} />} note={note}>
      <div
        className="wf"
        role="img"
        aria-label={`Cash ${amount(w.cash)}, savings ${amount(w.savings)}, investments ${amount(w.investments)}, minus cards ${amount(w.cards)} and loans ${amount(w.loans)}: net worth ${amount(w.net)}`}
      >
        {spans.map((s) => row(s.label, s.value, s.from, s.to, s.value >= 0 ? 'asset' : 'debt'))}
        {row('Net worth', w.net, 0, w.net, 'total')}
      </div>
      {w.asOf && (
        <p className="asof">
          Balances on {day(w.asOf, true)}
          {late ? ', read after the month ended, so they are not month-end figures.' : '.'}
        </p>
      )}
      {w.accounts.length > 0 && (
        <>
          <button type="button" className="tbl-toggle" aria-expanded={accounts} onClick={() => setAccounts(!accounts)}>
            {accounts ? 'Hide the accounts' : `Show the ${w.accounts.length} accounts`}
          </button>
          {accounts &&
            w.accounts.map((a) => (
              <div className="lrow" key={a.name}>
                <span className="t">{a.name}</span>
                <span className="a">
                  <Money value={a.amount} currency={false} />
                </span>
                <span className="m">{a.kind}</span>
              </div>
            ))}
        </>
      )}
    </Section>
  )
}

export function Freedom({ report, note }: { report: Report; note?: string }) {
  const f = report.freedom!
  const m = milestones(report)
  const multiple = f.target && f.yearlySpending ? Math.round(f.target / f.yearlySpending) : undefined
  const ladder = m
    ? [
        { label: 'Now', state: 'now' },
        ...[
          [1, '1 month'],
          [3, '3 months'],
          [12, '1 year'],
        ]
          .filter(([months]) => (months as number) > m.covered)
          .map(([, label]) => ({ label: label as string, state: '' })),
        { label: 'Free', state: '' },
      ].map((step, i) => ({ ...step, state: step.state || (i === 1 ? 'next' : '') }))
    : []

  return (
    <Section id="freedom" eyebrow="Financial freedom" note={note}>
      <div className="card free">
        <h2 className="big">{m ? `Your savings cover ${m.phrase} of spending.` : 'Progress toward financial freedom'}</h2>
        {m?.next && (
          <>
            <div className="next-line small">
              <span>Next: {m.next.label} of spending</span>
              <span>
                <Money value={f.saved ?? 0} currency={false} /> of <Money value={m.next.amount} currency={false} /> · {Math.floor(m.next.progress)}%
              </span>
            </div>
            <div className="prog" role="img" aria-label={`${Math.floor(m.next.progress)}% of the way to ${m.next.label} of spending`}>
              <span style={{ width: `${Math.min(100, m.next.progress)}%` }} />
            </div>
          </>
        )}
        {ladder.length > 0 && (
          <div className="ladder" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${ladder.length}, 1fr)` }}>
            {ladder.map((step) => (
              <div key={step.label} className={step.state}>
                {step.label}
              </div>
            ))}
          </div>
        )}
        <p className="small fi-line">
          {f.target !== undefined && (
            <>
              Financial freedom target <Money value={f.target} />
              {f.progress !== undefined && `: ${percent(f.progress)} there`}
              {f.years === null
                ? ', not reachable at today’s pace.'
                : f.years !== undefined
                  ? `, about ${Math.round(f.years)} years at today’s pace`
                  : ''}
              {f.years !== undefined && f.years !== null && f.monthlySaving !== undefined && (
                <>
                  {' '}
                  of <Money value={f.monthlySaving} /> saved a month.
                </>
              )}
            </>
          )}
        </p>
        <details>
          <summary>How this is calculated</summary>
          <p>
            Target = a year&rsquo;s spending{f.yearlySpending !== undefined && <> (<Money value={f.yearlySpending} />)</>}
            {multiple ? ` × ${multiple}` : ' × the FI multiple'}. Saved and invested counts savings and investment balances.
            {f.realReturn !== undefined && ` Years to go assume a ${percent(f.realReturn)} real return (expected return minus inflation).`}
            {f.months !== undefined && ` Based on ${f.months} month${f.months === 1 ? '' : 's'} of data.`} The milestones divide savings by a
            month&rsquo;s spending{m && <> ({<Money value={m.monthlySpending} />})</>}.
          </p>
        </details>
      </div>
    </Section>
  )
}
