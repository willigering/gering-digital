<?php
require __DIR__.'/../lib.php';
require_login();
header('Content-Type: application/json; charset=utf-8');
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);echo json_encode(['ok'=>false,'message'=>'Nur POST erlaubt.']);exit;}
try{
  check_csrf();
  $order=$_POST['order']??[];
  if(!is_array($order)||!$order){throw new RuntimeException('Keine Reihenfolge erhalten.');}
  $ids=array_values(array_unique(array_filter(array_map('intval',$order),fn($id)=>$id>0)));
  $db=db();
  $existing=(int)$db->query('SELECT COUNT(*) FROM apps')->fetchColumn();
  if(count($ids)!==$existing){throw new RuntimeException('Die App-Liste hat sich geändert. Bitte Seite neu laden.');}
  $db->beginTransaction();
  $stmt=$db->prepare('UPDATE apps SET sort_order=? WHERE id=?');
  foreach($ids as $position=>$id){$stmt->execute([$position+1,$id]);}
  $db->commit();
  echo json_encode(['ok'=>true,'message'=>'Reihenfolge gespeichert.']);
}catch(Throwable $e){if(isset($db)&&$db->inTransaction())$db->rollBack();http_response_code(400);echo json_encode(['ok'=>false,'message'=>$e->getMessage()]);}
