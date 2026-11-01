<?php
// Shared Admin 2.0 frame (sidebar, topbar). Callers must have run require_login().
function admin2_counts(): array {
    $db=db();
    return [
        'all'=>(int)$db->query('SELECT COUNT(*) FROM apps')->fetchColumn()+(int)$db->query('SELECT COUNT(*) FROM html_pages')->fetchColumn(),
        'dau'=>(int)$db->query("SELECT COUNT(*) FROM html_pages WHERE category='lernen'")->fetchColumn(),
        'learners'=>(int)$db->query('SELECT COUNT(*) FROM learners')->fetchColumn(),
    ];
}
function admin2_open(string $active,string $crumb,string $pageTitle='Gering Digital · Admin 2.0',string $extraHead=''): void {
    $counts=admin2_counts();
?>
<!doctype html>
<html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0b0d10">
<title><?=e($pageTitle)?></title>
<link rel="stylesheet" href="admin2.css?v=<?=filemtime(__DIR__.'/admin2.css')?>">
<?=$extraHead?>
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
.dau-cover{position:relative;overflow:hidden;aspect-ratio:16/9;height:auto!important}.dau-cover img{position:absolute;inset:0;z-index:1;width:100%;height:100%;display:block}.cover-source{position:absolute;z-index:2;left:8px;bottom:8px;font-size:10px;background:#0b0e12d9;border:1px solid #5d4c33;color:#e9c891;border-radius:6px;padding:2px 7px}
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
<symbol id="i-edit" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></symbol>
<symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.7 3.2-5.6 6.5-5.6s5.9 1.9 6.5 5.6M16 4.8a3.4 3.4 0 0 1 0 6.4M18.2 14.6c1.9.7 3 2.5 3.3 5.4"/></symbol>
<symbol id="i-image" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 8"/></symbol>
</defs></svg>
<div class="overlay" id="mobile-overlay"></div>
<div class="app-shell">
<aside class="sidebar" id="sidebar">
 <div class="brand"><div class="brand-logo"><svg><use href="#i-code"/></svg></div><div><div class="brand-name">GERING <em>DIGITAL</em></div><div class="brand-sub">CONTROL CENTER 2.0</div></div></div>
 <div class="nav-label">ÜBERSICHT</div>
 <a class="nav-link <?=$active==='dashboard'?'active':''?>" href="index.php?view=dashboard"><svg><use href="#i-grid"/></svg> Dashboard</a>
 <div class="nav-label">PROJEKTE</div>
 <a class="nav-link <?=$active==='projects'?'active':''?>" href="index.php?view=projects"><svg><use href="#i-box"/></svg> Alle Projekte <span class="nav-count"><?=$counts['all']?></span></a>
 <a class="nav-link" href="legacy.php"><svg><use href="#i-plus"/></svg> Apps verwalten</a>
 <div class="nav-label">LERNPLATTFORM</div>
 <a class="nav-link <?=$active==='dau'?'active':''?>" href="index.php?view=dau"><svg><use href="#i-book"/></svg> DAU TO PRO <span class="nav-count"><?=$counts['dau']?></span></a>
 <a class="nav-link <?=$active==='dau_page'?'active':''?>" href="dau_page.php"><svg><use href="#i-edit"/></svg> Oberseite bearbeiten</a>
 <a class="nav-link" href="html_projects.php"><svg><use href="#i-code"/></svg> HTML-Projekte</a>
 <a class="nav-link <?=$active==='learners'?'active':''?>" href="learners.php"><svg><use href="#i-users"/></svg> Lernkonten <span class="nav-count"><?=$counts['learners']?></span></a>
 <div class="nav-label">VERWALTUNG</div>
 <a class="nav-link <?=$active==='publications'?'active':''?>" href="index.php?view=publications"><svg><use href="#i-rocket"/></svg> Veröffentlichungen</a>
 <a class="nav-link <?=$active==='settings'?'active':''?>" href="index.php?view=settings"><svg><use href="#i-settings"/></svg> Einstellungen</a>
 <div class="sidebar-bottom">
 <div class="preview-mode"><span class="dot" style="background:#74dcaa"></span><div><strong>Authentifiziert</strong><small>Live-Daten aus der bestehenden SQLite-Verwaltung. Änderungen erfolgen in geschützten Formularen (Login + CSRF).</small></div></div>
 <div class="side-legal">GERING DIGITAL · ADMIN 2.0</div></div>
</aside>
<div class="main">
<header class="topbar">
 <button type="button" class="round-icon hamburger" id="menu-toggle" aria-label="Menü öffnen" aria-expanded="false" aria-controls="sidebar"><svg><use href="#i-menu"/></svg></button>
 <div class="crumb"><span>Admin</span><span class="slash">/</span><strong><?=e($crumb)?></strong></div>
 <div class="top-right"><span class="top-badge">LIVE-DATEN</span><a class="round-icon" href="../index.php" title="Website öffnen" aria-label="Öffentliche Website öffnen"><svg><use href="#i-external"/></svg></a><div class="avatar" aria-label="Administrator">GD</div></div>
</header>
<main class="content">
<?php
}
function admin2_close(string $extraScript=''): void {
?>
</main>
</div></div>
<script>
(()=>{const sidebar=document.getElementById('sidebar'),button=document.getElementById('menu-toggle'),overlay=document.getElementById('mobile-overlay');if(!sidebar||!button||!overlay)return;const close=()=>{sidebar.classList.remove('open');overlay.classList.remove('open');button.setAttribute('aria-expanded','false')};button.addEventListener('click',()=>{const active=sidebar.classList.toggle('open');overlay.classList.toggle('open',active);button.setAttribute('aria-expanded',String(active))});overlay.addEventListener('click',close);document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});})();
</script>
<?=$extraScript?>
</body></html>
<?php
}
