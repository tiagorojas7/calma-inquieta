# Owner workflow rebuild

- Objective: adapt the public enrollment and mobile admin workflow to the owners' November meeting and subsequent decisions.
- Branch: `feat/owner-workflow-rebuild` (from `feat/admin-ui-ux` at `67d515f`); delivery: ask-on-risk with Feature Branch Chain selected; runner: `pnpm test` with focused paths, then `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`.
- Status: durable-identity and reminder slices implemented, independently verified, and committed; broader student lifecycle, inventory, workshops, settlements, notifications, policies, and integrated verification remain. Forecast: substantially over 400 authored lines; Feature Branch Chain selected.

## Specs

S1. Student identity and enrollment. First public enrollment creates a durable student profile; subsequent public submissions match existing profiles by normalized email or phone and create a new monthly record. Admin may create students manually. Name, email, and phone are required; email and phone are individually unique. Reject a duplicate student/month even when submitted through different channels. Source: owner clarification, "si pone el mismo mail o telefono, se debe asociar con la cuenta ya creada anteriormente"; "si" to blocking a second same-month enrollment. Acceptance: no duplicate profile/period; conflicting email and phone belonging to different profiles fail closed rather than merge automatically. Do not create the profile before the completed public handoff: "cuando haya marcado enviar mensaje, ahi se crea la cuenta".

S2. Monthly records. One student may attend at most one monthly workshop per month. Owners create subsequent monthly records manually, choosing workshop, period, turno, configured fee (overridable for an individual: the manual form starts with the period fee and accepts any whole-peso amount, $0 included for a scholarship; the order stores that amount. Source: "Cualquiera, incluso $0 (Recommended)"; a manual order emails the student by case: a pending one gets the usual "Recibimos tu inscripción" email, and a $0 one gets a "Confirmamos tu lugar" email that never mentions payment. Source: "Mail según el caso (Recommended)"), and catalog material variants via a simple search. Monthly periods carry no materials: the public monthly enrollment has no material step, and a period has neither a "requires materials" flag nor an offered-material list; students choose the project in person. Source: "se aaca los materiales de los meses, ya que los talleres mesuales no va a elgir mas material la alumna". Exception: when the owner creates a monthly record by hand, she may optionally add priced catalog material variants through a simple search; they snapshot into the order lines and the total is fee plus materials. Source: "Sí, opcional". Show fee, materials and one clear total. Monthly payment is one full payment, pending or paid, never installments. A pending student is on the attendance roster. Source: "tiene que crearse manualmente, llenando los datos correspondientes"; "la alumna paga todo de una sola vez"; "solamente este inscriptia en un taller mensual". A cancelled order does not count toward that limit: the student may enroll again that month, in the same or another workshop. Source: "Puede reinscribirse (Recommended)" ("Una inscripción cancelada no cuenta: la alumna puede anotarse de nuevo ese mes, en el mismo taller o en otro."). Acceptance: the workflow works on phone and desktop and does not require spreadsheet calculation.

S3. Post-payment changes. After monthly payment, later material purchases are separate sales under that student's same month, each with its own full-payment state; the paid monthly total is not silently rewritten. Admin may correct workshop, turno, or fee after payment; a correction that raises the amount returns the monthly record to pending (the owner then confirms the new total), a correction that lowers it keeps it paid and records the refunded difference, and every correction keeps an audit trail. Source: "Sigue pagada (Recommended)". Monthly records can be cancelled and paid ones refunded, preserving history and attendance; a refund records the amount returned (full or partial, up to the paid amount), the date and a note, releases the seat, and is allowed in any paid state, including after materials were requested or received. Source: "Total o parcial (Recommended)"; "Se puede cancelar (Recommended)"; student profiles can be deactivated and reactivated without losing history. A paid sale can be voided/refunded with historical evidence. Source: "podrian agregarle nuevos materiales tranquilamente"; "si" to refunded cancellations and active/inactive profiles. Acceptance: no deletion of financial history and no silent double stock adjustment.

S4. Catalog and stock. Keep the existing suppliers/materials/variant catalog. Each variant has a sales price, editable current supplier cost, exact on-hand quantity, and immediate-stock or supplier-orderable availability. Capture historical selling price and cost in sales so later edits never rewrite realized margin. Paid stock sales decrement on-hand quantity; unpaid selections do not. Supplier-orderable selections remain available without stock. Keep it simple: own-stock variants are offered only while units remain, and nothing else is automated, because the owner arranges alternatives in person or by WhatsApp. Source: "si no hay nada no se ofrece y se ofrece productos del proveedor ... buscamos algo sencillo, sin tantas complicaciones". Source: "tiene que tener todas las caracteristicasd que el catalogo de materiales"; "pero el costo actual del provedor se carga en el catalogo de materiales". Acceptance: transactionally safe stock counts and negative-stock prevention for immediate stock sales.

S5. Fulfillment and purchasing. Paid supplier-orderable lines move through pending-to-order, ordered, received-at-workshop; received is terminal because use and handoff occur there. Consolidate pending lines by supplier; purchasing can include additional stock units. On receipt, fulfill requested lines and add extra units to stock. Cancellation/refund restores or releases stock and reconciles orders without dropping historical records. Source: "recibido y entregado es lo mismo"; "al proveedor se le va a poder comprar tanto materiales a pedido como stock propio". Acceptance: no duplicate receiving or fulfillment on retries.

S6. Workshops. One dated workshop may have several selectable project options sharing one schedule and capacity. Each option has name, image, total price, configurable deposit, and a configurable bill of material variants/quantities per participant. Materials are included in the price, not sold again separately. Confirming a deposit claims a seat and allocates the option's materials; shortages create supplier purchase needs. Record one full balance payment later. Cancellation releases allocated material; ordered/received surplus becomes studio stock. Source: "configurable" for per-project deposit; "solamente cuentan los que tiene el salfo total pagado" for teacher settlement. Acceptance: capacity and material accounting are atomic under concurrent reservations.

S7. Attendance and make-ups. Pending-payment monthly students appear on the roster and can be marked present or absent like paid ones, so they can get a make-up; the roster still shows that they owe the payment. Source: "Se puede marcar (Recommended)". One absence permits at most one make-up, only in another turno of the same workshop. Missing that make-up grants no replacement. A full make-up turno warns but does not block. Source: "una aunsecia es una recuperacion"; "no tie e que impedirlo, pero si dar una alerta". Acceptance: attendance and recovery history survive correction/cancellation.

S8. Teachers and insights. Teacher percentage belongs to each workshop and varies by workshop. Period snapshots preserve historical percentages when the workshop setting changes. Monthly settlement includes paid, non-refunded fee receipts only, excluding materials. Workshop settlement includes only fully paid deposit-plus-balance reservations and uses actual total received. Recalculate automatically after cancellation/refund. Material margin uses each sale's captured supplier cost, not today's edited cost. Source: "solamente tiee que contar lo pagado"; "se excluye la venta de materiales". Acceptance: reported 10% versus configured 70% must be reproduced against actual saved assignment/period before modifying calculation.

S9. Panel operation. Admin is fully responsive and usable by touch on phones. Notification bell is visible across the panel and shared by both owners: opening a new request marks the novelty read for both; unresolved payments remain visible until paid, with no due date or overdue concept. Reminders simplify to tomorrow's classes and pending payments, with student search, workshop and turno filters; WhatsApp opens a prepared message but is sent manually. Generate consistent turno display names from weekday and time. Source: "leida para las dos"; "no, pago vencido no habra"; "pero los filtros de taller y turno que se mantengan". Acceptance: preserve existing private-event inbox and task counters.

S10. Content and policy. On monthly workshops, rename the short public card text to "Descripción" and full detail text to "Contenido interno", visible before registration data entry. A global editable conditions document and separate privacy document have clear links and one simple acceptance control. Preserve accepted policy version/text for history. Per L89, both documents keep a version history, each workshop still shows its own conditions, and both forms carry one checkbox "Leí y acepto las condiciones y la política de privacidad" with a link to each document. Per L90, the first version of each is a short base text built only from what the site already says, which the owner reviews and edits in the panel before launch. Source: "una que sea descripcion y otra contenido interno"; "si" to editing both global texts from admin. Acceptance: the home-card versus detail description complaint is resolved by explicit fields; do not assume a persistence bug without reproduction.

S11. Reported bugs. Reproduce before correcting the reported teacher percentage mismatch and inconsistent turno labels, using current public/admin interfaces and persisted sample state, distinguishing data/configuration from code defects. Source: meeting transcript sections 3, 6, 7. Acceptance: each confirmed defect has a regression test; unconfirmed cases remain documented, not invented as fixes.

## Tasks

- [x] T1 (S1–S3, S7): S3 post-payment material sales `7261962` + `f73f79e` (L86, delegated); verification in T6; durable student/monthly lifecycle and financial rules; one active order per student and month, cancelled orders excluded (L32-L33); fee override with $0 scholarships (L35-L43); optional catalog materials in manual orders (L44-L45); delegated foundation implemented durable identity and one-student/month persistence, then corrected inline after independent verification; RED/GREEN evidence recorded in L5; commits `6c2c7bb` and generated snapshot `cbc5242`; manual creation use case `34d8547` (inline) and screen `907674e` (U-D, delegated); monthly administration, financial corrections/refunds, attendance and make-ups remain; high risk items 1/3/4.
- [x] T2 (S4–S5): catalog stock, immutable sale valuation, supplier ordering and receiving; simple scope per L60 and L65 (units S-A `5a4ae34` then S-B `1673823`, delegated); done, verification in T6; high risk items 1/3/4.
- [x] T3 (S6): selectable workshop projects, deposit/balance and material allocation; units T3-A to T3-E per L71 (delegated); T3-A done in `d0e7d78` + `5ebbcdd`; T3-C `af93d87`; T3-B `2c90a33`; T3-D `8570def` + `fff0b4c`; T3-E `89c9e86`; T3-F `3e3c1ea`; L78 `ab95a9f`; T3 done (L80); high risk items 1/3/4.
- [x] T4 (S8, S11): settlements, margin and reported defect reproduction; percentage mismatch not a code defect, characterization `89e0f81` (U-A, delegated); turno labels fixed in `baa6890` (U-B, delegated); workshop settlement and margin done in T3-E `89c9e86` and `ab95a9f`, monthly margin in S-B; monthly settlement already counts only paid states and the fee (L16, re-checked L81); percentage warning and per-teacher percentage editing (L82, L85) in `0124d0c`; verification in T6; high risk items 1/3.
- [ ] T7 (S2): remove materials from monthly periods. U-P (delegated, parallel): public flow without material step or gate. U-W (delegated, parallel): admin period and quick forms without the flag or material picker. The `materials_required` column and `period_material_offer` table stay dormant until a later migration slice; implemented, commits in L26; seam run in L27: unit/ui, lint, typecheck and format green, DB files that use T7 code green in L28; the other 17 run in T6.
- [x] T5 (S9–S10): responsive panel, shared notifications, simplified reminders and editable global content/policies; delegated reminder slice completed and corrected inline so “Clases de mañana” selects the Córdoba next calendar day; commit `1228ea7`; generated turno names `baa6890` (U-B); "Descripción"/"Contenido interno" `a6c565e` (U-C); notification bell `57c9fe0` + `d312eb4` (T5-N, L91); global policies `3b4dc0e` + `55d3feb` (T5-P, L92); mobile verification at 390 px and copy fix `b0eb1b0` (L93); done, verification in T6; high risk items 2/3 for consent and shared notifications.
- [ ] T6 (S1–S11): exhaustive final verification per L67 (per-area independent verifiers, full DB suite, 0018 rehearsal, differential, sliced native review, lint, typecheck, phone walkthrough); commit pending.

