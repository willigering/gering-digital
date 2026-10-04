<?php
require_once __DIR__ . '/lib.php';
?>
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Impressum – Gering Digital</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="site-header minimal-header">
  <a class="brand" href="index.php">
    <img class="brand-logo" src="assets/gering-digital-logo-icon.png" alt="Gering Digital GD Logo">
    <span><strong>GERING</strong> <em>DIGITAL</em></span>
  </a>
  <a class="nav-back" href="index.php">← Zurück</a>
</header>

<main class="legal-page">
  <section class="legal-hero section">
    <div class="section-kicker">RECHTLICHE INFORMATIONEN</div>
    <h1>Impressum</h1>
    <p class="legal-intro">Angaben zum Anbieter und zur Kontaktaufnahme von Gering Digital.</p>
  </section>

  <section class="legal-content section">
    <div class="legal-sheet">
      <div class="legal-sheet-head">
        <span>ANBIETERKENNZEICHNUNG</span>
        <small>Angaben gemäß § 5 DDG</small>
      </div>

      <div class="legal-grid">
        <section class="legal-block">
          <div class="legal-label">ANBIETER</div>
          <h2>Gering Digital</h2>
          <p class="legal-name">Willi Gering</p>
          <p>Hölderlinstr. 3<br>32791 Lage<br>Deutschland</p>
        </section>

        <section class="legal-block">
          <div class="legal-label">KONTAKT</div>
          <h2>Direkter Kontakt</h2>
          <p>Für Fragen, Projekte und geschäftliche Anfragen erreichst du mich direkt per E-Mail.</p>
          <p class="legal-contact"><a href="mailto:willi.gering@mail.de">willi.gering@mail.de</a></p>
        </section>

        <section class="legal-block legal-block-wide">
          <div class="legal-label">TÄTIGKEIT</div>
          <h2>Apps · Software · Websites</h2>
          <p>Entwicklung und Vertrieb von Apps, Software und Websites sowie damit verbundene digitale Dienstleistungen.</p>
        </section>
      </div>

      <div class="legal-meta">
        <div>
          <span class="legal-meta-label">UMSATZSTEUER</span>
          <p>Eine Umsatzsteuer-Identifikationsnummer wird ergänzt, sobald sie erteilt wurde.</p>
        </div>
      </div>
    </div>
  </section>
</main>

<footer><span>© <?= date('Y') ?> Gering Digital</span><span><a href="impressum.php">Impressum</a> · <a href="datenschutz.php">Datenschutz</a></span></footer>
</body>
</html>
