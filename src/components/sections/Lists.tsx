import { useState } from 'react'
import { day, share } from '../../lib/format'
import { largestLead, spendingTotal } from '../../lib/report/insights'
import type { Report } from '../../lib/report/types'
import { Money, Rich, Section } from '../text'

const TOP_SUBSCRIPTIONS = 6
const TOP_TRANSACTIONS = 5

export function Subscriptions({ report, note }: { report: Report; note?: string }) {
  const [all, setAll] = useState(false)
  const s = report.subscriptions!
  const income = report.summary?.income ?? 0
  const changed = s.list.filter((x) => x.change)
  const list = all ? s.list : s.list.slice(0, TOP_SUBSCRIPTIONS)
  return (
    <Section
      id="subscriptions"
      eyebrow="Subscriptions"
      title={
        <>
          <Money value={s.monthly} /> a month
        </>
      }
      lead={
        <>
          {s.count} active subscription{s.count === 1 ? '' : 's'}
          {income > 0 && `, ${share(s.monthly, income)} of income`} (<Money value={s.monthly * 12} /> a year).
          {s.priceChanges.length > 0 && !changed.length && <> Price changes: {s.priceChanges.join(', ')}.</>}
        </>
      }
      note={note}
    >
      {changed.map((x) => (
        <p className="change-line" key={x.name}>
          <b>{x.name}</b> changed price: {x.change}
        </p>
      ))}
      {list.map((x) => (
        <div className="lrow" key={x.name}>
          <span className="t">{x.name}</span>
          <span className="a">
            <Money value={x.monthly} currency={false} />
          </span>
          <span className="m">
            {x.cycle}
            {x.cycle && !/month/i.test(x.cycle) ? ' · per month' : ''}
          </span>
          <span className="r">{x.next ? `next ${/^\d{4}-/.test(x.next) ? day(x.next) : x.next}` : ''}</span>
        </div>
      ))}
      {s.list.length > TOP_SUBSCRIPTIONS && (
        <button type="button" className="more" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? `Show the top ${TOP_SUBSCRIPTIONS}` : `Show all ${s.list.length}`}
        </button>
      )}
    </Section>
  )
}

export function SharedCosts({ report, note }: { report: Report; note?: string }) {
  const s = report.shared!
  return (
    <Section id="shared" eyebrow="Shared costs" title={s.owes > 0.5 ? 'Splits not settled yet' : 'All settled'} note={note}>
      <div className="owed">
        <span>{s.owes > 0.5 ? `${s.person} owes you` : `${s.person} owes you nothing`}</span>
        {s.owes > 0.5 && (
          <span className="a">
            <Money value={s.owes} />
          </span>
        )}
      </div>
      <p className="small">For splits sent to ShareCost and not settled.</p>
    </Section>
  )
}

export function Largest({ report, note }: { report: Report; note?: string }) {
  const [all, setAll] = useState(false)
  const total = spendingTotal(report)
  const list = all ? report.largest : report.largest.slice(0, TOP_TRANSACTIONS)
  return (
    <Section
      id="largest"
      eyebrow="Largest transactions"
      title={`The ${report.largest.length} biggest`}
      lead={<Rich parts={largestLead(report)} />}
      note={note}
    >
      {list.map((t, i) => (
        <div className="lrow" key={`${t.dateText}-${t.what}-${i}`}>
          <span className="t">{t.what}</span>
          <span className="a">
            <Money value={t.amount} currency={false} />
          </span>
          <span className="m">
            {t.date ? day(t.date) : t.dateText}
            {t.category && (
              <>
                {' · '}
                <span className="tag">{t.category}</span>
              </>
            )}
          </span>
          <span className="r">{total > 0 ? `${share(t.amount, total)} of spending` : ''}</span>
        </div>
      ))}
      {report.largest.length > TOP_TRANSACTIONS && (
        <button type="button" className="more" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? `Show the top ${TOP_TRANSACTIONS}` : `Show all ${report.largest.length}`}
        </button>
      )}
    </Section>
  )
}
