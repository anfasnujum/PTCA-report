# Page break removal — plan and postmortem

## Problem

`PtcaReportLayout.tsx` unconditionally wrapped the "PROCEDURE:" section in a
`report-page-break` div, forcing a page break before it in print/PDF and the
`.docx` export on every PTCA report, regardless of whether the content
actually needed one.

This needed two coordinated fixes, not one: once a report is opened in "Edit
in place" and touched at all, the entire rendered DOM (including that
hardcoded break) gets frozen into `Procedure.docOverride` — a raw HTML string
that from then on replaces the live component render entirely. Editing the
component alone would only fix brand-new/regenerated reports; every
already-edited report would keep the break baked into its saved HTML forever.
Clearing `docOverride` via the existing `regenerate()` action would fix that,
but wipes all of the user's manual edits, which was explicitly ruled out.

The user-facing "Insert page break" toolbar button (`applyPageBreak()` in
`PreviewPage.tsx`, which inserts a bare `<hr class="report-page-break">` at
the cursor) is a deliberate, kept feature — never touched by this work. It's
distinguishable from the hardcoded break by tag: the hardcoded one is always
a `<div class="report-page-break">`, the manual one always an
`<hr class="report-page-break">`.

## Part A — stop new occurrences

`src/components/preview/PtcaReportLayout.tsx`: dropped the `className`
from the wrapper `<div>` around the PROCEDURE section (kept as a bare `<div>`,
not a fragment, since the parent's `space-y-3` would otherwise spread the
inner paragraphs apart). Fixes all future renders and anything later
regenerated. `src/index.css`'s `.report-page-break` rules and
`reportDocx.ts`'s `isPageBreak()`/`REPORT_PAGE_BREAK_CLASS` were deliberately
left untouched, since they still serve the manual insert-a-break feature.

## Part B — fix already-saved `docOverride` strings

Data lives in S3 (`cathnote-bucket-verc-...`, `cathnote/procedures/<id>.json`,
one JSON object per procedure, `docOverride` included), synced from each
device's local IndexedDB whenever that device has S3 credentials configured.
Rather than a client-side Dexie migration (which only self-heals one device
at a time, as each opens the app), we ran a one-time script directly against
S3: `scripts/migrate-strip-page-breaks.mjs`.

It uses the AWS CLI (`aws s3api ...`) under the local `default` profile
rather than embedding a raw access key/secret anywhere. For every
`docOverride` containing `<div class="report-page-break">...</div>`, it
unwraps just that div (regex-based — the wrapper's content is known to be
flat `<p>` tags with no nesting, so a non-greedy match is safe), leaving any
`<hr class="report-page-break">` untouched, backs up the original object to
`scripts/migration-backups/` (git-ignored — contains patient data) before
overwriting, and bumps `updatedAt` on any row it actually changes so the fix
wins the next sync comparison on every other device rather than being
silently overwritten by a stale pull.

First run: 81 procedures scanned, 27 fixed.

## The real bug underneath: browser HTTP caching of S3 reads

After the first migration, one report (`8268097a-...`) kept showing the break
on the live site despite S3 being verified clean, even after "sync" reported
OK and a reload. Diagnosis (temporary console logging added to `load()` and
`runFullSync`, since removed):

- Local dev (a fresh browser origin, never fetched these URLs before) read
  the correct, already-fixed data immediately.
- The live site (a browser that had loaded these reports many times before)
  kept reading stale, pre-migration content — same bucket, same prefix, same
  key, confirmed by direct comparison.

Root cause: S3 objects here carry no `Cache-Control` header, and `aws4fetch`
signs requests via the `Authorization` header rather than a query string, so
every GET to the same procedure key is a byte-identical URL across requests.
A browser that fetched it once is free to keep serving that same cached
response on every later sync pull, indefinitely, per the HTTP spec's
heuristic-freshness rules — even though the underlying object changed.

Fix: `src/lib/s3Client.ts` — added `cache: 'no-store'` to both `s3GetJson`
and `s3ListKeys`, forcing a real network request every time. This is a
standing correctness fix for the sync layer, not just a one-off patch for
this incident.

## Regression: edits made while the caching bug was still live

Two procedures (`74fc32b9-...`, `8014e442-...`) were legitimately re-edited
*after* the first migration but *before* the cache fix shipped — on a browser
that was still reading stale (pre-migration) content due to the caching bug.
Those saves correctly won the last-write-wins sync comparison (they were
genuinely newer edits), which meant they re-introduced the hardcoded div
along with whatever real edits were made. This wasn't a bug in the sync
logic — it behaved correctly; the "newer" version was itself corrupted by
the caching bug being active at the time it was saved.

Re-ran `scripts/migrate-strip-page-breaks.mjs --write` after the cache fix
was live, which found and fixed exactly these 2, confirmed clean afterward.
With the cache fix in place, this specific failure mode shouldn't recur.

## Branches/PRs, in order

1. `fix/remove-hardcoded-page-break` — Part A + the migration script.
2. `fix/guide-catheter-type-errors` — an unrelated, pre-existing `tsc -b`
   failure (from 10 days prior) that had been silently blocking every
   production deploy; found while checking that this work's own deploy
   succeeded.
3. `debug/stale-sync-diagnostics` — temporary diagnostics, then the real
   `cache: 'no-store'` fix, committed on the same branch.
4. `chore/remove-sync-debug-logging` — removes the temporary diagnostics
   added in (3); this didn't make it into that PR because it was merged
   before this follow-up commit was pushed.

## Verification

- `npm run test` and `tsc -b` clean; full `vite build` succeeds.
- Migration script's dry-run mode reviewed before every `--write` run.
- Spot-checked individual S3 objects directly (`aws s3api get-object`)
  before and after each write, rather than trusting the app's own UI alone.
- Confirmed the manual "Insert page break" toolbar feature and its `<hr>`
  markup were never touched by any of the above.
