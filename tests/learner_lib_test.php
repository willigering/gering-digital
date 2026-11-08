<?php
// Unit tests for learner_lib.php (DAU TO PRO Lernkonten) on a temporary database.
declare(strict_types=1);
$db=tempnam(sys_get_temp_dir(),'gd-learner-').'.sqlite';
putenv('GD_DB_PATH='.$db);
$_SERVER['REMOTE_ADDR']='203.0.113.7';
require __DIR__.'/../learner_lib.php';
$failures=0;$count=0;
function check(bool $ok,string $label): void {global $failures,$count;$count++;if(!$ok){$failures++;fwrite(STDERR,"✗ $label\n");}}
function error_of(callable $fn): string {try{$fn();return '';}catch(LearnerError $e){return $e->getMessage();}}
$pdo=db();
$pdo->exec("INSERT INTO html_pages(slug,title,category,published,live_version) VALUES('osi-sprint','OSI Sprint','lernen',1,'aaaaaaaaaaaaaaaaaaaaaaaa'),('subnet-sprint','Subnet Sprint','lernen',1,'bbbbbbbbbbbbbbbbbbbbbbbb'),('entwurf','Entwurf','lernen',0,''),('spiel-eins','Spiel','spiele',1,'cccccccccccccccccccccccc')");

// --- Benutzername & Passwort ---
foreach(['abc','Lern.Kevin_2','a-b','x9y','Willi','willi','WILLI'] as $ok) check(error_of(fn()=>learner_validate_username($ok))==='',"Benutzername „{$ok}“ ist erlaubt");
foreach(['ab','-abc','abc.','ä-b-c','a b c','a..b',str_repeat('a',25),'Admin','<script>','a@b.de'] as $bad) check(error_of(fn()=>learner_validate_username($bad))!=='',"Benutzername „{$bad}“ wird abgelehnt");
check(error_of(fn()=>learner_validate_password('kurz','kurz','name'))!=='','Passwort unter 10 Zeichen wird abgelehnt');
check(error_of(fn()=>learner_validate_password('ein-gutes-passwort','ein-anderes-passwort','name'))!=='','Abweichende Wiederholung wird abgelehnt');
check(error_of(fn()=>learner_validate_password('aaaaaaaaaaaa','aaaaaaaaaaaa','name'))!=='','Passwort aus einem Zeichen wird abgelehnt');
check(error_of(fn()=>learner_validate_password('kevin12345','kevin12345','kevin12345'))!=='','Passwort gleich Benutzername wird abgelehnt');
check(error_of(fn()=>learner_validate_password('Mein Router heißt Kevin!','Mein Router heißt Kevin!','kevin'))==='','Passphrase mit Umlauten ist erlaubt');

// --- Wiederherstellungscode ---
$code=learner_new_code();
check((bool)preg_match('/^DTP-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/D',$code),'Code hat das Format DTP-XXXX-XXXX-XXXX ohne verwechselbare Zeichen');
check(learner_normalize_code(strtolower(str_replace('-',' ',$code)))===$code,'Code wird ohne Bindestriche und kleingeschrieben erkannt');
check(learner_normalize_code(substr($code,4))===$code,'Code wird auch ohne Präfix erkannt');
check(learner_normalize_code('DTP-0000-1111-OOOO')===null,'Ungültige Zeichen ergeben keinen Code');

// --- Formular-Zeitstempel (Spamschutz) ---
check(!learner_form_token_ok(learner_form_token()),'Sofortiges Absenden (Bot) wird abgelehnt');
check(learner_form_token_ok(learner_form_token(time()-5)),'Absenden nach 5 Sekunden ist erlaubt');
check(!learner_form_token_ok(learner_form_token(time()-8000)),'Uralte Formulare werden abgelehnt');
check(!learner_form_token_ok((time()-5).'.'.str_repeat('a',32)),'Gefälschter Zeitstempel wird abgelehnt');
check(error_of(fn()=>learner_spam_check(['website'=>'http://spam','ft'=>learner_form_token(time()-5)]))!=='','Ausgefülltes Honigtopf-Feld wird abgelehnt');
check(error_of(fn()=>learner_spam_check(['website'=>'','ft'=>learner_form_token(time()-5)]))==='','Normales Formular besteht den Spamschutz');

