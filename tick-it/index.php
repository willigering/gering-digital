<?php
declare(strict_types=1);
require_once __DIR__.'/app/bootstrap.php';
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header('Content-Security-Policy: default-src \'self\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data:; font-src \'self\'; connect-src \'self\'; object-src \'none\'; base-uri \'self\'; frame-ancestors \'none\'; form-action \'self\'');
?><!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#10151b"><title>IT Support — Service Desk</title>
<link rel="stylesheet" href="assets/styles.css"></head>
<body data-csrf="<?=htmlspecialchars(csrf(),ENT_QUOTES,'UTF-8')?>">
<div id="app" role="application"><div class="initial-loader">IT Support wird geladen …</div></div>
<div id="toasts" aria-live="polite"></div>
<script src="assets/app.js" defer></script></body></html>
