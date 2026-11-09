<?php
// DAU TO PRO: Achievements, XP, Level und Highscore.
// Alles wird auf dem Server aus dem Fortschritt berechnet, den die Lernmodule ohnehin speichern
// (dau-to-pro/sync.js → learner_progress). Die Module selbst müssen dafür nichts wissen.
declare(strict_types=1);
require_once __DIR__.'/learner_lib.php';
require_once __DIR__.'/xp_lib.php';

define('ACH_STAGE_XP',xp_config()['stage_xp']);        // pro gemeisterter Lernpfad-Stufe
define('ACH_TASK_XP',xp_config()['task_xp']);          // pro richtig gelöster Aufgabe
define('ACH_TASK_CAP',xp_config()['first_correct_cap']);      // höchstens so viele richtige Aufgaben zählen pro Modul für XP
const ACH_LEVEL_MAX=50;
const ACH_EGG_XP=200;

/** Stufen der Achievements: Name und XP. */
function ach_tiers(): array {
    return ['bronze'=>['Bronze',25],'silber'=>['Silber',50],'gold'=>['Gold',100],'platin'=>['Platin',150],'witzig'=>['Witzig',30],'versteckt'=>['Versteckt',0]];
}

/**
 * Katalog der Lernmodule mit ihren 10 eigenen Achievements (2 Bronze, 2 Silber, 2 Gold, 1 Platin, 3 witzige).
 * prefix  = Anfang der Speicherschlüssel im Browser (z. B. "osi-sprint" → osi-sprint-path-v1)
 * motif   = Vorschaubild-Motiv für die Zuordnung veröffentlichter Projekte
 * slugs   = Modul-URLs für Fortschrittskacheln, einschließlich historischer Adressen
 * Regeln: stage (Stufe n gemeistert, ab 0), path (alle Stufen), clean (Aufgabentypen je 10 × richtig in Folge),
 *         fails (Aufgabentyp 3 × falsch in Folge), exam (Prüfungslänge in Minuten + Mindestprozent), leave (Prüfung durch Verlassen beendet)
 */
