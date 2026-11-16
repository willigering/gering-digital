<?php
declare(strict_types=1);
require_once __DIR__.'/../learner_lib.php';

function dtp_material_unlocked(?array $learner): bool {
    return $learner !== null;
}

function dtp_material_require_access(): void {
    header('Cache-Control: no-store, private');
    $learner = learner_current();
    if (dtp_material_unlocked($learner)) return;
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'error' => 'Bitte im Lernkonto anmelden.']);
    } else {
        header('Location: /dau-to-pro/konto.php?material=1', true, 303);
    }
    exit;
}
