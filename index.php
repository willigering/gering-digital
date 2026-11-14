<?php
require __DIR__.'/dau_lib.php';
$db = db();
$apps = $db->query("SELECT * FROM apps WHERE published=1 ORDER BY sort_order, id DESC")->fetchAll(PDO::FETCH_ASSOC);
// DAU-TO-PRO-Lernmodule erscheinen nur auf /dau-to-pro/, hier steht stattdessen die eine DAU-TO-PRO-Karte unter „Sonstiges“.
$webPages = $db->query("SELECT * FROM html_pages WHERE published=1 AND IFNULL(category,'')<>'lernen' ORDER BY updated_at DESC,id DESC")->fetchAll(PDO::FETCH_ASSOC);
foreach ($webPages as $page) {
    $preview=['src'=>$page['preview_image']??'','fit'=>$page['preview_fit']??'cover','x'=>(int)($page['preview_x']??50),'y'=>(int)($page['preview_y']??0)];
    $apps[]=['is_html'=>true,'name'=>$page['title'],'short_description'=>$page['description'],
       'category'=>$page['category'],'status'=>'web','icon'=>'assets/gering-digital-logo-icon.png',
       'play_url'=>'','apple_url'=>'','slug'=>$page['slug'],'preview_image'=>$preview['src'],
       'preview_fit'=>$preview['fit']==='contain'?'contain':'cover','preview_x'=>$preview['x'],'preview_y'=>$preview['y']];
}
$statusLabels=['entwicklung'=>'In Entwicklung','bald_verfuegbar'=>'Bald verfügbar','google'=>'Bei Google Play','apple'=>'Im Apple App Store','both'=>'Google Play & Apple App Store','web'=>'Online im Browser'];
$categories=project_categories();
unset($categories['lernen']); // kein eigener Filter mehr: DAU TO PRO läuft unter „Sonstiges“
$categoryCounts=array_fill_keys(array_keys($categories),0);
foreach ($apps as $app) {
    $category=$app['category']??'apps';
    $categoryCounts[array_key_exists($category,$categories)?$category:'apps']++;
}
$categoryCounts['sonstiges']++; // DAU-TO-PRO-Karte
?>
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gering Digital – Meine Apps & Programme</title>
<meta name="description" content="Gering Digital ist die persönliche Plattform von Willi: selbst entwickelte Apps und Programme aus Alltagsproblemen, Neugier und Vibe Coding.">
<link rel="stylesheet" href="style.css?v=<?=filemtime(__DIR__.'/style.css')?>">
<link rel="stylesheet" href="assets/personal.css?v=<?=filemtime(__DIR__.'/assets/personal.css')?>">
<link rel="stylesheet" href="assets/dtp-entry.css?v=<?=filemtime(__DIR__.'/assets/dtp-entry.css')?>">
<link rel="stylesheet" href="assets/home-v3.css?v=<?=filemtime(__DIR__.'/assets/home-v3.css')?>">
<link rel="icon" type="image/png" sizes="64x64" href="assets/favicon-64.png">
<link rel="preload" as="image" type="image/webp" href="assets/gering-digital-logo-icon-312.webp" media="(max-width:800px)">

</head>
<body>
<a class="skip-link" href="#apps">Zum Inhalt</a>
<div class="ambient ambient-1" data-parallax="0.10"></div>
<div class="ambient ambient-2" data-parallax="-0.06"></div>
<div class="ambient ambient-3" data-parallax="0.16"></div>
<div class="grain"></div>
<div class="gdv3-world" aria-hidden="true"></div>
<div class="gdv3-scroll-progress" aria-hidden="true"></div>

