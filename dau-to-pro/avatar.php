<?php
// DAU TO PRO: Avatar-Editor. Gäste können ausprobieren, speichern geht nur mit Lernkonto.
declare(strict_types=1);
require_once __DIR__.'/../dau_lib.php';
require_once __DIR__.'/../avatar_lib.php';
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');

$learner=learner_current();
$saved=null;$progress=avatar_progress_guest();$levelInfo=null;
if ($learner) {
    $id=(int)$learner['id'];
    try { ach_evaluate($id); } catch (Throwable $error) { error_log('DAU TO PRO Achievements: '.$error->getMessage()); }
    $progress=avatar_progress($id);
    $levelInfo=ach_stats($id)['level'];
    $saved=avatar_get($id);
}
$config=avatar_apply_locks($saved??avatar_default(),$progress);
$data=[
    'manifest'=>avatar_manifest(),
    'config'=>$config,
    'unlocks'=>avatar_unlock_map($progress),
    'canSave'=>(bool)$learner,
    'saved'=>$saved!==null,
    'csrf'=>$learner?csrf():'',
    'api'=>'api/avatar.php',
    'assets'=>'../'.AVATAR_DIR.'/',
    'version'=>(string)@filemtime(__DIR__.'/../'.AVATAR_DIR.'/manifest.json'),
];
$unlockedCount=0;$totalCount=0;
foreach ($data['unlocks'] as $slot=>$items) foreach ($items as $state) {$totalCount++;$unlockedCount+=$state['ok']?1:0;}
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090c0e">
  <meta name="robots" content="noindex, nofollow">
  <title>Avatar-Editor · DAU TO PRO</title>
  <link rel="icon" type="image/svg+xml" href="../assets/dau-to-pro-pixelpilz.svg?v=20261103">
  <link rel="stylesheet" href="style.css?v=<?=filemtime(__DIR__.'/style.css')?>">
  <link rel="stylesheet" href="konto.css?v=<?=filemtime(__DIR__.'/konto.css')?>">
  <link rel="stylesheet" href="highscore-arcade.css?v=<?=filemtime(__DIR__.'/highscore-arcade.css')?>">
  <link rel="stylesheet" href="avatar.css?v=<?=filemtime(__DIR__.'/avatar.css')?>">
  <script src="avatar-editor.js?v=<?=filemtime(__DIR__.'/avatar-editor.js')?>" defer></script>
  <script src="site.js?v=<?=filemtime(__DIR__.'/site.js')?>" defer></script>
</head>
<body class="konto-page avatar-page">
<?=dtp_backdrop()?>
<a class="skip" href="#inhalt">Direkt zum Inhalt</a>
<?=dtp_nav('avatar',$learner['username']??null)?>
<main id="inhalt" class="konto-main avatar-main">
  <section class="konto-head avatar-head">
    <div>
      <p class="eyebrow">DAU-TO-PRO · CHARAKTER</p>
      <h1>Dein <span>Avatar</span></h1>
      <p class="konto-lead">Bau dir deine Figur für Highscore und Profil. Neue Teile schaltest du mit Leveln und Achievements frei, das Lernen bleibt dabei genau so, wie es ist.</p>
    </div>
  </section>
  <?php if (!$learner): ?>
  <div class="konto-alert avatar-guest" role="status">Du bist nicht angemeldet. Du kannst die freien Teile ausprobieren, <a href="konto.php">speichern geht mit einem Lernkonto</a>.</div>
  <?php endif; ?>
  <div class="avatar-editor" data-avatar-editor>
    <section class="avatar-stage" aria-label="Vorschau">
      <div class="avatar-stage-frame">
        <div class="avatar-hex" data-avatar-preview><?=avatar_stack_html($config,'webp')?></div>
      </div>
      <div class="avatar-stage-meta">
        <?php if ($levelInfo): ?>
          <span class="avatar-level"><b>Level <?=(int)$levelInfo['level']?></b> · <?=e($levelInfo['title'])?></span>
        <?php else: ?>
          <span class="avatar-level"><b>Gastmodus</b> · nur freie Teile</span>
        <?php endif; ?>
        <span class="avatar-count"><b data-avatar-unlocked><?=$unlockedCount?></b> / <?=$totalCount?> Teile frei</span>
      </div>
      <div class="avatar-actions">
        <?php if ($learner): ?>
          <button type="button" class="primary-action" data-avatar-save>Avatar speichern</button>
        <?php else: ?>
          <a class="primary-action" href="konto.php">Anmelden zum Speichern <span aria-hidden="true">→</span></a>
        <?php endif; ?>
        <button type="button" class="secondary-action" data-avatar-random>Zufall</button>
        <button type="button" class="secondary-action" data-avatar-reset>Zurücksetzen</button>
      </div>
      <p class="avatar-status" data-avatar-status role="status" aria-live="polite"><?=$learner?($saved?'Dein gespeicherter Avatar.':'Noch nicht gespeichert: Das ist der Standard-Avatar.'):''?></p>
    </section>
    <section class="avatar-panel" aria-label="Kategorien">
      <div class="avatar-tabs" role="tablist" aria-label="Kategorien" data-avatar-tabs></div>
      <div class="avatar-slots" data-avatar-slots><noscript><p class="konto-hint">Für den Editor wird JavaScript benötigt.</p></noscript></div>
    </section>
  </div>
  <p class="konto-hint avatar-foot"><a class="text-link" href="./#highscore">Zum Highscore →</a><?php if($learner): ?> · <a class="text-link" href="konto.php#achievements">Achievements ansehen →</a><?php endif; ?></p>
</main>
<script type="application/json" id="avatar-data"><?=json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_THROW_ON_ERROR)?></script>
<footer class="dtp-footer"><div class="footer-inner"><?=dtp_footer_brand()?><div class="footer-links"><a href="./">DAU TO PRO</a><a href="../impressum.php">Impressum</a><a href="../datenschutz.php#lernkonten">Datenschutz</a></div><small>© 2026 Willi Gering</small></div></footer>
</body></html>
