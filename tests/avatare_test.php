<?php
// DAU TO PRO Avatare: Katalog und Dateien, Bereinigung, Speichern/Laden (additiv in learner_prefs),
// Highscore-Einbindung (öffentlich ohne Anmeldung), Auswahlseite, Konto und Profil über PHPs eingebauten Server.
// Aufruf: php tests/avatare_test.php
declare(strict_types=1);
$root=realpath(__DIR__.'/..');
$db=tempnam(sys_get_temp_dir(),'gd-avatare-').'.sqlite';
putenv('GD_DB_PATH='.$db);
$_SERVER['REMOTE_ADDR']='203.0.113.9';
require $root.'/achievements_lib.php';
require $root.'/avatare_lib.php';
$failures=0;$count=0;
function check(bool $ok,string $label): void {global $failures,$count;$count++;if(!$ok){$failures++;fwrite(STDERR,"✗ $label\n");}}

// ---------------------------------------------------------------- Katalog und Dateien
$catalog=dtp_avatar_catalog();
check(array_keys($catalog)===array_map(fn($n)=>sprintf('avatar-%02d',$n),range(1,17)),'Sieben kompatible Altfiguren und zehn Arcade-Figuren');
check(count(array_filter($catalog,fn($p)=>count($p)===3))===7,'Jeder Altavatar hat drei eigene Zubehörteile');
$order=['avatar-01'=>['carbonkragen','kapuze','atemmaske'],'avatar-02'=>['dreitagebart','techniker-cap','funk-headset'],'avatar-03'=>['bomberjacke','fliegerbrille','ohrclip'],
    'avatar-04'=>['schulterjacke','stirnband','rennvisier'],'avatar-05'=>['halsschal','kapuze','maske'],'avatar-06'=>['jacke','kopfhoerer','schlaefenklammer'],'avatar-07'=>['arbeitsjacke','kinnbart','brille']];
check(array_map('array_keys',array_slice($catalog,0,7,true))===$order,'Zeichenreihenfolge der Teile (hinten → vorne) wie im Paket');
$forbidden='/\b(willi|julian|lena|tim|sarah|marco|david|platz \d|rang|krone|lorbeer)\b/i';
$labels=implode(' ',array_merge(array_map('dtp_avatar_label',array_keys($catalog)),...array_map('array_values',array_values($catalog))));
check(!preg_match($forbidden,$labels),'Keine Namen und keine Rangbezeichnungen in Beschriftungen');
$dir=$root.'/'.DTP_AVATAR_DIR;
$bad=[];$files=0;
foreach ($catalog as $id=>$parts) foreach (array_merge(isset($order[$id])?['referenz','basis']:['basis'],array_keys($parts)) as $layer) {
    $png="$dir/$id-$layer.png";
    $info=@getimagesize($png);
    if (!$info || $info[0]!==512 || $info[1]!==512) {$bad[]="$id-$layer.png";continue;}
    $files++;
    $im=imagecreatefrompng($png);
    if ((imagecolorat($im,0,0)>>24&0x7F)!==127 || (imagecolorat($im,511,511)>>24&0x7F)!==127) $bad[]="$id-$layer.png (nicht transparent)";
    foreach ([512=>'.webp',192=>'-192.webp'] as $size=>$suffix) {
        $w=@getimagesize("$dir/$id-$layer$suffix");
        if (!$w || $w[0]!==$size || $w[1]!==$size) $bad[]="$id-$layer$suffix";
    }
}
check($files===65 && $bad===[],'65 transparente 512er-PNGs plus WebP 512 und 192'.($bad?': '.implode(', ',array_slice($bad,0,5)):''));
$onDisk=array_map('basename',glob("$dir/*.png"));
check(count($onDisk)===65 && !array_filter($onDisk,fn($f)=>!preg_match('/^avatar-(?:0[1-9]|1[0-7])-[a-z-]+\.png$/',$f)),'Dateinamen nur mit den IDs avatar-01 bis avatar-17');
// Referenz-Look = Basisporträt + alle drei Teile in Katalog-Reihenfolge (gleiche Leinwand, gleiche Position).
foreach (['avatar-01','avatar-04','avatar-07'] as $id) {
    $im=imagecreatefrompng("$dir/$id-basis.png");imagealphablending($im,true);
    foreach (array_keys($catalog[$id]) as $p) {$l=imagecreatefrompng("$dir/$id-$p.png");imagecopy($im,$l,0,0,0,0,512,512);}
    $ref=imagecreatefrompng("$dir/$id-referenz.png");$diff=0;
    for ($y=0;$y<512;$y+=4) for ($x=0;$x<512;$x+=4) {
        $a=imagecolorsforindex($im,imagecolorat($im,$x,$y));$b=imagecolorsforindex($ref,imagecolorat($ref,$x,$y));
        if (abs($a['red']-$b['red'])+abs($a['green']-$b['green'])+abs($a['blue']-$b['blue'])+abs($a['alpha']-$b['alpha'])>12) $diff++;
    }
    check($diff<20,"$id: Basis + Teile ergeben deckungsgleich den Referenz-Look ($diff Abweichungen)");
}

