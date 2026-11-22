#!/usr/bin/env node
// Wraps a finance report (Markdown) in a Standard Notes backup file holding one
// note that opens in Money Month, so the report never passes through Super.
// Import it in Standard Notes under Preferences › Backups › Import backup.
//
//   node scripts/import-file.mjs finance-report-2026-10.md > finance-report-2026-10.json

import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

const EDITOR = 'com.beshoysabri.sn-money-month'

const [file] = process.argv.slice(2)
if (!file) {
  console.error('usage: node scripts/import-file.mjs <finance-report-YYYY-MM.md>')
  process.exit(2)
}
const text = readFileSync(file, 'utf8')
const month = /^#\s+Finance report\s+(\d{4}-\d{2})\s*$/m.exec(text)?.[1]
if (!month) {
  console.error(`${file} isn't a finance report: no "# Finance report YYYY-MM" line`)
  process.exit(1)
}

// The note list's preview line, like the editor's own.
const n = (s) => Number(s.replace(/,/g, ''))
const egp = (v) => `EGP ${Math.round(Math.abs(v)).toLocaleString('en-US')}`
const summary = /Income EGP ([-\d,.]+) · Spending EGP ([-\d,.]+) · Net EGP ([-\d,.]+) · Savings rate ([-\d.]+|–)%/.exec(text)
const preview = summary
  ? `${n(summary[3]) >= 0 ? `Kept ${egp(n(summary[3]))}` : `Overspent ${egp(n(summary[3]))}`} · spent ${egp(n(summary[2]))} · savings rate ${summary[4]}%`
  : `Finance report ${month}`

const now = new Date()
const iso = now.toISOString()
const micros = now.getTime() * 1000
const note = {
  uuid: randomUUID(),
  content_type: 'Note',
  created_at: iso,
  updated_at: iso,
  created_at_timestamp: micros,
  updated_at_timestamp: micros,
  content: {
    title: `Finance report ${month}`,
    text,
    references: [],
    noteType: 'markdown',
    editorIdentifier: EDITOR,
    preview_plain: preview,
    spellcheck: false,
    appData: { 'org.standardnotes.sn': { client_updated_at: iso } },
  },
}

process.stdout.write(`${JSON.stringify({ version: '004', items: [note] }, null, 2)}\n`)
