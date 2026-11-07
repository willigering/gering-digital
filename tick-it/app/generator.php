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
    $admin=must_admin();generator_schema();$p=generator_parameters($d);
    db()->beginTransaction();
    try {
        $control=generator_control(true);
        if ($control['status']==='running') app_error('Ein Lauf ist bereits aktiv. Zuerst stoppen oder pausieren.',409);
        $runNo=(int)$control['run_no']+1;
        $ids=generator_issue_locked($p['initial'],$runNo,(int)$admin['id']);
        $finished=count($ids)>=$p['limit'];
        sql("UPDATE generator_control SET run_no=?,status=?,initial_count=?,batch_count=?,interval_minutes=?,max_total=?,generated=?,
            created_by_admin_id=?,started_at=UTC_TIMESTAMP(),last_emitted_at=IF(? > 0,UTC_TIMESTAMP(),NULL),
            next_due_at=IF(?=1,NULL,DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE)),stopped_at=NULL WHERE id=1",
            [$runNo,$finished?'complete':'running',$p['initial'],$p['batch'],$p['interval'],$p['limit'],count($ids),$admin['id'],count($ids),$finished?1:0,$p['interval']]);
        audit($admin,'generator_start','generator',$runNo,json_encode($p));
        db()->commit();
        return ['run_no'=>$runNo,'created'=>count($ids),'status'=>$finished?'complete':'running'];
    } catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
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
    // Wird vom Cron oder beim regulären Zugriff ausgeführt. Alle Webnutzer dürfen Fälligkeiten
    // anstoßen, jedoch keine Parameter ändern: diese sind ausschließlich im Adminbereich verfügbar.
    try {
        $row=one("SELECT status,next_due_at FROM generator_control WHERE id=1 AND status='running' AND next_due_at<=UTC_TIMESTAMP()");
    }catch(PDOException $e){
        if ($e->getCode()==='42S02' || ($e->errorInfo[1]??null)===1146) return 0; // Noch nicht initialisiert
        throw $e;
    }
    if (!$row) return 0;
    db()->beginTransaction();
    try {
        $control=generator_control(true);
        if($control['status']!=='running' || !$control['next_due_at'] || strtotime($control['next_due_at'].' UTC')>time()) {
            db()->commit();return 0;
        }
        $remaining=(int)$control['max_total']-(int)$control['generated'];
        $n=min((int)$control['batch_count'],$remaining,30);
        $ids=$n>0?generator_issue_locked($n,(int)$control['run_no'],(int)$control['created_by_admin_id']):[];
        $newTotal=(int)$control['generated']+count($ids);
        $finished=$newTotal>=(int)$control['max_total'];
        sql("UPDATE generator_control SET generated=?,last_emitted_at=UTC_TIMESTAMP(),status=?,
          next_due_at=IF(?=1,NULL,DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE)) WHERE id=1",
          [$newTotal,$finished?'complete':'running',$finished?1:0,(int)$control['interval_minutes']]);
        db()->commit();return count($ids);
    } catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
