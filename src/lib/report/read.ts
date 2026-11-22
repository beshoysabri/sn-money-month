// Reads a finance report note (format 1 or 2, see the build spec's format
// contract) into a Report. Every section is read on its own: a section that
// can't be read becomes a warning and stays visible as text.

import { blocks, normalize, type Block } from '../markdown'
import type {
  Account,
  BudgetRow,
  CategoryRow,
  Commentary,
  CommentaryStep,
  ForecastWeek,
  Format,
  Freedom,
  MonthRow,
  ReadResult,
  Report,
  SectionKey,
  Subscription,
  Transaction,
} from './types'

const N = String.raw`[-−]?[\d,]*\d(?:\.\d+)?`
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const TITLE = /^#\s+Finance report\s+(\d{4})-(\d{2})\s*$/im
const PLACEHOLDER = /^For Claude:/i

/** "1,234.56", "-10.3", "−5" → number; anything else → undefined. */
export function num(text: string | undefined): number | undefined {
  if (text === undefined) return undefined
  const t = text.trim().replace(/^EGP\s*/i, '').replace(/−/g, '-').replace(/,/g, '').replace(/%$/, '')
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : undefined
}

/** "16.8%" → 16.8; "–" (the close writes it when there's no income) → null. */
function rate(text: string | undefined): number | null {
  const n = num(text)
  return n === undefined ? null : n
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** "07 Dec" or "21 Nov 2026" or "2026-12-07" → ISO, using the report month for the year. */
export function isoDate(text: string, reportMonth: string, after = false): string | undefined {
  const t = text.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?(?:\s+(\d{4}))?$/.exec(t)
  if (!m) return undefined
  const month = MONTHS.indexOf(m[2].toLowerCase()) + 1
  if (!month) return undefined
  const [ry, rm] = reportMonth.split('-').map(Number)
  let year = m[3] ? Number(m[3]) : ry
  if (!m[3] && after && month < rm) year += 1 // a week in January after a December report
  return `${year}-${pad(month)}-${pad(Number(m[1]))}`
}

function frontMatter(text: string): { fields: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text)
  if (!m) return { fields: {}, body: text }
  const fields: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*?)\s*$/.exec(line)
    if (kv) fields[kv[1].toLowerCase()] = kv[2].replace(/^["']|["']$/g, '')
  }
  return { fields, body: text.slice(m[0].length) }
}

const SECTION_NAMES: [RegExp, SectionKey][] = [
  [/^summary$/i, 'summary'],
  [/^months$/i, 'months'],
  [/^spending by category$/i, 'spending'],
  [/^budgets$/i, 'budgets'],
  [/^subscriptions$/i, 'subscriptions'],
  [/^net worth$/i, 'worth'],
  [/^forecast\b/i, 'forecast'],
  [/^financial freedom$/i, 'freedom'],
  [/^(sharecost|shared costs)$/i, 'shared'],
  [/^largest transactions$/i, 'largest'],
  [/^data quality$/i, 'quality'],
  [/^adjustments to earlier months$/i, 'adjustments'],
  [/^commentary$/i, 'commentary'],
  [/^my notes$/i, 'notes'],
]

function sectionKey(heading: string): SectionKey | undefined {
  return SECTION_NAMES.find(([re]) => re.test(heading.trim()))?.[1]
}

/** Names Claude's commentary uses for each part of the report ("Budgets: …"). */
const STEP_NAMES: [RegExp, SectionKey][] = [
  [/^(summary|the month|month|income)$/i, 'summary'],
  [/^(spending|spending by category|categories|where it went)$/i, 'spending'],
  [/^budgets?$/i, 'budgets'],
  [/^subscriptions?$/i, 'subscriptions'],
  [/^net worth$/i, 'worth'],
  [/^(forecast|the weeks ahead|weeks ahead|coming weeks|cash flow)$/i, 'forecast'],
  [/^(financial freedom|freedom)$/i, 'freedom'],
  [/^(sharecost|shared costs|splits)$/i, 'shared'],
  [/^(largest transactions|largest)$/i, 'largest'],
  [/^(data quality|data)$/i, 'quality'],
  [/^(months|twelve months|trend|trends)$/i, 'months'],
]

interface Table {
  header: string[]
  rows: string[][]
}

function firstTable(bs: Block[]): Table | undefined {
  const t = bs.find((b) => b.type === 'table')
  return t && t.type === 'table' ? t : undefined
}

