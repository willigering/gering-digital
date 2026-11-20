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
$id=(string)($_POST['id']??$_GET['id']??'');
if(!preg_match('/\\A[a-z0-9-]{3,80}\\z/D',$id))stop('Ungültige Modul-ID.',400);
$file=$base.'/'.$id.'.html';
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
    $partFile=$base.'/upload-'.hash('sha256',session_id().':'.$id).'.partial';
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
      try{
        $d=new PDO('sqlite:'.__DIR__.'/data/homework-private.sqlite',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
        $d->exec("CREATE TABLE IF NOT EXISTS modules (id TEXT PRIMARY KEY, title TEXT NOT NULL, topic TEXT NOT NULL, date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'offen', filename TEXT NOT NULL, created TEXT NOT NULL)");
        $title=trim((string)($_POST['title']??''));$topic=trim((string)($_POST['topic']??''));$date=(string)($_POST['date']??'');
        if($title===''||mb_strlen($title)>140)$title='HTML-Modul';
        if($topic===''||mb_strlen($topic)>100)$topic='Unterrichtsmaterial';
        if(!preg_match('/^\\d{4}-\\d{2}-\\d{2}$/',$date))$date=gmdate('Y-m-d');
        $q=$d->prepare("INSERT INTO modules(id,title,topic,date,status,filename,created) VALUES(?,?,? ,?,'offen',?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, topic=excluded.topic, date=excluded.date");
        $q->execute([$id,$title,$topic,$date,$id.'.html',gmdate('c')]);
      }catch(Throwable $e){error_log('HomeWork module: '.$e->getMessage());stop('Moduldaten konnten nicht gespeichert werden.',500);}

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
if(!is_file($file))stop('Unterrichtsdatei nicht gefunden.',404);
header('Content-Type: text/html; charset=utf-8');
header('Content-Security-Policy: frame-ancestors \'self\'');
// Add a fixed return link to the served HTML without modifying the stored upload.
$markup=file_get_contents($file);
if($markup===false)stop('HTML konnte nicht geladen werden.',500);
$navigation=<<<'HTML'
<style id="hw-return-style">
#hw-return{position:fixed!important;right:18px!important;bottom:18px!important;top:auto!important;left:auto!important;z-index:2147483000!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;padding:13px 19px!important;border:1px solid #86dbc9!important;border-radius:12px!important;background:#102129!important;color:#f1f9f7!important;font:700 14px/1.2 system-ui,sans-serif!important;text-decoration:none!important;box-shadow:0 10px 35px #0008!important}
#hw-return:hover{background:#1b3940!important;transform:translateY(-2px)!important}
#hw-return:focus-visible{outline:3px solid #ffeb3b!important;outline-offset:3px!important}
@media(max-width:520px){#hw-return{right:10px!important;bottom:10px!important;padding:11px 13px!important;font-size:12px!important}}
</style>
<a id="hw-return" href="/HA.html" aria-label="Zur HomeWork-Übersicht zurückkehren">← Zu den Hausaufgaben</a>
HTML;
if(preg_match('~</body\\s*>~i',$markup)){
  echo preg_replace('~</body\\s*>~i',static fn($match)=>$navigation."\\n".$match[0],$markup,1);
}else{echo $markup.$navigation;}

