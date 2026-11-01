<?php
require __DIR__.'/../lib.php';
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
  return ($item['_kind']??'')==='html'?'html_projects.php':'legacy.php';
}
?>
<!doctype html>
<html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0b0d10">
<title>Gering Digital · Admin 2.0</title>
<link rel="stylesheet" href="admin2.css?v=<?=filemtime(__DIR__.'/admin2.css')?>">
<style>
a.nav-link{font-weight:650}.small-action{border:1px solid #655236;padding:7px 10px;border-radius:8px;color:#f0cf94;font-size:11px;white-space:nowrap}
.small-action:hover{background:#2d261d}.project-table td{vertical-align:middle}
.text-muted{font-size:11px;color:#84929c}.text-gold{color:#e7b665}.action-stack{display:flex;flex-wrap:wrap;gap:9px}
.empty-state{padding:30px;text-align:center;color:#9eabb2}.dau-landing{background:linear-gradient(115deg,#261f17,#15181b);border:1px solid #6e5736;border-radius:16px;padding:25px;margin-bottom:24px}
.dau-landing h2{font-size:32px;margin:5px 0 8px}.dau-landing h2 span{color:#e7b665}.dau-landing p{color:#9ca7aa;font-size:12px;max-width:640px}
.card-pad .subtext{margin:8px 0 18px}
.admin-note{border:1px solid #544630;background:#211d16;color:#d4bb8e;border-radius:10px;padding:14px 16px;font-size:12px;line-height:1.6;margin:22px 0}
.sidebar .nav-link{margin:2px 0}
.crumb strong{letter-spacing:.01em}
@media(max-width:750px){.sidebar{overflow-y:auto}.app-shell{grid-template-columns:1fr}}
</style>
</head><body>
<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><defs>
<symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></symbol>
<symbol id="i-box" viewBox="0 0 24 24"><path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5"/></symbol>
<symbol id="i-book" viewBox="0 0 24 24"><path d="M12 6c-4-3-8-3-10-2v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-2-1-6-1-10 2zm0 0v15"/></symbol>
<symbol id="i-rocket" viewBox="0 0 24 24"><path d="M9 15 7 13C7 8 12 3 21 2c0 9-6 14-11 14l-1-1Zm-5-1-2 6 6-2M15 7h.01"/></symbol>
<symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="m12 2 2 2 2-1 3 3-1 2 2 2v4l-2 2 1 2-3 3-2-1-2 2h-2l-2-2-2 1-3-3 1-2-2-2v-4l2-2-1-2 3-3 2 1 2-2z"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></symbol>
<symbol id="i-code" viewBox="0 0 24 24"><path d="m8 7-5 5 5 5m8-10 5 5-5 5"/></symbol>
<symbol id="i-external" viewBox="0 0 24 24"><path d="M13 4h7v7m0-7L9 15M20 14v6H4V4h6"/></symbol>
</defs></svg>
<div class="overlay" id="mobile-overlay"></div>
<div class="app-shell">
<aside class="sidebar" id="sidebar">
 <div class="brand"><div class="brand-logo"><svg><use href="#i-code"/></svg></div><div><div class="brand-name">GERING <em>DIGITAL</em></div><div class="brand-sub">CONTROL CENTER 2.0</div></div></div>
 <div class="nav-label">ÜBERSICHT</div>
 <a class="nav-link <?=$view==='dashboard'?'active':''?>" href="index.php?view=dashboard"><svg><use href="#i-grid"/></svg> Dashboard</a>
 <div class="nav-label">PROJEKTE</div>
 <a class="nav-link <?=$view==='projects'?'active':''?>" href="index.php?view=projects"><svg><use href="#i-box"/></svg> Alle Projekte <span class="nav-count"><?=count($apps)+count($pages)?></span></a>
 <a class="nav-link" href="legacy.php"><svg><use href="#i-plus"/></svg> Apps verwalten</a>
 <div class="nav-label">LERNPLATTFORM</div>
 <a class="nav-link <?=$view==='dau'?'active':''?>" href="index.php?view=dau"><svg><use href="#i-book"/></svg> DAU TO PRO <span class="nav-count"><?=count($dauPages)?></span></a>
 <a class="nav-link" href="html_projects.php"><svg><use href="#i-code"/></svg> HTML-Projekte</a>
 <div class="nav-label">VERWALTUNG</div>
 <a class="nav-link <?=$view==='publications'?'active':''?>" href="index.php?view=publications"><svg><use href="#i-rocket"/></svg> Veröffentlichungen</a>
 <a class="nav-link <?=$view==='settings'?'active':''?>" href="index.php?view=settings"><svg><use href="#i-settings"/></svg> Einstellungen</a>
 <div class="sidebar-bottom">
 <div class="preview-mode"><span class="dot" style="background:#74dcaa"></span><div><strong>Authentifiziert</strong><small>Live-Daten aus der bestehenden SQLite-Verwaltung. Änderungen erfolgen in den geschützten Formularen.</small></div></div>
 <div class="side-legal">GERING DIGITAL · ADMIN 2.0</div></div>
</aside>
<div class="main">
<header class="topbar">
 <button type="button" class="round-icon hamburger" id="menu-toggle" aria-label="Menü öffnen" aria-expanded="false" aria-controls="sidebar"><svg><use href="#i-menu"/></svg></button>
 <div class="crumb"><span>Admin</span><span class="slash">/</span><strong><?=e($labels[$view])?></strong></div>
 <div class="top-right"><span class="top-badge">LIVE-DATEN</span><a class="round-icon" href="../index.php" title="Website öffnen" aria-label="Öffentliche Website öffnen"><svg><use href="#i-external"/></svg></a><div class="avatar" aria-label="Administrator">GD</div></div>
</header>
<main class="content">
<?php if($view==='dashboard'): ?>
 <div class="page-heading"><div><p class="eyebrow">GERING DIGITAL · CONTROL CENTER</p><h1>Administrations-<span class="text-gold">übersicht</span></h1><p class="subtext">Echte Projekte, Lernprogramme und Veröffentlichungen auf einen Blick.</p></div>
 <div class="heading-actions"><a class="btn btn-gold" href="html_projects.php"><svg><use href="#i-plus"/></svg> HTML-Projekt hinzufügen</a><a class="btn btn-ghost" href="legacy.php"><svg><use href="#i-plus"/></svg> App hinzufügen</a></div></div>
 <div class="stat-grid">
  <div class="stat"><span class="stat-top">Alle Projekte <svg><use href="#i-box"/></svg></span><div class="stat-num"><?=count($apps)+count($pages)?></div><div class="stat-info">Apps und HTML-Projekte</div></div>
  <div class="stat"><span class="stat-top">Sichtbare Apps <svg><use href="#i-grid"/></svg></span><div class="stat-num"><?=$liveApps?></div><div class="stat-info">Im öffentlichen App-Katalog</div></div>
  <div class="stat"><span class="stat-top">Veröffentlichte HTML <svg><use href="#i-code"/></svg></span><div class="stat-num"><?=$livePages?></div><div class="stat-info">Online im Browser</div></div>
  <div class="stat"><span class="stat-top">Lernmodule <svg><use href="#i-book"/></svg></span><div class="stat-num"><?=$dauLive?></div><div class="stat-info">DAU TO PRO · veröffentlicht</div></div>
 </div>
 <div class="hero"><div class="hero-copy"><p class="eyebrow">DEINE LERNPLATTFORM</p><h2>DAU <span>TO</span> PRO</h2><p>Deine Lernprogramme zentral verwalten, Vorschauen prüfen und bewusst veröffentlichen.</p><a class="btn btn-gold" href="index.php?view=dau"><svg><use href="#i-book"/></svg> Lernplattform verwalten <svg><use href="#i-arrow"/></svg></a></div><div class="hero-art"><div class="orb"><svg><use href="#i-book"/></svg><div class="orb-label">LERNPLATTFORM</div></div></div></div>
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
 <?php foreach($pages as $p): ?><tr><td><div class="proj-name"><?=e($p['title'])?></div><div class="proj-detail"><?=e($p['description']??'')?></div></td><td><?=e($categories[$p['category']??'lernen']??'HTML')?></td><td><span class="badge <?=(int)($p['published']??0)===1?'live':'draft'?>"><?=(int)($p['published']??0)===1?'Online':'Entwurf / offline'?></span></td><td><a class="small-action" href="html_projects.php">Verwalten</a></td></tr><?php endforeach; ?>
 <?php if(!$apps&&!$pages): ?><tr><td colspan="4" class="empty-state">Keine Projekte vorhanden.</td></tr><?php endif; ?>
 </tbody></table></div></div>
<?php elseif($view==='dau'): ?>
 <div class="page-heading"><div><p class="eyebrow">LERNPLATTFORM</p><h1>DAU TO PRO <span class="text-gold">/</span> Verwaltung</h1><p class="subtext">Hier erscheinen die Lernmodule der Kategorie DAU TO PRO direkt aus der Datenbank.</p></div>
 <div class="heading-actions"><a class="btn btn-gold" href="html_projects.php">Lernmodul hinzufügen</a><a class="btn btn-ghost" href="../dau-to-pro/" target="_blank" rel="noopener">Öffentliche Oberseite ↗</a></div></div>
 <div class="dau-landing"><p class="eyebrow">DEINE LERNPLATTFORM</p><h2>Von Null Plan zu echtem <span>IT-Verständnis</span></h2><p>Der öffentliche Prüfungsfinder zeigt automatisch passende veröffentlichte Module. Neue Entwürfe sind erst nach deiner Freigabe sichtbar.</p><div class="dau-pills"><span>NETZWERKTECHNIK</span><span>IP &amp; SUBNETTING</span><span>PRÜFUNGSVORBEREITUNG</span></div></div>
 <div class="section-head"><div><h2>Deine Lernmodule <span class="text-gold">(<?=count($dauPages)?>)</span></h2><p class="section-sub"><?=$dauLive?> veröffentlicht · <?=count($dauPages)-$dauLive?> nicht online</p></div><a class="link" href="html_projects.php">Alle Module verwalten →</a></div>
 <div class="module-cards">
 <?php foreach($dauPages as $p): ?><article class="module"><div class="module-cover" style="background:linear-gradient(125deg,#2e302c,#152329)"><svg><use href="#i-book"/></svg></div><div class="module-body"><h3><?=e($p['title'])?></h3><p><?=e($p['description']??'')?></p><div class="module-bottom"><span class="badge <?=(int)($p['published']??0)===1?'live':'draft'?>"><?=(int)($p['published']??0)===1?'Online':'Entwurf / offline'?></span><a class="link" href="html_projects.php">Verwalten →</a></div></div></article><?php endforeach; ?>
 <?php if(!$dauPages): ?><div class="card card-pad"><h3>Noch keine Lernmodule</h3><p class="subtext">Lege über „HTML-Projekte“ ein neues Projekt in der Kategorie „DAU to Pro“ an.</p></div><?php endif; ?>
 </div>
<?php elseif($view==='publications'): ?>
 <div class="page-heading"><div><p class="eyebrow">RELEASE CONTROL</p><h1>Veröffentlichungen</h1><p class="subtext">Status aller HTML-Projekte auf einen Blick. Die Freigabe selbst erfolgt geschützt im Projektmanager.</p></div><a class="btn btn-gold" href="html_projects.php">Veröffentlichungen verwalten</a></div>
 <div class="publish-summary"><div class="publish-summary-copy"><svg><use href="#i-lock"/></svg><div><strong>Kontrollierter Veröffentlichungsprozess</strong><p>Ein Entwurf wird niemals allein durch das Speichern öffentlich.</p></div></div><span class="badge live">Echte Statusdaten</span></div>
 <div class="kanban">
 <div class="lane"><div class="lane-header"><strong>Entwürfe / offline</strong><span class="lane-number"><?=$draftPages?></span></div><?php foreach($pages as $p):if((int)($p['published']??0)===1)continue;?><div class="pub-card"><strong><?=e($p['title'])?></strong><small><?=e($p['slug'])?></small><div class="pub-card-actions"><a class="btn btn-small" href="html_projects.php">Bearbeiten →</a></div></div><?php endforeach;?></div>
 <div class="lane"><div class="lane-header"><strong>Online</strong><span class="lane-number"><?=$livePages?></span></div><?php foreach($pages as $p):if((int)($p['published']??0)!==1)continue;?><div class="pub-card"><strong><?=e($p['title'])?></strong><small><?=e($p['slug'])?></small><div class="pub-card-actions"><a class="btn btn-small" href="../<?=rawurlencode($p['slug'])?>/" target="_blank" rel="noopener">Ansehen ↗</a><a class="btn btn-small" href="html_projects.php">Verwalten</a></div></div><?php endforeach;?></div>
 <div class="lane"><div class="lane-header"><strong>Apps</strong><span class="lane-number"><?=count($apps)?></span></div><p class="section-sub">Apps werden über die App-Verwaltung freigeschaltet.</p><a class="btn btn-ghost full" href="legacy.php">Apps verwalten →</a></div>
 </div>
<?php else: ?>
 <div class="page-heading"><div><p class="eyebrow">VERWALTUNG</p><h1>Einstellungen</h1><p class="subtext">Website-Einstellungen und Administrationszugang.</p></div></div>
 <div class="settings-grid">
  <div class="card settings-card"><h3>Website-Einstellungen</h3><p>Im bestehenden geschützten Formular bearbeiten.</p><a class="btn btn-gold" href="settings.php">Einstellungen öffnen →</a></div>
  <div class="card settings-card"><h3>Bestehende Verwaltung</h3><p>Vollständige bisherige Funktionen für Apps und Projekt-Reihenfolge.</p><a class="btn btn-ghost" href="legacy.php">Klassische Verwaltung →</a></div>
 </div><div class="admin-note">Die produktive SQLite-Datenbank und hochgeladene Dateien werden durch diese Oberflächenänderung nicht verändert.</div>
<?php endif; ?>
<div class="admin-note">Neue Oberfläche mit den echten Daten und bestehenden Serveraktionen verbunden. Eine Veröffentlichung passiert ausschließlich nach deiner Bestätigung im jeweiligen Verwaltungsformular.</div>
</main>
</div></div>
<script>
(()=>{const sidebar=document.getElementById('sidebar'),button=document.getElementById('menu-toggle'),overlay=document.getElementById('mobile-overlay');if(!sidebar||!button||!overlay)return;const close=()=>{sidebar.classList.remove('open');overlay.classList.remove('open');button.setAttribute('aria-expanded','false')};button.addEventListener('click',()=>{const active=sidebar.classList.toggle('open');overlay.classList.toggle('open',active);button.setAttribute('aria-expanded',String(active))});overlay.addEventListener('click',close);document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});})();
</script>
</body></html>