## Log

- L1 (2026-11-15, user, verbatim): "si, hazlo, puedes despleahr subagente en modelo sol 5.6 mdium par aplicar esas tareas y espcificaciones que menciones"
- L2 (2026-11-15): Requirements came from `C:/Users/santr/Downloads/transcripcion-juntada-ajustes.md` and the owner's subsequent chat clarifications. This document quotes selected exact decision fragments in Specs; full transcript/chat remain the record for the remaining original strings. No source edits or checks yet.
- L3 (2026-11-15): Current baseline `67d515f` on `feat/admin-ui-ux`; new branch created locally. Existing unrelated untracked files must remain untouched. Engram writes repeatedly failed because the host session is unregistered; mirror pending.
- L4 (2026-11-15): Open implementation details are not permission to improvise financial or data-migration behavior. Preserve existing orders, seat counters, percentages, and attendee history. Confirm consequential ambiguity at the first affected task before altering persisted formats.
- L5 (2026-11-15): Student-identity foundation observed RED (`resolveStudentIdentity is not a function`) and GREEN (repository DB tests 14/14). Reminder UI focused checks passed (3 files, 17 tests). Parent repaired affected enrollment fixtures; the affected DB set passed after correction, focused reminder domain/service tests passed 29/29, `tsc -b`, targeted ESLint, and `git diff --check` passed. Independent high-risk verification initially found two blockers: populated legacy migration failure and a misleading tomorrow audience. One bounded correction added legacy backfill and Córdoba next-day selection; targeted recheck cleared both blockers, including month/year rollover. No remote database was accessed or changed.
- L6 (2026-11-15): Local PostgreSQL at the configured development address was not running, so no local data reset was necessary. Embedded PostgreSQL tests use disposable databases. Engram mirror remains pending because the host session is unregistered.
- L7 (2026-11-15, user, verbatim): "pr encadenados". Chain strategy resolved as Feature Branch Chain: keep a draft/no-merge tracker branch, make each child target its immediate parent, and never publish or open PRs without explicit authorization.
- L8 (2026-11-15): Work-unit commits created locally: `6c2c7bb` durable student identity, `1228ea7` simplified owner reminders, and `cbc5242` generated migration snapshot. Reminder spot check passed 4 files / 37 tests. Native assessment classified the reminder and snapshot commits medium/under-budget; no additional review was due.
- L9 (2026-11-15): Native review correction handling repeatedly lost an explicitly empty intended-untracked selection and reoffered a fresh target. The equivalent defect is fixed by Gentle AI PR #6122 in published stable v4.5.0; installed v4.2.0 predates that release, so no duplicate report/comment was created. The user chose to continue, and the exact candidate-scoped decline was validated. Upgrading tooling remains optional and separate from project implementation.
- L10 (2026-11-15, user, verbatim): "la sesion de codex se quedo sin creditos, analzia hasta donde se quedo y que trabajo realizo, para retomar y seguir avanzando con las demas tareas pendientes que quedaron"
- L11 (2026-11-15): Resume audit. The prior session stopped at an uncommitted RED test for admin `createPending` (manual monthly enrollment, T1/S1-S2). Its commit `6c2c7bb` changed the order-repository contract to one record per student and month (cancelled history included) without updating `InMemoryOrderRepository`, so `src/testing/fakes/enrollments-order-repository.test.ts` failed at HEAD; fixed in this slice by mirroring production identity matching in the fake.
- L12 (2026-11-15): Manual creation slice: admin `createPending` reuses the public enrollment pipeline (same offer gate, seat check, identity matching and one-record-per-month rule) and records the admin email as the first audit actor via optional `OrderDraft.createdBy`. Assumptions, to confirm with the owners: a hand-made enrollment sends no automatic email, and it obeys the same open-period gate as the public form. Fee override and material search (S2) are not part of this slice.
- L13 (2026-11-15): Deploy blocker found in `drizzle/0018_durable_student_identity.sql`: legacy rows allowed by the old partial index (`student_email, workshop_id, period_id` where not cancelled) make the migration fail on populated data in three cases: (a) a cancelled and a later order for the same email and month, (b) the same email in two workshops in one month, (c) two emails sharing one phone (`student_phone_digits_unique`). No committed test covers these. Production data must be checked read-only, with explicit authorization, before deploy, or the migration must resolve collisions under an owner decision.
- L14 (2026-11-15, user, verbatim): "puedes lanzar subagentes en paralelo para ir avanzando mas rapido, con los modelos ye sfuerzos correspondientes dependiendo de la tarea."
- L15 (2026-11-15): Route declaration. Writer trigger (a), parallel disjoint units in the same tree, parent owns git, no migrations in any unit: U-A worker-high T4 S8/S11 teacher percentage reproduction and settlement rule check; U-B worker-medium T5/T4 S9/S11 turno names generated from weekday and time; U-C worker-medium T5 S10 "Descripción"/"Contenido interno" labels and content before data entry; U-D worker-medium T1 S1/S2 admin manual enrollment screen on `createPending`. Migration work (policies, shared notification bell, stock, workshop projects) stays sequential after these units and after the L13 migration decision.
- L16 (2026-11-15): U-A result (S8, S11 percentage half). Not reproduced as a code defect: "70" parses to 7000 bp (`src/modules/workshops/application/contracts.ts:19-34`); `openMonth` freezes the workshop percentage into the period snapshot once (`workshop-period-service.ts:262-267`); settlement and statistics read only `snapshotPercentageBp` (`drizzle-insights-reader.ts:71`). Probable cause: the month was opened while the workshop still had 10%; a period edit is needed for that month. Characterization tests added in `src/modules/insights/application/teacher-percentage-flow.test.ts` (3 passed, no RED because no defect). Monthly settlement already counts only paid states and the fee only. Open for owners: which month showed 10%, and whether the workshop form should warn that opened months keep their percentage. T1 refunds must stay outside the confirmed states.
- L17 (2026-11-15): U-C result (S10 first part). The complaint is a labelling confusion, not persistence: cards read `summary` (`src/app/catalog/mappers.ts:66`), the detail page reads `description` (`mappers.ts:362`), and the admin labelled `description` as "Descripción". Admin now labels `summary` "Descripción" and `description` "Contenido interno" with hints (`src/app/ui/admin/microcopy.ts`, parent edit), and the public enrollment page shows the content in "Sobre el taller" before the form (RED then GREEN, 51 tests). Open: the quick workshop form labels its `description` field "Contenido interno" too and has no card-text field.
- L18 (2026-11-15): U-B result (S9 turno names, S11 label half). Reproduced: three entry paths produced different formats (free-text admin label with hint "Mañana, Tarde o Noche", quick-create "Día HH:MM" in `src/app/admin/workshop-quick-form.ts:131`, fixtures "Martes 18:00 a 20:00"), matching transcript section 7. `validateTurnoCore` now generates the label with `turnoDisplayName` ("Martes 18:00 a 20:00"), so the label-based uniqueness key refuses the same weekday and time in one workshop; the admin form has no name field; stored labels and order snapshots are untouched; no schema change. Parent follow-ups applied: duplicate message now "Ya hay un turno ese día y en ese horario en este taller.", orphan `form.label`/`labelHint` copy removed, and the two `monthly-workshop-service.test.ts` turno tests updated to generated labels (25 passed). Open: whether owners want a live name preview.
- L19 (2026-11-15): U-D result (S1, S2 manual creation). `/admin/inscripciones/nueva` lists live workshops with open months and active turnos in one select, requires name, email and phone, sets `policyAccepted: true`, `honeypot: ""`, `lines: []` server-side, maps refusals to Spanish messages (`enrollmentCreateRefusal`), and redirects to the pending tab with `ok=created`; the list has a "Nueva inscripción" link. Parent added the `created` banner (route FEEDBACK, list type, microcopy; RED then GREEN 47 passed) and fixed a U-A fixture type error (`period` field). Pending: fee override and material search; redirect to the new order's detail needs the internal id from `createPending`; periods flagged `materialsRequired` still refuse an enrollment with no lines, which contradicts S2 "Public monthly enrollment never requires choosing materials".
- L20 (2026-11-15): Commits `34d8547`, `baa6890`, `a6c565e`, `907674e`, `89e0f81`, `5e7fb56` on the local feature branch; nothing pushed. Checks observed: focused tests per unit green; `pnpm typecheck` exit 0; `pnpm format:check` flagged two files, both formatted afterwards. The full seam run was stopped by the host for low system memory before lint, the unit/ui suite and `pnpm test:db` finished; those three remain pending, and the 20-parallel-creators DB contract test only timed out under load from parallel writers. Next: rerun lint, unit/ui and DB checks on a quiet machine; then the L13 migration decision before any deploy.
- L21 (2026-11-16): Rerun on request. `pnpm format:check`: all files formatted (exit 2 only from a transient `.codegraph/codegraph.lock` read). `pnpm lint`: 5 parsing errors, all in untracked local `.agents/skills/impeccable/scripts/*.js`, none in repository code. Unit/ui suite: 4376 passed, 2 failed, both caused by `6c2c7bb`: `tooling/architecture/schema-ownership.test.ts` (enrollments infrastructure imported the students schema) and `migration-catalog.test.ts` (expected 0017). Full DB suite crashed early (Windows exit -1073740791) after `enrollment-schema.db.test.ts` failed for the same commit (fixtures without `student_id`, old duplicate index, a cross-module foreign key).
- L22 (2026-11-16, user decision via question): durable student profile is owned by enrollments ("Enrollments owns it (Recommended)"). Commit `7a173e4` moves the `student` table into `src/platform/db/schema/enrollments.ts`; `drizzle-kit generate` reports "No schema changes, nothing to migrate". Focused checks: schema ownership 8 passed, migration catalog 24 passed, affected DB files 11 files / 83 tests passed. The following repo lint + unit/ui + full DB run was stopped by the host for low memory during lint; those remain pending.
- L23 (2026-11-16, user, verbatim): "Cierrala y libera memoria para seguir". Codex desktop processes were stopped (free memory 2.8 GB to 3.2 GB; its Windows sandbox service remains). Then, one check per run: repository lint (`eslint --ignore-pattern ".agents/**" .`) exit 0; unit/ui suite 421 files / 4378 tests passed; full `pnpm test:db` 366 passed and 2 failed, both stale since `6c2c7bb` (migrated-tables list without `student`, probe contract expecting 0017). Fixed in the next commit; the two DB files pass 12/12 and the probe tests 5 files / 23 passed.
- L24 (2026-11-16, user, verbatim, answering whether to drop the "materiales obligatorios" rule): "Si, se aaca los materiales de los meses, ya que los talleres mesuales no va a elgir mas material la alumna". S2 rewritten; T7 opened. Plan: two parallel writers with disjoint surfaces (U-P public enrollments flow, U-W workshops admin). The enrollments order-line machinery (`lines`, `OfferedMaterialsLookup`) stays for the S2 admin material search; the `materials_required` column and `period_material_offer` table stay dormant (repository writes `false`, no offer writes) until a migration slice drops them after migration 0018 is unblocked.
- L25 (2026-11-16, user, verbatim, answering the request for a read-only production data check before migration 0018): "Si, te autorizo". The database credentials live in the owner's password manager, and `docs/runbooks/cloud-provisioning.md` forbids pasting connection strings into a chat. So the agent runs nothing remotely: the owner runs one read-only, counts-only query in the Neon SQL Editor (the branch the site uses, database `calma`) and pastes back the result row. It counts the collisions that break 0018: the same email twice in one month, two emails sharing one latest phone, invalid phone digits, and an empty name or email.
- L26 (2026-11-16): T7 result.
  - U-P: `priceCart` has no gate, `PublicOffer` has no material fields, the public form is always two steps, and `/talleres/:slug/inscripcion/materiales` is deleted together with its page, the session draft, `material-card` and `quantity-stepper`. Focused tests: 33 files / 367 passed.
  - U-W: periods have no flag or material list, readiness has no materials step, and the period and quick forms have no picker. The repository writes `materials_required = false` and ignores `period_material_offer`. The enrollment `materials` dependency is an empty lookup. Focused tests: 208 files / 1853 passed; DB 9 files / 150 passed.
  - Parent seam fixes: the workshop flow kit and the teacher percentage test lose the materials dependency; the stale legacy-props UI test is rewritten. The month copy no longer mentions materials (RED observed on "Mes abierto. Ahora revisá los cupos."). The `materials` failure step and the picker copy are removed, and the rate-limit runbook lists only the enrollment POST.
  - Combined tree: `pnpm typecheck` exit 0, 0 errors. The sequential seam run (unit/ui, lint, format, DB) was stopped by the host for low memory (7.8 GB machine) before unit/ui finished; it is pending and must be rerun when memory allows.
