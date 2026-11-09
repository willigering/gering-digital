<?php
// NERD FM: Songkatalog, Freischaltung über Achievements und signierte, sitzungsgebundene Abruf-Links.
// Die Dateien liegen in dau-to-pro/audio/nerd-fm/ (per .htaccess gesperrt) und werden nur über
// dau-to-pro/api/song.php ausgeliefert: mit gültigem Link aus der eigenen Sitzung und – bei
// freischaltbaren Songs – nur an Lernkonten, die das passende Achievement besitzen.
declare(strict_types=1);
require_once __DIR__.'/achievements_lib.php';

const NFM_LINK_SECONDS=43200;   // Abruf-Link gilt 12 Stunden (eine offene Seite läuft so lange problemlos)
const NFM_RATE_LIMIT=120;       // höchstens so viele Songstarts je Sitzung und Stunde (Massenabruf bremsen)
const NFM_RATE_WINDOW=3600;

/**
 * Katalog: id => Datei, Titel, Achievement zum Freischalten (null = sofort verfügbar),
 * Modul-Slug für den Kartenvermerk (null = kein Vermerk), Hinweis auf der Karte.
 * Reihenfolge = Reihenfolge im Radio.
 */
function nfm_songs(): array {
    $songs=[
        'apipa'=>['file'=>'apipa.mp3','title'=>'Diggy Thal – APIPA','unlock'=>null,'module'=>null],
        'sieben-schichten'=>['file'=>'7-schichten.mp3','title'=>'Diggy Thal – 7 Schichten','unlock'=>'osi.lernpfad','module'=>'osi-sprint'],
        'klopf-klopf'=>['file'=>'klopf-klopf.mp3','title'=>'Diggy Thal – Klopf, Klopf','unlock'=>'b5.lernpfad','module'=>'b5-netzwerkdienste'],
        // Versteckter Song: Freischaltung über das Pilz-Easter-Egg, bewusst ohne Vermerk auf einer Karte.
        'dau-to-pro'=>['file'=>'dau-to-pro.mp3','title'=>'DAU to PRO','unlock'=>'g.easteregg','module'=>null],
    ];
    // Öffentlich ohne Konto oder Achievement. Der Eintrag erscheint erst mit der echten MP3,
    // damit für Besucher keine nicht abspielbaren Titel angezeigt werden.
    if (is_file(nfm_dir().'/deja-vu.mp3')) {
        $songs['deja-vu']=['file'=>'deja-vu.mp3','title'=>'Diggy Thal – Déjà-vu','unlock'=>null,'module'=>null];
    }
    return $songs;
}
function nfm_dir(): string { return __DIR__.'/dau-to-pro/audio/nerd-fm'; }

/** Codes der freigeschalteten Achievements (leer für Gäste). */
function nfm_unlocked_codes(?array $learner): array {
    if (!$learner) return [];
    try { return ach_unlocked((int)$learner['id']); }
    catch (Throwable $error) { error_log('NERD FM: '.$error->getMessage()); return []; }
}
function nfm_is_available(array $song,array $codes): bool { return $song['unlock']===null || isset($codes[$song['unlock']]); }

/** Signatur eines Abruf-Links: an Song, Lernkonto (0 = Gast), Sitzung und Ablaufzeit gebunden. */
function nfm_sign(string $id,int $learnerId,string $sessionId,int $expires): string {
    return substr(learner_hmac('nfm|'.$id.'|'.$learnerId.'|'.hash('sha256',$sessionId).'|'.$expires),0,40);
}
function nfm_link(string $id,int $learnerId,string $sessionId,?int $now=null): string {
    $expires=($now??time())+NFM_LINK_SECONDS;
    return 'api/song.php?'.http_build_query(['s'=>$id,'e'=>$expires,'k'=>nfm_sign($id,$learnerId,$sessionId,$expires)]);
}
function nfm_link_ok(string $id,int $learnerId,string $sessionId,string $expires,string $key,?int $now=null): bool {
    if (!preg_match('/^\d{9,11}$/D',$expires) || !preg_match('/^[a-f0-9]{40}$/D',$key)) return false;
    if ((int)$expires<($now??time())) return false;
    return hash_equals(nfm_sign($id,$learnerId,$sessionId,(int)$expires),$key);
}

