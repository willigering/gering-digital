<?php
require __DIR__.'/../lib.php';
$query=db()->prepare("SELECT slug,title,description,preview_image,preview_fit,preview_x,preview_y FROM html_pages WHERE published=1 AND category=? ORDER BY updated_at DESC,id DESC");
$query->execute(['lernen']);
$modules=$query->fetchAll(PDO::FETCH_ASSOC);
function dtp_lower(string $s): string {return function_exists('mb_strtolower')?mb_strtolower($s,'UTF-8'):strtolower($s);}
function dtp_topic(array $p): array {
    $t=dtp_lower(($p['title']??'').' '.($p['description']??'').' '.($p['slug']??''));
    if(preg_match('/subnet|ipv4|ipv6|cidr|wildcard|bits|binär|binaer|hexadezimal|ip-adress/',$t))return ['subnet','IP & Subnetting','01'];
    if(preg_match('/osi|switch|router|wlan|netzwerk|topolog|routing|dhcp|dns|vlan/',$t))return ['netzwerk','Netzwerktechnik','02'];
    if(preg_match('/sicher|datenschutz|dsgvo|krypt|verschlüssel|verschluessel|hash|authentif/',$t))return ['sicherheit','IT-Sicherheit','03'];
    if(preg_match('/prüfung|pruefung|ihk|klausur|wiso|exam/',$t))return ['pruefung','Prüfungsvorbereitung','04'];
    return ['sonstiges','IT-Grundlagen','05'];
}
foreach($modules as &$module) {$module['topic']=dtp_topic($module);}unset($module);
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090c0e">
  <meta name="description" content="DAU TO PRO – Von Null Plan zu echtem IT-Verständnis. Interaktive IT-Lernprogramme von Gering Digital.">
  <title>DAU TO PRO – Von Null Plan zu echtem IT-Verständnis | Gering Digital</title>
  <link rel="icon" type="image/png" href="../assets/favicon-64.png">
  <link rel="stylesheet" href="style.css?v=<?=filemtime(__DIR__.'/style.css')?>">
  <script src="site.js?v=<?=filemtime(__DIR__.'/site.js')?>" defer></script>