// --- Registrieren & Anmelden ---
[$anna,$annaCode]=learner_register('Anna.Lernt','ein-langes-passwort','ein-langes-passwort');
check($anna['username']==='Anna.Lernt' && password_verify($annaCode,$anna['recovery_hash']),'Registrierung legt Konto mit gehashtem Code an');
check(!str_contains(json_encode($pdo->query('SELECT * FROM learners')->fetchAll()),'ein-langes-passwort'),'Passwort steht nirgends im Klartext');
check(error_of(fn()=>learner_register('anna.lernt','noch-ein-passwort','noch-ein-passwort'))!=='','Benutzername ist ohne Groß/Klein-Unterschied eindeutig');
$learner=learner_login('ANNA.LERNT','ein-langes-passwort');
check((int)$learner['id']===(int)$anna['id'] && (int)learner_current()['id']===(int)$anna['id'],'Anmeldung (Groß/Klein egal) setzt die Sitzung');
learner_logout();
check(learner_current()===null,'Abmelden beendet die Sitzung');
check(error_of(fn()=>learner_login('Anna.Lernt','falsch-falsch'))==='Benutzername oder Passwort stimmt nicht.','Falsches Passwort: neutrale Meldung');
check(error_of(fn()=>learner_login('gibtsnicht','falsch-falsch'))==='Benutzername oder Passwort stimmt nicht.','Unbekannter Name: dieselbe Meldung');

// --- Limits ---
for($i=0;$i<7;$i++) error_of(fn()=>learner_login('Anna.Lernt','falsch-falsch'));
check(str_contains(error_of(fn()=>learner_login('Anna.Lernt','ein-langes-passwort')),'Zu viele Fehlversuche'),'Nach 8 Fehlversuchen ist der Name 15 Minuten gesperrt');
$pdo->exec('DELETE FROM learner_attempts');
check(!str_contains(json_encode($pdo->query('SELECT bucket FROM learner_attempts')->fetchAll()),'203.0.113.7'),'IP-Adressen werden nicht im Klartext gespeichert');
for($i=0;$i<5;$i++) learner_register('nutzer'.$i,'ein-langes-passwort','ein-langes-passwort');
check(str_contains(error_of(fn()=>learner_register('nutzer9','ein-langes-passwort','ein-langes-passwort')),'mehrere Konten'),'Mehr als 5 Registrierungen pro Stunde und Anschluss werden gebremst');
$_SERVER['REMOTE_ADDR']='198.51.100.1';
check(error_of(fn()=>learner_register('nutzer9','ein-langes-passwort','ein-langes-passwort'))==='','Anderer Anschluss kann weiter registrieren');

// --- Wiederherstellung ---
check(error_of(fn()=>learner_recover('Anna.Lernt','DTP-AAAA-BBBB-CCCC','neues-passwort-1','neues-passwort-1'))!=='','Falscher Code wird abgelehnt');
learner_login('Anna.Lernt','ein-langes-passwort',true);
$versionBefore=(int)learner_by_id((int)$anna['id'])['session_version'];
$tokensBefore=(int)$pdo->query('SELECT COUNT(*) FROM learner_tokens')->fetchColumn();
learner_logout();
$newCode=learner_recover('anna.lernt',strtolower($annaCode),'neues-passwort-1','neues-passwort-1');
check($newCode!==$annaCode && (int)learner_current()['id']===(int)$anna['id'],'Code setzt Passwort zurück und meldet an');
check(error_of(fn()=>learner_recover('Anna.Lernt',$annaCode,'neues-passwort-2','neues-passwort-2'))!=='','Ein Code funktioniert nur einmal');
check((int)learner_by_id((int)$anna['id'])['session_version']>$versionBefore,'Wiederherstellung meldet alle anderen Geräte ab');
check($tokensBefore===1 && (int)$pdo->query('SELECT COUNT(*) FROM learner_tokens')->fetchColumn()===0,'„Angemeldet bleiben“-Token werden dabei gelöscht');
check(error_of(fn()=>learner_login('Anna.Lernt','neues-passwort-1'))==='','Neues Passwort funktioniert');

