<?php
/** DAU TO PRO: lightweight, uncached published-module revision probe. */
require_once __DIR__.'/../../learner_lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
$slug=(string)($_GET['slug']??'');
if ($slug!=='' && !preg_match('/^[a-z0-9][a-z0-9_-]{0,100}$/D',$slug)) { http_response_code(400);echo '{"error":"invalid slug"}';exit; }
try {
    if ($slug==='') {
        echo json_encode(['revision'=>learner_landing_update_revision(db())],JSON_THROW_ON_ERROR);
        exit;
    }
    $stmt=db()->prepare("SELECT live_version FROM html_pages WHERE slug=? AND published=1 AND category='lernen'");
    $stmt->execute([$slug]);
    $version=$stmt->fetchColumn();
    if (!$version) { http_response_code(404);echo '{"error":"module unavailable"}';exit; }
    $revision=learner_update_revision((string)$version);
    echo json_encode(['revision'=>$revision],JSON_THROW_ON_ERROR);
} catch(Throwable $e) { http_response_code(503);echo '{"error":"temporarily unavailable"}'; }
