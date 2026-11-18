<?php
/**
 * Gering Digital – Abo-Erinnerungen (gemeinsame Funktionen für api.php und notify.php).
 *
 * - Einstellungen liegen in data/abos-private.sqlite (Tabelle meta, Schlüssel
 *   notify_settings) – nie im Repository. Der CallMeBot-Schlüssel wird nie an
 *   den Browser zurückgegeben, nur ein Hinweis auf die letzten zwei Ziffern.
 * - Bereits verschickte Erinnerungen stehen in notify_log (Abo-ID + Ablaufdatum +
 *   Kanal), damit jeder Ablauf pro Kanal genau einmal gemeldet wird.
 * - Der Cron-Token wird nur als SHA-256-Hash gespeichert.
 * - Tests: GD_ABO_OUTBOX=/pfad/datei schreibt Nachrichten in eine Datei statt sie
 *   zu verschicken (nie echtes CallMeBot/mail()), GD_ABO_TODAY=JJJJ-MM-TT setzt
 *   das Datum. Beides nur über Umgebungsvariablen, nie über HTTP steuerbar.
 */
declare(strict_types=1);

if (realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    http_response_code(404);
    exit;
}

const ABO_NOTIFY_URL = 'https://geringdigital.de/abo/';
const ABO_MAIL_FROM = 'info@geringdigital.de';
const ABO_NOTIFY_LEAD_DEFAULT = 7;
const ABO_NOTIFY_TEST_COOLDOWN = 30;   // Sekunden pro Kanal
const ABO_NOTIFY_TEST_WINDOW = 900;    // Sekunden
const ABO_NOTIFY_TEST_MAX = 6;         // Test-Nachrichten pro Fenster, alle Kanäle
const ABO_NOTIFY_CHANNELS = ['email', 'whatsapp'];

function abo_notify_schema(PDO $db): void
{
    $db->exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS notify_log (abo_id TEXT NOT NULL, ablaufdatum TEXT NOT NULL, channel TEXT NOT NULL, sent_at TEXT NOT NULL, PRIMARY KEY (abo_id, ablaufdatum, channel))');
}

function abo_meta_get(PDO $db, string $key): ?array
{
    $stmt = $db->prepare('SELECT value FROM meta WHERE key=?');
    $stmt->execute([$key]);
    $raw = $stmt->fetchColumn();
    if (!is_string($raw)) return null;
    $v = json_decode($raw, true);
    return is_array($v) ? $v : null;
}

