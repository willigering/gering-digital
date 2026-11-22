<?php
declare(strict_types=1);
require __DIR__.'/../../achievements_lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

function cheater_reply(int $status,array $body): never {
    http_response_code($status);
    echo json_encode($body,JSON_UNESCAPED_UNICODE);
    exit;
}
if (($_SERVER['REQUEST_METHOD']??'GET')!=='POST') {header('Allow: POST');cheater_reply(405,['ok'=>false]);}
if (in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',['cross-site','same-site'],true)) cheater_reply(403,['ok'=>false]);
$learner=learner_current();
if (!$learner) cheater_reply(401,['ok'=>false,'error'=>'Nicht angemeldet.']);
if (empty($_SESSION['csrf']) || !hash_equals((string)($_SESSION['csrf']??''),(string)($_SERVER['HTTP_X_DTP_CSRF']??''))) cheater_reply(403,['ok'=>false]);
$result=ach_evaluate((int)$learner['id'],['cheater'=>true]);
cheater_reply(200,['ok'=>true,'achievements'=>$result['new'],'level'=>$result['level'],'level_up'=>$result['level_up']]);
