// What the reader takes from a finance report note. Amounts are EGP; dates are
// ISO (YYYY-MM-DD). Anything a report doesn't carry is left undefined or empty.

export type Format = 1 | 2

export type SectionKey =
  | 'summary'
  | 'months'
  | 'spending'
  | 'budgets'
  | 'subscriptions'
  | 'worth'
  | 'forecast'
  | 'freedom'
  | 'shared'
  | 'largest'
  | 'quality'
  | 'adjustments'
  | 'commentary'
  | 'notes'

export interface Summary {
  income: number
  spending: number
  net: number
  rate: number | null
  rates: { m3: number | null; m6: number | null; m12: number | null }
}

export interface MonthRow {
  month: string // YYYY-MM
  income: number
  spending: number
  net: number
  rate: number | null
  netWorth: number | null
}

export interface CategoryRow {
  name: string
  amount: number // negative for money back (refunds, cashback)
  lastMonth?: number
  typical?: number
}

export interface BudgetRow {
  category: string
  budget: number
  spent: number
}

export interface Subscription {
  name: string
  cycle: string
  monthly: number
  next?: string
  change?: string
}

export interface Subscriptions {
  monthly: number
  count: number
  priceChanges: string[]
  list: Subscription[]
}

export interface Account {
  name: string
  kind: string
  amount: number // owed amounts negative
}

export interface NetWorth {
  cash: number
  savings: number
  investments: number
  cards: number // used on cards, positive
  loans: number // left on loans, positive
  net: number
  asOf?: string
  accounts: Account[]
}

export interface ForecastWeek {
  week: string // Monday
  inflow: number
  outflow: number
  balance: number
}

export interface Freedom {
  target?: number
  yearlySpending?: number
  saved?: number
  progress?: number
  monthlySaving?: number
  years?: number | null // null: not enough saving to get there
  realReturn?: number
  months?: number
}

export interface Shared {
  person: string
  owes: number
}

export interface Transaction {
  date?: string
  dateText: string
  what: string
  category: string
  amount: number
}

export interface DataQuality {
  waiting: number
  fromMonth: number
}

export interface CommentaryStep {
  label: string
  text: string
  section?: SectionKey
}

export interface Commentary {
  summary: string[]
  steps: CommentaryStep[]
}

export interface ExtraSection {
  heading: string
  markdown: string
}

export interface Report {
  format: Format
  month: string // YYYY-MM
  status?: 'final' | 'draft'
  closed?: string
  currency: string
  summary?: Summary
  months: MonthRow[]
  categories: CategoryRow[] // spending, largest first
  moneyBack: CategoryRow[] // negative rows
  budgets: BudgetRow[]
  subscriptions?: Subscriptions
  netWorth?: NetWorth
  forecast: ForecastWeek[]
  freedom?: Freedom
  shared?: Shared
  largest: Transaction[]
  quality?: DataQuality
  adjustments: string[]
  commentary?: Commentary // undefined while it's missing or still the placeholder
  myNotes?: string
  extra: ExtraSection[] // sections this reader doesn't know
  present: SectionKey[] // sections found in the note
  warnings: string[]
}

export type ReadResult = { kind: 'report'; report: Report } | { kind: 'not-report' }
