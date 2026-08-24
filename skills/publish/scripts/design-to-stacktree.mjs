#!/usr/bin/env node
// design-to-stacktree — turn a Claude Design canvas into one static page.
//
// Claude Code's /design command leaves a working directory behind: one
// self-contained <Name>.dc.html per artboard plus a canvas.json holding the
// layout, the titles and the sticky notes. That directory is the design AND
// the argument for it, which is exactly what an agency presents to a client —
// but the artboards are not directly publishable. They load a ./support.js
// that has no on-disk existence (the canvas payload resolves it internally),
// so opened raw they render with literal {{ }} holes and one row per loop.
//
// This renders them: runs each artboard's renderVals(), expands the loops and
// the interpolation, scopes the styles so several artboards can share a page,
// and emits ONE static HTML document — directions in order, each under its
// title with its canvas note as the rationale beside it.
//
// The result is an ordinary HTML file. Publish it with publish_html (file it
// under a client space and it lands on the agency's own address), or open it.
//
//   node design-to-stacktree.mjs <canvas-dir> [--out review.html]
//                                [--title "…"] [--for "Client name"]
//
// Deliberately dependency-free and deliberately not a Claude skill: any agent
// that can run node can use it, and it works with no agent at all.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dir = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true);

if (!dir) {
  console.error('usage: design-to-stacktree.mjs <canvas-dir> [--out file.html] [--title "…"] [--for "Client"]');
  process.exit(1);
}
if (!fs.existsSync(dir)) {
  console.error(`design-to-stacktree: ${dir} does not exist`);
  process.exit(1);
}

// ── read the canvas ────────────────────────────────────────────────────────
const boards = fs.readdirSync(dir).filter((f) => f.endsWith('.dc.html'));
if (!boards.length) {
  console.error(`design-to-stacktree: no .dc.html artboards in ${dir}`);
  process.exit(1);
}

let canvas = { artboards: [], annotations: [] };
const canvasPath = path.join(dir, 'canvas.json');
if (fs.existsSync(canvasPath)) {
  try {
    canvas = JSON.parse(fs.readFileSync(canvasPath, 'utf8'));
  } catch {
    console.error('design-to-stacktree: warning — canvas.json does not parse; falling back to filename order');
  }
}

// canvas.json order is the order the designer laid them out. Anything it does
// not list still ships, appended, so a new artboard is never silently dropped.
const listed = (canvas.artboards ?? []).map((a) => a.file).filter((f) => boards.includes(f));
const ordered = [...listed, ...boards.filter((f) => !listed.includes(f))];

const titleOf = (file) =>
  (canvas.artboards ?? []).find((a) => a.file === file)?.title ??
  file.replace(/\.dc\.html$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');

// Notes sit near an artboard on the canvas rather than belonging to it, so
// match by x position — that is the relationship the designer expressed.
const noteFor = (file) => {
  const board = (canvas.artboards ?? []).find((a) => a.file === file);
  if (!board || typeof board.x !== 'number') return null;
  const near = (canvas.annotations ?? [])
    .filter((n) => typeof n.x === 'number' && Math.abs(n.x - board.x) < 240)
    .sort((a, b) => Math.abs(a.x - board.x) - Math.abs(b.x - board.x));
  return near[0]?.text ?? null;
};

// ── the .dc.html template language ─────────────────────────────────────────
const between = (src, open, close) => {
  const i = src.indexOf(open);
  if (i < 0) return null;
  const start = i + open.length;
  const j = src.indexOf(close, start);
  return j < 0 ? null : src.slice(start, j);
};

// Resolve {{ a.b.c }} against a scope chain, innermost first.
const lookup = (expr, scopes) => {
  const parts = expr.trim().split('.');
  for (let i = scopes.length - 1; i >= 0; i--) {
    let v = scopes[i];
    let ok = true;
    for (const p of parts) {
      if (v != null && typeof v === 'object' && p in v) v = v[p];
      else { ok = false; break; }
    }
    if (ok) return v;
  }
  return undefined;
};

const interpolate = (src, scopes) =>
  src.replace(/\{\{([^}]+)\}\}/g, (whole, expr) => {
    const v = lookup(expr, scopes);
    return v === undefined || v === null ? '' : String(v);
  });

// Expand <sc-for list="{{items}}" as="x"> … </sc-for>, innermost-aware: we
// scan for the matching close tag so nested loops survive.
const expandLoops = (src, scopes) => {
  const open = src.indexOf('<sc-for');
  if (open < 0) return interpolate(src, scopes);

  const tagEnd = src.indexOf('>', open);
  const tag = src.slice(open, tagEnd + 1);
  const listExpr = /list="\{\{([^}]+)\}\}"/.exec(tag)?.[1];
  const alias = /\sas="([^"]+)"/.exec(tag)?.[1] ?? 'item';

  // Walk forward counting nesting so we close on the right </sc-for>.
  let depth = 1;
  let i = tagEnd + 1;
  while (i < src.length && depth > 0) {
    const nextOpen = src.indexOf('<sc-for', i);
    const nextClose = src.indexOf('</sc-for>', i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) { depth++; i = nextOpen + 7; }
    else { depth--; i = nextClose + 9; }
  }
  const closeAt = i - 9;
  const inner = src.slice(tagEnd + 1, closeAt);

  const list = listExpr ? lookup(listExpr, scopes) : null;
  const items = Array.isArray(list) ? list : [];
  const body = items
    .map((item, index) => expandLoops(inner, [...scopes, { [alias]: item, index }]))
    .join('');

  return (
    expandLoops(src.slice(0, open), scopes) +
    body +
    expandLoops(src.slice(i), scopes)
  );
};

