<?php
// DAU TO PRO: shared logic for the public landing page, the module cards,
// bundled preview images and the admin page editor.
// Page texts are stored in the existing settings table (keys "dtp.*"),
// so no new database tables or columns are required.
require_once __DIR__.'/lib.php';

/* ------------------------------------------------------------------ */
/* Topics                                                              */
/* ------------------------------------------------------------------ */

function dtp_lower(string $s): string {return function_exists('mb_strtolower')?mb_strtolower($s,'UTF-8'):strtolower($s);}
function dtp_upper(string $s): string {return function_exists('mb_strtoupper')?mb_strtoupper($s,'UTF-8'):strtoupper($s);}

function dtp_topic(array $p): array {
    $t=dtp_lower(($p['title']??'').' '.($p['description']??'').' '.($p['slug']??''));
    if(preg_match('/subnet|ipv4|ipv6|cidr|wildcard|bits|binär|binaer|hexadezimal|ip-adress/',$t))return ['subnet','IP & Subnetting','01'];
    if(preg_match('/osi|switch|router|wlan|netzwerk|topolog|routing|dhcp|dns|vlan/',$t))return ['netzwerk','Netzwerktechnik','02'];
    if(preg_match('/sicher|datenschutz|dsgvo|krypt|verschlüssel|verschluessel|hash|authentif/',$t))return ['sicherheit','IT-Sicherheit','03'];
    if(preg_match('/prüfung|pruefung|ihk|klausur|wiso|exam/',$t))return ['pruefung','Prüfungsvorbereitung','04'];
    return ['sonstiges','IT-Grundlagen','05'];
}

/* ------------------------------------------------------------------ */
/* Preview images                                                      */
/* ------------------------------------------------------------------ */

const DTP_PREVIEW_DIR='assets/dau-previews';

/** Bundled motifs from assets/dau-previews/manifest.json, keyed by id (only existing files). */
function dtp_preview_catalog(): array {
    static $catalog=null;
    if ($catalog!==null) return $catalog;
    $catalog=['default'=>'','motifs'=>[]];
    $raw=@file_get_contents(__DIR__.'/'.DTP_PREVIEW_DIR.'/manifest.json');
    $data=$raw===false?null:json_decode($raw,true);
    if (!is_array($data) || !is_array($data['motifs']??null)) return $catalog;
    foreach ($data['motifs'] as $motif) {
        $id=(string)($motif['id']??'');
        if (!preg_match('/^[a-z0-9-]{2,60}$/D',$id) || !is_file(__DIR__.'/'.DTP_PREVIEW_DIR.'/'.$id.'.webp')) continue;
        $catalog['motifs'][$id]=[
            'id'=>$id,
            'label'=>(string)($motif['label']??$id),
            'slugs'=>array_values(array_filter(array_map('strval',(array)($motif['slugs']??[])))),
            'keywords'=>array_values(array_filter(array_map(static fn($k)=>dtp_lower((string)$k),(array)($motif['keywords']??[])))),
            'src'=>DTP_PREVIEW_DIR.'/'.$id.'.webp',
            'small'=>is_file(__DIR__.'/'.DTP_PREVIEW_DIR.'/'.$id.'-640.webp')?DTP_PREVIEW_DIR.'/'.$id.'-640.webp':'',
        ];
    }
    $default=(string)($data['default']??'');
    $catalog['default']=isset($catalog['motifs'][$default])?$default:(string)(array_key_first($catalog['motifs'])??'');
    return $catalog;
}

/** Bundled motif id for a stored preview path such as "assets/dau-previews/osi-modell.webp", else null. */
function dtp_preview_bundled_id(string $path): ?string {
    if (!preg_match('~^assets/dau-previews/([a-z0-9-]{2,60})\.webp$~D',$path,$m)) return null;
    return isset(dtp_preview_catalog()['motifs'][$m[1]])?$m[1]:null;
}

