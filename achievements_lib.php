<?php
// DAU TO PRO: Achievements, XP, Level und Highscore.
// Alles wird auf dem Server aus dem Fortschritt berechnet, den die Lernmodule ohnehin speichern
// (dau-to-pro/sync.js → learner_progress). Die Module selbst müssen dafür nichts wissen.
declare(strict_types=1);
require_once __DIR__.'/learner_lib.php';

const ACH_STAGE_XP=75;        // pro gemeisterter Lernpfad-Stufe
const ACH_TASK_XP=2;          // pro richtig gelöster Aufgabe
const ACH_TASK_CAP=1000;      // höchstens so viele richtige Aufgaben zählen pro Modul für XP
const ACH_LEVEL_MAX=50;
const ACH_EGG_XP=200;

/** Stufen der Achievements: Name und XP. */
function ach_tiers(): array {
    return ['bronze'=>['Bronze',25],'silber'=>['Silber',50],'gold'=>['Gold',100],'platin'=>['Platin',150],'witzig'=>['Witzig',30],'versteckt'=>['Versteckt',0]];
}

/**
 * Katalog der Lernmodule mit ihren 10 eigenen Achievements (2 Bronze, 2 Silber, 2 Gold, 1 Platin, 3 witzige).
 * prefix  = Anfang der Speicherschlüssel im Browser (z. B. "osi-sprint" → osi-sprint-path-v1)
 * motif   = Vorschaubild-Motiv, über das ein veröffentlichtes Projekt dem Katalog zugeordnet wird
 * Regeln: stage (Stufe n gemeistert, ab 0), path (alle Stufen), clean (Aufgabentypen je 10 × richtig in Folge),
 *         fails (Aufgabentyp 3 × falsch in Folge), exam (Prüfungslänge in Minuten + Mindestprozent), leave (Prüfung durch Verlassen beendet)
 */
