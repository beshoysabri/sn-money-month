# Money Month for Standard Notes

A Standard Notes editor that turns a monthly finance report into a calm, phone-first visual report:
the month's verdict first, then where the money went, budgets, the weeks ahead, net worth and
progress toward financial freedom, each as the chart that suits it, with the exact numbers one tap away.

It reads the Markdown reports written by a personal finance system (one note per month) and never
changes a number. Amounts can be hidden with one tap, and the editor makes no network requests.

## Install

In the Standard Notes phone or desktop app: **Preferences › Plugins › Install Custom Plugin**, then paste

```
https://beshoysabri.github.io/sn-money-month/ext.json
```

Install it from the phone or desktop app; it then syncs to the web app. The web app can't install it
itself: it fetches plugin manifests with credentials, and GitHub's servers answer with a wildcard
`Access-Control-Allow-Origin`, which browsers refuse for such requests.

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
