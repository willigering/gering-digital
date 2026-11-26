<?php
require_once __DIR__.'/../lib.php';
$version='1.2.2';
$portableHash='9bbd1345999d6a026dfcc419fcb4da9c76e5443b52bc68bb6556db3068887473';
$smallHash='1c4aad4e9df07ac8f2fb4a41fffbef6269948ecca2556b265384059a6eb4cc39';
$vt='https://www.virustotal.com/gui/file/';
$source='https://github.com/willigering/DeskRecall';
$releases=$source.'/releases/latest';
$release=$source.'/releases/download/v'.$version.'/';
$portable=$release.'DeskRecall-'.$version.'-portable-win-x64.zip';
$small=$release.'DeskRecall-'.$version.'-win-x64.zip';
$runtime='https://dotnet.microsoft.com/download/dotnet/10.0';
$notices=$source.'/blob/main/THIRD-PARTY-NOTICES.md';
$license=$source.'/blob/main/LICENSE';
$icon='../assets/app-previews/deskrecall.png.webp';
$year=(int)date('Y');
?>
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DeskRecall – Virtuelle Desktops automatisch organisieren | Gering Digital</title>
<meta name="description" content="DeskRecall stellt deine Windows-11-Arbeitsumgebung wieder her und verwaltet virtuelle Desktops, Programme und Fenster über ein kompaktes Widget.">
<link rel="stylesheet" href="../style.css?v=<?=filemtime(__DIR__.'/../style.css')?>">
<link rel="stylesheet" href="../assets/personal.css?v=<?=filemtime(__DIR__.'/../assets/personal.css')?>">
<link rel="stylesheet" href="../assets/home-v3.css?v=<?=filemtime(__DIR__.'/../assets/home-v3.css')?>">
<link rel="stylesheet" href="../sharplab/sharplab.css?v=<?=filemtime(__DIR__.'/../sharplab/sharplab.css')?>">
<link rel="stylesheet" href="deskrecall.css?v=<?=filemtime(__DIR__.'/deskrecall.css')?>">
<link rel="icon" type="image/webp" href="<?=e($icon)?>">
</head>
<body class="sharplab-page deskrecall-page">
<a class="skip-link" href="#inhalt">Zum Inhalt</a>
<div class="ambient ambient-1" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>
<main id="inhalt">
<section class="hero" aria-labelledby="hero-title">
  <div class="hero-inner">
    <div class="hero-copy">
      <div class="kicker"><span class="live-dot" aria-hidden="true"></span> DESKRECALL // WINDOWS-APP</div>
      <h1 id="hero-title">Virtuelle Desktops. <span>Automatisch organisiert.</span></h1>
      <div class="hero-strip"><span>AUTOSTART</span><i aria-hidden="true"></i><span>DESKTOPS</span><i aria-hidden="true"></i><span>PROFILE</span></div>
      <p class="hero-lead">Einmal einrichten. Jeden Tag davon profitieren. DeskRecall startet vorgemerkte Programme nach der Windows-Anmeldung und ordnet sie ihren virtuellen Desktops zu. Über ein kompaktes Widget behältst du deine Arbeitsumgebung im Blick.</p>
      <div class="hero-actions">
        <a class="primary-action" href="<?=e($portable)?>" id="download">Portable Version (ZIP) <span aria-hidden="true">↓</span></a>
        <a class="portable-action" href="<?=e($small)?>">Kleine Version (ZIP) <span aria-hidden="true">↓</span></a>
        <a class="secondary-action" href="<?=e($source)?>" target="_blank" rel="noopener">Quellcode auf GitHub <span aria-hidden="true">↗</span></a>
      </div>
      <div class="hero-meta"><span>Windows 11 x64</span><span>Kostenlos</span><span>Version <?=e($version)?></span><span>Keine Installation</span></div>
    </div>
    <div class="hero-visual">
      <a class="hero-art-wrap" href="../assets/deskrecall-page-preview.svg" aria-label="DeskRecall-Vorschau in voller Größe öffnen" aria-haspopup="dialog" aria-controls="sl-preview">
        <span class="sl-window-bar" aria-hidden="true"><span>DeskRecall</span><span>− &nbsp; □ &nbsp; ×</span></span>
        <img src="../assets/deskrecall-page-preview.svg" width="1600" height="900" alt="Illustration von DeskRecall: Widget und Einstellungen">
      </a><p class="hero-caption">Illustration · Ansicht vergrößern</p>
    </div>
  </div>
