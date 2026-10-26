# Runbook: rate limit on public enrollment (executed by the owner)

The public enrollment flow creates real orders without an account. A managed Cloudflare rate-limit rule is the only throttle: the Worker deliberately has no in-memory limiter, because a counter inside one isolate is not shared with the others. Until this rule exists, nothing slows down a script that posts orders.

No automated agent runs this. It changes the Cloudflare dashboard only; no secret and no repository change is involved.

## Precondition: a zone

Cloudflare WAF rules, rate limiting included, attach to a **zone** (a domain on Cloudflare). The staging site runs on a `workers.dev` hostname (ADR 0002), which is not a zone you control, so this rule cannot protect that URL. Do this runbook when the site gets its own domain on the studio's Cloudflare account. Confirm in the dashboard that the domain appears under **Websites** before starting.

If the owner wants protection before a domain exists, that is a code change (a Workers Rate Limiting binding on the order boundary), not part of this runbook. Raise it as its own decision.

## What to protect

Only the two requests that can create an order:

| Request | Path                                      |
| ------- | ----------------------------------------- |
| `POST`  | `/talleres/<slug>/inscripcion`            |
| `POST`  | `/talleres/<slug>/inscripcion/materiales` |

Reads (`GET`) stay unlimited: browsing the form, the materials step and `/pedido/<id>` must keep working for shared school or office networks.

## Steps

1. Cloudflare dashboard, select the domain, **Security**, **WAF**, **Rate limiting rules**, **Create rule**.
2. Name: `enrollment-order-creation`.
3. Expression (use the editor so the Method field is available; see the plan table below):

   ```
   (http.request.method eq "POST" and http.request.uri.path matches "^/talleres/[^/]+/inscripcion(/materiales)?$")
   ```

4. Characteristics: **IP**.
5. Counting period and requests per period: start with **5 requests per 10 seconds** on a Free plan, or **10 requests per minute** where the plan allows a longer period.
6. Action: **Block**, with the longest duration the plan offers.
7. Save and deploy.

## What the plan allows

From the Cloudflare rate limiting availability table:

| Plan     | Rules | Counting period | Block duration | Method and source IP in the expression |
| -------- | ----- | --------------- | -------------- | -------------------------------------- |
| Free     | 1     | 10 s            | 10 s           | No (path only)                         |
| Pro      | 2     | up to 1 min     | up to 1 h      | No (host, URI, path)                   |
| Business | 5     | up to 10 min    | up to 1 day    | Yes                                    |

On Free and Pro the expression cannot test the method, so drop the `http.request.method` clause and match the two paths only. A `GET` to those paths then counts too, which is acceptable at the suggested rates because a person loads each page once.

## Verify

1. From a terminal, send more requests than the limit within the period to a harmless path of the same shape, for example a `POST` to `/talleres/no-existe/inscripcion`, and expect Cloudflare's block response (HTTP `429`) once the limit is passed.
2. Wait for the block duration, then confirm a normal enrollment through the browser works again.
3. In **Security**, **Events**, filter by the rule name and check the blocked requests appear.

## Rollback

Disable or delete the rule in the same dashboard page. Orders keep working without it; only the throttle is lost.

## Tuning

If real students on one shared network hit the limit, raise the requests per period before lengthening the block. Keep the block short: a false positive costs a visitor a retry, while a missed attack costs fake pending orders that the admin must cancel one by one.
