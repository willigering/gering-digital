<?php
// NERD FM: speichert die abgewählten Titel der eigenen Playlist im Lernkonto.
// Nur POST von derselben Website, nur mit Lernkonto und gültigem CSRF-Token; gespeichert werden ausschließlich bekannte, verfügbare Song-IDs.
declare(strict_types=1);
require __DIR__.'/../../nerd_fm_lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

function radio_reply(int $status,array $body): never {
    http_response_code($status);
    echo json_encode($body,JSON_UNESCAPED_UNICODE);
    exit;
}
if (($_SERVER['REQUEST_METHOD']??'GET')!=='POST') {header('Allow: POST');radio_reply(405,['ok'=>false]);}
if (in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',['cross-site','same-site'],true)) radio_reply(403,['ok'=>false]);
$learner=learner_current();
if (!$learner) radio_reply(401,['ok'=>false,'error'=>'Bitte melde dich an, damit die Playlist im Konto gespeichert wird.']);
if (!hash_equals((string)($_SESSION['csrf']??''),(string)($_SERVER['HTTP_X_DTP_CSRF']??''))) radio_reply(403,['ok'=>false]);
$body=file_get_contents('php://input',false,null,0,4096);
$data=is_string($body)?json_decode($body,true):null;
if (!is_array($data) || !isset($data['off']) || !is_array($data['off']) || count($data['off'])>64) radio_reply(400,['ok'=>false,'error'=>'Ungültige Anfrage.']);
try {
    learner_rate_guard('nfm-pref','user:'.$learner['id'],300,3600,'Zu viele Änderungen. Bitte warte kurz.');
    learner_rate_add('nfm-pref','user:'.$learner['id']);
    session_write_close();
    radio_reply(200,['ok'=>true,'off'=>nfm_save_off($learner,$data['off'])]);
} catch (LearnerError $error) {
    radio_reply(422,['ok'=>false,'error'=>$error->getMessage()]);
} catch (Throwable $error) {
    error_log('NERD FM Playlist: '.$error->getMessage());
    radio_reply(500,['ok'=>false,'error'=>'Die Playlist konnte nicht gespeichert werden.']);
}
