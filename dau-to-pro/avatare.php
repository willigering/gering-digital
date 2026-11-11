<?php
// DAU TO PRO: Avatar wählen und Zubehör anlegen.
// Gäste können ausprobieren, speichern geht nur mit Lernkonto (Formular mit CSRF, Post/Redirect/Get).
declare(strict_types=1);
require_once __DIR__.'/../dau_lib.php';
require_once __DIR__.'/../avatare_lib.php';
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');

$learner=learner_current();
$flash=$_SESSION['dtp_avatare']??[];
unset($_SESSION['dtp_avatare']);

/** Zurück zur Seite mit einer einmaligen Meldung. */
function avatare_back(array $flash): never {
    $_SESSION['dtp_avatare']=$flash;
    header('Location: avatare.php',true,303);
    exit;
}

if (($_SERVER['REQUEST_METHOD']??'GET')==='POST') {
    if (!$learner) avatare_back(['error'=>'Zum Speichern bitte anmelden.']);
    if (!hash_equals((string)($_SESSION['csrf']??''),(string)($_POST['csrf']??''))) avatare_back(['error'=>'Die Seite war zu lange offen. Bitte versuche es noch einmal.']);
    $id=(int)$learner['id'];
    if (learner_rate_count('api','avatare:'.$id,60)>=30) avatare_back(['error'=>'Zu viele Speichervorgänge. Bitte kurz warten.']);
    learner_rate_add('api','avatare:'.$id);
    $choice=(string)($_POST['avatar']??'');
    try {
        if ($choice==='') {
            dtp_avatar_save($id,null);
            avatare_back(['ok'=>'Kein Avatar gewählt. Im Highscore bleibt deine Fassung leer.']);
        }
        $parts=$_POST['parts'][$choice]??[];
        dtp_avatar_save($id,['id'=>$choice,'parts'=>is_array($parts)?$parts:[]]);
        avatare_back(['ok'=>'Gespeichert. So erscheinst du jetzt im Highscore und in deinem Profil.']);
    } catch (LearnerError $error) {
        avatare_back(['error'=>$error->getMessage()]);
    }
}

$arcadeCatalog=dtp_avatar_arcade_catalog();
$catalog=$arcadeCatalog;
$saved=$learner?dtp_avatar_get((int)$learner['id']):null;
$level=$learner?dtp_avatar_learner_level((int)$learner['id']):1;
if ($saved && !isset($catalog[$saved['id']])) {
    $catalog[$saved['id']]=dtp_avatar_catalog()[$saved['id']];
}
$current=$saved??['id'=>'avatar-08','parts'=>[]];
$noneSelected=$learner && $saved===null;
// Hinweise zu Teilen, die sich überdecken, aber gemeinsam getragen werden.
$stackNotes=[
    'avatar-01'=>'Der Carbonkragen liegt unter der Kapuze und bleibt am Hals sichtbar.',
    'avatar-03'=>'Der Ohrclip sitzt vor dem Brillenriemen.',
    'avatar-04'=>'Das Stirnband liegt unter dem Rennvisier.',
    'avatar-06'=>'Die Schläfenklammer sitzt vor dem Kopfbügel.',
];
$data=['layers'=>[]];
foreach ($catalog as $aid=>$parts) {
    $data['layers'][$aid]=['basis'=>['512'=>dtp_avatar_url($aid.'-basis',512),'192'=>dtp_avatar_url($aid.'-basis')]];
    foreach ($parts as $part=>$label) $data['layers'][$aid][$part]=['512'=>dtp_avatar_url($aid.'-'.$part,512),'192'=>dtp_avatar_url($aid.'-'.$part)];
}
$data['order']=array_map('array_keys',$catalog);
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090c0e">
  <meta name="robots" content="noindex, nofollow">
  <title>Avatar wählen · DAU TO PRO</title>
  <link rel="icon" type="image/svg+xml" href="../assets/dau-to-pro-pixelpilz.svg?v=20261103">
  <link rel="stylesheet" href="style.css?v=<?=filemtime(__DIR__.'/style.css')?>">
  <link rel="stylesheet" href="konto.css?v=<?=filemtime(__DIR__.'/konto.css')?>">
  <link rel="stylesheet" href="avatare.css?v=<?=filemtime(__DIR__.'/avatare.css')?>">
  <script src="avatare.js?v=<?=filemtime(__DIR__.'/avatare.js')?>" defer></script>
  <script src="site.js?v=<?=filemtime(__DIR__.'/site.js')?>" defer></script>
</head>
<body class="konto-page avatare-page">
<?=dtp_backdrop()?>
<a class="skip" href="#inhalt">Direkt zum Inhalt</a>
<?=dtp_nav('avatare',$learner['username']??null)?>
<main id="inhalt" class="konto-main avatare-main">
  <section class="konto-head avatare-head">
    <div>
      <p class="eyebrow">DAU-TO-PRO · AVATAR</p>
      <h1>Dein <span>Avatar</span></h1>
      <p class="konto-lead">Wähle eine Figur für deinen Highscore und dein Lernprofil. Mit deinem Level schaltest du neue Kleidung und Zubehör frei.</p>
    </div>
    <nav class="avatare-navigation" aria-label="Konto und Lernmodule">
      <a class="secondary-action" href="konto.php">Mein Konto</a>
      <a class="primary-action" href="./#lernmodule">Weiter lernen</a>
    </nav>
  </section>
