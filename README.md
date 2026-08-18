# stacktree-publish

The official [Stacktree](https://stacktr.ee) skill for Claude Code, Cursor, OpenCode, Codex, and any other agent that speaks the [Anthropic Skills](https://code.claude.com/docs/en/skills) format.

When the user asks to "publish this", "share this page", or "drop this on stacktree", the agent pipes the HTML artifact to `stacktr.ee` and returns the private URL back into the conversation.

## Set up with an agent

If you have a coding agent open, hand it this line and it does the rest —
installs, verifies the connection, and learns the tool surface:

```
Fetch and follow the setup instructions at https://stacktr.ee/prompt.md
```

Works in any agent that can fetch a URL. The instructions are plain Markdown;
read them first if you like.

## The library

This repo ships the general publish skill at the root, plus six job-shaped skills
under `skills/`. Each job skill maps 1:1 to a validated Stacktree onboarding template
and encodes the judgment for that job (the right gate, the right lifecycle, the right
URL), not just the API call. The agent picks the job skill that matches the user's
intent and falls back to the general skill for anything else.

| Skill | Path | Job |
|---|---|---|
| `stacktree-publish` | root `SKILL.md` | Publish any HTML artifact and get back a private URL. The general path. |
| `stacktree-client-deliverable` | `skills/client-deliverable/` | Hand a report or proposal to a client at a private link. Gates to the recipient, never expires. |
| `stacktree-agent-run-report` | `skills/agent-run-report/` | Publish what your agent just produced, shareable with anyone, refreshable in place. |
| `stacktree-daily-brief` | `skills/daily-brief/` | A dated brief or digest at one stable link, refreshed in place each day (suits a scheduled loop). |
| `stacktree-status-dashboard` | `skills/status-dashboard/` | A live status or health page at a public URL, refreshed in place. The one job that uses a public slug. |
| `stacktree-custom-domain` | `skills/custom-domain/` | Buy a real domain over x402 (stabledomains.dev) and serve a Stacktree page on it, end to end. |
| `stacktree-sideshow-handoff` | `skills/sideshow-to-stacktree/` | Publish a finished Sideshow surface as a standalone private link for someone outside the terminal. |

All skills share the same `scripts/publish.sh` helper and the twelve Stacktree MCP
tools (`publish_html`, `update_site`, `get_site`, `set_password`, `set_expiry`,
`set_email_gate`, `set_agentation`, `list_sites`, `delete_site`, `link_wallet`,
`list_feedback`, `resolve_feedback`). They differ in defaults and judgment: gating, expiry,
public versus unlisted, and whether the page is refreshed in place. Each job skill
mirrors the matching onboarding template in `apps/web/src/templates.ts`, so the
published page lands in a shape the user already recognizes.

## Install

Browse the library and pick what you want at the prompt:

```bash
npx skills@latest add stevysmith/stacktree-skill
```

Or install one skill directly by its name:

```bash
npx skills@latest add stevysmith/stacktree-skill --skill stacktree-publish
```

The chosen skill (its `SKILL.md`, plus the shared `scripts/publish.sh`) lands in your agent's skill directory (`~/.claude/skills/` for Claude Code, `~/.codex/skills/` for Codex, etc.).

## Configure

Generate an API key at [app.stacktr.ee/api-keys](https://app.stacktr.ee/api-keys), then export it:

```bash
export STACKTREE_API_KEY=stk_live_...
```

For shell-restart persistence, add the line to `~/.zshrc` or `~/.bashrc`.

### Autonomous agents (no human): pay with x402 or MPP

If there is no human to create a key, an agent with a funded wallet can pay for
hosting itself, two ways. Simplest is the front-door: `POST` the HTML to
`https://agents.stacktr.ee/api/publish`, pay $0.50 over
[x402](https://stacktr.ee/x402) (USDC on Base or Solana) or
[MPP](https://stacktr.ee/mpp) (USDC.e on Tempo), and the page publishes with no
key to provision. For repeat use, `POST https://api.stacktr.ee/provision` mints a
persistent `stk_live_` key for $1 over the same rails; upgrades (custom domain,
higher limits) are bought the same way via `POST /unlock`. The wallet that pays
can later claim its pages from the dashboard or via the `link_wallet` MCP tool.

## What the agent gets

The skill exposes one shell script — `publish.sh` — that the agent invokes when it has an HTML artifact ready to share. Supported flags:

| Flag | Purpose |
|---|---|
| `--password <secret>` | Basic-auth gate |
| `--expires-in-hours <n>` | Set expiry in hours |
| `--expires-never` | Disable expiry |
| `--burn-after-read` | Delete on first view |
| `--agentation` | Inject the on-page feedback toolbar; feedback lands in Stacktree, readable via `list_feedback` |
| `--public-slug <slug>` | Opt into a public `{slug}.stacktr.ee` URL |
| `--update <id-or-slug>` | Replace an existing site in place |
| `--pii-check off\|warn\|block` | PII scanner mode (default: `warn`) |

## Privacy posture

- **Unguessable URLs by default** — every upload gets a 22-char token; not crawlable, not enumerable.
- **`X-Robots-Tag: noai, noimageai`** on every served response.
- **Auto-expire** — anon uploads vanish in 24h; authed uploads default to never expire.
- **PII pre-flight scan** — emails, SSNs, credit cards, common API-key prefixes are flagged before publish.

Full feature set: <https://stacktr.ee>

## License

MIT

## scripts/

`publish.sh` — the no-MCP fallback: HTML on stdin, private URL out.

`design-to-stacktree.mjs` — renders a Claude Design canvas directory (the
`.dc.html` artboards and `canvas.json` that `/design` leaves behind) into one
static page: every direction in canvas order, each under its title with its
canvas note as the rationale. Publish the result; do not publish the seeded
canvas file, which carries megabytes of editor code and can only save on
claude.ai.

```
node scripts/design-to-stacktree.mjs <canvas-dir> --out review.html \
  --title "Client portal directions" --for "Meridian Group"
```
