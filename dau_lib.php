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
    if (($p['slug']??'')==='a1-zahlensysteme') return ['sonstiges','IT-Grundlagen','05'];
    if (($p['slug']??'')==='netzwerke-sprint') return ['netzwerk','Netzwerktechnik','02'];
    $t=dtp_lower(($p['subject']??'').' '.($p['title']??'').' '.($p['description']??'').' '.($p['slug']??''));
    if(preg_match('/kalkulation|beschaffung|f2-kalkulation/',$t))return ['wirtschaft','Wirtschaft & Projekte','06'];
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
            // Modulfarbe (wie OSI violett, Netzwerke Kupfer, Subnetting Cyan, A1 Lime).
            'accent'=>preg_match('/^#[0-9a-f]{6}$/iD',(string)($motif['accent']??''))?strtolower((string)$motif['accent']):'#00dce8',
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
    // Old OSI/subnet screenshots are retired once. Later uploads remain freely editable.
    dtp_retire_legacy_previews();
    $retired=json_decode(dtp_setting_get('dtp_retired_previews_v1')??'[]',true);
    if (is_array($retired) && isset($retired[(string)($module['slug']??'')]) && $retired[(string)$module['slug']]===$stored) $stored='';
    $catalog=dtp_preview_catalog();
    if ($stored!=='') {
        $bundled=dtp_preview_bundled_id($stored);
        if ($bundled!==null) {
            $motif=$catalog['motifs'][$bundled];
            return ['src'=>$motif['src'],'small'=>$motif['small'],'fit'=>$fit,'x'=>$x,'y'=>$y,'source'=>'bundled','motif'=>$bundled,'label'=>$motif['label'],'accent'=>$motif['accent']];
        }
    }
    $id=dtp_preview_match($module);
    // Eigenes Bild: Farbe kommt vom thematisch passenden Motiv.
    $accent=$id!==''?$catalog['motifs'][$id]['accent']:'#00dce8';
    if ($stored!=='' && dtp_preview_bundled_id($stored)===null && is_file(__DIR__.'/'.$stored))
        return ['src'=>$stored,'small'=>'','fit'=>$fit,'x'=>$x,'y'=>$y,'source'=>'custom','motif'=>'','label'=>'Eigenes Vorschaubild','accent'=>$accent];
    if ($id==='') return ['src'=>'','small'=>'','fit'=>$fit,'x'=>$x,'y'=>$y,'source'=>'none','motif'=>'','label'=>'','accent'=>$accent];
    $motif=$catalog['motifs'][$id];
    // Automatic motifs are designed for the card and always fill it centred.
    return ['src'=>$motif['src'],'small'=>$motif['small'],'fit'=>'cover','x'=>50,'y'=>50,'source'=>'auto','motif'=>$id,'label'=>$motif['label'],'accent'=>$motif['accent']];
}

/** Retire the existing screenshots of the two replaced modules; never delete uploads. */
function dtp_retire_legacy_previews(): void {
    static $done=false;
    if ($done || !dtp_preview_catalog()['motifs']) return;
    $done=true;
    if (dtp_setting_get('dtp_retired_previews_v1')!==null) return;
    $db=db();
    $db->beginTransaction();
    try {
        $retired=[];
        $rows=$db->query("SELECT slug,title,subject,description,preview_image FROM html_pages WHERE category='lernen'")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $row) {
            if (!in_array(dtp_preview_match($row),['osi-modell','ipv4-subnetting'],true)) continue;
            $path=(string)$row['preview_image'];
            if ($path==='' || str_starts_with($path,DTP_PREVIEW_DIR.'/')) continue;
            $retired[$row['slug']]=$path;
            $db->prepare("UPDATE html_pages SET preview_image='' WHERE slug=? AND preview_image=?")->execute([$row['slug'],$path]);
        }
        dtp_setting_set('dtp_retired_previews_v1',json_encode((object)$retired));
        $db->commit();
    } catch (Throwable $error) {$db->rollBack();$done=false;throw $error;}
}