function abo_meta_set(PDO $db, string $key, array $value): void
{
    $db->prepare('INSERT INTO meta (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
        ->execute([$key, json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
}

function abo_notify_settings(PDO $db): array
{
    $s = abo_meta_get($db, 'notify_settings') ?? [];
    return [
        'emailOn' => !empty($s['emailOn']),
        'email' => is_string($s['email'] ?? null) ? $s['email'] : '',
        'whatsappOn' => !empty($s['whatsappOn']),
        'phone' => is_string($s['phone'] ?? null) ? $s['phone'] : '',
        'apikey' => is_string($s['apikey'] ?? null) ? $s['apikey'] : '',
        'leadDays' => is_int($s['leadDays'] ?? null) ? $s['leadDays'] : ABO_NOTIFY_LEAD_DEFAULT,
        'tokenHash' => is_string($s['tokenHash'] ?? null) ? $s['tokenHash'] : '',
        'tokenCreatedAt' => is_string($s['tokenCreatedAt'] ?? null) ? $s['tokenCreatedAt'] : '',
    ];
}

/** Telefonnummer in internationales Format (+491701234567) bringen; '' = ungültig. */
function abo_normalize_phone(string $raw): string
{
    $p = preg_replace('/[\s\-\/().]/', '', trim($raw)) ?? '';
    if (str_starts_with($p, '00')) $p = '+' . substr($p, 2);
    return preg_match('/\A\+[1-9]\d{6,14}\z/D', $p) ? $p : '';
}

function abo_valid_email(string $email): bool
{
    return $email !== '' && strlen($email) <= 254 && !preg_match('/[\r\n,;<>]/', $email)
        && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/** Sicht für den Browser: ohne Token-Hash und ohne vollständigen API-Schlüssel. */
function abo_notify_public(PDO $db): array
{
    $s = abo_notify_settings($db);
    $log = [];
    $names = [];
    foreach ($db->query('SELECT id, payload FROM entries') as $row) {
        $item = json_decode((string)$row['payload'], true);
        if (is_array($item)) $names[(string)$row['id']] = (string)($item['name'] ?? $row['id']);
    }
    foreach ($db->query('SELECT abo_id, ablaufdatum, channel, sent_at FROM notify_log ORDER BY sent_at DESC, rowid DESC LIMIT 8') as $row) {
        $log[] = ['name' => $names[$row['abo_id']] ?? (string)$row['abo_id'], 'ablaufdatum' => (string)$row['ablaufdatum'],
                  'channel' => (string)$row['channel'], 'sentAt' => (string)$row['sent_at']];
    }
    return [
        'emailOn' => $s['emailOn'], 'email' => $s['email'],
        'whatsappOn' => $s['whatsappOn'], 'phone' => $s['phone'],
        'hasApikey' => $s['apikey'] !== '',
        'apikeyHint' => $s['apikey'] !== '' ? '••••' . substr($s['apikey'], -2) : '',
        'leadDays' => $s['leadDays'],
        'hasToken' => $s['tokenHash'] !== '', 'tokenCreatedAt' => $s['tokenCreatedAt'],
        'lastRun' => abo_meta_get($db, 'notify_last_run'),
        'log' => $log,
    ];
}

/** Prüft und speichert Einstellungen. Wirft InvalidArgumentException mit deutscher Meldung. */
function abo_notify_save(PDO $db, array $in): void
{
    $s = abo_notify_settings($db);
    $emailOn = !empty($in['emailOn']);
    $email = trim((string)(is_string($in['email'] ?? null) ? $in['email'] : ''));
    if ($email !== '' && !abo_valid_email($email)) throw new InvalidArgumentException('Bitte eine gültige E-Mail-Adresse eintragen.');
    if ($emailOn && $email === '') throw new InvalidArgumentException('Für E-Mail-Erinnerungen fehlt die Empfänger-Adresse.');

    $waOn = !empty($in['whatsappOn']);
    $phoneRaw = trim((string)(is_string($in['phone'] ?? null) ? $in['phone'] : ''));
    $phone = $phoneRaw === '' ? '' : abo_normalize_phone($phoneRaw);
    if ($phoneRaw !== '' && $phone === '') throw new InvalidArgumentException('Telefonnummer bitte international, z. B. +49 170 1234567.');

    $apikey = $s['apikey'];
    if (!empty($in['clearApikey'])) $apikey = '';
    $newKey = trim((string)(is_string($in['apikey'] ?? null) ? $in['apikey'] : ''));
    if ($newKey !== '') {
        if (!preg_match('/\A[A-Za-z0-9_-]{4,64}\z/D', $newKey)) throw new InvalidArgumentException('Der CallMeBot-Schlüssel sieht ungültig aus (nur Ziffern/Buchstaben).');
        $apikey = $newKey;
    }
    if ($waOn && ($phone === '' || $apikey === '')) throw new InvalidArgumentException('Für WhatsApp fehlen Telefonnummer oder CallMeBot-Schlüssel.');

    $lead = $in['leadDays'] ?? ABO_NOTIFY_LEAD_DEFAULT;
    if (is_string($lead) && preg_match('/\A\d{1,3}\z/D', trim($lead))) $lead = (int)trim($lead);
    if (!is_int($lead) || $lead < 1 || $lead > 60) throw new InvalidArgumentException('Vorlauf bitte zwischen 1 und 60 Tagen.');

    $s['emailOn'] = $emailOn; $s['email'] = $email;
    $s['whatsappOn'] = $waOn; $s['phone'] = $phone; $s['apikey'] = $apikey;
    $s['leadDays'] = $lead;
    abo_meta_set($db, 'notify_settings', $s);
}

/** Erzeugt einen neuen Cron-Token, speichert nur den Hash und gibt den Klartext EINMAL zurück. */
function abo_notify_new_token(PDO $db): string
{
    $token = 'abo_' . bin2hex(random_bytes(32));
    $s = abo_notify_settings($db);
    $s['tokenHash'] = hash('sha256', $token);
    $s['tokenCreatedAt'] = gmdate('c');
    abo_meta_set($db, 'notify_settings', $s);
    return $token;
}

function abo_notify_token_ok(PDO $db, string $provided): bool
{
    $hash = abo_notify_settings($db)['tokenHash'];
    if ($hash === '' || strlen($provided) < 32 || strlen($provided) > 200) return false;
    return hash_equals($hash, hash('sha256', $provided));
}

/** Rate-Limit für Test-Nachrichten. Gibt '' oder eine Fehlermeldung zurück und bucht den Versuch. */
function abo_notify_test_allowed(PDO $db, string $channel): string
{
    $now = time();
    $hist = array_values(array_filter(abo_meta_get($db, 'notify_tests') ?? [],
        fn($e) => is_array($e) && (int)($e['at'] ?? 0) > $now - ABO_NOTIFY_TEST_WINDOW));
    foreach ($hist as $e) {
        if (($e['channel'] ?? '') === $channel && (int)$e['at'] > $now - ABO_NOTIFY_TEST_COOLDOWN) {
            return 'Bitte einen Moment warten, bevor du noch eine Test-Nachricht schickst.';
        }
    }
    if (count($hist) >= ABO_NOTIFY_TEST_MAX) return 'Zu viele Test-Nachrichten. Bitte in 15 Minuten erneut versuchen.';
    $hist[] = ['at' => $now, 'channel' => $channel];
    abo_meta_set($db, 'notify_tests', $hist);
    return '';
}

function abo_today(): DateTimeImmutable
{
    $tz = new DateTimeZone('Europe/Berlin');
    $fake = getenv('GD_ABO_TODAY');
    if (is_string($fake) && preg_match('/\A\d{4}-\d{2}-\d{2}\z/D', $fake)) {
        $d = DateTimeImmutable::createFromFormat('!Y-m-d', $fake, $tz);
        if ($d) return $d;
    }
    return new DateTimeImmutable('today', $tz);
}

function abo_days_until(string $date, DateTimeImmutable $today): ?int
{
    if (!preg_match('/\A\d{4}-\d{2}-\d{2}\z/D', $date)) return null;
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $date, $today->getTimezone());
    if (!$d || $d->format('Y-m-d') !== $date) return null;
    return (int)$today->diff($d)->format('%r%a');
}

function abo_euro(float $n): string
{
    return number_format($n, 2, ',', '.') . ' €';
}

function abo_rel_days(int $n): string
{
    return $n === 0 ? 'heute' : ($n === 1 ? 'morgen' : 'in ' . $n . ' Tagen');
}

function abo_reminder_line(array $item, int $days): string
{
    $facts = [];
    if (($item['intervall'] ?? '') === 'monatlich') $facts[] = 'monatlich';
    if (($item['intervall'] ?? '') === 'jaehrlich') $facts[] = 'jährlich';
    if (is_int($item['preis'] ?? null) || is_float($item['preis'] ?? null)) $facts[] = abo_euro((float)$item['preis']);
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', (string)$item['ablaufdatum']);
    $link = (string)($item['kuendigungslink'] ?? '');
    if ($link === '' || !preg_match('~\Ahttps?://\S+\z~i', $link)) $link = ABO_NOTIFY_URL;
    return (string)$item['name'] . ($facts ? ' (' . implode(', ', $facts) . ')' : '')
        . ' läuft am ' . ($date ? $date->format('d.m.Y') : (string)$item['ablaufdatum']) . ' ab – ' . abo_rel_days($days)
        . '. Kündigen/verwalten: ' . $link;
}

/** @param array<int,array{item:array,days:int}> $due */
function abo_reminder_message(array $due): array
{
    if (count($due) === 1) {
        $text = '⏰ Abo-Erinnerung: ' . abo_reminder_line($due[0]['item'], $due[0]['days']);
        $subject = 'Abo-Erinnerung: ' . $due[0]['item']['name'] . ' läuft ' . abo_rel_days($due[0]['days']) . ' ab';
    } else {
        $lines = array_map(fn($d) => '• ' . abo_reminder_line($d['item'], $d['days']), $due);
        $text = '⏰ Abo-Erinnerung: ' . count($due) . " Abos laufen bald ab\n\n" . implode("\n", $lines);
        $subject = 'Abo-Erinnerung: ' . count($due) . ' Abos laufen bald ab';
    }
    return ['subject' => $subject, 'text' => $text . "\n\nÜbersicht: " . ABO_NOTIFY_URL];
}

/** Abos, die heute (Berlin) innerhalb des Vorlaufs ablaufen. */
function abo_due_items(PDO $db, int $lead, DateTimeImmutable $today): array
{
    $due = [];
    foreach ($db->query('SELECT payload FROM entries ORDER BY id') as $row) {
        $item = json_decode((string)$row['payload'], true);
        if (!is_array($item) || ($item['status'] ?? 'aktiv') === 'gekuendigt') continue;
        $n = abo_days_until((string)($item['ablaufdatum'] ?? ''), $today);
        if ($n === null || $n < 0 || $n > $lead) continue;
        $due[] = ['item' => $item, 'days' => $n];
    }
    usort($due, fn($a, $b) => [$a['days'], (string)$a['item']['name']] <=> [$b['days'], (string)$b['item']['name']]);
    return $due;
}

/* ---------- Versand ---------- */

/** Testmodus: Nachricht in Datei schreiben statt zu senden. null = kein Testmodus. */
function abo_outbox(string $channel, string $to, string $subject, string $text): ?array
{
    $file = getenv('GD_ABO_OUTBOX');
    if (!is_string($file) || $file === '') return null;
    $failing = explode(',', (string)getenv('GD_ABO_OUTBOX_FAIL'));
    if (in_array($channel, $failing, true)) return ['ok' => false, 'error' => 'Testfehler (' . $channel . ')'];
    file_put_contents($file, json_encode(['channel' => $channel, 'to' => $to, 'subject' => $subject, 'text' => $text],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
    return ['ok' => true, 'error' => ''];
}

function abo_send_email(string $to, string $subject, string $text): array
{
    if (!abo_valid_email($to)) return ['ok' => false, 'error' => 'Ungültige E-Mail-Adresse.'];
    $fake = abo_outbox('email', $to, $subject, $text);
    if ($fake !== null) return $fake;
    if (!function_exists('mail')) return ['ok' => false, 'error' => 'mail() ist auf dem Server nicht verfügbar.'];
    // Gleiche Konvention wie send.php: Absender auf der eigenen Domain, STRATO-Mailversand.
    $headers = [
        'From: Gering Digital <' . ABO_MAIL_FROM . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: Gering Digital Abo-Erinnerung',
    ];
    $ok = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $text, implode("\r\n", $headers));
    return $ok ? ['ok' => true, 'error' => ''] : ['ok' => false, 'error' => 'Der Mailserver hat die E-Mail nicht angenommen.'];
}

function abo_send_whatsapp(string $phone, string $apikey, string $text): array
{
    if ($phone === '' || $apikey === '') return ['ok' => false, 'error' => 'Telefonnummer oder CallMeBot-Schlüssel fehlt.'];
    $fake = abo_outbox('whatsapp', $phone, '', $text);
    if ($fake !== null) return $fake;
    $url = 'https://api.callmebot.com/whatsapp.php?phone=' . rawurlencode($phone)
        . '&text=' . rawurlencode($text) . '&apikey=' . rawurlencode($apikey);
    $status = 0; $body = '';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 25,
            CURLOPT_FOLLOWLOCATION => false, CURLOPT_USERAGENT => 'GeringDigital-Abo/1.0']);
        $body = (string)curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => ['method' => 'GET', 'timeout' => 25, 'ignore_errors' => true,
            'header' => "User-Agent: GeringDigital-Abo/1.0\r\n"]]);
        $body = (string)@file_get_contents($url, false, $ctx);
        foreach ($http_response_header ?? [] as $h) {
            if (preg_match('~\AHTTP/\S+\s+(\d{3})~', $h, $m)) $status = (int)$m[1];
        }
    }
    // Nie die URL (enthält den Schlüssel) in Fehlermeldungen übernehmen.
    if ($status < 200 || $status >= 300) return ['ok' => false, 'error' => 'CallMeBot nicht erreichbar (HTTP ' . $status . ').'];
    $plain = strtolower(strip_tags($body));
    if (preg_match('/apikey is invalid|invalid|error|not (allowed|activated|registered)|blocked|wrong/', $plain)) {
        return ['ok' => false, 'error' => 'CallMeBot hat abgelehnt – Schlüssel oder Nummer prüfen.'];
    }
    return ['ok' => true, 'error' => ''];
}

