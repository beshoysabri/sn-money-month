// Facts and sentences computed from a report, phrased here in code (never by a
// model). Sentences are lists of parts so that amounts can be hidden.

import { amount, day, monthName, percent, previousMonth, share } from '../format'
import type { BudgetRow, CategoryRow, ForecastWeek, Report, SectionKey } from './types'

export type Part =
  | string
  | { kind: 'money'; value: number; strong?: boolean; signed?: boolean }
  | { kind: 'strong'; text: string }

/** Plain text of a sentence, for copying and for accessible labels. */
export function plainText(parts: Part[], hidden = false): string {
  return parts
    .map((p) => (typeof p === 'string' ? p : p.kind === 'strong' ? p.text : amount(p.value, { signed: p.signed, hidden })))
    .join('')
}

/** The note list's preview line for a report. */
export function previewLine(r: Report): string {
  const s = r.summary
  if (!s) return `Finance report ${r.month}`
  const head = s.net >= 0 ? `Kept ${amount(s.net)}` : `Overspent ${amount(-s.net)}`
  return `${head} · spent ${amount(s.spending)} · savings rate ${percent(s.rate)}`
}

const money = (value: number, strong = false, signed = false): Part => ({ kind: 'money', value, strong, signed })
const strong = (text: string): Part => ({ kind: 'strong', text })

/** "A", "A and B", "A, B and C". */
function listOf(items: Part[][]): Part[] {
  return items.flatMap((item, i) => [...(i === 0 ? [] : [i === items.length - 1 ? ' and ' : ', ']), ...item])
}

// The month ---------------------------------------------------------------

export interface Verdict {
  kind: 'kept' | 'overspent' | 'none'
  amount: number
  sentence: Part[]
  spentShare?: number // spending as % of income
}

export function verdict(r: Report): Verdict {
  const s = r.summary
  if (!s) return { kind: 'none', amount: 0, sentence: ['This report has no summary.'] }
  if (s.income <= 0) {
    return { kind: 'overspent', amount: s.spending, sentence: ['No income was recorded in ', monthName(r.month), '; spending was ', money(s.spending, true), '.'] }
  }
  const spentShare = (s.spending / s.income) * 100
  const m3 = s.rates.m3
  const compared = m3 !== null && s.rate !== null && Math.abs(m3 - s.rate) >= 0.05
  if (s.net >= 0) {
    return {
      kind: 'kept',
      amount: s.net,
      spentShare,
      sentence: [
        'You kept ',
        strong(percent(s.rate ?? (s.net / s.income) * 100)),
        ' of what you earned',
        ...(compared ? [`, ${m3! < (s.rate ?? 0) ? 'above' : 'below'} your 3-month rate of ${percent(m3)}.`] : ['.']),
      ],
    }
  }
  return {
    kind: 'overspent',
    amount: -s.net,
    spentShare,
    sentence: [
      'You spent ',
      money(-s.net, true),
      ' more than you earned',
      ...(m3 !== null && compared ? [`; your 3-month savings rate is ${percent(m3)}.`] : ['.']),
    ],
  }
}

// Needs attention -----------------------------------------------------------

export interface Attention {
  key: string
  section: SectionKey
  tone: 'attention' | 'neutral'
  icon: 'budget' | 'low' | 'shared'
  parts: Part[]
}

export function overBudget(r: Report): (BudgetRow & { over: number })[] {
  return r.budgets
    .map((b) => ({ ...b, over: b.spent - b.budget }))
    .filter((b) => b.over > 0.5)
    .sort((a, b) => b.over - a.over)
}

export function lowestWeek(r: Report): ForecastWeek | undefined {
  return r.forecast.reduce<ForecastWeek | undefined>((low, w) => (!low || w.balance < low.balance ? w : low), undefined)
}

export function needsAttention(r: Report): Attention[] {
  const rows: Attention[] = []
  const overs = overBudget(r)
  if (overs.length) {
    const top = overs[0]
    rows.push({
      key: 'budget',
      section: 'budgets',
      tone: 'attention',
      icon: 'budget',
      parts: [top.category, ' went over its budget by ', money(top.over, true), ...(overs.length > 1 ? [`, and ${overs.length - 1} more`] : [])],
    })
  }
  const low = lowestWeek(r)
  if (low && low.balance < 0) {
    rows.push({ key: 'low', section: 'forecast', tone: 'attention', icon: 'low', parts: ['Cash is tightest in the week of ', day(low.week), ': ', money(low.balance, true)] })
  }
  if (r.shared && r.shared.owes > 0.5) {
    rows.push({ key: 'shared', section: 'shared', tone: 'neutral', icon: 'shared', parts: [r.shared.person, ' owes you ', money(r.shared.owes, true)] })
  }
  return rows.slice(0, 3)
}

// Spending ------------------------------------------------------------------

/** Spending total to share categories against: the summary's, else the categories' own. */
export function spendingTotal(r: Report): number {
  return r.summary?.spending ?? r.categories.reduce((t, c) => t + c.amount, 0) + r.moneyBack.reduce((t, c) => t + c.amount, 0)
}

export interface Change {
  amount: number
  percent: number | null
  flagged: boolean
}

/** A category's change against last month; flagged only past EGP 500 and 15% both. */
export function change(c: CategoryRow, against: 'lastMonth' | 'typical' = 'lastMonth'): Change | undefined {
  const base = c[against]
  if (base === undefined) return undefined
  const diff = c.amount - base
  const pct = base ? (diff / base) * 100 : null
  return { amount: diff, percent: pct, flagged: Math.abs(diff) >= 500 && (pct === null || Math.abs(pct) >= 15) }
}

