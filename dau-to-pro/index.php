<?php
require_once __DIR__.'/../dau_lib.php';
require_once __DIR__.'/../learner_lib.php';
require_once __DIR__.'/../achievements_lib.php';
require_once __DIR__.'/feedback-form.php';
$learnerRow=learner_current();
$learnerName=$learnerRow['username']??null;
$revealId=$_SESSION['dtp_highscore_reveal']??null;
unset($_SESSION['dtp_highscore_reveal']);
$reveal=$learnerRow && $revealId===(int)$learnerRow['id'];
if ($learnerRow) header('Cache-Control: no-store, private');
// Highscore-Vorschau: wie highscore.php nur für angemeldete Lernende, Gäste sehen einen Hinweis.
$hsRows=[];$hsMe=null;$hsRank=0;$hsCount=0;
$cardProgress=[];
try {
    $hsCount=(int)db()->query('SELECT COUNT(*) FROM learner_stats WHERE highscore_visible=1 AND highscore_blocked=0')->fetchColumn();
    if ($learnerRow) {
        $hsRows=ach_highscore(5);
        $hsMe=ach_stats((int)$learnerRow['id']);
        $hsRank=ach_would_rank((int)$learnerRow['id']);
    }
} catch (Throwable $error) { error_log('DAU TO PRO Highscore: '.$error->getMessage()); }
if ($learnerRow) {
    try { $cardProgress=ach_card_progress((int)$learnerRow['id']); }
    catch (Throwable $error) { error_log('DAU TO PRO Modulfortschritt: '.$error->getMessage()); }
}
$query=db()->prepare("SELECT slug,title,subject,description,preview_image,preview_fit,preview_x,preview_y FROM html_pages WHERE published=1 AND category=? ORDER BY updated_at DESC,id DESC");
$query->execute(['lernen']);
$modules=$query->fetchAll(PDO::FETCH_ASSOC);
$modules=array_values(array_filter($modules,static fn(array $m):bool=>$m['slug']!=='klausurvorbereitung-061126'));
$comingSoonSlugs=[];
usort($modules, static fn(array $a, array $b): int =>
    in_array($a['slug'], $comingSoonSlugs, true) <=> in_array($b['slug'], $comingSoonSlugs, true)
);
foreach($modules as &$module) {$module['topic']=dtp_topic($module);}unset($module);
$c=dtp_page_content();
$hero=dtp_hero();
$subtitle=dtp_subtitle_parts($c['subtitle']);
$fx=dtp_hero_fx_attrs($hero,$learnerName!==null);
// NERD RADIO: MP3/WAV/OGG/M4A aus audio/nerd-radio/ erscheinen automatisch in der Playlist (natürliche Sortierung nach Dateiname).
$nrFiles=[];
$nrDir=__DIR__.'/audio/nerd-radio';
if(is_dir($nrDir)){
  $nrNames=array_values(array_filter(scandir($nrDir)?:[],fn($n)=>$n[0]!=='.'&&is_file($nrDir.'/'.$n)&&preg_match('/\.(mp3|wav|ogg|m4a)$/i',$n)));
  natcasesort($nrNames);
  foreach($nrNames as $n){
    $label=trim(str_replace('_',' ',preg_replace('/^\d+[\s._-]*/','',pathinfo($n,PATHINFO_FILENAME))));
    $nrFiles[]=['src'=>'audio/nerd-radio/'.rawurlencode($n),'title'=>$label!==''?$label:pathinfo($n,PATHINFO_FILENAME),'genre'=>strtoupper(pathinfo($n,PATHINFO_EXTENSION))];
  }
}
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
  <link rel="icon" type="image/svg+xml" href="../assets/dau-to-pro-pixelpilz.svg?v=20261103">
  <link rel="stylesheet" href="style.css?v=<?=filemtime(__DIR__.'/style.css')?>">
<?php if(!$hero['custom']): ?>  <link rel="stylesheet" href="hero-scene.css?v=<?=filemtime(__DIR__.'/hero-scene.css')?>">
<?php endif; ?>
  <script src="site.js?v=<?=filemtime(__DIR__.'/site.js')?>" defer></script>
  <link rel="stylesheet" href="nerd-radio.css?v=<?=filemtime(__DIR__.'/nerd-radio.css')?>">
  <script src="nerd-radio.js?v=<?=filemtime(__DIR__.'/nerd-radio.js')?>" defer></script>
