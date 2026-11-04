<?php
// Unit tests for dau_lib.php (texts, preview images, hero handling) on a temporary database.
declare(strict_types=1);
$db=tempnam(sys_get_temp_dir(),'gd-test-').'.sqlite';
putenv('GD_DB_PATH='.$db);
require __DIR__.'/../dau_lib.php';
$failures=0;$count=0;
function check(bool $ok,string $label): void {global $failures,$count;$count++;if(!$ok){$failures++;fwrite(STDERR,"✗ $label\n");}}
function throws(callable $fn): bool {try{$fn();return false;}catch(Throwable){return true;}}

// --- Seitentexte ---
$defaults=dtp_page_defaults();
check(dtp_page_content()===$defaults,'Ohne gespeicherte Werte gelten die Standardtexte');
check($defaults['title']==='Von Null Plan zu echtem' && $defaults['title_highlight']==='IT-Verständnis','Standardtitel entspricht der bisherigen Seite');
$input=$defaults;
$input['title']="  Neuer\tTitel  ";
$input['lead']="Zeile 1\r\nZeile 2\x07";
dtp_page_save($input);
$c=dtp_page_content();
check($c['title']==='Neuer Titel','Einzeilige Felder werden getrimmt und Steuerzeichen entfernt');
check($c['lead']==="Zeile 1\nZeile 2",'Mehrzeilige Felder behalten Zeilenumbrüche ohne Steuerzeichen');
check(throws(fn()=>dtp_page_save(['title'=>'']+$defaults)),'Pflichtfeld leer wird abgelehnt');
check(throws(fn()=>dtp_page_save(['title'=>str_repeat('x',91)]+$defaults)),'Zu langer Text wird abgelehnt');
check(throws(fn()=>dtp_page_save(['title'=>"\xC3\x28"]+$defaults)),'Ungültiges UTF-8 wird abgelehnt');
$missing=$defaults;unset($missing['lead']);
check(throws(fn()=>dtp_page_save($missing)),'Fehlendes Feld wird abgelehnt');
check(dtp_page_content()['title']==='Neuer Titel','Fehlgeschlagene Speicherung ändert nichts');
$before=dtp_page_content();
$GLOBALS['dtp_preview_content']=dtp_page_validate(['title'=>'Nur Vorschau']+$defaults);
check(dtp_page_content()['title']==='Nur Vorschau','Vorschau nutzt ungespeicherte Werte');
unset($GLOBALS['dtp_preview_content']);
check(dtp_page_content()===$before,'Vorschau schreibt nichts in die Datenbank');
dtp_page_reset_texts();
check(dtp_page_content()===$defaults,'Zurücksetzen stellt alle Standardtexte her');
check(dtp_inline('<b>x</b> **fett** & "q"')==='&lt;b&gt;x&lt;/b&gt; <strong>fett</strong> &amp; &quot;q&quot;','Nur **fett** wird formatiert, HTML wird escaped');
check(dtp_subtitle_parts('Verstehen · Üben | Anwenden, ')===['Verstehen','Üben','Anwenden'],'Untertitel wird in Begriffe zerlegt');
$tables=db()->query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);
check($tables===['apps','html_pages','inquiries','learner_achievements','learner_attempts','learner_daily','learner_practice','learner_progress','learner_showcase','learner_stats','learner_tokens','learner_xp_events','learner_xp_state','learners','settings','users'],'Seiteneditor legt keine eigenen Tabellen an (nur die bekannten, inkl. Lernkonten und Achievements)');

