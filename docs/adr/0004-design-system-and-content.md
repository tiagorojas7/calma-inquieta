# ADR-0004: Design system, public content and the indexing gate

Status: accepted (change `design-system-and-public-site`, tooling slice B1)

Tailwind CSS 4 is the styling engine with a reset `@theme` as the single token source. Presentational components live in a new `ui` boundary element. Public page copy and business facts live behind a `site-content` module port. Search engines stay out until a single variable changes. This ADR records the decisions the tooling slice (B1) puts in place and the ones the later slices rely on.

## Context

Change 2 adds the design system and the static public pages on top of the platform foundation (ADR-0001 to ADR-0003). It needs a utility-first style vocabulary that cannot drift from the brand palette, a way to test components in a DOM, a mechanical guard that keeps components presentational, a place for content that a later database adapter can replace, and a switch that keeps the preview deployment out of search results.

## Decision

| Concern             | Decision                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Styling             | `tailwindcss` and `@tailwindcss/vite` 4.3.3. Plugin order `[cloudflare, tailwindcss, reactRouter]`. `tokens.css` starts with `--color-*: initial;` (reset `@theme`) |
| Presentational code | New element `ui` = `src/app/ui/**`, matched before `delivery`. It imports only `ui` and the packages `react`, `react-dom`, `react-router`                           |
| Content             | A `site-content` module behind a single-load `SiteContentSource` port; page copy and facts live there, microcopy stays in `src/app`                                 |
| Content rule        | Facts are confirmed or absent; prose carries an `approved` flag; copy is checked for es-AR voseo and the word "taller", never "workshop"                            |
| Indexing gate       | `SITE_URL` (required, http or https) and `SITE_INDEXING` (`on`/`off`, default `off`, `on` requires https), enforced in three layers (below)                         |
| DOM tests           | Vitest project `ui` (`jsdom` 30, Testing Library 16, `jest-dom` 7, `axe-core` 4.14) for `*.ui.test.tsx`; the `unit` project excludes them                           |
| DOM types           | `"DOM", "DOM.Iterable"` added to `lib` in `tsconfig.base.json`                                                                                                      |

### Tailwind spike evidence

B1 proved the plugin with a throwaway spike that was never committed:

- `pnpm build` passed with the plugin order above; the emitted CSS contained the test utility and no default palette entry (the reset works).
- `pnpm dev` served a page linking the processed stylesheet; `pnpm typecheck` passed.
- `import css from "./x.css?url"` in `src/app/root.tsx` passed `pnpm lint`: the boundaries resolver needed no extra configuration. F0 re-proves this on the real file.

Fallback if the plugin ever fails: keep the same token names under `:root` and write component CSS with `var(--color-*)`.

### The `ui` element

`ui` has no `shared`, `module-api`, `composition` or `delivery` imports, so components cannot read a module, the request context or services. Props are declared structurally and route modules map module types to them. `delivery` may import `ui`. `tooling/architecture/architecture.test.ts` drives the rule with virtual violating files.

### The indexing gate

1. `robots.txt` (`Disallow: /` while off).
2. Page meta (`noindex, nofollow` while off; coming-soon pages are always `noindex`).
3. The `X-Robots-Tag: noindex, nofollow` header on every response the handler returns (and on the Worker's own environment-error response), set in the Worker by `src/platform/indexing-header.ts` (`headers.set`, so a route that already sent the header ends with one value).

`SITE_URL` is validated at startup; a missing or invalid value fails by name only. The `wrangler.jsonc` default (`http://localhost:5173`) only applies to a deploy that does not pass the variable, so a manual `wrangler deploy` without `--var "SITE_URL:<origin>"` ships the localhost default instead of failing; CI always passes it. CI derives it from the existing `STATUS_URL` secret with `${STATUS_URL%/status}`, after a guard step that fails before migrations when the secret does not end in `/status` (the value is never printed).

## Consequences

- The indexing header covers responses the handler returns. A response the runtime generates after the handler throws carries no header; `robots.txt` and the page meta still cover it while the gate is off. This is a documented limitation.
- The derived workers.dev origin is a substring of a masked secret and is **not masked** in logs: it appears in wrangler's deploy output. It is public once deployed, so this is accepted and documented in the workflow.
- The DOM and Workers type libraries both declare globals such as `Request`, `Response` and `fetch`. They type-check together **only because `skipLibCheck` is `true`**; merged global types can be slightly wider than the Workers runtime. Worker code (`workers/app.ts`, `src/platform/indexing-header.ts`) uses only APIs both sides agree on. If a conflict ever surfaces, move the DOM libs to a dedicated `tsconfig.ui.json`.
- jsdom 30 has no `HTMLDialogElement.showModal`/`close` and no `matchMedia`; the `ui` setup file polyfills them only when missing. It does not model focus trapping or `cancel` on Escape.
- axe `color-contrast` is disabled in jsdom (no layout); contrast is gated by the token test instead. Page-level axe runs on the whole document, with `document-title` and `html-has-lang` disabled because `root.tsx` owns the shell.
- Suite time: the `ui` project adds at most 20 s wall to `pnpm test` (budget). With the default pool each extra jsdom file cost about 3.4 s wall (2 workers, loaded machine). The `ui` project therefore uses `pool: "vmThreads"`, which creates the environment once per worker and keeps per-file isolation. It costs about 0.6 s per extra file, so 25 files add about 15 s on top of the first file. Fallbacks, in order: group small files, run axe once per state, `isolate: false` for `ui` (about 0.5 s per extra file, but module state is shared), then evaluate happy-dom.
- Every pin is exact, and pnpm 12 `minimumReleaseAge` blocked none of them.

## Rejected alternatives

| Option                                    | Why not                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| Plain CSS custom properties per component | More authored CSS, no utility vocabulary                                    |
| A TS token object that generates CSS      | Needs a build step and makes the generated file a second source             |
| `happy-dom`                               | axe-core integrations report incompatibilities; revisit only on time budget |
| A new `SITE_URL` secret                   | The origin is derivable from the existing secret                            |
| Optional `SITE_URL` with request origin   | A missing base must fail at startup                                         |
