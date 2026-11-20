<?php
declare(strict_types=1);
$root=dirname(__DIR__);
$files=[
  'homework-module.php','homework-api.php','homework-storage.php',
  'HA.html','assets/homework.js','assets/homework.css'
];
foreach($files as $file){
  if(!is_file($root.'/'.$file))throw new RuntimeException('Missing HomeWork asset: '.$file);
}
$module=file_get_contents($root.'/homework-module.php');
$api=file_get_contents($root.'/homework-api.php');
$storage=file_get_contents($root.'/homework-storage.php');
$html=file_get_contents($root.'/HA.html');
$js=file_get_contents($root.'/assets/homework.js');
$css=file_get_contents($root.'/assets/homework.css');
$ids='/\A[a-z0-9-]{3,80}\z/D';
foreach(['hw-1234567890abcdef','lf-vi-03'] as $id){
  if(!preg_match($ids,$id))throw new RuntimeException('Valid module ID rejected.');
}
foreach(['../secret','abc.php','a/b',''] as $id){
  if(preg_match($ids,$id))throw new RuntimeException('Invalid module ID accepted.');
}
if(!str_contains($module,'id="hw-return"')||!str_contains($module,'href="/HA.html"')){
  throw new RuntimeException('Return-to-HomeWork link missing.');
}
if(!str_contains($js,"a.href='homework-module.php?id='") || str_contains($js, "a.target='_blank'")){
  throw new RuntimeException('Modules must open in the same tab.');
}
if(!str_contains($js,'result.moduleId!==id')||!str_contains($module,"'moduleId'")){
  throw new RuntimeException('Uploader completion must be verified.');
}
if (!str_contains($storage,"['I','II','III','IV','V','VI']") ||
    !str_contains($storage,"'IT '.$roman")) {
  throw new RuntimeException('Missing default IT I–VI category seeding.');
}
foreach(['create-category','rename-module','set-category','delete-module'] as $action){
  if(!str_contains($api,"'".$action."'"))throw new RuntimeException('Missing API action '.$action);
}
if(!str_contains($html,'id="categoryNav"')||!str_contains($html,'id="editDialog"')||
   !str_contains($html,'id="categoryDialog"')||!str_contains($html,'id="uploadCategory"')){
  throw new RuntimeException('HomeWork UI controls missing.');
}
if(!str_contains($css,'dau-backgrounds/klausur-bg.webp')){
  throw new RuntimeException('DAU TO PRO examination background missing.');
}
echo "HomeWork smoke checks passed.\n";