// --- Vorschaubilder ---
check(str_contains(dtp_module_description(['slug'=>'osi-sprint','title'=>'OSI-Schichten','description'=>'Easy OSI']),'Sieben Schichten'),'Alter OSI-Platzhalter wird durch verständliches Lernziel ersetzt');
check(str_contains(dtp_module_description(['slug'=>'subnet-sprint','title'=>'Subnet Sprint','description'=>'Subnetting, Subnetting, Subnetting...']),'Broadcast'),'Alter Subnetting-Platzhalter erklärt das Lernziel');
check(dtp_module_description(['title'=>'OSI','description'=>'Meine eigene Beschreibung'])==='Meine eigene Beschreibung','Eigene aussagekräftige Kartentexte bleiben erhalten');
$catalog=dtp_preview_catalog();
check(count($catalog['motifs'])>=8,'Mindestens acht mitgelieferte Motive');
foreach($catalog['motifs'] as $id=>$motif){
    $big=@getimagesize(__DIR__.'/../'.$motif['src']);
    check($big!==false && $big[0]===1280 && $big[1]===720 && $big['mime']==='image/webp',"Motiv $id ist WebP 1280×720");
    $small=$motif['small']!==''?@getimagesize(__DIR__.'/../'.$motif['small']):false;
    check($small!==false && $small[0]===640 && $small[1]===360,"Motiv $id hat eine 640×360-Variante");
    check(filesize(__DIR__.'/../'.$motif['src'])<120000,"Motiv $id ist kleiner als 120 KB");
}
$hashes=array_map(fn($m)=>md5_file(__DIR__.'/../'.$m['src']),$catalog['motifs']);
check(count(array_unique($hashes))===count($hashes),'Jedes Motiv ist ein eigenes Bild');
// --- Persönliche Modulkacheln mit historischen Kontodaten ---
require_once __DIR__.'/../achievements_lib.php';
db()->exec("INSERT INTO learners(id,username,password_hash,recovery_hash,created_at) VALUES(42,'Retro','x','x','2026-11-01')");
db()->prepare('INSERT INTO learner_stats(learner_id,best) VALUES(42,?)')
    ->execute([json_encode(['osi'=>['m'=>[0],'c'=>7,'e'=>[30=>81]]])]);
db()->exec("INSERT INTO learner_achievements(learner_id,code,unlocked_at) VALUES(42,'osi.kabel','2026-11-01')");
$values=[
    'osi-sprint-path-v1'=>json_encode(['st'=>[1=>['mastered'=>true]]]),
    'osi-sprint-stats-v1'=>json_encode(['solved'=>9,'correct'=>8]),
];
$save=db()->prepare("INSERT INTO learner_progress(learner_id,storage_key,value,module_slug,updated_at) VALUES(42,?,?,'osi-sprint','2026-11-02')");
foreach ($values as $key=>$value) $save->execute([$key,$value]);
$beforeBest=ach_stats_row(42)['best'];
$progress=ach_card_progress(42);
check($progress['osi-sprint']['mastered']===[0,1] && $progress['osi-sprint']['correct']===8 && $progress['osi-sprint']['exams']===[30=>81],'Kachel verbindet alte Höchststände und gespeicherten Fortschritt');
check($progress['osi-modell']===$progress['osi-sprint'] && !isset($progress['osi-beliebig']),'Nur ausdrücklich zugeordnete Modul-URLs erhalten Kontofortschritt');
check(ach_stats_row(42)['best']===$beforeBest && xp_total(42)===0,'Katalogbesuch schreibt keinen Fortschritt und vergibt keine XP');
$card=dtp_module_card(['slug'=>'osi-sprint','title'=>'OSI'], '../',true,$progress['osi-sprint']);
check(str_contains($card,'<article') && str_contains($card,'<details') && str_contains($card,'2 / 10 Stufen') && str_contains($card,'30 Min. · 81 %') && str_contains($card,'Kabel steckt'),'Kachel zeigt aufklappbare Details mit Altfortschritt');

$full=$progress['osi-sprint'];
$full['mastered']=range(0,$full['stages']-1);
check(str_contains(dtp_card_progress($full),'Lernpfad abgeschlossen'),'Vollständiger Lernpfad wird als abgeschlossen markiert');
check(!str_contains(dtp_module_card(['slug'=>'osi-sprint','title'=>'OSI']),'module-progress'),'Gastkacheln bleiben ohne Kontofortschritt');

$catalog=json_decode(file_get_contents(__DIR__.'/../lernmodule/manifest.json'),true,512,JSON_THROW_ON_ERROR);
$cardNumbers=[];
foreach ($catalog['modules'] as $module) {
    $card=dtp_module_card($module);
    check(preg_match('/class="module-number">([0-9]{2})<\//',$card,$badge)===1,'Modulkachel hat eine Nummer: '.$module['slug']);
    check(!in_array($badge[1],$cardNumbers,true),'Modulnummer ist eindeutig: '.$module['slug']);
    $cardNumbers[$module['slug']]=$badge[1];
}
check($cardNumbers['netzwerke-sprint']==='02' && $cardNumbers['osi-sprint']==='03','Netzwerkgrundlagen und OSI haben feste Nummern');
check($cardNumbers['a1-zahlensysteme']==='01' && $cardNumbers['f2-kalkulation']==='06','Bereits vereinbarte Nummern bleiben erhalten');
check(str_contains(dtp_module_card(['slug'=>'osi','title'=>'OSI','subject'=>'OSI-Schichten']),'class="module-number">03<'),'Alte OSI-URL hat dieselbe Modulnummer');
check(!str_contains(dtp_module_card(['slug'=>'test-wlan','title'=>'WLAN','subject'=>'WLAN-Praxis']),'module-number'),'Module ohne zugewiesene Nummer zeigen keine Themenbereichsnummer');