</head>
<body>
<div class="dtp-world-texture" aria-hidden="true"></div>
<div class="dtp-world-traces" aria-hidden="true">
<svg viewBox="0 0 1440 3600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden="true">
<defs><linearGradient id="dtp-cyan" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#00dce8" stop-opacity=".48"/><stop offset="1" stop-color="#00dce8" stop-opacity=".08"/></linearGradient><linearGradient id="dtp-gold" x1="0" x2="1"><stop stop-color="#ffc55a" stop-opacity=".25"/><stop offset="1" stop-color="#ffc55a" stop-opacity=".08"/></linearGradient></defs>
<g fill="none" stroke-linejoin="round" stroke-linecap="square">
<path d="M-80 500 H110 l60 -60 H310 l30 -30 H490" stroke="url(#dtp-cyan)" stroke-width="2"/>
<path d="M1450 650 H1230 l-85 85 H1020 l-48 48 H810" stroke="url(#dtp-gold)" stroke-width="2"/>
<path d="M-100 1150 H190 l60 60 H320 l60 -60 H455" stroke="url(#dtp-gold)" stroke-width="2"/>
<path d="M1480 1485 H1190 l-85 -90 H1020 l-55 60 H820" stroke="url(#dtp-cyan)" stroke-width="2"/>
<path d="M-100 2050 H110 l60 -60 H275 l55 45 H470" stroke="url(#dtp-cyan)" stroke-width="2"/>
<path d="M1520 2370 H1240 l-65 60 H1015 l-70 -55 H810" stroke="url(#dtp-gold)" stroke-width="2"/>
<path d="M-100 3000 H155 l60 -65 H350 l62 52 H575" stroke="url(#dtp-gold)" stroke-width="2"/>
<path d="M1490 3420 H1260 l-75 75 H1110 l-55 -40 H910" stroke="url(#dtp-cyan)" stroke-width="2"/>
<path d="M225 -60 l-240 370" stroke="url(#dtp-gold)" stroke-width="3"/>
<path d="M1490 210 L1170 650" stroke="url(#dtp-cyan)" stroke-width="1" opacity=".4"/>
<path d="M-50 2450 L210 2020" stroke="url(#dtp-cyan)" stroke-width="1" opacity=".4"/>
</g><g fill="#00dce8" opacity=".65"><circle cx="310" cy="440" r="5"/><circle cx="1020" cy="735" r="4"/><circle cx="820" cy="1455" r="4"/><circle cx="170" cy="1990" r="4"/><circle cx="910" cy="3455" r="4"/></g>
<g fill="#eab448" opacity=".6"><circle cx="455" cy="1150" r="4"/><circle cx="1175" cy="2430" r="5"/><circle cx="412" cy="2987" r="4"/></g>
</svg></div>
<a class="skip" href="#lernmodule">Direkt zu den Lernmodulen</a>
<header class="dtp-nav" id="oben">
  <div class="nav-inner">
    <a class="gd-brand" href="../index.php" aria-label="Zur Gering-Digital-Startseite">
      <img src="../assets/gering-digital-logo-icon.png" alt="" width="44" height="44">
      <span><strong>GERING <em>DIGITAL</em></strong><small>EIGENE IDEEN · EIGENE APPS</small></span>
    </a>
    <nav class="desktop-links" aria-label="Hauptnavigation">
      <a href="../index.php">Startseite</a>
      <a class="selected" href="./" aria-current="page">DAU TO PRO</a>
      <a href="#lernmodule">Lernmodule</a>
      <a href="#konzept">So funktioniert's</a>
    </nav>
    <a class="nav-cta" href="../index.php#apps">Meine Projekte <span aria-hidden="true">↗</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="dtp-mobile-menu" aria-label="Menü öffnen"><span></span><span></span><span></span></button>
  </div>
  <nav class="mobile-links" id="dtp-mobile-menu" aria-label="Mobile Navigation" hidden>
    <a href="#oben">Startseite</a><a href="./" aria-current="page">DAU TO PRO</a><a href="#lernmodule">Lernmodule</a><a href="#konzept">So funktioniert's</a><a href="../index.php#apps">Meine Projekte</a>
  </nav>
</header>
<main>
  <section class="hero">
    <div class="hazard hazard-left" aria-hidden="true"></div><div class="hazard hazard-right" aria-hidden="true"></div>
    <div class="hero-inner">
      <div class="kicker"><span class="live-dot"></span> GERING DIGITAL <b>//</b> DIE IT-LERNPLATTFORM</div>
      <img class="hero-logo" data-exact-src="../assets/dau-to-pro-logo-exakt.png" src="../assets/dau-to-pro-logo.webp" width="1447" height="1087" fetchpriority="high" alt="DAU TO PRO – Von Null Plan zu echtem IT-Verständnis. Illustration: vom ratlosen Anfänger zum selbstbewussten IT-Profi.">
      <div class="hero-strip"><span>VERSTEHEN</span><i aria-hidden="true"></i><span>ÜBEN</span><i aria-hidden="true"></i><span>ANWENDEN</span></div>
      <p class="hero-lead">Netzwerke, Subnetting, IT-Sicherheit und mehr. Hier werden aus komplizierten Themen verständliche Erklärungen, praktische Übungen und echte Aha-Momente.</p>
      <div class="hero-actions"><a class="primary-action" href="#lernmodule">Lernmodule entdecken <span aria-hidden="true">↓</span></a><a class="secondary-action" href="#konzept">So funktioniert's <span aria-hidden="true">↗</span></a></div>
      <div class="hero-meta"><span><b><?=count($modules)?></b> <?=count($modules)===1?'veröffentlichtes Lernmodul':'veröffentlichte Lernmodule'?></span><span>Direkt im Browser</span><span>Ohne Registrierung</span></div>
    </div>
  </section>
