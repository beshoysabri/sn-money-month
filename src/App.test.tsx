// Every test drives Money Month the way Standard Notes does (the fake host below)
// and checks what Beesho would see and what gets sent back. Reports are made up.

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import demo from './sample/demo-report.md?raw'
import { FakeStandardNotes } from './test/fakeStandardNotes'
import format2 from './test/fixtures/format2-report.md?raw'

let sn: FakeStandardNotes

beforeEach(() => {
  sn = new FakeStandardNotes()
})

afterEach(() => {
  cleanup()
  sn.dispose()
  vi.restoreAllMocks()
})

function open(text: string, options?: Parameters<FakeStandardNotes['openNote']>[1], componentData = {}) {
  render(<App bridge={sn.bridge} />)
  sn.register({ componentData })
  sn.openNote(text, options)
}

const section = (name: RegExp) => screen.getByRole('region', { name })

describe('talking to Standard Notes', () => {
  it('asks for the note once registered, with its session key', () => {
    render(<App bridge={sn.bridge} />)
    sn.register()
    expect(sn.sent.map((m) => m.action)).toEqual(['stream-context-item'])
    expect(sn.sent[0].sessionKey).toBe('session-1')
  })

  it('reads messages the phone apps send as JSON strings', () => {
    render(<App bridge={sn.bridge} />)
    sn.register({ asString: true })
    sn.openNote(demo)
    expect(screen.getByRole('heading', { level: 1, name: 'February 2027' })).toBeInTheDocument()
  })

  it('injects the theme stylesheets once, and again only when they change', () => {
    render(<App bridge={sn.bridge} />)
    sn.register({ themes: ['https://example.org/theme.css'] })
    expect(document.querySelectorAll('link[data-sn-theme]')).toHaveLength(1)
  })

  it('never saves when a report is only read, or when Standard Notes echoes a sync', () => {
    open(demo)
    sn.openNote(demo, { metadataOnly: true })
    expect(sn.saves()).toHaveLength(0)
  })

  it('makes no network requests', () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error('no network')))
    vi.stubGlobal('fetch', fetchSpy)
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    open(demo)
    vi.unstubAllGlobals()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
  })
})

describe('the month', () => {
  it('opens on what was kept and a sentence computed from the numbers', () => {
    open(demo)
    const month = section(/the month/i)
    expect(within(month).getByText('17,488')).toBeInTheDocument()
    expect(within(month).getByText('kept in February')).toBeInTheDocument()
    expect(month).toHaveTextContent('You kept 16.8% of what you earned, above your 3-month rate of 10.6%.')
  })

  it('says how much was overspent when spending beat income', () => {
    open(
      demo.replace(
        'Income EGP 104,000.00 · Spending EGP 86,512.40 · Net EGP 17,487.60 · Savings rate 16.8%',
        'Income EGP 100,408.12 · Spending EGP 110,767.55 · Net EGP -10,359.43 · Savings rate -10.3%',
      ),
    )
    const month = section(/the month/i)
    expect(within(month).getByText('overspent in February')).toBeInTheDocument()
    expect(month).toHaveTextContent('You spent EGP 10,359 more than you earned')
    expect(month).toHaveTextContent('Overspent 10,359')
  })

  it('lists what needs attention and jumps to it', async () => {
    open(demo)
    const rows = within(section(/needs attention/i)).getAllByRole('button')
    expect(rows.map((r) => r.textContent)).toEqual([
      'Shopping went over its budget by EGP 1,890, and 1 more',
      'Cash is tightest in the week of 15 Mar: −EGP 99,450',
      'Mona owes you EGP 3,750',
    ])
  })

  it('flags transactions still waiting for review', () => {
    open(demo)
    expect(screen.getByRole('button', { name: '2 to review' })).toBeInTheDocument()
  })
})

