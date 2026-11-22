import type { Report, SectionKey } from './report/types'

/** The element id each part of the report renders with. */
const SECTION_IDS: Partial<Record<SectionKey, string>> = {
  summary: 'month',
  spending: 'spending',
  budgets: 'budgets',
  forecast: 'forecast',
  worth: 'worth',
  freedom: 'freedom',
  subscriptions: 'subscriptions',
  shared: 'shared',
  largest: 'largest',
  quality: 'about',
  adjustments: 'about',
}

export function jumpTo(section: SectionKey | string): void {
  const id = SECTION_IDS[section as SectionKey] ?? section
  const el = document.getElementById(id)
  if (!el) return
  const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView?.({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
}

export function chipsFor(report: Report): { id: string; label: string }[] {
  const chips = [{ id: 'month', label: 'Month' }]
  if (report.categories.length) chips.push({ id: 'spending', label: 'Spending' })
  if (report.present.includes('budgets')) chips.push({ id: 'budgets', label: 'Budgets' })
  if (report.forecast.length) chips.push({ id: 'forecast', label: 'Weeks ahead' })
  if (report.netWorth) chips.push({ id: 'worth', label: 'Net worth' })
  if (report.freedom) chips.push({ id: 'freedom', label: 'Freedom' })
  if (report.subscriptions) chips.push({ id: 'subscriptions', label: 'Subscriptions' })
  if (report.shared) chips.push({ id: 'shared', label: 'Shared' })
  if (report.largest.length) chips.push({ id: 'largest', label: 'Largest' })
  chips.push({ id: 'about', label: 'About' })
  return chips
}
