<?php
/**
 * Bewerbungskompass – private mail.de integration.
 * No external dependencies, no mail passwords in Git.
 * PDF output is generated on the server from the selected company address.
 */
declare(strict_types=1);

const GD_MAIL_FROM = 'willi.gering@mail.de';
const GD_MAIL_HOST = 'smtp.mail.de';
const GD_MAIL_PORT = 587;

function gdm_db(): PDO {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir) || !is_writable($dir)) throw new RuntimeException('Der private Datenspeicher ist nicht beschreibbar.');
    $db = new PDO('sqlite:' . $dir . '/bewerbungen-private.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 12
    ]);
    $db->exec('PRAGMA busy_timeout=12000');
    $db->exec("CREATE TABLE IF NOT EXISTS mail_meta (id INTEGER PRIMARY KEY CHECK(id=1), salt TEXT NOT NULL, config TEXT NOT NULL DEFAULT '{}', smtp_secret TEXT NOT NULL DEFAULT '')");
    $db->exec("CREATE TABLE IF NOT EXISTS mail_assets (id TEXT PRIMARY KEY, filename TEXT NOT NULL, file BLOB NOT NULL, uploaded_at TEXT NOT NULL)");
    $db->exec("CREATE TABLE IF NOT EXISTS mail_history (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL, created_at TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, status TEXT NOT NULL, pdf_sha256 TEXT NOT NULL DEFAULT '', error TEXT NOT NULL DEFAULT '')");
    return $db;
}
/**
 * Original PDFs and CV/reference bundles live exclusively in the private SQLite
 * mail_assets BLOB table. Never write uploaded documents to a public path/Git.
 */
function gdm_uploaded_pdf(array $up,int $limit):array {
    if (!isset($up['error']) || (int)$up['error']!==UPLOAD_ERR_OK) {
        throw new InvalidArgumentException('PDF-Upload fehlgeschlagen. Bitte Serverlimit und Dateigröße prüfen.');
    }
    $size=(int)($up['size']??0);
    if($size<100 || $size>$limit) throw new InvalidArgumentException('Die PDF-Datei ist zu groß oder leer.');
    $tmp=(string)($up['tmp_name']??'');
    if($tmp==='' || !is_uploaded_file($tmp)) throw new InvalidArgumentException('Ungültiger PDF-Upload.');
    $bytes=file_get_contents($tmp);
    if(!is_string($bytes)||strlen($bytes)!==$size||!str_starts_with($bytes,'%PDF-')
       ||!preg_match('/%%EOF\s*\z/D',substr($bytes,-2048))){
        throw new InvalidArgumentException('Die Datei ist kein vollständiges PDF.');
    }
    $name=basename(str_replace('\\','/',(string)($up['name']??'')));
    $name=(string)preg_replace('/[^A-Za-z0-9_.-]/','_',$name);
    $name=substr($name,0,80);
    if($name==='' || !preg_match('/\.pdf\z/iD',$name))$name='Dokument.pdf';
    return ['filename'=>$name,'bytes'=>$bytes];
}
function gdm_save_asset(PDO $db,string $id,array $up,int $limit):void {
    if(!in_array($id,['cv','original'],true))throw new InvalidArgumentException('Unbekannter Dokumenttyp.');
    $doc=gdm_uploaded_pdf($up,$limit);
    $q=$db->prepare('INSERT INTO mail_assets(id,filename,file,uploaded_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET filename=excluded.filename,file=excluded.file,uploaded_at=excluded.uploaded_at');
    $q->bindValue(1,$id);$q->bindValue(2,$doc['filename']);$q->bindValue(3,$doc['bytes'],PDO::PARAM_LOB);$q->bindValue(4,gmdate('c'));$q->execute();
}

