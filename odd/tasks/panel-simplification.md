# Panel simplification

- Objective: rebuild the admin panel experience for owners who are not comfortable with technology: few sections, each frequent task on one screen, no visible navigation jumps, friendly UI. Every business rule of `odd/tasks/owner-workflow-rebuild.md` (S1–S11) is kept as is.
- Branch: `feat/panel-simplification`, stacked on `feat/owner-workflow-rebuild` at `2d4374f` and later (local, not pushed). Delivery: Feature Branch Chain, the same choice as the parent feature. Runner: focused `pnpm exec vitest run --project unit|ui <files>`, then the full unit and ui projects, `pnpm typecheck`, eslint and prettier on the changed files.

## Specs

S1. **Fewer sections.** Owner, verbatim (L1): "siento que hay demasiadas funciones y demasiadas secciones, para unas dueñas que se tiene que amoldar de a poco". The approved proposal (L5) replaces the 14 nav entries with four sections plus Ajustes:

- **Hoy**, at `/admin`.
- **Alumnas**.
- **Clases**: monthly workshops and dated workshops together.
- **Materiales**.
- **Ajustes**: Profesoras, Proveedores, Políticas, Estadísticas and planillas.

Old URLs keep working or redirect to their new home. Nothing an owner could do before becomes impossible.

S2. **One screen per frequent task, no jumps.** Owner, verbatim (L1, L2): "que todo este plasmado en una venta como mucho, ya que las redireccioens marean muchismo"; "de forma simple en una ventana". After every action the owner stays on the same screen, at the same item, with a clear message of what was saved. Admin forms stay native posts, because the Worker gate denies `/admin/**.data`; the post redirects back to the same page and the same anchor.

S3. **Hoy.** Owner, verbatim (L2): "donde vena los numeros claros". Hoy shows:

- the month's figures, large: cobrado, por cobrar, and what is left for the studio;
- a "Para hacer" list. Each item is a card with its action button right there, for example "Cobrar $45.000 a Ana" or "Confirmar seña de Carla";
- today's classes, each with its attendance action;
- the new requests (enrollments, workshop reservations, private events), with the shared read state of the previous feature's S9.

The bell keeps its shared read state, and its list lives in Hoy.

S4. **Alumnas file.** Owner, verbatim (L6): "al cargar una venta de materiales, se esta cargando como un nuevo turno, se tiene que cargar en la misma ficha del cliente".

- A search gives each student's file in one place: her monthly records, payments, materials and attendance.
- The file's actions are "Cobrar", "Vender materiales" (with "Ya pagó") and "Inscribir en otro mes".
- A material sale appears inside the student's file, under its monthly record, and never as a separate record or turno in any list.
- Reproduce first: today a sale is listed as its own order card with workshop, month and turno.

S5. **Enroll in one form.** Registering a walk-in student is one form:

- workshop, month and turno;
- her data;
- optional materials;
- "Ya pagó".

One submit creates the record and, if checked, records the full payment. The previous rules hold: one active record per student and month, the fee override including $0, and stock taken when paid.

S6. **Clases.**

- Each monthly workshop card shows its open month, its turnos with free seats, and "Abrir el mes que viene".
- Each dated workshop card shows its reservations inline: confirm the deposit, record the balance and cancel, without leaving the card and without groups collapsing after an action.
- Taking attendance is: open the class, then tap present or absent. A make-up class is booked right there.

S7. **Materiales.** Owner, verbatim (L4): "lo mismo para cargar los materiales en stock y demas, hay muchismas cosas que siento que le van abruramar mas que facilitar la vida y su trabajo". One screen shows:

- what there is: stock, with "Llegaron N" on each material;
- what to order: grouped by supplier, with "Ya lo pedí";
- what to hand over: "Entregado".

Adding a material asks for name, price and quantity. Supplier, cost, variants, photo, import and price raises live behind "Más opciones", closed by default.

S8. **Friendly for owners who are not comfortable with technology.** Owner, verbatim (L2, L3, L6):