/** Choose the thematically matching bundled motif: slug first, then title/slug keywords, then description. */
function dtp_preview_match(array $module): string {
    $catalog=dtp_preview_catalog();
    if (!$catalog['motifs']) return '';
    $slug=(string)($module['slug']??'');
    foreach ($catalog['motifs'] as $id=>$motif) if ($slug!=='' && in_array($slug,$motif['slugs'],true)) return $id;
    $primary=dtp_lower(($module['title']??'').' '.str_replace('-',' ',$slug));
    $secondary=dtp_lower((string)($module['description']??''));
    foreach ([$primary,$secondary] as $haystack) {
        foreach ($catalog['motifs'] as $id=>$motif) {
            foreach ($motif['keywords'] as $keyword) {
                if ($keyword==='') continue;
                // Short keywords (osi, cpu, dns …) must match as a whole word.
                $hit=strlen($keyword)<=4
                    ? preg_match('/(?<![\p{L}\p{N}])'.preg_quote($keyword,'/').'(?![\p{L}\p{N}])/u',$haystack)
                    : str_contains($haystack,$keyword);
                if ($hit) return $id;
            }
        }
    }
    return $catalog['default'];
}

/**
 * Effective card image of a module.
 * source: "custom" (uploaded), "bundled" (motif chosen in admin) or "auto" (no stored image, matched motif).
 */
function dtp_preview_resolve(array $module): array {
    $fit=($module['preview_fit']??'cover')==='contain'?'contain':'cover';
    $x=max(0,min(100,(int)($module['preview_x']??50)));
    $y=max(0,min(100,(int)($module['preview_y']??0)));
    $stored=(string)($module['preview_image']??'');
    $catalog=dtp_preview_catalog();
    if ($stored!=='') {
        $bundled=dtp_preview_bundled_id($stored);
        if ($bundled!==null) {
            $motif=$catalog['motifs'][$bundled];
            return ['src'=>$motif['src'],'small'=>$motif['small'],'fit'=>$fit,'x'=>$x,'y'=>$y,'source'=>'bundled','motif'=>$bundled,'label'=>$motif['label']];
        }
        if (is_file(__DIR__.'/'.$stored)) return ['src'=>$stored,'small'=>'','fit'=>$fit,'x'=>$x,'y'=>$y,'source'=>'custom','motif'=>'','label'=>'Eigenes Vorschaubild'];
    }
    $id=dtp_preview_match($module);
    if ($id==='') return ['src'=>'','small'=>'','fit'=>$fit,'x'=>$x,'y'=>$y,'source'=>'none','motif'=>'','label'=>''];
    $motif=$catalog['motifs'][$id];
    // Automatic motifs are designed for the card and always fill it centred.
    return ['src'=>$motif['src'],'small'=>$motif['small'],'fit'=>'cover','x'=>50,'y'=>50,'source'=>'auto','motif'=>$id,'label'=>$motif['label']];
}

/** One public module card. Used by the landing page and by the exact admin preview. */
function dtp_module_card(array $module, string $base='../', bool $link=true): string {
    $topic=$module['topic']??dtp_topic($module);
    $preview=dtp_preview_resolve($module);
    $title=(string)($module['title']??'');
    $description=(string)($module['description']??'');
    $tag=$link?'a':'div';
    $attrs=$link?' href="'.e($base.rawurlencode((string)($module['slug']??'')).'/').'"':'';
    $html='<'.$tag.' class="module-card"'.$attrs.' data-topic="'.e($topic[0]).'" data-search="'.e(dtp_lower($title.' '.$description.' '.($module['slug']??'').' '.$topic[1])).'" aria-label="'.e($title).' – Lernmodul öffnen">';
    $html.='<div class="module-art'.($preview['src']!==''?' has-image':'').'">';
    if ($preview['src']!=='') {
        $srcset=$preview['small']!==''?' srcset="'.e($base.$preview['small']).' 640w, '.e($base.$preview['src']).' 1280w" sizes="(max-width: 610px) 92vw, (max-width: 1060px) 46vw, 380px"':'';
        $html.='<img loading="lazy" decoding="async" width="1280" height="720" src="'.e($base.$preview['src']).'"'.$srcset.' alt="" style="object-fit:'.$preview['fit'].';object-position:'.$preview['x'].'% '.$preview['y'].'%">';
    } else {
        $symbols=['subnet'=>'01/10','netzwerk'=>'⌘','sicherheit'=>'⌁','pruefung'=>'90:00','sonstiges'=>'</>'];
        $html.='<span class="module-art-symbol" aria-hidden="true">'.e($symbols[$topic[0]]??'</>').'</span>';
    }
    $html.='<span class="module-art-corner" aria-hidden="true"></span><span class="module-art-number">'.e($topic[2]).'</span></div>';
    $html.='<div class="module-body"><span class="module-category"><i></i>'.e($topic[1]).'</span>';
    $html.='<h2>'.e($title).'</h2>';
    $html.='<p>'.e($description!==''?$description:'Interaktives Lernprogramm mit Erklärungen und Übungen.').'</p>';
    $html.='<div class="module-footer"><span>IM BROWSER STARTEN</span><b aria-hidden="true">↗</b></div></div>';
    $html.='</'.$tag.'>';
    return $html;
}

