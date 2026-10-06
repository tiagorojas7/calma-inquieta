<!-- Materialized from Engram on 2026-10-05: #199 (sdd/platform-foundation/explore, sections 0-5.6, truncated by Engram at 50,000 bytes) + #203 (sdd/platform-foundation/explore-part-2, sections 5.6-12, rev 2). Part 2 section 12 supersedes the part 1 cost/hosting statements (owner constraint: free or very cheap hosting). -->

# Exploration: platform-foundation (Calma Inquieta)

Date: 2026-10-05 | Project: calmainquieta | Store: hybrid | Phase: sdd-explore | Next: sdd-propose
Evidence tags: [V] verified on a primary source (URL given, checked 2026-10-05); [S] secondary source only; [A] assumption; [G] gap, not verified.
Owner decisions received during this exploration (2026-10-05) are folded into sections 1, 4, 8 and 10.

---
## 0. Decision brief (read first)

**Recommendation.** Build a TypeScript modular monolith: Next.js 16 (App Router) as a THIN delivery layer over screaming-architecture modules with hexagonal ports and adapters; PostgreSQL (Neon, Sao Paulo region) through Drizzle; Better Auth for the 2 admins; Resend for email; Cloudflare R2 for media. This is Option A below.

**Why A, and the honest caveat.** Weighted score A 4.20, D 4.30 (React Router 7 on Cloudflare Workers), B 3.20 (Astro + SPA + Supabase), C 2.75 (Next.js + Payload). B and C lose under all four weightings tested. A and D are a statistical tie (D leads on cost and platform risk; A leads on familiarity, delivery speed and AI-agent corpus). I recommend A because its main weakness (hosting cost/adapter risk) is measurable in a 1-day spike with kill criteria, while D's weakness (unfamiliar framework, fewer batteries) is not measurable away.

**The decision that can flip A to D is hosting economics.** ARS 850,000 is about USD 550-560 (official rate 2026-10-05). Vercel Hobby forbids commercial use, so Vercel needs Pro (USD 20/seat/month), about 51-55% of the fee in year 1. The cheapest managed path (Cloudflare Workers Paid, USD 5/month) runs Next.js only through adapters with documented per-release breakage (Cloudflare itself now recommends vinext 1.0, one week old). Spike inside platform-foundation; fallback order: Vercel Pro (if the studio already pays a seat) -> D on Workers -> Node container on a VPS.

**Recommended setup (spike-gated).** Cloudflare Workers Paid (USD 5/mo, account-level) + Neon Launch (about USD 3-5/mo, usage-based estimate) + R2 + Resend Free + GitHub private repo/Actions. Estimated USD 8-10/month, about USD 100-125 first year including the .com.ar domain (ARS 8,500, about USD 5.6). Safe fallback (Vercel Pro) is about USD 280-305 first year.

**Architecture.** 13 business modules + shared kernel; dependency rule enforced by lint and an architecture test; the PERIOD (workshop x month) is first-class; one order per student-workshop-period with the 4-state machine; seats claimed atomically at payment confirmation; transactional outbox for email; tokenized personal renewal links (no accounts).

**Roadmap.** 16 SDD changes, about 14k-19k authored lines including tests (about 36-48 review slices of 400 lines); 6 weeks is the realistic upper bound and is tight (see 8.4 descoping).

**First change.** platform-foundation = walking skeleton: repo, toolchain, Strict TDD activation, hexagonal skeleton with architecture test, DB/migration harness, CI, environments, deployed `/status` page through a use case. Zero business behavior. About 700-900 lines in 3 slices.

**Ready for proposal: Yes**, after the owner approves the recommendation and answers P0 questions Q1-Q4 (section 10).

### Standard exploration summary (sdd-explore format)
- Current State: greenfield; docs only (proposal, 20 desktop mockups, mockups analysis, Instagram snapshot); no git, no code, no runner; strict_tdd flag false until the first change installs a runner.
- Affected Areas: whole product. `openspec/config.yaml` (flip strict_tdd, set test commands, projects), Engram `sdd-init/calmainquieta` and `sdd/calmainquieta/testing-capabilities` (refresh), `.gitignore`, `docs/client-proposal/mockups/*.png` (asset policy).
- Approaches: A Next.js monolith; B Astro + SPA + Supabase; C Next.js + Payload; D React Router 7 on Workers (added because of the measured Next-on-Workers risk).
- Recommendation: A, hosting spike-gated, D as pre-agreed contingency.
- Risks: schedule (scope vs 4-6 weeks), Next-on-Workers adapter instability, design gaps (no mobile, 8+ missing screens), content dependency, manual-payment concurrency, email deliverability, Argentine data-protection and consumer rules, USD-cost vs ARS-revenue.
- Ready for Proposal: Yes (conditions above).

---
## 1. Requirements digest

### 1.1 Settled owner decisions (2026-10-05, override mockups where they conflict)
1. WhatsApp Business API OUT; automated notifications by EMAIL (scope addition the proposal never mentions); wa.me click-to-chat with prefilled text IN.
2. Public site = exactly 6 pages, nav as the Inicio mockup (image5): Inicio, Talleres, Workshops, Eventos privados, Quienes somos (Nosotros), Contacto. No extra pages.
3. Gallery (images AND videos) and FAQ are SECTIONS inside Quienes somos/Nosotros, not pages.
4. A cart exists ONLY for materials: it is the materials-selection step reached from the enrollment flow or from a personal link. No Tienda page, no general e-commerce, no Diario, no student account/login/icon, no search/bag icons in the global nav.
5. Materials link is sent EVERY MONTH to continuing students (each month is a different project). New students: public site -> taller page -> materials cart -> WhatsApp hand-off. Continuing students renew through a personal tokenized link without accounts: month fee + that month's materials, one bank transfer.
6. The PERIOD is first-class: workshop x period defines enabled projects/materials (variants, quantities); one enrollment per student x workshop x period; one order per enrollment-period with the 4-state machine (Pendiente de confirmacion, Cobrado, Solicitado al proveedor, Recibido); capacity is per workshop per period.
7. Testimonials on Inicio: recommended by the orchestrator, NOT confirmed by the owner -> optional section, hidden when there are no approved items.

### 1.2 Public site map
| Page | Route (default) | Sections / flow screens | Mockup | Gap |
|---|---|---|---|---|
| Inicio | / | hero collage, featured talleres, upcoming workshops, [testimonials optional] | image5 | "Materiales incluidos" chip conflicts with monthly flow (copy decision) |
| Talleres | /talleres, /talleres/[slug] | listing (filters Manana/Tarde/Con cupo), detail + enrollment form | image9, image6 | mobile |
| (flow) materials cart | /talleres/[slug]/materiales | catalog by category, variants, quantities, sticky summary, wa.me hand-off | image7 | no empty/validation states |
| (flow) confirmation | /pedido/[publicId] | order summary, WhatsApp CTA, 4 steps | image10 | needs email-sent copy; renewal variant |
| (flow) renewal | /renovar/[token] (noindex) | month offer cart for continuing students | none | full design missing |
| Workshops | /workshops, /workshops/[slug] | listing + filters, expanded card, registration form | image8 | registration form not mocked |
| Eventos privados | /eventos-privados | venue cards, request form (+ email, preferred contact) | image13 | form misses email/duration/materials |
| Quienes somos | /quienes-somos (label/slug open, Q5) | story, values, gallery (images+videos), FAQ, team | image12 | gallery/FAQ sections not mocked |
| Contacto | /contacto | address, hours, social, wa.me, static map | image12 (band only) | no standalone mockup; owner address conflict (Instagram: Arguello) |

### 1.3 Bounded contexts (13 modules + shared kernel)
Classification: core = enrollments, monthly-workshops, renewals, materials; supporting = students, attendance, weekend-workshops, private-events, teachers, metrics; generic = identity, notifications, content.
| Module | Responsibility (proposal module) | Key aggregates | Depends on (public API only) |
|---|---|---|---|
| identity | Admin users, sessions, roles, 2FA, audit | AdminUser, AuditEntry | none |
| teachers | Profesores: modality own/third-party, agreed % | Teacher | none |
| monthly-workshops | Talleres mensuales + Periods, sessions, projects, material offers, publish/pause | MonthlyWorkshop, WorkshopPeriod | teachers, materials |
| weekend-workshops | Workshops: date, price, deposit, quorum, policy | WeekendWorkshop | teachers |
| materials | Catalog, variants, suppliers, consolidation read model | Material, Supplier | none |
| students | One record per person, notes, consent flags | Student | none |
| enrollments | Inscripciones y cobros: orders (fee+materials), deposits, payment ledger, seat claim | PeriodEnrollment, WorkshopRegistration, Payment | monthly-workshops, weekend-workshops, materials, students, notifications |
| renewals | Tokenized personal links, reminders, non-renewal | RenewalInvitation | enrollments, students, monthly-workshops, notifications |
| attendance | Cuotas y asistencia: roll call, make-ups | AttendanceMark, MakeUpCredit | monthly-workshops, students, enrollments |
| private-events | Inquiry pipeline + timeline | EventInquiry | notifications |
| notifications | Outbox, templates, consent/suppression, provider port, wa.me builder, send log | OutboxMessage, EmailPreference | none |
| content | Site settings, media library, gallery, FAQ, testimonials, policy docs, SEO builders | SiteSettings, MediaAsset | none |
| metrics | Panel general + Metricas read models | (read-only) | read models of others |
Proposal-to-module map: Panel general->metrics; Gestion de alumnas->students; Cuotas y asistencia->enrollments(+payments)+attendance; Talleres y workshops->monthly/weekend-workshops; Inscripciones->enrollments; Profesores->teachers(+metrics); Materiales->materials; Eventos privados->private-events; Recordatorios->notifications; Metricas->metrics; public pages->content + each module's public read use cases.
Shared kernel `_shared`: Money (ARS integer centavos), Period (YYYY-MM), PhoneNumber (E.164, Argentine rules), EmailAddress, Result, Clock, IdGenerator, UnitOfWork, DomainError.

### 1.4 Core business invariants
Source tags: P proposal, M mockups, O owner decision, N new/derived.
- I1 (P) One student record per person: normalized phone/email uniqueness; possible duplicates flagged for manual merge, never auto-merged.
- I2 (P,O) Seat consumption: a seat in (workshop, period) is consumed ONLY when the order is confirmed paid (Cobrado). confirmed_seats <= capacity always, enforced atomically (conditional UPDATE + CHECK). Pending requests never consume seats and are shown separately. Public availability = capacity - confirmed_seats.
- I3 (P) Order state machine: pending_confirmation -> paid -> materials_requested -> materials_received, plus cancelled/expired (N, to confirm). Forward-only except audited admin corrections. Marking paid is idempotent (retry never double-claims a seat).
- I4 (O) One enrollment per (student, workshop, period): partial unique index excluding cancelled/expired; one order per enrollment-period.
- I5 (P) Mandatory materials: at least one line from that period's enabled offers, respecting variant/quantity limits, unless the period is configured optional or admin enrolls manually with override. Materials not offered in that period can never be ordered.
- I6 (M) Server-side pricing: totals computed on the server from price snapshots (fee + sum of lines). Mockup arithmetic is wrong (48.000+11.800+5.900 shown as 65.800).
- I7 (P) One transfer for fee + materials; the ledger records the split (fee vs materials) for the Cuotas/Senas/Materiales income categories.
- I8 (P) Only published workshops with open enrollment accept requests; pausing/rescheduling never deletes history (archive, no hard delete).
- I9 (P,M) Weekend workshops: deposit confirms the seat and decrements capacity; deposit <= price; quorum cancellation and 72 h/no-show policy stored as data per workshop.
- I10 (N) Money = integer centavos ARS, no floats; ledger append-only (corrections = reversing entries); es-AR formatting only at the edge.
- I11 (M) Teacher settlement = registered income attributed to the activity x agreed %; percentage snapshotted at period close; base to confirm (Q18).
- I12 (O) Renewal token: scope (student, workshop, period); >=128-bit unguessable (recommend 256); stored hashed; expires; revocable; idempotent submit; exposes no PII beyond first name and the offer.
- I13 (N) Notifications: enqueued in the same transaction as the state change (outbox); delivered at-least-once with provider idempotency key; suppression honored; every send/failure logged; provider daily quota respected.
- I14 (P) Every admin use case requires an authenticated admin and records the actor; authorization is enforced inside use cases/DAL, not only in routing (Next.js docs [V]: Server Actions are reachable by direct POST; a proxy matcher change can silently remove coverage).
- I15 (N) Order pages use an unguessable public id, never the sequential order number CI-YYYY-NNNN (enumeration risk).
- I16 (N) Instants stored UTC; computed/rendered in America/Argentina/Cordoba (UTC-3, no DST) through a Clock port; period boundaries and weekday session generation are deterministic and tested.

