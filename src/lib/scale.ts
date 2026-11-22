/** Round tick values covering [lo, hi], about `count` of them (always includes the ends). */
export function niceTicks(lo: number, hi: number, count: number): number[] {
  if (lo === hi) {
    const pad = Math.abs(lo) || 1
    lo -= pad
    hi += pad
  }
  const raw = (hi - lo) / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((f) => f * magnitude).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 1e6; v += step) ticks.push(Math.round(v / step) * step)
  return ticks
}

/** Linear map from a domain to a range. */
export function linear(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  const span = d1 - d0 || 1
  return (v) => r0 + ((v - d0) / span) * (r1 - r0)
}
