<?php
require_once __DIR__.'/../dau_lib.php';
require_once __DIR__.'/../learner_lib.php';
$learnerName=learner_current()['username']??null;
$query=db()->prepare("SELECT slug,title,description,preview_image,preview_fit,preview_x,preview_y FROM html_pages WHERE published=1 AND category=? ORDER BY updated_at DESC,id DESC");
$query->execute(['lernen']);
$modules=$query->fetchAll(PDO::FETCH_ASSOC);
foreach($modules as &$module) {$module['topic']=dtp_topic($module);}unset($module);
$c=dtp_page_content();
$hero=dtp_hero();
$subtitle=dtp_subtitle_parts($c['subtitle']);
$fx=dtp_hero_fx_attrs($hero);
$topicLabels=['subnet'=>'IP & Subnetting','netzwerk'=>'Netzwerke','sicherheit'=>'IT-Sicherheit','pruefung'=>'Prüfung','sonstiges'=>'Grundlagen'];
$topicCounts=array_count_values(array_column(array_column($modules,'topic'),0));
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
<?php if ($fx!==''): ?>  <link rel="stylesheet" href="hero-fx.css?v=<?=filemtime(__DIR__.'/hero-fx.css')?>">
  <script src="hero-fx.js?v=<?=filemtime(__DIR__.'/hero-fx.js')?>" defer></script>
<?php endif; ?>
</head>
<body class="dtp-landing">
<?=dtp_backdrop()?>
<a class="skip" href="#lernmodule">Direkt zu den Lernmodulen</a>
<?=dtp_nav('start',$learnerName)?>
<main>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-inner">
      <div class="hero-copy">
        <div class="kicker"><span class="live-dot" aria-hidden="true"></span> <?=e($c['kicker_left'])?><?php if($c['kicker_left']!==''&&$c['kicker_right']!==''): ?> <b>//</b> <?php endif; ?><?=e($c['kicker_right'])?></div>
        <h1 id="hero-title"><?=e($c['title'])?><?php if($c['title_highlight']!==''): ?> <span><?=e($c['title_highlight'])?></span><?php endif; ?></h1>
        <?php if($subtitle): ?><div class="hero-strip"><?php foreach($subtitle as $i=>$part): ?><?php if($i>0): ?><i aria-hidden="true"></i><?php endif; ?><span><?=e(dtp_upper($part))?></span><?php endforeach; ?></div><?php endif; ?>
        <p class="hero-lead"><?=dtp_inline($c['lead'])?></p>
        <div class="hero-actions"><a class="primary-action" href="#lernmodule"><?=e($c['cta_primary'])?> <span aria-hidden="true">↗</span></a><a class="secondary-action" href="#konzept"><?=e($c['cta_secondary'])?> <span aria-hidden="true">↓</span></a></div>
        <div class="hero-meta"><span><b><?=count($modules)?></b> <?=count($modules)===1?'Lernmodul':'Lernmodule'?></span><?php foreach([$c['meta_1'],$c['meta_2']] as $meta): if($meta==='')continue; ?><span><?=e($meta)?></span><?php endforeach; ?></div>
      </div>
      <div class="hero-visual">
        <div class="hero-art-wrap" style="<?=e(dtp_hero_style($hero))?>"<?=$fx?>><picture><?php if(!$hero['custom'] && is_file(__DIR__.'/../assets/dau-to-pro-hero-1448.webp') && is_file(__DIR__.'/../assets/dau-to-pro-hero-768.webp')): ?><source type="image/webp" srcset="../assets/dau-to-pro-hero-768.webp 768w, ../assets/dau-to-pro-hero-1448.webp 1448w" sizes="(min-width: 861px) 540px, (min-width: 611px) 480px, 360px"><?php endif; ?><img class="hero-logo" src="../<?=e($hero['src'])?>" width="<?=(int)$hero['width']?>" height="<?=(int)$hero['height']?>" fetchpriority="high" decoding="async" alt="<?=e($c['hero_alt'])?>"></picture></div>
      </div>
    </div>
  </section>
  <section class="finder-section" id="pruefungsfinder" aria-labelledby="exam-title">
    <div class="section-shell">
      <div class="exam-finder" data-reveal>
        <div class="exam-intro">
        <span class="exam-eyebrow">⌕ &nbsp; <?=e($c['finder_eyebrow'])?></span>
        <h2 id="exam-title"><?=e($c['finder_title'])?><?php if($c['finder_title_highlight']!==''): ?> <em><?=e($c['finder_title_highlight'])?></em><?php endif; ?></h2>
        <?php if($c['finder_intro']!==''): ?><p><?=dtp_inline($c['finder_intro'])?></p><?php endif; ?>
        </div>
        <div class="exam-controls">
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
        </div>
      </div>
    </div>
  </section>
  <section class="catalog-section" id="lernmodule" aria-labelledby="modules-title">
    <div class="section-shell">
      <div class="section-heading" data-reveal><div><span class="eyebrow"><?=e($c['modules_eyebrow'])?></span><h2 id="modules-title"><?=e($c['modules_title'])?><?php if($c['modules_title_highlight']!==''): ?> <span><?=e($c['modules_title_highlight'])?></span><?php endif; ?></h2><?php if($c['modules_intro']!==''): ?><p><?=dtp_inline($c['modules_intro'])?></p><?php endif; ?></div><span class="section-count"><?=count($modules)?> <?=count($modules)===1?'Modul':'Module'?></span></div>
      <div class="catalog-panel">
        <?php if($modules): ?>
        <div class="filterbar" role="group" aria-label="Lernmodule nach Thema filtern">
          <button type="button" class="filter-btn active" data-filter="alle" aria-pressed="true">Alle Module</button>
          <?php foreach($topicLabels as $topic=>$label): if(empty($topicCounts[$topic]))continue; ?>
          <button type="button" class="filter-btn" data-filter="<?=e($topic)?>" aria-pressed="false"><?=e($label)?></button>
          <?php endforeach; ?>
        </div>
        <?php endif; ?>
                  <?php if (!$modules): ?>
