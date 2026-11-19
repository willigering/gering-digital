<?php
// End-to-end HTTP tests for the private Abo-Übersicht (/abo) against PHP's built-in
// server with temporary databases. Never touches real data/.
// Run: php tests/abo_api_test.php
declare(strict_types=1);
$root = realpath(__DIR__ . '/..');
$dir = sys_get_temp_dir() . '/gd-abo-' . bin2hex(random_bytes(4));
mkdir($dir, 0700, true);
$failures = 0; $count = 0;
function outbox(): array { global $outbox; return is_file($outbox) ? array_map(fn($l) => json_decode($l, true), file($outbox, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES)) : []; }
function check(bool $ok, string $label): void { global $failures, $count; $count++; if (!$ok) { $failures++; fwrite(STDERR, "✗ $label\n"); } }

$port = 19000 + random_int(0, 999);
// Nachrichten landen im Test in einer Datei (GD_ABO_OUTBOX) – nie echtes mail()/CallMeBot.
$outbox = $dir . '/outbox.jsonl';
$cmd = sprintf('GD_ROOT=%s GD_ABO_DATA_DIR=%s GD_ABO_OUTBOX=%s GD_ABO_TODAY=2026-12-22 exec %s -S 127.0.0.1:%d -t %s %s',
    escapeshellarg($root), escapeshellarg($dir), escapeshellarg($outbox), escapeshellarg(PHP_BINARY), $port, escapeshellarg($root), escapeshellarg(__DIR__ . '/support/router.php'));
