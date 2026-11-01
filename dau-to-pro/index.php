<?php
require_once __DIR__.'/../dau_lib.php';
$query=db()->prepare("SELECT slug,title,description,preview_image,preview_fit,preview_x,preview_y FROM html_pages WHERE published=1 AND category=? ORDER BY updated_at DESC,id DESC");
$query->execute(['lernen']);
$modules=$query->fetchAll(PDO::FETCH_ASSOC);
foreach($modules as &$module) {$module['topic']=dtp_topic($module);}unset($module);
$c=dtp_page_content();
$hero=dtp_hero();
$subtitle=dtp_subtitle_parts($c['subtitle']);
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090c0e">
  <meta name="description" content="<?=e($c['meta_description'])?>">
  <title><?=e($c['page_title'])?></title>
  <link rel="icon" type="image/png" href="../assets/favicon-64.png">
  <link rel="stylesheet" href="style.css?v=<?=filemtime(__DIR__.'/style.css')?>">
  <script src="site.js?v=<?=filemtime(__DIR__.'/site.js')?>" defer></script>
</head>
<body>
<div class="dtp-world-texture" aria-hidden="true"></div>
<div class="dtp-eternal-rays" aria-hidden="true">
  <svg id="dtp-full-page-rays" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 4800" preserveAspectRatio="none" focusable="false">
    <defs>
      <linearGradient id="dtp-line-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0" stop-color="#d88120" stop-opacity=".55"/>
        <stop offset=".36" stop-color="#ffc15e" stop-opacity=".92"/>
        <stop offset=".57" stop-color="#fff2c3" stop-opacity="1"/>
        <stop offset=".75" stop-color="#ffc366" stop-opacity=".9"/>
        <stop offset="1" stop-color="#ff9c29" stop-opacity=".35"/>
      </linearGradient>
    </defs>
    <g id="dtp-ray-strokes"></g>
  </svg>
</div>
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
    <a href="../index.php">Startseite</a><a href="./" aria-current="page">DAU TO PRO</a><a href="#lernmodule">Lernmodule</a><a href="#konzept">So funktioniert's</a><a href="../index.php#apps">Meine Projekte</a>
  </nav>
</header>
<main>
  <section class="hero">
    <div class="hazard hazard-left" aria-hidden="true"></div><div class="hazard hazard-right" aria-hidden="true"></div>
    <div class="hero-inner">
      <div class="kicker"><span class="live-dot"></span> <?=e($c['kicker_left'])?><?php if($c['kicker_left']!==''&&$c['kicker_right']!==''): ?> <b>//</b> <?php endif; ?><?=e($c['kicker_right'])?></div>
      <div class="hero-art-wrap" style="<?=e(dtp_hero_style($hero))?>"><img class="hero-logo" src="../<?=e($hero['src'])?>" width="<?=(int)$hero['width']?>" height="<?=(int)$hero['height']?>" fetchpriority="high" decoding="async" alt="<?=e($c['hero_alt'])?>"></div>
      <div class="hero-tagline">
        <h1><?=e($c['title'])?><?php if($c['title_highlight']!==''): ?> <span><?=e($c['title_highlight'])?></span><?php endif; ?></h1>
      </div>
      <?php if($subtitle): ?><div class="hero-strip"><?php foreach($subtitle as $i=>$part): ?><?php if($i>0): ?><i aria-hidden="true"></i><?php endif; ?><span><?=e(dtp_upper($part))?></span><?php endforeach; ?></div><?php endif; ?>
      <p class="hero-lead"><?=dtp_inline($c['lead'])?></p>
      <div class="hero-actions"><a class="primary-action" href="#lernmodule"><?=e($c['cta_primary'])?> <span aria-hidden="true">↓</span></a><a class="secondary-action" href="#konzept"><?=e($c['cta_secondary'])?> <span aria-hidden="true">↗</span></a></div>
      <div class="hero-meta"><span><b><?=count($modules)?></b> <?=count($modules)===1?'veröffentlichtes Lernmodul':'veröffentlichte Lernmodule'?></span><?php foreach([$c['meta_1'],$c['meta_2']] as $meta): if($meta==='')continue; ?><span><?=e($meta)?></span><?php endforeach; ?></div>
    </div>
  </section>
<section class="dtp-disclaimer" id="hinweis" aria-labelledby="dtp-disclaimer-title">
  <div class="disclaimer-shell">
    <div class="disclaimer-label"><span class="disclaimer-icon" aria-hidden="true">!</span><span><?=e($c['disclaimer_label'])?></span></div>
    <h2 id="dtp-disclaimer-title"><?=e($c['disclaimer_title'])?></h2>
    <p><?=dtp_inline($c['disclaimer_p1'])?></p>
    <?php if($c['disclaimer_p2']!==''): ?><p><?=dtp_inline($c['disclaimer_p2'])?></p><?php endif; ?>
    <?php if($c['disclaimer_p3']!==''): ?><p class="disclaimer-final"><?=dtp_inline($c['disclaimer_p3'])?></p><?php endif; ?>
  </div>
