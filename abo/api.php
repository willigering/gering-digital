<?php
/**
 * Gering Digital – private Abo-Übersicht (/abo)
 *
 * Single-user PHP + SQLite API nach dem Muster von bewerbungen-api.php.
 * - Eigene Datenbank: data/abos-private.sqlite (data/ ist per .htaccess gesperrt
 *   und wird vom Deploy nie hochgeladen oder überschrieben).
 * - Anmeldung mit DEMSELBEN Passwort wie die Bewerbungsliste: Der Passwort-Hash
 *   wird nur lesend aus data/bewerbungen-private.sqlite geholt. Diese Datenbank
 *   und ihr Schema werden hier nie verändert.
 * - Keine Abo-Daten, Passwörter oder Tokens im Repository.
 */
declare(strict_types=1);

const ABO_MAX_REQUEST_BYTES = 400000;
const ABO_MAX_ITEMS = 300;
const ABO_INTERVALS = ['monatlich', 'jaehrlich'];
const ABO_STATUSES = ['aktiv', 'gekuendigt'];
const ABO_LOGIN_WINDOW = 900;      // Sekunden
const ABO_LOGIN_MAX_FAILURES = 10; // pro Fenster, sitzungsübergreifend
// Startliste beim allerersten Anlegen. Preise, Intervalle und Daten sind
// absichtlich leer: Willi trägt sie selbst ein (nichts wird erfunden).
const ABO_SEED = [
    ['abo-chatgpt', 'ChatGPT'],
    ['abo-claude', 'Claude'],
    ['abo-suno', 'Suno'],
    ['abo-higgsfield', 'Higgsfield'],
    ['abo-grok', 'Grok'],
];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: same-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

