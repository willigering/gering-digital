<?php
// DAU TO PRO Lernkonten: Registrierung mit Benutzername + Passwort (keine E-Mail),
// Wiederherstellungscode statt Passwort-Mail, unsichtbarer Spamschutz und
// serverseitige Speicherung des Lernfortschritts der HTML-Lernmodule.
declare(strict_types=1);
require_once __DIR__.'/lib.php';
require_once __DIR__.'/html_project_lib.php';

const LEARNER_SESSION_KEY='dtp_learner';
const LEARNER_COOKIE='dtp_remember';
const LEARNER_REMEMBER_DAYS=30;
const LEARNER_KEY_MAX=200;              // Zeichen pro Speicherschlüssel
const LEARNER_VALUE_MAX=262144;         // 256 KB pro Eintrag
const LEARNER_D1_REVIEW_MAX=1048576;    // acht D1-Prüfungen samt Eingaben und Lösungswegen
const LEARNER_TOTAL_MAX=5242880;        // 5 MB pro Konto
const LEARNER_KEYS_MAX=2000;            // Einträge pro Konto
const LEARNER_FORM_MIN_SECONDS=3;       // menschliche Mindestzeit für Formulare
const LEARNER_FORM_MAX_SECONDS=7200;
const LEARNER_SYNC_PREFIX='dtp-sync:';  // eigene Hilfsschlüssel im Browser, werden nie gespeichert
const LEARNER_RESERVED=['admin','administrator','root','system','support','moderator','mod','gering','geringdigital','gering-digital','willigering','dau','dautopro','dau-to-pro','daupro','gast','guest','test','null','undefined','konto','info','kontakt','webmaster','hostmaster','postmaster','security','abuse'];

final class LearnerError extends RuntimeException {}

function learner_now(): string { return gmdate('Y-m-d H:i:s'); }

/** Server-side secret for HMACs (IP buckets, form tokens). Created once, stored in settings. */
function learner_secret(): string {
    static $secret=null;
    if ($secret!==null) return $secret;
    $db=db();
    $db->prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('learner.secret',?)")->execute([bin2hex(random_bytes(32))]);
    $secret=(string)$db->query("SELECT value FROM settings WHERE key='learner.secret'")->fetchColumn();
    return $secret;
}
function learner_hmac(string $data): string { return hash_hmac('sha256',$data,learner_secret()); }
function learner_client_ip(): string { return (string)($_SERVER['REMOTE_ADDR']??'cli'); }

// ---------------------------------------------------------------- Spamschutz & Limits
/** Time-signed hidden form field: bots that submit instantly (or replay very old pages) fail. */
function learner_form_token(?int $time=null): string {
    $time=$time??time();
    return $time.'.'.substr(learner_hmac('form|'.$time),0,32);
}
function learner_form_token_ok(string $token,?int $now=null): bool {
    $now=$now??time();
    if (!preg_match('/^(\d{9,11})\.([a-f0-9]{32})$/D',$token,$m)) return false;
    if (!hash_equals(substr(learner_hmac('form|'.$m[1]),0,32),$m[2])) return false;
    $age=$now-(int)$m[1];
    return $age>=LEARNER_FORM_MIN_SECONDS && $age<=LEARNER_FORM_MAX_SECONDS;
}
/** Invisible checks for public forms: honeypot field must stay empty, time token must be valid. */
function learner_spam_check(array $post): void {
    if (trim((string)($post['website']??''))!=='' || !learner_form_token_ok((string)($post['ft']??''))) {
        learner_rate_add('spam','ip:'.learner_client_ip());
        throw new LearnerError('Das hat nicht geklappt. Bitte lade die Seite neu und versuche es noch einmal.');
    }
}
function learner_rate_bucket(string $action,string $subject): string { return $action.':'.substr(learner_hmac(mb_strtolower($subject,'UTF-8')),0,40); }
function learner_rate_count(string $action,string $subject,int $window): int {
    $q=db()->prepare('SELECT COUNT(*) FROM learner_attempts WHERE bucket=? AND created_at>?');
    $q->execute([learner_rate_bucket($action,$subject),time()-$window]);
    return (int)$q->fetchColumn();
}
function learner_rate_add(string $action,string $subject): void {
    $db=db();
    $db->prepare('INSERT INTO learner_attempts(bucket,created_at) VALUES(?,?)')->execute([learner_rate_bucket($action,$subject),time()]);
    // Nothing older than a day is needed; keeps the table tiny. Only hashes are stored, never IPs.
    $db->prepare('DELETE FROM learner_attempts WHERE created_at<?')->execute([time()-86400]);
}
function learner_rate_guard(string $action,string $subject,int $limit,int $window,string $message): void {
    if (learner_rate_count($action,$subject,$window)>=$limit) throw new LearnerError($message);
}

