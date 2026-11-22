# Build notes

The spec in Notion is the source of truth:
[Finance report editor for Standard Notes — build spec v1](https://app.notion.com/p/42095c93e7ac817e8acce00e1fc64bf3)
(research: [Nov 2026](https://app.notion.com/p/42095c93e7ac811b9887e5e17326c27a)). This file records what
the spec doesn't: how the code is laid out, decisions taken during the build, and where each phase stands.
Newest decisions first.

## Layout

- `src/lib/sn/bridge.ts`: Standard Notes' component protocol, created at module load in `main.tsx`.
  An external store for `useSyncExternalStore`: registration, the open note, component data.
- `src/lib/report/read.ts`: a report note (format 1 or 2) to a `Report` plus warnings, section by section.
  `types.ts` is the model; `insights.ts` computes every sentence and flag from it (phrased in code).
- `src/lib/markdown.ts`: the block reader shared by the report reader and the text views; inline text
  stays literal.
- `src/lib/format.ts`: the one formatter (money, percent, shares, axis labels, dates) and the privacy mask.
- `src/lib/theme.ts`: dark or light from the theme's background luminance; the accent clash guard.
- `src/components/`: the header and `ReportView`, one file per group of sections, hand-written charts.
- `src/test/fakeStandardNotes.ts`: the one test seam, a fake Standard Notes host.
- `scripts/import-file.mjs`: wraps a report in a Standard Notes backup file that opens in Money Month.

## Decisions during the build

- 2026-11-22 · **Charts are hand-written, recharts isn't used.** The spec allowed it: the forecast is a step
  line drawn at the pane's real width (no `preserveAspectRatio` stretching, the bug behind Goal Tracker's
  chart rewrites), with tap and arrow-key reading. The whole app is 90 KB gzipped, well inside Standard Notes'
  4-second load deadline.
- 2026-11-22 · **Standard Notes backups are imported under Preferences › Backups › Import backup.** The account
  menu's Import only converts other apps' files (and Markdown into Super), so the import file goes there.
- 2026-11-22 · **GitHub Pages must keep sending `Access-Control-Allow-Origin: *`** (it does). Standard Notes
  sandboxes the editor without `allow-same-origin`, so the page's origin is `null` and its module script and
  stylesheet load in CORS mode; a host without that header shows a blank editor.
- 2026-11-22 · **Content-Security-Policy** in the built page only (Vite's dev server needs inline scripts):
  `connect-src 'none'`; styles and fonts from http, https and data so Standard Notes' themes still load
  (https on the web, http://127.0.0.1 on desktop, data: on phones).
- 2026-11-22 · **Commentary, top to bottom** (Beesho's answer): its paragraphs are the summary, and each
  bullet that starts with a part's name and a colon ("Budgets: …") is a step, listed in In brief and shown
  under its section. The money-review skill in Notion was changed the same day to write it that way.
- 2026-11-22 · **Shares are recomputed from amounts** ("<1%" instead of 0%). With refunds in the total they
  can't add up to exactly 100%, so no rounding trick is applied.
- 2026-11-22 · **Fonts.** Source Serif 4 is bundled for titles (only the Latin subset loads, about 51 KB). The
  sans is the theme's or the system's (Inter first, as in his themes); nothing comes from a font service.
- 2026-11-22 · **Saving.** The bridge saves only for a user action, only into the open note, never into a
  locked one, and never queues before a note arrives. Today the one write is pasting a report into an empty
  note; My notes (phase 4) will be the second.

## Phases

0. Foundations: built 2026-11-22 (repository, CI, manifests, bridge, theme tokens, demo report, Text view, CSP).
1. Format 1, first screen: built 2026-11-22.
2. Format 1, the rest: built 2026-11-22 (net worth, weeks ahead, financial freedom, subscriptions, shared
   costs, two columns from 1000 px, forecast table). Copy as text is still to do.
3. Format 2: the editor reads it already (tested on a made-up report); the finance side waits for
   1 December (Beesho's choice).
4. My notes and polish: not started.

Checked on 2026-11-22 against the real September and October reports (kept out of the repository): every
section read, no warnings, rendered inside a fake Standard Notes host in Chromium with Levanta Light and Dark.