/** Give legacy placeholder descriptions a useful summary without rewriting stored content. */
function dtp_module_description(array $module): string {
    $slug=(string)($module['slug']??'');
    $slug=['osi'=>'osi-sprint','subnetsprint'=>'subnet-sprint'][$slug]??$slug;
    $humor=[
        'a1-zahlensysteme'=>'01001000? Keine Panik, das ist keine Drohung. Hier übersetzt du Binär, Hex und Datenraten, bis selbst dein Taschenrechner Respekt bekommt.',
        'osi-sprint'=>'Sieben Schichten, null Ausreden: Finde heraus, wer im Netzwerk was macht und warum der Router nicht für jeden Mist zuständig ist.',
        'subnet-sprint'=>'Netze teilen, Hosts zählen, Broadcast finden. Damit aus /27 endlich eine Adresse wird statt einer persönlichen Beleidigung.',
        'netzwerke-sprint'=>'Von LAN und WLAN über Topologien und Switches bis OSI und TCP/IP: Hier erfährst du, warum ein eingestecktes Kabel noch lange kein funktionierendes Netzwerk macht.',
        'd1-datenschutz'=>'Personenbezogene Daten sind kein Selbstbedienungsbuffet. Lerne, wer was speichern darf und wann die DSGVO die rote Karte zieht.',
        'd2-it-sicherheit'=>'Passwort123, offene Ports und Phishing: Erkenne Risiken, bestimme den Schutzbedarf und verhindere, dass dein Netzwerk zur Einladung wird.',
        'b4-ipv6'=>'128 Bit und gefühlt 800 Doppelpunkte. Lerne IPv6-Adressen, Präfixe, SLAAC und DHCPv6 kennen, ohne den Überblick zu verlieren.',
        'b5-netzwerkdienste'=>'DNS sucht Namen, DHCP verteilt Adressen und TCP will Quittungen. Hier lernst du, wer im Netz welchen Job macht – und wer wieder nicht antwortet.',
        'f2-kalkulation'=>'Rabatt, Skonto, Leasing oder Kauf? Rechne Angebote durch, bevor der Chef begeistert Geld verbrennt und du es erklären musst.',
    ];
    if(isset($humor[$slug])) return $humor[$slug];
    $description=trim((string)($module['description']??''));
    $description=preg_replace('/\\s*[–—-]\\s*mit Lernpfad, Nachschlagwerk, Trainingsraum und Prüfungsmodus\\.?$/iu','',$description);
    if($description!=='')return $description;
    return 'Hier gibt es IT-Wissen statt Buzzword-Bingo. Verstehen, ausprobieren und am Ende hoffentlich weniger fluchen.';
}

