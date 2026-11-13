<?php
declare(strict_types=1);

// Hetzjagd – Lobby-Liste und WebRTC-Verbindungsaufbau (Signalisierung).
// Die eigentlichen Spieldaten laufen direkt zwischen den Browsern; hier liegen nur
// kurzlebige Lobby-Einträge. Kein Login, keine Cookies, keine Session.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const HJ_MAX_LOBBIES = 40;   // gleichzeitig offene Lobbys
const HJ_LOBBY_TTL = 25;     // Sekunden ohne Lebenszeichen des Hosts
const HJ_MSG_TTL = 40;       // Sekunden, die eine Signalnachricht abholbar bleibt
const HJ_MAX_MSGS = 24;      // wartende Signalnachrichten je Lobby
const HJ_MAX_SDP = 12000;    // Zeichen je Verbindungsbeschreibung
const HJ_MAX_METERS = 3000; // plausibles Maximum je Spieler und Runde
const HJ_MAX_NAMES = 500;   // Einträge in der Bestenliste
const HJ_GUARD = "<?php http_response_code(403); exit; ?>\n";

function hj_out(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function hj_name($value): string
{
    $s = is_string($value) ? $value : '';
    $s = preg_replace('/[\x00-\x1f<>]/u', '', $s);
    if (!is_string($s)) {
        $s = '';
    }
    $s = trim($s);
    if (preg_match('/^.{0,14}/us', $s, $m) === 1) {
        $s = trim($m[0]);
    } else {
        $s = '';
    }
    return $s !== '' ? $s : 'Flitzer' . random_int(10, 99);
}

function hj_save($fh, array $db): void
{
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, HJ_GUARD . json_encode($db, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
}

function hj_open(string $file): array
{
    $fh = @fopen($file, 'c+');
    if ($fh === false) {
        return [null, []];
    }
    if (!flock($fh, LOCK_EX)) {
        fclose($fh);
        return [null, []];
    }
    $txt = (string) stream_get_contents($fh);
    $nl = strpos($txt, "\n");
    $data = $nl === false ? null : json_decode(substr($txt, $nl + 1), true);
    return [$fh, is_array($data) ? $data : []];
}

function hj_key(string $name): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name);
}

// Bestenliste: je Name Rundensiege (w), Matchsiege (m), Meter gesamt (d), beste Runde (b), Runden (r).
function hj_top(array $hs): array
{
    $rows = [];
    foreach ((array) ($hs['p'] ?? []) as $e) {
        if (is_array($e)) {
            $rows[] = ['n' => (string) ($e['n'] ?? ''), 'w' => (int) ($e['w'] ?? 0), 'm' => (int) ($e['m'] ?? 0),
                'd' => (int) ($e['d'] ?? 0), 'b' => (int) ($e['b'] ?? 0), 'r' => (int) ($e['r'] ?? 0)];
        }
    }
    $wins = array_values(array_filter($rows, static function (array $e): bool { return $e['w'] > 0; }));
    usort($wins, static function (array $a, array $b): int { return [$b['m'], $b['w'], $a['r']] <=> [$a['m'], $a['w'], $b['r']]; });
    $dist = array_values(array_filter($rows, static function (array $e): bool { return $e['d'] > 0; }));
    usort($dist, static function (array $a, array $b): int { return [$b['d'], $b['b']] <=> [$a['d'], $a['b']]; });
    return ['wins' => array_slice($wins, 0, 10), 'dist' => array_slice($dist, 0, 10)];
}