- L27 (2026-11-16, user, verbatim, answering whether to rerun the full checks in the foreground one at a time): "Si". Seam run at `68a556d`:
  - `pnpm exec vitest run --project unit --project ui`: exit 0, 412 files / 4289 passed (4378 at `7655adf`; the drop is the deleted material tests).
  - `pnpm exec eslint --ignore-pattern ".agents/**" .`: exit 0 (only the known boundaries `mode` deprecation warning).
  - `pnpm format:check`: this document needed Prettier (fixed). It then exits 2 only because Prettier reads the transient `.codegraph/codegraph.lock`; `.codegraph/` is excluded locally in `.git/info/exclude`, not in `.gitignore`. With `--ignore-path .gitignore --ignore-path .prettierignore --ignore-path .git/info/exclude` it exits 0. Environmental, local only; CI has no `.codegraph/`.
  - `pnpm test:db`: passed the 600 s foreground limit, moved to the background, and was stopped by the host for low memory. Before the stop, `drizzle-workshop-period-repository.db.test.ts` was still running (148 s), and the materials supplier (11 of 20) and material (20 of 20) repository tests were failing. T7 changes nothing under `src/modules/materials`, `drizzle` or `src/platform`, and the first failure took 17.9 s, so the likely cause is the embedded PostgreSQL starved of memory. That is not proven: the DB run is pending a clean rerun with free memory.
- L28 (2026-11-16, user, verbatim, choosing how to finish the DB check): "Solo el afectado (Recommended)". The DB files then ran one at a time in the foreground, each retried once after a native crash (exit -1073740791, the known Windows `0xC0000409`). Green: materials (3 files, 44 tests), every workshops infrastructure file (8 files), teachers, enrollment order repository (passed on retry 2) and admin enrollment store, and `src/composition/request-services.db.test.ts` (13 tests, the only remaining file that uses code T7 changed). The materials failures in L27 did not reproduce, which confirms memory starvation. The other 17 DB files share no code with T7 and run in T6.
- L29 (2026-11-16, owner, pasted result of the L25 read-only counts query on Neon `staging` / `calma`; a first run on the wrong branch returned `relation "enrollment_order" does not exist`): `migraciones` 18, `pedidos` 2, `alumnas` 1, `mismo_mes_repetido` 1, `cancelados_en_repetidos` 0, `telefono_compartido` 0, `telefono_invalido` 0, `nombre_o_mail_vacio` 0. So migration 0018 would fail on `staging`: one student has two non-cancelled orders in the same month, and `enrollment_order_student_period_unique` is `UNIQUE("student_id","period")` over every status. Per the runbook, `main` holds no data until launch, so only `staging` is affected. Asking the owner whether the two orders are test data.
- L30 (2026-11-16, owner, answering what the two colliding `staging` orders are): "No sé"; a read-only query without personal data then showed `CI-2026-0001` (TALLER DE TEJIDO, Lunes) and `CI-2026-0002` (ENCORDADO LIBRE, Martes 18:00), both `public`, `paid`, period 2026-11, requested on 2026-11-12. Owner answer: "Son pruebas mías". Plan: the owner deletes both orders on `staging` in the Neon SQL Editor. Only `order_line` and `order_audit` reference `enrollment_order`, both `ON DELETE cascade`. Attendance marks, make-ups and student notes are keyed by email, not by order, and migration 0018 does not read them. Migration 0018 stays unchanged; rerunning the L25 query must return 0 collisions. Open product point for later, not yet asked: `UNIQUE("student_id","period")` covers cancelled orders too, so a student whose order is cancelled cannot enroll again in that month.
- L31 (2026-11-16, owner, pasted rerun of the L25 counts query on `staging` / `calma` after deleting the two test orders): `migraciones` 18, `pedidos` 0, `alumnas` 0, and 0 in every collision column. Migration 0018 now runs cleanly on `staging`; the deploy blocker is resolved without changing the migration. Next: the open L30 product point (a cancelled order still blocks a new order that month) must be decided before 0018 ships, because changing the constraint after it is applied needs another migration.
- L32 (2026-11-16, owner, verbatim, answering whether a cancelled order keeps blocking its month): "Puede reinscribirse (Recommended)" (option text: "Una inscripción cancelada no cuenta: la alumna puede anotarse de nuevo ese mes, en el mismo taller o en otro. Ajusto la migración antes de publicarla."). S2 rewritten. T1 reopened for the constraint: migration 0018 is not applied anywhere yet (`staging` reports 18 migrations, 0000-0017), so it is edited in place. `UNIQUE("student_id","period")` becomes the partial unique index `enrollment_order_student_period_active_unique` on (`student_id`, `period`) `WHERE status <> 'cancelled'`. `cancelled` is terminal in `order-core.ts`, so no transition can revive a second active order. Route inline (one unit, under 100 lines); Risk items 1 (migration) and 4 (uniqueness under concurrent creation).
- L33 (2026-11-16): L32 implemented inline.
  - RED: the order repository contract on the fake failed with `expected false to be 'CI-2026-0004'`, and `enrollment-schema.db.test.ts` against the old migration reported constraint `enrollment_order_student_period_unique` instead of `enrollment_order_student_period_active_unique`.
  - GREEN: the schema uses `uniqueIndex(...).where(status <> 'cancelled')`, and the last statement of `drizzle/0018_durable_student_identity.sql` creates the partial index. The order repository maps the new index name to `duplicate-order`, and the fake ignores cancelled orders.
  - `drizzle/meta/0018_snapshot.json` was first regenerated with drizzle-kit, which rewrote the whole file (the old copy has PowerShell indentation) and made the native review refuse the candidate with `lens_context_budget_exceeded`. A follow-up commit restores the original text with only the constraint-to-index swap: 23 lines added, 10 removed, semantically identical to the drizzle-kit output. Its id is kept, `drizzle-kit generate` reports "No schema changes", and the journal is unchanged.
  - Checks: `pnpm typecheck` exit 0; lint on the changed files exit 0. The full unit/ui run flagged one stale test, `public-enrollment-service.test.ts` "keeps refusing the same student and month after a cancellation", now "lets the same student enroll again that month after a cancellation"; that file passes 40/40 and the other 4288 passed. DB: `enrollment-schema` 9/9 and `drizzle-order-repository` 15/15.
  - The admin message "Esa alumna ya tiene una inscripción este mes." stays correct, because it now fires only for an active order.
- L34 (2026-11-16): T1 per-month rule verified and reviewed.
  - Independent verifier at `d070f2f`, all five items PASS. The DB rule holds both directly and through the repository. Migration 0018 on legacy data: a cancelled plus an active order in one month migrates, two active orders fail with 23505 on the new index, and every order gets `student_id`. Concurrency: 8 concurrent creates gave 1 success and 7 `duplicate-order` with no burned number (the advisory locks serialize them). `drizzle-kit generate` reports no changes, and a differential run of the order repository (15), migrate (6) and the enrollment and fake unit suites (409) passed.
  - Native review: the first START stopped with `lens_context_budget_exceeded` because of the rewritten snapshot. After `f8bd845` the candidate `f914d3a..f8bd845` (112 lines) got owner consent ("Revisar este cambio"); lenses risk and reliability approved it, and the acknowledgement burned the authority (lineage `review-ca1430ceb7c523dd`).
  - Advisories, separate later work: R1-001 — any database that already applied the earlier 0018 (for example a local dev database) keeps the old full constraint, so its collisions would not map to `duplicate-order`; such a database must be reset. Staging reports 0000-0017. R3-001 — the old constraint name has no other reference repository-wide (checked with grep before the change). R3-002 — add a same-turno re-enrollment case after a cancellation to the repository contract.