- "pensnado para gente mayor que se manejaba soko con exceln y no es muy amiga de la tecnologia, hay que poner del lado del cliente y diseñar un recorrido fluido, sencillo y sin trabaas";
- "no, no tiene que parecerse a excel, lo contrario, quieren evitar las planillas y alejarse de el, quieren un sistema amigable para el dia a dia de su trabajo";
- "la ux and ui tiene que ser mas amigable en todo sentido tambien".

The panel must not look like a spreadsheet: cards and guided tasks instead of grids. It uses:

- larger text and touch targets, and one primary action per screen;
- plain everyday words;
- advanced options hidden until needed;
- clear confirmation of what was saved.

It keeps the existing visual rules: warm page, solid contrast, no gradients. It works on phones and desktops.

S9. **Same rules.** Owner, verbatim (L2): "lo mismo que se hace ahora, pero sin tantas cosas"; "manteniendo los requerimientos que quieren cubrir". Every business rule, guard and stored effect of `odd/tasks/owner-workflow-rebuild.md` S1–S11 stays as it is, including:

- seats, stock and the stock-taken mark;
- deposits and balances;
- teacher percentages;
- policy acceptance;
- the shared bell state;
- attendance and make-ups.

Only screens, navigation, copy and the shape of the forms change. A rule change needs the owner's word.

S10. **Less information, shorter words, on every admin screen.** Owner, verbatim (L7): "ajustar los textosm botones, hay demasiado informacion, aca se busca el balance perfecto entre simplicidad y funcionalidad". Each screen shows only what the task needs. Every button label is a short verb phrase. Descriptions, hints and secondary facts are cut, or moved behind "Más opciones" or "Ver más". Long helper sentences become a few words. The rule applies to every admin page, including Ajustes and its pages, not only the four sections.

S11. **Stocked materials.** Owner (L16, L18): each material carries a yes/no "Lo tenemos en el estudio". Materiales shows, in this order:

1. "Para entregar";
2. "Para pedir";
3. "En el estudio", only the stocked materials, with "Hay N" or "Se acabó" and "Llegaron";
4. the rest of the catalog behind a search.

In the sale and enrollment pickers, a material not kept in the studio reads "Se pide". The flag is folded into the unapplied migration 0018: existing materials default to not stocked, except those with stock units, which default to stocked.

S12. **Debt is always right.** A student who owes anything shows "Debe $X" everywhere: the Alumnas list, the top of her file and Hoy. That covers a pending fee, a pending material sale and a pending workshop deposit or balance. A record whose sale is owed never reads only "Pagado".

S13. **Structure, strategic colour, numbers first, real contrast.** Owner (L19).

- **Colours carry meaning, used the same way everywhere:**
  - owed or pending money is one strong warning colour;
  - paid or done is one success colour;
  - neutral information is ink;
  - one brand accent for primary actions.
  - Decoration never competes with these.
- **Contrast:** all text and badges meet WCAG AA, at least 4.5:1, and 3:1 for large numbers and UI borders. Muted grey text on the warm background must pass too.
- **Numbers first:** every card (student, record, sale, workshop, reservation, material, supplier order, Hoy figures) opens with a summary row whose key numbers are large and bold, for example "Debe $30.900", "Pagado $100.900", "3 de 20 lugares", "Hay 5" or "Total $116.600". Details follow below.
- **Structure:** consistent card anatomy (title, summary row, details, actions), consistent spacing and clear section headings.
- A contrast test asserts the token pairs.

## Tasks