function abo_send(string $channel, array $s, string $subject, string $text): array
{
    return $channel === 'email' ? abo_send_email($s['email'], $subject, $text) : abo_send_whatsapp($s['phone'], $s['apikey'], $text);
}

/* ---------- Tägliche Prüfung ---------- */

function abo_notify_run(PDO $db): array
{
    $s = abo_notify_settings($db);
    $today = abo_today();
    $channels = [];
    if ($s['emailOn'] && $s['email'] !== '') $channels[] = 'email';
    if ($s['whatsappOn'] && $s['phone'] !== '' && $s['apikey'] !== '') $channels[] = 'whatsapp';
    $due = abo_due_items($db, $s['leadDays'], $today);
    $sent = []; $errors = [];
    $seen = $db->prepare('SELECT 1 FROM notify_log WHERE abo_id=? AND ablaufdatum=? AND channel=?');
    $mark = $db->prepare('INSERT OR IGNORE INTO notify_log (abo_id, ablaufdatum, channel, sent_at) VALUES (?,?,?,?)');
    foreach ($channels as $channel) {
        $open = array_values(array_filter($due, function ($d) use ($seen, $channel) {
            $seen->execute([(string)$d['item']['id'], (string)$d['item']['ablaufdatum'], $channel]);
            $hit = $seen->fetchColumn();
            $seen->closeCursor();
            return !$hit;
        }));
        if (!$open) continue;
        $msg = abo_reminder_message($open);
        $r = abo_send($channel, $s, $msg['subject'], $msg['text']);
        if (!$r['ok']) { $errors[] = ($channel === 'email' ? 'E-Mail' : 'WhatsApp') . ': ' . $r['error']; continue; }
        $at = gmdate('c');
        foreach ($open as $d) {
            $mark->execute([(string)$d['item']['id'], (string)$d['item']['ablaufdatum'], $channel, $at]);
            $sent[] = ['name' => (string)$d['item']['name'], 'ablaufdatum' => (string)$d['item']['ablaufdatum'], 'channel' => $channel];
        }
    }
    $result = ['at' => gmdate('c'), 'today' => $today->format('Y-m-d'), 'channels' => $channels,
               'due' => count($due), 'sent' => $sent, 'errors' => $errors];
    abo_meta_set($db, 'notify_last_run', $result);
    return $result;
}
