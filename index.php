<?php
require __DIR__.'/lib.php';
$db = db();
$apps = $db->query("SELECT * FROM apps WHERE published=1 ORDER BY sort_order, id DESC")->fetchAll();
$statusLabels=['entwicklung'=>'In Entwicklung','bald_verfuegbar'=>'Bald verfügbar','google'=>'Bei Google Play','apple'=>'Im Apple App Store','both'=>'Google Play & Apple App Store'];
?>
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gering Digital – Apps & Software</title>
<meta name="description" content="Gering Digital entwickelt moderne Apps und individuelle Softwarelösungen.">
<link rel="stylesheet" href="style.css">
<link rel="icon" type="image/png" href="assets/gering-digital-logo-icon.png">

</head>
<body>
<a class="skip-link" href="#apps">Zum Inhalt</a>
<div class="ambient ambient-1" data-parallax="0.10"></div>
<div class="ambient ambient-2" data-parallax="-0.06"></div>
<div class="ambient ambient-3" data-parallax="0.16"></div>
<div class="grain"></div>

<header class="nav glass-nav">
  <div class="wrap navin">
    <a class="brand" href="#top" aria-label="Gering Apps Startseite">
      <img class="brand-logo" src="assets/gering-digital-logo-icon.png" alt="Gering Digital Logo">
      <span><strong>GERING <em>DIGITAL</em></strong><small>IDEEN · APPS · SOFTWARE</small></span>
    </a>
    <nav class="desktop-nav"><a href="#apps">Apps</a><a href="#leistungen">Entwicklung</a><a href="#anfrage">Anfrage</a><a href="impressum.php">Impressum</a></nav>
    <a class="btn small desktop-cta" href="#anfrage">Projekt starten <b>→</b></a>
    <button class="mobile-menu-btn" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Menü öffnen"><span></span><span></span><span></span></button>
    <nav class="mobile-menu" id="mobile-menu" aria-hidden="true"><a href="#apps">Apps</a><a href="#leistungen">Entwicklung</a><a href="#anfrage">Anfrage</a><a href="impressum.php">Impressum</a></nav>
  </div>
</header>
<main id="top">
<section class="hero parallax-section" id="home">
  <div class="hero-lines"></div>
  <div class="hero-grid wrap">
    <div class="hero-copy" data-parallax="0.05">
      <p class="eyebrow">APPS · SOFTWARE · LÖSUNGEN</p>
      <h1>Kleine Ideen.<br><span>Große Wirkung.</span></h1>
      <p class="lead">Ich entwickle moderne Apps und Softwarelösungen, die funktionieren, begeistern und einen echten Mehrwert bieten.</p>
      <div class="actions"><a class="btn" href="#apps">Apps entdecken <b>→</b></a><a class="btn ghost" href="#anfrage">App entwickeln lassen</a></div>
      <div class="trust"><span>✦ Modern</span><span>◈ Zuverlässig</span><span>⌁ Persönlich</span></div>
    </div>

    <div class="hero-stage">
      <div class="depth-ring ring-1" data-parallax="0.05"></div>
      <div class="depth-ring ring-2" data-parallax="-0.08"></div>
      <div class="stage-grid" data-parallax="0.025"></div>
      <div class="phone-glow" data-parallax="0.10"></div>
      <div class="phone-orbit orbit-gold" data-parallax="-0.06"></div>
      <div class="phone-orbit orbit-cyan" data-parallax="0.08"></div>

      <div class="phone phone-locked" data-parallax="0.20">
        <div class="phone-volume" aria-hidden="true"></div>
        <div class="phone-back" aria-hidden="true"><div class="phone-camera"><i></i><i></i><i></i><i></i></div><img src="assets/gering-digital-logo-icon.png" alt=""></div>
        <div class="phone-frame"><span class="phone-edge-glint" aria-hidden="true"></span>
          <div class="phone-side-button button-a"></div><div class="phone-side-button button-b"></div>
          <div class="phone-screen">
            <div class="phone-notch"></div>
            <div class="appbar phone-brandbar"><div class="phone-brand-lockup"><img src="assets/gering-digital-logo-icon.png" alt="Gering Digital"><strong>Gering Digital</strong></div><span>☰</span></div>
            <div class="phone-clock-block" aria-label="Aktuelle Uhrzeit">
              <div class="phone-tagline">DIGITALE IDEEN · REALE LÖSUNGEN.</div>
              <time id="phone-digital-clock" class="phone-digital-clock" datetime="">00:00:00</time>
            </div>
            <div class="contact-hero">
              <small>DIGITALE IDEEN · SOFTWARE · APPS</small>
              <h3>Lass uns etwas<br><em>entwickeln!</em></h3>
              <p>Du hast eine Idee?<br>Ich freue mich auf deine Nachricht.</p>
            </div>
            <div class="phone-contact-hit"><a class="phone-contact" href="#anfrage"><span class="mail-icon">✉</span><strong>Zum Kontaktformular</strong><b>→</b></a></div>
            <div class="phone-mini-cards">
              <div><span>◇</span><small>Idee<br>besprechen</small></div>
              <div><span>◉</span><small>Lösung<br>entwickeln</small></div>
              <div><span>↗</span><small>Gemeinsam<br>umsetzen</small></div>
            </div>
            <div class="phone-signature">Deine Idee.<br><em>Mein Code.</em></div>
            <div class="phone-tabs" aria-label="Navigation">
              <a href="#apps"><span class="active">▦<small>Apps</small></span></a>
              <a href="#leistungen"><span>⌘<small>Entwicklung</small></span></a>
              <a href="#anfrage"><span>✉<small>Kontakt</small></span></a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
      <button class="phone-spin-control" type="button" aria-label="Smartphone einmal drehen">↔ Zum Drehen ziehen</button>
  <div class="scroll-hint"><span></span>SCROLL FÜR MEHR</div>
