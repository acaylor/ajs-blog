# AGENTS.md

This file provides guidance to coding agents working in this repository.

Notes for future agents working in this repo. The codebase is small enough that you can read the code; this file documents the parts that are not obvious from reading.

## What this is

A personal blog. Astro 6 + TypeScript, static content collections under `src/content/blog/`, built to `dist/`, served by nginx via a Docker image pushed to the GitLab Container Registry. CI runs on GitLab; PRs/MRs land on `main` and a production image is published on merge.

`docs/development.md` and `docs/deployment.md` cover the basics; this file covers the project-specific gotchas you cannot infer from the code.

## Toolchain

- Node 24 (`.nvmrc`)
- npm (lockfile committed)
- git LFS (required — see "Git LFS" below)
- lychee (Rust binary; install locally for link checks: `brew install lychee`)

## Running locally

```bash
npm install                # one-time
npm run dev                # http://localhost:4321 (and on LAN)
npm run build              # static build to dist/
npm run preview            # serves dist/ at 4321 (no dev toolbar)
```

## CI parity — run these before opening an MR

CI is split across two jobs. The exact commands you should run locally to match:

```bash
# what the `lint` CI job does
npm run lint               # eslint
npm run check              # astro check (TS + Astro diagnostics)
npm run format:check       # prettier

# what the `build_and_verify` CI job does
npm run build              # produces dist/
npm run a11y               # html-validate against dist/**/*.html
lychee --offline --root-dir "$PWD/dist" --config lychee.toml 'dist/**/*.html'
```

All six commands must exit clean. The lychee baseline (`lychee.toml` `exclude` list) is **empty** and should stay that way — fix the underlying link rather than add a suppression.

## Project layout

```
src/
  content/blog/        # markdown posts; `draft: true` excludes from build
  components/          # see "Design system" below
  layouts/             # BaseLayout (chrome), PostLayout (post grid + TOC)
  pages/               # routes
  styles/
    global.css         # dmesg tokens, font import, base elements, print
    patterns.css       # primitives (.banner, .module, .unit, .entry, etc.)
  utils/reading-time.ts
public/
  images/              # all images are LFS-tracked
mockups/               # gitignored — design source-of-truth, do not commit
docs/                  # contributor docs (development, deployment, migration)
```

## Design system: dmesg / boot-log

The site uses a "Linux boot log" visual direction. Tokens live in `src/styles/global.css`; primitives in `src/styles/patterns.css`. The contract:

- **Sharp corners everywhere.** No `border-radius` tokens. Adding rounded corners breaks the visual conceit.
- **DM Mono for the entire UI**, not just code. Loaded via `@fontsource/dm-mono`; preloaded in `BaseLayout.astro`. Ligatures off (`font-feature-settings: 'liga' 0`) so arrows in code render as literal `->` rather than the `→` glyph.
- **Amber accent with a WCAG split.** `--amber` (`#b56b00`) measures 3.85:1 on the light `--bg` — OK for status tags, hero prefixes, chip borders (3:1 large-text / UI threshold) but **not** for body text. `.prose a` uses `--amber-strong` (`#8a5300`, 5.81:1). When adding new amber-colored elements, ask: is this body text? If yes, use `--amber-strong`.
- **Short-form CSS variables.** `--bg`, `--fg`, `--amber`, `--rule`, `--ok`, `--warn`, `--note`. Do not introduce parallel long-form tokens.
- **Shiki dual themes**: `solarized-light` / `monokai`, controlled by `[data-theme='dark']` in `global.css`. No client-side theme-swap logic.

### Components