<?php if (!empty($flash['error'])): ?><div class="konto-alert is-error" role="alert"><?=e($flash['error'])?></div><?php endif; ?>
<?php if (!empty($flash['ok'])): ?><div class="konto-alert is-ok" role="status"><?=e($flash['ok'])?></div><?php endif; ?>
<?php if (!$learner): ?>
  <div class="konto-alert avatare-guest" role="status">Du bist nicht angemeldet. Ausprobieren geht sofort, <a href="konto.php">speichern geht mit einem Lernkonto</a>.</div>
<?php endif; ?>
  <form class="avatare-editor" method="post" action="avatare.php" data-avatare>
    <input type="hidden" name="csrf" value="<?=e($learner?csrf():'')?>">
    <section class="avatare-stage" aria-label="Vorschau">
      <div class="avatare-hex avatare-hex--large" data-avatare-preview="512"><?=dtp_avatar_stack_html($noneSelected?null:$current,512)?></div>
      <div class="avatare-mini">
        <div class="avatare-hex avatare-hex--96" data-avatare-preview="192"><?=dtp_avatar_stack_html($noneSelected?null:$current)?></div>
        <p>So groß erscheinst du im Highscore.</p>
      </div>
      <div class="avatare-actions">
        <?php if ($learner): ?>
          <button type="submit" class="primary-action">Avatar speichern</button>
        <?php else: ?>
          <a class="primary-action" href="konto.php">Anmelden zum Speichern <span aria-hidden="true">→</span></a>
        <?php endif; ?>
      </div>
      <p class="avatare-status konto-hint" data-avatare-status role="status" aria-live="polite"><?=$learner?($saved?'Das ist dein gespeicherter Avatar.':'Du hast noch keinen Avatar gespeichert.'):''?></p>
    </section>
    <div class="avatare-panel">
      <fieldset class="avatare-figures">
        <legend>Figur wählen</legend>
        <div class="avatare-grid">
          <?php foreach ($catalog as $aid=>$parts): $on=!$noneSelected && $current['id']===$aid; ?>
          <label class="avatare-figure">
            <input type="radio" name="avatar" value="<?=e($aid)?>"<?=$on?' checked':''?>>
            <span class="avatare-hex avatare-hex--thumb" aria-hidden="true"><span class="dtp-avatar"><img class="dtp-avatar-layer" src="<?=e(dtp_avatar_url($aid.(isset($arcadeCatalog[$aid])?'-basis':'-referenz')))?>" alt="" width="192" height="192" loading="lazy" decoding="async"></span></span>
            <span class="avatare-figure-label"><?=e(dtp_avatar_label($aid))?></span>
          </label>
          <?php endforeach; ?>
          <?php if ($learner): ?>
          <label class="avatare-figure is-none">
            <input type="radio" name="avatar" value=""<?=$noneSelected?' checked':''?>>
            <span class="avatare-hex avatare-hex--thumb" aria-hidden="true"></span>
            <span class="avatare-figure-label">Kein Avatar</span>
          </label>
          <?php endif; ?>
        </div>
      </fieldset>
      <?php foreach ($catalog as $aid=>$parts): $on=!$noneSelected && $current['id']===$aid; ?>
      <fieldset class="avatare-parts" data-parts-for="<?=e($aid)?>"<?=$on?'':' hidden'?>>
        <legend>Zubehör für <?=e(dtp_avatar_label($aid))?></legend>
        <?php foreach ($parts as $part=>$label):
            $requiredLevel=dtp_avatar_unlock_level($aid,$part);
            $locked=$requiredLevel>$level;
            $worn=!$locked && $current['id']===$aid && in_array($part,$current['parts'],true);
        ?>
        <label class="avatare-part">
          <input type="checkbox" name="parts[<?=e($aid)?>][]" value="<?=e($part)?>"<?=$worn?' checked':''?><?=$locked?' disabled':''?>>
          <span><?=e($label)?><?=$locked?' · ab Level '.$requiredLevel:''?></span>
        </label>
        <?php endforeach; ?>
        <?php if (isset($stackNotes[$aid])): ?><p class="konto-hint"><?=e($stackNotes[$aid])?></p><?php endif; ?>
      </fieldset>
      <?php endforeach; ?>
      <p class="konto-hint avatare-none-hint" data-parts-for=""<?=$noneSelected?'':' hidden'?>>Ohne Avatar bleibt deine Fassung im Highscore leer.</p>
    </div>
  </form>
  <p class="konto-hint avatare-foot"><a class="text-link" href="./#highscore">Zum Highscore →</a></p>
</main>
<script type="application/json" id="avatare-data"><?=json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_THROW_ON_ERROR)?></script>
<footer class="dtp-footer"><div class="footer-inner"><?=dtp_footer_brand()?><div class="footer-links"><a href="./">DAU TO PRO</a><a href="../impressum.php">Impressum</a><a href="../datenschutz.php#lernkonten">Datenschutz</a></div><small>© 2026 Willi Gering</small></div></footer>
</body></html>
