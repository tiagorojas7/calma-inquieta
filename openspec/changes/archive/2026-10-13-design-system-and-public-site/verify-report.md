# Verify Report: design-system-and-public-site (final, task 12.2)

**Branch:** `docs/ds-archive` (`main` at `7e36d3b` plus `88b33cb`). **Store:** hybrid. **Strict TDD:** active (runner `corepack pnpm test`).
This report replaces the earlier F1-only candidate report. No source, tasks.md, spec, commit, push or archive action was performed.

## Verdict

PASS WITH PENDING MANUAL EVIDENCE. 0 CRITICAL, 3 WARNING, 4 SUGGESTION. All automated gates are green on the final tree. Four manual items remain pending by design.

## Commands (foreground, run sequentially)

| Command | Result |
|---|---|
| `corepack pnpm lint` | exit 0 (only a boundaries plugin deprecation warning about `mode` descriptors) |
| `corepack pnpm typecheck` | exit 0 |
| `corepack pnpm test:coverage` (2nd run) | exit 0. 90 files / 559 tests passed, 191.6 s. All files: 98.36 % statements, 93.57 % branches, 98.61 % functions, 98.82 % lines. Thresholds met |
| `corepack pnpm build` | exit 0, built in 2.39 s |
| `corepack pnpm format:check` | exit 0 (All matched files use Prettier code style); it did not hang, so the prettier fallback was not needed |

Note on the first `test:coverage` run: it reported 2 failed / 557 passed (`confirm-dialog.ui.test.tsx` "puts focus on Cancelar for a destructive action" and `site-footer.ui.test.tsx`), with a reported duration of 5957 s and one test measured at 5,619,991 ms. That is a wall-clock jump (machine suspended), so two 5000 ms test timeouts fired. The two files re-run alone passed (9/9), and the full coverage re-run passed 559/559. Treated as environmental, not a regression (see W1).

## Final-state facts verified

