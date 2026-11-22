<?php
require __DIR__.'/../html_project_lib.php';
require_login();
$slug=(string)($_GET['slug']??'');
if (!hp_valid_slug($slug)) {http_response_code(404);exit('Projekt nicht gefunden.');}
$sql=db()->prepare('SELECT title,draft_version,live_version,published FROM html_pages WHERE slug=?');
$sql->execute([$slug]);
$page=$sql->fetch(PDO::FETCH_ASSOC);
if (!$page) {http_response_code(404);exit('Projekt nicht gefunden.');}
?><!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vorschau – <?=e($page['title'])?></title>
<style>body{margin:0;background:#0d0b08;color:#f5e8cc;font:15px system-ui,sans-serif}.bar{display:flex;flex-wrap:wrap;align-items:center;gap:15px;padding:12px 18px;background:#1c160f;border-bottom:1px solid #bb8d3b}.bar a{color:#ffcd70}.bar strong{margin-right:auto}.bar small{color:#c5ad79}.preview{width:100%;height:calc(100dvh - 65px);border:0;background:white}</style>
</head><body>
<div class="bar"><strong>👁 Vorschau: <?=e($page['title'])?></strong><small><?=($page['draft_version']!=='' && $page['draft_version']!==$page['live_version'])?'Noch nicht veröffentlichter Entwurf':'Letzte gespeicherte Version'?></small><a href="html_projects.php">← HTML-Projekte</a></div>
<iframe class="preview" title="HTML-Projekt-Vorschau" sandbox="allow-scripts allow-forms allow-downloads" referrerpolicy="no-referrer" src="../__preview/<?=e($slug)?>/"></iframe>
</body></html>
