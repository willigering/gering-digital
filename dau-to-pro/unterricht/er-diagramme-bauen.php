<?php
declare(strict_types=1);
require_once __DIR__.'/../material-access.php';
dtp_material_require_access();
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex');
header('X-Content-Type-Options: nosniff');
$account=(int)(learner_current()['id']??0);
?><!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#08151a"><title>ER-Werkstatt · Diagramme selber bauen · DAU TO PRO</title>
<link rel="stylesheet" href="db-material.css"><link rel="stylesheet" href="er-werkstatt.css?v=3"></head>
<body>
<header class="site-head"><div class="wrap"><a href="../index.php?material=1#unterrichtsmaterial">← UNTERRICHTSMATERIAL</a><strong>DAU <span>TO</span> PRO // ER-WERKSTATT</strong></div></header>
<div class="wrap"><section class="hero ew-hero">
<span class="kicker">DATENBANKEN · INTERAKTIVES UNTERRICHTSMATERIAL</span>
<h1>Begriffe rein.<br><em>Beziehungen klar.</em></h1>
<p>Deine Aufgabe: Aus einer Beschreibung ein echtes ER-Diagramm bauen. Die Begriffe liegen schon auf dem Blatt. Gib ihnen ihre Form, unterstreiche Schlüssel und verbinde, was zusammengehört.</p>
<div class="tags"><span>Linien ziehen</span><span>Rechteck · Raute · Oval</span><span>Unterstreichen</span><span>Aufgabengenerator</span></div>
</section>
<main id="er-training">
<div class="ew-task part">
<div class="ew-task-top">
<div><span class="eyebrow">01 · DEINE AUFGABE</span><h2 id="ew-title">ER-Modell erstellen</h2></div>
<div class="ew-generate">
<label for="ew-level">Schwierigkeit</label>
<select id="ew-level"><option value="easy">Einfach</option><option value="medium" selected>Normal</option><option value="hard">Knifflig</option></select>
<button type="button" class="ew-button ew-gold" id="ew-next">↻ Neue Aufgabe</button>
</div></div>
<p id="ew-story" class="ew-story" aria-live="polite"></p>
<div class="ew-step-hint"><span>1 <b>Form geben</b></span><i>›</i><span>2 <b>Verbinden</b></span><i>›</i><span>3 <b>1 / n / m setzen</b></span><i>›</i><span>4 <b>Prüfen</b></span></div>
</div>
<section class="part ew-studio" aria-label="ER-Diagramm erstellen">
<div class="ew-studio-top"><div><span class="eyebrow">02 · DEIN ZEICHENBLATT</span><h2>Aus Text wird Struktur.</h2></div><p>Ziehe direkt von einem Begriff zum anderen. Tippe danach auf die Linie, um 1, n oder m zu setzen.</p></div>
<div class="ew-workspace">
<form class="ew-custom-form" id="ew-custom-form" autocomplete="off"><label for="ew-custom-term">Eigener Begriff</label><input id="ew-custom-term" type="text" maxlength="45" placeholder="z. B. PatientenNr, behandelt, Diagnose" required><button type="submit" class="ew-button ew-gold">+ Begriff hinzufügen</button><span>Neue Begriffe kannst du anschließend frei formen und verbinden.</span></form>
<div class="ew-toolbar" id="ew-toolbar" aria-label="Werkzeuge für markiertes Element">
<span class="ew-tool-caption" id="ew-selection-label">Klicke einen Begriff an</span>
<div class="ew-tool-group" id="ew-shape-tools">
<button type="button" class="ew-tool" data-ew-shape="entity" aria-pressed="false"><svg viewBox="0 0 50 32" aria-hidden="true"><rect x="4" y="5" width="42" height="22" rx="1" stroke="currentColor" fill="none" stroke-width="2"/></svg>Rechteck</button>
<button type="button" class="ew-tool" data-ew-shape="relationship" aria-pressed="false"><svg viewBox="0 0 50 32" aria-hidden="true"><polygon points="25,2 48,16 25,30 2,16" stroke="currentColor" fill="none" stroke-width="2"/></svg>Raute</button>
<button type="button" class="ew-tool" data-ew-shape="attribute" aria-pressed="false"><svg viewBox="0 0 50 32" aria-hidden="true"><ellipse cx="25" cy="16" rx="23" ry="13" stroke="currentColor" fill="none" stroke-width="2"/></svg>Oval</button>
</div>
<button type="button" class="ew-tool ew-underline" id="ew-underline" aria-pressed="false"><span aria-hidden="true"><u>U</u></span>Unterstreichen</button>
<button type="button" class="ew-tool ew-link-button" id="ew-connect">Verbinden</button>
<button type="button" class="ew-tool ew-delete" id="ew-delete" aria-label="Form des markierten Begriffs entfernen">Form entfernen</button>
</div>
<div class="ew-toolbar ew-line-toolbar" id="ew-line-toolbar" hidden><span>Kardinalität der markierten Linie</span><div id="ew-card-group" class="ew-cards">
<button type="button" data-ew-card="">–</button><button type="button" data-ew-card="1">1</button><button type="button" data-ew-card="n">n</button><button type="button" data-ew-card="m">m</button></div><button class="ew-button" type="button" id="ew-delete-line">Linie entfernen</button></div>
<div id="ew-board-scroller" class="ew-board-scroller"><svg id="ew-board" class="ew-board" viewBox="0 0 900 500" role="group" aria-label="Zeichentafel mit Begriffen zum Formen und Verbinden"><g id="ew-lines"></g><g id="ew-nodes"></g><g id="ew-labels"></g></svg></div>
<p id="ew-message" class="ew-message" role="status" aria-live="polite">Wähle einen Begriff und gib ihm eine Form.</p>
</div>
<div class="ew-actionbar"><button class="ew-button ew-gold" id="ew-check" type="button">Diagramm prüfen</button><button class="ew-button" id="ew-undo" type="button">↶ Rückgängig</button><button class="ew-button ew-quiet" id="ew-clear" type="button">Zurücksetzen</button><button class="ew-button" id="ew-solution-button" type="button" disabled>Lösung ansehen</button></div>
<div id="ew-feedback" class="ew-feedback" hidden aria-live="polite"></div>
<div id="ew-solution" class="ew-solution" hidden><h3>Ein mögliches korrektes ER-Diagramm</h3><p>In der Chen-Notation: Rechtecke für Entitätstypen, Rauten für Beziehungen, Ovale für Attribute. Schlüsselattribute sind unterstrichen.</p><svg id="ew-solution-svg" viewBox="0 0 900 500" role="img" aria-label="Korrektes ER-Diagramm für die Aufgabe"></svg></div>
</section>
<section class="part ew-help"><span class="eyebrow">KURZ ERKLÄRT</span><h2>Drei Formen. Eine Regel.</h2>
<div class="grid">
<div class="tile"><span class="term">RECHTECK</span><h3>Entitätstyp</h3><p>Bezeichnet eine Kategorie von Dingen: Kunde, Auftrag, Mitarbeiter, Projekt.</p></div>
<div class="tile"><span class="term">RAUTE</span><h3>Beziehung</h3><p>Beschreibt, wie Entitäten verbunden sind: erteilt, arbeitet an, gehört zu.</p></div>
<div class="tile"><span class="term">OVAL</span><h3>Attribut</h3><p>Beschreibt eine Eigenschaft. Ein eindeutiges Schlüsselattribut wird unterstrichen.</p></div>
</div><p class="notice">1:n heißt: Ein Datensatz der einen Seite kann mit vielen der anderen Seite verknüpft sein. Die Anzahl sagt noch nicht, ob eine Teilnahme optional ist. Die Aufgaben nennen die jeweilige fachliche Annahme.</p>
<p class="note-text">Die Aufgaben werden zufällig aus einer redaktionell geprüften Fallsammlung erzeugt. Deine Zeichnung wird nur lokal auf diesem Gerät gespeichert, getrennt nach Lernkonto. Keine zusätzliche Passwortfreischaltung.</p>
</section></main></div>
<footer class="foot"><div class="wrap"><a href="../index.php?material=1#unterrichtsmaterial">Zurück zum Unterrichtsmaterial</a><a href="er-modelle-interaktiv.php">ER-Modelle nachschlagen</a></div></footer>
<script>window.__EW_ACCOUNT__=<?=$account?>;</script>
<script src="er-werkstatt.js?v=3" defer></script>
</body></html>