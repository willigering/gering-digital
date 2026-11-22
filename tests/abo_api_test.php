<?php
// End-to-end HTTP tests for the private Abo-Übersicht (/abo) against PHP's built-in
// server with temporary databases. Never touches real data/.
// Run: php tests/abo_api_test.php
declare(strict_types=1);
$root = realpath(__DIR__ . '/..');
$dir = sys_get_temp_dir() . '/gd-abo-' . bin2hex(random_bytes(4));
mkdir($dir, 0700, true);
$failures = 0; $count = 0;
function check(bool $ok, string $label): void { global $failures, $count; $count++; if (!$ok) { $failures++; fwrite(STDERR, "✗ $label\n"); } }

$port = 19000 + random_int(0, 999);
$cmd = sprintf('GD_ROOT=%s GD_ABO_DATA_DIR=%s exec php -S 127.0.0.1:%d -t %s %s',
    escapeshellarg($root), escapeshellarg($dir), $port, escapeshellarg($root), escapeshellarg(__DIR__ . '/support/router.php'));
$server = proc_open($cmd, [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes);
for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) usleep(100000);
$jar = tempnam(sys_get_temp_dir(), 'abojar');
$csrf = '';
function call(string $method, string $path, ?array $json = null, bool $cookies = true): array {
    global $port, $jar, $csrf;
    $ch = curl_init("http://127.0.0.1:$port$path");
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => ['Content-Type: application/json']]);
    if ($cookies) curl_setopt_array($ch, [CURLOPT_COOKIEJAR => $jar, CURLOPT_COOKIEFILE => $jar]);
    if ($json !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json + ['csrf' => $csrf]));
    $body = (string)curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $data = json_decode($body, true) ?: [];
    if ($cookies && !empty($data['csrf'])) $csrf = $data['csrf'];
    return ['status' => $status, 'data' => $data, 'body' => $body];
}
try {
    // Seite ist erreichbar und unabhängig von gemeinsamen Haupt-Assets.
    $page = call('GET', '/abo/', null, false);
    check($page['status'] === 200 && str_contains($page['body'], 'abo.js'), '/abo/ liefert die Abo-Seite');

    // Ohne Bewerbungs-Zugang: Hinweis statt Login.
    $r = call('GET', '/abo/api.php?action=state');
    check(($r['data']['mode'] ?? '') === 'nosetup', 'Ohne Bewerbungs-Passwort: Modus nosetup');
    check(!is_file($dir . '/bewerbungen-private.sqlite'), 'Bewerbungs-DB wird von /abo nie angelegt');

    // Bewerbungs-Zugang anlegen (gleiches Schema wie bewerbungen-api.php).
    $shared = new PDO('sqlite:' . $dir . '/bewerbungen-private.sqlite');
    $shared->exec('CREATE TABLE account (id INTEGER PRIMARY KEY CHECK(id = 1), password_hash TEXT NOT NULL, created_at TEXT NOT NULL)');
    $shared->prepare('INSERT INTO account VALUES (1, ?, ?)')->execute([password_hash('ein-langes-testpasswort', PASSWORD_DEFAULT), gmdate('c')]);
    $shared = null;
    $before = hash_file('sha256', $dir . '/bewerbungen-private.sqlite');

    $r = call('GET', '/abo/api.php?action=state');
    check(($r['data']['mode'] ?? '') === 'login', 'Mit Bewerbungs-Passwort: Login-Maske');
    check(!isset($r['data']['items']), 'Ohne Login keine Daten');

    $r = call('POST', '/abo/api.php?action=save', ['item' => ['id' => 'abo-x', 'name' => 'X']]);
    check($r['status'] === 401, 'Speichern ohne Login abgelehnt');
    $r = call('POST', '/abo/api.php?action=login', ['password' => 'ein-langes-testpasswort', 'csrf' => 'falsch']);
    check($r['status'] === 403, 'Login ohne gültiges CSRF-Token abgelehnt');
    $r = call('POST', '/abo/api.php?action=login', ['password' => 'falsch-falsch-falsch']);
    check($r['status'] === 401, 'Falsches Passwort abgelehnt');

    $r = call('POST', '/abo/api.php?action=login', ['password' => 'ein-langes-testpasswort']);
    check($r['status'] === 200 && ($r['data']['mode'] ?? '') === 'ready', 'Login mit dem Bewerbungs-Passwort');
    $items = $r['data']['items'] ?? [];
    $names = array_column($items, 'name'); sort($names);
    check($names === ['ChatGPT', 'Claude', 'Grok', 'Higgsfield', 'Suno'], 'Startliste: genau die fünf Abos');
    $emptyFacts = array_filter($items, fn($i) => $i['preis'] === null && $i['ablaufdatum'] === '' && $i['intervall'] === '');
    check(count($emptyFacts) === 5, 'Startliste erfindet keine Preise, Intervalle oder Daten');
    check(hash_file('sha256', $dir . '/bewerbungen-private.sqlite') === $before, 'Bewerbungs-DB bleibt byte-identisch');

    // Speichern mit Whitelist und Normalisierung.
    $r = call('POST', '/abo/api.php?action=save', ['item' => [
        'id' => 'abo-chatgpt', 'name' => 'ChatGPT', 'preis' => '23,00', 'intervall' => 'monatlich',
        'ablaufdatum' => '2026-12-03', 'kuendigungslink' => 'https://chatgpt.com/', 'notiz' => 'Plus',
        'status' => 'aktiv', 'boese' => '<script>',
    ]]);
    $saved = array_values(array_filter($r['data']['items'] ?? [], fn($i) => $i['id'] === 'abo-chatgpt'))[0] ?? [];
    check(($saved['preis'] ?? null) === 23 || ($saved['preis'] ?? null) === 23.0, 'Preis mit Komma wird zur Zahl');
    check(!array_key_exists('boese', $saved), 'Unbekannte Felder werden verworfen');
    check(($saved['ablaufdatum'] ?? '') === '2026-12-03', 'Ablaufdatum gespeichert');

    $r = call('POST', '/abo/api.php?action=save', ['item' => ['id' => 'abo-claude', 'name' => 'Claude', 'kuendigungslink' => 'javascript:alert(1)']]);
    check($r['status'] === 400, 'javascript:-Link abgelehnt');
    $r = call('POST', '/abo/api.php?action=save', ['item' => ['id' => 'abo-claude', 'name' => 'Claude', 'ablaufdatum' => '2026-02-30']]);
    check($r['status'] === 400, 'Ungültiges Datum abgelehnt');
    $r = call('POST', '/abo/api.php?action=save', ['item' => ['id' => 'abo-claude', 'name' => 'Claude', 'intervall' => 'jährlich', 'status' => 'gekündigt', 'preis' => 180]]);
    $claude = array_values(array_filter($r['data']['items'] ?? [], fn($i) => $i['id'] === 'abo-claude'))[0] ?? [];
    check(($claude['intervall'] ?? '') === 'jaehrlich' && ($claude['status'] ?? '') === 'gekuendigt', 'Umlaute bei Intervall/Status normalisiert');

    // Löschen und Import.
    $r = call('POST', '/abo/api.php?action=delete', ['id' => 'abo-grok']);
    check(count($r['data']['items'] ?? []) === 4, 'Löschen entfernt genau ein Abo');
    $r = call('POST', '/abo/api.php?action=import', ['items' => [['id' => 'abo-grok', 'name' => 'Grok'], ['id' => 'bad id!', 'name' => 'Y']]]);
    check($r['status'] === 400, 'Import mit ungültigem Eintrag wird komplett abgelehnt');
    $r = call('GET', '/abo/api.php?action=state');
    check(count($r['data']['items'] ?? []) === 4, 'Abgelehnter Import ändert nichts');
    $r = call('POST', '/abo/api.php?action=import', ['items' => [['id' => 'abo-grok', 'name' => 'Grok', 'intervall' => 'monatlich']]]);
    check(count($r['data']['items'] ?? []) === 5, 'Import fügt hinzu bzw. ersetzt per ID');

    // Startliste kommt nach dem Leeren nicht zurück.
    foreach (call('GET', '/abo/api.php?action=state')['data']['items'] ?? [] as $i) call('POST', '/abo/api.php?action=delete', ['id' => $i['id']]);
    $r = call('GET', '/abo/api.php?action=state');
    check(($r['data']['items'] ?? null) === [], 'Leere Liste bleibt leer (kein erneutes Seeding)');

    // Abmelden.
    call('POST', '/abo/api.php?action=logout', []);
    $r = call('GET', '/abo/api.php?action=state');
    check(($r['data']['mode'] ?? '') === 'login', 'Nach Abmelden wieder Login');

    // Datenverzeichnis bleibt gesperrt (Router emuliert .htaccess).
    check(call('GET', '/data/abos-private.sqlite', null, false)['status'] === 403, 'data/abos-private.sqlite ist gesperrt');
    check(is_file($dir . '/abos-private.sqlite'), 'Abo-DB liegt im Datenverzeichnis');
} finally {
    proc_terminate($server);
    @unlink($jar);
    foreach (glob($dir . '/*') ?: [] as $f) @unlink($f);
    @rmdir($dir);
}
echo ($failures ? "FAIL" : "OK") . ": " . ($count - $failures) . "/$count Abo-API-Prüfungen\n";
exit($failures ? 1 : 0);
