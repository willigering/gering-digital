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
    $filter=static fn(string $html,string $file): string => learner_inject_sync(hp_current_learning_html($html,$slug,$file),$slug,$file,(string)$page['live_version']);
} elseif ($slug==='perlenwahn') {
    $filter=static function(string $html,string $file): string {
        if ($file!=='index.html' || !str_contains($html,'class="herozone"') || !str_contains($html,'class="scene"')) return $html;
        $offset='<style id="perlenwahn-hero-position">@media (min-width:1025px){.herozone > .scene{right:max(clamp(24px, calc(14vw - 120px), 148px), calc((100% - 1620px) / 2));}}</style>';
        return str_ireplace('</head>',$offset.'</head>',$html);
    };
}
hp_serve($slug,(string)$page['live_version'],(string)($_GET['file']??''),false,$filter);
