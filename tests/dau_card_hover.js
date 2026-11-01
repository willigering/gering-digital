// Hover auf Modulkarten: nur die Karte selbst reagiert, die Seite wird weder weichgezeichnet noch abgedunkelt.
'use strict';
const fs=require('fs'),assert=require('assert');
const css=fs.readFileSync(__dirname+'/../dau-to-pro/style.css','utf8');
const js=fs.readFileSync(__dirname+'/../dau-to-pro/site.js','utf8');
assert.ok(!/dtp-focus|backdrop-filter:blur\(5px\) brightness/.test(css),'Kein Abdunkel-/Blur-Overlay im CSS');
assert.ok(!/dtp-focus|is-focus-target/.test(js),'Kein Overlay-Skript');
assert.ok(/\.module-card:hover\{[^}]*transform:translateY\(-5px\)/.test(css),'Karte hebt sich beim Hovern an');
assert.ok(/\.module-card:hover\{border-color:var\(--mod\)/.test(css),'Rahmen in der Modulfarbe');
assert.ok(/\.module-card,\.primary-action,\.secondary-action\{transition:none\}/.test(css),'Reduzierte Bewegung respektiert');
console.log('Modulkarten-Hover: alle Prüfungen bestanden');