</section>
<section class="sl-section" id="funktionen" aria-labelledby="features-title">
  <div class="section-shell">
    <div class="section-heading"><div><span class="eyebrow">WAS DRINSTECKT</span><h2 id="features-title">Dein Desktop. Deine Ordnung.</h2><p>Arbeitsumgebungen speichern, organisieren und wiederherstellen.</p></div><span class="section-count">6 Punkte</span></div>
    <div class="steps">
      <article class="step"><span class="step-no">01</span><h3>Automatischer Start</h3><p>DeskRecall startet nach der Windows-Anmeldung auf Wunsch automatisch und öffnet die vorgemerkten Anwendungen.</p></article>
      <article class="step"><span class="step-no">02</span><h3>Feste Desktop-Zuweisung</h3><p>Programme an virtuelle Desktops anheften und per Drag-and-drop verschieben. Regeln legen auch Monitor und Startzustand fest.</p></article>
      <article class="step"><span class="step-no">03</span><h3>Zentrale Desktop-Verwaltung</h3><p>Desktops erstellen, benennen, wechseln und schließen – direkt über ein kompaktes, einklappbares Widget.</p></article>
      <article class="step"><span class="step-no">04</span><h3>Fenster und Monitore</h3><p>DeskRecall merkt sich Fensterpositionen, Größen, Zustände und Monitore sowie Explorer-Ordner.</p></article>
      <article class="step"><span class="step-no">05</span><h3>Profile und Sicherungsverlauf</h3><p>Arbeitsumgebungen als Profile speichern oder eine frühere Sicherung wiederherstellen. Die Sitzungsdaten bleiben lokal.</p></article>
      <article class="step"><span class="step-no">06</span><h3>Optionale Updates</h3><p>Auf Wunsch prüft DeskRecall bei GitHub auf neue Versionen. Sitzungsdaten bleiben beim Update erhalten.</p></article>
    </div>
  </div>
</section>
<section class="sl-section sl-facts" id="installation" aria-labelledby="install-title">
  <div class="section-shell sl-facts-grid">
    <div>
      <span class="eyebrow">INSTALLATION</span><h2 id="install-title">Systemanforderungen</h2>
      <ul><li>Windows 11 (x64) für den vollständigen Funktionsumfang.</li><li>Windows 10: eingeschränkt nutzbar; Verschieben zwischen virtuellen Desktops ist dort nicht vorgesehen.</li><li>Portable Version: Laufzeit bereits enthalten, keine Installation notwendig.</li><li>Kleine Version: .NET 10 Desktop Runtime x64 erforderlich.</li></ul>
      <a class="sl-runtime-action" href="<?=e($runtime)?>" target="_blank" rel="noopener">.NET 10 Desktop Runtime bei Microsoft laden ↗</a>
      <p>ZIP entpacken und <strong>DeskRecall.exe</strong> starten. Der Autostart ist ohne Administratorrechte möglich und kann deaktiviert werden.</p>
      <div class="hero-actions sl-install-actions"><a class="primary-action" href="<?=e($portable)?>">Portable Version (ZIP) ↓</a><a class="portable-action" href="<?=e($small)?>">Kleine Version (ZIP) ↓</a><a class="secondary-action" href="<?=e($releases)?>">Aktuellste GitHub-Version ↗</a></div>
    </div>
    <div>
      <span class="eyebrow">HINWEISE</span><h2>Datenschutz &amp; SmartScreen</h2>
      <p>DeskRecall speichert Sitzungsdaten lokal. Die optionale Update-Prüfung bei GitHub überträgt die IP-Adresse und kann abgeschaltet werden. <a href="../datenschutz.php#deskrecall">Datenschutzerklärung</a>.</p>
      <p>Die EXE ist derzeit nicht digital signiert. Windows kann beim ersten Start SmartScreen anzeigen. Prüfe Downloadquelle und Prüfsumme; Sicherheitswarnungen nicht ungeprüft umgehen.</p>
      <p>Kostenlos und ohne Gewähr. Die Haftung ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. <a href="<?=e($license)?>">Lizenz</a> · <a href="<?=e($notices)?>">Drittanbieter-Hinweise (MIT)</a>. Windows ist eine Marke der Microsoft Corporation.</p>
    </div>
  </div>
