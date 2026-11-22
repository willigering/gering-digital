<?php
declare(strict_types=1);
$root=realpath(__DIR__.'/..');
$db=tempnam(sys_get_temp_dir(),'gd-sl-fb-').'.sqlite';
$rate=tempnam(sys_get_temp_dir(),'gd-sl-rate-').'.json';
$dump=tempnam(sys_get_temp_dir(),'gd-sl-mail-').'.json';
@unlink($rate);@unlink($dump);
putenv('GD_DB_PATH='.$db);
putenv('GD_SHARPLAB_RATE_PATH='.$rate);
putenv('GD_LOCAL_PREVIEW=1');
putenv('GD_SHARPLAB_SKIP_MAIL=1');
putenv('GD_SHARPLAB_MAIL_DUMP='.$dump);
require $root.'/lib.php';
db();

$port=19000+random_int(0,999);
$cmd=sprintf(
    'GD_ROOT=%s GD_DB_PATH=%s GD_SHARPLAB_RATE_PATH=%s GD_SHARPLAB_MAIL_DUMP=%s GD_LOCAL_PREVIEW=1 GD_SHARPLAB_SKIP_MAIL=1 exec php -S 127.0.0.1:%d -t %s %s',
    escapeshellarg($root),escapeshellarg($db),escapeshellarg($rate),escapeshellarg($dump),$port,escapeshellarg($root),escapeshellarg(__DIR__.'/support/router.php')
);
$server=proc_open($cmd,[1=>['file','/dev/null','w'],2=>['file','/dev/null','w']],$pipes);
$base="http://127.0.0.1:$port";
for($i=0;$i<50 && !@fsockopen('127.0.0.1',$port);$i++) usleep(100000);
$failures=0;$count=0;
function check(bool $ok,string $label): void {global $failures,$count;$count++;if(!$ok){$failures++;fwrite(STDERR,"✗ $label\n");}}
function fb(string $method, array $json=null, array $headers=['X-SharpLab-Client: 1']): array {
    global $base;
    $ch=curl_init($base.'/sharplab/feedback.php');
    $hdr=array_merge(['Content-Type: application/json; charset=utf-8'],$headers);
    $opts=[CURLOPT_RETURNTRANSFER=>true,CURLOPT_HEADER=>true,CURLOPT_CUSTOMREQUEST=>$method];
    if($json!==null) $opts[CURLOPT_POSTFIELDS]=json_encode($json,JSON_UNESCAPED_UNICODE);
    $opts[CURLOPT_HTTPHEADER]=$hdr;
    curl_setopt_array($ch,$opts);
    $raw=(string)curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$hs=curl_getinfo($ch,CURLINFO_HEADER_SIZE);
    $body=substr($raw,$hs);
    $data=json_decode($body,true);
    return ['status'=>$status,'body'=>$body,'json'=>is_array($data)?$data:null];
}

try {
    $src=file_get_contents($root.'/sharplab/feedback.php');
    check(str_contains($src,"mail(") && str_contains($src,"info@geringdigital.de"),'Endpunkt sendet per mail() an die Site-Adresse');
    check(str_contains($src,'sharplab@geringdigital.de'),'Absender gehört zur Domain geringdigital.de');
    check(str_contains($src,'Fehlerprotokoll') && str_contains($src,'20480'),'Optionales Log wird begrenzt und als Fehlerprotokoll angehängt');
    check(str_contains($src,'GD_LOCAL_PREVIEW'),'Lokale Vorschau unterdrückt den Versand wie send.php');

    $r=fb('GET',null);
    check($r['status']===405 && ($r['json']['ok']??null)===false,'GET wird abgelehnt');

    $r=fb('POST',['subject'=>'Hallo','message'=>'Der Editor ist gut.'],[]);
    check($r['status']===403 && ($r['json']['ok']??null)===false,'Ohne App-Header abgelehnt');

    $log='Anfang'.str_repeat('x',21000)."LETZTE ZEILE des Protokolls\n";
    $r=fb('POST',['subject'=>"Zeile\r\nBcc: evil@example.com",'message'=>'Testnachricht über die Länge von zehn Zeichen.','appVersion'=>'1.0.5','os'=>'Windows 11','email'=>'willi@example.com','log'=>$log]);
    check($r['status']===200 && ($r['json']['ok']??null)===true && ($r['json']===['ok'=>true] || ($r['json']['ok']??false)===true),'Gültiges Feedback liefert HTTP 2xx und {"ok":true}');
    $mail=json_decode((string)@file_get_contents($dump),true)?:[];
    check(($mail['to']??'')==='info@geringdigital.de','Mail geht an info@geringdigital.de');
    check(($mail['subject']??'')==='SharpLab: ZeileBcc: evil@example.com','Betreff ist SharpLab: + bereinigter Nutzer-Betreff');
    check(str_contains((string)($mail['body']??''),'Fehlerprotokoll') && str_contains((string)($mail['body']??''),'LETZTE ZEILE') && !str_contains((string)($mail['body']??''),'Anfang'),'Fehlerprotokoll enthält nur den begrenzten Schluss');
    check((string)($mail['headers'][0]??'')==='From: SharpLab <sharplab@geringdigital.de>','From ist sharplab@geringdigital.de');
    check(in_array('Reply-To: willi@example.com',(array)($mail['headers']??[]),true),'Gültige E-Mail wird als Reply-To gesetzt');

    $r=fb('POST',['subject'=>'','message'=>'']);
    check($r['status']===422 && ($r['json']['ok']??null)===false,'Leere Nachricht wird abgelehnt');

    $r=fb('POST',['subject'=>str_repeat('A',200),'message'=>str_repeat('B',5001)]);
    check($r['status']===422,'Zu lange Nachricht wird abgelehnt');

    $r=fb('POST',['subject'=>'x','message'=>'Eine gültige Nachricht.','email'=>'nicht-gültig']);
    check($r['status']===422,'Ungültige E-Mail wird abgelehnt');

    $r=fb('POST',['subject'=>'Bot','message'=>'Sollte nicht zählen.','website'=>'http://spam.test']);
    check($r['status']===200 && ($r['json']['ok']??null)===true,'Honeypot antwortet erfolgreich ohne Limit');

    // 1 already used by the valid send above; 9 more should pass, 11th must 429.
    $codes=[];
    for($i=0;$i<10;$i++){
        $r=fb('POST',['subject'=>'Last','message'=>'Noch eine Nachricht '.$i]);
        $codes[]=$r['status'];
    }
    check($codes===array_merge(array_fill(0,9,200),[429]),'Rate-Limit: 10 pro Stunde und IP, danach 429');

    check(is_file($rate) && filesize($rate)>2,'Rate-Limit wird in der Datei unter data/ (bzw. Testpfad) gespeichert');
} finally {
    if(is_resource($server)){proc_terminate($server);proc_close($server);}
    @unlink($db);@unlink($rate);@unlink($dump);
}
echo ($failures===0?'OK':"FAIL $failures")." ($count checks)\n";
exit($failures===0?0:1);
