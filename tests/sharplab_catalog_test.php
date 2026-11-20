<?php
declare(strict_types=1);
$db=tempnam(sys_get_temp_dir(),'gd-sharplab-').'.sqlite';
putenv('GD_DB_PATH='.$db);
require __DIR__.'/../lib.php';
$failures=0;$count=0;
function check(bool $ok,string $label): void {global $failures,$count;$count++;if(!$ok){$failures++;fwrite(STDERR,"✗ $label\n");}}

$app=db()->query("SELECT * FROM apps WHERE name='SharpLab'")->fetch(PDO::FETCH_ASSOC);
check(is_array($app),'SharpLab wird in den Katalog übernommen');
check(($app['category']??'')==='windows','Kategorie ist Windows-Apps');
check(($app['status']??'')==='download','Status ist Download');
check(($app['play_url']??'')==='https://github.com/willigering/SharpLab/releases/latest/download/SharpLab-Windows.zip','Download-Link zeigt auf das neueste Release');
check(($app['source_url']??'')==='https://github.com/willigering/SharpLab','Quellcode-Link zeigt auf das Repo');
check(($app['details_url']??'')==='/sharplab/','Detailseite ist /sharplab/');
check((int)($app['published']??0)===1,'SharpLab ist veröffentlicht');
check(is_file(__DIR__.'/../assets/uploads/sharplab.png'),'Kachel-PNG liegt unter assets/uploads/sharplab.png');
check(is_file(__DIR__.'/../assets/app-previews/sharplab.png.webp'),'WebP-Vorschau liegt unter assets/app-previews/sharplab.png.webp');
check(is_file(__DIR__.'/../sharplab/index.php'),'Detailseite sharplab/index.php ist vorhanden');
check(is_file(__DIR__.'/../assets/sharplab-page-preview.webp'),'Die Kachel nutzt ein 16:9-Vorschaubild wie DAU TO PRO');
check(is_file(__DIR__.'/../assets/sharplab-matrix.js'),'Matrixcode-Skript ist vorhanden');
check(is_file(__DIR__.'/../sharplab/feedback.php'),'Feedback-Endpunkt sharplab/feedback.php ist vorhanden');

$flag=(string)db()->query("SELECT value FROM settings WHERE key='catalog_sync_sharplab'")->fetchColumn();
check($flag==='1','Sync-Merker ist gesetzt');
$id=(int)$app['id'];
db()->prepare('UPDATE apps SET short_description=? WHERE id=?')->execute(['Geändert durch Admin',$id]);
db()->prepare("UPDATE settings SET value='1' WHERE key='catalog_sync_sharplab'")->execute();
// A second connection/init must not overwrite admin edits.
$again=db();
catalog_sync($again);
$after=$again->query("SELECT short_description, COUNT(*) FROM apps WHERE name='SharpLab'")->fetch(PDO::FETCH_NUM);
check($after[0]==='Geändert durch Admin','Ein zweiter Sync überschreibt keine Admin-Änderungen');
check((int)$after[1]===1,'SharpLab wird nicht doppelt angelegt');

$html=file_get_contents(__DIR__.'/../index.php');
check(str_contains($html,"'download'=>'Kostenloser Download'"),'Startseite kennt den Download-Status');
check(str_contains($html,'Download für Windows'),'Startseite enthält weiterhin den Download-Status');
check(str_contains($html,'sharplab-portal-card') && str_contains($html,'Windows-App öffnen'),'SharpLab-Kachel folgt dem Lernplattform-Layout mit CTA');
$detail=file_get_contents(__DIR__.'/../sharplab/index.php');
check(str_contains($detail,'PLATZHALTER'),'Detailseite markiert Virenscan und SHA-256 als Platzhalter');
check(str_contains($detail,'Weitere Informationen'),'Detailseite erklärt den SmartScreen-Hinweis');
check(str_contains($detail,'Willi Gering, Gering Digital'),'Detailseite nennt Willi Gering, Gering Digital');

echo ($failures===0?'OK':"FAIL $failures")." ($count checks)\n";
@unlink($db);
exit($failures===0?0:1);
