<?php
require __DIR__.'/../lib.php';
require_once __DIR__.'/../dau_lib.php';
require __DIR__.'/admin2_layout.php';
require_login();
$db=db();
$apps=$db->query('SELECT * FROM apps ORDER BY sort_order,id DESC')->fetchAll(PDO::FETCH_ASSOC);
$pages=$db->query('SELECT * FROM html_pages ORDER BY updated_at DESC,id DESC')->fetchAll(PDO::FETCH_ASSOC);
$categories=project_categories();
$view=(string)($_GET['view']??'dashboard');
if (!in_array($view,['dashboard','projects','dau','publications','settings'],true)) $view='dashboard';
$labels=['dashboard'=>'Dashboard','projects'=>'Alle Projekte','dau'=>'DAU TO PRO','publications'=>'Veröffentlichungen','settings'=>'Einstellungen'];
$liveApps=count(array_filter($apps,static fn($x)=>(int)($x['published']??0)===1));
$livePages=count(array_filter($pages,static fn($x)=>(int)($x['published']??0)===1));
$draftPages=count($pages)-$livePages;
$dauPages=array_values(array_filter($pages,static fn($x)=>($x['category']??'')==='lernen'));
$dauLive=count(array_filter($dauPages,static fn($x)=>(int)($x['published']??0)===1));
$latest=array_slice(array_merge(array_map(static function($a){$a['_kind']='app';return $a;},$apps),array_map(static function($p){$p['_kind']='html';return $p;},$pages)),0,8);
function admin2_status(array $item): string {
  if(($item['_kind']??'')==='html') return (int)($item['published']??0)===1?'Online':'Entwurf / offline';
  return (int)($item['published']??0)===1?'Sichtbar':'Nicht sichtbar';
}
function admin2_name(array $item): string {return (string)($item['name']??$item['title']??'Ohne Titel');}
function admin2_target(array $item): string {
  return ($item['_kind']??'')==='html'?'html_projects.php#projekt-'.(int)$item['id']:'edit_app.php?id='.(int)$item['id'];
}
?>
<?php admin2_open($view,$labels[$view]); ?>
<?php if($view==='dashboard'): ?>
 <div class="page-heading"><div><p class="eyebrow">GERING DIGITAL · CONTROL CENTER</p><h1>Administrations-<span class="text-gold">übersicht</span></h1><p class="subtext">Echte Projekte, Lernprogramme und Veröffentlichungen auf einen Blick.</p></div>
 <div class="heading-actions"><a class="btn btn-gold" href="html_projects.php"><svg><use href="#i-plus"/></svg> HTML-Projekt hinzufügen</a><a class="btn btn-ghost" href="legacy.php"><svg><use href="#i-plus"/></svg> App hinzufügen</a></div></div>
 <div class="stat-grid">
  <div class="stat"><span class="stat-top">Alle Projekte <svg><use href="#i-box"/></svg></span><div class="stat-num"><?=count($apps)+count($pages)?></div><div class="stat-info">Apps und HTML-Projekte</div></div>
  <div class="stat"><span class="stat-top">Sichtbare Apps <svg><use href="#i-grid"/></svg></span><div class="stat-num"><?=$liveApps?></div><div class="stat-info">Im öffentlichen App-Katalog</div></div>
  <div class="stat"><span class="stat-top">Veröffentlichte HTML <svg><use href="#i-code"/></svg></span><div class="stat-num"><?=$livePages?></div><div class="stat-info">Online im Browser</div></div>
  <div class="stat"><span class="stat-top">Lernmodule <svg><use href="#i-book"/></svg></span><div class="stat-num"><?=$dauLive?></div><div class="stat-info">DAU TO PRO · veröffentlicht</div></div>
 </div>
 <div class="admin-areas">
 <section class="card card-pad"><p class="eyebrow">GERING DIGITAL</p><h2>Projekte &amp; Apps</h2><p class="subtext">Apps und Webprojekte auf deiner Portfolioseite pflegen.</p><div class="action-stack"><a class="btn btn-gold" href="index.php?view=projects">Projekte öffnen →</a><a class="btn btn-ghost" href="legacy.php">Apps bearbeiten</a></div></section>
 <section class="card card-pad"><p class="eyebrow">DAU TO PRO</p><h2>Deine Lernplattform</h2><p class="subtext">Lernmodule, Vorschaubilder, Startseitentexte und Lernkonten.</p><div class="action-stack"><a class="btn btn-gold" href="index.php?view=dau">Lernmodule öffnen →</a><a class="btn btn-ghost" href="dau_page.php">Startseite bearbeiten</a></div></section>
 </div>
 <div class="dash-grid">
 <div class="card card-pad"><div class="section-head"><div><h2>Deine Projekte</h2><p class="section-sub">Direkter Zugriff auf die Verwaltung</p></div><a class="link" href="index.php?view=projects">Alle ansehen →</a></div>
 <div class="table-wrap"><table class="project-table"><thead><tr><th>Projekt</th><th>Status</th><th>Aktion</th></tr></thead><tbody>
 <?php foreach($latest as $item): ?><tr><td><div class="proj-name"><?=e(admin2_name($item))?></div><div class="proj-detail"><?=($item['_kind']==='html'?'HTML-Projekt':'App')?></div></td><td><span class="badge <?=((int)($item['published']??0)===1)?'live':'draft'?>"><?=e(admin2_status($item))?></span></td><td><a class="small-action" href="<?=e(admin2_target($item))?>">Bearbeiten →</a></td></tr><?php endforeach; ?>
 <?php if(!$latest): ?><tr><td colspan="3" class="empty-state">Noch keine Projekte vorhanden.</td></tr><?php endif; ?>
 </tbody></table></div></div>
 <div class="card card-pad"><p class="tag">DEIN WORKFLOW</p><h3>Vom Entwurf bis online</h3><div class="workflow">
 <div class="workflow-step"><span class="step-icon"><svg><use href="#i-plus"/></svg></span><div><strong>01 · Anlegen</strong><small>HTML-Projekt hochladen oder App erfassen</small></div></div>
 <div class="workflow-step"><span class="step-icon"><svg><use href="#i-external"/></svg></span><div><strong>02 · Vorschau prüfen</strong><small>Entwurf bleibt vom öffentlichen Inhalt getrennt</small></div></div>
 <div class="workflow-step"><span class="step-icon"><svg><use href="#i-rocket"/></svg></span><div><strong>03 · Bewusst veröffentlichen</strong><small>Freigabe im vorhandenen HTML-Projektmanager</small></div></div>
 </div><div class="card-footer"><a class="btn btn-ghost full" href="html_projects.php">Veröffentlichungsmanager öffnen →</a></div></div>
 </div>
