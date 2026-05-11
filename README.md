# stacktree-publish

The official [Stacktree](https://stacktr.ee) skill for Claude Code, Cursor, OpenCode, Codex, and any other agent that speaks the [Anthropic Skills](https://code.claude.com/docs/en/skills) format.

When the user asks to "publish this", "share this page", or "drop this on stacktree", the agent pipes the HTML artifact to `stacktr.ee` and returns the private URL back into the conversation.

## Install

```bash
npx skills@latest add stevysmith/stacktree-skill
```

This drops `SKILL.md` and `scripts/publish.sh` into your agent's skill directory (`~/.claude/skills/` for Claude Code, `~/.codex/skills/` for Codex, etc.).

## Configure

Generate an API key at [app.stacktr.ee/api-keys](https://app.stacktr.ee/api-keys), then export it:

```bash
export STACKTREE_API_KEY=stk_live_...
```

For shell-restart persistence, add the line to `~/.zshrc` or `~/.bashrc`.

## What the agent gets

The skill exposes one shell script — `publish.sh` — that the agent invokes when it has an HTML artifact ready to share. Supported flags:

| Flag | Purpose |
|---|---|
| `--password <secret>` | Basic-auth gate |
| `--expires-in-hours <n>` | Set expiry in hours |
| `--expires-never` | Disable expiry |
| `--burn-after-read` | Delete on first view |
| `--agentation` | Inject the on-page feedback toolbar |
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
