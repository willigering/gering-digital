<?php
require_once __DIR__.'/../lib.php';
$download='https://github.com/willigering/SharpLab/releases/latest/download/SharpLab-Setup.exe';
$portable='https://github.com/willigering/SharpLab/releases/latest/download/SharpLab-Windows.zip';
$source='https://github.com/willigering/SharpLab';
$runtime='https://dotnet.microsoft.com/download/dotnet/8.0';
$year=(int)date('Y');
?>
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SharpLab – Der interaktive C#-Trainer | Gering Digital</title>
<meta name="description" content="SharpLab ist der interaktive C#-Trainer von Willi Gering, Gering Digital. Von den Basics bis zum Profi: 27 Lektionen, 216 Übungen, Quiz und eingebauter Compiler für Windows.">
<link rel="stylesheet" href="../style.css?v=<?=filemtime(__DIR__.'/../style.css')?>">
<link rel="stylesheet" href="../assets/personal.css?v=<?=filemtime(__DIR__.'/../assets/personal.css')?>">
<link rel="stylesheet" href="../assets/home-v3.css?v=<?=filemtime(__DIR__.'/../assets/home-v3.css')?>">
<link rel="stylesheet" href="sharplab.css?v=<?=filemtime(__DIR__.'/sharplab.css')?>">
<link rel="icon" type="image/png" sizes="64x64" href="../assets/favicon-64.png">
</head>
<body class="sharplab-page">
<a class="skip-link" href="#inhalt">Zum Inhalt</a>
<div class="ambient ambient-1" aria-hidden="true"></div>
<div class="grain" aria-hidden="true"></div>
<canvas class="sharplab-matrix sl-page-matrix" width="1440" height="900" aria-hidden="true"></canvas>

<header class="nav glass-nav">
  <div class="wrap navin">
    <a class="brand" href="../#apps" aria-label="Gering Digital Startseite">
      <picture><source media="(max-width:800px)" type="image/webp" srcset="../assets/gering-digital-logo-icon-312.webp"><img class="brand-logo" src="../assets/gering-digital-logo-icon.png" alt="Gering Digital Logo"></picture>
      <span><strong>GERING <em>DIGITAL</em></strong><small>EIGENE IDEEN · EIGENE APPS</small></span>
    </a>
    <nav class="desktop-nav" aria-label="Hauptnavigation">
      <a href="../#apps">Projekte</a>
      <a href="../#ueber-mich">Über mich</a>
      <a href="#download">Download</a>
    </nav>
    <a class="btn small desktop-cta" href="<?=e($download)?>">Installer <b>↓</b></a>
  </div>
</header>

