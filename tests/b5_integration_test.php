<?php
declare(strict_types=1);
$testDb=tempnam(sys_get_temp_dir(),'b5-int-').'.sqlite';putenv('GD_DB_PATH='.$testDb);$_SERVER['REMOTE_ADDR']='192.0.2.5';
require __DIR__.'/../achievements_lib.php';require_once __DIR__.'/../html_project_lib.php';require_once __DIR__.'/../dau_lib.php';
function b5check(bool $ok,string $what):void{if(!$ok)throw new RuntimeException($what);}
$pdo=db();$pdo->exec("INSERT INTO learners(username,password_hash) VALUES('b5-test','x')");$id=(int)$pdo->lastInsertId();
$pdo->exec("INSERT INTO html_pages(slug,title,subject,description,category,published,live_version) VALUES('b5-netzwerkdienste','Port 80, bitte kommen','Netzwerkdienste & Protokolle','DHCP DNS TCP UDP','lernen',1,'aaaaaaaaaaaaaaaaaaaaaaaa')");
$m=ach_modules()['b5'];b5check($m['prefix']==='b5-dienste','Präfix');b5check(count($m['list'])===10,'Katalog');
$state=['stage'=>9,'st'=>[]];for($i=0;$i<10;$i++)$state['st'][(string)$i]=['hist'=>array_fill(0,10,true),'solved'=>13,'mastered'=>true];
$subs=[];foreach(['p_port','c_synack','c_ack','a_return','r_remote'] as $typ)$subs[$typ]=array_fill(0,10,1);foreach(['n_always','s_telnet','d_holiday'] as $typ)$subs[$typ]=[0,0,0];
$values=['b5-dienste-path-v1'=>$state,'b5-dienste-stats-v1'=>['solved'=>150,'correct'=>130,'streak'=>10,'best'=>3],'b5-dienste-subs-v1'=>$subs,'b5-dienste-exam-v1'=>[['d'=>'03.11.26, 00:10','m'=>90,'p'=>81,'g'=>2,'r'=>'Abgegeben']]];
learner_progress_apply($id,'b5-netzwerkdienste',array_map(fn($v)=>json_encode($v),$values),[]);$first=ach_evaluate($id);$xp=ach_stats($id)['level']['xp'];
foreach($m['list'] as $a)b5check(isset(ach_unlocked($id)[$a[0]]),'Freischaltung '.$a[0]);
$second=ach_evaluate($id);b5check($second['new']===[]&&ach_stats($id)['level']['xp']===$xp,'Keine doppelte Vergabe');
b5check(in_array('b5',ach_live_modules(),true),'Live-Modulzuordnung');
$page=$pdo->query("SELECT * FROM html_pages WHERE slug='b5-netzwerkdienste'")->fetch(PDO::FETCH_ASSOC);$preview=dtp_preview_resolve($page);b5check(str_contains($preview['src'],'netzwerkdienste.webp')&&$preview['accent']==='#7ad0ff','Vorschau und Akzent');$card=dtp_module_card($page);b5check(str_contains($card,'b5-netzwerkdienste/')&&str_contains($card,'netzwerkdienste-640.webp'),'Kartenlink und mobile Vorschau');
$html=file_get_contents(__DIR__.'/../lernmodule/b5-netzwerkdienste.html');$injected=learner_inject_sync($html,'b5-netzwerkdienste','index.html');b5check(strpos($injected,'window.__DTP_SYNC__')<strpos($injected,'DTP-HINTERGRUND'),'Sync vor Modulcode');b5check(str_contains($injected,'dtp-back')&&learner_sync_config('b5-netzwerkdienste','index.html')['modules']==='../dau-to-pro/#lernmodule','Vorhandener Rückweg');
file_put_contents('/tmp/b5-card.html','<!doctype html><html><head><base href="file://'.realpath(__DIR__.'/../dau-to-pro').'/"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="file://'.realpath(__DIR__.'/../dau-to-pro/style.css').'"></head><body><main class="wrap"><div class="module-grid">'.$card.'</div></main></body></html>');
$state=learner_progress_state($id);b5check(count($state['values'])===4,'Fortschritt gespeichert');
@unlink($testDb);echo "B5 Integration PASS: Speicherung, 10 Achievements, XP, Duplikatschutz, Vorschau/Karte, zentrale Sync-Einbindung und Rückweg.\n";