- [x] P1 (S1, S2, S8): `7059b0b` + `95ef0da`; the shell, the four-plus-Ajustes nav, and route skeletons with redirects from the old URLs. Friendly base styles: type scale, big buttons, cards, and the saved message. A shared "back to the same place" redirect helper. Route: delegated.
- [ ] P2 (S3, S2, S8): Hoy. Implemented in `0229494` and `3e27719`; task closure pending the seam check. Route: delegated after P1.
- [ ] P3 (S4, S5, S2, S8): the Alumnas file, one-form enrollment with "Ya pagó", sales inside the file. Implemented in `d18fa59`, `a5e6a8d`, `84b708d`, and `dc03a6f`; task closure pending the seam check. Route: delegated after P1.
- [ ] P4 (S6, S2, S8): Clases, with workshop reservations and attendance inline. Implemented in `bab16fc` and `7df747b`; task closure pending the seam check. Route: delegated after P1.
- [ ] P5 (S7, S2, S8): Materiales. Implemented in `67ff00d` and `696eaa0`; task closure pending the seam check. Route: delegated after P1.
- [x] P7 (S10, S8): information and copy pass over every remaining admin page (Ajustes pages, workshop and teacher editors, policies, statistics, suppliers, events, reminders): cut text, shorten labels, hide secondary facts. Existing compact/collapsed screens were verified by readback; workshop, policies, reminders and supplier forms were simplified with RED/GREEN tests. UI 1240/1240, unit 4285/4285, focused lint, typecheck, format, and Impeccable detect passed; committed as `ecf92d3`. Route: inline after P2–P5; no writer trigger held because the mapped edits shared `microcopy.ts`.
- [ ] P8 (S11, S12, S2, S8, S10): corrections from the L17 walkthrough. F-A covers Alumnas debt, width, sale picker feedback and phone format. F-B covers the Hoy sale task, one open-month rule, "libres" and a slimmer page header. F-C covers the stocked flag and Materiales order. Split commits: `b900cf4`, `cc73b80`, `ea2decd`, `baa51b8`, `a0de43a`, `d291041`, `c77b697`, `2d38c24`; corrections `5710801`, `55ab9a1`, `4d899ec`. The material candidate's native review was acknowledged; task closure awaits seam and walkthrough checks. Route: delegated, parallel, then inline reconciliation and review slicing.
- [ ] P9 (S13, S8, S10): visual system pass. Semantic colour tokens with AA contrast and a contrast test. A card anatomy with a summary row of large numbers in the shared primitives, applied to cards in Hoy, Alumnas, Clases, Materiales and the record detail. Implemented in `645163a`; closure awaits native review and rendered desktop/390 px walkthrough. Route: delegated after P8, then inline seam correction.
- [ ] P6 (S1–S13): seam run, local walkthrough at 390 px and desktop, the owner's check.

## Log

- L1 (2026-11-18, owner, verbatim): "Necesito que sea mas simple todo, siento que hay demasiadas funciones y demasiadas secciones, para unas dueñas que se tiene que amoldar de a poco, entonces hay que dar muchisimas vueltas para registrar ventas y demas, neecesito todo mucho mas simplificado, facil, rapido y sin tanta vuelta. que todo este plasmado en una venta como mucho, ya que las redireccioens marean muchismo"
- L2 (2026-11-18, owner, verbatim): "Exacto, la idea es para las dueñas simplificarles el ttrabajo de forma mucho mas facil, rapido y sin tanta vuelta, donde vena los numeros claros, registren los materiales e inscripcioens, lo mismo que se hace ahora, pero sin tantas cosas, de forma simple en una ventana y pensnado para gente mayor que se manejaba soko con exceln y no es muy amiga de la tecnologia, hay que poner del lado del cliente y diseñar un recorrido fluido, sencillo y sin trabaas para que puedan trabajar de forma mucho mas simple, manteniendo los requerimientos que quieren cubrir."
- L3 (2026-11-18, owner, verbatim): "no, no tiene que parecerse a excel, lo contrario, quieren evitar las planillas y alejarse de el, quieren un sistema amigable para el dia a dia de su trabajo"
- L4 (2026-11-18, owner, verbatim): "perfecto, lo mismo para cargar los materiales en stock y demas, hay muchismas cosas que siento que le van abruramar mas que facilitar la vida y su trabajo"
- L5 (2026-11-18): Flow map (read-only explorer) of today's panel. Counts are page loads (L), submits (S) and redirects (R).

  | Task                        | Today                                          |
  | --------------------------- | ---------------------------------------------- |
  | Walk-in enrollment          | L4 S2 R2 (no "paid now" at creation)           |
  | Web payment                 | L3 S1 R1                                       |
  | Material sale               | L6-7 S2 R2                                     |
  | Supplier and delivery       | one submit per supplier, plus a separate round |
  | Workshop reservations       | L6 S3 R3, groups collapse after each action    |
  | Attendance with one make-up | L5 S2 R2                                       |
  | Open a month                | L2 fast, L5 detailed                           |
  | New workshop                | L3                                             |
  | Private event               | L3                                             |
  - There are 14 nav entries.
  - The same actions are duplicated on lists and detail pages.
  - Hoy tasks open lists, not the item.
  - The parent proposed four sections plus Ajustes, one screen and one button per frequent task, no jumps, large type, and advanced options hidden.
  - Owner, verbatim, answering whether to see sketches first or go ahead: "Avanzar con la propuesta".

