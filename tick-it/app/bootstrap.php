<?php
declare(strict_types=1);

const PROJECT_ROOT = __DIR__ . '/..';
// Schulungs-Hoster haben nicht immer mbstring aktiviert; UTF-8-Fallbacks.
if (!function_exists('mb_strlen')) {
    function mb_strlen(string $value, ?string $encoding = null): int {
        $count = preg_match_all('/./us', $value);
        return $count === false ? strlen($value) : $count;
    }
}
if (!function_exists('mb_substr')) {
    function mb_substr(string $value, int $start, ?int $length = null, ?string $encoding = null): string {
        $parts = preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY);
        return $parts === false ? substr($value,$start,$length) : implode('',array_slice($parts,$start,$length));
    }
}
if (!function_exists('mb_strtolower')) {
    function mb_strtolower(string $value, ?string $encoding = null): string { return strtolower($value); }
}
$configFile = PROJECT_ROOT . '/config.local.php';
if (!is_file($configFile)) {
    if (PHP_SAPI !== 'cli') { http_response_code(503); echo 'Konfiguration fehlt. Bitte README befolgen.'; exit; }
    throw new RuntimeException('config.local.php fehlt');
}
$GLOBALS['config'] = require $configFile;
function cfg(string $group, string $key, mixed $default = null): mixed { return $GLOBALS['config'][$group][$key] ?? $default; }
function secure_request(): bool {
    return (($_SERVER['HTTPS'] ?? '') === 'on') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
}
if (PHP_SAPI !== 'cli') {
    if (cfg('app','https_required',true) && !secure_request()) {
        http_response_code(403); header('Content-Type: text/plain; charset=utf-8');
        exit('HTTPS ist für diese Anwendung erforderlich.');
    }
    ini_set('session.use_strict_mode','1');
    ini_set('session.use_only_cookies','1');
    ini_set('session.cookie_httponly','1');
    session_name('ithelpdesk_sid');
    session_set_cookie_params([
        'lifetime' => 0, 'path' => '/tick-it/', 'secure' => secure_request(),
        'httponly' => true, 'samesite' => 'Lax',
    ]);
    session_start();
}

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(cfg('db','dsn'), cfg('db','user'), cfg('db','password'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET time_zone = '+00:00'",
        ]);
    }
    return $pdo;
}
function sql(string $query, array $params = []): PDOStatement {
    $s = db()->prepare($query); $s->execute($params); return $s;
}
function one(string $query, array $params = []): ?array { $r = sql($query,$params)->fetch(); return $r === false ? null : $r; }
function many(string $query, array $params = []): array { return sql($query,$params)->fetchAll(); }
function app_error(string $message, int $http=400): never { throw new HttpError($message,$http); }
class HttpError extends RuntimeException {
    public function __construct(string $message, public readonly int $httpStatus = 400) { parent::__construct($message); }
}
function require_fields(array $input, array $fields): void {
    foreach ($fields as $key) if (!array_key_exists($key,$input)) app_error('Pflichtfeld fehlt: '.$key);
}
function field_string(array $d, string $key, int $max, int $min = 1): string {
    $v = trim((string)($d[$key] ?? ''));
    $length = mb_strlen($v, 'UTF-8');
    if ($length < $min || $length > $max) app_error("$key: $min bis $max Zeichen erforderlich.");
    return $v;
}
function positive_id(mixed $v): int {
    if (!is_scalar($v) || !ctype_digit((string)$v) || (int)$v < 1) app_error('Ungültige ID.');
    return (int)$v;
}
function in_enum(mixed $value, array $allowed): string {
    if (!is_string($value) || !in_array($value,$allowed,true)) app_error('Ungültige Auswahl.');
    return $value;
}
function random_token(int $bytes = 32): string { return bin2hex(random_bytes($bytes)); }
function csrf(): string { return $_SESSION['csrf'] ??= random_token(); }
function verify_csrf(): void {
    $sent = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['_csrf'] ?? ''));
    if ($sent === '' || !hash_equals(csrf(), $sent)) app_error('Sicherheitsprüfung fehlgeschlagen. Seite neu laden.',419);
}
function auth(): ?array {
    if (!empty($_SESSION['admin_id'])) {
        $last = (int)($_SESSION['last_active'] ?? 0);
        if (time() - $last > cfg('app','admin_idle_minutes',30)*60) {
            unset($_SESSION['admin_id']);
            return null;
        }
        $admin = one('SELECT id,username FROM admins WHERE id=?',[ (int)$_SESSION['admin_id'] ]);
        if ($admin) {
            $_SESSION['last_active'] = time();
            return ['kind'=>'admin','id'=>(int)$admin['id'],'name'=>$admin['username'],'role'=>'admin'];
        }
        return null;
    }
    $token = $_SESSION['guest_token'] ?? null;
    if (!is_string($token) || strlen($token) !== 64) return null;
    $guest = one('SELECT g.id,g.display_name,g.role,g.banned_at,g.last_seen_at,s.expires_at,s.revoked_at FROM guests g
       JOIN guest_sessions s ON s.guest_id=g.id WHERE s.token_hash=?',[hash('sha256',$token)]);
    if (!$guest || $guest['banned_at'] || $guest['revoked_at'] || strtotime($guest['expires_at']) < time()) {
        unset($_SESSION['guest_token']); return null;
    }
    if (strtotime($guest['last_seen_at']) < time()-30) {
        sql('UPDATE guests SET last_seen_at=UTC_TIMESTAMP() WHERE id=?',[$guest['id']]);
    }
    return ['kind'=>'guest','id'=>(int)$guest['id'],'name'=>$guest['display_name'],'role'=>$guest['role']];
}
function must_auth(): array { return auth() ?? app_error('Bitte erneut anmelden.',401); }
function must_admin(): array { $a=must_auth(); if ($a['role'] !== 'admin') app_error('Keine Administratorberechtigung.',403); return $a; }
function must_role(string $role): array { $a=must_auth(); if ($a['role'] !== $role) app_error('Keine Berechtigung.',403); return $a; }
function actor_kind(array $a): string { return $a['role']==='admin'?'admin':$a['role']; }
function history(int $id, array $actor, string $action, ?string $old=null, ?string $new=null): void {
    sql('INSERT INTO ticket_history (ticket_id,actor_kind,actor_guest_id,actor_admin_id,action,old_value,new_value)
       VALUES (?,?,?,?,?,?,?)',[$id,actor_kind($actor),$actor['kind']==='guest'?$actor['id']:null,$actor['kind']==='admin'?$actor['id']:null,$action,$old,$new]);
}
function audit(array $admin, string $action, ?string $type=null, ?int $target=null, ?string $details=null): void {
    sql('INSERT INTO audit_log (admin_id,action,target_type,target_id,details) VALUES (?,?,?,?,?)',[$admin['id'],$action,$type,$target,$details]);
}
function record_event(int $tid, array $actor, string $event): void {
    sql('INSERT INTO ticket_messages (ticket_id,sender_kind,sender_guest_id,sender_admin_id,message_type,body)
    VALUES (?,?,?,?,?,?)',[$tid,actor_kind($actor),$actor['kind']==='guest'?$actor['id']:null,$actor['kind']==='admin'?$actor['id']:null,'event',$event]);
}
function throttle(string $scope, string $identity, int $max, int $windowSeconds): void {
    $hash = hash('sha256',$identity);
    $minutes = max(1,(int)ceil($windowSeconds/60));
    $recent = one("SELECT COUNT(*) AS n FROM rate_limits WHERE scope=? AND identity_hash=? AND happened_at >= UTC_TIMESTAMP() - INTERVAL $minutes MINUTE",[$scope,$hash]);
    if ((int)$recent['n'] >= $max) app_error('Zu viele Versuche. Bitte später erneut versuchen.',429);
    sql('INSERT INTO rate_limits (scope,identity_hash) VALUES (?,?)',[$scope,$hash]);
    // Alte Limit-Datensätze sporadisch bereinigen.
    if (random_int(1,150) === 1) sql('DELETE FROM rate_limits WHERE happened_at < UTC_TIMESTAMP() - INTERVAL 2 DAY');
}
function ticket_access(int $id, array $actor, bool $forUpdate=false): array {
    // Lock nur die Ticket-Zeile. LEFT JOINs unter FOR UPDATE wären unnötig breit.
    if ($forUpdate && !one('SELECT id FROM tickets WHERE id=? FOR UPDATE',[$id])) app_error('Ticket nicht gefunden.',404);
    $t=one('SELECT t.*,c.name AS category_name,g.display_name AS customer_name,s.display_name AS supporter_name
       FROM tickets t JOIN categories c ON c.id=t.category_id
       LEFT JOIN guests g ON g.id=t.customer_id LEFT JOIN guests s ON s.id=t.assigned_supporter_id
       WHERE t.id=?',[$id]);
    if (!$t) app_error('Ticket nicht gefunden.',404);
    if ($actor['role']==='admin') return $t;
    if (!(int)$t['is_published']) app_error('Ticket nicht gefunden.',404);
    if ($actor['role']==='customer' && (int)$t['customer_id']===$actor['id']) return $t;
    if ($actor['role']==='supporter' && ((int)$t['assigned_supporter_id']===$actor['id'] ||
       ($t['assigned_supporter_id']===null && in_array($t['status'],['new','open'],true)))) return $t;
    app_error('Du hast keinen Zugriff auf dieses Ticket.',403);
}
function require_assignee(array $t, array $actor): void {
    if ($actor['role']==='admin') return;
    if ($actor['role']!=='supporter' || (int)$t['assigned_supporter_id'] !== $actor['id']) app_error('Bitte Ticket zuerst übernehmen.',403);
}
function ticket_no(int $id): string { return 'TCK-'.gmdate('Y').'-'.str_pad((string)$id,5,'0',STR_PAD_LEFT); }
function bool_json(mixed $v): bool { return $v===true || $v===1 || $v==='1'; }
function valid_category(mixed $id): int {
    $id=positive_id($id);
    if (!one('SELECT id FROM categories WHERE id=? AND is_active=1',[$id])) app_error('Kategorie nicht verfügbar.');
    return $id;
}
function json_response(mixed $data, int $http=200): never {
    http_response_code($http); header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok'=>true,'data'=>$data],JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