### 1.5 Ubiquitous language (ES -> EN identifiers)
alumna Student; taller mensual MonthlyWorkshop; workshop WeekendWorkshop; periodo WorkshopPeriod; cupo Seat/Capacity; cuota Fee; sena Deposit; pedido/inscripcion-periodo PeriodEnrollment (Order); solicitud = Order in pending state; cobrado Paid; recuperacion MakeUp; enlace de renovacion RenewalInvitation; proveedor Supplier; recordatorio Reminder; evento privado PrivateEvent. UI copy es-AR (voseo); code, comments, commits in English.

---
## 2. Stack comparison

### 2.1 Options
- A. Next.js 16 App Router modular monolith (thin delivery) + PostgreSQL (Neon) + Drizzle + Better Auth + Resend + R2. Hosting by spike: Workers via adapter / Vercel Pro / Node container.
- B. Astro 6 public site + separate React (Vite) admin SPA + Supabase (Postgres, Auth, Storage, Edge Functions) as BaaS.
- C. Next.js 16 + Payload CMS 3 (admin generated over Postgres), single deployable.
- D (added, justified below). React Router 7 framework mode (Vite) modular monolith on Cloudflare Workers + Neon via Hyperdrive + Drizzle + Better Auth + Resend + R2. Added because the Next-on-Workers risk (2.2) makes "Next.js" and "cheap managed host" conflict; D keeps React/Tailwind/Vitest/Vite familiarity and removes the adapter layer.

