---
name: stacktree-sideshow-handoff
description: 'Publish a Sideshow surface (or any locally-viewed agent artifact) to a private Stacktree link when it needs to leave the workbench — a client, a colleague, or your own phone needs to open it without a viewer running. Use when the user says "send this surface to…", "share this outside", "publish this sideshow", or a review artifact is finished and the audience is not at this terminal. Composes sideshow (the local iteration surface) with Stacktree (the standalone delivery link).'
---

# stacktree-sideshow-handoff

Sideshow is where an agent iterates in front of its operator: surfaces render in
a local viewer, the viewer supplies the chrome, comments steer the work. That is
the right shape for iteration and the wrong shape for delivery — the person you
send it to has no viewer, no localhost, and no token. This skill is the handoff:
turn a finished surface into a self-contained page on **stacktr.ee** with a
private URL anyone can open in a plain browser.

## When to invoke

- A sideshow surface (diagram, mockup, explainer, diff walkthrough) is done and
  someone outside this terminal needs it: a client, a teammate, the user's phone.
- The user says "send this to…", "give me a link for this", or "publish the
  surface".

Do not use this when the audience is the operator at this terminal (keep
iterating in sideshow — that is its job), or for a live status page that
refreshes on a loop (use `stacktree-status-dashboard`).

## The judgment this skill encodes

1. **Delivery inverts the token economics.** Sideshow parts are lean because the
   viewer supplies the chrome. A delivered page has no viewer, so the document
   must carry everything: inline the CSS, pin any script (e.g. Mermaid) to a
   versioned CDN URL or pre-render it, and never reference `localhost` or a
   sideshow asset URL. Self-contained is the entire point of the handoff.

2. **Compose parts into one document.** A surface is an ordered list of parts
   (html, markdown, mermaid, diff, terminal, image). Recompose them into a
   single readable page in that order — render markdown to HTML, wrap terminal
   output in `<pre>`, render diffs as pre-highlighted HTML, and either
   pre-render Mermaid to SVG or include the pinned mermaid script with the
   source in a `<pre class="mermaid">` block. Images must be embedded (data:
   URI) or uploaded with the page, never hotlinked from the local server.

3. **Snapshot semantics by default.** A delivered surface is "the work as of
   now". Keep the default 7-day expiry for review handoffs; use
   `--expires-never` only when the user calls it a keeper. If the surface keeps
   iterating after delivery, update the SAME site (`--update <id-or-slug>` or
   `update_site`) so the link you already sent stays current.

4. **Private by default, gate for clients.** The unlisted URL is the credential.
   Add `set_password` or `set_email_gate` when the recipient is an external
   client and the content is sensitive. Never use a public slug for a review
   artifact.

5. **The PII bar rises on delivery.** A local surface can safely show internal
   hostnames and log excerpts; a delivered page cannot. Keep `--pii-check block`
   and treat hits as real before the link leaves the machine.

## Steps

1. Identify which surface (and which parts) the user wants delivered. Fetch the
   content from the running sideshow server if needed (`SIDESHOW_URL`, default
   `http://localhost:8228`) or reconstruct from the conversation.
2. Compose a single self-contained HTML document per the judgment above. Match
   the surface's reading order; a short header naming the work and the date
   helps the recipient.
3. Publish to Stacktree:
   ```bash
   echo "$HTML" | bash scripts/publish.sh          # unlisted, 7-day default
   ```
   or the `publish_html` MCP tool. Capture `id` and `url`. Add gates if the
   recipient warrants them.
4. On later iterations of the same surface, republish in place:
   ```bash
   echo "$HTML_V2" | bash scripts/publish.sh --update <id-or-slug>
   ```
5. Reply with the URL, the expiry, and the note that it opens in any browser
   with no account and no viewer — and that the sideshow session stays local
   and unaffected.

## What to tell the user

The link, when it expires (and how to keep it), that the recipient needs
nothing installed, and that further iteration can either stay in sideshow
(local) or refresh the delivered page in place (same URL) — their choice.
