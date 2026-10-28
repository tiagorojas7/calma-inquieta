# Admin UI/UX overhaul

- Feature: `ui-admin-overhaul` (ODD, not SDD).
- Branch: `feat/ui-admin-overhaul-audit`, from `origin/main` `13bcf8c`.
- Audience: non-technical workshop owners, primarily on mobile.
- Ownership: `src/app/ui/admin/**` and `src/app/routes/admin/**` only.
- Delivery: audit-only first commit, then reviewable PR slices of about 400 changed lines against `main`.
- Engram mirror: `odd/ui-admin-overhaul/tasks` (save attempted; Engram timed out and must be reconciled before implementation).

## Objective

Make every `/admin` screen clear, guided, comfortable, and mobile-first. The critical outcome is that an owner can understand and complete every prerequisite for enrollment: publish the workshop, create active shifts, open the current monthly period, define seats, and configure materials.

## Constraints

- The admin home MUST NOT show metrics or a dashboard. It may show navigation and next-step guidance only.
- Use native `<a>` and `<form method="post">`; never React Router `<Form>`, fetchers, or `.data` navigation.
- Reuse the shared icon set from Terminal A when available; do not add icon packages or edit shared atoms/tokens/styles.
- Do not touch `src/app/ui/admin/material-form.tsx`, `src/app/admin/material-form-data.ts`, or `src/modules/materials/domain/material-core.ts` until `fix/admin-material-form-formats` is merged.
- Preserve strict TDD for behavior changes and keep UI/axe tests at least as strong as today.

## Tasks

- [x] T1 — Audit every admin screen at 360, 768, and 1280 px. Record priority, problem, skill recommendation, and concrete fix per screen. Commit the audit before production UI changes and notify Terminal A.
- [ ] T2 — Establish admin-only navigation and page hierarchy: mobile shell, breadcrumbs/back paths, screen titles, primary/secondary/destructive action hierarchy, success feedback, and reusable admin page patterns.
- [ ] T3 — Implement the guided workshop enrollment-readiness flow across workshop list, detail, shifts, periods, and period detail.
- [ ] T4 — Apply the system to intensives, teachers, materials, and suppliers, including forms, empty states, validation help, and lifecycle actions.
- [ ] T5 — Apply the system to enrollments, order detail, materials-to-order, access denied, and error states.
- [ ] T6 — Run cross-screen responsive, keyboard, axe, and repository verification; resolve regressions and document remaining owner decisions.

## Audit method and evidence

### Required skill

Read in full:

- `.agents/skills/ui-ux-pro-max/SKILL.md`
- `.agents/skills/ui-ux-pro-max/references/quick-reference.md`
- `.agents/skills/ui-ux-pro-max/references/pro-rules.md`

Searches executed with the required script:

- `mobile-first workshop admin intuitive operations --design-system --density 8`
- `guided setup navigation forms feedback --domain ux`
- `multi-step progress back navigation --domain ux`
- `empty state next action success feedback --domain ux`
- `button hierarchy destructive confirmation states --domain ux`
- `icon button accessible label decorative icon --domain icons`
- `mobile admin forms navigation responsive --stack html-tailwind`
- `accessible admin forms state feedback --stack react`

Applicable guidance used below: one primary action per screen, 44 px touch targets, visible focus, mobile-first layout, predictable back paths, breadcrumbs for deep hierarchy, progress for multi-step flows, helpful empty states, success feedback, errors beside fields plus focus management, confirmations for destructive actions, and semantic SVG icons with text labels.

### Responsive coverage

- Screen inventory: 24 visual states (home; workshops list/new/detail/shifts/periods/period detail; intensives list/new/detail; enrollments list/materials-to-order/order detail; teachers list/new/detail; materials list/new/detail; suppliers list/new/detail; error; access denied).
- Viewports: 360, 768, and 1280 px.
- Evidence: 72 full-page fixture-backed screenshots rendered from the real route/UI components with the production Tailwind build CSS, plus source and existing UI/axe tests.
- Live evidence obtained before the environment failure: `/admin` at 360 and 768; the real admin error boundary after data routes failed.
- Existing strengths verified: native document links/forms, visible labels, inline field errors, 44 px controls, focus styles, status text in addition to color, accessible table captions/scroll regions, and several confirmation dialogs.

