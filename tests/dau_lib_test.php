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
check((int)db()->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")->fetchColumn()===5,'Keine zusätzlichen Tabellen angelegt');

// --- Vorschaubilder ---
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
$cases=[
 [['slug'=>'osi-sprint','title'=>'OSI Sprint','description'=>'Netzwerk-Schichten'],'osi-modell'],
 [['slug'=>'subnet-sprint','title'=>'Subnet Sprint','description'=>''],'ipv4-subnetting'],
 [['slug'=>'netzwerke-sprint','title'=>'Netzwerke Sprint','description'=>''],'netzwerke-routing'],
 [['slug'=>'a1','title'=>'A1 · Bits zum bitteren Ende','description'=>'Zahlensysteme binär'],'zahlensysteme'],
 [['slug'=>'dsgvo-kompakt','title'=>'DSGVO kompakt','description'=>''],'it-sicherheit'],
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
$fx=dtp_hero_fx_attrs(['custom'=>false]);
check(str_contains($fx,'data-fx="../assets/dau-to-pro-pixelpilz.png?v=') && str_contains($fx,'data-fx-video="../assets/dau-to-pro-easteregg.mp4?v='),'Hero-Effekt: Bild und Video werden übergeben');
check(dtp_hero_fx_attrs(['custom'=>true])==='','Hero-Effekt nur mit der Original-Hero-Grafik');
@unlink($tmp);@unlink($db);
echo $failures?"$failures von $count Prüfungen fehlgeschlagen\n":"DAU-Bibliothek: $count Prüfungen bestanden\n";
exit($failures?1:0);
