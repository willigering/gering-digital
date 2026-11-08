<?php
// NERD FM Mini-Player: liefert die aktive Playlist mit frischen, sitzungsgebundenen Abruf-Links.
// Nur GET von derselben Website; Gäste und Lernkonten bekommen jeweils ihre eigene Liste (wie die Radio-Seite).
declare(strict_types=1);
require __DIR__.'/../../nerd_fm_lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

function tracks_reply(int $status,array $body): never {
    http_response_code($status);
    echo json_encode($body,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    exit;
}
$method=$_SERVER['REQUEST_METHOD']??'GET';
if ($method!=='GET') {header('Allow: GET');tracks_reply(405,['ok'=>false]);}
if (in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',['cross-site','same-site'],true)) tracks_reply(403,['ok'=>false]);
try {
    $tracks=[];
    foreach (nfm_radio_files(learner_current()) as $t) {
        if (($t['on']??true)===false) continue;
        $tracks[]=['id'=>(string)($t['id']??$t['src']),'src'=>(string)$t['src'],'title'=>(string)$t['title']];
    }
    session_write_close();
    tracks_reply(200,['ok'=>true,'tracks'=>$tracks]);
} catch (Throwable $error) {
    error_log('NERD FM Mini-Player: '.$error->getMessage());
    tracks_reply(500,['ok'=>false]);
}
