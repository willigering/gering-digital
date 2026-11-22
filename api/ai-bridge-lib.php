<?php
/** Private OpenAI bridge: validation, authentication, quotas and response parsing. */
declare(strict_types=1);

function gd_ai_config(?string $path=null): ?array {
    // This file is ONLY on STRATO, ignored by Git and excluded from SFTP deployment.
    $path ??= dirname(__DIR__).'/data/ai-bridge.php';
    if (!is_file($path)) return null;
    $c=require $path;
    if (!is_array($c)) return null;
    $key=$c['openai_api_key']??null;
    $hash=$c['client_token_hash']??null;
    if (!is_string($key) || !preg_match('/^sk-[A-Za-z0-9_-]{15,}$/D',$key)
        || !is_string($hash) || !preg_match('/^[a-f0-9]{64}$/D',$hash)) return null;
    // Never accept arbitrary model names or upstream URLs from private config or client.
    return [
        'openai_api_key'=>$key,
        'client_token_hash'=>$hash,
        'daily_limit'=>max(1,min(200,(int)($c['daily_limit']??40))),
        'minute_limit'=>max(1,min(20,(int)($c['minute_limit']??5))),
    ];
}

function gd_ai_auth(array $config, string $candidate): bool {
    return (bool)preg_match('/^[a-f0-9]{64}$/D',$candidate)
        && hash_equals($config['client_token_hash'],hash('sha256',$candidate));
}

function gd_ai_payload(mixed $input): array {
    if (!is_array($input) || array_is_list($input)) throw new InvalidArgumentException('JSON-Objekt erwartet.');
    $allowed=['prompt'=>true,'instructions'=>true,'model'=>true,'max_output_tokens'=>true];
    foreach($input as $k=>$v) if (!isset($allowed[$k])) throw new InvalidArgumentException('Unbekanntes Feld.');
    $prompt=$input['prompt']??null;
    $instructions=$input['instructions']??'Antworte hilfreich und präzise auf Deutsch.';
    $model=$input['model']??'gpt-5.4-mini';
    $tokens=$input['max_output_tokens']??650;
    if (!is_string($prompt) || trim($prompt)==='' || strlen($prompt)>8000)
        throw new InvalidArgumentException('prompt benötigt (maximal 8000 Bytes).');
    if (!is_string($instructions) || strlen($instructions)>2000)
        throw new InvalidArgumentException('instructions zu lang.');
    if ($model!=='gpt-5.4-mini') throw new InvalidArgumentException('Modell nicht freigegeben.');
    if (!is_int($tokens) || $tokens<1 || $tokens>1000)
        throw new InvalidArgumentException('max_output_tokens muss zwischen 1 und 1000 liegen.');
    return ['model'=>$model,'input'=>$prompt,'instructions'=>$instructions,
        'max_output_tokens'=>$tokens,'reasoning'=>['effort'=>'none'],'store'=>false,
        'tools'=>[]];
}

/** Reserve quota BEFORE calling OpenAI. Failed upstream calls still count, deliberately. */
function gd_ai_quota(array $config, ?string $database=null, ?int $now=null): bool {
    $database ??= dirname(__DIR__).'/data/ai-bridge.sqlite';
    $now ??= time();
    $pdo=new PDO('sqlite:'.$database,null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT=>5]);
    $pdo->exec('CREATE TABLE IF NOT EXISTS ai_requests (id INTEGER PRIMARY KEY, at INTEGER NOT NULL, day TEXT NOT NULL)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS ai_requests_at ON ai_requests(at)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS ai_requests_day ON ai_requests(day)');
    $pdo->exec('BEGIN IMMEDIATE');
    try {
        $clean=$pdo->prepare('DELETE FROM ai_requests WHERE at < ?');
        $clean->execute([$now-172800]);
        $minute=$pdo->prepare('SELECT COUNT(*) FROM ai_requests WHERE at >= ?');
        $minute->execute([$now-60]);
        $today=$pdo->prepare('SELECT COUNT(*) FROM ai_requests WHERE day = ?');
        $day=gmdate('Y-m-d',$now);$today->execute([$day]);
        $allowed=(int)$minute->fetchColumn()<$config['minute_limit']
            && (int)$today->fetchColumn()<$config['daily_limit'];
        if ($allowed) {
            $insert=$pdo->prepare('INSERT INTO ai_requests(at,day) VALUES(?,?)');
            $insert->execute([$now,$day]);
        }
        $pdo->exec('COMMIT');
        return $allowed;
    } catch(Throwable $error) {
        try{$pdo->exec('ROLLBACK');}catch(Throwable $ignored){}
        throw $error;
    }
}

function gd_ai_extract_text(array $response): string {
    $text=[];
    foreach(($response['output']??[]) as $item) {
        if (!is_array($item) || ($item['type']??'')!=='message') continue;
        foreach(($item['content']??[]) as $part) {
            if (is_array($part) && ($part['type']??'')==='output_text' && is_string($part['text']??null))
                $text[]=$part['text'];
        }
    }
    return implode("\n",$text);
}

/** Returns [HTTP status, raw JSON] – fixed HTTPS host; no redirects or user-controlled URL. */
function gd_ai_call_openai(array $config,array $payload): array {
    if (!function_exists('curl_init')) throw new RuntimeException('cURL nicht verfügbar.');
    $ch=curl_init('https://api.openai.com/v1/responses');
    $request=json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    curl_setopt_array($ch,[
        CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$request,CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$config['openai_api_key'],
            'Content-Type: application/json','Accept: application/json'],
        CURLOPT_FOLLOWLOCATION=>false,CURLOPT_MAXREDIRS=>0,
        CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_TIMEOUT=>45,
        CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
        CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
    ]);
    $body=curl_exec($ch);
    $status=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if (!is_string($body) || strlen($body)>500000) throw new RuntimeException('OpenAI nicht erreichbar.');
    return [$status,$body];
}