<?php if ($fx!==''): ?>  <link rel="stylesheet" href="hero-fx.css?v=<?=filemtime(__DIR__.'/hero-fx.css')?>">
  <script src="achievement-toast.js?v=<?=filemtime(__DIR__.'/achievement-toast.js')?>" defer></script>
  <script src="hero-fx.js?v=<?=filemtime(__DIR__.'/hero-fx.js')?>" defer></script>
<?php endif; ?>
  <script>window.__DTP_UPDATE__={url:'api/update-version.php',revision:<?=json_encode(learner_landing_update_revision(db()))?>};</script>
  <script src="update-notice.js?v=<?=filemtime(__DIR__.'/update-notice.js')?>" defer></script>
<?php if($reveal): ?>  <script src="highscore-reveal.js?v=<?=filemtime(__DIR__.'/highscore-reveal.js')?>" defer></script>
<?php endif; ?>
  <?=dtp_feedback_assets()?>
<style>.catalog-panel{container-type:inline-size}.cheat-category{margin-top:42px;border-top:1px solid var(--stroke);border-bottom:1px solid var(--stroke)}.cheat-category summary{display:flex;align-items:center;gap:14px;cursor:pointer;list-style:none;padding:20px 0}.cheat-category summary::-webkit-details-marker{display:none}.cheat-category-title{font-size:20px;font-weight:800}.cheat-category-count{color:var(--muted);font-size:13px}.cheat-category .disclaimer-toggle{margin-left:auto}.cheat-category[open] .disclaimer-toggle{transform:rotate(45deg)}.cheat-category-body{padding:0 0 24px}.cheat-category-body .mini-module{width:min(100%,300px)}.urgent-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:center;margin:12px 0 42px}.urgent-module{position:relative;grid-column:2;min-width:0}.mini-module{grid-column:3;width:50%;min-width:0}.mini-module .module-card{--mod:#ed973c;text-decoration:none}.mini-module .module-body{padding:12px}.mini-module .module-category{font-size:9px;letter-spacing:.1em}.mini-module .module-body h2{font-size:17px;margin:6px 0 2px}.mini-module .mini-alias{color:var(--mod);font-size:12px;font-weight:750;line-height:1.3;margin-bottom:6px}.mini-module .module-body p{font-size:11.5px;line-height:1.45;margin:0 0 10px}.mini-module .module-footer{font-size:11px;padding-top:8px}.urgent-module .module-card{width:100%;display:flex}.urgent-module .module-art{aspect-ratio:16/9}.urgent-flag{position:absolute;right:-8px;top:18px;z-index:3;background:#ed973c;color:#17100a;padding:10px 24px 10px 18px;font-weight:900;letter-spacing:.12em;clip-path:polygon(0 0,100% 0,91% 50%,100% 100%,0 100%);box-shadow:0 6px 20px #0006}@container (max-width: 955px){.urgent-row{grid-template-columns:repeat(2,minmax(0,1fr))}.urgent-module{grid-column:1}.mini-module{grid-column:2}}@container (max-width: 630px){.urgent-row{grid-template-columns:minmax(0,1fr)}.urgent-module,.mini-module{grid-column:1}.mini-module{justify-self:center}}@media(max-width:600px){.urgent-flag{right:-4px}}</style></head>
<body class="dtp-landing">
<?=dtp_backdrop()?>
<a class="skip" href="#lernmodule">Direkt zu den Lernmodulen</a>
<?=dtp_nav('start',$learnerName)?>
<main>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-inner">
      <div class="hero-copy">
        <div class="kicker"><span class="live-dot" aria-hidden="true"></span> DAU TO PRO // die Lernplattform</div>
        <h1 id="hero-title"><?=e($c['title'])?><?php if($c['title_highlight']!==''): ?> <span><?=e($c['title_highlight'])?></span><?php endif; ?></h1>
        <?php if($subtitle): ?><div class="hero-strip"><?php foreach($subtitle as $i=>$part): ?><?php if($i>0): ?><i aria-hidden="true"></i><?php endif; ?><span><?=e(dtp_upper($part))?></span><?php endforeach; ?></div><?php endif; ?>
        <p class="hero-lead"><?=dtp_inline($c['lead'])?></p>
        <div class="hero-actions"><a class="secondary-action" href="#konzept"><?=e($c['cta_secondary'])?> <span aria-hidden="true">↓</span></a><?=dtp_feedback_button()?></div>
        <div class="hero-meta"><span><b><?=count($modules)?></b> <?=count($modules)===1?'Lernmodul':'Lernmodule'?></span><?php foreach([$c['meta_1'],$c['meta_2']] as $meta): if($meta==='')continue; ?><span><?=e($meta)?></span><?php endforeach; ?></div>
      </div>
      <div class="hero-visual">
        <div class="hero-art-wrap"<?php if(!$hero['custom']): ?> data-scene="layers"<?php endif; ?> style="<?=e(dtp_hero_style($hero))?>"<?=$fx?>><?=dtp_hero_scene($hero,$c['hero_alt'])?></div>
      </div>
    </div>
  </section>
  <aside class="nr-stage" aria-labelledby="nr-title">
    <div class="nr-stage__inner">
    <div class="nr-rail">
      <div class="nr-pin">
        <div class="nr-device" data-nerd-radio data-state="stopped" data-mode="spectrum" data-tracks="<?=e(json_encode($nrFiles,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES))?>">
          <img class="nr-chassis" src="nerd-radio-chassis.svg?v=<?=filemtime(__DIR__.'/nerd-radio-chassis.svg')?>" alt="" width="1000" height="450" decoding="async">
          <svg class="nr-defs" aria-hidden="true" focusable="false"><symbol id="nr-shroom" viewBox="0 0 18 18"><path d="M7 1h1v1h-1zM8 1h1v1h-1zM9 1h1v1h-1zM10 1h1v1h-1zM5 2h1v1h-1zM6 2h1v1h-1zM11 2h1v1h-1zM12 2h1v1h-1zM4 3h1v1h-1zM13 3h1v1h-1zM3 4h1v1h-1zM14 4h1v1h-1zM2 5h1v1h-1zM15 5h1v1h-1zM2 6h1v1h-1zM15 6h1v1h-1zM1 7h1v1h-1zM16 7h1v1h-1zM1 8h1v1h-1zM16 8h1v1h-1zM1 9h1v1h-1zM16 9h1v1h-1zM1 10h1v1h-1zM4 10h1v1h-1zM5 10h1v1h-1zM6 10h1v1h-1zM7 10h1v1h-1zM8 10h1v1h-1zM9 10h1v1h-1zM10 10h1v1h-1zM11 10h1v1h-1zM12 10h1v1h-1zM13 10h1v1h-1zM16 10h1v1h-1zM2 11h1v1h-1zM3 11h1v1h-1zM14 11h1v1h-1zM15 11h1v1h-1zM3 12h1v1h-1zM7 12h1v1h-1zM10 12h1v1h-1zM14 12h1v1h-1zM3 13h1v1h-1zM7 13h1v1h-1zM10 13h1v1h-1zM14 13h1v1h-1zM3 14h1v1h-1zM14 14h1v1h-1zM4 15h1v1h-1zM13 15h1v1h-1zM5 16h1v1h-1zM6 16h1v1h-1zM7 16h1v1h-1zM8 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM11 16h1v1h-1zM12 16h1v1h-1z"/></symbol></svg>
          <div class="nr-speaker nr-speaker--l" aria-hidden="true"><span class="nr-speaker__glow" data-radio-glow></span><span class="nr-speaker__ring"></span><span class="nr-speaker__cone" data-radio-cone><svg><use href="#nr-shroom"/></svg></span></div>
          <div class="nr-speaker nr-speaker--r" aria-hidden="true"><span class="nr-speaker__glow" data-radio-glow></span><span class="nr-speaker__ring"></span><span class="nr-speaker__cone" data-radio-cone><svg><use href="#nr-shroom"/></svg></span></div>
          <div class="nr-display">
            <div class="nr-display__glass">
              <div class="nr-display__brand"><img src="../assets/dau-to-pro-pixelpilz.svg?v=20261103" alt="" width="18" height="18"><h2 id="nr-title"><span class="nr-sr">NERD RADIO</span><svg viewBox="0 0 170 30" aria-hidden="true" focusable="false"><text x="1" y="25" textLength="167" lengthAdjust="spacingAndGlyphs">NERD RADIO</text></svg></h2></div>
              <div class="nr-display__viz"><canvas data-radio-viz width="300" height="120" role="img" aria-label="Echtzeit-Anzeige des Audiosignals"></canvas></div>
              <p class="nr-display__track"><span class="nr-display__icon" aria-hidden="true"></span><span class="nr-display__titlebox"><span class="nr-marquee" data-radio-title>01 – Stack Overflow FM</span></span></p>
              <div class="nr-display__meta">
                <span class="nr-display__time" data-radio-elapsed>00:00</span>
                <span class="nr-display__bar" title="Position im Loop" aria-hidden="true"><i data-radio-position></i></span>
                <span class="nr-display__time" data-radio-length>∞ LOOP</span>
                <svg class="nr-display__ind" data-radio-shuffle-ind viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h3.5c4.5 0 6.5 10 11 10H20M3 17h3.5c1.8 0 3-1.6 4-3.4M13.5 9.4c1-1.6 2.2-2.4 4-2.4H20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M18 3.5l4 3.5-4 3.5zM18 13.5l4 3.5-4 3.5z"/></svg>
                <svg class="nr-display__ind nr-display__ind--loop" data-radio-loop-ind viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13V11a5 5 0 0 1 5-5h9M20 11v2a5 5 0 0 1-5 5H6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M16 2.5L20 6l-4 3.5zM8 14.5L4 18l4 3.5z"/></svg>
              </div>
              <div class="nr-playlist" id="nr-playlist" data-radio-playlist role="group" aria-label="Playlist" hidden>
                <ol class="nr-playlist__list" data-radio-tracks></ol>
              </div>
            </div>
            <p class="nr-sr" data-radio-status aria-live="polite"></p>
          </div>
          <div class="nr-transport" role="group" aria-label="Wiedergabe">
            <button class="nr-key" type="button" data-radio-prev aria-label="Vorheriger Titel" title="Vorheriger Titel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2.6v14H4zM14 5v14L7.4 12zM21.5 5v14L15 12z"/></svg></button>
            <button class="nr-key" type="button" data-radio-stop aria-label="Stopp" title="Stopp"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="5.5" width="13" height="13" rx="1"/></svg></button>
            <button class="nr-key nr-key--play" type="button" data-radio-play aria-label="Abspielen" title="Abspielen / Pause"><svg class="nr-icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg><svg class="nr-icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h4.4v15H6zM13.6 4.5H18v15h-4.4z"/></svg></button>
            <button class="nr-key" type="button" data-radio-next aria-label="Nächster Titel" title="Nächster Titel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 5h-2.6v14H20zM10 5v14l6.6-7zM2.5 5v14L9 12z"/></svg></button>
            <button class="nr-key nr-key--gold" type="button" data-radio-shuffle aria-label="Zufälligen Titel abspielen" title="Zufälliger Titel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h3.5c4.5 0 6.5 10 11 10H20M3 17h3.5c1.8 0 3-1.6 4-3.4M13.5 9.4c1-1.6 2.2-2.4 4-2.4H20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M18 3.2l4.2 3.8-4.2 3.8zM18 13.2l4.2 3.8-4.2 3.8z"/></svg></button>
          </div>
          <div class="nr-lower">
            <button class="nr-key nr-key--round" type="button" data-radio-mode aria-pressed="false" aria-label="Anzeige auf Wellenform umschalten" title="Anzeige: Spektrum / Wellenform"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="3.4" stroke-dasharray="3.22 3.22"/><circle cx="12" cy="12" r="5.4" fill="none" stroke="currentColor" stroke-width="2.8"/></svg></button>
            <div class="nr-volume">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              <input type="range" min="0" max="100" step="1" value="35" data-radio-volume aria-label="Lautstärke">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.6 6.8a7.4 7.4 0 0 1 0 10.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
            <button class="nr-key nr-key--round nr-key--gold-rim" type="button" data-radio-list aria-expanded="false" aria-controls="nr-playlist" aria-label="Playlist öffnen" title="Playlist"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="4.5" cy="6" r="2"/><circle cx="4.5" cy="12" r="2"/><circle cx="4.5" cy="18" r="2"/><rect x="9" y="4.8" width="12" height="2.6" rx="1.2"/><rect x="9" y="10.8" width="12" height="2.6" rx="1.2"/><rect x="9" y="16.8" width="12" height="2.6" rx="1.2"/></svg></button>
          </div>
        </div>
        <div class="nr-floor" aria-hidden="true"></div>
      </div>
    </div>
    </div>
  </aside>
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
<?=dtp_module_card($module,'../',true,$learnerRow?($cardProgress[$module['slug']]??null):null,comingSoon:in_array($module['slug'],$comingSoonSlugs,true))?>
<?php endforeach; ?>
</div>
<p id="search-empty" class="search-empty" hidden>Hier ist noch kein Lernmodul veröffentlicht. Wähle einen anderen Themenbereich.</p>
<?php endif; ?>
<details class="cheat-category">
<summary><span class="cheat-category-title">Cheat Sheets</span><span class="cheat-category-count">1 Cheat Sheet</span><span class="disclaimer-toggle" aria-hidden="true">+</span></summary>
<div class="cheat-category-body">
<div class="mini-module"><a class="module-card" href="cheat-sheet.html" aria-label="Cheat-Sheet öffnen"><div class="module-art"><svg viewBox="0 0 320 180" width="100%" height="100%" style="position:absolute;inset:0" aria-hidden="true"><rect width="320" height="180" fill="#0c151b"/><g transform="rotate(-5 160 90)"><rect x="82" y="16" width="156" height="150" rx="3" fill="#f3ead2"/><path d="M82 16h156v24H82z" fill="#ed973c"/><text x="160" y="34" text-anchor="middle" font-family="ui-monospace,Consolas,monospace" font-size="15" font-weight="800" fill="#17100a">SPICKZETTEL</text><g font-family="ui-monospace,Consolas,monospace" font-size="19" font-weight="700" fill="#17100a"><text x="96" y="66">22 SSH</text><text x="96" y="92">53 DNS</text><text x="96" y="118">80 HTTP</text><text x="96" y="144">443 HTTPS</text></g></g></svg></div><div class="module-body"><span class="module-category">Lernen auf den letzten Drücker</span><h2>Cheat-Sheet</h2><span class="mini-alias">Für Spätzünder</span><p>Lernplan: heute Abend bis morgen früh.</p><div class="module-footer"><span>Öffnen</span><b aria-hidden="true">↗</b></div></div></a></div>
</div>
</details>
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
          <li class="hs-row<?=$self?' is-self':''?><?=$r['rank']<=3?' top-'.$r['rank']:''?>"<?=$self&&$reveal?' data-highscore-reveal':''?>>
            <span class="hs-pos"><?=$r['rank']<=3?['🥇','🥈','🥉'][$r['rank']-1]:(int)$r['rank']?></span>
            <span class="hs-who"><b><a href="highscore.php?profil=<?=(int)$r['id']?>"><?=e($r['username'])?></a><?php if($self): ?> <small>(du)</small><?php endif; ?></b><span class="hs-showcase" aria-label="Ausgestellte Achievements"><?php for($slot=0;$slot<3;$slot++): ?><?=isset($r['showcase'][$slot])?xp_icon_html($r['showcase'][$slot],true):'<span class="hs-showcase-empty" aria-label="Leerer Vitrinenplatz">◇</span>'?><?php endfor; ?></span><small>Level <?=(int)$r['level']?> · <?=e($r['title'])?></small></span>
            <span class="hs-xp"><span><b><?=number_format((int)$r['xp'],0,',','.')?></b> XP</span><small><?=(int)$r['achievements']?> Achievements</small></span>
          </li>
<?php endforeach; ?>
        </ol>
<?php endif; ?>
        <div class="hs-foot">
          <?php if ($hsMe && (!$hsMe['visible'] || $hsMe['blocked'])): ?><span>Du bist unsichtbar<?php if(!$hsMe['blocked']): ?>, mit <?=number_format($hsMe['level']['xp'],0,',','.')?> XP wärst du auf Platz <?=$hsRank?>. <a href="konto.php#highscore">Sichtbarkeit einschalten</a><?php endif; ?></span><?php elseif($hsMe): ?><span<?=$reveal&&!in_array((int)$learnerRow['id'],array_map('intval',array_column($hsRows,'id')),true)?' data-highscore-reveal':''?>>Dein Platz: <b><?=$hsRank?></b> · <?=number_format($hsMe['level']['xp'],0,',','.')?> XP</span><?php endif; ?>
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
<footer class="dtp-footer"><div class="footer-inner"><?=dtp_footer_brand()?><div class="footer-links"><a href="../index.php">Zurück zu Gering Digital</a><a href="../impressum.php">Impressum</a><a href="../datenschutz.php">Datenschutz</a><a href="#hinweis">Wichtiger Hinweis</a></div><small>© 2026 Willi Gering</small></div></footer>

<?=dtp_feedback_dialog('startseite')?>
</body></html>



