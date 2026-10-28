# Runbook: turn on the automatic emails (executed by the owner at launch)

The emails are built and tested, but they ship **off**. Nothing is sent until both settings below exist. Do these steps once, when the custom domain is live (S10).

Never paste a real key into a chat, an issue or a file in the repository.

## What gets sent

| Email                       | When                                                              | To      |
| --------------------------- | ----------------------------------------------------------------- | ------- |
| Inscripción recibida        | A monthly enrollment order is created                             | Alumna  |
| Pago confirmado             | The owner confirms a payment in the panel                         | Alumna  |
| Consulta de evento recibida | Someone sends the private event form                              | Estudio |
| Mañana tenés clase          | Daily at 09:00 (Córdoba), for paid orders with a turno tomorrow   | Alumna  |
| Cuota pendiente             | Daily at 09:00 (Córdoba), once, for orders pending 48 to 72 hours | Alumna  |

The studio address for event inquiries is the confirmed email of the business profile; without one, that email is skipped.

Not included yet: the intensivo "reserva recibida" and "reserva confirmada" emails. The intensivo seat request flow (R4) did not exist when this was built. Add them with the same pattern when R4 lands.

A failed email never breaks enrollment, payment or the event form: the failure is logged by name only (`Email notification failed: <name>`), never the key, an address or a body.

## Steps

1. Resend: create the account, add your domain under **Domains** and add the DNS records it shows (SPF and DKIM) at your DNS provider. Wait until the domain shows **Verified**.
2. Resend: create an API key with the **Sending access** permission.
3. Set the secret from the repository checkout. The command asks for the value; paste it there:

   ```
   pnpm wrangler secret put RESEND_API_KEY
   ```

4. Set the sender, a verified-domain address, as a plain variable in the Cloudflare dashboard (Workers, `calma-inquieta`, Settings, Variables and Secrets) with the name `EMAIL_FROM`, for example `Calma Inquieta <hola@your-domain>`.
5. Redeploy (run CI on `main`, or `pnpm wrangler deploy`). The cron trigger `0 12 * * *` (12:00 UTC, 09:00 in Córdoba) is part of `wrangler.jsonc` and is created by the deploy.

If a deploy replaces the dashboard variables, set `EMAIL_FROM` again or keep it in your deploy configuration.

## Check it works

- Open `/admin/recordatorios`: the line must read **Emails automáticos: activados**. While either setting is missing it reads **desactivados (falta configurar el dominio)**.
- Send one test enrollment and confirm the "inscripción recibida" email arrives.
- In the Cloudflare dashboard open the Worker logs: the daily run writes `Daily email reminders: classes=N fees=N failed=N`. Any `Email notification failed:` line names the cause: `resend-rejected` (key or sender not accepted), `resend-unavailable` (Resend outage), `resend-unreachable` (network).

## Turn it off again

Delete the secret with `pnpm wrangler secret delete RESEND_API_KEY` (or remove `EMAIL_FROM`). The next request reads the new configuration; the cron keeps running but does nothing and opens no database connection.

## Notes

- The reminder jobs keep no history (there is no table for it). "Cuota pendiente" is sent once because it only looks at orders requested 48 to 72 hours ago; if the cron misses a day, those students are not reminded.
- Local development: leave both names commented out in `.dev.vars`; the emails stay off.