function ach_modules(): array {
    $modules=[
        'kv'=>['prefix'=>'kv-061126','subject'=>'Klausurvorbereitung Netzwerke','title'=>'Sieben Schichten OSI. Aber gelernt wird fünf vor zwölf.','motif'=>'klausurvorbereitung','slugs'=>['klausurvorbereitung-061126'],'stages'=>0,'optional'=>true,'exam_minutes'=>[30,60,90],'list'=>[
            ['kv.start','bronze','Verbindung hergestellt','10 verschiedene Fragen richtig lösen.',['kv_count','unique',10]],
            ['kv.tour','bronze','Nicht nur Bahnhof','In mindestens drei Kategorien je eine Frage richtig lösen.',['kv_count','categories',3]],
            ['kv.fifty','silber','Da bleibt was hängen','50 verschiedene Fragen richtig lösen.',['kv_count','unique',50]],
            ['kv.ports','silber','Portier vom Dienst','15 verschiedene Portnummer-Aufgaben richtig eintippen.',['kv_count','ports',15]],
            ['kv.all','gold','Netzweit zuständig','In allen sieben Kategorien je 10 verschiedene Fragen richtig lösen.',['kv_count','minimum_category',10]],
            ['kv.exam','gold','Generalprobe bestanden','Mindestens 81 Prozent in einer Klausur mit mindestens 40 Aufgaben.',['any',[['exam',60,81],['exam',90,81]]]],
            ['kv.master','platin','Panik hat Hausverbot','150 verschiedene Fragen richtig und mindestens 92 Prozent bei mindestens 40 Klausuraufgaben.',['all',[['kv_count','unique',150],['any',[['exam',60,92],['exam',90,92]]]]]],
            ['kv.lastminute','witzig','Fünf vor zwölf','12 verschiedene Fragen richtig. Der Lernplan nimmt Gestalt an.',['kv_count','unique',12],'Zwölf Treffer später sieht der Lernplan plötzlich seriös aus.'],
            ['kv.macarena','witzig','MACarena','6 verschiedene Aufgaben zum MAC-Aufbau richtig.',['kv_count','mac',6],'Tanze durch die sechs Byte.'],
            ['kv.dns','witzig','Es war tatsächlich DNS','5 verschiedene Aufgaben zu DNS richtig.',['kv_count','dns',5],'Fünf Spuren führen zum Namensdienst.'],
        ]],
        'd2'=>['prefix'=>'d2-sec','subject'=>'IT-Sicherheit & Schutzbedarf','title'=>'Passwort123 ist kein Konzept','motif'=>'d2-it-sicherheit','slugs'=>['d2-it-sicherheit'],'stages'=>10,'list'=>[
            ['d2.cia','bronze','CIA ohne Geheimdienst','Stufe 1 „Schutzziele“ gemeistert.',['stage',0]],
            ['d2.risiko','bronze','Bauchgefühl mit Taschenrechner','„Risikowert berechnen“ 10 × in Folge richtig.',['clean',['r_score']]],
            ['d2.maximum','silber','Maximum statt Mittelmaß','Stufe 4 „Schutzbedarf“ gemeistert.',['stage',3]],
            ['d2.faktoren','silber','Doppelt hält verschieden','„Authentisierungsfaktor zuordnen“ 10 × in Folge richtig.',['clean',['p_factor']]],
            ['d2.entropie','gold','Zufall mit System','„Modell-Entropie berechnen“ und „Zufallsraum berechnen“ je 10 × in Folge richtig.',['clean',['p_entropy','p_space']]],
            ['d2.lernpfad','gold','Konzept statt Hoffnung','Alle 10 Stufen des Lernpfads gemeistert.',['path']],
            ['d2.marathon','platin','90 Minuten ohne Datenpanne','90-Minuten-Prüfung mit mindestens 81 %.',['exam',90,81]],
            ['d2.passwort123','witzig','Sonderzeichen retten alles?','3 × in Folge falsch bei „Passwort123 ist kein Konzept“.',['fails','p_123'],'Ein Ausrufezeichen macht aus einem Klassiker noch keinen Zufall.'],
            ['d2.prinz','witzig','Erbe mit Bearbeitungsgebühr','3 × in Folge falsch bei „Der Prinz aus Nigeria“.',['fails','e_prince'],'Erst zahlen, dann Millionen? Der Prinz wartet noch.'],
            ['d2.usb','witzig','Parkplatz-Premiumstick','3 × in Folge falsch bei „USB-Stick vom Parkplatz“.',['fails','m_park'],'Gratis Speicherplatz. Die Zusatzsoftware verrät er erst später.'],
        ]],
        'b4'=>['prefix'=>'b4-ipv6','subject'=>'IPv6','title'=>'Doppelpunkt, Doppelpunkt, Durchblick','motif'=>'ipv6','slugs'=>['b4-ipv6','ipv6'],'stages'=>10,'list'=>[
            ['b4.erste-bloecke','bronze','128 Bit, ein Anfang','Stufe 1 „128 Bit & Hex“ gemeistert.',['stage',0]],
            ['b4.nullenschlucker','bronze','Nullenschlucker','„Adresse kanonisch kürzen“ 10 × in Folge richtig.',['clean',['s_short']]],
            ['b4.praefix','silber','Vorne Netz, hinten Gerät','Stufe 4 „Präfix & Interface-ID“ gemeistert.',['stage',3]],
            ['b4.slaac','silber','Selbst ist der Host','Stufe 7 „SLAAC & Router Advertisements“ gemeistert.',['stage',6]],
            ['b4.netzplan','gold','65.536 gute Gründe','„n-tes /64-Subnetz bestimmen“ 10 × in Folge richtig.',['clean',['n_nth']]],
            ['b4.lernpfad','gold','Doppelpunkt verstanden','Alle 10 IPv6-Stufen gemeistert.',['path']],
            ['b4.marathon','platin','128 Bit Ausdauer','90-Minuten-Prüfung mit mindestens 81 %.',['exam',90,81]],
            ['b4.doppelt','witzig','Doppelt hält nicht besser','3 × in Folge falsch bei „Doppelter Doppelpunkt“.',['fails','s_double'],'Zwei Abkürzungen, eine Adresse, null Eindeutigkeit.'],
            ['b4.router','witzig','fe80 ist kein Dienstausweis','3 × in Folge falsch bei „fe80 ist kein Router“.',['fails','t_router'],'Auch ein Drucker darf lokal wohnen.'],
            ['b4.nullen','witzig','Nullen im Überfluss','3 × in Folge falsch bei „Zu viele Nullen“.',['fails','v_zero'],'Weniger tippen bedeutet nicht weniger Bit.'],
        ]],
        'b5'=>['prefix'=>'b5-dienste','subject'=>'Netzwerkdienste & Protokolle','title'=>'Port 80, bitte kommen','motif'=>'netzwerkdienste','slugs'=>['b5-netzwerkdienste'],'stages'=>10,'list'=>[
            ['b5.transport','bronze','Verbindung steht','Stufe 1 „TCP oder UDP?“ gemeistert.',['stage',0]],
            ['b5.portwart','bronze','Portwart des Monats','„Standardport zum Dienst“ 10 × in Folge richtig.',['clean',['p_port']]],
            ['b5.lease','silber','Lease ist mehr','Stufe 4 „DHCP: Adresse gesucht“ gemeistert.',['stage',3]],
            ['b5.ack','silber','ACK-zellent','„SYN bestätigen“ und „Datenbytes bestätigen“ je 10 × in Folge richtig.',['clean',['c_synack','c_ack']]],
            ['b5.rueckweg','gold','Rückweg gefunden','„PAT-Antwort zurückübersetzen“ und „ARP-Ziel bei entferntem Netz“ je 10 × in Folge richtig.',['clean',['a_return','r_remote']]],
            ['b5.lernpfad','gold','Alle Dienste im Dienst','Alle 10 Stufen des Lernpfads gemeistert.',['path']],
            ['b5.marathon','platin','Dauerverbindung','90-Minuten-Prüfung mit mindestens 81 % (Note 2).',['exam',90,81]],
            ['b5.dns','witzig',"It’s always DNS",'3 × hintereinander falsch bei „It’s always DNS – wirklich?“.',['fails','n_always'],'Per IP klappt es. Beim Namen wird es still. Der Router hat für heute genug unverdiente Neustarts bekommen.'],
            ['b5.telnet','witzig','Klartext war gestern','3 × hintereinander falsch bei „Telnet im Jahr 2026“.',['fails','s_telnet'],'Das Passwort steht im Mitschnitt. Eine andere Portnummer ist dafür leider kein Radiergummi.'],
            ['b5.urlaub','witzig','DHCP auf Malle','3 × hintereinander falsch bei „DHCP-Server im Urlaub“.',['fails','d_holiday'],'169.254 steht da. Der Internetzugang fehlt. Nicht jede Adresse ist eine Erfolgsmeldung.'],
        ]],
        // CS1 „Compiler sagt nein“ (ab 09.11.2026): Einstieg in die Programmierung. Eigener Präfix, damit alte C#-Lernstände unberührt bleiben.
        'cs1'=>['prefix'=>'cs1-start','subject'=>'Programmieren mit C#','title'=>'Compiler sagt nein','motif'=>'csharp','slugs'=>['cs1-csharp'],'stages'=>10,'list'=>[
            ['cs1.hallo','bronze','Hallo, Programmierwelt','Stufe 1 „Was ist Programmieren?“ gemeistert.',['stage',0]],
            ['cs1.semikolon','bronze','Semikolon gesetzt','„Zeile reparieren“ 10 × in Folge richtig.',['clean',['g_fix']]],
            ['cs1.schublade','silber','Deklariert und initialisiert','Stufe 5 „Variablen deklarieren und initialisieren“ gemeistert.',['stage',4]],
            ['cs1.typsicher','silber','Typsicher unterwegs','„Gültige Werte erkennen“ und „Falschen Typ reparieren“ je 10 × in Folge richtig.',['clean',['t_literal','v_fix']]],
            ['cs1.uebersetzer','gold','Simultanübersetzer','„Compiler oder Interpreter“ und „Wann fällt es auf?“ je 10 × in Folge richtig.',['clean',['u_wer','u_fehlerart']]],
            ['cs1.lernpfad','gold','Compiler sagt ja','Alle 10 Stufen gemeistert.',['path']],
            ['cs1.marathon','platin','Null Fehler, null Warnungen','90-Minuten-Prüfung mit mindestens 90 %.',['exam',90,90]],
            ['cs1.html','witzig','HTML-Entwickler (m/w/d)','3 × in Folge falsch bei „HTML ist keine Programmiersprache“.',['fails','w_html'],'Überschrift, Absatz, Bild. Und wo genau ist jetzt die Schleife?'],
            ['cs1.nein','witzig','Nein heißt nein','3 × in Folge falsch bei „Compiler sagt nein“.',['fails','u_nein'],'Ein fehlendes Zeichen, null Zeilen Ausgabe. Er liest wirklich alles, bevor er loslegt.'],
            ['cs1.ueberlauf','witzig','Zwei Milliarden und eins','3 × in Folge falsch bei „Überlauf: aus Plus wird Minus“.',['fails','t_ueberlauf'],'Ganz oben geht es nicht weiter. Es geht ganz unten weiter.'],
        ]],
        // Geparkt als CS2 „C# für Fortgeschrittene“: bisheriges C#-Modul bis 09.11.2026, nicht veröffentlicht.
        // Bleibt im Katalog, damit freigeschaltete Achievements, XP und Lernstände (Präfix cs-code) erhalten bleiben.
        'cs'=>['prefix'=>'cs-code','subject'=>'C# für Fortgeschrittene','title'=>'Der Compiler hat immer recht','motif'=>'csharp-fortgeschritten','slugs'=>['cs2-csharp'],'stages'=>10,'hidden'=>true,'list'=>[
            ['cs.hello','bronze','Hello, World!','Stufe 1 „Willkommen in C#“ gemeistert.',['stage',0]],
            ['cs.survivor','bronze','Semicolon Survivor','„Zeile reparieren“ 10 × in Folge richtig.',['clean',['g_fix']]],
            ['cs.schleife','silber','Schleifenkönig','Stufe 5 „Schleifen“ gemeistert.',['stage',4]],
            ['cs.bug','silber','Bugjäger','„Fehler reparieren“ 10 × in Folge richtig.',['clean',['e_fix']]],
            ['cs.methode','gold','Methode mit Methode','„Methodenkopf schreiben“ und „Aufrufe verketten“ je 10 × in Folge richtig.',['clean',['m_kopf','m_kette']]],
            ['cs.lernpfad','gold','Kompiliert auf Anhieb','Alle 10 Stufen gemeistert.',['path']],
            ['cs.compiler','platin','Compilerflüsterer','90-Minuten-Prüfung mit mindestens 90 %.',['exam',90,90]],
            ['cs.unschuldig','witzig','Das Semikolon war unschuldig','3 × in Folge falsch bei „Das Semikolon war unschuldig“.',['fails','g_semikolon'],'Der Compiler nennt sogar die Zeile. Er hilft wirklich gern.'],
            ['cs.gleich','witzig','Gleich ist nicht gleich','3 × in Folge falsch bei „= statt ==“.',['fails','i_gleich'],'Ein Zeichen zu wenig, eine Beziehungskrise zu viel.'],
            ['cs.offbyone','witzig','Einer geht noch','3 × in Folge falsch bei „Off-by-one“.',['fails','l_off'],'Zählen fängt manchmal bei null an. Das Problem hört selten dort auf.'],
        ]],
        'f2'=>['prefix'=>'f2-kalk','subject'=>'Kalkulation & Beschaffung','title'=>'Rechnet sich das?','motif'=>'kalkulation','slugs'=>['f2-kalkulation'],'stages'=>10,'list'=>[
            ['f2.preisschild','bronze','Preisschild enttarnt','Stufe 1 „Angebote vergleichen“ gemeistert.',['stage',0]],
            ['f2.bezug','bronze','Fracht ist auch Geld','„Bezugspreis mit Fracht“ 10 × in Folge richtig.',['clean',['b_bezug']]],
            ['f2.nutzwert','silber','Gewicht hat Gewicht','Stufe 4 „Nutzwertanalyse“ gemeistert.',['stage',3]],
            ['f2.afa','silber','Wertverlust mit System','„Jährliche Abschreibung“ 10 × in Folge richtig.',['clean',['d_jahr']]],
            ['f2.break-even','gold','Schwarze Zahlen','„Break-even-Menge“ und „Kritische Menge“ je 10 × in Folge richtig.',['clean',['e_menge','o_krit']]],
            ['f2.lernpfad','gold','Das rechnet sich','Alle 10 Stufen gemeistert.',['path']],
            ['f2.marathon','platin','Controlling im Endspiel','90-Minuten-Prüfung mit mindestens 81 %.',['exam',90,81]],
            ['f2.skonto','witzig','Skonto im Urlaub','3 × in Folge falsch bei „Skonto vergessen“.',['fails','b_skonto'],'Schnell bezahlt. Trotzdem zu viel überwiesen?'],
            ['f2.leasing','witzig','Nur 99 Euro im Monat','3 × in Folge falsch bei „Leasing klingt billiger“.',['fails','k_billig'],'Die kleine Rate hat eine große Verwandtschaft.'],
            ['f2.null','witzig','Nutzwert: Luftnummer','3 × in Folge falsch bei „Nutzwert null“.',['fails','n_null'],'Null mal wichtig bleibt manchmal einfach null.'],
        ]],
        'a1'=>['prefix'=>'a1-bits','subject'=>'Zahlensysteme','title'=>'Bits zum bitteren Ende','motif'=>'zahlensysteme','slugs'=>['a1-zahlensysteme','bits-zum-bitteren-ende','zahlensysteme'],'stages'=>10,'list'=>[
            ['a1.erstes-bit','bronze','Erstes Bit gekippt','Stufe 1 „Stellenwerte & Bits“ gemeistert.',['stage',0]],
            ['a1.farbcodes','bronze','Farbenblind war gestern','Aufgabentyp „Farbcodes“ 10 × in Folge richtig.',['clean',['h_color']]],
            ['a1.hex','silber','Hex-Lehrling','Stufe 4 „Hexadezimal & Oktal“ gemeistert.',['stage',3]],
            ['a1.chmod','silber','chmod 755','Aufgabentyp „Linux-Rechte (chmod)“ 10 × in Folge richtig.',['clean',['h_chmod']]],
            ['a1.kibi','gold','Kilo, Kibi, kein Problem','„SI ↔ IEC“ und „Festplatte im Betriebssystem“ je 10 × in Folge richtig.',['clean',['u_cross','u_disk']]],
            ['a1.lernpfad','gold','Voll das Byte','Alle 10 Stufen des Lernpfads gemeistert.',['path']],
            ['a1.marathon','platin','Langzeitspeicher','90-Minuten-Prüfung mit mindestens 81 % (Note 2).',['exam',90,81]],
            ['a1.off-by-one','witzig','Off-by-one','3 × hintereinander falsch bei „Größter Wert mit n Bit“.',['fails','b_max'],'Zwei hoch n. Oder doch minus eins?'],
            ['a1.ueberlauf','witzig','255 + 1 = 0','3 × hintereinander falsch bei „Überlauf (8 Bit)“.',['fails','c_over'],'Irgendwann ist auch das größte Byte voll.'],
            ['a1.festplatte','witzig','Die Festplatte ist kaputt!','3 × hintereinander falsch bei „Festplatte im Betriebssystem“.',['fails','u_disk'],'Gekauft 1 TB, Windows zeigt weniger. Betrug?'],
        ]],
        'osi'=>['prefix'=>'osi-sprint','subject'=>'OSI-Schichten','title'=>'Easy OSI for FISI','motif'=>'osi-modell','slugs'=>['osi-sprint','osi-modell','osi'],'stages'=>10,'list'=>[
            ['osi.kabel','bronze','Kabel steckt','Stufe 1 „Die 7 Schichten“ gemeistert.',['stage',0]],
            ['osi.merksatz','bronze','Alle Deutschen Studenten …','Aufgabentyp „Merksatz-Wort“ 10 × in Folge richtig.',['clean',['n_memo']]],
            ['osi.paketbote','silber','Paketbote','Stufe 3 „PDUs & Adressen“ gemeistert.',['stage',2]],
            ['osi.handshake','silber','SYN, SYN-ACK, ACK','Aufgabentyp „Handshake-Nummern“ 10 × in Folge richtig.',['clean',['o_seq']]],
            ['osi.doktor','gold','Doktor Netzwerk','Stufe 8 „Fehleranalyse“ gemeistert und „Diagnose aus Testergebnissen“ 10 × in Folge richtig.',['all',[['stage',7],['clean',['t_case']]]]],
            ['osi.lernpfad','gold','Alle sieben Schichten','Alle 10 Stufen des Lernpfads gemeistert.',['path']],
            ['osi.marathon','platin','TTL: 90 Minuten','90-Minuten-Prüfung mit mindestens 81 % (Note 2).',['exam',90,81]],
            ['osi.layer8','witzig','Layer-8-Problem','3 × hintereinander falsch bei „Fehlerbild → Schicht“.',['fails','t_layer'],'Das Problem sitzt meistens vor dem Bildschirm.'],
            ['osi.richtung','witzig','Von oben oder von unten?','3 × hintereinander falsch bei „Nummer einer Schicht“.',['fails','n_num'],'Schicht 1 ist … äh … welche Seite war nochmal unten?'],
            ['osi.getrennt','witzig','Verbindung getrennt','Probeprüfung durch Verlassen der Seite beendet.',['leave'],'Manchmal ist Weglaufen auch eine Lösung.'],
        ]],
        'd1'=>['prefix'=>'d1-dsgvo','subject'=>'Datenschutz','title'=>'Deine Daten sind kein Buffet.','motif'=>'datenschutz','slugs'=>['d1-datenschutz','datenschutz'],'stages'=>10,'exam_minutes'=>[10,20,30],'list'=>[
            ['d1.personenbezug','bronze','Menschen hinter den Daten','Stufe 1 „Personenbezug erkennen“ gemeistert.',['stage',0]],
            ['d1.grundsaetze','bronze','Sammelwut gebremst','Stufe 2 „Grundsätze anwenden“ gemeistert.',['stage',1]],
            ['d1.rechte','silber','Rechte sind keine Extras','Stufe 5 „Betroffenenrechte bearbeiten“ gemeistert.',['stage',4]],
            ['d1.kontrolle','silber','Die richtige Tür','„Klassische TOM-Kontrolle“ 10 × in Folge richtig.',['clean',['t_kontrolle']]],
            ['d1.panne','gold','Ruhe bewahren. Richtig handeln.','Stufe 8 „Datenpannen bearbeiten“ gemeistert und „72-Stunden-Fenster“ 10 × in Folge richtig.',['all',[['stage',7],['clean',['v_stunden']]]]],
            ['d1.lernpfad','gold','Datenschutz mit Durchblick','Alle 10 Stufen des Lernpfads gemeistert.',['path']],
            ['d1.pruefung','platin','Kein Buffet für Fehler','30-Minuten-Prüfung mit mindestens 81 % (Note 2).',['exam',30,81]],
            ['d1.cookie','witzig','Cookie-Monster auf Diät','3 × hintereinander falsch bei „Cookie-Zweck prüfen“.',['fails','a_cookie'],'Nicht jeder Krümel ist technisch notwendig.'],
            ['d1.verbergen','witzig','Ich hab nichts zu verbergen','3 × hintereinander falsch bei „Personenbezug im Kontext“.',['fails','b_person'],'Die Kundenliste hat dazu eine andere Meinung.'],
            ['d1.frist','witzig','72 Stunden sind keine drei Arbeitstage','3 × hintereinander falsch bei „72-Stunden-Fenster“.',['fails','v_stunden'],'Die Datenschutz-Uhr macht am Wochenende keine Pause.'],
        ]],
        'netz'=>['prefix'=>'netz-sprint','subject'=>'Netzwerkgrundlagen','title'=>'Jetzt ma Router bei die Switche!','motif'=>'netzwerke-routing','slugs'=>['netzwerke-sprint','netzwerke','routing-switching'],'stages'=>10,'list'=>[
            ['netz.link-up','bronze','Link up','Stufe 1 „Netzwerkarten & Architektur“ gemeistert.',['stage',0]],
            ['netz.kuerzel','bronze','PAN, LAN, GAN – Hauptsache Plan','Aufgabentyp „Kürzel PAN bis GAN“ 10 × in Folge richtig.',['clean',['b_kurz']]],
            ['netz.mac','silber','MAC-Tabellen-Flüsterer','Stufe 4 „Switch: MAC-Tabelle“ gemeistert.',['stage',3]],
            ['netz.ports','silber','Well-known Ports','„Standardport nennen“ und „Port → Dienst“ je 10 × in Folge richtig.',['clean',['p_port','p_portr']]],
            ['netz.domaenen','gold','Domänen-Dompteur','„Kollisionsdomänen zählen“ und „Broadcastdomänen zählen“ je 10 × in Folge richtig.',['clean',['c_coll','c_bcast']]],
            ['netz.lernpfad','gold','Router bei die Switche','Alle 10 Stufen des Lernpfads gemeistert.',['path']],
            ['netz.marathon','platin','Uptime: 90 Minuten','90-Minuten-Prüfung mit mindestens 81 % (Note 2).',['exam',90,81]],
            ['netz.sturm','witzig','Broadcast-Sturm','3 × hintereinander falsch bei „Flooding: Wie viele Ports?“.',['fails','s_flood'],'Alle Ports? Auch der, von dem es kam?'],
            ['netz.doppelpunkt','witzig','Doppelter Doppelpunkt','3 × hintereinander falsch bei „IPv6 kürzen (RFC 5952)“.',['fails','v_short'],'„::“ gibt es nur einmal pro Adresse.'],
            ['netz.neustart','witzig','Schon mal aus- und eingeschaltet?','3 × hintereinander falsch bei „Fehlerbild deuten“.',['fails','tr_diag'],'Der Klassiker hilft öfter, als man denkt. Hier leider nicht.'],
        ]],
        'subnet'=>['prefix'=>'subnet-sprint','subject'=>'Subnetting','title'=>'Wer teilt, gewinnt','motif'=>'ipv4-subnetting','slugs'=>['subnet-sprint','subnetting','ipv4-subnetting','subnetsprint'],'stages'=>10,'list'=>[
            ['subnet.oktett','bronze','Erstes Oktett geknackt','Stufe 1 „Bits & Oktette“ gemeistert.',['stage',0]],
            ['subnet.potenzen','bronze','Zweierpotenz-Turbo','Aufgabentyp „2 hoch n“ 10 × in Folge richtig.',['clean',['p_pow']]],
            ['subnet.maskenball','silber','Maskenball','Stufe 3 „Präfix ↔ Maske“ gemeistert.',['stage',2]],
            ['subnet.broadcast','silber','Broadcast-Profi','Stufe 7 „Broadcast & Hostbereich“ gemeistert.',['stage',6]],
            ['subnet.vlsm','gold','VLSM-Architekt','„VLSM: Netz-ID einer Abteilung“ und „VLSM: Broadcast einer Abteilung“ je 10 × in Folge richtig.',['clean',['v_net','v_bc']]],
            ['subnet.lernpfad','gold','Netz komplett','Alle 10 Stufen des Lernpfads gemeistert.',['path']],
            ['subnet.marathon','platin','255.255.255.255','90-Minuten-Prüfung mit mindestens 81 % (Note 2).',['exam',90,81]],
            ['subnet.host','witzig','Ein Host zu wenig','3 × hintereinander falsch bei „Nutzbare Hosts aus Präfix“.',['fails','h_usable'],'Netz-ID und Broadcast wollen auch einen Platz.'],
            ['subnet.falsches-netz','witzig','Falsches Netz, gleiches Gefühl','3 × hintereinander falsch bei „Gleiches Subnetz?“.',['fails','c_same'],'Sieht doch fast gleich aus …'],
            ['subnet.leere','witzig','Broadcast ins Leere','3 × hintereinander falsch bei „Broadcastadresse“.',['fails','b_bc'],'Alle hören zu. Nur leider an der falschen Adresse.'],
        ]],
    ];
    return $modules;
}

