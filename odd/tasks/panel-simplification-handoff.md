# Handoff prompt for Codex: panel simplification (2026-11-19)

Copy everything below the line into Codex.

---

You are taking over the feature "panel simplification" in `C:\Proyectos\TR_WebStudio\CalmaInquieta`, branch `feat/panel-simplification`. It is local only: never push, never open a PR.

## 1. Read first, in this order

1. `odd/tasks/panel-simplification.md`. It is the single source of truth. Read it whole.
   - `## Specs` S1–S13 quote the owner verbatim.
   - `## Tasks` lists P1–P9 and their state.
   - `## Log` L1–L19 holds the history, the walkthrough findings (L17) and the owner decisions (L18 stocked flag, L19 visual system).
2. `odd/tasks/owner-workflow-rebuild.md` `## Specs` S1–S11. These are the business rules, and they must not change (S9 of the new doc).
3. `AGENTS.md`: the dependency rule (eslint boundaries) and strict TDD.
4. The design guide `.agents/skills/impeccable/SKILL.md`. It is untracked: read it, never edit it.

## 2. Who the panel is for

The owners of a ceramics studio. They are older, not comfortable with technology, came from spreadsheets and do not want anything that looks like one. They found the panel overwhelming. Acceptance criteria above all:

- few sections;
- each frequent task on one screen, with no visible navigation jumps;
- short labels, little text;
- numbers first;
- strategic colour;
- real contrast (WCAG AA).

## 3. State when this handoff was written

**Done and committed:**

- P1: shell, nav (Hoy, Alumnas, Clases, Materiales, Ajustes), primitives and `stayOnPage`.
- P2: Hoy.
- P3: Alumnas file, one-form enrollment with "Ya pagó", sales nested.
- P4: Clases and attendance.
- P5: Materiales.
- P7: copy pass.

**Running when credits ran out: P8**, three parallel writers in the same tree. Check what each one committed with `git log --oneline 87ba93a..HEAD` and `git status`. A writer that was cut off may have left uncommitted files.

**F-A, Alumnas (S12):**

- Debt is always right. A student owing a pending fee, a pending material sale, or a workshop deposit or balance shows "Debe $X" on the Alumnas list and at the top of her file. Today she wrongly shows "Al día" (reproduced in L17 B1).
- To get there, it adds a read by email in `src/modules/intensive-requests`, wired in `src/composition/request-services.ts`.
- Full-width layout on desktop.
- A phone formatter, `src/app/admin/phone-format.ts`.

**F-B, Hoy and Clases:**

- B2: pending material sales must appear in Hoy "Para hacer" as "Cobrar materiales $X" and count in Por cobrar.
- B3: one open-month rule shared by Hoy, Clases and the talleres list.
- "28 libres" instead of "28 lugares".
- A slimmer `AdminPageHeader`, a plain title row.

**F-C, Materiales and the stocked flag (S11):**

- `material.kept_in_studio` boolean, folded into the unapplied `drizzle/0018_durable_student_identity.sql` with a backfill: true where any variant has stock.
- The snapshot `drizzle/meta/0018_snapshot.json` is spliced minimally, never re-serialized. Proof: `pnpm exec drizzle-kit generate` prints "No schema changes"; delete any 0019 files and restore `drizzle/meta/_journal.json`.
- The materials module and the form toggle "Lo tenemos en el estudio".
- The Materiales screen in this order:
  1. Para entregar
  2. Para pedir
  3. En el estudio (only kept items: "Hay N" or "Se acabó")
  4. Catálogo (search only)
- Pickers say "Se pide" for items not kept, and show the chosen items right under the search.

**Pending after P8:**

- **P9, visual system (S13):**
  - Semantic colour tokens: owed = one strong warning colour; paid = success; neutral = ink; one brand accent for primary actions.
  - WCAG AA contrast with a contrast test.
  - A card anatomy (title, summary row with large bold numbers, details, actions) in the shared primitives, applied to every card in Hoy, Alumnas, Clases, Materiales and the record detail.
  - Run it as one writer, because it touches shared tokens.
- **P6:**
  1. A seam run.
  2. Reset the local DB, because 0018 changed again.
  3. A walkthrough in the owner's shoes at desktop and 390 px, repeating the L17 checks.
  4. Close the tasks.