// ---------------------------------------------------------------- Bereinigung
check(dtp_avatar_normalize(null)===null && dtp_avatar_normalize(['id'=>'avatar-18'])===null && dtp_avatar_normalize(['id'=>'<script>'])===null,'Unbekannte Avatare ergeben „kein Avatar“');
check(dtp_avatar_normalize(['id'=>'avatar-03','parts'=>['ohrclip','bomberjacke','kapuze','rennvisier',['x']]])===['id'=>'avatar-03','parts'=>['bomberjacke','ohrclip']],'Fremde Teile fallen weg, Reihenfolge folgt dem Katalog');
check(dtp_avatar_normalize(['id'=>'avatar-05'])===['id'=>'avatar-05','parts'=>[]],'Ohne Teile: nur das Basisporträt');
check(dtp_avatar_full('avatar-06')['parts']===['jacke','kopfhoerer','schlaefenklammer'],'Voller Look trägt alle drei Teile gleichzeitig');
$layers=dtp_avatar_layers(['id'=>'avatar-01','parts'=>['carbonkragen','kapuze','atemmaske']]);
check(array_column($layers,'part')===['basis','carbonkragen','kapuze','atemmaske'],'Ebenen: Basis zuerst, Carbonkragen unter der Kapuze, Maske vorne');
check(dtp_avatar_stack_html(null)==='','Ohne Avatar keine Ebenen (Platzhalter bleibt)');