- L35 (2026-11-16, owner, verbatim, answering which amounts the per-student fee override allows): "Cualquiera, incluso $0 (Recommended)" (option text: "Viene cargada la cuota del mes y la podés cambiar por cualquier monto en pesos enteros, incluido $0 para una beca. La inscripción guarda el monto que pusiste."). S2 updated. Next T1 unit: fee override in the manual enrollment form (`/admin/inscripciones/nueva`), delegated to one bounded writer because of the long-session backstop.
- L36 (2026-11-16): fee override unit delegated to one writer (long-session backstop). Found while preparing it: `enrollment_order_fee_check` is `fee_centavos > 0`, so $0 needs a DB change. It is folded into the unapplied 0018 with a minimal snapshot edit, to keep the review candidate small. Assumption (parent's, to be confirmed by the owner): a $0 order has nothing to pay, so it is confirmed as paid at creation with $0 through the existing confirm path, which also counts the seat. Otherwise it would stay pending and trigger fee reminders.
- L37 (2026-11-16): fee override committed. The writer covered S2 and observed RED then GREEN per rule: the form starts with the period fee, the typed amount is stored as fee and total, $0 ends paid with $0 and moves the seat counter, an invalid amount is a "Cuota" field error, the public flow ignores a posted fee, and the DB accepts 0 and rejects negatives.
  - Writer checks: unit/ui over enrollments, form, route, fakes and composition, 39 files / 349 passed; DB `enrollment-schema` 10, `drizzle-admin-enrollment-store` 22, `drizzle-order-repository` 16; `drizzle-kit generate` reports no changes; typecheck exit 0; eslint and prettier clean on the changed files.
  - Parent checks: the diff stays inside the allowed surfaces; spot check 38/38 on the admin service and form tests; 0018 gains two statements, and the snapshot changes one line.
  - The full unit/ui seam run was stopped by the host for low memory and is pending; it was not restarted without the owner.
  - Follow-up: the service finds the new order's id by searching the pending list for its number. If that confirmation fails (the turno is full), a $0 order stays pending.
- L38 (2026-11-16, owner, verbatim, answering whether to rerun the full suite in the foreground): "si".
  - At `50970d2`, `pnpm exec vitest run --project unit`: exit 0, 290 files / 3288 passed (346 s).
  - `pnpm exec vitest run --project ui`: 1 failed / 1022 passed. The failure was `workshop-screens.ui.test.tsx` "create screen shows an empty form, then the server errors with the typed values" (`Unable to find a label with the text of: Nombre`). That file passes 10/10 alone and was not touched by the change, so it is load flakiness.
  - An independent verifier was launched for `2677f88` (items 1 and 3).
- L39 (2026-11-16): fee override verified and reviewed.
  - Independent verifier at `2677f88`, all five items PASS.
    - The admin fee is stored as fee and total. A $0 order ends paid with $0 on the Córdoba creation date, with the seat counted.
    - An invalid fee stores nothing (snapshot unchanged). The public flow ignores a posted fee and still refuses a period fee of 0.
    - 0018 on legacy data accepts 0 and rejects negatives. `drizzle-kit generate` reports no changes, and the snapshot differs only in the fee check.
    - A $0 order on a full turno is refused before storing anything.
  - Native review over `f8bd845..df2a3b4` (owner consent "Revisar este cambio"): risk and reliability approved it, and the acknowledgement burned the authority.
  - Advisories, separate later work:
    - R3-001: a $0 order is created and then confirmed in two steps. If the confirmation fails (a seat race), the owner sees an error while a pending $0 order exists, and a retry hits `duplicate-order`. Fix: create a $0 order as paid in one transaction.
    - R3-002: any database that already applied the earlier 0018 keeps `fee > 0`, so reset it.
    - R3-003: the "Cuota" error says "sin puntos ni centavos", but `parseWholePesos` accepts "12.500"; align the copy.
- L40 (2026-11-16, owner, verbatim, answering which email a manual enrollment sends): "Mail según el caso (Recommended)" (option text: "Si queda pendiente, recibe "Recibimos tu inscripción". Si es una beca de $0, recibe directamente "Confirmamos tu lugar", sin hablar de pago."). S2 updated. Next unit, delegated to one writer (long-session backstop):
  - a $0 manual order is created already paid, with its seat claimed, in one transaction (fixes R3-001);
  - manual-order emails follow the owner's decision;
  - the "Cuota" error copy matches what `parseWholePesos` accepts (R3-003).
- L41 (2026-11-16): atomic $0 orders and manual-order emails committed in `8f764d4` (a delegated writer, resumed after the session restart).
  - Correction to L36/L40: at the baseline, manual orders sent no email at all (`request-services.ts` wired them unwrapped "on purpose"), not the web email. The owner's L40 rule still applies as written.
  - What changed:
    - `OrderDraft.paidOnCreation` makes the create transaction store a paid order with one audit row and claim the seat through the shared `claimSeat` (`seat-claim.ts`). A full turno rolls everything back with `turno-full`.
    - The new decorator `withManualEnrollmentEmails` sends "Recibimos tu inscripción" for pending orders and the new "Confirmamos tu lugar" for $0 orders.
    - The "Cuota" error now reads "Ingresá la cuota en pesos enteros, sin centavos; los puntos de miles se aceptan. Por ejemplo: 58000 o 58.000."
  - Writer evidence: RED then GREEN per rule. DB: order repository 18, admin store 22, request services 14, audience reader 3. Typecheck, eslint and prettier clean.
  - Parent seam run at `8f764d4`: `--project unit` 290 files / 3301 passed; `--project ui` 122 files / 1023 passed.
  - Independent verifier launched (items 1 and 4).
- L42 (2026-11-16): the independent verifier passed `8f764d4` on all six items. A $0 manual order is stored paid with one audit row and its seat claimed. On a full turno nothing changes (full snapshot identical, no number burned). In the concurrency probes, 12 creates on 4 free seats gave 4 paid and 8 `turno-full`, numbered 0001-0004 with no gaps, and 8 same-student creates gave 1 success. Emails go out by case, and a $0 order's email has no payment wording; a failing email never fails the enrollment. Reminders skip $0 orders, and priced manual and public orders behave as at the baseline. The owner granted the native review ("Revisar este cambio"); risk and reliability are running.
- L43 (2026-11-16): native review over `df2a3b4..d6a8a24`: risk and reliability approved it, and the acknowledgement burned the authority (lineage `review-18885ccdc491d404`). The acknowledgement command comes from the final capture's `acknowledgement` field: committing `a25dfac` during the review moved the workspace target, so the bound STATUS asked for a fresh preflight. Do not commit while a review runs. Advisory suggestions, separate later work: a test for the empty-number guard in `withManualEnrollmentEmails` (R3-001), and a test that `paidAtIfFree` without `createdBy` never settles an order (R3-002).
- L44 (2026-11-16, owner, verbatim, answering whether a manual monthly enrollment may add catalog materials even though monthly periods carry none): "Sí, opcional" (option text: "Agrego un buscador del catálogo para sumar materiales con precio a esa inscripción, y el total pasa a ser la cuota más los materiales."). S2 updated.
  - The public monthly flow and the periods stay without materials.
  - Only the admin manual form gets an optional catalog search. The materials snapshot into order lines, and total = fee + materials.
  - Only a $0 total counts as free.
  - Delegated to one writer.
- L45 (2026-11-16): optional catalog materials in manual enrollments committed in `6c2c187` (one delegated writer).
  - What it does:
    - The form has a "Materiales (opcional)" search over active, available, priced variants (new `MaterialsService.listSaleVariants`), with quantities and a running total.
    - Only a request with `createdBy` resolves lines through the catalog-backed lookup (`sale-catalog-adapter.ts`); the public path still refuses lines.
    - Only a $0 total is created paid.
  - Writer evidence: RED then GREEN for (a)-(d) and the pending case of (f). The public refusal (e), the still-paid $0 total and the no-materials manual path were pinned as existing behaviour, with no RED. Focused unit/ui 191 passed (architecture test included), DB `request-services` 15 and `drizzle-order-repository` 18; typecheck, eslint and prettier clean.
  - Parent checks: scope inside the allowed surfaces; spot check 16/16. Seam run at `6c2c187`: `--project unit` 292 files / 3340 passed (198 s); `--project ui` 123 files / 1040 passed (107 s).
  - Follow-up: the form hardcodes quantities 1-20, while the server uses `MAX_LINE_QUANTITY`.
  - Independent verifier launched for item 3, the public path differential.
- L46 (2026-11-16): read-only map of S3 and S7 (explorer).
  - S3 is mostly missing:
    - There is no refunded state, correction or reopen to pending. Cancel releases the seat but is refused once materials are requested.
    - There is no sale concept, so post-payment sales depend on T2.
    - `student.active` exists but nothing reads or toggles it; the students module still derives students from orders by email.
  - S7, implemented:
    - Pending students appear on the roster but cannot be marked.
    - One make-up per absence (unique index).
  - S7, missing (no migration):
    - The make-up target is not restricted to another turno of the same workshop; `attendance-sheet.test.ts:159` pins "offers every scheduled turno".
    - There is no full-turno warning.
  - S7, missing (with migration): there is no "missed" make-up state.
  - Defect: re-saving a class deletes every mark of the session and re-inserts only the current paid roster, so a mark of a since-cancelled or moved student is erased.
  - Planned units:
    - A1: make-up target rules, full-turno warning and history-safe saving (no migration).
    - A2: missed make-up state.
    - R1: refunds.
    - C1 and C2: corrections.
    - P1: student deactivate and reactivate.
    - S1: post-payment sales, after T2.
- L47 (2026-11-16, owner, verbatim, answering whether pending students can be marked): "Se puede marcar (Recommended)" (option text: "Una alumna pendiente se marca igual que una pagada, y si falta puede tener su recuperación. En la lista se sigue viendo que debe el pago."). S7 updated. The independent verifier passed `6c2c187` on all four items; the public path output is byte-identical to the baseline for the same inputs. Unit A1 (attendance rules, no migration) delegated to one writer while the native review of `d6a8a24..80800ec` runs.
- L48 (2026-11-16): native review over `d6a8a24..80800ec` (owner consent): risk and reliability approved, and the acknowledgement burned the authority. Suggestions, separate later work:
  - R3-001: a catalog read failure makes the loader return 503 even for the no-materials path.
  - R3-002: the UI hardcodes quantities 1-20 instead of the shared constants.
  - R3-003: the client running total strips every dot, so "5.8" shows as 58; this is display only, and the server stays authoritative.
- L49 (2026-11-16, owner, verbatim, answering how a refund of a paid monthly order is recorded): "Total o parcial (Recommended)". Option text: "Cancelás la inscripción y cargás cuánto le devolviste (todo o una parte), la fecha y una nota. Se libera el lugar y queda el registro del pago y de la devolución." This applies to unit R1.
- L50 (2026-11-16, owner, verbatim, answering whether orders whose materials were requested or received can be cancelled): "Se puede cancelar (Recommended)" (option text: "Se puede cancelar y devolver en cualquier estado. Si los materiales ya se pidieron, vos decidís cuánto devolvés (por ejemplo, solo la cuota) y queda registrado."). For R1: cancel and refund are allowed from `paid`, `materials_requested` and `materials_received`; the refund amount is any whole-peso amount from $0 up to the paid amount.
- L51 (2026-11-16): unit A1 (attendance) committed in `0f9d449` (one delegated writer).
  - What changed:
    - Pending students are marked like paid ones, and the note still shows.
    - A make-up target must be another `turnoId` of the same workshop, on a date in the target period and on its weekday. The writer's assumption is that the own turno is refused in every month.
    - A full target warns (`?ok=makeup-full`, info tone, after confirming) and still books.
    - `replaceSession` became `upsertMarks`, so marks are never deleted.
    - Absent to present with a booked make-up is refused (`make-up-booked`).
    - New copy lives in `src/app/attendance/copy.ts` (same pattern as the intensive-requests and private-events copy); the parent removed the stale `adminMicrocopy.attendance.sheet.pendingNote`.
  - Writer evidence: RED for the service (12), UI (4) and route (9); the domain and contract tests have no separate RED. Unit/ui 13 files / 121 passed (architecture test included); DB attendance repository 10/10; typecheck, eslint and prettier clean.
  - Parent checks: scope inside the surfaces, typecheck exit 0, spot check 28/28.
  - Named risks: item 3 (attendance port changed) and item 4 (the make-up-booked check is not atomic with the write).
  - An independent verifier runs in an isolated worktree, while unit R1 (refunds) is delegated to a writer in the main tree. A single seam run will cover A1 and R1.
- L52 (2026-11-16): independent verifier for `0f9d449`: items 1-4 PASS.
  - Pending students are marked and get make-ups.
  - The own turno, another workshop's turno and bad dates are refused.
  - A full target warns and still books.
  - Re-saving keeps the marks of students who left the roster. Absent to present with a make-up is refused with nothing changed.
  - Concurrency: three parallel bookings for one absence produce one make-up.
  - ADVISORY, not a regression: a save that flips the absence to present can race with a make-up booking and leave a make-up without its absence. The baseline allowed this state even sequentially. Follow-up: do the check and the upsert atomically.
  - Boundary note: the warning fires when roster plus booked make-ups, including the new one, exceed capacity.
- L53 (2026-11-16): native review over `80800ec..f61c69c` (owner consent, lenses risk, resilience and reliability): approved, and the acknowledgement burned the authority.
  - Fixed inline in a follow-up commit: R4-001/R3-002. The occupancy read ran after the make-up was stored, so a failure threw. It now degrades to `targetFull: false`: RED `Error: occupancy read failed`, GREEN 27/27.
  - Open follow-ups:
    - R1-001/R4-002/R3-001: the make-up-booked check and the mark upsert are not atomic (same advisory as L52).
    - R3-003: every not-selectable make-up issue now shows the in-month text, even for a plain weekday mismatch.
- L54 (2026-11-16): unit R1 (refunds) committed in `056069f` (one delegated writer).
  - What changed:
    - Cancel is allowed from every paid state and releases the seat once.
    - A paid cancel records the refunded amount ($0 up to the paid amount), the Córdoba date (from the payment day to today), an optional note and the admin. A pending cancel records no refund.
    - Refusals return `invalid-refund`, and nothing is stored.
    - 0018 gains four refund columns and three checks, with a hand-edited snapshot.
    - New `enrollment-cancel-form-data.ts`; the detail screen asks for and shows the refund.
  - Writer gaps:
    - The audit row keeps the cancel reason, and the refund lives on the order row.
    - The list route still offers cancel only for pending orders.
  - Seam run at `056069f` (covers A1, its fix and R1): `--project unit` 293 files / 3425 passed (552 s, alongside the verifier); `--project ui` 123 files / 1048 passed.
  - Independent verifier, all five items PASS:
    - The seat is released once from each paid state.
    - Refund bounds hold, and every refusal leaves the full snapshot unchanged.
    - 0018 on legacy data leaves NULL refund fields, and its checks reject inconsistent rows.
    - The snapshot differs only by the new columns and checks.
    - Insights exclude cancelled orders, refunded or not.
- L55 (2026-11-16): native review over `b87b0d4..9ef4053` (owner consent): risk and reliability approved, and the acknowledgement burned the authority.
  - Advisories:
    - R1-001/R3-002: a database that already applied the earlier 0018 will lack the refund columns. Before using such a database (for example a local dev database), reset it; staging is still at 0017.
    - R3-001: a detail page loaded while the order was pending posts a cancel without refund fields. If the order was paid in between, the cancel is refused with "amount required"; reload and retry.
    - R3-003: any malformed refund amount containing a dot or comma gets the "sin centavos" message.
- L56 (2026-11-16, owner, verbatim, answering what happens when a correction lowers the amount of a paid order): "Sigue pagada (Recommended)" (option text: "Si el monto baja, la inscripción queda pagada y cargás la diferencia que le devolviste. Solo vuelve a pendiente si el monto sube, y entonces confirmás el pago del nuevo total."). This applies to unit C1 (corrections).
- L57 (2026-11-16): unit C1 (corrections) committed as `53f84a9` (domain, store and `order_correction` folded into 0018) and `8035633` (detail form and history). One delegated writer did both.
  - Rules:
    - A pending correction stays pending.
    - A paid correction with an unchanged total stays paid.
    - A raised total returns to pending, keeps the previous payment on the correction, and releases the seat.
    - A lowered total stays paid with the new `paid_amount` and records the refunded difference.
    - Turno and period moves swap seats in one transaction, in key order.
    - A full target or an already-held month refuses everything.
    - Cancelled orders are `not-correctable`.
  - Writer gaps:
    - RED was not observed for the schema checks, the store or the service tests. The schema checks were proven by mutation instead.
    - A no-change correction is still recorded.
    - The note is optional.
    - `loadCorrectionOptions` copies the manual-creation loader.
    - `createAdminEnrollmentService` now requires `offers`.
  - Seam run at `8035633`: `--project unit` 295 files / 3527 passed; `--project ui` 124 files / 1060 passed.
  - Independent verifier, all six items PASS:
    - A raise clears payment, keeps history and re-confirms.
    - Lowered-refund bounds hold, and refusals leave the full dump byte-identical.
    - Full or duplicate targets are refused. Opposite concurrent moves do not deadlock, and 8 moves into 3 seats give 3 successes.
    - 0018 runs on legacy data, `order_correction` checks reject bad rows, and the snapshot differs only by the new table.
    - Confirm, cancel and refund are unchanged.
  - Advisories:
    - A full swap between two full turnos is refused both ways.
    - The 0018 student backfill (baseline behaviour) fails when two legacy emails share one phone; the L25 query counts exactly this.
- L58 (2026-11-16): the native review START of `2c295ae..6cc7d75` (4867 lines) stopped with `lens_context_budget_exceeded`, and no authority was created. The owner was asked whether to split it into 4-5 reviewed slices or skip; verbatim answer: "Saltar esta revisión". Corrections stand on the writer checks, the seam run and the independent verifier (L57). The next review candidate starts at base `6cc7d75`.
- L59 (2026-11-16, owner, verbatim, answering what an inactive student's new web enrollment does): "Se reactiva sola (Recommended)". Option text: "La inscripción web entra normal y la alumna vuelve a quedar activa. "Inactiva" sirve para ordenar la lista del panel, sin bloquear nada; su historial se conserva."
  - S3 updated.
  - Two units are delegated in parallel, with disjoint surfaces:
    - P1: student deactivate and reactivate, no migration.
    - A2: a "missed" make-up state, folded into 0018.
- L60 (2026-11-16, owner, verbatim, answering what happens when an own-stock variant lacks units at payment): "Siempre se va a ofrecer lo que haya en stock, si no hay nada no se ofrece y se ofrece productos del proveedor, eso se habla todo personalmente o por WhatsApp externo del software, por eso buscamos algo sencillo, sin tantas complicaciones". Consequence for T2: keep the stock model minimal. Admin searches offer own-stock variants only while on-hand > 0, and otherwise the supplier-orderable ones. A paid sale decrements on-hand and never goes below zero. No partial-fulfillment or fallback logic. Negotiation happens outside the software.
- L61 (2026-11-16): unit A2 (missed make-up) committed in `146f654`.
  - What it does:
    - A pending make-up can be marked done or missed ("No vino"), recording who and when in `done_by`/`done_at`. Both outcomes are terminal (`make-up-closed`), and repeating the same action is idempotent.
    - A used make-up, done or missed, refuses a rebooking with `make-up-used`.
    - 0018 re-adds `attendance_make_up_status_check` and `attendance_make_up_done_check` to allow `missed`; the snapshot changes two check strings.
  - Writer evidence: RED 13 unit/ui and 3 fake-contract cases. Then unit/ui 10 files / 133 passed (architecture included), DB attendance repository 14/14, `drizzle-kit generate` with no changes, and typecheck, eslint and prettier clean.
  - Surface note: the writer also edited `src/app/ui/admin/make-ups-list.tsx` and its test. It is attendance UI outside the listed globs and conflicts with no other unit, so the parent accepted it.
  - Gap: the student summary still counts only pending and done make-ups.
  - One independent verifier will cover A2 and P1 together after P1 lands.
- L62 (2026-11-16): unit P1 (students active and inactive) committed in `0845c73`.
  - What it does:
    - The enrollments port `StudentActivityStore` (`inactiveEmails`, `setActive`) has a Drizzle adapter wired in composition.
    - The detail screen deactivates and reactivates a student (`intent=deactivate|reactivate`).
    - The list filters with `mostrar=activas|inactivas|todas`, active by default, and shows an "Estado" column.
    - The order create transaction sets `active: true` on a matched profile.
  - Writer evidence: RED on the real DB for the reactivation rule (2 failed). Service, route and UI tests have no true RED and were proven by mutation (6 failed). Unit/ui 10 files / 109 passed, DB order repository 26 and request-services 15; typecheck, eslint and prettier clean.
  - Gaps:
    - `mostrar` is parsed in the new `src/app/students/activity-filter.ts` instead of `parseStudentFilter`.
    - Deactivating a student with no `student` row returns not-found.
  - Seam run at `0845c73` (covers A2 and P1): `--project unit` 296 files / 3558 passed; `--project ui` 124 files / 1069 passed.
  - One independent verifier covers A2 and P1.
- L63 (2026-11-16): independent verifier for A2 (`146f654`) and P1 (`0845c73`), all four items PASS.
  - A2: missed and done make-ups are terminal for each other, rebooking returns `make-up-used`, and the raw-SQL checks accept only consistent who/when.
  - P1: deactivating and reactivating leaves orders, audit, note, attendance and student identity byte-identical. Public, free manual and phone-match enrollments reactivate the profile, while refusals (duplicate month, full turno, conflicting identity) leave it inactive.
  - The differential dump of enrollment and make-up flows is identical between baseline `1031e42` and `0845c73` (350 lines).
  - 0018 on legacy data with done and pending make-ups migrates, the new checks hold, and `drizzle-kit generate` reports no changes.
- L64 (2026-11-16): native review over `6cc7d75..d078b52` (owner consent): approved, and the acknowledgement burned the authority.
  - R3-001 (the student summary ignored missed make-ups) was fixed inline in a follow-up commit: `makeUpsMissed`, "Recuperaciones perdidas". RED was 3 failing tests; GREEN 62/62, with typecheck and eslint clean.
  - R3-002 suggestion: deactivating one registry row also hides other emails linked to the same profile. This is intended, but no test pins it.
  - T2 map (explorer):
    - No cost or stock column exists.
    - Saving a material deletes and re-inserts its variant rows, so stock must live in its own table.
    - `order_line` already snapshots price and supplier.
    - The order statuses `materials_requested` and `materials_received` and the "pedir"/"entregar" consolidation screen already cover S5 at order level.
    - Proposed units: WU1 variant cost; WU2 `variant_stock` with adjustment; WU3 line source and cost snapshot; WU4 take and return stock at confirm, cancel and correction; WU5 insights with real cost; WU6-7 supplier purchases and idempotent receipt (optional).
- L65 (2026-11-16, owner, verbatim, answering whether the order-level "pedidos/recibidos" marks are enough or each supplier purchase should be recorded): "Alcanza, simple (Recommended)". Option text: "Sigue como hoy: marcás pedido y recibido por inscripción. Si le comprás unidades de más al proveedor, las sumás con "ajustar stock". Son 5 partes."
  - T2 scope: WU1-WU5 only; there are no supplier purchase records. Stock changes stay folded into the unapplied 0018 with minimal snapshot edits.
  - Parent assumptions:
    - Units taken from stock return on cancel or on a correction back to pending, but not once the order is `materials_received` (received is terminal: used and handed over).
    - Variants without a price stay unsellable, as today.
  - Route: unit S-A (WU1+WU2, materials: cost, stock table, stock adjustment) first, then unit S-B (WU3-WU5, enrollments: line source and cost snapshot, stock take and return, manual form stock labels, insights with real cost).
- L66 (2026-11-16): unit S-A (variant cost and stock) committed in `5a4ae34`.
  - What it does:
    - `material_variant.cost_centavos` (nullable, > 0) is edited in the form, kept across save, import and price raise, and shown.
    - New `variant_stock` (`on_hand >= 0`, no FK) and `stock_adjustment` (non-zero delta, reason) tables. The detail shows "En stock: N" and an "Ajustar stock" form that is refused below zero.
    - The port `VariantStockPort` (`onHand`, `take(tx,…)`, `put(tx,…)`, with a `StockStamp`) is implemented by `createDrizzleStockStore`.
  - Writer evidence: RED observed for the unit, service, form and UI tests; the DB cost assertions have no separate RED. Unit/ui 18 files / 185 passed (an earlier full unit/ui run gave 4669). DB: material repository 20, stock store 10 (10 concurrent takes on 3 units give 3 successes), migrate 7, catalog import 4. `drizzle-kit generate` reports no changes, with 152 snapshot lines inserted and none deleted.
  - Unit S-B (line source and cost snapshot, stock take and return, manual form labels, insights cost) is delegated next. One seam run, verifier and review will cover S-A and S-B.
- L67 (2026-11-16, owner, verbatim, answering whether to drop the per-unit independent verifier and native review): "Si, que corra una sola vez al final, de forma exhaustiva para ya avanzar mas rapido, la última verificacion final tiene que ser mas profunda, ya que al no hacerse ahora, al final tiene que ser mas detallada".
  - From S-B onward, units run their own RED/GREEN tests and the full unit/ui seam, with no per-unit verifier and no per-unit native review.
  - T6 becomes an exhaustive final verification over everything since the last reviewed boundary (`d078b52`, plus the fix `5dc581e`):
    - independent verifiers per area: enrollments and payments, stock, attendance, students, workshop projects, panel;
    - the 17 DB files never rerun after T7, and the full DB suite;
    - a migration 0018 rehearsal on a copy of staging-shaped data;
    - the differential against the baseline;
    - native review split into slices under the lens budget;
    - full lint and typecheck;
    - a phone browser walkthrough.
- L68 (2026-11-16): unit S-B (sales use stock) committed in `1673823`.
  - What it does:
    - Lines record `source` (`stock`/`supplier`) and `unit_cost_centavos`; the manual search shows "En stock: N" or "A pedir".
    - Confirm and $0 creation take stock in the same transaction; a line whose stock ran out switches to `supplier`.
    - Cancel or correction back to pending returns the units, except from `materials_received`.
    - The consolidation counts `supplier` lines only, and a stock-only order may go `paid` → `materials_received`.
    - Insights use the line cost, with the price as fallback.
  - Writer evidence: RED for the unit, UI and DB checks; the DB stock tests were proven by mutation. Unit/ui 87 files / 1065 passed. DB admin store 75, order repository 30, insights 11, schema 49, request services 15. 8 concurrent confirms on 3 units give exactly 3 stock and 5 supplier. `drizzle-kit generate` reports no changes.
  - Parent seam run at `1673823`: `--project unit` 298 files / 3628 passed; `--project ui` 124 files / 1080 passed.
  - Gaps for T6:
    - The new fields are optional ("absent means supplier").
    - The detail-route stock-only actions have no route-level test.
    - A `materials_received` order corrected back to pending and paid again takes its stock lines a second time.
  - Per L67, no per-unit verifier or review.
- L69 (2026-11-16, owner, verbatim, answering whether workshop projects take materials from stock): "Sí, simple (Recommended)" (option text: "Cada proyecto lista sus materiales por participante. Al confirmar la seña se descuentan del stock propio; lo que no hay aparece en la lista de pedidos al proveedor. Si se cancela, vuelven al stock."). T3 is planned after a read-only map of intensives and reservations.
- L70 (2026-11-16): owner asked "Espera, no estas confundiendo talleres con worksho cierto?". Terminology confirmed: T3/S6 is about the dated one-off workshops (`intensive_workshop` in code, "workshops" on the public site), NOT the monthly "talleres". Read-only map of intensives:
  - Each intensivo has one price and one deposit. Request statuses are pending, confirmed (deposit paid) and cancelled. Confirmation runs under an advisory lock with a capacity guard; cancel is not transactional.
  - There is no project, no balance and no materials.
  - Insights pay the teacher on deposits only.
  - Proposed units:
    - W1: schema in 0018 (`intensive_project`, `intensive_project_material`, `intensive_request_material`, request project, price and deposit snapshot, balance columns, backfill of one project per intensivo).
    - W2: projects admin.
    - W3: bill of materials editor.
    - W4: public project choice.
    - W5: atomic stock allocation at confirm and return at cancel.
    - W6: balance payment.
    - W7: settlement on full payment and material cost.
    - W8: intensivo supplier lines in the "pedir" list.
- L71 (2026-11-16, owner, verbatim, approving the T3 plan of L70): "Si". Route: T3-A (W1+W2: schema folded into 0018, projects admin) first; then T3-B (W3 bill of materials editor) and T3-C (W4 public project choice) in parallel; then T3-D (W5+W6: atomic allocation and balance); then T3-E (W7+W8: settlement and "pedir" list). Per L67, units run their own tests and the full unit/ui seam only.
- L72 (2026-11-17): unit T3-A (W1+W2, delegated) landed in `d0e7d78` (schema, domain, backfill) and `5ebbcdd` (admin projects screen).
  - 0018 now also holds `intensive_project`, `intensive_project_material` (no FK to `material_variant`) and `intensive_request_material`, plus request `project_id`, price and deposit snapshot and five balance columns with all-or-nothing checks. The backfill creates one project per existing intensivo.
  - Publishing needs at least one project. A project referenced by a request cannot be deleted (`in-use`). The writer added one rule beyond the spec: the last project of a published or paused workshop cannot be deleted (`last-project`).
  - The parent added the missing "al menos un proyecto" publish message (`issue-messages.ts`).
  - Writer evidence: RED then GREEN for domain, contract (fake and Drizzle), service, form data, UI and route. DB files run one at a time: intensive repository 58, request repository 13, migrate 7, project schema 14, backfill 4. `drizzle-kit generate` reports no changes.
  - Parent seam at `5ebbcdd`: typecheck green; `--project unit` 301 files / 3697 passed; `--project ui` 125 files / 1093 passed.
  - Notes for later units and T6:
    - The "referenced by a request" check reads `intensive_seat_request` with raw SQL, because the schema ownership rule forbids importing another module's schema.
    - Request creation (T3-C) must lock the project row `FOR SHARE` in the same transaction.
    - The balance check allows balance only on `confirmed`; T3-D must decide cancel after a paid balance.
    - Editing the intensivo price or deposit does not change its default project.
- L73 (2026-11-17): units T3-C and T3-B (delegated, parallel, disjoint surfaces) landed.
  - T3-C `af93d87`: the public workshop page lists projects and the request form requires one (preselected when only one). The request stores `project_id` plus a price and deposit snapshot. The insert locks the project row `FOR SHARE`; a 12-pair concurrent insert/delete DB test fails without it. Emails, summary, WhatsApp link and admin requests list name the project. A request with a null project uses the workshop terms.
  - T3-B `2c90a33`: each project has a bill of materials: catalog variant plus quantity 1-20 per participant, shown with stock on hand for reference. A duplicate variant in one project is refused under a project row lock. A variant that left the sale catalog shows as unavailable and can be removed.
  - Writer evidence: RED then GREEN per layer (B: a few UI tests had no observed RED). DB: request repository 19, public intensivo records 18, intensive repository 68.
  - Parent seam at `2c90a33`: typecheck green, eslint and prettier clean on changed files; `--project unit` 302 files / 3774 passed; `--project ui` 126 files / 1110 passed.
  - Open for T3-D: admin confirm still validates against the workshop deposit, not the request snapshot. Editing a bill must not change materials already allocated. The admin "Proyecto" label is a local constant in `intensive-requests.tsx`.
- L74 (2026-11-17, owner, verbatim, answering what happens when a workshop request with the full balance paid is cancelled): "Se cancela y anota devolución (Recommended)" (option text: "Igual que en talleres: se cancela, el lugar y los materiales vuelven, y se anota cuánto se devolvió (puede ser $0). El cálculo del profesor la deja afuera."). T3-D (W5+W6) goes to one delegated writer (context backstop).
- L75 (2026-11-17): unit T3-D (W5+W6, delegated) landed in `8570def` (module, schema, wiring) and `fff0b4c` (admin).
  - Confirm checks the request's deposit snapshot (workshop terms when null). In the same locked transaction it copies the project's bill onto `intensive_request_material` (names, supplier, unit cost frozen) and takes each line from stock in variant order; a short line is stored as `supplier`.
  - One full balance payment (price minus deposit) on a confirmed request; a second one, or one on pending or cancelled, is refused; a deposit equal to the price leaves "No hay saldo".
  - Cancel is one transaction behind a row lock: frees the seat, returns `stock` lines once, records refund amount, date and note ($0 allowed, at most deposit plus balance). Supplier lines stay as history.
  - 0018 gained `refund_centavos`, `refunded_on`, `refund_note` and revised balance checks; `drizzle-kit generate` reports no changes.
  - Writer evidence: RED then GREEN per layer; DB files alone: request repository 42 (8 confirms on 3 units give 3 stock and 5 supplier; capacity 6 gives 6 confirmed and 2 full), stock store 10, migrate 7, project schema 20, backfill 4, insights reader 2, request services 15. DB tests not mutation-tested.
  - Parent seam at `fff0b4c`: typecheck green; `--project unit` 302 files / 3825 passed; `--project ui` 126 files / 1120 passed.
  - Gaps for T6: no email on balance or cancel; admin does not display allocated lines; a bill line whose variant no longer exists is skipped at confirm; the intermediate commit `8570def` alone may not typecheck (the admin route lands in `fff0b4c`).
- L76 (2026-11-17): unit T3-E (W7+W8, delegated) landed partially in `89c9e86`.
  - Settlement: a workshop request counts only when `confirmed` and fully paid (balance recorded, or deposit equal to price). Received amount is `paid_centavos + COALESCE(balance_centavos, 0)`; material cost is the sum of captured `quantity * unit_cost_centavos` of those requests. Monthly settlement unchanged (characterization test).
  - Purchase list: the monthly supplier consolidation also lists workshop `supplier` lines of confirmed requests, one row per workshop labelled "Workshop: <name>", month of the workshop date. Monthly output unchanged (characterization test).
  - Not built: ordered/received for workshop lines. Monthly ordered/received is per order status, not per line; `intensive_request_material.requested_at` exists but nothing sets it and there is no received marker. Received surplus to stock depends on it. Workshop lines stay in the list until the request is cancelled.
  - Writer decisions to confirm: the workshop earnings row shows $0 collected for deposit-only requests (all figures on the settled set); workshop purchase lines are valued at captured cost while monthly lines use the sale price.
  - Writer evidence: RED then GREEN (new lines reader proven by mutation). DB alone: insights reader 3, lines reader 2, admin enrollment store 75, request repository 42.
  - Parent seam at `89c9e86`: typecheck green; `--project unit` 302 files / 3836 passed; `--project ui` 126 files / 1122 passed.
- L77 (2026-11-17, owner, verbatim, answering how workshop supplier lines are marked as ordered): "Botón \"Ya lo pedí\" (Recommended)" (option text: "Cada workshop de la lista tiene un botón \"Ya lo pedí\". Al tocarlo, sus materiales salen de la lista. Si alguien cancela después de pedirlos, esos materiales pasan solos a tu stock."). Unit T3-F goes to one delegated writer (context backstop).
- L78 (2026-11-17, owner, verbatim, answering how a deposit-only workshop request shows in the earnings row): "Mostrar lo cobrado igual (Recommended)" (option text: "\"Cobrado\" suma todo lo que entró, señas incluidas. El pago al profesor, el costo de materiales y la ganancia cuentan solo las reservas con el saldo completo."). Inline follow-up after T3-F (shares the insights reader surface).
- L79 (2026-11-17, owner, verbatim, answering which amount workshop lines show in the purchase list): "Costo del proveedor (Recommended)" (option text: "Se muestra lo que te cobra el proveedor, guardado al confirmar la seña. Es lo que vas a pagar al pedirlo, porque en el workshop el material ya está incluido en el precio."). Already the T3-E behavior (`89c9e86`); no change.
- L80 (2026-11-17): T3 closed.
  - T3-F `3e3c1ea` (delegated, L77): each workshop row in "Para pedir" has a "Ya lo pedí" button per supplier section. It stamps `requested_at` on that workshop's unordered supplier lines of confirmed requests, under the same lock cancel takes; the list shows only unordered lines; a second press changes nothing. Cancelling a request returns its ordered supplier lines to studio stock once (4 concurrent cancels give one success). Writer evidence: RED then GREEN per layer; DB request repository 44, lines reader 5.
  - L78 inline `ab95a9f`: `IntensiveRegistrationRow.collectedCentavos` (deposits plus balances of confirmed requests) feeds "Cobrado"; teacher pay, material cost and profit stay on the fully paid set. RED observed in the service test; the DB reader test was updated after the code (no RED observed), insights reader DB 3 passed.
  - Parent seam at `ab95a9f`: typecheck green; `--project unit` 302 files / 3848 passed; `--project ui` 126 files / 1126 passed.
  - Gaps for T6 from T3: no email on balance or cancel; admin does not show allocated material lines; a bill line whose variant no longer exists is skipped at confirm; intermediate commit `8570def` alone may not typecheck; "Ya lo pedí" works per supplier section of a workshop.
  - Next: T1 leftover (S3 post-payment material sales), T4, T5, then T6.
- L81 (2026-11-17): T2 and T4 marked done (verification in T6). Re-checked: monthly settlement (`periodRegistrations`) sums the fee of `paid`/`materials_*` orders only, so cancelled or refunded orders drop out and a lowered correction settles on the corrected fee. Unit T1-S3 (separate post-payment material sales, S3) delegated to one writer, recommended design: an `enrollment_order` of kind `material_sale` linked to its monthly record, no seat, unique index limited to kind `enrollment`, with a full audit of every order reader.
- L82 (2026-11-17, owner, verbatim, answering whether the monthly workshop form warns that opened months keep their percentage): "Sí, un aviso (Recommended)" (option text: "Debajo del porcentaje: \"Los meses ya abiertos conservan su porcentaje; para cambiarlo, editá ese mes.\" No cambia ningún cálculo.").
- L83 (2026-11-17, owner, verbatim, answering whether the quick workshop form gets the card text): "Agregar \"Descripción\" (Recommended)" (option text: "El formulario rápido pide los dos textos, igual que el completo: \"Descripción\" para la tarjeta y \"Contenido interno\" para el detalle.").
- L84 (2026-11-17, owner, verbatim, answering whether to show a live turno name preview): "No hace falta (Recommended)" (option text: "El nombre aparece en la lista apenas guardás el turno. Menos cosas en pantalla."). No change.
  - L82 and L83 run inline after T1-S3 lands (both touch `src/app/ui/admin/microcopy.ts`, which the S3 writer also edits).
- L85 (2026-11-17, owner, verbatim): "En el % del proesor, tiene que aparecer en los turnos mensuales que tenga agendando activos". Asked to choose between propagating to active months and only showing it; owner answered, verbatim: "claro, osea al entrar en cada profesora se tiene que ver los talleres que tiene asginados actualmente, y los porcentajes que se esta lelvando de ese taller, con la psoiblidad de editarlos y que se ve reflejado en la seccion taller tambien".
  - New scope for S8 (teachers): the teacher detail in the admin lists the workshops currently assigned to that teacher with the percentage of each, editable there; an edit changes the same workshop percentage the workshop form shows. Already opened months keep their snapshot, with the L82 warning (the owner did not choose propagation). Runs with L82 and L83 as one unit after T1-S3 lands (shared microcopy file).
- L86 (2026-11-17): T1-S3 done (delegated, worker-high). A sale is an `enrollment_order` with `kind = 'material_sale'`, fee 0 and `parent_order_id` (no cascade); the active-record unique index is limited to `kind = 'enrollment'`; two CHECKs force parent, zero fee and positive materials; folded into 0018 (drizzle-kit "No schema changes", no 0019 files). `createSale` locks the parent row; confirm/cancel reuse the monthly code without seat claim/release; stock take/return shared. Reader audit: sales excluded from roster, audience, `all()` history (students list, reminders), period registrations, participation and `findByPublicId`; included in `byEmail()`, materials income/cost, materials lines, pending summary, admin list, consolidation and delivery; `correct` refuses a sale. New route `/admin/inscripciones/:id/venta-nueva`. Commits `7261962` (schema, modules, composition) and `f73f79e` (admin UI); the first may not typecheck alone (T6 gap, like `8570def`).
  - Evidence: writer RED/GREEN per reader and store; DB files one by one green (sale store 15, admin store 75, order repository 31, insights reader 12, roster 1, audience 3, history 4, stock store 10, migrate 7, schema 52, backfill 2, request services 16). Parent: `pnpm typecheck` exit 0, unit 304 files / 3877 passed, ui 127 files / 1138 passed.
  - Writer assumptions for the owner to confirm in T6 (not asked yet): (1) any non-cancelled monthly record accepts a sale, pending included; (2) cancelling the record leaves its sales, voided separately; (3) a sale keeps its creation month if the record is corrected; (4) pending sales appear in "por cobrar" and pending counters; (5) sales excluded from reminders; (6) no payment email for a sale.
  - Open for T6: S4 "own-stock variants offered only while units remain" not enforced in the sale picker (same as the manual form; no availability flag); `InMemoryAdminEnrollmentStore` not sale-aware; no dedicated test for concurrent create-sale vs cancel-record; `not-correctable` message says "cancelado". Scratch `...\scratchpad\s3\` to remove.
  - Next: one inline unit for L82 + L83 + L85, then T5, then T6.
- L87 (2026-11-17): L82, L83 and L85 done inline in `0124d0c`.
  - L82: the workshop form's "Porcentaje acordado" hint ends with "Los meses ya abiertos conservan su porcentaje; para cambiarlo, editá ese mes." (part of the field's accessible description). No calculation changes.
  - L83: the quick form asks "Descripción" (`summary`, with the card hint) before "Contenido interno". A blank one gets the service's "Completá este campo.", like the full form; it is no longer derived. `deriveSummary` stays for the intensive quick form.
  - L85: new use cases `MonthlyWorkshopsService.listForTeacher` (the teacher's draft, published and paused workshops, by name) and `setPercentage` (changes only the percentage, validated against the assigned teacher's modality, stamps the actor). `/admin/profesores/:id` shows "Talleres asignados", with one native post form per workshop (`intent=percentage`). Saving redirects with `?ok=percentage` ("Porcentaje guardado"), and the workshop form shows the new value. A refusal returns 422 and keeps the typed value and the message on that row. An own-modality teacher sees "Modalidad propia: sin porcentaje acordado.". The L82 note heads the list, and opened months keep their snapshot.
  - Evidence: RED then GREEN per layer (service 3, intent parser 1, route 6, panel UI 3, workshop form UI 2, quick parser 2, quick route 1); the quick publish fixture gained a `summary`. `pnpm typecheck` exit 0; `vitest run --project unit` 304 files / 3887 passed; `--project ui` 128 files / 1143 passed; eslint and prettier clean on the changed files.
  - For T6: `listAssignmentsOfTeacher` is a stub at the baseline (always empty), so the archived-teacher warning never names an activity; untouched. `setPercentage` rewrites the whole workshop row, the same read-modify-write as the workshop form save.
  - Next: T5.
- L88 (2026-11-17, owner, verbatim, answering what the panel bell shows): "Novedades y pagos (Recommended)" (option text: "El número cuenta solo lo nuevo sin abrir (inscripciones web, reservas de workshop y eventos privados). Al abrir una, queda leída para las dos. Al tocar la campanita también ves la lista de pagos pendientes (cuotas, señas y saldos de workshops), que sigue ahí hasta que se paga, sin vencimientos.").
  - Map (read-only explorer): there is no read state on any request, no notification table, and the counters live only on the home page (`insights.panel`, `privateEvents.list("nueva")`). `PanelView.alerts.pendingOverdue` (48 h) is an overdue concept nobody renders.
  - Unit T5-N (bell), delegated to one writer (long-session backstop). Design:
    - A shared `seen_at`/`seen_by` on `enrollment_order`, `intensive_seat_request` and `private_event_request`, folded into 0018. Legacy rows are backfilled as seen.
    - Admin-created orders and sales are seen at creation.
    - Opening `/admin/inscripciones/:id`, `/admin/eventos/:id` or `/admin/intensivos/:id/reservas` marks the opened request(s) seen. A failed mark never fails the page.
    - The layout loader gives the shell the unseen count; a failed read hides the badge.
    - The bell links to `/admin/novedades`, which lists the unseen novelties and the pending payments: monthly fees, workshop deposits, workshop balances, plus pending material sales (parent assumption for T6). There are no due dates; the unrendered `pendingOverdue` is left untouched.
  - Then unit T5-P (global policies), after its product questions.
- L89 (2026-11-17, owner, verbatim, answering which policies the site has and how they are accepted): "Globales + las del workshop (Recommended)" (option text: "Hay un documento de Condiciones y otro de Privacidad para todo el sitio, editables desde el panel y con historial de versiones. Cada workshop sigue mostrando además sus condiciones propias. Una sola casilla en ambos formularios: \"Leí y acepto las condiciones y la política de privacidad\", con enlace a cada documento.").
- L90 (2026-11-17, owner, verbatim, answering where the first text of each document comes from): "Texto base para editar (Recommended)" (option text: "Cargo una primera versión corta de cada uno con lo que el sitio ya dice (condiciones de pago y cancelación; privacidad: los datos se usan solo para la inscripción y para escribirte, no se comparten). Vos la revisás y la editás en el panel antes de lanzar.").
- L91 (2026-11-17): T5-N (bell) done (delegated, worker-high) in `57c9fe0` (schema, modules, composition) and `d312eb4` (admin shell, `/admin/novedades`, mark-seen in the three detail loaders).
  - `seen_at`/`seen_by` folded into 0018 on the three tables, with a both-null-or-both-set CHECK. Legacy rows are backfilled seen (`seen_by` = 'migration 0018', at their request/creation time). drizzle-kit printed "No schema changes".
  - Public requests are stored unseen. Admin-created orders and sales are stored seen by their creator.
  - `markSeen` on enrollments, private events and intensive requests (all requests of one workshop) is one conditional UPDATE, so the first mark wins.
  - `insights.notifications` and `unseenCount`: material sales never count as novelties, and pending sales are listed under "Pagos pendientes". Viewing `/admin/novedades` marks nothing seen.
  - Evidence: writer RED/GREEN per store, service, loader and component (exceptions listed in its report: the DB create-time seen state, the layout UI bell, the backfill, concurrency and `createSale` seen were written alongside or before their tests). DB files one by one green, including the new `panel-seen-backfill`. Parent: `pnpm typecheck` exit 0; unit 307 files / 3938 passed; ui 129 files / 1156 passed; `drizzle-private-event-repository.db.test.ts` re-run 14/14 (the writer had not re-run it after a fix).
  - For T6:
    - The badge on the page that just opened a request can lag one navigation, because the layout and child loaders run in parallel.
    - Unseen excludes cancelled orders and seat requests; private events have no status filter.
    - A legacy pending seat request with no deposit snapshot owes the workshop's deposit ($0 if that row is gone).
    - The pending list is unbounded across periods, and `unseenCount` reads full rows on every admin page (a COUNT would be cheaper).
    - `InMemoryAdminEnrollmentStore` is not sale-aware, so seen-on-sale is covered by DB only.
    - The writer's scratch is under `...\scratchpad\*.cjs` and `/tmp/dbrun/`; remove it.
  - Next: T5-P (global policies, L89-L90), delegated to one writer (long-session backstop).
- L92 (2026-11-17): T5-P (global policies) done (delegated, worker-high) in `3b4dc0e` (module, schema, 0018 seed, service, composition, acceptance stored) and `55d3feb` (public forms, `/condiciones`, `/privacidad`, `/admin/politicas`, acceptance line in the enrollment detail and the workshop requests). The first commit alone leaves the public forms failing closed (T6 gap, like `8570def`).
  - New `policies` module. `policy_version` (unique kind+version, `body ~ '[^[:space:]]'` CHECK) is folded into 0018, with version 1 of each document seeded by 'migration 0018'. `conditions_version`/`privacy_version` (both null or both set) were added to `enrollment_order` and `intensive_seat_request`. drizzle-kit printed "No schema changes".
  - Both forms show one checkbox "Leí y acepto las condiciones y la política de privacidad", linking to each document in a new tab, and post the versions they showed.
    - The server checks both versions through an enrollments-owned port, which the intensive-requests service reuses.
    - An unknown version is refused with "Las condiciones cambiaron. Volvé a leerlas y aceptalas."
    - If the policies read fails, the submit fails closed with the generic unavailable message.
    - The workshop's own conditions stay above the checkbox.
  - Owner-created orders store null versions; a material sale copies its parent's (parent assumptions for T6).
  - Evidence: writer RED/GREEN per rule (exceptions in its report: the domain body validator, the form helpers, the policy-page template, the admin policies ui test, the order CHECK and the sale copy were written alongside). Each DB file ran alone and passed:

    | DB file                                | Tests |
    | -------------------------------------- | ----- |
    | `policy-seed`                          | 6     |
    | `drizzle-policy-repository`            | 5     |
    | `enrollment-schema`                    | 53    |
    | `drizzle-order-repository`             | 35    |
    | `drizzle-intensive-request-repository` | 20    |
    | `drizzle-material-sale-store`          | 20    |
    | `request-services`                     | 18    |
    | `migrate`                              | 7     |
    | `drizzle-admin-enrollment-store`       | 79    |

    Parent: diff inside the allowed surfaces; `pnpm typecheck` exit 0; unit 318 files / 4037 passed; ui 132 files / 1175 passed.

  - For T6:
    - `enrollment_order.policy_version` is still written as "2026-10" and is redundant now.
    - `/condiciones` and `/privacidad` are not in the menu or sitemap (`PUBLIC_PAGES` is asserted to be six items).
    - "Políticas" borrows the catalog tint and the `note` icon.
    - The shared helpers `policy-document.ts` and the version parsing live in `src/app/enrollment/`.
    - There is no end-to-end DB test for the seat-request acceptance.
    - The stale-version reload has not been checked in a browser.
    - The owner reviews both base texts before launch (L90).
    - Writer scratch: `...\scratchpad\t5p\` and `t5p-red-seed.log`.
  - Next: T5 mobile verification of the panel (S9), then T6.
- L93 (2026-11-17): T5 mobile verification done (inline).
  - Setup:
    - Local embedded Postgres on 5432 (`calma_dev`), migrated with the current 0018 and seeded with `fullyPopulatedSeed`.
    - `pnpm dev`, driven by headless Chrome over CDP at 390x844, DPR 2, touch on, since the Chrome extension disconnected.
    - Scripts and screenshots are in `...\scratchpad\mobile\`.
  - Pages covered, all at 390 px:
    - Every admin list and form: home, novedades, inscripciones (+nueva, detalle, venta-nueva), talleres (+nuevo, detalle, turnos, período), intensivos (+nuevo, detalle, reservas), asistencia (+recuperaciones), profesores (+nuevo, detalle), alumnas (+detalle), eventos (+detalle), estadísticas, recordatorios, materiales (+nuevo, importar, precios, proveedores, nuevo proveedor), políticas.
    - Public: `/condiciones`, `/privacidad`, the taller page, the enrollment form and `/eventos-privados`.
  - Layout results:
    - No page scrolls horizontally, and no element sits past the viewport.
    - No admin tap target is under 24 px, except checkboxes labelled through `for` (`materialsIncluded`, `available`, `variantPriceOnRequest`, 20x24). The menu drawer, the bell and its badge render correctly.
  - Flow, end to end on the phone viewport:
    - Published the November period of Taller Demo.
    - A public enrollment with the new checkbox (links open `/condiciones` and `/privacidad` in a new tab, hidden versions 1/1) created `CI-2026-0001` as pending.
    - A private event request was accepted.
    - The bell went "Novedades: 2 sin leer", then 1 after opening the enrollment, then 0 after opening the event.
    - `/admin/novedades` listed both, plus the pending $45.000 fee.
    - The enrollment detail shows "Aceptación: Condiciones v1 · Privacidad v1" inside "Más datos del pedido".
  - Fixed inline: the policies history said "por migration 0018" for the seeded version. It now reads "Texto base inicial" (RED/GREEN in `policies.ui.test.tsx`, typecheck exit 0, `b0eb1b0`).
  - For T6:
    - The enrollment detail still shows "Política aceptada: 2026-10" (legacy `policy_version`) next to the new line.
    - The public enrollment page has no `<title>`, already true at the baseline.
    - Public footer links are 23 px tall, spaced well apart.
    - The workshop seat-request form was not walked through: the seed has no published workshop.
    - The owners' real-phone walkthrough stays in T6.
  - T5 done. Next: T6.
- L94 (2026-11-17, owner, verbatim, T6 confirmations of the L86 sales assumptions, one question each):
  - (1) A sale on a record whose monthly fee is still pending: "Sí, aunque esté pendiente (Recommended)" (option text: "Así funciona hoy: cualquier inscripción del mes que no esté cancelada acepta una venta de materiales. La venta queda pendiente hasta que se cobra."). Confirmed, no change.
  - (2) Cancelling a record that has a sale: "Queda, se anula aparte (Recommended)" (option text: "Así funciona hoy: la venta sigue viva y la cancelás por separado si corresponde (por ejemplo, si los materiales ya se entregaron y se cobran igual)."). Confirmed, no change.
  - (3) Month of a sale after the record is corrected: "En el mes en que se hizo (Recommended)" (option text: "Así funciona hoy: la venta conserva el mes en que se registró, aunque después se corrija la inscripción. Los números de noviembre no cambian."). Confirmed, no change.
  - (4) Pending sales in counters and the bell: "Sí, en todos lados (Recommended)" (option text: "Así funciona hoy: la venta pendiente suma en \"Por cobrar\", en los contadores de pendientes y aparece en \"Pagos pendientes\" de la campanita hasta que se cobra. No cuenta como novedad sin leer."). Confirmed, no change; this also confirms the L88/L91 parent assumption.
  - (5) Sales in Recordatorios: "No, quedan afuera (Recommended)" (option text: "Así funciona hoy: Recordatorios solo muestra las inscripciones del mes. Una venta pendiente se ve en la campanita y en su inscripción, pero no genera recordatorio de pago."). Confirmed, no change.
  - (6) Email on a sale's payment: "No, sin correo (Recommended)" (option text: "Así funciona hoy: la venta se registra y se cobra en el estudio; confirmar su pago no envía ningún correo. La inscripción del mes sigue mandando el suyo como siempre."). Confirmed, no change.
  - (7, L92 parent assumption) What an owner-created order records: "Sin registro de aceptación (Recommended)" (option text: "Así funciona hoy: la inscripción manual queda con \"Sin registro de aceptación\", porque la alumna no leyó ni aceptó nada en la web. Las ventas de materiales copian lo que aceptó su inscripción."). Confirmed, no change. All sales and policy assumptions now hold as built.
- L95 (2026-11-17): T6 started.
  - Lint: ESLint over the repository is clean except 5 parsing errors in the untracked `.agents/` folder (not ours, untouched). Prettier is clean after formatting this document (`cc6adad`). `pnpm typecheck` exit 0 at `b0eb1b0`. Unit 318/4037 and ui 132/1175 last ran green at `55d3feb`.
  - Full DB suite (43 files, one per command, retried once on failure) running in the background; per-file log in `...\scratchpad\t6\db-summary.txt`.
  - Six independent verifiers (worker-high) launched in parallel with a shared brief (`...\scratchpad\t6\verifier-brief.md`), each judging its area against baseline `d078b52` with probes and a differential:
    - ENR: S1 enrollment side, S2, S3.
    - STK: S4, S5.
    - ATT: S7.
    - STU: S1 student profile.
    - WSP: S6, S8, S11.
    - PNL: S9, S10.
  - Still to run: 0018 rehearsal on staging-shaped data, one correction batch for verifier blockers, native review slices, and the owners' real-phone walkthrough.
- L96 (2026-11-17, owner, verbatim, new request during T6): "Me gustaria que las notificaciones varien de color segun lo que se este notificando". This reopens part of S9 (the bell and `/admin/novedades`). The colour scheme is asked next; the change will join the T6 correction batch.
- L97 (2026-11-17, owner, verbatim, answering how the notification colours are chosen): "El color de cada sección (Recommended)" (option text: "Cada aviso usa el mismo color e ícono que su sección en el menú: inscripciones en lila (Inscripciones), reservas de workshop en el color de Workshops, consultas de eventos privados en el de Eventos. En \"Pagos pendientes\": cuotas en lila, señas y saldos en el color de Workshops, ventas de materiales en amarillo (Materiales). Lo reconocés de un vistazo porque ya lo ves en el menú.").
- L98 (2026-11-17): T6 verifier verdicts, full notes in `...\scratchpad\t6\results.md`.

  | Area | Specs | Verdict |
  | --- | --- | --- |
  | ATT | S7 | pass |
  | STU | S1 profile | fail: STU-1 |
  | ENR | S1, S2, S3 | S1 and S2 pass; S3 fails on ENR-B1 |
  | STK | S4, S5 | S4 passes; S5 fails on STK-1 (same root as ENR-B1) |
  | WSP | S6, S8, S11 | pass |
  | PNL | S9, S10 | pass |

  - Blockers:
    - STU-1: a material sale copies its parent's contact snapshot but is stamped now, so the student detail shows a stale name and phone while the list shows the corrected ones.
    - ENR-B1 / STK-1: a `materials_received` record corrected back to pending and paid again takes its stock lines a second time. With no units left, the delivered line also flips to `supplier`, so it is bought again.
  - Advisories fixed in the same batch:
    - PNL-A1 and L93: hide the legacy "Política aceptada: 2026-10" line on owner-created orders and on orders with recorded versions.
    - PNL-A2: the monthly form's unchecked-box error names only privacy.
    - WSP: the teacher-detail percentage post is not checked against the teacher in the URL.
    - STK: the sale cancel copy promises a stock return that a received sale does not get.
  - Correction batch:
    - Unit F1 (delegated, parallel): STU-1, the L96/L97 colours and the advisories above.
    - Unit F2 (delegated, after the DB suite ends, because it changes 0018): ENR-B1 / STK-1 with a per-line stock-taken mark.
