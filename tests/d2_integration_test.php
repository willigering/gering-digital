<?php
declare(strict_types=1);
$tmp=tempnam(sys_get_temp_dir(),'d2-');putenv('GD_DB_PATH='.$tmp);
$_SERVER['REMOTE_ADDR']='203.0.113.9';
require __DIR__.'/../achievements_lib.php';require_once __DIR__.'/../dau_lib.php';
$checks=0;function d2check(bool $v,string $name):void{global $checks;$checks++;if(!$v)throw new RuntimeException($name);}
$bundles=hp_bundles();d2check(isset($bundles['d2-it-sicherheit']),'Modul im Manifest und Datei vorhanden');
$mod=ach_modules()['d2'];d2check($mod['prefix']==='d2-sec'&&$mod['stages']===10,'Vertrag');
$empty=['mastered'=>[],'correct'=>0,'subs'=>[],'exams'=>[]];$emptyBest=ach_merge_best([],$empty);
foreach($mod['list'] as $a)d2check(!ach_rule_met($a[4],$empty,$emptyBest,$mod),'Nicht vorzeitig: '.$a[0]);
d2check(!ach_rule_met(['clean',['p_entropy']],['subs'=>['p_entropy'=>array_fill(0,9,1)]],$emptyBest,$mod),'9 richtige reichen nicht für 10er-Serie');
d2check(!ach_rule_met(['fails','p_123'],['subs'=>['p_123'=>[0,0]]],$emptyBest,$mod),'2 Fehler reichen nicht für 3er-Serie');
d2check(!ach_rule_met(['exam',90,81],$empty,['e'=>['90'=>80]],$mod),'80 Prozent reichen nicht für Marathon');
$page=['slug'=>'d2-it-sicherheit','title'=>$mod['title'],'subject'=>$mod['subject'],'description'=>'Schutzziele und Schutzbedarf'];
$preview=dtp_preview_resolve($page);d2check($preview['motif']==='d2-it-sicherheit'&&$preview['accent']==='#ff6b6b','Eigenes Vorschaumotiv');
foreach([$preview['src'],$preview['small']] as $file){d2check(is_file(__DIR__.'/../'.$file),'Vorschau vorhanden');}
$db=db();$db->exec("INSERT INTO html_pages(slug,title,subject,category,published,live_version) VALUES('d2-it-sicherheit','Passwort123 ist kein Konzept','IT-Sicherheit & Schutzbedarf','lernen',1,'dddddddddddddddddddddddd')");
d2check(in_array('d2',ach_live_modules(),true),'Veröffentlichtes Modul in zentraler Auswertung');
$db->exec("INSERT INTO learners(username,password_hash) VALUES('d2-test','x')");$id=(int)$db->lastInsertId();
$st=[];for($i=0;$i<10;$i++)$st[$i]=['hist'=>array_fill(0,10,true),'solved'=>13,'mastered'=>true];
$subs=[];foreach(['r_score','p_factor','p_entropy','p_space'] as $sub)$subs[$sub]=array_fill(0,10,1);foreach(['p_123','e_prince','m_park'] as $sub)$subs[$sub]=[0,0,0];
$values=['d2-sec-path-v1'=>['stage'=>9,'st'=>$st],'d2-sec-stats-v1'=>['solved'=>150,'correct'=>140,'streak'=>2,'best'=>12],'d2-sec-subs-v1'=>$subs,'d2-sec-exam-v1'=>[['d'=>'03.11.26, 01:00','m'=>90,'p'=>81,'g'=>2,'r'=>'Abgegeben']]];
learner_progress_apply($id,'d2-it-sicherheit',array_map('json_encode',$values),[]);
$result=ach_evaluate($id,['activity'=>true]);$unlocked=ach_unlocked($id);foreach($mod['list'] as $a)d2check(isset($unlocked[$a[0]]),'Achievement '.$a[0]);
$tierCounts=array_count_values(array_column($mod['list'],1));d2check($tierCounts===['bronze'=>2,'silber'=>2,'gold'=>2,'platin'=>1,'witzig'=>3],'Tierverteilung');
$xp=ach_stats($id)['level']['xp'];$again=ach_evaluate($id);d2check($again['new']===[]&&ach_stats($id)['level']['xp']===$xp,'Keine doppelte Vergabe/XP');
d2check(ach_module_state(learner_progress_state($id)['values'],$mod)['correct']===140,'Fortschritt serverseitig lesbar');
foreach([30,60,90] as $minutes){$state=ach_module_state(['d2-sec-exam-v1'=>json_encode([['m'=>$minutes,'p'=>100,'r'=>'Abgegeben']])],$mod);d2check(count($state['exams'])===1,'Dauer '.$minutes.' unterstützt');}
$html=file_get_contents($bundles['d2-it-sicherheit']['path']);$injected=learner_inject_sync($html,'d2-it-sicherheit','index.html');d2check(str_contains($injected,'__DTP_SYNC__')&&learner_sync_config('d2-it-sicherheit','index.html')['modules']==='../dau-to-pro/#lernmodule','Zentraler Sync und Rückweg injiziert');d2check(strpos($injected,'__DTP_SYNC__')<strpos($injected,'DTP-HINTERGRUND'),'Sync vor Modullogik');
$card=dtp_module_card($page,'');d2check(str_contains($card,'d2-it-sicherheit.webp')&&str_contains($card,'d2-it-sicherheit-640.webp')&&str_contains($card,'href="d2-it-sicherheit/"'),'Echte Modulkarte mit Link und srcset');
file_put_contents(__DIR__.'/../d2-card-check.html','<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="dau-to-pro/style.css"><div class="module-grid" style="max-width:1200px;margin:50px auto">'.$card.'</div>');
file_put_contents(__DIR__.'/../d2-platform-check.html',$injected);
echo "$checks D2-Integrationsprüfungen bestanden; $xp XP nach einmaliger Vergabe.\n";
@unlink($tmp);
