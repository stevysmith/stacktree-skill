#!/usr/bin/env node
// update-page.mjs — update a Stacktree page the wallet paid for, without paying again.
//
// The wallet that paid the x402 publish is the page's update credential:
// a single-use challenge signed with personal_sign (EIP-191). No transaction,
// no fees, nothing on-chain — the signature only proves you hold the wallet.
//   1. POST {api}/wallet-auth/challenge { wallet }   -> { challenge, message }
//   2. personal_sign the exact `message` text
//   3. PUT {api}/sites/{id} (multipart `file`) with Authorization: Wallet ...
//
// Usage:
//   WALLET_PRIVATE_KEY=0x… node update-page.mjs --site <id-or-token> --file <new.html>
// Options:
//   --api <base>   default https://api.stacktr.ee
//
// Setup once, in this scripts directory: npm install   (pulls `viem`)
import { readFile } from 'node:fs/promises';
import { privateKeyToAccount } from 'viem/accounts';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const site = arg('site');
const file = arg('file');
const api = arg('api', 'https://api.stacktr.ee').replace(/\/+$/, '');
const pk = process.env.WALLET_PRIVATE_KEY;
if (!site || !file || !pk) {
  console.error('usage: WALLET_PRIVATE_KEY=0x… node update-page.mjs --site <id-or-token> --file <new.html> [--api https://api.stacktr.ee]');
  process.exit(2);
}

const account = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`);

const challengeRes = await fetch(`${api}/wallet-auth/challenge`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ wallet: account.address }),
});
const challenge = await challengeRes.json();
if (!challengeRes.ok) {
  // 404 unknown_wallet: this wallet never paid for a page here. 403: blocked.
  console.error(JSON.stringify(challenge, null, 2));
  process.exit(1);
}

// Sign the server's exact `message` text — it embeds the challenge id, and the
// server verifies against that exact string. Never reconstruct it locally.
const sig = await account.signMessage({ message: challenge.message });

const form = new FormData();
form.set('file', new Blob([await readFile(file)], { type: 'text/html' }), 'index.html');
const putRes = await fetch(`${api}/sites/${encodeURIComponent(site)}`, {
  method: 'PUT',
  headers: { authorization: `Wallet challenge=${challenge.challenge},sig=${sig}` },
  body: form,
});
const out = await putRes.json();
console.log(JSON.stringify(out, null, 2));
process.exit(putRes.ok ? 0 : 1);