/** One public module card. Used by the landing page and by the exact admin preview. */
function dtp_module_card(array $module, string $base='../', bool $link=true, ?array $progress=null): string {
    $topic=$module['topic']??dtp_topic($module);
    $preview=dtp_preview_resolve($module);
    $title=(string)($module['title']??'');
    // Formelles Thema als Etikett über dem (gern witzigen) Titel, sonst die Themengruppe.
    $subject=trim((string)($module['subject']??''));
    $description=dtp_module_description($module);
    $tag=$progress!==null?'article':($link?'a':'div');
    $href=e($base.rawurlencode((string)($module['slug']??'')).'/');
    $label=e(($subject!==''?$subject.': ':'').$title).' – Lernmodul öffnen';
    $attrs=$tag==='a'?' href="'.$href.'" aria-label="'.$label.'"':'';
    $html='<'.$tag.' class="module-card"'.$attrs.' style="--mod:'.e($preview['accent']).'" data-topic="'.e($topic[0]).'" data-search="'.e(dtp_lower($subject.' '.$title.' '.$description.' '.($module['slug']??'').' '.$topic[1])).'">';
    $html.='<div class="module-art'.($preview['src']!==''?' has-image':'').'">';
    if ($preview['src']!=='') {
        $srcset=$preview['small']!==''?' srcset="'.e($base.$preview['small']).' 640w, '.e($base.$preview['src']).' 1280w" sizes="(max-width: 610px) 92vw, (max-width: 1060px) 46vw, 380px"':'';
        $html.='<img loading="lazy" decoding="async" width="1280" height="720" src="'.e($base.$preview['src']).'"'.$srcset.' alt="" style="object-fit:'.$preview['fit'].';object-position:'.$preview['x'].'% '.$preview['y'].'%">';
    } else {
        $symbols=['subnet'=>'01/10','netzwerk'=>'⌘','sicherheit'=>'⌁','pruefung'=>'90:00','sonstiges'=>'</>'];
        $html.='<span class="module-art-symbol" aria-hidden="true">'.e($symbols[$topic[0]]??'</>').'</span>';
    }
    $html.='<span class="module-art-number">'.e($topic[2]).'</span></div>';
    $html.='<div class="module-body"><span class="module-category"><i></i>'.e($subject!==''?$subject:$topic[1]).'</span>';
    $html.='<h2>'.e($title).'</h2>';
    $html.='<p>'.e($description).'</p>';
    if ($progress!==null) $html.=dtp_card_progress($progress);
    $footer='<span>Lernmodul öffnen</span><b aria-hidden="true">↗</b>';
    $html.=$tag==='article' && $link
        ? '<a class="module-footer module-open" href="'.$href.'" aria-label="'.$label.'">'.$footer.'</a>'
        : '<div class="module-footer">'.$footer.'</div>';
    $html.='</div>';
    $html.='</'.$tag.'>';
    return $html;
}

