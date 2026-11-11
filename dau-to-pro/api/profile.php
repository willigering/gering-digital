<?php
declare(strict_types=1);
require __DIR__.'/../../achievements_lib.php';
require_once __DIR__.'/../../avatar_lib.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store, private');header('X-Content-Type-Options: nosniff');header('X-Robots-Tag: noindex');
if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET'){http_response_code(405);header('Allow: GET');exit;}
if(!learner_current()){http_response_code(401);echo '{"error":"Bitte anmelden."}';exit;}
$id=filter_var($_GET['id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
$profile=$id?xp_public_profile($id):null;
if(!$profile){http_response_code(404);echo '{"error":"Dieses Profil ist nicht verfügbar."}';exit;}
$profile['avatar']=avatar_public_layers((int)$id);
echo json_encode($profile,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