/* ------------------------------------------------------------------ */
/* Landing page texts                                                  */
/* ------------------------------------------------------------------ */

/** Editable fields grouped for the admin editor: key => [label, type, max length, default, required]. */
function dtp_page_fields(): array {
    return [
        'Kopfbereich' => [
            'kicker_left'=>['Kennzeile links','text',60,'GERING DIGITAL',false],
            'kicker_right'=>['Kennzeile rechts','text',60,'DIE IT-LERNPLATTFORM',false],
            'title'=>['Titel','text',90,'Von Null Plan zu echtem',true],
            'title_highlight'=>['Titel – hervorgehobener Teil (Gold)','text',60,'IT-Verständnis',false],
            'subtitle'=>['Untertitel (Begriffe mit · trennen)','text',90,'Verstehen · Üben · Anwenden',false],
            'lead'=>['Beschreibung','textarea',600,'Netzwerke, Subnetting, IT-Sicherheit und mehr. Hier werden aus komplizierten Themen verständliche Erklärungen, praktische Übungen und echte Aha-Momente.',true],
            'cta_primary'=>['Hauptbutton','text',40,'Lernmodule entdecken',true],
            'cta_secondary'=>['Zweiter Button','text',40,"So funktioniert's",true],
            'meta_1'=>['Hinweis 1 unter den Buttons','text',40,'Direkt im Browser',false],
            'meta_2'=>['Hinweis 2 unter den Buttons','text',40,'Ohne Registrierung',false],
            'hero_alt'=>['Alternativtext der Hero-Grafik','text',160,'DAU TO PRO – vom ratlosen Anfänger zum IT-Profi',true],
        ],
        'Suchmaschinen' => [
            'page_title'=>['Seitentitel (Browser-Tab)','text',120,'DAU TO PRO – Von Null Plan zu echtem IT-Verständnis | Gering Digital',true],
            'meta_description'=>['Meta-Beschreibung','textarea',300,'DAU TO PRO – Von Null Plan zu echtem IT-Verständnis. Interaktive IT-Lernprogramme von Gering Digital.',true],
        ],
        'Wichtiger Hinweis' => [
            'disclaimer_label'=>['Kennzeile','text',80,'WICHTIGER HINWEIS · UNABHÄNGIGE LERNHILFE',false],
            'disclaimer_title'=>['Überschrift','text',120,'Keine offiziellen Lern- oder Prüfungsinhalte',true],
            'disclaimer_p1'=>['Absatz 1','textarea',900,'**DAU TO PRO ist keine offizielle Lernplattform.** Die Inhalte sind meine persönlichen Sammlungen, Notizen und Recherchen, die ich für mein eigenes Lernen zusammengestellt habe und mit anderen teilen möchte. Sie bilden keine offiziellen Lehrpläne, Unterrichtsmaterialien oder Prüfungsanforderungen vollständig oder verbindlich ab und ersetzen diese nicht.',true],
            'disclaimer_p2'=>['Absatz 2','textarea',900,'**Die Nutzung erfolgt auf eigene Gefahr und Verantwortung.** Trotz sorgfältiger Erstellung können Informationen fehlerhaft, unvollständig oder nicht mehr aktuell sein. Es besteht keine Gewähr für Richtigkeit, Vollständigkeit oder Aktualität.',false],
            'disclaimer_p3'=>['Absatz 3 (abgesetzt)','textarea',900,'Ich nutze selbst weitere Lernquellen. **Kontrolle ist besser als Vertrauen:** Bitte überprüfe wichtige Aussagen anhand deiner Unterrichtsunterlagen, offizieller Vorgaben und verlässlicher Fachquellen.',false],
        ],
        'Lernmodule' => [
            'modules_eyebrow'=>['Kennzeile','text',40,'01 / LERNEN',false],
            'modules_title'=>['Überschrift','text',60,'Deine',true],
            'modules_title_highlight'=>['Überschrift – Gold','text',60,'Trainingszone.',false],
            'modules_intro'=>['Einleitung','textarea',400,'Suche dir ein Thema aus und öffne den passenden Trainer. Alle veröffentlichten Lernprogramme werden hier automatisch angezeigt.',false],
            'empty_title'=>['Überschrift ohne Module','text',80,'Deine Trainingszone wächst.',true],
            'empty_text'=>['Text ohne Module','textarea',300,'Hier erscheinen alle Lernmodule, die über den Admin-Bereich in der Kategorie „DAU to Pro“ veröffentlicht werden.',false],
        ],
        'Prüfungsfinder' => [
            'finder_eyebrow'=>['Kennzeile','text',60,'DEIN PRÜFUNGSFINDER',false],
            'finder_title'=>['Überschrift','text',80,'Du willst dich auf eine',true],
            'finder_title_highlight'=>['Überschrift – Gold','text',60,'Prüfung vorbereiten?',false],
            'finder_intro'=>['Einleitung','textarea',400,'Prima! Gib die Themen ein, die drankommen. Ich zeige dir die passenden Lernmodule – ganz ohne Fachchinesisch-Bingo.',false],
            'finder_label'=>['Beschriftung des Suchfelds','text',60,'WELCHE THEMEN KOMMEN DRAN?',true],
            'finder_placeholder'=>['Platzhaltertext im Suchfeld','text',60,'z. B. OSI, IPv4, Datenschutz',false],
            'finder_button'=>['Suchbutton','text',30,'Module finden',true],
        ],
        'Dein Weg' => [
            'method_eyebrow'=>['Kennzeile','text',40,'02 / DEIN WEG',false],
            'method_title'=>['Überschrift','text',60,'Vom Fragezeichen',true],
            'method_title_highlight'=>['Überschrift – Gold','text',60,'zum Durchblick.',false],
            'method_intro'=>['Einleitung','textarea',400,'Erst verstehen, dann ausprobieren, schließlich zeigen, was du kannst. Die Lerntrainer können diese drei Bereiche enthalten.',false],
            'step1_title'=>['Schritt 1 – Titel','text',40,'Nachschlagwerk',true],
            'step1_text'=>['Schritt 1 – Text','textarea',300,'Verständliche Erklärungen, nachvollziehbare Beispiele und Fachbegriffe, die tatsächlich Sinn ergeben.',false],
            'step1_key'=>['Schritt 1 – Kennzeile','text',40,'WISSEN AUFBAUEN',false],
            'step2_title'=>['Schritt 2 – Titel','text',40,'Trainingsraum',true],
            'step2_text'=>['Schritt 2 – Text','textarea',300,'Aufgaben gezielt üben, Antworten kontrollieren und knifflige Themen so oft wiederholen, wie nötig.',false],
            'step2_key'=>['Schritt 2 – Kennzeile','text',40,'WISSEN FESTIGEN',false],
            'step3_title'=>['Schritt 3 – Titel','text',40,'Prüfungsmodus',true],
            'step3_text'=>['Schritt 3 – Text','textarea',300,'Unter Zeitdruck üben, Punkte sammeln und anhand einer Auswertung erkennen, wo noch Luft nach oben ist.',false],
            'step3_key'=>['Schritt 3 – Kennzeile','text',40,'WISSEN BEWEISEN',false],
        ],
        'Abschluss' => [
            'end_eyebrow'=>['Kennzeile','text',60,'BEREIT FÜR DEN NÄCHSTEN SCHRITT?',false],
            'end_title'=>['Überschrift Zeile 1','text',60,'Weniger Rätselraten.',true],
            'end_title_highlight'=>['Überschrift Zeile 2 (Gold)','text',60,'Mehr Durchblick.',false],
            'end_text'=>['Text','textarea',400,'Such dir ein Lernmodul aus. Der Weg zum IT-Verständnis beginnt nicht mit einer perfekten Antwort – sondern mit der nächsten Frage.',false],
            'end_cta'=>['Button','text',40,'Jetzt lernen',true],
        ],
    ];
}

