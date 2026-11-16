<?php
declare(strict_types=1);

// „Der Boden ist gekündigt“ – Raumliste und WebRTC-Verbindungsaufbau (Signalisierung).
// Gleiches Prinzip wie bei Rüdiger (speed/api.php): Der Browser des Raum-Erstellers ist der Host,
// die Spieldaten laufen direkt zwischen den Browsern. Hier liegen nur kurzlebige Raumeinträge
// und die Ausgabe befristeter TURN-Zugangsdaten. Kein Login, keine Cookies, keine Session.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const MG_MAX_ROOMS = 40;    // gleichzeitig offene Räume
const MG_ROOM_TTL = 25;     // Sekunden ohne Lebenszeichen des Hosts
const MG_MSG_TTL = 40;      // Sekunden, die eine Signalnachricht abholbar bleibt
const MG_MAX_MSGS = 120;    // wartende Signalnachrichten je Raum (48 Gäste können fast gleichzeitig kommen)
const MG_MAX_SDP = 12000;   // Zeichen je Verbindungsbeschreibung
const MG_MAX_PLAYERS = 48;
const MG_ICE_TTL = 21600;   // Gültigkeit der TURN-Zugangsdaten in Sekunden
const MG_ICE_CACHE = 3600;  // so lange wird ein Satz Zugangsdaten weitergegeben
const MG_GUARD = "<?php http_response_code(403); exit; ?>\n";