<section class="dtp-disclaimer" id="hinweis" aria-labelledby="dtp-disclaimer-title">
  <div class="disclaimer-shell">
    <div class="disclaimer-label"><span class="disclaimer-icon" aria-hidden="true">!</span><span>WICHTIGER HINWEIS · UNABHÄNGIGE LERNHILFE</span></div>
    <h2 id="dtp-disclaimer-title">Keine offiziellen Lern- oder Prüfungsinhalte</h2>
    <p><strong>DAU TO PRO ist keine offizielle Lernplattform.</strong> Die Inhalte sind meine persönlichen Sammlungen, Notizen und Recherchen, die ich für mein eigenes Lernen zusammengestellt habe und mit anderen teilen möchte. Sie bilden keine offiziellen Lehrpläne, Unterrichtsmaterialien oder Prüfungsanforderungen vollständig oder verbindlich ab und ersetzen diese nicht.</p>
    <p><strong>Die Nutzung erfolgt auf eigene Gefahr und Verantwortung.</strong> Trotz sorgfältiger Erstellung können Informationen fehlerhaft, unvollständig oder nicht mehr aktuell sein. Es besteht keine Gewähr für Richtigkeit, Vollständigkeit oder Aktualität.</p>
    <p class="disclaimer-final">Ich nutze selbst weitere Lernquellen. <strong>Kontrolle ist besser als Vertrauen:</strong> Bitte überprüfe wichtige Aussagen anhand deiner Unterrichtsunterlagen, offizieller Vorgaben und verlässlicher Fachquellen.</p>
  </div>
</section>
  <section class="catalog-section" id="lernmodule" aria-labelledby="modules-title">
    <div class="section-shell">
      <div class="section-heading"><div><span class="eyebrow">01 / LERNEN</span><h1 id="modules-title">Deine <span>Trainingszone.</span></h1><p>Suche dir ein Thema aus und öffne den passenden Trainer. Alle veröffentlichten Lernprogramme werden hier automatisch angezeigt.</p></div><div class="section-mark" aria-hidden="true">&lt;/&gt;</div></div>
      <div class="catalog-panel">
        <div class="toolbar"><label class="searchbox"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.4"/><path d="m15.4 15.4 5 5"/></svg><span class="sr-only">Lernmodule durchsuchen</span><input id="module-search" type="search" placeholder="Modul oder Thema suchen …" autocomplete="off"></label><div class="result-indicator" id="result-indicator" role="status" aria-live="polite"><?=count($modules)?> Module</div></div>
        <div class="filterbar" role="group" aria-label="Lernmodule nach Thema filtern">
          <button type="button" class="filter-btn active" data-filter="alle" aria-pressed="true">Alle Module</button><button type="button" class="filter-btn" data-filter="subnet" aria-pressed="false">IP &amp; Subnetting</button><button type="button" class="filter-btn" data-filter="netzwerk" aria-pressed="false">Netzwerke</button><button type="button" class="filter-btn" data-filter="sicherheit" aria-pressed="false">IT-Sicherheit</button><button type="button" class="filter-btn" data-filter="pruefung" aria-pressed="false">Prüfung</button><button type="button" class="filter-btn" data-filter="sonstiges" aria-pressed="false">Grundlagen</button>        </div>
                  <?php if (!$modules): ?>