/** Reads a table by column names, so columns can be added without breaking older readers. */
function column(table: Table, ...names: string[]): (row: string[]) => string | undefined {
  const index = table.header.findIndex((h) => names.some((n) => h.trim().toLowerCase() === n.toLowerCase()))
  return (row) => (index >= 0 ? row[index] : undefined)
}

function text(bs: Block[]): string {
  return bs
    .map((b) => (b.type === 'paragraph' || b.type === 'quote' ? b.text : b.type === 'list' ? b.items.join(' ') : ''))
    .join(' ')
}

function listItems(bs: Block[]): string[] {
  return bs.flatMap((b) => (b.type === 'list' ? b.items : []))
}

export function readReport(source: string): ReadResult {
  const normalized = normalize(source)
  const { fields, body } = frontMatter(normalized)
  const title = TITLE.exec(body)
  const isReport = fields.report === 'finance-monthly' || !!title
  if (!isReport) return { kind: 'not-report' }

  const month = fields.month && /^\d{4}-\d{2}$/.test(fields.month) ? fields.month : title ? `${title[1]}-${title[2]}` : ''
  if (!month) return { kind: 'not-report' }
  const formatField = Number(fields.format)
  const format: Format = formatField === 2 ? 2 : 1

  const report: Report = {
    format,
    month,
    status: fields.status === 'draft' ? 'draft' : fields.status === 'final' ? 'final' : undefined,
    closed: fields.closed && /^\d{4}-\d{2}-\d{2}$/.test(fields.closed) ? fields.closed : undefined,
    currency: fields.currency || 'EGP',
    months: [],
    categories: [],
    moneyBack: [],
    budgets: [],
    forecast: [],
    largest: [],
    adjustments: [],
    extra: [],
    present: [],
    warnings: [],
  }
  if (formatField > 2) report.warnings.push(`This report is format ${formatField}; Money Month reads formats 1 and 2, so some parts may be missing.`)

  // Split into "## " sections; anything between the title and the first section is ignored.
  const lines = (title ? body.slice(title.index + title[0].length) : body).split('\n')
  const sections: { heading: string; lines: string[] }[] = []
  for (const line of lines) {
    const h = /^##\s+(.+?)\s*$/.exec(line)
    if (h) sections.push({ heading: h[1], lines: [] })
    else if (sections.length) sections[sections.length - 1].lines.push(line)
  }

  for (const section of sections) {
    const key = sectionKey(section.heading)
    const markdown = section.lines.join('\n').trim()
    if (!key) {
      report.extra.push({ heading: section.heading, markdown })
      continue
    }
    report.present.push(key)
    try {
      const ok = readSection(report, key, markdown)
      if (!ok) {
        report.warnings.push(`Couldn't read "${section.heading}"; it's shown as text.`)
        report.extra.push({ heading: section.heading, markdown })
      }
    } catch {
      report.warnings.push(`Couldn't read "${section.heading}"; it's shown as text.`)
      report.extra.push({ heading: section.heading, markdown })
    }
  }
  return { kind: 'report', report }
}

