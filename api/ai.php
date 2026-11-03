<?php
/** Private, authenticated text-only bridge. No public AI access and no browser key exposure. */
declare(strict_types=1);
require __DIR__.'/ai-bridge-lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');
header('Referrer-Policy: no-referrer');

function gd_ai_reply(int $status,array $body): never {
    http_response_code($status);
    echo json_encode($body,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
if (($_SERVER['REQUEST_METHOD']??'GET')!=='POST') {
    header('Allow: POST');
    gd_ai_reply(405,['ok'=>false,'error'=>'Nur POST erlaubt.']);
}
// No CORS: standard cross-site browser JavaScript cannot read this endpoint.
// Tampermonkey should use GM_xmlhttpRequest with @connect geringdigital.de.
// STRATO must expose HTTPS; PHP local development server is allowed for tests only.
$secure=(!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS'])!=='off')
    || (int)($_SERVER['SERVER_PORT']??0)===443
    || PHP_SAPI==='cli-server';
if (!$secure) gd_ai_reply(403,['ok'=>false,'error'=>'Nur HTTPS erlaubt.']);

$config=gd_ai_config();
if (!$config) gd_ai_reply(503,['ok'=>false,'error'=>'Private KI-Schnittstelle noch nicht eingerichtet.']);

$token=(string)($_SERVER['HTTP_X_GD_AI_TOKEN']??'');
if (!gd_ai_auth($config,$token)) gd_ai_reply(401,['ok'=>false,'error'=>'Zugriff verweigert.']);

$type=strtolower(trim(explode(';',(string)($_SERVER['CONTENT_TYPE']??''))[0]));
if ($type!=='application/json') gd_ai_reply(415,['ok'=>false,'error'=>'Content-Type muss application/json sein.']);
$size=(int)($_SERVER['CONTENT_LENGTH']??0);
if ($size>15000) gd_ai_reply(413,['ok'=>false,'error'=>'Anfrage zu groß.']);
$body=file_get_contents('php://input',false,null,0,15001);
if (!is_string($body) || strlen($body)>15000) gd_ai_reply(413,['ok'=>false,'error'=>'Anfrage zu groß.']);
try {
    $data=json_decode($body,true,512,JSON_THROW_ON_ERROR);
    $payload=gd_ai_payload($data);
} catch (JsonException|InvalidArgumentException $error) {
    gd_ai_reply(400,['ok'=>false,'error'=>'Ungültige Anfrage: '.$error->getMessage()]);
}
try {
    if (!gd_ai_quota($config)) {
        header('Retry-After: 60');
        gd_ai_reply(429,['ok'=>false,'error'=>'Privates Anfrage-Limit erreicht.']);
    }
} catch(Throwable $error) {
    // Fail closed: a broken quota database MUST NOT permit unlimited paid requests.
    error_log('AI bridge quota unavailable: '.$error->getMessage());
    gd_ai_reply(503,['ok'=>false,'error'=>'Anfrage-Limit derzeit nicht verfügbar.']);
}
try {
    [$status,$raw]=gd_ai_call_openai($config,$payload);
} catch(Throwable $error) {
    error_log('AI bridge upstream request failed (no user prompt logged).');
    gd_ai_reply(502,['ok'=>false,'error'=>'KI-Dienst vorübergehend nicht erreichbar.']);
}
if ($status<200 || $status>=300) {
    if ($status===429) {
        header('Retry-After: 60');
        gd_ai_reply(429,['ok'=>false,'error'=>'OpenAI-Anfragelimit erreicht.']);
    }
    // Do not disclose OpenAI API credentials, detailed upstream errors, or request bodies.
    gd_ai_reply(502,['ok'=>false,'error'=>'OpenAI-Anfrage fehlgeschlagen. API-Guthaben und Schlüssel prüfen.']);
}
try {$response=json_decode($raw,true,512,JSON_THROW_ON_ERROR);}
catch(JsonException $error) {gd_ai_reply(502,['ok'=>false,'error'=>'Ungültige Antwort von OpenAI.']);}
if (!is_array($response) || ($response['status']??'')!=='completed') {
    gd_ai_reply(502,['ok'=>false,'error'=>'OpenAI hat keine vollständige Antwort geliefert.']);
}
$text=gd_ai_extract_text($response);
if ($text==='') gd_ai_reply(502,['ok'=>false,'error'=>'OpenAI hat keinen Text zurückgegeben.']);
$usage=$response['usage']??[];
gd_ai_reply(200,['ok'=>true,'text'=>$text,'model'=>$response['model']??$payload['model'],
    'usage'=>['input_tokens'=>(int)($usage['input_tokens']??0),
        'output_tokens'=>(int)($usage['output_tokens']??0)]]);