export function spendingLead(r: Report): Part[] {
  const total = spendingTotal(r)
  const top = r.categories.slice(0, 2)
  const parts: Part[] = [money(total, true), ' spent.']
  if (top.length && total > 0) {
    const topShare = share(top.reduce((t, c) => t + c.amount, 0), total)
    parts.push(' ', ...listOf(top.map((c) => [c.name])), ` took ${topShare}.`)
  }
  const rises = r.categories
    .map((c) => ({ c, ch: change(c) }))
    .filter((x) => x.ch?.flagged && x.ch.amount > 0)
    .sort((a, b) => b.ch!.amount - a.ch!.amount)
  if (rises.length) {
    parts.push(' ', rises[0].c.name, ' rose the most: ', money(rises[0].ch!.amount), ` more than in ${monthName(previousMonth(r.month))}.`)
  }
  return parts
}

// Budgets -------------------------------------------------------------------

export interface BudgetSummary {
  held: number
  count: number
  budgeted: number
  spent: number
  overs: (BudgetRow & { over: number })[]
  unbudgeted: CategoryRow[]
}

export function budgetSummary(r: Report): BudgetSummary {
  const names = new Set(r.budgets.map((b) => b.category.toLowerCase()))
  const overs = overBudget(r)
  return {
    held: r.budgets.length - overs.length,
    count: r.budgets.length,
    budgeted: r.budgets.reduce((t, b) => t + b.budget, 0),
    spent: r.budgets.reduce((t, b) => t + b.spent, 0),
    overs,
    unbudgeted: r.categories.filter((c) => c.amount > 0 && !names.has(c.name.toLowerCase())),
  }
}

export function budgetLead(b: BudgetSummary): Part[] {
  const parts: Part[] = []
  if (b.overs.length) {
    const named = b.overs.slice(0, 2)
    parts.push(...listOf(named.map((o, i) => (i === 0 ? [o.category, ' went over by ', money(o.over, true)] : [o.category, ' by ', money(o.over, true)]))))
    parts.push(b.overs.length > 2 ? `, and ${b.overs.length - 2} more went over.` : '.')
  } else {
    parts.push('Every budget held.')
  }
  parts.push(' Overall ', money(b.spent), ' of ', money(b.budgeted), ` budgeted was spent (${share(b.spent, b.budgeted)}).`)
  return parts
}

// Net worth -----------------------------------------------------------------

export function worthLead(r: Report): Part[] {
  const w = r.netWorth
  if (!w) return []
  const parts: Part[] = w.net < 0 ? ['You owe ', money(-w.net, true), ' more than you own.'] : ['You own ', money(w.net, true), ' more than you owe.']
  const prev = r.months.filter((m) => m.month < r.month && m.netWorth !== null).at(-1)
  if (prev && prev.netWorth !== null) {
    const diff = w.net - prev.netWorth
    if (Math.abs(diff) >= 1) parts.push(diff > 0 ? ' Up ' : ' Down ', money(Math.abs(diff)), ` since ${monthName(prev.month)}.`)
  }
  return parts
}

/** True when the balances were read more than three days after the month ended. */
export function readLate(r: Report): boolean {
  const asOf = r.netWorth?.asOf
  if (!asOf) return false
  const [y, m] = r.month.split('-').map(Number)
  const end = new Date(Date.UTC(y, m, 1)) // first day of next month
  return (Date.parse(asOf) - end.getTime()) / 86_400_000 > 3
}

// The weeks ahead -------------------------------------------------------------

export function forecastLead(r: Report): Part[] {
  const low = lowestWeek(r)
  if (!low) return []
  if (low.balance >= 0) return ['Stays above zero; lowest in the week of ', strong(day(low.week)), ' at ', money(low.balance, true), '.']
  const after = r.forecast.slice(r.forecast.indexOf(low) + 1).find((w) => w.balance >= 0)
  return [
    'Lowest in the week of ',
    strong(day(low.week)),
    ' at ',
    money(low.balance, true),
    after ? `; above zero by the week of ${day(after.week)}.` : '.',
  ]
}

// Financial freedom -------------------------------------------------------------

export interface Milestones {
  covered: number // months of spending that savings cover
  phrase: string
  next?: { months: number; label: string; amount: number; progress: number }
  monthlySpending: number
}

const LADDER: [number, string][] = [
  [1, '1 month'],
  [3, '3 months'],
  [6, '6 months'],
  [12, '1 year'],
]

export function milestones(r: Report): Milestones | undefined {
  const f = r.freedom
  const monthlySpending = f?.yearlySpending ? f.yearlySpending / 12 : r.summary?.spending
  if (!f || f.saved === undefined || !monthlySpending) return undefined
  const covered = f.saved / monthlySpending
  const weeks = covered * 4.345
  const phrase =
    weeks < 1
      ? 'less than a week'
      : covered < 1
        ? `about ${Math.round(weeks)} week${Math.round(weeks) === 1 ? '' : 's'}`
        : covered < 12
          ? `about ${Math.round(covered * 10) / 10} months`
          : `about ${Math.round((covered / 12) * 10) / 10} years`
  const step = LADDER.find(([months]) => months > covered)
  return {
    covered,
    phrase,
    monthlySpending,
    next: step ? { months: step[0], label: step[1], amount: step[0] * monthlySpending, progress: (covered / step[0]) * 100 } : undefined,
  }
}

// Largest transactions ------------------------------------------------------------

export function largestLead(r: Report): Part[] {
  const sum = r.largest.reduce((t, x) => t + x.amount, 0)
  const total = spendingTotal(r)
  if (!r.largest.length) return []
  return ['Together ', money(sum, true), total > 0 ? `, ${share(sum, total)} of ${monthName(r.month)}'s spending.` : '.']
}
