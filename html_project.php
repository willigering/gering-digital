<?php
require __DIR__.'/html_project_lib.php';
$slug=(string)($_GET['slug']??'');
if (!hp_valid_slug($slug)) {http_response_code(404);exit('Nicht gefunden.');}
$statement=db()->prepare('SELECT live_version FROM html_pages WHERE slug=? AND published=1');
$statement->execute([$slug]);
$version=$statement->fetchColumn();
if (!$version) {http_response_code(404);exit('Dieses Projekt ist derzeit nicht veröffentlicht.');}
hp_serve($slug,(string)$version,(string)($_GET['file']??''));
