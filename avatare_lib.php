<?php
// DAU TO PRO: Avatar-Ebenen und Auswahl pro Lernkonto.
declare(strict_types=1);
require_once __DIR__.'/achievements_lib.php';

const DTP_AVATAR_PREF='avatar_pack';
const DTP_AVATAR_DIR='assets/dau-avatare';

/**
 * Katalog: ID => Zubehörteile in Zeichenreihenfolge (hinten → vorne, über dem Basisporträt).
 * Alle Ebenen einer Figur teilen dieselbe 512 × 512-Leinwand.
 * Die Figuren haben bewusst keine Namen und keine Rangplätze.
 */
function dtp_avatar_catalog(): array {
    return [
        'avatar-01'=>['carbonkragen'=>'Carbonkragen','kapuze'=>'Kapuze mit Leuchtnaht','atemmaske'=>'Atemmaske'],
        'avatar-02'=>['dreitagebart'=>'Dreitagebart','techniker-cap'=>'Techniker-Cap','funk-headset'=>'Funk-Headset'],
        'avatar-03'=>['bomberjacke'=>'Bomberjacke','fliegerbrille'=>'Fliegerbrille','ohrclip'=>'Ohrclip'],
        'avatar-04'=>['schulterjacke'=>'Jacke mit Schulterpolster','stirnband'=>'Stirnband','rennvisier'=>'Rennvisier'],
        'avatar-05'=>['halsschal'=>'Halsschal','kapuze'=>'Geteilte Kapuze','maske'=>'Maske mit Lüftungsschlitzen'],
        'avatar-06'=>['jacke'=>'Gepolsterte Jacke','kopfhoerer'=>'Monitor-Kopfhörer','schlaefenklammer'=>'Schläfenklammer'],
        'avatar-07'=>['arbeitsjacke'=>'Arbeitsjacke mit Diagnoseclip','kinnbart'=>'Kinnbart','brille'=>'Brille mit Kupferfassung'],
    ] + dtp_avatar_arcade_catalog();
}

/** Die Arcade-Porträts teilen sich das Format, jedes Zubehör hat seine eigene Ebene pro Figur. */
function dtp_avatar_arcade_catalog(): array {
    static $catalog=[];
    if ($catalog) return $catalog;
    foreach ([
        ['Petrol-Hoodie','Funkclip'],
        ['Violette Einsatzjacke','Kommlink'],
        ['Kobaltblaue Utility-Jacke','Taktikclip'],
        ['Nachtblauer Bomber','Audio-Clip'],
        ['Kupferroter Hoodie','Impulsclip'],
        ['Bordeauxfarbene Techwear-Jacke','Signal-Ohrclip'],
        ['Pflaumenfarbener Hoodie','Echo-Clip'],
        ['Türkisfarbener Bomber','Frequenzclip'],
        ['Olivgrüne Utility-Jacke','Radarclip'],
        ['Indigoblaue Arcade-Jacke','Stereo-Clip'],
    ] as $index=>[$jacket,$earpiece]) {
        $catalog[sprintf('avatar-%02d',$index+8)]=['nachtjacke'=>$jacket,'ohrclip'=>$earpiece];
    }
    return $catalog;
}

function dtp_avatar_unlock_level(string $id,string $part): int {
    if (!isset(dtp_avatar_arcade_catalog()[$id])) return 1;
    return ['nachtjacke'=>3,'ohrclip'=>5][$part]??1;
}

function dtp_avatar_learner_level(int $learnerId): int {
    $query=db()->prepare('SELECT xp FROM learner_stats WHERE learner_id=?');
    $query->execute([$learnerId]);
    return ach_level((int)$query->fetchColumn());
}

/** „avatar-03“ → „Avatar 03“ (neutrale Beschriftung, kein Name). */
function dtp_avatar_label(string $id): string { return 'Avatar '.substr($id,-2); }

/**
 * Bereinigt eine Eingabe zu ['id'=>…, 'parts'=>[…]] oder null (kein Avatar → Pixelpilz).
 * Unbekannte IDs ergeben null, fremde oder unbekannte Teile fallen weg, die Reihenfolge folgt dem Katalog.
 */
