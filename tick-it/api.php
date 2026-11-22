<?php
declare(strict_types=1);
require_once __DIR__.'/app/actions.php';
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header('Cache-Control: no-store');
try {
    $action=(string)($_GET['action']??'');
    $method=$_SERVER['REQUEST_METHOD']??'GET';
    if($action==='download') {
        if($method!=='GET') app_error('Methode nicht erlaubt.',405);
        act_download(positive_id($_GET['id']??null));
    }
    $getRoutes=['generator_status','generator_diagnostics','session','stats','tickets','ticket','participants','private','unread','reviews','supporter_stats','audit','categories_admin','supporters'];
    if(in_array($action,$getRoutes,true)) {
        if($method!=='GET')app_error('Methode nicht erlaubt.',405);
        if(in_array($action,['session','tickets','stats','unread'],true) && auth()) generator_tick();
        $res=match($action) {
            'generator_status'=>generator_status(),
            'generator_diagnostics'=>generator_diagnostics(),
            'session'=>act_session(),
            'stats'=>act_stats(),
            'tickets'=>act_ticket_list($_GET),
            'ticket'=>act_ticket_detail(positive_id($_GET['id']??null)),
            'participants'=>act_participants($_GET),
            'private'=>act_private_list($_GET),
            'unread'=>act_unread(),
            'reviews'=>act_reviews_list(),
            'supporter_stats'=>act_supporter_stats(),
            'audit'=>act_audit_log(),
            'categories_admin'=>act_categories_list(),
            'supporters'=>act_supporters(),
        };
        json_response($res);
    }
    if($method!=='POST') app_error('Methode nicht erlaubt.',405);
    verify_csrf();
    if($action==='upload') json_response(act_upload(positive_id($_POST['message_id']??null)));
    if(!str_contains((string)($_SERVER['CONTENT_TYPE']??''),'application/json')) app_error('JSON erforderlich.',415);
    if((int)($_SERVER['CONTENT_LENGTH']??0) > 1048576) app_error('Anfrage zu groß.',413);
    $body=file_get_contents('php://input');
    $d=json_decode($body,true,512,JSON_THROW_ON_ERROR);
    if(!is_array($d)) app_error('JSON-Objekt erforderlich.');
    $res=match($action) {
        'login_guest'=>act_login_guest($d),
        'login_admin'=>act_login_admin($d),
        'logout'=>act_logout(),
        'ticket_create'=>act_ticket_create($d),
        'training_create'=>act_ticket_create($d,true),
        'claim'=>act_claim(positive_id($d['id']??null)),
        'status'=>act_ticket_change(positive_id($d['id']??null),$d,'status'),
        'priority'=>act_ticket_change(positive_id($d['id']??null),$d,'priority'),
        'category'=>act_ticket_change(positive_id($d['id']??null),$d,'category'),
        'release'=>act_ticket_change(positive_id($d['id']??null),$d,'release'),
        'assign'=>act_ticket_change(positive_id($d['id']??null),$d,'assign'),
        'handover'=>act_ticket_change(positive_id($d['id']??null),$d,'handover'),
        'publish'=>act_ticket_change(positive_id($d['id']??null),$d,'publish'),
        'publish_many'=>act_training_publish_many($d),
        'message'=>act_message_add(positive_id($d['id']??null),$d),
        'review'=>act_review(positive_id($d['id']??null),$d),
        'private_send'=>act_private_send($d),
        'private_read'=>act_private_read($d),
        'ban'=>act_admin_ban($d),
        'kick'=>act_admin_kick($d),
        'category_save'=>act_categories_manage($d),
        'password_change'=>act_change_password($d),
        'training_reset'=>act_training_reset($d),
        'generator_start'=>generator_start($d),
        'generator_fill'=>generator_fill(),
        'generator_update'=>generator_update($d),
        'generator_pause'=>generator_switch('pause'),
        'generator_resume'=>generator_switch('resume'),
        'generator_stop'=>generator_switch('stop'),
        default=>app_error('Unbekannte Aktion.',404),
    };
    json_response($res);
} catch(HttpError $e) {
    http_response_code($e->httpStatus);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);
} catch(JsonException $e) {
    http_response_code(400);header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok'=>false,'error'=>'Ungültiges JSON.']);
} catch(Throwable $e) {
    // Vollstaendige Ausnahme ausschliesslich in serverseitigen Fehlerlogs.
    // Der Dozent sieht nur eine sichere Fehlerkategorie und eine Referenz.
    $reference=bin2hex(random_bytes(4));
    error_log('[IT Support]['.$reference.'] '.$e);
    $message='Ein interner Fehler ist aufgetreten. Fehler-ID: '.$reference;
    $requestedAction=(string)($_GET['action']??'');
    if(str_starts_with($requestedAction,'generator_')&&!empty($_SESSION['admin_id'])){
        $driver=$e instanceof PDOException?(int)($e->errorInfo[1]??0):0;
        $message=match($driver){
            1044,1142,1143=>'Der Tick-It-Datenbankbenutzer hat nicht die benoetigten Schreib-/Tabellenrechte. Die Generator-Migration pruefen.',
            1146=>'Eine Generator-Datenbanktabelle fehlt. Die Datei database/generator-migration.sql muss einmalig importiert werden.',
            1054=>'Die Generator-Datenbankstruktur ist unvollstaendig. Die nicht-destruktive Migration pruefen.',
            1452=>'Eine Datenbank-Verknuepfung fehlt. Bitte die Generator-Diagnose ausfuehren.',
            1205,1213=>'Die Datenbank ist gerade gesperrt. Bitte in einigen Sekunden erneut versuchen.',
            1406=>'Ein Text ist fuer die Datenbank zu lang. Generator-Katalog pruefen.',
            2002,2003,2006,2013=>'Die Datenbankverbindung ist unterbrochen. Verfuegbarkeit bei STRATO pruefen.',
            default=>$e instanceof PDOException?'Datenbankfehler beim Generatorstart (MySQL-Code '.$driver.').':'Ein interner Generatorfehler ist aufgetreten.'
        };
        $message.=' Fehler-ID: '.$reference;
    }
    http_response_code(500);header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok'=>false,'error'=>$message],JSON_UNESCAPED_UNICODE);
}