### Environment limitation

Docker Desktop, Postgres, and eventually the `docker-desktop` WSL distro became unresponsive during the live-data pass. The owner authorized `docker desktop restart` and later `wsl --shutdown`; force-stop/relaunch still left the distro stopped and a direct WSL probe hanging. No data was deleted or mutated. The route inventory was therefore completed with a fixture-backed visual harness instead of live database records. Temporary harness files and screenshots are not part of this commit.

Both delegated read-only scouts also crashed in the Pi host with Windows exit code `2147483651`; the parent completed the bounded audit from source, tests, and visual evidence.

## Findings

**Total: 46 findings — 4 critical, 29 high, 13 medium.**

### Cross-cutting system

| ID   | Priority | Problem                                                                                                                                                                                                                                    | Skill recommendation                                                          | Fix                                                                                                                                                                                                                                                  |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-01 | Critical | Enrollment readiness is split across workshop edit, shifts, periods, period detail, materials, and publish actions. Nothing presents it as one goal or shows completion. This directly explains why the owner could not enable enrollment. | `multi-step-progress`, `content-priority`, `error-recovery`.                  | Add one enrollment-readiness model shown consistently on workshop list/detail and carried through the steps: workshop details, active shift, published workshop, current period, seats, materials. Each incomplete step gets one plain-language CTA. |
| A-02 | High     | Deep screens have inconsistent back links and no breadcrumbs; new/edit screens often expose only a bottom “Cancelar”.                                                                                                                      | `back-behavior`, `breadcrumb-web`, `persistent-nav`.                          | Add an admin-only page header with breadcrumbs and a 44 px “Volver” at the top of every internal screen; preserve native anchors.                                                                                                                    |
| A-03 | High     | Successful saves and lifecycle changes redirect silently, so owners cannot tell whether the action worked.                                                                                                                                 | `success-feedback`, `submit-feedback`, `toast-accessibility`.                 | Redirect with a bounded success code/query parameter and render a dismissible `role="status"` banner in the destination; never rely on color alone.                                                                                                  |
| A-04 | High     | Data tables technically scroll, but at 360 px important columns and row actions disappear beyond the crop with no visible affordance.                                                                                                      | `mobile-first`, `horizontal-scroll`, `content-priority`, `touch-target-size`. | Render mobile card rows or a priority-column summary with a labelled “Ver detalle”; keep the complete table at `md+`. If any horizontal scroll remains, add an explicit cue.                                                                         |
| A-05 | High     | Field errors are inline, but multi-error submissions do not focus an error summary/first invalid field; ordinary native posts also provide no pressed/pending feedback before navigation.                                                  | `error-summary`, `focus-management`, `loading-buttons`.                       | Add a focusable linked error summary for multi-field failures and submit-state feedback that preserves native form submission.                                                                                                                       |
| A-06 | High     | Destructive behavior is inconsistent: workshop/intensive/material actions confirm, but teacher and supplier archive actions post immediately and look like ordinary outline actions.                                                       | `confirmation-dialogs`, `destructive-emphasis`, `primary-action`.             | Require confirmation for every archive/deactivate/cancel/delete action, use explicit danger styling, and spatially separate it from the primary action.                                                                                              |
| A-07 | High     | The real long owner email pushes “Salir” and the mobile-menu button outside the 360 px header; the shorter fixture email hides the defect.                                                                                                 | `long-token-wrapping`, `content-priority`, `touch-target-size`.               | Move account identity into the opened mobile menu, keep brand + menu in the top row, and prevent long email text from growing the action row.                                                                                                        |
| A-08 | Medium   | Desktop screens stretch into large blank canvases while forms remain narrow and unrelated sections have weak grouping.                                                                                                                     | `container-width`, `whitespace-balance`, `visual-hierarchy`.                  | Use a consistent admin content max-width and responsive section/card grid; preserve readable form measure while grouping status, content, and actions.                                                                                               |

### `/admin` — home