function dtp_page_flat_fields(): array {
    $flat=[];
    foreach (dtp_page_fields() as $fields) $flat+=$fields;
    return $flat;
}

function dtp_page_defaults(): array {
    return array_map(static fn($f)=>$f[3],dtp_page_flat_fields());
}

/** Current landing page content: stored values override the defaults. */
function dtp_page_content(): array {
    // Unsaved preview from the admin editor (set only by admin/dau_page.php after login + CSRF).
    if (isset($GLOBALS['dtp_preview_content']) && is_array($GLOBALS['dtp_preview_content'])) return $GLOBALS['dtp_preview_content']+dtp_page_defaults();
    $content=dtp_page_defaults();
    $rows=db()->query("SELECT key,value FROM settings WHERE key LIKE 'dtp.%'")->fetchAll(PDO::FETCH_KEY_PAIR);
    foreach ($rows as $key=>$value) {
        $name=substr((string)$key,4);
        if (array_key_exists($name,$content)) $content[$name]=(string)$value;
    }
    return $content;
}

/** Normalise one text value: UTF-8, no control characters, unified line breaks. */
function dtp_clean_text(string $value, bool $multiline): string {
    if (!mb_check_encoding($value,'UTF-8')) throw new RuntimeException('Ungültige Zeichenkodierung.');
    $value=str_replace(["\r\n","\r"],"\n",$value);
    // Whitespace (tabs, line breaks in single-line fields) becomes a space; other control characters are dropped.
    $value=$multiline?preg_replace('/[^\S\n]+/u',' ',$value):preg_replace('/\s+/u',' ',$value);
    $value=preg_replace($multiline?'/[^\P{C}\n]/u':'/\p{C}/u','',$value);
    $value=trim($multiline?preg_replace("/\n{3,}/","\n\n",$value):$value);
    return $value;
}