$secure = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
    || ((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('GD_Abos');
session_set_cookie_params([
    'lifetime' => 0, 'path' => '/abo/', 'secure' => $secure,
    'httponly' => true, 'samesite' => 'Strict',
]);
session_start();
if (empty($_SESSION['abo_csrf'])) {
    $_SESSION['abo_csrf'] = bin2hex(random_bytes(32));
}

function respond(array $data, int $httpStatus = 200): void
{
    http_response_code($httpStatus);
    $data['csrf'] = $_SESSION['abo_csrf'] ?? null;
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(string $message, int $status = 400): void
{
    respond(['error' => $message], $status);
}
function dataDir(): string
{
    $override = getenv('GD_ABO_DATA_DIR'); // nur für lokale Tests
    return is_string($override) && $override !== '' ? rtrim($override, '/') : dirname(__DIR__) . '/data';
}
function database(): PDO
{
    $dir = dataDir();
    if (!is_dir($dir) || !is_writable($dir)) {
        fail('Server-Speicher nicht beschreibbar. Bitte STRATO-Datenverzeichnis prüfen.', 503);
    }
    $db = new PDO('sqlite:' . $dir . '/abos-private.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 8,
    ]);
    $db->exec('PRAGMA busy_timeout = 8000');
    $db->exec('CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS login_failures (at INTEGER NOT NULL)');
    seedOnce($db);
    return $db;
}
/** Legt die Startliste genau einmal an, und nur wenn noch nichts gespeichert ist. */
function seedOnce(PDO $db): void
{
    if ($db->query("SELECT 1 FROM meta WHERE key='seeded'")->fetchColumn()) return;
    $db->beginTransaction();
    try {
        if (!$db->query("SELECT 1 FROM meta WHERE key='seeded'")->fetchColumn()) {
            if (!(int)$db->query('SELECT COUNT(*) FROM entries')->fetchColumn()) {
                $stmt = $db->prepare('INSERT OR IGNORE INTO entries (id,payload,updated_at) VALUES (?,?,?)');
                foreach (ABO_SEED as [$id, $name]) {
                    $item = [
                        'id' => $id, 'name' => $name, 'preis' => null, 'intervall' => '',
                        'ablaufdatum' => '', 'kuendigungslink' => '',
                        'notiz' => 'Bitte ergänzen: Preis, Abrechnung und Ablaufdatum.',
                        'status' => 'aktiv',
                    ];
                    $stmt->execute([$id, json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), gmdate('c')]);
                }
            }
            $db->prepare("INSERT OR IGNORE INTO meta (key,value) VALUES ('seeded', ?)")->execute([gmdate('c')]);
        }
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}
/** Passwort-Hash der Bewerbungsliste, nur lesend. null = dort noch kein Zugang. */
function sharedPasswordHash(): ?string
{
    $file = dataDir() . '/bewerbungen-private.sqlite';
    if (!is_file($file)) return null;
    $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 8];
    if (defined('PDO::SQLITE_ATTR_OPEN_FLAGS') && defined('PDO::SQLITE_OPEN_READONLY')) {
        $options[PDO::SQLITE_ATTR_OPEN_FLAGS] = PDO::SQLITE_OPEN_READONLY;
    }
    $shared = new PDO('sqlite:' . $file, null, null, $options);
    $hasTable = $shared->query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='account'")->fetchColumn();
    if (!$hasTable) return null;
    $hash = $shared->query('SELECT password_hash FROM account WHERE id=1')->fetchColumn();
    return is_string($hash) && $hash !== '' ? $hash : null;
}
function isLoggedIn(): bool
{
    return !empty($_SESSION['abo_authenticated']);
}
function allItems(PDO $db): array
{
    $items = [];
    foreach ($db->query('SELECT payload FROM entries ORDER BY id') as $row) {
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
    if ($size > ABO_MAX_REQUEST_BYTES) fail('Datei oder Anfrage zu groß.', 413);
    $raw = file_get_contents('php://input', false, null, 0, ABO_MAX_REQUEST_BYTES + 1);
    if ($raw === false || strlen($raw) > ABO_MAX_REQUEST_BYTES) fail('Anfrage zu groß.', 413);
    $v = json_decode($raw, true);
    if (!is_array($v)) fail('Ungültige JSON-Anfrage.');
    return $v;
}
function csrf(array $body): void
{
    if (!is_string($body['csrf'] ?? null) || !hash_equals((string)$_SESSION['abo_csrf'], $body['csrf'])) {
        fail('Sitzung abgelaufen. Bitte Seite neu laden.', 403);
    }
}
function field(array $obj, string $key, int $limit): string
{
    $value = $obj[$key] ?? '';
    if (!is_string($value) && !is_numeric($value)) return '';
    $value = trim((string)$value);
    if (mb_strlen($value, 'UTF-8') > $limit) fail('Feld zu lang: ' . $key);
    return $value;
}
/** Whitelist wie validatedItem() der Bewerbungsliste: unbekannte Felder fallen weg. */
function validatedItem(array $item): array
{
    $id = field($item, 'id', 120);
    if (!preg_match('/\A[A-Za-z0-9_.-]{3,120}\z/D', $id)) fail('Ungültige Abo-ID.');
    $name = field($item, 'name', 120);
    if ($name === '') fail('Ein Abo-Name fehlt.');
    $out = ['id' => $id, 'name' => $name];

    $preis = $item['preis'] ?? null;
    if (is_string($preis)) $preis = str_replace(',', '.', trim($preis));
    if ($preis === '' || $preis === null) $out['preis'] = null;
    elseif (is_numeric($preis) && (float)$preis >= 0 && (float)$preis <= 100000) $out['preis'] = round((float)$preis, 2);
    else fail('Ungültiger Preis bei „' . $name . '“.');

    $intervall = strtolower(field($item, 'intervall', 20));
    if ($intervall === 'jährlich') $intervall = 'jaehrlich';
    $out['intervall'] = in_array($intervall, ABO_INTERVALS, true) ? $intervall : '';

    $date = field($item, 'ablaufdatum', 10);
    if ($date !== '' && (!preg_match('/\A\d{4}-\d{2}-\d{2}\z/D', $date)
        || !checkdate((int)substr($date, 5, 2), (int)substr($date, 8, 2), (int)substr($date, 0, 4)))) {
        fail('Ungültiges Ablaufdatum bei „' . $name . '“.');
    }
    $out['ablaufdatum'] = $date;

    $link = field($item, 'kuendigungslink', 600);
    if ($link !== '' && (
        !filter_var($link, FILTER_VALIDATE_URL) ||
        !in_array(strtolower((string)parse_url($link, PHP_URL_SCHEME)), ['http', 'https'], true)
    )) fail('Nur HTTP- oder HTTPS-Links sind erlaubt.');
    $out['kuendigungslink'] = $link;

    $out['notiz'] = field($item, 'notiz', 2000);
    $status = strtolower(field($item, 'status', 20));
    if ($status === 'gekündigt') $status = 'gekuendigt';
    $out['status'] = in_array($status, ABO_STATUSES, true) ? $status : 'aktiv';
    return $out;
}
function saveItem(PDO $db, array $item): void
{
    $stmt = $db->prepare('INSERT INTO entries (id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at');
    $stmt->execute([$item['id'], json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), gmdate('c')]);
}
function recentFailures(PDO $db): int
{
    $db->prepare('DELETE FROM login_failures WHERE at < ?')->execute([time() - ABO_LOGIN_WINDOW]);
    return (int)$db->query('SELECT COUNT(*) FROM login_failures')->fetchColumn();
}

try {
    $db = database();
    $action = (string)($_GET['action'] ?? 'state');
    if ($action === 'state' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!isLoggedIn()) respond(['mode' => sharedPasswordHash() === null ? 'nosetup' : 'login']);
        ready($db);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Methode nicht erlaubt.', 405);
    $body = input();
    csrf($body);

    if ($action === 'login') {
        $hash = sharedPasswordHash();
        if ($hash === null) fail('Bitte zuerst den Zugang der Bewerbungsliste einrichten.', 409);
        $lock = (int)($_SESSION['abo_lock_until'] ?? 0);
        if ($lock > time() || recentFailures($db) >= ABO_LOGIN_MAX_FAILURES) {
            fail('Zu viele Versuche. Bitte in 15 Minuten erneut anmelden.', 429);
        }
        $password = (string)($body['password'] ?? '');
        if ($password === '' || strlen($password) > 512 || !password_verify($password, $hash)) {
            $db->prepare('INSERT INTO login_failures (at) VALUES (?)')->execute([time()]);
            $_SESSION['abo_failures'] = (int)($_SESSION['abo_failures'] ?? 0) + 1;
            if ($_SESSION['abo_failures'] >= 5) {
                $_SESSION['abo_lock_until'] = time() + ABO_LOGIN_WINDOW;
                $_SESSION['abo_failures'] = 0;
            }
            usleep(350000);
            fail('Passwort falsch.', 401);
        }
        session_regenerate_id(true);
        $_SESSION['abo_authenticated'] = true;
        unset($_SESSION['abo_failures'], $_SESSION['abo_lock_until']);
        ready($db);
    }

    if ($action === 'logout') {
        unset($_SESSION['abo_authenticated']);
        session_regenerate_id(true);
        respond(['mode' => 'login']);
    }

    if (!isLoggedIn()) fail('Nicht angemeldet.', 401);

    if ($action === 'save') {
        if (!is_array($body['item'] ?? null)) fail('Abo fehlt.');
        $item = validatedItem($body['item']);
        $exists = $db->prepare('SELECT 1 FROM entries WHERE id=?');
        $exists->execute([$item['id']]);
        if (!$exists->fetchColumn() && (int)$db->query('SELECT COUNT(*) FROM entries')->fetchColumn() >= ABO_MAX_ITEMS) {
            fail('Maximal ' . ABO_MAX_ITEMS . ' Abos.');
        }
        saveItem($db, $item);
        ready($db);
    }
    if ($action === 'delete') {
        $id = (string)($body['id'] ?? '');
        if (!preg_match('/\A[A-Za-z0-9_.-]{3,120}\z/D', $id)) fail('Ungültige ID.');
        $db->prepare('DELETE FROM entries WHERE id=?')->execute([$id]);
        ready($db);
    }
    if ($action === 'import') {
        $items = $body['items'] ?? null;
        if (!is_array($items) || count($items) > ABO_MAX_ITEMS) fail('Ungültige Importdatei oder mehr als ' . ABO_MAX_ITEMS . ' Abos.');
        // Erst alles prüfen, dann in einer Transaktion schreiben.
        $validated = [];
        foreach ($items as $item) {
            if (!is_array($item)) fail('Ungültiger Eintrag in der Importdatei.');
            $validated[] = validatedItem($item);
        }
        $db->beginTransaction();
        try {
            foreach ($validated as $item) saveItem($db, $item);
            if ((int)$db->query('SELECT COUNT(*) FROM entries')->fetchColumn() > ABO_MAX_ITEMS) {
                throw new RangeException('too many');
            }
            $db->commit();
        } catch (RangeException $ex) {
            $db->rollBack();
            fail('Nach dem Import wären es mehr als ' . ABO_MAX_ITEMS . ' Abos.');
        } catch (Throwable $ex) {
            if ($db->inTransaction()) $db->rollBack();
            throw $ex;
        }
        ready($db);
    }
    fail('Unbekannte Aktion.', 404);
} catch (PDOException $e) {
    error_log('Abos storage: ' . $e->getMessage());
    fail('Speicherung auf dem Webserver momentan nicht verfügbar.', 503);
} catch (Throwable $e) {
    error_log('Abos: ' . $e->getMessage());
    fail('Unerwarteter Serverfehler.', 500);
}