</section>
  <section class="catalog-section" id="lernmodule" aria-labelledby="modules-title">
    <div class="section-shell">
      <div class="section-heading"><div><span class="eyebrow"><?=e($c['modules_eyebrow'])?></span><h1 id="modules-title"><?=e($c['modules_title'])?><?php if($c['modules_title_highlight']!==''): ?> <span><?=e($c['modules_title_highlight'])?></span><?php endif; ?></h1><?php if($c['modules_intro']!==''): ?><p><?=dtp_inline($c['modules_intro'])?></p><?php endif; ?></div><div class="section-mark" aria-hidden="true">&lt;/&gt;</div></div>
      <section class="exam-finder" aria-labelledby="exam-title">
        <span class="exam-eyebrow">⌕ &nbsp; <?=e($c['finder_eyebrow'])?></span>
        <h2 id="exam-title"><?=e($c['finder_title'])?><?php if($c['finder_title_highlight']!==''): ?> <em><?=e($c['finder_title_highlight'])?></em><?php endif; ?></h2>
        <?php if($c['finder_intro']!==''): ?><p><?=dtp_inline($c['finder_intro'])?></p><?php endif; ?>
        <form id="exam-form" role="search">
          <label for="exam-topics"><?=e($c['finder_label'])?></label>
          <div class="exam-input-row"><input id="exam-topics" type="search" maxlength="260" placeholder="<?=e($c['finder_placeholder'])?>" autocomplete="off">
          <button type="submit"><?=e($c['finder_button'])?> <span aria-hidden="true">→</span></button></div>
        </form>
        <div class="exam-examples"><span>PROBIER MAL:</span>
          <button type="button" data-example="OSI, VLAN, Router">Netzwerke</button>
          <button type="button" data-example="IPv4, Subnetting, Binär">IPv4 &amp; Subnetting</button>
          <button type="button" data-example="DSGVO, Hash, Verschlüsselung">IT-Sicherheit</button>
        </div>
        <div class="exam-feedback" aria-live="polite"><strong id="result-indicator"><?=count($modules)?> <?=count($modules)===1?'Modul':'Module'?> verfügbar</strong><button id="exam-reset" type="button" hidden>Suche zurücksetzen ×</button></div>
      </section>
      <div class="catalog-panel">
        
        <div class="filterbar" role="group" aria-label="Lernmodule nach Thema filtern">
          <button type="button" class="filter-btn active" data-filter="alle" aria-pressed="true">Alle Module</button><button type="button" class="filter-btn" data-filter="subnet" aria-pressed="false">IP &amp; Subnetting</button><button type="button" class="filter-btn" data-filter="netzwerk" aria-pressed="false">Netzwerke</button><button type="button" class="filter-btn" data-filter="sicherheit" aria-pressed="false">IT-Sicherheit</button><button type="button" class="filter-btn" data-filter="pruefung" aria-pressed="false">Prüfung</button><button type="button" class="filter-btn" data-filter="sonstiges" aria-pressed="false">Grundlagen</button>        </div>
                  <?php if (!$modules): ?>
<div class="empty-state"><h2><?=e($c['empty_title'])?></h2><?php if($c['empty_text']!==''): ?><p><?=dtp_inline($c['empty_text'])?></p><?php endif; ?></div>
<?php else: ?>
<div class="module-grid" id="module-grid">
<?php foreach($modules as $module): ?>
<?=dtp_module_card($module,'../')?>
<?php endforeach; ?>
</div>
<p id="search-empty" class="search-empty" hidden>Keine Module gefunden. Versuche einen anderen Suchbegriff oder Themenfilter.</p>
<?php endif; ?>
              </div>
    </div>
  </section>
  <section class="method-section" id="konzept" aria-labelledby="method-title">
    <div class="section-shell"><div class="section-heading"><div><span class="eyebrow"><?=e($c['method_eyebrow'])?></span><h2 id="method-title"><?=e($c['method_title'])?><?php if($c['method_title_highlight']!==''): ?> <span><?=e($c['method_title_highlight'])?></span><?php endif; ?></h2><?php if($c['method_intro']!==''): ?><p><?=dtp_inline($c['method_intro'])?></p><?php endif; ?></div></div>
      <div class="steps">
        <?php foreach([['01','◎',1],['02','⌘',2],['03','◷',3]] as [$no,$symbol,$n]): ?>
        <article class="step"><span class="step-no"><?=$no?></span><div class="step-symbol"><?=$symbol?></div><h3><?=e($c['step'.$n.'_title'])?></h3><?php if($c['step'.$n.'_text']!==''): ?><p><?=dtp_inline($c['step'.$n.'_text'])?></p><?php endif; ?><?php if($c['step'.$n.'_key']!==''): ?><span class="step-key"><?=e($c['step'.$n.'_key'])?></span><?php endif; ?></article>
<?php endforeach; ?>
      </div>
    </div>
  </section>
  <section class="end-cap"><div class="section-shell"><div class="end-cap-content"><span class="eyebrow"><?=e($c['end_eyebrow'])?></span><h2><?=e($c['end_title'])?><?php if($c['end_title_highlight']!==''): ?><br><em><?=e($c['end_title_highlight'])?></em><?php endif; ?></h2><?php if($c['end_text']!==''): ?><p><?=dtp_inline($c['end_text'])?></p><?php endif; ?><a class="primary-action" href="#lernmodule"><?=e($c['end_cta'])?> <span aria-hidden="true">↑</span></a></div></div></section>
</main>
<footer class="dtp-footer"><div class="footer-inner"><a href="../index.php" class="footer-brand"><strong>GERING <em>DIGITAL</em></strong><small>DAU TO PRO · Ein Projekt von Gering Digital</small></a><div class="footer-links"><a href="../index.php">Zurück zu Gering Digital</a><a href="../impressum.php">Impressum</a><a href="../datenschutz.php">Datenschutz</a><a href="#hinweis">Wichtiger Hinweis</a></div><small>© 2026 Willi Gering</small></div></footer>
</body></html>