/** Modulübergreifende Achievements: code => [Stufe, XP, Name, Bedingung, Rätselhinweis|null, versteckt]. */
function ach_globals(): array {
    return [
        'g.willkommen'=>['bronze',10,'Willkommen, DAU','Erste Aufgabe richtig gelöst. Ein DAU mit Potenzial!',null,false],
        'g.allrounder'=>['silber',100,'Allrounder','In 3 verschiedenen Modulen Stufe 1 gemeistert.',null,false],
        'g.7tage'=>['silber',100,'Wiederholungstäter','An 7 verschiedenen Tagen gelernt.',null,false],
        'g.1000'=>['gold',100,'Tausendsassa','1.000 Aufgaben richtig gelöst, über alle Module.',null,false],
        'g.5pfade'=>['gold',200,'Halber Stack','5 Lernpfade komplett gemeistert.',null,false],
        'g.30tage'=>['gold',300,'Dauerbrenner','An 30 verschiedenen Tagen gelernt.',null,false],
        'g.10000'=>['platin',300,'Rechenzentrum','10.000 Aufgaben richtig gelöst, über alle Module.',null,false],
        'g.15pfade'=>['platin',400,'Fast schon Admin','15 Lernpfade komplett gemeistert.',null,false],
        'g.komplett'=>['platin',500,'Komplettist','Die Lernpfade aller veröffentlichten Module gemeistert.',null,false],
        'g.rampensau'=>['witzig',10,'Rampensau','„Sichtbarkeit im Highscore“ eingeschaltet.','Wer gesehen werden will, muss sich zeigen.',false],
        'g.nachteule'=>['witzig',30,'Nachteule','Zwischen 0 und 4 Uhr eine Aufgabe gelöst.','Schlaf wird überbewertet.',false],
        'g.cheater'=>['witzig',30,'Cheater','Abkürzung gesucht. Staub gefunden.',null,true],
        'g.easteregg'=>['versteckt',ACH_EGG_XP,'Fremdscham erfolgreich freigeschaltet','Easter Egg auf der DAU-TO-PRO-Seite gefunden und angesehen.',null,true],
    ];
}

