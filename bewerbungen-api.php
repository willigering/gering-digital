<?php
/**
 * Gering Digital – privater Bewerbungskompass
 *
 * Single-user PHP + SQLite API.
 * Deployment commits CODE ONLY. No applicant records, passwords or login tokens
 * are written to the GitHub repository. Runtime database lives in /data, which
 * is denied by the site's root .htaccess (and data/.htaccess).
 */
declare(strict_types=1);

const APP_SETUP_TOKEN_SHA256 = '0a7874be375326ec22d14f03b27b3625ee5cc2e1fa0f2033c149e8e1bd2030b3';
const APP_MAX_REQUEST_BYTES = 1100000;
const APP_STATUSES = [
    'nicht_beworben', 'vorbereitet', 'beworben', 'rueckmeldung',
    'gespraech', 'zusage', 'absage', 'archiviert',
];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

$secure = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
    || ((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('GD_Bewerbungen');
session_set_cookie_params([
    'lifetime' => 0, 'path' => '/', 'secure' => $secure,
    'httponly' => true, 'samesite' => 'Strict',
]);
session_start();
if (empty($_SESSION['bewerbungen_csrf'])) {
    $_SESSION['bewerbungen_csrf'] = bin2hex(random_bytes(32));
}

function respond(array $data, int $httpStatus = 200): void
{
    http_response_code($httpStatus);
    $data['csrf'] = $_SESSION['bewerbungen_csrf'] ?? null;
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(string $message, int $status = 400): void
{
    respond(['error' => $message], $status);
}
function database(): PDO
{
    $dataDir = __DIR__ . '/data';
    if (!is_dir($dataDir) || !is_writable($dataDir)) {
        fail('Server-Speicher nicht beschreibbar. Bitte STRATO-Datenverzeichnis prüfen.', 503);
    }
    $file = $dataDir . '/bewerbungen-private.sqlite';
    $db = new PDO('sqlite:' . $file, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 8,
    ]);
    $db->exec('PRAGMA busy_timeout = 8000');
    $db->exec('CREATE TABLE IF NOT EXISTS account (id INTEGER PRIMARY KEY CHECK(id = 1), password_hash TEXT NOT NULL, created_at TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL)');
    return $db;
}
function hasAccount(PDO $db): bool
{
    return (bool)$db->query('SELECT 1 FROM account WHERE id=1')->fetchColumn();
}
function isLoggedIn(): bool
{
    return !empty($_SESSION['bewerbungen_authenticated']);
}
function allItems(PDO $db): array
{
    $items = [];
    foreach ($db->query('SELECT payload FROM entries ORDER BY updated_at, id') as $row) {
        $item = json_decode((string)$row['payload'], true);
        if (is_array($item)) $items[] = $item;
    }
    return $items;
}
function ready(PDO $db): void
{
    respond(['mode' => 'ready', 'items' => allItems($db)]);
}
function input(): array
{
    $size = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($size > APP_MAX_REQUEST_BYTES) fail('Datei oder Anfrage zu groß (maximal 1 MB).', 413);
    $raw = file_get_contents('php://input', false, null, 0, APP_MAX_REQUEST_BYTES + 1);
    if ($raw === false || strlen($raw) > APP_MAX_REQUEST_BYTES) fail('Anfrage zu groß.', 413);
    $v = json_decode($raw, true);
    if (!is_array($v)) fail('Ungültige JSON-Anfrage.');
    return $v;
}
function csrf(array $body): void
{
    if (!is_string($body['csrf'] ?? null) ||
        !hash_equals((string)$_SESSION['bewerbungen_csrf'], $body['csrf'])) {
        fail('Sitzung abgelaufen. Bitte Seite neu laden.', 403);
    }
}
function loggedIn(PDO $db): void
{
    if (!isLoggedIn() || !hasAccount($db)) fail('Nicht angemeldet.', 401);
}
function field(array $obj, string $key, int $limit): string
{
    $value = $obj[$key] ?? '';
    if (!is_string($value) && !is_numeric($value)) return '';
    $value = trim((string)$value);
    if (mb_strlen($value, 'UTF-8') > $limit) fail('Feld zu lang: ' . $key);
    return $value;
}
function validatedItem(array $item): array
{
    $id = field($item, 'id', 120);
    if (!preg_match('/\A[A-Za-z0-9_.-]{3,120}\z/D', $id)) fail('Ungültige Eintrags-ID.');
    $company = field($item, 'company', 160);
    if ($company === '') fail('Ein Firmenname fehlt.');
    $out = ['id' => $id, 'company' => $company];
    $limits = [
        'city' => 120, 'appliedAt' => 24, 'followUpAt' => 24, 'contact' => 200,
        'email' => 254, 'phone' => 80, 'contactInfo' => 500,
        'notes' => 12000, 'website' => 600, 'street' => 200,
        'postal' => 30, 'postCity' => 120, 'recipient' => 200, 'source' => 400,
    ];
    foreach ($limits as $key => $max) $out[$key] = field($item, $key, $max);
    $status = field($item, 'status', 40);
    $out['status'] = in_array($status, APP_STATUSES, true) ? $status : 'nicht_beworben';
    foreach (['appliedAt', 'followUpAt'] as $key) {
        if ($out[$key] !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $out[$key])) {
            fail('Ungültiges Datumsformat für ' . $key);
        }
        if ($out[$key] !== '' && !checkdate((int)substr($out[$key], 5, 2), (int)substr($out[$key], 8, 2), (int)substr($out[$key], 0, 4))) {
            fail('Ungültiges Datum für ' . $key);
        }
    }
    if ($out['email'] !== '' && filter_var($out['email'], FILTER_VALIDATE_EMAIL) === false) {
        fail('Ungültige E-Mail-Adresse.');
    }
    if ($out['website'] !== '' && (
        !filter_var($out['website'], FILTER_VALIDATE_URL) ||
        !in_array(strtolower((string)parse_url($out['website'], PHP_URL_SCHEME)), ['http','https'], true)
    )) fail('Nur HTTP- oder HTTPS-Links sind erlaubt.');
    $km = $item['distanceKm'] ?? null;
    if ($km === '' || $km === null) $out['distanceKm'] = null;
    elseif (is_numeric($km) && (float)$km >= 0 && (float)$km <= 9999) $out['distanceKm'] = round((float)$km, 1);
    else fail('Ungültige Entfernung.');
    return $out;
}

try {
    $db = database();
    $action = (string)($_GET['action'] ?? 'state');
    if ($action === 'state' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!hasAccount($db)) respond(['mode' => 'setup']);
        if (!isLoggedIn()) respond(['mode' => 'login']);
        ready($db);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Methode nicht erlaubt.', 405);
    $body = input();
    csrf($body);

    if ($action === 'setup') {
        if (hasAccount($db)) fail('Ein Zugang ist bereits eingerichtet.', 409);
        $token = (string)($body['setupToken'] ?? '');
        $password = (string)($body['password'] ?? '');
        if (!hash_equals(APP_SETUP_TOKEN_SHA256, hash('sha256', $token))) {
            usleep(350000);
            fail('Einrichtungsschlüssel nicht korrekt.', 403);
        }
        if (mb_strlen($password, 'UTF-8') < 12 || strlen($password) > 512) {
            fail('Das neue Passwort muss mindestens 12 Zeichen lang sein.');
        }
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $db->beginTransaction();
        try {
            if (hasAccount($db)) throw new RuntimeException('Zugang bereits eingerichtet.');
            $stmt = $db->prepare('INSERT INTO account (id, password_hash, created_at) VALUES (1, ?, ?)');
            $stmt->execute([$hash, gmdate('c')]);
            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            fail('Zugang konnte nicht eingerichtet werden.', 409);
        }
        session_regenerate_id(true);
        $_SESSION['bewerbungen_authenticated'] = true;
        ready($db);
    }

    if ($action === 'login') {
        if (!hasAccount($db)) fail('Zugang noch nicht eingerichtet.', 409);
        $lock = (int)($_SESSION['bewerbungen_lock_until'] ?? 0);
        if ($lock > time()) fail('Zu viele Versuche. Bitte später erneut anmelden.', 429);
        $stmt = $db->query('SELECT password_hash FROM account WHERE id=1');
        $hash = (string)$stmt->fetchColumn();
        $password = (string)($body['password'] ?? '');
        if ($password === '' || !password_verify($password, $hash)) {
            $_SESSION['bewerbungen_failures'] = (int)($_SESSION['bewerbungen_failures'] ?? 0) + 1;
            if ($_SESSION['bewerbungen_failures'] >= 5) {
                $_SESSION['bewerbungen_lock_until'] = time() + 900;
                $_SESSION['bewerbungen_failures'] = 0;
            }
            usleep(350000);
            fail('Passwort falsch.', 401);
        }
        session_regenerate_id(true);
        $_SESSION['bewerbungen_authenticated'] = true;
        unset($_SESSION['bewerbungen_failures'], $_SESSION['bewerbungen_lock_until']);
        ready($db);
    }

    if ($action === 'logout') {
        unset($_SESSION['bewerbungen_authenticated']);
        session_regenerate_id(true);
        respond(['mode' => 'login']);
    }

    loggedIn($db);
    if ($action === 'save') {
        if (!is_array($body['item'] ?? null)) fail('Eintrag fehlt.');
        $item = validatedItem($body['item']);
        $stmt = $db->prepare('INSERT INTO entries (id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at');
        $stmt->execute([$item['id'], json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), gmdate('c')]);
        ready($db);
    }
    if ($action === 'delete') {
        $id = (string)($body['id'] ?? '');
        if (!preg_match('/\A[A-Za-z0-9_.-]{3,120}\z/D', $id)) fail('Ungültige ID.');
        $stmt = $db->prepare('DELETE FROM entries WHERE id=?');
        $stmt->execute([$id]);
        ready($db);
    }
    if ($action === 'import') {
        $items = $body['items'] ?? null;
        if (!is_array($items) || count($items) > 1000) fail('Ungültige Importdatei oder mehr als 1000 Einträge.');
        // Validate the entire batch before making ANY changes.
        $validated = [];
        foreach ($items as $item) {
            if (!is_array($item)) fail('Ungültiger Eintrag in der Importdatei.');
            $validated[] = validatedItem($item);
        }
        $db->beginTransaction();
        try {
            $stmt = $db->prepare('INSERT INTO entries (id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at');
            foreach ($validated as $item) {
                $stmt->execute([$item['id'], json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), gmdate('c')]);
            }
            $db->commit();
        } catch (Throwable $ex) {
            if ($db->inTransaction()) $db->rollBack();
            throw $ex;
        }
        ready($db);
    }
    fail('Unbekannte Aktion.', 404);
} catch (PDOException $e) {
    error_log('Bewerbungen storage: ' . $e->getMessage());
    fail('Speicherung auf dem Webserver momentan nicht verfügbar.', 503);
} catch (Throwable $e) {
    error_log('Bewerbungen: ' . $e->getMessage());
    fail('Unerwarteter Serverfehler.', 500);
}