$cases=[
 [['slug'=>'osi-sprint','title'=>'OSI Sprint','description'=>'Netzwerk-Schichten'],'osi-modell'],
 [['slug'=>'subnet-sprint','title'=>'Subnet Sprint','description'=>''],'ipv4-subnetting'],
 [['slug'=>'netzwerke-sprint','title'=>'Netzwerke Sprint','description'=>''],'netzwerke-routing'],
 [['slug'=>'a1','title'=>'A1 · Bits zum bitteren Ende','description'=>'Zahlensysteme binär'],'zahlensysteme'],
 [['slug'=>'dsgvo-kompakt','title'=>'DSGVO kompakt','description'=>''],'datenschutz'],
 [['slug'=>'cpu-tour','title'=>'Prozessor & Mainboard','description'=>''],'hardware'],
 [['slug'=>'ihk-check','title'=>'IHK Prüfung 90 Minuten','description'=>'OSI und Subnetting gemischt'],'pruefung'],
 [['slug'=>'neu','title'=>'Etwas ganz anderes','description'=>''],'it-grundlagen'],
 [['slug'=>'posix','title'=>'Posix Basics','description'=>''],'it-grundlagen'],
];
foreach($cases as [$module,$expected]) check(dtp_preview_match($module)===$expected,'Automatische Zuordnung: '.$module['title'].' → '.$expected);
$auto=dtp_preview_resolve(['slug'=>'osi-sprint','title'=>'OSI','preview_image'=>'','preview_y'=>0]);
check($auto['source']==='auto' && $auto['src']==='assets/dau-previews/osi-modell.webp' && $auto['y']===50,'Ohne Bild: automatisches Motiv, zentriert');
$bundled=dtp_preview_resolve(['title'=>'x','preview_image'=>'assets/dau-previews/hardware.webp','preview_fit'=>'contain','preview_x'=>10,'preview_y'=>90]);
check($bundled['source']==='bundled' && $bundled['fit']==='contain' && $bundled['x']===10 && $bundled['y']===90,'Fest zugeordnetes Motiv übernimmt Einpassen/Position');
$missingFile=dtp_preview_resolve(['slug'=>'subnet-sprint','title'=>'x','preview_image'=>'assets/uploads/html-preview-'.str_repeat('a',32).'.png']);
check($missingFile['source']==='auto','Fehlende Bilddatei fällt auf das automatische Motiv zurück');
check(dtp_preview_bundled_id('assets/dau-previews/../lib.webp')===null && dtp_preview_bundled_id('assets/dau-previews/osi-modell.webp')==='osi-modell','Nur echte Motivpfade gelten als mitgeliefert');
$card=dtp_module_card(['slug'=>'osi-sprint','title'=>'<img src=x onerror=alert(1)>','description'=>'"quote"','preview_image'=>'']);
check(!str_contains($card,'<img src=x') && str_contains($card,'&lt;img src=x'),'Kartentitel wird escaped');
check(str_contains($card,'srcset="../assets/dau-previews/osi-modell-640.webp 640w') && str_contains($card,'loading="lazy"') && str_contains($card,'width="1280" height="720"'),'Karte lädt Bilder performant (lazy, srcset, feste Maße)');
check(str_contains(dtp_module_card(['slug'=>'s','title'=>'t'],'../',false),'<div class="module-card"'),'Vorschaukarte ohne Link');
$accents=array_column($catalog['motifs'],'accent');
check(count(array_unique($accents))===count($accents) && !array_filter($accents,fn($c)=>!preg_match('/^#[0-9a-f]{6}$/',$c)),'Jedes Motiv hat eine eigene Modulfarbe');
check(str_contains(dtp_module_card(['slug'=>'osi-sprint','title'=>'OSI'],'../'),'style="--mod:#c4a8ff"'),'OSI-Karte ist violett wie die OSI-Lernseite');
check(dtp_preview_resolve(['slug'=>'netzwerke-sprint','title'=>'Netzwerke','preview_image'=>'assets/uploads/fehlt.png'])['accent']==='#e0977a','Farbe folgt dem Thema auch ohne Motivbild');