/** Flache Liste aller Achievements: code => [code, module(id|''), tier, xp, name, desc, hint, hidden]. */
function ach_catalog(): array {
    static $all=null;
    if ($all!==null) return $all;
    $tiers=ach_tiers();$all=[];
    foreach(ach_modules() as $mid=>$m) foreach($m['list'] as $a)
        $all[$a[0]]=['code'=>$a[0],'module'=>$mid,'tier'=>$a[1],'xp'=>$tiers[$a[1]][1],'name'=>$a[2],'desc'=>$a[3],'rule'=>$a[4],'hint'=>$a[5]??null,'hidden'=>false];
    foreach(ach_globals() as $code=>$g)
        $all[$code]=['code'=>$code,'module'=>'','tier'=>$g[0],'xp'=>$g[1],'name'=>$g[2],'desc'=>$g[3],'rule'=>null,'hint'=>$g[4],'hidden'=>$g[5]];
    return $all;
}

// ---------------------------------------------------------------- Level
function ach_xp_for_level(int $level): int { $n=max(1,min(50,$level))-1; return (int)round(xp_config()['pro_xp']*$n*($n+1)/(49*50)); }
function ach_level(int $xp): int { for($l=50;$l>1;$l--) if($xp>=ach_xp_for_level($l)) return $l; return 1; }
function ach_level_title(int $level): string {
    $titles=[50=>'PRO',45=>'Guru',40=>'Sysadmin',35=>'Netzwerk-Ninja',30=>'Root-Anwärter',25=>'Paket-Flüsterer',20=>'Bit-Schubser',15=>'Ping-Profi',10=>'Kabelträger',5=>'Klick-Azubi',1=>'DAU'];
    foreach($titles as $from=>$title) if ($level>=$from) return $title;
    return 'DAU';
}
/** Fortschritt innerhalb des aktuellen Levels für den Balken. */
function ach_level_info(int $xp): array {
    $level=ach_level($xp);
    $from=ach_xp_for_level($level);$to=$level>=ACH_LEVEL_MAX?$from:ach_xp_for_level($level+1);
    return ['level'=>$level,'title'=>ach_level_title($level),'xp'=>$xp,'from'=>$from,'to'=>$to,
        'percent'=>$to>$from?(int)floor(($xp-$from)*100/($to-$from)):100,'max'=>$level>=ACH_LEVEL_MAX];
}