<main id="inhalt">
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-inner">
      <div class="hero-copy">
        <div class="kicker"><span class="live-dot" aria-hidden="true"></span> SHARPLAB // der interaktive C#-Trainer</div>
        <h1 id="hero-title">Der interaktive <span>C#-Trainer.</span></h1>
        <div class="hero-strip"><span>27 LEKTIONEN</span><i aria-hidden="true"></i><span>216 ÜBUNGEN</span><i aria-hidden="true"></i><span>QUIZ</span><i aria-hidden="true"></i><span>COMPILER</span></div>
        <p class="hero-lead">Lerne C# von null an – von den Basics bis zum Profi. Aufgaben, Quiz und ein eingebauter Compiler laufen direkt im Programm, mit Autovervollständigung wie in Visual Studio. Dein Lernstand bleibt erhalten, auch auf mehreren Rechnern.</p>
        <div class="hero-actions">
          <a class="primary-action" href="<?=e($download)?>" id="download">Installer herunterladen <span aria-hidden="true">↓</span></a>
          <a class="secondary-action" href="<?=e($source)?>" target="_blank" rel="noopener">Quellcode auf GitHub <span aria-hidden="true">↗</span></a>
        </div>
        <p class="sl-portable"><a href="<?=e($portable)?>">Portable Version (ZIP)</a></p>
        <div class="hero-meta"><span><b>27</b> Lektionen</span><span>Kostenlos unter MIT</span><span>Windows 10/11</span></div>
      </div>
      <div class="hero-visual">
        <div class="hero-art-wrap">
          <img src="../assets/sharplab-screenshot.webp" width="1600" height="900" alt="SharpLab im Überblick: Lernpfad, Lektionstext und Code-Editor mit Ausgabe">
        </div>
        <p class="hero-caption">Ein Nachbau der Oberfläche – Lernpfad, Lektion und Editor in einem Fenster.</p>
      </div>
    </div>
  </section>

  <section class="sl-section" id="funktionen" aria-labelledby="features-title">
    <div class="section-shell">
      <div class="section-heading">
        <div>
          <span class="eyebrow">WAS DRINSTECKT</span>
          <h2 id="features-title">Lernen, üben, ausführen</h2>
          <p>Alles, was du zum Einstieg in C# brauchst.</p>
        </div>
        <span class="section-count">6 Punkte</span>
      </div>
      <div class="steps">
        <article class="step"><span class="step-no">01</span><h3>Von null an</h3><p>27 Lektionen führen dich Schritt für Schritt von den Grundlagen bis zu anspruchsvolleren Themen.</p></article>
        <article class="step"><span class="step-no">02</span><h3>216 Übungen und Quiz</h3><p>Jede Lektion hat Aufgaben und Fragen. Du siehst sofort, ob deine Lösung stimmt.</p></article>
        <article class="step"><span class="step-no">03</span><h3>Eingebauter Compiler</h3><p>Dein Code wird mit Roslyn übersetzt, dem Compiler, den auch Visual Studio nutzt – direkt in SharpLab.</p></article>
        <article class="step"><span class="step-no">04</span><h3>Autovervollständigung</h3><p>Vorschläge wie in Visual Studio, inklusive deiner eigenen Variablen und bekannter Kürzel wie <code>cw</code>.</p></article>
        <article class="step"><span class="step-no">05</span><h3>Lernstand überall</h3><p>Den Speicherort kannst du selbst wählen, zum Beispiel einen OneDrive-Ordner, und so auf mehreren Rechnern weitermachen.</p></article>
        <article class="step"><span class="step-no">06</span><h3>Auto-Update</h3><p>SharpLab prüft auf Wunsch bei GitHub nach neuen Versionen und hilft beim Aktualisieren.</p></article>
      </div>
    </div>
  </section>

  <section class="sl-section sl-facts" id="installation" aria-labelledby="install-title">
    <div class="section-shell sl-facts-grid">
      <div>
        <span class="eyebrow">INSTALLATION</span>
        <h2 id="install-title">Systemanforderungen</h2>
        <ul>
          <li>Windows 10 oder Windows 11</li>
          <li>.NET 8 Desktop Runtime oder neuer. <a href="<?=e($runtime)?>" target="_blank" rel="noopener">Kostenlos bei Microsoft laden ↗</a></li>
        </ul>
        <p>Der Installer <strong>SharpLab-Setup.exe</strong> braucht keine Administratorrechte. Er legt Verknüpfungen im Startmenü und auf dem Desktop an, und SharpLab kann sich danach per Auto-Update selbst aktualisieren.</p>
        <p>Wer kein Installationsprogramm möchte, lädt die <a href="<?=e($portable)?>">portable ZIP-Version</a>, entpackt sie und startet <strong>SharpLab.exe</strong>.</p>
      </div>
      <div>
        <span class="eyebrow">HINWEIS</span>
        <h2>SmartScreen</h2>
        <p>SharpLab ist derzeit nicht digital signiert. Windows kann deshalb beim ersten Start SmartScreen anzeigen. Das ist normal.</p>
        <p>Wenn SmartScreen warnt, prüfe bitte zuerst die Downloadquelle und die veröffentlichte SHA-256-Prüfsumme. Sicherheitswarnungen sollten nicht ungeprüft umgangen werden.</p>
      </div>
    </div>
  </section>

  <section class="sl-section" id="scan" aria-labelledby="scan-title">
    <div class="section-shell">
      <div class="section-heading">
        <div>
          <span class="eyebrow">PRÜFSUMME UND SCAN</span>
          <h2 id="scan-title">Virenscan-Nachweis</h2>
        </div>
      </div>
      <p class="sl-scan-intro">Die folgenden Angaben gelten für Version 1.0.5 (Installer ca. 7,8&nbsp;MB). Bei späteren Updates können sich Prüfsumme und Scan-Ergebnis ändern.</p>
      <div class="sl-scan-grid">
        <article class="sl-scan-card">
          <h3>SharpLab-Setup.exe</h3>
          <p class="sl-scan-meta">Version 1.0.5 · ca. 7,8&nbsp;MB</p>
          <p>Virenscan (VirusTotal, 20.11.2026): 69 von 70 Scannern ohne Befund – 1 Heuristik-Meldung (Fehlalarm bei neuen, unsignierten Programmen). <a href="https://www.virustotal.com/gui/file/15b3cf6764902aa141cf30825403c1025faa9afc3e842cc5510e842701d15f1e" target="_blank" rel="noopener">Bericht ansehen ↗</a></p>
          <p class="sl-hash"><span>SHA-256 für Version 1.0.5</span> <code>15b3cf6764902aa141cf30825403c1025faa9afc3e842cc5510e842701d15f1e</code></p>
        </article>
        <article class="sl-scan-card">
          <h3>SharpLab-Windows.zip</h3>
          <p class="sl-scan-meta">Portable Version · Version 1.0.5</p>
          <p>Virenscan (VirusTotal, 20.11.2026): Kein Befund. <a href="https://www.virustotal.com/gui/file/152839c07bcb6413712435d7e258ca4db22f9c7916dcc177ac16bb959a61b28f" target="_blank" rel="noopener">Bericht ansehen ↗</a></p>
          <p class="sl-hash"><span>SHA-256 für Version 1.0.5</span> <code>152839c07bcb6413712435d7e258ca4db22f9c7916dcc177ac16bb959a61b28f</code></p>
        </article>
      </div>
    </div>
  </section>

  <section class="sl-section sl-credits" id="lizenz">
    <div class="section-shell">
      <span class="eyebrow">LIZENZ</span>
      <h2>Open Source unter <span>MIT</span></h2>
      <p><strong>Sicherheitshinweis:</strong> Im Editor ausgeführter C#-Code läuft innerhalb der Anwendung und nicht in einer vollständig isolierten Sandbox. Führe daher nur eigenen oder vertrauenswürdigen Code aus. Die Auto-Update-Funktion prüft beim Installieren neuer Versionen eine veröffentlichte SHA-256-Prüfsumme; diese ersetzt keine digitale Signatur.</p>
      <p><strong>Datenschutz:</strong> Feedback wird nur auf deine ausdrückliche Aktion gesendet. Ein optionales Fehlerprotokoll kann personenbezogene Informationen enthalten. <a href="../datenschutz.php#sharplab">Details zu Feedback und Updateprüfung in der Datenschutzerklärung</a>.</p>
      <p>Der Quellcode von SharpLab steht unter der MIT-Lizenz und liegt öffentlich auf GitHub. Idee, Texte und Programm: <strong>Willi Gering, Gering Digital</strong>.</p>
      <div class="hero-actions">
        <a class="primary-action" href="<?=e($download)?>">Installer herunterladen <span aria-hidden="true">↓</span></a>
        <a class="secondary-action" href="<?=e($source)?>" target="_blank" rel="noopener">github.com/willigering/SharpLab <span aria-hidden="true">↗</span></a>
        <a class="sl-back" href="../#apps">← Zurück zu den Projekten</a>
      </div>
      <p class="sl-portable"><a href="<?=e($portable)?>">Portable Version (ZIP)</a></p>
    </div>
  </section>
</main>

<footer>
  <div class="wrap footer">
    <a class="brand" href="../">
      <picture><source media="(max-width:800px)" type="image/webp" srcset="../assets/gering-digital-logo-icon-312.webp"><img class="brand-logo" src="../assets/gering-digital-logo-icon.png" alt="Gering Digital Logo"></picture>
      <span><strong>GERING <em>DIGITAL</em></strong><small>Eigene Ideen. Echte Probleme. Digitale Lösungen.</small></span>
    </a>
    <div><a href="../impressum.php">Impressum</a> · <a href="../datenschutz.php">Datenschutz</a></div>
    <small>© <?=$year?> Gering Digital</small>
  </div>
</footer>
<script src="../assets/sharplab-matrix.js?v=<?=filemtime(__DIR__.'/../assets/sharplab-matrix.js')?>" defer></script>
</body>
</html>
