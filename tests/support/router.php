<?php
// Local dev router emulating .htaccess (data/ blocked, slug rewrites).
$root=getenv('GD_ROOT');
$uri=urldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if (preg_match('~^/data(/|$)~',$uri)) {http_response_code(403);exit('Forbidden');}
if (preg_match('~^/__preview/([a-z0-9][a-z0-9-]{2,59})/?(.*)$~',$uri,$m)) {$_GET['slug']=$m[1];if($m[2]!=='')$_GET['file']=$m[2];chdir($root.'/admin');require $root.'/admin/html_preview.php';exit;}
$path=$root.$uri;
// The PHP built-in static server does not reliably implement HTTP byte ranges
// for test WAV files. Real STRATO/Apache and api/song.php support Range;
// emulate that here so Chromium's seek test measures the player, not the fixture.
if (is_file($path) && preg_match('~^/dau-to-pro/audio/nerd-radio-test/[^/]+\\.(wav|mp3|ogg|m4a)$~i', $uri)) {
    $size = filesize($path);
    $start = 0; $end = $size - 1;
    $range = (string)($_SERVER['HTTP_RANGE'] ?? '');
    if ($range !== '') {
        if (!preg_match('/^bytes=(\\d*)-(\\d*)$/D', $range, $m) || ($m[1] === '' && $m[2] === '')) {
            http_response_code(416); header('Content-Range: bytes */'.$size); exit;
        }
        if ($m[1] === '') $start = max(0, $size-(int)$m[2]);
        else { $start = (int)$m[1]; if ($m[2] !== '') $end = min($end, (int)$m[2]); }
        if ($start > $end || $start >= $size) {
            http_response_code(416); header('Content-Range: bytes */'.$size); exit;
        }
        http_response_code(206);
        header('Content-Range: bytes '.$start.'-'.$end.'/'.$size);
    }
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    header('Content-Type: '.match($ext) {'wav'=>'audio/wav','ogg'=>'audio/ogg','m4a'=>'audio/mp4',default=>'audio/mpeg'});
    header('Accept-Ranges: bytes');
    header('Content-Length: '.($end-$start+1));
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') exit;
    $fh=fopen($path,'rb'); fseek($fh,$start); $left=$end-$start+1;
    while($left>0 && !feof($fh)) {
        $part=fread($fh,min($left,65536));
        if ($part===false || $part==='') break;
        echo $part; $left-=strlen($part);
    }
    fclose($fh);
    exit;
}
if (is_file($path)) return false;
if (is_dir($path)) { if (is_file(rtrim($path,'/').'/index.php')) { if(!str_ends_with($uri,'/')){header('Location: '.$uri.'/');exit;} $_SERVER['SCRIPT_NAME']=rtrim($uri,'/').'/index.php'; chdir($path); require rtrim($path,'/').'/index.php'; exit;} return false; }
if (preg_match('~^/([a-z0-9][a-z0-9-]{2,59})/?(.*)$~',$uri,$m)) {$_GET['slug']=$m[1];if($m[2]!=='')$_GET['file']=$m[2];require $root.'/html_project.php';exit;}
http_response_code(404); echo 'Not found';