// --- Angemeldet bleiben ---
learner_login('Anna.Lernt','neues-passwort-1',true);
$cookie=$_COOKIE[LEARNER_COOKIE];
unset($_SESSION[LEARNER_SESSION_KEY]);learner_current(true);
check((int)(learner_current(true)['id']??0)===(int)$anna['id'],'Gültiges Cookie meldet automatisch an');
check(($_COOKIE[LEARNER_COOKIE]??'')!==$cookie,'Cookie wird bei Benutzung erneuert');
unset($_SESSION[LEARNER_SESSION_KEY]);$_COOKIE[LEARNER_COOKIE]=$cookie;
check(learner_current(true)===null,'Altes (bereits benutztes) Cookie funktioniert nicht mehr');
unset($_SESSION[LEARNER_SESSION_KEY]);$_COOKIE[LEARNER_COOKIE]=substr($cookie,0,25).str_repeat('0',64);
check(learner_current(true)===null,'Manipuliertes Cookie wird abgelehnt');

// --- Fortschritt ---
$id=(int)$anna['id'];
learner_progress_apply($id,'osi-sprint',['osi-sprint-score'=>'{"p":3}','shared'=>'1','42'=>'zahl'],[]);
$state=learner_progress_state($id);
check($state['values']===['42'=>'zahl','osi-sprint-score'=>'{"p":3}','shared'=>'1'] && $state['deleted']===[],'Einträge werden gespeichert (auch Zahlen-Schlüssel)');
learner_progress_apply($id,'subnet-sprint',['shared'=>'2'],['42']);
$state=learner_progress_state($id);
check($state['values']['shared']==='2' && !isset($state['values']['42']) && $state['deleted']===['42'],'Ändern und Löschen (als Grabstein für andere Geräte)');
learner_progress_apply($id,'osi-sprint',['42'=>'wieder da'],[]);
check(learner_progress_state($id)['values']['42']==='wieder da','Gelöschter Eintrag kann neu gesetzt werden');
check(error_of(fn()=>learner_progress_apply($id,'entwurf',['a'=>'1'],[]))!=='','Unveröffentlichtes Modul wird abgelehnt');
check(error_of(fn()=>learner_progress_apply($id,'spiel-eins',['a'=>'1'],[]))!=='','Nicht-Lernmodul wird abgelehnt');
check(error_of(fn()=>learner_progress_apply($id,'osi-sprint',['dtp-sync:owner'=>'1'],[]))!=='','Interne Hilfsschlüssel werden nicht gespeichert');
check(error_of(fn()=>learner_progress_apply($id,'osi-sprint',[str_repeat('k',201)=>'1'],[]))!=='','Zu langer Schlüssel wird abgelehnt');
check(error_of(fn()=>learner_progress_apply($id,'osi-sprint',['big'=>str_repeat('x',LEARNER_VALUE_MAX+1)],[]))!=='','Eintrag über 256 KB wird abgelehnt');
check(error_of(fn()=>learner_progress_apply($id,'osi-sprint',['a'=>['kein','text']],[]))!=='','Nicht-Text-Wert wird abgelehnt');
$big=[];for($i=0;$i<21;$i++) $big['block'.$i]=str_repeat('y',LEARNER_VALUE_MAX);
check(str_contains(error_of(fn()=>learner_progress_apply($id,'osi-sprint',$big,[])),'5 MB'),'Mehr als 5 MB pro Konto wird abgelehnt');
check(!isset(learner_progress_state($id)['values']['block0']),'Abgelehnter Stapel wird komplett zurückgerollt');
$pdo->prepare("UPDATE learner_progress SET updated_at=? WHERE module_slug='subnet-sprint'")->execute([gmdate('Y-m-d H:i:s',time()-3600)]);
$summary=learner_progress_summary($id);
check($summary[0]['slug']==='osi-sprint' && $summary[0]['entries']===2 && $summary[1]['slug']==='subnet-sprint' && $summary[1]['entries']===1,'Übersicht: zuletzt benutztes Modul zuerst, Einträge gezählt');
check(!in_array('entwurf',array_column($summary,'slug'),true),'Übersicht zeigt keine unveröffentlichten Module ohne Fortschritt');
check(learner_progress_delete_module($id,'osi-sprint')===2 && count(learner_progress_state($id)['values'])===1,'Modul-Fortschritt löschen');
$export=learner_export(learner_by_id($id));
check($export['benutzername']==='Anna.Lernt' && count($export['fortschritt'])===1 && !isset($export['password_hash']),'Export enthält Fortschritt, aber keine Hashes');

