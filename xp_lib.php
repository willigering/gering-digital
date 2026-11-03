<?php
declare(strict_types=1);
/** Versioned balance: never derive level thresholds from the live catalogue. */
function xp_config(): array { static $c; return $c??=json_decode(file_get_contents(__DIR__.'/xp-config.json'),true,512,JSON_THROW_ON_ERROR); }
function xp_modules(): array {
    $modules=ach_modules();
    foreach(xp_config()['planned_modules'] as $m) if(!isset($modules[$m['id']])) $modules[$m['id']]=$m+['title'=>$m['subject'],'motif'=>'planned:'.$m['id'],'list'=>[]];
    return $modules;
}
function xp_schema(PDO $db): void {
    $db->exec('PRAGMA busy_timeout=10000');
    $db->exec("CREATE TABLE IF NOT EXISTS learner_xp_events(id INTEGER PRIMARY KEY,learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,event_key TEXT NOT NULL,source TEXT NOT NULL,module TEXT NOT NULL DEFAULT '',xp INTEGER NOT NULL CHECK(xp>=0),label TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(learner_id,event_key))");
    $db->exec("CREATE TABLE IF NOT EXISTS learner_xp_state(learner_id INTEGER PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,version INTEGER NOT NULL,current_streak INTEGER NOT NULL DEFAULT 0,best_streak INTEGER NOT NULL DEFAULT 0,last_day TEXT NOT NULL DEFAULT '',observed TEXT NOT NULL DEFAULT '{}')");
    $db->exec("CREATE TABLE IF NOT EXISTS learner_daily(learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,day TEXT NOT NULL,correct INTEGER NOT NULL DEFAULT 0,stages INTEGER NOT NULL DEFAULT 0,qualified INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(learner_id,day))");
    $db->exec("CREATE TABLE IF NOT EXISTS learner_practice(learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,day TEXT NOT NULL,module TEXT NOT NULL,awarded INTEGER NOT NULL DEFAULT 0,started INTEGER NOT NULL,PRIMARY KEY(learner_id,day,module))");
    $db->exec("CREATE TABLE IF NOT EXISTS learner_showcase(learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 2),code TEXT NOT NULL,PRIMARY KEY(learner_id,slot),UNIQUE(learner_id,code),FOREIGN KEY(learner_id,code) REFERENCES learner_achievements(learner_id,code) ON DELETE CASCADE)");
    $db->exec('CREATE INDEX IF NOT EXISTS learner_xp_history ON learner_xp_events(learner_id,id DESC)');
}
/** Serialize read / award / XP total / high-water marks, including independent sessions and tabs. */
function ach_evaluate(int $learnerId,array $events=[]): array {
    $db=db();if($db->inTransaction())return ach_evaluate_locked($learnerId,$events);
    $db->exec('BEGIN IMMEDIATE');
    try { $r=ach_evaluate_locked($learnerId,$events);$db->exec('COMMIT');return $r; }
    catch(Throwable $e) {$db->exec('ROLLBACK');throw $e;}
}
function xp_add(int $id,string $key,string $source,int $xp,string $label,int $now,string $module=''): void {
    if($xp<=0)return;
    db()->prepare('INSERT OR IGNORE INTO learner_xp_events(learner_id,event_key,source,module,xp,label,created_at) VALUES(?,?,?,?,?,?,?)')->execute([$id,$key,$source,$module,$xp,$label,gmdate('Y-m-d H:i:s',$now)]);
}
function xp_sum(int $id,string $source,string $module): int {
    $q=db()->prepare('SELECT COALESCE(SUM(xp),0) FROM learner_xp_events WHERE learner_id=? AND source=? AND module=?');$q->execute([$id,$source,$module]);return (int)$q->fetchColumn();
}
function xp_total(int $id): int { $q=db()->prepare('SELECT COALESCE(SUM(xp),0) FROM learner_xp_events WHERE learner_id=?');$q->execute([$id]);return (int)$q->fetchColumn(); }
function xp_parts(array $b): array {
    $e=0;foreach(($b['e']??[]) as $m=>$p)$e+=(int)round(min(100,max(0,(int)$p))*xp_config()['exam_xp_per_30_min']/100*((int)$m/30));
    return ['tasks'=>min(xp_config()['first_correct_cap'],max(0,(int)($b['c']??0)))*xp_config()['task_xp'],'paths'=>count($b['m']??[])*xp_config()['stage_xp'],'exams'=>$e];
}
/** Lazy, atomic migration. Existing XP are booked exactly once; no guessed historical dates or streaks. */
function xp_initialize(int $id,array $row,array $values,int $now): bool {
    $q=db()->prepare('SELECT version FROM learner_xp_state WHERE learner_id=?');$q->execute([$id]);if($q->fetchColumn()!==false)return false;
    $best=ach_json($row['best'])??[];$observed=[];
    foreach(xp_modules() as $mid=>$m)$observed[$mid]=ach_merge_best((array)($best[$mid]??[]),ach_module_state($values,$m));
    db()->prepare('INSERT INTO learner_xp_state(learner_id,version,observed) VALUES(?,?,?)')->execute([$id,xp_config()['version'],json_encode($observed)]);
    $remaining=(int)$row['xp'];
    foreach($best as $mid=>$b)foreach(xp_parts($b) as $source=>$n){$amount=min($remaining,$n);xp_add($id,'migration:'.$mid.':'.$source,$source,$amount,'Übernommener Lernfortschritt',$now,$mid);$remaining-=$amount;}
    foreach(ach_unlocked($id) as $code=>$at){$n=min($remaining,(int)(ach_catalog()[$code]['xp']??0));xp_add($id,'achievement:'.$code,'achievements',$n,'Übernommenes Achievement',$now);$remaining-=$n;}
    xp_add($id,'migration:other','legacy',$remaining,'Bisherige XP (unverändert übernommen)',$now);
    return (int)$row['xp']>0 || $values!==[] || $best!==[];
}
/** Only positive high-water increments count. Imports at migration and replayed snapshots never create a learning day. */
function xp_activity(int $id,array $before,array $best,int $now,bool $enabled): bool {
    $q=db()->prepare('SELECT * FROM learner_xp_state WHERE learner_id=?');$q->execute([$id]);$state=$q->fetch(PDO::FETCH_ASSOC);$observed=ach_json($state['observed'])??[];
    $correct=0;$stages=0;
    foreach($best as $mid=>$b){$old=$observed[$mid]??[];$correct+=max(0,(int)$b['c']-(int)($old['c']??0));$stages+=count(array_diff($b['m'],$old['m']??[]));$observed[$mid]=ach_merge_best($old,['mastered'=>$b['m'],'correct'=>$b['c'],'exams'=>[]]);}
    db()->prepare('UPDATE learner_xp_state SET observed=? WHERE learner_id=?')->execute([json_encode($observed),$id]);
    if(!$enabled || ($correct===0 && $stages===0))return false;
    $day=ach_berlin($now)->format('Y-m-d');$db=db();
    $db->prepare('INSERT INTO learner_daily(learner_id,day,correct,stages) VALUES(?,?,?,?) ON CONFLICT(learner_id,day) DO UPDATE SET correct=MIN(10000,correct+excluded.correct),stages=stages+excluded.stages')->execute([$id,$day,min(10000,$correct),$stages]);
    $q=$db->prepare('SELECT * FROM learner_daily WHERE learner_id=? AND day=?');$q->execute([$id,$day]);$d=$q->fetch(PDO::FETCH_ASSOC);$c=xp_config();
    if(!(int)$d['qualified'] && ((int)$d['correct']>=$c['daily_goal'] || (int)$d['stages']>0)){
        $yesterday=ach_berlin($now)->modify('-1 day')->format('Y-m-d');
        $streak=$state['last_day']===$yesterday?(int)$state['current_streak']+1:1;
        $db->prepare('UPDATE learner_daily SET qualified=1 WHERE learner_id=? AND day=?')->execute([$id,$day]);
        $db->prepare('UPDATE learner_xp_state SET current_streak=?,best_streak=?,last_day=? WHERE learner_id=?')->execute([$streak,max($streak,(int)$state['best_streak']),$day,$id]);
        xp_add($id,'daily:'.$day,'daily',$c['daily_xp'],'Tagesziel geschafft',$now);
        xp_add($id,'streak:'.$day,'streak',$c['streak_xp'],'Lernserie: Tag '.$streak,$now);
        if($streak%7===0)xp_add($id,'week:'.$day,'streak',$c['week_xp'],'7 weitere Tage am Stück',$now);
        if($streak%30===0)xp_add($id,'month:'.$day,'streak',$c['month_xp'],'30 weitere Tage am Stück',$now);
    }
    return true;
}
function xp_progress(int $id,array $before,array $best,int $now,bool $repeat=true): void {
    $day=ach_berlin($now)->format('Y-m-d');$db=db();$c=xp_config();
    foreach($best as $mid=>$b){
        foreach(xp_parts($b) as $source=>$total){$delta=$total-xp_sum($id,$source,(string)$mid);xp_add($id,'progress:'.$mid.':'.$source.':'.$total,$source,$delta,xp_modules()[$mid]['subject'].' · '.['tasks'=>'Richtige Aufgaben','paths'=>'Lernpfad','exams'=>'Prüfungsbestwert'][$source],$now,(string)$mid);}
        // The first 1,000 correct answers keep their original rewards; thereafter daily repeat budgets renew indefinitely.
        $delta=$repeat?max(0,(int)$b['c']-max($c['first_correct_cap'],(int)($before[$mid]['c']??0))):0;
        $db->prepare('INSERT OR IGNORE INTO learner_practice(learner_id,day,module,started) VALUES(?,?,?,?)')->execute([$id,$day,$mid,$now]);
        $q=$db->prepare('SELECT * FROM learner_practice WHERE learner_id=? AND day=? AND module=?');$q->execute([$id,$day,$mid]);$p=$q->fetch(PDO::FETCH_ASSOC);
        $q=$db->prepare('SELECT COALESCE(SUM(awarded),0) FROM learner_practice WHERE learner_id=? AND day=?');$q->execute([$id,$day]);$used=(int)$q->fetchColumn();
        $budget=min($c['repeat_correct_per_module_day'],5+(int)floor(max(0,$now-(int)$p['started'])/$c['repeat_seconds']));
        $n=max(0,min($delta,$budget-(int)$p['awarded'],$c['repeat_correct_per_account_day']-$used));
        if($n){$next=(int)$p['awarded']+$n;xp_add($id,'repeat:'.$day.':'.$mid.':'.$next,'practice',$n*$c['task_xp'],xp_modules()[$mid]['subject'].' · Weitergeübt',$now,$mid);$db->prepare('UPDATE learner_practice SET awarded=? WHERE learner_id=? AND day=? AND module=?')->execute([$next,$id,$day,$mid]);}
    }
}
function xp_dashboard(int $id,?int $now=null): array {
    $now??=time();$db=db();$q=$db->prepare('SELECT * FROM learner_xp_state WHERE learner_id=?');$q->execute([$id]);$state=$q->fetch(PDO::FETCH_ASSOC)?:[];
    $day=ach_berlin($now)->format('Y-m-d');$yesterday=ach_berlin($now)->modify('-1 day')->format('Y-m-d');
    $active=in_array($state['last_day']??' ',[$day,$yesterday],true)?(int)$state['current_streak']:0;
    $q=$db->prepare('SELECT source,SUM(xp) AS xp FROM learner_xp_events WHERE learner_id=? GROUP BY source');$q->execute([$id]);$sources=array_map('intval',array_column($q->fetchAll(PDO::FETCH_ASSOC),'xp','source'));
    $q=$db->prepare('SELECT * FROM learner_xp_events WHERE learner_id=? ORDER BY id DESC LIMIT 12');$q->execute([$id]);$history=$q->fetchAll(PDO::FETCH_ASSOC);
    $q=$db->prepare('SELECT day,qualified FROM learner_daily WHERE learner_id=? AND day>=?');$q->execute([$id,ach_berlin($now)->modify('-6 days')->format('Y-m-d')]);$days=array_column($q->fetchAll(PDO::FETCH_ASSOC),'qualified','day');
    $week=[];for($i=6;$i>=0;$i--){$d=ach_berlin($now)->modify('-'.$i.' days');$week[]=['day'=>$d->format('d.m.'),'done'=>!empty($days[$d->format('Y-m-d')])];}
    $q=$db->prepare("SELECT COALESCE(SUM(xp),0) FROM learner_xp_events WHERE learner_id=? AND created_at>=? AND created_at<?");
    $start=ach_berlin($now)->setTime(0,0);$q->execute([$id,$start->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),$start->modify('+1 day')->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s')]);
    return ['streak'=>$active,'record'=>(int)($state['best_streak']??0),'today'=>(int)$q->fetchColumn(),'next_week'=>7-$active%7,'week'=>$week,'sources'=>$sources,'history'=>$history];
}
function xp_recent(int $id,int $limit=5): array {
    $q=db()->prepare('SELECT code,unlocked_at FROM learner_achievements WHERE learner_id=? ORDER BY unlocked_at DESC,rowid DESC');$q->execute([$id]);$out=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $r)if(isset(ach_catalog()[$r['code']])){$out[]=ach_item(ach_catalog()[$r['code']],[$r['code']=>$r['unlocked_at']]);if(count($out)>=$limit)break;}return $out;
}
function xp_showcase(int $id): array {
    $q=db()->prepare('SELECT s.slot,s.code,a.unlocked_at FROM learner_showcase s JOIN learner_achievements a ON a.learner_id=s.learner_id AND a.code=s.code WHERE s.learner_id=? ORDER BY slot');$q->execute([$id]);$out=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $r)if(isset(ach_catalog()[$r['code']]))$out[(int)$r['slot']]=ach_item(ach_catalog()[$r['code']],[$r['code']=>$r['unlocked_at']]);return $out;
}
function xp_set_showcase(int $id,array $slots): void {
    if(count($slots)>3)throw new LearnerError('Höchstens drei Erfolge passen in die Vitrine.');
    $db=db();$db->exec('BEGIN IMMEDIATE');
    try{
        $u=ach_unlocked($id);$seen=[];
        foreach($slots as $slot=>$code){if(!in_array($slot,[0,1,2],true)||!is_string($code)||($code!==''&&(!isset($u[$code],ach_catalog()[$code])||isset($seen[$code]))))throw new LearnerError('Wähle jeden freigeschalteten Erfolg höchstens einmal.');if($code!=='')$seen[$code]=true;}
        $db->prepare('DELETE FROM learner_showcase WHERE learner_id=?')->execute([$id]);
        $q=$db->prepare('INSERT INTO learner_showcase(learner_id,slot,code) VALUES(?,?,?)');foreach($slots as $slot=>$code)if($code!=='')$q->execute([$id,$slot,$code]);$db->exec('COMMIT');
    }catch(Throwable $e){$db->exec('ROLLBACK');throw $e;}
}
function xp_public_profile(int $id): ?array {
    $q=db()->prepare('SELECT l.username,s.xp FROM learners l JOIN learner_stats s ON s.learner_id=l.id WHERE l.id=? AND s.highscore_visible=1 AND s.highscore_blocked=0');$q->execute([$id]);$r=$q->fetch(PDO::FETCH_ASSOC);if(!$r)return null;
    return ['username'=>$r['username'],'level'=>ach_level_info((int)$r['xp']),'showcase'=>array_values(xp_showcase($id)),'collection'=>ach_overview($id)];
}
/** Real graphics, with a focusable/touch-accessible name; secret locked icons never expose their code. */
function xp_icon_html(array $a,bool $tooltip=false): string {
    $name=e($a['name']);$icon=!empty($a['icon'])&&!($a['secret']??false)?'<img src="'.e($a['icon']).'" alt="" width="42" height="42" loading="lazy">':'<span aria-hidden="true">'.(($a['secret']??false)?'?':'🏆').'</span>';
    if($tooltip)return '<button type="button" class="showcase-icon tier-'.e($a['tier']).'" aria-label="'.$name.'" title="'.$name.'">'.$icon.'<span role="tooltip">'.$name.'</span></button>';
    return '<span class="ach-icon" aria-hidden="true">'.$icon.'</span>';
}
