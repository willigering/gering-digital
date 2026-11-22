<?php
require __DIR__.'/../html_project_lib.php';
require_login();
$slug=(string)($_GET['slug']??'');
if (!hp_valid_slug($slug)) {http_response_code(404);exit('Nicht gefunden.');}
$statement=db()->prepare('SELECT draft_version,live_version FROM html_pages WHERE slug=?');
$statement->execute([$slug]);
$page=$statement->fetch(PDO::FETCH_ASSOC);
if (!$page) {http_response_code(404);exit('Nicht gefunden.');}
$version=$page['draft_version']?:$page['live_version'];
if (!$version) {http_response_code(404);exit('Keine Vorschau vorhanden.');}
hp_serve($slug,$version,(string)($_GET['file']??''),true);
