<?php
// Admin 2.0: DAU-TO-PRO-Lernkonten ansehen, Passwort zurücksetzen, Konten löschen.
require __DIR__.'/../lib.php';
require_once __DIR__.'/../learner_lib.php';
require __DIR__.'/admin2_layout.php';
require_login();
header('Cache-Control: no-store, private');

function learners_back(array $notice,string $search=''): never {
    $_SESSION['learners_notice']=$notice;
    header('Location: learners.php'.($search!==''?'?q='.rawurlencode($search):''),true,303);
    exit;
}
if (($_SERVER['REQUEST_METHOD']??'GET')==='POST') {
    check_csrf();
    $action=(string)($_POST['action']??'');
    $search=(string)($_POST['q']??'');
    $id=(int)($_POST['id']??0);
    $learner=$id>0?learner_by_id($id):null;
    try {
        if ($action==='reset_password') {
            if (!$learner) throw new LearnerError('Lernkonto nicht gefunden.');
            $password=learner_admin_reset_password($id);
            learners_back(['ok'=>true,'message'=>'Neues Passwort für „'.$learner['username'].'“. Es wird nur jetzt angezeigt; bitte direkt weitergeben. Alle Geräte des Kontos wurden abgemeldet.','secret'=>$password],$search);
        }
        if ($action==='delete') {
            if (!$learner) throw new LearnerError('Lernkonto nicht gefunden.');
            if (($_POST['confirm_name']??'')!==$learner['username']) throw new LearnerError('Zum Löschen bitte den Benutzernamen exakt eintippen.');
            learner_delete($id);
            learners_back(['ok'=>true,'message'=>'Lernkonto „'.$learner['username'].'“ samt Fortschritt gelöscht.'],$search);
        }
        if ($action==='purge_empty') {
            $ids=learner_admin_empty_ids();
            foreach($ids as $emptyId) learner_delete($emptyId);
            learners_back(['ok'=>true,'message'=>count($ids).' leere Lernkonten gelöscht (ohne Fortschritt, seit über 30 Tagen nicht benutzt).'],$search);
        }
        throw new LearnerError('Unbekannte Aktion.');
    } catch (LearnerError $error) {
        learners_back(['ok'=>false,'message'=>$error->getMessage()],$search);
    }
}
$notice=$_SESSION['learners_notice']??null;
unset($_SESSION['learners_notice']);
$search=trim((string)($_GET['q']??''));
$rows=learner_admin_list($search);
$stats=learner_admin_stats();
admin2_open('learners','Lernkonten','Lernkonten · Admin 2.0','<style>
.learner-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:22px}
.learner-stats .card{padding:18px 20px}.learner-stats strong{display:block;font-size:30px;line-height:1.1;color:#f3d79c}.learner-stats span{font-size:11px;color:#8d979f;text-transform:uppercase;letter-spacing:1px;font-weight:760}
.learner-notice{border-radius:12px;padding:14px 16px;margin-bottom:20px;font-size:13px;border:1px solid #2f6b4c;background:#14261d;color:#bfefd4}
.learner-notice.error{border-color:#7d3b3b;background:#2a1719;color:#ffcfca}
.learner-secret{display:inline-block;margin-top:9px;font:800 20px ui-monospace,Consolas,monospace;letter-spacing:.06em;background:#0d1210;border:1px dashed #5fbf8c;border-radius:8px;padding:8px 14px;color:#fff;user-select:all}
.learner-search{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}.learner-search input{flex:1;min-width:200px;min-height:41px;border:1px solid #353d45;background:#1a2026;color:#f1f0ea;padding:9px 13px;border-radius:10px}
.learner-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.learner-actions form{display:flex;gap:6px;align-items:center}
.learner-actions input{width:120px;min-height:34px;border:1px solid #4a3434;background:#1a1416;color:#f1f0ea;padding:6px 9px;border-radius:8px;font-size:11px}
.learner-name{color:#f0f1ed;font-weight:780}
.learner-help{font-size:12px;color:#9ca7aa;line-height:1.7}
@media(max-width:750px){.learner-stats{grid-template-columns:1fr 1fr}.learner-actions{justify-content:flex-start}}
</style>');
?>
<div class="page-heading">
  <div><p class="eyebrow">DAU TO PRO</p><h1>Lernkonten</h1><p class="subtext">Konten der Lernenden (nur Benutzername und Passwort, keine E-Mail). Passwörter sind verschlüsselt gespeichert und hier nicht sichtbar.</p></div>
  <div class="heading-actions"><a class="btn btn-ghost" href="../dau-to-pro/konto.php" target="_blank" rel="noopener">Kontoseite öffnen</a></div>
</div>
<?php if ($notice): ?>
<div class="learner-notice <?=$notice['ok']?'':'error'?>" role="status"><?=e($notice['message'])?><?php if(!empty($notice['secret'])): ?><br><span class="learner-secret"><?=e($notice['secret'])?></span><?php endif; ?></div>
<?php endif; ?>
<div class="learner-stats">
  <div class="card"><strong><?=$stats['total']?></strong><span>Konten gesamt</span></div>
  <div class="card"><strong><?=$stats['active']?></strong><span>Aktiv (30 Tage)</span></div>
  <div class="card"><strong><?=$stats['empty_old']?></strong><span>Leer &amp; ungenutzt &gt; 30 Tage</span></div>
</div>
<div class="card card-pad">
  <form class="learner-search" method="get"><input type="search" name="q" value="<?=e($search)?>" placeholder="Benutzername suchen" aria-label="Benutzername suchen"><button class="btn">Suchen</button><?php if($search!==''): ?><a class="btn btn-ghost" href="learners.php">Zurücksetzen</a><?php endif; ?></form>
  <div class="table-wrap">
  <table class="project-table">
    <thead><tr><th>Benutzername</th><th>Erstellt</th><th>Zuletzt aktiv</th><th>Fortschritt</th><th class="table-end">Aktionen</th></tr></thead>
    <tbody>
    <?php if(!$rows): ?><tr><td colspan="5" class="empty-state"><?=$search!==''?'Kein Konto gefunden.':'Noch keine Lernkonten.'?></td></tr><?php endif; ?>
    <?php foreach($rows as $row): ?>
      <tr>
        <td><span class="learner-name"><?=e($row['username'])?></span></td>
        <td><?=e(learner_format_time($row['created_at']))?></td>
        <td><?=e(learner_format_time($row['last_seen_at']??$row['last_login_at']))?></td>
        <td><?=(int)$row['entries']>0?(int)$row['modules'].' '.((int)$row['modules']===1?'Modul':'Module').' · '.(int)$row['entries'].' Einträge':'<span class="text-muted">noch nichts gespeichert</span>'?></td>
        <td><div class="learner-actions">
          <form method="post" onsubmit="return confirm('Neues Passwort für <?=e($row['username'])?> erzeugen? Das alte Passwort gilt dann nicht mehr.')">
            <input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="reset_password"><input type="hidden" name="id" value="<?=(int)$row['id']?>"><input type="hidden" name="q" value="<?=e($search)?>">
            <button class="small-action" type="submit">Passwort zurücksetzen</button>
          </form>
          <form method="post" onsubmit="return confirm('Lernkonto <?=e($row['username'])?> mit gesamtem Fortschritt endgültig löschen?')">
            <input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?=(int)$row['id']?>"><input type="hidden" name="q" value="<?=e($search)?>">
            <input name="confirm_name" placeholder="Name zum Löschen" aria-label="Benutzername zur Bestätigung" autocomplete="off" required>
            <button class="small-action danger" type="submit" style="color:#f4afa9;border-color:#673d3d">Löschen</button>
          </form>
        </div></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  </div>
</div>
<div class="card card-pad" style="margin-top:20px">
  <div class="section-head"><div><h2>Spamschutz &amp; Aufräumen</h2><p class="section-sub">Unsichtbar für Lernende, ohne Captcha und ohne externe Dienste.</p></div>
  <form method="post" onsubmit="return confirm('Alle <?=$stats['empty_old']?> leeren, seit über 30 Tagen ungenutzten Konten löschen?')"><input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="purge_empty"><button class="btn btn-ghost" type="submit"<?=$stats['empty_old']===0?' disabled':''?>>Leere Konten löschen (<?=$stats['empty_old']?>)</button></form></div>
  <p class="learner-help">Registrierung: verstecktes Feld, das nur Bots ausfüllen, und eine Mindestzeit von 3 Sekunden zwischen Seitenaufruf und Absenden. Pro Anschluss höchstens 5 neue Konten pro Stunde. Anmeldung: nach 8 Fehlversuchen für einen Namen bzw. 20 von einem Anschluss 15 Minuten Pause. IP-Adressen werden dafür nur als nicht umkehrbarer Hash höchstens 24 Stunden gespeichert.<br>
  Hat jemand Passwort und Wiederherstellungscode verloren: „Passwort zurücksetzen“ erzeugt ein neues, das du einmalig siehst und weitergibst. Die Person kann es danach im Konto ändern.</p>
</div>
<?php admin2_close(); ?>
