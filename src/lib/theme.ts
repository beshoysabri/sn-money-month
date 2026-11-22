// Standard Notes never says whether its theme is dark: infer it from the
// background's luminance (an empty theme list means the default light theme).
// The accent marks good news and #D55E00 marks attention; if a theme's accent
// is too close to that orange (Futura's info colour is orange), good news
// switches to a fixed blue.

const ATTENTION: [number, number, number] = [0xd5, 0x5e, 0x00]

function rgb(color: string, doc: Document): [number, number, number] | undefined {
  if (!color) return undefined
  const probe = doc.createElement('div')
  probe.style.color = color
  probe.style.display = 'none'
  doc.body.appendChild(probe)
  const computed = doc.defaultView?.getComputedStyle(probe).color ?? ''
  probe.remove()
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(computed)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : undefined
}

function linear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function oklab([r, g, b]: [number, number, number]): [number, number, number] {
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

export interface ThemeFacts {
  dark: boolean
  accentClash: boolean
}

export function readTheme(doc: Document = document): ThemeFacts {
  const vars = doc.defaultView?.getComputedStyle(doc.documentElement)
  const bg = rgb(vars?.getPropertyValue('--sn-stylekit-background-color').trim() ?? '', doc)
  const accent = rgb(vars?.getPropertyValue('--sn-stylekit-info-color').trim() ?? '', doc)
  const dark = bg ? (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]) / 255 < 0.5 : false
  let accentClash = false
  if (accent) {
    const [a, b] = [oklab(accent), oklab(ATTENTION)]
    accentClash = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 100 < 15
  }
  return { dark, accentClash }
}

export function applyTheme(facts: ThemeFacts, root: HTMLElement = document.documentElement): void {
  root.toggleAttribute('data-mm-dark', facts.dark)
  root.toggleAttribute('data-mm-accent-clash', facts.accentClash)
}