</section>

<section id="apps" class="section apps-section">
  <div class="wrap">
    <div class="glass-panel apps-panel" data-parallax="0.025">
      <div class="section-head"><div><p class="eyebrow">MEINE APPS</p><h2>Apps im <span>Überblick.</span></h2></div><p>Praktische und kreative Apps – entwickelt mit Leidenschaft.</p></div>
      <div class="cards">
      <?php foreach($apps as $app): $preview='assets/app-previews/'.basename($app['icon']).'.webp'; $icon=is_file(__DIR__.'/'.$preview)?$preview:$app['icon']; $st=$app['status']??($app['play_url']?'google':'bald_verfuegbar'); ?>
        <article class="card glass-card app-card" >
          <div class="icon-wrap"><img loading="lazy" decoding="async" width="164" height="164" class="appicon" src="<?=e($icon)?>" alt="<?=e($app['name'])?>"></div>
          <div class="card-body"><h3><?=e($app['name'])?></h3><p><?=e($app['short_description'])?></p>
          <div class="app-status status-<?=e($st)?>"><?=e($statusLabels[$st]??$st)?></div>
          <button class="app-details" type="button" aria-expanded="true">Details ausblenden <span>−</span></button><div class="store-links">
          <?php if(in_array($st,['google','both'],true) && $app['play_url']): ?><a class="store" href="<?=e($app['play_url'])?>" target="_blank" rel="noopener">Google Play <b>↗</b></a><?php endif; ?>
          <?php if(in_array($st,['apple','both'],true) && !empty($app['apple_url'])): ?><a class="store" href="<?=e($app['apple_url'])?>" target="_blank" rel="noopener">Apple App Store <b>↗</b></a><?php endif; ?>
          <?php if($st==='bald_verfuegbar'): ?><span class="store muted">Bald verfügbar</span><?php endif; ?>
          <?php if($st==='entwicklung'): ?><span class="store muted">In Entwicklung</span><?php endif; ?>
          </div></div>
        </article>
      <?php endforeach; ?>
      </div>
    </div>
  </div>
</section>

<section id="leistungen" class="section feature-section parallax-section">
  <div class="feature-orbit orbit-a" data-parallax="0.13"></div>
  <div class="feature-orbit orbit-b" data-parallax="-0.08"></div>
  <div class="wrap">
    <div class="glass-panel feature-panel" data-parallax="0.035">
      <div class="feature-content"><p class="eyebrow">APP-ENTWICKLUNG</p><h2>Deine Idee.<br><span>Meine Umsetzung.</span></h2><p class="lead narrow">Von der ersten Idee bis zur fertigen Anwendung: Konzeption, Entwicklung, Veröffentlichung und Weiterentwicklung aus einer Hand.</p>
      <div class="services"><div><i>01</i><b>Konzept</b><p>Idee und Anforderungen gemeinsam schärfen.</p></div><div><i>02</i><b>Design</b><p>Klare, moderne und intuitive Benutzeroberflächen.</p></div><div><i>03</i><b>Entwicklung</b><p>Saubere und zuverlässige technische Umsetzung.</p></div><div><i>04</i><b>Release</b><p>Begleitung bis zur Veröffentlichung und darüber hinaus.</p></div></div></div>
    </div>
  </div>
</section>


<section id="anfrage" class="section inquiry-section">
  <div class="wrap">
    <div class="glass-panel inquiry">
      <div class="inquiry-copy"><p class="eyebrow">PROJEKT STARTEN</p><h2>Lass uns etwas<br><span>entwickeln.</span></h2><p>Du hast eine App-Idee oder benötigst eine individuelle Softwarelösung? Erzähl mir davon.</p><div class="contact-note">✓ Unverbindlich &nbsp;&nbsp; ✓ Persönlich &nbsp;&nbsp; ✓ Direkt</div></div>
      <?php if(isset($_GET["sent"])): ?><p class="form-success" role="status">Vielen Dank! Deine Anfrage wurde gespeichert.</p><?php endif; ?>
      <form method="post" action="send.php" class="form glass-inner"><input type="hidden" name="csrf" value="<?=e(csrf())?>">
        <div class="form-row"><label>Name *<input name="name" required maxlength="100" placeholder="Dein Name"></label><label>E-Mail *<input type="email" name="email" required maxlength="180" placeholder="deine@email.de"></label></div>
        <label>Betreff<input name="subject" maxlength="180" placeholder="Worum geht es?"></label>
        <label>Nachricht *<textarea name="message" required maxlength="5000" rows="6" placeholder="Beschreibe kurz deine Idee oder dein Projekt …"></textarea></label>
        <label class="check"><input type="checkbox" name="privacy" required> <span>Ich habe die <a href="datenschutz.php">Datenschutzerklärung</a> gelesen. *</span></label>
        <button class="btn" type="submit">Anfrage senden <b>→</b></button>
      </form>
    </div>
  </div>
</section>
</main>

<footer><div class="wrap footer"><a class="brand" href="#top"><img class="brand-logo" src="assets/gering-digital-logo-icon.png" alt="Gering Digital Logo"><span><strong>GERING <em>DIGITAL</em></strong><small>IDEEN · APPS · SOFTWARE</small></span></a><div><a href="impressum.php">Impressum</a> · <a href="datenschutz.php">Datenschutz</a> · <a href="admin/">Admin</a></div><small>© <?=date('Y')?> Gering Digital</small></div></footer>

<script src="assets/site.js" defer></script>
</body></html>
