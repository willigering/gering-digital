<?php
// NERD FM: liefert einen Song aus dem gesperrten Ordner audio/nerd-fm/ aus.
// Nur mit gültigem, an die eigene Sitzung gebundenem Link (aus der Seite), nur von derselben Website,
// freischaltbare Songs nur an Lernkonten mit dem passenden Achievement. Unterstützt Range-Anfragen
// (Spulen im Player), begrenzt Songstarts je Sitzung und erlaubt kein Zwischenspeichern in fremden Caches.
declare(strict_types=1);
require __DIR__.'/../../nerd_fm_lib.php';

function nfm_deny(int $status): never {
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store, private');
    echo $status===429?'Zu viele Abrufe. Bitte später erneut versuchen.':'Nicht verfügbar.';
    exit;
}
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Cross-Origin-Resource-Policy: same-origin');

$method=$_SERVER['REQUEST_METHOD']??'GET';
if ($method!=='GET' && $method!=='HEAD') { header('Allow: GET, HEAD'); nfm_deny(405); }
// Nur von der eigenen Website (Browser senden Sec-Fetch-Site; fremde Seiten und Hotlinks werden abgewiesen).
if (in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',['cross-site','same-site'],true)) nfm_deny(403);
if (in_array($_SERVER['HTTP_SEC_FETCH_DEST']??'audio',['document','iframe','frame','embed','object'],true)) nfm_deny(403);

$id=(string)($_GET['s']??'');
$songs=nfm_songs();
if (!isset($songs[$id])) nfm_deny(404);
$song=$songs[$id];
$learner=learner_current();
$lid=$learner?(int)$learner['id']:0;
if (!nfm_link_ok($id,$lid,session_id(),(string)($_GET['e']??''),(string)($_GET['k']??''))) nfm_deny(403);
if (!nfm_is_available($song,nfm_unlocked_codes($learner))) nfm_deny(403);

$path=nfm_dir().'/'.$song['file'];
if (!is_file($path)) nfm_deny(404);
$size=filesize($path);

// Songstarts zählen (Anfragen ab Byte 0), nicht jedes Nachladen beim Spulen.
$range=(string)($_SERVER['HTTP_RANGE']??'');
$start=0;$end=$size-1;
if ($range!=='') {
    if (!preg_match('/^bytes=(\d*)-(\d*)$/D',$range,$m) || ($m[1]==='' && $m[2]==='')) { header('Content-Range: bytes */'.$size); nfm_deny(416); }
    if ($m[1]==='') { $start=max(0,$size-(int)$m[2]); }
    else { $start=(int)$m[1]; if ($m[2]!=='') $end=min($end,(int)$m[2]); }
    if ($start>$end || $start>=$size) { header('Content-Range: bytes */'.$size); nfm_deny(416); }
}
if ($start===0 && !nfm_rate_hit(session_id())) nfm_deny(429);
session_write_close();   // lange Übertragung blockiert sonst andere Anfragen derselben Sitzung

// Serve the actual format: the browser may refuse random access for a
// WAVE test fixture labelled as MPEG (especially with nosniff enabled).
$extension=strtolower(pathinfo($path,PATHINFO_EXTENSION));
$mime=match($extension) {
    'wav','wave' => 'audio/wav',
    'ogg','oga' => 'audio/ogg',
    'm4a' => 'audio/mp4',
    default => 'audio/mpeg'
};
header('Content-Type: '.$mime);
header('Accept-Ranges: bytes');
header('Cache-Control: private, no-store, no-transform');
header('Content-Disposition: inline');
if ($range!=='') { http_response_code(206); header('Content-Range: bytes '.$start.'-'.$end.'/'.$size); }
header('Content-Length: '.($end-$start+1));
if ($method==='HEAD') exit;

$fh=fopen($path,'rb');
if (!$fh) nfm_deny(500);
fseek($fh,$start);
$left=$end-$start+1;
while ($left>0 && !feof($fh) && !connection_aborted()) {
    $chunk=fread($fh,min(65536,$left));
    if ($chunk===false) break;
    echo $chunk; flush();
    $left-=strlen($chunk);
}
fclose($fh);