| ID   | Priority | Problem                                                                                                                                            | Skill recommendation                                           | Fix                                                                                                                                                                            |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A-09 | High     | Home only says “Elegí qué querés administrar”; it offers no safe next step for the enrollment problem.                                             | `content-priority`, `empty-state`, `primary-action`.           | Keep the “no metrics/dashboard” contract, but add a “Preparar inscripciones” task entry that explains the sequence and starts at Talleres. No counters without owner approval. |
| A-10 | Medium   | At desktop the access cards duplicate the sidebar and remain flat text blocks; at mobile they give no description of what each destination is for. | `visual-hierarchy`, `icon-style-consistent`, `nav-label-icon`. | Turn them into descriptive action cards with Terminal A’s SVG icons, short helper copy, and one clear affordance; avoid dashboard metrics.                                     |

### `/admin/talleres` — workshop list

| ID   | Priority | Problem                                                                                                                                                  | Skill recommendation                                          | Fix                                                                                                                              |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A-11 | Critical | The list shows workshop status and shift count but not whether enrollment for the current month is open; there is no “Abrir inscripciones de <mes>” CTA. | `state-clarity`, `content-priority`, `primary-action`.        | Add a current-month enrollment state per workshop with text/icon and a contextual CTA to open or complete that month.            |
| A-12 | High     | Owners cannot see which prerequisite blocks a workshop; “Publicado” can appear complete even when no monthly period is open.                             | `error-recovery`, `color-not-only`, `compact-label-overflow`. | Show the next missing prerequisite in plain language (“Falta abrir noviembre”) and link directly to the exact corrective screen. |

### `/admin/talleres/nuevo` — new workshop

| ID   | Priority | Problem                                                                                                             | Skill recommendation                                             | Fix                                                                                                                             |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| A-13 | High     | After creating a workshop the flow returns to the list instead of guiding the owner to shifts and enrollment setup. | `multi-step-progress`, `back-behavior`, `success-feedback`.      | On success, redirect to the new detail with “Taller creado” and the next incomplete step highlighted: add a shift.              |
| A-14 | Medium   | One uninterrupted form mixes public copy, pricing, teacher assignment, and technical slug behavior.                 | `field-grouping`, `progressive-disclosure`, `input-helper-text`. | Group fields into “Información pública”, “Arancel y profesor”, and an advanced link section; keep existing hints beside fields. |

### `/admin/talleres/:id` — workshop detail

| ID   | Priority | Problem                                                                                                                                | Skill recommendation                                          | Fix                                                                                                                                                                    |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-15 | Critical | The detail has status, shifts, and period links but no enrollment-readiness checklist, current-month state, or CTA to open that month. | `multi-step-progress`, `state-clarity`, `error-recovery`.     | Make readiness the first card: numbered/checkable steps with one current CTA, ending in “Inscripciones abiertas para <mes>”.                                           |
| A-16 | High     | Pause/archive, shift/period navigation, and the edit form have similar visual weight; the owner must infer the page structure.         | `primary-action`, `destructive-emphasis`, `visual-hierarchy`. | Put status and readiness in a summary card, expose one primary next action, keep management links secondary, and move lifecycle danger actions to a separated section. |

### `/admin/talleres/:id/turnos` — shifts

| ID   | Priority | Problem                                                                                                                 | Skill recommendation                                          | Fix                                                                                                   |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| A-17 | High     | At 360 px capacity/state/actions are offscreen; owners cannot discover edit/retire/delete without horizontal scrolling. | `content-priority`, `touch-target-size`, `horizontal-scroll`. | Use mobile shift cards with day/time/capacity/state and 44 px actions; retain the table at `md+`.     |
| A-18 | High     | Saving the first shift does not explain that the next required step is opening the monthly period.                      | `multi-step-progress`, `success-feedback`, `error-recovery`.  | Show progress and a success banner with “Siguiente: abrir inscripciones de <mes>” linking to periods. |

### `/admin/talleres/:id/periodos` — periods

