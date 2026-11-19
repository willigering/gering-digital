/* Smoke/regression checks for the private Abo-Übersicht (/abo). No PHP, no browser needed.
 * Run: node tests/abo_smoke.cjs */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("abo/index.html","utf8");
const css=fs.readFileSync("abo/abo.css","utf8");
const js=fs.readFileSync("abo/abo.js","utf8");
const php=fs.readFileSync("abo/api.php","utf8");
const htaccess=fs.readFileSync(".htaccess","utf8");
const deploy=fs.readFileSync(".github/workflows/deploy-strato.yml","utf8");

// Seite lädt nur eigene Styles/Skripte – keine gemeinsamen Haupt-/Smartphone-Dateien.
// Externe <a>-Links (z. B. CallMeBot-Anleitung) sind erlaubt, solange sie mit noopener öffnen.
const anchors=[...html.matchAll(/<a\b[^>]*>/g)].map(m=>m[0]);
for(const a of anchors){if(/href="https?:/.test(a))assert.ok(/rel="noopener noreferrer"/.test(a)&&/target="_blank"/.test(a),"Externer Link ohne noopener: "+a);}
const refs=[...html.replace(/<a\b[^>]*>/g,"").matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]);
for(const r of refs){
  assert.ok(/^(abo\.(css|js)\?v=|\.\.\/assets\/(gering-digital-logo-icon-312\.webp|favicon-64\.png)$|\.\/$)/.test(r),"Unerwartete Ressource auf /abo: "+r);
}
assert.ok(html.includes('name="robots" content="noindex'),"Privatseite nicht indexieren");
assert.ok(!/border-radius\s*:\s*(?!0\b)[^;}]+/.test(css),"Kantige Optik: keine border-radius-Werte außer 0");