function ach_modules(): array {
    return [
        'd2'=>['prefix'=>'d2-sec','subject'=>'IT-Sicherheit & Schutzbedarf','title'=>'Passwort123 ist kein Konzept','motif'=>'d2-it-sicherheit','stages'=>10,'list'=>[
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
        'a1'=>['prefix'=>'a1-bits','subject'=>'Zahlensysteme','title'=>'Bits zum bitteren Ende','motif'=>'zahlensysteme','stages'=>10,'list'=>[
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
        'osi'=>['prefix'=>'osi-sprint','subject'=>'OSI-Schichten','title'=>'Easy OSI for FISI','motif'=>'osi-modell','stages'=>10,'list'=>[
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
        'netz'=>['prefix'=>'netz-sprint','subject'=>'Netzwerkgrundlagen','title'=>'Jetzt ma Router bei die Switche!','motif'=>'netzwerke-routing','stages'=>10,'list'=>[
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
        'subnet'=>['prefix'=>'subnet-sprint','subject'=>'Subnetting','title'=>'Wer teilt, gewinnt','motif'=>'ipv4-subnetting','stages'=>10,'list'=>[
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
}

/** Modulübergreifende Achievements: code => [Stufe, XP, Name, Bedingung, Rätselhinweis|null, versteckt]. */
function ach_globals(): array {
    return [
        'g.willkommen'=>['bronze',10,'Willkommen, DAU','Lernkonto angelegt.',null,false],
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
function ach_xp_for_level(int $level): int { return 50*$level*($level-1); }
function ach_level(int $xp): int { return max(1,min(ACH_LEVEL_MAX,(int)floor((1+sqrt(1+0.08*max(0,$xp)))/2))); }
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
    $exams=ach_json($values[$p.'-exam-v1']??null);
    if (is_array($exams) && array_is_list($exams)) foreach(array_slice($exams,-8) as $e) {
        if (!is_array($e)) continue;
        $m=(int)($e['m']??0);$pct=(int)round((float)($e['p']??-1));
        if (!in_array($m,[30,60,90],true) || $pct<0 || $pct>100) continue;
        $state['exams'][]=['m'=>$m,'p'=>$pct,'left'=>($e['r']??'')==='Seite verlassen'];
    }
    return $state;
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
        case 'stage': return in_array($rule[1],$best['m'],true);
        case 'path': return count($best['m'])>=$module['stages'];
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
    foreach((array)($best['e']??[]) as $minutes=>$pct) $xp+=(int)round(min(100,max(0,(int)$pct))*2*((int)$minutes/30));
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
function ach_evaluate(int $learnerId,array $events=[]): array {
    $db=db();
    $now=(int)($events['time']??time());
    $row=ach_stats_row($learnerId);
    $best=ach_json($row['best']);if (!is_array($best)) $best=[];
    $values=learner_progress_state($learnerId)['values'];
    $unlocked=ach_unlocked($learnerId);
    $met=['g.willkommen'=>true];
    $completePaths=0;$firstStages=0;$totalCorrect=0;
    foreach(ach_modules() as $mid=>$module) {
        $state=ach_module_state($values,$module);
        $b=ach_merge_best((array)($best[$mid]??[]),$state);
        if ($b!==['m'=>[],'c'=>0,'e'=>[]]) $best[$mid]=$b;
        foreach($module['list'] as $a) if (ach_rule_met($a[4],$state,$b,$module)) $met[$a[0]]=true;
        if (count($b['m'])>=$module['stages']) $completePaths++;
        if (in_array(0,$b['m'],true)) $firstStages++;
        $totalCorrect+=$b['c'];
    }
    // Lerntage (Kalendertage in Deutschland), nur wenn wirklich gelernt wurde.
    $days=(int)$row['days'];$lastDay=(string)$row['last_day'];
    if (!empty($events['activity'])) { $today=ach_berlin($now)->format('Y-m-d'); if ($today!==$lastDay) {$days++;$lastDay=$today;} }
    if ($firstStages>=3) $met['g.allrounder']=true;
    if ($days>=7) $met['g.7tage']=true;
    if ($days>=30) $met['g.30tage']=true;
    if ($totalCorrect>=1000) $met['g.1000']=true;
    if ($totalCorrect>=10000) $met['g.10000']=true;
    if ($completePaths>=5) $met['g.5pfade']=true;
    if ($completePaths>=15) $met['g.15pfade']=true;
    $live=ach_live_modules();
    if ($live && !array_filter($live,fn($id)=>count((array)($best[$id]['m']??[]))<ach_modules()[$id]['stages'])) $met['g.komplett']=true;
    if ((int)$row['highscore_visible']===1) $met['g.rampensau']=true;
    if (!empty($events['solved']) && (int)ach_berlin($now)->format('G')<4) $met['g.nachteule']=true;
    if (!empty($events['egg'])) $met['g.easteregg']=true;

    $catalog=ach_catalog();$new=[];
    $stamp=gmdate('Y-m-d H:i:s',$now);
    $insert=$db->prepare('INSERT OR IGNORE INTO learner_achievements(learner_id,code,unlocked_at) VALUES(?,?,?)');
    foreach(array_keys($met) as $code) {
        if (isset($unlocked[$code]) || !isset($catalog[$code])) continue;
        $insert->execute([$learnerId,$code,$stamp]);
        if ($insert->rowCount()>0) { $unlocked[$code]=$stamp; $new[]=ach_public($catalog[$code]); }
    }
    $xp=0;
    foreach($best as $b) $xp+=ach_module_xp((array)$b);
    foreach(array_keys($unlocked) as $code) $xp+=(int)($catalog[$code]['xp']??0);
    $oldLevel=(int)$row['level'];$level=ach_level($xp);
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
        'subject'=>$a['module']!==''?$modules[$a['module']]['subject']:'Modulübergreifend'];
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
        if (!in_array($mid,$live,true) && !$has) continue;   // nicht veröffentlichte Module nur zeigen, wenn schon etwas freigeschaltet ist
        $groups[]=['id'=>$mid,'subject'=>$m['subject'],'title'=>$m['title'],'items'=>array_map(fn($a)=>ach_item($catalog[$a[0]],$unlocked),$m['list'])];
    }
    $groups[]=['id'=>'global','subject'=>'Modulübergreifend','title'=>'Dranbleiben lohnt sich','items'=>array_map(fn($c)=>ach_item($catalog[$c],$unlocked),array_keys(ach_globals()))];
    $total=0;$done=0;
    foreach($groups as $g) foreach($g['items'] as $i) {$total++;if($i['unlocked'])$done++;}
    return ['groups'=>$groups,'total'=>$total,'done'=>$done];
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
        $r['rank']=$i+1;$r['title']=ach_level_title((int)$r['level']);
        $codes->execute([$r['id']]);
        $own=array_values(array_filter($codes->fetchAll(PDO::FETCH_COLUMN),fn($c)=>isset($catalog[$c])));
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
    return ['xp'=>$stats['level']['xp'],'level'=>$stats['level']['level'],'highscore_sichtbar'=>$stats['visible'],'achievements'=>$out];
}


