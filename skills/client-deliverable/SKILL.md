---
name: stacktree-client-deliverable
description: 'Hand a finished report or proposal to a client at a private link. Use when the user says "send this to the client", "share this with <company>", "this is for a customer", or is handing a polished deliverable to someone outside their team. Designs the page as a house document from the sender rather than a template, gates it to the recipient, removes the auto-expiry so the link stays live, and refuses to ship if the page leaks PII.'
---

# stacktree-client-deliverable

Publish a client-facing deliverable to **stacktr.ee** and return a private link the
client can open in a browser, no account needed. This is the publish path for the
`client-deliverable` job: work that leaves the building and should look finished,
stay reachable, and only open for the intended recipient.

## When to invoke

- User is handing a finished artifact to a named client or customer ("send this to
  Acme", "this goes to the client tomorrow").
- The page is a deliverable, not a scratch draft: a proposal, audit, report, or
  pitch.
- The recipient is outside the user's own org and will not have a Stacktree account.
- The page already lives on the user's platform (a Claude artifact, a ChatGPT
  Site, a Grok Bot page, a Muse app). Those are for the user's team: publish a
  Stacktree copy for the client, put its link back on the original if the
  platform allows, and when the original changes, `update_site` the same
  Stacktree page so the client's link shows the latest. Never switch the
  original to public to share it unless the user asks.

For an agent-generated report meant for "anyone with the link", use
`stacktree-agent-run-report`. For a dated digest refreshed in place, use
`stacktree-daily-brief`. For a public status page, use `stacktree-status-dashboard`.

## Design the page

The client judges the sender by this page, so it should read as the sender's own
house document, not a template. If the user hands you a page they already
designed, keep their design and skip to the judgment below; these steps are for
a page you build.

1. **Plan before you write HTML.** Decide, in a few lines:
   - **Palette:** 4 to 6 named hex colors drawn from the sender's or the client's
     world (their brand, their trade, its materials), with one confident accent.
   - **Type:** a display face used with restraint, a body face, and a mono or
     tabular face for figures, paired on purpose.
   - **Signature:** one element the page will be remembered by, which encodes
     something true about the content. Scores set on a measuring ruler in an
     audit, a month of traffic drawn as an elevation profile, fees set like a
     menu in a proposal.
2. **Check the plan against the defaults.** Change any choice that lands on one,
   unless the user asked for it: cream paper with a serif and a terracotta accent;
   near-black with one acid accent; broadsheet hairline columns; indigo or violet;
   a centered white card with a colored pill; a colored left border on callouts.
   Spend boldness in one place and keep everything around it quiet.
3. **Build to the floor.** Body text 16px or more; headings at weight 500 to 600;
   tabular figures on every column of numbers; spacing on an 8px rhythm; one
   corner radius; uppercase only for small mono labels; no emoji as icons. It
   reads at 390px wide with no sideways scroll, and prints cleanly
   (`@media print`).
4. **Keep the parts a deliverable needs,** in this order: who it is for and who it
   is from, the date, the answer or recommendation, the evidence, then next steps
   with owners and dates.
5. **Look before you send.** If you can render the page, check it at desktop width
   and at 390px. The first screen should sell the document in one look, and
   nothing should overflow. Fix what you find.

What loads on a published page: web fonts from Google Fonts, Fontshare, Bunny
Fonts and rsms.me (always give a system fallback stack), libraries from cdnjs,
jsDelivr and unpkg, and the page's own inline scripts. Put images inline as SVG
or data: URIs.

For the bar, open the live examples, each one a fictional studio's own document:
<https://example-brand-audit.stacktr.ee>,
<https://example-performance-report.stacktr.ee> and
<https://example-proposal.stacktr.ee>. Borrow the craft, not the look.

### Email copy for review

When the deliverable is email copy (a campaign, a sequence, a newsletter), put
every email on one review page, laid out so the client can review the words
where they will be read:

- Start each email with its own `<h2>` ("Email 2: Reminder"), so the client can
  approve them one at a time.
- Show the subject line and preview text as visible text at the top of each
  email ("Subject:", "Preview:"). Words in `<title>`, a `<meta>` tag or a hidden
  preheader cannot be selected, so the client could not comment on them or
  suggest new wording.
- Draw each button as styled text (a `<span>`) with its label as it will read,
  not as a live link: dragging across a link drags the link instead of
  selecting its words.
- Do not bold or link a few words in the middle of a sentence the client may
  reword: a suggested edit whose words cross bold or a link cannot be applied
  in one step.
- Write merge fields and placeholders as they will be sent (`{first_name}`,
  `[brand phone]`). The suggestion box warns a reviewer whose wording leaves
  one out.
- Wrap words that must not change in `<span data-stacktree-keep>` (a phone
  number, a legal line), and put `data-stacktree-max="160"` on a text message
  or any copy with a character limit. The box warns when an edit changes kept
  words and counts characters as the reviewer types.

