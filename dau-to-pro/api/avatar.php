<?php
// DAU TO PRO: eigener Avatar. GET liefert Konfiguration und Freischaltungen, POST speichert (nur angemeldet, gleiche Herkunft, CSRF).
declare(strict_types=1);
require __DIR__.'/../../avatar_lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

function avatar_reply(int $status,array $body): never {
    http_response_code($status);
    echo json_encode($body,JSON_UNESCAPED_UNICODE);
    exit;
}
$method=$_SERVER['REQUEST_METHOD']??'GET';
if (!in_array($method,['GET','POST'],true)) {header('Allow: GET, POST');avatar_reply(405,['ok'=>false,'error'=>'Nur GET oder POST.']);}
$learner=learner_current();
if (!$learner) avatar_reply(401,['ok'=>false,'error'=>'Zum Speichern bitte anmelden.']);
$id=(int)$learner['id'];
if ($method==='GET') {
    $stored=avatar_get($id);
    $progress=avatar_progress($id);
    avatar_reply(200,['ok'=>true,'saved'=>$stored!==null,'config'=>avatar_apply_locks($stored??avatar_default(),$progress),'unlocks'=>avatar_unlock_map($progress),'level'=>$progress['level']]);
}
$origin=(string)($_SERVER['HTTP_ORIGIN']??'');
if ($origin!=='' && strtolower((string)parse_url($origin,PHP_URL_HOST).(parse_url($origin,PHP_URL_PORT)?':'.parse_url($origin,PHP_URL_PORT):''))!==strtolower((string)($_SERVER['HTTP_HOST']??'')))
    avatar_reply(403,['ok'=>false,'error'=>'Fremde Herkunft.']);
if (in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',['cross-site','same-site'],true)) avatar_reply(403,['ok'=>false,'error'=>'Fremde Herkunft.']);
if (!hash_equals((string)($_SESSION['csrf']??''),(string)($_SERVER['HTTP_X_DTP_CSRF']??''))) avatar_reply(403,['ok'=>false,'error'=>'Sitzung abgelaufen. Bitte Seite neu laden.']);
if (learner_rate_count('api','avatar:'.$id,60)>=30) avatar_reply(429,['ok'=>false,'error'=>'Zu viele Speichervorgänge. Bitte kurz warten.']);
learner_rate_add('api','avatar:'.$id);
if ((int)($_SERVER['CONTENT_LENGTH']??0)>8192) avatar_reply(413,['ok'=>false,'error'=>'Zu viele Daten.']);
$input=json_decode((string)file_get_contents('php://input',false,null,0,8192),true);
if (!is_array($input) || !is_array($input['config']??null)) avatar_reply(400,['ok'=>false,'error'=>'Ungültige Anfrage.']);
try {
    $cfg=avatar_save($id,$input['config']);
} catch (LearnerError $error) {
    avatar_reply(422,['ok'=>false,'error'=>$error->getMessage()]);
}
avatar_reply(200,['ok'=>true,'config'=>$cfg,'layers'=>array_map(fn($l)=>avatar_url($l['file'],'webp','../'),avatar_layers($cfg))]);
