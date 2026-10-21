# Stacktree for Hermes Agent

Publish what your agent builds to a private link that opens in any browser,
with no account for the viewer, and find out when it was opened.

This folder is the Stacktree plugin in the portable Agent Plugins layout:

- `mcp.json`: the Stacktree MCP server, `https://api.stacktr.ee/mcp`. Pages
  land in your Stacktree account.
- `skills/`: when to publish, how to hand a page to a client, and how to keep a
  report, dashboard or daily brief at one link that updates in place.

## Sign in once

A plugin's `mcp.json` cannot say that a server signs in with OAuth, so after
installing, add the server once with OAuth turned on and approve Stacktree in
the browser that opens:

```bash
hermes mcp add stacktree --url https://api.stacktr.ee/mcp --auth oauth
```

Your config entry replaces the package's entry of the same name. Without it the
server answers unauthorized.

## What it does

The agent can publish a page and get its link, set a passcode
or limit it to a company's email addresses, update it without changing the
link, see who opened it, and read the comments people left. For an agent that
checks in on a schedule, `whats_new` returns everything that happened on your
pages since its last check.

## What it sends where

- Every tool call goes to Stacktree's server at `api.stacktr.ee`. Nothing runs
  on your machine: there is no local code, no shell command and no background
  process.
- The HTML your agent publishes is stored in your Stacktree account and served
  at the link it gets back. Page titles, open counts and comments from that
  account come back into the session when the agent asks for them.
- Hermes keeps the OAuth token from that sign-in; the plugin never reads or
  stores a credential.

Links are unguessable and private by default. Privacy policy:
https://stacktr.ee/privacy. Version 1.2.0.
