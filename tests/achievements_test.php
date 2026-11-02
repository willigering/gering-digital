<?php
// Unit tests for achievements_lib.php (Achievements, XP, Level, Highscore) on a temporary database.
// Every rule is checked with progress data in exactly the format the learning modules store.
declare(strict_types=1);
$db=tempnam(sys_get_temp_dir(),'gd-ach-').'.sqlite';
putenv('GD_DB_PATH='.$db);
$_SERVER['REMOTE_ADDR']='203.0.113.9';
require __DIR__.'/../achievements_lib.php';
$failures=0;$count=0;
function check(bool $ok,string $label): void {global $failures,$count;$count++;if(!$ok){$failures++;fwrite(STDERR,"✗ $label\n");}}
$pdo=db();
$pdo->exec("INSERT INTO html_pages(slug,title,subject,category,published,live_version) VALUES
 ('a1-zahlensysteme','Bits zum bitteren Ende','Zahlensysteme','lernen',1,'aaaaaaaaaaaaaaaaaaaaaaaa'),
 ('osi-sprint','Easy OSI for FISI','OSI-Schichten','lernen',1,'bbbbbbbbbbbbbbbbbbbbbbbb'),
 ('subnet-sprint','Wer teilt, gewinnt','Subnetting','lernen',1,'cccccccccccccccccccccccc')");

function learner(string $name): int {
    db()->prepare('INSERT INTO learners(username,password_hash) VALUES(?,?)')->execute([$name,'x']);
    return (int)db()->lastInsertId();
}
/** Speichert Modulwerte so, wie sync.js sie schickt (alle Werte sind JSON-Strings). */
function put(int $id,string $slug,array $values): array {
    learner_progress_apply($id,$slug,array_map(fn($v)=>is_string($v)?$v:json_encode($v),$values),[]);
    return ach_evaluate($id,['activity'=>true]);
}
function has(int $id,string $code): bool { return isset(ach_unlocked($id)[$code]); }
function path(array $mastered,int $stage=0): array {
    $st=[];foreach($mastered as $i) $st[(string)$i]=['hist'=>array_fill(0,10,true),'solved'=>10,'mastered'=>true];
    return ['stage'=>$stage,'st'=>$st];
}
function seq(string $pattern): array { return array_map('intval',str_split($pattern)); }

// --- Katalog: gleich verteilt, eindeutig ---
$modules=ach_modules();
$tiers=ach_tiers();
foreach($modules as $mid=>$m) {
    $counts=array_count_values(array_column($m['list'],1));
    check(count($m['list'])===10,"$mid hat 10 Achievements");
    check($counts===['bronze'=>2,'silber'=>2,'gold'=>2,'platin'=>1,'witzig'=>3],"$mid hat 2 Bronze, 2 Silber, 2 Gold, 1 Platin, 3 witzige");
    check(array_sum(array_map(fn($a)=>$tiers[$a[1]][1],$m['list']))===590,"$mid bringt genau 590 Achievement-XP");
    foreach($m['list'] as $a) {
        check(str_starts_with($a[0],$mid.'.'),"Code {$a[0]} gehört zu $mid");
        if ($a[1]==='witzig') check(!empty($a[5]),"Witziges Achievement {$a[0]} hat einen Rätselhinweis");
    }
}
$catalog=ach_catalog();
check(count($catalog)===count($modules)*10+12,'Jedes registrierte Modul hat 10 Achievements plus 12 übergreifende');
check(count(array_unique(array_column($catalog,'name')))===count($catalog),'Alle Achievement-Namen sind verschieden');
check(array_sum(array_column(ach_globals(),1))===2250,'Modulübergreifende Achievements bringen 2.250 XP');
check($catalog['g.easteregg']['xp']===200 && $catalog['g.easteregg']['hidden']===true,'Easter Egg: 200 XP und versteckt');
foreach(['SPRINT','Sprint'] as $word) foreach($modules as $m) check(!str_contains($m['subject'].$m['title'],$word),'Modulname ohne „Sprint“: '.$m['subject'].' · '.$m['title']);

// --- Level ---
check(ach_xp_for_level(1)===0 && ach_xp_for_level(2)===100 && ach_xp_for_level(5)===1000 && ach_xp_for_level(10)===4500 && ach_xp_for_level(50)===122500,'Levelkurve 50 × L × (L − 1)');
foreach([0=>1,99=>1,100=>2,299=>2,300=>3,999=>4,1000=>5,4499=>9,4500=>10,122499=>49,122500=>50,999999=>50] as $xp=>$level) check(ach_level($xp)===$level,"$xp XP = Level $level");
check(ach_level_title(1)==='DAU' && ach_level_title(9)==='Klick-Azubi' && ach_level_title(10)==='Kabelträger' && ach_level_title(50)==='PRO','Leveltitel von DAU bis PRO');
$info=ach_level_info(150);
check($info['level']===2 && $info['from']===100 && $info['to']===300 && $info['percent']===25,'Fortschrittsbalken zum nächsten Level');
check(ach_level_info(200000)['max']===true,'Level 50 ist das höchste');

// --- Modulregeln einzeln ---
$a=learner('anna');
$r=ach_evaluate($a);
check(has($a,'g.willkommen') && count($r['new'])===1,'Neues Konto bekommt „Willkommen, DAU“');
check(ach_stats($a)['level']['xp']===10,'Willkommen bringt 10 XP');
put($a,'a1-zahlensysteme',['a1-bits-path-v1'=>path([0])]);
check(has($a,'a1.erstes-bit') && !has($a,'a1.hex'),'Stufe 1 gemeistert schaltet nur „Erstes Bit gekippt“ frei');
put($a,'a1-zahlensysteme',['a1-bits-path-v1'=>path([0,1,2,3])]);
check(has($a,'a1.hex') && !has($a,'a1.lernpfad'),'Stufe 4 gemeistert: „Hex-Lehrling“');
put($a,'a1-zahlensysteme',['a1-bits-subs-v1'=>['h_color'=>seq('011111111110'),'h_chmod'=>seq('111111111')]]);
check(has($a,'a1.farbcodes'),'10 × richtig in Folge (mitten im Verlauf) zählt');
check(!has($a,'a1.chmod'),'9 × richtig in Folge reicht nicht');
put($a,'a1-zahlensysteme',['a1-bits-subs-v1'=>['u_cross'=>seq('1111111111'),'u_disk'=>seq('1111101111')]]);
check(!has($a,'a1.kibi'),'„Kilo, Kibi, kein Problem“ braucht beide Aufgabentypen');
put($a,'a1-zahlensysteme',['a1-bits-subs-v1'=>['u_cross'=>seq('1111111111'),'u_disk'=>seq('1111111111')]]);
check(has($a,'a1.kibi'),'Beide fehlerfrei: „Kilo, Kibi, kein Problem“');
put($a,'a1-zahlensysteme',['a1-bits-subs-v1'=>['b_max'=>seq('1010010'),'c_over'=>seq('000'),'u_disk'=>seq('1111111111')]]);
check(!has($a,'a1.off-by-one') && has($a,'a1.ueberlauf'),'Fehler-Achievement erst bei 3 Fehlern in Folge');
check(has($a,'a1.kibi'),'Freigeschaltet bleibt freigeschaltet');
put($a,'a1-zahlensysteme',['a1-bits-subs-v1'=>['b_max'=>seq('0001'),'u_disk'=>seq('11000111')]]);
check(has($a,'a1.off-by-one') && has($a,'a1.festplatte'),'„Off-by-one“ und „Die Festplatte ist kaputt!“');
put($a,'a1-zahlensysteme',['a1-bits-path-v1'=>path(range(0,9))]);
check(has($a,'a1.lernpfad'),'Alle 10 Stufen: „Voll das Byte“');
put($a,'a1-zahlensysteme',['a1-bits-exam-v1'=>[['d'=>'02.11.26, 10:00','m'=>60,'p'=>95,'g'=>1,'r'=>'Abgegeben'],['d'=>'x','m'=>90,'p'=>80,'g'=>3,'r'=>'Zeit abgelaufen']]]);
check(!has($a,'a1.marathon'),'90 Minuten mit 80 % reicht nicht für Platin, 60 Minuten zählt nicht');
put($a,'a1-zahlensysteme',['a1-bits-exam-v1'=>[['d'=>'x','m'=>90,'p'=>81,'g'=>2,'r'=>'Abgegeben']]]);
check(has($a,'a1.marathon'),'90 Minuten mit 81 %: „Langzeitspeicher“');
check(!array_filter(array_keys(ach_unlocked($a)),fn($c)=>str_starts_with($c,'osi.')||str_starts_with($c,'subnet.')),'Nichts aus anderen Modulen freigeschaltet');

$o=learner('otto');
put($o,'osi-sprint',['osi-sprint-path-v1'=>path([0,1,2,7]),'osi-sprint-subs-v1'=>['n_memo'=>seq('1111111111'),'o_seq'=>seq('1111111111'),'t_case'=>seq('111111111'),'t_layer'=>seq('000'),'n_num'=>seq('100')]]);
foreach(['osi.kabel','osi.merksatz','osi.paketbote','osi.handshake','osi.layer8'] as $c) check(has($o,$c),"OSI: $c");
check(!has($o,'osi.doktor'),'„Doktor Netzwerk“ braucht Stufe 8 und 10 × Diagnose');
check(!has($o,'osi.richtung'),'2 Fehler in Folge reichen nicht');
put($o,'osi-sprint',['osi-sprint-subs-v1'=>['t_case'=>seq('1111111111'),'n_num'=>seq('1000')]]);
check(has($o,'osi.doktor') && has($o,'osi.richtung'),'OSI: „Doktor Netzwerk“ und „Von oben oder von unten?“');
put($o,'osi-sprint',['osi-sprint-exam-v1'=>[['d'=>'x','m'=>30,'p'=>20,'g'=>6,'r'=>'Seite verlassen']]]);
check(has($o,'osi.getrennt'),'OSI: Prüfung durch Verlassen beendet = „Verbindung getrennt“');

$s=learner('susi');
put($s,'subnet-sprint',['subnet-sprint-path-v1'=>path([0,2,6]),'subnet-sprint-subs-v1'=>['p_pow'=>seq('1111111111'),'v_net'=>seq('1111111111'),'v_bc'=>seq('111111111111'),'h_usable'=>seq('000'),'c_same'=>seq('000'),'b_bc'=>seq('000')]]);
foreach(['subnet.oktett','subnet.potenzen','subnet.maskenball','subnet.broadcast','subnet.vlsm','subnet.host','subnet.falsches-netz','subnet.leere'] as $c) check(has($s,$c),"Subnetting: $c");
put($s,'subnet-sprint',['subnet-sprint-path-v1'=>path(range(0,9)),'subnet-sprint-exam-v1'=>[['d'=>'x','m'=>90,'p'=>100,'g'=>1,'r'=>'Abgegeben']]]);
check(has($s,'subnet.lernpfad') && has($s,'subnet.marathon'),'Subnetting: Lernpfad und 90-Minuten-Prüfung');

// --- Plausibilität ---
$p=learner('paul');
put($p,'a1-zahlensysteme',['a1-bits-stats-v1'=>['solved'=>5,'correct'=>900000,'streak'=>0,'best'=>0],'a1-bits-path-v1'=>['stage'=>0,'st'=>['42'=>['hist'=>[],'solved'=>0,'mastered'=>true],'1'=>['mastered'=>'yes']]],'a1-bits-exam-v1'=>[['m'=>90,'p'=>140],['m'=>45,'p'=>90]]]);
$best=json_decode(ach_stats_row($p)['best'],true)['a1']??[];
check(($best['c']??-1)===5,'Nicht mehr richtige als gelöste Aufgaben');
check(($best['m']??null)===[],'Unbekannte Stufen und „mastered“ ohne true zählen nicht');
check(($best['e']??null)===[],'Unmögliche Prüfungen (140 %, 45 Minuten) zählen nicht');
put($p,'a1-zahlensysteme',['a1-bits-path-v1'=>'{kaputt','a1-bits-subs-v1'=>'null','a1-bits-stats-v1'=>'[]']);
check(true,'Kaputte Werte werfen keinen Fehler');

// --- XP ---
$x=learner('xaver');
ach_evaluate($x);
put($x,'osi-sprint',['osi-sprint-stats-v1'=>['solved'=>1500,'correct'=>1200,'streak'=>3,'best'=>9],'osi-sprint-path-v1'=>path([0,1]),'osi-sprint-exam-v1'=>[['m'=>30,'p'=>50],['m'=>30,'p'=>90],['m'=>60,'p'=>75]]]);
// 1000 × 2 (Obergrenze) + 2 × 75 + 90 % × 2 × 1 + 75 % × 2 × 2 + Achievements (10 Willkommen + 25 Kabel steckt + 100 Tausendsassa)
check(ach_stats($x)['level']['xp']===2000+150+180+300+10+25+100,'XP: Aufgaben (gedeckelt), Stufen, beste Prüfung je Länge, Achievements');
put($x,'osi-sprint',['osi-sprint-stats-v1'=>['solved'=>3,'correct'=>2],'osi-sprint-path-v1'=>path([]),'osi-sprint-exam-v1'=>[]]);
check(ach_stats($x)['level']['xp']===2765,'Höchststände bleiben, auch wenn der Browser weniger meldet');
learner_progress_delete_module($x,'osi-sprint');
check(ach_evaluate($x)['level']['xp']===2765 && has($x,'osi.kabel'),'Fortschritt löschen nimmt weder XP noch Achievements weg');

// --- Lerntage, Nachteule, Easter Egg, Sammelziele ---
$t=learner('tina');
$day=strtotime('2026-11-02 12:00:00 Europe/Berlin');
for($i=0;$i<7;$i++) { ach_evaluate($t,['activity'=>true,'time'=>$day+$i*86400]); ach_evaluate($t,['activity'=>true,'time'=>$day+$i*86400+3600]); }
check((int)ach_stats_row($t)['days']===7 && has($t,'g.7tage') && !has($t,'g.30tage'),'7 verschiedene Lerntage (zweimal am Tag zählt einmal)');
ach_evaluate($t,['activity'=>false,'time'=>$day+30*86400]);
check((int)ach_stats_row($t)['days']===7,'Ohne Lernaktivität kein neuer Lerntag');
ach_evaluate($t,['solved'=>true,'time'=>strtotime('2026-11-03 23:59:00 Europe/Berlin')]);
check(!has($t,'g.nachteule'),'23:59 Uhr ist noch keine Nachteule');
ach_evaluate($t,['solved'=>true,'time'=>strtotime('2026-11-04 02:30:00 Europe/Berlin')]);
check(has($t,'g.nachteule'),'02:30 Uhr deutscher Zeit: Nachteule');
$before=ach_stats($t)['level']['xp'];
$r=ach_evaluate($t,['egg'=>true]);
check(has($t,'g.easteregg') && ach_stats($t)['level']['xp']===$before+200,'Easter Egg bringt 200 XP');
check(ach_evaluate($t,['egg'=>true])['new']===[],'Easter Egg zählt nur einmal');
foreach(['a1-zahlensysteme'=>'a1-bits','osi-sprint'=>'osi-sprint','subnet-sprint'=>'subnet-sprint'] as $slug=>$prefix) put($t,$slug,[$prefix.'-path-v1'=>path([0])]);
check(has($t,'g.allrounder'),'Stufe 1 in drei Modulen: Allrounder');
check(!has($t,'g.komplett'),'Komplettist erst mit allen Lernpfaden');
foreach(['a1-zahlensysteme'=>'a1-bits','osi-sprint'=>'osi-sprint','subnet-sprint'=>'subnet-sprint'] as $slug=>$prefix) put($t,$slug,[$prefix.'-path-v1'=>path(range(0,9)),$prefix.'-stats-v1'=>['solved'=>400,'correct'=>400]]);
check(has($t,'g.komplett') && !has($t,'g.5pfade'),'Alle veröffentlichten Lernpfade: Komplettist (5 Lernpfade gibt es noch nicht)');
check(has($t,'g.1000') && !has($t,'g.10000'),'1.200 richtige Aufgaben über alle Module: Tausendsassa');

// --- Highscore ---
check(ach_highscore()===[],'Highscore ist anfangs leer: alle sind standardmäßig unsichtbar');
check(ach_stats($t)['visible']===false,'Sichtbarkeit ist standardmäßig aus');
ach_set_visible($a,true);ach_set_visible($t,true);ach_set_visible($s,true);
check(has($a,'g.rampensau'),'Sichtbarkeit einschalten: Rampensau');
$hs=ach_highscore();
check(array_column($hs,'username')===['tina','anna','susi'],'Highscore sortiert nach XP');
check($hs[0]['rank']===1 && $hs[0]['title']===ach_level_title((int)$hs[0]['level']),'Platz und Leveltitel');
check(count($hs[0]['rare'])===3,'Die drei seltensten Achievements stehen dabei');
check(count($hs[0]['unlocked'])===count(ach_unlocked((int)$hs[0]['id'])),'Highscore enthält alle freigeschalteten Achievements');
foreach($hs as $entry) foreach($entry['unlocked'] as $item) check(isset(ach_unlocked((int)$entry['id'])[$item['code']]),'Highscore zeigt nur wirklich freigeschaltete Achievements');
$higher=[];foreach(ach_highscore() as $row) if((int)$row['xp']>ach_stats($o)['level']['xp']) $higher[]=$row['username'];
check(ach_would_rank($o)===count($higher)+1,'Unsichtbares Konto sieht, welchen Platz es hätte');
ach_set_visible($a,false);
check(!in_array('anna',array_column(ach_highscore(),'username'),true),'Ausschalten entfernt sofort aus dem Highscore');
check(has($a,'g.rampensau'),'Rampensau bleibt nach dem Ausschalten');
ach_admin_block($t,true);
check(!in_array('tina',array_column(ach_highscore(),'username'),true),'Admin kann ein Konto aus dem Highscore nehmen');
ach_admin_block($t,false);

// --- Übersicht, Export, Löschen ---
$view=ach_overview($o);
check(count($view['groups'])===4 && $view['total']===42,'Kontoseite: 3 Module + modulübergreifend, 42 Achievements');
$egg=array_values(array_filter($view['groups'][3]['items'],fn($i)=>$i['code']==='g.easteregg'))[0];
check($egg['secret'] && $egg['name']==='Verstecktes Achievement' && !str_contains($egg['desc'],'Easter'),'Easter Egg bleibt bis zum Fund geheim');
$funny=array_values(array_filter($view['groups'][1]['items'],fn($i)=>$i['code']==='osi.getrennt'))[0];
check($funny['unlocked'] && $funny['desc']===ach_catalog()['osi.getrennt']['desc'],'Freigeschaltetes witziges Achievement zeigt die echte Bedingung');
$locked=array_values(array_filter($view['groups'][0]['items'],fn($i)=>$i['code']==='a1.off-by-one'))[0];
check(!$locked['unlocked'] && $locked['desc']===ach_catalog()['a1.off-by-one']['hint'],'Gesperrtes witziges Achievement zeigt nur den Rätselhinweis');
$export=ach_export($t);
check($export['highscore_sichtbar']===true && count($export['achievements'])===count(ach_unlocked($t)),'Datenexport enthält Achievements, XP und Highscore-Einstellung');
learner_delete($t);
check((int)$pdo->query("SELECT COUNT(*) FROM learner_achievements WHERE learner_id=$t")->fetchColumn()===0 && (int)$pdo->query("SELECT COUNT(*) FROM learner_stats WHERE learner_id=$t")->fetchColumn()===0,'Konto löschen löscht Achievements und Level');

// --- Unveröffentlichtes Modul ---
$pdo->exec("UPDATE html_pages SET published=0 WHERE slug='subnet-sprint'");
$n=learner('nora');
check(count(ach_overview($n)['groups'])===3,'Nicht veröffentlichte Module erscheinen nicht in der Übersicht');

@unlink($db);
echo $failures===0?"Achievements: $count Prüfungen bestanden\n":"Achievements: $failures von $count Prüfungen fehlgeschlagen\n";
exit($failures===0?0:1);