// --- Hero ---
$hero=dtp_hero();
$scene=dtp_hero_scene($hero,'Originalgrafik');
check(str_contains($scene,'hero-canvas--clean-people') && substr_count($scene,'src="../assets/dau-to-pro-people-clean-1448.webp"')===2,'Beide Figuren nutzen die neue transparente Quelle');
foreach([768,1448] as $width){
    $clean=__DIR__.'/../assets/dau-to-pro-people-clean-'.$width.'.webp';
    $size=getimagesize($clean);
    check($size!==false && $size[0]===$width && $size['mime']==='image/webp','Neue Figurenquelle hat richtige Maße und Bildformat');
    $cutout=imagecreatefromwebp($clean);
    check(((imagecolorat($cutout,0,0)>>24)&0x7F)===127,'Neue Figurenquelle hat echte transparente Außenpixel');
    imagedestroy($cutout);
}
check(substr_count($scene,'class="hero-plane hero-plane--')===5 && !str_contains($scene,'data-hero-depth='),'Originalgrafik hat fünf feste Ebenen ohne Parallax');
check(str_contains($scene,'hero-learning-growth') && str_contains($scene,'aria-label="Dein Lernfortschritt: vom DAU zum PRO"') && !str_contains($scene,'DEIN LERNFORTSCHRITT'),'Fortschrittsgrafik behält ihren zugänglichen Namen ohne sichtbare Beschriftung');
check(str_contains($scene,'data-mushroom-anchor'),'Der Pilz besitzt einen eigenen mitbewegten Anker');
check(!str_contains(dtp_hero_scene(array_replace($hero,['custom'=>true]),'Eigener Hero'),'hero-plane'),'Eigene Hero-Uploads werden unverändert ohne Ausschnitte ausgegeben');
check($hero['src']==='assets/dau-to-pro-hero-freigestellt.png' && !$hero['custom'],'Standard-Hero ist die freigestellte Originalgrafik');
check(is_file(__DIR__.'/../'.$hero['src']),'Original-Hero-Datei existiert');
$size=getimagesize(__DIR__.'/../'.$hero['src']);
check($size[0]===$hero['width'] && $size[1]===$hero['height'],'Hero-Maße stimmen mit der Datei überein');
$trim=dtp_hero_measure_trim(__DIR__.'/../'.$hero['src'],IMAGETYPE_PNG);
foreach(dtp_hero_default_trim() as $side=>$value) check($trim[$side]<=$value+0.002,"Gemessener Rand ($side) überlappt keine sichtbaren Pixel");
check(preg_match('/--hero-trim-top:0\.0\d+;--hero-trim-bottom:0\.0\d+/',dtp_hero_style($hero))===1,'Hero-Stil enthält Randwerte');
$tmp=tempnam(sys_get_temp_dir(),'hero').'.png';
$im=imagecreatetruecolor(400,300);imagesavealpha($im,true);imagealphablending($im,false);
imagefill($im,0,0,imagecolorallocatealpha($im,0,0,0,127));
imagefilledrectangle($im,100,60,299,239,imagecolorallocatealpha($im,255,200,0,0));imagepng($im,$tmp);
$t=dtp_hero_measure_trim($tmp,IMAGETYPE_PNG);
check($t['left']>0.2 && $t['left']<=0.25 && $t['top']>0.15 && $t['top']<=0.2 && $t['bottom']>0.15 && $t['right']>0.2,'Transparente Ränder einer eigenen Grafik werden korrekt erkannt');
check(!dtp_hero_is_upload('assets/dau-to-pro-hero-freigestellt.png') && !dtp_hero_is_upload('../lib.php'),'Original und fremde Pfade werden nie gelöscht');
$scene=dtp_hero_scene(['custom'=>false,'src'=>'assets/dau-to-pro-hero-1448.webp','width'=>1448,'height'=>1086],'DAU TO PRO');
check(str_contains($scene,'class="hero-brand"') && str_contains($scene,'class="hero-pixelpilz"') && !str_contains($scene,'hero-plane--brand" data-hero-depth="0.18"><div class="hero-slice'),'Schriftzug und Pilz als saubere Vektorgrafik statt Rasterausschnitt');
$fx=dtp_hero_fx_attrs(['custom'=>false]);
check(str_contains($fx,'data-fx="../assets/dau-to-pro-pixelpilz.svg?v=') && str_contains($fx,'data-fx-video="../assets/dau-to-pro-easteregg.mp4?v='),'Hero-Effekt: Bild und Video werden übergeben');
check(dtp_hero_fx_attrs(['custom'=>true])==='','Hero-Effekt nur mit der Original-Hero-Grafik');
@unlink($tmp);@unlink($db);
echo $failures?"$failures von $count Prüfungen fehlgeschlagen\n":"DAU-Bibliothek: $count Prüfungen bestanden\n";
exit($failures?1:0);



