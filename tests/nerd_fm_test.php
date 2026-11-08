<?php
// NERD FM: Freischaltung, signierte Links, Kartenvermerk (Unit) und geschützte Auslieferung über api/song.php (HTTP).
// Aufruf: php tests/nerd_fm_test.php
declare(strict_types=1);
$db=tempnam(sys_get_temp_dir(),'gd-nfm-').'.sqlite';
putenv('GD_DB_PATH='.$db);
$_SERVER['REMOTE_ADDR']='203.0.113.7';
require __DIR__.'/../nerd_fm_lib.php';
$failures=0;$count=0;
function check(bool $ok,string $label): void {global $failures,$count;$count++;if(!$ok){$failures++;fwrite(STDERR,"✗ $label\n");}}

// ---------------------------------------------------------------- Katalog und Freischaltung
$songs=nfm_songs();
check(array_keys($songs)===['apipa','sieben-schichten','klopf-klopf','dau-to-pro'],'Vier Songs in fester Reihenfolge');
check($songs['apipa']['unlock']===null,'APIPA ist sofort verfügbar');
check($songs['sieben-schichten']['unlock']==='osi.lernpfad' && $songs['sieben-schichten']['module']==='osi-sprint','7 Schichten: Lernpfad Easy OSI for FISI');
check($songs['klopf-klopf']['unlock']==='b5.lernpfad' && $songs['klopf-klopf']['module']==='b5-netzwerkdienste','Klopf, Klopf: Lernpfad Port 80, bitte kommen');
check($songs['dau-to-pro']['unlock']==='g.easteregg' && $songs['dau-to-pro']['module']===null,'DAU to PRO: Pilz-Easter-Egg, ohne Kartenvermerk');
foreach ($songs as $id=>$s) {
    check(is_file(nfm_dir().'/'.$s['file']),"Datei für $id vorhanden");
    if ($s['unlock']!==null) check(isset(ach_catalog()[$s['unlock']]),"Achievement {$s['unlock']} existiert");
}
check(trim((string)file_get_contents(nfm_dir().'/.htaccess'))==='Deny from all','Songordner ist für direkte Abrufe gesperrt');

check(nfm_radio_files(null)===nfm_tracks(null),'Radio und Mini-Player nutzen dieselbe Titelliste');
$guest=nfm_tracks(null);
check(count($guest)===1 && $guest[0]['title']==='Diggy Thal – APIPA','Gäste hören nur APIPA');
check(!str_contains(json_encode($guest),'.mp3'),'Playlist verrät keine Dateinamen');

db()->prepare('INSERT INTO learners(username,password_hash) VALUES(?,?)')->execute(['hoerer','x']);
$lid=(int)db()->lastInsertId();
$learner=learner_by_id($lid);
check(count(nfm_tracks($learner))===1,'Neues Konto: nur APIPA');
db()->prepare('INSERT INTO learner_achievements(learner_id,code,unlocked_at) VALUES(?,?,?)')->execute([$lid,'b5.lernpfad','2026-11-07 12:00:00']);
$titles=array_column(nfm_tracks($learner),'title');
check($titles===['Diggy Thal – APIPA','Diggy Thal – Klopf, Klopf'],'Lernpfad B5 schaltet „Klopf, Klopf“ frei');
db()->prepare('INSERT INTO learner_achievements(learner_id,code,unlocked_at) VALUES(?,?,?)')->execute([$lid,'g.easteregg','2026-11-07 12:00:00']);
check(in_array('DAU to PRO',array_column(nfm_tracks($learner),'title'),true),'Easter Egg schaltet „DAU to PRO“ frei');