describe('commentary', () => {
  it('shows the summary first and the points step by step, each also under its section', async () => {
    open(demo)
    const brief = section(/in brief/i)
    expect(brief).toHaveTextContent('Written by Claude from the numbers in this report')
    await userEvent.click(within(brief).getByRole('button', { name: /read more · 7 points/i }))
    expect(within(brief).getAllByRole('listitem')).toHaveLength(7)
    expect(section(/8 of 10 budgets held/i)).toHaveTextContent('mostly one IKEA order of EGP 4,350 on 14 Feb')
  })

  it('leaves the card out while the commentary is still the placeholder', () => {
    open(format2)
    expect(screen.queryByRole('region', { name: /in brief/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/For Claude:/)).not.toBeInTheDocument()
  })
})

describe('spending and budgets', () => {
  it('sorts categories, shows shares, and keeps money back apart', async () => {
    open(demo)
    const spending = section(/where it went/i)
    const rows = within(spending).getAllByRole('button', { expanded: false }).filter((b) => b.classList.contains('crow'))
    expect(rows).toHaveLength(8)
    expect(rows[0]).toHaveTextContent('Rent & Housing')
    expect(rows[0]).toHaveTextContent('21%')
    expect(spending).toHaveTextContent('Money back: Refunds & Cashback EGP 925')
    await userEvent.click(within(spending).getByRole('button', { name: 'Show all 14 categories' }))
    expect(within(spending).getByText('Other')).toBeInTheDocument()
    expect(within(spending).getAllByText('<1%').length).toBeGreaterThan(0)
  })

  it('puts budgets that went over first, with how much', () => {
    open(demo)
    const budgets = section(/8 of 10 budgets held/i)
    expect(budgets).toHaveTextContent('Shopping went over by EGP 1,890 and Food & Dining by EGP 916.')
    const first = budgets.querySelector('.brow')!
    expect(first).toHaveTextContent('Shopping')
    expect(first).toHaveTextContent('6,890 of 5,000 · 138%')
    expect(first).toHaveTextContent('over by EGP 1,890')
    expect(budgets).toHaveTextContent('Spending with no budget: Rent & Housing 18,000')
  })

  it('keeps masked names as written, asterisks and all', async () => {
    open(demo)
    await userEvent.click(screen.getByRole('button', { name: 'Show all 10' }))
    expect(screen.getByText('M**** A****')).toBeInTheDocument()
  })

  it('reads names a round trip through Super escaped', async () => {
    open(demo.replace('| 09 Feb | M**** A**** |', '| 09 Feb | M\\*\\*\\*\\* A\\*\\*\\*\\* |'))
    await userEvent.click(screen.getByRole('button', { name: 'Show all 10' }))
    expect(screen.getByText('M**** A****')).toBeInTheDocument()
  })
})

describe('the rest of the report', () => {
  it('draws net worth from zero and says it plainly', () => {
    open(demo)
    const worth = section(/what you own and what you owe/i)
    expect(worth).toHaveTextContent('You owe EGP 209,350 more than you own.')
    expect(worth).toHaveTextContent('Balances on 1 Mar 2027.')
  })

  it('names the tightest week and shows the forecast as a table on request', async () => {
    open(demo)
    const weeks = section(/cash minus card debt/i)
    expect(weeks).toHaveTextContent('Lowest in the week of 15 Mar at −EGP 99,450.')
    await userEvent.click(within(weeks).getByRole('button', { name: 'Show as table' }))
    expect(within(weeks).getAllByRole('row')).toHaveLength(5)
  })

  it('turns financial freedom into a nearer milestone', () => {
    open(demo)
    const freedom = section(/financial freedom/i)
    expect(freedom).toHaveTextContent('Your savings cover about 2 weeks of spending.')
    expect(freedom).toHaveTextContent('Next: 1 month of spending')
    expect(freedom).toHaveTextContent('Financial freedom target EGP 26,250,000: 0.2% there, about 61 years')
  })

  it('shows subscriptions, shared costs and the largest transactions', () => {
    open(demo)
    expect(section(/a month/i)).toHaveTextContent('18 active subscriptions, 5% of income (EGP 68,277 a year). Price changes: Netflix Premium.')
    const shared = section(/splits not settled yet/i)
    expect(within(shared).getByText('Mona owes you')).toBeInTheDocument()
    expect(within(shared).getByText('EGP 3,750')).toBeInTheDocument()
    expect(section(/the 10 biggest/i)).toHaveTextContent('Together EGP 47,670, 55% of February’s spending.'.replace('’', "'"))
  })
})

describe('privacy', () => {
  it('hides every amount but keeps percentages, and remembers it across devices', async () => {
    open(demo)
    await userEvent.click(screen.getByRole('button', { name: 'Hide amounts' }))
    const month = section(/the month/i)
    expect(within(month).queryByText('17,488')).not.toBeInTheDocument()
    expect(month).toHaveTextContent('16.8%')
    expect(screen.getByText('Amounts hidden · percentages still show')).toBeInTheDocument()
    expect(sn.componentData()).toEqual([{ privacy: true }])
    expect(sn.saves()).toHaveLength(0)
  })

  it('starts hidden when the setting says so', () => {
    open(demo, undefined, { privacy: true })
    expect(within(section(/the month/i)).queryByText('17,488')).not.toBeInTheDocument()
  })
})

describe('notes that are not reports', () => {
  it('shows another note as text and never changes it', () => {
    open('Groceries\n\n- eggs\n- bread')
    expect(screen.getByRole('heading', { name: 'This note isn’t a finance report' })).toBeInTheDocument()
    expect(screen.getByText('eggs')).toBeInTheDocument()
    expect(sn.saves()).toHaveLength(0)
  })

  it('saves a pasted report into an empty note, with a preview line', async () => {
    open('')
    const box = screen.getByLabelText('Report text')
    await userEvent.click(box)
    await userEvent.paste(demo)
    await userEvent.click(screen.getByRole('button', { name: 'Use this report' }))
    const saves = sn.saves()
    expect(saves).toHaveLength(1)
    const item = (saves[0].data.items as { uuid: string; content: { text: string; preview_plain: string } }[])[0]
    expect(item.uuid).toBe('note-1')
    expect(item.content.text).toBe(demo)
    expect(item.content.preview_plain).toBe('Kept EGP 17,488 · spent EGP 86,512 · savings rate 16.8%')
    expect(screen.getByRole('heading', { level: 1, name: 'February 2027' })).toBeInTheDocument()
  })

  it('refuses text that is not a report', async () => {
    open('')
    await userEvent.click(screen.getByLabelText('Report text'))
    await userEvent.paste('hello')
    await userEvent.click(screen.getByRole('button', { name: 'Use this report' }))
    expect(screen.getByRole('alert')).toHaveTextContent('isn’t a finance report')
    expect(sn.saves()).toHaveLength(0)
  })

  it('offers no paste box in a locked note', () => {
    open('', { locked: true })
    expect(screen.getByText('This note is locked, so nothing can be pasted into it.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Report text')).not.toBeInTheDocument()
  })

  it('never saves into a note other than the open one', async () => {
    open('', { uuid: 'note-a' })
    sn.openNote(demo, { uuid: 'note-b' })
    expect(sn.bridge.save('note-a', 'stale text')).toBe(false)
    expect(sn.saves()).toHaveLength(0)
  })
})

describe('reading', () => {
  it('shows a section it cannot read as text, with a warning', () => {
    open(demo.replace('Cash EGP 6,850.00 · Savings', 'Cash about six thousand · Savings'))
    expect(screen.getByRole('region', { name: 'Net worth' })).toHaveTextContent('Cash about six thousand')
    expect(section(/notes on the data/i)).toHaveTextContent('Couldn’t read "Net worth"'.replace('’', "'"))
  })

  it('shows sections it does not know as they were written', () => {
    open(`${demo}\n## Notes from the bank\n\nThe card limit goes up in April.\n`)
    expect(screen.getByRole('region', { name: 'Notes from the bank' })).toHaveTextContent('The card limit goes up in April.')
  })

  it('reads Windows line endings and a byte-order mark', () => {
    open(`\uFEFF${demo.replace(/\n/g, '\r\n')}`)
    expect(screen.getByRole('heading', { level: 1, name: 'February 2027' })).toBeInTheDocument()
    expect(section(/the month/i)).toHaveTextContent('16.8%')
  })

  it('shows the note exactly as filed in the Text view', async () => {
    open(demo)
    await userEvent.click(screen.getByRole('button', { name: 'Text' }))
    expect(document.querySelector('pre.md')!.textContent).toBe(demo)
  })
})

describe('format 2', () => {
  it('compares with last month and shows the trend', () => {
    open(format2)
    expect(screen.getByText('Final report')).toBeInTheDocument()
    const month = section(/the month/i)
    expect(month).toHaveTextContent('Same as Jan')
    expect(month).toHaveTextContent('▲ 2,202 vs Jan')
    expect(month).toHaveTextContent('▼ 2.1 pp vs Jan')
    expect(section(/where it went/i)).toHaveTextContent('Shopping rose the most: EGP 3,690 more than in January.')
    expect(section(/what you own and what you owe/i)).toHaveTextContent('Up EGP 14,750 since January.')
  })

  it('reads all 13 forecast weeks and the subscription changes', async () => {
    open(format2)
    const weeks = section(/cash minus card debt, 13 weeks/i)
    expect(weeks).toHaveTextContent('above zero by the week of 24 May')
    expect(section(/a month/i)).toHaveTextContent('Netflix Premium changed price: 420.00 → 540.00')
  })
})
