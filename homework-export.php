<?php
declare(strict_types=1);
header('Cache-Control: private, no-store');header('X-Content-Type-Options: nosniff');header('X-Robots-Tag: noindex, nofollow');header('Referrer-Policy: same-origin');header('X-Frame-Options: SAMEORIGIN');
$secure=(!empty($_SERVER['HTTPS'])&&strtolower((string)$_SERVER['HTTPS'])!=='off');
session_name('GD_HomeWork');session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Strict']);session_start();
function export_error(string $message,int $status):never{http_response_code($status);header('Content-Type: text/plain; charset=utf-8');exit($message);}
if($_SERVER['REQUEST_METHOD']!=='GET')export_error('Methode nicht erlaubt.',405);
if(empty($_SESSION['hw_login']))export_error('Bitte erst bei HomeWork anmelden.',401);
require_once __DIR__.'/homework-storage.php';
$id=(string)($_GET['id']??'');$variant=(string)($_GET['variant']??'edited');$format=(string)($_GET['format']??'html');
if(!hw_valid_id($id)||!in_array($variant,['edited','blank'],true)||!in_array($format,['html','print'],true))export_error('Ungültige Exportauswahl.',400);
$db=hw_db();$q=$db->prepare('SELECT title FROM modules WHERE id=?');$q->execute([$id]);$title=$q->fetchColumn();
$file=__DIR__.'/data/homework/'.$id.'.html';if(!is_string($title)||!is_file($file)||is_link($file))export_error('Modul nicht gefunden.',404);
$source=file_get_contents($file);if(!is_string($source))export_error('Modul konnte nicht gelesen werden.',500);
$state=$variant==='edited'?hw_saved_workbook($db,$id):['fields'=>[],'revision'=>0];
$runtime=hw_workbook_runtime($id,$state,true,$variant==='blank');
if($format==='html'){
 $name=preg_replace('/[^\pL\pN _.-]/u','',$title)?:'Arbeitsblatt';$name=substr($name,0,110).'-'.($variant==='edited'?'bearbeitet':'unbearbeitet').'.html';
 header('Content-Type: text/html; charset=utf-8');header("Content-Disposition: attachment; filename=\"HomeWork-Export.html\"; filename*=UTF-8''".rawurlencode($name));
}else{
 header('Content-Type: text/html; charset=utf-8');
 $runtime.='<div class="hw-print-actions" data-hw-ui><p>PDF-Export: Im Druckdialog „Als PDF speichern“ auswählen.</p><button onclick="window.print()">PDF speichern / Drucken</button><a href="/HA.html">Zur Übersicht</a></div>';
}
echo hw_inject_workbook($source,$runtime);
