<?php
require __DIR__.'/html_project_lib.php';
$slug=(string)($_GET['slug']??'');
if (!hp_valid_slug($slug)) {http_response_code(404);exit('Nicht gefunden.');}
$statement=db()->prepare('SELECT live_version,category FROM html_pages WHERE slug=? AND published=1');
$statement->execute([$slug]);
$page=$statement->fetch(PDO::FETCH_ASSOC);
if (!$page || !$page['live_version']) {http_response_code(404);exit('Dieses Projekt ist derzeit nicht veröffentlicht.');}
$filter=null;
if ($page['category']==='lernen') {
    // DAU TO PRO: learner progress is saved automatically (see learner_lib.php, dau-to-pro/sync.js).
    require_once __DIR__.'/learner_lib.php';
    $filter=static fn(string $html,string $file): string => learner_inject_sync($html,$slug,$file);
}
hp_serve($slug,(string)$page['live_version'],(string)($_GET['file']??''),false,$filter);
