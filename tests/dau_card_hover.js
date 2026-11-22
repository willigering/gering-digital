// Modul-Fokus wie in der Designvorlage: Blur/Abdunkeln werden pro Frame gemeinsam aufgebaut.
'use strict';
const fs=require('fs'),assert=require('assert');
const css=fs.readFileSync(__dirname+'/../dau-to-pro/style.css','utf8');
const js=fs.readFileSync(__dirname+'/../dau-to-pro/site.js','utf8');
assert.ok(/\.dtp-focus-panel\{[^}]*backdrop-filter:blur\(var\(--focus-blur,0px\)\) brightness\(var\(--focus-brightness,1\)\) saturate\(var\(--focus-saturation,1\)\)/.test(css),'Panels lesen Blur/Helligkeit/Sättigung aus Variablen');
assert.ok(!/\.dtp-focus-overlay[^{]*\{[^}]*transition:opacity/.test(css),'Keine Deckkraft-Überblendung eines fertigen Blur-Layers');
assert.ok(/ENTER_MS=4100,EXIT_MS=920,INTENT_MS=150/.test(js),'Zeiten wie in der Vorlage');
assert.ok(/'--focus-blur',\(5\.5\*progress\)/.test(js)&&/'--focus-dim',\(0\.22\*progress\)/.test(js),'Endwerte wie in der Vorlage');
assert.ok(/1-Math\.pow\(1-t,3\)/.test(js),'Ausblenden: schneller Beginn, sanftes Ende');
assert.ok(/@media\(hover:none\),\(pointer:coarse\),\(prefers-reduced-motion:reduce\)\{\.dtp-focus-overlay\{display:none!important\}\}/.test(css),'Kein Effekt auf Touch/reduzierter Bewegung');
assert.ok(/\.module-card,\.primary-action,\.secondary-action\{transition:none\}/.test(css),'Reduzierte Bewegung respektiert');
assert.ok(/const FOCUS_BLUR=false;/.test(js),'Weichzeichnen und Abdunkeln sind abgeschaltet');
console.log('Modul-Fokus: alle Prüfungen bestanden');
