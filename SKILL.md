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

## Steps

1. Make sure the artifact is a complete HTML document (`<!doctype html>...</html>`). If you only have a body fragment or markdown, wrap it.
2. Run `scripts/publish.sh` (in this skill's directory) with the artifact piped on stdin. Pass options via flags:
   - `--password <secret>` — basic-auth gate
   - `--expires-in-hours <n>` or `--expires-never`
   - `--burn-after-read`
   - `--agentation` — enables the on-page feedback toolbar
   - `--public-slug <slug>` — opt into `{slug}.stacktr.ee/`
   - `--pii-check off|warn|block` — default `warn`
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
