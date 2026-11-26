<?php
require_once __DIR__.'/../lib.php';
$download='https://github.com/willigering/DeskRecall/releases/latest';
$source='https://github.com/willigering/DeskRecall';
$notices='https://github.com/willigering/DeskRecall/blob/main/THIRD-PARTY-NOTICES.md';
$license='https://github.com/willigering/DeskRecall/blob/main/LICENSE';
$year=(int)date('Y');
?>
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DeskRecall – Desktop- und Sitzungsmanager | Gering Digital</title>
<meta name="description" content="Einmal einrichten. Jeden Tag davon profitieren. DeskRecall stellt deine persönliche Arbeitsumgebung nach jedem Start automatisch wieder her.">
<link rel="stylesheet" href="../style.css?v=<?=filemtime(__DIR__.'/../style.css')?>">
<link rel="stylesheet" href="deskrecall.css?v=<?=filemtime(__DIR__.'/deskrecall.css')?>">
<link rel="icon" type="image/png" sizes="64x64" href="../assets/favicon-64.png">
</head>
<body class="deskrecall-page">
<a class="skip-link" href="#inhalt">Zum Inhalt</a>
<header class="site-header minimal-header">
  <a class="brand" href="../">
    <img class="brand-logo" src="../assets/gering-digital-logo-icon.png" alt="Gering Digital GD Logo">
    <span><strong>GERING</strong> <em>DIGITAL</em></span>
  </a>
  <a class="nav-back" href="../#apps">← Zurück</a>
</header>

<main id="inhalt" class="dr-main">
  <section class="dr-hero" aria-labelledby="hero-title">
    <div class="dr-hero-inner">
      <img class="dr-icon" src="../assets/uploads/deskrecall.png" width="128" height="128" alt="DeskRecall-Symbol">
      <p class="dr-kicker">WINDOWS-APP · VERSION 1.1.0</p>
      <h1 id="hero-title">DeskRecall</h1>
      <p class="dr-tagline">Einmal einrichten. Jeden Tag davon profitieren.</p>
      <div class="dr-actions">
        <a class="dr-btn dr-btn-primary" href="<?=e($download)?>">Aktuelle Version laden <span aria-hidden="true">↓</span></a>
        <a class="dr-btn" href="<?=e($source)?>" target="_blank" rel="noopener">Quellcode auf GitHub <span aria-hidden="true">↗</span></a>
      </div>
    </div>
  </section>

  <section class="dr-copy" aria-labelledby="beschreibung-title">
    <h2 id="beschreibung-title" class="visually-hidden">Beschreibung</h2>
    <p>Warum nach jedem Windows-Start alle Anwendungen erneut öffnen und mühsam auf die virtuellen Desktops verteilen?</p>
    <p>Desk Recall übernimmt das für dich.</p>
    <p>Mit Desk Recall legst du einmalig fest, welche Anwendungen auf welchem virtuellen Desktop gestartet werden sollen. Bei jedem Windows-Start stellt die App deine persönliche Arbeitsumgebung automatisch wieder her.</p>

    <h3>Funktionen im Überblick:</h3>
    <ul class="dr-features">
      <li><strong>Automatischer Anwendungsstart</strong> – Vorgemerkte Programme werden beim Windows-Start automatisch geöffnet.</li>
      <li><strong>Feste Desktop-Zuweisung</strong> – Jede Anwendung startet auf dem dafür vorgesehenen virtuellen Desktop.</li>
      <li><strong>Zentrale Desktop-Verwaltung</strong> – Verwalte deine virtuellen Desktops über eine übersichtliche Benutzeroberfläche.</li>
      <li><strong>Individuelle Arbeitsumgebung</strong> – Trenne Arbeit, Gaming, Kreativität und private Anwendungen voneinander.</li>
      <li><strong>Weniger Aufwand</strong> – Kein tägliches Öffnen, Verschieben und Sortieren deiner Programme.</li>
    </ul>

    <p class="dr-close">Einmal einrichten. Jeden Tag davon profitieren.</p>
  </section>

  <aside class="dr-notes" aria-labelledby="hinweise-title">
    <h2 id="hinweise-title">Hinweise</h2>
    <ul>
      <li>Kostenlos und ohne Gewähr. Die Haftung ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.</li>
      <li>DeskRecall speichert alle Daten ausschließlich lokal. Die einzige Netzwerkverbindung ist die optionale Update-Prüfung bei GitHub (dabei wird die IP-Adresse an GitHub übertragen); sie lässt sich in den Einstellungen abschalten. Weitere Angaben stehen in der <a href="../datenschutz.php#deskrecall">Datenschutzerklärung</a>.</li>
      <li>DeskRecall enthält Code Dritter unter der MIT-Lizenz, siehe <a href="<?=e($notices)?>" target="_blank" rel="noopener">THIRD-PARTY-NOTICES</a>.</li>
      <li>DeskRecall ist derzeit nicht digital signiert. Beim ersten Start kann deshalb SmartScreen erscheinen. Das ist normal. Wenn SmartScreen warnt, prüfe bitte zuerst die Downloadquelle. Sicherheitswarnungen sollten nicht ungeprüft umgangen werden.</li>
      <li>Windows ist eine Marke der Microsoft Corporation.</li>
    </ul>
  </aside>

  <section class="dr-facts" aria-labelledby="anforderungen-title">
    <div>
      <p class="dr-label">SYSTEMANFORDERUNGEN</p>
      <h2 id="anforderungen-title">Voraussetzungen</h2>
      <ul>
        <li>Setzt Windows 11 voraus.</li>
        <li>Unter Windows 10 nur eingeschränkt nutzbar: Fensterpositionen können gesetzt werden, das Verschieben zwischen virtuellen Desktops ist dort nicht vorgesehen.</li>
        <li>Portable Version, ohne Installation. Die Datei auf der Release-Seite entpacken und DeskRecall.exe starten.</li>
      </ul>
    </div>
    <div>
      <p class="dr-label">DOWNLOAD</p>
      <h2>Version 1.1.0</h2>
      <p>Der Download führt zur aktuellen GitHub-Release-Seite. Die Adresse bleibt gleich, auch wenn sich die Dateinamen einzelner Versionen ändern.</p>
      <div class="dr-actions">
        <a class="dr-btn dr-btn-primary" href="<?=e($download)?>">Aktuelle Version laden <span aria-hidden="true">↓</span></a>
        <a class="dr-btn" href="<?=e($source)?>" target="_blank" rel="noopener">Quellcode auf GitHub <span aria-hidden="true">↗</span></a>
      </div>
      <p class="dr-credit">Willi Gering, Gering Digital. <a href="<?=e($license)?>" target="_blank" rel="noopener">Alle Rechte vorbehalten</a>.</p>
    </div>
  </section>
</main>

<footer>
  <span>© <?=$year?> Willi Gering, Gering Digital</span>
  <span><a href="../impressum.php">Impressum</a> · <a href="../datenschutz.php#deskrecall">Datenschutz</a></span>
</footer>
</body>
</html>