/** Validate submitted texts without storing them. Unknown keys are ignored. */
function dtp_page_validate(array $input): array {
    $fields=dtp_page_flat_fields();
    $values=[];
    foreach ($fields as $key=>[$label,$type,$max,$default,$required]) {
        $raw=$input[$key]??null;
        if (!is_string($raw)) throw new RuntimeException('Feld fehlt: '.$label);
        $value=dtp_clean_text($raw,$type==='textarea');
        if ($required && $value==='') throw new RuntimeException('Bitte ausfüllen: '.$label);
        if (mb_strlen($value,'UTF-8')>$max) throw new RuntimeException($label.': maximal '.$max.' Zeichen.');
        $values[$key]=$value;
    }
    return $values;
}

/** Validate and store submitted texts. Returns the stored values. */
function dtp_page_save(array $input): array {
    $values=dtp_page_validate($input);
    $db=db();
    $db->beginTransaction();
    try {
        $stmt=$db->prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
        foreach ($values as $key=>$value) $stmt->execute(['dtp.'.$key,$value]);
        $db->commit();
    } catch (Throwable $error) {
        $db->rollBack();
        throw $error;
    }
    return $values;
}

/** Restore all texts to their defaults (the hero image is handled separately). */
function dtp_page_reset_texts(): void {
    $keys=array_map(static fn($k)=>'dtp.'.$k,array_keys(dtp_page_flat_fields()));
    $stmt=db()->prepare('DELETE FROM settings WHERE key=?');
    foreach ($keys as $key) $stmt->execute([$key]);
}

