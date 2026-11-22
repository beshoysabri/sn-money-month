// A small block reader for the Markdown the finance system writes. Inline text
// stays literal: the archive writes plain text, and masked names such as
// "H****" must not turn into emphasis.

export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'code'; text: string }

const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/
const BULLET = /^\s*[-*+]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/

export function normalize(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
}

/** Drops Markdown escapes ("H\*\*\*" after a round trip through Super) but keeps the characters. */
export function unescape(text: string): string {
  return text.replace(/\\([\\`*_{}[\]()#+\-.!|~>])/g, '$1')
}

/** Cells of a table row; `\|` is a literal pipe. */
export function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') {
      cell += '\\|'
      i++
    } else if (s[i] === '|') {
      cells.push(unescape(cell.trim()))
      cell = ''
    } else {
      cell += s[i]
    }
  }
  cells.push(unescape(cell.trim()))
  return cells
}

export function blocks(markdown: string): Block[] {
  const lines = normalize(markdown).split('\n')
  const out: Block[] = []
  let paragraph: string[] = []
  const flush = () => {
    if (paragraph.length) out.push({ type: 'paragraph', text: unescape(paragraph.join(' ')) })
    paragraph = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) {
      flush()
      continue
    }
    if (trimmed.startsWith('```')) {
      flush()
      const code: string[] = []
      for (i++; i < lines.length && !lines[i].trim().startsWith('```'); i++) code.push(lines[i])
      out.push({ type: 'code', text: code.join('\n') })
      continue
    }
    if (trimmed.startsWith('|') && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      flush()
      const header = splitRow(trimmed)
      const rows: string[][] = []
      for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) rows.push(splitRow(lines[i]))
      i--
      out.push({ type: 'table', header, rows })
      continue
    }
    const heading = HEADING.exec(trimmed)
    if (heading) {
      flush()
      out.push({ type: 'heading', level: heading[1].length, text: heading[2] })
      continue
    }
    const bullet = BULLET.exec(line)
    const numbered = bullet ? null : NUMBERED.exec(line)
    if (bullet || numbered) {
      flush()
      const ordered = !bullet
      const items: string[] = []
      for (; i < lines.length; i++) {
        const m = (ordered ? NUMBERED : BULLET).exec(lines[i])
        if (m) items.push(m[1].trim())
        else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) items[items.length - 1] += ' ' + lines[i].trim()
        else break
      }
      i--
      out.push({ type: 'list', ordered, items: items.map(unescape) })
      continue
    }
    if (trimmed.startsWith('>')) {
      flush()
      const quote: string[] = []
      for (; i < lines.length && lines[i].trim().startsWith('>'); i++) quote.push(lines[i].trim().replace(/^>\s?/, ''))
      i--
      out.push({ type: 'quote', text: unescape(quote.join(' ')) })
      continue
    }
    paragraph.push(trimmed)
  }
  flush()
  return out
}
