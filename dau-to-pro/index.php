<?php
require_once __DIR__.'/../dau_lib.php';
require_once __DIR__.'/../learner_lib.php';
require_once __DIR__.'/../achievements_lib.php';
$learnerRow=learner_current();
$learnerName=$learnerRow['username']??null;
// Highscore-Vorschau: wie highscore.php nur für angemeldete Lernende, Gäste sehen einen Hinweis.
$hsRows=[];$hsMe=null;$hsRank=0;$hsCount=0;
try {
    $hsCount=(int)db()->query('SELECT COUNT(*) FROM learner_stats WHERE highscore_visible=1 AND highscore_blocked=0')->fetchColumn();
    if ($learnerRow) {
        $hsRows=ach_highscore(5);
        $hsMe=ach_stats((int)$learnerRow['id']);
        $hsRank=ach_would_rank((int)$learnerRow['id']);
    }
} catch (Throwable $error) { error_log('DAU TO PRO Highscore: '.$error->getMessage()); }
$query=db()->prepare("SELECT slug,title,subject,description,preview_image,preview_fit,preview_x,preview_y FROM html_pages WHERE published=1 AND category=? ORDER BY updated_at DESC,id DESC");
$query->execute(['lernen']);
$modules=$query->fetchAll(PDO::FETCH_ASSOC);
foreach($modules as &$module) {$module['topic']=dtp_topic($module);}unset($module);
$c=dtp_page_content();
$hero=dtp_hero();
$subtitle=dtp_subtitle_parts($c['subtitle']);
$fx=dtp_hero_fx_attrs($hero,$learnerName!==null);
$topicLabels=['subnet'=>'IP & Subnetting','netzwerk'=>'Netzwerke','sicherheit'=>'IT-Sicherheit','pruefung'=>'Prüfung','sonstiges'=>'Grundlagen','wirtschaft'=>'Wirtschaft & Projekte'];
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
<?php if(!$hero['custom']): ?>  <link rel="stylesheet" href="hero-scene.css?v=<?=filemtime(__DIR__.'/hero-scene.css')?>">
<?php endif; ?>
  <script src="site.js?v=<?=filemtime(__DIR__.'/site.js')?>" defer></script>
<?php if ($fx!==''): ?>  <link rel="stylesheet" href="hero-fx.css?v=<?=filemtime(__DIR__.'/hero-fx.css')?>">
  <script src="achievement-toast.js?v=<?=filemtime(__DIR__.'/achievement-toast.js')?>" defer></script>
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
        <div class="hero-art-wrap"<?php if(!$hero['custom']): ?> data-scene="layers"<?php endif; ?> style="<?=e(dtp_hero_style($hero))?>"<?=$fx?>><?=dtp_hero_scene($hero,$c['hero_alt'])?></div>
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
        <div class="filterbar" role="group" aria-label="Lernmodule nach Thema">
          <button type="button" class="filter-btn active" data-filter="alle" aria-pressed="true">Alle Module</button>
          <?php foreach($topicLabels as $topic=>$label): ?>
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
  <section class="hs-section" id="highscore" aria-labelledby="hs-title">
    <div class="section-shell">
      <div class="section-heading" data-reveal><div><span class="eyebrow">HIGHSCORE</span><h2 id="hs-title">Wer ist schon <span>PRO</span>?</h2><p>Die besten Lernenden nach XP. In der Liste steht nur, wer die Sichtbarkeit im eigenen Konto eingeschaltet hat.</p></div><span class="section-count"><?=$hsCount?> <?=$hsCount===1?'Person':'Personen'?> sichtbar</span></div>
<?php if (!$learnerRow): ?>
      <div class="hs-teaser" data-reveal>
        <div><strong>Nur mit Lernkonto</strong><p>Den Highscore sehen angemeldete Lernende. Mit Konto sammelst du XP, Level und Achievements und entscheidest selbst, ob du in der Liste auftauchst.</p></div>
        <a class="primary-action" href="konto.php">Anmelden <span aria-hidden="true">→</span></a>
      </div>
