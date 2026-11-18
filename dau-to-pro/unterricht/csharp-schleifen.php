<?php
declare(strict_types=1);
require_once __DIR__.'/../material-access.php';
dtp_material_require_access();
header('Cache-Control: no-store, private');
?><!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>C# Schleifenlabor · DAU TO PRO</title>
<link rel="stylesheet" href="db-material.css">
<link rel="stylesheet" href="../../tools/module-focus.css">
<style>
body{background:#08151a url("../../assets/dau-backgrounds/circuit-1536.webp") center top/cover fixed}
main{padding-bottom:3rem}
.hero,.part{background:#0d1c23f5}
.links,.controls{display:flex;gap:.8rem;flex-wrap:wrap;align-items:center}
.links a,button,select{color:#99eedc;background:#132932;border:1px solid #41656c;border-radius:.5rem;padding:.6rem .85rem;font:inherit}
button,select{cursor:pointer} button:disabled{opacity:.5;cursor:default}
pre{overflow:auto;background:#08151a;border-radius:.5rem;padding:1rem;color:#c0f6ea}
table{width:100%;border-collapse:collapse;text-align:left} th,td{padding:.45rem;border-bottom:1px solid #35515a}
td:first-child{width:4ch} input{font:inherit;max-width:100%;padding:.5rem}
#practicePanel{color:#e6f3f3;padding:1rem} [hidden]{display:none!important}
@media(max-width:600px),(prefers-reduced-motion:reduce){body{background-attachment:scroll}}
</style>
<script src="../../tools/module-focus.js" defer></script>
<script src="csharp-schleifen.js?v=1" defer></script>
</head><body>
<header class="site-head"><div class="wrap"><a href="../index.php?material=1#unterrichtsmaterial">← Unterrichtsmaterial</a><strong>DAU <span>TO</span> PRO</strong></div></header>
<main class="wrap" id="pathView">
<section class="hero"><span class="kicker">C# · Unterrichtsmaterial</span>
<h1>Schleifenlabor</h1><p>Wann läuft der Code, wann stoppt er und was steht am Ende in der Konsole?</p>
<nav class="links" aria-label="Abschnitte"><a href="#lernen">Lernen</a><a href="#labor">Ausprobieren</a><a href="#uebungen">Üben</a><a href="../cheat-sheet.html?thema=csharp-schleifen">Spickzettel</a></nav>
</section>
<section class="part" id="lernen"><h2>Welche Schleife passt?</h2>
<ul>
<li><code>for</code> für einen Zähler oder Index. Startwert, Prüfung und Änderung stehen im Kopf. Die Prüfung findet vor dem ersten Durchlauf statt.</li>
<li><code>while</code> für Wiederholungen, solange eine Bedingung gilt. Ist sie am Anfang falsch, läuft der Block kein einziges Mal.</li>
<li><code>do … while</code> für einen ersten Durchlauf mit anschließender Prüfung, etwa für ein Menü. Der Block läuft mindestens einmal.</li>
<li><code>foreach</code> für jedes Element einer Sammlung. Bei einer leeren Sammlung läuft der Block kein einziges Mal. Einen numerischen Index bekommst du dabei nicht automatisch.</li>
</ul>
<p><strong>So liest du eine Schleife:</strong> Schreib die Startwerte auf. Prüfe die Bedingung an der richtigen Stelle. Notiere pro Durchlauf die Ausgabe und alle geänderten Werte. Beim ersten falschen Test geht es hinter der Schleife weiter.</p>
</section>
<section class="part" id="labor"><h2>Ablauf Schritt für Schritt</h2>
<div class="controls"><label for="loop-type">Schleife</label><select id="loop-type"><option>for</option><option>while</option><option>do while</option><option>foreach</option></select>
<label for="loop-size" id="loop-size-label">Startwert</label><select id="loop-size"><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option></select></div>
<pre><code id="loop-code"></code></pre>
<div class="controls"><button id="loop-step" type="button">Nächster Schritt</button><button id="loop-run" type="button">Bis zum Ende</button><button id="loop-reset" type="button">Anfang</button></div>
<p id="loop-status" aria-live="polite"></p><p>Konsole <output id="loop-output">–</output></p>
</section>
<section class="part" id="uebungen"><h2 id="lessonTitle">Ausgabe vorhersagen und Fehler finden</h2>
<p>Arbeite den Code auf Papier durch und prüfe danach deine Antwort.</p>
<button type="button" id="start-practice">Übung starten</button>
<div id="practicePanel" hidden><h2 id="practiceKicker">Schleifenübung</h2>
<form id="practiceTask" hidden><p id="practice-question"></p><pre><code id="practice-code"></code></pre>
<label for="practice-answer">Deine Antwort</label> <input id="practice-answer" required autocomplete="off">
<button type="submit">Prüfen</button><p id="practice-result" aria-live="polite"></p></form>
<button type="button" id="practice-next">Nächste Aufgabe</button>
<button type="button" id="backToLesson">Lektion wieder ansehen</button></div></section>
<section class="part"><h2>Weiterlernen</h2><p>Die Lernidee mit schrittweisem Ablauf und Challenges stammt aus <a href="https://digitisaak.de/Minitools/looplap/index.html">LoopLap von Digitisaak</a>.</p></section>
</main></body></html>