// ---------------------------------------------------------------- Modulstand lesen
function ach_json(?string $raw): mixed {
    if ($raw===null || $raw==='') return null;
    try { return json_decode($raw,true,32,JSON_THROW_ON_ERROR); } catch (Throwable) { return null; }
}
/** Liest den gespeicherten Stand eines Moduls (Werte wie im Browser) und prüft ihn auf Plausibilität. */
function ach_module_state(array $values,array $module): array {
    $p=$module['prefix'];
    $state=['mastered'=>[],'correct'=>0,'subs'=>[],'exams'=>[]];
    $path=ach_json($values[$p.'-path-v1']??null);
    if (is_array($path) && is_array($path['st']??null)) {
        foreach($path['st'] as $i=>$st) {
            if (is_numeric($i) && (int)$i>=0 && (int)$i<$module['stages'] && is_array($st) && ($st['mastered']??false)===true) $state['mastered'][]=(int)$i;
            // Der Lernpfad merkt sich die letzten 30 Antworten je Stufe (true/false): zählt für die Fehler-Achievements nicht.
        }
        sort($state['mastered']);$state['mastered']=array_values(array_unique($state['mastered']));
    }
    $stats=ach_json($values[$p.'-stats-v1']??null);
    if (is_array($stats)) {
        $solved=max(0,(int)($stats['solved']??0));$correct=max(0,(int)($stats['correct']??0));
        $state['correct']=min($correct,$solved,1000000);
    }
    $subs=ach_json($values[$p.'-subs-v1']??null);
    if (is_array($subs)) foreach($subs as $id=>$list) {
        if (!is_string($id) || !is_array($list)) continue;
        $state['subs'][$id]=array_map(static fn($v)=>$v?1:0,array_slice(array_values($list),-12));
    }
    if (($module['prefix']??'')==='kv-061126') {
        static $index=null;
        if ($index===null) $index=json_decode((string)file_get_contents(__DIR__.'/lernmodule/kv-question-index.json'),true) ?: [];
        $review=ach_json($values[$p.'-review-v1']??null);
        $ids=is_array($review['unique']??null)?array_fill_keys(array_filter($review['unique'],'is_string'),true):[];
        $counts=['unique'=>0,'categories'=>0,'minimum_category'=>0,'ports'=>0,'mac'=>0,'dns'=>0];$categories=array_fill(0,7,0);
        foreach($index as $q) {
            if(!isset($ids[$q['id']]))continue;
            $counts['unique']++;$categories[(int)$q['c']]++;
            if($q['type']==='number' && str_starts_with($q['sub'],'ports_'))$counts['ports']++;
            if(str_starts_with($q['sub'],'mac_'))$counts['mac']++;
            if(in_array($q['sub'],['dns','dns_cache','dns_diagnose','dienst_53','ports_53','dns_transport'],true))$counts['dns']++;
        }
        $counts['categories']=count(array_filter($categories,static fn($n)=>$n>0));
        $counts['minimum_category']=min($categories);
        $state['kv_counts']=$counts;$state['correct']=$counts['unique'];
    }
    $exams=ach_json($values[$p.'-exam-v1']??null);
    if (is_array($exams) && array_is_list($exams)) foreach(array_slice($exams,-8) as $e) {
        if (!is_array($e)) continue;
        $m=(int)($e['m']??0);$pct=(int)round((float)($e['p']??-1));
        if (!in_array($m,$module['exam_minutes']??[30,60,90],true) || $pct<0 || $pct>100) continue;
        if (($module['prefix']??'')==='kv-061126' && (int)($e['n']??0)!==([30=>20,60=>40,90=>60][$m]??0)) continue;
        $state['exams'][]=['m'=>$m,'p'=>$pct,'left'=>($e['r']??'')==='Seite verlassen'];
    }
    return $state;
}
/** Der Katalog liest den bisherigen Kontostand ohne eine XP-Auswertung auszulösen. */
function ach_card_progress(int $learnerId): array {
    $query=db()->prepare('SELECT best FROM learner_stats WHERE learner_id=?');
    $query->execute([$learnerId]);
    $saved=ach_json($query->fetchColumn() ?: null);
    $values=learner_progress_state($learnerId)['values'];
    $unlocked=ach_unlocked($learnerId);
    $catalog=ach_catalog();
    $cards=[];
    foreach (ach_modules() as $id=>$module) {
        $state=ach_module_state($values,$module);
        $best=ach_merge_best((array)($saved[$id]??[]),$state);
        $earned=[];
        foreach ($module['list'] as $achievement) {
            if (isset($unlocked[$achievement[0]])) $earned[]=ach_public($catalog[$achievement[0]]);
        }
        $progress=[
            'stages'=>$module['stages'],
            'questions'=>$id==='kv'?count(json_decode((string)file_get_contents(__DIR__.'/lernmodule/kv-question-index.json'),true) ?: []):0,
            'mastered'=>$module['stages']>0?array_values(array_intersect($best['m'],range(0,$module['stages']-1))):[],
            'correct'=>$best['c'],
            'exams'=>array_intersect_key($best['e'],array_flip($module['exam_minutes']??[30,60,90])),
            'earned'=>$earned,
            'achievements'=>count($module['list']),
        ];
        foreach ($module['slugs'] as $slug) $cards[$slug]=$progress;
    }
    return $cards;
}
/** Gibt es irgendwo in der Liste $n gleiche Werte $value in Folge? */
function ach_run(array $list,int $value,int $n): bool {
    $run=0;
    foreach($list as $v) { $run=$v===$value?$run+1:0; if ($run>=$n) return true; }
    return false;
}
/** Höchststände eines Moduls zusammenführen (gehen nie verloren, auch wenn der Browser-Verlauf kürzer wird). */
function ach_merge_best(array $best,array $state): array {
    $best['m']=array_values(array_unique(array_merge(array_map('intval',(array)($best['m']??[])),$state['mastered'])));sort($best['m']);
    $best['c']=max((int)($best['c']??0),$state['correct']);
    $e=(array)($best['e']??[]);
    foreach($state['exams'] as $x) { $k=(string)$x['m']; $e[$k]=max((int)($e[$k]??0),$x['p']); if ($x['left']) $best['l']=true; }
    $best['e']=$e;
    return $best;
}
/** Ist die Regel eines Modul-Achievements erfüllt? */
function ach_rule_met(array $rule,array $state,array $best,array $module): bool {
    switch ($rule[0]) {
        case 'kv_count': return (int)($state['kv_counts'][$rule[1]]??0)>=(int)$rule[2];
        case 'any': foreach($rule[1] as $r) if (ach_rule_met($r,$state,$best,$module)) return true; return false;
        case 'stage': return in_array($rule[1],$best['m'],true);
        case 'path': return $module['stages']>0 && count($best['m'])>=$module['stages'];
        case 'clean': foreach($rule[1] as $sub) if (!ach_run($state['subs'][$sub]??[],1,10)) return false; return true;
        case 'fails': return ach_run($state['subs'][$rule[1]]??[],0,3);
        case 'exam': return (int)(($best['e'][(string)$rule[1]])??0)>=$rule[2];
        case 'leave': return !empty($best['l']);
        case 'all': foreach($rule[1] as $r) if (!ach_rule_met($r,$state,$best,$module)) return false; return true;
    }
    return false;
}
/** XP, die ein Modul ohne Achievements bringt (Aufgaben, Stufen, beste Prüfung je Länge). */
function ach_module_xp(array $best): int {
    $xp=min((int)($best['c']??0),ACH_TASK_CAP)*ACH_TASK_XP+count((array)($best['m']??[]))*ACH_STAGE_XP;
    foreach((array)($best['e']??[]) as $minutes=>$pct) $xp+=(int)round(min(100,max(0,(int)$pct))*xp_config()['exam_xp_per_30_min']/100*((int)$minutes/30));
    return $xp;
}

