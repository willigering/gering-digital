<?php
// Local dev router emulating .htaccess (data/ blocked, slug rewrites).
$root=getenv('GD_ROOT');
$uri=urldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if (preg_match('~^/data(/|$)~',$uri)) {http_response_code(403);exit('Forbidden');}
if (preg_match('~^/__preview/([a-z0-9][a-z0-9-]{2,59})/?(.*)$~',$uri,$m)) {$_GET['slug']=$m[1];if($m[2]!=='')$_GET['file']=$m[2];chdir($root.'/admin');require $root.'/admin/html_preview.php';exit;}
// Nur in NERD-FM-Browsertests: zwei echte, same-origin Modulziele für die
// Navigation in der permanenten Radiohülle (ohne Produktionsdaten zu verändern).
if (getenv('NERD_RADIO_AUDIO')==='audio/nerd-radio-test'
    && in_array($uri,['/osi/','/subnetsprint/'],true)) {
    header('Content-Type: text/html; charset=utf-8');
    header('X-Frame-Options: SAMEORIGIN');
    echo '<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Testmodul</title></head><body>'
      .'<h1>Testmodul</h1><dtp-back></dtp-back><a href="/subnetsprint/" id="next-module">Anderes Modul</a>'
      .'<script>const l=document.createElement("a");l.href="/dau-to-pro/#lernmodule";l.id="back-module";l.textContent="Zurück zur Modulauswahl";document.querySelector("dtp-back").attachShadow({mode:"open"}).append(l);</script>'
      .'</body></html>';
    exit;
}
$path=$root.$uri;
if (is_file($path)) return false;
if (is_dir($path)) { if (is_file(rtrim($path,'/').'/index.php')) { if(!str_ends_with($uri,'/')){header('Location: '.$uri.'/');exit;} $_SERVER['SCRIPT_NAME']=rtrim($uri,'/').'/index.php'; chdir($path); require rtrim($path,'/').'/index.php'; exit;} return false; }
if (preg_match('~^/([a-z0-9][a-z0-9-]{2,59})/?(.*)$~',$uri,$m)) {$_GET['slug']=$m[1];if($m[2]!=='')$_GET['file']=$m[2];require $root.'/html_project.php';exit;}
http_response_code(404); echo 'Not found';
