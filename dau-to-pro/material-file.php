<?php
declare(strict_types=1);
require_once __DIR__.'/material-access.php';
dtp_material_require_access();

$path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$path = is_string($path) ? rawurldecode($path) : '';
if (!preg_match('~^/dau-to-pro/(unterricht/(?:csharp-aufgaben|csharp-bedingungen-t05|it-vi-01|itil-recht)|support-serviceanfragen)\.html$~D', $path, $match)) {
    http_response_code(404);
    exit;
}
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');
readfile(__DIR__.'/'.$match[1].'.html');