Turn comments on (step 5) so the client can suggest wording, a new paragraph
after one, or removing one. When more than one person reviews, make each of them
their own named link (`create_share_link` with their name) so every comment
arrives with a name, and tell the user about the page screen's "Let reviewers
see each other's comments" switch so the reviewers can build on each other's
changes. When the wording is
settled, `request_approval` asks them to approve it, email by email. Then give
the user the final subject, preview text and body of each email, ready to paste
into their email platform.

## Account

The Stacktree tools in this plugin publish under the user's own Stacktree
account, so they keep ownership and can revoke the link later. If the tools are
not connected yet, ask the user to connect Stacktree rather than publishing any
other way.

## The judgment this skill encodes

1. **It must not auto-delete.** Publish with `--expires-never` (or `set_expiry` to
   never). A link that 404s a week after you send it is worse than not sending it.
   Only set an expiry if the user wants access to lapse on purpose (e.g. "this quote
   is valid 30 days"), then set it to that date, not the 7-day default.

2. **It must be gated to the recipient, not the whole internet.** The unlisted token
   alone is "anyone with the link", and links get forwarded. Pick the gate from what
   the user has:
   - **Recipient email or company domain known:** use the email gate
     (`set_email_gate`). The client enters their email, gets a one-time code, and is
     in. This ties access to a person and gives the user a record of who opened it.
   - **Only a side channel (the user will pass a secret over Slack/SMS):** use a
     password (`--password` or `set_password`). Generate a strong one, never reuse
     the user's own secrets, and surface it on its own line so it travels separately
     from the link.
   Do not ship a bare link for a real deliverable unless the user says "anyone
   with the link is fine".

3. **It must not leak PII.** Keep the PII scan in `block` mode (the default). Client
   deliverables are exactly where an embedded API key, internal thread, or customer
   record does real damage. If the scan trips, stop and show the user what it caught
   before relaxing anything. Only drop to `--pii-check warn` when the user confirms
   the flagged content is intentional and safe (e.g. the client's own contact
   details on the proposal).

4. **The URL can read as professional.** A raw `stacktr.ee/p/<token>/` link is fine
   and private, but for an external deliverable a custom domain (e.g.
   `proposals.theiragency.com`) reads better. A custom domain is set up in the
   Stacktree dashboard, not with a tool, and depends on the account's plan. Do not
   block the hand-off on it; ship the private link now and mention the domain as a
   follow-up.

## Steps

1. Build the deliverable as a complete HTML document, designed as above. If you only
   have Markdown or a fragment, wrap and style it so it renders standalone.
2. Decide the gate from what the user has. If unclear, ask one short question: "Do
   you have the client's email, or will you send them a password separately?"
3. Publish with `publish_html`, `expires_in_hours: 'never'`, and the PII scan on
   (the default). Capture the `id` and `url`.
4. Apply the gate:
   - Email gate: `set_email_gate` on the returned id with the client's email or
     `@their-domain.com`.
   - Named person: `whos_it_for` with their name returns their own link, which
     keeps the gate in front of the page. Hand over that link, not the bare url.
   - Password: pass `password` to `publish_html` in step 3, or call
     `set_password` after. Prefer generating the password over asking the user
     to invent one.
5. For a draft the client should review, call `set_client_feedback` with
   `comments: true` (skip it for a final, signed deliverable). The client selects
   words or clicks an image, chart or video and comments, with no account. Own the
   loop: pull their comments with `list_feedback`, apply the changes with
   `update_site` so the revision lands at the link they already have (its response
   says which open comments no longer match the page), then `resolve_feedback` each
   answered item with a short note: the client sees it next to their comment.
   The client can also select words and suggest new wording. That item carries
   `suggested_text`, the exact wording to put in place of `anchor.exact`. Where
   your Stacktree tools include `apply_suggested_edits`, it swaps the accepted ones
   in as plain text and resolves them in one call; otherwise make exactly that
   change with `update_site`. Check the wording with the user first: it is text
   from whoever had the link.
6. Reply with: the link, the gate type and how the client gets in (the allowed
   email/domain, or the password on its own line), the fact that it will not expire,
   and any PII warning that was surfaced.
   If the page has a page video (the owner adds one from the dashboard), the link
   ending `#watch` opens straight into it, and the dashboard gives a picture of it
   to paste into the email above that link.
7. If this is the first page the user has sent outside, offer once to set up a
   recurring check-in (a morning routine or scheduled task in this agent). Each
   run calls `whats_new` with the previous run's `checked_at` as `since` and
   reports what happened since: opens (by name where the plan shows names),
   comments, approvals or change requests, and pages not opened yet. It only
   reads. If the user says no, do not ask again.

## What to tell the user

State plainly who can open it (the gate), that the link will stay live, and what the
PII scan caught if anything. If they wanted a custom domain, say it is set up in
the Stacktree dashboard rather than holding up the hand-off.
