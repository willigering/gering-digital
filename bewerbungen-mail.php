<?php
/**
 * Bewerbungskompass: authenticated mail, PDF preview, optional stored CV.
 * IMPORTANT: this endpoint does not disclose any personal data without the
 * existing private Bewerbungskompass PHP session.
 */
declare(strict_types=1);
session_name('GD_Bewerbungen');
$secure=(!empty($_SERVER['HTTPS'])&&strtolower((string)$_SERVER['HTTPS'])!=='off')
    || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO']??''))==='https';
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Strict']);
session_start();
header('Cache-Control: private, no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: same-origin');
header('Content-Security-Policy: frame-ancestors \'self\'');

require_once __DIR__.'/bewerbungen-mail-lib.php';

function gmj(array $response,int $status=200):void{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($response,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function gmerr(string $message,int $status=400):void{gmj(['error'=>$message],$status);}
function gdbody():array {
    $contentType=(string)($_SERVER['CONTENT_TYPE']??'');
    if(stripos($contentType,'multipart/form-data')!==false) {
        $raw=(string)($_POST['payload']??'{}');
        if(strlen($raw)>90000)throw new InvalidArgumentException('Anfrage zu groß.');
        $data=json_decode($raw,true);
    }else{
        $body=file_get_contents('php://input',false,null,0,96000);
        $data=json_decode((string)$body,true);
    }
    if(!is_array($data))throw new InvalidArgumentException('Ungültige Anfrage.');
    return $data;
}
function gdcsrf(array $body):void{
    if(empty($_SESSION['bewerbungen_csrf'])||!is_string($body['csrf']??null)
       ||!hash_equals((string)$_SESSION['bewerbungen_csrf'],$body['csrf'])) {
        gmerr('Sitzung abgelaufen. Seite neu laden.',403);
    }
}
function gdsafeId(string $id):string{
    if(!preg_match('/\A[A-Za-z0-9_.-]{3,120}\z/D',$id))throw new InvalidArgumentException('Ungültige Kennung.');
    return $id;
}
function gdcv(PDO $db):?array{
    $q=$db->query("SELECT filename,file,uploaded_at FROM mail_assets WHERE id='cv'");
    $r=$q->fetch();
    return $r?:null;
}
function gdview(PDO $db):void{
    $cfg=gdm_config($db);
    $stored=$db->query("SELECT smtp_secret FROM mail_meta WHERE id=1")->fetchColumn();
    $hasCv=(bool)$db->query("SELECT 1 FROM mail_assets WHERE id='cv'")->fetchColumn();
    $hist=$db->query('SELECT id,entry_id,created_at,recipient,subject,status,error FROM mail_history ORDER BY created_at DESC LIMIT 100')->fetchAll();
    gmj(['config'=>$cfg,'senderAddress'=>GD_MAIL_FROM,'smtpConfigured'=>is_string($stored)&&$stored!=='',
         'cvStored'=>$hasCv,'history'=>$hist,'smtpServer'=>GD_MAIL_HOST,'smtpPort'=>GD_MAIL_PORT]);
}
$action=(string)($_GET['action']??'state');
if(empty($_SESSION['bewerbungen_authenticated']))gmerr('Bitte zuerst im Bewerbungskompass anmelden.',401);
try{
    $db=gdm_db();
    if($_SERVER['REQUEST_METHOD']==='GET'){
        if($action==='state')gdview($db);
        if($action==='cv'){
            $cv=gdcv($db);
            if(!$cv)gmerr('Kein Lebenslauf hinterlegt.',404);
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="Lebenslauf.pdf"');
            header('Content-Length: '.strlen($cv['file']));
            echo $cv['file'];exit;
        }
        gmerr('Unbekannte Aktion.',404);
    }
    if($_SERVER['REQUEST_METHOD']!=='POST')gmerr('Methode nicht erlaubt.',405);
    $body=gdbody();gdcsrf($body);
    if($action==='save-settings'){
        gdm_update_settings($db,$body);
        gdview($db);
    }
    if($action==='test-smtp'){
        $pass=gdm_decrypt($db);
        if(!$pass)throw new InvalidArgumentException('Bitte zuerst das SMTP-Passwort speichern.');
        gdm_smtp($pass,GD_MAIL_FROM,'','',[],true);
        gmj(['message'=>'SMTP-Anmeldung erfolgreich. Es wurde keine E-Mail versendet.']);
    }
    if($action==='upload-cv'){
        if(empty($_FILES['cv'])||!is_array($_FILES['cv']))throw new InvalidArgumentException('Bitte eine PDF-Datei wählen.');
        $up=$_FILES['cv'];
        if((int)$up['error']!==UPLOAD_ERR_OK)
            throw new InvalidArgumentException('Upload fehlgeschlagen. Serverlimit und PDF-Größe prüfen.');
        if((int)$up['size']<100||(int)$up['size']>6*1024*1024)throw new InvalidArgumentException('Lebenslauf darf maximal 6 MB groß sein.');
        $pdf=file_get_contents($up['tmp_name']);
        if(!is_string($pdf)||!str_starts_with($pdf,'%PDF-'))throw new InvalidArgumentException('Bitte einen gültigen PDF-Lebenslauf verwenden.');
        $q=$db->prepare("INSERT INTO mail_assets(id,filename,file,uploaded_at) VALUES('cv',?,?,?) ON CONFLICT(id) DO UPDATE SET filename=excluded.filename,file=excluded.file,uploaded_at=excluded.uploaded_at");
        $q->bindValue(1,'Lebenslauf.pdf');$q->bindValue(2,$pdf,PDO::PARAM_LOB);$q->bindValue(3,gmdate('c'));$q->execute();
        gdview($db);
    }
    if($action==='remove-cv'){
        $db->exec("DELETE FROM mail_assets WHERE id='cv'");
        gdview($db);
    }
    if($action==='preview'||$action==='send'){
        $entryId=gdsafeId((string)($body['entryId']??''));
        $company=gdm_company($db,$entryId);
        $cfg=gdm_config($db);
        $doc=gdm_prepare_document($body,$company,$cfg);
        if($action==='preview'){
            header('Content-Type: application/pdf');
            header('Content-Disposition: inline; filename="Anschreiben-Vorschau.pdf"');
            header('Content-Length: '.strlen($doc['pdf']));
            echo $doc['pdf'];exit;
        }
        // Never transmit an automatically addressed letter with missing mandatory addresses.
        foreach(['senderName','senderStreet','senderPostal','senderCity'] as $f) {
            if(trim((string)($cfg[$f]??''))==='')throw new InvalidArgumentException('Absenderanschrift unvollständig. Bitte unter E-Mail-Einstellungen ergänzen.');
        }
        foreach(['company','street','postal'] as $f){
            if(trim((string)($company[$f]??''))==='')throw new InvalidArgumentException('Firmenanschrift unvollständig. Bitte Betrieb bearbeiten.');
        }
        if(trim((string)($company['postCity']??$company['city']??''))==='')throw new InvalidArgumentException('Postort fehlt. Bitte Betrieb bearbeiten.');
        if(!filter_var($doc['to'],FILTER_VALIDATE_EMAIL))throw new InvalidArgumentException('Empfänger-Adresse fehlt.');
        $pass=gdm_decrypt($db);
        if(!$pass)throw new InvalidArgumentException('Bitte das SMTP-Passwort unter E-Mail-Einstellungen hinterlegen.');
        $files=[['filename'=>'Anschreiben.pdf','bytes'=>$doc['pdf']]];
        $cv=gdcv($db);
        if($cv && !empty($body['attachCv']))$files[]=['filename'=>'Lebenslauf.pdf','bytes'=>$cv['file']];
        if(!empty($_FILES['extra']['name'])){
            $ups=$_FILES['extra'];
            if(!is_array($ups['name']))throw new InvalidArgumentException('Ungültige Anhänge.');
            if(count($ups['name'])>3)throw new InvalidArgumentException('Maximal drei zusätzliche PDF-Anhänge.');
            $bytes=0;
            foreach($ups['name'] as $i=>$filename){
                if((int)$ups['error'][$i]!==UPLOAD_ERR_OK)throw new InvalidArgumentException('Anhang-Upload fehlgeschlagen.');
                $size=(int)$ups['size'][$i];$bytes+=$size;
                if($size<100 || $bytes>8*1024*1024)throw new InvalidArgumentException('Zusätzliche Anhänge zusammen maximal 8 MB.');
                $pdf=file_get_contents($ups['tmp_name'][$i]);
                if(!is_string($pdf)||!str_starts_with($pdf,'%PDF-'))throw new InvalidArgumentException('Nur PDF-Anhänge sind erlaubt.');
                $clean=preg_replace('/[^A-Za-z0-9_.-]/','_',basename((string)$filename));
                if(!preg_match('/\.pdf$/i',$clean))$clean.='.pdf';
                $files[]=['filename'=>substr($clean,0,80),'bytes'=>$pdf];
            }
        }
        // Same idempotency id must never cause a second submission.
        $id=gdsafeId((string)($body['sendId']??''));
        $db->exec('BEGIN IMMEDIATE');
        try {
            $q=$db->prepare('SELECT status FROM mail_history WHERE id=?');$q->execute([$id]);
            if($q->fetchColumn()!==false){$db->rollBack();throw new InvalidArgumentException('Dieser Versand wurde bereits angestoßen. Bitte Versandverlauf prüfen und nicht doppelt senden.');}
            $today=$db->query("SELECT count(*) FROM mail_history WHERE created_at >= datetime('now','-24 hours')")->fetchColumn();
            if((int)$today>=25){$db->rollBack();throw new InvalidArgumentException('Versandlimit: maximal 25 Versuche in 24 Stunden.');}
            $q=$db->prepare('INSERT INTO mail_history (id,entry_id,created_at,recipient,subject,status,pdf_sha256) VALUES (?,?,?,?,?,?,?)');
            $q->execute([$id,$entryId,gmdate('Y-m-d H:i:s'),$doc['to'],$doc['subject'],'started',hash('sha256',$doc['pdf'])]);
            $db->commit();
        }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
        session_write_close();
        $accepted=false;
        try{
            gdm_smtp($pass,$doc['to'],$doc['subject'],$doc['mailBody'],$files);
            $accepted=true;
            $db->beginTransaction();
            $q=$db->prepare("UPDATE mail_history SET status='sent' WHERE id=?");$q->execute([$id]);
            $c=gdm_company($db,$entryId);
            if(in_array($c['status']??'', ['nicht_beworben','vorbereitet',''],true))$c['status']='beworben';
            if(empty($c['appliedAt']))$c['appliedAt']=(new DateTimeImmutable('now',new DateTimeZone('Europe/Berlin')))->format('Y-m-d');
            $q=$db->prepare('UPDATE entries SET payload=?,updated_at=? WHERE id=?');
            $q->execute([json_encode($c,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),gmdate('c'),$entryId]);
            $db->commit();
            gmj(['sent'=>true,'message'=>'Von mail.de angenommen. Bewerbungsstatus aktualisiert.']);
        }catch(Throwable $ex){
            if($db->inTransaction())$db->rollBack();
            if(!$accepted){
                $q=$db->prepare("UPDATE mail_history SET status='unconfirmed',error=? WHERE id=?");
                $q->execute([mb_substr($ex->getMessage(),0,190,'UTF-8'),$id]);
            }
            if($accepted)throw new RuntimeException('Die E-Mail wurde versendet, aber der Status konnte nicht gespeichert werden. Bitte NICHT erneut senden.');
            throw new RuntimeException('Versand nicht bestätigt: '.$ex->getMessage().' Bitte zuerst das mail.de-Postfach prüfen, bevor du erneut sendest.');
        }
    }
    gmerr('Unbekannte Aktion.',404);
}catch(InvalidArgumentException $e){gmerr($e->getMessage(),422);}
catch(Throwable $e){
    error_log('GeringDigital Mail: '.preg_replace('/[\r\n]+/',' ',mb_substr($e->getMessage(),0,120,'UTF-8')));
    // Do not expose secrets; surface only clean, bounded connection/status messages.
    $msg=$e->getMessage();
    $safe=preg_match('/\A(?:Versand nicht bestätigt|Die E-Mail wurde versendet|SMTP:|Mailserver:|Verbindung zu|Bitte |Der private|SMTP-Passwort|Für die SMTP|Kein Lebenslauf)/u',$msg);
    gmerr($safe?mb_substr($msg,0,360,'UTF-8'):'E-Mail-Funktion momentan nicht verfügbar. Bitte später erneut versuchen.',503);
}
