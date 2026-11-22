// Parallax und Hintergrund der DAU-TO-PRO-Seite (statische Prüfungen).
'use strict';
const fs=require('fs'),assert=require('assert');
const root=__dirname+'/..';
const css=fs.readFileSync(root+'/dau-to-pro/style.css','utf8');
const js=fs.readFileSync(root+'/dau-to-pro/site.js','utf8');
const lib=fs.readFileSync(root+'/dau_lib.php','utf8');
assert.ok(/random_int\(1,2\)/.test(lib)&&/dau-to-pro-bg-platine-/.test(lib),'Zufälliges Platinen-Motiv pro Aufruf');
for(const n of [1,2])assert.ok(fs.statSync(`${root}/assets/dau-to-pro-bg-platine-${n}.webp`).size>10000,`Motiv ${n} vorhanden`);
assert.ok(!/feTurbulence/.test(css.slice(css.indexOf('.dtp-world-texture{'),css.indexOf('.dtp-world-texture{')+800)),'Kein graues SVG-Rauschen mehr als Hintergrund');
assert.ok(/\.dtp-world-texture\{[^}]*position:fixed[^}]*height:128vh/.test(css),'Feste Hintergrundbühne, höher als der Bildschirm');
assert.ok(/\.dtp-parallax-clip\{[^}]*overflow:hidden/.test(css),'Verschobene Ebenen verlängern die Seite nicht');
assert.ok(/prefers-reduced-motion: reduce/.test(js)&&/on=!reduced\.matches/.test(js),'Parallax aus bei reduzierter Bewegung');
assert.ok(/requestAnimationFrame\(apply\)/.test(js)&&/addEventListener\('scroll',request,\{passive:true\}\)/.test(js),'Ein Frame pro Scroll, passive Listener');
assert.ok(!/Math\.min\(110/.test(js)&&/progress\*lag/.test(js),'Ebenen laufen am Seitenfortschritt mit, ohne harte Grenze');
assert.ok(/smooth\+\(target-smooth\)\*\.16/.test(js)&&/finePointer\.matches/.test(js),'Weiches Nachführen nur mit Maus/Trackpad');
assert.ok(/\.module-art\.has-image img/.test(js)&&/objectFit!=='cover'/.test(js),'Modulbilder mit Fenster-Effekt, nur bei Ausfüllen');
assert.ok(/\.style\.translate=/.test(js)&&!/art\.style\.transform/.test(js),'Hero nutzt translate, damit die Hero-Animation (transform) unberührt bleibt');
console.log('Parallax/Hintergrund: alle Prüfungen bestanden');
