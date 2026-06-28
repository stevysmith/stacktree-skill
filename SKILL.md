---
name: stacktree-publish
description: Publish HTML artifacts to stacktr.ee and get back a private URL you can paste into the conversation. Use when the user asks to "publish this", "share this page", "drop this on stacktree", or whenever you have generated an HTML artifact the user will want to view in a browser. The site URL is private-by-default (unlisted token); pass options for password, expiry, public slug, and the on-page Agentation feedback toolbar.
---

# stacktree-publish

Publish an HTML artifact to **stacktr.ee** and return the URL into the conversation.

## When to invoke

- User asks to publish, share, host, or drop an HTML / Markdown artifact you just generated.
- User wants a link to a hosted version of a page they just saw (e.g. a dashboard, mock, table).
- You just produced an HTML artifact and the user will benefit from a browser view.

Do **not** use this for code that isn't a complete static page (e.g. fragments, JSX components without a host page). Wrap the fragment in a minimal HTML shell first.

## Required env

```
STACKTREE_API_KEY=stk_live_...   # generate at https://app.stacktr.ee/api-keys
STACKTREE_API_URL=https://api.stacktr.ee   # optional override
```

If `STACKTREE_API_KEY` isn't set, ask the user to set it before retrying.

### No key, and no human to make one? Pay (x402 or MPP)

A fully autonomous agent with a funded wallet can pay for hosting directly, no
human and no dashboard. Two paths:

**Simplest: pay per publish at the front-door (no key).** POST the HTML to
`https://agents.stacktr.ee/api/publish`, get a `402`, pay $0.50 over x402 (USDC
on Base or Solana) or MPP (USDC.e on Tempo), and the page publishes to a private
link returned in the response. Nothing to provision; gas is covered, the agent
only signs. The wallet that paid is recorded with the page, so a human can later
claim it from the dashboard, or the agent can self-link it with the
`link_wallet` MCP tool.

**Repeat use: provision a persistent key.** `POST https://api.stacktr.ee/provision`
returns a `402`; pay $1 over x402 or MPP and get back a persistent `stk_live_`
key. Set it as `STACKTREE_API_KEY` and continue. Buy upgrades the same way:
`POST /unlock?feature=custom_domain` (or `higher_limits`). See
<https://stacktr.ee/x402> and <https://stacktr.ee/mpp> for the full flow.

Provision a key when the agent will publish repeatedly; for a one-off, the
front-door is simpler. When there is a human, the dashboard key is simplest.

### No wallet, but your human is at the terminal? Show a pay QR

The fastest path when a paid action comes up mid-task (provision, make a
site permanent, custom domain, higher limits):

1. `POST https://api.stacktr.ee/pay/sessions` with `{ "feature": "provision" }`
   (no auth) or `{ "feature": "custom_domain" }` etc. with the API key.
2. The JSON response includes a `qr` field that is a ready-to-print terminal
   QR plus a short `url`. Print both and say what it costs (the `amount`
   field) and why.
3. The human scans with their phone and pays by card (Stripe, ~two taps).
4. Poll the `poll.url` every few seconds; on `provision` the poll returns the
   API key once (set it as `STACKTREE_API_KEY`), on unlocks it confirms the
   feature is active. Continue the task without further prompting.
5. Prefer one scan over many: pass `"amount_minor": 1000` on `provision` (or
   use `{ "feature": "topup", "amount_minor": 1000 }` later). Anything above
   the action's price becomes a prepaid balance, and future paid actions draw
   from it silently — no more QRs until it runs out.

## Privacy-first defaults

Every publish via this skill applies tighter defaults than the raw API:

- **Unlisted URL** (`stacktr.ee/p/<22-char-token>/`) — not enumerable
- **7-day expiry** — the artifact auto-deletes unless you pass `--expires-never`
- **PII scan in block mode** — emails, SSNs, credit cards, API key prefixes (`sk-`, `xoxb-`, `ghp_`, AWS `AKIA`) reject the publish; pass `--pii-check warn` to override
- **Strict CSP** + **`X-Robots-Tag: noai, noimageai`** on every served page

If the user explicitly asks for permanence, longer reach, or relaxed PII, surface the override flags rather than disabling the defaults silently.

## Steps

1. Make sure the artifact is a complete HTML document (`<!doctype html>...</html>`). If you only have a body fragment or markdown, wrap it.
2. Run `scripts/publish.sh` (in this skill's directory) with the artifact piped on stdin. Pass options via flags:
   - `--password <secret>` — basic-auth gate
   - `--expires-in-hours <n>` or `--expires-never`
   - `--burn-after-read`
   - `--agentation` — enables the on-page feedback toolbar
   - `--public-slug <slug>` — opt into `{slug}.stacktr.ee/`
   - `--pii-check off|warn|block` — defaults to `block` via this skill (warn at the API)
3. The script prints a JSON object including `url`. Surface the URL inline in your reply, plus expiry and any PII warnings.

## Examples

Publish a quick artifact:

```bash
echo "$ARTIFACT_HTML" | bash scripts/publish.sh
# → { "url": "https://stacktr.ee/p/AbC.../", "expires_at": 1781234567, ... }
```

Publish with password + 7-day expiry:

```bash
echo "$ARTIFACT_HTML" | bash scripts/publish.sh --password hunter2 --expires-in-hours 168
```

Replace an existing site (preserves the URL):

```bash
echo "$ARTIFACT_HTML" | bash scripts/publish.sh --update <id-or-slug>
```

## Privacy

By default every URL is unlisted (`stacktr.ee/p/{22-char-token}/`) and not crawlable. Anonymous uploads expire in 24h. Authed (API-key) uploads default to never expire. Pass `--public-slug` only when the user wants a discoverable URL.

If the artifact contains values that look like API keys, emails, SSNs, or credit cards, the response includes `X-Stacktree-Pii-Warning`. Surface this to the user before sending the link to anyone.
