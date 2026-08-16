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

## How to publish

This skill is installed alongside the **stacktree MCP server** by `npx stacktree-install`. That means you already have stacktree tools available — call them directly, no shell scripts required.

The tools you will use most:

| Tool                 | Purpose                                                  |
| -------------------- | -------------------------------------------------------- |
| `publish_html`       | Upload HTML. Returns `{ url, id, expires_at, ... }`.     |
| `update_site`        | Replace HTML in place — URL stays stable across revisions. |
| `set_password`       | Add or clear a passcode gate. Paid plans only.           |
| `set_email_gate`     | Restrict viewers to a specific email domain. Paid plans only. |
| `set_expiry`         | Set hours-from-now expiry, or `null` for never.          |
| `set_agentation`     | Toggle the on-page Agentation feedback toolbar.          |
| `list_sites`         | List sites owned by this API key.                        |
| `list_client_spaces` | List the client spaces pages are filed under.            |
| `set_client`         | File an existing page under a client, or detach it.      |
| `create_client_space` | Create a client space up front (publishing auto-creates one anyway). |
| `update_client_space` | Rename, archive/unarchive, or gate a whole client space. |
| `delete_client_space` | Delete a space; its pages detach and keep working.      |
| `delete_site`        | Hard delete a site.                                      |

## Steps

1. Make sure the artifact is a complete HTML document (`<!doctype html>...</html>`). If you only have a body fragment or markdown, wrap it in a minimal HTML shell first.
2. Call **`publish_html`** with the HTML content as the `content` argument. Optional arguments worth knowing:
   - `password` — passcode gate, paid plans only
   - `expires_in_hours` — number, or `'never'` (clamped to the plan ceiling)
   - `agentation: true` — enables the on-page feedback toolbar
   - `public_slug` — opt into `{slug}.stacktr.ee/` (otherwise unlisted)
   - `pii_check: 'off' | 'warn' | 'block'` — default `block` from MCP
   - `client` — file the page under a client space (see "Client spaces" below)
3. The tool returns a JSON object including `url` and `expires_at`. Surface the URL inline in your reply, plus when the link expires and any PII warnings.
4. If the user iterates on the same artifact later in the session, call **`update_site`** instead of `publish_html` — pass the previous `id` or `unlisted_token` so the URL stays stable across revisions.

## Examples

User: "Publish this dashboard."
→ Call `publish_html` with the HTML, reply with the returned URL inline.

User: "Update the same one — gate it to @yourco.com."
→ Call `update_site` with the existing slug and new HTML, then `set_email_gate` with the domain.

User: "Make it expire in 24h."
→ Call `set_expiry` with `expires_in_hours: 24`.

## Client spaces

When the user names a client, customer, or project the page is **for** ("publish this for Acme"), pass `client` on `publish_html` — the space is auto-created, no setup call needed. For a client that already exists, reuse the exact spelling from `list_client_spaces` so "Acme Co" and "acme" don't fork into two spaces. To file or detach a page that is already published, call `set_client` (`client: null` detaches). A page without a client is a normal floating page — don't invent a client the user didn't name.

A space can carry its own **address** (`acme.theiragency.com`) and a generated **client portal** — an index of everything delivered, newest first, served at that address's root. Both are set up in the dashboard (DNS is involved). What matters to you: when a space has an address, the publish response includes `client_url` — the page's link on the client's own domain. **Prefer handing `client_url` to the user** over the stacktr.ee link; it's the address their client bookmarks. The portal rebuilds itself on every publish into the space, so filing a page is all it takes to appear there.

Managing the spaces themselves is a separate, rarely needed set: `create_client_space` sets a client up before any work ships, `update_client_space` renames one, archives or unarchives it, and sets the `password` / `allowed_email_domain` gate that covers every page in the space, and `delete_client_space` removes it. When a client is simply finished, archive rather than delete: archiving keeps the pages, the portal and the address serving while freeing the plan slot, and it is reversible. Deleting never deletes pages either — they detach to floating pages on their existing URLs — but the portal and the address stop resolving.

If `update_site` returns **409 `managed_portal`**, the page is that generated portal: it regenerates from its space, so direct edits would be overwritten. Don't retry — tell the user they can "customize" the portal from the space's settings in the dashboard, which stops regeneration and makes it an ordinary editable page.

## Privacy

Every URL is unlisted by default (`stacktr.ee/p/{22-char-token}/`) and not crawlable. Pass `public_slug` only when the user wants a discoverable URL.

If the artifact contains values that look like API keys, emails, SSNs, or credit cards, the response surfaces a PII warning. Pass it through to the user before sharing the link.

## Expiry and plan limits

Expiry defaults are plan-aware: omitted on a paid plan means permanent; on the free plan every page caps at 7 days — `expires_in_hours: 'never'` is clamped down to the ceiling rather than refused. **Read `expires_at` off the response and tell the user when the link dies.** Do not tell them it is permanent just because you asked for permanent.

The free plan allows 3 pages in total. The count is lifetime, so deleting a page does not free the slot. Past the third, `publish_html` returns HTTP 402 with `error: 'plan_lifetime_limit_exceeded'`; `set_password` and `set_email_gate` return `plan_password_not_available` and `plan_viewer_gate_not_available` on a free key. Report the limit plainly and stop. Do not retry, and do not work around it by republishing anonymously.

Reaching for `update_site` on an existing page instead of publishing a new one is also the cheaper move: a replace keeps the URL and does not count as a new publish.

## Making a page look better

When the user asks to improve, polish, redesign, or "make beautiful" a published page, call `get_design_guide` FIRST and follow its workflow exactly. The short version: assess before restyling (a page that already has a deliberate design gets elevated in its own voice or left alone — never flattened to a house look), keep every fact/row/link intact, respect the CSP (no external fonts under strict CSP — use system stacks), then `update_site` in place so the shared link keeps working. Tell the user the direction you chose and that all content survived.

## Fallback (no MCP server)

If for some reason the stacktree MCP server isn't available in this session — you don't see `publish_html` in your tool list — the skill includes a shell-script fallback at `scripts/publish.sh`. It reads `STACKTREE_API_KEY` from the environment and POSTs to the public REST API. Use it only when MCP isn't an option; the MCP path is preferred.

It takes HTML on stdin and accepts `--client` / `--client-path` (file the page under a client space, same as the `client` argument to `publish_html`), `--password`, `--expires-in-hours` / `--expires-never`, `--public-slug`, `--pii-check`, `--burn-after-read`, `--agentation`, and `--update <id>` to replace a page in place.