/** Escape a text and allow **bold** as the only formatting. */
function dtp_inline(string $text): string {
    $html=e($text);
    $html=preg_replace('/\*\*(.+?)\*\*/su','<strong>$1</strong>',$html);
    return nl2br($html,false);
}

/** Subtitle words separated by "·", "|" or ",". */
function dtp_subtitle_parts(string $subtitle): array {
    return array_values(array_filter(array_map('trim',preg_split('/[·|,]/u',$subtitle)),static fn($p)=>$p!==''));
}

/* ------------------------------------------------------------------ */
/* Hero image                                                          */
/* ------------------------------------------------------------------ */

const DTP_HERO_DEFAULT='assets/dau-to-pro-hero-freigestellt.png';

/** Transparent margins of the default artwork (fractions of width/height), measured once with alpha > 10. */
function dtp_hero_default_trim(): array {return ['top'=>72/1086,'right'=>(1447-1429)/1448,'bottom'=>(1085-979)/1086,'left'=>38/1448];}

function dtp_setting_get(string $key): ?string {
    $stmt=db()->prepare('SELECT value FROM settings WHERE key=?');
    $stmt->execute([$key]);
    $value=$stmt->fetchColumn();
    return $value===false?null:(string)$value;
}
function dtp_setting_set(string $key,string $value): void {
    db()->prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')->execute([$key,$value]);
}

/** Current hero artwork with size and transparent margins. */
function dtp_hero(): array {
    $custom=dtp_setting_get('dtp_hero.image')??'';
    if ($custom!=='' && dtp_hero_is_upload($custom) && is_file(__DIR__.'/'.$custom)) {
        $meta=json_decode(dtp_setting_get('dtp_hero.meta')??'',true);
        if (is_array($meta) && ($meta['width']??0)>0 && ($meta['height']??0)>0) {
            return ['src'=>$custom,'width'=>(int)$meta['width'],'height'=>(int)$meta['height'],'trim'=>dtp_hero_trim_sanitize((array)($meta['trim']??[])),'custom'=>true];
        }
    }
    return ['src'=>DTP_HERO_DEFAULT,'width'=>1448,'height'=>1086,'trim'=>dtp_hero_default_trim(),'custom'=>false];
}

function dtp_hero_trim_sanitize(array $trim): array {
    $out=[];
    foreach (['top','right','bottom','left'] as $side) $out[$side]=max(0.0,min(0.4,(float)($trim[$side]??0)));
    return $out;
}

function dtp_hero_is_upload(string $path): bool {
    return (bool)preg_match('~^assets/uploads/dtp-hero-[a-f0-9]{32}\.(?:png|webp|jpg)$~D',$path);
}

/** Measure fully transparent borders so the artwork can overlap them without any cropping. */
function dtp_hero_measure_trim(string $file,int $type): array {
    $none=['top'=>0.0,'right'=>0.0,'bottom'=>0.0,'left'=>0.0];
    if (!function_exists('imagecreatefrompng')) return $none;
    $image=match($type){IMAGETYPE_PNG=>@imagecreatefrompng($file),IMAGETYPE_WEBP=>function_exists('imagecreatefromwebp')?@imagecreatefromwebp($file):false,default=>false};
    if (!$image) return $none;
    $w=imagesx($image);$h=imagesy($image);
    // Sample a grid of at most ~300 × 300 points; alpha 127 = fully transparent in GD.
    $step=max(1,(int)floor(max($w,$h)/300));
    $minX=$w;$minY=$h;$maxX=-1;$maxY=-1;
    for ($y=0;$y<$h;$y+=$step) {
        for ($x=0;$x<$w;$x+=$step) {
            $alpha=(imagecolorat($image,$x,$y)>>24)&0x7F;
            if ($alpha<122) {if($x<$minX)$minX=$x;if($x>$maxX)$maxX=$x;if($y<$minY)$minY=$y;if($y>$maxY)$maxY=$y;}
        }
    }
    imagedestroy($image);
    if ($maxX<0) return $none;
    // Keep one sampling step as safety margin so no visible pixel is ever overlapped.
    return dtp_hero_trim_sanitize([
        'top'=>max(0,$minY-$step)/$h,'bottom'=>max(0,$h-1-$maxY-$step)/$h,
        'left'=>max(0,$minX-$step)/$w,'right'=>max(0,$w-1-$maxX-$step)/$w,
    ]);
}

