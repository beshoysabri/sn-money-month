import { useId, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { amount, compact, day } from '../../lib/format'
import { usePrivacy } from '../../lib/privacy'
import type { ForecastWeek } from '../../lib/report/types'
import { linear, niceTicks } from '../../lib/scale'
import { useWidth } from './useWidth'

const H = 190
const PAD = { left: 46, right: 10, top: 16, bottom: 24 }

/**
 * The projected balance (cash minus card debt) as a step line: each week holds
 * its balance across its own width. The accent above zero, the attention colour
 * below; the low point is labelled. Tap a week, or use the arrow keys, to read
 * its numbers above the chart, where a finger doesn't cover them.
 */
export function ForecastChart({ weeks, label }: { weeks: ForecastWeek[]; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [selected, setSelected] = useState<number | null>(null)
  const hidden = usePrivacy()
  const clip = useId().replace(/:/g, '')
  const n = weeks.length
  if (!n) return null

  const balances = weeks.map((w) => w.balance)
  const ticks = niceTicks(Math.min(0, ...balances), Math.max(0, ...balances), 4)
  const y = linear(ticks[ticks.length - 1], ticks[0], PAD.top, H - PAD.bottom)
  const band = (width - PAD.left - PAD.right) / n
  const x = (i: number) => PAD.left + i * band
  const zero = y(0)

  let line = `M ${x(0)} ${y(balances[0])}`
  balances.forEach((b, i) => {
    line += ` V ${y(b)} H ${x(i + 1)}`
  })
  const area = `${line} V ${zero} H ${x(0)} Z`
  const low = balances.indexOf(Math.min(...balances))
  const lowX = x(low) + band / 2
  const lowY = y(balances[low])
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor((width - PAD.left) / 58))))
  const show = (v: number) => amount(v, { currency: false, hidden })
  const pick = (i: number) => setSelected(Math.max(0, Math.min(n - 1, i)))

  const onClick = (e: MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    pick(Math.floor((e.clientX - box.left - PAD.left) / band))
  }
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      pick((selected ?? (e.key === 'ArrowRight' ? -1 : n)) + (e.key === 'ArrowRight' ? 1 : -1))
    } else if (e.key === 'Home') pick(0)
    else if (e.key === 'End') pick(n - 1)
    else if (e.key === 'Escape') setSelected(null)
  }
  const week = selected !== null ? weeks[selected] : undefined

  return (
    <figure className="chart-figure">
      <div className="readout" aria-live="polite">
        {week ? (
          <>
            Week of <b>{day(week.week)}</b> · in <b>{show(week.inflow)}</b> · out <b>{show(week.outflow)}</b> · balance{' '}
            <b>{show(week.balance)}</b>
          </>
        ) : (
          'Tap a week for its numbers'
        )}
      </div>
      <div ref={ref} className="plot">
        <svg
          className="chart"
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          role="img"
          aria-label={label}
          tabIndex={0}
          onClick={onClick}
          onKeyDown={onKey}
        >
          <defs>
            <clipPath id={`${clip}-above`}>
              <rect x={0} y={0} width={width} height={Math.max(0, zero)} />
            </clipPath>
            <clipPath id={`${clip}-below`}>
              <rect x={0} y={zero} width={width} height={Math.max(0, H - zero)} />
            </clipPath>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? 'zero' : 'grid'} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="tick" x={PAD.left - 6} y={y(t) + 4} textAnchor="end">
                {hidden && t !== 0 ? '' : compact(t)}
              </text>
            </g>
          ))}
          {week && <rect className="select" x={x(selected!)} y={PAD.top} width={band} height={H - PAD.top - PAD.bottom} />}
          <path className="area-good" d={area} clipPath={`url(#${clip}-above)`} />
          <path className="area-bad" d={area} clipPath={`url(#${clip}-below)`} />
          <path className="line-good" d={line} clipPath={`url(#${clip}-above)`} />
          <path className="line-bad" d={line} clipPath={`url(#${clip}-below)`} />
          <line className="zero" x1={PAD.left} x2={width - PAD.right} y1={zero} y2={zero} />
          <circle className={balances[low] < 0 ? 'dot-bad' : 'dot-good'} cx={lowX} cy={lowY} r={4.5} />
          <text
            className="callout"
            x={lowX + (lowX > width - 90 ? -8 : 8)}
            y={lowY + 18 <= H - PAD.bottom ? lowY + 18 : lowY - 10}
            textAnchor={lowX > width - 90 ? 'end' : 'start'}
          >
            Low {hidden ? '' : compact(balances[low])}
          </text>
          {weeks.map((w, i) =>
            i % labelEvery === 0 ? (
              <text key={w.week} className="tick" x={x(i) + 2} y={H - 6}>
                {day(w.week)}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </figure>
  )
}