<header class="nav glass-nav">
  <div class="wrap navin">
    <a class="brand" href="#top" aria-label="Gering Apps Startseite">
      <picture><source media="(max-width:800px)" type="image/webp" srcset="assets/gering-digital-logo-icon-312.webp"><img class="brand-logo" src="assets/gering-digital-logo-icon.png" alt="Gering Digital Logo"></picture>
      <span><strong>GERING <em>DIGITAL</em></strong><small>EIGENE IDEEN · EIGENE APPS</small></span>
    </a>
    <nav class="desktop-nav" aria-label="Hauptnavigation">
      <a href="#top">Startseite</a>
      <a href="#ueber-mich">Über mich</a>
      <a href="#leistungen">Wie ich entwickle</a>
      <a class="dtp-nav-link" href="dau-to-pro/">DAU TO PRO</a>
    </nav>
    <a class="btn small desktop-cta" href="#apps">Meine Projekte <b>→</b></a>
    <button class="mobile-menu-btn" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Menü öffnen"><span></span><span></span><span></span></button>
    <nav class="mobile-menu" id="mobile-menu" aria-hidden="true" aria-label="Mobile Navigation">
      <a href="#top">Startseite</a>
      <a href="#apps">Meine Projekte</a>
      <a href="dau-to-pro/">DAU TO PRO</a>
      <a href="#ueber-mich">Über mich</a>
      <a href="#leistungen">Wie ich entwickle</a>
    </nav>
  </div>
</header>
<main id="top">
<section class="hero parallax-section" id="home">
  <div class="hero-lines"></div>
  <div class="hero-grid wrap">
    <div class="hero-copy gdv3-hero-copy" data-parallax="0.05">
      <p class="eyebrow gdv3-kicker">EIGENE APPS · PROGRAMME · EXPERIMENTE</p>
      <h1 class="pd-hero-title gdv3-hero-title">ICH BAUE,<br><span>WAS MIR</span><br><span class="gdv3-outline">FEHLT.</span></h1>
      <p class="gdv3-hero-description">Mich nerven Dinge, die einfacher gehen müssten. Also entwickle ich Lösungen dafür. Apps, Lernprogramme und digitale Experimente – manchmal nützlich, manchmal einfach, weil ich wissen will, ob es geht.</p>
      <div class="gdv3-hero-actions"><a class="btn" href="#apps">Projekte entdecken <b aria-hidden="true">↗</b></a><a class="gdv3-subtle-link" href="#ueber-mich">Die Geschichte dahinter <span aria-hidden="true">↓</span></a></div>
      <p class="gdv3-hero-meta"><span class="gdv3-light-dot" aria-hidden="true"></span> UNABHÄNGIG ENTWICKELT <span aria-hidden="true">✦</span> MIT NEUGIER GEBAUT</p>
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
        <div class="phone-back" aria-hidden="true"><div class="phone-camera"><i></i><i></i><i></i><i></i></div><picture><source media="(max-width:800px)" type="image/webp" srcset="assets/gering-digital-logo-icon-312.webp"><img src="assets/gering-digital-logo-icon.png" alt=""></picture></div>
        <div class="phone-frame"><span class="phone-edge-glint" aria-hidden="true"></span>
          <div class="phone-side-button button-a"></div><div class="phone-side-button button-b"></div>
          <div class="phone-screen">
            <div class="phone-notch"></div>
            <div class="appbar phone-brandbar"><div class="phone-brand-lockup"><picture><source media="(max-width:800px)" type="image/webp" srcset="assets/gering-digital-logo-icon-312.webp"><img src="assets/gering-digital-logo-icon.png" alt="Gering Digital"></picture><strong>Gering Digital</strong></div><span>☰</span></div>
            <div class="phone-clock-block" aria-label="Aktuelle Uhrzeit">
              <div class="phone-tagline">DIGITALE IDEEN · REALE LÖSUNGEN.</div>
              <time id="phone-digital-clock" class="phone-digital-clock" datetime="">00:00:00</time>
            </div>
            <div class="contact-hero pd-phone-fill">
              <small>DIGITALE IDEEN · SOFTWARE · APPS</small>
              <h3>Neugierig?<br><em>Sieh dich um!</em></h3>
              <p>Apps, Lernprogramme und digitale Experimente.<br>Alles aus eigener Neugier entstanden.</p>
            </div>
            <div class="phone-contact-hit pd-phone-fill"><a class="phone-contact" href="#apps"><span class="mail-icon">▦</span><strong>Projekte entdecken</strong><b>→</b></a></div>
            <div class="phone-tabs" aria-label="Navigation">
              <a href="#apps"><span class="active">▦<small>Apps</small></span></a>
              <a href="#leistungen"><span>⌘<small>Entwicklung</small></span></a>
              <a href="#ueber-mich"><span>◉<small>Über mich</small></span></a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
      <button class="phone-spin-control" type="button" aria-label="Smartphone einmal drehen">↔ Zum Drehen ziehen</button>
  <div class="scroll-hint"><span></span>SCROLL FÜR MEHR</div>
