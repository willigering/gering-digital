<?php
// Gäste sehen Einträge mit ausdrücklicher öffentlicher Freigabe.
declare(strict_types=1);
require_once __DIR__.'/../dau_lib.php';
require_once __DIR__.'/../achievements_lib.php';
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');

$learner=learner_current();
$guestPreview=$learner && ($_GET['ansicht']??'')==='gast';
$publicOnly=!$learner || $guestPreview;
$revealId=$_SESSION['dtp_highscore_reveal']??null;
unset($_SESSION['dtp_highscore_reveal']);
$reveal=!$publicOnly && $revealId===(int)$learner['id'];
$me=null;$rank=0;
if (!$publicOnly) {
    $id=(int)$learner['id'];
    try { ach_evaluate($id); } catch (Throwable $error) { error_log('DAU TO PRO Achievements: '.$error->getMessage()); }
    $me=ach_stats($id);
    $rank=ach_would_rank($id);
}
$rows=ach_highscore(publicOnly: $publicOnly);
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
  <link rel="stylesheet" href="highscore-arcade.css?v=<?=filemtime(__DIR__.'/highscore-arcade.css')?>">
  <link rel="stylesheet" href="avatare.css?v=<?=filemtime(__DIR__.'/avatare.css')?>">
  <script src="highscore-arcade.js?v=<?=filemtime(__DIR__.'/highscore-arcade.js')?>" defer></script>
  <script src="profiles.js" defer></script>
  <?php if($reveal): ?><script src="highscore-reveal.js?v=<?=filemtime(__DIR__.'/highscore-reveal.js')?>" defer></script><?php endif; ?>
  <script src="site.js?v=<?=filemtime(__DIR__.'/site.js')?>" defer></script>
</head>
<body class="konto-page highscore-page">
<?=dtp_backdrop()?>
<a class="skip" href="#inhalt">Direkt zum Inhalt</a>
<?=dtp_nav('highscore',$learner['username']??null)?>
<main id="inhalt" class="konto-main">
  <div class="arcade-full">
  <section class="konto-head hs-head">
    <div>
      <p class="eyebrow">DAU-TO-PRO</p>
      <h1>Wer ist schon <span>PRO</span>?</h1>
      <p class="konto-lead">Hier stehen alle Lernenden, die ihre Sichtbarkeit im Highscore selbst eingeschaltet haben. Sortiert nach XP, bei Gleichstand nach Achievements.</p>
    </div>
  </section>
<?php if ($publicOnly): ?>
  <p class="hs-public-hint"><?php if ($guestPreview): ?><strong>Gästeansicht.</strong> <?php endif; ?>Hier sehen auch Gäste alle Einträge mit öffentlicher Freigabe. <a href="konto.php?einstellung=highscore#highscore">Eigene Sichtbarkeit einstellen</a><?php if ($guestPreview): ?> · <a href="highscore.php">Rangliste für angemeldete Lernende</a><?php endif; ?></p>
<?php else: ?>
  <p class="hs-public-hint"><a href="highscore.php?ansicht=gast">Gästeansicht öffnen</a></p>
<?php endif; ?>
<?php if ($me && (!$me['visible'] || $me['blocked'])): ?>
  <div class="konto-alert hs-hint" role="status">Du bist im Highscore <strong>unsichtbar</strong>.<?php if(!$me['blocked']): ?> Mit deinen <?=number_format($me['level']['xp'],0,',','.')?> XP wärst du auf <strong>Platz <?=$rank?></strong>. <a href="konto.php?einstellung=highscore#highscore">Sichtbarkeit einschalten</a><?php endif; ?></div>
  <?php endif; ?>
  <?php if (!$rows): ?>
  <?php if ($publicOnly): ?>
  <p class="konto-empty hs-public-empty">Noch hat niemand einen Eintrag für die öffentliche Rangliste freigegeben.</p>
  <?php else: ?>
  <p class="konto-empty">Noch hat niemand die Sichtbarkeit eingeschaltet. Sei die erste Person: <a class="text-link" href="konto.php?einstellung=highscore#highscore">Sichtbarkeit einschalten →</a></p>
  <?php endif; ?>
  <?php endif; ?>
  <?php require_once __DIR__.'/highscore-board.php'; ?>
  <?php dtp_highscore_board($rows, $publicOnly ? 0 : (int)$learner['id'], $reveal, true); ?>
<?php if (!$publicOnly): ?>
  <a class="secondary-action" href="konto.php?bearbeiten=name#change_username">Benutzernamen ändern</a>
  <p class="konto-hint">Klicke auf einen Namen, um die Achievement-Sammlung anzusehen. Die Symbole auf den Karten zeigen die persönliche Vitrine. Deine eigenen Achievements findest du unter <a href="konto.php#achievements">Mein Fortschritt</a>.</p>
<?php endif; ?>
  <a class="primary-action arcade-continue" href="./#lernmodule">Weiter lernen! <span aria-hidden="true">→</span></a>
  </div>
</main>
<?php if(!$publicOnly): ?><dialog class="profile-dialog" id="learner-profile" aria-labelledby="profile-title"><div class="profile-toolbar"><h2 id="profile-title">Lernprofil</h2><button type="button" class="secondary-action" data-profile-close aria-label="Profil schließen">Schließen ×</button></div><div id="profile-content" aria-live="polite"></div></dialog><?php endif; ?>
<footer class="dtp-footer"><div class="footer-inner"><?=dtp_footer_brand()?><div class="footer-links"><a href="./">DAU TO PRO</a><a href="../impressum.php">Impressum</a><a href="../datenschutz.php#lernkonten">Datenschutz</a></div><small>© 2026 Willi Gering</small></div></footer>
</body></html>