// ---------------------------------------------------------------- Auswertung
function ach_stats_row(int $learnerId): array {
    $db=db();
    $db->prepare('INSERT OR IGNORE INTO learner_stats(learner_id) VALUES(?)')->execute([$learnerId]);
    $q=$db->prepare('SELECT * FROM learner_stats WHERE learner_id=?');$q->execute([$learnerId]);
    return $q->fetch(PDO::FETCH_ASSOC);
}
function ach_unlocked(int $learnerId): array {
    $q=db()->prepare('SELECT code,unlocked_at FROM learner_achievements WHERE learner_id=?');$q->execute([$learnerId]);
    return array_column($q->fetchAll(PDO::FETCH_ASSOC),'unlocked_at','code');
}
/** Katalog-Module, die auf der Website veröffentlicht sind (über das Vorschaubild-Motiv zugeordnet). */
function ach_live_modules(): array {
    require_once __DIR__.'/dau_lib.php';
    $motifs=[];
    foreach(db()->query("SELECT slug,title,description FROM html_pages WHERE category='lernen' AND published=1")->fetchAll(PDO::FETCH_ASSOC) as $page) $motifs[dtp_preview_match($page)]=true;
    $live=[];
    foreach(ach_modules() as $id=>$m) if (isset($motifs[$m['motif']])) $live[]=$id;
    return $live;
}
function ach_berlin(?int $time=null): DateTimeImmutable {
    return (new DateTimeImmutable('@'.($time??time())))->setTimezone(new DateTimeZone('Europe/Berlin'));
}

