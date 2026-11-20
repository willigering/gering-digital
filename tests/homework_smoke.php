<?php
declare(strict_types=1);
// Guard against PHP regex escaping regressions in private module uploads.
$module = file_get_contents(__DIR__.'/../homework-module.php');
$api = file_get_contents(__DIR__.'/../homework-api.php');
if ($module === false || $api === false) exit(1);
$ids = '/\A[a-z0-9-]{3,80}\z/D';
foreach (['hw-1234567890abcdef','lf-vi-03'] as $id) {
    if (!preg_match($ids,$id)) throw new RuntimeException('Valid ID rejected: '.$id);
}
foreach (['../secret','abc.php','a/b',''] as $id) {
    if (preg_match($ids,$id)) throw new RuntimeException('Invalid ID accepted: '.$id);
}
if (!str_contains($module, "'/\\A[a-z0-9-]{3,80}\\z/D'") ||
    !str_contains($api, "'/\\A[a-z0-9-]{3,80}\\z/D'")) {
  throw new RuntimeException('Module ID validation regex was changed unexpectedly.');
}
if (!str_contains($module,'id="hw-return"') || !str_contains($module,'href="/HA.html"')) {
  throw new RuntimeException('Return-to-HomeWork button missing.');
}
$html = file_get_contents(__DIR__.'/../HA.html');
if ($html === false || !str_contains($html, "a.href='homework-module.php?id='") ||
    str_contains($html, "a.target='_blank'")) {
  throw new RuntimeException('HomeWork navigation must open within the same tab.');
}
echo "HomeWork smoke checks passed.\n";