</section>

<section class="section apps-section">
  <div class="wrap">
    <div id="apps" class="apps-panel gdv3-projects" data-parallax="0.025">
      <div class="gdv3-section-heading" data-gdv3-reveal>
        <div><span class="gdv3-section-index">01 / DAS PORTFOLIO</span><h2>Hier wird gebaut.<br><em>Nicht nur geredet.</em></h2></div>
        <p>Apps, Lernprogramme und Werkzeuge – entstanden aus eigenen Ideen und echten Alltagsproblemen.</p>
      </div>
      <div class="gdv3-gold-rule" aria-hidden="true"></div>
      <div class="catalog-filters" role="group" aria-label="Projekte nach Kategorie filtern">
        <button type="button" class="catalog-filter is-active" data-category="alle" aria-pressed="true">Alle Projekte <span><?=count($apps)+1?></span></button>
        <?php foreach($categories as $key=>$label): ?>
        <button type="button" class="catalog-filter" data-category="<?=e($key)?>" aria-pressed="false"><?=e($label)?> <span><?= (int)$categoryCounts[$key] ?></span></button>
        <?php endforeach; ?>
      </div>
      <p id="catalog-empty" class="catalog-empty" role="status" hidden>Hier ist noch nichts gelandet. Aber die Ideen stehen schon Schlange. 😎</p>
      <div class="cards gdv3-project-grid">
        <article class="card glass-card app-card dtp-portal-card" data-category="sonstiges">
          <a class="dtp-portal-hit" href="dau-to-pro/" aria-label="DAU TO PRO – Lernplattform öffnen"></a>
          <div class="dtp-portal-art"><img src="assets/dau-to-pro-page-preview.webp" loading="lazy" width="640" height="360" alt=""></div>
          <div class="card-body"><span class="category-badge">Lernplattform</span><h3>DAU TO PRO</h3>
          <p>Von Null Plan zu echtem IT-Verständnis. Interaktive Lernprogramme, Übungsaufgaben und Prüfungsvorbereitung.</p>
          <span class="dtp-portal-cta">Lernplattform öffnen <b>↗</b></span></div>
        </article>
      <?php foreach($apps as $app): $preview='assets/app-previews/'.basename($app['icon']).'.webp'; $icon=is_file(__DIR__.'/'.$preview)?$preview:$app['icon']; $st=$app['status']??($app['play_url']?'google':'bald_verfuegbar'); ?>
        <article class="card glass-card app-card<?=!empty($app['is_html'])?' html-clickable-card':''?>" data-category="<?=e(array_key_exists($app['category']??'apps',$categories)?$app['category']:'apps')?>">
          <?php if(!empty($app['is_html'])): ?><a class="html-card-link" href="/<?=rawurlencode($app['slug'])?>/" aria-label="<?=e($app['name'])?> – im Browser öffnen"></a><?php endif; ?>
          <div class="icon-wrap<?=!empty($app['is_html'])&&!empty($app['preview_image'])?' html-preview-wrap':''?>">
            <?php if(!empty($app['is_html'])&&!empty($app['preview_image'])): ?>
              <img class="html-preview-image" loading="lazy" decoding="async" src="<?=e($app['preview_image'])?>" alt="Vorschaubild: <?=e($app['name'])?>" style="--thumb-fit:<?=e($app['preview_fit']??'cover')?>;--thumb-x:<?=(int)($app['preview_x']??50)?>%;--thumb-y:<?=(int)($app['preview_y']??0)?>%">
            <?php elseif(!empty($app['is_html'])): ?>
              <div class="html-project-icon" aria-hidden="true">&lt;/&gt;</div>
            <?php else: ?>
              <img loading="lazy" width="164" height="164" class="appicon" src="<?=e($icon)?>" alt="<?=e($app['name'])?>">
            <?php endif; ?>
          </div>
          <div class="card-body"><span class="category-badge"><?=e($categories[$app['category']??'apps']??'Android-Apps')?></span><h3><?=e($app['name'])?></h3><p><?=e($app['short_description'])?></p>
          <div class="app-status status-<?=e($st)?>"><?=e($statusLabels[$st]??$st)?></div>
          <?php if(empty($app['is_html'])): ?>
          <button class="app-details" type="button" aria-expanded="true">Details ausblenden <span>−</span></button><div class="store-links">
          <?php if(in_array($st,['google','both'],true) && $app['play_url']): ?><a class="store" href="<?=e($app['play_url'])?>" target="_blank" rel="noopener">Google Play <b>↗</b></a><?php endif; ?>
          <?php if(in_array($st,['apple','both'],true) && !empty($app['apple_url'])): ?><a class="store" href="<?=e($app['apple_url'])?>" target="_blank" rel="noopener">Apple App Store <b>↗</b></a><?php endif; ?>
          <?php if($st==='bald_verfuegbar'): ?><span class="store muted">Bald verfügbar</span><?php endif; ?>
          <?php if($st==='entwicklung'): ?><span class="store muted">In Entwicklung</span><?php endif; ?>
          </div>
          <?php else: ?><span class="html-card-cta" aria-hidden="true">Im Browser öffnen <b>↗</b></span>
          <?php endif; ?>
          </div>
        </article>
      <?php endforeach; ?>
      </div>
    </div>
  </div>