// --- Einbindung in Module ---
learner_login('Anna.Lernt','neues-passwort-1');
$html=learner_inject_sync("<!DOCTYPE html>\n<html><HEAD lang=\"de\"><script>alert(localStorage.x)</script></head><body></body></html>",'osi-sprint','index.html');
check(strpos($html,'__DTP_SYNC__')>strpos($html,'<HEAD') && strpos($html,'__DTP_SYNC__')<strpos($html,'alert('),'Sync steht direkt nach <head>, vor den Modul-Skripten');
learner_progress_apply($id,'osi-sprint',['xss'=>'</script><script>alert(1)</script>'],[]);
$html=learner_inject_sync('<html><head></head></html>','osi-sprint','kapitel/zwei.html');
check(!str_contains($html,'</script><script>alert(1)'),'Gespeicherte Werte können das Skript nicht beenden');
check(str_contains($html,'"api":"..\/..\/dau-to-pro\/api\/progress.php"'),'Pfade stimmen auch in Unterordnern');
check(str_starts_with(learner_inject_sync("<!doctype html><p>ohne head",'osi-sprint','index.html'),'<!doctype html>'),'Ohne <head> bleibt der Doctype vorne (kein Quirks-Modus)');
check(str_contains($html,'dau-to-pro/nerd-miniplayer.js') && str_contains($html,'data-api="../../dau-to-pro/api/radio-tracks.php"'),'Module laden den NERD-FM-Mini-Player (Pfade auch in Unterordnern)');
check(substr_count($html,'nerd-miniplayer.css')===1,'Mini-Player-Stil nur einmal');
learner_logout();
$guest=learner_sync_config('osi-sprint','index.html');
check($guest['user']===null && !isset($guest['data']) && !isset($guest['csrf']),'Gäste bekommen keine Daten');

// Alte importierte Footer bereinigen, fachliche Bilder ausdrücklich erhalten.
$legacy='<html><head></head><body><img src="diagramm.svg" alt="Lerngrafik"><footer class="dtp-footer"><div class="foot-brand"><img src="altes-logo.webp" alt=""><div>Modul und Version</div></div></footer></body></html>';
$filtered=learner_inject_sync($legacy,'osi-sprint','index.html');
check(!str_contains($filtered,'altes-logo.webp'),'Altes Footer-Logo verschwindet auch aus importierten Modulversionen');
check(str_contains($filtered,'<img src="diagramm.svg" alt="Lerngrafik">') && str_contains($filtered,'<div>Modul und Version</div>'),'Lernabbildung und Footer-Inhalt bleiben erhalten');

// --- Admin ---
$tempPassword=learner_admin_reset_password($id);
check((bool)preg_match('/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/D',$tempPassword) && error_of(fn()=>learner_login('Anna.Lernt',$tempPassword))==='','Admin-Reset erzeugt funktionierendes Einmal-Passwort');
check(count(learner_admin_list('anna'))===1 && count(learner_admin_list('%'))===0,'Admin-Suche (Platzhalter werden nicht ausgewertet)');
$pdo->prepare("UPDATE learners SET created_at=?,last_seen_at=NULL,last_login_at=NULL WHERE username LIKE 'nutzer%'")->execute([gmdate('Y-m-d H:i:s',time()-40*86400)]);
check(count(learner_admin_empty_ids())===6,'Leere, alte Konten werden erkannt');
learner_delete($id);
check(learner_by_id($id)===null && (int)$pdo->query("SELECT COUNT(*) FROM learner_progress WHERE learner_id=$id")->fetchColumn()===0,'Konto löschen entfernt auch den Fortschritt');

@unlink($db);
echo "$count Prüfungen, ".($failures?"$failures fehlgeschlagen":'alle bestanden')."\n";
exit($failures?1:0);