<div class="empty-state"><h2><?=e($c['empty_title'])?></h2><?php if($c['empty_text']!==''): ?><p><?=dtp_inline($c['empty_text'])?></p><?php endif; ?></div>
<?php else: ?>
<div class="module-grid" id="module-grid" data-count="<?=count($modules)?>">
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
    <div class="section-shell"><div class="section-heading" data-reveal><div><span class="eyebrow"><?=e($c['method_eyebrow'])?></span><h2 id="method-title"><?=e($c['method_title'])?><?php if($c['method_title_highlight']!==''): ?> <span><?=e($c['method_title_highlight'])?></span><?php endif; ?></h2><?php if($c['method_intro']!==''): ?><p><?=dtp_inline($c['method_intro'])?></p><?php endif; ?></div></div>
      <div class="steps">
        <?php foreach([['01','◎',1],['02','⌘',2],['03','◷',3]] as [$no,$symbol,$n]): ?>
        <article class="step" data-reveal><span class="step-no"><?=$no?></span><div class="step-symbol"><?=$symbol?></div><h3><?=e($c['step'.$n.'_title'])?></h3><?php if($c['step'.$n.'_text']!==''): ?><p><?=dtp_inline($c['step'.$n.'_text'])?></p><?php endif; ?><?php if($c['step'.$n.'_key']!==''): ?><span class="step-key"><?=e($c['step'.$n.'_key'])?></span><?php endif; ?></article>
<?php endforeach; ?>
      </div>
    </div>
  </section>
  <section class="end-cap"><div class="section-shell"><div class="end-cap-content" data-reveal><span class="eyebrow"><?=e($c['end_eyebrow'])?></span><h2><?=e($c['end_title'])?><?php if($c['end_title_highlight']!==''): ?> <em><?=e($c['end_title_highlight'])?></em><?php endif; ?></h2><?php if($c['end_text']!==''): ?><p><?=dtp_inline($c['end_text'])?></p><?php endif; ?><a class="primary-action" href="#lernmodule"><?=e($c['end_cta'])?> <span aria-hidden="true">↑</span></a></div></div></section>
  <section class="dtp-disclaimer" id="hinweis" aria-labelledby="dtp-disclaimer-title">
    <div class="section-shell">
      <details class="disclaimer-shell">
        <summary><span><span class="disclaimer-label"><?=e($c['disclaimer_label'])?></span><strong id="dtp-disclaimer-title"><?=e($c['disclaimer_title'])?></strong></span><span class="disclaimer-toggle" aria-hidden="true">+</span></summary>
        <div class="disclaimer-body">
          <p><?=dtp_inline($c['disclaimer_p1'])?></p>
          <?php if($c['disclaimer_p2']!==''): ?><p><?=dtp_inline($c['disclaimer_p2'])?></p><?php endif; ?>
          <?php if($c['disclaimer_p3']!==''): ?><p><?=dtp_inline($c['disclaimer_p3'])?></p><?php endif; ?>
        </div>
      </details>
    </div>
  </section>
</main>
<footer class="dtp-footer"><div class="footer-inner"><a href="../index.php" class="footer-brand"><strong>GERING <em>DIGITAL</em></strong><small>DAU TO PRO · Ein Projekt von Gering Digital</small></a><div class="footer-links"><a href="../index.php">Zurück zu Gering Digital</a><a href="../impressum.php">Impressum</a><a href="../datenschutz.php">Datenschutz</a><a href="#hinweis">Wichtiger Hinweis</a></div><small>© 2026 Willi Gering</small></div></footer>
</body></html>