- L6 (2026-11-18, owner, verbatim, sent with that answer): "aparte al cargar una venta de materiales, se esta cargando como un nuevo turno, se tiene que cargar en la misma ficha del cliente, y la ux and ui tiene que ser mas amigable en todo sentido tambien."
- L7 (2026-11-18, owner, verbatim): "si, la verdad que hay que simplificar todo, ajustar los textosm botones, hay demasiado informacion, aca se busca el balance perfecto entre simplicidad y funcionalidad, lo veo demasiado cargado actualmente, hasta yo mismo me pierdo, imaginate ellas, asi que hay que meter una mejora exponencial en simplificar este poryecto del lado del panel admin". This adds S10 (an information and copy diet on every admin screen) and task P7.
- L8 (2026-11-18): P1 done (delegated, worker-high) in `7059b0b` + `95ef0da`, inside its surfaces.
  - Navigation: Hoy, Alumnas, Clases, Materiales, Ajustes, with the active section matched by the longest prefix.
  - Pages: Ajustes hub with 7 cards, and a temporary Clases hub.
  - Admin base: 18px text and 48px controls.
  - Primitives: `AdminActionCard`, `AdminHubCard`, `SavedBanner`, `MoreOptions`, `AdminSectionHeading`, `ReturnToFields`.
  - Copy: per-section files `src/app/ui/admin/copy/*`.
  - Helper: `stayOnPage(form, { fallback, code })`, with an open-redirect guard in `src/app/admin/return-to.ts`.
  - Evidence: RED then GREEN. Typecheck, eslint and prettier clean. Unit `src/app` plus architecture 146/1505; ui admin 51/496.
  - The parent restarted the dev server; all five sections return 200.
  - For P6: check the 18px visually. `adminMicrocopy.shell.more` is unused.
  - Next: P2–P5 in parallel.
- L9 (2026-11-18): P2 Hoy, P3 Alumnas, P4 Clases and P5 Materiales delegated in parallel (worker-high), with a shared brief (`...\scratchpad\ps\brief.md`).
  - The writers share one tree with declared disjoint surfaces.
  - No writer edits `microcopy.ts`, `routes.ts`, the nav, the shell, the P1 primitives or `app-services.ts`; they report needed shared changes to the parent.
  - Explicit-path commits only, never stash.
  - P3 owns the enrollments module (atomic create+pay and sale+pay).
  - The seam run follows when all four return.
- L10 (2026-11-18, owner, verbatim): "y actualmente ni yo logro indetificar lo que tengo en stocky lo que no, se hace medio complicado y confuso a la hoa de crear materiales y eso, cada flujo debe ser muy sencillo y claro de realizar". Sharpens S7 for P5:
  - Stock state must be obvious at a glance on every material and variant: "Hay N", "Sin stock", or ordered on demand. It is shown in words, with a distinct visual state, never colour alone.
  - A filter shows only what there is or only what is missing.
  - Creating a material must be a short, clear flow.