</section>
<section class="sl-section" id="scan" aria-labelledby="scan-title">
  <div class="section-shell">
    <div class="section-heading"><div><span class="eyebrow">PRÜFSUMME UND SCAN</span><h2 id="scan-title">Virenscan-Nachweis</h2></div></div>
    <p class="sl-scan-intro">Die SHA-256-Werte stammen aus den GitHub-Release-Metadaten für Version <?=e($version)?>. Die Links führen zur jeweiligen Dateihash-Abfrage bei VirusTotal. Ein bestätigtes Scan-Ergebnis liegt uns derzeit nicht vor; ein Link allein ist kein Nachweis für einen erfolgreichen Scan.</p>
    <div class="sl-scan-grid">
      <article class="sl-scan-card"><h3>DeskRecall-<?=e($version)?>-portable-win-x64.zip</h3><p class="sl-scan-meta">Portable Version · ca. 56,6 MB</p><p><a href="<?=e($vt.$portableHash)?>" target="_blank" rel="noopener">Bei VirusTotal prüfen ↗</a> · <a href="<?=e($portable.'.sha256')?>">Prüfsummendatei ↓</a></p><p class="sl-hash"><span>SHA-256 für Version <?=e($version)?></span><code><?=e($portableHash)?></code></p></article>
      <article class="sl-scan-card"><h3>DeskRecall-<?=e($version)?>-win-x64.zip</h3><p class="sl-scan-meta">Kleine Version · ca. 0,64 MB</p><p><a href="<?=e($vt.$smallHash)?>" target="_blank" rel="noopener">Bei VirusTotal prüfen ↗</a> · <a href="<?=e($small.'.sha256')?>">Prüfsummendatei ↓</a></p><p class="sl-hash"><span>SHA-256 für Version <?=e($version)?></span><code><?=e($smallHash)?></code></p></article>
    </div>
  </div>
</section>
<section class="sl-back-section" aria-label="Zurück zur Projektübersicht"><div class="section-shell sl-back-wrap"><a class="sl-back-button" href="../#apps">← Zurück</a></div></section>
</main>
<dialog class="sl-preview dr-preview" id="sl-preview" aria-labelledby="sl-preview-title">
  <div class="sl-preview-header"><span id="sl-preview-title">DeskRecall · App-Illustration</span><button type="button" class="sl-preview-close" aria-label="Vorschau schließen" autofocus>×</button></div>
  <img src="../assets/deskrecall-page-preview.svg" width="1600" height="900" alt="Illustration von DeskRecall: Widget und Einstellungen">
</dialog>
<footer><div class="wrap footer"><a class="brand" href="../"><picture><source media="(max-width:800px)" type="image/webp" srcset="../assets/gering-digital-logo-icon-312.webp"><img class="brand-logo" src="../assets/gering-digital-logo-icon.png" alt="Gering Digital Logo"></picture><span><strong>GERING <em>DIGITAL</em></strong><small>Eigene Ideen. Echte Probleme. Digitale Lösungen.</small></span></a><div><a href="../impressum.php">Impressum</a> · <a href="../datenschutz.php#deskrecall">Datenschutz</a></div><small>© <?=$year?> Gering Digital</small></div></footer>
<script src="../sharplab/preview.js?v=<?=filemtime(__DIR__.'/../sharplab/preview.js')?>" defer></script>
</body>
</html>
