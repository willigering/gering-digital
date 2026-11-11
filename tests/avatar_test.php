<?php
// DAU TO PRO Avatare: Manifest und Ebenen, Bereinigung, Konflikte, Freischaltung, Speichern/Laden (additiv in learner_prefs),
// Highscore-Einbindung (öffentlich ohne Anmeldung) und Editor/API über PHPs eingebauten Server.
// Aufruf: php tests/avatar_test.php
declare(strict_types=1);
$root=realpath(__DIR__.'/..');
$db=tempnam(sys_get_temp_dir(),'gd-avatar-').'.sqlite';
putenv('GD_DB_PATH='.$db);
$_SERVER['REMOTE_ADDR']='203.0.113.9';
require $root.'/avatar_lib.php';
$failures=0;$count=0;
function check(bool $ok,string $label): void {global $failures,$count;$count++;if(!$ok){$failures++;fwrite(STDERR,"✗ $label\n");}}

// ---------------------------------------------------------------- Manifest und Dateien
$m=avatar_manifest();
check($m['canvas']===1024 && $m['crop']['size']>0,'Manifest: feste 1024er-Zeichenfläche mit Ausschnitt');
$bases=array_column($m['slots']['base']['items'],'id');
check(count($bases)===6,'Sechs Basischaraktere');
check(count(array_filter($m['slots']['base']['items'],fn($b)=>$b['presentation']==='m'))===3 && count(array_filter($m['slots']['base']['items'],fn($b)=>$b['presentation']==='f'))===3,'Drei männlich, drei weiblich präsentierte Basen');
$layerNames=array_merge(...array_map(fn($s)=>array_map(fn($i)=>$i['layer']??$s['layer'],array_filter($s['items'],fn($i)=>!empty($i['file']))),array_values($m['slots'])));
foreach (array_unique(array_filter($layerNames)) as $l) check(in_array($l,$m['layerOrder'],true),"Ebene $l steht in der Zeichenreihenfolge");
$colors=array_column($m['slots']['hairColor']['items'],'id');
$files=[];
foreach ($m['slots'] as $slot=>$def) foreach ($def['items'] as $it) {
    if (empty($it['file'])) continue;
    foreach ($bases as $b) foreach ($colors as $c) $files[strtr($it['file'],['{base}'=>$b,'{hairColor}'=>$c])]=true;
    if (isset($it['unlock'])) {
        $codes=[];array_walk_recursive($it['unlock'],function($v,$k)use(&$codes){if($k==='achievement')$codes[]=$v;});
        foreach ($codes as $code) check(isset(ach_catalog()[$code]),"Freischalt-Achievement $code existiert");
    }
}
$bad=[];
foreach (array_keys($files) as $f) {
    foreach (['.png','.webp','-192.webp'] as $ext) if (!is_file("$root/assets/avatars/$f$ext")) $bad[]=$f.$ext;
    $info=@getimagesize("$root/assets/avatars/$f.png");
    if (!$info || $info[0]!==1024 || $info[1]!==1024) $bad[]="$f.png (Größe)";
    elseif (function_exists('imagecreatefrompng')) {
        $im=imagecreatefrompng("$root/assets/avatars/$f.png");
        if (!$im || (imagecolorat($im,0,0)>>24&0x7F)!==127 && !str_starts_with($f,'frames/')) $bad[]="$f.png (nicht transparent)";
    }
}
check($bad===[],'Alle Ebenen als 1024er-PNG (transparent) plus WebP und 192er-Thumb vorhanden'.($bad?': '.implode(', ',array_slice($bad,0,5)):''));
check(count($files)>=100,'Über 100 Ebenen-Dateien im Manifest ('.count($files).')');

