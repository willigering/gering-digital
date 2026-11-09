<?php
// Local dev router emulating .htaccess (data/ blocked, slug rewrites).
$root=getenv('GD_ROOT');
$uri=urldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if (preg_match('~^/data(/|$)~',$uri)) {http_response_code(403);exit('Forbidden');}
if (preg_match('~^/__preview/([a-z0-9][a-z0-9-]{2,59})/?(.*)$~',$uri,$m)) {$_GET['slug']=$m[1];if($m[2]!=='')$_GET['file']=$m[2];chdir($root.'/admin');require $root.'/admin/html_preview.php';exit;}
// Der PHP-Testserver ignoriert HTTP Range für statische WAV-Dateien und
// verhindert dadurch reales Audio-Seeking in Chromium. Nur künstliche
// Testsignale bekommen hier die 206-Partial-Content-Antwort wie bei STRATO.
if (preg_match('~^/dau-to-pro/audio/nerd-radio-test/([A-Za-z0-9_-]+\\.wav)$~', $uri, $match)) {
    $audio=$root.'/dau-to-pro/audio/nerd-radio-test/'.$match[1];
    if (!is_file($audio)) {http_response_code(404);exit('Not found');}
    $size=filesize($audio);
    $start=0;$end=$size-1;
    header('Content-Type: audio/wav');
    header('Accept-Ranges: bytes');
    $range=(string)($_SERVER['HTTP_RANGE']??'');
    if ($range!=='' && preg_match('/^bytes=(\\d+)-(\\d*)$/D',$range,$m)) {
        $start=(int)$m[1];
        if ($m[2]!=='') $end=min($end,(int)$m[2]);
        if ($start>$end || $start>=$size) {
            http_response_code(416);header('Content-Range: bytes */'.$size);exit;
        }
        http_response_code(206);
        header('Content-Range: bytes '.$start.'-'.$end.'/'.$size);
    }
    header('Content-Length: '.($end-$start+1));
    if (($_SERVER['REQUEST_METHOD']??'GET')==='HEAD')exit;
    $input=fopen($audio,'rb');
    fseek($input,$start);
    $left=$end-$start+1;
    while ($left>0 && !feof($input)) {
        $buf=fread($input,min(65536,$left));
        if ($buf===false||$buf==='')break;
        echo $buf;$left-=strlen($buf);
    }
    fclose($input);
    exit;
}
$path=$root.$uri;
if (is_file($path)) return false;
if (is_dir($path)) { if (is_file(rtrim($path,'/').'/index.php')) { if(!str_ends_with($uri,'/')){header('Location: '.$uri.'/');exit;} $_SERVER['SCRIPT_NAME']=rtrim($uri,'/').'/index.php'; chdir($path); require rtrim($path,'/').'/index.php'; exit;} return false; }
if (preg_match('~^/([a-z0-9][a-z0-9-]{2,59})/?(.*)$~',$uri,$m)) {$_GET['slug']=$m[1];if($m[2]!=='')$_GET['file']=$m[2];require $root.'/html_project.php';exit;}
http_response_code(404); echo 'Not found';
