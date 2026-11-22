import { linear } from '../../lib/scale'

/** A word-sized trend: the months in the neutral ink, the last one marked in the accent. */
export function Sparkline({ values, zero = false, label }: { values: number[]; zero?: boolean; label: string }) {
  if (values.length < 2) return null
  const W = 84
  const H = 24
  const lo = Math.min(...values, ...(zero ? [0] : []))
  const hi = Math.max(...values, ...(zero ? [0] : []))
  const x = linear(0, values.length - 1, 3, W - 3)
  const y = linear(lo, hi, H - 3, 3)
  return (
    <svg className="spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {zero && <line className="grid" x1={0} x2={W} y1={y(0)} y2={y(0)} />}
      <polyline className="spark-line" points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      <circle className="dot-good" cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={3} />
    </svg>
  )
}
