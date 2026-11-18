<?php
/**
 * Gering Digital – tägliche Abo-Erinnerung (/abo/notify.php)
 *
 * Wird einmal täglich vom GitHub-Workflow .github/workflows/abo-reminder.yml
 * aufgerufen: POST mit Header "X-Abo-Token: <Cron-Token>". Den Token erzeugt Willi
 * auf der Abo-Seite („Cron-Token erzeugen“); gespeichert wird nur sein SHA-256-Hash.
 * Ohne gültigen Token passiert nichts und es werden keine Daten ausgegeben.
 */
declare(strict_types=1);
require __DIR__ . '/notify-lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');

function notify_out(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') notify_out(['error' => 'Methode nicht erlaubt.'], 405);
$token = trim((string)($_SERVER['HTTP_X_ABO_TOKEN'] ?? ''));
if ($token === '') notify_out(['error' => 'Token fehlt.'], 401);

$override = getenv('GD_ABO_DATA_DIR'); // nur für lokale Tests
$dir = is_string($override) && $override !== '' ? rtrim($override, '/') : dirname(__DIR__) . '/data';
$file = $dir . '/abos-private.sqlite';
if (!is_file($file)) { usleep(300000); notify_out(['error' => 'Nicht eingerichtet.'], 401); }

try {
    $db = new PDO('sqlite:' . $file, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 8,
    ]);
    $db->exec('PRAGMA busy_timeout = 8000');
    abo_notify_schema($db);
    if (!abo_notify_token_ok($db, $token)) { usleep(300000); notify_out(['error' => 'Token ungültig.'], 401); }

    // Nie zwei Läufe gleichzeitig (sonst Doppelversand).
    $lock = fopen($dir . '/abos-notify.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) notify_out(['error' => 'Läuft bereits.'], 409);
    $r = abo_notify_run($db);
    flock($lock, LOCK_UN);
    fclose($lock);
    // Nur Zahlen zurückgeben: die Workflow-Logs eines öffentlichen Repos sind öffentlich.
    notify_out(['ok' => true, 'due' => $r['due'], 'sent' => count($r['sent']), 'errors' => count($r['errors'])],
        $r['errors'] ? 502 : 200);
} catch (Throwable $e) {
    error_log('Abo-Erinnerung: ' . $e->getMessage());
    notify_out(['error' => 'Serverfehler.'], 500);
}
