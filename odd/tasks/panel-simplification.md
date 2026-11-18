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

## Tasks

- [x] P1 (S1, S2, S8): `7059b0b` + `95ef0da`; the shell, the four-plus-Ajustes nav, and route skeletons with redirects from the old URLs. Friendly base styles: type scale, big buttons, cards, and the saved message. A shared "back to the same place" redirect helper. Route: delegated.
- [ ] P2 (S3, S2, S8): Hoy. Route: delegated after P1.
- [ ] P3 (S4, S5, S2, S8): the Alumnas file, one-form enrollment with "Ya pagó", sales inside the file. Route: delegated after P1.
- [ ] P4 (S6, S2, S8): Clases, with workshop reservations and attendance inline. Route: delegated after P1.
- [ ] P5 (S7, S2, S8): Materiales. Route: delegated after P1.
- [ ] P7 (S10, S8): information and copy pass over every remaining admin page (Ajustes pages, workshop and teacher editors, policies, statistics, suppliers, events, reminders): cut text, shorten labels, hide secondary facts. Route: delegated after P2–P5.
- [ ] P6 (S1–S10): seam run, local walkthrough at 390 px and desktop, the owner's check.

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