<div class="empty-state"><h2>Deine Trainingszone wächst.</h2><p>Hier erscheinen alle Lernmodule, die über den Admin-Bereich in der Kategorie „DAU to Pro“ veröffentlicht werden.</p></div>
<?php else: ?>
<div class="module-grid" id="module-grid">
<?php foreach($modules as $module): $topic=$module['topic']; ?>
<a class="module-card" href="../<?=rawurlencode($module['slug'])?>/" data-topic="<?=e($topic[0])?>" data-search="<?=e(dtp_lower($module['title'].' '.$module['description'].' '.$topic[1]))?>" aria-label="<?=e($module['title'])?> – Lernmodul öffnen">
  <div class="module-art">
  <?php if (!empty($module['preview_image'])): ?>
    <img loading="lazy" src="../<?=e($module['preview_image'])?>" alt="" style="width:100%;height:100%;object-fit:<?=($module['preview_fit']??'cover')==='contain'?'contain':'cover'?>;object-position:<?=max(0,min(100,(int)($module['preview_x']??50)))?>% <?=max(0,min(100,(int)($module['preview_y']??0)))?>%;">
  <?php else: ?>
    <span class="module-art-symbol" aria-hidden="true"><?=e(['subnet'=>'01/10','netzwerk'=>'⌘','sicherheit'=>'⌁','pruefung'=>'90:00','sonstiges'=>'</>'][$topic[0]]??'</>')?></span>
  <?php endif; ?>
    <span class="module-art-corner" aria-hidden="true"></span><span class="module-art-number"><?=e($topic[2])?></span>
  </div>
  <div class="module-body"><span class="module-category"><i></i><?=e($topic[1])?></span>
  <h2><?=e($module['title'])?></h2>
  <p><?=e($module['description']!==''?$module['description']:'Interaktives Lernprogramm mit Erklärungen und Übungen.')?></p>
  <div class="module-footer"><span>IM BROWSER STARTEN</span><b aria-hidden="true">↗</b></div></div>
</a>
<?php endforeach; ?>
</div>
<p id="search-empty" class="search-empty" hidden>Keine Module gefunden. Versuche einen anderen Suchbegriff oder Themenfilter.</p>
<?php endif; ?>
              </div>
    </div>
  </section>
  <section class="method-section" id="konzept" aria-labelledby="method-title">
    <div class="section-shell"><div class="section-heading"><div><span class="eyebrow">02 / DEIN WEG</span><h2 id="method-title">Vom Fragezeichen <span>zum Durchblick.</span></h2><p>Erst verstehen, dann ausprobieren, schließlich zeigen, was du kannst. Die Lerntrainer können diese drei Bereiche enthalten.</p></div></div>
      <div class="steps">
        <article class="step"><span class="step-no">01</span><div class="step-symbol">◎</div><h3>Nachschlagwerk</h3><p>Verständliche Erklärungen, nachvollziehbare Beispiele und Fachbegriffe, die tatsächlich Sinn ergeben.</p><span class="step-key">WISSEN AUFBAUEN</span></article>
        <article class="step"><span class="step-no">02</span><div class="step-symbol">⌘</div><h3>Trainingsraum</h3><p>Aufgaben gezielt üben, Antworten kontrollieren und knifflige Themen so oft wiederholen, wie nötig.</p><span class="step-key">WISSEN FESTIGEN</span></article>
        <article class="step"><span class="step-no">03</span><div class="step-symbol">◷</div><h3>Prüfungsmodus</h3><p>Unter Zeitdruck üben, Punkte sammeln und anhand einer Auswertung erkennen, wo noch Luft nach oben ist.</p><span class="step-key">WISSEN BEWEISEN</span></article>
      </div>
    </div>
  </section>
  <section class="end-cap"><div class="section-shell"><div class="end-cap-content"><span class="eyebrow">BEREIT FÜR DEN NÄCHSTEN SCHRITT?</span><h2>Weniger Rätselraten.<br><em>Mehr Durchblick.</em></h2><p>Such dir ein Lernmodul aus. Der Weg zum IT-Verständnis beginnt nicht mit einer perfekten Antwort – sondern mit der nächsten Frage.</p><a class="primary-action" href="#lernmodule">Jetzt lernen <span aria-hidden="true">↑</span></a></div></div></section>
</main>
<footer class="dtp-footer"><div class="footer-inner"><a href="../index.php" class="footer-brand"><strong>GERING <em>DIGITAL</em></strong><small>DAU TO PRO · Ein Projekt von Gering Digital</small></a><div class="footer-links"><a href="../index.php">Zurück zu Gering Digital</a><a href="../impressum.php">Impressum</a><a href="../datenschutz.php">Datenschutz</a><a href="#hinweis">Wichtiger Hinweis</a></div><small>© 2026 Willi Gering</small></div></footer>
</body></html>