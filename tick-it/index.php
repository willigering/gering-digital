<?php
declare(strict_types=1);
require_once __DIR__.'/app/bootstrap.php';
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Content-Security-Policy: default-src \'self\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data:; font-src \'self\'; connect-src \'self\'; object-src \'none\'; base-uri \'self\'; frame-ancestors \'none\'; form-action \'self\'');
$releaseData = is_file(__DIR__.'/release.json') ? json_decode((string)file_get_contents(__DIR__.'/release.json'), true) : null;
$revision = is_array($releaseData) && preg_match('/^[a-f0-9]{40}$/D', (string)($releaseData['revision'] ?? '')) ? $releaseData['revision'] : 'initial';
$assetVersion = htmlspecialchars(substr($revision, 0, 12), ENT_QUOTES, 'UTF-8');
?><!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#10151b"><title>IT Support — Service Desk</title>
<link rel="stylesheet" href="assets/styles.css?v=<?=$assetVersion?>"></head>
<body data-csrf="<?=htmlspecialchars(csrf(),ENT_QUOTES,'UTF-8')?>" data-release-version="<?=htmlspecialchars($revision,ENT_QUOTES,'UTF-8')?>">
<div id="app" role="application"><div class="initial-loader">IT Support wird geladen …</div></div>
<div id="toasts" aria-live="polite"></div>
<script src="assets/app.js?v=<?=$assetVersion?>" defer></script>
<script src="assets/update-notice.js?v=<?=$assetVersion?>" defer></script></body></html>
