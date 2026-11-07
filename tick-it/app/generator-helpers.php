<?php
declare(strict_types=1);
/** Testbare, DB-unabhängige Auswahl: Bibliothek, Wiederholungsbremse, Gewichtung. */
function generator_catalog(): array {
    static $catalog = null;
    if ($catalog === null) {
        $names = json_decode((string)file_get_contents(__DIR__ . '/generator-data/names.json'), true, 512, JSON_THROW_ON_ERROR);
        $variants=[];
        foreach (glob(__DIR__ . '/generator-data/variants-*.json') ?: [] as $file) {
            $part=json_decode((string)file_get_contents($file),true,512,JSON_THROW_ON_ERROR);
            array_push($variants,...$part);
        }
        if(count($variants)!==900) throw new RuntimeException('Vorlagenkatalog ist unvollständig.');
        $catalog = ['variants'=>$variants,'cases'=>60,'first_names'=>$names['first_names'],'last_names'=>$names['last_names']];
    }
    return $catalog;
}

function generator_choice(array $catalog, array $used, array $selected, array $lastTopics): array {
    // Mindestens 600 zuletzt verwendete Texte im gesamten System aussperren.
    // Wenn nach 900 Ausgaben alle Vorlagen verbraucht sind: älteste Vorlagen zuerst freigeben.
    $blocked = array_flip(array_slice(array_keys($used), 0, 600));
    $chosen = array_fill_keys($selected, true);
    $fresh = [];
    foreach ($catalog['variants'] as $case) {
        if (isset($chosen[$case['id']]) || isset($blocked[$case['id']])) continue;
        $fresh[] = $case;
    }
    if (!$fresh) { // Erst nach Nutzung des gesamten Katalogs möglich.
        foreach ($catalog['variants'] as $case) if (!isset($chosen[$case['id']])) $fresh[] = $case;
        usort($fresh, static function($a, $b) use ($used) {
            $ta = $used[$a['id']] ?? 0; $tb = $used[$b['id']] ?? 0;
            return $ta <=> $tb;
        });
        $fresh = array_slice($fresh, 0, min(200,count($fresh)));
    }
    // Mehr Alltagsfälle (Konto, Netzwerk, E-Mail) als Spezialfälle.
    $weights = ['Benutzerkonten'=>30,'Netzwerk'=>21,'E-Mail'=>16,'Software'=>14,
        'Drucker'=>13,'Hardware'=>11,'Berechtigungen'=>9,'Betriebssystem'=>8];
    $candidates = array_values(array_filter($fresh,fn($v)=>!in_array($v['issue'],$lastTopics,true)));
    if (!$candidates) $candidates=$fresh;
    if (!$candidates) throw new RuntimeException('Keine Vorlagen mehr verfügbar.');
    $total = 0;
    foreach ($candidates as $candidate) $total += $weights[$candidate['category']] ?? 10;
    $pick = random_int(1,$total);
    foreach ($candidates as $candidate) {
        $pick -= $weights[$candidate['category']] ?? 10;
        if ($pick <= 0) return $candidate;
    }
    return $candidates[array_key_last($candidates)];
}
