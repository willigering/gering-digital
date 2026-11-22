<?php
declare(strict_types=1);
/** Echte MySQL/MariaDB-Integrationstests, nur für CI mit isolierter Testdatenbank. */
$root=dirname(__DIR__);
$host=getenv('TICKIT_TEST_DB_HOST') ?: '127.0.0.1';
$user=getenv('TICKIT_TEST_DB_USER') ?: 'tickit_ci';
$pass=getenv('TICKIT_TEST_DB_PASS') ?: 'tickit_ci_pass';
$name=getenv('TICKIT_TEST_DB_NAME') ?: 'tickit_ci';
$configPath=$root.'/config.local.php';
if(is_file($configPath))throw new RuntimeException('Abbruch: config.local.php existiert bereits. Keine produktive Datenbank testen!');
$config=['db'=>['dsn'=>"mysql:host=$host;dbname=$name;charset=utf8mb4",'user'=>$user,'password'=>$pass],
         'app'=>['admin_idle_minutes'=>30]];
file_put_contents($configPath,"<?php\nreturn ".var_export($config,true).";\n");
register_shutdown_function(static fn()=>@unlink($configPath));
require_once $root.'/app/actions.php';
function assertci(bool $ok,string $why):void{if(!$ok)throw new RuntimeException('INTEGRATION FAIL: '.$why);}
$tables=db()->query('SHOW TABLES')->fetchAll();assertci(count($tables)===0,'Testdatenbank muss leer sein');
$schema=file_get_contents($root.'/database/schema.sql');
$schema=preg_replace('/^\s*--[^\r\n]*(?:\r?\n|$)/m','',$schema);
foreach(explode(';',$schema) as $statement){if(trim($statement)!=='')db()->exec(trim($statement));}
sql('INSERT INTO admins (username,password_hash) VALUES (?,?)',['DozentCI',password_hash('ci-password-only',PASSWORD_BCRYPT)]);
$adminId=(int)db()->lastInsertId();$_SESSION=['admin_id'=>$adminId,'last_active'=>time()];
$before=generator_diagnostics();assertci(!$before['ready']&&count($before['missing_tables'])===3,'Fehlende Generator-Tabellen diagnostizieren');
$status=generator_status();
$after=generator_diagnostics();assertci($after['ready'],'Generator-Tabellen und Kategorien nach Migration vollstaendig');assertci($status['templates']===900,'Vorlagen');
$run=generator_start(['initial_count'=>100,'batch_count'=>5,'interval_minutes'=>2,'max_total'=>200]);
assertci($run['created']===0,'Start muss ohne teure 100er-Anfrage auskommen');
$created=0;$iterations=0;
while($created<100&&$iterations++<20){
 $step=generator_fill();$created=$step['generated'];
 echo "Batch $iterations: $created/100\n";
}
assertci($created===100,'alle 100 Sofort-Tickets erzeugt');
assertci((int)one('SELECT COUNT(*) n FROM tickets')['n']===100,'genau 100 Datenbanktickets');
assertci((int)one('SELECT COUNT(*) n FROM generator_issued')['n']===100,'100 Markierungen');
assertci((int)one('SELECT COUNT(DISTINCT variant_id) n FROM generator_issued')['n']===100,'keine Wiederholungen beim Start');
assertci((int)one('SELECT COUNT(DISTINCT guest_id) n FROM generator_issued')['n']===100,'eigene Absenderkonten');
$noExtra=generator_fill();assertci($noExtra['created']===0,'nach 100 keine sofortige Extrawelle');
generator_switch('pause');
assertci(generator_control()['status']==='paused','Pause');
generator_switch('resume');
assertci(generator_control()['status']==='running','Fortsetzen');
generator_switch('stop');
assertci(generator_control()['status']==='stopped','Stop');
assertci((int)one('SELECT COUNT(*) n FROM tickets')['n']===100,'Stop löscht keine Tickets');
$run2=generator_start(['initial_count'=>0,'batch_count'=>5,'interval_minutes'=>2,'max_total'=>100]);
assertci($run2['run_no']===2,'zweiter Lauf');
assertci((int)one('SELECT COUNT(*) n FROM tickets')['n']===100,'erneuter Start löscht keine Alt-Daten');
echo 'PASS: REAL DB, 100 TICKETS, DISTINCT VARIANTS, PAUSE/RESUME/STOP, NO DATA LOSS'.PHP_EOL;