<?php elseif($view==='projects'): ?>
 <div class="page-heading"><div><p class="eyebrow">INHALTE VERWALTEN</p><h1>Alle Projekte</h1><p class="subtext">App-Katalog und veröffentlichbare HTML-Projekte. Die Bearbeitung bleibt durch Login und CSRF geschützt.</p></div><div class="heading-actions"><a class="btn btn-gold" href="html_projects.php">HTML hinzufügen</a><a class="btn btn-ghost" href="legacy.php">Apps verwalten</a></div></div>
 <div class="card full-table"><div class="table-wrap"><table class="project-table"><thead><tr><th>Projekt</th><th>Kategorie</th><th>Status</th><th>Aktion</th></tr></thead><tbody>
 <?php foreach($apps as $a): ?><tr><td><div class="proj-name"><?=e($a['name'])?></div><div class="proj-detail"><?=e($a['short_description']??'')?></div></td><td><?=e($categories[$a['category']??'apps']??'Apps')?></td><td><span class="badge <?=(int)($a['published']??0)===1?'live':'draft'?>"><?=(int)($a['published']??0)===1?'Sichtbar':'Entwurf'?></span></td><td><a class="small-action" href="edit_app.php?id=<?=(int)$a['id']?>">Bearbeiten</a></td></tr><?php endforeach; ?>
 <?php foreach($pages as $p): ?><tr><td><div class="proj-name"><?=e($p['title'])?></div><div class="proj-detail"><?=e($p['description']??'')?></div></td><td><?=e($categories[$p['category']??'lernen']??'HTML')?></td><td><span class="badge <?=(int)($p['published']??0)===1?'live':'draft'?>"><?=(int)($p['published']??0)===1?'Online':'Entwurf / offline'?></span></td><td><a class="small-action" href="html_projects.php#projekt-<?=(int)$p['id']?>">Bearbeiten</a></td></tr><?php endforeach; ?>
 <?php if(!$apps&&!$pages): ?><tr><td colspan="4" class="empty-state">Keine Projekte vorhanden.</td></tr><?php endif; ?>
 </tbody></table></div></div>