// ---------------------------------------------------------------- Speichern und Laden
$pdo=db();
$mk=function(string $name,int $xp,bool $public=false) use ($pdo): int {
    $pdo->prepare('INSERT INTO learners(username,password_hash) VALUES(?,?)')->execute([$name,'x']);
    $id=(int)$pdo->lastInsertId();ach_stats_row($id);
    $pdo->prepare('UPDATE learner_stats SET xp=?,level=?,highscore_visible=? WHERE learner_id=?')->execute([$xp,ach_level($xp),$public?1:0,$id]);
    if ($public) $pdo->prepare("INSERT INTO learner_prefs(learner_id,pref_key,value) VALUES(?,'highscore_public','1')")->execute([$id]);
    return $id;
};
$anna=$mk('anna',ach_xp_for_level(12),true);
$bert=$mk('bert',ach_xp_for_level(3),true);
$pdo->prepare("INSERT INTO learner_prefs(learner_id,pref_key,value) VALUES(?,'nerd_fm','{\"off\":true}')")->execute([$anna]);
// Altdaten des zurückgenommenen Systems werden ignoriert, aber nicht gelöscht.
$pdo->prepare("INSERT INTO learner_prefs(learner_id,pref_key,value) VALUES(?,'avatar','{\"v\":1,\"config\":{\"base\":\"f2\"}}')")->execute([$bert]);
check(dtp_avatar_get($anna)===null && dtp_avatar_get($bert)===null,'Ohne Wahl kein Avatar; alter Schlüssel „avatar“ wird nicht gelesen');
$saved=dtp_avatar_save($anna,['id'=>'avatar-04','parts'=>['stirnband','rennvisier']]);
check(dtp_avatar_get($anna)===$saved && $saved===['id'=>'avatar-04','parts'=>['stirnband','rennvisier']],'Speichern und Laden');
$err='';
try { dtp_avatar_save($anna,['id'=>'base-f2']); } catch (LearnerError $e) { $err=$e->getMessage(); }
check($err!=='' && dtp_avatar_get($anna)===$saved,'Unbekannter Avatar wird abgelehnt und ändert nichts');
$prefs=$pdo->query("SELECT pref_key,value FROM learner_prefs WHERE learner_id=$anna ORDER BY pref_key")->fetchAll(PDO::FETCH_KEY_PAIR);
check(($prefs['nerd_fm']??'')==='{"off":true}' && ($prefs['highscore_public']??'')==='1','Andere Einstellungen bleiben unberührt');
check(isset(learner_prefs_export($anna)[DTP_AVATAR_PREF]) || str_contains(json_encode(learner_prefs_export($anna)),DTP_AVATAR_PREF),'Avatar steht im Datenexport');
$xpBefore=$pdo->query("SELECT xp,level,achievements FROM learner_stats WHERE learner_id=$anna")->fetch(PDO::FETCH_ASSOC);
dtp_avatar_save($anna,['id'=>'avatar-04','parts'=>['schulterjacke','stirnband','rennvisier']]);
check((int)$pdo->query("SELECT COUNT(*) FROM learner_prefs WHERE pref_key='".DTP_AVATAR_PREF."'")->fetchColumn()===1,'Erneutes Speichern aktualisiert genau den eigenen Eintrag');
check($pdo->query("SELECT xp,level,achievements FROM learner_stats WHERE learner_id=$anna")->fetch(PDO::FETCH_ASSOC)===$xpBefore,'XP, Level und Achievements bleiben unverändert');
$rows=ach_highscore(100,true);
$av=dtp_avatar_for_rows($rows);
check(isset($av[$anna]) && !isset($av[$bert]),'Highscore: Avatare nur für Konten mit eigener Wahl');
$html=dtp_avatar_stack_html($av[$anna]);
preg_match_all('~src="([^"]+)"~',$html,$srcs);
check(count($srcs[1])===4 && str_starts_with($srcs[1][0],'../assets/dau-avatare/avatar-04-basis-192.webp') && str_starts_with($srcs[1][3],'../assets/dau-avatare/avatar-04-rennvisier-192.webp'),'Ebenen-Stapel mit 192er-Thumbs in Reihenfolge');
dtp_avatar_save($bert,null);
check((int)$pdo->query("SELECT COUNT(*) FROM learner_prefs WHERE learner_id=$bert AND pref_key='avatar'")->fetchColumn()===1,'„Kein Avatar“ lässt fremde/alte Einträge stehen');