function mg_out(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function mg_name($value): string
{
    $s = is_string($value) ? $value : '';
    $s = preg_replace('/[\x00-\x1f<>]/u', '', $s);
    $s = trim(is_string($s) ? $s : '');
    $s = preg_match('/^.{0,14}/us', $s, $m) === 1 ? trim($m[0]) : '';
    return $s !== '' ? $s : 'Kran ' . random_int(10, 99);
}

// Liest eine gesperrte Datei „PHP-Abbruchzeile + JSON“.
function mg_guarded(string $file): ?array
{
    $txt = @file_get_contents($file);
    if (!is_string($txt) || ($nl = strpos($txt, "\n")) === false) {
        return null;
    }
    $j = json_decode(substr($txt, $nl + 1), true);
    return is_array($j) ? $j : null;
}

function mg_tidy_ice($list): array
{
    $servers = [];
    foreach ((array) $list as $srv) {
        if (!is_array($srv) || empty($srv['urls'])) {
            continue;
        }
        // Port 53 blockieren Browser ohnehin: weglassen
        $urls = array_values(array_filter((array) $srv['urls'], static function ($u): bool {
            return is_string($u) && preg_match('/^(stun|turn|turns):/', $u) === 1 && strpos($u, ':53?') === false && substr($u, -3) !== ':53';
        }));
        if ($urls) {
            $servers[] = array_filter(['urls' => $urls, 'username' => $srv['username'] ?? null, 'credential' => $srv['credential'] ?? null]);
        }
    }
    return $servers;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    mg_out(['err' => 'Nur POST erlaubt.'], 405);
}
$raw = file_get_contents('php://input', false, null, 0, 20000);
$in = json_decode(is_string($raw) && $raw !== '' ? $raw : '{}', true);
if (!is_array($in)) {
    mg_out(['err' => 'Ungültige Anfrage.'], 400);
}
$action = isset($_GET['a']) && is_string($_GET['a']) ? $_GET['a'] : '';
if (!in_array($action, ['list', 'create', 'poll', 'signal', 'close', 'ice'], true)) {
    mg_out(['err' => 'Unbekannte Aktion.'], 400);
}
$tok = isset($in['tok']) && is_string($in['tok']) ? $in['tok'] : '';
if (preg_match('/^[a-f0-9]{32}$/', $tok) !== 1) {
    mg_out(['err' => 'Ungültiges Token.'], 400);
}
$pid = substr(hash('sha256', $tok), 0, 12);

$dir = __DIR__ . '/data';
if (!is_dir($dir)) {
    @mkdir($dir, 0700, true);
}
if (!is_file($dir . '/.htaccess')) {
    @file_put_contents($dir . '/.htaccess', "Require all denied\n");
}

// Befristete TURN-Zugangsdaten (Cloudflare). Der dauerhafte Schlüssel bleibt auf dem Server:
// eigener Eintrag in data/turn.php oder der bestehende von Rüdiger (speed/data/turn.php), den das
// Deployment aus den Secrets CF_TURN_ID / CF_TURN_KEY schreibt.
if ($action === 'ice') {
    $cache = $dir . '/turncache.php';
    $c = mg_guarded($cache);
    if ($c !== null && time() - (int) ($c['t'] ?? 0) < MG_ICE_CACHE && !empty($c['s'])) {
        mg_out(['ice' => $c['s']]);
    }
    $cfg = mg_guarded($dir . '/turn.php') ?? mg_guarded(dirname(__DIR__) . '/speed/data/turn.php');
    $servers = [];
    if (is_array($cfg) && !empty($cfg['id']) && !empty($cfg['key']) && preg_match('/^[A-Za-z0-9_-]{8,128}$/', (string) $cfg['id']) === 1) {
        $ctx = stream_context_create(['http' => [
            'method' => 'POST', 'timeout' => 5, 'ignore_errors' => true,
            'header' => "Authorization: Bearer " . $cfg['key'] . "\r\nContent-Type: application/json\r\n",
            'content' => json_encode(['ttl' => MG_ICE_TTL]),
        ]]);
        $r = @file_get_contents('https://rtc.live.cloudflare.com/v1/turn/keys/' . $cfg['id'] . '/credentials/generate-ice-servers', false, $ctx);
        $j = is_string($r) ? json_decode($r, true) : null;
        $servers = mg_tidy_ice(is_array($j) ? ($j['iceServers'] ?? []) : []);
    } elseif (is_string($issuer = getenv('MYGROUND_ICE_ISSUER')) && preg_match('#^https://#', $issuer) === 1) {
        // Nur für lokale Tests ohne eigenen Schlüssel: eine andere Ausgabestelle befristeter Zugangsdaten fragen.
        $ctx = stream_context_create(['http' => ['method' => 'POST', 'timeout' => 6, 'ignore_errors' => true,
            'header' => "Content-Type: application/json\r\n", 'content' => json_encode(['tok' => bin2hex(random_bytes(16))])]]);
        $r = @file_get_contents($issuer, false, $ctx);
        $j = is_string($r) ? json_decode($r, true) : null;
        $servers = mg_tidy_ice(is_array($j) ? ($j['ice'] ?? []) : []);
    }
    if ($servers) {
        @file_put_contents($cache, MG_GUARD . json_encode(['t' => time(), 's' => $servers]), LOCK_EX);
    }
    mg_out(['ice' => $servers]);
}

$id = isset($in['id']) && is_string($in['id']) ? strtoupper($in['id']) : '';
if (in_array($action, ['poll', 'signal', 'close'], true) && preg_match('/^[A-Z]{4}$/', $id) !== 1) {
    mg_out(['err' => 'Ungültiger Raumcode.'], 400);
}

// Speicher: eine Datei, exklusiv gesperrt. Der Ordner ist per .htaccess gesperrt,
// die Datei beginnt zusätzlich mit einem PHP-Abbruch.
$fh = @fopen($dir . '/rooms.php', 'c+');
if ($fh === false || !flock($fh, LOCK_EX)) {
    mg_out(['err' => 'Speicher nicht verfügbar.'], 500);
}
$txt = (string) stream_get_contents($fh);
$nl = strpos($txt, "\n");
$db = $nl === false ? null : json_decode(substr($txt, $nl + 1), true);
if (!is_array($db) || !isset($db['l']) || !is_array($db['l'])) {
    $db = ['l' => []];
}

$now = time();
foreach ($db['l'] as $key => $room) {
    if (!is_array($room) || $now - (int) ($room['seen'] ?? 0) > MG_ROOM_TTL) {
        unset($db['l'][$key]);
        continue;
    }
    $queue = [];
    foreach ((array) ($room['q'] ?? []) as $msg) {
        if (is_array($msg) && $now - (int) ($msg['t'] ?? 0) <= MG_MSG_TTL) {
            $queue[] = $msg;
        }
    }
    $db['l'][$key]['q'] = $queue;
}

$res = ['ok' => true];

if ($action === 'list') {
    $list = [];
    foreach ($db['l'] as $room) {
        $list[] = ['id' => $room['id'], 'name' => $room['name'], 'n' => (int) $room['n'], 'run' => (bool) $room['run']];
    }
    $res = ['ls' => $list, 'max' => MG_MAX_PLAYERS];
} elseif ($action === 'create') {
    foreach ($db['l'] as $key => $room) {
        if ($room['host'] === $pid) {
            unset($db['l'][$key]);
        }
    }
    if (count($db['l']) >= MG_MAX_ROOMS) {
        $res = ['err' => 'Zu viele offene Baustellen. Bitte einer bestehenden beitreten.'];
    } else {
        do {
            $new = '';
            for ($i = 0; $i < 4; $i++) {
                $new .= 'ABCDEFGHJKLMNPQRSTUVWXYZ'[random_int(0, 23)];
            }
        } while (isset($db['l'][$new]));
        $name = mg_name($in['name'] ?? '');
        $db['l'][$new] = ['id' => $new, 'name' => $name, 'host' => $pid, 'n' => 1, 'run' => false, 'seen' => $now, 'q' => []];
        $res = ['id' => $new, 'name' => $name];
    }
} elseif (!isset($db['l'][$id])) {
    $res = ['gone' => true];
} elseif ($action === 'poll') {
    if ($db['l'][$id]['host'] === $pid) {
        $db['l'][$id]['seen'] = $now;
        $db['l'][$id]['n'] = max(1, min(MG_MAX_PLAYERS, (int) ($in['n'] ?? 1)));
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
        $to = '';   // Gäste dürfen nur dem Host schreiben, nur der Host den Gästen
    }
    $sdp = isset($in['data']['sdp']) && is_array($in['data']['sdp']) ? $in['data']['sdp'] : null;
    $type = is_array($sdp) && isset($sdp['type']) && is_string($sdp['type']) ? $sdp['type'] : '';
    $body = is_array($sdp) && isset($sdp['sdp']) && is_string($sdp['sdp']) ? $sdp['sdp'] : '';
    $wanted = $pid === $host ? 'answer' : 'offer';
    if ($to === '' || $to === $pid || $type !== $wanted || $body === '' || strlen($body) > MG_MAX_SDP) {
        $res = ['err' => 'Ungültige Signalnachricht.'];
    } elseif (count($db['l'][$id]['q']) >= MG_MAX_MSGS) {
        $res = ['err' => 'Die Baustelle ist gerade überlaufen. Bitte gleich noch einmal versuchen.'];
    } else {
        $db['l'][$id]['q'][] = ['to' => $to, 'from' => $pid, 't' => $now, 'data' => ['sdp' => ['type' => $type, 'sdp' => $body]]];
    }
} elseif ($action === 'close') {
    if ($db['l'][$id]['host'] === $pid) {
        unset($db['l'][$id]);
    }
}

ftruncate($fh, 0);
rewind($fh);
fwrite($fh, MG_GUARD . json_encode($db, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
fflush($fh);
flock($fh, LOCK_UN);
fclose($fh);
mg_out($res);