- L11 (2026-11-19): Resumed after the previous agent stopped. P2–P5 code is committed in the branch, but their task checkboxes remain open until the full seam checks and walkthrough are observed. The first unit/UI suite exposed a stale Hoy loader fixture; commit `ea071c4` updates it, and the focused layout UI test passes 7/7. TypeScript build and focused ESLint/Prettier checks pass. The full suite was interrupted after the failure was found, so it has no final verdict. The local dev server is listening on localhost:5173 and the public root returns 200. The admin route returns 500 because the local PostgreSQL database has only 18 applied migrations and lacks `enrollment_order.kind` from migration 0018. Docker and the existing `calma-pg` container are running. A local database backup was copied to the system temporary directory as `calma_dev_before_0018.dump` (79,296 bytes). Do not claim P6 complete or the admin preview usable until migration is authorized, applied, and the admin route and UI walkthrough pass. Engram mirror update is pending because the host session is unregistered.
- L12 (2026-11-19): The owner explicitly authorized migration 0018 on the local database only. Ran `scripts/migrate.ts` against local `calma_dev`; it reported success. Readback found 19 migration records and `enrollment_order.kind`; `/admin` now returns 200. The backup remains in the system temporary directory. The complete unit/UI suite and P7 mapping are in progress. No remote database was accessed.
- L13 (2026-11-19): P7 mapping found the Ajustes hub, teacher and supplier lists, intensive form, private-event filter, and secondary statistics tables already concise or collapsed. The remaining high-density screens were the workshop editor, policies and reminders; the supplier notes were also optional. RED/GREEN UI tests now cover hiding workshop secondary fields and supplier notes, collapsing policy version history, and shorter reminder copy. Focused checks pass: workshop/policies 20/20, reminders 9/9, supplier form 1/1, supplier route 6/6. TypeScript, focused ESLint, Prettier and Impeccable detect are clean. The first full UI suite found one stale supplier route expectation (1 failed/1239 passed); it was corrected and the suite is being rerun. The combined unit/UI suite stalled without a final verdict. All sampled main admin routes now return HTTP 200. The browser automation host is unavailable, so the 390 px and desktop visual walkthrough remains unverified.
- L14 (2026-11-19): Full UI suite passed 141 files / 1,240 tests; full unit suite passed 320 files / 4,285 tests when run separately with a verbose reporter. Full PostgreSQL test run passed more than 380 checks before the native Windows worker exited with code 3221226505, without an assertion failure or terminal summary; its outcome is partial, not green. Full repository ESLint was interrupted after a prolonged no-progress run; targeted ESLint, TypeScript and Prettier checks had passed. P7 is implemented and covered; P6 remains pending because the browser automation host could not provide the 390 px/desktop walkthrough and the DB/full-lint checks lack terminal proof.
- L15 (2026-11-19): P7 landed in `ecf92d3`. After the commit, focused TypeScript, ESLint and Prettier passed again. Native RDD assessment could not select the untracked inventory; its read-only STATUS failed first on filesystem access and then timed out outside the sandbox with `mutation_outcome: not_started`, `next_action: stop`. No review authority or consent was created; do not infer approval or retry the timed-out operation from prose. A later computer-use attempt found Chrome running, but policy stopped before reading its URL, so no visual walkthrough occurred. The native DB worker crash also stopped the dev server; it was restarted, and warm requests to `/`, `/admin`, and `/admin/materiales` all returned 200 at http://localhost:5173/. P6 still lacks full DB, full lint, native review and visual proof.
- L16 (2026-11-19, owner, verbatim): "codex ya estuve trabajdno un poco en l oque venias, confirma que esta todo perfecto y avisame, que necesito que hagas un reocrrido exaustivo por toda la web vos mismo, ya que siento que la ui y ux no es tan sensiclla y se les puede complicar, ya que por ejemplo esta muy escindido lo que tiene que pedir, l oque no, lo que hay en stock, Ademas las alumnas cuando se vende un nuevo material, sigue apareciendo como al adia, cuando en realidad esta debiendo, esntonces neceisot quw realmente lo mires vos con tus propios ojos, de punta a punta, situandote en el lugar de las dueñas, que bsucan algo sneicllo y facil, y hay que mejorar exponencialmetn e la ui and ux". Reported defect: a student with an unpaid material sale shows "Al día". Next: a walkthrough in the browser, in the owners' shoes.
- L17 (2026-11-19): Parent walkthrough in the owner's Chrome, desktop, against local `calma_dev` (Docker `calma-pg`). Typecheck exit 0 at `20722e0`.
  - Bugs:
    - B1: the Alumnas list shows "Al día" for a student who owes. Reproduced by selling a tray unpaid to martina roberi ($30.900 owed, list says "Al día"). tiago rojas and Prueba Test QA owe $20.000 workshop balances and also show "Al día". The list only looks at the monthly fee.
    - B2: Hoy "Para hacer" does not show that pending sale.
    - B3: Hoy offers "Abrir diciembre" for bordado de canastas while Clases shows no open action for it and offers "Abrir enero" for tejido a dos manos. They use two copies of the open-month rule.
  - UX:
    - U1: on Materiales, "Para pedir" starts at y=18162 of a 19004 px page, below 99 catalog cards that almost all say "Sin stock". What to order, what to hand over and what is in stock cannot be told apart (owner, L16: "esta muy escindido").
    - U2: on desktop the Alumnas list, file and enrollment form are a narrow column, leaving half the screen empty.
    - U3: in "Vender materiales", after "Agregar" the chosen items appear far below a long result list, with no visible feedback.
    - U4: phone numbers show raw digits ("5493516785675").
    - U5: the file shows a record as "Pagado" while a sale under it is owed, and the file has no overall "Debe $X".
    - U6: Clases says "28 lugares" without saying free or taken.
    - U7: every page opens with a large icon header card repeating the nav.