<?php else: ?>
      <div class="hs-board" data-reveal>
<?php if (!$hsRows): ?>
        <p class="hs-empty">Noch hat niemand die Sichtbarkeit eingeschaltet. Sei die erste Person: <a href="konto.php#highscore">Sichtbarkeit einschalten →</a></p>
<?php else: ?>
        <ol class="hs-top">
<?php foreach($hsRows as $r): $self=(int)$r['id']===(int)$learnerRow['id']; ?>
          <li class="hs-row<?=$self?' is-self':''?><?=$r['rank']<=3?' top-'.$r['rank']:''?>">
            <span class="hs-pos"><?=$r['rank']<=3?['🥇','🥈','🥉'][$r['rank']-1]:(int)$r['rank']?></span>
            <span class="hs-who"><b><a href="highscore.php?profil=<?=(int)$r['id']?>"><?=e($r['username'])?></a><?php if($self): ?> <small>(du)</small><?php endif; ?></b><span class="hs-showcase"><?php for($slot=0;$slot<3;$slot++): ?><?=isset($r['showcase'][$slot])?xp_icon_html($r['showcase'][$slot],true):'<span class="hs-showcase-empty" aria-label="Leerer Vitrinenplatz">◇</span>'?><?php endfor; ?></span><small>Level <?=(int)$r['level']?> · <?=e($r['title'])?></small></span>
            <span class="hs-xp"><span><b><?=number_format((int)$r['xp'],0,',','.')?></b> XP</span><small><?=(int)$r['achievements']?> Achievements</small></span>
          </li>
<?php endforeach; ?>
        </ol>
<?php endif; ?>
        <div class="hs-foot">
          <?php if ($hsMe && (!$hsMe['visible'] || $hsMe['blocked'])): ?><span>Du bist unsichtbar<?php if(!$hsMe['blocked']): ?>, mit <?=number_format($hsMe['level']['xp'],0,',','.')?> XP wärst du auf Platz <?=$hsRank?>. <a href="konto.php#highscore">Sichtbarkeit einschalten</a><?php endif; ?></span><?php elseif($hsMe): ?><span>Dein Platz: <b><?=$hsRank?></b> · <?=number_format($hsMe['level']['xp'],0,',','.')?> XP</span><?php endif; ?>
          <a class="secondary-action" href="highscore.php">Ganzer Highscore <span aria-hidden="true">→</span></a>
        </div>
      </div>
<?php endif; ?>
    </div>
  </section>
  <section class="method-section" id="konzept" aria-labelledby="method-title">
    <div class="section-shell"><div class="section-heading" data-reveal><div><span class="eyebrow"><?=e($c['method_eyebrow'])?></span><h2 id="method-title"><?=e($c['method_title'])?><?php if($c['method_title_highlight']!==''): ?> <span><?=e($c['method_title_highlight'])?></span><?php endif; ?></h2><?php if($c['method_intro']!==''): ?><p><?=dtp_inline($c['method_intro'])?></p><?php endif; ?></div></div>
      <div class="steps">
        <?php foreach([['01','◎',1],['02','⌘',2],['03','◷',3]] as [$no,$symbol,$n]): ?>
        <article class="step" data-reveal><span class="step-no"><?=$no?></span><div class="step-symbol"><?=$symbol?></div><h3><?=e($c['step'.$n.'_title'])?></h3><?php if($c['step'.$n.'_text']!==''): ?><p><?=dtp_inline($c['step'.$n.'_text'])?></p><?php endif; ?><?php if($c['step'.$n.'_key']!==''): ?><span class="step-key"><?=e($c['step'.$n.'_key'])?></span><?php endif; ?></article>
<?php endforeach; ?>
      </div>
      <div class="end-cap method-conclusion" data-reveal>
        <?php if($c['end_text']!==''): ?><p><?=dtp_inline($c['end_text'])?></p><?php endif; ?>
        <a class="primary-action" href="#lernmodule"><?=e($c['end_cta'])?> <span aria-hidden="true">↑</span></a>
      </div>
    </div>
  </section>
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