// ---------------------------------------------------------------- Playlist-Editor: abgewählte Titel im Konto
check(array_column(nfm_tracks($learner),'on')===[true,true,true],'Standard: alle freigeschalteten Titel sind aktiv');
check(nfm_save_off($learner,['klopf-klopf'])===['klopf-klopf'] && nfm_off_ids($learner)===['klopf-klopf'],'Abgewählter Titel wird im Konto gespeichert');
$on=array_column(nfm_tracks($learner),'on','id');
check($on['klopf-klopf']===false && $on['apipa']===true && $on['dau-to-pro']===true,'Playlist liefert den gespeicherten Stand (aus für „Klopf, Klopf“)');
check(nfm_save_off($learner,['apipa','unbekannt','../x',42,'sieben-schichten'])===['apipa'],'Unbekannte, nicht freigeschaltete und ungültige IDs werden ignoriert');
check(nfm_off_ids($learner)===['apipa'],'Gespeichert wird nur, was dem Konto zur Verfügung steht');
try { nfm_save_off($learner,['apipa','klopf-klopf','dau-to-pro']); check(false,'Alle Titel abwählen wird abgelehnt'); }
catch (LearnerError $e) { check(str_contains($e->getMessage(),'Mindestens ein Titel'),'Alle Titel abwählen wird abgelehnt'); }
check(nfm_off_ids($learner)===['apipa'],'Abgelehnte Änderung lässt den Stand unverändert');
nfm_save_off($learner,[]);
check(array_column(nfm_tracks($learner),'on')===[true,true,true] && nfm_off_ids($learner)===[],'Alle wieder aktivieren');
nfm_save_off($learner,['dau-to-pro']);
check(nfm_off_ids(null)===[] && !in_array(false,array_column(nfm_tracks(null),'on'),true),'Gäste haben keine Konto-Einstellung');
$export=learner_export($learner);
check(isset($export['einstellungen'][NFM_PREF_KEY]) && $export['einstellungen'][NFM_PREF_KEY]===['dau-to-pro'],'Datenexport enthält die Playlist-Einstellung');
db()->prepare('DELETE FROM learners WHERE id=?')->execute([$lid]);
check((int)db()->query('SELECT COUNT(*) FROM learner_prefs')->fetchColumn()===0,'Einstellungen verschwinden mit dem Konto');
db()->prepare('INSERT INTO learners(id,username,password_hash) VALUES(?,?,?)')->execute([$lid,'hoerer','x']);
db()->prepare('INSERT INTO learner_achievements(learner_id,code,unlocked_at) VALUES(?,?,?)')->execute([$lid,'b5.lernpfad','2026-11-07 12:00:00']);
db()->prepare('INSERT INTO learner_achievements(learner_id,code,unlocked_at) VALUES(?,?,?)')->execute([$lid,'g.easteregg','2026-11-07 12:00:00']);
$learner=learner_by_id($lid);

// ---------------------------------------------------------------- Links
$now=1800000000;
$link=nfm_link('apipa',$lid,'sess-a',$now);
parse_str((string)parse_url($link,PHP_URL_QUERY),$q);
check(nfm_link_ok('apipa',$lid,'sess-a',$q['e'],$q['k'],$now),'Link gilt in der eigenen Sitzung');
check(!nfm_link_ok('apipa',$lid,'sess-b',$q['e'],$q['k'],$now),'Link gilt nicht in einer anderen Sitzung');
check(!nfm_link_ok('apipa',0,'sess-a',$q['e'],$q['k'],$now),'Link gilt nicht für ein anderes Konto');
check(!nfm_link_ok('klopf-klopf',$lid,'sess-a',$q['e'],$q['k'],$now),'Link gilt nicht für einen anderen Song');
check(!nfm_link_ok('apipa',$lid,'sess-a',$q['e'],$q['k'],$now+NFM_LINK_SECONDS+1),'Link läuft ab');
check(!nfm_link_ok('apipa',$lid,'sess-a',$q['e'],str_repeat('0',40),$now),'Gefälschte Signatur wird abgewiesen');

// ---------------------------------------------------------------- Kartenvermerk
check(str_contains((string)nfm_card_note('osi-sprint',[]),'„7 Schichten“ freischaltbar'),'OSI-Karte: Song freischaltbar');
check(str_contains((string)nfm_card_note('b5-netzwerkdienste',['b5.lernpfad'=>'x']),'freigeschaltet'),'B5-Karte nach Freischaltung');
check(nfm_card_note('d2-it-sicherheit',[])===null,'Andere Karten ohne Vermerk');
check(str_contains((string)nfm_card_note('osi',[]),'„7 Schichten“') && str_contains((string)nfm_card_note('osi-modell',[]),'„7 Schichten“'),'OSI-Karte auch unter älteren Adressen (osi, osi-modell)');
$all=implode('',array_map(fn($s)=>(string)nfm_card_note($s,[]),['osi-sprint','b5-netzwerkdienste','a1-zahlensysteme','d2-it-sicherheit','b4-ipv6','cs1-csharp','f2-kalkulation','d1-datenschutz','netzwerke-sprint','subnet-sprint']));
check(!str_contains($all,'DAU to PRO'),'Kein Vermerk für den versteckten Song');

