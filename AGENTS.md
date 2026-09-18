# AGENTS.md

## What this is

Single-file Markdown → Slack converter: `scripts/index.ts` exports `toSlack()`
(mrkdwn) and `toHtml()` (what Slack's rich composer reads). No build step, no
runtime dependencies — Node 26+ runs the `.ts` files directly via type
stripping. The CLI entry (`main()`) lives at the bottom of that same file,
guarded by a `realpathSync(argv[1])` comparison (npx runs it through a symlink).

## Commands

```bash
npm run typecheck        # tsc --noEmit
npm test                 # node test.ts && node evals/check.ts
node evals/check.ts      # evals only
node scripts/index.ts --no-copy msg.md   # run the CLI without touching the clipboard
```

`--no-copy` prints on any platform; the clipboard write itself is macOS-only
(through `osascript`, because `pbcopy` can't carry HTML).

## Conventions

- **Always work in a git worktree** (`git worktree add ../slack-copy-<branch>`),
  never directly in the main checkout.
- **A new behaviour = one new row in `evals/cases.json`** (id `SLACK-XX` + a
  one-line `comment`), not new test code. If you change converter behaviour,
  update the pinned rows in the same commit or the suite fails. Inline asserts
  in `test.ts` cover the rest; keep both in sync with `references/conversions.md`.
- The converter is hand-rolled regex on purpose (block pass + inline pass) —
  don't add a markdown-parsing dependency.
- Emphasis is emitted via `\x00`/`\x01` sentinels and swapped for `*`/`_` at
  the end, so the italic rule can't re-match bold output. Preserve this when
  editing `formatRun`/`inlineHtmlRun`.

## Gotchas

- CI (`.github/workflows/evals.yml`) runs typecheck + tests on every PR; node
  26 is pinned there and in `engines`.
- README says `node evals/check.js` and "Node.js 18+" — stale; the file is
  `evals/check.ts` and Node 26 is the real floor (it's what allows running TS
  directly).
- `tsconfig.json` `include` is only `scripts` + `test.ts`: `evals/check.ts` is
  **not** typechecked, so run `node evals/check.ts` to catch errors there.
