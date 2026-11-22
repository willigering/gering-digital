<?php
/** Öffentlicher, datenbankfreier Versionsendpunkt für Browser mit offenen Tabs. */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
$releaseFile = __DIR__.'/release.json';
$data = is_file($releaseFile) ? json_decode((string)file_get_contents($releaseFile), true) : null;
$revision = is_array($data) ? ($data['revision'] ?? '') : '';
if (!is_string($revision) || !preg_match('/^[a-f0-9]{40}$/D', $revision)) {
    http_response_code(503);
    echo json_encode(['ok'=>false, 'error'=>'Versionsinformation noch nicht bereit.']);
    exit;
}
echo json_encode(['ok'=>true, 'revision'=>$revision], JSON_UNESCAPED_UNICODE);
