<?php
// Read-only, offline balance audit. No account database is opened.
require __DIR__.'/../xp_lib.php';
$c=xp_config();$total=$c['global_achievement_budget'];
foreach($c['planned_modules'] as $m){$xp=$c['first_correct_cap']*$c['task_xp']+$m['stages']*$c['stage_xp']+$c['module_achievement_budget'];foreach($m['exam_minutes'] as $minutes)$xp+=(int)round($c['exam_xp_per_30_min']*$minutes/30);$total+=$xp;echo $m['id']."\t".$xp."\n";}
echo 'Reference: '.$total.' XP; PRO: '.$c['pro_xp']." XP\n";
if($total!==$c['reference_xp'] || $c['pro_xp']!==2*$total)exit(1);