// ---------------------------------------------------------------- HTTP
$port=19000+random_int(2000,2999);
$cmd=sprintf('GD_ROOT=%s GD_DB_PATH=%s exec php -S 127.0.0.1:%d -t %s %s',escapeshellarg($root),escapeshellarg($db),$port,escapeshellarg($root),escapeshellarg(__DIR__.'/support/router.php'));
$server=proc_open($cmd,[1=>['file','/dev/null','w'],2=>['file','/dev/null','w']],$pipes);
for($i=0;$i<50 && !@fsockopen('127.0.0.1',$port);$i++) usleep(100000);
$base="http://127.0.0.1:$port";$jars=[];
function http(string $method,string $path,string $data='',string $who='guest',array $headers=[]): array {
    global $base,$jars;
    $jars[$who]??=tempnam(sys_get_temp_dir(),'jar');
    $ch=curl_init($base.$path);
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_HEADER=>true,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_COOKIEJAR=>$jars[$who],CURLOPT_COOKIEFILE=>$jars[$who]]);
    if ($method==='POST') curl_setopt($ch,CURLOPT_POSTFIELDS,$data);
    $raw=(string)curl_exec($ch);$hs=curl_getinfo($ch,CURLINFO_HEADER_SIZE);$status=curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
    return ['status'=>$status,'headers'=>substr($raw,0,$hs),'body'=>substr($raw,$hs)];
}
$form=['Content-Type: application/x-www-form-urlencoded'];
try {
    $landing=http('GET','/dau-to-pro/');
    check($landing['status']===200 && str_contains($landing['body'],'>anna<'),'Highscore auf der Startseite ohne Anmeldung sichtbar');
    check(str_contains($landing['body'],'arcade-avatar has-avatar') && str_contains($landing['body'],'assets/dau-avatare/avatar-04-basis-192.webp') && str_contains($landing['body'],'avatar-04-schulterjacke-192.webp'),'Gäste sehen den zusammengesetzten Avatar anderer');
    check(substr_count($landing['body'],'class="arcade-avatar')===3 && substr_count($landing['body'],'class="arcade-avatar has-avatar')===1,'Ohne Wahl und auf freien Plätzen bleibt der bisherige Platzhalter');
    check(str_contains($landing['body'],'avatare.css'),'Startseite lädt die Avatar-Styles');
    $guest=http('GET','/dau-to-pro/avatare.php');
    check($guest['status']===200 && str_contains($guest['body'],'Anmelden zum Speichern') && substr_count($guest['body'],'name="avatar"')===10,'Auswahlseite für Gäste: ausprobieren ja, speichern nein');
    check(!preg_match($forbidden,strip_tags(preg_replace('~<(script|style|header|footer)\b.*?</\1>~s','',$guest['body']))),'Auswahlseite ohne Namen und Rangbezeichnungen');
    check(http('POST','/dau-to-pro/avatare.php','avatar=avatar-02','guest',$form)['status']===303 && !str_contains(http('GET','/dau-to-pro/avatare.php','','guest')['body'],'Gespeichert.'),'Gäste können nicht speichern');
    // Anmelden über das Formular.
    $pdo->prepare('UPDATE learners SET password_hash=? WHERE id=?')->execute([password_hash('ein-langes-passwort',PASSWORD_DEFAULT),$anna]);
    preg_match('/name="csrf" value="([a-f0-9]{64})"/',http('GET','/dau-to-pro/konto.php','','anna')['body'],$t);
    http('POST','/dau-to-pro/konto.php',http_build_query(['action'=>'login','csrf'=>$t[1]??'','username'=>'anna','password'=>'ein-langes-passwort','website'=>'','ft'=>learner_form_token(time()-6)]),'anna',$form);
    $konto=http('GET','/dau-to-pro/konto.php','','anna');
    check(str_contains($konto['body'],'konto-avatar') && str_contains($konto['body'],'href="avatare.php"') && str_contains($konto['body'],'avatar-04-rennvisier-192.webp'),'Konto zeigt den Avatar mit Link zur Auswahl');
    $page=http('GET','/dau-to-pro/avatare.php','','anna');
    preg_match('/name="csrf" value="([a-f0-9]{64})"/',$page['body'],$c);$csrf=$c[1]??'';
    check(strlen($csrf)===64 && preg_match('~value="avatar-04" checked~',$page['body']) && str_contains($page['body'],'Avatar wählen'),'Auswahlseite lädt die gespeicherte Wahl, Navigation verlinkt sie');
    $post=fn(array $fields)=>http('POST','/dau-to-pro/avatare.php',http_build_query($fields),'anna',['Content-Type: application/x-www-form-urlencoded']);
    $post(['csrf'=>'falsch','avatar'=>'avatar-02','parts'=>['avatar-02'=>['funk-headset']]]);
    check(dtp_avatar_get($anna)['id']==='avatar-04','Ohne gültiges CSRF-Token kein Speichern');
    $r=$post(['csrf'=>$csrf,'avatar'=>'avatar-02','parts'=>['avatar-02'=>['funk-headset','techniker-cap'],'avatar-01'=>['kapuze'],'avatar-07'=>['brille']]]);
    check($r['status']===303 && dtp_avatar_get($anna)===['id'=>'avatar-02','parts'=>['techniker-cap','funk-headset']],'Speichern übernimmt nur die Teile der gewählten Figur');
    check(str_contains(http('GET','/dau-to-pro/avatare.php','','anna')['body'],'Gespeichert.'),'Rückmeldung nach dem Speichern');
    $post(['csrf'=>$csrf,'avatar'=>'avatar-99']);
    check(dtp_avatar_get($anna)['id']==='avatar-02','Unbekannte Figur wird abgelehnt');
    $prof=json_decode(http('GET','/dau-to-pro/api/profile.php?id='.$anna,'','anna')['body'],true);
    check(($prof['avatar']??null)!==null && count($prof['avatar'])===3 && str_contains($prof['avatar'][0],'avatar-02-basis-192.webp') && isset($prof['level']),'Profil enthält die Avatar-Ebenen');
    $prof=json_decode(http('GET','/dau-to-pro/api/profile.php?id='.$bert,'','anna')['body'],true);
    check(array_key_exists('avatar',$prof) && $prof['avatar']===null,'Profil ohne Avatar: null');
    $full=http('GET','/dau-to-pro/highscore.php','','anna');
    check(str_contains($full['body'],'avatar-02-funk-headset-192.webp') && str_contains($full['body'],'avatare.css'),'Ganzer Highscore zeigt den neuen Avatar');
    check(str_contains($page['body'],'href="konto.php">Mein Konto') && str_contains($page['body'],'href="./#lernmodule">Weiter lernen'),'Charaktermenü verlinkt Konto und Lernmodule');
    $post(['csrf'=>$csrf,'avatar'=>'avatar-17','parts'=>['avatar-17'=>['nachtjacke','ohrclip']]]);
    check(dtp_avatar_get($anna)===['id'=>'avatar-17','parts'=>['nachtjacke','ohrclip']],'Freigeschaltete Kleidung und Zubehör werden gespeichert');
    $blocked=false;
    try { dtp_avatar_save($bert,['id'=>'avatar-08','parts'=>['ohrclip']]); }
    catch (LearnerError) { $blocked=true; }
    check($blocked && dtp_avatar_get($bert)===null,'Gesperrtes Zubehör kann auch serverseitig nicht angelegt werden');
    check(dtp_avatar_save($bert,['id'=>'avatar-08','parts'=>['nachtjacke']])===['id'=>'avatar-08','parts'=>['nachtjacke']],'Nachtjacke ist ab Level 3 tragbar');
    dtp_avatar_save($bert,null);
    $post(['csrf'=>$csrf,'avatar'=>'']);
    check(dtp_avatar_get($anna)===null && !str_contains(http('GET','/dau-to-pro/','','guest')['body'],'has-avatar'),'„Kein Avatar“ entfernt die Wahl, der Highscore zeigt wieder den Platzhalter');
    foreach (['/dau-to-pro/','/dau-to-pro/highscore.php','/dau-to-pro/avatare.php','/dau-to-pro/konto.php'] as $path) {
        $r=http('GET',$path,'','anna');
        check($r['status']===200 && !preg_match('/(Fatal error|Warning:|Notice:|Deprecated:)/',$r['body']),"Angemeldet: $path ohne PHP-Fehler");
    }
} finally {
    proc_terminate($server);
    @unlink($db);
}
echo "Avatare: $count Prüfungen, $failures Fehler\n";
exit($failures?1:0);