| ID   | Priority | Problem                                                                                                                                        | Skill recommendation                                                          | Fix                                                                                                                                                                              |
| ---- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-19 | Critical | The critical action is named “Abrir mes” behind “Administrar períodos”, uses a technical `YYYY-MM` text value, and never says “inscripciones”. | `match-real-world`, `input-type-keyboard`, `error-clarity`, `primary-action`. | Rename the user-facing action to “Abrir inscripciones de <mes>”, use a month control/preset for the current or next month, and keep “período” as secondary domain language only. |
| A-20 | High     | The page does not explain what opening/publishing a period changes on the public site or which prerequisites still apply.                      | `input-helper-text`, `error-recovery`, `state-clarity`.                       | Add concise helper copy: opening creates the month, cup limits come from shifts, materials affect the order, and the final state controls public enrollment.                     |
| A-21 | High     | At 360 px total capacity is clipped and the month row does not expose its next action/state consequence.                                       | `content-priority`, `compact-label-overflow`, `touch-target-size`.            | Use mobile month cards with status, total seats, enrollment effect, and a clear “Configurar/Ver” action.                                                                         |

### `/admin/talleres/:id/periodos/:period` — period detail

| ID   | Priority | Problem                                                                                                                                    | Skill recommendation                                   | Fix                                                                                                                        |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| A-22 | High     | This deepest workshop screen has no top back link or breadcrumb in the actual component.                                                   | `breadcrumb-web`, `back-behavior`, `persistent-nav`.   | Add `Talleres > <taller> > Inscripciones > <mes>` plus “Volver a inscripciones del taller”.                                |
| A-23 | High     | “Borrador/Abierto/Cerrado” does not state the owner-facing outcome “acepta inscripciones”; actions and historical data obscure completion. | `state-clarity`, `color-not-only`, `content-priority`. | Add an enrollment status banner with the public consequence, remaining blockers, seats, and one primary transition action. |

### `/admin/intensivos` — intensive list

| ID   | Priority | Problem                                                                             | Skill recommendation                                     | Fix                                                                                                            |
| ---- | -------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A-24 | High     | Date, state, and capacity are clipped at 360 px, leaving only name/teacher visible. | `mobile-first`, `content-priority`, `horizontal-scroll`. | Use mobile intensive cards with date, state, capacity, and “Ver/Editar”; preserve the table on larger screens. |

### `/admin/intensivos/nuevo` — new intensive

| ID   | Priority | Problem                                                                                                           | Skill recommendation                                                 | Fix                                                                                                                               |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A-25 | High     | Six identical “Imagen” file fields create a long, repetitive, intimidating mobile form with no sense of progress. | `progressive-disclosure`, `field-grouping`, `no-precision-required`. | Show one primary image field, then an explicit “Agregar otra imagen” control up to the existing limit, with preview/order labels. |
| A-26 | Medium   | Identity, schedule, money, attendance, policy, materials, and gallery are one undifferentiated column.            | `field-grouping`, `whitespace-balance`, `multi-step-progress`.       | Group into named sections and keep one sticky/visible save action per section flow without changing native submission.            |

### `/admin/intensivos/:id` — intensive detail

| ID   | Priority | Problem                                                                                                                     | Skill recommendation                                          | Fix                                                                                                                                          |
| ---- | -------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| A-27 | High     | Lifecycle actions, current schedule, rescheduling, editing, gallery, and audit all compete at the top/within one long page. | `primary-action`, `destructive-emphasis`, `visual-hierarchy`. | Add a summary/status card, make the next primary action explicit, group rescheduling separately, and move archive/cancel into a danger zone. |
| A-28 | Medium   | There is no top “Volver a intensivos”; cancel appears only after the long edit form.                                        | `back-behavior`, `breadcrumb-web`.                            | Add breadcrumb/back in the page header and keep bottom cancel as a form escape, not the only navigation.                                     |

### `/admin/inscripciones` — enrollment list

| ID   | Priority | Problem                                                                                                                       | Skill recommendation                                               | Fix                                                                                                                                                       |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-29 | High     | Filters dominate the phone viewport and the row hides month, shift, status, total, and request date beyond horizontal scroll. | `content-priority`, `progressive-disclosure`, `horizontal-scroll`. | Collapse secondary filters behind “Filtrar”, show active-filter chips/reset, and use mobile order cards with status/total/date and a 44 px detail action. |
| A-30 | Medium   | The page gives no compact result summary or explanation of what each status requires next.                                    | `state-clarity`, `empty-state`, `error-recovery`.                  | Add a plain-language status legend/next action near results and a result count only if it is list context, not a home dashboard metric.                   |

### `/admin/inscripciones/materiales` — materials to order

