<?php
declare(strict_types=1);
require __DIR__.'/../api/ai-bridge-lib.php';
function ai_check(bool $ok, string $why): void {if(!$ok)throw new RuntimeException($why);}

$temp=tempnam(sys_get_temp_dir(),'gd-ai-cfg-');
$key='sk-test-NOT-A-REAL-OPENAI-KEY-1234567890';
$token=str_repeat('f',64);$hash=hash('sha256',$token);
file_put_contents($temp,"<?php return ".var_export([
    'openai_api_key'=>$key,'client_token_hash'=>$hash,'daily_limit'=>3,'minute_limit'=>2],true).";");
try {
    $c=gd_ai_config($temp);
    ai_check(is_array($c) && $c['daily_limit']===3 && $c['minute_limit']===2,'Valid private config loads');
    ai_check(gd_ai_auth($c,$token),'Hashed client token authenticates');
    ai_check(!gd_ai_auth($c,str_repeat('0',64)) && !gd_ai_auth($c,'')
        && !gd_ai_auth($c,$key),'Invalid token and upstream key are rejected');
    ai_check(gd_ai_config($temp.'.missing')===null,'Absent config disables endpoint');

    $payload=gd_ai_payload(['prompt'=>'Eine Frage','instructions'=>'Kurz antworten','max_output_tokens'=>40]);
    ai_check($payload['model']==='gpt-5.4-mini' && $payload['store']===false
        && $payload['tools']===[] && $payload['reasoning']['effort']==='none','Restricted cheap text-only payload');
    foreach([
        ['prompt'=>''],['prompt'=>str_repeat('x',8001)],['prompt'=>'a','model'=>'gpt-6-astra'],
        ['prompt'=>'a','max_output_tokens'=>100000],['prompt'=>'a','tools'=>[['type'=>'web_search']]],
        ['prompt'=>'a','instructions'=>str_repeat('x',2001)],['prompt'=>['array']],
    ] as $bad) {
        $failed=false;
        try{gd_ai_payload($bad);}catch(InvalidArgumentException $error){$failed=true;}
        ai_check($failed,'Invalid payload must be rejected');
    }
    $reply=['output'=>[
        ['type'=>'reasoning','summary'=>[['text'=>'secret reasoning']]], 
        ['type'=>'message','content'=>[['type'=>'output_text','text'=>'Antwort A'],
            ['type'=>'refusal','text'=>'ignore']]],
        ['type'=>'message','content'=>[['type'=>'output_text','text'=>'Antwort B']]],
    ]];
    ai_check(gd_ai_extract_text($reply)==="Antwort A\nAntwort B",'Only output_text reaches client');
    ai_check(gd_ai_extract_text([])==='','Empty response safely handled');

    $db=tempnam(sys_get_temp_dir(),'gd-ai-quota-');
    $now=1762185600;
    try{
        ai_check(gd_ai_quota($c,$db,$now),'First quota request');
        ai_check(gd_ai_quota($c,$db,$now),'Second quota request');
        ai_check(!gd_ai_quota($c,$db,$now),'Per-minute limit denies third request');
        ai_check(gd_ai_quota($c,$db,$now+61),'Minute window resets');
        ai_check(!gd_ai_quota($c,$db,$now+122),'Daily limit denies fourth request');
        ai_check(gd_ai_quota($c,$db,$now+86400),'New UTC day resets daily limit');
    }finally{@unlink($db);}
    echo "AI bridge: private config, auth, strict input, no stored outputs, text extraction, minute/day quota OK\n";
}finally{@unlink($temp);}