- `Banner.astro` — boot banner at the top of every page. Props: `command`, `status`, `showPreamble`.
- `Module.astro` — section divider `── name ──────`. Props: `name`, optional `ts`, optional `id`.
- `Prompt.astro` — trailing prompt at the bottom of every page. Types out a rotating list of fake commands (`tail -f /var/log/blog.log`, `journalctl -u aj-blog.service`, …). The message list is a JS array at the top of the component — edit there. Respects `prefers-reduced-motion`.
- `PostCard.astro` — `.unit` block, used on home.
- `PostEntry.astro` — compact `.entry` row, used on `/posts` and all paginated list pages.
- `Pagination.astro` — numeric bordered-pill pager. Requires a `basePath` prop.
- `ShareButtons.astro`, `TableOfContents.astro`, `ThemeToggle.astro`, `CopyCode.astro` — see source.

### Mockups

`mockups/REFACTOR.md` is the design contract; `mockups/dmesg.css` and the per-page HTML files (`home-c-dmesg.html`, `post-final.html`, etc.) are the visual source-of-truth. The directory is `.gitignored` — do not stage it. When updating the design system, update the mockups in lockstep so the next refactor has a current reference.

## Content

Posts live in `src/content/blog/`. Frontmatter schema is enforced by `src/content.config.ts` (Zod). Required fields: `title`, `date`. Common optional fields: `description`, `tags[]`, `categories[]`, `image`, `author`, `draft`, `updated`.

- `draft: true` excludes the post from every collection query (home, /posts, /tags, /categories, /posts/[id], RSS). Use it for in-progress posts.
- Posts use root-relative links (`/posts/foo`, `/images/foo.png`, `/tags/foo`). Lychee verifies these against `dist/`.
- For keyboard input in posts, use `<kbd>SPACE</kbd>` — **not** `<key>SPACE</key>`. `<key>` is not a valid HTML element name; `html-validate` will fail. (Historical note: every existing occurrence of `<key>` was migrated to `<kbd>` in May 2026.)
- Heading slugs are auto-generated by rehype-slug. `valid-id` runs in `relaxed` mode (HTML5-permissive) so headings can start with digits.

## Git LFS

**All image files (`*.png`, `*.jpg`, `*.ico`, `*.gif`, `*.svg`) are tracked through LFS.** See `.gitattributes`. When adding any image asset:

1. Confirm `.gitattributes` already has the rule for that extension. If not, **add the rule in a separate commit first** (or use `git lfs track '*.ext'`), then add the asset in a follow-up commit. Reason: `git add` consults `.gitattributes` from the _current index state_, so a `.gitattributes` change staged in the same commit as a matching file will not trigger LFS smudge/clean for that file. The file ends up committed as a raw blob.
2. After staging, run `git lfs ls-files | rg <filename>` to verify it's actually in LFS. If it's missing from that output, the file was committed as a raw blob and needs to be migrated.

### Recovering from "file committed as raw blob instead of LFS"

The fix is `git lfs migrate import`. **There is a sharp edge here.** With only `--include-ref=refs/heads/<feature-branch>`, migrate walks all reachable history from that ref — including everything on `main`. Result: every commit on the branch gets re-SHA'd, and the branch's merge base with `origin/main` disappears. The MR will report `cannot_be_merged` with no apparent conflict.

The correct invocation on a feature branch:

```bash
git lfs migrate import \
  --include='*.svg' \
  --include-ref=refs/heads/<feature-branch> \
  --exclude-ref=refs/remotes/origin/main
```

Or use `--no-rewrite` to add a single fix-up commit on top instead of rewriting history.

If you've already over-rewritten and lost the merge base, recover with:

```bash
# replay just the unique commits onto origin/main
git rebase --onto origin/main <old-parent-sha> <feature-branch>
```

**Then run `git show HEAD --stat`.** If the top commit is empty, git's cherry-pick decided a patch was "already applied" via tree comparison (this happens when the rewritten history mid-rebase already has the change baked in). Re-apply the change manually and `git commit --amend`.

After any LFS work, force-push with `--force-with-lease` (never plain `--force`).

## Screenshots with Playwright

