<?php
// DAU TO PRO: modulare Avatare. Konfiguration je Lernkonto in learner_prefs (pref_key „avatar“), Freischaltung über Level und Achievements.
// Liest XP, Level und Achievements nur; verändert sie nie.
declare(strict_types=1);
require_once __DIR__.'/achievements_lib.php';

const AVATAR_PREF='avatar';
const AVATAR_DIR='assets/avatars';

function avatar_manifest(): array {
    static $manifest=null;
    if ($manifest===null) {
        $manifest=json_decode((string)file_get_contents(__DIR__.'/'.AVATAR_DIR.'/manifest.json'),true,64,JSON_THROW_ON_ERROR);
    }
    return $manifest;
}
/** Item lookup: slot => id => item. */
function avatar_items(): array {
    static $items=null;
    if ($items===null) {
        $items=[];
        foreach (avatar_manifest()['slots'] as $slot=>$def) foreach ($def['items'] as $item) $items[$slot][$item['id']]=$item;
    }
    return $items;
}
/** Standard-Avatar (optional für einen bestimmten Typ mit dessen Frisur). */
function avatar_default(?string $base=null): array {
    $m=avatar_manifest();$cfg=$m['default'];
    if ($base!==null && isset(avatar_items()['base'][$base])) $cfg=array_merge($cfg,['base'=>$base],$m['baseDefaults'][$base]??[]);
    return $cfg;
}
/** Bereinigt eine beliebige Eingabe: unbekannte Schlüssel fallen weg, ungültige Werte werden zum Standard, Konflikte werden aufgelöst. */
function avatar_normalize(mixed $input): array {
    $items=avatar_items();
    $input=is_array($input)?$input:[];
    $base=is_string($input['base']??null) && isset($items['base'][$input['base']])?$input['base']:null;
    $cfg=avatar_default($base);
    foreach ($items as $slot=>$byId) {
        $v=$input[$slot]??null;
        if (is_string($v) && isset($byId[$v])) $cfg[$slot]=$v;
    }
    return avatar_resolve_conflicts($cfg);
}
function avatar_resolve_conflicts(array $cfg): array {
    $items=avatar_items();
    foreach ($cfg as $slot=>$id) {
        foreach ($items[$slot][$id]['conflicts']??[] as $otherSlot=>$forced) $cfg[$otherSlot]=$forced;
    }
    return $cfg;
}
/** Was das Konto erreicht hat (nur gelesen). */
function avatar_progress(int $learnerId): array {
    $stats=ach_stats($learnerId);
    return ['level'=>(int)$stats['level']['level'],'achievements'=>(int)$stats['achievements'],'codes'=>array_fill_keys(array_keys(ach_unlocked($learnerId)),true)];
}
function avatar_progress_guest(): array { return ['level'=>0,'achievements'=>0,'codes'=>[]]; }
function avatar_rule_met(?array $rule,array $progress): bool {
    if (!$rule) return true;
    if (isset($rule['any'])) {
        foreach ($rule['any'] as $sub) if (avatar_rule_met($sub,$progress)) return true;
        return false;
    }
    if (isset($rule['level'])) return $progress['level']>=(int)$rule['level'];
    if (isset($rule['achievements'])) return $progress['achievements']>=(int)$rule['achievements'];
    if (isset($rule['achievement'])) return isset($progress['codes'][$rule['achievement']]);
    return false;
}
/** Lesbare Freischalt-Regel, z. B. „Ab Level 10 oder Achievement „Nachteule““. Versteckte Achievements bleiben geheim. */
function avatar_rule_label(?array $rule): string {
    if (!$rule) return 'Frei';
    if (isset($rule['any'])) return implode(' oder ',array_map('avatar_rule_label',$rule['any']));
    if (isset($rule['level'])) return 'Ab Level '.(int)$rule['level'];
    if (isset($rule['achievements'])) return 'Ab '.(int)$rule['achievements'].' Achievements';
    if (isset($rule['achievement'])) {
        $a=ach_catalog()[$rule['achievement']]??null;
        if (!$a || !empty($a['hidden'])) return 'Geheimes Achievement';
        return 'Achievement „'.$a['name'].'“';
    }
    return 'Gesperrt';
}
/** Freischaltstatus aller Items: slot => id => ['ok'=>bool,'rule'=>string]. */
function avatar_unlock_map(array $progress): array {
    $out=[];
    foreach (avatar_items() as $slot=>$byId) foreach ($byId as $id=>$item) {
        $out[$slot][$id]=['ok'=>avatar_rule_met($item['unlock']??null,$progress),'rule'=>avatar_rule_label($item['unlock']??null)];
    }
    return $out;
}
/** Gesperrte Teile (z. B. nach „Alles auf null“) durch den Standard ersetzen. Die gespeicherte Wahl bleibt unangetastet. */
function avatar_apply_locks(array $cfg,array $progress): array {
    $items=avatar_items();$fallback=avatar_default($cfg['base']);
    foreach ($cfg as $slot=>$id) {
        if (!avatar_rule_met($items[$slot][$id]['unlock']??null,$progress)) {
            $cfg[$slot]=avatar_rule_met($items[$slot][$fallback[$slot]]['unlock']??null,$progress)?$fallback[$slot]:avatar_manifest()['default'][$slot];
        }
    }
    return avatar_resolve_conflicts($cfg);
}
/** Gespeicherte Konfiguration oder null, wenn das Konto noch keinen Avatar gebaut hat. */
function avatar_get(int $learnerId): ?array {
    $q=db()->prepare('SELECT value FROM learner_prefs WHERE learner_id=? AND pref_key=?');
    $q->execute([$learnerId,AVATAR_PREF]);
    $raw=$q->fetchColumn();
    if ($raw===false) return null;
    $data=json_decode((string)$raw,true);
    return is_array($data)?avatar_normalize($data['config']??$data):null;
}
/** Speichert den Avatar. Gesperrte Teile werden abgelehnt; andere Einstellungen des Kontos bleiben unberührt. */
function avatar_save(int $learnerId,mixed $input): array {
    if (!is_array($input)) throw new LearnerError('Ungültiger Avatar.');
    $items=avatar_items();
    foreach ($input as $slot=>$id) {
        if (!is_string($slot) || !isset($items[$slot]) || !is_string($id) || !isset($items[$slot][$id])) throw new LearnerError('Unbekanntes Avatar-Teil.');
    }
    $cfg=avatar_normalize($input);
    $progress=avatar_progress($learnerId);
    foreach ($cfg as $slot=>$id) {
        $rule=$items[$slot][$id]['unlock']??null;
        if (!avatar_rule_met($rule,$progress)) throw new LearnerError('„'.$items[$slot][$id]['label'].'“ ist noch gesperrt: '.avatar_rule_label($rule).'.');
    }
    $json=json_encode(['v'=>1,'config'=>$cfg],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    db()->prepare('INSERT INTO learner_prefs(learner_id,pref_key,value,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(learner_id,pref_key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP')
        ->execute([$learnerId,AVATAR_PREF,$json]);
    return $cfg;
}
/** Gespeicherte Avatare mehrerer Konten auf einmal (Highscore): id => Konfiguration mit angewendeten Sperren. */
function avatar_for_rows(array $rows): array {
    $ids=array_values(array_unique(array_map(fn($r)=>(int)$r['id'],$rows)));
    if (!$ids) return [];
    $marks=implode(',',array_fill(0,count($ids),'?'));
    $q=db()->prepare("SELECT learner_id,value FROM learner_prefs WHERE pref_key='".AVATAR_PREF."' AND learner_id IN ($marks)");
    $q->execute($ids);
    $stored=$q->fetchAll(PDO::FETCH_KEY_PAIR);
    if (!$stored) return [];
    $c=db()->prepare("SELECT learner_id,code FROM learner_achievements WHERE learner_id IN ($marks)");
    $c->execute($ids);
    $codes=[];
    foreach ($c->fetchAll(PDO::FETCH_ASSOC) as $a) $codes[(int)$a['learner_id']][$a['code']]=true;
    $out=[];
    foreach ($rows as $r) {
        $id=(int)$r['id'];
        if (!isset($stored[$id])) continue;
        $data=json_decode((string)$stored[$id],true);
        if (!is_array($data)) continue;
        $progress=['level'=>(int)($r['level']??ach_level((int)$r['xp'])),'achievements'=>(int)($r['achievements']??0),'codes'=>$codes[$id]??[]];
        $out[$id]=avatar_apply_locks(avatar_normalize($data['config']??$data),$progress);
    }
    return $out;
}
/** Bildebenen in Zeichenreihenfolge: [['slot'=>..,'file'=>'hair/bob-blond'], ...]. */
function avatar_layers(array $cfg): array {
    $m=avatar_manifest();$items=avatar_items();
    $hideHair=!empty($items['headwear'][$cfg['headwear']]['hidesHair']);
    $byLayer=[];
    foreach ($m['slots'] as $slot=>$def) {
        $item=$items[$slot][$cfg[$slot]]??null;
        if (!$item || empty($item['file'])) continue;
        if ($slot==='hair' && $hideHair) continue;
        $layer=$item['layer']??$def['layer'];
        $file=strtr($item['file'],['{base}'=>$cfg['base'],'{hairColor}'=>$cfg['hairColor']]);
        $byLayer[$layer][]=['slot'=>$slot,'file'=>$file];
    }
    $out=[];
    foreach ($m['layerOrder'] as $layer) foreach ($byLayer[$layer]??[] as $l) $out[]=$l;
    return $out;
}
/** URL einer Ebene relativ zur Seite in /dau-to-pro/. */
function avatar_url(string $file,string $format='thumb',string $prefix='../'): string {
    $pattern=avatar_manifest()['formats'][$format]??'{file}.webp';
    $path=AVATAR_DIR.'/'.str_replace('{file}',$file,$pattern);
    $v=@filemtime(__DIR__.'/'.$path);
    return $prefix.$path.($v?'?v='.$v:'');
}
/** Avatare für Highscore-Zeilen; ein Fehler darf den Highscore nie verhindern. */
function avatar_for_rows_safe(array $rows): array {
    try { return avatar_for_rows($rows); }
    catch (Throwable $error) { error_log('DAU TO PRO Avatar: '.$error->getMessage()); return []; }
}
/** Gestapelte Ebenen für die Hex-Fassung. Ohne Konfiguration: Pixelpilz-Maskottchen. */
function avatar_stack_html(?array $cfg,string $format='thumb',string $prefix='../'): string {
    if ($cfg===null) {
        return '<span class="dtp-avatar is-mascot"><img class="dtp-avatar-mascot" src="'.e($prefix.'assets/dau-to-pro-highscore-mascot.webp').'" alt="" loading="lazy" decoding="async"></span>';
    }
    $html='<span class="dtp-avatar" data-avatar-base="'.e($cfg['base']).'">';
    foreach (avatar_layers($cfg) as $l) {
        $html.='<img class="dtp-avatar-layer is-'.e($l['slot']).'" src="'.e(avatar_url($l['file'],$format,$prefix)).'" alt="" loading="lazy" decoding="async">';
    }
    return $html.'</span>';
}
/** Öffentliche Ebenen-URLs für den Profil-Dialog (oder null ohne eigenen Avatar). */
function avatar_public_layers(int $learnerId): ?array {
    try {
        $stats=ach_stats($learnerId);
        $cfg=avatar_for_rows([['id'=>$learnerId,'level'=>$stats['level']['level'],'achievements'=>$stats['achievements']]])[$learnerId]??null;
        if (!$cfg) return null;
        return array_map(fn($l)=>['slot'=>$l['slot'],'src'=>avatar_url($l['file'],'thumb','../')],avatar_layers($cfg));
    } catch (Throwable $error) {
        error_log('DAU TO PRO Avatar: '.$error->getMessage());
        return null;
    }
}