// ---------------------------------------------------------------- Validierung
function learner_clean_username(string $username): string { return trim($username); }
function learner_validate_username(string $username): void {
    if (!preg_match('/^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,22})[A-Za-z0-9]$/D',$username))
        throw new LearnerError('Benutzername: 3 bis 24 Zeichen, nur Buchstaben (ohne Umlaute), Ziffern sowie . _ - und nicht am Anfang oder Ende ein Sonderzeichen.');
    if (preg_match('/[._-]{2}/',$username)) throw new LearnerError('Benutzername: keine zwei Sonderzeichen direkt hintereinander.');
    if (in_array(strtolower($username),LEARNER_RESERVED,true)) throw new LearnerError('Dieser Benutzername ist reserviert. Bitte wähle einen anderen.');
}
function learner_validate_password(string $password,string $confirm,string $username): void {
    $length=mb_strlen($password,'UTF-8');
    if ($length<10) throw new LearnerError('Das Passwort muss mindestens 10 Zeichen lang sein.');
    if ($length>200) throw new LearnerError('Das Passwort darf höchstens 200 Zeichen lang sein.');
    if (!hash_equals($password,$confirm)) throw new LearnerError('Die beiden Passwörter stimmen nicht überein.');
    if (strcasecmp($password,$username)===0 || (stripos($password,$username)!==false && mb_strlen($username)>=4 && $length-mb_strlen($username)<4))
        throw new LearnerError('Das Passwort darf nicht (fast) dem Benutzernamen entsprechen.');
    if (count(array_unique(mb_str_split($password,1,'UTF-8')))<4) throw new LearnerError('Das Passwort ist zu einfach. Bitte nimm mehr verschiedene Zeichen.');
}

// ---------------------------------------------------------------- Wiederherstellungscode
const LEARNER_CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O, 1/I verwechselbar
function learner_new_code(): string {
    $chars='';
    for ($i=0;$i<12;$i++) $chars.=LEARNER_CODE_ALPHABET[random_int(0,strlen(LEARNER_CODE_ALPHABET)-1)];
    return 'DTP-'.implode('-',str_split($chars,4));
}
function learner_normalize_code(string $code): ?string {
    $plain=strtoupper(preg_replace('/[^A-Za-z0-9]/','',$code)??'');
    if (str_starts_with($plain,'DTP')) $plain=substr($plain,3);
    if (!preg_match('/^['.LEARNER_CODE_ALPHABET.']{12}$/D',$plain)) return null;
    return 'DTP-'.implode('-',str_split($plain,4));
}

