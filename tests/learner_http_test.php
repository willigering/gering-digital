<?php
// End-to-end HTTP tests for DAU TO PRO Lernkonten against PHP's built-in server with a temporary database.
// Covers registration (spam protection), login, recovery code, progress API, injection into modules and admin tools.
declare(strict_types=1);
$root=realpath(__DIR__.'/..');
$db=tempnam(sys_get_temp_dir(),'gd-lhttp-').'.sqlite';
putenv('GD_DB_PATH='.$db);
require $root.'/learner_lib.php';
$pdo=db();
$pdo->prepare('INSERT INTO users(username,password_hash) VALUES(?,?)')->execute(['tester',password_hash('ein-langes-testpasswort',PASSWORD_DEFAULT)]);
// Two real module versions on disk (removed again at the end).
$suffix=bin2hex(random_bytes(3));
$lern='lerntest-'.$suffix;$spiel='spieltest-'.$suffix;
$versions=[];
foreach([[$lern,'lernen'],[$spiel,'spiele']] as [$slug,$category]){
    $version=bin2hex(random_bytes(12));$dir=hp_version_dir($slug,$version);mkdir($dir.'/kapitel',0750,true);
    file_put_contents($dir.'/index.html',"<!doctype html>\n<html lang=\"de\"><head><meta charset=\"utf-8\"><title>Test</title><script>window.moduleSaw=localStorage.getItem('score')</script></head><body><h1>Modul</h1></body></html>");
    file_put_contents($dir.'/kapitel/zwei.html','<html><head></head><body>2</body></html>');
    file_put_contents($dir.'/style.css','body{color:red}');
    $pdo->prepare('INSERT INTO html_pages(slug,title,description,category,draft_version,live_version,published) VALUES(?,?,?,?,?,?,1)')->execute([$slug,'Testmodul '.$category,'Beschreibung',$category,$version,$version]);
    $versions[]=hp_storage().'/'.$slug;
}
$port=19000+random_int(0,999);
$cmd=sprintf('GD_ROOT=%s GD_DB_PATH=%s exec php -S 127.0.0.1:%d -t %s %s',escapeshellarg($root),escapeshellarg($db),$port,escapeshellarg($root),escapeshellarg(__DIR__.'/support/router.php'));
$server=proc_open($cmd,[1=>['file','/dev/null','w'],2=>['file','/dev/null','w']],$pipes);
$base="http://127.0.0.1:$port";
for($i=0;$i<50 && !@fsockopen('127.0.0.1',$port);$i++) usleep(100000);
$jars=[];
$failures=0;$count=0;
function check(bool $ok,string $label): void {global $failures,$count;$count++;if(!$ok){$failures++;fwrite(STDERR,"✗ $label\n");}}
function http(string $method,string $path,array|string $data=[],string $who='anna',array $headers=[]): array {
    global $base,$jars;
    $jars[$who]??=tempnam(sys_get_temp_dir(),'jar');
    $ch=curl_init($base.$path);
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_HEADER=>true,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers]);
    if ($who!=='none') curl_setopt_array($ch,[CURLOPT_COOKIEJAR=>$jars[$who],CURLOPT_COOKIEFILE=>$jars[$who]]);
    if ($method==='POST') curl_setopt($ch,CURLOPT_POSTFIELDS,is_array($data)?http_build_query($data):$data);
    $raw=(string)curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$hs=curl_getinfo($ch,CURLINFO_HEADER_SIZE);
    curl_close($ch);
    return ['status'=>$status,'headers'=>substr($raw,0,$hs),'body'=>substr($raw,$hs)];
}
function token(string $html): string {preg_match('/name="csrf" value="([a-f0-9]{64})"/',$html,$m);return $m[1]??'';}
function sync_config(string $html): ?array {return preg_match('/window\.__DTP_SYNC__=(\{.*?\});<\/script>/s',$html,$m)?json_decode($m[1],true):null;}
function api(string $who,string $csrf,array $payload,array $extra=[]): array {
    return http('POST','/dau-to-pro/api/progress.php',json_encode($payload),$who,array_merge(['Content-Type: application/json','X-DTP-CSRF: '.$csrf],$extra));
}
$register=fn(string $who,array $fields)=>http('POST','/dau-to-pro/konto.php',$fields+['action'=>'register','csrf'=>token(http('GET','/dau-to-pro/konto.php?modus=registrieren','', $who)['body']),'website'=>'','ft'=>learner_form_token(time()-6)],$who);
try {
    // --- Module als Gast ---
    $r=http('GET',"/$lern/",'','guest');
    $cfg=sync_config($r['body']);
    check($r['status']===200 && $cfg!==null && $cfg['user']===null && !isset($cfg['data']),'Lernmodul enthält den Sync, Gast ohne Daten');
    check(strpos($r['body'],'__DTP_SYNC__')<strpos($r['body'],'window.moduleSaw'),'Sync läuft vor den Modul-Skripten');
    check(str_contains($r['headers'],'Cache-Control: no-store, private'),'Lernmodul-Seiten werden nicht öffentlich gecacht');
    $sub=sync_config(http('GET',"/$lern/kapitel/zwei.html",'','guest')['body']);
    check(($sub['api']??'')==='../../dau-to-pro/api/progress.php','Unterseiten bekommen den richtigen Pfad');
    $css=http('GET',"/$lern/style.css",'','guest');
    check($css['body']==='body{color:red}' && str_contains($css['headers'],'max-age=300'),'CSS/Assets bleiben unverändert und cachebar');
    $game=http('GET',"/$spiel/",'','guest');
    check(!str_contains($game['body'],'__DTP_SYNC__') && str_contains($game['headers'],'public, max-age=300'),'Andere Kategorien (Spiele) bleiben unverändert');
    $start=http('GET','/dau-to-pro/','','none');
    check(str_contains($start['body'],'<a class="nav-account" href="konto.php">Mein Konto</a>'),'Oberseite zeigt „Mein Konto“ in der Navigation');
    check((bool)preg_match('/Set-Cookie: PHPSESSID=[^\r\n]*HttpOnly[^\r\n]*SameSite=Lax/i',$start['headers']),'Sitzungs-Cookie ist HttpOnly und SameSite=Lax');

    $privacy=http('GET','/datenschutz.php','','none')['body'];
    check(str_contains($privacy,'id="lernkonten"') && str_contains($privacy,'Wiederherstellungscode') && str_contains($privacy,'24 Stunden'),'Datenschutzerklärung beschreibt die Lernkonten');
    // --- Registrierung & Spamschutz ---
    $form=http('GET','/dau-to-pro/konto.php?modus=registrieren','','anna');
    check(str_contains($form['body'],'name="website"') && str_contains($form['body'],'name="ft"') && str_contains($form['headers'],'noindex'),'Registrierung hat unsichtbaren Spamschutz und wird nicht indexiert');
    $csrf=token($form['body']);
    $fields=['action'=>'register','csrf'=>$csrf,'username'=>'Anna.Lernt','password'=>'ein-langes-passwort','password2'=>'ein-langes-passwort','website'=>''];
    http('POST','/dau-to-pro/konto.php',$fields+['ft'=>learner_form_token()],'anna');
    check(learner_find('Anna.Lernt')===null,'Zu schnelles Absenden (Bot) legt kein Konto an');
    http('POST','/dau-to-pro/konto.php',['website'=>'http://spam.example']+$fields+['ft'=>learner_form_token(time()-6)],'anna');
    check(learner_find('Anna.Lernt')===null,'Ausgefülltes verstecktes Feld legt kein Konto an');
    http('POST','/dau-to-pro/konto.php',['csrf'=>str_repeat('0',64)]+$fields+['ft'=>learner_form_token(time()-6)],'anna');
    check(learner_find('Anna.Lernt')===null,'Falsches CSRF-Token legt kein Konto an');
    $r=http('POST','/dau-to-pro/konto.php',$fields+['ft'=>learner_form_token(time()-6),'weiter'=>$lern],'anna');
    check($r['status']===303 && learner_find('Anna.Lernt')!==null,'Registrierung legt das Konto an');
    $page=http('GET','/dau-to-pro/konto.php?weiter='.$lern,'','anna');
    check((bool)preg_match('/<code id="recovery-code">(DTP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})<\/code>/',$page['body'],$m),'Wiederherstellungscode wird nach der Registrierung angezeigt');
    $code=$m[1]??'';
    check(str_contains($page['body'],'href="../'.$lern.'/"'),'Danach geht es zurück zum Modul');
    check(!str_contains(http('GET','/dau-to-pro/konto.php','','anna')['body'],$code),'Der Code wird nur einmal angezeigt');
    $startAnna=http('GET','/dau-to-pro/','','anna')['body'];
    check(str_contains($startAnna,'aria-controls="dtp-account-panel">Mein Konto') && str_contains($startAnna,'<a href="konto.php">Mein Fortschritt</a>') && str_contains($startAnna,'href="konto.php#einstellungen">Konto-Einstellungen</a>') && str_contains($startAnna,'name="action" value="logout"'),'Angemeldet: „Mein Konto“-Menü mit Fortschritt, Einstellungen und Abmelden');

    // --- Speichern im Modul ---
    $cfg=sync_config(http('GET',"/$lern/",'','anna')['body']);
    check(($cfg['user']??'')==='Anna.Lernt' && strlen($cfg['csrf']??'')===64 && $cfg['data']===['values'=>[],'deleted'=>[]],'Angemeldet: Modul bekommt Konto, Token und Stand');
    $acsrf=$cfg['csrf'];
    check(api('anna','falsch',['slug'=>$lern,'set'=>['score'=>'1']])['status']===403,'API ohne gültiges Token wird abgelehnt');
    check(api('anna',$acsrf,['slug'=>$lern,'set'=>['score'=>'1']],['Origin: https://boese.example'])['status']===403,'API von fremder Herkunft wird abgelehnt');
    check(api('anna',$acsrf,['slug'=>$lern,'set'=>['score'=>'1']],['Sec-Fetch-Site: cross-site'])['status']===403,'Cross-Site-Anfragen werden abgelehnt');
    check(api('guest',$acsrf,['slug'=>$lern,'set'=>['score'=>'1']])['status']===401,'API ohne Anmeldung: 401');
    check(http('GET','/dau-to-pro/api/progress.php','','anna')['status']===405,'API nimmt nur POST an');
    check(api('anna',$acsrf,['slug'=>$spiel,'set'=>['score'=>'1']])['status']===422,'Fortschritt nur für Lernmodule');
    check(api('anna',$acsrf,['slug'=>$lern,'set'=>'kaputt'])['status']===400,'Kaputte Anfrage wird abgelehnt');
    $r=api('anna',$acsrf,['slug'=>$lern,'set'=>['score'=>'{"punkte":7}','tab'=>'quiz'],'delete'=>[]],['Origin: '.$base,'Sec-Fetch-Site: same-origin']);
    check($r['status']===200 && json_decode($r['body'],true)['ok']===true,'Fortschritt wird gespeichert');
    check(str_contains($r['headers'],'no-store'),'API-Antworten werden nicht gecacht');
    $cfg=sync_config(http('GET',"/$lern/",'','anna')['body']);
    check(($cfg['data']['values']??[])===['score'=>'{"punkte":7}','tab'=>'quiz'],'Beim nächsten Öffnen ist der Stand da (auch auf anderem Gerät)');
    api('anna',$acsrf,['slug'=>$lern,'delete'=>['tab']]);
    $cfg=sync_config(http('GET',"/$lern/",'','anna')['body']);
    check(($cfg['data']['deleted']??[])===['tab'],'Gelöschte Einträge werden an andere Geräte weitergegeben');
    $konto=http('GET','/dau-to-pro/konto.php','','anna')['body'];
    check(str_contains($konto,'<dt>Module begonnen</dt><dd>1<small>') && !str_contains($konto,'id="module-title"'),'Konto zeigt die Anzahl begonnener Module ohne separate Modulliste');
    $export=http('POST','/dau-to-pro/konto.php',['action'=>'export','csrf'=>token($konto)],'anna');
    $json=json_decode($export['body'],true);
    check(str_contains($export['headers'],'attachment') && ($json['fortschritt'][0]['wert']??'')==='{"punkte":7}' && !str_contains($export['body'],'hash'),'Datenexport als JSON ohne Hashes');

    // --- Abmelden, Anmelden, Angemeldet bleiben ---
    $r=http('POST','/dau-to-pro/konto.php',['action'=>'logout','csrf'=>token($konto)],'anna');
    $after=http('GET','/dau-to-pro/konto.php','','anna')['body'];
    check(str_contains($after,"localStorage") && str_contains($after,'dtp-sync:owner') && str_contains($after,'name="password"'),'Abmelden entfernt den Stand vom Gerät und zeigt wieder die Anmeldung');
    check(sync_config(http('GET',"/$lern/",'','anna')['body'])['user']===null,'Nach dem Abmelden bekommt das Modul keine Daten mehr');
    $login=http('GET','/dau-to-pro/konto.php','','anna');
    $r=http('POST','/dau-to-pro/konto.php',['action'=>'login','csrf'=>token($login['body']),'username'=>'anna.lernt','password'=>'falsch-falsch'],'anna');
    check(str_contains(http('GET','/dau-to-pro/konto.php','','anna')['body'],'Benutzername oder Passwort stimmt nicht.'),'Falsches Passwort zeigt eine Meldung');
    $login=http('GET','/dau-to-pro/konto.php','','anna');
    $r=http('POST','/dau-to-pro/konto.php',['action'=>'login','csrf'=>token($login['body']),'username'=>'anna.lernt','password'=>'ein-langes-passwort','remember'=>'1','weiter'=>$lern],'anna');
    check($r['status']===303 && str_contains($r['headers'],"Location: ../$lern/"),'Anmeldung führt zurück ins Modul');
    check((bool)preg_match('/Set-Cookie: dtp_remember=[a-f0-9]{24}%3A[a-f0-9]{64};[^\r\n]*HttpOnly[^\r\n]*SameSite=Lax/i',$r['headers']),'„Angemeldet bleiben“-Cookie ist HttpOnly und SameSite=Lax');
    // Only the remember cookie survives (browser restart).
    $jar=file_get_contents($jars['anna']);
    file_put_contents($jars['anna'],implode("\n",array_filter(explode("\n",$jar),fn($l)=>!str_contains($l,'PHPSESSID'))));
    check((sync_config(http('GET',"/$lern/",'','anna')['body'])['user']??'')==='Anna.Lernt','Nach Browser-Neustart automatisch wieder angemeldet');

    // --- NERD FM: Playlist-Einstellung im Konto (api/radio.php) ---
    $landing=http('GET','/dau-to-pro/','','anna')['body'];
    preg_match('/data-radio-api="api\/radio\.php" data-radio-csrf="([a-f0-9]{64})"/',$landing,$rm);
    check(!empty($rm[1]),'Startseite übergibt dem Radio mit Konto die Speicher-Schnittstelle');
    check(!str_contains(http('GET','/dau-to-pro/','','none')['body'],'data-radio-api'),'Gäste bekommen keine Speicher-Schnittstelle');
    $radio=fn(string $who,string $csrf,string $body,array $extra=[])=>http('POST','/dau-to-pro/api/radio.php',$body,$who,array_merge(['Content-Type: application/json','X-DTP-CSRF: '.$csrf],$extra));
    check($radio('none','x','{"off":[]}')['status']===401,'Radio-API: ohne Konto abgewiesen');
    check($radio('anna','falsch','{"off":[]}')['status']===403,'Radio-API: falsches CSRF-Token abgewiesen');
    check($radio('anna',$rm[1]??'','{"off":[]}',['Sec-Fetch-Site: cross-site'])['status']===403,'Radio-API: fremde Websites abgewiesen');
    check($radio('anna',$rm[1]??'','kaputt')['status']===400 && $radio('anna',$rm[1]??'','{"off":"apipa"}')['status']===400,'Radio-API: ungültige Anfragen abgewiesen');
    check(http('GET','/dau-to-pro/api/radio.php','','anna')['status']===405,'Radio-API: nur POST');
    $ok=$radio('anna',$rm[1]??'','{"off":[]}');
    check($ok['status']===200 && (json_decode($ok['body'],true)['ok']??false)===true,'Radio-API: leere Abwahl wird gespeichert');
    // Die Zahl frei zugänglicher Songs wächst: alle tatsächlich angebotenen Titel abwählen.
    preg_match('/data-tracks="([^"]*)"/',$landing,$playlistMatch);
    $radioTracks=json_decode(html_entity_decode($playlistMatch[1]??'[]',ENT_QUOTES),true)?:[];
    $allPublicIds=array_column($radioTracks,'id');
    $deny=$radio('anna',$rm[1]??'',json_encode(['off'=>$allPublicIds],JSON_THROW_ON_ERROR));
    check($deny['status']===422 && str_contains($deny['body'],'Mindestens ein Titel'),'Radio-API: der letzte aktive Titel kann nicht abgewählt werden');

    // --- Wiederherstellungscode ---
    $form=http('GET','/dau-to-pro/konto.php?modus=vergessen','','fremd');
    $r=http('POST','/dau-to-pro/konto.php',['action'=>'recover','csrf'=>token($form['body']),'username'=>'Anna.Lernt','code'=>strtolower($code),'password'=>'neues-passwort-1','password2'=>'neues-passwort-1','website'=>'','ft'=>learner_form_token(time()-6)],'fremd');
    $page=http('GET','/dau-to-pro/konto.php','','fremd')['body'];
    check(str_contains($page,'NEUER WIEDERHERSTELLUNGSCODE') && !str_contains($page,$code),'Passwort mit Code zurückgesetzt, neuer Code angezeigt');
    check(sync_config(http('GET',"/$lern/",'','anna')['body'])['user']===null,'Alle anderen Geräte wurden dabei abgemeldet');

    // --- Admin ---
    check(http('GET','/admin/learners.php','','none')['status']===302,'Lernkonten-Verwaltung verlangt Admin-Login');
    $admin=http('GET','/admin/login.php','','admin');
    http('POST','/admin/login.php',['csrf'=>token($admin['body']),'username'=>'tester','password'=>'ein-langes-testpasswort'],'admin');
    $list=http('GET','/admin/learners.php','','admin');
    check($list['status']===200 && str_contains($list['body'],'Anna.Lernt') && str_contains($list['body'],'1 Modul'),'Admin sieht die Lernkonten');
    check(!str_contains($list['body'],learner_find('Anna.Lernt')['password_hash']),'Admin sieht keine Passwort-Hashes');
    check(str_contains(http('GET','/admin/index.php','','admin')['body'],'learners.php'),'Seitenleiste verlinkt die Lernkonten');
    $id=(int)learner_find('Anna.Lernt')['id'];
    $acsrf=token($list['body']);
    check(api('anna','x',['slug'=>$lern])['status']===401 && http('POST','/admin/learners.php',['action'=>'reset_password','id'=>$id,'csrf'=>'falsch'],'admin')['body']==='Ungültige Anfrage.','Admin-Aktionen brauchen ein gültiges Token');
    http('POST','/admin/learners.php',['action'=>'reset_password','id'=>$id,'csrf'=>$acsrf],'admin');
    $list=http('GET','/admin/learners.php','','admin');
    check((bool)preg_match('/<span class="learner-secret">([a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4})<\/span>/',$list['body'],$pm),'Admin-Reset zeigt das neue Passwort einmal');
    check(sync_config(http('GET',"/$lern/",'','fremd')['body'])['user']===null,'Admin-Reset meldet die Person überall ab');
    $login=http('GET','/dau-to-pro/konto.php','','fremd');
    $r=http('POST','/dau-to-pro/konto.php',['action'=>'login','csrf'=>token($login['body']),'username'=>'Anna.Lernt','password'=>$pm[1]??''],'fremd');
    check($r['status']===303 && preg_match('~Location: \./\r?\n~',$r['headers'])===1,'Anmeldung ohne Ziel führt auf die DAU-TO-PRO-Hauptseite');
    $konto=http('GET','/dau-to-pro/konto.php','','fremd')['body'];
    check(str_contains($konto,'Hallo, <span>Anna.Lernt</span>'),'Anmeldung mit dem Admin-Passwort klappt');

    // --- Alles auf null ---
    $pdo->prepare("INSERT OR REPLACE INTO learner_progress(learner_id,storage_key,module_slug,value,updated_at,deleted) VALUES(?,?,?,?,?,0)")->execute([$id,'reset-probe',$lern,'1',learner_now()]);
    $pdo->prepare("INSERT OR IGNORE INTO learner_achievements(learner_id,code) VALUES(?,'g.easteregg')")->execute([$id]);
    $pdo->prepare("INSERT OR IGNORE INTO learner_stats(learner_id) VALUES(?)")->execute([$id]);
    $pdo->prepare("UPDATE learner_stats SET xp=999,level=4,achievements=3,days=5,highscore_visible=1 WHERE learner_id=?")->execute([$id]);
    $active=fn()=>(int)$pdo->query("SELECT COUNT(*) FROM learner_progress WHERE learner_id=$id AND deleted=0")->fetchColumn();
    check(str_contains($konto,'Alles auf null setzen') && str_contains($konto,'pattern="NULL"'),'Konto-Einstellungen bieten „Alles auf null setzen“ mit Warnung');
    http('POST','/dau-to-pro/konto.php',['action'=>'reset_all','csrf'=>token($konto),'current'=>$pm[1]??'','confirm'=>'null'],'fremd');
    check($active()>0,'Ohne exakte Bestätigung NULL wird nichts zurückgesetzt');
    http('POST','/dau-to-pro/konto.php',['action'=>'reset_all','csrf'=>token($konto),'current'=>'falsches-passwort','confirm'=>'NULL'],'fremd');
    check($active()>0,'Mit falschem Passwort wird nichts zurückgesetzt');
    $r=http('POST','/dau-to-pro/konto.php',['action'=>'reset_all','csrf'=>token($konto),'current'=>$pm[1]??'','confirm'=>'NULL'],'fremd');
    $st=$pdo->query("SELECT xp,level,achievements,days,highscore_visible,best FROM learner_stats WHERE learner_id=$id")->fetch(PDO::FETCH_ASSOC);
    check($r['status']===303 && $active()===0 && (int)$pdo->query("SELECT COUNT(*) FROM learner_progress WHERE learner_id=$id AND deleted=1")->fetchColumn()>0,'Alles auf null: Fortschritt aller Module wird zu Löschmarken (auch für andere Geräte)');
    check((int)$pdo->query("SELECT COUNT(*) FROM learner_achievements WHERE learner_id=$id")->fetchColumn()===0,'Alles auf null: Achievements gelöscht');
    check($st==['xp'=>0,'level'=>1,'achievements'=>0,'days'=>0,'highscore_visible'=>0,'best'=>'{}'],'Alles auf null: XP, Level, Lerntage, Bestwerte und Highscore-Sichtbarkeit zurückgesetzt');
    $after=http('GET','/dau-to-pro/konto.php','','fremd')['body'];
    check(str_contains($after,'Alles auf null') && str_contains($after,'dtp-sync:owner') && learner_find('Anna.Lernt')!==null,'Bestätigung, Gerät wird geleert, Konto bleibt');
    $konto=$after;

    // --- Konto löschen ---
    http('POST','/dau-to-pro/konto.php',['action'=>'delete_account','csrf'=>token($konto),'current'=>$pm[1]??'','confirm'=>'falsch'],'fremd');
    check(learner_find('Anna.Lernt')!==null,'Ohne Bestätigung wird nichts gelöscht');
    http('POST','/dau-to-pro/konto.php',['action'=>'delete_account','csrf'=>token($konto),'current'=>$pm[1]??'','confirm'=>'LÖSCHEN'],'fremd');
    check(learner_find('Anna.Lernt')===null && (int)$pdo->query("SELECT COUNT(*) FROM learner_progress WHERE learner_id=$id")->fetchColumn()===0,'Konto löschen entfernt Konto und Fortschritt');
    check(str_contains(http('GET','/dau-to-pro/konto.php','','fremd')['body'],'vollständig gelöscht'),'Bestätigung nach dem Löschen');

    // --- Registrierungslimit ---
    // Von diesem Anschluss wurde oben schon „Anna.Lernt“ angelegt: noch 4 weitere sind erlaubt, das 6. Konto wird gebremst.
    for($i=0;$i<5;$i++) $register('bot',['username'=>'serie'.$i,'password'=>'ein-langes-passwort','password2'=>'ein-langes-passwort']);
    $made=array_values(array_filter(range(0,4),fn($i)=>learner_find('serie'.$i)!==null));
    check($made===[0,1,2,3],'Bis zu 5 Konten pro Stunde und Anschluss klappen');
    check(learner_find('serie4')===null,'Ab dem 6. Konto pro Stunde und Anschluss wird gebremst');
} finally {
    proc_terminate($server);
    foreach($versions as $dir) hp_delete_tree($dir);
    foreach($jars as $jar) @unlink($jar);
    @unlink($db);
}
echo $failures?"$failures von $count Prüfungen fehlgeschlagen\n":"Lernkonten-HTTP-Tests: $count Prüfungen bestanden\n";
exit($failures?1:0);
