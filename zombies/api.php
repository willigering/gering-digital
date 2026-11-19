<?php
declare(strict_types=1);

// Are You Dead Yet? (Zombies) – Lobby-Liste und WebRTC-Verbindungsaufbau (Signalisierung).
// Abgeleitet von speed/api.php; dazu eine gemeinsame Online-Bestenliste.
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
    if (preg_match('/^.{0,16}/us', $s, $m) === 1) {
        $s = trim($m[0]);
    } else {
        $s = '';
    }
    return $s !== '' ? $s : 'Spieler' . random_int(10, 99);
}

// Kleine Schimpfwortliste für Namen in der Bestenliste (Vergleich ohne Leerzeichen/Sonderzeichen).
function hj_clean_name(string $n): string
{
    $flat = strtr(strtolower($n), ['Ä' => 'ae', 'Ö' => 'oe', 'Ü' => 'ue', '0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '@' => 'a', '$' => 's', 'ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss']);
    $flat = (string) preg_replace('/[^a-z]/', '', $flat);
    $bad = ['fick', 'fuck', 'ficken', 'hure', 'nutte', 'fotze', 'wichser', 'arschloch', 'hurensohn', 'schlampe', 'missgeburt', 'spast', 'nigger', 'neger', 'nazi', 'hitler', 'schwuchtel', 'kanake', 'bitch', 'cunt', 'whore', 'faggot', 'retard', 'penis', 'vagina', 'porn'];
    foreach ($bad as $w) {
        if (strpos($flat, $w) !== false) {
            return 'Spieler' . random_int(10, 99);
        }
    }
    return $n;
}

function hj_lobby_name(string $n): string
{
    // Deutscher Genitiv: „Annas Lobby“, aber „Max’ Lobby“ bzw. bei s/x/z/ß nur Apostroph.
    return preg_match('/[sxzß]$/iu', $n) === 1 ? $n . '’ Lobby' : $n . 's Lobby';
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

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    hj_out(['err' => 'Nur POST erlaubt.'], 405);
}
$raw = file_get_contents('php://input', false, null, 0, 20000);
$in = json_decode(is_string($raw) && $raw !== '' ? $raw : '{}', true);
if (!is_array($in)) {
    hj_out(['err' => 'Ungültige Anfrage.'], 400);
}
$action = isset($_GET['a']) && is_string($_GET['a']) ? $_GET['a'] : '';
if (!in_array($action, ['list', 'create', 'poll', 'signal', 'close', 'ice', 'feedback', 'score', 'scores'], true)) {
    hj_out(['err' => 'Unbekannte Aktion.'], 400);
}

$tok = isset($in['tok']) && is_string($in['tok']) ? $in['tok'] : '';
if (preg_match('/^[a-f0-9]{32}$/', $tok) !== 1) {
    hj_out(['err' => 'Ungültiges Token.'], 400);
}
$pid = substr(hash('sha256', $tok), 0, 12);

// TURN-Zugang (Cloudflare) für Spieler ohne Direktverbindung. Die Zugangsdaten gelten 24 h
// und werden 12 h zwischengespeichert, damit nicht jeder Beitritt Cloudflare fragt.
if ($action === 'ice') {
    $ddir = __DIR__ . '/data';
    if (!is_dir($ddir)) {
        @mkdir($ddir, 0700, true);
    }
    if (!is_file($ddir . '/.htaccess')) {
        @file_put_contents($ddir . '/.htaccess', "Require all denied
");
    }
    $cache = $ddir . '/turncache.php';
    $txt = @file_get_contents($cache);
    if (is_string($txt) && ($nl = strpos($txt, "\n")) !== false) {
        $c = json_decode(substr($txt, $nl + 1), true);
        if (is_array($c) && time() - (int) ($c['t'] ?? 0) < 43200 && !empty($c['s'])) {
            hj_out(['ice' => $c['s']]);
        }
        // Fehlschlag kurz merken, damit nicht jeder Beitritt erneut 5 s auf Cloudflare wartet.
        if (is_array($c) && !empty($c['fail']) && time() - (int) ($c['t'] ?? 0) < 60) {
            hj_out(['ice' => []]);
        }
    }
    // TURN-Zugang teilt sich das Spiel mit speed/ (wird beim Deploy dort hinterlegt).
    $cfgTxt = @file_get_contents($ddir . '/turn.php');
    if (!is_string($cfgTxt)) {
        $cfgTxt = @file_get_contents(__DIR__ . '/../speed/data/turn.php');
    }
    $cfg = is_string($cfgTxt) && ($nl = strpos($cfgTxt, "\n")) !== false ? json_decode(substr($cfgTxt, $nl + 1), true) : null;
    if (!is_array($cfg) || empty($cfg['id']) || empty($cfg['key']) || preg_match('/^[A-Za-z0-9_-]{8,128}$/', (string) $cfg['id']) !== 1) {
        hj_out(['ice' => []]);
    }
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'timeout' => 5, 'ignore_errors' => true,
        'header' => "Authorization: Bearer " . $cfg['key'] . "\r\nContent-Type: application/json\r\n",
        'content' => '{"ttl":86400}',
    ]]);
    $r = @file_get_contents('https://rtc.live.cloudflare.com/v1/turn/keys/' . $cfg['id'] . '/credentials/generate-ice-servers', false, $ctx);
    $j = is_string($r) ? json_decode($r, true) : null;
    $servers = [];
    foreach ((array) ($j['iceServers'] ?? []) as $srv) {
        if (!is_array($srv) || empty($srv['urls'])) {
            continue;
        }
        // Port 53 blockieren Browser ohnehin: weglassen
        $urls = array_values(array_filter((array) $srv['urls'], static function ($u): bool { return is_string($u) && strpos($u, ':53?') === false && substr($u, -3) !== ':53'; }));
        if ($urls) {
            $servers[] = array_filter(['urls' => $urls, 'username' => $srv['username'] ?? null, 'credential' => $srv['credential'] ?? null]);
        }
    }
    if ($servers) {
        @file_put_contents($cache, HJ_GUARD . json_encode(['t' => time(), 's' => $servers]), LOCK_EX);
    } else {
        @file_put_contents($cache, HJ_GUARD . json_encode(['t' => time(), 's' => [], 'fail' => true]), LOCK_EX);
    }
    hj_out(['ice' => $servers]);
}
// Feedback aus dem Spiel: per STRATO-Mailversand an info@geringdigital.de (ohne Mailprogramm beim Spieler)
if ($action === 'feedback') {
    if (!empty($in['website'])) {
        hj_out(['ok' => true]); // Bot-Falle
    }
    $msg = isset($in['msg']) && is_string($in['msg']) ? trim($in['msg']) : '';
    if ($msg === '' || preg_match('//u', $msg) !== 1 || preg_match_all('/./us', $msg) > 2000 || strpos($msg, "\0") !== false) {
        hj_out(['err' => 'Bitte schreib eine Nachricht (höchstens 2000 Zeichen).'], 422);
    }
    $from = hj_name($in['name'] ?? '');
    $ddir = __DIR__ . '/data';
    if (!is_dir($ddir)) {
        @mkdir($ddir, 0700, true);
    }
    if (!is_file($ddir . '/.htaccess')) {
        @file_put_contents($ddir . '/.htaccess', "Require all denied\n");
    }
    [$rfh, $rl] = hj_open($ddir . '/feedback_rate.php');
    if ($rfh === null) {
        hj_out(['err' => 'Feedback ist gerade nicht verfügbar.'], 500);
    }
    $now = time();
    $who = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|zombies'), 0, 16);
    $list = array_values(array_filter((array) ($rl['t'] ?? []), static function ($e) use ($now): bool {
        return is_array($e) && $now - (int) ($e[1] ?? 0) < 3600;
    }));
    $mine = count(array_filter($list, static function ($e) use ($who): bool { return ($e[0] ?? '') === $who; }));
    if ($mine >= 5 || count($list) >= 60) {
        hj_save($rfh, ['t' => $list]);
        hj_out(['err' => 'Du hast gerade schon viel Feedback geschickt – versuch es später noch einmal.'], 429);
    }
    $list[] = [$who, $now];
    hj_save($rfh, ['t' => $list]);
    $to = 'info@geringdigital.de';
    $subject = '=?UTF-8?B?' . base64_encode('Are You Dead Yet?') . '?=';
    $body = "Feedback zu „Are You Dead Yet?“\n\nSpieler: " . $from . "\nWelle: " . max(0, min(9999, (int) ($in['wave'] ?? 0))) . "\n\n" . $msg . "\n";
    $sent = function_exists('mail') && @mail($to, $subject, $body, [
        'From' => 'Are You Dead Yet? <' . $to . '>',
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
    ]);
    if ($sent) {
        hj_out(['ok' => true]);
    }
    hj_out(['err' => 'Das Feedback konnte gerade nicht gesendet werden. Bitte später noch einmal versuchen.'], 503);
}
// Gemeinsame Bestenliste: Der Host meldet am Rundenende alle Spieler auf einmal.
if ($action === 'score' || $action === 'scores') {
    $ddir = __DIR__ . '/data';
    if (!is_dir($ddir)) {
        @mkdir($ddir, 0700, true);
    }
    if (!is_file($ddir . '/.htaccess')) {
        @file_put_contents($ddir . '/.htaccess', "Require all denied\n");
    }
    [$sfh, $db] = hj_open($ddir . '/scores.php');
    if ($sfh === null) {
        hj_out(['err' => 'Bestenliste ist gerade nicht verfügbar.'], 500);
    }
    $list = array_values(array_filter((array) ($db['l'] ?? []), 'is_array'));
    if ($action === 'scores') {
        flock($sfh, LOCK_UN);
        fclose($sfh);
        $out = array_map(static function (array $e): array {
            return ['n' => (string) ($e['n'] ?? ''), 'w' => (int) ($e['w'] ?? 0), 'k' => (int) ($e['k'] ?? 0), 'h' => (int) ($e['h'] ?? 0), 'mp' => !empty($e['mp']), 'd' => (string) ($e['d'] ?? '')];
        }, array_slice($list, 0, 100));
        hj_out(['l' => $out]);
    }
    $now = time();
    $who = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|zscore'), 0, 16);
    $rate = array_values(array_filter((array) ($db['r'] ?? []), static function ($e) use ($now): bool {
        return is_array($e) && $now - (int) ($e[1] ?? 0) < 3600;
    }));
    $mine = count(array_filter($rate, static function ($e) use ($who): bool { return ($e[0] ?? '') === $who; }));
    $gid = isset($in['gid']) && is_string($in['gid']) && preg_match('/^[a-f0-9]{12}$/', $in['gid']) === 1 ? $in['gid'] : '';
    $seen = array_values(array_filter((array) ($db['g'] ?? []), static function ($e) use ($now): bool {
        return is_array($e) && $now - (int) ($e[1] ?? 0) < 86400;
    }));
    $dupe = $gid === '' || count(array_filter($seen, static function ($e) use ($gid): bool { return ($e[0] ?? '') === $gid; })) > 0;
    if ($mine >= 15 || $dupe) {
        hj_save($sfh, ['l' => $list, 'r' => $rate, 'g' => $seen]);
        hj_out(['ok' => false]);
    }
    $wave = max(0, min(999, (int) ($in['w'] ?? 0)));
    $pls = is_array($in['p'] ?? null) ? array_slice($in['p'], 0, 8) : [];
    // Plausibilität: höchstens Welle 60, je Spieler höchstens Welle × 150 Kills.
    $implausible = $wave > 60;
    foreach ($pls as $p) {
        if (is_array($p) && (int) ($p['k'] ?? 0) > $wave * 150) {
            $implausible = true;
        }
    }
    if ($implausible) {
        hj_save($sfh, ['l' => $list, 'r' => $rate, 'g' => $seen]);
        hj_out(['ok' => false, 'err' => 'Ergebnis nicht plausibel.'], 422);
    }
    $mp = count($pls) > 1;
    $d = date('j.n.y', $now);
    foreach ($pls as $p) {
        if (!is_array($p)) {
            continue;
        }
        $k = max(0, min(99999, (int) ($p['k'] ?? 0)));
        $h = max(0, min($k, (int) ($p['h'] ?? 0)));
        $list[] = ['n' => hj_clean_name(hj_name($p['n'] ?? '')), 'w' => $wave, 'k' => $k, 'h' => $h, 'mp' => $mp, 'd' => $d];
    }
    usort($list, static function (array $a, array $b): int {
        return [(int) ($b['w'] ?? 0), (int) ($b['k'] ?? 0)] <=> [(int) ($a['w'] ?? 0), (int) ($a['k'] ?? 0)];
    });
    $rate[] = [$who, $now];
    $seen[] = [$gid, $now];
    hj_save($sfh, ['l' => array_slice($list, 0, 300), 'r' => $rate, 'g' => $seen]);
    hj_out(['ok' => true]);
}
$id = isset($in['id']) && is_string($in['id']) ? strtoupper($in['id']) : '';
if (in_array($action, ['poll', 'signal', 'close'], true) && preg_match('/^[A-Z]{4}$/', $id) !== 1) {
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
        $list[] = ['id' => $lobby['id'], 'name' => $lobby['name'], 'n' => (int) $lobby['n'], 'run' => (bool) $lobby['run'], 'gm' => (string) ($lobby['gm'] ?? 'z')];
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
        $name = hj_lobby_name(hj_name($in['name'] ?? ''));
        // Spielmodus der Lobby: z = Zombies (Koop), dm = Deathmatch, gg = GunGame
        $gm = isset($in['gm']) && in_array($in['gm'], ['z', 'dm', 'gg'], true) ? $in['gm'] : 'z';
        $db['l'][$new] = ['id' => $new, 'name' => $name, 'host' => $pid, 'n' => 1, 'run' => false, 'seen' => $now, 'q' => [], 'gm' => $gm];
        $res = ['id' => $new, 'name' => $name];
    }
} elseif (!isset($db['l'][$id])) {
    $res = ['gone' => true];
} elseif ($action === 'poll') {
    if ($db['l'][$id]['host'] === $pid) {
        $db['l'][$id]['seen'] = $now;
        $db['l'][$id]['n'] = max(1, min(20, (int) ($in['n'] ?? 1)));
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
