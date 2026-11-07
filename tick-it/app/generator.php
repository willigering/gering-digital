<?php
declare(strict_types=1);
/** Geschützter, MySQL-transaktionaler Übungsticket-Generator. */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/generator-helpers.php';

function generator_schema(): void {
    static $ready = false;
    if ($ready) return;
    // Bei bereits installierter Migration keine erneuten CREATE-TABLE-Anweisungen.
    try {
        if (one('SELECT id FROM generator_control WHERE id=1')) { $ready=true; return; }
    } catch (PDOException $e) {
        if (($e->errorInfo[1]??null)!==1146 && $e->getCode()!=='42S02') throw $e;
    }
    // DDL nur auf ausdrücklichen Administratoraufruf; kein DDL bei jedem Poll.
    $body = file_get_contents(PROJECT_ROOT . '/database/generator-migration.sql');
    if (!$body) throw new RuntimeException('Datenbankmigration für Übungsfälle fehlt.');
    $body = preg_replace('/^\s*--[^\r\n]*(?:\r?\n|$)/m', '', $body);
    foreach (explode(';', $body) as $statement) {
        if (trim($statement) !== '') db()->exec(trim($statement));
    }
    $ready = true;
}
function generator_control(bool $lock = false): array {
    $suffix = $lock ? ' FOR UPDATE' : '';
    $row = one('SELECT * FROM generator_control WHERE id=1' . $suffix);
    if (!$row) throw new RuntimeException('Ticketgenerator ist nicht initialisiert.');
    return $row;
}
function generator_status(): array {
    must_admin();
    generator_schema();
    $control = generator_control();
    $catalog = generator_catalog();
    $toneCount = array_count_values(array_column($catalog['variants'], 'tone'));
    return ['run'=>$control,'templates'=>count($catalog['variants']), 'topics'=>$catalog['cases'],
        'tone_counts'=>$toneCount, 'used_templates'=>(int)(one('SELECT COUNT(*) AS n FROM generator_usage')['n'] ?? 0),
        'published_in_run'=>(int)(one('SELECT COUNT(*) AS n FROM generator_issued WHERE run_no=?',[(int)$control['run_no']])['n'] ?? 0),
        'scheduler'=>'Besucher-Polling; optional STRATO-Cronjob für minutengetreue Ausführung'];
}
/** Nur fuer angemeldete Dozenten: sichere Diagnose ohne Zugangsdaten. */
function generator_diagnostics(): array {
    must_admin();
    $required=['generator_control','generator_usage','generator_issued'];
    $tables=many("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('generator_control','generator_usage','generator_issued')");
    $found=array_map(static fn(array $row): string => strtolower((string)array_values($row)[0]),$tables);
    $missing=array_values(array_diff($required,$found));
    $missingCategories=[];
    $catalogReady=false;
    try {
        $catalog=generator_catalog();
        $categories=array_unique(array_column($catalog['variants'],'category'));
        $active=array_column(many('SELECT name FROM categories WHERE is_active=1'),'name');
        $missingCategories=array_values(array_diff($categories,$active));
        $catalogReady=count($catalog['variants'])===900;
    }catch(Throwable $e){error_log('[IT Support] generator_diagnostics categories: '.$e::class);}
    $controlReady=false;
    if(!in_array('generator_control',$missing,true)){
        try{$controlReady=one('SELECT id FROM generator_control WHERE id=1')!==null;}
        catch(Throwable $e){$controlReady=false;}
    }
    $message=$missing ? 'Generator-Tabellen fehlen: '.implode(', ',$missing).'. Die Datei database/generator-migration.sql muss in die bestehende Tick-It-Datenbank importiert werden (ohne Tabellen zu löschen).'
        : (!$controlReady ? 'Der Steuerdatensatz des Generators fehlt. Die idempotente Generator-Migration erneut ausführen.'
        : ($missingCategories ? 'Diese Kategorien fehlen oder sind deaktiviert: '.implode(', ',$missingCategories).'. Im Dozentenbereich unter Administration aktivieren.'
        : (!$catalogReady ? 'Der Vorlagenkatalog ist unvollständig.' : 'Die Voraussetzungen für den Generatorstart sind vorhanden.')));
    return ['ready'=>!$missing&&$controlReady&&!$missingCategories&&$catalogReady,
        'missing_tables'=>$missing,'control_ready'=>$controlReady,
        'missing_categories'=>$missingCategories,'catalog_ready'=>$catalogReady,'message'=>$message];
}

