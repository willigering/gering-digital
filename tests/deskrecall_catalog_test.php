<?php
declare(strict_types=1);
$db=tempnam(sys_get_temp_dir(),'gd-deskrecall-').'.sqlite';
putenv('GD_DB_PATH='.$db);
require __DIR__.'/../lib.php';
$failures=0;$count=0;
function check(bool $ok,string $label): void {global $failures,$count;$count++;if(!$ok){$failures++;fwrite(STDERR,"✗ $label\n");}}

$app=db()->query("SELECT * FROM apps WHERE name='DeskRecall'")->fetch(PDO::FETCH_ASSOC);
check(is_array($app),'DeskRecall wird in den Katalog übernommen');
check(($app['category']??'')==='windows','Kategorie ist Windows-Apps');
check(($app['status']??'')==='download','Status ist Download');
check(($app['play_url']??'')==='https://github.com/willigering/DeskRecall/releases/latest','Download zeigt auf die stabile Release-Seite');
check(($app['source_url']??'')==='https://github.com/willigering/DeskRecall','Quellcode-Link zeigt auf das Repo');
check(($app['details_url']??'')==='/deskrecall/','Detailseite ist /deskrecall/');
check((int)($app['published']??0)===1,'DeskRecall ist veröffentlicht');
check(str_contains((string)($app['short_description']??''),'Mit Desk Recall legst du einmalig fest'),'Kurzbeschreibung verwendet den vorgegebenen Wortlaut');
check(is_file(__DIR__.'/../assets/uploads/deskrecall.png'),'Kachel-PNG liegt unter assets/uploads/deskrecall.png');
check(is_file(__DIR__.'/../assets/app-previews/deskrecall.png.webp'),'WebP-Vorschau liegt unter assets/app-previews/deskrecall.png.webp');
check(is_file(__DIR__.'/../deskrecall/index.php'),'Detailseite deskrecall/index.php ist vorhanden');
check(is_file(__DIR__.'/../deskrecall/deskrecall.css'),'Eigenes Stylesheet deskrecall/deskrecall.css ist vorhanden');

$flag=(string)db()->query("SELECT value FROM settings WHERE key='catalog_sync_deskrecall'")->fetchColumn();
check($flag==='1','Sync-Merker für DeskRecall ist gesetzt');
$id=(int)$app['id'];
db()->prepare('UPDATE apps SET short_description=? WHERE id=?')->execute(['Geändert durch Admin',$id]);
db()->prepare("UPDATE settings SET value='1' WHERE key='catalog_sync_deskrecall'")->execute();
$again=db();
catalog_sync($again);
$after=$again->query("SELECT short_description, COUNT(*) FROM apps WHERE name='DeskRecall'")->fetch(PDO::FETCH_NUM);
check($after[0]==='Geändert durch Admin','Ein zweiter Sync überschreibt keine Admin-Änderungen');
check((int)$after[1]===1,'DeskRecall wird nicht doppelt angelegt');

// SharpLab-Merker darf einen späteren DeskRecall-Sync nicht blockieren.
$isolated=tempnam(sys_get_temp_dir(),'gd-deskrecall-flag-').'.sqlite';
putenv('GD_DB_PATH='.$isolated);
$fresh=new PDO('sqlite:'.$isolated);
$fresh->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
// Neuer Prozess-Scope: lib.php nutzt eine statische Verbindung. Deshalb direkt schema+sync über require in einem Folgecheck
// wäre falsch. Wir rufen catalog_sync auf einer frischen PDO-Datei, indem wir die bestehende Verbindung nicht verwenden.
// Stattdessen: settings-Flag von SharpLab setzen, DeskRecall-Flag leeren, in der bereits offenen Testdatenbank.
db()->prepare("INSERT INTO settings(key,value) VALUES('catalog_sync_sharplab','1') ON CONFLICT(key) DO UPDATE SET value='1'")->execute();
$other=tempnam(sys_get_temp_dir(),'gd-deskrecall-other-').'.sqlite';
putenv('GD_DB_PATH='.$other);
// Die Funktion db() ist static; wir testen catalog_sync deshalb an einer extra PDO mit dem gleichen Schema-Minimalstand.
$extra=new PDO('sqlite:'.$other);
$extra->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$extra->exec("CREATE TABLE IF NOT EXISTS apps(id INTEGER PRIMARY KEY, name TEXT NOT NULL, short_description TEXT NOT NULL, play_url TEXT, icon TEXT, published INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'bald_verfuegbar', apple_url TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'apps', source_url TEXT NOT NULL DEFAULT '', details_url TEXT NOT NULL DEFAULT '')");
$extra->exec("CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')");
$extra->exec("INSERT INTO settings(key,value) VALUES('catalog_sync_sharplab','1')");
catalog_sync($extra);
$hasDesk=(int)$extra->query("SELECT COUNT(*) FROM apps WHERE name='DeskRecall'")->fetchColumn();
$hasSharp=(int)$extra->query("SELECT COUNT(*) FROM apps WHERE name='SharpLab'")->fetchColumn();
$deskFlag=(string)$extra->query("SELECT value FROM settings WHERE key='catalog_sync_deskrecall'")->fetchColumn();
check($hasDesk===1,'DeskRecall wird auch angelegt, wenn SharpLab bereits synchronisiert ist');
check($hasSharp===0,'Der SharpLab-Merker verhindert weiterhin ein nachträgliches Anlegen von SharpLab');
check($deskFlag==='1','DeskRecall-Merker wird unabhängig gesetzt');
unset($extra);
@unlink($other);
@unlink($isolated);