function gdm_defaults(): array {
    return [
        'senderName' => 'Willi Gering',
        'senderStreet' => '',
        'senderPostal' => '',
        'senderCity' => '',
        'senderPhone' => '',
        'senderEmail' => GD_MAIL_FROM,
        'subjectTemplate' => 'Bewerbung um ein Pflichtpraktikum – Fachinformatiker Systemintegration',
        'salutation' => 'Sehr geehrte Damen und Herren,',
        'coverLetter' => "im Rahmen meiner Umschulung zum Fachinformatiker für Systemintegration suche ich einen Praktikumsplatz für den Zeitraum vom 09.08.2027 bis zum 24.03.2028.\n\nBesonders interessieren mich die Arbeit mit Netzwerken, Windows- und Linux-Systemen, Virtualisierung sowie die praktische Unterstützung im IT-Betrieb.\n\nÜber die Möglichkeit, mich und meine Motivation in einem persönlichen Gespräch vorzustellen, würde ich mich sehr freuen.",
        'mailBody' => "Guten Tag,\n\nanbei übersende ich Ihnen meine Bewerbung für ein Pflichtpraktikum im Bereich Fachinformatik Systemintegration vom 09.08.2027 bis zum 24.03.2028.\n\nÜber eine Rückmeldung freue ich mich.\n\nMit freundlichen Grüßen\n{ABSENDER}",
    ];
}
function gdm_config(PDO $db): array {
    $raw = $db->query('SELECT config FROM mail_meta WHERE id=1')->fetchColumn();
    $read = $raw ? json_decode((string)$raw, true) : [];
    if (!is_array($read)) $read = [];
    $config = array_merge(gdm_defaults(), array_intersect_key($read,gdm_defaults()));
    $config['senderEmail'] = GD_MAIL_FROM;
    return $config;
}
function gdm_secret_key(): string {
    $hex = (string)($_SESSION['bewerbungen_mail_key'] ?? '');
    if (!preg_match('/\A[a-f0-9]{64}\z/D', $hex)) throw new RuntimeException('Für die SMTP-Einrichtung bitte abmelden und erneut anmelden.');
    return hex2bin($hex);
}
function gdm_encrypt(string $plaintext): string {
    $iv = random_bytes(12);
    $cipher = openssl_encrypt($plaintext, 'aes-256-gcm', gdm_secret_key(), OPENSSL_RAW_DATA, $iv, $tag);
    if (!is_string($cipher)) throw new RuntimeException('Verschlüsselung fehlgeschlagen.');
    return base64_encode($iv . $tag . $cipher);
}
function gdm_decrypt(PDO $db): ?string {
    $saved = $db->query('SELECT smtp_secret FROM mail_meta WHERE id=1')->fetchColumn();
    if (!$saved) return null;
    $raw = base64_decode((string)$saved, true);
    if ($raw === false || strlen($raw) < 29) throw new RuntimeException('SMTP-Zugangsdaten beschädigt. Bitte neu speichern.');
    $password = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', gdm_secret_key(), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw,12,16));
    if (!is_string($password)) throw new RuntimeException('SMTP-Passwort nicht entschlüsselbar. Bitte neu anmelden oder neu hinterlegen.');
    return $password;
}
function gdm_update_settings(PDO $db, array $body): void {
    $cfg = gdm_config($db);
    $limits = ['senderName'=>120,'senderStreet'=>160,'senderPostal'=>15,'senderCity'=>100,'senderPhone'=>70,
        'subjectTemplate'=>250,'salutation'=>200,'coverLetter'=>16000,'mailBody'=>6000];
    foreach($limits as $key=>$max) {
        if (!isset($body[$key]) || !is_string($body[$key]) || mb_strlen($body[$key], 'UTF-8')>$max)
            throw new InvalidArgumentException("Ungültiges Feld: $key");
        $cfg[$key] = trim($body[$key]);
    }
    if ($cfg['senderName'] === '' || $cfg['subjectTemplate'] === '' || $cfg['coverLetter'] === '' || $cfg['mailBody']==='') {
        throw new InvalidArgumentException('Name, Betreff, Anschreiben und E-Mail-Text dürfen nicht leer sein.');
    }
    if (!empty($body['smtpPassword'])) {
        if (!is_string($body['smtpPassword']) || strlen($body['smtpPassword'])>400) throw new InvalidArgumentException('Ungültiges SMTP-Passwort.');
        $secret = gdm_encrypt($body['smtpPassword']);
    } else {
        $secret = $db->query('SELECT smtp_secret FROM mail_meta WHERE id=1')->fetchColumn();
        $secret = is_string($secret) ? $secret : '';
    }
    $stmt=$db->prepare('UPDATE mail_meta SET config=?, smtp_secret=? WHERE id=1');
    $stmt->execute([json_encode($cfg,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$secret]);
}
function gdm_company(PDO $db, string $id): array {
    $q=$db->prepare('SELECT payload FROM entries WHERE id=?');
    $q->execute([$id]);
    $json=$q->fetchColumn();
    if (!$json) throw new InvalidArgumentException('Der ausgewählte Betrieb ist nicht vorhanden.');
    $company=json_decode((string)$json,true);
    if (!is_array($company)) throw new RuntimeException('Betriebsdaten beschädigt.');
    return $company;
}
function gdm_replace(string $text, array $company, array $cfg): string {
    $recipient = trim((string)($company['recipient'] ?? '')) ?: trim((string)($company['contact'] ?? ''));
    $date=(new DateTimeImmutable('now',new DateTimeZone('Europe/Berlin')))->format('d.m.Y');
    return strtr($text,[
        '{FIRMA}'=>(string)($company['company']??''),'{ORT}'=>(string)($company['city']??''),
        '{ANSPRECHPARTNER}'=>$recipient,'{STRAßE}'=>(string)($company['street']??''),
        '{PLZ}'=>(string)($company['postal']??''),'{POSTORT}'=>(string)($company['postCity']??''),
        '{ABSENDER}'=>$cfg['senderName'],'{DATUM}'=>$date,'{ZEITRAUM}'=>'09.08.2027–24.03.2028'
    ]);
}
function gdm_limited_string($x, int $max, string $field): string {
    if(!is_string($x) || mb_strlen($x,'UTF-8')>$max) throw new InvalidArgumentException("Ungültiger Text: $field");
    return trim(str_replace("\r", '', $x));
}
function gdm_prepare_document(array $body, array $company, array $cfg): array {
    $subject = gdm_replace(gdm_limited_string($body['subject']??'',250,'Betreff'),$company,$cfg);
    $salutation=gdm_replace(gdm_limited_string($body['salutation']??'',200,'Anrede'),$company,$cfg);
    $letter=gdm_replace(gdm_limited_string($body['letter']??'',16000,'Anschreiben'),$company,$cfg);
    $mailBody=gdm_replace(gdm_limited_string($body['mailBody']??'',6000,'E-Mail-Text'),$company,$cfg);
    $to=trim((string)($body['to']??''));
    if (!filter_var($to,FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/',$to)) throw new InvalidArgumentException('Bitte eine gültige Empfänger-E-Mail eintragen.');
    if (!$subject || !$salutation || !$letter || !$mailBody) throw new InvalidArgumentException('Betreff, Anrede, Anschreiben und E-Mail-Text dürfen nicht leer sein.');
    if (preg_match('/[\r\n]/',$subject)) throw new InvalidArgumentException('Der Betreff darf keine Zeilenumbrüche enthalten.');
    $pdf=gdm_make_pdf($company,$cfg,$subject,$salutation,$letter);
    return compact('subject','salutation','letter','mailBody','to','pdf');
}
/**
 * Minimal PDF serializer with standard embedded PDF Helvetica/WinAnsi fonts.
 * Does not call remote services or process arbitrary HTML/DOCX.
 */
final class GDM_Pdf {
    private array $pages=[];
    private string $stream='';
    public function __construct(){ $this->page(); }
    public function page(): void {
        if($this->stream !== '') $this->pages[]=$this->stream;
        $this->stream='';
    }
    private static function enc(string $v): string {
        $w = iconv('UTF-8','Windows-1252//TRANSLIT',$v);
        if($w===false)$w=iconv('UTF-8','ISO-8859-1//TRANSLIT',$v) ?: '?';
        return str_replace(["\\","(",")","\r","\n"],["\\\\","\\(","\\)","",""],$w);
    }
    public function line(float $x1,float $y1,float $x2,float $y2):void {
        $this->stream.=sprintf("0.82 0.64 0.34 RG 0.7 w %.2F %.2F m %.2F %.2F l S\n",$x1,841.89-$y1,$x2,841.89-$y2);
    }
    public function text(float $x,float $y,string $text,float $size=10,bool $bold=false, string $gray='0.15'):void {
        $font=$bold?'/F2':'/F1';
        $this->stream.=sprintf("BT %s g %s %.2F Tf 1 0 0 1 %.2F %.2F Tm (%s) Tj ET\n",
            $gray,$font,$size,$x,841.89-$y,self::enc($text));
    }
    /** Layout conservatively using maximum character widths (Courier-sized bound). */
    public function wrap(string $text,int $maxChars=79): array {
        $lines=[];
        foreach(preg_split('/\R/u',str_replace("\t","    ",$text)) as $raw) {
            $raw=trim($raw);
            if($raw===''){$lines[]='';continue;}
            $words=preg_split('/\s+/u',$raw);
            $line='';
            foreach($words as $word) {
                if(mb_strlen($word,'UTF-8')>$maxChars) {
                    if($line!==''){$lines[]=$line;$line='';}
                    while(mb_strlen($word,'UTF-8')>$maxChars){
                        $lines[]=mb_substr($word,0,$maxChars,'UTF-8');
                        $word=mb_substr($word,$maxChars,null,'UTF-8');
                    }
                }
                if($line!=='' && mb_strlen($line.' '.$word,'UTF-8')>$maxChars){$lines[]=$line;$line=$word;}
                else $line.=($line?' ':'').$word;
            }
            if($line!=='')$lines[]=$line;
        }
        return $lines;
    }
    public function bytes():string {
        if($this->stream!=='' || !$this->pages)$this->pages[]=$this->stream;
        $objects=[
            1=>'<< /Type /Catalog /Pages 2 0 R >>',
            2=>'',
            3=>'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            4=>'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
        ];
        $pages=[];
        $id=5;
        foreach($this->pages as $s){
            $page=$id++;$content=$id++;
            $objects[$page]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents $content 0 R >>";
            $objects[$content]="<< /Length ".strlen($s)." >>\nstream\n".$s."endstream";
            $pages[]="$page 0 R";
        }
        $objects[2]='<< /Type /Pages /Count '.count($pages).' /Kids [ '.implode(' ',$pages).' ] >>';
        ksort($objects);
        $pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        $offsets=[0];
        foreach($objects as $number=>$data){
            $offsets[$number]=strlen($pdf);
            $pdf.="$number 0 obj\n$data\nendobj\n";
        }
        $xref=strlen($pdf);
        $pdf.="xref\n0 ".(count($objects)+1)."\n0000000000 65535 f \n";
        foreach($objects as $number=>$_){$pdf.=sprintf("%010d 00000 n \n",$offsets[$number]);}
        $pdf.="trailer\n<< /Size ".(count($objects)+1)." /Root 1 0 R >>\nstartxref\n$xref\n%%EOF";
        return $pdf;
    }
}
function gdm_make_pdf(array $company,array $cfg,string $subject,string $salutation,string $letter):string {
    $pdf=new GDM_Pdf();
    $name=(string)$cfg['senderName'];
    $street=(string)$cfg['senderStreet'];$post=(string)$cfg['senderPostal'];$city=(string)$cfg['senderCity'];
    $pdf->text(72,52,$name,15,true);
    $topAddress=trim($street.' · '.$post.' '.$city," ·");
    $pdf->text(72,70,$topAddress,9,false,'0.48');
    $pdf->line(72,90,522,90);

    $recipient=(string)($company['recipient']??'');
    if(!$recipient)$recipient=(string)($company['contact']??'');
    $recipient=preg_split('/\R/u',$recipient)[0]??'';
    $address=[
        (string)($company['company']??''),
        trim($recipient),
        (string)($company['street']??''),
        trim((string)($company['postal']??'').' '.(string)(($company['postCity']??'')?:($company['city']??'')))
    ];
    $y=172;
    foreach($address as $line){if(trim($line)!==''){$pdf->text(72,$y,trim($line),10.5);$y+=16;}}
    $date=(new DateTimeImmutable('now',new DateTimeZone('Europe/Berlin')))->format('d.m.Y');
    $pdf->text(417,284,$date,10);
    $y=335;
    $pageNo=1;
    $drawPageHeader=static function(GDM_Pdf $p,int $n)use($name):void {
        $p->text(72,52,$name.' · Fortsetzung',11,true);
        $p->line(72,70,522,70);
        $p->text(472,815,'Seite '.$n,8,false,'0.52');
    };
    $textBlock=static function(array $lines,float $size=10.4,float $leading=16.8,bool $bold=false)use($pdf,&$y,&$pageNo,$drawPageHeader):void {
        foreach($lines as $line){
            if($y>740){$pdf->page();$pageNo++;$drawPageHeader($pdf,$pageNo);$y=112;}
            if($line===''){$y+=9;continue;}
            $pdf->text(72,$y,$line,$size,$bold);
            $y+=$leading;
        }
    };
    $textBlock($pdf->wrap($subject,66),12,17,true);
    $y+=22;
    $textBlock($pdf->wrap($salutation,79),10.4);
    $y+=12;
    $textBlock($pdf->wrap($letter,78),10.4,16.6);
    $y+=22;
    $textBlock(['Mit freundlichen Grüßen','',$name],10.4);
    if($pageNo===1) {
        $pdf->line(72,786,522,786);
        $contact=trim((string)($cfg['senderPhone']??''));
        $email=GD_MAIL_FROM;
        $pdf->text(72,804,trim($email.($contact?'  ·  '.$contact:'')),8,false,'0.5');
    }
    return $pdf->bytes();
}
function gdm_smtp_response($stream, array $expected):string {
    $message='';$code=0;
    for($i=0;$i<40;$i++){
        $line=fgets($stream,4096);
        if($line===false)throw new RuntimeException('SMTP: Keine Antwort vom Mailserver.');
        $message.=$line;
        if(strlen($message)>64000)throw new RuntimeException('SMTP: Antwort zu lang.');
        if(preg_match('/^(\d{3})([ -])/',$line,$m)) {
            $code=(int)$m[1];
            if($m[2]===' ')break;
        }
    }
    if(!in_array($code,$expected,true)){
        $short=preg_replace('/[\r\n]+/',' ',trim($message));
        throw new RuntimeException('Mailserver: '.mb_substr($short,0,190,'UTF-8'));
    }
    return $message;
}
function gdm_smtp_cmd($socket,string $cmd,array $expected):string {
    $sent=fwrite($socket,$cmd."\r\n");
    if($sent===false || $sent<strlen($cmd)+2)throw new RuntimeException('SMTP: Schreiben fehlgeschlagen.');
    return gdm_smtp_response($socket,$expected);
}
/**
 * A new connection for each request. STARTTLS mandatory; TLS certificate verified.
 * Attachments are already validated by the HTTP endpoint.
 */
function gdm_smtp(string $pass,string $recipient,string $subject,string $body,array $attachments,bool $testOnly=false):void {
    $ctx=stream_context_create(['ssl'=>[
        'verify_peer'=>true,'verify_peer_name'=>true,'peer_name'=>GD_MAIL_HOST,
        'SNI_enabled'=>true,'SNI_server_name'=>GD_MAIL_HOST,
        'crypto_method'=>STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT|STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT
    ]]);
    $errno=0;$err='';
    $sock=@stream_socket_client('tcp://'.GD_MAIL_HOST.':'.GD_MAIL_PORT,$errno,$err,12,STREAM_CLIENT_CONNECT,$ctx);
    if(!$sock)throw new RuntimeException('Verbindung zu smtp.mail.de:587 nicht möglich. Eventuell sperrt STRATO den SMTP-Port.');
    stream_set_timeout($sock,20);
    try {
        gdm_smtp_response($sock,[220]);
        $ehlo=gdm_smtp_cmd($sock,'EHLO geringdigital.de',[250]);
        if(stripos($ehlo,'STARTTLS')===false)throw new RuntimeException('Der Mailserver bietet keine TLS-Verschlüsselung an.');
        gdm_smtp_cmd($sock,'STARTTLS',[220]);
        if(!stream_socket_enable_crypto($sock,true,STREAM_CRYPTO_METHOD_TLS_CLIENT))
            throw new RuntimeException('SMTP-TLS-Verbindung fehlgeschlagen.');
        $ehlo=gdm_smtp_cmd($sock,'EHLO geringdigital.de',[250]);
        if(stripos($ehlo,'AUTH')===false)throw new RuntimeException('SMTP-Authentifizierung nicht angeboten.');
        gdm_smtp_cmd($sock,'AUTH LOGIN',[334]);
        gdm_smtp_cmd($sock,base64_encode(GD_MAIL_FROM),[334]);
        gdm_smtp_cmd($sock,base64_encode($pass),[235]);
        if($testOnly){gdm_smtp_cmd($sock,'QUIT',[221]);return;}
        gdm_smtp_cmd($sock,'MAIL FROM:<'.GD_MAIL_FROM.'>',[250]);
        gdm_smtp_cmd($sock,'RCPT TO:<'.$recipient.'>',[250,251]);
        gdm_smtp_cmd($sock,'DATA',[354]);
        $boundary='=_GeringDigital_'.bin2hex(random_bytes(14));
        $fromName='=?UTF-8?B?'.base64_encode('Willi Gering').'?=';
        $subjectEncoded='=?UTF-8?B?'.base64_encode($subject).'?=';
        $headers=[
            'From: '.$fromName.' <'.GD_MAIL_FROM.'>',
            'To: <'.$recipient.'>','Subject: '.$subjectEncoded,
            'Date: '.date('r'),
            'Message-ID: <'.bin2hex(random_bytes(12)).'@geringdigital.de>',
            'MIME-Version: 1.0','X-Mailer: Gering Digital Bewerbungskompass',
            'Content-Type: multipart/mixed; boundary="'.$boundary.'"'
        ];
        $message=implode("\r\n",$headers)."\r\n\r\n";
        $message.="--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n";
        $message.=quoted_printable_encode(str_replace(["\r\n","\r"],"\n",$body))."\r\n";
        foreach($attachments as $attachment){
            $filename=preg_replace('/[^A-Za-z0-9_.-]/','_', (string)$attachment['filename']);
            $message.="--$boundary\r\nContent-Type: application/pdf; name=\"$filename\"\r\n";
            $message.="Content-Disposition: attachment; filename=\"$filename\"\r\n";
            $message.="Content-Transfer-Encoding: base64\r\n\r\n";
            $message.=chunk_split(base64_encode($attachment['bytes']),76,"\r\n")."\r\n";
        }
        $message.="--$boundary--\r\n";
        // SMTP dot-stuffing and CRLF conversion.
        $message=preg_replace("/\r?\n/","\r\n",str_replace("\r\n","\n",$message));
        $message=preg_replace('/(?m)^\./','..',$message);
        $data=$message."\r\n.\r\n";
        $length=strlen($data);$offset=0;
        while($offset<$length){
            $wrote=fwrite($sock,substr($data,$offset,32768));
            if($wrote===false||$wrote===0)throw new RuntimeException('SMTP: Datenübertragung unterbrochen. Versandstatus prüfen.');
            $offset+=$wrote;
        }
        gdm_smtp_response($sock,[250]); // SMTP has accepted the message.
        // A failed QUIT after 250 must never reclassify the email as unsent.
        try { gdm_smtp_cmd($sock,'QUIT',[221]); } catch (Throwable $ignored) {}
    } finally {fclose($sock);}
}
