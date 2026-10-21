# Stacktree for Hermes Agent

Publish what your agent builds to a private link that opens in any browser,
with no account for the viewer, and find out when it was opened.

This folder is the Stacktree plugin in the portable Agent Plugins layout:

- `mcp.json`: the Stacktree MCP server, `https://api.stacktr.ee/mcp`. It signs
  in with OAuth the first time it is used (`hermes mcp login stacktree`), and
  pages land in your Stacktree account.
- `skills/`: when to publish, how to hand a page to a client, and how to keep a
  report, dashboard or daily brief at one link that updates in place.

What the agent can do with it: publish a page and get its link, set a passcode
or limit it to a company's email addresses, update it without changing the
link, see who opened it, and read the comments people left. For an agent that
checks in on a schedule, `whats_new` returns everything that happened on your
pages since its last check.

Links are unguessable and private by default. Privacy policy:
https://stacktr.ee/privacy. Version 1.2.0.
