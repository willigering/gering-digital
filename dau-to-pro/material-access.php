<?php
declare(strict_types=1);
require_once __DIR__.'/../learner_lib.php';

function dtp_material_unlocked(?array $learner): bool {
    return $learner !== null
        && ($_SESSION['dtp_material_learner'] ?? null) === (int)$learner['id'];
}

function dtp_material_require_access(): void {
    header('Cache-Control: no-store, private');
    $learner = learner_current();
    if (dtp_material_unlocked($learner)) return;
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
        http_response_code($learner ? 403 : 401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'error' => 'Unterrichtsmaterial im Konto freischalten.']);
    } else {
        header('Location: /dau-to-pro/konto.php?material=1#unterrichtszugang', true, 303);
    }
    exit;
}
