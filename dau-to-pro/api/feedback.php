<?php
declare(strict_types=1);
require_once __DIR__.'/../../learner_lib.php';
require_once __DIR__.'/../feedback-form.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');

function feedback_reply(int $status, string $message): never {
    http_response_code($status);
    echo json_encode(['ok'=>$status===200,'message'=>$message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!DTP_FEEDBACK_ENABLED) feedback_reply(404, 'Das Early-Access-Feedback ist geschlossen.');
if (($_SERVER['REQUEST_METHOD']??'GET')!=='POST') {
    header('Allow: POST');
    feedback_reply(405, 'Nur POST.');
}
if ((int)($_SERVER['CONTENT_LENGTH']??0)>48000) feedback_reply(413, 'Dein Feedback ist zu lang.');
$token=$_POST['csrf']??null;
if (!is_string($token) || empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'],$token)) {
    feedback_reply(403, 'Die Sitzung ist abgelaufen. Kopiere deinen Text und lade die Seite neu.');
}

$subject=$_POST['subject']??null;
$message=$_POST['message']??null;
$source=$_POST['source']??null;
if (!is_string($subject) || !is_string($message) || !is_string($source)
    || !preg_match('/\\A[a-z0-9-]{1,100}\\z/', $source)
    || !mb_check_encoding($subject,'UTF-8') || !mb_check_encoding($message,'UTF-8')) {
    feedback_reply(422, 'Bitte prüfe Betreff und Nachricht.');
}
$subject=trim($subject);
$message=trim($message);
if ($subject==='' || $message==='' || preg_match('/[\\x00-\\x1f\\x7f]/', $subject)
    || str_contains($message,"\\0") || mb_strlen($subject,'UTF-8')>120 || mb_strlen($message,'UTF-8')>3000) {
    feedback_reply(422, 'Bitte gib einen Betreff und eine Nachricht innerhalb der Feldlängen ein.');
}
$thanks='Danke! Dein Feedback wurde gesendet.';
if (($_POST['website']??'')!=='') feedback_reply(200, $thanks);

try {
    $db=db();
    $now=time();
    $bucket=learner_rate_bucket('feedback','ip:'.learner_client_ip());
    $global=learner_rate_bucket('feedback','global');
    // Reserve both quotas in one write before contacting the mail transport.
    $rate=$db->prepare('INSERT INTO learner_attempts(bucket,created_at)
        SELECT limits.bucket, :now FROM (SELECT :ip AS bucket UNION ALL SELECT :global) AS limits
        WHERE (SELECT COUNT(*) FROM learner_attempts WHERE bucket=:ip AND created_at>:since)<5
          AND (SELECT COUNT(*) FROM learner_attempts WHERE bucket=:global AND created_at>:since)<60');
    $rate->execute(['now'=>$now,'ip'=>$bucket,'global'=>$global,'since'=>$now-3600]);
    if ($rate->rowCount()===0) feedback_reply(429, 'Gerade wurde viel Feedback gesendet. Versuch es später noch einmal.');
    $db->prepare('DELETE FROM learner_attempts WHERE created_at<?')->execute([$now-86400]);
    session_write_close();

    if (getenv('GD_LOCAL_PREVIEW')==='1') feedback_reply(503, 'In der lokalen Vorschau ist der Versand deaktiviert.');
    $recipient='info@geringdigital.de';
    $encodedSubject=mb_encode_mimeheader('[DAU TO PRO] '.$subject,'UTF-8','B',"\r\n",9);
    $sent=mail($recipient,$encodedSubject,"Quelle: ".$source."\n\n".$message,[
        'From'=>'DAU TO PRO <'.$recipient.'>',
        'MIME-Version'=>'1.0',
        'Content-Type'=>'text/plain; charset=UTF-8',
    ]);
    if ($sent) feedback_reply(200, $thanks);
} catch (Throwable $error) {
    error_log('DAU TO PRO: Feedbackversand fehlgeschlagen.');
}
feedback_reply(503, 'Das Feedback konnte gerade nicht gesendet werden. Dein Text bleibt im Formular.');
