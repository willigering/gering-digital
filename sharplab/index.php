<?php
require_once __DIR__.'/../lib.php';
$download='https://github.com/willigering/SharpLab/releases/latest/download/SharpLab-Windows.zip';
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
    <a class="btn small desktop-cta" href="<?=e($download)?>">Download <b>↓</b></a>
  </div>
</header>

<main id="inhalt">
  <section class="sl-hero">
    <div class="wrap sl-hero-grid">
      <div class="sl-hero-copy">
        <p class="eyebrow">WINDOWS-APP · OPEN SOURCE</p>
        <div class="sl-kicker"><img src="../assets/app-previews/sharplab.png.webp" width="72" height="72" alt=""> <span>Windows-App</span></div>
        <h1>SharpLab</h1>
        <p class="sl-subtitle">Der interaktive C#-Trainer.<br><em>Von Basics bis Profi.</em></p>
        <p class="sl-lead">Lerne C# von null an – direkt im Programm, mit eingebautem Compiler, Aufgaben, Quiz und einer Autovervollständigung wie in Visual Studio. Dein Lernstand bleibt erhalten, auch auf mehreren Rechnern.</p>
        <div class="sl-actions">
          <a class="btn" href="<?=e($download)?>" id="download">Download für Windows <b>↓</b></a>
          <a class="btn ghost" href="<?=e($source)?>" target="_blank" rel="noopener">Quellcode auf GitHub <b>↗</b></a>
        </div>
        <p class="sl-meta">Kostenlos · MIT-Lizenz · Willi Gering, Gering Digital</p>
      </div>
      <figure class="sl-shot">
        <img src="../assets/sharplab-screenshot.webp" width="1600" height="900" alt="SharpLab im Überblick: Lernpfad, Lektionstext und Code-Editor mit Ausgabe">
        <figcaption>Ein Nachbau der Oberfläche – Lernpfad, Lektion und Editor in einem Fenster.</figcaption>
      </figure>
    </div>
  </section>

  <section class="sl-section">
    <div class="wrap">
      <p class="eyebrow">WAS DRINSTECKT</p>
      <h2>Lernen, üben, ausführen –<br><em>ohne Setup-Chaos.</em></h2>
      <div class="sl-features">
        <article><h3>Von null an</h3><p>27 Lektionen führen dich Schritt für Schritt von den Grundlagen bis zu anspruchsvolleren Themen.</p></article>
        <article><h3>216 Übungen und Quiz</h3><p>Jede Lektion hat Aufgaben und Fragen. Du siehst sofort, ob deine Lösung stimmt.</p></article>
        <article><h3>Eingebauter Compiler</h3><p>Dein Code wird mit Roslyn übersetzt, dem Compiler, den auch Visual Studio nutzt – direkt in SharpLab.</p></article>
        <article><h3>Autovervollständigung</h3><p>Vorschläge wie in Visual Studio, inklusive deiner eigenen Variablen und bekannter Kürzel wie <code>cw</code>.</p></article>
        <article><h3>Lernstand überall</h3><p>Den Speicherort kannst du selbst wählen, zum Beispiel einen OneDrive-Ordner, und so auf mehreren Rechnern weitermachen.</p></article>
        <article><h3>Auto-Update</h3><p>SharpLab prüft auf Wunsch bei GitHub nach neuen Versionen und hilft beim Aktualisieren.</p></article>
      </div>
    </div>
  </section>

  <section class="sl-section sl-facts">
    <div class="wrap sl-facts-grid">
      <div>
        <p class="eyebrow">INSTALLATION</p>
        <h2>Systemanforderungen</h2>
        <ul>
          <li>Windows 10 oder Windows 11</li>
          <li>.NET 8 Desktop Runtime oder neuer. <a href="<?=e($runtime)?>" target="_blank" rel="noopener">Kostenlos bei Microsoft laden ↗</a></li>
        </ul>
        <p>Die ZIP-Datei entpacken und <strong>SharpLab.exe</strong> starten. Eine Installation ist nicht nötig.</p>
      </div>
      <div>
        <p class="eyebrow">HINWEIS</p>
        <h2>SmartScreen</h2>
        <p>SharpLab ist derzeit nicht digital signiert. Windows kann deshalb beim ersten Start SmartScreen anzeigen. Das ist normal.</p>
        <p>Klicke auf <strong>Weitere Informationen</strong> und danach auf <strong>Trotzdem ausführen</strong>.</p>
      </div>
    </div>
  </section>

  <section class="sl-section">
    <div class="wrap">
      <p class="eyebrow">PRÜFSUMME UND SCAN</p>
      <h2>Virenscan-Nachweis</h2>
      <div class="sl-placeholder" role="note">
        <span class="sl-badge">PLATZHALTER</span>
        <p>Link zum Virenscan und die SHA-256-Prüfsumme der Release-Datei werden eingetragen, sobald Version 1.0.5 auf GitHub veröffentlicht ist.</p>
        <p class="sl-hash"><span>SHA-256</span> <code>PLATZHALTER — wird nach dem Release eingetragen</code></p>
        <p class="sl-placeholder-link">Virenscan: <em>Link folgt nach dem Release</em></p>
      </div>
    </div>
  </section>

  <section class="sl-section sl-credits">
    <div class="wrap">
      <p class="eyebrow">LIZENZ</p>
      <h2>Open Source unter MIT</h2>
      <p>Der Quellcode von SharpLab steht unter der MIT-Lizenz und liegt öffentlich auf GitHub. Idee, Texte und Programm: <strong>Willi Gering, Gering Digital</strong>.</p>
      <div class="sl-actions">
        <a class="btn" href="<?=e($download)?>">Download für Windows <b>↓</b></a>
        <a class="btn ghost" href="<?=e($source)?>" target="_blank" rel="noopener">github.com/willigering/SharpLab <b>↗</b></a>
        <a class="sl-back" href="../#apps">← Zurück zu den Projekten</a>
      </div>
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
</body>
</html>
