# Steady — Fitness Health PWA

Steady is a private, local-first PWA for executing the approved September 7–December 13, 2026 half-marathon plan, maintaining an ongoing full-body strength rhythm, cooking more home meals, and using fresh groceries without calorie counting or excessive data entry.

The complete product requirements and implementation handoff remain in [DESIGN.md](./DESIGN.md).

## Included

- Exact 14-week running plan plus perpetual twice-weekly strength scheduling, flexible within-week rescheduling, waiting/skipped states, and honest adherence denominators
- One-field run completion plus default, machine-only, and resistance-band strength templates with full previews on the chooser, direct-to-warm-up starts, free exercise ordering, recoverable drafts, and explicit cancellation
- Deterministic double progression based on completed set history
- One-tap, time-aware Breakfast/Work Lunch/Dinner tracking alongside a batch-entry Fresh List, Use Soon actions, Saved Dishes, local matching, and manual ChatGPT prompt handoff
- Weekly adherence, planned-versus-actual mileage, strength history, meal counts, weight trend, and optional waist entries
- IndexedDB persistence, versioned Zod-validated backup/restore, offline app shell, install manifest, and update prompt
- GitHub Pages deployment workflow that runs tests and a production build first

Calendar/ICS reminders, receipt-text parsing, and a future post-race running plan remain in the design’s intentionally deferred enhancement phase.

## Development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Run the verification suite and create the production PWA bundle with:

```sh
npm test
npm run build
```

The Vite base is relative and navigation uses URL hashes, so the generated `dist` directory works from a GitHub Pages project subpath.

## Data and privacy

All personal records are stored in IndexedDB on the current device. There is no account, analytics, backend, OpenAI API key, or automatic cloud sync. Clearing browser/site data can erase the database, so Settings includes JSON backup export, validation, preview, and confirmed restore.
