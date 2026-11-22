// One place for how numbers, money and dates read. Privacy masking happens
// here too: a hidden amount keeps its currency and loses its digits.

export const MINUS = '−'
export const MASK = '•••'

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const cents = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export interface AmountOptions {
  cents?: boolean
  /** '+' for positives too (changes); default shows only a minus. */
  signed?: boolean
  currency?: boolean
  hidden?: boolean
}

/** "EGP 12,480", "−EGP 1,200", "+2,202", "EGP •••". */
export function amount(value: number, options: AmountOptions = {}): string {
  const { cents: withCents = false, signed = false, currency = true, hidden = false } = options
  const rounded = withCents ? Math.round(value * 100) / 100 : Math.round(value)
  const digits = hidden ? MASK : (withCents ? cents : whole).format(Math.abs(rounded))
  const sign = hidden ? '' : rounded < 0 ? MINUS : signed && rounded > 0 ? '+' : ''
  return `${sign}${currency ? 'EGP ' : ''}${digits}`
}

/** "16.8%", "−3.0%"; null → "–". */
export function percent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  const fixed = Math.abs(value).toFixed(digits)
  return `${value < 0 && Number(fixed) !== 0 ? MINUS : ''}${fixed}%`
}

/** A share of a total, 0 decimals, never rounded to a misleading 0% or 100%. */
export function share(part: number, total: number): string {
  if (!total) return ''
  const p = (part / total) * 100
  if (p > 0 && p < 0.5) return '<1%'
  if (p > 99.5 && p < 100) return '>99%'
  return `${p < 0 ? MINUS : ''}${Math.abs(Math.round(p))}%`
}

/** A change in a rate, in percentage points: "+2.1 pp", "−2.1 pp". */
export function points(value: number): string {
  const fixed = Math.abs(value).toFixed(1)
  return `${value < 0 ? MINUS : value > 0 ? '+' : ''}${fixed} pp`
}

/** Axis labels only: "12.5K", "−100K", "1.2M". */
export function compact(value: number): string {
  const a = Math.abs(value)
  const s =
    a >= 1e6 ? `${(a / 1e6).toFixed(1).replace(/\.0$/, '')}M` : a >= 1e3 ? `${(a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '')}K` : `${Math.round(a)}`
  return `${value < 0 && a >= 0.5 ? MINUS : ''}${s}`
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-10" → "October 2026". */
export function monthTitle(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[m - 1] ?? month} ${y}`
}

/** "2026-10" → "October". */
export function monthName(month: string): string {
  return MONTH_NAMES[Number(month.split('-')[1]) - 1] ?? month
}

/** The month before "2026-01" is "2025-12". */
export function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

/** "2026-11-16" → "16 Nov"; with year → "16 Nov 2026". */
export function day(iso: string, withYear = false): string {
  const [y, m, d] = iso.split('-').map(Number)
  const short = MONTH_NAMES[m - 1]?.slice(0, 3) ?? ''
  return `${d} ${short}${withYear ? ` ${y}` : ''}`
}
