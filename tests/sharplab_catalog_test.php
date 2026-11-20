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
check(($app['play_url']??'')==='https://github.com/willigering/SharpLab/releases/latest/download/SharpLab-Setup.exe','Haupt-Download zeigt auf den Installer');
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
check(str_contains($detail,'Installer herunterladen') && str_contains($detail,'SharpLab-Setup.exe'),'Detailseite bietet den Installer als Hauptdownload');
check(str_contains($detail,'Portable Version (ZIP)') && str_contains($detail,'SharpLab-Windows.zip'),'Detailseite bietet die portable ZIP als zweiten Link');
check(str_contains($detail,'keine Administratorrechte') && str_contains($detail,'Startmenü') && str_contains($detail,'Auto-Update'),'Installationshinweis nennt Rechte, Verknüpfungen und Auto-Update');
check(!str_contains($detail,'PLATZHALTER'),'Detailseite enthält keinen Platzhalter-Text');
check(str_contains($detail,'15b3cf6764902aa141cf30825403c1025faa9afc3e842cc5510e842701d15f1e'),'SHA-256 des Installers steht auf der Detailseite');
check(str_contains($detail,'152839c07bcb6413712435d7e258ca4db22f9c7916dcc177ac16bb959a61b28f'),'SHA-256 der portablen ZIP steht auf der Detailseite');
check(str_contains($detail,'virustotal.com/gui/file/15b3cf6764902aa141cf30825403c1025faa9afc3e842cc5510e842701d15f1e'),'Virenscan-Link des Installers ist gesetzt');
check(str_contains($detail,'virustotal.com/gui/file/152839c07bcb6413712435d7e258ca4db22f9c7916dcc177ac16bb959a61b28f'),'Virenscan-Link der ZIP ist gesetzt');
check(str_contains($detail,'69 von 70') && str_contains($detail,'Heuristik-Meldung') && str_contains($detail,'Kein Befund'),'Virenscan-Ergebnisse sind ehrlich beschrieben');
check(str_contains($detail,'für Version 1.0.5') && str_contains($detail,'7,8'),'Angaben gelten ausdrücklich für Version 1.0.5 und nennen die Installer-Größe');
check(str_contains($detail,'SmartScreen') && str_contains($detail,'SHA-256-Prüfsumme') && !str_contains($detail,'Trotzdem ausführen'),'Detailseite erklärt die SmartScreen-Warnung ohne pauschale Umgehung');
check(str_contains($detail,'../datenschutz.php#sharplab'),'Detailseite verlinkt die SharpLab-Datenschutzhinweise');
$privacy=file_get_contents(__DIR__.'/../datenschutz.php');
check(str_contains($privacy,'id="sharplab"') && str_contains($privacy,'Fehlerprotokolldatei') && str_contains($privacy,'Updateprüfung'),'Datenschutz erläutert SharpLab-Feedback und Updates');
check(str_contains($detail,'Willi Gering, Gering Digital'),'Detailseite nennt Willi Gering, Gering Digital');

echo ($failures===0?'OK':"FAIL $failures")." ($count checks)\n";
@unlink($db);
exit($failures===0?0:1);