function hj_record(string $file, $list): array
{
    if (!is_array($list)) {
        return ['err' => 'Ungültige Ergebnisse.'];
    }
    $entries = [];
    $won = false;
    foreach (array_slice(array_values($list), 0, 6) as $e) {
        if (!is_array($e)) {
            continue;
        }
        $name = hj_name($e['name'] ?? '');
        $key = hj_key($name);
        if (isset($entries[$key])) {
            continue;
        }
        $win = !$won && !empty($e['win']);
        $won = $won || $win;
        $entries[$key] = ['n' => $name, 'm' => max(0, min(HJ_MAX_METERS, (int) ($e['m'] ?? 0))), 'win' => $win, 'match' => $win && !empty($e['match'])];
    }
    if (count($entries) < 2) {
        return ['err' => 'Zu wenige Spieler.'];
    }
    [$fh, $hs] = hj_open($file);
    if ($fh === null) {
        return ['err' => 'Speicher nicht verfügbar.'];
    }
    $p = isset($hs['p']) && is_array($hs['p']) ? $hs['p'] : [];
    foreach ($entries as $key => $e) {
        $cur = isset($p[$key]) && is_array($p[$key]) ? $p[$key] : [];
        $p[$key] = [
            'n' => $e['n'],
            'w' => (int) ($cur['w'] ?? 0) + ($e['win'] ? 1 : 0),
            'm' => (int) ($cur['m'] ?? 0) + ($e['match'] ? 1 : 0),
            'd' => (int) ($cur['d'] ?? 0) + $e['m'],
            'b' => max((int) ($cur['b'] ?? 0), $e['m']),
            'r' => (int) ($cur['r'] ?? 0) + 1,
        ];
    }
    if (count($p) > HJ_MAX_NAMES) {
        uasort($p, static function ($a, $b): int { return ((int) ($b['d'] ?? 0)) <=> ((int) ($a['d'] ?? 0)); });
        $p = array_slice($p, 0, HJ_MAX_NAMES, true);
    }
    hj_save($fh, ['p' => $p]);
    return ['ok' => true];
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    hj_out(['err' => 'Nur POST erlaubt.'], 405);
}
$raw = file_get_contents('php://input', false, null, 0, 20000);
$in = json_decode(is_string($raw) && $raw !== '' ? $raw : '{}', true);
if (!is_array($in)) {
    hj_out(['err' => 'Ungültige Anfrage.'], 400);
}
$action = isset($_GET['a']) && is_string($_GET['a']) ? $_GET['a'] : '';
if (!in_array($action, ['list', 'create', 'poll', 'signal', 'close', 'top', 'score'], true)) {
    hj_out(['err' => 'Unbekannte Aktion.'], 400);
}

$tok = isset($in['tok']) && is_string($in['tok']) ? $in['tok'] : '';
if (preg_match('/^[a-f0-9]{32}$/', $tok) !== 1) {
    hj_out(['err' => 'Ungültiges Token.'], 400);
}
$pid = substr(hash('sha256', $tok), 0, 12);
$id = isset($in['id']) && is_string($in['id']) ? strtoupper($in['id']) : '';
if (in_array($action, ['poll', 'signal', 'close', 'score'], true) && preg_match('/^[A-Z]{4}$/', $id) !== 1) {
    hj_out(['err' => 'Ungültiger Lobby-Code.'], 400);
}

// Speicher: eine Datei, exklusiv gesperrt. Der Ordner ist per .htaccess gesperrt,
// die Datei beginnt zusätzlich mit einem PHP-Abbruch.
$dir = __DIR__ . '/data';
if (!is_dir($dir)) {
    @mkdir($dir, 0700, true);
}
if (!is_file($dir . '/.htaccess')) {
    @file_put_contents($dir . '/.htaccess', "Require all denied\n");
}
$fh = @fopen($dir . '/lobbies.php', 'c+');
if ($fh === false || !flock($fh, LOCK_EX)) {
    hj_out(['err' => 'Speicher nicht verfügbar.'], 500);
}
$txt = (string) stream_get_contents($fh);
$nl = strpos($txt, "\n");
$db = $nl === false ? null : json_decode(substr($txt, $nl + 1), true);
if (!is_array($db) || !isset($db['l']) || !is_array($db['l'])) {
    $db = ['l' => []];
}

$now = time();
foreach ($db['l'] as $key => $lobby) {
    if (!is_array($lobby) || $now - (int) ($lobby['seen'] ?? 0) > HJ_LOBBY_TTL) {
        unset($db['l'][$key]);
        continue;
    }
    $queue = [];
    foreach ((array) ($lobby['q'] ?? []) as $msg) {
        if (is_array($msg) && $now - (int) ($msg['t'] ?? 0) <= HJ_MSG_TTL) {
            $queue[] = $msg;
        }
    }
    $db['l'][$key]['q'] = $queue;
}

$res = ['ok' => true];