// ---------------------------------------------------------------- Bereinigung und Konflikte
$def=avatar_default();
check(avatar_normalize(null)===$def && avatar_normalize(['base'=>'xx','hair'=>'<script>'])===$def,'Unsinn wird zum Standard-Avatar');
check(avatar_normalize(['base'=>'f3'])['hair']==='buns','Typwechsel ohne Frisur übernimmt die Standardfrisur des Typs');
check(!array_key_exists('evil',avatar_normalize(['evil'=>'x'])),'Unbekannte Schlüssel fallen weg');
$c=avatar_normalize(['accessory'=>'visor','glasses'=>'nerd']);
check($c['accessory']==='visor' && $c['glasses']==='none','Visier verdrängt die Brille');
check(avatar_normalize(['accessory'=>'mask','beard'=>'full'])['beard']==='none','Maske verdrängt den Bart');
$layers=avatar_layers(avatar_normalize(['base'=>'m2','hair'=>'afro','hairColor'=>'cyan','headwear'=>'helmet','effect'=>'aura','glasses'=>'nerd']));
$slots=array_column($layers,'slot');
check(!in_array('hair',$slots,true),'Helm versteckt die Haare');
check($slots[0]==='effect' && $slots[1]==='base' && end($slots)==='frame','Reihenfolge: Aura hinten, Rahmen vorne');
check(in_array('face/glasses-nerd--m2',array_column($layers,'file'),true),'Gesichtsteile kommen in der Variante des Typs');
$gold=avatar_layers(avatar_normalize(['effect'=>'gold']));
check(array_search('effect',array_column($gold,'slot'))>array_search('headwear',array_column($gold,'slot'))||!in_array('headwear',array_column($gold,'slot')),'Goldregen liegt vor der Figur');
check(array_column($gold,'slot')[count($gold)-2]==='effect','Goldregen direkt unter dem Rahmen');

// ---------------------------------------------------------------- Regeln
$g=avatar_progress_guest();
check(avatar_rule_met(null,$g) && !avatar_rule_met(['level'=>2],$g),'Gäste: nur freie Teile');
$p=['level'=>12,'achievements'=>3,'codes'=>['g.nachteule'=>true]];
check(avatar_rule_met(['any'=>[['level'=>50],['achievement'=>'g.nachteule']]],$p) && !avatar_rule_met(['achievements'=>4],$p),'Regeln: Level, Achievement-Zahl, einzelnes Achievement, „oder“');
check(avatar_rule_label(['any'=>[['level'=>10],['achievement'=>'g.nachteule']]])==='Ab Level 10 oder Achievement „Nachteule“','Lesbare Regel auf Deutsch');
check(avatar_rule_label(['achievement'=>'g.easteregg'])==='Geheimes Achievement','Versteckte Achievements bleiben geheim');
foreach ($m['default'] as $slot=>$id) check(avatar_rule_met(avatar_items()[$slot][$id]['unlock']??null,$g),"Standard-Avatar ist frei ($slot)");
foreach ($m['baseDefaults'] as $b=>$d) check(avatar_apply_locks(avatar_default($b),$g)===avatar_default($b),"Standard des Typs $b ist frei");
$locked=avatar_apply_locks(avatar_normalize(['clothes'=>'armor-pro','frame'=>'pro','hairColor'=>'cyan','base'=>'f1']),$g);
check($locked['clothes']==='tee-pilz' && $locked['frame']==='standard' && $locked['hairColor']==='schwarz' && $locked['base']==='f1','Gesperrte Teile werden beim Anzeigen ersetzt, der Rest bleibt');

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
$bert=$mk('bert',0,true);
$pdo->prepare("INSERT INTO learner_prefs(learner_id,pref_key,value) VALUES(?,'nerd_fm','{\"off\":true}')")->execute([$anna]);
check(avatar_get($anna)===null,'Ohne Speichern: kein Avatar (Standard/Maskottchen)');
$saved=avatar_save($anna,['base'=>'f2','hair'=>'bob','hairColor'=>'cyan','clothes'=>'jacket','glasses'=>'round','headwear'=>'helmet']);
check(avatar_get($anna)===$saved && $saved['clothes']==='jacket','Speichern und Laden (Level 12 schaltet Jacke, Cyan, Helm, Rundbrille frei)');
$err='';
try { avatar_save($anna,['clothes'=>'armor-pro']); } catch (LearnerError $e) { $err=$e->getMessage(); }
check(str_contains($err,'gesperrt') && str_contains($err,'Ab Level 30'),'Gesperrte Teile werden beim Speichern abgelehnt');
check(avatar_get($anna)===$saved,'Abgelehntes Speichern ändert nichts');
$err='';
try { avatar_save($anna,['hat'=>'crown']); } catch (LearnerError $e) { $err=$e->getMessage(); }
check($err!=='','Unbekannte Teile werden abgelehnt');
$prefs=$pdo->query("SELECT pref_key,value FROM learner_prefs WHERE learner_id=$anna ORDER BY pref_key")->fetchAll(PDO::FETCH_KEY_PAIR);
check(($prefs['nerd_fm']??'')==='{"off":true}' && ($prefs['highscore_public']??'')==='1','Andere Einstellungen bleiben unberührt');
check(avatar_get($bert)===null,'Avatare sind pro Konto getrennt');
avatar_save($anna,['base'=>'m3']);
check(avatar_get($anna)['base']==='m3' && (int)$pdo->query("SELECT COUNT(*) FROM learner_prefs WHERE pref_key='avatar'")->fetchColumn()===1,'Erneutes Speichern aktualisiert genau den eigenen Eintrag');
check(isset(learner_prefs_export($anna)['avatar']) || str_contains(json_encode(learner_prefs_export($anna)),'avatar'),'Avatar steht im Datenexport');
avatar_save($anna,['base'=>'f2','clothes'=>'jacket','hairColor'=>'cyan']);
$pdo->prepare('UPDATE learner_stats SET xp=0,level=1 WHERE learner_id=?')->execute([$anna]);
$rows=ach_highscore(100,true);
$av=avatar_for_rows($rows);
check(isset($av[$anna]) && !isset($av[$bert]),'Highscore: Avatare nur für Konten mit eigenem Avatar');
check($av[$anna]['clothes']==='tee-pilz' && $av[$anna]['hairColor']==='blond' && $av[$anna]['base']==='f2','Nach „Alles auf null“ zeigt der Highscore nur noch freie Teile');
check(json_decode((string)$pdo->query("SELECT value FROM learner_prefs WHERE learner_id=$anna AND pref_key='avatar'")->fetchColumn(),true)['config']['clothes']==='jacket','Die gespeicherte Wahl selbst bleibt erhalten');
$html=avatar_stack_html(null);
check(str_contains($html,'dau-to-pro-highscore-mascot.webp') && is_file($root.'/assets/dau-to-pro-highscore-mascot.webp'),'Fallback: vorhandenes Pixelpilz-Maskottchen');
$html=avatar_stack_html($av[$anna]);
check(substr_count($html,'<img')===count(avatar_layers($av[$anna])) && str_contains($html,'../assets/avatars/bases/f2-192.webp'),'Ebenen-Stapel mit Thumbs');
$pdo->prepare('UPDATE learner_stats SET xp=?,level=? WHERE learner_id=?')->execute([ach_xp_for_level(12),12,$anna]);