/** Compact account status with independent, native keyboard-operable details. */
function dtp_card_progress(array $progress): string {
    $mastered=$progress['mastered'];
    $count=count($mastered);
    $total=$progress['stages'];
    $earned=count($progress['earned']);
    $started=$count>0 || $progress['correct']>0 || $progress['exams'] || $earned>0;
    $status=$count===$total?'Lernpfad abgeschlossen':($started?'In Arbeit':'Noch offen');
    $html='<details class="module-progress"><summary><span class="module-progress-head">'
        .'<strong>'.e($status).'</strong><span>'.$count.' / '.$total.' Stufen</span></span>'
        .'<span class="module-progress-bar" aria-hidden="true"><i style="width:'.(int)round($count*100/$total).'%"></i></span>'
        .'<span class="module-progress-more">Details · Achievements '.$earned.' / '.$progress['achievements'].' <b aria-hidden="true">⌄</b></span></summary>';
    $html.='<div class="module-progress-details"><ol class="module-progress-stages" aria-label="Lernpfad-Stufen">';
    for ($i=0;$i<$total;$i++) {
        $done=in_array($i,$mastered,true);
        $label='Stufe '.($i+1).($done?' gemeistert':' offen');
        $html.='<li'.($done?' class="is-mastered"':'').' title="'.e($label).'"><span aria-hidden="true">'.($i+1)
            .($done?' ✓':'').'</span><span class="module-progress-sr">'.e($label).'</span></li>';
    }
    $html.='</ol><dl><dt>Richtige Aufgaben</dt><dd>'.number_format($progress['correct'],0,',','.').'</dd>'
        .'<dt>Beste Prüfungen</dt><dd>';
    $scores=[];
    foreach ($progress['exams'] as $minutes=>$score) $scores[]=(int)$minutes.' Min. · '.(int)$score.' %';
    $html.=($scores?implode(' / ',$scores):'Noch kein Ergebnis').'</dd></dl>';
    if ($progress['earned']) {
        $html.='<ul class="module-progress-badges" aria-label="Freigeschaltete Achievements">';
        foreach ($progress['earned'] as $badge) {
            $html.='<li>';
            if ($badge['icon']!==null) $html.='<img src="'.e($badge['icon']).'" width="20" height="20" loading="lazy" alt="">';
            $html.=e($badge['name']).'</li>';
        }
        $html.='</ul>';
    }
    return $html.'</div></details>';
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
            'meta_2'=>['Hinweis 2 unter den Buttons','text',40,'Mit persönlichem Lernkonto',false],
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
    foreach (['meta_1','meta_2'] as $key) {
        if (preg_match('/^(kein login|ohne login|ohne registrierung|keine registrierung|ohne anmeldung)[.!]?$/iu',trim($content[$key])))
            $content[$key]='Mit persönlichem Lernkonto';
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

/** Responsive, pixel-identical artwork. Copies share the same browser-cached source. */
function dtp_hero_picture(array $hero,string $alt,string $class='hero-logo'): string {
    $source='';
    if (empty($hero['custom']) && is_file(__DIR__.'/assets/dau-to-pro-hero-1448.webp') && is_file(__DIR__.'/assets/dau-to-pro-hero-768.webp'))
        $source='<source type="image/webp" srcset="../assets/dau-to-pro-hero-768.webp 768w, ../assets/dau-to-pro-hero-1448.webp 1448w" sizes="(min-width: 861px) 540px, (min-width: 611px) 480px, 360px">';
    return '<picture>'.$source.'<img class="'.e($class).'" src="../'.e($hero['src']).'" width="'.(int)$hero['width'].'" height="'.(int)$hero['height'].'" '.($class==='hero-logo'?'fetchpriority="high" ':'').'decoding="async" alt="'.e($alt).'" draggable="false"></picture>';
}

/** Cleanly generated character cutouts; the logo and mushroom keep their original source. */
function dtp_hero_people_picture(): string {
    return '<picture><source type="image/webp" srcset="../assets/dau-to-pro-people-clean-768.webp 768w, ../assets/dau-to-pro-people-clean-1448.webp 1448w" sizes="(min-width: 861px) 540px, (min-width: 611px) 480px, 360px"><img class="hero-part-image" src="../assets/dau-to-pro-people-clean-1448.webp" width="1448" height="1086" decoding="async" alt="" draggable="false"></picture>';
}

/** Schriftzug „DAU TO PRO“ in der Seitenschrift statt als Rastergrafik: gestochen scharf, ohne Kasten. */
function dtp_hero_brand(): string {
    return '<svg class="hero-brand" viewBox="0 0 1448 186" aria-hidden="true" focusable="false"><defs>'
        .'<linearGradient id="dtp-brand-cream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9d3c4"/></linearGradient>'
        .'<linearGradient id="dtp-brand-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#f2b53c"/><stop offset="1" stop-color="#d98a1c"/></linearGradient>'
        .'</defs><text x="724" y="160" text-anchor="middle" class="hero-brand-text">'
        .'<tspan fill="url(#dtp-brand-cream)">DAU</tspan><tspan class="hero-brand-to" fill="url(#dtp-brand-cream)" dx="22">TO</tspan><tspan fill="url(#dtp-brand-gold)" dx="22">PRO</tspan></text></svg>';
}

/** Power-up: Sprechblase, Pixelpilz und Funken als saubere Vektorgrafik (Pilz-Koordinaten wie im Original). */
function dtp_hero_powerup(): string {
    $step=static function(float $x,float $y,float $w,float $h,float $s): string {
        // Rechteck mit zweistufig abgetreppten Ecken (Pixel-Look).
        $a=$s;$b=2*$s;
        return "M".($x+$b)." $y H".($x+$w-$b)." v$a h$a v$a h$a V".($y+$h-$b)." h-$a v$a h-$a v$a H".($x+$b)." v-$a h-$a v-$a h-$a V".($y+$b)." h$a v-$a h$a Z";
    };
    $outer=$step(1162,348,272,124,10);
    $inner=$step(1172,358,252,104,8);
    $tail='M1236 466 h44 v10 h-10 v10 h-10 v10 h-10 v10 h-14 Z';
    $tailInner='M1244 462 h28 v8 h-8 v8 h-8 v8 h-8 v8 h-4 Z';
    $svg='<svg class="hero-powerup" viewBox="0 0 1448 1086" aria-hidden="true" focusable="false" shape-rendering="crispEdges">'
        .'<path d="'.$outer.' '.$tail.'" fill="#ffd23f"/>'
        .'<path d="'.$inner.' '.$tailInner.'" fill="#0d1114"/>'
        .'<text x="1298" y="432" text-anchor="middle" class="hero-powerup-text" shape-rendering="auto">LEVEL UP!</text>'
        .'<g fill="#ffd23f"><path d="M1352 478h12v34h-12z" transform="rotate(-24 1358 495)"/><path d="M1384 492h12v30h-12z" transform="rotate(18 1390 507)"/><path d="M1404 530h28v12h-28z" transform="rotate(-8 1418 536)"/></g>'
        .'</svg>';
    $pilz='../assets/dau-to-pro-pixelpilz.svg?v='.filemtime(__DIR__.'/assets/dau-to-pro-pixelpilz.svg');
    return $svg.'<img class="hero-pixelpilz" src="'.e($pilz).'" alt="" width="191" height="174" decoding="async" draggable="false">';
}

/**
 * Native scene planes: clean character cutouts, original branding/power-up and a code-native backdrop.
 * Percentage polygons share one coordinate system with the mushroom and work in admin previews with a base URL.
 * Custom admin artwork keeps its original, unsliced rendering.
 */
function dtp_hero_scene(array $hero,string $alt): string {
    if (!empty($hero['custom'])) return dtp_hero_picture($hero,$alt);
    $novice=[[38,350],[57,333],[43,310],[46,270],[75,247],[63,237],[85,216],[87,167],[113,146],[178,132],[218,139],[240,131],[246,99],[279,76],[356,65],[404,79],[423,89],[442,91],[478,95],[476,122],[503,137],[536,152],[560,181],[570,220],[554,247],[576,263],[585,290],[582,326],[570,338],[606,351],[622,380],[616,413],[598,433],[570,449],[580,466],[568,484],[566,515],[575,537],[578,564],[562,587],[545,627],[542,655],[538,707],[55,707],[50,666],[50,594],[57,554],[95,539],[124,539],[124,503],[138,467],[164,444],[130,443],[110,447],[74,441],[49,426],[31,405],[32,375]];
    $pro=[[862,183],[880,184],[898,166],[910,180],[916,193],[929,169],[939,184],[949,194],[959,188],[969,207],[980,217],[980,224],[997,230],[1012,237],[1030,239],[1033,261],[1046,281],[1037,294],[1053,312],[1049,340],[1032,358],[1016,371],[1044,383],[1060,403],[1099,414],[1134,439],[1159,475],[1185,497],[1206,533],[1222,559],[1229,601],[1227,637],[1205,663],[1180,675],[1187,707],[855,707],[854,677],[842,655],[827,628],[811,601],[802,565],[789,528],[785,485],[789,451],[800,420],[811,399],[810,382],[817,365],[831,358],[813,336],[800,313],[793,292],[786,280],[796,262],[795,245],[807,235],[810,215],[829,222],[834,203],[849,205]];
    $powerup=[[1151,395],[1448,331],[1448,707],[1205,707],[1205,537],[1176,522],[1151,505]];
    $brand=[[0,719],[1448,719],[1448,904],[0,904]];
    $cleanPeople=is_file(__DIR__.'/assets/dau-to-pro-people-clean-1448.webp') && is_file(__DIR__.'/assets/dau-to-pro-people-clean-768.webp');
    if($cleanPeople){
        // The new asset has isolated silhouettes with transparent gaps, so broad rectangles are sufficient.
        $novice=[[0,0],[630,0],[630,715],[0,715]];
        $pro=[[780,120],[1240,120],[1240,715],[780,715]];
    }
    $polygon=static function(array $points): string {
        return 'polygon('.implode(',',array_map(static fn($p)=>sprintf('%.6F%% %.6F%%',$p[0]/1448*100,$p[1]/1086*100),$points)).')';
    };
    $shapes=['dau'=>$polygon($novice),'pro'=>$polygon($pro),'powerup'=>$polygon($powerup),'brand'=>$polygon($brand)];
    $html='<div class="hero-canvas'.($cleanPeople?' hero-canvas--clean-people':'').'"><div class="hero-reference">'.dtp_hero_picture($hero,$alt).'</div>';
    foreach(['ambient'=>-.4,'dau'=>.32,'pro'=>.62,'brand'=>.18,'powerup'=>.8] as $name=>$depth){
        $html.='<div class="hero-plane hero-plane--'.$name.'">';
        if($name==='ambient') {
            // Decorative native paths continue the circuit language of the page, without raster cut edges.
            $html.='<svg class="hero-circuit" viewBox="0 0 1448 1086" aria-hidden="true" focusable="false"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path class="scene-wire-cyan" d="M-120 460H230L450 230H680L760 150H1050L1220 320H1560 M-100 570H320L460 430H655L730 350 M540 270H690L780 180H940 M920 400H1110L1260 550H1550"/><path class="scene-wire-gold" d="M-100 750H255L510 495H660L810 345H1080L1280 145H1560 M930 660H1110L1215 765H1530"/></g><g class="scene-dots"><circle cx="680" cy="230" r="10"/><circle cx="655" cy="430" r="8"/><circle cx="1110" cy="660" r="8"/></g></svg>';
        } elseif($name==='brand') {
            $html.=dtp_hero_brand();
        } elseif($name==='powerup' && is_file(__DIR__.'/assets/dau-to-pro-pixelpilz.svg')) {
            $html.=dtp_hero_powerup();
        } else {
            $picture=$cleanPeople && in_array($name,['dau','pro'],true)?dtp_hero_people_picture():dtp_hero_picture($hero,'','hero-part-image');
            $html.='<div class="hero-slice" aria-hidden="true" style="clip-path:'.$shapes[$name].'">'.$picture.'</div>';
        }
        if($name==='powerup')$html.='<div class="hero-mushroom-anchor" data-mushroom-anchor></div>';
        $html.='</div>';
    }
    // Separate, fully opaque layer between the figures: visibly a learning progression.
    $html.='<svg class="hero-learning-growth" viewBox="0 0 1448 1086" role="img" aria-label="Dein Lernfortschritt: vom DAU zum PRO">'
        .'<title>Dein Lernfortschritt – vom DAU zum PRO</title>'
        .'<g stroke-linejoin="round" stroke-linecap="round"><path class="growth-outline" d="M570 590L785 365M785 365L780 475M785 365L675 380"/>'
        .'<path class="growth-arrow" d="M570 590L785 365M785 365L780 475M785 365L675 380"/>'
        .'<g class="growth-bars"><path d="M574 695V650H614V695Z M637 695V600H677V695Z M700 695V550H740V695Z M763 695V500H803V695Z"/></g></g>'
        .'</svg>';
    return $html.'</div>';
}

/**
 * Top navigation of the DAU TO PRO pages.
 * $page: 'start' (landing page) or 'konto' (learner account page). $learner: logged-in username or null.
 */
function dtp_nav(string $page,?string $learner): string {
    $start=$page==='start';
    $section=$start?'':'./';
    $current=fn(bool $on): string => $on?' aria-current="page"':'';
    $links=[
        [$section.'#lernmodule','Lernmodule',false],
        [$section.'#konzept','Lernkonzept',false],
    ];
    $desktop='';$mobile='';
    foreach($links as [$href,$text,$on]){
        $desktop.='      <a'.($on?' class="selected"':'').' href="'.e($href).'"'.$current($on).'>'.e($text).'</a>'."\n";
        $mobile.='<a href="'.e($href).'"'.$current($on).'>'.e($text).'</a>';
    }
    if ($learner===null) {
        $on=$page==='konto';
        $desktop.='      <a class="nav-account'.($on?' selected':'').'" href="konto.php"'.$current($on).'>Anmelden</a>'."\n";
        $mobile.='<a href="konto.php"'.$current($on).'>Anmelden</a>';
    } else {
        // Angemeldet: „Mein Konto“ klappt ein kleines Menü auf (Fortschritt, Einstellungen, Abmelden).
        $logout='<form method="post" action="konto.php" class="nav-logout"><input type="hidden" name="csrf" value="'.e(csrf()).'"><input type="hidden" name="action" value="logout"><button type="submit">Abmelden</button></form>';
        $desktop.='      <div class="nav-account-menu">
        <button type="button" class="nav-account'.(in_array($page,['konto','highscore'],true)?' selected':'').'" aria-expanded="false" aria-controls="dtp-account-panel">Mein Konto <span aria-hidden="true">▾</span></button>
        <div class="nav-account-panel" id="dtp-account-panel" hidden>
          <p>Angemeldet als <strong>'.e($learner).'</strong></p>
          <a href="konto.php">Mein Fortschritt</a>
          <a href="konto.php#achievements">Achievements</a>
          <a href="highscore.php"'.($page==='highscore'?' aria-current="page"':'').'>Highscore</a>
          <a href="konto.php#einstellungen">Konto-Einstellungen</a>
          '.$logout.'
        </div>
      </div>'."\n";
        $mobile.='<span class="mobile-account-label">Mein Konto · '.e($learner).'</span><a href="konto.php">Mein Fortschritt</a><a href="konto.php#achievements">Achievements</a><a href="highscore.php">Highscore</a><a href="konto.php#einstellungen">Konto-Einstellungen</a>'.$logout;
    }
    return '<header class="dtp-nav" id="oben">
  <div class="nav-inner">
    <a class="gd-brand" href="../index.php" aria-label="Gering Digital – Startseite">
      <img src="../assets/gering-digital-logo-icon-312.webp" alt="" width="36" height="36">
      <span><strong>GERING <em>DIGITAL</em></strong></span>
    </a>
    <nav class="desktop-links" aria-label="Hauptnavigation">
'.$desktop.'    </nav>
    <a class="nav-cta" href="'.e($section.'#lernmodule').'">Jetzt lernen <span aria-hidden="true">↗</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="dtp-mobile-menu" aria-label="Menü öffnen"><span></span><span></span><span></span></button>
  </div>
  <nav class="mobile-links" id="dtp-mobile-menu" aria-label="Mobile Navigation" hidden>
    '.$mobile.'<a href="../index.php">Gering Digital ↗</a>
  </nav>
</header>';
}

/** Das DAU-TO-PRO-Logo wird auf allen Unterseiten in der Fußzeile einheitlich ausgegeben. */
function dtp_footer_brand(): string {
    return '<a class="footer-brand" href="./" aria-label="DAU TO PRO – Startseite"><img src="../assets/gering-digital-logo-icon-312.webp" alt="" width="30" height="30"><span><strong>DAU TO <em>PRO</em></strong><small>Ein Projekt von Gering Digital</small></span></a>';
}

/** Shared page background of the DAU TO PRO pages (texture, full-height orange rays drawn by site.js, circuit traces). */
function dtp_backdrop(): string {
    // Hintergrund: eines von Willis Platinen-Motiven, pro Seitenaufruf zufällig (wie in den Lernmodulen).
    $bg='../assets/dau-to-pro-bg-platine-'.random_int(1,2).'.webp';
    return '<div class="dtp-world-texture" aria-hidden="true" style="--dtp-bg:url(&quot;'.htmlspecialchars($bg,ENT_QUOTES).'&quot;)"></div>'."\n".<<<'HTML'
<div class="dtp-eternal-rays" aria-hidden="true">
  <svg id="dtp-full-page-rays" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 4800" preserveAspectRatio="none" focusable="false">
    <defs>
      <linearGradient id="dtp-line-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0" stop-color="#d88120" stop-opacity=".55"/>
        <stop offset=".36" stop-color="#ffc15e" stop-opacity=".92"/>
        <stop offset=".57" stop-color="#fff2c3" stop-opacity="1"/>
        <stop offset=".75" stop-color="#ffc366" stop-opacity=".9"/>
        <stop offset="1" stop-color="#ff9c29" stop-opacity=".35"/>
      </linearGradient>
    </defs>
    <g id="dtp-ray-strokes"></g>
  </svg>
</div>
<div class="dtp-world-traces" aria-hidden="true">
<svg viewBox="0 0 1440 3600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden="true">
<defs><linearGradient id="dtp-cyan" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#00dce8" stop-opacity=".48"/><stop offset="1" stop-color="#00dce8" stop-opacity=".08"/></linearGradient><linearGradient id="dtp-gold" x1="0" x2="1"><stop stop-color="#ffc55a" stop-opacity=".25"/><stop offset="1" stop-color="#ffc55a" stop-opacity=".08"/></linearGradient></defs>
<g fill="none" stroke-linejoin="round" stroke-linecap="square">
<path d="M-80 500 H110 l60 -60 H310 l30 -30 H490" stroke="url(#dtp-cyan)" stroke-width="2"/>
<path d="M1450 650 H1230 l-85 85 H1020 l-48 48 H810" stroke="url(#dtp-gold)" stroke-width="2"/>
<path d="M-100 1150 H190 l60 60 H320 l60 -60 H455" stroke="url(#dtp-gold)" stroke-width="2"/>
<path d="M1480 1485 H1190 l-85 -90 H1020 l-55 60 H820" stroke="url(#dtp-cyan)" stroke-width="2"/>
<path d="M-100 2050 H110 l60 -60 H275 l55 45 H470" stroke="url(#dtp-cyan)" stroke-width="2"/>
<path d="M1520 2370 H1240 l-65 60 H1015 l-70 -55 H810" stroke="url(#dtp-gold)" stroke-width="2"/>
<path d="M-100 3000 H155 l60 -65 H350 l62 52 H575" stroke="url(#dtp-gold)" stroke-width="2"/>
<path d="M1490 3420 H1260 l-75 75 H1110 l-55 -40 H910" stroke="url(#dtp-cyan)" stroke-width="2"/>
<path d="M225 -60 l-240 370" stroke="url(#dtp-gold)" stroke-width="3"/>
<path d="M1490 210 L1170 650" stroke="url(#dtp-cyan)" stroke-width="1" opacity=".4"/>
<path d="M-50 2450 L210 2020" stroke="url(#dtp-cyan)" stroke-width="1" opacity=".4"/>
</g><g fill="#00dce8" opacity=".65"><circle cx="310" cy="440" r="5"/><circle cx="1020" cy="735" r="4"/><circle cx="820" cy="1455" r="4"/><circle cx="170" cy="1990" r="4"/><circle cx="910" cy="3455" r="4"/></g>
<g fill="#eab448" opacity=".6"><circle cx="455" cy="1150" r="4"/><circle cx="1175" cy="2430" r="5"/><circle cx="412" cy="2987" r="4"/></g>
</svg></div>
HTML;
}

/**
 * Data attributes for the hero effects (hero-fx.js). Only for the original hero artwork, because the
 * effect layer is aligned to a detail of exactly that image. The video is optional: without the file
 * the effect still works but no player is shown.
 */
function dtp_hero_fx_attrs(array $hero,bool $learner=false): string {
    if (!empty($hero['custom']) || !is_file(__DIR__.'/assets/dau-to-pro-pixelpilz.svg')) return '';
    $video=__DIR__.'/assets/dau-to-pro-easteregg.mp4';
    $attrs=' data-fx="../assets/dau-to-pro-pixelpilz.svg?v='.filemtime(__DIR__.'/assets/dau-to-pro-pixelpilz.svg').'"';
    $attrs.=' data-fx-video="'.(is_file($video)?'../assets/dau-to-pro-easteregg.mp4?v='.filemtime($video):'').'"';
    // Mit Lernkonto meldet das Video das Achievement „Fremdscham erfolgreich freigeschaltet“ (200 XP).
    if ($learner) $attrs.=' data-fx-egg="api/easteregg.php" data-fx-csrf="'.e(csrf()).'"';
    return $attrs;
}



