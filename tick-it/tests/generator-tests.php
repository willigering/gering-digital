<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/app/generator-helpers.php';
function check(bool $ok,string $msg):void {if(!$ok)throw new RuntimeException('TEST FEHLGESCHLAGEN: '.$msg);}
$c=generator_catalog();$all=$c['variants'];
check(count($all)===900,'900 Formulierungen erwartet');
check(count(array_unique(array_column($all,'id')))===900,'doppelte ID');
check(count(array_unique(array_column($all,'description')))===900,'doppelte Nachricht');
check(count(array_unique(array_column($all,'issue')))===60,'60 Probleme erwartet');
check(count($c['first_names'])*count($c['last_names'])>=10000,'Namenspool zu klein');
$tone=array_count_values(array_column($all,'tone'));
foreach(['umgangssprachlich'=>240,'offiziell'=>240,'höflich'=>240,'verärgert'=>180] as $k=>$n)
  check(($tone[$k]??0)===$n,'Sprachstil '.$k);
foreach($all as $v){
    check(strlen($v['subject'])<=180,'Betreff zu lang');
    check(strlen($v['description'])>=50 && strlen($v['description'])<=15000,'Ungültiger Nachrichtentext');
    check(strlen($v['sample_solution'])>=20,'Leere Musterlösung');
    check(!preg_match('/\{\w+\}/',$v['description']),'Platzhalter unersetzt');
}
$used=[];
for($i=0;$i<600;$i++)$used[$all[$i]['id']]=900-$i;
for($i=0;$i<100;$i++){
    $pick=generator_choice($c,$used,[],[]);
    check(!isset($used[$pick['id']]),'Wiederholung trotz 600 gesperrter Vorlagen');
}
$pick=generator_choice($c,[],[],['Q001','Q002','Q003']);
check(!in_array($pick['issue'],['Q001','Q002','Q003'],true),'Direkte Themenwiederholung');
$allIds=array_column($all,'id');
$usedAll=array_combine($allIds,range(1000,1000-count($allIds)+1));
$pick=generator_choice($c,$usedAll,[],[]);
check(isset($usedAll[$pick['id']]),'Fallback bei erschöpftem Katalog');
echo 'OK: 900 unique tickets, 60 cases, 4 tones, 16k+ sender combinations, 600-entry anti-repeat, category variation.\n';