if ($action === 'list') {
    $list = [];
    foreach ($db['l'] as $lobby) {
        $list[] = ['id' => $lobby['id'], 'name' => $lobby['name'], 'n' => (int) $lobby['n'], 'run' => (bool) $lobby['run']];
    }
    $res = ['ls' => $list];
} elseif ($action === 'create') {
    foreach ($db['l'] as $key => $lobby) {
        if ($lobby['host'] === $pid) {
            unset($db['l'][$key]);
        }
    }
    if (count($db['l']) >= HJ_MAX_LOBBIES) {
        $res = ['err' => 'Zu viele offene Lobbys – bitte einer bestehenden beitreten.'];
    } else {
        do {
            $new = '';
            for ($i = 0; $i < 4; $i++) {
                $new .= 'ABCDEFGHJKLMNPQRSTUVWXYZ'[random_int(0, 23)];
            }
        } while (isset($db['l'][$new]));
        $name = hj_name($in['name'] ?? '') . 's Lobby';
        $db['l'][$new] = ['id' => $new, 'name' => $name, 'host' => $pid, 'n' => 1, 'run' => false, 'seen' => $now, 'q' => []];
        $res = ['id' => $new, 'name' => $name];
    }
} elseif ($action === 'top') {
    [$sh, $hs] = hj_open($dir . '/scores.php');
    if ($sh === null) {
        $res = ['err' => 'Bestenliste nicht verfügbar.'];
    } else {
        flock($sh, LOCK_UN);
        fclose($sh);
        $res = hj_top($hs);
    }
} elseif (!isset($db['l'][$id])) {
    $res = ['gone' => true];
} elseif ($action === 'score') {
    if ($db['l'][$id]['host'] !== $pid) {
        $res = ['err' => 'Nur der Host meldet Ergebnisse.'];
    } elseif ($now - (int) ($db['l'][$id]['rep'] ?? 0) < 3) {
        $res = ['err' => 'Ergebnis wurde gerade erst gemeldet.'];
    } else {
        $db['l'][$id]['rep'] = $now;
        $res = hj_record($dir . '/scores.php', $in['ps'] ?? null);
    }
} elseif ($action === 'poll') {
    if ($db['l'][$id]['host'] === $pid) {
        $db['l'][$id]['seen'] = $now;
        $db['l'][$id]['n'] = max(1, min(6, (int) ($in['n'] ?? 1)));
        $db['l'][$id]['run'] = !empty($in['run']);
    }
    $mine = [];
    $rest = [];
    foreach ($db['l'][$id]['q'] as $msg) {
        if ($msg['to'] === $pid) {
            $mine[] = ['from' => $msg['from'], 'data' => $msg['data']];
        } else {
            $rest[] = $msg;
        }
    }
    $db['l'][$id]['q'] = $rest;
    $res = ['msgs' => $mine];
} elseif ($action === 'signal') {
    $host = $db['l'][$id]['host'];
    $to = isset($in['to']) && is_string($in['to']) ? $in['to'] : '';
    if ($to === 'host') {
        $to = $host;
    } elseif ($pid !== $host || preg_match('/^[a-f0-9]{12}$/', $to) !== 1) {
        $to = '';
    }
    $sdp = isset($in['data']['sdp']) && is_array($in['data']['sdp']) ? $in['data']['sdp'] : null;
    $type = is_array($sdp) && isset($sdp['type']) && is_string($sdp['type']) ? $sdp['type'] : '';
    $body = is_array($sdp) && isset($sdp['sdp']) && is_string($sdp['sdp']) ? $sdp['sdp'] : '';
    if ($to === '' || $to === $pid || !in_array($type, ['offer', 'answer'], true) || $body === '' || strlen($body) > HJ_MAX_SDP) {
        $res = ['err' => 'Ungültige Signalnachricht.'];
    } elseif (count($db['l'][$id]['q']) >= HJ_MAX_MSGS) {
        $res = ['err' => 'Lobby ist gerade überlastet – bitte gleich noch einmal versuchen.'];
    } else {
        $db['l'][$id]['q'][] = ['to' => $to, 'from' => $pid, 't' => $now, 'data' => ['sdp' => ['type' => $type, 'sdp' => $body]]];
    }
} elseif ($action === 'close') {
    if ($db['l'][$id]['host'] === $pid) {
        unset($db['l'][$id]);
    }
}

hj_save($fh, $db);
hj_out($res);
