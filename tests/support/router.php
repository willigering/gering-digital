<?php
// Local dev router emulating .htaccess (data/ blocked, slug rewrites).
$root=getenv('GD_ROOT');
$uri=urldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if (preg_match('~^/data(/|$)~',$uri)) {http_response_code(403);exit('Forbidden');}
if (preg_match('~^/__preview/([a-z0-9][a-z0-9-]{2,59})/?(.*)$~',$uri,$m)) {$_GET['slug']=$m[1];if($m[2]!=='')$_GET['file']=$m[2];chdir($root.'/admin');require $root.'/admin/html_preview.php';exit;}
$path=$root.$uri;
if (is_file($path)) return false;
if (is_dir($path)) { if (is_file(rtrim($path,'/').'/index.php')) { if(!str_ends_with($uri,'/')){header('Location: '.$uri.'/');exit;} $_SERVER['SCRIPT_NAME']=rtrim($uri,'/').'/index.php'; chdir($path); require rtrim($path,'/').'/index.php'; exit;} return false; }
if (preg_match('~^/([a-z0-9][a-z0-9-]{2,59})/?(.*)$~',$uri,$m)) {$_GET['slug']=$m[1];if($m[2]!=='')$_GET['file']=$m[2];require $root.'/html_project.php';exit;}
http_response_code(404); echo 'Not found';