## 4. How to work

- **Before starting a pending unit,** reconcile: compare each P8 writer's scope above with the commits and diff. Finish or fix only what is missing.
- **TDD:** RED test first, observed failing, then GREEN. Tests go through loaders, actions, UI with Testing Library, and use cases.
- **Forms:** admin forms stay native `<form method="post">`, because the Worker gate denies `/admin/**.data`. Each form posts `ReturnToFields` and redirects with `stayOnPage` back to the same screen and anchor, showing `SavedBanner`.
- **Copy:** in `src/app/ui/admin/copy/<section>.ts`. Plain Spanish with voseo, short.
- **Business rules are unchanged:** seats, stock and `stock_taken_at`, deposits, policies, the shared bell, attendance.
- **Commits:** Conventional Commits, tests in the same commit, never `Co-Authored-By` or any AI attribution.
  - Commit with explicit paths: `git commit -m "..." -- <paths>`.
  - Check `git diff --cached --stat` first.
  - Never `git stash`.
- **The tracker:** append verbatim owner messages and results to `## Log` of `odd/tasks/panel-simplification.md`, and check a task off only after its checks are observed.
- **Do not touch:** the untracked root files (`_admin_*.html`, `NUL`, `skills-lock.json`, `odd/tasks/admin-ui-ux.md`, `odd/tasks/public-ui-ux.md`) and `.agents/`.

## 5. How to verify (run in the foreground; report the observed result)

- `pnpm typecheck`
- `pnpm exec eslint . --ignore-pattern ".agents/**"`
- `pnpm exec prettier --check src odd`
- `pnpm exec vitest run --project unit` (about 8 min) and `--project ui` (about 5 min). Run them separately.
- DB tests run one file per command: `pnpm exec vitest run --project db --pool=threads <file>`.
  - At minimum the files the units touched:
    - `src/modules/materials/infrastructure/drizzle-material-repository.db.test.ts`
    - `src/platform/db/migration-0018-rehearsal.db.test.ts`
    - `src/platform/db/migrate.db.test.ts`
    - `src/modules/intensive-requests/infrastructure/drizzle-intensive-request-repository.db.test.ts`
    - `src/modules/enrollments/infrastructure/drizzle-insights-reader.db.test.ts`
    - `src/modules/enrollments/infrastructure/drizzle-material-sale-store.db.test.ts` (never run after P3)
  - If embedded Postgres "could not start", delete `%LOCALAPPDATA%\Temp\calma-pg-template` and the `calma-pg-*` temp folders, then retry. That cache breaks when the machine kills processes for low memory.
  - The tooling architecture test has a hard 120 s timeout and fails on a loaded machine; run it alone.
- **Local preview:**
  - DB: Docker container `calma-pg` on port 5432, database `calma_dev`.
  - The app: `pnpm dev --port 5173 --strictPort`, at http://localhost:5173/admin. The dev admin email comes from `.dev.vars`.
  - New entries in `src/app/routes.ts` need a dev-server restart.
  - Because 0018 changed again (F-C), the local DB must be recreated before the preview works. Get the owner's OK first, back it up (`pg_dump`), drop and recreate `calma_dev`, run `pnpm db:migrate` with `MIGRATION_DATABASE_URL`, and never touch any remote database.
- **Walkthrough:** in the browser, as an owner, at desktop and at 390 px. Repeat every L17 check:
  - B1: sell a material unpaid, and the student must show "Debe $X" on the list and on the file.
  - B2: the sale appears in Hoy.
  - B3: Hoy and Clases agree on which month to open.
  - U1: on Materiales, Para entregar and Para pedir come first.
  - U2: desktop width.
  - U3: picker feedback.
  - U4: phones are readable.
  - U5: the file shows its debt.
  - U6: "libres".
  - U7: header.
  - S13: contrast and numbers.

  Record the findings in the Log.

## 6. Delivery

The previous feature, `feat/owner-workflow-rebuild`, is finished but unpushed. Before deploying it, the owner must do a real-phone walkthrough; the L102 pre-deploy query already passed (L105 in that doc). Push, PR and merge are the owner's decisions.
