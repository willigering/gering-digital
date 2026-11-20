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
  if(isset($_POST['chunkIndex'])){
    $index=filter_var($_POST['chunkIndex'],FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>99]]);
    $total=filter_var($_POST['chunkTotal']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>100]]);
    if($index===false||$total===false||$index>=$total)stop('Ungültiger Dateiteil.',400);
    if(!isset($_FILES['lesson'])||!is_uploaded_file($_FILES['lesson']['tmp_name']??''))stop('Dateiteil fehlt.',400);
    if(($_FILES['lesson']['error']??1)!==UPLOAD_ERR_OK||($_FILES['lesson']['size']??0)>1048576)stop('Dateiteil fehlerhaft oder zu groß.',413);
    if(!is_dir($base)&&!mkdir($base,0700,true)&&!is_dir($base))stop('Privater Ordner kann nicht erstellt werden.',503);
    if(!is_file($base.'/.htaccess')&&file_put_contents($base.'/.htaccess',"Require all denied\n")===false)stop('Schutzregel fehlt.',503);
    $partFile=$base.'/upload-'.hash('sha256',session_id()).'.partial';
    if($index===0){if(file_put_contents($partFile,'',LOCK_EX)===false)stop('Upload konnte nicht beginnen.',500);}
    if(!is_file($partFile))stop('Upload-Sitzung fehlt. Bitte erneut starten.',409);
    $current=filesize($partFile);
    if($current>12582912)stop('Upload zu groß.',413);
    $bytes=file_get_contents($_FILES['lesson']['tmp_name']);
    if($bytes===false||file_put_contents($partFile,$bytes,FILE_APPEND|LOCK_EX)===false)stop('Dateiteil konnte nicht gespeichert werden.',500);
    if($index===$total-1){
      if(filesize($partFile)>12582912){@unlink($partFile);stop('Datei zu groß.',413);}
      $head=file_get_contents($partFile,false,null,0,4096);
      if(!is_string($head)||stripos($head,'<!doctype html')===false&&stripos($head,'<html')===false){@unlink($partFile);stop('Keine vollständige HTML-Datei.',415);}
      chmod($partFile,0600);
      if(!rename($partFile,$file))stop('Aktivierung fehlgeschlagen.',500);
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok'=>true,'part'=>$index+1,'total'=>$total]);exit;
  }
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
