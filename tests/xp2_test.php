<?php
declare(strict_types=1);
$path=tempnam(sys_get_temp_dir(),'dtp-xp2-');putenv('GD_DB_PATH='.$path);
require __DIR__.'/../achievements_lib.php';
$n=0;function ok(bool $b,string $message):void{global $n;$n++;if(!$b)throw new RuntimeException($message);}
function user(string $name):int{db()->prepare('INSERT INTO learners(username,password_hash) VALUES(?,?)')->execute([$name,password_hash('test-password',PASSWORD_DEFAULT)]);return (int)db()->lastInsertId();}
function state(int $id,int $correct,array $stages=[],string $prefix='osi-sprint'):void{
 $st=[];foreach($stages as $i)$st[$i]=['mastered'=>true];
 foreach([$prefix.'-stats-v1'=>['solved'=>$correct,'correct'=>$correct],$prefix.'-path-v1'=>['st'=>$st]] as $key=>$v)db()->prepare('INSERT INTO learner_progress(learner_id,storage_key,module_slug,value) VALUES(?,?,?,?) ON CONFLICT(learner_id,storage_key) DO UPDATE SET value=excluded.value')->execute([$id,$key,'osi-sprint',json_encode($v)]);
}
$time=strtotime('2026-03-20 12:00 Europe/Berlin');$id=user('tester');
$r=ach_evaluate($id,['time'=>$time]);ok($r['new']===[]&&$r['level']['xp']===0,'no achievement or XP at registration');$xp=$r['level']['xp'];ok(ach_evaluate($id,['time'=>$time])['new']===[],'replay no event');ok(xp_total($id)===$xp,'replay no XP');
state($id,5,[0]);$r=ach_evaluate($id,['activity'=>true,'solved'=>true,'time'=>$time]);ok(in_array('osi.kabel',array_column($r['new'],'code'),true),'module unlock');ok(in_array('g.willkommen',array_column($r['new'],'code'),true),'first correct task unlocks welcome');ok(xp_dashboard($id,$time)['streak']===1,'first daily goal');ok(xp_sum($id,'daily','')===10&&xp_sum($id,'streak','')===5,'daily + streak');$xp=xp_total($id);ok(ach_evaluate($id,['activity'=>true,'time'=>$time+1])['new']===[]&&xp_total($id)===$xp,'duplicate sync');
state($id,10,[0]);ach_evaluate($id,['activity'=>true,'time'=>$time+100]);ok(xp_sum($id,'daily','')===10,'second goal same day never paid');
for($day=1;$day<30;$day++){state($id,10+$day*5,[0]);ach_evaluate($id,['activity'=>true,'solved'=>true,'time'=>strtotime('+'.$day.' days',$time)]);}
$d=xp_dashboard($id,strtotime('+29 days',$time));ok($d['streak']===30&&$d['record']===30,'30 days crossing DST');ok(xp_sum($id,'daily','')===300,'30 daily claims');ok(xp_sum($id,'streak','')===30*5+4*40+150,'4 weeks and one month');
ok(xp_dashboard($id,strtotime('+32 days',$time))['streak']===0,'expired streak displays zero');state($id,160,[0]);ach_evaluate($id,['activity'=>true,'time'=>strtotime('+32 days',$time)]);$d=xp_dashboard($id,strtotime('+32 days',$time));ok($d['streak']===1&&$d['record']===30,'gap resets active only');
$egg=ach_evaluate($id,['egg'=>true,'time'=>$time]);ok(in_array('g.easteregg',array_column($egg['new'],'code'),true),'first egg');$xp=xp_total($id);ok(ach_evaluate($id,['egg'=>true,'time'=>$time])['new']===[]&&xp_total($id)===$xp,'egg replay');
xp_set_showcase($id,['osi.kabel','g.willkommen','g.easteregg']);ok(array_column(xp_showcase($id),'code')===['osi.kabel','g.willkommen','g.easteregg'],'three ordered slots');xp_set_showcase($id,['g.easteregg','','osi.kabel']);ok(array_keys(xp_showcase($id))===[0,2],'empty middle slot');
foreach([['osi.kabel','osi.kabel'],['osi.marathon'],['g.willkommen','osi.kabel','g.easteregg','g.1000']] as $bad){try{xp_set_showcase($id,$bad);ok(false,'reject invalid showcase');}catch(LearnerError){ok(true,'validated');}}
ok(xp_public_profile($id)===null,'private profile inaccessible');ach_set_visible($id,true);$profile=xp_public_profile($id);ok($profile!==null&&!isset($profile['password_hash'],$profile['recovery_hash']),'public safe profile');ok(count(ach_highscore()[0]['showcase'])===2,'highscore symbols');ach_admin_block($id,true);ok(xp_public_profile($id)===null,'admin block enforced');ach_admin_block($id,false);
$other=user('other');ach_evaluate($other);$hidden=ach_item(ach_catalog()['g.easteregg'],[]);ok($hidden['secret']&&!str_contains($hidden['desc'],'Video'),'hidden condition redacted');ok(count(xp_showcase($other))===0,'no cross-account showcase');
// Exact preservation: even non-reconstructible historical XP get a labelled legacy entry.
$old=user('legacy');db()->prepare("INSERT INTO learner_stats(learner_id,xp,level,best) VALUES(?,12345,16,?)")->execute([$old,json_encode(['osi'=>['c'=>100,'m'=>[0],'e'=>[]]])]);db()->prepare("INSERT INTO learner_achievements(learner_id,code,unlocked_at) VALUES(?,'g.willkommen','2025-01-01 00:00:00'),(?,'osi.kabel','2025-01-02 00:00:00')")->execute([$old,$old]);state($old,100,[0]);ach_evaluate($old,['activity'=>true,'time'=>$time]);ok(xp_total($old)===12345,'legacy XP exact');ok(xp_dashboard($old,$time)['streak']===0,'migration no historical streak');ok(ach_unlocked($old)['osi.kabel']==='2025-01-02 00:00:00','date retained');ok(ach_evaluate($old,['time'=>$time])['new']===[]&&xp_total($old)===12345,'migration idempotent');ok(array_sum(xp_dashboard($old,$time)['sources'])===12345,'breakdown reconciles');ok(xp_dashboard($old,$time)['today']===0,'historical import is not XP earned today');
// Long-term repeat budget, stale payloads and next-day renewal.
$p=user('practice');ach_evaluate($p,['time'=>$time]);state($p,1000);ach_evaluate($p,['activity'=>true,'time'=>$time]);state($p,1100);ach_evaluate($p,['activity'=>true,'time'=>$time+800]);ok(xp_sum($p,'practice','osi')===100,'repeat module day cap');$xp=xp_total($p);ach_evaluate($p,['activity'=>true,'time'=>$time+801]);ok(xp_total($p)===$xp,'repeat replay');state($p,1200);ach_evaluate($p,['activity'=>true,'time'=>strtotime('+1 day',$time)]);ok(xp_sum($p,'practice','osi')===110,'next day initial paced budget');
// Upper envelope for first acquisition; repeat and calendar rewards are intentionally separate.
$ref=2250;foreach(xp_config()['planned_modules'] as $m){$ref+=2000+75*$m['stages']+590;foreach($m['exam_minutes'] as $minutes)$ref+=(int)round(200*$minutes/30);}
ok(count(xp_config()['planned_modules'])===40&&$ref===183050&&$ref===xp_config()['reference_xp'],'40-module reference reproducible');ok(ach_xp_for_level(50)===2*$ref&&ach_level($ref)<50,'PRO at twice reference');
for($level=2;$level<=50;$level++){ok(ach_xp_for_level($level)>ach_xp_for_level($level-1),'ascending thresholds');ok(ach_level(ach_xp_for_level($level))===$level,'boundary');ok(ach_level(ach_xp_for_level($level)-1)===$level-1,'before boundary');}
ok(ach_level(366100)===50&&ach_level(366099)===49,'PRO exact boundary');ok(ceil(366100/15)<25000,'unlimited daily learning makes PRO reachable');
// Europe/Berlin midnight and winter clock rollback: repeated local times stay the same calendar day.
$dst=user('dst');$t=strtotime('2026-10-25 00:30 UTC');ach_evaluate($dst,['time'=>$t]);state($dst,5);ach_evaluate($dst,['activity'=>true,'time'=>$t]);state($dst,10);ach_evaluate($dst,['activity'=>true,'time'=>$t+3600]);ok(xp_sum($dst,'daily','')===10,'winter repeated hour one bonus');
// Independent workers share the same SQLite DB: only one gets the new event.
$c=user('concurrent');ach_evaluate($c,['time'=>$time]);$workers=[];
for($i=0;$i<2;$i++){$code='putenv('.var_export('GD_DB_PATH='.$path,true).');require '.var_export(realpath(__DIR__.'/../achievements_lib.php'),true).';echo json_encode(ach_evaluate('.$c.',["egg"=>true]));';$proc=proc_open([PHP_BINARY,'-c',php_ini_loaded_file(),'-r',$code],[1=>['pipe','w'],2=>['pipe','w']],$pipes);$workers[]=[$proc,$pipes];}
$events=0;foreach($workers as [$proc,$pipes]){$out=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);$exit=proc_close($proc);ok($exit===0,'concurrent process '.$err);$events+=count(json_decode($out,true)['new']);}ok($events===1&&xp_sum($c,'achievements','')===200,'concurrent egg exactly once');
// Repeating milestones remain repeatable and unique after the first month.
$series=user('sixty-days');ach_evaluate($series,['time'=>$time]);
for($day=0;$day<60;$day++){state($series,($day+1)*5);ach_evaluate($series,['activity'=>true,'time'=>strtotime('+'.$day.' days',$time)]);}
ok(xp_dashboard($series,strtotime('+59 days',$time))['streak']===60,'sixty consecutive days');ok(xp_sum($series,'streak','')===60*5+8*40+2*150,'weekly and monthly milestones repeat exactly once');
// Planned modules use the same central awards without implementing their own XP logic.
$future=user('future');ach_evaluate($future,['time'=>$time]);state($future,5,[0],'f1-pm');ach_evaluate($future,['activity'=>true,'time'=>$time]);ok(xp_sum($future,'tasks','f1')===10&&xp_sum($future,'paths','f1')===75,'planned prefix integrates automatically');ok(xp_dashboard($future,$time)['streak']===1,'planned module daily goal');
// Explicit reset and account deletion include every new table.
$l=db()->query('SELECT * FROM learners WHERE id='.$id)->fetch(PDO::FETCH_ASSOC);learner_reset_all($l,'test-password');ok(xp_total($id)===0&&xp_showcase($id)===[]&&ach_unlocked($id)===[],'full reset');ach_evaluate($id);ok(xp_total($id)===0&&ach_unlocked($id)===[],'reset starts without a welcome reward');learner_delete($old);ok(xp_total($old)===0,'account cascade deletion');
unlink($path);echo "XP 2.0: $n checks passed\n";