| ID   | Priority | Problem                                                                                                                              | Skill recommendation                                          | Fix                                                                                                                               |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A-31 | Medium   | The page does not show where it sits in the order workflow or what happens after “Marcar como solicitado”.                           | `multi-step-progress`, `back-behavior`, `success-feedback`.   | Show `Confirmar cobro > Solicitar materiales > Recibir materiales`, current step, and a next-step message after submission.       |
| A-32 | Medium   | Copy-summary, supplier totals, and the bulk mutation have weak hierarchy; the large title consumes most of the first phone viewport. | `visual-hierarchy`, `primary-action`, `heading-line-balance`. | Use a compact page header, supplier cards, a clearly secondary copy action, and one emphasized bulk action with consequence text. |

### `/admin/inscripciones/:id` — order detail

| ID   | Priority | Problem                                                                                                                                               | Skill recommendation                                           | Fix                                                                                                                                                 |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-33 | High     | The 2,200 px phone page requires scanning raw details before reaching payment/cancellation; current status and next action do not guide the workflow. | `content-priority`, `multi-step-progress`, `visual-hierarchy`. | Add an order summary card and step status at the top; make the one valid next action primary and collapse secondary/history sections progressively. |
| A-34 | High     | Materials and history tables clip columns on mobile with no visual scroll cue.                                                                        | `horizontal-scroll`, `content-priority`, `touch-density`.      | Render material and history entries as mobile cards/timeline; keep tables at `md+`.                                                                 |

### `/admin/profesores` — teacher list

| ID   | Priority | Problem                                                                                                            | Skill recommendation               | Fix                                                                                                  |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A-35 | Medium   | The list is readable but gives no context about where a teacher is used, so archive risk is discovered only later. | `state-clarity`, `error-recovery`. | Add a concise assignment summary or make detail copy clearly explain usage before lifecycle actions. |

### `/admin/profesores/nuevo` — new teacher

| ID   | Priority | Problem                                                                         | Skill recommendation                                    | Fix                                                                                    |
| ---- | -------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| A-36 | Medium   | There is no top back path and the modality’s operational effect is unexplained. | `back-behavior`, `input-helper-text`, `field-grouping`. | Add breadcrumb/back and helper copy explaining own vs third-party percentage behavior. |

### `/admin/profesores/:id` — teacher detail

| ID   | Priority | Problem                                                                                 | Skill recommendation                                              | Fix                                                                                                               |
| ---- | -------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| A-37 | High     | “Archivar” posts immediately without confirmation and appears before the identity form. | `confirmation-dialogs`, `destructive-emphasis`, `primary-action`. | Move lifecycle actions to a separated danger section and confirm with assignment consequences before native post. |

### `/admin/materiales` — material list

| ID   | Priority | Problem                                                                                                                                     | Skill recommendation                                        | Fix                                                                                                                     |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| A-38 | High     | “Proveedores” is a small underlined sibling of the main CTA with no breadcrumb relationship; table state/availability is clipped on mobile. | `nav-hierarchy`, `breadcrumb-web`, `content-priority`.      | Make suppliers a clearly labelled secondary destination and use mobile material cards with availability and detail CTA. |
| A-39 | Medium   | State links plus category/supplier form create two filter systems with equal weight and no clear reset.                                     | `progressive-disclosure`, `state-clarity`, `touch-spacing`. | Consolidate filters into one mobile filter panel with active chips and “Limpiar filtros”.                               |

### `/admin/materiales/nuevo` — new material

| ID   | Priority | Problem                                                                                                                                         | Skill recommendation                                         | Fix                                                                                                                                                  |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-40 | High     | Image, supplier, availability, and variant creation form a dense technical sequence; variant controls add cognitive load before the first save. | `progressive-disclosure`, `field-grouping`, `error-clarity`. | After the protected material-format fix merges, group basic data/image/variants and reveal additional variants on demand; preserve row-level errors. |

### `/admin/materiales/:id` — material detail

| ID   | Priority | Problem                                                                                                                         | Skill recommendation                                                  | Fix                                                                                                                                          |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| A-41 | High     | Read-only identity, audit, full edit form, variants, and lifecycle actions form one very long page; action priority is unclear. | `visual-hierarchy`, `progressive-disclosure`, `destructive-emphasis`. | After the protected fix merges, separate summary, edit, variants, and danger sections; keep one primary save and confirmed lifecycle action. |