- PRs #12 to #23 are merge commits on `main`: F0 #12, F1 #13, F2 #14, F2b #15, fix #16 (`fix/f2-preview-defects`), F3 #17, hotfix #18 (`test/public-layout-boundary-timeout`), F4 #19, F5 #20, F6 #21, F7 #22, F8 #23. Confirmed in `git log --merges main`.
- PR #28 (`7e36d3b`) layout pass: confirmed. `public/media/stand-ins/` holds hero-1..3.jpg, gallery-01/02.jpg, favicon.png, share-default.jpg, about-teaser.svg. `stand-in-assets.ts` registers them with the note "image permission still to be confirmed". Pending permission: confirmed.
- F7 canonical: `src/app/seo/meta.ts` emits a link entry with rel canonical and `meta.test.ts` asserts it.
- Unchecked tasks: exactly 21: 0.1-0.5, 1.22, 2.27, 2.28, 3.12-3.14, 5.21, 9.9, 10.12, 11.5, 11.6, 12.1-12.5. Merge history (#8, #9, #10/#11, #12, #23) corroborates delivery of 0.1-0.5, 1.22, 2.27-2.28, 3.12-3.14, 11.5-11.6; the individual task contents were not re-verified one by one. 12.1 is delivered by `88b33cb`. 12.2 is this run.

## Proposal success criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Preview serves Inicio, Quiénes somos, Contacto in es-AR with `lang="es-AR"` | Automated part PASS; live preview not checked | `root.tsx` html element has `lang="es-AR"`; routes in `routes.ts`; route tests |
| 2 | Header: 6 entries, order, URLs; 3 unbuilt open "Próximamente" | PASS | `site-map.ts` `PUBLIC_PAGES`; talleres, intensivos, eventos-privados use `coming-soon.tsx`; header and nav ui tests |
| 3 | Contrast test for every declared pair | PASS | `src/app/ui/tokens/contrast*.ts` and tests in the green suite |
| 4 | axe: no violations; keyboard reaches all controls | PASS (jsdom scope) | ui project tests call `expectNoAxeViolations`; mobile-nav and lightbox keyboard tests green |
| 5 | No fixtures in production; testimonials hidden; unconfirmed hours/email absent incl. JSON-LD | PASS | No `testing/fixtures` import from non-test `src/` code; `business-profile.ts` omits email, phone, hours and geo; `json-ld.ts` spreads them only when present; site-content rule tests |
| 6 | Unknown paths: styled Spanish 404 with 404 status; `/status` unchanged | PASS | `not-found.tsx` throws a 404 `data` response; `not-found.test.ts`, `public-layout-boundary.ui.test.tsx`; `status.test.ts` keeps `X-Robots-Tag` |
| 7 | `robots.txt` disallow-all and `noindex` while gate off; sitemap lists only `/`, `/quienes-somos`, `/contacto` | PASS | `SITE_INDEXING` in `env.ts`; `seo/robots.ts`; sitemap route filters `indexable` pages (home, quienes-somos, contacto); robots meta in home, about, contact and coming-soon |
| 8 | Unique title/description, canonical from base, OG; LocalBusiness JSON-LD on Inicio and Contacto | PASS | `seo/meta.ts`, `canonical.ts`, `json-ld.ts` and their tests |
| 9 | Lighthouse mobile LCP under 2.5 s, CLS under 0.1 | PENDING MANUAL (task 10.12) | Not runnable here |
| 10 | Stand-ins listed in manifest; Deviation Register records differences | PASS | `stand-in-assets.ts` plus manifest-vs-folder test; `docs/design/deviation-register.md` (71 lines), `brand-swap-guide.md`, `client-inputs.md` |
| 11 | test, lint, typecheck, format:check, build pass | PASS locally (this run); CI per slice per merged PR history | See command table |
| 12 | Owner approves look and feel on preview | PENDING MANUAL (task 12.3) | Owner action |

## Per-spec compliance

| Spec | Requirements | Result | Notes |
|---|---|---|---|
| design-system | 11 | COMPLIANT | Tokens, contrast gate, fonts with OFL texts (`public/fonts/OFL-*.txt`), atoms, molecules, empty state and ui test harness are present and tested. Pixel fidelity is not automated by design (D7). |
| public-layout | 9 | COMPLIANT (1024 px nav check pending) | Header, active state, CTA, mobile nav, skip link, footer, Próximamente, 404 and error boundary are implemented and tested. Task 5.21 is manual and pending. |
| home-page | 8 | COMPLIANT | Hero, trust row, showcase and upcoming empty states, teaser and contact band, hidden testimonials, metadata. The layout pass replaced SVG stand-ins with photos. |
| about-page | 7 | COMPLIANT (cross-browser check pending) | History, values, gallery, lightbox, video facade, FAQ and hide-when-empty are tested in jsdom. Task 9.9 is manual and pending. |
| contact-page | 6 | COMPLIANT | `wa.me` builder in `site-content/domain/links.ts` with tests; number marked `provisional: true`; hours and email absent. |
| seo-foundation | 8 | COMPLIANT | `lang`, per-route meta, canonical link, OG/Twitter, indexing gate, sitemap, JSON-LD, semantics. |
| site-content | 9 | COMPLIANT | Typed module API via `index.ts`, single business profile, optional facts absent, consent rule, approval markers, copy rules, stand-in registry, mockups-not-shipped tests. |

Compliance is from source inspection plus the green automated suite. Pages were not exercised in a browser or on a deployed preview in this run.

## Pending manual evidence (not failures)

- 10.12 Lighthouse mobile on Inicio (LCP, CLS), 360 and 390 px phone check, 1672 px fidelity check.
- 9.9 Lightbox in Chrome, Firefox and Safari.
- 5.21 Navigation at 1024 px (six entries plus CTA must not overflow; otherwise move to `xl`).
- 12.3 Owner sign-off on look and feel, and confirmation that WhatsApp number, hours and email stay provisional or absent.

## Findings

### CRITICAL
None.

### WARNING
- W1. Test-timeout fragility under load or a clock jump. `confirm-dialog.ui.test.tsx` and `site-footer.ui.test.tsx` hit the 5000 ms default in the first coverage run and passed on rerun; `site-footer` took 5.7 s in that run, close to the limit. Hotfix #18 addressed a similar case. Consider an explicit `testTimeout` for the ui project.
- W2. The hero and gallery photos are Instagram photos from the studio account with image permission unconfirmed. They are registered and flagged, but must not ship to launch without permission.
- W3. The WhatsApp number (351 739 5239) is provisional (D8) and used as the contact route. It is flagged in code (`provisional: true`), but owner confirmation (12.3) is required before launch.

### SUGGESTION
- S1. Check off the delivered-but-unchecked tasks (0.1-0.5, 1.22, 2.27-2.28, 3.12-3.14, 11.5-11.6, 12.1-12.2) before archive so the archived tasks.md reflects reality; the parent owns that edit.
- S2. Silence the eslint-plugin-boundaries deprecation warning (`mode` option) in `eslint.config.ts` in a later chore.
- S3. In `routes.ts` the catch-all `*` is declared before the Próximamente routes. Behavior is correct (React Router ranks by specificity), but reordering would read better.
- S4. Branch coverage is 93.57 %, above the 90 % threshold; no action required.

## Task state

159 of 180 complete per native status, 21 unchecked: 13 delivered but unchecked (bookkeeping), 12.1 and 12.2 (done by this branch and this run), 4 manual owner items (5.21, 9.9, 10.12, 12.3), and the archive steps 12.4 and 12.5 that follow. Native status reported no blocked reasons.

## Recommendation

Proceed to `sdd-archive` (12.4). Record the four manual items as pending in the archive. Diagnostic findings do not gate archive.