// ---------------------------------------------------------------- HTTP: api/song.php
$port=18000+random_int(0,900);
$root=realpath(__DIR__.'/..');
$proc=proc_open([PHP_BINARY,'-S','127.0.0.1:'.$port,'-t',$root],[1=>['file',sys_get_temp_dir().'/nfm-server.log','w'],2=>['file',sys_get_temp_dir().'/nfm-server.log','a']],$pipes,$root,['GD_DB_PATH'=>$db]+getenv());
usleep(700000);
function http(string $url,array $headers=[]): array {
    $ctx=stream_context_create(['http'=>['method'=>'GET','header'=>implode("\r\n",$headers),'ignore_errors'=>true,'follow_location'=>0]]);
    $body=@file_get_contents($url,false,$ctx);
    $status=0;$head=[];
    foreach ($http_response_header??[] as $h) { if (preg_match('~^HTTP/\S+ (\d+)~',$h,$m)) $status=(int)$m[1]; else { [$k,$v]=array_map('trim',explode(':',$h,2)+[1=>'']); $head[strtolower($k)][]=$v; } }
    return [$status,$head,(string)$body];
}
try {
    $base='http://127.0.0.1:'.$port.'/dau-to-pro/';
    [$st,$head,$html]=http($base);
    check($st===200,'Seite lädt');
    $cookie='';
    foreach ($head['set-cookie']??[] as $c) if (preg_match('/^(PHPSESSID=[^;]+)/',$c,$m)) $cookie=$m[1];
    check($cookie!=='','Sitzung wird angelegt');
    preg_match('/data-tracks="([^"]*)"/',$html,$m);
    $tracks=json_decode(html_entity_decode($m[1]??'[]',ENT_QUOTES),true)?:[];
    check(count($tracks)===1 && $tracks[0]['title']==='Diggy Thal – APIPA','Gast-Playlist nur mit APIPA');
    check(!str_contains($html,'nerd-fm/') && !str_contains($html,'.mp3'),'Seite enthält keinen Dateipfad');
    $src=$base.($tracks[0]['src']??'');
    $audio=['Cookie: '.$cookie,'Sec-Fetch-Site: same-origin','Sec-Fetch-Dest: audio'];
    [$st,$head,$body]=http($src,array_merge($audio,['Range: bytes=0-1023']));
    check($st===206 && strlen($body)===1024 && ($head['content-type'][0]??'')==='audio/mpeg','Song mit gültigem Link und Range');
    check(str_contains(($head['cache-control'][0]??''),'no-store'),'Kein Zwischenspeichern');
    [$st]=http($src,['Sec-Fetch-Site: same-origin','Sec-Fetch-Dest: audio']);
    check($st===403,'Ohne eigene Sitzung kein Abruf');
    [$st]=http($src,['Cookie: '.$cookie,'Sec-Fetch-Site: cross-site','Sec-Fetch-Dest: audio']);
    check($st===403,'Fremde Website (Hotlink) wird abgewiesen');
    [$st]=http($src,['Cookie: '.$cookie,'Sec-Fetch-Site: none','Sec-Fetch-Dest: document']);
    check($st===403,'Direktes Öffnen im Browser-Tab wird abgewiesen');
    // Gesperrter Song mit korrekt signiertem Link für diese Gast-Sitzung: trotzdem kein Abruf
    $sid=substr($cookie,strlen('PHPSESSID='));
    $locked=$base.nfm_link('klopf-klopf',0,$sid);
    [$st]=http($locked,$audio);
    check($st===403,'Nicht freigeschalteter Song bleibt gesperrt, auch mit gültiger Signatur');
    [$st]=http($base.'api/song.php?s=../../data/x&e=1&k=0',$audio);
    check($st===404,'Unbekannte Song-ID wird abgewiesen');
    // Begrenzung der Songstarts je Sitzung
    $blocked=false;
    for ($i=0;$i<NFM_RATE_LIMIT+2;$i++) { [$st]=http($src,array_merge($audio,['Range: bytes=0-15'])); if ($st===429) {$blocked=true;break;} }
    check($blocked,'Massenabruf wird begrenzt');
} finally {
    proc_terminate($proc); proc_close($proc);
}

echo $failures===0?"NERD FM: alle $count Prüfungen bestanden\n":"NERD FM: $failures von $count Prüfungen fehlgeschlagen\n";
exit($failures===0?0:1);
