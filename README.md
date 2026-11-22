# Money Month for Standard Notes

A Standard Notes editor that turns a monthly finance report into a calm, phone-first visual report:
the month's verdict first, then where the money went, budgets, the weeks ahead, net worth and
progress toward financial freedom, each as the chart that suits it, with the exact numbers one tap away.

It reads the Markdown reports written by a personal finance system (one note per month) and never
changes a number. Amounts can be hidden with one tap, and the editor makes no network requests.

## Install

In Standard Notes: **Preferences › Plugins › Install Custom Plugin**, then paste

```
https://beshoysabri.github.io/sn-money-month/ext.json
```

The web app can't fetch from github.io; there, use
`https://raw.githubusercontent.com/beshoysabri/sn-money-month/main/public/ext.json`.

## Getting a report in

- **Import file:** `node scripts/import-file.mjs finance-report-2026-10.md > finance-report-2026-10.json`,
  then **Preferences › Backups › Import backup**. The note arrives already opening in Money Month.
- **Paste:** make a new note, switch it to Money Month, and paste the report's text into the box.

Importing the `.md` file itself turns it into a Super note when the account has Super, and Super notes
always open in Super.

## Development

```
npm install
npm run dev      # the editor with a made-up demo report at http://localhost:5173
npm test         # Vitest, through a fake Standard Notes host
npm run lint
npm run build
```

To try a local build inside Standard Notes, install `public/ext.dev.json` while `npm run dev` runs.
Pushing `main` deploys to GitHub Pages.

Every number in this repository (the demo report, the tests, the screenshots) is made up.

## License

MIT © 2026 Beshoy Sabri
