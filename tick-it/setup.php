<?php
/**
 * Einmalige, abgesicherte STRATO-Erstinstallation.
 * Nur mit einem starken, separat an den Betreiber ausgegebenen Setup-Code.
 * Nach erfolgreicher Installation wird diese Seite automatisch deaktiviert.
 */
declare(strict_types=1);

const TICKIT_ROOT = __DIR__;
$configPath = TICKIT_ROOT . '/config.local.php';
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");

if (is_file($configPath)) {
    http_response_code(404);
    exit('Die Erstinstallation ist abgeschlossen.');
}
$isHttps = (($_SERVER['HTTPS'] ?? '') === 'on') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
if (!$isHttps) {
    http_response_code(403);
    exit('Die Einrichtung ist ausschließlich über HTTPS verfügbar.');
}
if (!extension_loaded('pdo_mysql')) {
    http_response_code(503);
    exit('PHP PDO MySQL ist auf diesem Webspace nicht aktiviert.');
}

ini_set('session.use_strict_mode','1');
ini_set('session.use_only_cookies','1');
ini_set('session.cookie_httponly','1');
session_name('tickit_install');
session_set_cookie_params(['lifetime'=>0,'path'=>'/tick-it/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
session_start();
$csrf = $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
$errors = [];
$success = false;

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $elapsed = microtime(true);
    // Auf keinen Fall Login-, DB- oder Setup-Code-Daten protokollieren.
    try {
        if (!hash_equals($csrf, (string)($_POST['csrf'] ?? ''))) {
            throw new RuntimeException('Sitzungsprüfung fehlgeschlagen. Bitte Seite neu laden.');
        }
        $providedCode = (string)($_POST['setup_code'] ?? '');
        $expectedHash = require TICKIT_ROOT . '/setup.key.php';
        if (!is_string($expectedHash) || strlen($providedCode) < 40
            || strlen($providedCode) > 200
            || !hash_equals($expectedHash, hash('sha256', $providedCode))) {
            usleep(650000);
            throw new RuntimeException('Einrichtungscode ungültig.');
        }

        $host = trim((string)($_POST['db_host'] ?? ''));
        $port = trim((string)($_POST['db_port'] ?? '3306'));
        $dbName = trim((string)($_POST['db_name'] ?? ''));
        $dbUser = trim((string)($_POST['db_user'] ?? ''));
        $dbPassword = (string)($_POST['db_password'] ?? '');
        $adminName = trim((string)($_POST['admin_name'] ?? ''));
        $adminPassword = (string)($_POST['admin_password'] ?? '');
        $repeat = (string)($_POST['admin_password_confirm'] ?? '');
        if (!preg_match('/^[a-zA-Z0-9._-]{1,253}$/D', $host)
            || !ctype_digit($port) || (int)$port < 1 || (int)$port > 65535
            || !preg_match('/^[a-zA-Z0-9_-]{1,64}$/D', $dbName)
            || !preg_match('/^[a-zA-Z0-9_.@-]{1,128}$/D', $dbUser)
            || $dbPassword === '' || strlen($dbPassword) > 2048) {
            throw new RuntimeException('Bitte gültige STRATO-Datenbank-Zugangsdaten eingeben.');
        }
        if (strlen($adminName) < 3 || strlen($adminName) > 100
            || strlen($adminPassword) < 14 || strlen($adminPassword) > 1024
            || !hash_equals($adminPassword, $repeat)) {
            throw new RuntimeException('Dozentenname (3–100 Zeichen) oder Passwort (mindestens 14 Zeichen) ungültig.');
        }

        $lock = @fopen(TICKIT_ROOT . '/.setup.lock','c');
        if ($lock === false || !flock($lock, LOCK_EX)) {
            throw new RuntimeException('Einrichtung gesperrt. Bitte Server-Dateiberechtigungen prüfen.');
        }
        try {
            if (is_file($configPath)) {
                throw new RuntimeException('Die Anwendung wurde bereits eingerichtet.');
            }
            $dsn = 'mysql:host=' . $host . ';port=' . (int)$port . ';dbname=' . $dbName . ';charset=utf8mb4';
            try {
                $db = new PDO($dsn, $dbUser, $dbPassword, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_TIMEOUT => 8,
                ]);
                $db->exec("SET time_zone = '+00:00'");
            } catch (Throwable $e) {
                throw new RuntimeException('Die Datenbankverbindung ist fehlgeschlagen. Prüfe Host, Datenbankname, Benutzer und Passwort.',0,$e);
            }
            if (count($db->query('SHOW TABLES')->fetchAll(PDO::FETCH_NUM)) !== 0) {
                throw new RuntimeException('Diese Datenbank ist nicht leer. Verwende eine neue, ausschließlich für Tick-It angelegte Datenbank. Es wurde nichts gelöscht.');
            }
            $schema = @file_get_contents(TICKIT_ROOT . '/database/schema.sql');
            if (!is_string($schema) || !str_contains($schema, 'CREATE TABLE admins')) {
                throw new RuntimeException('Das Datenbankschema fehlt. Bitte den Tick-It-Deploy prüfen.');
            }
            $schema = preg_replace('/^\s*--[^\r\n]*(\r?\n|$)/m', '', $schema);
            try {
                foreach (explode(';',$schema) as $statement) {
                    $statement = trim($statement);
                    if ($statement !== '') $db->exec($statement);
                }
                $hash = password_hash($adminPassword, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT);
                $stmt = $db->prepare('INSERT INTO admins (username,password_hash) VALUES (?,?)');
                $stmt->execute([$adminName,$hash]);
            } catch (Throwable $e) {
                throw new RuntimeException('Datenbankschema konnte nicht vollständig installiert werden. Bitte eine neue leere Datenbank verwenden.',0,$e);
            }
            $config = [
                'db' => ['dsn'=>$dsn, 'user'=>$dbUser, 'password'=>$dbPassword],
                'app' => [
                    'name'=>'IT Support', 'https_required'=>true,
                    'session_idle_minutes'=>120, 'admin_idle_minutes'=>30,
                    'guest_session_days'=>7,'max_upload_bytes'=>5*1024*1024,
                ],
            ];
            $body = "<?php\n// Private Tick-It-Konfiguration – niemals ins Repository übertragen.\nreturn " . var_export($config,true) . ";\n";
            $tmpPath = TICKIT_ROOT . '/.config-' . bin2hex(random_bytes(12)) . '.tmp';
            if (@file_put_contents($tmpPath,$body,LOCK_EX) !== strlen($body)) {
                @unlink($tmpPath);
                throw new RuntimeException('Die private Serverkonfiguration konnte nicht geschrieben werden. Bitte Dateiberechtigungen prüfen.');
            }
            @chmod($tmpPath,0600);
            if (!@rename($tmpPath,$configPath)) {
                @unlink($tmpPath);
                throw new RuntimeException('Die private Serverkonfiguration konnte nicht aktiviert werden.');
            }
            $success = true;
        } finally {
            flock($lock,LOCK_UN);
            fclose($lock);
        }
    } catch (Throwable $e) {
        $errors[] = $e->getMessage();
    }
}
if ($success) {
    $_SESSION = [];
    session_destroy();
    header('Location: /tick-it/',true,303);
    exit;
}
function esc(string $s): string { return htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'); }
?><!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tick-It · Einmalige Einrichtung</title>
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px}*{box-sizing:border-box}
body{background:#0e1419;color:#e8f0f2;min-height:100vh;margin:0;padding:25px 12px;display:grid;place-items:center}
main{width:min(730px,100%);background:#17232c;border:1px solid #29616c;border-radius:18px;padding:clamp(18px,4vw,38px)}
h1{margin:.2em 0 .5em}p{color:#a9c3ca;line-height:1.5}b{color:#e4f8fa}
label{display:grid;gap:7px;font-weight:600;font-size:.92rem;margin:14px 0}
input{width:100%;border:1px solid #3b5965;border-radius:8px;padding:12px 13px;font:inherit;background:#0c181f;color:#fff}
input:focus{outline:2px solid #21c7c8;outline-offset:1px}
section{margin-top:26px;border-top:1px solid #334651;padding-top:10px}h2{font-size:1.1rem}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 15px}.grid .wide{grid-column:1/-1}
button{border:0;border-radius:9px;background:#19cfc9;color:#001416;padding:14px 18px;font:inherit;font-weight:800;cursor:pointer;width:100%;margin:23px 0 4px}
.error{border:1px solid #ad5d58;background:#44272c;color:#ffe0df;padding:12px;border-radius:8px}
.small{font-size:.86rem}code{color:#67e0dc}
@media(max-width:600px){.grid{grid-template-columns:1fr}.grid .wide{grid-column:auto}}
</style></head><body><main>
<h1>🛠️ Tick-It einrichten</h1>
<p>Dies ist die <b>einmalige, geschützte Ersteinrichtung</b>. Die Datenbankdaten und dein Dozentenpasswort werden ausschließlich über HTTPS an deinen STRATO-Server übertragen – nicht an GitHub.</p>
<?php foreach ($errors as $error): ?><p class="error" role="alert"><?=esc($error)?></p><?php endforeach; ?>
<form method="post" autocomplete="off">
<input type="hidden" name="csrf" value="<?=esc($csrf)?>">
<section><h2>1 · Einrichtung freigeben</h2>
<p class="small">Den persönlichen Einrichtungscode erhältst du im Chat. Er ist kein Standardpasswort.</p>
<label>Einmaliger Einrichtungscode <input type="password" name="setup_code" required autocomplete="off" minlength="40"></label>
</section>
<section><h2>2 · Eigene STRATO-Datenbank</h2>
<p class="small">Lege im STRATO Kunden-Login unter Datenbankverwaltung eine <b>neue leere MySQL-Datenbank</b> an. Trage hier die dort angezeigten Zugangsdaten ein. Keinesfalls die Datenbank von DAU-to-Pro verwenden!</p>
<div class="grid">
<label class="wide">Datenbankserver / Host <input name="db_host" required placeholder="database-123456789.webspace-host.com" maxlength="253"></label>
<label>Port <input name="db_port" inputmode="numeric" value="3306" required></label>
<label>Datenbankname <input name="db_name" required placeholder="DB1234567" maxlength="64"></label>
<label>Benutzername <input name="db_user" required maxlength="128"></label>
<label>Datenbankpasswort <input type="password" name="db_password" required autocomplete="new-password"></label>
</div></section>
<section><h2>3 · Deinen Dozentenzugang festlegen</h2>
<label>Dozenten-Benutzername <input name="admin_name" required minlength="3" maxlength="100"></label>
<label>Neues Dozentenpasswort (mindestens 14 Zeichen) <input type="password" name="admin_password" required minlength="14" autocomplete="new-password"></label>
<label>Passwort wiederholen <input type="password" name="admin_password_confirm" required minlength="14" autocomplete="new-password"></label>
</section>
<button type="submit">Tick-It sicher installieren</button>
<p class="small">Die Installation verweigert bereits befüllte Datenbanken und löscht keine bestehenden Daten. Nach erfolgreichem Abschluss wird dieses Formular dauerhaft deaktiviert.</p>
</form></main></body></html>