<?php elseif($view==='dau'): ?>
 <div class="page-heading"><div><p class="eyebrow">LERNPLATTFORM</p><h1>DAU TO PRO <span class="text-gold">/</span> Verwaltung</h1><p class="subtext">Hier erscheinen die Lernmodule der Kategorie DAU TO PRO direkt aus der Datenbank.</p></div>
 <div class="heading-actions"><a class="btn btn-gold" href="html_projects.php">Lernmodul hinzufügen</a><a class="btn btn-ghost" href="dau_page.php"><svg><use href="#i-edit"/></svg> Startseite bearbeiten</a><a class="btn btn-ghost" href="../dau-to-pro/" target="_blank" rel="noopener">Startseite ansehen ↗</a></div></div>
 <div class="dau-landing"><p class="eyebrow">DEINE LERNPLATTFORM</p><h2>Von Null Plan zu echtem <span>IT-Verständnis</span></h2><p>Der öffentliche Prüfungsfinder zeigt automatisch passende veröffentlichte Module. Neue Entwürfe sind erst nach deiner Freigabe sichtbar.</p><div class="dau-pills"><span>NETZWERKTECHNIK</span><span>IP &amp; SUBNETTING</span><span>PRÜFUNGSVORBEREITUNG</span></div></div>
 <div class="section-head"><div><h2>Deine Lernmodule <span class="text-gold">(<?=count($dauPages)?>)</span></h2><p class="section-sub"><?=$dauLive?> veröffentlicht · <?=count($dauPages)-$dauLive?> nicht online</p></div><a class="link" href="html_projects.php">Alle Module verwalten →</a></div>
 <div class="module-cards">
 <?php foreach($dauPages as $p): ?><?php $pv=dtp_preview_resolve($p); ?><article class="module"><div class="module-cover dau-cover" style="background:linear-gradient(125deg,#2e302c,#152329)"><?php if($pv['src']!==''): ?><img src="../<?=e($pv['small']?:$pv['src'])?>" alt="" loading="lazy" decoding="async" style="object-fit:<?=$pv['fit']?>;object-position:<?=$pv['x']?>% <?=$pv['y']?>%"><span class="cover-source"><?=e($pv['source']==='custom'?'Eigenes Bild':($pv['source']==='bundled'?'Motiv: ':'Automatisch: ').($pv['source']==='custom'?'':$pv['label']))?></span><?php else: ?><svg><use href="#i-book"/></svg><?php endif; ?></div><div class="module-body"><h3><?=e($p['title'])?></h3><p><?=e($p['description']??'')?></p><div class="module-bottom"><span class="badge <?=(int)($p['published']??0)===1?'live':'draft'?>"><?=(int)($p['published']??0)===1?'Online':'Entwurf / offline'?></span><a class="link" href="html_projects.php#projekt-<?=(int)$p['id']?>">Vorschaubild &amp; Daten →</a></div></div></article><?php endforeach; ?>
 <?php if(!$dauPages): ?><div class="card card-pad"><h3>Noch keine Lernmodule</h3><p class="subtext">Lege über „HTML-Projekte“ ein neues Projekt in der Kategorie „DAU to Pro“ an.</p></div><?php endif; ?>
 </div>
<?php elseif($view==='publications'): ?>
 <div class="page-heading"><div><p class="eyebrow">RELEASE CONTROL</p><h1>Veröffentlichungen</h1><p class="subtext">Status aller HTML-Projekte auf einen Blick. Die Freigabe selbst erfolgt geschützt im Projektmanager.</p></div><a class="btn btn-gold" href="html_projects.php">Veröffentlichungen verwalten</a></div>
 <div class="publish-summary"><div class="publish-summary-copy"><svg><use href="#i-lock"/></svg><div><strong>Kontrollierter Veröffentlichungsprozess</strong><p>Ein Entwurf wird niemals allein durch das Speichern öffentlich.</p></div></div><span class="badge live">Echte Statusdaten</span></div>
 <div class="kanban">
 <div class="lane"><div class="lane-header"><strong>Entwürfe / offline</strong><span class="lane-number"><?=$draftPages?></span></div><?php foreach($pages as $p):if((int)($p['published']??0)===1)continue;?><div class="pub-card"><strong><?=e($p['title'])?></strong><small><?=e($p['slug'])?></small><div class="pub-card-actions"><a class="btn btn-small" href="html_projects.php">Bearbeiten →</a></div></div><?php endforeach;?></div>
 <div class="lane"><div class="lane-header"><strong>Online</strong><span class="lane-number"><?=$livePages?></span></div><?php foreach($pages as $p):if((int)($p['published']??0)!==1)continue;?><div class="pub-card"><strong><?=e($p['title'])?></strong><small><?=e($p['slug'])?></small><div class="pub-card-actions"><a class="btn btn-small" href="../<?=rawurlencode($p['slug'])?>/" target="_blank" rel="noopener">Ansehen ↗</a><a class="btn btn-small" href="html_projects.php#projekt-<?=(int)$p['id']?>">Bearbeiten</a></div></div><?php endforeach;?></div>
 <div class="lane"><div class="lane-header"><strong>Apps</strong><span class="lane-number"><?=count($apps)?></span></div><p class="section-sub">Apps werden über die App-Verwaltung freigeschaltet.</p><a class="btn btn-ghost full" href="legacy.php">Apps verwalten →</a></div>
 </div>
<?php else: ?>
 <div class="page-heading"><div><p class="eyebrow">VERWALTUNG</p><h1>Einstellungen</h1><p class="subtext">Website-Einstellungen und Administrationszugang.</p></div></div>
 <div class="settings-grid">
  <div class="card settings-card"><h3>Website-Einstellungen</h3><p>Im bestehenden geschützten Formular bearbeiten.</p><a class="btn btn-gold" href="settings.php">Einstellungen öffnen →</a></div>
  <div class="card settings-card"><h3>Bestehende Verwaltung</h3><p>Vollständige bisherige Funktionen für Apps und Projekt-Reihenfolge.</p><a class="btn btn-ghost" href="legacy.php">Klassische Verwaltung →</a></div>
 </div><div class="admin-note">Die produktive SQLite-Datenbank und hochgeladene Dateien werden durch diese Oberflächenänderung nicht verändert.</div>
<?php endif; ?>

<?php admin2_close(); ?>

