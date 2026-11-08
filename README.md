# stacktree-publish

The official [Stacktree](https://stacktr.ee) plugin and skills for Claude Code, Cowork and the Claude apps, plus any other agent that speaks the [Agent Skills](https://code.claude.com/docs/en/skills) format.

When the user asks to "publish this", "share this page", or "drop this on stacktree", the agent publishes the HTML through the Stacktree MCP server and returns the private URL to the conversation.

## Set up with an agent

If you have a coding agent open, hand it this line and it does the rest:
installs, verifies the connection, and learns the tool surface.

```
Fetch and follow the setup instructions at https://stacktr.ee/prompt.md
```

Works in any agent that can fetch a URL. The instructions are plain Markdown;
read them first if you like.

## The library

This repo ships the general publish skill and five job-shaped skills, all under
`skills/`. Each job skill maps 1:1 to a validated Stacktree onboarding template
and encodes the judgment for that job (the right gate, the right lifecycle, the
right URL), not just the API call. The agent picks the job skill that matches
the user's intent and falls back to the general skill for anything else.

| Skill | Path | Job |
|---|---|---|
| `stacktree-publish` | `skills/publish/` | Publish any HTML artifact and get back a private URL. The general path. |
| `stacktree-client-deliverable` | `skills/client-deliverable/` | Hand a report or proposal to a client at a private link. Gates to the recipient, never expires. |
| `stacktree-agent-run-report` | `skills/agent-run-report/` | Publish what your agent just produced, shareable with anyone, refreshable in place. |
| `stacktree-daily-brief` | `skills/daily-brief/` | A dated brief or digest at one stable link, refreshed in place each day (suits a scheduled loop). |
| `stacktree-status-dashboard` | `skills/status-dashboard/` | A live status or health page at a public URL, refreshed in place. The one job that uses a public slug. |
| `stacktree-sideshow-handoff` | `skills/sideshow-to-stacktree/` | Publish a finished Sideshow surface as a standalone private link for someone outside the terminal. |

Every skill works through the Stacktree MCP server's 43 tools, such as
`publish_html`, `update_site`, `set_password`, `set_client_feedback`,
`list_feedback` and `resolve_feedback`. They differ in defaults and judgment:
gating, expiry, public versus unlisted, and whether the page is refreshed in
place.

The plugin is Markdown and configuration only: no scripts run on your machine.
More skills, including the curl-first skill for agents with no MCP server and
the custom domain skill, are at <https://stacktr.ee/skills>.

## Install as a Claude Code plugin

The whole library installs in one step as a plugin, which also adds the
Stacktree MCP server. There is no API key to set: the first time you use it,
run `/mcp`, choose `stacktree` and sign in.

```bash
claude plugin marketplace add stevysmith/stacktree-skill
claude plugin install stacktree@stacktree-skill
```

Skills arrive namespaced, as `/stacktree:stacktree-publish` and so on. To try it
before installing, point Claude Code at a clone:
`claude --plugin-dir ./stacktree-skill`.

Free accounts get 3 pages for life, passcode gates on up to 3 of them, and
expiry up to 7 days. Company-email gates, client spaces, custom domains and
viewer analytics are on the paid tiers.

## Install in Hermes Agent

Stacktree is in Hermes's plugin catalog. `agent-plugin/` holds the same MCP
server and skills in the portable Agent Plugins layout. Install and enable it,
then sign in once (a plugin cannot turn on OAuth, so the last line adds the
server with it on):

```bash
hermes plugins install stacktree
hermes plugins enable stacktree
hermes mcp add stacktree --url https://api.stacktr.ee/mcp --auth oauth
```

For the skill alone:
`hermes skills install well-known:https://stacktr.ee/.well-known/skills/stacktree`.

## Install a single skill

Browse the library and pick what you want at the prompt:

```bash
npx skills@latest add stevysmith/stacktree-skill
```

Or install one skill directly by its name:

```bash
npx skills@latest add stevysmith/stacktree-skill --skill stacktree-publish
```

The chosen skill's `SKILL.md` lands in your agent's skill directory
(`~/.claude/skills/` for Claude Code, `~/.codex/skills/` for Codex, and so on).
The skills publish through the Stacktree MCP server, so add it to the same
agent. In Claude Code:

```bash
claude mcp add --transport http stacktree https://api.stacktr.ee/mcp
```

Other agents take `https://api.stacktr.ee/mcp` as a remote MCP server.

## Credentials and where they go

The plugin reads no credential from your machine. The MCP server in `.mcp.json`
signs in with OAuth in the browser, and the token stays with your agent.

## Privacy posture

- **Unguessable URLs by default.** Every upload gets a 22-character token; not crawlable, not enumerable.
- **`X-Robots-Tag: noai, noimageai`** on every served response.
- **Auto-expire.** Pages with no account vanish in 24 hours; account pages follow the plan's expiry.
- **PII pre-flight scan.** Emails, SSNs, credit cards and common API-key prefixes are flagged before publishing.

Full feature set: <https://stacktr.ee>

## License

MIT
