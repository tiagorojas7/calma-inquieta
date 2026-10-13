# Brand swap guide

How to replace the stand-ins (palette, fonts, images, favicon, share image) when the client delivers the real brand assets. Each section lists the files to touch and the test that checks the result. For what each stand-in replaces and why, see `docs/design/deviation-register.md` and `docs/design/client-inputs.md`.

Ownership: the front end (`src/app/**`, `public/fonts/**`) and the content and manifest (`src/modules/site-content/**`) are different seams. Changes under `src/modules/**` go through BACK.

## 1. Palette

| Step                                        | Where                                                                                                                                                                                                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit the color values in the `@theme` block | `src/app/ui/styles/tokens.css` (the only place colors are defined; the block starts with `--color-*: initial`, so only these tokens exist as utilities)                                                                                                                       |
| Keep the token names                        | Components use utilities such as `bg-clay-600`; renaming a token breaks them. Change values, not names.                                                                                                                                                                       |
| Check contrast                              | `corepack pnpm test src/app/ui/tokens`. The test parses `tokens.css` and checks every declared foreground and background pair in `src/app/ui/tokens/contrast-pairs.ts` against WCAG 2.2 (4.5:1 text, 3:1 large text and UI). Add a pair there when a new combination is used. |
| `tan-400`                                   | Restricted to decorative rules and ornaments (below 3:1 on the canvas); the test does not gate it. Do not use it for text.                                                                                                                                                    |
| Theme color                                 | `THEME_COLOR` in `src/app/root.tsx` is a literal copy of `sand-200`. If you change `sand-200`, update it too; `src/app/root.test.ts` fails when the two differ.                                                                                                               |

If a delivered color fails a pair, darken or lighten it until the test passes and record the change as a row in the deviation register (see row V1 for the precedent).

## 2. Fonts

| Step                                                                               | Where                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add the new `.woff2` binaries (latin subset covers Spanish) and their licence text | `public/fonts/`. The current files are `cormorant-garamond-latin-400-normal.woff2`, `cormorant-garamond-latin-400-italic.woff2`, `montserrat-latin-400-normal.woff2`, `montserrat-latin-600-normal.woff2`, plus `OFL-cormorant-garamond.txt` and `OFL-montserrat.txt`.                                          |
| Update the `@font-face` rules and the family tokens                                | `src/app/ui/styles/fonts.css`: every `url()` must be same-origin under `/fonts/`; keep `font-display: swap`; `--font-display` and `--font-body` at the end of the file are the family tokens.                                                                                                                   |
| Recompute the metric fallbacks                                                     | The `Cormorant Fallback` and `Montserrat Fallback` faces in `fonts.css` use `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override` so the swap causes no layout shift. Derive new percentages from the new fonts' metrics (for example with fonttools) and update the comment above them. |
| Update the manifest rows                                                           | The four `font-*` rows in `src/modules/site-content/infrastructure/content/stand-in-assets.ts` (BACK). When a real brand font replaces a stand-in, delete its row in the same change as its file.                                                                                                               |
| Check                                                                              | `corepack pnpm test src/app/ui` (`src/app/ui/styles.test.ts` checks the `fonts.css` URLs against the files and the OFL texts; `src/app/ui/font-registry.test.ts` matches the manifest font rows against `public/fonts/*.woff2` both ways).                                                                      |

Licence rule: keep a licence text next to every font file, and the manifest `licence` field filled in.

## 3. Images

| Step                                               | Where                                                                                                                                                                                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Put the optimized images in `public/media/<area>/` | Convention: `<name>-{480,960,1600}.webp`; originals are git-ignored. Every image needs meaningful alt text.                                                                                                                                                     |
| Point the content at them                          | `src/modules/site-content/infrastructure/content/home.ts` (hero slots, teaser) and `about.ts` (gallery). The stand-ins are `hero-1`, `hero-2`, `hero-3`, `about-teaser` and `gallery-01` to `gallery-06` under `public/media/stand-ins/`.                       |
| Retire the stand-in                                | In the same change, delete its file under `public/media/stand-ins/` and its row in `stand-in-assets.ts`. The registry test (`src/modules/site-content/infrastructure/stand-in-assets.test.ts`) fails when a file has no row or a row has no file, naming which. |
| Client photos with `srcSet`                        | The `Image` atom accepts `srcSet` and `sizes`; revisit the eager hero slots then.                                                                                                                                                                               |

Content and manifest edits are BACK work (`src/modules/**`).

## 4. Favicon and share image

| Asset       | Current stand-in                                                                 | Where it is wired                                                              |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Favicon     | `public/media/stand-ins/favicon.png` (48 px, from the Instagram profile picture) | `<link rel="icon">` in `src/app/root.tsx` (asserted by `src/app/root.test.ts`) |
| Share image | `public/media/stand-ins/share-default.jpg` (1200x630)                            | `SHARE_IMAGE_PATH` in `src/app/seo/meta.ts`                                    |

To swap: add the new files (the share image must be 1200x630 and a raster format; Open Graph does not accept SVG), update the manifest entries `favicon` and `share-default` (BACK), update the path in `root.tsx` or `meta.ts` if the file name changes, then delete the old stand-in file and its row. Run `corepack pnpm test src/app/root.test.ts src/app/seo`.

## 5. Logo

The header and footer show a text wordmark (the business name in the display font), because no logo exists yet. When the vector logo and lockup arrive, replace the wordmark in `src/app/ui/organisms/site-header.tsx` and `site-footer.tsx` and register the file in the manifest only if a stand-in remains.

## Launch gate

The site is not ready to launch while any stand-in remains. `listStandInAssets()` (on the `SiteContent` port, `src/modules/site-content/application/site-content.ts`) resolves to the manifest rows; its **length must be 0**. The gate itself is wired in change 8. Alongside it, `listUnapprovedContent()` must return no items (see `docs/design/client-inputs.md`). The indexing switch is a separate setting (see ADR-0004).

## Open questions for the owner

1. Who delivers the brand fonts and the licence for them, and should they replace both stand-in families?
2. Should the wordmark stay once a logo exists, or be dropped from the header?
