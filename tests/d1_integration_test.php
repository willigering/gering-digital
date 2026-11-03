<?php
// D1: echte Registrierung, Fortschritt, Vorschau und Achievement-Auswertung auf einer temporären DB.
declare(strict_types=1);
$tmp=tempnam(sys_get_temp_dir(),'dtp-d1-');putenv('GD_DB_PATH='.$tmp);
require __DIR__.'/../achievements_lib.php';require_once __DIR__.'/../dau_lib.php';
$n=0;
function d1check(bool $ok,string $message): void {global $n;$n++;if(!$ok)throw new RuntimeException($message);}
try {
 $bundle=hp_bundles()['d1-datenschutz']??null;d1check(is_array($bundle),'D1 fehlt im Modulmanifest');
 $preview=hp_bundle_preview($bundle);d1check($preview==='assets/dau-previews/datenschutz.webp','Falsche Modulvorschau');
 $resolved=dtp_preview_resolve($bundle);d1check($resolved['motif']==='datenschutz'&&$resolved['accent']==='#ff8fa3'&&$resolved['small']!=='','Automatische Karte mit Farbe und Mobilbild');
 db()->prepare("INSERT INTO html_pages(slug,title,subject,description,category,published,live_version) VALUES(?,?,?,?,'lernen',1,?)")->execute([$bundle['slug'],$bundle['title'],$bundle['subject'],$bundle['description'],str_repeat('d',24)]);
 db()->exec("INSERT INTO learners(username,password_hash) VALUES('d1learner','test')");$id=(int)db()->lastInsertId();
 d1check(in_array('d1',ach_live_modules(),true),'Veröffentlichtes D1 wird als Achievement-Modul erkannt');
 $st=[];foreach(range(0,9) as $i)$st[$i]=['hist'=>array_fill(0,10,true),'solved'=>13,'mastered'=>true];
 $values=['d1-dsgvo-path-v1'=>json_encode(['stage'=>9,'st'=>$st]),'d1-dsgvo-stats-v1'=>json_encode(['solved'=>40,'correct'=>40,'streak'=>40,'best'=>40]),'d1-dsgvo-subs-v1'=>json_encode(['t_kontrolle'=>array_fill(0,10,1),'v_stunden'=>array_fill(0,10,1)]),'d1-dsgvo-exam-v1'=>json_encode([['m'=>10,'p'=>100,'g'=>1,'r'=>'Abgegeben'],['m'=>20,'p'=>90,'g'=>2,'r'=>'Abgegeben'],['m'=>30,'p'=>81,'g'=>2,'r'=>'Abgegeben']])];
 learner_progress_apply($id,'d1-datenschutz',$values,[]);$first=ach_evaluate($id,['activity'=>true]);
 foreach(['personenbezug','grundsaetze','rechte','kontrolle','panne','lernpfad','pruefung'] as $a)d1check(isset(ach_unlocked($id)['d1.'.$a]),'Achievement fehlt: '.$a);
 $state=ach_module_state($values,ach_modules()['d1']);d1check(array_column($state['exams'],'m')===[10,20,30],'D1-Zeiten gehen serverseitig verloren');
 $foreign=ach_module_state(['a1-bits-exam-v1'=>json_encode([['m'=>10,'p'=>100]])],ach_modules()['a1']);d1check($foreign['exams']===[],'D1-Zeiten dürfen andere Module nicht verändern');
 $best=ach_stats($id)['level']['xp'];d1check(ach_evaluate($id)['new']===[]&&ach_stats($id)['level']['xp']===$best,'Wiederholung vergibt doppelte XP');
 $fails=['a_cookie'=>[0,0,0],'b_person'=>[0,0,0],'v_stunden'=>[0,0,0]];
 learner_progress_apply($id,'d1-datenschutz',['d1-dsgvo-subs-v1'=>json_encode($fails)],[]);ach_evaluate($id);
 foreach(['cookie','verbergen','frist'] as $a)d1check(isset(ach_unlocked($id)['d1.'.$a]),'Witziges Achievement fehlt: '.$a);
 $codes=array_filter(array_keys(ach_unlocked($id)),fn($c)=>str_starts_with($c,'d1.'));d1check(count($codes)===10,'Nicht alle zehn D1-Achievements erreicht');
 foreach(ach_modules()['d1']['list'] as $a){$pub=ach_public(ach_catalog()[$a[0]]);d1check(is_string($pub['icon'])&&is_file(__DIR__.'/..'.$pub['icon']),'Icon fehlt: '.$a[0]);}
 $history=json_encode(array_fill(0,8,['m'=>30,'p'=>81,'r'=>'Abgegeben','review'=>str_repeat('x',60000)]));
 learner_progress_apply($id,'d1-datenschutz',['d1-dsgvo-exam-v1'=>$history],[]);
 d1check(learner_progress_state($id)['values']['d1-dsgvo-exam-v1']===$history,'Vollständiger Verlauf nicht gespeichert');
 $rejected=false;try{learner_progress_apply($id,'d1-datenschutz',['d1-dsgvo-stats-v1'=>str_repeat('x',262145)],[]);}catch(LearnerError){$rejected=true;}d1check($rejected,'Größere Grenze gilt nur für D1-Prüfungsrückblicke');
 d1check(ach_evaluate($id)['new']===[],'Erneute Auswertung belohnt doppelt');
 echo "D1-Integration: $n Prüfungen bestanden\n";
} finally { @unlink($tmp); }
