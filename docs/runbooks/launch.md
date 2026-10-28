# Runbook: launch (executed by the owner)

This is the last step of the contract ("Pruebas, carga inicial, capacitacion y publicación"). Follow it in order. Each step names who does it and how to check it. Other runbooks hold the details: `cloud-provisioning.md` (Cloudflare, Neon, Access, secrets), `enrollment-rate-limit.md`, and `email-notifications.md` when it lands.

## Before you start

- The site runs today on `workers.dev`, and Cloudflare Access protects the whole preview.
- CI derives the public origin from the GitHub secret `STATUS_URL` (`SITE_URL` = `STATUS_URL` without `/status`).
- `SITE_INDEXING` is `off`, so search engines are told not to index the site.

## L1. Buy the domain and add it to Cloudflare (owner)

1. Buy the domain, for example `calmainquieta.com.ar`.
2. In Cloudflare, choose **Add a site**, enter the domain, pick the Free plan, and set the two nameservers Cloudflare shows at the registrar.
3. Check: the zone shows **Active** (this can take a few hours).

## L2. Serve the Worker on the domain (owner)

1. Cloudflare → Workers & Pages → `calma-inquieta` → Settings → Domains & Routes → **Add custom domain**: the bare domain and `www`.
2. In GitHub → Settings → Secrets → Actions, set `STATUS_URL` to `https://<domain>/status`.
3. Run the `deploy` workflow on `main` (or merge any PR).
4. Check: `https://<domain>/status` answers `ok`. Links and the sitemap use the new domain.

## L3. Re-scope Cloudflare Access to the panel only (owner)

1. Zero Trust → Access → Applications: change the application from the whole `workers.dev` host to the path `<domain>/admin*`.
2. Keep the policy with the owners' emails. The app still checks `ADMIN_EMAILS` on every `/admin` request.
3. If you create a new application, update the Worker secret `ACCESS_AUD` with its audience tag (`wrangler secret put ACCESS_AUD`).
4. Check:
   - In a private window, `https://<domain>/` opens with no login.
   - `https://<domain>/admin` asks for the email code and then shows the panel.
   - An email outside the list sees "No tenés acceso al panel".

## L4. Turn on indexing (owner, once the content is final)

1. Set `SITE_INDEXING` to `on`: change the value in `wrangler.jsonc` through a PR, or ask Claude to do it.
2. Check: the `X-Robots-Tag` header is gone from public pages, and `https://<domain>/sitemap.xml` lists the pages.

## L5. Rate limit the public forms (owner)

Follow `enrollment-rate-limit.md` on the new zone. The rule also applies to `/eventos-privados` and `/intensivos/*/reserva`: add those paths to the expression.

## L6. Turn on email (owner)

Follow `email-notifications.md`:

1. Verify the domain in Resend (add its DNS records in Cloudflare).
2. Set `wrangler secret put RESEND_API_KEY`.
3. Set `EMAIL_FROM`.

Until this is done, nothing is sent. The panel shows "Emails automáticos: desactivados".

## L7. Final content (owner, with Claude)

- **WhatsApp number:** marked provisional in `src/modules/site-content/infrastructure/content/business-profile.ts` (`provisional: true`). Confirm the final number.
- **Photos and texts:** replace the stand-in images and the drafted copy marked as pending approval.
- **Policy texts:**
  - review the intensivo conditions (cancellation for lack of minimum seats, refunds, no-shows) in `src/app/intensive-requests/copy.ts`
  - review the enrollment policy
  - add a privacy policy (pending owner text)

## L8. Initial load in the panel (owner)

Load the data in this order, because each step uses the previous one:

1. Profesores
2. Proveedores
3. Materiales
4. Talleres and their turnos
5. Publicar each taller
6. Period of the month: **Abrir inscripciones**, with cupos and the materials of the month
7. Intensivos

## L9. End-to-end smoke test (owner, on a phone)

Check each box after doing it once on the real domain:

- [ ] A taller shows "Inscribirme". The form, materials and summary work, and WhatsApp opens with the order.
- [ ] The order appears in Inscripciones. Confirm the payment: the seat goes down and "Materiales a pedir" shows the order's materials.
- [ ] An intensivo shows "Reservar mi lugar". The request appears in its Reservas. Confirm the deposit: the seat goes down.
- [ ] `/eventos-privados`: send a request. It appears in Eventos privados.
- [ ] Asistencia: mark a class and schedule a make-up.
- [ ] Recordatorios: the message opens in WhatsApp with the text ready.
- [ ] Panel general and Estadísticas show the test data.
- [ ] Alumnas: the student file shows orders, payments, attendance and notes.
- [ ] Emails arrive (only after L6).
- [ ] Delete or cancel the test orders before opening to the public.

## L10. Training (owner)

A short tour of the panel for the owners: open a month, confirm a payment, order materials, take attendance, send reminders. The Panel general lists pending alerts each day.