// ---------------------------------------------------------------- HTTP: Highscore öffentlich, Editor und API
$port=19000+random_int(1000,1999);
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
    return ['status'=>$status,'body'=>substr($raw,$hs)];
}
try {
    $landing=http('GET','/dau-to-pro/');
    check($landing['status']===200 && str_contains($landing['body'],'Wer ist schon') && str_contains($landing['body'],'>anna<'),'Highscore auf der Startseite ohne Anmeldung sichtbar');
    check(str_contains($landing['body'],'arcade-avatar has-avatar') && str_contains($landing['body'],'assets/avatars/bases/f2-192.webp'),'Gäste sehen die Avatare anderer');
    check(str_contains($landing['body'],'arcade-avatar has-mascot') && str_contains($landing['body'],'dau-to-pro-highscore-mascot.webp'),'Freie Plätze und Konten ohne Avatar zeigen das Maskottchen');
    check(substr_count($landing['body'],'class="arcade-avatar')===3,'Drei Hex-Fassungen auf dem Podest');
    $full=http('GET','/dau-to-pro/highscore.php');
    check($full['status']===200 && str_contains($full['body'],'hs-locked'),'Ganzer Highscore bleibt wie bisher für Gäste ein Hinweis');
    $editor=http('GET','/dau-to-pro/avatar.php');
    check($editor['status']===200 && str_contains($editor['body'],'Anmelden zum Speichern') && str_contains($editor['body'],'"canSave":false'),'Editor für Gäste: ausprobieren ja, speichern nein');
    check(str_contains($editor['body'],'href="avatar.php"'),'Editor ist in der Navigation verlinkt');
    check(http('GET','/dau-to-pro/api/avatar.php')['status']===401,'API: Gäste bekommen 401 (GET)');
    check(http('POST','/dau-to-pro/api/avatar.php','{"config":{"base":"m2"}}','guest',['Content-Type: application/json'])['status']===401,'API: Gäste können nicht speichern');
    // Anmelden über das Formular.
    $pdo->prepare('UPDATE learners SET password_hash=? WHERE id=?')->execute([password_hash('ein-langes-passwort',PASSWORD_DEFAULT),$anna]);
    preg_match('/name="csrf" value="([a-f0-9]{64})"/',http('GET','/dau-to-pro/konto.php','','anna')['body'],$t);
    http('POST','/dau-to-pro/konto.php',http_build_query(['action'=>'login','csrf'=>$t[1]??'','username'=>'anna','password'=>'ein-langes-passwort','website'=>'','ft'=>learner_form_token(time()-6)]),'anna',['Content-Type: application/x-www-form-urlencoded']);
    $konto=http('GET','/dau-to-pro/konto.php','','anna');
    check(str_contains($konto['body'],'konto-avatar') && str_contains($konto['body'],'Avatar bearbeiten'),'Konto zeigt den Avatar mit Link zum Editor');
    $page=http('GET','/dau-to-pro/avatar.php','','anna');
    preg_match('~<script type="application/json" id="avatar-data">(.*?)</script>~s',$page['body'],$mm);
    $data=json_decode($mm[1]??'null',true);
    check(is_array($data) && $data['canSave']===true && strlen($data['csrf'])===64 && $data['config']['base']==='f2','Editor lädt den gespeicherten Avatar des Kontos');
    check(($data['unlocks']['clothes']['armor-pro']['rule']??'')==='Ab Level 30 oder Achievement „Komplettist“' && $data['unlocks']['clothes']['jacket']['ok']===true && $data['unlocks']['clothes']['armor']['ok']===false,'Editor kennt Sperren und Regeln');
    $post=fn(array $cfg,string $csrf)=>http('POST','/dau-to-pro/api/avatar.php',json_encode(['config'=>$cfg]),'anna',['Content-Type: application/json','X-DTP-CSRF: '.$csrf]);
    check($post(['base'=>'m1'],'falsch')['status']===403,'API: ohne gültiges CSRF-Token kein Speichern');
    $ok=$post(['base'=>'m1','hair'=>'mohawk','hairColor'=>'cyan','accessory'=>'headset','clothes'=>'hoodie'],$data['csrf']);
    $okBody=json_decode($ok['body'],true);
    check($ok['status']===200 && $okBody['ok'] && $okBody['config']['hair']==='mohawk','API: Speichern klappt');
    check($post(['frame'=>'pro'],$data['csrf'])['status']===422,'API: gesperrter Rahmen wird abgelehnt');
    check(avatar_get($anna)['hair']==='mohawk','Gespeicherter Stand in der Datenbank');
    $api=json_decode(http('GET','/dau-to-pro/api/avatar.php','','anna')['body'],true);
    check($api['saved']===true && $api['config']['accessory']==='headset','API: GET liefert die eigene Konfiguration');
    $prof=json_decode(http('GET','/dau-to-pro/api/profile.php?id='.$anna,'','anna')['body'],true);
    check(is_array($prof['avatar']??null) && count($prof['avatar'])>3 && isset($prof['level']),'Profil enthält zusätzlich die Avatar-Ebenen');
    $prof=json_decode(http('GET','/dau-to-pro/api/profile.php?id='.$bert,'','anna')['body'],true);
    check(array_key_exists('avatar',$prof) && $prof['avatar']===null,'Profil ohne Avatar: null');
    foreach (['/dau-to-pro/','/dau-to-pro/highscore.php','/dau-to-pro/avatar.php','/dau-to-pro/konto.php'] as $path) {
        $r=http('GET',$path,'','anna');
        check($r['status']===200 && !preg_match('/(Fatal error|Warning:|Notice:|Deprecated:)/',$r['body']),"Angemeldet: $path ohne PHP-Fehler");
    }
} finally {
    proc_terminate($server);
    @unlink($db);
}
echo "$count Prüfungen, $failures Fehler\n";
exit($failures?1:0);
