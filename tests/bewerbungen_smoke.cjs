/* Smoke/regression checks for the private application tracker.
 * Run: node tests/bewerbungen_smoke.cjs
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("b.html","utf8");
const theme=fs.readFileSync("bewerbungen-theme.css","utf8");
const php=fs.readFileSync("bewerbungen-api.php","utf8");
const mailPhp=fs.readFileSync("bewerbungen-mail.php","utf8");
const mailLib=fs.readFileSync("bewerbungen-mail-lib.php","utf8");
const mailUi=fs.readFileSync("bewerbungen-mail-ui.js","utf8");
const fivePage=fs.readFileSync("bewerbungen-five-page.js","utf8");
new vm.Script(fivePage,{filename:"bewerbungen-five-page.js"});
for(const action of ["template","upload-template","remove-template"]){
  assert(mailPhp.includes("'"+action+"'"),"Missing five-page template action: "+action);
}
assert(mailPhp.includes("'Bewerbungsmappe.pdf'"),"Five-page map must be sent as one file");
assert(mailPhp.includes("expectedPdfHash"),"Reviewed PDF SHA-256 must match uploaded five-page bytes");
assert(mailPhp.includes("preg_match_all('~/Type"),"Five-page output page-count must be verified");
assert(mailLib.includes("GD_Bewerbung_Seite2_Leer_V1")||mailPhp.includes("GD_Bewerbung_Seite2_Leer_V1"),
  "Only prepared redacted five-page template accepted");
assert(fivePage.includes("const page=pages[1]")&&fivePage.includes("getPageCount()!==5"),
  "Only original letter page two must be edited");
assert(fivePage.includes("replaced.size!==rows.size"),"Original PDF must match every expected editable line");
assert(mailUi.includes("GDMFivePage.make(")&&mailUi.includes("useFivePage:true"),
  "Complete five-page PDF must be assembled and mailed");
assert(html.includes("assets/lib/pdf-lib.min.js")&&html.includes("bewerbungen-five-page.js"),
  "Self-hosted PDF editor must load before mail UI");

new vm.Script(mailUi,{filename:"bewerbungen-mail-ui.js"});
for(const action of ["upload-original","remove-original","original","upload-cv","remove-cv"]){
  assert(mailPhp.includes("'"+action+"'"),"Missing private document operation: "+action);
}
assert(mailPhp.includes("gdcsrf($body)"),"Private document uploads must use session CSRF token");
assert(mailPhp.includes("empty($_SESSION['bewerbungen_authenticated'])"),"Private document downloads must require login");
assert(mailLib.includes("is_uploaded_file($tmp)")&&mailLib.includes("gdm_save_asset("),
  "Uploaded PDFs stored in authenticated private SQLite, never on public server paths");
assert(mailUi.includes('gdm-template-input')&&mailUi.includes('gdm-original-input'),
  "Original application and template import controls exist");
assert(mailUi.includes('API+"?action=original"')&&mailUi.includes("approvedBlob"),
  "Fetch the original privately and attach only the reviewed output");

const rootHtaccess=fs.readFileSync(".htaccess","utf8");
const match=html.match(/<script>([\s\S]*?)<\/script>/i);
assert(match,"Inline frontend controller exists");
new vm.Script(match[1],{filename:"b.html inline controller"});
assert(html.includes("<h1>Praktikumsbewerbung</h1>"),"Internship application is the only dashboard hero title");
assert.equal((html.match(/src="assets\/gering-digital-logo-icon-312\.webp"/g)||[]).length,2,"Real Gering Digital icon in sidebar and login");
assert(!html.includes('class="brand-mark">G/'),"No placeholder logo left");
assert(fs.existsSync("assets/gering-digital-logo-icon-312.webp"),"Logo asset is deployed");

assert(html.includes("Daten &amp; Sicherung</h1>"),"Settings uses a plain functional title");
for (const slogan of ["Der nächste Schritt.","Im Blick.","Sichern.<br>","Mitnehmen.","Dein Weg ins nächste Kapitel.","PRIVATE WORKSPACE"]) {
  assert(!html.includes(slogan),"Promotional slogan remains: "+slogan);
}
assert(html.includes('function rowStateClass(status)'),"Status styling mapping exists");
assert(html.includes('status==="absage"?"row-rejected":["beworben","rueckmeldung","gespraech","zusage"].includes(status)?"row-applied":""'),"Applied and rejected businesses have full-row colors; uncontacted ones stay neutral");
assert(html.includes('<tr class="'+String.raw`'+rowStateClass(r.status)+'`+'" data-edit='),"Desktop row gets full-width status class");
assert(html.includes('mobile-card '+String.raw`'+rowStateClass(r.status)+'`),"Mobile card gets full-width status class");
for (const rule of [".data-table tbody tr.row-applied td", ".data-table tbody tr.row-rejected td",
                    ".mobile-card.row-applied{", ".mobile-card.row-rejected{"]) {
  assert(theme.includes(rule),"Missing full-row style in DAU theme: "+rule);
}
assert(!html.includes("row-open"),"Uncontacted rows must not retain the green state");
assert(html.includes('href="bewerbungen-theme.css"'),"DAU theme stylesheet must be included");
assert(html.includes('id="logoutTop"'),"Topbar logout is present");
assert(html.includes('$("logoutTop").addEventListener("click",logout)'),"Topbar logout uses the real server-side logout action");
assert(html.includes('$("logoutTop").classList.toggle("hidden",state.mode!=="ready")'),"Logout only visible in authenticated mode");
assert(html.includes('updateApplicationBackdrop()'),"Parallax controller is wired");
assert(theme.includes('network-ports-1536.webp')&&theme.includes('network-ports-768.webp'),"Reuse existing lesson background with mobile variant");
for(const image of ["assets/dau-backgrounds/network-ports-1536.webp","assets/dau-backgrounds/network-ports-768.webp"]){
  assert(fs.existsSync(image),"Missing deployed lesson image "+image);
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
