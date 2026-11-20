<?php
declare(strict_types=1);
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: SAMEORIGIN');
$secure=(!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS'])!=='off');
session_name('GD_HomeWork');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Strict']);
session_start();
function stop(string $message,int $status):never{
  http_response_code($status);
  header('Content-Type: text/plain; charset=utf-8');
  echo $message;exit;
}
if(empty($_SESSION['hw_login']))stop('Bitte erst bei HomeWork anmelden.',401);
$base=__DIR__.'/data/homework';
$file=$base.'/lf-vi-03.html';
if($_SERVER['REQUEST_METHOD']==='POST'){
  $csrf=$_POST['csrf']??'';
  if(!is_string($csrf)||empty($_SESSION['hw_csrf'])||!hash_equals($_SESSION['hw_csrf'],$csrf))stop('Ungültige Sitzung.',403);
  if(!isset($_FILES['lesson'])||!is_array($_FILES['lesson']))stop('Keine Datei empfangen.',400);
  $f=$_FILES['lesson'];
  if(($f['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK){
    if(($f['error']??null)===UPLOAD_ERR_INI_SIZE||($f['error']??null)===UPLOAD_ERR_FORM_SIZE)stop('Datei übersteigt das PHP-Uploadlimit auf STRATO.',413);
    stop('Dateiübertragung fehlgeschlagen.',400);
  }
  if(($f['size']??0)<100||($f['size']??0)>12582912)stop('HTML-Datei muss kleiner als 12 MB sein.',413);
  $tmp=$f['tmp_name']??'';
  if(!is_string($tmp)||!is_uploaded_file($tmp))stop('Ungültiger Upload.',400);
  $fp=fopen($tmp,'rb');$head=$fp?fread($fp,4096):'';if($fp)fclose($fp);
  if(!is_string($head)||stripos($head,'<!doctype html')===false&&stripos($head,'<html')===false)stop('Bitte eine vollständige HTML-Datei auswählen.',415);
  if(!is_dir($base)&&!mkdir($base,0700,true)&&!is_dir($base))stop('Privater Ordner kann nicht erstellt werden.',503);
  $deny=$base.'/.htaccess';
  if(!file_exists($deny)&&file_put_contents($deny,"Require all denied\n")===false)stop('Schutzregel konnte nicht erstellt werden.',503);
  $dest=$base.'/'.bin2hex(random_bytes(12)).'.tmp';
  if(!move_uploaded_file($tmp,$dest))stop('Datei konnte nicht gespeichert werden.',500);
  chmod($dest,0600);
  if(!rename($dest,$file)){@unlink($dest);stop('Datei konnte nicht aktiviert werden.',500);}
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok'=>true,'size'=>filesize($file)]);
  exit;
}
if($_SERVER['REQUEST_METHOD']!=='GET')stop('Methode nicht erlaubt.',405);
if(!is_file($file))stop('Unterrichtsdatei noch nicht hochgeladen.',404);
header('Content-Type: text/html; charset=utf-8');
header('Content-Security-Policy: frame-ancestors \'self\'');
readfile($file);
