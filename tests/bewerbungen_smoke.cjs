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
