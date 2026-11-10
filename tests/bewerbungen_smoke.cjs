/* Smoke/regression checks for the private application tracker.
 * Run: node tests/bewerbungen_smoke.cjs
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("b.html","utf8");
const php=fs.readFileSync("bewerbungen-api.php","utf8");
const rootHtaccess=fs.readFileSync(".htaccess","utf8");
const match=html.match(/<script>([\s\S]*?)<\/script>/i);
assert(match,"Inline frontend controller exists");
new vm.Script(match[1],{filename:"b.html inline controller"});
assert(html.includes("<h1>Praktikumsbewerbung</h1>"),"Internship application is the only dashboard hero title");
assert(html.includes("Daten &amp; Sicherung</h1>"),"Settings uses a plain functional title");
for (const slogan of ["Der nächste Schritt.","Im Blick.","Sichern.<br>","Mitnehmen.","Dein Weg ins nächste Kapitel.","PRIVATE WORKSPACE"]) {
  assert(!html.includes(slogan),"Promotional slogan remains: "+slogan);
}
assert(html.includes('function rowStateClass(status)'),"Status styling mapping exists");
assert(html.includes('["nicht_beworben","vorbereitet"].includes(status)?"row-open":status==="absage"?"row-rejected"'),"Only open and rejected businesses get custom background");
assert(html.includes('<tr class="'+String.raw`'+rowStateClass(r.status)+'`+'" data-edit='),"Desktop row gets full-width status class");
assert(html.includes('mobile-card '+String.raw`'+rowStateClass(r.status)+'`),"Mobile card gets full-width status class");
for (const rule of [".data-table tbody tr.row-open td", ".data-table tbody tr.row-rejected td",
                    ".mobile-card.row-open{", ".mobile-card.row-rejected{"]) {
  assert(html.includes(rule),"Missing full-row style: "+rule);
}
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
for(const m of match[1].matchAll(/\$\("([^"]+)"\)/g)){
  assert(ids.has(m[1]),"Missing DOM element #"+m[1]);
}
for(const field of ["company","city","contact","email","phone","status","appliedAt","followUpAt","notes","street","postal","postCity","website","source"]){
  assert(html.includes('name="'+field+'"'),"Editor field missing: "+field);
}
for(const op of ["setup","login","logout","save","delete","import","state"]){
  assert(php.includes("'"+op+"'"),"API action missing: "+op);
}
assert(rootHtaccess.includes("RewriteRule ^data"),"Runtime directory must be blocked from HTTP");
assert(php.includes("password_hash(")&&php.includes("password_verify("),"Password hashing mandatory");
assert(php.includes("hash_equals("),"Setup token and CSRF must use constant-time compare");
assert(php.includes("session_set_cookie_params(")&&php.includes("'httponly' => true"),"Session cookie must be HttpOnly");
assert(!html.includes("witala@gmx.de"),"Private application metadata leaked into public HTML");
assert(!php.includes("witala@gmx.de"),"Private application metadata leaked into public PHP");
assert(!html.includes("firma-001"),"The original applicant data must be imported privately, not published");
console.log("Bewerbungskompass: frontend syntax, references, privacy and API contracts OK.");