/** Fills the report from one section; false when the section didn't have what its kind needs. */
function readSection(report: Report, key: SectionKey, markdown: string): boolean {
  const bs = blocks(markdown)
  const all = text(bs)
  switch (key) {
    case 'summary': {
      const m = new RegExp(
        String.raw`Income\s+EGP\s+(${N})\s*[·•|]\s*Spending\s+EGP\s+(${N})\s*[·•|]\s*Net\s+EGP\s+(${N})\s*[·•|]\s*Savings rate\s+(${N}|[–—-])%?`,
        'i',
      ).exec(all)
      if (!m) return false
      const r = /months with data:\s*(\S+)\s*\/\s*(\S+)\s*\/\s*(\S+)/i.exec(all)
      report.summary = {
        income: num(m[1])!,
        spending: num(m[2])!,
        net: num(m[3])!,
        rate: rate(m[4]),
        rates: { m3: rate(r?.[1]), m6: rate(r?.[2]), m12: rate(r?.[3]) },
      }
      return true
    }
    case 'months': {
      const t = firstTable(bs)
      if (!t) return false
      const [mo, inc, sp, net, rt, nw] = [
        column(t, 'Month'),
        column(t, 'Income'),
        column(t, 'Spending'),
        column(t, 'Net'),
        column(t, 'Savings rate'),
        column(t, 'Net worth'),
      ]
      report.months = t.rows
        .map((row): MonthRow | undefined => {
          const month = mo(row)?.trim()
          const income = num(inc(row))
          const spending = num(sp(row))
          if (!month || !/^\d{4}-\d{2}$/.test(month) || income === undefined || spending === undefined) return undefined
          return {
            month,
            income,
            spending,
            net: num(net(row)) ?? income - spending,
            rate: rate(rt(row)),
            netWorth: num(nw(row)) ?? null,
          }
        })
        .filter((r): r is MonthRow => !!r)
      return report.months.length > 0
    }
    case 'spending': {
      const t = firstTable(bs)
      if (!t) return /no spending/i.test(all)
      const [name, egp, last, typical] = [column(t, 'Category'), column(t, 'EGP'), column(t, 'Last month'), column(t, 'Typical')]
      for (const row of t.rows) {
        const amount = num(egp(row))
        const category = name(row)?.trim()
        if (!category || amount === undefined) continue
        const entry: CategoryRow = { name: category, amount, lastMonth: num(last(row)), typical: num(typical(row)) }
        if (amount < 0) report.moneyBack.push(entry)
        else report.categories.push(entry)
      }
      report.categories.sort((a, b) => b.amount - a.amount)
      return true
    }
    case 'budgets': {
      const t = firstTable(bs)
      if (!t) return /no budgets/i.test(all)
      const [cat, budget, spent] = [column(t, 'Category'), column(t, 'Budget'), column(t, 'Spent')]
      report.budgets = t.rows
        .map((row): BudgetRow | undefined => {
          const category = cat(row)?.trim()
          const b = num(budget(row))
          const s = num(spent(row))
          return category && b !== undefined && s !== undefined ? { category, budget: b, spent: s } : undefined
        })
        .filter((r): r is BudgetRow => !!r)
      return true
    }
    case 'subscriptions': {
      const m = new RegExp(String.raw`EGP\s+(${N})\s+a month for\s+(\d+)\s+active subscriptions?`, 'i').exec(all)
      if (!m) return false
      const changes = /Price changes:\s*(.+?)\.?\s*(?:$|\|)/i.exec(all)
      const list: Subscription[] = []
      const t = firstTable(bs)
      if (t) {
        const [name, cycle, monthly, next, change] = [
          column(t, 'Subscription', 'Name'),
          column(t, 'Cycle'),
          column(t, 'EGP a month', 'EGP'),
          column(t, 'Next'),
          column(t, 'Change'),
        ]
        for (const row of t.rows) {
          const n = name(row)?.trim()
          const amount = num(monthly(row))
          if (!n || amount === undefined) continue
          list.push({ name: n, cycle: cycle(row)?.trim() || '', monthly: amount, next: next(row)?.trim() || undefined, change: change(row)?.trim() || undefined })
        }
        list.sort((a, b) => b.monthly - a.monthly)
      }
      report.subscriptions = {
        monthly: num(m[1])!,
        count: Number(m[2]),
        priceChanges: changes ? changes[1].split(/,\s*/).map((s) => s.trim()).filter(Boolean) : [],
        list,
      }
      return true
    }
    case 'worth': {
      const part = (label: string) => num(new RegExp(String.raw`${label}\s+EGP\s+(${N})`, 'i').exec(all)?.[1])
      const net = part('Net')
      const cash = part('Cash')
      if (net === undefined || cash === undefined) return false
      const asOf = /\(on\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\)/i.exec(all)
      const accounts: Account[] = []
      const t = firstTable(bs)
      if (t) {
        const [name, kind, egp] = [column(t, 'Account'), column(t, 'Kind'), column(t, 'EGP')]
        for (const row of t.rows) {
          const n = name(row)?.trim()
          const amount = num(egp(row))
          if (n && amount !== undefined) accounts.push({ name: n, kind: kind(row)?.trim() || '', amount })
        }
      }
      report.netWorth = {
        cash,
        savings: part('Savings') ?? 0,
        investments: part('Investments') ?? 0,
        cards: Math.abs(part('Cards used') ?? 0),
        loans: Math.abs(part('Loans') ?? 0),
        net,
        asOf: asOf ? isoDate(asOf[1], report.month) : undefined,
        accounts,
      }
      return true
    }
    case 'forecast': {
      const t = firstTable(bs)
      const weeks: ForecastWeek[] = []
      if (t) {
        const [week, inflow, outflow, balance] = [column(t, 'Week'), column(t, 'In'), column(t, 'Out'), column(t, 'Balance')]
        for (const row of t.rows) {
          const w = week(row) ? isoDate(week(row)!, report.month, true) : undefined
          const [i, o, b] = [num(inflow(row)), num(outflow(row)), num(balance(row))]
          if (w && i !== undefined && o !== undefined && b !== undefined) weeks.push({ week: w, inflow: i, outflow: o, balance: b })
        }
      } else {
        const re = new RegExp(String.raw`Week of\s+(\d{1,2}\s+[A-Za-z]{3}):\s*in\s+(${N}),\s*out\s+(${N}),\s*balance\s+(${N})`, 'i')
        for (const item of listItems(bs)) {
          const m = re.exec(item)
          const w = m ? isoDate(m[1], report.month, true) : undefined
          if (m && w) weeks.push({ week: w, inflow: num(m[2])!, outflow: num(m[3])!, balance: num(m[4])! })
        }
      }
      report.forecast = weeks
      return weeks.length > 0
    }
    case 'freedom': {
      const pick = (re: RegExp) => re.exec(all)
      const f: Freedom = {
        target: num(pick(new RegExp(String.raw`Target\s+EGP\s+(${N})`, 'i'))?.[1]),
        yearlySpending: num(pick(new RegExp(String.raw`a year's spending,\s+EGP\s+(${N})`, 'i'))?.[1]),
        monthlySaving: num(pick(new RegExp(String.raw`Saving\s+EGP\s+(${N})\s+a month`, 'i'))?.[1]),
        months: num(pick(/From\s+(\d+)\s+month/i)?.[1]),
      }
      const saved = pick(new RegExp(String.raw`Saved and invested\s+EGP\s+(${N})\s*\((${N})%\)`, 'i'))
      if (saved) {
        f.saved = num(saved[1])
        f.progress = num(saved[2])
      }
      const years = pick(new RegExp(String.raw`about\s+(${N})\s+years to go at a\s+(${N})%\s+real return`, 'i'))
      if (years) {
        f.years = num(years[1])
        f.realReturn = num(years[2])
      } else if (/not enough to get there/i.test(all)) {
        f.years = null
      }
      if (f.target === undefined && f.saved === undefined) return false
      report.freedom = f
      return true
    }
    case 'shared': {
      const m = new RegExp(String.raw`^(.+?)\s+owes\s+EGP\s+(${N})`, 'i').exec(all.trim())
      if (!m) return false
      report.shared = { person: m[1].trim(), owes: num(m[2])! }
      return true
    }
    case 'largest': {
      const t = firstTable(bs)
      if (!t) return /none/i.test(all)
      const [date, what, category, egp] = [column(t, 'Date'), column(t, 'What'), column(t, 'Category'), column(t, 'EGP')]
      report.largest = t.rows
        .map((row): Transaction | undefined => {
          const amount = num(egp(row))
          const name = what(row)
          if (amount === undefined || !name) return undefined
          const dateText = date(row)?.trim() ?? ''
          return { date: isoDate(dateText, report.month), dateText, what: name, category: category(row)?.trim() ?? '', amount }
        })
        .filter((r): r is Transaction => !!r)
      return true
    }
    case 'quality': {
      const m = /(\d+)\s+transaction\(?s?\)?\s+waits?\s+for review,\s*(\d+)\s+of them from this month/i.exec(all)
      if (!m) return /all transactions reviewed/i.test(all)
      report.quality = { waiting: Number(m[1]), fromMonth: Number(m[2]) }
      return true
    }
    case 'adjustments': {
      report.adjustments = listItems(bs)
      return report.adjustments.length > 0 || /none/i.test(all) || !all.trim()
    }
    case 'commentary': {
      report.commentary = readCommentary(bs)
      return true
    }
    case 'notes': {
      report.myNotes = markdown
      return true
    }
  }
}

function readCommentary(bs: Block[]): Commentary | undefined {
  const summary: string[] = []
  const steps: CommentaryStep[] = []
  for (const b of bs) {
    if (b.type === 'paragraph' || b.type === 'quote') summary.push(b.text)
    else if (b.type === 'list') {
      for (const item of b.items) {
        const m = /^([A-Za-z][A-Za-z &'’-]{1,40}?):\s+(.+)$/.exec(item)
        if (m) steps.push({ label: m[1].trim(), text: m[2].trim(), section: STEP_NAMES.find(([re]) => re.test(m[1].trim()))?.[1] })
        else steps.push({ label: '', text: item })
      }
    }
  }
  const meaningful = summary.filter((s) => !PLACEHOLDER.test(s.trim()))
  if (!meaningful.length && !steps.length) return undefined
  return { summary: meaningful, steps }
}