</section>

<section id="ueber-mich" class="section gdv3-about-section">
  <div class="wrap gdv3-about-grid">
    <div class="gdv3-about-copy" data-gdv3-reveal>
      <span class="gdv3-section-index">02 / DER MENSCH DAHINTER</span>
      <h2>20 Jahre<br>Produktion.<br><em>Jetzt Bits<br>und Bytes.</em></h2>
      <p>Nach fast zwei Jahrzehnten in der Produktion habe ich einen Neustart gewagt: die Umschulung zum Fachinformatiker für Systemintegration. <strong>Ich habe nicht bei null angefangen – nur bei einem völlig anderen Thema.</strong></p>
      <div class="gdv3-about-facts"><div><b>20</b><span>Jahre Produktion</span></div><div><b>∞</b><span>Neue Ideen</span></div></div>
    </div>
    <div class="gdv3-timeline" data-gdv3-reveal>
      <div class="gdv3-time-item"><h3>Erst mal anpacken.</h3><p>Fast 20 Jahre Produktion haben mich geprägt: anpacken, umdenken und gute Kollegen schätzen.</p></div>
      <div class="gdv3-time-item"><h3>Einfach mal anfangen.</h3><p>Aus einem Experiment wurde meine erste App. Die nächste ließ nicht lange auf sich warten.</p></div>
      <div class="gdv3-time-item"><h3>Noch mal was Neues.</h3><p>Heute lerne ich Netzwerke, Server und Systemintegration – und entwickle weiter eigene Projekte.</p></div>
      <div class="gdv3-terminal"><span aria-hidden="true">● ● ●</span><code>&gt; status: neugierig<br>&gt; modus: lernen + bauen<br>&gt; motivation: immer noch vorhanden_</code></div>
    </div>
  </div>