/**
 * Wertet alles neu aus und schaltet erreichte Achievements frei.
 * $events: activity (Fortschritt gespeichert), solved (Aufgabe gelöst, für Nachteule), egg (Easter Egg), time (Tests).
 * @return array{new:list<array>,level:array,level_up:bool}
 */
function ach_evaluate_locked(int $learnerId,array $events=[]): array {
    $db=db();
    $now=(int)($events['time']??time());
    $row=ach_stats_row($learnerId);
    $best=ach_json($row['best']);if (!is_array($best)) $best=[];
    $values=learner_progress_state($learnerId)['values'];
    $unlocked=ach_unlocked($learnerId);
    $before=$best;
    $migrated=xp_initialize($learnerId,$row,$values,$now);
    $met=[];
    $completePaths=0;$firstStages=0;$totalCorrect=0;
    foreach(xp_modules() as $mid=>$module) {
        $state=ach_module_state($values,$module);
        $b=ach_merge_best((array)($best[$mid]??[]),$state);
        if ($b!==['m'=>[],'c'=>0,'e'=>[]]) $best[$mid]=$b;
        foreach($module['list'] as $a) if (ach_rule_met($a[4],$state,$b,$module)) $met[$a[0]]=true;
        if ($module['stages']>0 && count($b['m'])>=$module['stages']) $completePaths++;
        if (in_array(0,$b['m'],true)) $firstStages++;
        $totalCorrect+=$b['c'];
    }
    // Registrierung und Anmeldung sind keine Lernleistungen. Der erste richtige Treffer zählt.
    if ($totalCorrect>=1) $met['g.willkommen']=true;
    // Lerntage (Kalendertage in Deutschland), nur wenn wirklich gelernt wurde.
    $days=(int)$row['days'];$lastDay=(string)$row['last_day'];
    $activity=xp_activity($learnerId,$before,$best,$now,!$migrated && !empty($events['activity']));
    if ($activity) { $today=ach_berlin($now)->format('Y-m-d'); if ($today!==$lastDay) {$days++;$lastDay=$today;} }
    if ($firstStages>=3) $met['g.allrounder']=true;
    if ($days>=7) $met['g.7tage']=true;
    if ($days>=30) $met['g.30tage']=true;
    if ($totalCorrect>=1000) $met['g.1000']=true;
    if ($totalCorrect>=10000) $met['g.10000']=true;
    if ($completePaths>=5) $met['g.5pfade']=true;
    if ($completePaths>=15) $met['g.15pfade']=true;
    $live=array_values(array_filter(ach_live_modules(),fn($id)=>empty(ach_modules()[$id]['optional'])));
    if ($live && !array_filter($live,fn($id)=>count((array)($best[$id]['m']??[]))<ach_modules()[$id]['stages'])) $met['g.komplett']=true;
    if ((int)$row['highscore_visible']===1) $met['g.rampensau']=true;
    if ($activity && !empty($events['solved']) && (int)ach_berlin($now)->format('G')<4) $met['g.nachteule']=true;
    if (!empty($events['cheater'])) $met['g.cheater']=true;
    if (!empty($events['egg'])) $met['g.easteregg']=true;

    $catalog=ach_catalog();$new=[];
    $stamp=gmdate('Y-m-d H:i:s',$now);
    $insert=$db->prepare('INSERT OR IGNORE INTO learner_achievements(learner_id,code,unlocked_at) VALUES(?,?,?)');
    foreach(array_keys($met) as $code) {
        if (isset($unlocked[$code]) || !isset($catalog[$code])) continue;
        $insert->execute([$learnerId,$code,$stamp]);
        if ($insert->rowCount()>0) { $unlocked[$code]=$stamp; $new[]=ach_public($catalog[$code]); xp_add($learnerId,'achievement:'.$code,'achievements',(int)$catalog[$code]['xp'],$catalog[$code]['name'],$now); }
    }
    xp_progress($learnerId,$before,$best,$now,!$migrated && !empty($events['activity']));
    $xp=xp_total($learnerId);
    $oldLevel=ach_level((int)$row['xp']);$level=ach_level($xp);
    $changed=$xp!==(int)$row['xp'];
    $db->prepare('UPDATE learner_stats SET xp=?,level=?,achievements=?,best=?,days=?,last_day=?,xp_changed_at=CASE WHEN ? THEN ? ELSE xp_changed_at END,updated_at=? WHERE learner_id=?')
       ->execute([$xp,$level,count(array_intersect_key($unlocked,$catalog)),json_encode($best,JSON_UNESCAPED_UNICODE),$days,$lastDay,$changed?1:0,$stamp,$stamp,$learnerId]);
    return ['new'=>$new,'level'=>ach_level_info($xp),'level_up'=>$level>$oldLevel && $oldLevel>0 && (int)$row['xp']>0];
}
/** Was über ein Achievement nach außen geht (Popup, Kontoseite). */
function ach_public(array $a): array {
    $modules=ach_modules();
    $tier=ach_tiers()[$a['tier']][0];
    return ['code'=>$a['code'],'name'=>$a['name'],'desc'=>$a['desc'],'tier'=>$a['tier'],'tier_label'=>$tier,'xp'=>$a['xp'],
        'subject'=>$a['module']!==''?$modules[$a['module']]['subject']:'Modulübergreifend',
        'icon'=>is_file(__DIR__.'/assets/achievement-icons/'.$a['code'].'.webp')?'/assets/achievement-icons/'.$a['code'].'.webp':(is_file(__DIR__.'/achievement-icons/'.$a['code'].'.png')?'/achievement-icons/'.$a['code'].'.png':null)];
}

