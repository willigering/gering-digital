<?php
// B4 progress -> shared catalogue -> XP and achievements, using an isolated database.
declare(strict_types=1);
$db=tempnam(sys_get_temp_dir(),'b4-').'.sqlite';putenv('GD_DB_PATH='.$db);
require __DIR__.'/../achievements_lib.php';
function check($ok,$label){if(!$ok)throw new RuntimeException($label);}
$m=ach_modules()['b4'];
check($m['prefix']==='b4-ipv6'&&$m['stages']===10,'Storage contract');
check(array_count_values(array_column($m['list'],1))===['bronze'=>2,'silber'=>2,'gold'=>2,'platin'=>1,'witzig'=>3],'Achievement distribution');
db()->exec("INSERT INTO html_pages(slug,title,subject,category,published,live_version) VALUES('b4-ipv6','Doppelpunkt, Doppelpunkt, Durchblick','IPv6','lernen',1,'aaaaaaaaaaaaaaaaaaaaaaaa')");
db()->exec("INSERT INTO learners(username,password_hash) VALUES('b4-test','unused')");$id=(int)db()->lastInsertId();
$values=['b4-ipv6-path-v1'=>['stage'=>9,'st'=>array_fill(0,10,['hist'=>array_fill(0,10,true),'solved'=>13,'mastered'=>true])],
 'b4-ipv6-stats-v1'=>['solved'=>200,'correct'=>180,'streak'=>5,'best'=>12],
 'b4-ipv6-subs-v1'=>['s_short'=>array_fill(0,10,1),'n_nth'=>array_fill(0,10,1),'s_double'=>[0,0,0],'t_router'=>[0,0,0],'v_zero'=>[0,0,0]],
 'b4-ipv6-exam-v1'=>[['d'=>'03.11.26, 00:30','m'=>90,'p'=>81,'g'=>2,'r'=>'Abgegeben']]];
learner_progress_apply($id,'b4-ipv6',array_map(fn($v)=>json_encode($v),$values),[]);
$first=ach_evaluate($id,['activity'=>true]);
foreach($m['list'] as $a)check(isset(ach_unlocked($id)[$a[0]]),'Unlock '.$a[0]);
$before=ach_stats($id);$again=ach_evaluate($id);
check($again['new']===[],'No duplicate awards');check(ach_stats($id)===$before,'No repeated XP');
check($before['level']['xp']>=180*2+10*75+590,'Task, stage and achievement XP');
$bad=ach_module_state(['b4-ipv6-exam-v1'=>json_encode([['m'=>60,'p'=>80,'r'=>'Abgegeben']])],$m);
check(!ach_rule_met(['exam',90,81],$bad,ach_merge_best([],$bad),$m),'Platinum threshold and duration enforced');
$preview=dtp_preview_resolve(['slug'=>'b4-ipv6','title'=>'IPv6']);check($preview['motif']==='ipv6','Dedicated preview');
$html=file_get_contents(__DIR__.'/../lernmodule/b4-ipv6.html');
$injected=learner_inject_sync($html,'b4-ipv6','index.html');
check(strpos($injected,'window.__DTP_SYNC__=')<strpos($injected,'DTP-HINTERGRUND'),'Sync injected before module');
check(str_contains($injected,'../dau-to-pro/api/progress.php'),'Uses shared API');
check(in_array('b4',ach_live_modules(),true),'Published module recognised');
@unlink($db);echo "B4: progress, ten awards, XP, idempotency, preview and shared sync injection passed.\n";
