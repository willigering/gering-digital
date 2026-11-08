<?php
// Local dev router emulating .htaccess (data/ blocked, slug rewrites).
$root=getenv('GD_ROOT');
$uri=urldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if (preg_match('~^/data(/|$)~',$uri)) {http_response_code(403);exit('Forbidden');}
if (preg_match('~^/__preview/([a-z0-9][a-z0-9-]{2,59})/?(.*)$~',$uri,$m)) {$_GET['slug']=$m[1];if($m[2]!=='')$_GET['file']=$m[2];chdir($root.'/admin');require $root.'/admin/html_preview.php';exit;}
$path=$root.$uri;
// Der eingebaute PHP-Server kennt keine Range-Anfragen; Browser können Audio ohne sie nicht spulen (wie Apache/song.php es erlauben).
if (is_file($path) && preg_match('~\.(wav|mp3|ogg|m4a)$~i',$path) && preg_match('/^bytes=(\d*)-(\d*)$/D',(string)($_SERVER['HTTP_RANGE']??''),$r)) {
    $size=filesize($path);
    $from=$r[1]===''?max(0,$size-(int)$r[2]):(int)$r[1];
    $to=$r[1]!==''&&$r[2]!==''?min($size-1,(int)$r[2]):$size-1;
    if ($from>$to) {http_response_code(416);header('Content-Range: bytes */'.$size);exit;}
    http_response_code(206);
    header('Content-Type: '.(str_ends_with(strtolower($path),'.wav')?'audio/wav':'audio/mpeg'));
    header('Accept-Ranges: bytes');
    header('Content-Range: bytes '.$from.'-'.$to.'/'.$size);
    header('Content-Length: '.($to-$from+1));
    $fh=fopen($path,'rb');fseek($fh,$from);echo fread($fh,$to-$from+1);fclose($fh);exit;
}
if (is_file($path)) {if (preg_match('~\.(wav|mp3|ogg|m4a)$~i',$path)) header('Accept-Ranges: bytes');return false;}
if (is_dir($path)) { if (is_file(rtrim($path,'/').'/index.php')) { if(!str_ends_with($uri,'/')){header('Location: '.$uri.'/');exit;} $_SERVER['SCRIPT_NAME']=rtrim($uri,'/').'/index.php'; chdir($path); require rtrim($path,'/').'/index.php'; exit;} return false; }
if (preg_match('~^/([a-z0-9][a-z0-9-]{2,59})/?(.*)$~',$uri,$m)) {$_GET['slug']=$m[1];if($m[2]!=='')$_GET['file']=$m[2];require $root.'/html_project.php';exit;}
http_response_code(404); echo 'Not found';