// ---------------------------------------------------------------- Kontoseite
/** Alle Achievements gruppiert für „Mein Fortschritt“: veröffentlichte Module + modulübergreifend. */
function ach_overview(int $learnerId): array {
    $unlocked=ach_unlocked($learnerId);
    $catalog=ach_catalog();
    $live=ach_live_modules();
    $groups=[];
    foreach(ach_modules() as $mid=>$m) {
        $has=array_filter($m['list'],fn($a)=>isset($unlocked[$a[0]]));
        if (!empty($m['hidden'])) continue;   // ausgeblendete Module (CS2) erscheinen nirgends, auch nicht ausgegraut
        if (!in_array($mid,$live,true) && !$has) continue;   // nicht veröffentlichte Module nur zeigen, wenn schon etwas freigeschaltet ist
        $groups[]=['id'=>$mid,'subject'=>$m['subject'],'title'=>$m['title'],'items'=>array_map(fn($a)=>ach_item($catalog[$a[0]],$unlocked),$m['list'])];
    }
    $groups[]=['id'=>'global','subject'=>'Modulübergreifend','title'=>'Dranbleiben lohnt sich','items'=>array_map(fn($c)=>ach_item($catalog[$c],$unlocked),array_keys(ach_globals()))];
    $total=0;$done=0;
    foreach($groups as $g) foreach($g['items'] as $i) {$total++;if($i['unlocked'])$done++;}
    return ['groups'=>$groups,'total'=>$total,'done'=>$done];
}
/** Achievements eines ausgeblendeten Moduls (CS2) bleiben samt XP gespeichert, werden aber nicht angezeigt. */
function ach_visible(string $code): bool {
    $a=ach_catalog()[$code]??null;
    return $a!==null && ($a['module']==='' || empty(ach_modules()[$a['module']]['hidden']));
}
function ach_item(array $a,array $unlocked): array {
    $on=isset($unlocked[$a['code']]);
    $item=ach_public($a)+['unlocked'=>$on,'unlocked_at'=>$unlocked[$a['code']]??null,'secret'=>false];
    if (!$on && $a['hidden']) $item=array_merge($item,['name'=>'Verstecktes Achievement','desc'=>'Irgendwo auf DAU TO PRO wartet etwas. Mehr wird nicht verraten.','secret'=>true,'xp'=>0]);
    elseif (!$on && $a['hint']!==null) $item['desc']=$a['hint'];
    return $item;
}
function ach_stats(int $learnerId): array {
    $row=ach_stats_row($learnerId);
    return ['level'=>ach_level_info((int)$row['xp']),'visible'=>(int)$row['highscore_visible']===1,'blocked'=>(int)$row['highscore_blocked']===1,'achievements'=>(int)$row['achievements']];
}
/** Highscore-Sichtbarkeit (Opt-in). Einschalten schaltet „Rampensau“ frei. */
function ach_set_visible(int $learnerId,bool $visible): array {
    ach_stats_row($learnerId);
    db()->prepare('UPDATE learner_stats SET highscore_visible=? WHERE learner_id=?')->execute([$visible?1:0,$learnerId]);
    return ach_evaluate($learnerId);
}
function ach_admin_block(int $learnerId,bool $blocked): void {
    ach_stats_row($learnerId);
    db()->prepare('UPDATE learner_stats SET highscore_blocked=? WHERE learner_id=?')->execute([$blocked?1:0,$learnerId]);
}

// ---------------------------------------------------------------- Highscore
/** Wie viele Konten haben ein Achievement? Für „die seltensten“. */
function ach_rarity(): array {
    return array_map('intval',array_column(db()->query('SELECT code,COUNT(*) AS n FROM learner_achievements GROUP BY code')->fetchAll(PDO::FETCH_ASSOC),'n','code'));
}
/**
 * Rangliste: nur Konten mit eingeschalteter Sichtbarkeit (und nicht vom Admin ausgeblendet).
 * Sortierung: XP, dann Anzahl Achievements, dann wer den Stand zuerst erreicht hat.
 */
function ach_highscore(int $limit=100): array {
    $q=db()->prepare('SELECT l.id,l.username,s.xp,s.level,s.achievements,s.xp_changed_at FROM learner_stats s JOIN learners l ON l.id=s.learner_id
        WHERE s.highscore_visible=1 AND s.highscore_blocked=0 ORDER BY s.xp DESC,s.achievements DESC,COALESCE(s.xp_changed_at,\'9999\') ASC,l.id ASC LIMIT ?');
    $q->execute([$limit]);
    $rows=$q->fetchAll(PDO::FETCH_ASSOC);
    $rarity=ach_rarity();$catalog=ach_catalog();
    $codes=db()->prepare('SELECT code FROM learner_achievements WHERE learner_id=?');
    foreach($rows as $i=>&$r) {
        $r['rank']=$i+1;$r['level']=ach_level((int)$r['xp']);$r['title']=ach_level_title((int)$r['level']);$r['showcase']=xp_showcase((int)$r['id']);
        $codes->execute([$r['id']]);
        $own=array_values(array_filter($codes->fetchAll(PDO::FETCH_COLUMN),fn($c)=>ach_visible($c)));
        usort($own,fn($a,$b)=>[$rarity[$a]??0,-$catalog[$a]['xp']]<=>[$rarity[$b]??0,-$catalog[$b]['xp']]);
        $r['unlocked']=array_map(fn($c)=>ach_public($catalog[$c]),$own);
        $r['rare']=array_slice($r['unlocked'],0,3);
    }
    return $rows;
}
/** Welcher Platz wäre das eigene Konto (auch wenn unsichtbar)? */
function ach_would_rank(int $learnerId): int {
    $me=ach_stats_row($learnerId);
    $q=db()->prepare('SELECT COUNT(*) FROM learner_stats WHERE highscore_visible=1 AND highscore_blocked=0 AND learner_id<>? AND (xp>? OR (xp=? AND achievements>?))');
    $q->execute([$learnerId,(int)$me['xp'],(int)$me['xp'],(int)$me['achievements']]);
    return (int)$q->fetchColumn()+1;
}
/** Für den Datenexport. */
function ach_export(int $learnerId): array {
    $stats=ach_stats($learnerId);$catalog=ach_catalog();$out=[];
    foreach(ach_unlocked($learnerId) as $code=>$at) $out[]=['achievement'=>$catalog[$code]['name']??$code,'code'=>$code,'freigeschaltet_utc'=>$at];
    return ['xp'=>$stats['level']['xp'],'level'=>$stats['level']['level'],'highscore_sichtbar'=>$stats['visible'],'achievements'=>$out,'xp_system_version'=>xp_config()['version'],'fortschritt'=>xp_dashboard($learnerId),'vitrine'=>xp_showcase($learnerId)];
}





