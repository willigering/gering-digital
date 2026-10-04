<?php
require __DIR__.'/lib.php';
check_csrf();

$name=trim($_POST['name']??'');
$email=trim($_POST['email']??'');
$subject=trim($_POST['subject']??'');
$message=trim($_POST['message']??'');

if(!$name||!filter_var($email,FILTER_VALIDATE_EMAIL)||!$message||empty($_POST['privacy'])) die('Bitte fülle alle Pflichtfelder korrekt aus.');

// Anfrage zuerst dauerhaft in der SQLite-Datenbank speichern.
$db=db();
$st=$db->prepare("INSERT INTO inquiries(name,email,subject,message) VALUES(?,?,?,?)");
$st->execute([$name,$email,$subject,$message]);

// E-Mail an das Gering-Digital-Postfach senden.
// Der Absender bleibt auf der eigenen Domain; die Kundenadresse wird als Reply-To gesetzt.
$mailTo=setting('site_email','info@geringdigital.de');
$mailSubject=$subject ? 'Neue Anfrage: '.$subject : 'Neue Anfrage über Gering Digital';
$mailBody="Neue Anfrage über geringdigital.de\n\n"
    ."Name: ".$name."\n"
    ."E-Mail: ".$email."\n"
    ."Betreff: ".($subject ?: '(kein Betreff)')."\n\n"
    ."Nachricht:\n".$message."\n";

$headers=[];
$headers[]='From: Gering Digital <'.setting('site_email','info@geringdigital.de').'>';
$headers[]='Reply-To: '.$email;
$headers[]='MIME-Version: 1.0';
$headers[]='Content-Type: text/plain; charset=UTF-8';

// mail() nutzt den von STRATO bereitgestellten Mailversand des Webspaces.
if (getenv('GD_LOCAL_PREVIEW') !== '1' && function_exists('mail')) @mail($mailTo, '=?UTF-8?B?'.base64_encode($mailSubject).'?=', $mailBody, implode("\r\n", $headers));

header('Location: index.php?sent=1#anfrage');
exit;
