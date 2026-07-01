---
name: stacktree-custom-domain
description: Buy a real domain and stand up a private Stacktree site on it, end to end, paying with USDC over x402, no human in the loop. Use when an agent needs to publish to its own branded domain (mybrand.com) rather than a stacktr.ee link and has no domain to point yet. Composes stabledomains.dev (the x402 domain registrar) with Stacktree custom domains.
---

# stacktree-custom-domain

Stand up a Stacktree page on a domain you buy from scratch, fully agentic. The agent registers a real domain over x402, points it at Stacktree, and serves a private page on it, with no account and no human in the loop. This is the publish-on-your-own-domain path when there is no domain to bring.

Two services, one x402 wallet:

- **stabledomains.dev** registers the real domain and sets its DNS, paid in USDC over x402. Registrar-side details: <https://stabledomains.dev/skills.md>.
- **Stacktree** hosts the page and terminates SSL on the custom hostname.

## When to invoke

- The user or agent wants a published page on a real branded domain (mybrand.com), not a `stacktr.ee/p/` link, and does not already own one.
- The agent has an x402-funded wallet (USDC on Base) so the whole flow can run without a human.

Do not use this when the user already owns a domain (just point its CNAME at Stacktree directly, no purchase needed) or only needs a private unlisted link (the plain publish skill is enough).

## What it costs (USDC over x402, on Base)

- The domain, from stabledomains: ~$20 for a .com, more for others (.dev/.app ~$25, .io ~$85, .ai ~$150). Prices carry a daily multiplier, so always check the live price first.
- Stacktree custom-domain unlock: $5 / 30 days, or free on a Pro plan.
- The publish itself: $0.50 at the front-door, or use an existing key.

Budget about $25 and up for a .com end to end. The domain is the largest cost and is non-refundable, so confirm the price with the user before registering unless they have pre-authorized the spend.

## Steps

1. **Publish the page first**, so there is a site to bind to. Use the publish skill, or `POST https://agents.stacktr.ee/api/publish`. Keep the returned site id.
2. **Buy the domain** from stabledomains, following <https://stabledomains.dev/skills.md>:
   - `POST /api/check` with `{ "domain": "mybrand.com" }` (a sub-cent x402 call) to confirm availability and read the live `currentPrice`. Surface the price to the user. If the response has `readyToRegister: true`, this wallet already has a verified registrant profile on file, so skip the next step.
   - One-time setup (skip if `readyToRegister`): `POST /api/profile` with the full registrant record. ICANN requires a real name and postal address, not just an email: `firstName`, `lastName`, `email`, `addressLine1` (plus optional `addressLine2`), `city`, `state`, `postalCode`, `country`. That sends a 6-digit code to the email. Then `POST /api/profile/verify-email` with `{ "code": "482913" }` (the field is `code`, not `otp`). This email and OTP is the one human touch in the flow.
   - `POST /api/register` with `{ "domain": "mybrand.com" }` and pay the x402 challenge. Registration only succeeds once the profile is email-verified. You now own the domain.
3. **Unlock custom domains on Stacktree** if you are not on a Pro plan: `POST https://api.stacktr.ee/unlock?feature=custom_domain` and pay the x402 challenge ($5 / 30 days).
4. **Give Stacktree the hostname.** `POST https://api.stacktr.ee/custom-domains` with `{ "hostname": "mybrand.com", "site_id": "<from step 1>" }` and `Authorization: Bearer <your key>`. The response carries an `instructions` object with the exact CNAME and TXT records to add. Read these from the response, do not guess them.
5. **Set those records on the domain** via stabledomains: `POST /api/domain/dns` with `{ "domain": "mybrand.com", "action": "upsert", "records": [ ... ] }`. Add the two records straight from Stacktree's `instructions` object: a `CNAME` at the returned name pointing to the returned value (Stacktree's fallback origin), and a `TXT` at `_stacktree-verify.mybrand.com` set to the returned `verify_<token>` value. Each record is shaped `{ "type", "name", "value", "ttl": 300 }`.
6. **Verify.** `POST https://api.stacktr.ee/custom-domains/mybrand.com/verify`. Stacktree looks up the TXT over DNS and, on a match, registers the hostname and starts SSL. DNS can take a few minutes to propagate, so if verify fails, wait and retry rather than re-registering anything.
7. **Wait for SSL.** After a successful verify, SSL provisioning starts and takes about a minute. Poll `GET https://api.stacktr.ee/custom-domains` until the hostname shows as verified with SSL active. The page is then live at `https://mybrand.com`, private by default, and you can replace it in place with `update_site`.

## Notes and judgment

- **Confirm the spend.** The domain is the one large, non-refundable cost and it renews yearly. Surface the price and get a go-ahead before `register` unless the user pre-authorized it.
- **The registrant email is the one human touch.** Everything else is autonomous; the ICANN email OTP is not. Use the user's email for the registrant profile.
- **Apex vs subdomain.** A CNAME at the bare apex (mybrand.com) is not always permitted by DNS. stabledomains supports the common cases, but if you hit a wall, register on a subdomain (app.mybrand.com) or use the A or ALIAS option their DNS API exposes.
- **Privacy still applies.** The page keeps Stacktree's private-by-default behavior on the custom domain. Add a password or email gate (`set_password` / `set_email_gate`) if it is a client or internal page.
- **You own the domain, not Stacktree.** It is registered to your registrant profile at stabledomains and can be transferred out. Stacktree only terminates SSL and routes the hostname to your site.
- **Both APIs are young; trust the live docs over this file.** The request shapes here were checked against the current stabledomains and Stacktree APIs, but these are new services that may change. If a call returns a 404 or a validation error, re-read <https://stabledomains.dev/skills.md> and <https://stacktr.ee/docs> for the current shape before retrying, and never re-run `register` to work around an error downstream of it, since the domain is already bought.