- L18 (2026-11-19, owner, verbatim, answering how to tell stocked materials apart): "Marcar los que se tienen (Recommended)" (option text: "Cada material lleva un sí/no: \"Lo tenemos en el estudio\". Materiales muestra arriba \"Para entregar\" y \"Para pedir\", después \"En el estudio\" solo con esos materiales (Hay 5 / Se acabó), y el resto del catálogo queda en un buscador. Al vender, los que no se tienen dicen \"Se pide\".").
- L19 (2026-11-19, owner, verbatim): "ademas necesitoque este todo mas estructurado, que los colores esten elegidos estrategicamente, que diga el resumen en cada ficha, por que los numero son muy importantes ysiento que el contraste de colores es malisimo y se pierde todo y no hay nada de contraste, por l oque hay que hacer una mejora ahi tambien". This adds S13 and task P9, which runs after P8 because it touches the shared tokens and primitives the P8 writers are using.
- L20 (2026-11-19, owner, verbatim): "S13: contrast and numbers." The owner also requires: "Record the findings in the Log." No database reset is authorized yet; the handoff explicitly requires the owner's OK before recreating local `calma_dev`.
- L21 (2026-11-19): Handoff reconciliation began. `git log --oneline 87ba93a..HEAD` contains only `16b1260 docs(odd): add the Codex handoff for the panel simplification`; none of the P8 writer changes were committed. `git status --short` shows the three P8 scopes interleaved as modified and untracked files, with unrelated untracked root files and `.agents/` left untouched. `git diff --check` passed. The student file still calls `owedPayments(actor)` and filters all workshop debts by email in the loader; the requested by-email read and `request-services.ts` wiring are missing. `pnpm typecheck` could not start: pnpm 12.9.1 registry signature verification failed on package fetch, so this is no TypeScript verdict. P8, P9 and P6 remain open; no DB reset or walkthrough has been performed.
- L22 (2026-11-19): Direct `node node_modules/typescript/bin/tsc -b --pretty false` first failed on five type errors from P8's new required `keptInStudio` field: fixtures in `intensive-project-form-data.test.ts`, `intensive-detail.test.ts`, `enrollment-new-materials.ui.test.tsx`, and the `MaterialsService` method inventory in `contracts.test.ts`. Corrected those fixtures and method inventory without changing production behavior; a second direct TypeScript build exited 0. This does not replace the requested `pnpm typecheck` or functional tests. No P8 task is checked off.
- L23 (2026-11-19, owner, verbatim): "perfecto, retoma todo donde se dejo". Resumed P8. Added a repository-filtered workshop debt read for the student file: the RED service test failed because the email was not passed; after the implementation the focused service/fake tests passed 93/93, and TypeScript passed. Full unit passed 324 files/4,349 tests and full UI passed 141 files/1,262 tests, each run separately via local `node` after pnpm's signature failure. Prettier found three P8 test files and they were normalized; subsequent `prettier --check src odd` passed. Full-repository ESLint made no progress for several minutes and was interrupted; focused ESLint of changed TypeScript found five test-only violations, now corrected but not yet rerun. Embedded DB: material repository passed 21/21; migration rehearsal 20/20, migrate 7/7 and insights reader 15/15 passed in independent verifier. Intensive request repository assertions passed 51/51 but teardown failed with PostgreSQL `53300` because 51 concurrent drops exceeded embedded max_connections 50; teardown was changed to sequential drops and a by-email repository contract test added, pending rerun. The verifier also found S12's literal "Debe $X" absent on Hoy's payment cards; this remains to fix before P8 closure. P9 and P6 have not started.
- L24 (2026-11-19): P8 verification continued. The independent verifier ran the remaining DB files one per command: intensive request repository 52/52 after sequential teardown, insights reader 15/15, material-sale store 26/26, migration rehearsal 20/20, migrate 7/7; material repository 21/21 was observed by the parent. Added a tested "Debe $X" summary to Hoy payment cards: focused unit and UI tests both failed first and passed after implementation. Direct TypeScript build and focused ESLint on all changed TypeScript files exited 0. Direct Drizzle generate printed "No schema changes, nothing to migrate" and produced no 0019 files. Full unit/UI were run before the final Hoy summary and test-fixture changes, so they need one seam rerun. Full-repository ESLint remains without a terminal verdict, and P8 task closure remains pending P6.
- L25 (2026-11-19): P8 implementation and tests committed as `2fe8c5a` (`feat(admin): resolve owner walkthrough findings`), 92 source/test/migration paths; unrelated untracked root files and `.agents/` remain untouched. Native RDD mode is on. Assessment of the committed range from `87ba93a` is high/due (item 1: persisted material classification). Exact START returned a candidate-specific consent envelope; no reviewer has run and the owner's answer is pending. P9 visual system and P6 seam/walkthrough remain pending.
- L26 (2026-11-20, owner, verbatim): "granted". Executed the exact granted P8 review START. Native review returned `lens_context_budget_exceeded`, `mutation_outcome: not_started`, `next_action: stop`: the candidate's complete reviewer evidence exceeds its budget, so no review authority or result was created. It explicitly says the same candidate cannot succeed on retry and must be split into smaller reviewable commits. `2fe8c5a` is the local branch tip with no upstream shown by `git branch -vv`; splitting it would rewrite a commit, so explicit owner approval is needed before that destructive Git step. P9 and P6 remain pending; no reviewer ran.
- L27 (2026-11-20, owner, verbatim): "si". With the owner's approval, preserved `2fe8c5a` at local branch `backup/p8-before-split`, reset only the unpushed feature branch to `16b1260` while retaining the worktree, and rewrote P8 into eight coherent commits (listed on P8). `git diff backup/p8-before-split HEAD` exited 0: the resulting tracked tree is byte-identical to the original P8 commit. The untracked root files and `.agents/` remain untouched. Created isolated local worktree `C:\Proyectos\TR_WebStudio\CalmaInquieta-worktrees\review-p8-stock` at `b900cf4` for the first high-risk migration review. Assessment against `16b1260`: high/due, 16 paths and 206 changed lines. Native START for this smaller candidate returned a fresh candidate-specific consent envelope; no reviewer has run yet.
- L28 (2026-11-20, owner, verbatim): "granted". Native risk and reliability reviewers of the smaller P8 material candidate found a lost update: toggling the studio flag could overwrite an intervening availability edit. RED service test failed and the correction passed 57 focused unit/fake tests and 22 material repository DB tests; committed as `5710801`. The independent verifier reproduced the interleaving against the baseline and confirmed the corrected candidate. The successor reviewers then found the converse lost update: an ordinary material edit whose draft omits the studio flag could overwrite a concurrent flag toggle. A RED service test failed (`expected false to be true`); the persistence-boundary correction and repository contract passed 59 focused unit/fake tests and 23 material repository DB tests, with focused ESLint and Prettier passing; committed as `55ab9a1`. Both corrections were cherry-picked into the isolated review worktree (`9d30494`, `24a9d04`). Direct TypeScript build produced no final verdict after several minutes and was interrupted. The exact bound native STATUS after the second correction returned `operation_timeout`, `retry_safe: false`, `manual_action_required`, `next_action: stop`; native review remains unresolved and must not be blindly retried. P8 remains open. P9, P6, local DB reset and owner walkthrough remain pending.
- L29 (2026-11-20, owner, verbatim): "si, y soluciona la revison de p8 tambien". The owner authorized using available `gpt-6-luna` in place of the unavailable configured `gpt-6.1-luna` to map P9. Its read-only map identified existing contrast tests and the high-fanout `AdminActionCard`; no P9 code was changed because P8 review remains unresolved. Native P8 authority inspection reported `complete: true`, `valid: true`, 11 entries, one valid recovery edge and no anomalies or sanctioned exits. Native `review repair --preflight` reported `unsupported` with zero eligible candidates. The bound review STATUS explicitly timed out without starting its operation and marked retry unsafe; it has not been retried or bypassed. A supported `review abandon` would discard the active lineage's captured reviewer evidence and requires explicit maintainer authorization before a fresh review can be attempted. Awaiting that decision; P8, P9 and P6 remain open.
- L30 (2026-11-20, owner, verbatim): "si". With the owner's explicit approval, ran native `review abandon` for the active P8 successor lineage using its persisted revision, snapshot identity and captured-result inventory; it returned a committed quarantine record. The corrected 18-path, 360-line range in the isolated worktree was assessed high/due (item 1, migration and concurrent writes). Fresh native preflight offered a new START, but START returned a candidate-specific `gentle-ai.review-integration.consent/v3` envelope. No new reviewer has run; fresh candidate consent is pending. P9 remains mapped but unimplemented; P6 remains pending.
- L31 (2026-11-20, owner, verbatim): "granted". The fresh P8 material candidate ran native risk and reliability reviewers. One candidate-caused blocker remained: after a material edit omitted the studio flag, the service performed a post-commit read, so a read failure could report failure after the write had succeeded. RED service test failed with `read unavailable`; the correction returns the stored flag from `UPDATE ... RETURNING` within the root-and-variants transaction. Focused unit/fake tests passed 60/60, material repository DB tests 23/23, direct TypeScript build exited 0, and focused ESLint/Prettier passed. An independent verifier reproduced RED against `55ab9a1`, passed the corrected suites, and proved with a row-lock probe that a concurrent flag toggle remains both returned and persisted. Correction committed as `4d899ec` and cherry-picked into the isolated review worktree as `124a7df`. Native targeted validation approved the corrected candidate; exact acknowledgement returned `action: acknowledged`, `authority: burned`. Review advisories about 0018 backfill timing and the flag setter's separate reload are non-blocking follow-up findings, not grounds to reopen this candidate. P8 still needs seam checks; P9 and P6 remain open.
- L32 (2026-11-20): P9 semantic tokens, AA contrast checks on actual CSS tokens, shared primary-button and action-card meanings, and large numeric summaries across Hoy, Alumnas, Clases reservations, Materiales stock/orders and student records/sales were implemented. The bounded writer could not start Vitest due sandbox `spawn EPERM`; the parent ran the focused UI suite with escalation (133/133), admin/public contrast tests (113/113), direct TypeScript and focused ESLint/Prettier successfully. Independent verification in scratch passed the original candidate's full unit (324 files/4,363 tests) and separate full UI (141 files/1,265 tests), but exposed two candidate regressions and one pre-existing S13 gap: seat occupancy was colored like owed money, reservation balance repeated its amount, and Hoy "Por cobrar" remained blue. Three RED UI assertions reproduced those failures. One correction batch gave occupancy a neutral tone, removed the repeated balance from details, and gave "Por cobrar" the canonical warning tone; focused Hoy/Clases UI passed 32/32, TypeScript/focused ESLint/Prettier passed, and the independent verifier's bounded recheck passed all three original probes. Public design-token declarations were restored unchanged after their existing contrast test caught the writer's accidental cross-system additions. P9 source and tests committed as `645163a`. `pnpm typecheck` still refuses the pnpm registry signature; direct TypeScript passed. Native assessment/review and the owner-view desktop/390 px walkthrough remain pending. The Engram task mirror is pending because the host session is unregistered; the local tracker remains authoritative.
- L33 (2026-11-20): Native P9 assessment initially refused because unrelated protected untracked files require an explicit declaration. A canonical read-only preflight supplied their inventory digest; assessment with `--untracked-scope exclude` then returned high/due (escalated item 3, shared UI contract), 23 paths and 300 changed lines. Native P9 START preflight selected readability and reliability lenses and excluded all untracked files. START returned a fresh candidate-specific consent envelope; no P9 native reviewer has run, and the owner's answer is pending. The separate P8 material review remains acknowledged.