### 2.2 Evidence behind the scores
- Next.js: docs version 16.3.8; Adapter API stable since 16.2 (2026-03-25) with verified adapters; Cloudflare/Netlify/AWS adapters "in active development, expected later this year" [V nextjs.org/blog/nextjs-across-platforms]. Docs recommend a Data Access Layer for new projects and warn Server Actions are public POST endpoints [V nextjs.org/docs/app/guides/data-security]. Vitest does not support async Server Components; use E2E [V nextjs.org/docs/app/guides/testing/vitest]. `proxy` replaces middleware, runs Node-only, runtime config not allowed [V nextjs.org/docs/app/api-reference/file-conventions/proxy].
- Next on Cloudflare: Cloudflare docs now recommend vinext as the default; OpenNext is the path for existing apps that cannot migrate; Pages only for static export [V developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/]. vinext 1.0 published 2026-09-28: a reimplementation of the Next.js API on Vite (not Next.js), >99% test compatibility excluding cache components, limited `use cache` support, deploys also to Netlify/Lambda [V blog.cloudflare.com/vinext-nextjs-on-vite/]. OpenNext adapter supports all Next 16 minors but Node middleware is unsupported and Windows is not guaranteed [V opennext.js.org/cloudflare]; open issues for 16.2 crash (#1157) and 16.3 compatibility (#1300), and a Next 16 Proxy "version trap" (workers-sdk #13755) [S, GitHub search results; status not read, G]. Better Auth pure-JS scrypt is borderline for the 10 ms Free CPU limit; fix = Workers Paid and/or native scrypt hasher [S github.com/better-auth/better-auth/issues/8860]. Size-limit conflict: OpenNext page says 3 MiB Free / 10 MiB Paid compressed [V]; Cloudflare limits page says Worker size 64 MiB uncompressed on both plans [V developers.cloudflare.com/workers/platform/limits/]. Treat the platform page as authoritative, verify with a real build (G).
- Supabase: Free pauses after 1 week of inactivity, no backups; Pro from USD 25/mo [V supabase.com/pricing].
- Payload: v3.90.x [S], MIT, acquired by Figma June 2025 [V figma.com/blog/payload-joins-figma/], Postgres through a Drizzle adapter [S]. Admin is generated; the mockup admin (kanban, KPI cards, drawers, funnels) would need custom views, which defeats generation. Transaction caveat in hooks recalled from docs, not re-verified (G).
- Astro: acquired by Cloudflare 2026-01-16, MIT retained [V cloudflare.com press release]; Astro 6 March 2026 [S].
- React Router 7 on Workers: official Cloudflare template/GA support [S; confirm in spike].
- Drizzle: stable 0.45.x, 1.0 still beta [S]; Vitest 4 stable with Browser Mode and visual regression [V vitest.dev/blog/vitest-4].

### 2.3 Weighted decision matrix (scores 1-5, higher is better; scores are my judgment)
| Criterion (weight) | A | B | C | D |
|---|---|---|---|---|
| Design fidelity, public AND admin (15) | 5 | 5 | 3 | 5 |
| SEO (8) | 4 | 5 | 4 | 4 |
| Delivery speed, 1 dev + AI, 4-6 wk (14) | 4 | 3 | 3 | 3 |
| First-year + renewal cost (12) | 3 | 2 | 2 | 5 |
| Ops simplicity, 2 admins, low traffic (10) | 4 | 3 | 3 | 4 |
| Data integrity / transactions (10) | 5 | 3 | 3 | 5 |
| Testability under Strict TDD + hexagonal (14) | 4 | 2 | 2 | 5 |
| Team familiarity (7) | 5 | 3 | 2 | 3 |
| Longevity and lock-in (10) | 4 | 3 | 3 | 4 |
| **Weighted total /5** | **4.20** | **3.20** | **2.75** | **4.30** |
Rubric notes: A cost 3 = safe managed host is USD 24/mo, cheap hosts carry adapter/ops risk; B cost 2 = Supabase Pro needed (Free pauses, no backups); C fidelity 3 = admin UI is Payload's; A testability 4 = RSC pages need E2E per Next docs; D testability 5 = loaders/actions are plain functions; B/C testability 2 = invariants drift into SQL/RLS or framework hooks.

### 2.4 Sensitivity (weights: Fidelity, SEO, Speed, Cost, Ops, Integrity, Testability, Familiarity, Longevity)
| Weight set | A | B | C | D | Leader |
|---|---|---|---|---|---|
| Base 15/8/14/12/10/10/14/7/10 | 4.20 | 3.20 | 2.75 | 4.30 | D by 0.10 (tie) |
| Speed+familiarity 12/6/22/10/8/8/12/14/8 | 4.24 | 3.14 | 2.70 | 4.06 | A |
| Cost+ops 12/6/10/25/15/8/10/6/8 | 4.01 | 3.01 | 2.65 | 4.39 | D |
| Architecture+integrity 10/5/10/8/8/18/22/5/14 | 4.25 | 3.00 | 2.70 | 4.43 | D |
Reading: B and C never lead. A vs D is a hosting-economics and familiarity trade-off, not an architecture one: the hexagonal core, presentational components and infrastructure adapters are reused by either; only routes/containers change.

### 2.5 Recommendation and what would change it
Recommend A, deployed per the spike. Pre-agreed contingency D.
- To D if the spike fails or adapter breakage recurs on minor upgrades AND infra must stay under about USD 10/mo; or if after a trial you prefer loaders/actions over RSC/Server Actions.
- Stay on A with Vercel Pro if the studio already pays a Pro seat or accepts about USD 25/mo infra.
- To B only for a tiny admin where BaaS Auth/Storage/Realtime outweigh SQL-resident invariants (pgTAP) and USD 25/mo.
- To C only if non-technical owners editing rich page content dominates and admin fidelity is relaxed; Payload would replace 5-6 CRUD screens, not kanban/dashboards/seat logic.
- VPS Node container only if the studio already runs a VPS fleet with backups and monitoring.
Rejected without scoring: Laravel/Filament, Django admin, Rails (fidelity, familiarity); SvelteKit/Nuxt (familiarity); Tiendanube/Shopify (out of scope, contradicts custom workflows); Netlify as host (Free hard-pauses all sites at credit exhaustion; Personal plan is positioned for solo open-source use).

---
## 3. Hosting, database, storage, email, scheduling

### 3.1 Verified facts (checked 2026-10-05)
| Service | Fact | Source |
|---|---|---|
| Vercel | "Hobby teams are restricted to non-commercial personal use only"; commercial includes "receiving payment to create, update, or host the site"; applies to every deployment incl. staging | https://vercel.com/docs/limits/fair-use-guidelines [V] |
| Vercel | Hobby USD 0; Pro USD 20/mo; Developer seat USD 20/mo; Pro includes USD 20 usage credit | https://vercel.com/pricing [V] |
| Vercel | Cron: Hobby once/day, +-59 min precision; Pro per-minute; 100 jobs/project; region gru1 Sao Paulo exists, default function region iad1 | https://vercel.com/docs/cron-jobs/usage-and-pricing ; https://vercel.com/docs/regions [V] |
| Cloudflare Workers | Free: 100,000 req/day, 10 ms CPU/req, 5 Cron Triggers. Paid: USD 5/mo per account minimum, 10M req + 30M CPU-ms included, CPU 30 s default (max 5 min), 250 Cron Triggers | https://developers.cloudflare.com/workers/platform/pricing/ ; /limits/ [V] |
| Cloudflare Hyperdrive | Included on Free (100,000 queries/day) and Paid (unlimited), no egress charge | https://developers.cloudflare.com/hyperdrive/platform/pricing/ [V] |
| Cloudflare R2 | 10 GB-month, 1M Class A, 10M Class B free; USD 0.015/GB-month after; egress free | https://developers.cloudflare.com/r2/pricing/ [V] |
| Cloudflare Images | 5,000 unique transformations/month free, USD 0.50/1,000 after; works on images stored outside Images (R2) | https://developers.cloudflare.com/images/pricing/ [V] |
| Cloudflare Stream | USD 5 per 1,000 minutes stored + USD 1 per 1,000 minutes delivered; no free tier | https://developers.cloudflare.com/stream/pricing/ [V] |
| Cloudflare misc | Turnstile free [S blog.cloudflare.com/turnstile-ga/]; Web Analytics free, cookie-free [V developers.cloudflare.com/web-analytics/] | |
| Supabase | Free: 500 MB DB, 1 GB storage, 50k MAU, 2 projects, paused after 1 week inactivity, no backups. Pro from USD 25/mo (8 GB, 7-day backups, USD 10 compute credit). Restore of paused project up to 1 year | https://supabase.com/pricing ; https://supabase.com/docs/guides/platform/free-project-pausing [V] |
| Neon | Free: 1 GB/project (20 GB account), 100 CU-hours/project, up to 2 CU, scale-to-zero after 5 min (cannot be disabled), 6 h restore window; "prototypes, side projects, small teams"; no explicit commercial prohibition found | https://neon.com/pricing ; https://neon.com/docs/introduction/plans [V] |
| Neon | Launch: usage-based USD 0.106/CU-hour + USD 0.35/GB-month, scale-to-zero can be disabled, 7-day restore. Region aws-sa-east-1 (Sao Paulo) available. Resume from idle "typically a few hundred ms" | https://neon.com/pricing ; /docs/introduction/regions ; /docs/connect/connection-latency [V] |
| PlanetScale | Postgres PS-5 single node USD 5/mo (512 MiB RAM, backups included, always on); HA 3-node USD 15; no Sao Paulo region for PS rows | https://planetscale.com/pricing [V] |
| Netlify | Free 300 credits hard cap: at zero ALL sites paused; production deploy 15 credits, bandwidth 20/GB, compute 10/GB-h, 2 per 10k requests; previews free. Personal USD 9 (1,000 credits, auto-recharge 500 for USD 5); Pro from USD 20 (3,000 credits, unlimited members) | https://www.netlify.com/pricing/ ; docs.netlify.com credit-based pages [V] |
| Resend | Free USD 0: 3,000 emails/mo, 100/day, 3 domains, 30-day retention. Pro USD 20/mo: 50,000 emails, no daily cap. Subdomain sending recommended; DMARC recommended not required; Idempotency-Key (24 h) on POST /emails and /emails/batch | https://resend.com/pricing ; /docs/dashboard/domains/introduction ; /docs/dashboard/emails/idempotency-keys [V] |
| Amazon SES | USD 0.10 per 1,000 emails; new accounts up to USD 200 credits for 6 months. Sandbox/production-access rules not read (G) | https://aws.amazon.com/ses/pricing/ [V] |
| Brevo | Free 300 emails/day [S only; official page not machine-readable] (G) | |
| Gmail rules | All senders: SPF or DKIM, valid DNS, TLS, spam rate <0.3%. Bulk (5,000+/day): SPF+DKIM+DMARC + one-click unsubscribe | https://support.google.com/a/answer/81126 [V] |
| GitHub Actions | schedule shortest interval 5 min; can be delayed at start of every hour; runs on default branch; public repos disabled after 60 days inactivity. Free private minutes 2,000/mo [S] | https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows [V] |
| Domain | .com.ar registration ARS 8,500, annual renewal ARS 8,500 (registrant requirements not read, G) | https://nic.ar/es/dominios/dominios_y_aranceles [V] |
| FX | Official 2026-10-05: BNA retail 1,495 buy / 1,545 sell; wholesale 1,516 [S, Rio Negro press] | |
| Node | v24 Krypton LTS, v22 LTS, v26 Current (May 2026) | https://nodejs.org/en/about/previous-releases [V] |
| Hetzner | CX23 EUR 5.49/mo after 2026 increases [S northflank.com], not verified at hetzner.com | |

### 3.2 What the facts rule out
Vercel Hobby (commercial); Netlify Free (hard pause of all sites); Supabase Free (pausing, no backups); Neon Free for production (6 h restore, prototype positioning); Workers Free for the app (10 ms CPU vs password hashing and SSR); Cloudflare Stream (no free tier, prepaid blocks); polling cron every 5 min on Neon (keeps compute awake about 730 h x 0.25 CU x USD 0.106 = about USD 19/mo).

### 3.3 Candidate setups (USD; fee reference = USD 556 midpoint)
| Setup | Components | Monthly | First year incl. domain (USD 5.6) | % of fee |
|---|---|---|---|---|
| S1 Safe managed | Vercel Pro 20 + Neon Launch 3-5 + R2/Resend/CF free | 23-25 | 282-306 | 51-55% |
| S2 Lean managed (recommended if spike passes) | Workers Paid 5 + Neon Launch 3-5 + R2/Resend/CF free | 8-10 | 102-126 | 18-23% |
| S3 Minimum | Workers Paid 5 + Neon Free + nightly dumps | 5 | about 66 | 12% (not for prod) |
| S4 Self-managed | VPS about EUR 5.5 [S] + Neon Launch | about 10-12 | about 125-150 | 22-27% + ops burden |
| S5 Supabase-centric | Supabase Pro 25 + static host free | 25 | about 306 | 55% |
Neon Launch estimate [A]: autoscaling minimum 0.25 CU (not verified) and <=150 active hours/month: 150 x 0.25 x 0.106 = USD 3.98 + storage <=1 GB x 0.35. Costs are USD, revenue is ARS: add an FX clause to the renewal quote.

### 3.4 Recommended setup
App Next.js 16.3.x + React 19 + Tailwind 4, Node 24 for build/test, pnpm. Hosting: Cloudflare Workers Paid (spike-gated; fallback Vercel Pro, then D, then Node container). DB: Neon Postgres in aws-sa-east-1; Free for dev/preview branches, Launch at go-live (7-day restore). Storage: R2 + Cloudflare Images transformations (fallback sharp on Node hosts). Email: Resend Free behind an EmailSender port (alternatives Brevo, SES). Scheduling: host cron -> /api/internal/dispatch guarded by CRON_SECRET; GitHub Actions schedule as provider-agnostic fallback and for nightly encrypted pg_dump to R2 (30-day retention, monthly restore drill). DNS/CDN/WAF/Turnstile/Web Analytics: Cloudflare free. Domain: .com.ar registered in the CLIENT's name, DNS delegated to Cloudflare.
Spike kill criteria (1 day, first task of platform-foundation): (1) pinned Next 16.3.x builds in CI (Linux) and deploys; (2) DB read + interactive transaction + SELECT FOR UPDATE through Hyperdrive to Neon; (3) Better Auth sign-in with a native scrypt hasher under CPU limits; (4) R2 presigned upload + Images transformation; (5) cron `scheduled` triggers the dispatch use case; (6) preview per PR and local dev works on Windows (WSL if needed). Any failure -> fallback chain. Try OpenNext first (supported), vinext second (Cloudflare default, 1 week old); app code stays plain Next.js either way.

### 3.5 Scheduled jobs per host
Vercel Pro: vercel.json crons (per-minute) [V]. Workers: Cron Triggers via `scheduled()` entry or a companion Worker calling the internal route (5 free / 250 paid) [V]. GitHub Actions: 5-min minimum, hourly delays [V]. Netlify scheduled functions and Supabase pg_cron not verified (G). Cadence rule: event-driven best-effort dispatch right after commit (Next `after()`/waitUntil) + a cron every 30 min between 08:00-22:00 ART + one daily 09:00 job for scheduled reminders; this bounds Neon wake-ups.

### 3.6 Email
Volume [A]: 60 active students x about 6 service emails/month (E1,E3,E5,E6 + up to 2 reminders) = about 360/mo + owner notifications about 60; optional class reminders +240. Resend Free (3,000/mo) suffices; the 100/day cap binds if >90 students are invited the same day -> the outbox throttles to <=80/day, or move to Resend Pro USD 20 / Brevo / SES. DNS on a sending subdomain (e.g., mail.<domain>): MX (bounces) + SPF TXT + DKIM records exactly as shown by Resend, then DMARC TXT `_dmarc` (start p=none with rua, tighten after 2-4 weeks). Gmail requirements above are far below our volume but SPF/DKIM/DMARC are all configured. Reply-To = owners' real mailbox.

### 3.7 Media
Images: admin upload via presigned PUT to R2 (MIME and size limits, EXIF stripped), alt text required; delivery through Cloudflare Images transformations (5,000 unique/month free) with srcset. Videos: MP4 H.264 <=50 MB on R2 (egress free) with poster, or YouTube-nocookie click-to-load facade; Stream rejected.

### 3.8 Verified vs assumption vs gap
Verified: section 3.1 [V] rows. Assumptions: Neon Launch usage, email volumes, VPS price, student counts. Gaps: OpenNext 16.3 issue status, Netlify scheduled functions, Supabase pg_cron, SES production access, Brevo official terms, NIC.ar registrant requirements (CUIT/CUIL + AFIP/ARCA key expected, confirm), font licenses, Hyperdrive transaction semantics with Neon (spike), Workers size-limit conflict (spike).

---
## 4. Architecture blueprint (Option A)

### 4.1 Principles
Screaming folders by business module; hexagonal inside each module; pure domain; use cases return Result (expected failures are values); zod only at the delivery boundary; manual constructor injection in a composition root (no DI container); explicit over implicit (use cases enqueue notifications; no generic event bus in v1); delivery layer thin; container-presentational split; framework choice reversible (A<->D) because only routes/containers change.

### 4.2 Folder tree
```
calmainquieta/
  src/
    app/                      DELIVERY (Next.js routes only: parse, guard, call use case, render)
      (public)/               /, talleres, workshops, eventos-privados, quienes-somos, contacto
      (flow)/                 talleres/[slug]/inscripcion|materiales, pedido/[publicId], renovar/[token] (focused header, noindex)
      (admin)/admin/          resumen, inscripciones, renovaciones, alumnas, talleres, workshops, materiales,
                              eventos-privados, recordatorios, metricas, profesores, contenido, ajustes
      api/                    internal/dispatch (cron), webhooks/resend, health
    modules/
      _shared/                kernel: Money, Period, PhoneNumber, EmailAddress, Result, Clock, IdGenerator, UnitOfWork, DomainError
      <module>/               identity, teachers, monthly-workshops, weekend-workshops, materials, students,
                              enrollments, renewals, attendance, private-events, notifications, content, metrics
        domain/               entities, value objects, domain services, errors (pure TS, no I/O)
        application/          use cases (commands/queries), ports, DTOs
        infrastructure/       drizzle repositories + schema.ts, resend, r2, wa.me link builder
        ui/                   containers + module-specific presentational components
        index.ts              PUBLIC API: use cases + DTO types only
    design-system/            tokens + atoms / molecules / organisms / templates (presentational only)
    composition/              composition root: production, test, e2e wiring
    platform/                 env.ts (validated), logger, db client, es-AR formatters
    testing/                  builders, in-memory fakes, contract suites, DB harness
  e2e/  drizzle/  docs/{architecture,adr,glossary,client-proposal,brand}  .github/workflows/  openspec/
```

### 4.3 Dependency rule (enforced)
1 domain imports only `_shared/domain`. 2 application imports domain, its own ports, `_shared`; other modules ONLY via their `index.ts`. 3 infrastructure implements ports; never imported by domain/application/ui. 4 presentational components import nothing but props/design-system; containers import module public APIs. 5 delivery (`app/`) imports public APIs + composition + design-system; no business rules, no ORM/SDK imports. 6 composition is the only place adapters are instantiated. Enforcement: eslint-plugin-boundaries (or dependency-cruiser) in `pnpm lint`, a Vitest architecture test (fitness function) that fails on forbidden imports, `server-only` markers, CI gate. A repo AGENTS.md states the rule for AI agents.

### 4.4 Cross-module collaboration and transactions
Ports are defined by the consumer (e.g., `SeatLedger` in enrollments); adapters in composition map to the other module's public API. A `UnitOfWork` port (Drizzle implementation) gives one DB transaction across modules. Process-owning use cases (ConfirmOrderPayment) live in the module that owns the process and coordinate others through ports. Side effects after commit (revalidate public cache tags, best-effort email dispatch) run outside the transaction through a `PublicCache` port.

### 4.5 Delivery-layer rules
`requireAdmin()` in every Server Action/route handler AND inside the DAL/use case (do not rely on proxy/middleware); zod parse; call use case with ActorContext; map Result to UI; never return raw entities (DTOs only); rate limit + Turnstile + honeypot on public mutations; public read use cases cached with tags and revalidated on commit; avoid `proxy.ts` entirely if the Cloudflare adapter path is chosen.

### 4.6 First-cut data model
| Module | Entity | Key fields | Constraints / statuses |
|---|---|---|---|
| identity | admin_user, audit_entry | name, email, role[owner,admin], active, totp; actor, action, entity, diff, at | Better Auth tables (session, account, verification); sign-up disabled |
| teachers | teacher | name, bio_short, photo, modality[own,third_party], default_percentage, active | |
| materials | supplier; material; material_variant | contact/phone/email/city; name, description, category, supplier_id, image, active; label, price_centavos, swatch, active | soft deactivate; price snapshotted into order lines |
| monthly-workshops | monthly_workshop | slug, name, technique, description, teacher_id, weekday, start/end, class_minutes, default_fee, default_capacity, image | status[draft,published,paused,archived] |
| | workshop_period (FIRST-CLASS) | workshop_id, period YYYY-MM, fee, capacity, confirmed_seats, classes_included, renewal_opens_at, public_opens_at, enrollment_deadline_at, materials_required | UNIQUE(workshop, period); CHECK 0<=confirmed_seats<=capacity; status[draft,renewal_open,public_open,closed,archived] |
| | class_session | period_id, date, start/end, number | status[scheduled,held,cancelled]; generated from weekday, editable for holidays |
| | period_project | period_id, name, description, image, sort | "proyectos que vamos a realizar" |
| | period_material_offer | period_id, project_id?, material_variant_id, min_qty, max_qty, required, sort | defines what the cart may contain |
| weekend-workshops | weekend_workshop | slug, name, technique, teacher_id, starts_at/ends_at, price, deposit, capacity, confirmed_seats, min_seats, cancel_deadline_hours, policy_text, materials_included | status[draft,published,paused,cancelled,done,archived]; deposit<=price |
| students | student; student_note | full_name, email, email_norm, phone_e164, city, instagram, joined_at, consent_service_at, policy_version, unsubscribed_at; author, body | unique email_norm / phone_e164; duplicates flagged |
| enrollments | period_enrollment | public_id, order_number CI-YYYY-NNNN, student_id, workshop_id, period_id, source[public_new,renewal_link,admin_manual], fee, materials_total, total, requested_at, paid_at, policy_version | status[pending_confirmation,paid,materials_requested,materials_received,cancelled,expired]; partial UNIQUE(student, period) excluding cancelled/expired |
| | order_line | enrollment_id, kind[fee,material], variant_id?, description, unit_price, qty, supplier_id? | snapshots |
| | workshop_registration | public_id, order_number, student_id, weekend_workshop_id, price, deposit | status[pending_confirmation,deposit_paid,fully_paid,cancelled,no_show,refunded] |
| | payment | student_id, enrollment_id?, registration_id?, kind[fee,materials,deposit,balance,refund], amount signed, method, paid_at, registered_by, proof_note, transfer_ref, voids_payment_id? | append-only ledger |
| renewals | renewal_invitation | student_id, workshop_id, period_id, token_hash, channel[email,whatsapp_manual], sent_at, expires_at, first_opened_at, used_at, revoked_at, reason, enrollment_id?, reminders_sent | status[created,sent,opened,used,expired,revoked]; UNIQUE active per (student, period) |
| attendance | attendance_mark; makeup_credit | session_id, student_id, status[present,absent,made_up], marked_by; source_mark_id, status[open,used,expired], expires_at | UNIQUE(session, student); make-up model open (Q17) |
| private-events | event_inquiry; event_timeline_entry | client, phone, email, instagram, city, type, variant, tentative_date, participants, ages_text, modality[at_studio,at_home], preferred_activity, message, internal_notes, quote?; kind[system,note,manual_contact], body | status[new,quote_sent,following_up,confirmed,lost,done]; timeline append-only |
| notifications | outbox_message | kind, template_key, to_email, student_id?, payload, idempotency_key UNIQUE, scheduled_at, next_attempt_at, attempts, provider_message_id, last_error | status[pending,sending,sent,failed,dead,suppressed] |
| | email_preference; email_template | email_norm, scope[service,reminders,marketing], status, token_hash; key, subject, body, version | transactional templates live in code; DB templates only for admin-editable reminders |
| content | site_settings; media_asset; gallery_item; faq_item; testimonial; policy_document | NAP, hours, social, default wa message; kind[image,video], key, mime, bytes, dims, duration, alt, caption; sort, visible; question, answer, sort; author, quote, rating, consent_at, visible; key, version, body | alt text required for images; policy version snapshot at acceptance |
| metrics | (no tables v1) | SQL read models/views | KPI formulas defined once (Q19) |

### 4.7 State machines
Order: pending_confirmation -> paid -> materials_requested -> materials_received; pending_confirmation -> cancelled|expired; paid -> cancelled (admin, reason, releases seat, ledger reversal). Weekend registration: pending_confirmation -> deposit_paid -> fully_paid; any -> cancelled|no_show|refunded per policy. Renewal invitation: created -> sent -> opened -> used | expired | revoked. Event inquiry: new -> quote_sent -> following_up -> confirmed -> done; any -> lost. Outbox: pending -> sending -> sent | failed (backoff) -> dead | suppressed. Period: draft -> renewal_open -> public_open -> closed -> archived.

### 4.8 Critical flows
**F1 New student, monthly enrollment (public)**
1. Visitor opens /talleres/[slug] (SSR/cached): schedule, teacher, fee, projects, seats left = capacity - confirmed for the earliest public_open period.
2. Fills form: name, phone, email (required), turno, policy acceptance with version, consent wording; Turnstile + rate limit.
3. Materials cart: period offers by category, variants/quantities; cart state client-side; at least one line (I5).
4. Review summary; confirm -> RequestMonthlyEnrollment: validates published workshop + open period + offers + limits, recomputes totals from snapshots, assigns order number from a yearly sequence and an unguessable public id, status pending_confirmation, NO seat consumed.
5. Same transaction enqueues E1 (student) and E2 (owners).
6. Redirect to /pedido/[publicId]: order summary + "Continuar por WhatsApp" (wa.me prefilled: student, workshop, period, lines, order number, total; capped length with order number as fallback) + 4 payment steps.
7. Owner sends alias in WhatsApp (outside the system), student transfers and sends proof.
**F2 Owner confirms payment; seat claimed atomically**
1. Admin opens the order (inbox/kanban, image17 columns) and presses "Marcar como cobrado" (amount, date, proof note).
2. ConfirmOrderPayment in ONE transaction: lock order (SELECT FOR UPDATE); if already paid return success (idempotent).
3. Claim seat: UPDATE workshop_period SET confirmed_seats = confirmed_seats + 1 WHERE id = $1 AND confirmed_seats < capacity RETURNING; zero rows -> NoSeatsAvailable (UI offers audited override or move to another period, Q13).
4. Set status paid/paid_at; insert ledger rows (fee, materials); upsert student by normalized phone/email (flag duplicates); audit entry; enqueue E3.
5. Commit; then revalidate public tags for the period and best-effort dispatch.
6. Later transitions materials_requested (E4 optional) and materials_received (E5) by admin, single or bulk from supplier consolidation.
**F3 Weekend workshop deposit**
1. Public registration form (design missing) saves WorkshopRegistration pending + E1-style ack; wa.me hand-off.
2. Owner registers deposit -> ConfirmDeposit: same atomic seat claim on weekend_workshop.confirmed_seats; ledger kind=deposit; E11.
3. Balance recorded later (kind=balance). Quorum not met or admin cancels -> registrations cancelled, refunds as reversing ledger entries, E11 cancellation; policy values from workshop data.
**F4 Monthly renewal (continuing students; owner decision)**
1. Owner finalizes next period: fee, capacity, sessions, projects and material offers; opens it for renewal.
2. Trigger = owner action "Enviar enlaces" (optionally scheduled via renewal_opens_at; never an unattended first send). Eligible = students with a paid enrollment in the previous period of that workshop, not marked as leaving.
3. Per student create RenewalInvitation: 256-bit random token, only SHA-256 hash stored; scope (student, workshop, period); expires_at = enrollment deadline (default period start + 3 days, hard max 30); enqueue E6 with link /renovar/<token>; admin may also copy a wa.me manual message per student.
4. Student opens link: token lookup by hash; generic errors; no-store, no-referrer, noindex; shows first name, month's projects/materials cart, fee.
5. Submit -> SubmitRenewal creates PeriodEnrollment (source renewal_link, pending_confirmation), idempotent on double submit, invitation -> used; wa.me hand-off as F1 step 6.
6. Owner confirms payment exactly as F2.
7. Reminders E7 at T-3 and T-1 days before expiry for unused links; stop on used/revoked.
8. Non-renewal: invitation expires; student stays in the file as "No renovo"; appears in admin Renovaciones list; seats are not held so none to release; owner can resend (new token revokes old) or enroll manually; flagged inactive after 30 days without attendance (mockup rule). Public opening for new students N days after the links (default 3).
9. Revocation: admin button, automatic on re-issue, student archived, or period closed.
**F5 Email dispatch (outbox)**
1. Use cases call NotificationOutbox.enqueue inside their transaction (idempotency key = kind + entity id + version).
2. DispatchDueNotifications (called after commit best-effort and by cron with CRON_SECRET) claims a batch with FOR UPDATE SKIP LOCKED, checks suppression/preferences, renders the template, calls EmailSender with the provider Idempotency-Key, records provider message id.
3. Failures back off exponentially up to N attempts then dead; admin send log shows status; daily quota guard (<=80/day on Resend Free); webhooks (bounce/complaint) feed suppression (G: event names not re-verified).

### 4.9 Email notification catalog (scope addition; confirm in Q20)
| # | Trigger | Recipient | Timing | Default | Basis/opt-out |
|---|---|---|---|---|---|
| E1 | Enrollment/renewal request received | student | immediate | ON | service for requested enrollment |
| E2 | New request | owners mailbox | immediate | ON | internal |
| E3 | Payment confirmed, seat confirmed | student | immediate | ON | service |
| E4 | Materials requested from supplier | student | on status | OFF | service |
| E5 | Materials received/ready | student | on status | ON | service |
| E6 | Monthly renewal link | continuing student | owner action or scheduled | ON | existing-customer service message + preference link |
| E7 | Renewal reminder T-3/T-1 | students with unused link | scheduled | ON | same |
| E8 | Class reminder day before | enrolled students | daily 18:00 ART | OFF in v1 | opt-in |
| E9 | Pending payment reminder | pending orders | owner bulk action | ON (manual) | service |
| E10 | Schedule change/class cancelled | affected students | owner action | ON (manual) | service |
| E11 | Weekend workshop received / deposit confirmed / reminder / cancellation | registrant | status/scheduled | ON | service |
| E12 | Private event inquiry received | requester | immediate | ON | service |
| E13 | Admin security (reset, login alert) | admin | on demand | ON | security |
Sender: Calma Inquieta <avisos@mail.<domain>>, Reply-To owners. Marketing/newsletter is out of v1.

### 4.10 Security notes
Capability-URL tokens: hash at rest, short TTL, single scope, revocation, rate limit by IP and token prefix, generic errors, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, exclude from analytics and redact in logs; email forwarding risk accepted because the page exposes no PII beyond first name and the owner verifies each payment manually. Admin: no sign-up, TOTP 2FA, rate limits, session cookies httpOnly/secure/sameSite. CSP with nonces, HSTS. Least-privilege DB roles (app vs migration). Secrets only in host/GitHub secret stores, validated in env.ts. Upload validation. gitleaks in pre-commit and CI. Encrypted backups.

### 4.11 SEO surfaces
SSR/cached pages, es-AR, canonical, sitemap from published activities, robots, JSON-LD: LocalBusiness (NAP, hours, geo, sameAs), Event per published weekend workshop, Course/CourseInstance optional, VideoObject, BreadcrumbList. FAQPage markup gives no rich result for this site (Google restricts FAQ rich results to well-known government and health sites since Sept 2023) [V developers.google.com/search/docs/appearance/structured-data/faqpage]: add only as plain semantic content. Targets LCP <2.5 s mobile, CLS <0.1, INP <200 ms [A]. Google Business Profile out of scope (NAP consistency only).

---
## 5. Design-fidelity strategy

### 5.1 Method
1 Tokens first (Tailwind 4 `@theme` + TS constants) from the mockup palette in mockups-analysis 3.3. 2 Derive AA-safe variants by rule (OKLCH lightness steps) and enforce with a unit test that computes WCAG contrast for every declared text/background pair and fails below 4.5:1 text / 3:1 UI. 3 Accessible primitives from Radix/shadcn (copy-in, fully re-themed; no default look leaks). 4 Atomic library in Storybook (add in design-system-foundation, not in platform-foundation). 5 Per-screen fidelity review against the WebP mockup at 1672x941 plus mobile frames. 6 Vitest 4 Browser Mode `toMatchScreenshot` baselines after owner approval. 7 A Deviation Register so "match as closely as possible" stays transparent.

### 5.2 Tokens (from analysis, approximate until client assets arrive)
Page cream #F9F6F1; surface #FBF7F3 / white; sand base #E6D7C4; sand deep #D5C1A9; clay primary #936D53 (white text 4.6:1, marginal); sage #A6A992 (fills only, never text or white-on); tan #E3D1BC; ink near #111; body #5E5B57 (6.3:1 pass); statuses: pending #E2CDBB, absence #EDD6CD, supplier #EBCDA6, kanban headers #E5D4C1/#ACB6A4/#D7B8A1/#EBDDC5. Known failures to fix by rule: muted #908E8A on cream 3.0:1, eyebrow #968A7E 3.1, link #A27E66 3.4, placeholder #BCB8B4 1.9, white on sage #A3A591 2.5, white on #9C7359 4.2, white on olive #7D7F6B 4.1. Agency/partner navy and blue stay out of the system.

### 5.3 Typography
Display serif likely Cormorant Garamond (light/regular + italic accent) for H1-H3 and KPI numerals; admin headings unified to the same serif (image19 looks Playfair-like; unify). Body/UI sans likely Montserrat or Mulish 400/500/600. Eyebrows uppercase tracked 0.15-0.2em. Handwritten note = image asset, not a webfont. One fluid type scale for public, fixed scale for admin (mockup H1 ranges 40-90 px). Load via `next/font` (self-hosted at build). Candidate fonts are OFL on Google Fonts [A: verify license text, G]; ask the client for the real brand fonts (Q5).

### 5.4 Atomic inventory (mapped to mockups)
Atoms: Button (primary/outline/link/icon), Input, Select, Checkbox, Switch, Chip/Pill, Badge, Avatar, Icon, Heading/Text, Divider. Molecules: FormField, SearchInput, QuantityStepper, SizeChipGroup, SwatchGroup, StatusPill, KpiCard, WorkshopCard, MaterialCard, TestimonialCard, DateBadge, ProgressBar, Breadcrumb, ContactItem. Organisms: PublicHeader/Footer, HeroCollage, WorkshopGrid, MaterialsCatalog, OrderSummaryCard (the cart), EnrollmentForm, EventRequestForm, GalleryGrid+Lightbox, FaqAccordion, ContactBand, AdminSidebar/Topbar, DataTable, Drawer, KanbanBoard, charts (bar/stacked/funnel as small SVG components), Timeline. Templates: PublicPage, FlowPage (focused header: logo + steps + back), AdminPage, AdminDrawer.

### 5.5 Mobile (no mockups exist)
Mobile-first public CSS with translation rules: stack columns, sticky bottom CTA bar on taller detail, cart summary becomes bottom sheet, filters become horizontally scrollable pills, drawers become full-screen sheets, tables become cards. Owner approves 3 mobile frames before build: Inicio, taller detail + form, materials cart/summary. Admin desktop-first, usable on phone for the three daily tasks (orders inbox, mark paid, attendance) because owners work from phones (Q6).

### 5.6 Accessibility
WCAG 2.2 AA: contrast tests (above), focus-visible, 24 px targets, keyboard/escape for drawers and lightbox (Radix), reduced motion, alt text mandatory in the media library, error semantics on forms, lang es-AR, skip link, axe in component and E2E tests.

###...

---

# Exploration: platform-foundation (Calma Inquieta) - PART 2 of 2 (rev 2)

Continuation of Engram #199 (topic_key sdd/platform-foundation/explore). Verified cut point: #199 keeps sections 0 to 5.6 complete; Engram truncated it (50,000-byte limit) right after the 5.6 text, at the start of 5.7. This part restates 5.6 and carries 5.7 to 12, errata and the source log. Date 2026-10-05; project calmainquieta. Evidence tags as in part 1: [V] primary source fetched and read; [S] secondary source or search result only; [A] assumption; [G] gap. To build openspec/changes/platform-foundation/exploration.md, concatenate part 1 (up to its truncation marker) and this part.
REV 2 (same day): the owner constrained hosting to FREE or VERY CHEAP; Vercel Pro is ruled out. Section 12 re-ranks setups and frameworks and SUPERSEDES part 1 (section 0 cost paragraph, 2.5, 3.3, 3.4, 3.8: Vercel Pro fallback, setups S1/S2/S5, "recommend A") wherever they conflict. Net effect: the primary framework becomes option D (React Router 7 on Cloudflare Workers) targeting Setup 0 (USD 0/month); option A (Next.js 16) is the alternative at Setup 1b (USD 5/month). Modules, data model, flows, email catalog and the 16-change order are unchanged. Sections 6.3, 7, 8, 9, 10 below were updated for the constraint.
Next step: sdd-propose, after the owner answers Q1 (hard USD 0 or up to USD 5?), Q2, Q3 and approves Q4.

---
## 5 (continued). Design-fidelity strategy

### 5.6 Accessibility (restated for continuity)
WCAG 2.2 AA: contrast tests (above), focus-visible, 24 px targets, keyboard/escape for drawers and lightbox (Radix), reduced motion, alt text mandatory in the media library, error semantics on forms, lang es-AR, skip link, axe in component and E2E tests.

### 5.7 Public/admin consistency
One token set; one primitive set; admin uses a dense variant via CSS variables, not separate components; shells differ (PublicShell / FlowShell / AdminShell). Normalize the inconsistencies listed in mockups-analysis 3.3 (header band, active nav style, top bar variants, button shape, logo lockup).

### 5.8 Deviation Register (initial)
(a) darkened colors for contrast; (b) unified type scale; (c) removed nav items Tienda, Diario, Galeria, Preguntas frecuentes, Materiales, El espacio, A domicilio and the search/account/bag icons (owner decision); (d) one header CTA label; (e) fix the floating WhatsApp button overlapping the last card; (f) "Materiales incluidos" chip reworded for monthly talleres; (g) mobile layouts invented; (h) admin screens designed by extension: Inscripciones, Renovaciones, Profesores, Contenido, Ajustes, login; (i) voseo everywhere, es-AR formats ($ 45.000, 10:00 a 12:00 h); (j) hero collage delivered as a pre-composed responsive asset from real client photos; (k) placeholder photos replaced by client photos (alt text required).

### 5.9 Screens to design (no image exists)
Inscripciones inbox; Renovaciones control center; Profesores; workshop edit form and registration form; Nueva actividad / Agregar alumna; login; email templates and send log; Registrar pago / Registrar recuperacion dialogs; empty, full and error states (see Q29); renewal page; Contacto page; Nosotros gallery and FAQ sections; wa.me message copy; mobile frames.

---
## 6. Testing and quality

### 6.1 Layers
| Layer | Tool | Scope | Command (proposed) |
|---|---|---|---|
| Unit | Vitest 4 (project `unit`) | domain + application with in-memory fakes; table-driven state machines; property tests (fast-check) for capacity and transitions; money, phone normalization, wa.me golden strings, token generation/hash, period/session generation, settlement/KPI math, quorum and 72 h rules with a fake Clock | `pnpm test` (the ONE workspace command, no Docker) |
| Contract | Vitest | each port suite runs against the in-memory fake AND the Postgres adapter so fakes cannot drift | part of `pnpm test:integration` |
| Integration | Vitest + real PostgreSQL (Testcontainers locally, service container in CI; same major as the Neon project, 17 assumed [A]) | repositories, migrations from scratch, concurrency (N parallel ConfirmOrderPayment against K seats -> exactly K succeed), idempotency, outbox SKIP LOCKED (no double send), rollback when enqueue fails, unique constraints, token lookups | `pnpm test:integration` |
| Component | Vitest 4 Browser Mode (Playwright provider) + axe | presentational components, tokens, visual baselines (`toMatchScreenshot`) | `pnpm test:components` |
| E2E | Playwright | critical flows: new enrollment -> admin confirms -> public seat count drops; renewal link incl. expired/revoked/duplicate submit; weekend deposit; event request; admin auth/IDOR; email through an in-memory EmailSender driver | `pnpm test:e2e` |
| Architecture | Vitest + eslint-plugin-boundaries or dependency-cruiser | the dependency rule (part 1, 4.3) | inside `pnpm lint` and `pnpm test` |
| Gate | CI `verify` | lint, typecheck, test + coverage, integration, build, e2e smoke | `pnpm verify` |
PGlite is rejected for the main suite (cannot reproduce concurrent connections or production locking semantics): one engine in tests = the production engine. Coverage gate on domain/application (about 90% branches), none on UI initially. Docker Desktop (WSL2) availability is an open item (Q3).

### 6.2 Strict TDD activation (first change, before any behavior task)
1. Pin Node 24 (LTS [V nodejs.org/en/about/previous-releases]) + pnpm; install Vitest 4 + coverage-v8.
2. Define `pnpm test` as the single workspace command; prove the runner with a RED then GREEN test on `Money` (the only shared primitive in the first change).
3. Flip in `openspec/config.yaml`: `strict_tdd: true`, `rules.apply.tdd: true`, `workspace_test_command: "pnpm test"`, `test_layers` (unit vitest; integration vitest+postgres; e2e playwright when added), `quality` (eslint, tsc, prettier), the `projects` entry, and `verify.test_command`.
4. Refresh Engram `sdd-init/calmainquieta` and `sdd/calmainquieta/testing-capabilities`.
5. Only then schedule behavior tasks. Work-unit commit pattern: test and implementation in the same Conventional Commit.

### 6.3 Where TDD pays and where it does not
Strict RED-GREEN-REFACTOR for domain/application (state machines, seat claims, tokens, pricing, scheduling). Flows get E2E-first: under option A, async Server Components cannot be unit-tested in Vitest [V nextjs.org/docs/app/guides/testing/vitest]; under option D, loaders/actions are plain functions and are unit-testable. No snapshot dogma for UI. Mutation testing (Stryker) on state machines is a later nice-to-have.

---
## 7. Delivery foundations
- Git: `git init` on main, protected; trunk-based with short-lived `feat/<change>-<slice>` branches; each slice <=400 changed lines; rebase-and-merge keeps work-unit commits (squash only for single-unit slices); Conventional Commits, no AI attribution; each slice deployable, unfinished routes unlinked (dark launch). Delivery strategy `ask-on-risk`: ask once per change whose forecast exceeds 400 lines; recommend stacked slices to main.
- Remote: GitHub private repo under the TR_WebStudio organization; creating the remote and pushing require explicit user authorization (not assumed).
- Repo hygiene: `.gitattributes` `* text=auto eol=lf`, `.editorconfig`, Prettier endOfLine lf (Windows CRLF), cross-platform scripts only, extend `.gitignore` (.env*, build output, coverage, .claude/settings.local.json, the mockup originals folder; `.atl/` already ignored); AGENTS.md with the architecture and TDD rules for AI agents.
- CI (GitHub Actions): verify job, e2e job on PRs touching critical flows, Renovate/Dependabot, gitleaks, nightly encrypted pg_dump to R2 and a monthly restore drill; budget about 400-700 min/month vs 2,000 free [S].
- Environments: local (docker compose Postgres, in-memory/log email driver, filesystem media adapter); preview per PR with a Neon branch or dev project, seeded fake data, noindex; staging = preview pinned to main for client UAT/training; production (Neon per the chosen setup, Resend prod domain, R2 prod bucket, custom domain).
- Secrets: host secret stores + GitHub secrets; `.env.example` without values; env schema validated at boot; scoped keys (R2 bucket-scoped, Resend send-only); CRON_SECRET, AUTH_SECRET; separate DB roles for migrations vs runtime.
- Backups/DR: the Neon Free restore window is only 6 h and Launch 7 days [V], so a nightly encrypted logical dump to R2 (GitHub Actions, 30-day retention) is mandatory on every setup; monthly restore drill; RPO <=24 h, RTO <=2 h [A]; student data export for ARCO requests.
- Mockup PNGs (about 35 MB): do NOT use Git LFS (quota and clone complexity for a one-developer private repo) and do not commit the PNG originals. Convert the 20 files to WebP (quality >= 90; expected single-digit MB, measure in the task [A]) and commit them as `docs/client-proposal/mockups/imageN.webp`. Move the PNG originals to a git-ignored folder (`docs/client-proposal/_originals/`) or external storage, commit a SHA-256 checksum list and the source DOCX location in `docs/client-proposal/README.md`, and ignore that folder (not a global `*.png` rule). image1 to image3 are logos: keep the client monogram (image3) as master PNG only if small, otherwise request the vector (Q5). Instagram JPGs (640 px) stay in the private repo as reference only; they are the client's content, not site assets.
- Ops basics: uptime monitor and error tracking free tiers [A, unverified]; Cloudflare Web Analytics by default (cookie-free [S]).
- Windows notes: workerd/OpenNext tooling may need WSL or CI when Windows support is partial (OpenNext states it [V]); Docker Desktop with WSL2; shell-agnostic scripts.

---
## 8. Roadmap (16 changes)

### 8.1 Ordered changes
Estimates are authored lines including tests (min-max), excluding lockfiles and generated files. Stage = proposal stage (S1 definition, S2 visual design, S3 public web and forms, S4 panel/payments/materials, S5 tests/training/launch). Rev 2 edits are in rows 1, 3, 4, 6, 7, 16.
| # | Change | Goal and scope IN | Scope OUT | Depends | Lines | Stage / week | Main risks |
|---|---|---|---|---|---|---|---|
| 1 | platform-foundation | Walking skeleton proving architecture, toolchain, Strict TDD and deploy; framework per Q4 and the spike (IN: see 8.3) | any business behavior, auth, email, design tokens | none | 700-900 | S1 / wk1 | Workers Free CPU fit (spike), Docker on Windows |
| 2 | design-system-foundation | Tokens (Tailwind 4 theme), fonts, atoms/molecules/organisms core, Public/Flow/Admin shells, contrast tests, Storybook, mobile rules | business screens, real content | 1 | 1,400-1,800 | S2 / wk1-2 | no real brand assets, mobile design gap |
| 3 | admin-identity | Better Auth behind an AdminIdentity port; login; requireAdmin guard; audit port; 2 admins; passwordless-first (email OTP/passkeys) on Workers Free, password + TOTP only on a paid plan; rate limit | roles beyond owner/admin | 1, 2 | 500-700 | S4 / wk2 | 10 ms CPU rules out password hashing on Free |
| 4 | catalog-and-teachers | Teachers; monthly workshops with periods and sessions; weekend workshops; admin CRUD; public Talleres/Workshops pages with seat display; public read models (Cache API TTL; R2 JSON snapshots if Setup 0, +100-150 lines) | enrollment, materials | 1, 2, 3 | 1,300-1,700 | S3-4 / wk2-3 | real data, turnos, period rules |
| 5 | materials-catalog | Suppliers; materials and variants; admin catalog; period projects and offers; supplier consolidation query + copy summary | ordering | 3, 4 | 900-1,200 | S4 / wk3 | real catalog and suppliers |
| 6 | notifications-email-core | Outbox; dispatcher (batches <=5 per invocation on Free, plain-string templates); Resend adapter behind a port; base templates; preferences/suppression; send log; cron endpoint; DNS runbook | business-specific emails | 1 | 800-1,100 | S3 / wk2-3 | deliverability, daily cap, 10 ms cron CPU |
| 7 | public-content-and-seo | Inicio; Quienes somos with gallery (images/videos) and FAQ; Contacto; optional testimonials; site settings; media library (R2); SEO builders; analytics | enrollment flows | 2, 4 | 1,000-1,400 | S3 / wk3-4 | real photos/videos, content delays |
| 8 | monthly-enrollment-flow | New-student flow: form, materials cart, summary, order creation, confirmation page, wa.me builder, E1/E2, Turnstile | payment confirmation, renewals | 4, 5, 6 | 1,200-1,600 | S3-4 / wk3-4 | wa.me number format, cart UX |
| 9 | enrollment-confirmation | Orders inbox/kanban; mark paid with atomic seat claim + ledger; student upsert; status transitions; manual enrollment; capacity override; audit; E3/E5 | renewals, attendance | 3, 8 | 1,000-1,400 | S4 / wk4 | concurrency, overbooking policy |
| 10 | monthly-renewals | Period renewal setup; invitations and tokens; E6/E7; renewal page; non-renewal handling; Renovaciones admin screen | weekend workshops | 9 | 900-1,300 | S4 / wk4-5 | token security, no mockup |
| 11 | students-and-attendance | Student list/drawer/ficha; notes; manual payments; fee status; roll call; make-up credits; inactivity rule | reminders | 4, 9 | 1,200-1,600 | S4 / wk4-5 | make-up model unclear |
| 12 | weekend-workshop-registrations | Public registration; deposit confirmation with atomic seat claim; quorum/cancellation policy; E11 | none notable | 4, 6, 9 | 700-1,000 | S4 / wk5 | no mockup for the form |
| 13 | private-events | Public form; admin pipeline; timeline; wa.me message; E12 | quote PDFs | 2, 3, 6 | 600-800 | S3-4 / wk4-5 | small |
| 14 | reminders-and-communications | Recordatorios admin: segments, templates/variables, E8-E10, wa.me one-by-one queue, send-log views | marketing campaigns, WhatsApp API | 6, 10, 11 | 600-800 | S4 / wk5 | scope creep |
| 15 | metrics-dashboard | Resumen + Metricas read models (occupancy, conversion, revenue by category, renewal rate, materials, teacher settlement); CSV export | BI tooling | 9, 11, 12, 13 | 900-1,200 | S4 / wk5-6 | KPI definitions |
| 16 | launch-readiness | E2E suites; CSP/security headers; a11y and performance audit; backup restore drill; Neon CU-hour monitor; legal pages + RNBD checklist; data import; training guide; DNS/email cut-over; monitoring; 30-day support runbook | new features | all | 600-900 | S5 / wk6 | legal, content |
Total about 14,300-19,400 authored lines (plus 100-150 if R2 snapshots are needed) = about 36-48 review slices of 400 lines.

### 8.2 Mapping to the proposal's 5 stages
S1 Definition (wk1): change 1, content request, Q1-Q10 answers, data model confirmed through specs. S2 Visual design (wk1-2): change 2 plus mobile and missing-screen approvals. S3 Public web and forms (wk2-4): changes 4 (read side), 6, 7, 8, 13 (public form). S4 Panel, registered payments, materials (wk2-5): 3, 5, 9, 10, 11, 12, 14, 15. S5 Tests, load, training, launch (wk6): 16. The proposal's sequential stages overlap for a single developer; 4 weeks is only reachable with the descoping in 8.4.

### 8.3 platform-foundation: exact scope boundary
IN:
1. git init, protected main, .gitignore/.gitattributes/.editorconfig, Conventional Commit tooling, PR template, branch policy doc.
2. Mockup asset policy executed (WebP, checksums, README; section 7).
3. Toolchain: Node 24, pnpm, TypeScript strict, ESLint + boundaries rules, Prettier, and the framework skeleton chosen by Q4 and the spike (primary: React Router 7 framework mode on Cloudflare Workers; alternative: Next.js 16.3.x) with a Tailwind 4 baseline (no tokens).
4. Vitest 4 + `pnpm test` + Strict TDD activation (6.2).
5. Hexagonal skeleton: `_shared` with Money (first TDD example), one trivial `system-status` use case across domain/application/infrastructure/route, composition root, and an architecture test proving the dependency rule fails on a violation.
6. DB harness: Drizzle config, migration workflow, baseline migration, test DB lifecycle, docker-compose Postgres, concurrency-test utility.
7. CI workflow (verify) + Renovate/Dependabot + gitleaks.
8. Environments: validated env.ts, .env.example, preview/prod secrets plan, noindex previews.
9. Deploy walking skeleton: `/status` reads the DB through the use case on the chosen setup after the 1-1.5 day spike (kill criteria in 12.6); ADR-001 stack, ADR-002 hosting (spike results), ADR-003 modules/dependency rule/naming, ADR-004 testing strategy, ADR-005 data conventions (UUIDv7, UTC, centavos, soft delete).
10. Docs: README (setup/commands), glossary, architecture overview.
11. `openspec/config.yaml` + Engram refresh.
OUT: any business module or table, auth, email sending, media storage, content, SEO, analytics, DNS/domain cut-over, design tokens/fonts, Storybook, data import.
Slices: S1 repo hygiene + toolchain + CI + test runner + TDD activation (about 250-300 lines); S2 hexagonal skeleton + architecture test + DB harness (about 300-350); S3 spike outcome + env + deploy walking skeleton + docs/ADRs (about 200-250); total about 750-900.
Definition of done: fresh clone -> `pnpm i && pnpm test` green; CI green; preview URL `/status` returns DB-backed status through the hexagon; config flags flipped; ADRs merged.

### 8.4 Schedule realism and descoping candidates
About 2.4-3.2k reviewed lines per week at 6 weeks, 3.6-4.9k per week at 4 weeks. MoSCoW: MUST changes 1-10, 13, 16; SHOULD 11, 12; COULD 14, 15 (reduced to core KPIs), testimonials, video upload (embed only), TOTP/passkeys, Storybook. Anything cut becomes a quoted extension per the proposal's scope-change clause. Run the riskiest integrations first: hosting spike (wk1), seat-claim concurrency (wk4), email DNS/warm-up (start wk2), wa.me with the owner's real number (wk3), image pipeline (wk3).

---
## 9. Risks and mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Scope vs 4-6 weeks (about 14-19k lines) | late launch | MoSCoW cut line, slices, AI-assisted TDD on domain only, riskiest-first order |
| Framework/host fit: Next.js SSR p50 about 17-21 ms CPU vs the Workers Free 10 ms limit [S, V]; adapter churn | Error 1102, rework | D-first; spike with CPU gates; Setup 1b fallback; pinned versions; Linux CI builds |
| Neon Free: compute is SUSPENDED at 100 CU-hours until the next period [V]; 6 h restore | dynamic features down for days | public traffic must not wake the DB (read-model snapshots/cache), cron <=2/hour, usage alert at 70%, upgrade to Neon Launch (about USD 3-4), nightly dump |
| Workers Free 100,000 requests/day (Error 1027) [V] and bot traffic | site errors | assets free and unlimited [V], Turnstile, Cloudflare bot tools, edge caching |
| Free-tier terms change or commercial-use wording (Neon Free ToS not read [G]) | forced upgrade | read ToS before go-live; cost review at renewal; ports keep providers swappable |
| USD costs vs ARS revenue | margin erosion | free/very cheap setups, FX clause in the renewal quote |
| Mockups are not data; no mobile; 8+ missing screens | rework | Deviation Register, approvals before build, spreadsheet template for real data |
| Content/assets delayed (photos, prices, schedules) | blocked pages | content checklist week 1, flagged placeholders |
| Manual payment errors, double confirmation | wrong seats/ledger | idempotent state machine, atomic claim, audit, reversing entries |
| Overbooking when payment arrives for a full period | refund friction | block + audited override/move (Q13); owner checks availability before sending the alias |
| Capacity display staleness (cache TTL/snapshots) | wrong public counts | snapshot rebuild after each seat change + 60-120 s TTL |
| Renewal token leakage by email forwarding | unauthorized order request | hashed, scoped, expiring, revocable, no PII, owner verifies payment manually |
| Email deliverability (new domain) | missed links | subdomain, SPF/DKIM/DMARC, warm-up, <=80/day throttle, wa.me fallback |
| Provider cap (Resend 100/day) | stuck renewals | outbox throttle; renewal batch spread over 2-3 days; second provider adapter (Brevo/SES) |
| Scheduled dispatch late or skipped; Free cron CPU 10 ms [V] | missed reminders | event-driven dispatch after commit + cron + GitHub Actions secondary + admin "retry sends" button + alert when the oldest pending message exceeds 2 h |
| DB cold start after idle (Neon, a few hundred ms [S]) | slow first visit | cached public pages/snapshots; no keep-warm polling (it burns CU-hours) |
| Domain/accounts ownership | handover disputes | domain in the client's name; written handover for infra accounts |
| Admin account takeover | data breach | passkeys/email OTP (+ TOTP on paid), rate limit, no sign-up, audit |
| Single developer bus factor | continuity | ADRs, AGENTS.md, README, tests as spec |
| Strict TDD overhead vs deadline | slow | TDD focused on domain/application; E2E for flows |
| wa.me limits (no delivery tracking, long text, Argentine mobile number format) | broken hand-off | cap message length, order number fallback, validate with the real number, manual log entries |
| Image/video weight | slow site | pipeline, size caps, poster + click-to-load |
| Dependency churn (Drizzle 1.0 beta, adapters) | upgrade pain | adapters behind ports, pinned versions, Renovate with CI |

### 9.1 Argentine legal items
Cited: Ley 25.326 [V infoleg.gob.ar text]: art. 4 data must be accurate, adequate, relevant, not excessive; art. 5 processing without free, express, informed consent is unlawful; art. 6 prior, clear information to the data subject; art. 9 security measures; art. 12 transfer to countries without adequate protection is prohibited; art. 21 registry for databases providing reports; art. 24 private databases not for exclusively personal use must register; art. 27 right to withdraw/block data used for advertising. Registration runs through AAIP (RNBD, TAD platform) [S]. Reform bills 1751-D-2026 and 3397-D-2026 had no committee opinion as of 2026-09-26 [S], so Ley 25.326 applies today. International transfer: Disposicion 60-E/2016 model contracts, new clauses by Res. 198/2023; the USA is not on Argentina's adequacy list [S, argentina.gob.ar/transferencias-internacionales]. Consumer: Res. 424/2020 "boton de arrepentimiento" (10 calendar days) and Disposicion 954/2025 "boton de baja" [S, argentina.gob.ar].
TO CONFIRM WITH COUNSEL (not stated as fact): legal basis per email class (service vs marketing); whether the client must register as data controller in RNBD; retention periods (financial vs personal data); art. 12 safeguards for processors in the USA (Neon/AWS, Cloudflare, Resend, GitHub) and which clauses to sign; children's data in events (store ages only, no names); applicability of Res. 424/2020 and Disp. 954/2025 to dated workshops and made-to-order materials; Defensa del Consumidor notice; ARCO procedure and export/delete tooling.

---
## 10. Open product questions (prioritized)
Already settled by the owner (do not re-ask): 6 pages only; gallery and FAQ as Nosotros sections; cart for materials only; no Tienda/Diario/student account; monthly materials link to continuing students; period first-class; hosting must be free or very cheap, Vercel Pro excluded (rev 2).
Priority legend: P0 = needed before sdd-propose / platform-foundation; P1 = needed before the change it blocks starts; P2 = needed before launch. Rev 2 edits: Q1, Q4, Q24.

### P0
| # | Question | Blocks | Suggested default |
|---|---|---|---|
| Q1 | Is USD 0/month a hard requirement, or is up to about USD 5/month acceptable? Does TR_WebStudio already have a Cloudflare account? Who owns infra accounts in year 1? | platform-foundation (ADR-002) | Target USD 0 (Setup 0, D on Workers Free + Neon Free); accept up to USD 5/month (Setup 1) if the spike fails or for DB durability (Neon Launch about USD 3-4); infra accounts in the studio's name in year 1 with a written handover at renewal |
| Q2 | Domain name, .com.ar vs .com, registrant, DNS provider | platform-foundation DNS, notifications-email-core, launch-readiness | .com.ar registered by the client (ARS 8,500/yr [V]), DNS on Cloudflare, mail from a subdomain |
| Q3 | Docker Desktop (WSL2) available for Testcontainers? Authorization to create the private GitHub repo? | platform-foundation | Yes / yes (needs explicit go-ahead) |
| Q4 | Approve D-first (React Router 7 on Cloudflare Workers; Next.js 16 as alternative at Setup 1b) and the 16-change order | sdd-propose | Approve |

### P1
| # | Question | Blocks | Suggested default |
|---|---|---|---|
| Q5 | Brand assets: vector logo/lockup, fonts, palette, photos/videos, tagline, header CTA label, nav label "Quienes somos" vs "Nosotros" and slug | design-system-foundation, public-content-and-seo | Cormorant Garamond + Montserrat, monogram tile + spaced caps, CTA "Ver actividades", label "Quienes somos", slug /quienes-somos |
| Q6 | Approve 3 mobile frames before build? Admin usable on phone for inbox/mark paid/attendance? | design-system-foundation | Yes / yes |
| Q7 | Voseo everywhere incl. admin; ARS "$ 45.000"; "10:00 a 12:00 h"; ART | design-system-foundation | Yes |
| Q8 | Real data: fees, schedules, class length, capacities, teachers (own/third-party, %), materials, variants, prices, suppliers, studio address (Instagram: Arguello; mockup: Nueva Cordoba) and hours (mockup: Tue-Sat though classes on Monday) | catalog-and-teachers, materials-catalog, public-content-and-seo | Owners fill a spreadsheet template we provide; seeds derive from it |
| Q9 | Turnos: one schedule per workshop (several turnos = separate workshop records)? | catalog-and-teachers | Yes |
| Q10 | Period rules: mid-month joins, proration, 5-week months, classes covered by the fee, who opens periods | catalog-and-teachers, monthly-renewals | Full fee, no proration, N classes configured per period (usually 4), owner opens each period |
| Q11 | Renewal mechanics: trigger, timing, link lifetime, reminders, seat hold, non-renewal | monthly-renewals | Owner presses "Enviar enlaces" 7 days before period start (optional schedule); link valid until enrollment deadline = period start + 3 days (max 30); reminders T-3/T-1; no seat hold; public opens 3 days after the links; non-renewal = expire, keep in file as "No renovo", inactive after 30 days without attendance |
| Q12 | Renewal channel: email automatic + wa.me manual fallback; email required at enrollment | monthly-renewals, monthly-enrollment-flow | Yes / yes |
| Q13 | Payment arrives but the period is full | enrollment-confirmation | Block with audited override or move to another period; refunds manual |
| Q14 | Materials: at least one line mandatory; "I already have my materials" path; several projects per period and multiple selections | materials-catalog, monthly-enrollment-flow | Mandatory; only admin manual override; multiple allowed |
| Q15 | Add Cancelado/Vencido states; auto-expire unpaid requests | enrollment-confirmation | Yes; expire after 7 days, notify owners, no seat impact |
| Q16 | Weekend workshops: fixed deposit amount; 72 h cancellation + quorum parameters; refund text; registration form fields | weekend-workshop-registrations | Fixed amount per workshop; parameters stored per workshop; form = contact + policy acceptance |
| Q17 | Make-up classes model; rename the "Recuperaciones" alert | students-and-attendance | One credit per absence valid 30 days, booked via WhatsApp, marked by the owner; alert renamed "Alumnas inactivas" |
| Q18 | Teacher settlement base and modality | metrics-dashboard, catalog-and-teachers | % per activity, base = fees + deposits of the period (materials excluded), snapshot at period close |
| Q19 | KPI formulas | metrics-dashboard | occupancy = confirmed/capacity (capacity-weighted); conversion = paid/requests per period; add renewal rate; drop "Contactos/Entrevistas" |
| Q20 | Approve email catalog E1-E13; class reminders; sender; owners mailbox; consent wording | notifications-email-core, reminders-and-communications | Catalog as proposed, E8 OFF in v1, preference link in service reminders |
| Q21 | Testimonials on Inicio | public-content-and-seo | Optional section, hidden until real consented items exist |
| Q22 | Video hosting | public-content-and-seo | YouTube-nocookie click-to-load + MP4 <=50 MB on R2; no Stream |
| Q23 | Contacto: standalone page; contact form? | public-content-and-seo | Page with address, hours, links, wa.me, static map; no form in v1 |
| Q24 | Admin users, roles and second factor | admin-identity | 2 admins + 1 technical owner; passkeys or email OTP on Workers Free (no password hashing in the Worker); password + TOTP only on a paid plan |
| Q25 | Analytics | public-content-and-seo | Cloudflare Web Analytics; GA4 only if the client already uses it |
| Q29 | Full workshop or period: what does the public see? Waitlist? | catalog-and-teachers, monthly-enrollment-flow | "Completo" badge + wa.me "Consultar lista de espera"; no system waitlist in v1 |
| Q30 | Student identity matching without accounts (phone vs email; shared phones) | enrollment-confirmation, monthly-renewals | Match on normalized phone OR email; ambiguous matches go to a manual "possible duplicate" queue; never auto-merge |

### P2
| # | Question | Blocks | Suggested default |
|---|---|---|---|
| Q26 | Legal: privacy policy, terms, ARCO channel, RNBD registration, art. 12 safeguards, arrepentimiento/baja button | launch-readiness | Studio drafts, the client's lawyer validates; launch blocker |
| Q27 | Import existing students (spreadsheets/WhatsApp) | launch-readiness | CSV import with dedup and owner consent review, or start empty |
| Q28 | Mockups illustrative for data, contractual for look and feel? | design-system-foundation | Yes |
Total: 30 questions (4 P0, 23 P1, 3 P2). Numbering keeps Q1-Q28 as referenced in part 1; Q29 and Q30 were added in this part.

---
## 11. Errata and refinements to part 1 (#199)
- R1 (section 0): "about 51-55% of the fee in year 1" referred to setup S1 (Vercel Pro 20 + Neon 3-5 + domain), not Vercel Pro alone (USD 240/yr = about 43% of USD 556). S1 is now struck (section 12).
- R2 (2.2 and 3.4): the Workers size-limit conflict is RESOLVED: Cloudflare removed the compressed 3 MB (Free) / 10 MB (Paid) checks on 2026-09-04; only the 64 MiB uncompressed size is checked on all plans [V developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/]; the OpenNext page is stale. Cloudflare's docs recommend vinext 1.0 for new Next.js apps on Workers, OpenNext for existing apps [V]; the Next.js blog of 2026-03-25 expected verified Cloudflare/Netlify/AWS adapters "later this year" [V]. Next 16 `proxy.ts` is Node-only and OpenNext does not support Node middleware [V], so option A would avoid `proxy.ts` on Workers.
- R3 (PostgreSQL major version): part 1 mentions Postgres 17 for docker-compose/Testcontainers; treat it as "same major as the Neon project" [A] and confirm in the spike (Neon's supported majors not verified [G]).
- R4 (S4 self-managed): the Hetzner price is from a secondary source that also reports some shared-vCPU plans as "not available" on 2026-09-04 [S]; indicative only (now Setup 3 in 12.4).
- R5 (evidence tags to downgrade from [V] to [S] in part 1; they were read from search results, not fetched pages): Payload acquired by Figma (2.2); Astro acquired by Cloudflare (2.2); Vitest 4 stable with Browser Mode (2.2); Cloudflare Web Analytics free and cookie-free (3.1); Resend Idempotency-Key 24 h (3.1); Resend DNS record types (3.6); Neon resume "a few hundred ms" (3.1).
- R6 (wa.me): format `https://wa.me/<number>?text=<urlencoded>` with an international number without plus or leading zeros [S]; the official WhatsApp FAQ fetch failed. Argentine mobile numbers typically need the 549 prefix [A]; verify with the owner's real number in monthly-enrollment-flow.
- R7 (precedence): section 12 supersedes part 1 sections 0 (cost paragraph), 2.5, 3.3, 3.4, 3.8 where they conflict.

---
## 12. Hosting under the owner's free/very-cheap constraint (rev 2)

### 12.1 What changes
Ruled out: Vercel Pro (USD 20/seat; owner constraint), Vercel Hobby (non-commercial [V]), Supabase Pro (USD 25 [V]), Netlify Free (hard pause of ALL sites when 300 credits run out [V]), Supabase Free (pauses after 1 week idle, no backups [V]). Part 1 setups S1 (Vercel Pro) and S5 (Supabase Pro) are struck; S2 (Workers Paid + Neon Launch, about USD 8-10) exceeds the cap and becomes an upgrade tier. Unchanged: modules, data model, flows, email catalog, roadmap order. Changed: delivery-layer framework, admin-auth adapter, public cache/read-model adapter, scheduler batch sizes.

### 12.2 Free-tier limits that decide fit (checked 2026-10-05)
| Limit | Value | Effect on this app |
|---|---|---|
| Workers Free requests [V developers.cloudflare.com/workers/platform/limits/] | 100,000/day; beyond it Error 1027 (fail open or closed); static asset requests free and unlimited [V .../workers/static-assets/billing-and-limitations/] | ample for a local-business site; serve assets from the assets binding |
| Workers CPU per HTTP request [V] | 10 ms Free vs 30 s default (max 5 min) Paid; I/O wait does not count [S] | THE binding limit |
| Cron Trigger CPU and count [V] | 10 ms Free vs 30 s (<1 h interval) / 15 min Paid; 5 triggers Free, 250 Paid | dispatch batches <=5 emails, plain-string templates, no JSX email rendering |
| Worker size [V changelog 2026-09-04] | 64 MiB uncompressed on all plans; compressed checks removed | no longer binding |
| Startup [V] | global scope must run within 1 s | lazy-load admin routes |
| Subrequests [V] | 50 per request on Free; R2/KV/D1 calls count; Hyperdrive accounting [G] | <=10 queries per page |
| Hyperdrive Free [V .../hyperdrive/platform/pricing/] | 100,000 queries/day | fine with cached public pages |
| Neon Free [V neon.com/pricing, /docs/introduction/plans, /docs/introduction/usage-metrics] | 1 GB per project; 100 CU-hours/month (= 400 h at 0.25 CU); up to 2 CU; scale-to-zero after 5 min, cannot be disabled; 6 h restore; at 100 CU-hours compute is SUSPENDED until the next period; resume a few hundred ms [S] | data fits for years; the cap equals about 13 h/day awake, so public traffic must not wake the DB; nightly dump mandatory |
| R2 Free [V .../r2/pricing/] | 10 GB-month; 1M Class A; 10M Class B; egress free | ample |
| Cloudflare Images Free [V .../images/pricing/] | 5,000 unique transformations/month | ample |
| Resend Free [V resend.com/pricing] | 3,000/month; 100/day; 3 domains | about 350-550/month at 60-100 active students fits; the daily cap forces spreading the monthly renewal batch over 2-3 days (throttle 80/day); backups: Brevo Free 300/day [S], SES USD 0.10/1,000 [V] |
| GitHub Actions Free | 2,000 min/month private [S]; schedule >=5 min with hourly delays [V] | nightly dump + secondary scheduler |
| Domain [V nic.ar] | .com.ar ARS 8,500/yr = about USD 5.6 | the only unavoidable cash cost |

### 12.3 Does A or D fit inside Setup 0?
- A (Next.js 16): NO for dynamic SSR. Full Next.js SSR through OpenNext is reported at p50 about 17-21 ms CPU per page view against the 10 ms Free limit, ending in Error 1102 [S, community reports]; the workarounds (prerender everything, static assets, client-side data, SPA-style admin) fight Next's model. vinext 1.0 claims Free-plan support [V claim] but its CPU cost is unmeasured [G]. A fits from Setup 1b upward.
- D (React Router 7 framework mode): PLAUSIBLE, unproven [G]. Official Cloudflare template and GA support [S]; no Next server layer, smaller runtime. It fits only with discipline: cached public HTML or R2 snapshots, <=20-row admin tables (or client-rendered tables), lazy admin routes, passwordless admin login (password hashing exceeds 10 ms [S]), plain-string email templates.

### 12.4 Re-ranked setups (USD; fee reference USD 556)
| Rank | Setup | Stack | Monthly | Year 1 incl. domain | % of fee | Fits | Main risks |
|---|---|---|---|---|---|---|---|
| 0 | Setup 0 | Workers Free + Neon Free + R2 + Resend Free + GitHub Actions + Cloudflare DNS/Turnstile/Web Analytics | 0 | about 5.6 | 1% | D only (spike-gated); A no | Error 1102 on heavy pages; Neon suspension at 100 CU-hours; 6 h restore; no SLA |
| 1a | Setup 1a | Setup 0 with Neon Launch (usage-based, no CU cap, 7-day restore, scale-to-zero optional) | about 3-4 [A] | about 40-55 | 7-10% | D only | the 10 ms CPU limit remains |
| 1b | Setup 1b | Workers Paid + Neon Free + R2 + Resend Free | 5 | about 66 | 12% | A and D | Neon Free cap/restore remain; adapter churn for A |
| 2 | Setup 2 (above cap) | Workers Paid + Neon Launch | about 8-10 | about 102-126 | 18-23% | A and D | cost |
| 3 | Setup 3 (above cap) | Node container on a VPS (Hetzner CX23 EUR 5.49 [S] + IPv4) | about 7 [S, A] | about 90 | 16% | A and D | ops burden; only if Workers fail |
Neon Launch estimate [A]: 100-150 active hours at 0.25 CU x USD 0.106 plus about 0.5 GB x USD 0.35 = about USD 2.8-4.2.

### 12.5 Framework ranking under the constraint
A is re-based: cost 4 (its best host is Workers Paid USD 5 now that Vercel is gone) and ops 3 (adapter churn per release [S]); D unchanged.
| Weight set | A | D | Leader |
|---|---|---|---|
| Base 15/8/14/12/10/10/14/7/10 | 4.22 | 4.30 | D (0.08) |
| Speed + familiarity 12/6/22/10/8/8/12/14/8 | 4.26 | 4.06 | A |
| Cost + ops 12/6/10/25/15/8/10/6/8 | 4.11 | 4.39 | D |
| Architecture + integrity 10/5/10/8/8/18/22/5/14 | 4.25 | 4.43 | D |
| Owner constraint 12/6/10/30/12/8/10/6/6 | 4.14 | 4.44 | D (0.30) |
Weight order: fidelity, SEO, speed, cost, ops, integrity, testability, familiarity, longevity. B and C stay behind under every weighting (B's safe tier needs Supabase Pro USD 25 [V]; C's CPU profile on Workers Free is unmeasured [G]).
Verdict: the constraint favors D. A remains the alternative if the owner accepts Setup 1b and values Next.js familiarity over adapter risk. What D costs: a new API surface (loaders/actions, file routes), fewer batteries than Next (no next/image, next/font, metadata API, ISR: replaced by Cloudflare Images URLs, self-hosted fonts, `meta` and resource routes for sitemap/robots, Cache API), and less AI-agent corpus.

### 12.6 The spike still decides (now 1 to 1.5 days)
Purpose: prove Setup 0 for D, or move to Setup 1. Kill criteria on a real Workers Free account:
1. D skeleton builds in Linux CI and deploys with the Cloudflare tooling; local dev works on Windows or WSL.
2. CPU p99 <= 8 ms (Workers observability) for 4 routes: home with 6 cards, taller detail, materials cart page, admin orders list of 20 rows; cache-hit path <= 2 ms.
3. DB: interactive transaction and the conditional seat-claim UPDATE through Hyperdrive or the Neon serverless driver against Neon Free; cold-start TTFB after 10 minutes idle measured.
4. Passwordless admin sign-in (email OTP and/or passkey) within the CPU budget.
5. A Cron Trigger runs DispatchDueNotifications with 5 messages in test mode <= 8 ms CPU; GitHub Actions as secondary scheduler.
6. R2 presigned upload + Images transformation; public read-model snapshot read path.
7. Nightly pg_dump to R2 from GitHub Actions and one restore test.
8. Neon awake-hours projection from the measured traffic pattern <= 60 CU-hours/month.
Outcomes: all pass -> Setup 0 (go live on 0, or 1a for DB durability). Fail on 2, 4 or 5 -> Setup 1b (USD 5) keeping D; spike A on Workers Paid for +0.5 day only if the owner prefers Next.js. Fail on 3 or 8 -> Setup 1a. Fail on 1 -> Setup 3 (above cap) or A on Setup 1b.

### 12.7 Effects on the roadmap (no scope or order change)
(a) change 1: framework skeleton per Q4 and spike; (b) change 3: passwordless-first admin on Free, password + TOTP only on paid; (c) change 6: batches <=5 per invocation on Free, plain-string templates, event-driven dispatch (waitUntil after commit) + cron every 30 minutes between 08:00 and 22:00 ART + GitHub Actions secondary; (d) changes 4/7: public pages cached through the Cache API (TTL 60-120 s) and, on Setup 0, R2 JSON read-model snapshots rebuilt after each public-data change (+100-150 lines) so public traffic never wakes Neon; (e) change 16: Neon CU-hour monitor (alert at 70%), nightly dump, restore drill. Concept mapping for the delivery layer: Server Action -> RR7 action; Route Handler -> resource route; revalidateTag -> Cache API TTL + snapshot rebuild; `requireAdmin()` stays inside every loader/action and the data-access layer.

### 12.8 Open items [G]
Neon Free ToS on commercial use (not read); Hyperdrive subrequest accounting; Cache API purge scope (per data center) and purge-by-tag availability on Free; Cloudflare Access (Zero Trust Free) as optional admin gate; other free VPS tiers (not evaluated); vinext CPU on Free; Better Auth email-OTP and passkey plugins on Workers; RR7 + Cloudflare Vite plugin on Windows.

---
## Appendix: source log
All [V] items were fetched on 2026-10-05; part 1 table 3.1 carries the inline URLs for the pricing facts. Additional primary pages read for part 2 and rev 2: https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/ ; https://developers.cloudflare.com/workers/platform/limits/ (cron CPU, startup, subrequests, Error 1027) ; https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ ; https://neon.com/docs/introduction/usage-metrics ; https://nodejs.org/en/about/previous-releases ; https://nextjs.org/docs/app/guides/data-security ; https://nextjs.org/docs/app/api-reference/file-conventions/proxy ; https://nextjs.org/docs/app/guides/testing/vitest ; https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/norma.htm ; https://developers.google.com/search/docs/appearance/structured-data/faqpage ; https://nic.ar/es/dominios/dominios_y_aranceles.
Search-only [S]: Next.js SSR CPU on Workers Free (community reports); React Router 7 on Workers (template, GA, discussions); Better Auth issue 8860; Neon cold start; Brevo free 300/day; Hetzner pricing; FX rates (BNA retail 1,495/1,545, wholesale 1,516 on 2026-10-05); Payload/Figma; Astro/Cloudflare; Drizzle versions; Vitest 4; Resend DNS and idempotency; Cloudflare Web Analytics/Turnstile; GitHub Actions minutes; AAIP/RNBD; Disposicion 60-E/2016, Res. 198/2023; Res. 424/2020, Disp. 954/2025; reform bills; wa.me format.
Unreadable or not read: Brevo pricing page (empty), WhatsApp click-to-chat FAQ (truncated), Resend add-a-domain page, OpenNext issue 1300 and releases (session limit), SES sandbox rules, NIC.ar registrant requirements, Neon Free ToS. Nothing here is invented as fact: assumptions are tagged [A] and gaps [G].
