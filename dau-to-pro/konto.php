<?php
// DAU TO PRO: Lernkonto (Anmelden, Registrieren, Passwort vergessen) und „Mein Fortschritt“.
declare(strict_types=1);
require_once __DIR__.'/../dau_lib.php';
require_once __DIR__.'/../achievements_lib.php';
require_once __DIR__.'/../avatare_lib.php';
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');

$flash=$_SESSION['dtp_konto']??[];
unset($_SESSION['dtp_konto']);
$next=learner_safe_next((string)($_GET['weiter']??$_POST['weiter']??''));

/** Post/Redirect/Get with a one-time message. */
function konto_back(string $mode='',array $flash=[],string $next=''): never {
    $_SESSION['dtp_konto']=$flash;
    $query=array_filter(['modus'=>$mode,'weiter'=>$next]);
    header('Location: konto.php'.($query?'?'.http_build_query($query):''),true,303);
    exit;
}

if (($_SERVER['REQUEST_METHOD']??'GET')==='POST') {
    $action=(string)($_POST['action']??'');
    $mode=['register'=>'registrieren','recover'=>'vergessen'][$action]??'';
    if (!hash_equals((string)($_SESSION['csrf']??''),(string)($_POST['csrf']??'')))
        konto_back($mode,['error'=>'Die Seite war zu lange offen. Bitte versuche es noch einmal.','username'=>(string)($_POST['username']??'')],$next);
    $username=(string)($_POST['username']??'');
    try {
        switch ($action) {
            case 'register':
                learner_spam_check($_POST);
                [$learner,$code]=learner_register($username,(string)($_POST['password']??''),(string)($_POST['password2']??''));
                learner_start_session($learner);
                konto_back('',['code'=>$code,'code_reason'=>'new'],$next);
            case 'login':
                learner_login($username,(string)($_POST['password']??''),!empty($_POST['remember']));
                // Nach der Anmeldung geht es zurück auf die DAU-TO-PRO-Hauptseite (oder direkt ins gewünschte Modul).
                header('Location: '.($next!==''?'../'.$next.'/':'./'),true,303);exit;
            case 'recover':
                learner_spam_check($_POST);
                $code=learner_recover($username,(string)($_POST['code']??''),(string)($_POST['password']??''),(string)($_POST['password2']??''));
                konto_back('',['code'=>$code,'code_reason'=>'recovered'],$next);
        }
        $learner=learner_current();
        if (!$learner) konto_back('',['error'=>'Bitte melde dich zuerst an.'],$next);
        $id=(int)$learner['id'];
        switch ($action) {
            case 'logout':
                learner_logout();
                konto_back('',['ok'=>'Du bist abgemeldet. Der Fortschritt deines Kontos wurde von diesem Gerät entfernt und bleibt sicher im Konto gespeichert.','clear_uid'=>(string)$id]);
            case 'change_username':
                learner_change_username($learner,(string)($_POST['current']??''),$username);
                konto_back('',['ok'=>'Benutzername geändert. Verwende ab jetzt den neuen Namen zur Anmeldung.']);
            case 'change_password':
                learner_change_password($learner,(string)($_POST['current']??''),(string)($_POST['password']??''),(string)($_POST['password2']??''));
                konto_back('',['ok'=>'Passwort geändert. Andere Geräte wurden abgemeldet.'],'');
            case 'new_code':
                $code=learner_regenerate_code($learner,(string)($_POST['current']??''));
                konto_back('',['code'=>$code,'code_reason'=>'renewed']);
            case 'delete_module':
                $slug=(string)($_POST['slug']??'');
                $count=hp_valid_slug($slug)?learner_progress_delete_module($id,$slug):0;
                konto_back('',['ok'=>$count>0?'Fortschritt für dieses Modul gelöscht ('.$count.' '.($count===1?'Eintrag':'Einträge').'). Auch auf deinen anderen Geräten wird er beim nächsten Öffnen entfernt.':'Für dieses Modul war nichts gespeichert.']);
            case 'showcase':
                $slots=$_POST['slots']??[];
                if(!is_array($slots)) throw new LearnerError('Ungültige Vitrine.');
                xp_set_showcase($id,$slots);
                konto_back('',['ok'=>'Vitrine gespeichert.','section'=>'vitrine']);
            case 'highscore':
                $visible=($_POST['visible']??'')==='1';
                ach_set_visible($id,$visible,($_POST['public']??'')==='1');
                if ($visible) {
                    $_SESSION['dtp_highscore_reveal']=$id;
                    header('Location: ./#highscore',true,303);
                    exit;
                }
                unset($_SESSION['dtp_highscore_reveal']);
                konto_back('',['ok'=>'Du bist im Highscore nicht mehr sichtbar.','section'=>'highscore']);
            case 'export':
                header('Content-Type: application/json; charset=utf-8');
                header('Content-Disposition: attachment; filename="dau-to-pro-fortschritt-'.preg_replace('/[^A-Za-z0-9._-]/','',$learner['username']).'.json"');
                echo json_encode(learner_export($learner)+['level_und_achievements'=>ach_export($id)],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
                exit;
            case 'reset_all':
                if (($_POST['confirm']??'')!=='NULL') throw new LearnerError('Bitte tippe NULL in das Bestätigungsfeld.');
                learner_reset_all($learner,(string)($_POST['current']??''));
                konto_back('',['ok'=>'Alles auf null: Fortschritt in allen Modulen, Achievements, XP und Level sind gelöscht. Auf deinen anderen Geräten verschwindet der alte Stand beim nächsten Öffnen eines Moduls.','clear_uid'=>(string)$id]);
            case 'delete_account':
                if (($_POST['confirm']??'')!=='LÖSCHEN') throw new LearnerError('Bitte tippe LÖSCHEN in das Bestätigungsfeld.');
                learner_delete_account($learner,(string)($_POST['current']??''));
                konto_back('',['ok'=>'Dein Lernkonto und der gespeicherte Fortschritt wurden vollständig gelöscht.','clear_uid'=>(string)$id]);
        }
        konto_back('',['error'=>'Unbekannte Aktion.']);
    } catch (LearnerError $error) {
        $section=in_array($action,['change_username','change_password','new_code','delete_account','highscore','reset_all'],true)?$action:'';
        konto_back($mode,['error'=>$error->getMessage(),'username'=>$username,'section'=>$section,'remember'=>!empty($_POST['remember'])],$next);
    }
}

$learner=learner_current();
$mode=(string)($_GET['modus']??'');
if (!in_array($mode,['registrieren','vergessen'],true)) $mode='anmelden';
$c=dtp_page_content();
$nextTitle='';
if ($next!=='') {
    $q=db()->prepare("SELECT title FROM html_pages WHERE slug=? AND category='lernen' AND published=1");
    $q->execute([$next]);
    $nextTitle=(string)($q->fetchColumn()?:'');
    if ($nextTitle==='') $next='';
}
$summary=$learner?learner_progress_summary((int)$learner['id']):[];
// Level und Achievements: beim Öffnen nachrechnen (z. B. „Willkommen, DAU“ für bestehende Konten).
$ach=null;$achStats=null;
if ($learner) {
    try { ach_evaluate((int)$learner['id']); } catch (Throwable $error) { error_log('DAU TO PRO Achievements: '.$error->getMessage()); }
    $achStats=ach_stats((int)$learner['id']);
    $ach=ach_overview((int)$learner['id']);
}
$started=array_values(array_filter($summary,fn($m)=>$m['entries']>0));
$publishedCount=count(array_filter($summary,fn($m)=>(int)$m['published']===1));
$lastActivity=$started[0]['last_update']??null;
$entryTotal=array_sum(array_column($summary,'entries'));
$formToken=learner_form_token();
$username=(string)($flash['username']??'');
$hidden=fn(string $action): string => '<input type="hidden" name="csrf" value="'.e(csrf()).'"><input type="hidden" name="action" value="'.e($action).'">'.($next!==''?'<input type="hidden" name="weiter" value="'.e($next).'">':'');
// Invisible spam protection: a field people never see (bots fill it) and a signed time stamp.
$spam='<div class="hp-field" aria-hidden="true"><label>Webseite <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div><input type="hidden" name="ft" value="'.e($formToken).'">';
$title=$learner?'Mein Fortschritt':($mode==='registrieren'?'Konto erstellen':($mode==='vergessen'?'Passwort vergessen':'Anmelden'));
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090c0e">
  <meta name="robots" content="noindex, nofollow">
  <title><?=e($title)?> · DAU TO PRO</title>
  <link rel="icon" type="image/svg+xml" href="../assets/dau-to-pro-pixelpilz.svg?v=20261103">
  <link rel="stylesheet" href="style.css?v=<?=filemtime(__DIR__.'/style.css')?>">
  <link rel="stylesheet" href="konto.css?v=<?=filemtime(__DIR__.'/konto.css')?>">
  <link rel="stylesheet" href="avatare.css?v=<?=filemtime(__DIR__.'/avatare.css')?>">
  <script src="site.js?v=<?=filemtime(__DIR__.'/site.js')?>" defer></script>
  <?php if($learner): ?><script src="showcase-picker.js?v=<?=filemtime(__DIR__.'/showcase-picker.js')?>" defer></script><?php endif; ?>
</head>
<body class="konto-page">
<?=dtp_backdrop()?>
<a class="skip" href="#inhalt">Direkt zum Inhalt</a>
<?=dtp_nav('konto',$learner['username']??null)?>
<main id="inhalt" class="konto-main">
<?php if (!empty($flash['clear_uid'])): ?>
<script>
// Abmelden: Fortschritt dieses Kontos vom Gerät entfernen (er bleibt im Konto gespeichert).
(function(){try{var ls=localStorage,uid=<?=json_encode((string)$flash['clear_uid'])?>;if(ls.getItem('dtp-sync:owner')!==uid)return;
for(var i=ls.length-1;i>=0;i--){var k=ls.key(i);if(k!==null)ls.removeItem(k);}}catch(e){}})();
</script>
<?php endif; ?>
<?php if (!empty($flash['error'])): ?><div class="konto-alert is-error" role="alert"><?=e($flash['error'])?></div><?php endif; ?>
<?php if (!empty($flash['ok'])): ?><div class="konto-alert is-ok" role="status"><?=e($flash['ok'])?></div><?php endif; ?>

<?php if ($learner && !empty($flash['code'])): ?>
  <section class="konto-card code-card" aria-labelledby="code-title">
    <p class="eyebrow"><?=$flash['code_reason']==='new'?'KONTO ERSTELLT':'NEUER WIEDERHERSTELLUNGSCODE'?></p>
    <h1 id="code-title">Dein Wiederherstellungscode</h1>
    <p class="konto-lead">Weil wir keine E-Mail-Adresse speichern, ist dieser Code der <strong>einzige Weg</strong>, ein vergessenes Passwort selbst zurückzusetzen. Er wird nur dieses eine Mal angezeigt.<?php if($flash['code_reason']!=='new'): ?> Der alte Code gilt ab sofort nicht mehr.<?php endif; ?></p>
    <div class="code-box"><code id="recovery-code"><?=e($flash['code'])?></code></div>
    <div class="code-actions">
      <button type="button" class="secondary-action" data-copy="recovery-code">Code kopieren</button>
      <button type="button" class="secondary-action" data-download="recovery-code" data-user="<?=e($learner['username'])?>">Als Textdatei speichern</button>
    </div>
    <p class="konto-hint">Tipp: Speichere ihn im Passwort-Manager oder schreib ihn auf. Verlierst du Passwort <em>und</em> Code, kann nur der Betreiber das Passwort zurücksetzen.</p>
    <label class="confirm-check"><input type="checkbox" id="code-saved"> Ich habe den Code sicher aufbewahrt.</label>
    <a class="primary-action is-disabled" id="code-continue" aria-disabled="true" href="<?=e($next!==''?'../'.$next.'/':'./')?>"><?=e($next!==''?'Weiter zu „'.$nextTitle.'“':'Weiter zu DAU TO PRO')?> <span aria-hidden="true">→</span></a>
  </section>

<?php elseif ($learner): ?>
  <section class="konto-head">
    <div>
      <p class="eyebrow">MEIN FORTSCHRITT</p>
      <h1>Hallo, <span><?=e($learner['username'])?></span>!</h1>
      <p class="konto-lead">Alles, was du in den Lernmodulen machst, wird automatisch in deinem Konto gespeichert, auf jedem Gerät, auf dem du angemeldet bist. Unten links im Modul zeigt dir ein kleiner Hinweis, ob gespeichert wurde.</p>
    </div>
    <?php if ($nextTitle!==''): ?><a class="primary-action konto-next" href="../<?=e($next)?>/">Weiter mit „<?=e($nextTitle)?>“ <span aria-hidden="true">→</span></a><?php endif; ?>
    <dl class="konto-stats">
      <div><dt>Module begonnen</dt><dd><?=count($started)?><small> / <?=$publishedCount?></small></dd></div>
      <div><dt>Gespeicherte Einträge</dt><dd><?=$entryTotal?></dd></div>
      <div><dt>Zuletzt aktiv</dt><dd class="is-text"><?=e(learner_format_time($lastActivity))?></dd></div>
    </dl>
  </section>

    <section class="level-panel" aria-label="Dein Level">
      <div class="level-badge"><small>LEVEL</small><b><?=$achStats['level']['level']?></b></div>
      <div class="level-body">
        <p class="level-title"><?=e($achStats['level']['title'])?></p>
        <div class="level-bar" role="progressbar" aria-label="Fortschritt zum nächsten Level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="<?=$achStats['level']['percent']?>"><i style="width:<?=$achStats['level']['percent']?>%"></i></div>
        <p class="level-meta"><?=number_format($achStats['level']['xp'],0,',','.')?> XP<?php if(!$achStats['level']['max']): ?> · noch <?=number_format($achStats['level']['to']-$achStats['level']['xp'],0,',','.')?> XP bis Level <?=$achStats['level']['level']+1?><?php else: ?> · höchstes Level erreicht<?php endif; ?></p>
      </div>
      <a class="level-link" href="#achievements"><b><?=$ach['done']?></b><small>/ <?=$ach['total']?> Achievements</small></a>
    </section>

    <?php $kontoAvatar=null;try{$kontoAvatar=dtp_avatar_get((int)$learner['id']);}catch(Throwable $error){error_log('DAU TO PRO Avatare: '.$error->getMessage());} ?>
    <section class="konto-avatar" aria-label="Dein Avatar">
      <div class="konto-avatar-hex" aria-hidden="true"><?=dtp_avatar_stack_html($kontoAvatar)?></div>
      <div>
        <strong><?=$kontoAvatar?'Dein Avatar':'Noch kein Avatar gewählt'?></strong>
        <p><?=$kontoAvatar?'So erscheinst du im Highscore und in deinem Lernprofil.':'Such dir eine von sieben Figuren aus und stell ihr Zubehör zusammen. Sie erscheint im Highscore und in deinem Lernprofil.'?></p>
        <a class="secondary-action" href="avatare.php"><?=$kontoAvatar?'Avatar ändern':'Avatar wählen'?> <span aria-hidden="true">→</span></a>
      </div>
    </section>

  <?php require __DIR__.'/progress-panels.php'; ?>

  <section aria-labelledby="ach-title" class="konto-section" id="achievements">
    <div class="konto-section-head"><h2 id="ach-title">Achievements</h2><span class="konto-meta"><strong><?=$ach['done']?></strong> von <?=$ach['total']?> freigeschaltet · <a class="text-link" href="highscore.php">Highscore ansehen →</a></span></div>
    <?php foreach($ach['groups'] as $group): $doneInGroup=count(array_filter($group['items'],fn($i)=>$i['unlocked'])); ?>
    <details class="ach-group"<?=$doneInGroup>0||$group['id']==='global'?' open':''?>>
      <summary><span><small class="ach-subject"><?=e($group['subject'])?></small><b><?=e($group['title'])?></b></span><span class="ach-count"><?=$doneInGroup?> / <?=count($group['items'])?></span></summary>
      <ul class="ach-grid">
        <?php foreach($group['items'] as $item): ?>
        <li class="ach-item tier-<?=e($item['tier'])?><?=$item['unlocked']?' is-on':''?><?=$item['secret']?' is-secret':''?>">
          <span class="ach-icon" aria-hidden="true"><?php if(!$item['secret'] && !empty($item['icon'])): ?><img src="<?=e($item['icon'])?>" alt="" width="42" height="42" loading="lazy" style="object-fit:contain;image-rendering:pixelated"><?php else: ?><?=$item['secret']?'?':($item['tier']==='witzig'?'🤡':($item['tier']==='platin'?'💎':($item['tier']==='versteckt'?'🍄':'🏆')))?><?php endif; ?></span>
          <span class="ach-text"><b><?=e($item['name'])?></b><small><?=e($item['desc'])?></small>
            <span class="ach-meta"><?=e($item['tier_label'])?><?php if(!$item['secret']): ?> · <?=$item['xp']?> XP<?php endif; ?><?php if($item['unlocked']): ?> · <span class="ach-date">✓ <?=e(learner_format_time($item['unlocked_at']))?></span><?php else: ?> · <span class="sr-only">noch </span>gesperrt<?php endif; ?></span></span>
        </li>
        <?php endforeach; ?>
      </ul>
    </details>
    <?php endforeach; ?>
    <p class="konto-hint">Achievements, Level und XP werden aus deinem gespeicherten Fortschritt berechnet. Einmal freigeschaltet bleiben sie, auch wenn du den Fortschritt eines Moduls löschst. Komplett neu anfangen geht unter Konto-Einstellungen → „Alles auf null setzen“.</p>
  </section>

  <section aria-labelledby="settings-title" class="konto-section" id="einstellungen">
    <div class="konto-section-head"><h2 id="settings-title">Konto-Einstellungen</h2><span class="konto-meta">Angemeldet als <strong><?=e($learner['username'])?></strong> · Konto seit <?=e(learner_format_time($learner['created_at']))?></span></div>
    <div class="settings-list">
      <details class="settings-item" id="change_username"<?=($flash['section']??'')==='change_username'||($_GET['bearbeiten']??'')==='name'?' open':''?>>
        <summary><span><b>Benutzernamen ändern</b><small>Der neue Name gilt für die Anmeldung und deinen Eintrag im Highscore.</small></span></summary>
        <form method="post" class="settings-body">
          <?=$hidden('change_username')?>
          <label>Neuer Benutzername<input name="username" value="<?=e(($flash['section']??'')==='change_username'?$username:$learner['username'])?>" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="24" pattern="[A-Za-z0-9][A-Za-z0-9._\-]{1,22}[A-Za-z0-9]" aria-describedby="rename-hint" required></label>
          <small class="field-hint" id="rename-hint">3–24 Zeichen: Buchstaben, Ziffern, Punkt, Unterstrich oder Bindestrich. Sonderzeichen nur einzeln und zwischen Buchstaben oder Ziffern.</small>
          <label>Aktuelles Passwort<input type="password" name="current" autocomplete="current-password" required></label>
          <button class="secondary-action" type="submit">Benutzernamen speichern</button>
        </form>
      </details>
      <details class="settings-item" id="change_password"<?=($flash['section']??'')==='change_password'?' open':''?>>
        <summary><span><b>Passwort ändern</b><small>Danach werden deine anderen Geräte abgemeldet.</small></span></summary>
        <form method="post" class="settings-body">
          <?=$hidden('change_password')?>
          <input type="text" name="username" value="<?=e($learner['username'])?>" autocomplete="username" hidden>
          <label>Aktuelles Passwort<input type="password" name="current" autocomplete="current-password" required></label>
          <label>Neues Passwort<input type="password" name="password" autocomplete="new-password" minlength="10" maxlength="200" required></label>
          <label>Neues Passwort wiederholen<input type="password" name="password2" autocomplete="new-password" minlength="10" maxlength="200" required></label>
          <button class="secondary-action" type="submit">Passwort ändern</button>
        </form>
      </details>
      <details class="settings-item" id="new_code"<?=($flash['section']??'')==='new_code'?' open':''?>>
        <summary><span><b>Wiederherstellungscode</b><small>Code verloren? Erzeuge einen neuen, der alte wird ungültig.</small></span></summary>
        <form method="post" class="settings-body">
          <?=$hidden('new_code')?>
          <label>Aktuelles Passwort<input type="password" name="current" autocomplete="current-password" required></label>
          <button class="secondary-action" type="submit">Neuen Code erzeugen</button>
        </form>
      </details>
      <details class="settings-item" id="highscore"<?=($flash['section']??'')==='highscore'?' open':''?>>
        <summary><span><b>Sichtbarkeit im Highscore</b><small><?=$achStats['visible']?'Eingeschaltet: andere Lernende sehen dich im Highscore.':'Ausgeschaltet: du bist im Highscore unsichtbar.'?></small></span></summary>
        <form method="post" class="settings-body">
          <?=$hidden('highscore')?>
          <p class="field-hint">Wenn du das einschaltest, sehen andere angemeldete Lernende im <a href="highscore.php">Highscore</a> deinen Benutzernamen, dein Level, deine XP und deine Achievements. Wenn du zusätzlich die öffentliche Anzeige einschaltest, können auch Gäste auf der Startseite deinen Benutzernamen, dein Level, deine XP, die Anzahl deiner Achievements und deine Achievement-Vitrine sehen. Du kannst beide Einstellungen jederzeit ändern.</p>
          <?php if($achStats['blocked']): ?><p class="field-hint">Hinweis: Dein Konto wurde vom Betreiber aus dem Highscore genommen.</p><?php endif; ?>
          <label class="confirm-check"><input type="checkbox" name="visible" value="1"<?=$achStats['visible']?' checked':''?>> Ich möchte im Highscore sichtbar sein.</label>
          <label class="confirm-check"><input type="checkbox" name="public" value="1"<?=$achStats['visible']&&ach_public_highscore_enabled((int)$learner['id'])?' checked':''?>> Wenn ich im Highscore sichtbar bin, darf mein Eintrag auch Gästen auf der Startseite angezeigt werden.</label>
          <button class="secondary-action" type="submit">Speichern</button>
        </form>
      </details>
      <details class="settings-item" id="daten">
        <summary><span><b>Daten herunterladen</b><small>Alles, was zu deinem Konto gespeichert ist, als JSON-Datei.</small></span></summary>
        <form method="post" class="settings-body"><?=$hidden('export')?><button class="secondary-action" type="submit">Daten herunterladen</button></form>
      </details>
      <details class="settings-item" id="abmelden">
        <summary><span><b>Abmelden</b><small>Entfernt deinen Fortschritt von diesem Gerät, im Konto bleibt er erhalten.</small></span></summary>
        <form method="post" class="settings-body"><?=$hidden('logout')?><button class="secondary-action" type="submit">Abmelden</button></form>
      </details>
      <details class="settings-item is-danger" id="reset_all"<?=($flash['section']??'')==='reset_all'?' open':''?>>
        <summary><span><b>Alles auf null setzen</b><small>Löscht deinen gesamten Lernstand inklusive Achievements, XP und Level. Das Konto bleibt.</small></span></summary>
        <form method="post" class="settings-body" onsubmit="return confirm('Wirklich ALLES auf null setzen? Fortschritt in allen Modulen, alle Achievements, XP und Level werden endgültig gelöscht. Das kann nicht rückgängig gemacht werden.')">
          <?=$hidden('reset_all')?>
          <p class="field-hint"><b>Achtung, endgültig:</b> Dein Fortschritt in allen Lernmodulen, alle freigeschalteten Achievements, deine XP, dein Level und deine Lerntage werden gelöscht, auf diesem und allen anderen Geräten. Die Highscore-Sichtbarkeit wird ausgeschaltet. Benutzername, Passwort und Wiederherstellungscode bleiben. Du startest wie mit einem neuen Konto. Tipp: Vorher unter „Daten herunterladen“ eine Sicherung speichern.</p>
          <label>Aktuelles Passwort<input type="password" name="current" autocomplete="current-password" required></label>
          <label><span>Zur Bestätigung <b>NULL</b> eintippen</span><input type="text" name="confirm" autocomplete="off" required pattern="NULL"></label>
          <button class="mini-action is-danger" type="submit">Alles auf null setzen</button>
        </form>
      </details>
      <details class="settings-item is-danger" id="delete_account"<?=($flash['section']??'')==='delete_account'?' open':''?>>
        <summary><span><b>Konto löschen</b><small>Löscht Konto und gesamten Fortschritt sofort und endgültig.</small></span></summary>
        <form method="post" class="settings-body" onsubmit="return confirm('Konto und gesamten Fortschritt endgültig löschen?')">
          <?=$hidden('delete_account')?>
          <label>Aktuelles Passwort<input type="password" name="current" autocomplete="current-password" required></label>
          <label><span>Zur Bestätigung <b>LÖSCHEN</b> eintippen</span><input type="text" name="confirm" autocomplete="off" required pattern="LÖSCHEN"></label>
          <button class="mini-action is-danger" type="submit">Konto endgültig löschen</button>
        </form>
      </details>
    </div>
  </section>

<?php else: ?>
  <section class="auth-layout">
    <div class="auth-intro">
      <p class="eyebrow">DEIN LERNKONTO</p>
      <h1>Lernen, <span>speichern</span>, weitermachen.</h1>
      <p class="konto-lead">Mit einem kostenlosen Konto merkt sich DAU TO PRO deinen Fortschritt in allen Lernmodulen, auch wenn du Gerät oder Browser wechselst.</p>
      <ul class="auth-points">
        <li><b>Keine E-Mail nötig.</b> Nur Benutzername und Passwort.</li>
        <li><b>Automatisch gespeichert.</b> Einfach angemeldet lernen, den Rest erledigen die Module.</li>
        <li><b>Passwort vergessen?</b> Dafür gibt es deinen persönlichen Wiederherstellungscode.</li>
        <li><b>Deine Daten.</b> Jederzeit herunterladen oder mit einem Klick löschen.</li>
      </ul>
      <?php if ($nextTitle!==''): ?><p class="auth-next">Danach geht es direkt weiter mit <strong><?=e($nextTitle)?></strong>.</p><?php endif; ?>
    </div>
    <div class="konto-card auth-card">
      <?php if ($mode!=='vergessen'): ?>
      <div class="auth-tabs" role="tablist">
        <a role="tab" href="?<?=e(http_build_query(array_filter(['weiter'=>$next])))?>" aria-selected="<?=$mode==='anmelden'?'true':'false'?>"<?=$mode==='anmelden'?' class="active"':''?>>Anmelden</a>
        <a role="tab" href="?<?=e(http_build_query(array_filter(['modus'=>'registrieren','weiter'=>$next])))?>" aria-selected="<?=$mode==='registrieren'?'true':'false'?>"<?=$mode==='registrieren'?' class="active"':''?>>Konto erstellen</a>
      </div>
      <?php endif; ?>
      <?php if ($mode==='anmelden'): ?>
      <form method="post" class="auth-form">
        <?=$hidden('login')?>
        <h1 class="sr-only">Anmelden</h1>
        <label>Benutzername<input name="username" value="<?=e($username)?>" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="24" required<?=$username===''?' autofocus':''?>></label>
        <label>Passwort<input type="password" name="password" autocomplete="current-password" maxlength="200" required<?=$username!==''?' autofocus':''?>></label>
        <label class="confirm-check"><input type="checkbox" name="remember" value="1"<?=!empty($flash['remember'])?' checked':''?>> Angemeldet bleiben (30 Tage, nur auf eigenen Geräten)</label>
        <button class="primary-action" type="submit">Anmelden <span aria-hidden="true">→</span></button>
        <a class="text-link" href="?<?=e(http_build_query(array_filter(['modus'=>'vergessen','weiter'=>$next])))?>">Passwort vergessen?</a>
      </form>
      <?php elseif ($mode==='registrieren'): ?>
      <form method="post" class="auth-form">
        <?=$hidden('register')?><?=$spam?>
        <h1 class="sr-only">Konto erstellen</h1>
        <label>Benutzername<input name="username" value="<?=e($username)?>" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="24" pattern="[A-Za-z0-9][A-Za-z0-9._\-]{1,22}[A-Za-z0-9]" aria-describedby="name-hint" required autofocus></label>
        <small class="field-hint" id="name-hint">3–24 Zeichen: Buchstaben, Ziffern, Punkt, Unterstrich, Bindestrich. Bitte nicht deinen echten vollen Namen.</small>
        <label>Passwort<input type="password" name="password" autocomplete="new-password" minlength="10" maxlength="200" aria-describedby="pw-hint" required></label>
        <small class="field-hint" id="pw-hint">Mindestens 10 Zeichen. Ein Satz wie „Mein Router heißt Kevin!“ ist gut zu merken.</small>
        <label>Passwort wiederholen<input type="password" name="password2" autocomplete="new-password" minlength="10" maxlength="200" required></label>
        <button class="primary-action" type="submit">Konto erstellen <span aria-hidden="true">→</span></button>
        <p class="field-hint">Gespeichert werden nur Benutzername, Passwort (verschlüsselt) und dein Lernfortschritt. Mehr in der <a href="../datenschutz.php#lernkonten">Datenschutzerklärung</a>.</p>
      </form>
      <?php else: ?>
      <form method="post" class="auth-form">
        <?=$hidden('recover')?><?=$spam?>
        <p class="eyebrow">PASSWORT VERGESSEN</p>
        <h1 class="auth-title">Mit Wiederherstellungscode zurücksetzen</h1>
        <p class="field-hint">Den Code hast du bei der Registrierung bekommen (Format DTP-XXXX-XXXX-XXXX).</p>
        <label>Benutzername<input name="username" value="<?=e($username)?>" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="24" required></label>
        <label>Wiederherstellungscode<input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="DTP-XXXX-XXXX-XXXX" required></label>
        <label>Neues Passwort<input type="password" name="password" autocomplete="new-password" minlength="10" maxlength="200" required></label>
        <label>Neues Passwort wiederholen<input type="password" name="password2" autocomplete="new-password" minlength="10" maxlength="200" required></label>
        <button class="primary-action" type="submit">Passwort zurücksetzen <span aria-hidden="true">→</span></button>
        <p class="field-hint">Code auch verloren? Dann kann der Betreiber dein Passwort zurücksetzen: <a href="../impressum.php">Kontakt im Impressum</a>.</p>
        <a class="text-link" href="?<?=e(http_build_query(array_filter(['weiter'=>$next])))?>">← Zurück zur Anmeldung</a>
      </form>
      <?php endif; ?>
    </div>
  </section>
<?php endif; ?>
</main>
<footer class="dtp-footer"><div class="footer-inner"><?=dtp_footer_brand()?><div class="footer-links"><a href="./">DAU TO PRO</a><a href="../impressum.php">Impressum</a><a href="../datenschutz.php">Datenschutz</a></div><small>© 2026 Willi Gering</small></div></footer>
<script>
(function(){
  var code=document.getElementById('recovery-code');
  if(code){
    var copy=document.querySelector('[data-copy]'),dl=document.querySelector('[data-download]'),box=document.getElementById('code-saved'),go=document.getElementById('code-continue');
    copy.addEventListener('click',function(){var t=code.textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){copy.textContent='Kopiert ✓';},function(){var r=document.createRange();r.selectNodeContents(code);var s=getSelection();s.removeAllRanges();s.addRange(r);copy.textContent='Markiert, mit Strg+C kopieren';});});
    dl.addEventListener('click',function(){var text='DAU TO PRO · Wiederherstellungscode\r\n\r\nBenutzername: '+dl.dataset.user+'\r\nCode: '+code.textContent+'\r\n\r\nDamit kannst du unter '+location.origin+location.pathname+'?modus=vergessen ein neues Passwort setzen.\r\nBewahre diese Datei sicher auf.\r\n';var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download='dau-to-pro-wiederherstellungscode.txt';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);});
    var sync=function(){go.classList.toggle('is-disabled',!box.checked);go.setAttribute('aria-disabled',String(!box.checked));};
    box.addEventListener('change',sync);
    go.addEventListener('click',function(e){if(!box.checked){e.preventDefault();box.focus();box.closest('label').classList.add('nudge');setTimeout(function(){box.closest('label').classList.remove('nudge')},600);}});
  }
  var section=<?=json_encode((string)($flash['section']??''))?>;
  if(section){var el=document.getElementById(section);if(el){el.scrollIntoView({block:'center'});el.classList.add('has-error');}}
})();
</script>
</body></html>


