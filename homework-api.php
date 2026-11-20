<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
$secure=(!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off');
session_name('GD_HomeWork');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Strict']);
session_start();
$_SESSION['hw_csrf'] ??= bin2hex(random_bytes(32));
function output(array $v,int $status=200):never{http_response_code($status);$v['csrf']=$_SESSION['hw_csrf'];echo json_encode($v,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);exit;}
function fail(string $s,int $status=400):never{output(['error'=>$s],$status);}
function db():PDO{
  $dir=__DIR__.'/data';
  if(!is_dir($dir)||!is_writable($dir))fail('Privater Serverspeicher nicht verfügbar.',503);
  $db=new PDO('sqlite:'.$dir.'/homework-private.sqlite',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_TIMEOUT=>8]);
  $db->exec('CREATE TABLE IF NOT EXISTS homework (id TEXT PRIMARY KEY, value TEXT NOT NULL, updated TEXT NOT NULL)');
  return $db;
}
function passwordHash():?string {
  $file=__DIR__.'/data/bewerbungen-private.sqlite';
  if(!is_file($file))return null;
  $d=new PDO('sqlite:'.$file,null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_TIMEOUT=>8]);
  $h=$d->query('SELECT password_hash FROM account WHERE id=1')->fetchColumn();
  return is_string($h)&&$h!==''?$h:null;
}
try{
  $action=(string)($_GET['action']??'state');
  if($action==='state'&&$_SERVER['REQUEST_METHOD']==='GET'){
    if(empty($_SESSION['hw_login']))output(['mode'=>passwordHash()?'login':'nosetup']);
    $q=db()->query('SELECT value,updated FROM homework WHERE id="lf-vi-03"')->fetch(PDO::FETCH_ASSOC);
    $st=db()->query("SELECT value FROM homework WHERE id='status:lf-vi-03'")->fetchColumn();
    output(['mode'=>'ready','value'=>$q['value']??'','updated'=>$q['updated']??null,'moduleStatus'=>in_array($st,['offen','bearbeitung','fertig'],true)?$st:'offen','lessonAvailable'=>is_file(__DIR__.'/data/homework/lf-vi-03.html')]);
  }
  if($_SERVER['REQUEST_METHOD']!=='POST')fail('Methode nicht erlaubt.',405);
  if((int)($_SERVER['CONTENT_LENGTH']??0)>200000)fail('Anfrage zu groß.',413);
  $body=json_decode(file_get_contents('php://input'),true);
  if(!is_array($body))fail('Ungültige Anfrage.');
  if(!hash_equals($_SESSION['hw_csrf'],(string)($body['csrf']??'')))fail('Sitzung abgelaufen.',403);
  if($action==='login'){
    if((int)($_SESSION['hw_locked']??0)>time())fail('Zu viele Versuche. Bitte später erneut versuchen.',429);
    $hash=passwordHash();
    if(!$hash)fail('Bewerbungs-Passwort muss zuerst eingerichtet werden.',409);
    if(!password_verify((string)($body['password']??''),$hash)){
      $_SESSION['hw_attempts']=(int)($_SESSION['hw_attempts']??0)+1;
      if($_SESSION['hw_attempts']>=8)$_SESSION['hw_locked']=time()+900;
      fail('Passwort stimmt nicht.',401);
    }
    session_regenerate_id(true);
    $_SESSION['hw_login']=true;$_SESSION['hw_attempts']=0;
    output(['ok'=>true]);
  }
  if($action==='logout'){
    unset($_SESSION['hw_login']);output(['ok'=>true]);
  }
  if(empty($_SESSION['hw_login']))fail('Nicht angemeldet.',401);
  if($action==='save-status'){
    $status=$body['status']??'';
    if(!is_string($status)||!in_array($status,['offen','bearbeitung','fertig'],true))fail('Ungültiger Bearbeitungsstatus.');
    $stmt=db()->prepare('INSERT INTO homework(id,value,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated=excluded.updated');
    $stmt->execute(['status:lf-vi-03',$status,gmdate('c')]);
    output(['ok'=>true,'moduleStatus'=>$status]);
  }
  if($action==='save'){
    $value=$body['value']??null;
    if(!is_string($value)||strlen($value)>100000)fail('Text darf höchstens 100 KB groß sein.');
    $d=db();
    $stmt=$d->prepare('INSERT INTO homework(id,value,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated=excluded.updated');
    $stmt->execute(['lf-vi-03',$value,gmdate('c')]);
    output(['ok'=>true,'updated'=>gmdate('c')]);
  }
  fail('Unbekannte Aktion.',404);
}catch(Throwable $e){error_log('homework-api: '.$e->getMessage());fail('Serverfehler.',500);}