### `/admin/materiales/proveedores` — supplier list

| ID   | Priority | Problem                                                                                                  | Skill recommendation                                 | Fix                                                                                                |
| ---- | -------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A-42 | High     | This nested material destination has no breadcrumb or “Volver a materiales”, so owners lose their place. | `breadcrumb-web`, `back-behavior`, `persistent-nav`. | Add `Materiales > Proveedores`, top back link, and keep “Nuevo proveedor” as the sole primary CTA. |

### `/admin/materiales/proveedores/nuevo` — new supplier

| ID   | Priority | Problem                                                                         | Skill recommendation                  | Fix                                                      |
| ---- | -------- | ------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| A-43 | Medium   | The form has no top context/back path and “Notas” does not explain who sees it. | `back-behavior`, `input-helper-text`. | Add breadcrumb/back and clarify that notes are internal. |

### `/admin/materiales/proveedores/:id` — supplier detail

| ID   | Priority | Problem                                                                               | Skill recommendation                                              | Fix                                                                                                  |
| ---- | -------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A-44 | High     | “Archivar” posts immediately without confirmation or explanation of linked materials. | `confirmation-dialogs`, `destructive-emphasis`, `error-recovery`. | Confirm archive with its effect on existing/new materials and move it to a separated danger section. |

### Admin error state

| ID   | Priority | Problem                                                                                                                   | Skill recommendation                                   | Fix                                                                                                                               |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| A-45 | High     | “Algo salió mal / probá de nuevo” offers only “Volver al panel”; it does not retry the failed screen or preserve context. | `error-recovery`, `timeout-feedback`, `back-behavior`. | Offer native “Reintentar” to the current URL plus “Volver”; keep the technical status hidden but provide a support/recovery path. |

### Access denied

| ID   | Priority | Problem                                                                                      | Skill recommendation                                              | Fix                                                                                                                                                                  |
| ---- | -------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-46 | Medium   | The denial explains the state but gives no concrete way to switch account or request access. | `accessible-authentication`, `error-recovery`, `consistent-help`. | Keep the bare no-data layout, show the signed-in account, add “Cerrar sesión y usar otra cuenta”, and identify the access-request channel if the owner provides one. |

## Owner decisions

1. **No dashboard metrics implemented.** If the owner wants counts such as pending orders on `/admin`, that changes the current MUST NOT dashboard/metrics requirement and needs explicit approval first.
2. **Access request channel.** A-46 needs the preferred contact/action (for example WhatsApp or a named administrator); do not invent one.
3. **Icon dependency.** Terminal A’s icon slice was not produced because its environment audit closed blocked. Implementation may proceed with text-first controls, but icon-enhanced navigation waits for a concrete shared commit/PR or a new owner decision on ownership.

## Proposed PR slices

These are implementation forecasts, not commitments to exact line counts; split again if a slice exceeds review focus.

1. Admin shell + page headers + breadcrumbs/back + success banner foundation.
2. Mobile list/card pattern + action hierarchy for top-level lists.
3. Guided workshop readiness on list/detail.
4. Guided shifts → period handoff and “Abrir inscripciones de <mes>”.
5. Period detail enrollment state and mobile presentation.
6. Intensives list/new/detail hierarchy and progressive gallery.
7. Teachers and suppliers forms/lifecycle confirmations.
8. Enrollments list + order detail + materials-to-order workflow.
9. Materials screens after `fix/admin-material-form-formats` merges.
10. Error/denied recovery and final responsive/axe regression.

## Progress and evidence

| Task | Status   | Evidence                                                                                                                                                              |
| ---- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1   | Complete | Required skill/reference reads; 8 skill searches; 24 screens × 3 widths; 46 findings; live environment failure and fixture fallback documented. Audit commit pending. |
| T2   | Pending  | —                                                                                                                                                                     |
| T3   | Pending  | —                                                                                                                                                                     |
| T4   | Pending  | —                                                                                                                                                                     |
| T5   | Pending  | —                                                                                                                                                                     |
| T6   | Pending  | —                                                                                                                                                                     |
