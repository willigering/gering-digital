<?php
/** IT VI.01 Unterrichtsmaterial – eigenes Lernblatt mit kontoabhängiger Speicherung.
 *  Nutzt die vorhandene learner_progress-Tabelle; keine neuen Konten oder Tabellen.
 */
declare(strict_types=1);
require_once __DIR__.'/../../learner_lib.php';

header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');
$learner=learner_current();
$storageKey='unterricht:it-vi-01:state-v1';

function itvi_reply(int $status,array $body): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body,JSON_UNESCAPED_UNICODE);
    exit;
}
if (($_SERVER['REQUEST_METHOD']??'GET')==='POST') {
    if (!$learner) itvi_reply(401,['ok'=>false,'error'=>'Bitte im Lernkonto anmelden.']);
    $origin=(string)($_SERVER['HTTP_ORIGIN']??'');
    if ($origin!=='') {
        $host=(string)parse_url($origin,PHP_URL_HOST);
        $port=parse_url($origin,PHP_URL_PORT);
        $authority=$host.($port?':'.$port:'');
        if (!hash_equals(strtolower((string)($_SERVER['HTTP_HOST']??'')),strtolower($authority)))
            itvi_reply(403,['ok'=>false,'error'=>'Fremde Herkunft.']);
    }
    if (in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',['cross-site','same-site'],true))
        itvi_reply(403,['ok'=>false,'error'=>'Fremde Herkunft.']);
    $sent=(string)($_SERVER['HTTP_X_DTP_CSRF']??'');
    $expected=(string)($_SESSION['csrf']??'');
    if ($expected===''||!hash_equals($expected,$sent))
        itvi_reply(403,['ok'=>false,'error'=>'Sitzung abgelaufen – bitte neu laden.']);
    if (learner_rate_count('api','user:'.$learner['id'],60)>=120)
        itvi_reply(429,['ok'=>false,'error'=>'Zu viele Speichervorgänge.']);
    learner_rate_add('api','user:'.$learner['id']);
    $max=90000;
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>$max)
        itvi_reply(413,['ok'=>false,'error'=>'Zu viel Text.']);
    $payload=json_decode((string)file_get_contents('php://input',false,null,0,$max+1),true);
    if (!is_array($payload)||!isset($payload['state'])||!is_array($payload['state']))
        itvi_reply(400,['ok'=>false,'error'=>'Ungültiger Lernstand.']);
    $clean=[];
    foreach ($payload['state'] as $key=>$value) {
        if (preg_match('/^q(?:[0-9]|1[0-9]|2[0-3])$/D',(string)$key)) {
            if (!is_int($value)||$value<0||$value>5) itvi_reply(422,['ok'=>false,'error'=>'Ungültige Antwort.']);
            $clean[(string)$key]=$value;
        } elseif ($key==='notes'||preg_match('/^p[0-9]$/D',(string)$key)) {
            if (!is_string($value)||!mb_check_encoding($value,'UTF-8')||strlen($value)>($key==='notes'?22000:8000))
                itvi_reply(422,['ok'=>false,'error'=>'Antworttext zu lang oder ungültig.']);
            $clean[(string)$key]=$value;
        }
    }
    $json=json_encode($clean,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json===false||strlen($json)>80000) itvi_reply(413,['ok'=>false,'error'=>'Zu viele Daten.']);
    db()->prepare("INSERT INTO learner_progress (learner_id,storage_key,module_slug,value,deleted,updated_at)
        VALUES(?,?,?,?,0,?)
        ON CONFLICT(learner_id,storage_key) DO UPDATE SET
        module_slug=excluded.module_slug,value=excluded.value,deleted=0,updated_at=excluded.updated_at")
       ->execute([(int)$learner['id'],$storageKey,'unterricht-it-vi-01',$json,gmdate('Y-m-d H:i:s')]);
    itvi_reply(200,['ok'=>true,'saved'=>true]);
}
if (($_SERVER['REQUEST_METHOD']??'GET')!=='GET') {
    header('Allow: GET, POST');
    itvi_reply(405,['ok'=>false,'error'=>'Methode nicht erlaubt.']);
}
$state=[];
if ($learner) {
    $query=db()->prepare("SELECT value FROM learner_progress WHERE learner_id=? AND storage_key=? AND deleted=0 LIMIT 1");
    $query->execute([(int)$learner['id'],$storageKey]);
    $stored=$query->fetchColumn();
    if (is_string($stored)) {
        $decoded=json_decode($stored,true);
        if (is_array($decoded)) $state=$decoded;
    }
}
$settings=['loggedIn'=>(bool)$learner,'csrf'=>$learner?csrf():'','state'=>$state];
$source=@file_get_contents(__DIR__.'/it-vi-01.html');
if ($source===false) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Unterrichtsmaterial derzeit nicht verfügbar.';
    exit;
}
$settingsJson=json_encode($settings,JSON_UNESCAPED_UNICODE|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT);
$inject='<script>window.__ITVI_ACCOUNT__='.$settingsJson.';</script>';
header('Content-Type: text/html; charset=utf-8');
echo str_replace('</head>',$inject.'</head>',$source);