$detail=file_get_contents(__DIR__.'/../deskrecall/index.php');
check(str_contains($detail,'Warum nach jedem Windows-Start alle Anwendungen erneut öffnen und mühsam auf die virtuellen Desktops verteilen?'),'Einleitungstext steht unverändert auf der Detailseite');
check(str_contains($detail,'Desk Recall übernimmt das für dich.'),'Die Schreibweise „Desk Recall“ bleibt im Fließtext erhalten');
check(str_contains($detail,'Mit Desk Recall legst du einmalig fest, welche Anwendungen auf welchem virtuellen Desktop gestartet werden sollen. Bei jedem Windows-Start stellt die App deine persönliche Arbeitsumgebung automatisch wieder her.'),'Die Beschreibung steht unverändert auf der Detailseite');
check(str_contains($detail,'Funktionen im Überblick:'),'Die Funktionsüberschrift steht unverändert da');
check(str_contains($detail,'<ul class="dr-features">') && str_contains($detail,'Automatischer Anwendungsstart') && str_contains($detail,'Feste Desktop-Zuweisung') && str_contains($detail,'Zentrale Desktop-Verwaltung') && str_contains($detail,'Individuelle Arbeitsumgebung') && str_contains($detail,'Weniger Aufwand'),'Funktionen erscheinen als Liste');
check(str_contains($detail,'Vorgemerkte Programme werden beim Windows-Start automatisch geöffnet.'), 'Erster Funktionspunkt bleibt im Wortlaut');
check(str_contains($detail,'Jede Anwendung startet auf dem dafür vorgesehenen virtuellen Desktop.'), 'Zweiter Funktionspunkt bleibt im Wortlaut');
check(str_contains($detail,'Verwalte deine virtuellen Desktops über eine übersichtliche Benutzeroberfläche.'), 'Dritter Funktionspunkt bleibt im Wortlaut');
check(str_contains($detail,'Trenne Arbeit, Gaming, Kreativität und private Anwendungen voneinander.'), 'Vierter Funktionspunkt bleibt im Wortlaut');
check(str_contains($detail,'Kein tägliches Öffnen, Verschieben und Sortieren deiner Programme.'), 'Fünfter Funktionspunkt bleibt im Wortlaut');
check(substr_count($detail,'Einmal einrichten. Jeden Tag davon profitieren.')>=1,'Der Schlusssatz steht auf der Detailseite');
check(str_contains($detail,'Kostenlos und ohne Gewähr. Die Haftung ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.'),'Haftungshinweis steht im Hinweise-Block');
check(str_contains($detail,'DeskRecall speichert alle Daten ausschließlich lokal. Die einzige Netzwerkverbindung ist die optionale Update-Prüfung bei GitHub (dabei wird die IP-Adresse an GitHub übertragen); sie lässt sich in den Einstellungen abschalten.'),'Datenschutzhinweis steht im Hinweise-Block');
check(str_contains($detail,'THIRD-PARTY-NOTICES') && str_contains($detail,'https://github.com/willigering/DeskRecall/blob/main/THIRD-PARTY-NOTICES.md'),'Drittsoftware verweist auf THIRD-PARTY-NOTICES im Repo');
check(str_contains($detail,'nicht digital signiert') && str_contains($detail,'SmartScreen') && !str_contains($detail,'Trotzdem ausführen'),'SmartScreen-Hinweis ohne pauschale Umgehung');
check(str_contains($detail,'Windows ist eine Marke der Microsoft Corporation.'),'Markenhinweis steht im Hinweise-Block');
check(str_contains($detail,'Version 1.1.0'),'Die Version 1.1.0 wird genannt');
check(str_contains($detail,'https://github.com/willigering/DeskRecall/releases/latest'),'Download zeigt auf die stabile Release-Seite');
check(str_contains($detail,'https://github.com/willigering/DeskRecall"') || str_contains($detail,"https://github.com/willigering/DeskRecall'"),'Quellcode-Link zeigt auf das Repo');
check(str_contains($detail,'Willi Gering, Gering Digital'),'Urheber wird genannt');
check(str_contains($detail,'Setzt Windows 11 voraus.') && str_contains($detail,'Unter Windows 10 nur eingeschränkt') && str_contains($detail,'ohne Installation'),'Systemanforderungen sind angegeben');
check(!str_contains($detail,'PLATZHALTER'),'Detailseite enthält keinen Platzhalter-Text');
check(!str_contains($detail,'sharplab-screenshot') && !preg_match('/src="[^"]*screenshot/i',$detail),'Es wird kein erfundenes Screenshot verwendet');

$privacy=file_get_contents(__DIR__.'/../datenschutz.php');
check(str_contains($privacy,'id="deskrecall"') && str_contains($privacy,'DeskRecall: lokale Daten und Updates'),'Datenschutz enthält einen DeskRecall-Abschnitt');
check(str_contains($privacy,'Data Privacy Framework') && str_contains($privacy,'GitHub, Inc.') && str_contains($privacy,'Microsoft Corporation'),'Datenschutz erläutert Downloads über GitHub samt Data Privacy Framework');
check(str_contains($privacy,'Google Play Store oder Apple App Store enthalten sein'),'Der bestehende Hinweis zu Store-Links bleibt erhalten');
check(str_contains($privacy,'id="sharplab"') && str_contains($privacy,'Fehlerprotokolldatei') && str_contains($privacy,'Updateprüfung'),'Der bestehende SharpLab-Abschnitt bleibt erhalten');

$html=file_get_contents(__DIR__.'/../index.php');
check(str_contains($html,"'download'=>'Kostenloser Download'"),'Startseite kennt den Download-Status');
check(str_contains($html,'Download für Windows'),'Startseite enthält weiterhin den Download-Status');

echo ($failures===0?'OK':"FAIL $failures")." ($count checks)\n";
@unlink($db);
exit($failures===0?0:1);