/** Songstarts je Sitzung zählen (gleiche Tabelle wie die übrigen Limits, nur Hashes, keine IPs/Sitzungs-IDs). */
function nfm_rate_hit(string $sessionId,?int $now=null): bool {
    $now=$now??time();
    $bucket='nfm:'.substr(learner_hmac('nfm-rate|'.$sessionId),0,40);
    $db=db();
    $q=$db->prepare('SELECT COUNT(*) FROM learner_attempts WHERE bucket=? AND created_at>?');
    $q->execute([$bucket,$now-NFM_RATE_WINDOW]);
    if ((int)$q->fetchColumn()>=NFM_RATE_LIMIT) return false;
    $db->prepare('INSERT INTO learner_attempts(bucket,created_at) VALUES(?,?)')->execute([$bucket,$now]);
    $db->prepare('DELETE FROM learner_attempts WHERE created_at<?')->execute([$now-86400]);
    return true;
}

const NFM_PREF_KEY='nfm.off';   // Konto-Einstellung: Song-IDs, die in der eigenen Playlist abgewählt sind (JSON-Liste)

/** Abgewählte Songs eines Lernkontos (nur IDs, die es im Katalog gibt; Gäste: leer). */
function nfm_off_ids(?array $learner): array {
    if (!$learner) return [];
    try {
        $q=db()->prepare('SELECT value FROM learner_prefs WHERE learner_id=? AND pref_key=?');
        $q->execute([(int)$learner['id'],NFM_PREF_KEY]);
        $list=json_decode((string)$q->fetchColumn(),true);
    } catch (Throwable $error) { error_log('NERD FM: '.$error->getMessage()); return []; }
    return is_array($list)?array_values(array_intersect(array_keys(nfm_songs()),array_filter($list,'is_string'))):[];
}

/**
 * Speichert die abgewählten Songs. Erlaubt sind nur Songs, die dem Konto zur Verfügung stehen;
 * mindestens ein verfügbarer Song muss aktiv bleiben. Gibt die gespeicherte Liste zurück.
 */
function nfm_save_off(array $learner,array $ids): array {
    $available=[];
    $codes=nfm_unlocked_codes($learner);
    foreach (nfm_songs() as $id=>$song) if (nfm_is_available($song,$codes) && is_file(nfm_dir().'/'.$song['file'])) $available[]=$id;
    $off=array_values(array_intersect($available,array_filter($ids,'is_string')));
    if ($available && !array_diff($available,$off)) throw new LearnerError('Mindestens ein Titel muss aktiv bleiben.');
    db()->prepare('INSERT INTO learner_prefs(learner_id,pref_key,value,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(learner_id,pref_key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP')
        ->execute([(int)$learner['id'],NFM_PREF_KEY,json_encode($off)]);
    return $off;
}

/** Playlist für das Radio: nur verfügbare Songs, jeweils mit eigenem Abruf-Link und Stand „aktiv“ (aus dem Konto). */
function nfm_tracks(?array $learner): array {
    $codes=nfm_unlocked_codes($learner);
    $off=nfm_off_ids($learner);
    $lid=$learner?(int)$learner['id']:0;
    $tracks=[];
    foreach (nfm_songs() as $id=>$song) {
        if (!nfm_is_available($song,$codes) || !is_file(nfm_dir().'/'.$song['file'])) continue;
        $tracks[]=['id'=>$id,'src'=>nfm_link($id,$lid,session_id()),'title'=>$song['title'],'genre'=>'MP3','on'=>!in_array($id,$off,true)];
    }
    // Sind (z. B. nach einer Freischaltung auf anderem Weg) alle abgewählt, bleibt die Playlist nicht stumm.
    if ($tracks && !array_filter($tracks,fn($t)=>$t['on'])) $tracks[0]['on']=true;
    return $tracks;
}

/** Vermerk auf der Modulkarte: freischaltbarer bzw. bereits freigeschalteter Song (null = kein Vermerk). */
function nfm_card_note(string $slug,array $codes): ?string {
    foreach (nfm_songs() as $song) {
        if ($song['module']===null) continue;
        // Module laufen teils unter älteren Adressen (z. B. „osi“ statt „osi-sprint“): alle Adressen des Moduls zählen.
        $slugs=[$song['module']];
        foreach (ach_modules() as $m) if (in_array($song['module'],$m['slugs'],true)) $slugs=array_merge($slugs,$m['slugs']);
        if (!in_array($slug,$slugs,true)) continue;
        $name=preg_replace('/^.*–\s*/u','',$song['title']);
        $on=isset($codes[$song['unlock']]);
        return '<p class="module-song'.($on?' is-unlocked':'').'"><span aria-hidden="true">♪</span> '
            .($on?'Song „'.e($name).'“ freigeschaltet – läuft jetzt im NERD FM'
                 :'Song „'.e($name).'“ freischaltbar: Lernpfad komplett meistern').'</p>';
    }
    return null;
}