function dtp_avatar_normalize(mixed $input): ?array {
    if (!is_array($input)) return null;
    $catalog=dtp_avatar_catalog();
    $id=$input['id']??null;
    if (!is_string($id) || !isset($catalog[$id])) return null;
    $wanted=is_array($input['parts']??null)?array_filter($input['parts'],'is_string'):[];
    $parts=array_values(array_filter(array_keys($catalog[$id]),fn($p)=>in_array($p,$wanted,true)));
    return ['id'=>$id,'parts'=>$parts];
}
/** Standard beim ersten Wählen einer Figur: vollständiger Referenz-Look. */
function dtp_avatar_full(string $id): ?array {
    $catalog=dtp_avatar_catalog();
    return isset($catalog[$id])?['id'=>$id,'parts'=>array_keys($catalog[$id])]:null;
}
/** Gespeicherte Wahl oder null. */
function dtp_avatar_get(int $learnerId): ?array {
    $q=db()->prepare('SELECT value FROM learner_prefs WHERE learner_id=? AND pref_key=?');
    $q->execute([$learnerId,DTP_AVATAR_PREF]);
    $raw=$q->fetchColumn();
    return $raw===false?null:dtp_avatar_normalize(json_decode((string)$raw,true));
}
/** Speichert die Wahl ($input=null entfernt sie wieder, dann erscheint der Pixelpilz). */
function dtp_avatar_save(int $learnerId,mixed $input): ?array {
    if ($input===null) {
        db()->prepare('DELETE FROM learner_prefs WHERE learner_id=? AND pref_key=?')->execute([$learnerId,DTP_AVATAR_PREF]);
        return null;
    }
    $cfg=dtp_avatar_normalize($input);
    if ($cfg===null) throw new LearnerError('Unbekannter Avatar.');
    if (isset(dtp_avatar_arcade_catalog()[$cfg['id']]) && $cfg['parts']) {
        $level=dtp_avatar_learner_level($learnerId);
        foreach ($cfg['parts'] as $part) {
            if (dtp_avatar_unlock_level($cfg['id'],$part)>$level) {
                throw new LearnerError('Dieses Zubehör ist noch gesperrt.');
            }
        }
    }
    $json=json_encode(['v'=>1]+$cfg,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    db()->prepare('INSERT INTO learner_prefs(learner_id,pref_key,value,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(learner_id,pref_key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP')
        ->execute([$learnerId,DTP_AVATAR_PREF,$json]);
    return $cfg;
}
/** Gespeicherte Avatare mehrerer Konten auf einmal (Highscore): learner_id => Konfiguration. */
function dtp_avatar_for_rows(array $rows): array {
    $ids=array_values(array_unique(array_map(fn($r)=>(int)$r['id'],$rows)));
    if (!$ids) return [];
    $marks=implode(',',array_fill(0,count($ids),'?'));
    $q=db()->prepare('SELECT learner_id,value FROM learner_prefs WHERE pref_key=? AND learner_id IN ('.$marks.')');
    $q->execute(array_merge([DTP_AVATAR_PREF],$ids));
    $out=[];
    foreach ($q->fetchAll(PDO::FETCH_KEY_PAIR) as $id=>$raw) {
        $cfg=dtp_avatar_normalize(json_decode((string)$raw,true));
        if ($cfg) $out[(int)$id]=$cfg;
    }
    return $out;
}
/** Ein Fehler beim Laden der Avatare darf den Highscore nie verhindern. */
function dtp_avatar_for_rows_safe(array $rows): array {
    try { return dtp_avatar_for_rows($rows); }
    catch (Throwable $error) { error_log('DAU TO PRO Avatare: '.$error->getMessage()); return []; }
}
/** Ebenen in Zeichenreihenfolge: Basisporträt, dann die gewählten Teile hinten → vorne. */
function dtp_avatar_layers(array $cfg): array {
    $layers=[['part'=>'basis','file'=>$cfg['id'].'-basis']];
    foreach ($cfg['parts'] as $part) $layers[]=['part'=>$part,'file'=>$cfg['id'].'-'.$part];
    return $layers;
}
/** URL einer Ebene relativ zu /dau-to-pro/. $size: 192 (Hex, Profil) oder 512 (große Vorschau). */
function dtp_avatar_url(string $file,int $size=192,string $prefix='../'): string {
    $path=DTP_AVATAR_DIR.'/'.$file.($size===512?'':'-192').'.webp';
    $v=@filemtime(__DIR__.'/'.$path);
    return $prefix.$path.($v?'?v='.$v:'');
}
/** Gestapelte Ebenen für eine Sechseck-Fassung. Ohne Avatar: leer (die Fassung zeigt dann den bisherigen Platzhalter). */
function dtp_avatar_stack_html(?array $cfg,int $size=192,string $prefix='../'): string {
    if ($cfg===null) return '';
    $html='<span class="dtp-avatar" data-avatar="'.e($cfg['id']).'">';
    foreach (dtp_avatar_layers($cfg) as $l) {
        $html.='<img class="dtp-avatar-layer" data-part="'.e($l['part']).'" src="'.e(dtp_avatar_url($l['file'],$size,$prefix)).'" alt="" width="'.$size.'" height="'.$size.'" loading="lazy" decoding="async">';
    }
    return $html.'</span>';
}
/** Ebenen-URLs für den öffentlichen Profil-Dialog oder null ohne Avatar. */
function dtp_avatar_public_layers(int $learnerId): ?array {
    try {
        $cfg=dtp_avatar_get($learnerId);
        return $cfg?array_map(fn($l)=>dtp_avatar_url($l['file']),dtp_avatar_layers($cfg)):null;
    } catch (Throwable $error) {
        error_log('DAU TO PRO Avatare: '.$error->getMessage());
        return null;
    }
}
