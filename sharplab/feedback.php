<?php
declare(strict_types=1);
/**
 * Feedback from the SharpLab Windows app. Uses the same STRATO mail() path as
 * send.php (PHP mail() on the webspace). From is sharplab@geringdigital.de so the
 * sender matches the domain; mail goes to the site inbox (info@geringdigital.de).
 */
require_once __DIR__.'/../lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');

function sl_feedback_reply(int $status, bool $ok, string $error = ''): never {
    http_response_code($status);
    $payload = ['ok' => $ok];
    if ($error !== '') $payload['error'] = $error;
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function sl_feedback_clean(string $value, int $max): string {
    $value = str_replace(["\0", "\r", "\n"], '', $value);
    $value = trim($value);
    if (!mb_check_encoding($value, 'UTF-8')) return '';
    if (mb_strlen($value, 'UTF-8') > $max) $value = mb_substr($value, 0, $max, 'UTF-8');
    return $value;
}

function sl_feedback_log_tail(string $log): string {
    $log = str_replace("\0", '', $log);
    if ($log === '') return '';
    if (!mb_check_encoding($log, 'UTF-8')) {
        $log = mb_convert_encoding($log, 'UTF-8', 'UTF-8,ISO-8859-1') ?: '';
    }
    if (strlen($log) <= 20480) return $log;
    $tail = substr($log, -20480);
    // Drop a leading incomplete UTF-8 sequence after the byte cut.
    return (string)preg_replace('/^[\x80-\xBF]+/', '', $tail);
}

function sl_feedback_rate_path(): string {
    $override = (string)getenv('GD_SHARPLAB_RATE_PATH');
    if ($override !== '') return $override;
    $dir = dirname(__DIR__).'/data';
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    return $dir.'/sharplab-feedback-rate.json';
}

function sl_feedback_client_ip(): string {
    return (string)($_SERVER['REMOTE_ADDR'] ?? 'cli');
}

function sl_feedback_allow(string $ip): bool {
    $path = sl_feedback_rate_path();
    $dir = dirname($path);
    if (!is_dir($dir) && !@mkdir($dir, 0750, true)) return false;
    $fh = @fopen($path, 'c+');
    if ($fh === false) return false;
    if (!flock($fh, LOCK_EX)) { fclose($fh); return false; }
    $raw = stream_get_contents($fh) ?: '';
    $data = json_decode($raw, true);
    if (!is_array($data)) $data = ['t' => []];
    $now = time();
    $who = substr(hash('sha256', $ip.'|sharplab-feedback'), 0, 16);
    $list = [];
    foreach ((array)($data['t'] ?? []) as $row) {
        if (is_array($row) && $now - (int)($row[1] ?? 0) < 3600) $list[] = $row;
    }
    $mine = count(array_filter($list, static fn($row): bool => ($row[0] ?? '') === $who));
    if ($mine >= 10) {
        rewind($fh); ftruncate($fh, 0); fwrite($fh, json_encode(['t' => $list], JSON_UNESCAPED_UNICODE));
        fflush($fh); flock($fh, LOCK_UN); fclose($fh);
        return false;
    }
    $list[] = [$who, $now];
    rewind($fh); ftruncate($fh, 0); fwrite($fh, json_encode(['t' => $list], JSON_UNESCAPED_UNICODE));
    fflush($fh); flock($fh, LOCK_UN); fclose($fh);
    return true;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    sl_feedback_reply(405, false, 'Nur POST.');
}

$client = (string)($_SERVER['HTTP_X_SHARPLAB_CLIENT'] ?? '');
if ($client !== '1') sl_feedback_reply(403, false, 'Ungültige Anfrage.');

if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 65536) sl_feedback_reply(413, false, 'Die Nachricht ist zu lang.');

$raw = file_get_contents('php://input') ?: '';
$in = json_decode($raw, true);
if (!is_array($in)) sl_feedback_reply(422, false, 'Bitte JSON senden.');

// Honeypot: pretend success, do not send mail or consume the rate limit.
if (trim((string)($in['website'] ?? '')) !== '') sl_feedback_reply(200, true);

$subject = sl_feedback_clean((string)($in['subject'] ?? ''), 120);
$message = trim(str_replace("\0", '', (string)($in['message'] ?? '')));
if (!mb_check_encoding($message, 'UTF-8')) sl_feedback_reply(422, false, 'Bitte prüfe Betreff und Nachricht.');
if ($message === '' || mb_strlen($message, 'UTF-8') > 5000) {
    sl_feedback_reply(422, false, 'Bitte schreib eine Nachricht (höchstens 5000 Zeichen).');
}

$email = sl_feedback_clean((string)($in['email'] ?? ''), 200);
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sl_feedback_reply(422, false, 'Die E-Mail-Adresse ist ungültig.');
}
$appVersion = sl_feedback_clean((string)($in['appVersion'] ?? ''), 80);
$os = sl_feedback_clean((string)($in['os'] ?? ''), 120);
$log = sl_feedback_log_tail((string)($in['log'] ?? ''));

if (!sl_feedback_allow(sl_feedback_client_ip())) {
    sl_feedback_reply(429, false, 'Du hast gerade schon viel Feedback geschickt. Bitte später noch einmal versuchen.');
}

if ($subject === '') $subject = 'Feedback';
if (preg_match('/^sharplab:\s*/iu', $subject)) {
    $subject = trim((string)preg_replace('/^sharplab:\s*/iu', '', $subject));
    if ($subject === '') $subject = 'Feedback';
}
$mailSubject = 'SharpLab: '.$subject;

$mailBody = "Feedback aus der SharpLab-App\n\n"
    ."Version: ".($appVersion !== '' ? $appVersion : '(nicht angegeben)')."\n"
    ."Betriebssystem: ".($os !== '' ? $os : '(nicht angegeben)')."\n"
    ."E-Mail: ".($email !== '' ? $email : '(nicht angegeben)')."\n"
    ."Betreff: ".$subject."\n\n"
    ."Nachricht:\n".$message."\n";
if ($log !== '') {
    $mailBody .= "\nFehlerprotokoll\n".$log."\n";
}


$mailTo = setting('site_email', 'info@geringdigital.de');
$headers = [];
$headers[] = 'From: SharpLab <sharplab@geringdigital.de>';
if ($email !== '') $headers[] = 'Reply-To: '.$email;
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';

// Same transport as send.php: PHP mail() on the STRATO webspace. Local preview skips sending.
$dump = (string)getenv('GD_SHARPLAB_MAIL_DUMP');
if ($dump !== '') {
    file_put_contents($dump, json_encode([
        'to' => $mailTo,
        'subject' => $mailSubject,
        'body' => $mailBody,
        'headers' => $headers,
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

$shouldSend = getenv('GD_LOCAL_PREVIEW') !== '1' && getenv('GD_SHARPLAB_SKIP_MAIL') !== '1' && function_exists('mail');
$sent = true;
if ($shouldSend) {
    $sent = @mail($mailTo, '=?UTF-8?B?'.base64_encode($mailSubject).'?=', $mailBody, implode("\r\n", $headers));
}
if ($sent) sl_feedback_reply(200, true);
sl_feedback_reply(503, false, 'Das Feedback konnte gerade nicht gesendet werden. Bitte später noch einmal versuchen.');