// ---------------------------------------------------------------- Konten
function learner_find(string $username): ?array {
    $q=db()->prepare('SELECT * FROM learners WHERE username=? COLLATE NOCASE');
    $q->execute([$username]);
    return $q->fetch(PDO::FETCH_ASSOC)?:null;
}
function learner_by_id(int $id): ?array {
    $q=db()->prepare('SELECT * FROM learners WHERE id=?');
    $q->execute([$id]);
    return $q->fetch(PDO::FETCH_ASSOC)?:null;
}
/** @return array{0:array,1:string} learner row and the plain recovery code (shown exactly once) */
function learner_register(string $username,string $password,string $confirm): array {
    $username=learner_clean_username($username);
    $ip=learner_client_ip();
    learner_rate_guard('register','ip:'.$ip,5,3600,'Von diesem Anschluss wurden gerade schon mehrere Konten angelegt. Bitte versuche es in einer Stunde noch einmal.');
    learner_rate_guard('spam','ip:'.$ip,10,3600,'Zu viele ungültige Versuche. Bitte versuche es in einer Stunde noch einmal.');
    learner_validate_username($username);
    learner_validate_password($password,$confirm,$username);
    if (learner_find($username)) throw new LearnerError('Dieser Benutzername ist leider schon vergeben.');
    $code=learner_new_code();
    try {
        db()->prepare('INSERT INTO learners(username,password_hash,recovery_hash,created_at) VALUES(?,?,?,?)')
            ->execute([$username,password_hash($password,PASSWORD_DEFAULT),password_hash($code,PASSWORD_DEFAULT),learner_now()]);
    } catch (PDOException $error) {
        throw new LearnerError('Dieser Benutzername ist leider schon vergeben.');
    }
    learner_rate_add('register','ip:'.$ip);
    return [learner_find($username),$code];
}
function learner_dummy_verify(string $password): void {
    // Same work for unknown usernames, so response time does not reveal which names exist.
    static $hash=null; $hash??=password_hash('dtp-dummy-password',PASSWORD_DEFAULT);
    password_verify($password,$hash);
}
function learner_login(string $username,string $password,bool $remember=false): array {
    $username=learner_clean_username($username);
    $ip=learner_client_ip();
    $blocked='Zu viele Fehlversuche. Bitte warte 15 Minuten und versuche es dann erneut.';
    learner_rate_guard('login','ip:'.$ip,20,900,$blocked);
    learner_rate_guard('login','user:'.$username,8,900,$blocked);
    $learner=$username!==''?learner_find($username):null;
    if (!$learner) learner_dummy_verify($password);
    if (!$learner || !password_verify($password,$learner['password_hash'])) {
        learner_rate_add('login','ip:'.$ip);
        learner_rate_add('login','user:'.$username);
        throw new LearnerError('Benutzername oder Passwort stimmt nicht.');
    }
    if (password_needs_rehash($learner['password_hash'],PASSWORD_DEFAULT))
        db()->prepare('UPDATE learners SET password_hash=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),$learner['id']]);
    learner_start_session($learner,$remember);
    return $learner;
}
function learner_start_session(array $learner,bool $remember=false): void {
    if (session_status()===PHP_SESSION_ACTIVE && !headers_sent()) session_regenerate_id(true);
    $_SESSION[LEARNER_SESSION_KEY]=['id'=>(int)$learner['id'],'v'=>(int)$learner['session_version']];
    db()->prepare('UPDATE learners SET last_login_at=?,last_seen_at=? WHERE id=?')->execute([learner_now(),learner_now(),$learner['id']]);
    if ($remember) learner_issue_remember((int)$learner['id']);
    learner_current(true);
}
/** The logged-in learner (session, else a valid "Angemeldet bleiben" cookie) or null. */
function learner_current(bool $refresh=false): ?array {
    static $cache=false;
    if ($refresh) $cache=false;
    if ($cache!==false) return $cache;
    $cache=null;
    $session=$_SESSION[LEARNER_SESSION_KEY]??null;
    if (is_array($session)) {
        $learner=learner_by_id((int)($session['id']??0));
        if ($learner && (int)$learner['session_version']===(int)($session['v']??-1)) {
            $cache=$learner;
            // Touch at most every 10 minutes.
            if (strtotime((string)($learner['last_seen_at']??'').' UTC')<time()-600)
                db()->prepare('UPDATE learners SET last_seen_at=? WHERE id=?')->execute([learner_now(),$learner['id']]);
            return $cache;
        }
        unset($_SESSION[LEARNER_SESSION_KEY]);
    }
    $cookie=(string)($_COOKIE[LEARNER_COOKIE]??'');
    if ($cookie!=='' && preg_match('/^([a-f0-9]{24}):([a-f0-9]{64})$/D',$cookie,$m)) {
        $q=db()->prepare('SELECT * FROM learner_tokens WHERE selector=?');
        $q->execute([$m[1]]);
        $token=$q->fetch(PDO::FETCH_ASSOC);
        if ($token && $token['expires_at']>time() && hash_equals($token['validator_hash'],hash('sha256',$m[2]))) {
            db()->prepare('DELETE FROM learner_tokens WHERE id=?')->execute([$token['id']]); // rotate on every use
            $learner=learner_by_id((int)$token['learner_id']);
            if ($learner) { learner_start_session($learner,true); return learner_current(); }
        } elseif ($token) {
            db()->prepare('DELETE FROM learner_tokens WHERE id=?')->execute([$token['id']]);
        }
        learner_clear_remember_cookie();
    }
    return $cache;
}
function learner_cookie_options(int $expires): array {
    $https=(!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS'])!=='off') || (string)($_SERVER['SERVER_PORT']??'')==='443';
    return ['expires'=>$expires,'path'=>'/','secure'=>$https,'httponly'=>true,'samesite'=>'Lax'];
}
function learner_issue_remember(int $learnerId): void {
    $selector=bin2hex(random_bytes(12));$validator=bin2hex(random_bytes(32));
    $expires=time()+LEARNER_REMEMBER_DAYS*86400;
    $db=db();
    $db->prepare('DELETE FROM learner_tokens WHERE expires_at<?')->execute([time()]);
    $db->prepare('INSERT INTO learner_tokens(learner_id,selector,validator_hash,expires_at) VALUES(?,?,?,?)')->execute([$learnerId,$selector,hash('sha256',$validator),$expires]);
    if (!headers_sent()) setcookie(LEARNER_COOKIE,$selector.':'.$validator,learner_cookie_options($expires));
    $_COOKIE[LEARNER_COOKIE]=$selector.':'.$validator;
}
function learner_clear_remember_cookie(): void {
    if (!headers_sent() && isset($_COOKIE[LEARNER_COOKIE])) setcookie(LEARNER_COOKIE,'',learner_cookie_options(time()-3600));
    unset($_COOKIE[LEARNER_COOKIE]);
}
function learner_logout(): void {
    $cookie=(string)($_COOKIE[LEARNER_COOKIE]??'');
    if (preg_match('/^([a-f0-9]{24}):/',$cookie,$m)) db()->prepare('DELETE FROM learner_tokens WHERE selector=?')->execute([$m[1]]);
    learner_clear_remember_cookie();
    unset($_SESSION[LEARNER_SESSION_KEY]);
    if (session_status()===PHP_SESSION_ACTIVE && !headers_sent()) session_regenerate_id(true);
    learner_current(true);
}
/** Ends every session and "Angemeldet bleiben" of an account (after password changes, admin reset, deletion). */
function learner_revoke_sessions(int $learnerId): void {
    db()->prepare('UPDATE learners SET session_version=session_version+1 WHERE id=?')->execute([$learnerId]);
    db()->prepare('DELETE FROM learner_tokens WHERE learner_id=?')->execute([$learnerId]);
}
/** Password reset with the recovery code. Returns the new recovery code (the old one is used up). */
function learner_recover(string $username,string $code,string $password,string $confirm): string {
    $username=learner_clean_username($username);
    $ip=learner_client_ip();
    $blocked='Zu viele Fehlversuche. Bitte warte eine Stunde und versuche es dann erneut.';
    learner_rate_guard('recover','ip:'.$ip,10,3600,$blocked);
    learner_rate_guard('recover','user:'.$username,5,3600,$blocked);
    $normalized=learner_normalize_code($code);
    $learner=$username!==''?learner_find($username):null;
    if (!$learner) learner_dummy_verify($code);
    if (!$learner || $normalized===null || $learner['recovery_hash']==='' || !password_verify($normalized,$learner['recovery_hash'])) {
        learner_rate_add('recover','ip:'.$ip);
        learner_rate_add('recover','user:'.$username);
        throw new LearnerError('Benutzername oder Wiederherstellungscode stimmt nicht.');
    }
    learner_validate_password($password,$confirm,$learner['username']);
    $newCode=learner_new_code();
    db()->prepare('UPDATE learners SET password_hash=?,recovery_hash=? WHERE id=?')
        ->execute([password_hash($password,PASSWORD_DEFAULT),password_hash($newCode,PASSWORD_DEFAULT),$learner['id']]);
    learner_revoke_sessions((int)$learner['id']);
    learner_start_session(learner_by_id((int)$learner['id']));
    return $newCode;
}
function learner_require_password(array $learner,string $password): void {
    learner_rate_guard('confirm','user:'.$learner['username'],8,900,'Zu viele Fehlversuche. Bitte warte 15 Minuten.');
    if (!password_verify($password,(string)learner_by_id((int)$learner['id'])['password_hash'])) {
        learner_rate_add('confirm','user:'.$learner['username']);
        throw new LearnerError('Das aktuelle Passwort stimmt nicht.');
    }
}
function learner_change_password(array $learner,string $current,string $password,string $confirm): void {
    learner_require_password($learner,$current);
    learner_validate_password($password,$confirm,$learner['username']);
    db()->prepare('UPDATE learners SET password_hash=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),$learner['id']]);
    learner_revoke_sessions((int)$learner['id']); // other devices are signed out
    learner_start_session(learner_by_id((int)$learner['id']),isset($_COOKIE[LEARNER_COOKIE]));
}
function learner_regenerate_code(array $learner,string $current): string {
    learner_require_password($learner,$current);
    $code=learner_new_code();
    db()->prepare('UPDATE learners SET recovery_hash=? WHERE id=?')->execute([password_hash($code,PASSWORD_DEFAULT),$learner['id']]);
    return $code;
}
function learner_delete_account(array $learner,string $current): void {
    learner_require_password($learner,$current);
    learner_delete((int)$learner['id']);
    learner_logout();
}
/**
 * Gesamten Lernstand auf null: alle Fortschritts-Einträge werden zu Löschmarken (damit andere Geräte sie
 * beim nächsten Öffnen auch entfernen), Achievements, XP, Level, Lerntage und Bestwerte werden gelöscht,
 * die Highscore-Sichtbarkeit wird ausgeschaltet. Das Konto selbst (Name, Passwort, Code) bleibt.
 */
function learner_reset_all(array $learner,string $current): int {
    learner_require_password($learner,$current);
    $id=(int)$learner['id'];$now=learner_now();
    $db=db();
    $db->beginTransaction();
    try {
        $q=$db->prepare("UPDATE learner_progress SET value='',deleted=1,updated_at=? WHERE learner_id=? AND deleted=0");
        $q->execute([$now,$id]);
        $count=$q->rowCount();
        foreach(['learner_xp_events','learner_xp_state','learner_daily','learner_practice','learner_showcase'] as $table) $db->prepare("DELETE FROM $table WHERE learner_id=?")->execute([$id]);
        $db->prepare('DELETE FROM learner_achievements WHERE learner_id=?')->execute([$id]);
        $db->prepare('INSERT OR IGNORE INTO learner_stats(learner_id) VALUES(?)')->execute([$id]);
        $db->prepare("UPDATE learner_stats SET xp=0,level=1,achievements=0,best='{}',days=0,last_day='',highscore_visible=0,xp_changed_at=?,updated_at=? WHERE learner_id=?")
           ->execute([$now,$now,$id]);
        $db->commit();
    } catch (Throwable $error) { $db->rollBack(); throw $error; }
    return $count;
}
function learner_delete(int $learnerId): void {
    $db=db();
    $db->beginTransaction();
    $db->prepare('DELETE FROM learner_progress WHERE learner_id=?')->execute([$learnerId]);
    $db->prepare('DELETE FROM learner_achievements WHERE learner_id=?')->execute([$learnerId]);
    $db->prepare('DELETE FROM learner_stats WHERE learner_id=?')->execute([$learnerId]);
    $db->prepare('DELETE FROM learner_tokens WHERE learner_id=?')->execute([$learnerId]);
    $db->prepare('DELETE FROM learners WHERE id=?')->execute([$learnerId]);
    $db->commit();
}

// ---------------------------------------------------------------- Fortschritt
/** Only live, published DAU TO PRO modules can own progress. */
function learner_module_exists(string $slug): bool {
    if (!hp_valid_slug($slug)) return false;
    $q=db()->prepare("SELECT 1 FROM html_pages WHERE slug=? AND category='lernen' AND published=1");
    $q->execute([$slug]);
    return (bool)$q->fetchColumn();
}
/** @return array{values:array<string,string>,deleted:list<string>} */
function learner_progress_state(int $learnerId): array {
    $q=db()->prepare('SELECT storage_key,value,deleted FROM learner_progress WHERE learner_id=? ORDER BY storage_key');
    $q->execute([$learnerId]);
    $values=[];$deleted=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
        if ((int)$row['deleted']===1) $deleted[]=$row['storage_key']; else $values[$row['storage_key']]=$row['value'];
    }
    return ['values'=>$values,'deleted'=>$deleted];
}
function learner_valid_key(mixed $key): bool {
    return is_string($key) && $key!=='' && strlen($key)<=LEARNER_KEY_MAX && mb_check_encoding($key,'UTF-8')
        && !str_starts_with($key,LEARNER_SYNC_PREFIX);
}
/**
 * Apply a batch from the browser: set = key => value, delete = list of keys (stored as tombstones,
 * so other devices remove them too). Everything or nothing is written.
 */
function learner_progress_apply(int $learnerId,string $slug,array $set,array $delete): void {
    if (!learner_module_exists($slug)) throw new LearnerError('Unbekanntes Lernmodul.');
    if (count($set)+count($delete)>LEARNER_KEYS_MAX) throw new LearnerError('Zu viele Einträge auf einmal.');
    foreach($set as $key=>$value){
        $key=(string)$key;
        if (!learner_valid_key($key)) throw new LearnerError('Ungültiger Speicherschlüssel.');
        if (!is_string($value) || !mb_check_encoding($value,'UTF-8')) throw new LearnerError('Ungültiger Speicherwert.');
        $limit=$slug==='d1-datenschutz' && $key==='d1-dsgvo-exam-v1'?LEARNER_D1_REVIEW_MAX:LEARNER_VALUE_MAX;
        if (strlen($value)>$limit) throw new LearnerError('Ein Eintrag ist größer als '.($limit/1024).' KB.');
    }
    foreach($delete as $key) if (!learner_valid_key($key)) throw new LearnerError('Ungültiger Speicherschlüssel.');
    $db=db();
    $ownsTransaction=!$db->inTransaction();
    if($ownsTransaction)$db->beginTransaction();
    try {
        $now=learner_now();
        $upsert=$db->prepare('INSERT INTO learner_progress(learner_id,storage_key,module_slug,value,deleted,updated_at) VALUES(?,?,?,?,0,?)
            ON CONFLICT(learner_id,storage_key) DO UPDATE SET module_slug=excluded.module_slug,value=excluded.value,deleted=0,updated_at=excluded.updated_at');
        foreach($set as $key=>$value) $upsert->execute([$learnerId,(string)$key,$slug,$value,$now]);
        $tomb=$db->prepare("UPDATE learner_progress SET value='',deleted=1,updated_at=?,module_slug=? WHERE learner_id=? AND storage_key=? AND deleted=0");
        foreach($delete as $key) $tomb->execute([$now,$slug,$learnerId,$key]);
        $q=$db->prepare('SELECT SUM(deleted=0),COALESCE(SUM(CASE WHEN deleted=0 THEN length(CAST(value AS BLOB))+length(CAST(storage_key AS BLOB)) END),0),COUNT(*) FROM learner_progress WHERE learner_id=?');
        $q->execute([$learnerId]);
        [$keys,$bytes,$rows]=array_map('intval',$q->fetch(PDO::FETCH_NUM));
        if ($keys>LEARNER_KEYS_MAX) throw new LearnerError('Speichergrenze erreicht: höchstens '.LEARNER_KEYS_MAX.' Einträge pro Konto.');
        if ($bytes>LEARNER_TOTAL_MAX) throw new LearnerError('Speichergrenze erreicht: höchstens 5 MB Lernfortschritt pro Konto.');
        if ($rows>LEARNER_KEYS_MAX*2) { // keep the newest tombstones only
            $db->prepare('DELETE FROM learner_progress WHERE learner_id=? AND deleted=1 AND storage_key IN (SELECT storage_key FROM learner_progress WHERE learner_id=? AND deleted=1 ORDER BY updated_at LIMIT ?)')
               ->execute([$learnerId,$learnerId,$rows-LEARNER_KEYS_MAX*2]);
        }
        if($ownsTransaction)$db->commit();
    } catch (Throwable $error) {
        if($ownsTransaction)$db->rollBack();
        throw $error;
    }
}
/** Per module overview for "Mein Fortschritt" (all published modules, started ones first). */
function learner_progress_summary(int $learnerId): array {
    $q=db()->prepare('SELECT module_slug,COUNT(*) AS entries,MAX(updated_at) AS last_update,SUM(length(CAST(value AS BLOB))) AS bytes FROM learner_progress WHERE learner_id=? AND deleted=0 GROUP BY module_slug');
    $q->execute([$learnerId]);
    $progress=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row) $progress[$row['module_slug']]=$row;
    $modules=db()->query("SELECT slug,title,subject,description,preview_image,preview_fit,preview_x,preview_y,published FROM html_pages WHERE category='lernen' ORDER BY title COLLATE NOCASE")->fetchAll(PDO::FETCH_ASSOC);
    $out=[];
    foreach($modules as $module){
        $p=$progress[$module['slug']]??null;
        unset($progress[$module['slug']]);
        if (!$p && (int)$module['published']!==1) continue;
        $out[]=$module+['entries'=>(int)($p['entries']??0),'last_update'=>$p['last_update']??null,'bytes'=>(int)($p['bytes']??0)];
    }
    foreach($progress as $slug=>$p) // module was removed later: data stays visible and deletable
        $out[]=['slug'=>$slug,'title'=>$slug,'subject'=>'','description'=>'','preview_image'=>'','preview_fit'=>'cover','preview_x'=>50,'preview_y'=>0,'published'=>0,'entries'=>(int)$p['entries'],'last_update'=>$p['last_update'],'bytes'=>(int)$p['bytes']];
    usort($out,fn($a,$b)=>[$b['last_update']!==null,(string)$b['last_update']]<=>[$a['last_update']!==null,(string)$a['last_update']]);
    return $out;
}
function learner_progress_delete_module(int $learnerId,string $slug): int {
    $q=db()->prepare("UPDATE learner_progress SET value='',deleted=1,updated_at=? WHERE learner_id=? AND module_slug=? AND deleted=0");
    $q->execute([learner_now(),$learnerId,$slug]);
    return $q->rowCount();
}
function learner_export(array $learner): array {
    $q=db()->prepare('SELECT module_slug,storage_key,value,updated_at FROM learner_progress WHERE learner_id=? AND deleted=0 ORDER BY module_slug,storage_key');
    $q->execute([$learner['id']]);
    $entries=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row) $entries[]=['modul'=>$row['module_slug'],'schluessel'=>$row['storage_key'],'wert'=>$row['value'],'geaendert_utc'=>$row['updated_at']];
    return ['format'=>'dau-to-pro-lernkonto/1','exportiert_utc'=>learner_now(),'benutzername'=>$learner['username'],
        'konto_erstellt_utc'=>$learner['created_at'],'letzte_anmeldung_utc'=>$learner['last_login_at'],'fortschritt'=>$entries];
}

// ---------------------------------------------------------------- Einbindung in Lernmodule
/** Path from a module file (e.g. "index.html", "kapitel/2.html") back to the site root. */
function learner_root_prefix(string $file): string { return str_repeat('../',substr_count($file===''?'index.html':$file,'/')+1); }
function learner_sync_config(string $slug,string $file): array {
    $learner=learner_current();
    $root=learner_root_prefix($file);
    $config=['v'=>1,'slug'=>$slug,'api'=>$root.'dau-to-pro/api/progress.php','account'=>$root.'dau-to-pro/konto.php?weiter='.rawurlencode($slug),'modules'=>$root.'dau-to-pro/#lernmodule','user'=>null,'cheater'=>$root.'dau-to-pro/api/calculator-cheater.php'];
    if ($learner) {
        $config+=['uid'=>(string)$learner['id'],'csrf'=>csrf(),'data'=>learner_progress_state((int)$learner['id'])];
        $config['user']=$learner['username'];
    }
    return $config;
}
function learner_update_revision(string $version): string {
    return hash('sha256',$version.'|'.(string)@filemtime(__DIR__.'/dau-to-pro/sync.js').'|'.(string)@filemtime(__DIR__.'/dau-to-pro/update-notice.js'));
}
/** Injects the progress sync right at the start of <head>, before any module script runs. */
function learner_inject_sync(string $html,string $slug,string $file,?string $version=null): string {
    // Replace the embedded calculator in already published modules without reimporting them.
    $calc=__DIR__.'/dau-to-pro/module-calculator';
    if (is_file($calc.'.css') && is_file($calc.'.js')) {
        $html=preg_replace_callback(
            '~<!-- DTP-TASCHENRECHNER START -->.*?<!-- DTP-TASCHENRECHNER END -->~s',
            static fn(): string => "<style>".file_get_contents($calc.'.css')."</style>\n<script>".file_get_contents($calc.'.js')."</script>",
            $html, 1
        ) ?? $html;
    }
    // Auch bereits importierte Modulversionen ohne das alte Footer-Logo ausliefern.
    // Nur das Markenbild entfernen; Lernabbildungen und Footer-Texte bleiben erhalten.
    $html=preg_replace_callback('~<footer\b[^>]*>[\s\S]*?</footer>~i', static function(array $m): string {
        return preg_replace('~(<div\b[^>]*class="foot-brand"[^>]*>)\s*<img\b[^>]*>~i', '$1', $m[0]) ?? $m[0];
    }, $html) ?? $html;
    // Gemeinsame Farben auch für bereits importierte Lernmodulversionen.
    if (str_contains($html, 'class="area-tabs"') && !str_contains($html, '<!-- DTP-MODULDESIGN START -->')) {
        $theme=__DIR__.'/tools/module-theme.css';
        if (is_file($theme)) {
            $block="<!-- DTP-MODULDESIGN START -->\n<style>\n".(string)file_get_contents($theme)."\n</style>\n<!-- DTP-MODULDESIGN END -->\n";
            $html=preg_replace_callback('~</head\\s*>~i', static fn(array $m): string => $block.$m[0], $html, 1) ?? $html;
        }
    }
    // Imported versions receive the same exercise focus as standalone modules.
    if (str_contains($html, 'class="area-tabs"') && !str_contains($html, '<!-- DTP-UEBUNGSFOKUS START -->')
        && is_file(__DIR__.'/tools/module-focus.css') && is_file(__DIR__.'/tools/module-focus.js')) {
        $block="<!-- DTP-UEBUNGSFOKUS START -->\n<style>\n".file_get_contents(__DIR__.'/tools/module-focus.css')."\n</style>\n<script>\n"
            .str_ireplace('</script','<\\/script',(string)file_get_contents(__DIR__.'/tools/module-focus.js'))."\n</script>\n<!-- DTP-UEBUNGSFOKUS END -->\n";
        $html=preg_replace_callback('~</head\\s*>~i', static fn(array $m): string => $block.$m[0], $html, 1) ?? $html;
    }
    $html=str_replace('Offline · ohne Login', 'Lernen · Üben · Verstehen', $html);
    // In allen veröffentlichten Lernmodulen denselben Pixelpilz im Browser-Tab zeigen.
    // Auch ältere, bereits importierte HTML-Versionen bringen eigene (oft Base64-)Favicons mit.
    // Diese vor der zentralen Einbindung entfernen; Apple-Touch-Icons bleiben erhalten.
    $html=preg_replace('~<link\\b(?=[^>]*\\brel\\s*=\\s*["\\\'](?:shortcut\\s+)?icon["\\\'])[^>]*>~i', '', $html) ?? $html;
    $json=json_encode(learner_sync_config($slug,$file),JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
    // Achievement-Popup zuerst, damit sync.js es nach dem Speichern aufrufen kann.
    $script=(string)file_get_contents(__DIR__.'/dau-to-pro/achievement-toast.js')."\n".(string)file_get_contents(__DIR__.'/dau-to-pro/sync.js');
    $tag='<link rel="icon" type="image/svg+xml" href="/assets/dau-to-pro-pixelpilz.svg?v=20261103">'."\n"
        ."<script>window.__DTP_SYNC__=$json;</script>\n<script>".str_ireplace('</script','<\/script',$script)."</script>\n";
    // Opt-in-Updatehinweis für jedes veröffentlichte Modul, auch ältere importierte Versionen.
    // Erstes Polling nach DOMContentLoaded, keine automatische Seitenaktualisierung.
    $updateConfig=json_encode([
        'slug'=>$slug,
        'revision'=>$version===null?null:learner_update_revision($version),
        'url'=>learner_root_prefix($file).'dau-to-pro/api/update-version.php'
    ],JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE);
    $updateScript=(string)file_get_contents(__DIR__.'/dau-to-pro/update-notice.js');
    $tag.="<script>window.__DTP_UPDATE__=$updateConfig;</script>\n<script>"
        .str_ireplace('</script','<\\/script',$updateScript)."</script>\n";
    // Auch manuell importierte, ältere Modulversionen erhalten den neuen Einstieg.
    // Erst nach sync.js: ein vom Konto geladener letzter Reiter darf nicht gewinnen.
    if (str_contains($html, 'class="area-tabs"') && !str_contains($html, '<!-- DTP-MODULEINSTIEG START -->')
        && is_file(__DIR__.'/tools/module-entry.js')) {
        $entry=(string)file_get_contents(__DIR__.'/tools/module-entry.js');
        $tag.="<!-- DTP-MODULEINSTIEG START -->\n<script>".str_ireplace('</script','<\\/script',$entry)."</script>\n<!-- DTP-MODULEINSTIEG END -->\n";
    }
    // Desktop hover ends at the question mark. Keyboard focus and touch still open the hint.
    $tag.=<<<'HTML'
<style>
@media (hover: hover) and (pointer: fine) {
    body .qhelp .qtip { pointer-events: none; }
    body .qhelp:not(:hover):not(:focus-visible) .qtip {
        display: none;
        transition: none;
        animation: none;
    }
}
</style>
<script>
document.addEventListener('DOMContentLoaded', () => {
    const task = document.getElementById('practiceTask');
    if (!task) return;

    // The module already decides when a stage is mastered and owns both buttons.
    new MutationObserver(() => {
        const result = task.querySelector('[data-r="res"]');
        const advance = result?.querySelector('button[data-go-stage]');
        const next = task.querySelector('button[data-r="next"]:not([hidden])');
        if (!advance || !next) return;

        const stage = Number(advance.dataset.goStage) + 1;
        const notice = document.createElement('strong');
        notice.textContent = 'Stufe ' + stage + ' freigeschaltet!';
        advance.parentElement.prepend(notice, document.createElement('br'));
        advance.style.removeProperty('margin-left');
        next.classList.replace('primary', 'secondary');
        next.textContent = 'Auf dieser Stufe weiterüben';
        next.before(advance);
        next.parentElement.scrollIntoView({block: 'nearest'});
    }).observe(task, {childList: true, subtree: true});
}, {once: true});
</script>
HTML;
    require_once __DIR__.'/dau-to-pro/feedback-form.php';
    if (DTP_FEEDBACK_ENABLED) {
        $tag.=dtp_feedback_assets();
        $feedback='<div class="dtp-feedback-dock">'.dtp_feedback_button().'</div>'.dtp_feedback_dialog($slug);
        $html=preg_replace_callback('~</body\\s*>~i', static fn(array $m): string => $feedback.$m[0], $html, 1) ?? $html;
    }
    if (preg_match('/<head\b[^>]*>/i',$html,$m,PREG_OFFSET_CAPTURE)) {
        $at=$m[0][1]+strlen($m[0][0]);
        return substr($html,0,$at)."\n".$tag.substr($html,$at);
    }
    if (preg_match('/^\s*<!doctype[^>]*>/i',$html,$m)) return $m[0]."\n".$tag.substr($html,strlen($m[0]));
    return $tag.$html;
}

// ---------------------------------------------------------------- Admin
function learner_admin_list(string $search=''): array {
    $sql='SELECT l.id,l.username,l.created_at,l.last_login_at,l.last_seen_at,
        (SELECT COUNT(*) FROM learner_progress p WHERE p.learner_id=l.id AND p.deleted=0) AS entries,
        (SELECT COUNT(DISTINCT module_slug) FROM learner_progress p WHERE p.learner_id=l.id AND p.deleted=0) AS modules,
        (SELECT MAX(updated_at) FROM learner_progress p WHERE p.learner_id=l.id) AS last_progress,
        COALESCE(s.xp,0) AS xp,COALESCE(s.level,1) AS level,COALESCE(s.achievements,0) AS achievements,
        COALESCE(s.highscore_visible,0) AS highscore_visible,COALESCE(s.highscore_blocked,0) AS highscore_blocked
        FROM learners l LEFT JOIN learner_stats s ON s.learner_id=l.id';
    $params=[];
    if ($search!=='') {$sql.=" WHERE l.username LIKE ? ESCAPE '\\'";$params[]='%'.addcslashes($search,'%_\\').'%';}
    $sql.=' ORDER BY COALESCE(l.last_seen_at,l.created_at) DESC,l.id DESC LIMIT 500';
    $q=db()->prepare($sql);$q->execute($params);
    return $q->fetchAll(PDO::FETCH_ASSOC);
}
function learner_admin_stats(): array {
    $db=db();
    $since=gmdate('Y-m-d H:i:s',time()-30*86400);
    $q=$db->prepare('SELECT COUNT(*) FROM learners WHERE last_seen_at>=?');$q->execute([$since]);
    return ['total'=>(int)$db->query('SELECT COUNT(*) FROM learners')->fetchColumn(),'active'=>(int)$q->fetchColumn(),
        'empty_old'=>count(learner_admin_empty_ids())];
}
/** Accounts without any saved progress that were created over $days ago and not used since (typical spam). */
function learner_admin_empty_ids(int $days=30): array {
    $before=gmdate('Y-m-d H:i:s',time()-$days*86400);
    $q=db()->prepare('SELECT id FROM learners l WHERE created_at<? AND COALESCE(last_seen_at,created_at)<? AND NOT EXISTS(SELECT 1 FROM learner_progress p WHERE p.learner_id=l.id)');
    $q->execute([$before,$before]);
    return array_map('intval',$q->fetchAll(PDO::FETCH_COLUMN));
}
/** Generates a temporary password, signs the learner out everywhere and returns the password (shown once). */
function learner_admin_reset_password(int $learnerId): string {
    if (!learner_by_id($learnerId)) throw new LearnerError('Lernkonto nicht gefunden.');
    $alphabet='abcdefghjkmnpqrstuvwxyz23456789';$parts=[];
    for($p=0;$p<3;$p++){$s='';for($i=0;$i<4;$i++)$s.=$alphabet[random_int(0,strlen($alphabet)-1)];$parts[]=$s;}
    $password=implode('-',$parts);
    db()->prepare('UPDATE learners SET password_hash=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),$learnerId]);
    learner_revoke_sessions($learnerId);
    return $password;
}

// ---------------------------------------------------------------- Anzeige
function learner_format_time(?string $utc): string {
    if (!$utc) return '–';
    try {
        $date=new DateTimeImmutable($utc,new DateTimeZone('UTC'));
        $local=$date->setTimezone(new DateTimeZone('Europe/Berlin'));
        $today=new DateTimeImmutable('today',new DateTimeZone('Europe/Berlin'));
        if ($local>=$today) return 'heute, '.$local->format('H:i').' Uhr';
        if ($local>=$today->modify('-1 day')) return 'gestern, '.$local->format('H:i').' Uhr';
        return $local->format('d.m.Y, H:i').' Uhr';
    } catch (Throwable) { return '–'; }
}
/** Only module slugs are accepted as redirect target (no open redirects). */
function learner_safe_next(string $next): string { return hp_valid_slug($next)?$next:''; }



