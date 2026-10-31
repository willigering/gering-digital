<?php
require __DIR__.'/../lib.php'; require_login(); check_csrf();
$db=db();
$id=(int)($_POST['id']??0); $name=trim($_POST['name']??''); $desc=trim($_POST['short_description']??'');
$play=trim($_POST['play_url']??''); $apple=trim($_POST['apple_url']??''); $sort=(int)($_POST['sort_order']??0);
$category=$_POST['category']??'apps';
if(!array_key_exists($category,project_categories())) $category='apps';
$status=$_POST['status']??'bald_verfuegbar'; $allowed=['entwicklung','bald_verfuegbar','google','apple','both'];
if(!in_array($status,$allowed,true)) $status='bald_verfuegbar';
$visible=!empty($_POST['published'])?1:0;
if(!$name||!$desc) die('Pflichtfelder fehlen.');
$icon='';
if(!empty($_FILES['icon']['tmp_name'])){
  $f=$_FILES['icon']; if($f['error']!==UPLOAD_ERR_OK||$f['size']>2*1024*1024) die('Icon zu groß oder Uploadfehler.');
  $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']); $allowedMime=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
  if(!isset($allowedMime[$mime])) die('Nur JPG, PNG oder WebP erlaubt.');
  $namefile=bin2hex(random_bytes(12)).'.'.$allowedMime[$mime]; $target=__DIR__.'/../assets/uploads/'.$namefile;
  if(!move_uploaded_file($f['tmp_name'],$target)) die('Upload fehlgeschlagen.'); $icon='assets/uploads/'.$namefile;
}
if($id){
  $old=$db->prepare('SELECT icon FROM apps WHERE id=?'); $old->execute([$id]); $oldIcon=$old->fetchColumn();
  if($icon==='') $icon=$oldIcon;
  $st=$db->prepare('UPDATE apps SET name=?,short_description=?,play_url=?,apple_url=?,icon=?,published=?,sort_order=?,status=?,category=? WHERE id=?');
  $st->execute([$name,$desc,$play,$apple,$icon,$visible,$sort,$status,$category,$id]);
}else{
  $st=$db->prepare('INSERT INTO apps(name,short_description,play_url,apple_url,icon,published,sort_order,status,category) VALUES(?,?,?,?,?,?,?,?,?)');
  $st->execute([$name,$desc,$play,$apple,$icon,$visible,$sort,$status,$category]);
}
header('Location: index.php'); exit;
