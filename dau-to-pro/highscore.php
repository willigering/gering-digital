<?php
// DAU TO PRO: Highscore. Nur für angemeldete Lernende sichtbar; in der Liste steht nur, wer es selbst eingeschaltet hat.
declare(strict_types=1);
require_once __DIR__.'/../dau_lib.php';
require_once __DIR__.'/../achievements_lib.php';
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');

$learner=learner_current();
$revealId=$_SESSION['dtp_highscore_reveal']??null;
unset($_SESSION['dtp_highscore_reveal']);
$reveal=$learner && $revealId===(int)$learner['id'];
$rows=[];$me=null;$rank=0;
if ($learner) {
    $id=(int)$learner['id'];
    try { ach_evaluate($id); } catch (Throwable $error) { error_log('DAU TO PRO Achievements: '.$error->getMessage()); }
    $me=ach_stats($id);
    $rows=ach_highscore(100);
    $rank=ach_would_rank($id);
}
$total=count(ach_catalog());
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090c0e">
  <meta name="robots" content="noindex, nofollow">
  <title>Highscore · DAU TO PRO</title>
  <link rel="icon" type="image/svg+xml" href="../assets/dau-to-pro-pixelpilz.svg?v=20261103">
  <link rel="stylesheet" href="style.css?v=<?=filemtime(__DIR__.'/style.css')?>">
  <link rel="stylesheet" href="konto.css?v=<?=filemtime(__DIR__.'/konto.css')?>">
  <script src="profiles.js" defer></script>
  <?php if($reveal): ?><script src="highscore-reveal.js?v=<?=filemtime(__DIR__.'/highscore-reveal.js')?>" defer></script><?php endif; ?>
  <script src="site.js?v=<?=filemtime(__DIR__.'/site.js')?>" defer></script>
</head>
<body class="konto-page highscore-page">
<?=dtp_backdrop()?>
<a class="skip" href="#inhalt">Direkt zum Inhalt</a>
<?=dtp_nav('highscore',$learner['username']??null)?>
<main id="inhalt" class="konto-main">
  <section class="konto-head hs-head">
    <div>
      <p class="eyebrow">HIGHSCORE</p>
      <h1>Wer ist schon <span>PRO</span>?</h1>
      <p class="konto-lead">Hier stehen alle Lernenden, die ihre Sichtbarkeit im Highscore selbst eingeschaltet haben. Sortiert nach XP, bei Gleichstand nach Achievements.</p>
    </div>
  </section>
<?php if (!$learner): ?>
  <section class="konto-card hs-locked">
    <h2>Nur mit Lernkonto</h2>
    <p>Den Highscore sehen nur angemeldete Lernende. Melde dich an oder erstelle ein kostenloses Konto. Ob du selbst in der Liste auftauchst, entscheidest du danach in den Konto-Einstellungen.</p>
    <a class="primary-action" href="konto.php">Anmelden <span aria-hidden="true">→</span></a>
  </section>
<?php else: ?>
  <?php if (!$me['visible'] || $me['blocked']): ?>
  <div class="konto-alert hs-hint" role="status">Du bist im Highscore <strong>unsichtbar</strong>.<?php if(!$me['blocked']): ?> Mit deinen <?=number_format($me['level']['xp'],0,',','.')?> XP wärst du auf <strong>Platz <?=$rank?></strong>. <a href="konto.php#highscore">Sichtbarkeit einschalten</a><?php endif; ?></div>
  <?php endif; ?>
  <?php if (!$rows): ?>
  <p class="konto-empty">Noch hat niemand die Sichtbarkeit eingeschaltet. Sei die erste Person: <a class="text-link" href="konto.php#highscore">Sichtbarkeit einschalten →</a></p>
  <?php else: ?>
  <div class="hs-table-wrap">
  <table class="hs-table">
    <thead><tr><th scope="col">Platz</th><th scope="col">Benutzername</th><th scope="col">Level</th><th scope="col" class="num">XP</th><th scope="col">Achievements</th></tr></thead>
    <tbody>
    <?php foreach($rows as $r): $self=(int)$r['id']===(int)$learner['id']; ?>
      <tr<?=$self?' class="is-self"':''?><?=$self&&$reveal?' data-highscore-reveal':''?>>
        <td class="hs-rank"><?=$r['rank']<=3?['🥇','🥈','🥉'][$r['rank']-1]:$r['rank']?></td>
        <td class="hs-name"><button type="button" class="text-link profile-open" data-profile="<?=(int)$r['id']?>"><?=e($r['username'])?></button> <span class="showcase-inline"><?php for($slot=0;$slot<3;$slot++): ?><?=isset($r['showcase'][$slot])?xp_icon_html($r['showcase'][$slot],true):'<span class="showcase-empty" aria-label="Leerer Vitrinenplatz">◇</span>'?><?php endfor; ?></span><?php if($self): ?> <small>(du)</small><?php endif; ?></td>
        <td class="hs-level"><b><?=(int)$r['level']?></b> <span><?=e($r['title'])?></span></td>
        <td class="num"><?=number_format((int)$r['xp'],0,',','.')?></td>
        <td class="hs-ach"><b><?=(int)$r['achievements']?></b><small> / <?=$total?></small>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  </div>
  <?php endif; ?>
  <p class="konto-hint">Klicke auf einen Namen, um die Achievement-Sammlung anzusehen. Die Symbole neben dem Namen zeigen die persönliche Vitrine. Deine eigenen Achievements findest du unter <a href="konto.php#achievements">Mein Fortschritt</a>.</p>
<?php endif; ?>
</main>
<?php if($learner): ?><dialog class="profile-dialog" id="learner-profile" aria-labelledby="profile-title"><div class="profile-toolbar"><h2 id="profile-title">Lernprofil</h2><button type="button" class="secondary-action" data-profile-close aria-label="Profil schließen">Schließen ×</button></div><div id="profile-content" aria-live="polite"></div></dialog><?php endif; ?>
<footer class="dtp-footer"><div class="footer-inner"><?=dtp_footer_brand()?><div class="footer-links"><a href="./">DAU TO PRO</a><a href="../impressum.php">Impressum</a><a href="../datenschutz.php#lernkonten">Datenschutz</a></div><small>© 2026 Willi Gering</small></div></footer>
</body></html>