/** Validate and store a new hero artwork. Returns the stored data; the previous upload is removed by the caller. */
function dtp_hero_import(array $upload): array {
    if (($upload['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK || !is_uploaded_file($upload['tmp_name']??''))
        throw new RuntimeException('Hero-Grafik konnte nicht hochgeladen werden.');
    if (($upload['size']??0)<1 || $upload['size']>8*1024*1024) throw new RuntimeException('Hero-Grafik zu groß (maximal 8 MB).');
    $tmp=$upload['tmp_name'];
    $info=@getimagesize($tmp);
    $types=[IMAGETYPE_PNG=>['image/png','png'],IMAGETYPE_WEBP=>['image/webp','webp'],IMAGETYPE_JPEG=>['image/jpeg','jpg']];
    if (!$info || !isset($types[$info[2]]) || $info[0]<320 || $info[1]<200 || $info[0]>4096 || $info[1]>4096 || $info[0]*$info[1]>12000000)
        throw new RuntimeException('Bitte eine PNG-, WebP- oder JPG-Grafik verwenden (320 bis 4096 Pixel, max. 12 Megapixel).');
    [$mime,$extension]=$types[$info[2]];
    if ((new finfo(FILEINFO_MIME_TYPE))->file($tmp)!==$mime) throw new RuntimeException('Dateityp der Hero-Grafik stimmt nicht.');
    $trim=dtp_hero_measure_trim($tmp,$info[2]);
    $directory=__DIR__.'/assets/uploads';
    if (!is_dir($directory) && !mkdir($directory,0755,true)) throw new RuntimeException('Bildordner kann nicht erstellt werden.');
    $relative='assets/uploads/dtp-hero-'.bin2hex(random_bytes(16)).'.'.$extension;
    if (!move_uploaded_file($tmp,__DIR__.'/'.$relative)) throw new RuntimeException('Hero-Grafik konnte nicht gespeichert werden.');
    return ['src'=>$relative,'width'=>(int)$info[0],'height'=>(int)$info[1],'trim'=>$trim];
}

/** Activate an imported hero; removes the previous uploaded hero file. */
function dtp_hero_activate(array $hero): void {
    $previous=dtp_setting_get('dtp_hero.image')??'';
    dtp_setting_set('dtp_hero.image',$hero['src']);
    dtp_setting_set('dtp_hero.meta',json_encode(['width'=>$hero['width'],'height'=>$hero['height'],'trim'=>$hero['trim']]));
    if ($previous!=='' && $previous!==$hero['src']) dtp_hero_delete_file($previous);
}

/** Return to the original artwork shipped with the website. */
function dtp_hero_restore_default(): void {
    $previous=dtp_setting_get('dtp_hero.image')??'';
    db()->exec("DELETE FROM settings WHERE key IN ('dtp_hero.image','dtp_hero.meta')");
    if ($previous!=='') dtp_hero_delete_file($previous);
}

function dtp_hero_delete_file(string $path): void {
    if (dtp_hero_is_upload($path)) @unlink(__DIR__.'/'.$path);
}

/** Inline CSS variables that size the hero without cropping the artwork. */
function dtp_hero_style(array $hero): string {
    $t=$hero['trim'];$ratio=$hero['height']/$hero['width'];
    // Transparent margins overlap neighbouring content (only 85 % to keep the glow breathing room).
    $top=$t['top']*$ratio*0.85;$bottom=$t['bottom']*$ratio*0.85;
    $visible=max(0.2,$ratio-$top-$bottom);
    return sprintf('--hero-ratio:%.5F;--hero-trim-top:%.5F;--hero-trim-bottom:%.5F;--hero-visible:%.5F',$ratio,$top,$bottom,$visible);
}