Useful for the dmesg-refactor post and for any future visual-comparison work. The repo does **not** depend on Playwright — install it sandboxed so the main `package.json` / `node_modules` are not touched:

```bash
# in a separate temp dir, not in the repo
mkdir /tmp/screenshot-script && cd /tmp/screenshot-script
npm init -y > /dev/null
npm install playwright
/tmp/screenshot-script/node_modules/.bin/playwright install chromium
# write a node script that imports `playwright`, see below
```

Key patterns the existing screenshot runner uses (`/tmp/screenshot-script/screenshot.mjs`, regeneratable from this skeleton):

```js
import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: 'dark', // also sets prefers-color-scheme
  deviceScaleFactor: 2, // retina output
});
await ctx.addInitScript((t) => {
  // BaseLayout reads this before first paint, so injecting before
  // navigation avoids a flash of the wrong theme.
  try {
    localStorage.setItem('theme', t);
  } catch {}
}, 'dark');

const page = await ctx.newPage();
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.fonts.ready.then(() => true));
// freeze the blinking cursor so screenshots don't catch mid-blink
await page.addStyleTag({ content: '.prompt .cursor { animation: none !important; opacity: 1; }' });
await page.screenshot({ path: 'out.png' });
```

Run against `npm run preview` (production-style serve from `dist/`), not `npm run dev` — the dev server injects an Astro toolbar.

Output PNGs go to `public/images/<slug>/` (LFS picks them up automatically; verify with `git lfs ls-files`).

## CI rules that are off (and why)

`.htmlvalidate.json`:

- `no-inline-style` is permanently disabled. Shiki's dual-theme code blocks emit per-token inline styles (`style="color:#abc;--shiki-dark:#def"`) to drive the dark-mode override; there is no realistic fix. Do not enable.
- `valid-id` runs in `{ relaxed: true }` mode. The default rejects HTML4-style IDs starting with a digit; HTML5 allows them, and our slug auto-IDs come from headings like `"## 1. Set static IPs"`. Relaxed mode forbids only whitespace.
- `long-title` is set to `{ maxlength: 90 }`. Default 70 is too tight after the `" | AJ's Blog"` suffix.

Everything else in `html-validate:recommended` is enforced. Don't disable rules to make a job pass — fix the underlying content/markup.

## Common pitfalls

- **Don't commit anything in `mockups/`.** It is `.gitignored`.
- **Drafts are excluded from the build.** A post with `draft: true` will not appear in any list page, will not get its own `/posts/<slug>/` route, and lychee will not see its links. Worth knowing when debugging "why isn't my post showing up."
- **Don't add framework dependencies.** No React, no Vue, no Svelte islands, no client-side router. Astro with content collections + nginx is the whole stack.
- **Don't bypass CI for "just this one file" content edits.** Run the local CI parity suite before pushing — every check failure on `main` has historically been a real bug in the post being added.
- **Don't add CDN-hosted fonts.** Use `@fontsource/<font>` packages so URLs are stable and assets are local.
- **Don't touch the LFS-tracked files via shell redirection** (`curl -o`, `cp`, etc.) without immediately verifying the result with `git lfs ls-files` after staging.

## Quick reference: file-to-purpose

| When the task is…                  | Look here first                                                       |
| ---------------------------------- | --------------------------------------------------------------------- |
| Adding a post                      | `src/content/blog/` (frontmatter contract in `src/content.config.ts`) |
| Changing the chrome / nav / footer | `src/layouts/BaseLayout.astro`                                        |
| Changing the post page layout      | `src/layouts/PostLayout.astro`                                        |
| Adding a new visual primitive      | `src/styles/patterns.css`                                             |
| Editing tokens / palette           | `src/styles/global.css`                                               |
| Editing the typewriter messages    | `src/components/Prompt.astro` (top of file)                           |
| Editing the CI pipeline            | `.gitlab-ci.yml`                                                      |
| Reading the design contract        | `mockups/REFACTOR.md` (local-only)                                    |
