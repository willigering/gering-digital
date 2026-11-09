<?php
/**
 * Bewerbungskompass mail/PDF regression (no network, no personal data).
 * php tests/bewerbungen_mail_test.php
 */
declare(strict_types=1);
require_once __DIR__.'/../bewerbungen-mail-lib.php';
function t(bool $ok,string $label):void{
    if(!$ok){fwrite(STDERR,"FAIL: ".$label."\n");exit(1);}
}
$db=new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$db->exec("CREATE TABLE mail_meta (id INTEGER PRIMARY KEY CHECK(id=1), salt TEXT NOT NULL, config TEXT NOT NULL DEFAULT '{}', smtp_secret TEXT NOT NULL DEFAULT '')");
$db->exec("INSERT INTO mail_meta(id,salt) VALUES(1,'0123456789abcdef0123456789abcdef')");
$_SESSION['bewerbungen_mail_key']=bin2hex(random_bytes(32));
$config=gdm_defaults();
$config['senderStreet']='Musterweg 10';
$config['senderPostal']='32791';
$config['senderCity']='Lage';
$config['smtpPassword']='test-local-only';
gdm_update_settings($db,$config);
t(gdm_decrypt($db)==='test-local-only','SMTP secret encrypted and round-tripped');
t(!str_contains((string)$db->query('SELECT smtp_secret FROM mail_meta')->fetchColumn(),'test-local-only'),'SMTP secret not saved as plaintext');
t(gdm_config($db)['senderStreet']==='Musterweg 10','Sender address persisted');
$company=[
    'id'=>'test-entry','company'=>'Muster & Partner GmbH','city'=>'Detmold',
    'street'=>'Beispielstr. 7','postal'=>'32756','postCity'=>'Detmold',
    'recipient'=>'Personalabteilung','email'=>'bewerbung@example.org','status'=>'nicht_beworben'
];
$body=['to'=>'bewerbung@example.org','subject'=>'Praktikum bei {FIRMA}',
    'salutation'=>'Sehr geehrte Damen und Herren,',
    'letter'=>"Ich bewerbe mich für den Zeitraum {ZEITRAUM}.\n\nIch möchte Netzwerke und Server betreuen.",
    'mailBody'=>'Anbei die Bewerbung von {ABSENDER}.'];
$doc=gdm_prepare_document($body,$company,gdm_config($db));
t($doc['subject']==='Praktikum bei Muster & Partner GmbH','Tokens replaced');
t(str_starts_with($doc['pdf'],'%PDF-1.4'),'PDF has version header');
t(str_contains($doc['pdf'],'Muster & Partner GmbH'),'PDF includes selected firm');
t(str_contains($doc['pdf'],'Beispielstr. 7'),'PDF includes selected street');
t(str_contains($doc['pdf'],'32756 Detmold'),'PDF includes selected postal address');
t(!str_contains($doc['pdf'],'Musterstadt'),'PDF does not contain template example data');
t(substr_count($doc['pdf'],'/Type /Page ')===1,'Single-page PDF has one Page node');
t((bool)preg_match('/startxref\n\d+\n%%EOF$/',$doc['pdf']),'PDF cross reference trailer present');
$long=$body;
$long['letter']=str_repeat("Fachinformatik und Linux sowie Windows-Systemintegration. ",120);
$multi=gdm_prepare_document($long,$company,gdm_config($db));
t(substr_count($multi['pdf'],'/Type /Page ')>1,'Long letter automatically creates new pages');
$bad=$body;$bad['subject']="Hallo\r\nBcc: test@example.org";
try{gdm_prepare_document($bad,$company,gdm_config($db));t(false,'Subject injection must be blocked');}
catch(InvalidArgumentException $e){t(str_contains($e->getMessage(),'Betreff'),'Subject newline correctly rejected');}
$bad=$body;$bad['to']="person@example.org\r\nBcc: other@example.org";
try{gdm_prepare_document($bad,$company,gdm_config($db));t(false,'Recipient injection must be blocked');}
catch(InvalidArgumentException $e){t(true,'Recipient newline rejected');}
t(gdm_config($db)['senderEmail']===GD_MAIL_FROM,'From address fixed to intended mail.de account');
echo "Bewerbungen mail: PDF, addresses, token replacement, secrets and validations OK.\n";