</section>

<section id="leistungen" class="section gdv3-process-section">
  <div class="feature-orbit orbit-a" data-parallax="0.13"></div>
  <div class="feature-orbit orbit-b" data-parallax="-0.08"></div>
  <div class="wrap">
    <div class="gdv3-section-heading" data-gdv3-reveal>
      <div><span class="gdv3-section-index">03 / WIE ICH ENTWICKLE</span><h2>Meine Idee.<br><em>KI als Werkzeug.</em></h2></div>
      <p>Die Ideen und Entscheidungen kommen von mir. KI hilft beim Code. Prüfen, verstehen und verbessern übernehme ich selbst.</p>
    </div>
    <div class="gdv3-process-grid">
      <article class="gdv3-step" data-gdv3-reveal><span>01</span><h3>Problem finden.</h3><p>Etwas nervt oder fehlt. Ich überlege, wie es besser gehen könnte.</p><small>DENKEN / KONZIPIEREN</small></article>
      <article class="gdv3-step" data-gdv3-reveal><span>02</span><h3>Lösung bauen.</h3><p>Mit KI-Unterstützung wird aus der Idee ein funktionierender Prototyp.</p><small>BAUEN / AUSPROBIEREN</small></article>
      <article class="gdv3-step" data-gdv3-reveal><span>03</span><h3>Nachbessern.</h3><p>Testen, Fehler finden, nachbessern. Bis die Anwendung tut, was sie soll.</p><small>PRÜFEN / VERBESSERN</small></article>
    </div>
    <div class="gdv3-process-caption" data-gdv3-reveal><strong>„Mein Werkzeug. <em>Nicht mein Autopilot.</em>“</strong><span>Auch wenn die KI manchmal die Aufgabenstellung überliest.</span></div>
  </div>
</section>

<section id="warum" class="section gdv3-end-section">
  <div class="wrap">
    <div class="gdv3-end-content" data-gdv3-reveal>
      <span class="gdv3-section-index">WARUM ICH MEINE PROJEKTE TEILE</span>
      <h2>Gute Ideen gehören nicht<br><em>in die Schublade.</em></h2>
      <p>Wenn eine App mir hilft, kann sie vielleicht auch anderen nützen. Deshalb teile ich meine Projekte – fertige und unfertige.</p>
      <div class="gdv3-end-actions"><a class="btn" href="#apps">Projekte ansehen <b>↗</b></a><a class="gdv3-subtle-link" href="dau-to-pro/">DAU TO PRO entdecken <span>↗</span></a></div>
    </div>
  </div>
</section>

</main>

<footer><div class="wrap footer"><a class="brand" href="#top"><picture><source media="(max-width:800px)" type="image/webp" srcset="assets/gering-digital-logo-icon-312.webp"><img class="brand-logo" src="assets/gering-digital-logo-icon.png" alt="Gering Digital Logo"></picture><span><strong>GERING <em>DIGITAL</em></strong><small>Eigene Ideen. Echte Probleme. Digitale Lösungen.</small></span></a><p class="pd-footer-quote">„Entstanden aus Neugier, einer Portion Hartnäckigkeit und der Frage: Kann man das nicht irgendwie einfacher machen?“</p><div><a href="impressum.php">Impressum</a> · <a href="datenschutz.php">Datenschutz</a> · <a href="admin/">Admin</a></div><small>© <?=date('Y')?> Gering Digital</small></div></footer>

<script src="assets/site.js?v=<?=filemtime(__DIR__.'/assets/site.js')?>" defer></script>
<script src="assets/home-v3.js?v=<?=filemtime(__DIR__.'/assets/home-v3.js')?>" defer></script>
</body></html>