$server = proc_open($cmd, [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes);
for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) usleep(100000);
$jar = tempnam(sys_get_temp_dir(), 'abojar');
$csrf = '';
function call(string $method, string $path, ?array $json = null, bool $cookies = true, array $headers = []): array {
    global $port, $jar, $csrf;
    $ch = curl_init("http://127.0.0.1:$port$path");
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers)]);
    if ($cookies) curl_setopt_array($ch, [CURLOPT_COOKIEJAR => $jar, CURLOPT_COOKIEFILE => $jar]);
    if ($json !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($cookies ? $json + ['csrf' => $csrf] : $json));
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


    // ---------- Benachrichtigungen ----------
    $r = call('POST', '/abo/api.php?action=notify_get', []);
    $n = $r['data']['notify'] ?? [];
    check($r['status'] === 200 && ($n['leadDays'] ?? 0) === 7 && ($n['emailOn'] ?? true) === false && ($n['hasToken'] ?? true) === false, 'Benachrichtigungen: Standard 7 Tage, alles aus');
    $bad = [
        ['emailOn' => true, 'email' => 'kein-at', 'leadDays' => 7],
        ['emailOn' => true, 'email' => '', 'leadDays' => 7],
        ['emailOn' => false, 'email' => "a@b.de\r\nBcc: x@y.de", 'leadDays' => 7],
        ['whatsappOn' => true, 'phone' => '+491701234567', 'leadDays' => 7],
        ['phone' => '0170 1234567', 'leadDays' => 7],
        ['leadDays' => 0], ['leadDays' => 61], ['leadDays' => 'sieben'],
        ['apikey' => '12 34<script>', 'leadDays' => 7],
    ];
    foreach ($bad as $i => $settings) {
        check(call('POST', '/abo/api.php?action=notify_save', ['settings' => $settings])['status'] === 400, "Ungültige Einstellung $i abgelehnt");
    }
    $r = call('POST', '/abo/api.php?action=notify_save', ['settings' => ['emailOn' => true, 'email' => 'willi@example.org',
        'whatsappOn' => true, 'phone' => '0049 170 123-4567', 'apikey' => '987654', 'leadDays' => '7']]);
    $n = $r['data']['notify'] ?? [];
    check($r['status'] === 200 && ($n['phone'] ?? '') === '+491701234567', 'Telefonnummer wird international normalisiert');
    check(($n['hasApikey'] ?? false) === true && ($n['apikeyHint'] ?? '') === '••••54', 'Schlüssel nur maskiert sichtbar');
    check(!str_contains($r['body'], '987654') && !array_key_exists('apikey', $n) && !array_key_exists('tokenHash', $n), 'Voller CallMeBot-Schlüssel nie in der Antwort');
    $r = call('POST', '/abo/api.php?action=notify_save', ['settings' => ['emailOn' => true, 'email' => 'willi@example.org',
        'whatsappOn' => true, 'phone' => '+491701234567', 'apikey' => '', 'leadDays' => 7]]);
    check(($r['data']['notify']['hasApikey'] ?? false) === true, 'Leeres Schlüsselfeld behält den gespeicherten Schlüssel');
    check(!str_contains((string)call('GET', '/abo/api.php?action=state')['body'], '987654'), 'Schlüssel auch nicht im Seitenzustand');

    // Test-Nachrichten: angemeldet, CSRF, Rate-Limit.
    check(call('POST', '/abo/api.php?action=notify_test', ['channel' => 'email', 'csrf' => 'falsch'])['status'] === 403, 'Test-Nachricht ohne CSRF abgelehnt');
    check(call('POST', '/abo/api.php?action=notify_test', ['channel' => 'sms'])['status'] === 400, 'Unbekannter Kanal abgelehnt');
    $r = call('POST', '/abo/api.php?action=notify_test', ['channel' => 'email']);
    $box = outbox();
    check($r['status'] === 200 && count($box) === 1 && $box[0]['channel'] === 'email' && $box[0]['to'] === 'willi@example.org', 'Test-E-Mail an die gewählte Adresse');
    check(call('POST', '/abo/api.php?action=notify_test', ['channel' => 'email'])['status'] === 429, 'Zweite Test-E-Mail sofort danach gebremst');
    $r = call('POST', '/abo/api.php?action=notify_test', ['channel' => 'whatsapp']);
    $box = outbox();
    check($r['status'] === 200 && count($box) === 2 && $box[1]['channel'] === 'whatsapp' && $box[1]['to'] === '+491701234567', 'Test-WhatsApp an die gespeicherte Nummer');

    // Cron-Token: nur einmal im Klartext, gespeichert als Hash.
    $r = call('POST', '/abo/api.php?action=notify_token', []);
    $token = (string)($r['data']['token'] ?? '');
    check(preg_match('/\Aabo_[a-f0-9]{64}\z/', $token) === 1 && ($r['data']['notify']['hasToken'] ?? false) === true, 'Cron-Token erzeugt');
    $raw = (new PDO('sqlite:' . $dir . '/abos-private.sqlite'))->query("SELECT value FROM meta WHERE key='notify_settings'")->fetchColumn();
    check(!str_contains((string)$raw, $token) && str_contains((string)$raw, hash('sha256', $token)), 'Token nur als SHA-256-Hash gespeichert');
    check(!str_contains(call('POST', '/abo/api.php?action=notify_get', [])['body'], $token), 'Token wird später nie wieder ausgegeben');

    // notify.php: nur POST, nur mit gültigem Token.
    check(call('GET', '/abo/notify.php', null, false)['status'] === 405, 'notify.php: GET abgelehnt');
    check(call('POST', '/abo/notify.php', [], false)['status'] === 401, 'notify.php: ohne Token abgelehnt');
    check(call('POST', '/abo/notify.php', [], false, ['X-Abo-Token: abo_' . str_repeat('0', 64)])['status'] === 401, 'notify.php: falscher Token abgelehnt');
    check(call('POST', '/abo/notify-lib.php', [], false)['body'] === '', 'notify-lib.php gibt direkt aufgerufen nichts aus');

    // Testdaten, „heute“ = 22.12.2026 (GD_ABO_TODAY).
    call('POST', '/abo/api.php?action=import', ['items' => [
        ['id' => 'abo-claude', 'name' => 'Claude', 'preis' => 214.2, 'intervall' => 'jaehrlich', 'ablaufdatum' => '2026-12-29', 'kuendigungslink' => 'https://claude.ai/settings/billing', 'status' => 'aktiv'],
        ['id' => 'abo-chatgpt', 'name' => 'ChatGPT', 'preis' => 23, 'intervall' => 'monatlich', 'ablaufdatum' => '2026-12-24', 'status' => 'aktiv'],
        ['id' => 'abo-grok', 'name' => 'Grok', 'preis' => 8, 'intervall' => 'monatlich', 'ablaufdatum' => '2026-12-30', 'status' => 'aktiv'],
        ['id' => 'abo-suno', 'name' => 'Suno', 'preis' => 10, 'intervall' => 'monatlich', 'ablaufdatum' => '2026-12-25', 'status' => 'gekuendigt'],
        ['id' => 'abo-higgsfield', 'name' => 'Higgsfield', 'preis' => 9, 'intervall' => 'monatlich', 'ablaufdatum' => '2026-12-20', 'status' => 'aktiv'],
        ['id' => 'abo-offen', 'name' => 'Offen', 'status' => 'aktiv'],
    ]]);
    $hdr = ['X-Abo-Token: ' . $token];
    $r = call('POST', '/abo/notify.php', [], false, $hdr);
    $box = array_slice(outbox(), 2);
    check($r['status'] === 200 && ($r['data']['due'] ?? 0) === 2 && ($r['data']['sent'] ?? 0) === 4, 'Lauf: 2 fällige Abos × 2 Kanäle');
    check(!str_contains($r['body'], 'Claude') && !str_contains($r['body'], 'willi@'), 'notify.php gibt nur Zahlen aus');
    check(count($box) === 2 && $box[0]['channel'] === 'email' && $box[1]['channel'] === 'whatsapp', 'Eine Sammelnachricht pro Kanal');
    $text = $box[0]['text'] ?? '';
    check(str_contains($text, 'Claude (jährlich, 214,20 €) läuft am 29.12.2026 ab – in 7 Tagen. Kündigen/verwalten: https://claude.ai/settings/billing'), 'Text: genau 7 Tage vorher, mit Preis und Link');
    check(str_contains($text, 'ChatGPT (monatlich, 23,00 €) läuft am 24.12.2026 ab – in 2 Tagen. Kündigen/verwalten: https://geringdigital.de/abo/'), 'Nachholen innerhalb des Vorlaufs, Link auf /abo ohne eigenen Link');
    check(strpos($text, 'ChatGPT') < strpos($text, 'Claude'), 'Sortiert nach Dringlichkeit');
    check(!str_contains($text, 'Grok') && !str_contains($text, 'Suno') && !str_contains($text, 'Higgsfield') && !str_contains($text, 'Offen'), 'Außerhalb des Vorlaufs, gekündigt, abgelaufen oder ohne Datum: keine Erinnerung');
    check(str_contains($box[0]['subject'], '2 Abos'), 'E-Mail-Betreff nennt die Anzahl');

    $r = call('POST', '/abo/notify.php', [], false, $hdr);
    check(($r['data']['sent'] ?? -1) === 0 && count(outbox()) === 4, 'Zweiter Lauf am selben Tag schickt nichts doppelt');

    call('POST', '/abo/api.php?action=save', ['item' => ['id' => 'abo-grok', 'name' => 'Grok', 'preis' => 8, 'intervall' => 'monatlich', 'ablaufdatum' => '2026-12-29', 'status' => 'aktiv']]);
    $r = call('POST', '/abo/notify.php', [], false, $hdr);
    $box = array_slice(outbox(), 4);
    check(($r['data']['sent'] ?? 0) === 2 && count($box) === 2, 'Neu fälliges Abo wird einzeln gemeldet');
    check(str_starts_with($box[1]['text'] ?? '', '⏰ Abo-Erinnerung: Grok (monatlich, 8,00 €) läuft am 29.12.2026 ab – in 7 Tagen.'), 'Einzelnachricht im gewünschten Format');

    $r = call('POST', '/abo/api.php?action=notify_get', []);
    $n = $r['data']['notify'] ?? [];
    check(count($n['log'] ?? []) === 6 && ($n['lastRun']['today'] ?? '') === '2026-12-22', 'Protokoll und letzte Prüfung sichtbar');
    check(($n['log'][0]['name'] ?? '') === 'Grok', 'Protokoll: neueste Erinnerung zuerst, mit Abo-Namen');

    // Nach Verlängerung (neues Ablaufdatum) wird wieder erinnert – aber erst im neuen Vorlauf.
    call('POST', '/abo/api.php?action=save', ['item' => ['id' => 'abo-chatgpt', 'name' => 'ChatGPT', 'preis' => 23, 'intervall' => 'monatlich', 'ablaufdatum' => '2027-01-24', 'status' => 'aktiv']]);
    check((call('POST', '/abo/notify.php', [], false, $hdr)['data']['sent'] ?? -1) === 0, 'Verlängertes Abo: keine Erinnerung vor dem neuen Vorlauf');

    // Kanäle aus: Lauf schickt nichts.
    call('POST', '/abo/api.php?action=notify_save', ['settings' => ['emailOn' => false, 'email' => 'willi@example.org', 'whatsappOn' => false, 'phone' => '+491701234567', 'leadDays' => 30]]);
    $r = call('POST', '/abo/notify.php', [], false, $hdr);
    check($r['status'] === 200 && ($r['data']['sent'] ?? -1) === 0 && count(outbox()) === 6, 'Alles aus: keine Nachrichten');

    // Neuer Token macht den alten ungültig.
    $r2 = call('POST', '/abo/api.php?action=notify_token', []);
    check(call('POST', '/abo/notify.php', [], false, $hdr)['status'] === 401 && call('POST', '/abo/notify.php', [], false, ['X-Abo-Token: ' . ($r2['data']['token'] ?? '')])['status'] === 200, 'Neuer Token ersetzt den alten');

    // Schlüssel entfernen.
    $r = call('POST', '/abo/api.php?action=notify_save', ['settings' => ['whatsappOn' => false, 'phone' => '+491701234567', 'clearApikey' => true, 'leadDays' => 7]]);
    check(($r['data']['notify']['hasApikey'] ?? true) === false, 'Gespeicherter Schlüssel lässt sich entfernen');

    // Fehlgeschlagener Kanal wird am nächsten Lauf nachgeholt (direkt über die Bibliothek).
    require $root . '/abo/notify-lib.php';
    putenv('GD_ABO_OUTBOX=' . $outbox); putenv('GD_ABO_TODAY=2026-12-22'); putenv('GD_ABO_OUTBOX_FAIL=whatsapp');
    $pdo = new PDO('sqlite:' . $dir . '/abos-private.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    abo_notify_save($pdo, ['emailOn' => true, 'email' => 'willi@example.org', 'whatsappOn' => true, 'phone' => '+491701234567', 'apikey' => '555555', 'leadDays' => 7]);
    $pdo->prepare('INSERT INTO entries (id,payload,updated_at) VALUES (?,?,?)')->execute(['abo-neu', json_encode(['id' => 'abo-neu', 'name' => 'Neu', 'preis' => null, 'intervall' => '', 'ablaufdatum' => '2026-12-23', 'status' => 'aktiv']), gmdate('c')]);
    $res = abo_notify_run($pdo);
    check(count($res['sent']) === 1 && $res['sent'][0]['channel'] === 'email' && count($res['errors']) === 1, 'WhatsApp-Fehler: E-Mail geht raus, Fehler wird protokolliert');
    check(str_contains((string)end($res['errors']), 'WhatsApp'), 'Fehlermeldung nennt den Kanal');
    putenv('GD_ABO_OUTBOX_FAIL');
    $res = abo_notify_run($pdo);
    check(count($res['sent']) === 1 && $res['sent'][0]['channel'] === 'whatsapp' && !$res['errors'], 'Nächster Lauf holt nur den fehlgeschlagenen Kanal nach');
    $last = array_slice(outbox(), -1)[0] ?? [];
    check(str_contains($last['text'] ?? '', 'Neu läuft am 23.12.2026 ab – morgen.'), 'Abo ohne Preis/Intervall: Text ohne Klammer, „morgen“');
    check(!str_contains((string)json_encode($res), '555555'), 'Laufprotokoll enthält keinen Schlüssel');
    $pdo = null;
    check(hash_file('sha256', $dir . '/bewerbungen-private.sqlite') === $before, 'Bewerbungs-DB bleibt auch nach den Benachrichtigungen byte-identisch');

    // Abmelden.
    call('POST', '/abo/api.php?action=logout', []);
    $r = call('GET', '/abo/api.php?action=state');
    check(($r['data']['mode'] ?? '') === 'login', 'Nach Abmelden wieder Login');

    // Datenverzeichnis bleibt gesperrt (Router emuliert .htaccess).
    check(call('GET', '/data/abos-private.sqlite', null, false)['status'] === 403, 'data/abos-private.sqlite ist gesperrt');
    check(call('GET', '/data/abos-notify.lock', null, false)['status'] === 403, 'Lock-Datei liegt im gesperrten Datenverzeichnis');
    $r = call('POST', '/abo/api.php?action=notify_get', []);
    check($r['status'] === 401, 'Benachrichtigungen ohne Login gesperrt');
    check(is_file($dir . '/abos-private.sqlite'), 'Abo-DB liegt im Datenverzeichnis');
} finally {
    proc_terminate($server);
    @unlink($jar);
    foreach (glob($dir . '/*') ?: [] as $f) @unlink($f);
    @rmdir($dir);
}
echo ($failures ? "FAIL" : "OK") . ": " . ($count - $failures) . "/$count Abo-API-Prüfungen\n";
exit($failures ? 1 : 0);