function generator_parameters(array $d): array {
    $initial = filter_var($d['initial_count'] ?? 100, FILTER_VALIDATE_INT);
    $batch = filter_var($d['batch_count'] ?? 5, FILTER_VALIDATE_INT);
    $interval = filter_var($d['interval_minutes'] ?? 5, FILTER_VALIDATE_INT);
    $limit = filter_var($d['max_total'] ?? 1000, FILTER_VALIDATE_INT);
    if ($initial === false || $initial < 0 || $initial > 100
        || $batch === false || $batch < 1 || $batch > 30
        || $interval === false || $interval < 1 || $interval > 60
        || $limit === false || $limit < 100 || $limit > 5000 || $limit < $initial) {
        app_error('Start 0–100, Menge 1–30 pro Intervall, Abstand 1–60 Minuten, Gesamtlimit 100–5000.');
    }
    return compact('initial','batch','interval','limit');
}
function generator_issue_locked(int $n, int $runNo, int $adminId): array {
    // Aufruf nur innerhalb einer Transaktion mit FOR UPDATE auf control.
    if (!db()->inTransaction()) throw new RuntimeException('Generator erfordert eine Transaktion.');
    $catalog = generator_catalog();
    $usedRows = many('SELECT variant_id,last_issued_ticket_id FROM generator_usage ORDER BY last_issued_ticket_id DESC');
    $used = [];
    foreach ($usedRows as $r) $used[$r['variant_id']] = (int)$r['last_issued_ticket_id'];
    // Verschiedene Namen unabhängig vom Text; die letzten 250 Absender werden bevorzugt ausgespart.
    $lastNames = many('SELECT g.display_name FROM generator_issued gi JOIN guests g ON g.id=gi.guest_id ORDER BY gi.id DESC LIMIT 250');
    $seenNames = array_fill_keys(array_column($lastNames,'display_name'),true);
    $categoryIds=[];
    foreach (many('SELECT id,name FROM categories WHERE is_active=1') as $c) $categoryIds[$c['name']]=(int)$c['id'];
    $results=[];$selected=[];$lastTopics=[];
    for ($i=0;$i<$n;$i++) {
        $v=generator_choice($catalog,$used,$selected,$lastTopics);
        if (!isset($categoryIds[$v['category']])) throw new RuntimeException('Kategorie fehlt oder ist deaktiviert: ' . $v['category']);
        $name='';
        for($j=0;$j<50;$j++) {
            $name = $catalog['first_names'][random_int(0,count($catalog['first_names'])-1)] . ' ' .
                $catalog['last_names'][random_int(0,count($catalog['last_names'])-1)];
            if (!isset($seenNames[$name])) break;
        }
        $seenNames[$name]=true;
        sql("INSERT INTO guests (display_name,role,last_seen_at) VALUES (?,'customer','2000-01-01 00:00:00')",[$name]);
        $guestId=(int)db()->lastInsertId();
        sql("INSERT INTO tickets (customer_id,created_by_admin_id,category_id,source,is_published,subject,description,sample_solution,priority,status)
           VALUES (?, ?, ?, 'training', 1, ?, ?, ?, ?, 'new')",
           [$guestId,$adminId,$categoryIds[$v['category']],$v['subject'],$v['description'],$v['sample_solution'],$v['priority']]);
        $ticketId=(int)db()->lastInsertId();
        sql('UPDATE tickets SET ticket_no=? WHERE id=?',[ticket_no($ticketId),$ticketId]);
        sql("INSERT INTO ticket_messages (ticket_id,sender_kind,sender_guest_id,message_type,body)
             VALUES (?, 'customer', ?, 'public', ?)",[$ticketId,$guestId,$v['description']]);
        sql("INSERT INTO ticket_history (ticket_id,actor_kind,action,new_value) VALUES (?,'system','generated',?)",
            [$ticketId,$v['id']]);
        sql('INSERT INTO generator_issued (ticket_id,guest_id,variant_id,run_no) VALUES (?,?,?,?)',
            [$ticketId,$guestId,$v['id'],$runNo]);
        sql('INSERT INTO generator_usage (variant_id,last_issued_ticket_id,last_used_at,use_count) VALUES (?,?,UTC_TIMESTAMP(),1)
          ON DUPLICATE KEY UPDATE last_issued_ticket_id=VALUES(last_issued_ticket_id),last_used_at=UTC_TIMESTAMP(),use_count=use_count+1',
          [$v['id'],$ticketId]);
        $selected[]=$v['id'];$used[$v['id']]=$ticketId;
        // LAST_USED aktualisieren, damit dieselbe Vorlage im aktuellen Batch gesperrt bleibt.
        unset($used[$v['id']]);$used=[$v['id']=>$ticketId]+$used;
        $lastTopics[]=$v['issue'];if(count($lastTopics)>7)array_shift($lastTopics);
        $results[]=$ticketId;
    }
    return $results;
}
function generator_start(array $d): array {
    $admin=must_admin();
    try{generator_schema();}catch(PDOException $e){
        $number=(int)($e->errorInfo[1]??0);
        if(in_array($number,[1044,1142,1143],true))app_error('STRATO verweigert die Erstellung der Generator-Tabellen. Importiere einmalig database/generator-migration.sql in die bestehende Tick-It-Datenbank. Es werden keine Tickets gelöscht.',409);
        throw $e;
    }
    $p=generator_parameters($d);
    $diagnostics=generator_diagnostics();
    if(!$diagnostics['ready'])app_error($diagnostics['message'],409);
    // Der Lauf wird zunächst ohne 100 einzelne INSERTs angelegt.
    // Die Sofort-Tickets folgen in kleinen, wiederaufnehmbaren Transaktionen.
    // So kann ein PHP-Timeout keinen bereits gestarteten Lauf doppelt auslösen.
    db()->beginTransaction();
    try {
        $control=generator_control(true);
        if ($control['status']==='running' || $control['status']==='paused') {
            app_error('Ein Lauf ist bereits aktiv. Zuerst stoppen.',409);
        }
        $runNo=(int)$control['run_no']+1;
        sql("UPDATE generator_control SET run_no=?,status='running',initial_count=?,batch_count=?,interval_minutes=?,max_total=?,generated=0,
            created_by_admin_id=?,started_at=UTC_TIMESTAMP(),last_emitted_at=NULL,
            next_due_at=IF(? > 0,UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE)),stopped_at=NULL WHERE id=1",
            [$runNo,$p['initial'],$p['batch'],$p['interval'],$p['limit'],$admin['id'],$p['initial'],$p['interval']]);
        audit($admin,'generator_start','generator',$runNo,json_encode($p));
        db()->commit();
        return ['run_no'=>$runNo,'created'=>0,'status'=>'running','initial_target'=>$p['initial']];
    } catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
/** Genau eine kleine, transaktionsgesicherte Sofort-Welle nachliefern. */
function generator_fill(): array {
    must_admin();
    $created=generator_tick();
    $state=generator_control();
    return ['created'=>$created,'generated'=>(int)$state['generated'],
        'initial_target'=>(int)$state['initial_count'],'status'=>$state['status']];
}
function generator_update(array $d): array {
    $admin=must_admin();generator_schema();$p=generator_parameters($d);
    db()->beginTransaction();
    try {
        $control=generator_control(true);
        if (!in_array($control['status'],['running','paused'],true)) app_error('Kein laufender oder pausierter Übungslauf.',409);
        if ($p['limit'] < (int)$control['generated']) app_error('Gesamtlimit darf nicht unter der bereits erzeugten Menge liegen.',400);
        sql('UPDATE generator_control SET batch_count=?,interval_minutes=?,max_total=?,next_due_at=IF(status="running",DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE),next_due_at) WHERE id=1',
            [$p['batch'],$p['interval'],$p['limit'],$p['interval']]);
        audit($admin,'generator_settings','generator',(int)$control['run_no'],json_encode($p));db()->commit();
        return ['saved'=>true];
    }catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
function generator_switch(string $command): array {
    $admin=must_admin();generator_schema();
    db()->beginTransaction();
    try {
        $control=generator_control(true);
        if ($command==='pause' && $control['status']==='running') {
            sql("UPDATE generator_control SET status='paused',next_due_at=NULL WHERE id=1");
        } elseif ($command==='resume' && $control['status']==='paused') {
            sql("UPDATE generator_control SET status='running',next_due_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL interval_minutes MINUTE) WHERE id=1");
        } elseif ($command==='stop' && in_array($control['status'],['running','paused'],true)) {
            sql("UPDATE generator_control SET status='stopped',next_due_at=NULL,stopped_at=UTC_TIMESTAMP() WHERE id=1");
        } else app_error('Diese Aktion ist im aktuellen Laufstatus nicht möglich.',409);
        audit($admin,'generator_'.$command,'generator',(int)$control['run_no']);db()->commit();
        return ['status'=>$command==='pause'?'paused':($command==='resume'?'running':'stopped')];
    }catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
function generator_tick(bool $schemaKnown=false): int {
    // Eine fällige Welle, immer mit SELECT FOR UPDATE gesperrt.
    // Bei einem Start mit 100 Tickets sind maximal 10 pro Request erlaubt;
    // andere Requests dürfen nach einer Unterbrechung nahtlos fortsetzen.
    try {
        $row=one("SELECT status,next_due_at FROM generator_control WHERE id=1 AND status='running' AND next_due_at<=UTC_TIMESTAMP()");
    }catch(PDOException $e){
        if ($e->getCode()==='42S02' || ($e->errorInfo[1]??null)===1146) return 0;
        throw $e;
    }
    if (!$row) return 0;
    db()->beginTransaction();
    try {
        $control=generator_control(true);
        if ($control['status']!=='running' || !$control['next_due_at'] || strtotime($control['next_due_at'].' UTC')>time()) {
            db()->commit();return 0;
        }
        $remaining=(int)$control['max_total']-(int)$control['generated'];
        $initialRemaining=max(0,(int)$control['initial_count']-(int)$control['generated']);
        // 100 Sofort-Tickets: 10 sichere Requests statt 100 Tickets in einem einzigen Request.
        $n=$initialRemaining>0 ? min(10,$initialRemaining,$remaining)
                               : min((int)$control['batch_count'],$remaining,30);
        $ids=$n>0?generator_issue_locked($n,(int)$control['run_no'],(int)$control['created_by_admin_id']):[];
        $newTotal=(int)$control['generated']+count($ids);
        $finished=$newTotal>=(int)$control['max_total'];
        $moreInitial=$newTotal<(int)$control['initial_count'];
        sql("UPDATE generator_control SET generated=?,last_emitted_at=UTC_TIMESTAMP(),status=?,
          next_due_at=IF(?=1,NULL,IF(?=1,UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE))) WHERE id=1",
          [$newTotal,$finished?'complete':'running',$finished?1:0,$moreInitial?1:0,(int)$control['interval_minutes']]);
        db()->commit();return count($ids);
    } catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
