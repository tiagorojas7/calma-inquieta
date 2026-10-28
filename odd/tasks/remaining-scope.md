# Remaining contracted scope (changes 6, 7 and 8)

- Objective: deliver every module of the client proposal (`docs/client-proposal/proposal.md`) that is not built yet, so the project reaches 100 % of the contracted scope. Planned in `openspec/changes/admin-catalog/proposal.md` (Out of Scope) as changes 6 (renewals-and-email), 7 (students, attendance, intensivo deposits, private events, settlements) and 8 (metrics-reminders-launch).
- Branch: one `feat/<module>-<slice>` per slice from `origin/main`; strategy `stacked-to-main`. Runner: `pnpm test`. Coordinator: Claude; UI overhaul runs in parallel (Terminal A public, Terminal B admin).

## Specs

Quoted from `docs/client-proposal/proposal.md` (contract). Each S# gets its own design note before code.

- S1 Panel general: "Resumen de cupos, solicitudes, cuotas, señas, pedidos de materiales, ingresos registrados y alertas pendientes." Supersedes the admin-shell landing rule "It MUST NOT show metrics or a dashboard", which was a deferral to change 8.
- S2 Indicadores: "Ocupación | Inscriptas, cupos libres y porcentaje de ocupación por taller o workshop." "Conversion | Solicitudes recibidas, pendientes y confirmadas para detectar consultas sin concretar." "Ingresos registrados | Cuotas, señas y materiales cobrados por período y actividad." "Alumnas | Participacion, recurrencia, asistencias, faltas y recuperaciones." "Materiales | Pedidos por estado, proyecto, taller, período y proveedor." "Profesores | Alumnas vinculadas, ingresos asociados y liquidación estimada segun porcentaje."
- S3 Gestión de alumnas: "Ficha única con datos, talleres y workshops asignados, historial de pagos, pedidos, observaciones, búsqueda y filtros por actividad." Rule: "Una alumna puede participar en uno o varios talleres y workshops sin duplicar su ficha."
- S4 Cuotas y asistencia: "Cuota mensual por período, asistencia por clase, inasistencias y clases pendientes o realizadas de recuperacion."
- S5 Inscripciones: "Solicitudes pendientes y confirmadas, asignacion manual a una o mas actividades y control de seña o cuota." (pending/confirmed and fee control exist for talleres; manual assignment and intensivo deposits are missing).
- S6 Inscripción a workshops (intensivos): "La interesada completa sus datos desde la página del workshop y la solicitud queda registrada antes de abrir WhatsApp." "La dueña coordina la seña y registra el pago desde el panel para confirmar el lugar y descontar el cupo."
- S7 Eventos privados: "Consultas recibidas con fecha, lugar, cantidad de participantes, datos de contacto y observaciones." (public request form plus admin list; today `/eventos-privados` is a coming-soon page).
- S8 Profesores: "porcentaje acordado e importe estimado a liquidar." (percentages and period snapshots exist; the estimate is missing).
- S9 Recordatorios: "Selección de alumnas por taller o workshop y preparacion de mensajes. El envio automático requiere la integración opcional con WhatsApp Business API." Messages are prepared as `wa.me` links; the Business API is out of scope (quoted separately).
- S10 Launch: custom domain, Cloudflare Access re-scoped to `/admin`, rate-limit rule (`docs/runbooks/enrollment-rate-limit.md`), "Pruebas, carga inicial, capacitacion y publicación".
- S11 Notifications (owner decision L3-L4): both prepared WhatsApp messages (`wa.me`, free, sent by the owner with one tap) and automatic emails through Resend (free tier) for "inscripción recibida, pago confirmado, recordatorio de clase y cuota". Email needs the custom domain verified, so it ships behind configuration and turns on at launch (S10).

## Tasks

| ID  | Specs  | Owner, route   | Depends on | Status                                                                                                                                                                                                                                           |
| --- | ------ | -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | S3     | Claude, inline | —          | done: `students` module derives the registry from enrollment orders by normalized email (no backfill, only `student_note` is stored, migration 0012); admin list and detail at `/admin/alumnas`; commits e0350cf, 9ddc89d, 9fc38b7 (PR pending). |
| R2  | S1, S2 | Claude, inline | R1         | pending: read-model queries (occupancy, conversion, registered income, materials) and the Panel general on `/admin`                                                                                                                              |
| R3  | S4     | Claude, inline | R1         | pending: class sessions per turno and period, attendance, absences, make-up classes                                                                                                                                                              |
| R4  | S6, S5 | Claude, inline | R1         | pending: intensivo request form, deposit registration, seat count                                                                                                                                                                                |
| R5  | S7     | Claude, inline | —          | pending: private-event request form and admin inbox                                                                                                                                                                                              |
| R6  | S8, S2 | Claude, inline | R2         | pending: teacher settlement estimate from period snapshots                                                                                                                                                                                       |
| R7  | S9     | Claude, inline | R1         | pending: student selection and prepared WhatsApp messages                                                                                                                                                                                        |
| R8  | S10    | Claude + owner | R1-R7      | pending: domain, Access re-scope, rate limit, smoke test, initial load, training notes                                                                                                                                                           |
| R9  | S11    | Claude, inline | R1, R8     | pending: email notifications through a port with a Resend adapter in composition; off until the domain and API key exist                                                                                                                         |

Admin screens for R1-R7 reuse the admin primitives that Terminal B delivers first (buttons, breadcrumbs, empty states); public forms reuse Terminal A's primitives.

## Log

- L1 2026-10-28 owner: "espera, por que falta la seccion de estadisticas en el panel, las inscripciones, falta trabajo para hacer en el proyecto? si falta algo, te tenes que encargar vos para ya tener el 100% del proyecto terminado"
- L2 2026-10-28: gap found by reading the contract against `openspec/changes/*`: changes 1-5 and design-adjustments are merged; changes 6, 7 and 8 were planned but never started. Claude's earlier "falta poco" covered only change 3 and was wrong for the contract as a whole.
- L3 2026-10-28 owner, on whether to include emails: "pero whatssap me cobra por eso, si es asi, cambialos por el mail". Clarified: `wa.me` prepared messages are free; only the WhatsApp Business API charges per message.
- L4 2026-10-28 owner choice: "WhatsApp preparado + email automático (Recommended)".
