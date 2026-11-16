'use strict';
// Prüft die PHP-Signalisierung (myground/api.php) gegen den eingebauten PHP-Server.
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 18000 + Math.floor(Math.random() * 2000);
const SRC = path.resolve(__dirname, '..', '..', 'api.php');
let php, dir;
const tok = () => crypto.randomBytes(16).toString('hex');
const pid = t => crypto.createHash('sha256').update(t).digest('hex').slice(0, 12);
const api = async (a, body, method = 'POST') => { const r = await fetch('http://127.0.0.1:' + PORT + '/api.php?a=' + a, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify(body) : undefined }); return { status: r.status, ...(await r.json()) }; };
const sdp = type => ({ sdp: { type, sdp: 'v=0 test' } });

test.before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-api-'));   // eigene Kopie: der Test schreibt keine Raumliste ins Repo
  fs.copyFileSync(SRC, path.join(dir, 'api.php'));
  php = spawn('php', ['-S', '127.0.0.1:' + PORT, '-t', dir], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch('http://127.0.0.1:' + PORT + '/api.php'); return; } catch { await new Promise(r => setTimeout(r, 100)); } }
  throw new Error('PHP-Server startet nicht');
});
test.after(() => { php.kill(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch { } });

test('nur POST, nur bekannte Aktionen, nur gültige Token', async () => {
  assert.strictEqual((await api('list', null, 'GET')).status, 405);
  assert.strictEqual((await api('nix', { tok: tok() })).status, 400);
  assert.strictEqual((await api('list', { tok: 'kurz' })).status, 400);
  assert.strictEqual((await api('poll', { tok: tok(), id: 'ab1' })).status, 400);
});

test('Raum eröffnen, auflisten, Angebot und Antwort zustellen, schließen', async () => {
  const host = tok(), gast = tok(), fremd = tok();
  const room = await api('create', { tok: host, name: '<b>Anke</b> mit sehr langem Namen' });
  assert.match(room.id, /^[A-Z]{4}$/);
  assert.ok(!/[<>]/.test(room.name) && [...room.name].length <= 14);
  await api('poll', { tok: host, id: room.id, n: 7, run: true });
  const ls = (await api('list', { tok: gast })).ls.find(l => l.id === room.id);
  assert.deepStrictEqual(ls, { id: room.id, name: room.name, n: 7, run: true });
  assert.ok(!JSON.stringify(await api('list', { tok: gast })).includes(pid(host)), 'Liste verrät keine Host-Kennung');

  assert.ok((await api('signal', { tok: gast, id: room.id.toLowerCase(), to: 'host', data: sdp('offer') })).ok);
  assert.ok((await api('signal', { tok: gast, id: room.id, to: pid(fremd), data: sdp('offer') })).err, 'Gast darf nur dem Host schreiben');
  assert.ok((await api('signal', { tok: gast, id: room.id, to: 'host', data: sdp('answer') })).err, 'Gast darf keine Antwort schicken');
  assert.ok((await api('signal', { tok: gast, id: room.id, to: 'host', data: { sdp: { type: 'offer', sdp: 'x'.repeat(12001) } } })).err, 'zu lange Beschreibung');
  assert.deepStrictEqual((await api('poll', { tok: fremd, id: room.id })).msgs, [], 'Fremde bekommen keine Nachrichten');

  const got = (await api('poll', { tok: host, id: room.id, n: 1 })).msgs;
  assert.strictEqual(got.length, 1); assert.strictEqual(got[0].from, pid(gast)); assert.strictEqual(got[0].data.sdp.type, 'offer');
  assert.deepStrictEqual((await api('poll', { tok: host, id: room.id })).msgs, [], 'jede Nachricht wird einmal zugestellt');
  assert.ok((await api('signal', { tok: host, id: room.id, to: got[0].from, data: sdp('answer') })).ok);
  assert.strictEqual((await api('poll', { tok: gast, id: room.id })).msgs[0].data.sdp.type, 'answer');

  await api('close', { tok: gast, id: room.id });
  assert.ok(!(await api('poll', { tok: gast, id: room.id })).gone, 'nur der Host schließt den Raum');
  await api('close', { tok: host, id: room.id });
  assert.strictEqual((await api('poll', { tok: gast, id: room.id })).gone, true);
  assert.strictEqual((await api('signal', { tok: gast, id: room.id, to: 'host', data: sdp('offer') })).gone, true);
});

test('ohne Schlüssel gibt die ICE-Ausgabe eine leere Liste und keine Geheimnisse', async () => {
  const r = await api('ice', { tok: tok() });
  assert.deepStrictEqual(r.ice, []);
});

test('Raumdaten sind nicht direkt lesbar', async () => {
  const txt = fs.readFileSync(path.join(dir, 'data', 'rooms.php'), 'utf8');
  assert.ok(txt.startsWith('<?php http_response_code(403); exit; ?>'));
  assert.strictEqual(fs.readFileSync(path.join(dir, 'data', '.htaccess'), 'utf8').trim(), 'Require all denied');
});