// ── run an artboard's renderVals() ─────────────────────────────────────────
const valuesOf = (src, file) => {
  const script = between(src, '<script data-dc-script', '</script>');
  if (!script) return {};
  const code = script.slice(script.indexOf('>') + 1);

  // data-props carries each prop's editor config; the design renders with the
  // declared defaults, which is the state the designer was looking at.
  const rawProps = /data-props='([^']*)'/.exec(src)?.[1];
  const props = {};
  if (rawProps) {
    try {
      for (const [k, cfg] of Object.entries(JSON.parse(rawProps))) {
        if (cfg && typeof cfg === 'object' && 'default' in cfg) props[k] = cfg.default;
      }
    } catch { /* a malformed data-props just means no defaults */ }
  }

  try {
    const ctx = vm.createContext({ console });
    vm.runInContext(
      `class DCLogic { constructor(p) { this.props = p ?? {}; } }\n${code}\n` +
        `globalThis.__vals = new Component(${JSON.stringify(props)}).renderVals();`,
      ctx,
      { timeout: 2000 },
    );
    return ctx.__vals ?? {};
  } catch (e) {
    console.error(`design-to-stacktree: warning — ${file} renderVals() failed (${e.message}); rendering without data`);
    return {};
  }
};

// ── scope an artboard's CSS so several can share one document ──────────────
// The artboards style bare `body` and element selectors, which would collide.
// Rewriting each selector under the artboard's own class keeps them isolated
// without an iframe, so the page stays one scrollable document.
const scopeCss = (css, scope) =>
  css.replace(/(^|\})([^{}]+)\{/g, (whole, brace, selectors) => {
    if (selectors.trim().startsWith('@')) return whole;
    const scoped = selectors
      .split(',')
      .map((sel) => {
        const s = sel.trim();
        if (!s) return s;
        if (s === 'body' || s === 'html' || s === ':root') return `.${scope}`;
        return `.${scope} ${s}`;
      })
      .join(', ');
    return `${brace}${scoped}{`;
  });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── render every artboard ──────────────────────────────────────────────────
const sections = ordered.map((file, n) => {
  const src = fs.readFileSync(path.join(dir, file), 'utf8');
  const vals = valuesOf(src, file);
  const helmet = between(src, '<helmet>', '</helmet>') ?? '';
  const bodySrc = between(src, '<x-dc>', '</x-dc>') ?? '';
  const scope = `ab-${file.replace(/\.dc\.html$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const css = (helmet.match(/<style>([\s\S]*?)<\/style>/) ?? [, ''])[1];
  const note = noteFor(file);

  return {
    css: scopeCss(css, scope),
    html: `<section class="board" id="board-${n + 1}">
    <header class="board-head">
      <div class="board-index">${String(n + 1).padStart(2, '0')}</div>
      <h2>${esc(titleOf(file))}</h2>
      ${note ? `<div class="board-note">${note.split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join('')}</div>` : ''}
    </header>
    <div class="board-frame"><div class="${scope}">${expandLoops(bodySrc, [vals])}</div></div>
  </section>`,
  };
});

const docTitle = flag('title', 'Design directions');
const forClient = flag('for');
const out = flag('out', path.join(dir, 'design-review.html'));

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(docTitle)}</title>
<style>
  :root{--bg:#0f1214;--panel:#161b1e;--ink:#e9eef0;--mut:#93a3a9;--line:rgba(255,255,255,.09);--accent:#4fb6ce}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
  .page{max-width:1120px;margin:0 auto;padding:0 24px 96px}
  .masthead{padding:56px 0 40px;border-bottom:1px solid var(--line)}
  .masthead .eyebrow{font:500 11.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}
  .masthead h1{margin:12px 0 0;font-size:clamp(28px,4vw,40px);font-weight:600;letter-spacing:-.03em;line-height:1.1;text-wrap:balance}
  .masthead p{margin:12px 0 0;max-width:60ch;color:var(--mut);text-wrap:pretty}
  .board{padding:56px 0;border-bottom:1px solid var(--line)}
  .board-head{display:grid;grid-template-columns:56px 1fr;gap:4px 20px;align-items:baseline;margin-bottom:26px}
  .board-index{font:500 13px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--accent);letter-spacing:.06em}
  .board-head h2{margin:0;font-size:23px;font-weight:600;letter-spacing:-.02em}
  .board-note{grid-column:2;max-width:62ch}
  .board-note p{margin:10px 0 0;color:var(--mut);font-size:15px;line-height:1.6;text-wrap:pretty}
  .board-frame{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--panel)}
  .board-frame > div{overflow-x:auto}
  @media (max-width:640px){.board-head{grid-template-columns:1fr}.board-note{grid-column:1}}
</style>
<style>
${sections.map((s) => s.css).join('\n')}
</style>
</head>
<body>
<div class="page">
  <header class="masthead">
    <div class="eyebrow">${forClient ? `Prepared for ${esc(forClient)}` : 'Design directions'}</div>
    <h1>${esc(docTitle)}</h1>
    <p>${sections.length} direction${sections.length === 1 ? '' : 's'}, each with the reasoning behind it. Everything here is a working page, not a picture of one.</p>
  </header>
${sections.map((s) => s.html).join('\n')}
</div>
</body>
</html>
`;

fs.writeFileSync(out, page);
console.log(`design-to-stacktree: wrote ${out} — ${sections.length} artboard(s): ${ordered.join(', ')}`);
console.log('publish it with publish_html (add client: "<name>" to file it under a client space)');