// Datenhaltung: eigene SQLite in data/, gesperrt und nie deployt.
assert.ok(php.includes("abos-private.sqlite"),"Eigene Abo-Datenbank");
assert.ok(/RewriteRule \^data\(\?:\/\|\$\) - \[F/.test(htaccess),"data/ bleibt per .htaccess gesperrt");
assert.ok(fs.readFileSync("data/.htaccess","utf8").includes("Deny from all"),"data/.htaccess sperrt");
assert.ok(deploy.includes("'.sqlite'")&&/blocked_dirs = \{'data'/.test(deploy),"Deploy lädt weder data/ noch .sqlite hoch");

// Sicherheit / gleiches Passwort wie die Bewerbungsliste, nur lesend.
assert.ok(php.includes("bewerbungen-private.sqlite")&&php.includes("SQLITE_OPEN_READONLY"),"Passwort-Hash der Bewerbungsliste nur lesend");
const sharedFn=php.slice(php.indexOf("function sharedPasswordHash"),php.indexOf("function isLoggedIn"));
assert.ok(!/CREATE|INSERT|UPDATE|DELETE|DROP|ALTER/i.test(sharedFn),"Bewerbungs-DB wird nie verändert");
assert.ok(php.includes("password_verify(")&&php.includes("hash_equals(")&&php.includes("session_regenerate_id(true)"),"Login mit Hash, CSRF und neuer Session-ID");
assert.ok(php.includes("'httponly' => true")&&php.includes("'samesite' => 'Strict'"),"Sitzungs-Cookie geschützt");
assert.ok(php.includes("login_failures"),"Sitzungsübergreifende Login-Bremse");
for(const a of ["login","logout","save","delete","import"])assert.ok(php.includes("$action === '"+a+"'"),"API-Aktion fehlt: "+a);
assert.ok(/'ChatGPT'[\s\S]*'Claude'[\s\S]*'Suno'[\s\S]*'Higgsfield'[\s\S]*'Grok'/.test(php),"Startliste mit den fünf Abos");
assert.ok(php.includes("'preis' => null, 'intervall' => ''")&&php.includes("'ablaufdatum' => ''"),"Startliste ohne erfundene Werte");
assert.ok(!js.includes("innerHTML"),"Kein innerHTML (Schutz vor eingeschleustem HTML)");

// Benachrichtigungen.
const lib=fs.readFileSync("abo/notify-lib.php","utf8");
const notify=fs.readFileSync("abo/notify.php","utf8");
const wf=fs.readFileSync(".github/workflows/abo-reminder.yml","utf8");
for(const id of ["notifyForm","nEmailOn","nEmail","nWaOn","nPhone","nApikey","nLead","nTestEmail","nTestWa","nToken","nLastRun","nLog"])assert.ok(html.includes('id="'+id+'"'),"Benachrichtigungs-Element fehlt: "+id);
assert.ok(html.includes("I allow callmebot to send me messages"),"Anleitung für den CallMeBot-Schlüssel");
for(const a of ["notify_get","notify_save","notify_test","notify_token"])assert.ok(php.includes("$action === '"+a+"'"),"API-Aktion fehlt: "+a);
assert.ok(php.indexOf("$action === 'notify_get'")>php.indexOf("if (!isLoggedIn()) fail('Nicht angemeldet.', 401);"),"Benachrichtigungs-Aktionen nur angemeldet");
assert.ok(lib.includes("hash_equals(")&&lib.includes("hash('sha256', $token)"),"Cron-Token nur als Hash, Vergleich in konstanter Zeit");
assert.ok(lib.includes("'apikeyHint'")&&!/'apikey' => \$s\['apikey'\],\s*'leadDays'/.test(lib.slice(lib.indexOf("function abo_notify_public"),lib.indexOf("function abo_notify_save"))),"Schlüssel nie im Klartext an den Browser");
assert.ok(lib.includes("CURLOPT_TIMEOUT")&&lib.includes("'timeout' => 25"),"WhatsApp-Aufruf mit Timeouts");
assert.ok(lib.includes("getenv('GD_ABO_OUTBOX')"),"Test-Transport statt echtem Versand");
assert.ok(notify.includes("REQUEST_METHOD")&&notify.includes("HTTP_X_ABO_TOKEN")&&notify.includes("LOCK_EX"),"notify.php: POST, Token-Header, Sperre gegen Doppellauf");
assert.ok(!/CREATE TABLE IF NOT EXISTS (entries|account)/.test(lib),"Bestehende Tabellen bleiben unverändert");
assert.ok(/cron: '0 6 \* \* \*'/.test(wf)&&wf.includes("workflow_dispatch")&&wf.includes("secrets.ABO_NOTIFY_TOKEN"),"Täglicher Workflow mit Secret");
assert.ok(!/deploy-strato|actions\/checkout|sftp|STRATO_/i.test(wf.replace(/^#.*$/gm,"")),"Erinnerungs-Workflow deployt nichts");
assert.ok(wf.includes("exit 0"),"Fehlendes Secret: Lauf endet ohne Fehler");

// Reine Logik.
const sandbox={Intl,Date,Math,Number,String,Object,Array,isFinite};sandbox.globalThis=sandbox;
vm.runInNewContext(js,sandbox,{filename:"abo/abo.js"});
const C=sandbox.AboCore;assert.ok(C,"AboCore exportiert");
const today=new Date(2026,10,18);
assert.equal(C.daysUntil("2026-11-25",today),7);
assert.equal(C.daysUntil("2026-11-16",today),-2);
assert.equal(C.daysUntil("",today),null);
assert.equal(C.urgency({ablaufdatum:"2026-11-18"},today),"today");
assert.equal(C.urgency({ablaufdatum:"2026-11-25"},today),"soon");
assert.equal(C.urgency({ablaufdatum:"2026-11-26"},today),"near");
assert.equal(C.urgency({ablaufdatum:"2027-01-01"},today),"ok");
assert.equal(C.urgency({ablaufdatum:"2026-11-01"},today),"expired");
assert.equal(C.urgency({ablaufdatum:""},today),"none");
assert.equal(C.addInterval("2026-01-31","monatlich"),"2026-02-28");
assert.equal(C.addInterval("2028-02-29","jaehrlich"),"2029-02-28");
assert.equal(C.addInterval("2026-12-15","monatlich"),"2027-01-15");
assert.equal(C.addInterval("2026-12-15",""),"");
assert.equal(C.parsePrice("23,00"),23);assert.equal(C.parsePrice("1.299,99 €"),1299.99);assert.equal(C.parsePrice(""),null);assert.ok(Number.isNaN(C.parsePrice("abc")));
const items=[
  {id:"a",name:"Jahr",preis:120,intervall:"jaehrlich",ablaufdatum:"2027-03-01",status:"aktiv"},
  {id:"b",name:"Monat",preis:10,intervall:"monatlich",ablaufdatum:"2026-11-20",status:"aktiv"},
  {id:"c",name:"Offen",preis:null,intervall:"",ablaufdatum:"",status:"aktiv"},
  {id:"d",name:"Weg",preis:50,intervall:"monatlich",ablaufdatum:"2026-11-19",status:"gekuendigt"},
];
const s=C.summary(items,today);
assert.equal(s.count,3);assert.equal(s.perMonth,20);assert.equal(s.perYear,240);assert.equal(s.unpriced,1);assert.equal(s.next.item.id,"b");
assert.deepEqual(Array.from(C.sortItems(items,today),i=>i.id),["b","a","c","d"],"Aktive nach Datum, ohne Datum danach, gekündigte zuletzt");
assert.equal(C.safeUrl("javascript:alert(1)"),"");assert.equal(C.safeUrl("https://x.de/a"),"https://x.de/a");
console.log("OK: Abo-Smoke-Test bestanden");
