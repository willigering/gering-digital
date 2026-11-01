<?php
// DAU TO PRO: speichert den Lernfortschritt eines angemeldeten Lernkontos (aufgerufen von dau-to-pro/sync.js).
declare(strict_types=1);
require __DIR__.'/../../learner_lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

function progress_reply(int $status,array $body): never {
    http_response_code($status);
    echo json_encode($body,JSON_UNESCAPED_UNICODE);
    exit;
}
if (($_SERVER['REQUEST_METHOD']??'GET')!=='POST') {header('Allow: POST');progress_reply(405,['ok'=>false,'error'=>'Nur POST.']);}
// Same-origin only: browsers send Origin on POST/fetch; a foreign site is refused.
$origin=(string)($_SERVER['HTTP_ORIGIN']??'');
if ($origin!=='' && strtolower((string)parse_url($origin,PHP_URL_HOST).(parse_url($origin,PHP_URL_PORT)?':'.parse_url($origin,PHP_URL_PORT):''))!==strtolower((string)($_SERVER['HTTP_HOST']??'')))
    progress_reply(403,['ok'=>false,'error'=>'Fremde Herkunft.']);
if (in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',['cross-site','same-site'],true)) progress_reply(403,['ok'=>false,'error'=>'Fremde Herkunft.']);
$learner=learner_current();
if (!$learner) progress_reply(401,['ok'=>false,'error'=>'Nicht angemeldet.']);
if (!hash_equals((string)($_SESSION['csrf']??''),(string)($_SERVER['HTTP_X_DTP_CSRF']??''))) progress_reply(403,['ok'=>false,'error'=>'Sitzung abgelaufen. Bitte Seite neu laden.']);
if (learner_rate_count('api','user:'.$learner['id'],60)>=120) progress_reply(429,['ok'=>false,'error'=>'Zu viele Speichervorgänge. Bitte kurz warten.']);
learner_rate_add('api','user:'.$learner['id']);
$length=(int)($_SERVER['CONTENT_LENGTH']??0);
if ($length>LEARNER_TOTAL_MAX+65536) progress_reply(413,['ok'=>false,'error'=>'Zu viele Daten auf einmal.']);
$input=json_decode((string)file_get_contents('php://input',false,null,0,LEARNER_TOTAL_MAX+65536),true);
if (!is_array($input) || !is_string($input['slug']??null)) progress_reply(400,['ok'=>false,'error'=>'Ungültige Anfrage.']);
$set=$input['set']??[];$delete=$input['delete']??[];
if (!is_array($set) || !is_array($delete) || ($delete!==[] && !array_is_list($delete))) progress_reply(400,['ok'=>false,'error'=>'Ungültige Anfrage.']);
try {
    learner_progress_apply((int)$learner['id'],$input['slug'],$set,$delete);
} catch (LearnerError $error) {
    progress_reply(422,['ok'=>false,'error'=>$error->getMessage()]);
}
progress_reply(200,['ok'=>true,'saved'=>count($set)+count($delete)]);
