<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
require_once __DIR__.'/generator.php';

function act_login_guest(array $d): array {
    $name = field_string($d,'name',80,2);
    $role = in_enum($d['role']??null,['customer','supporter']);
    throttle('guest_join', ($_SERVER['REMOTE_ADDR']??'local'), 120, 600);
    db()->beginTransaction();
    try {
        sql('INSERT INTO guests (display_name,role) VALUES (?,?)',[$name,$role]);
        $id=(int)db()->lastInsertId(); $token=random_token();
        $days=(int)cfg('app','guest_session_days',7);
        sql("INSERT INTO guest_sessions (token_hash,guest_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL $days DAY))",[hash('sha256',$token),$id]);
        db()->commit();
    } catch(Throwable $e) { db()->rollBack(); throw $e; }
    session_regenerate_id(true); $_SESSION = ['guest_token'=>$token,'csrf'=>random_token(),'last_active'=>time()];
    return ['role'=>$role,'name'=>$name,'csrf'=>csrf()];
}
function act_login_admin(array $d): array {
    $username=field_string($d,'username',100);
    $password=(string)($d['password']??'');
    if ($password==='' || strlen($password)>1024) app_error('Ungültige Anmeldedaten.',401);
    $ip=(string)($_SERVER['REMOTE_ADDR']??'local');
    throttle('admin_login_ip',$ip,10,900);
    throttle('admin_login_user',mb_strtolower($username),10,900);
    $admin=one('SELECT * FROM admins WHERE username=?',[$username]);
    if (!$admin || !password_verify($password,$admin['password_hash'])) {
        usleep(170000); app_error('Benutzername oder Passwort falsch.',401);
    }
    session_regenerate_id(true); $_SESSION=['admin_id'=>(int)$admin['id'],'last_active'=>time(),'csrf'=>random_token()];
    sql('UPDATE admins SET last_login_at=UTC_TIMESTAMP() WHERE id=?',[$admin['id']]);
    audit(['id'=>(int)$admin['id']],'admin_login');
    return ['role'=>'admin','name'=>$admin['username'],'csrf'=>csrf()];
}
function act_logout(): array {
    $a=auth();
    if ($a && $a['kind']==='guest' && isset($_SESSION['guest_token'])) {
        sql('UPDATE guest_sessions SET revoked_at=UTC_TIMESTAMP() WHERE token_hash=?',[hash('sha256',$_SESSION['guest_token'])]);
    }
    $_SESSION=[];
    if (ini_get('session.use_cookies')) {
        $p=session_get_cookie_params();
        setcookie(session_name(),'',time()-3600,$p['path'],$p['domain'],$p['secure'],$p['httponly']);
    }
    session_destroy(); return ['logout'=>true];
}
function act_session(): array {
    $a=auth();
    return ['actor'=>$a,'csrf'=>csrf(),'categories'=>many('SELECT id,name FROM categories WHERE is_active=1 ORDER BY sort_order,name')];
}
function act_stats(): array {
    $a=must_auth();
    if ($a['role']==='customer') {
        $row=one("SELECT COUNT(*) total,
          SUM(status NOT IN ('solved','closed')) active,
          SUM(status IN ('solved','closed')) finished,
          SUM(status IN ('waiting_customer')) waiting
          FROM tickets WHERE customer_id=? AND is_published=1",[$a['id']]);
        return ['cards'=>['total'=>(int)$row['total'],'active'=>(int)$row['active'],'waiting'=>(int)$row['waiting'],'finished'=>(int)$row['finished']]];
    }
    if ($a['role']==='supporter') {
        $pool=one("SELECT COUNT(*) n FROM tickets WHERE assigned_supporter_id IS NULL AND is_published=1 AND status IN ('new','open')");
        $own=one("SELECT SUM(status NOT IN ('solved','closed')) active, SUM(status='waiting_customer') waiting,
         SUM(status IN ('solved','closed')) finished,COUNT(*) total
         FROM tickets WHERE assigned_supporter_id=?",[$a['id']]);
        $rating=one('SELECT ROUND(AVG(stars),2) avg_rating,COUNT(*) votes FROM reviews WHERE supporter_id=?',[$a['id']]);
        $duration=one("SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE,claimed_at,COALESCE(resolved_at,closed_at)))/60,1) hours FROM tickets
          WHERE assigned_supporter_id=? AND claimed_at IS NOT NULL AND (resolved_at IS NOT NULL OR closed_at IS NOT NULL)",[$a['id']]);
        return ['cards'=>['pool'=>(int)$pool['n'],'active'=>(int)$own['active'],'waiting'=>(int)$own['waiting'],'finished'=>(int)$own['finished']],
          'personal'=>['taken'=>(int)$own['total'],'rating'=>$rating['avg_rating'],'votes'=>(int)$rating['votes'],'mean_hours'=>$duration['hours']]];
    }
    $row=one("SELECT COUNT(*) total, SUM(status IN ('new','open','assigned')) open,
      SUM(status IN ('in_progress','waiting_customer','waiting_support')) ongoing,
      SUM(status IN ('solved','closed')) finished FROM tickets WHERE is_published=1");
    $online=one("SELECT SUM(role='customer') customers,SUM(role='supporter') supporters
      FROM guests WHERE banned_at IS NULL AND last_seen_at >= UTC_TIMESTAMP()-INTERVAL 2 MINUTE");
    $idle=one("SELECT COUNT(*) n FROM guests g WHERE g.role='supporter' AND g.banned_at IS NULL
      AND g.last_seen_at>=UTC_TIMESTAMP()-INTERVAL 2 MINUTE AND NOT EXISTS (
      SELECT 1 FROM tickets t WHERE t.assigned_supporter_id=g.id AND t.status NOT IN ('solved','closed'))");
    return ['cards'=>['open'=>(int)$row['open'],'ongoing'=>(int)$row['ongoing'],'finished'=>(int)$row['finished'],'online'=>(int)$online['customers']+(int)$online['supporters']],
      'presence'=>['customers'=>(int)$online['customers'],'supporters'=>(int)$online['supporters'],'idle_supporters'=>(int)$idle['n']]];
}
function act_ticket_list(array $q): array {
    $a=must_auth(); $filter=(string)($q['filter']??'all');
    $term=trim((string)($q['search']??''));
    if (mb_strlen($term)>120) app_error('Suchbegriff zu lang.');
    $page=max(1,min(100000,(int)($q['page']??1)));
    $where=['1=1']; $bind=[];
    if ($a['role']==='customer') { $where[]='t.customer_id=?';$bind[]=$a['id'];$where[]='t.is_published=1'; }
    elseif ($a['role']==='supporter') {
        $where[]="t.is_published=1 AND (t.assigned_supporter_id=? OR (t.assigned_supporter_id IS NULL AND t.status IN ('new','open')))";
        $bind[]=$a['id'];
    } elseif ($filter!=='drafts') $where[]='t.is_published=1';
    if ($filter==='pool') { $where[]="t.assigned_supporter_id IS NULL AND t.status IN ('new','open')"; }
    elseif ($filter==='mine') { $where[]='t.assigned_supporter_id=?';$bind[]=$a['role']==='supporter'?$a['id']:-1; }
    elseif ($filter==='active') { $where[]="t.status NOT IN ('solved','closed')"; }
    elseif ($filter==='waiting') { $where[]="t.status IN ('waiting_customer','waiting_support')"; }
    elseif ($filter==='closed') { $where[]="t.status IN ('solved','closed')"; }
    elseif ($filter==='drafts' && $a['role']==='admin') {$where[]='t.is_published=0';}
    elseif ($filter!=='all') app_error('Ungültiger Ticketfilter.');
    if ($term!=='') { $where[]='(t.ticket_no LIKE ? OR t.subject LIKE ? OR g.display_name LIKE ? OR s.display_name LIKE ?)';
        $like='%'.$term.'%';array_push($bind,$like,$like,$like,$like); }
    if ($a['role']==='admin') {
        foreach(['date_from'=>'>=','date_to'=>'<='] as $k=>$op) {
            $date=trim((string)($q[$k]??''));
            if($date!=='') {
                if(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$date) || date('Y-m-d',strtotime($date)?:0)!==$date) app_error('Ungültiger Datumsfilter.');
                $where[]="DATE(t.created_at) $op ?";$bind[]=$date;
            }
        }
    }
    $whereSql=implode(' AND ',$where);
    $count=one("SELECT COUNT(*) n FROM tickets t LEFT JOIN guests g ON g.id=t.customer_id
       LEFT JOIN guests s ON s.id=t.assigned_supporter_id WHERE $whereSql",$bind);
    $offset=($page-1)*20;
    $rows=many("SELECT t.id,t.ticket_no,t.subject,t.priority,t.status,t.source,t.is_published,t.assigned_supporter_id,
       t.customer_id,t.category_id,t.updated_at,t.created_at,g.display_name customer_name,s.display_name supporter_name,c.name category_name
       FROM tickets t LEFT JOIN guests g ON g.id=t.customer_id LEFT JOIN guests s ON s.id=t.assigned_supporter_id
       JOIN categories c ON c.id=t.category_id WHERE $whereSql ORDER BY t.updated_at DESC,t.id DESC LIMIT 20 OFFSET $offset",$bind);
    return ['items'=>$rows,'page'=>$page,'total'=>(int)$count['n'],'pages'=>max(1,(int)ceil((int)$count['n']/20))];
}
function act_ticket_create(array $d, bool $training=false): array {
    $a=$training?must_admin():must_role('customer');
    throttle('ticket_create',(string)$a['id'].'-'.$a['role'],25,600);
    $subject=field_string($d,'subject',180,4);$description=field_string($d,'description',15000,10);
    $category=valid_category($d['category_id']??null);
    $priority=in_enum($d['priority']??'normal',['low','normal','high','critical']);
    $published=$training?0:1;
    $solution=$training?field_string($d,'sample_solution',20000,3):null;
    db()->beginTransaction();
    try {
        sql('INSERT INTO tickets (customer_id,created_by_admin_id,category_id,source,is_published,subject,description,sample_solution,priority)
          VALUES (?,?,?,?,?,?,?,?,?)',[$training?null:$a['id'],$training?$a['id']:null,$category,$training?'training':'customer',$published,$subject,$description,$solution,$priority]);
        $id=(int)db()->lastInsertId();$no=ticket_no($id);
        sql('UPDATE tickets SET ticket_no=? WHERE id=?',[$no,$id]);
        // Das ursprüngliche Problem ist die erste öffentliche Nachricht des Ticketverlaufs.
        sql('INSERT INTO ticket_messages (ticket_id,sender_kind,sender_guest_id,sender_admin_id,message_type,body)
            VALUES (?,?,?,?,?,?)',[$id,$training?'system':'customer',$training?null:$a['id'],null,'public',$description]);
        history($id,$a,$training?'training_draft_created':'created',null,$no);
        if ($training) audit($a,'training_created','ticket',$id);
        db()->commit();
        return ['id'=>$id,'ticket_no'=>$no];
    } catch(Throwable $e) { db()->rollBack();throw $e; }
}
function act_ticket_detail(int $id): array {
    $a=must_auth(); $t=ticket_access($id,$a);
    if ($a['role']!=='admin') unset($t['sample_solution']);
    $where=$a['role']==='customer' ? "AND m.message_type NOT IN ('internal')" : '';
    $messages=many("SELECT m.id,m.message_type,m.sender_kind,m.body,m.created_at,
        COALESCE(g.display_name,ad.username,IF(m.sender_kind='system','System','System')) author
        FROM ticket_messages m LEFT JOIN guests g ON g.id=m.sender_guest_id
        LEFT JOIN admins ad ON ad.id=m.sender_admin_id WHERE m.ticket_id=? $where ORDER BY m.id",[$id]);
    // Nur Dateien von tatsächlich sichtbaren Nachrichten ausliefern.
    $attachments=many("SELECT a.id,a.message_id,a.original_name,a.size_bytes FROM attachments a
       JOIN ticket_messages m ON m.id=a.message_id WHERE m.ticket_id=? $where ORDER BY a.id",[$id]);
    $mapped=[];
    foreach($attachments as $at) { $mapped[(int)$at['message_id']][]=$at; }
    foreach($messages as &$m) $m['attachments']=$mapped[(int)$m['id']]??[];
    unset($m);
    $history=$a['role']==='customer' ? [] : many('SELECT h.action,h.old_value,h.new_value,h.created_at,
        COALESCE(g.display_name,ad.username,h.actor_kind) actor FROM ticket_history h
        LEFT JOIN guests g ON g.id=h.actor_guest_id LEFT JOIN admins ad ON ad.id=h.actor_admin_id
        WHERE h.ticket_id=? ORDER BY h.id DESC LIMIT 100',[$id]);
    $review=one('SELECT stars,friendliness,clarity,resolution,speed,comment,created_at FROM reviews WHERE ticket_id=?',[$id]);
    return ['ticket'=>$t,'messages'=>$messages,'history'=>$history,'review'=>$review];
}
function act_claim(int $id): array {
    $a=must_role('supporter');
    // Atomarer Vergleich-und-Setze-Zugriff; InnoDB-Zeilensperre verhindert Doppelübernahme.
    db()->beginTransaction();
    try {
        $s=sql("UPDATE tickets SET assigned_supporter_id=?,status='assigned',claimed_at=UTC_TIMESTAMP()
            WHERE id=? AND assigned_supporter_id IS NULL AND is_published=1 AND status IN ('new','open')",[$a['id'],$id]);
        if ($s->rowCount()!==1) { db()->rollBack();app_error('Dieses Ticket wurde bereits übernommen oder ist nicht mehr verfügbar.',409); }
        history($id,$a,'claimed',null,$a['name']);record_event($id,$a,'Ticket wurde übernommen.');
        db()->commit();return ['id'=>$id,'claimed'=>true];
    } catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
function act_ticket_change(int $id, array $d, string $op): array {
    $a=must_auth();
    db()->beginTransaction();
    try {
        $t=ticket_access($id,$a,true);
        if ($op==='status') {
            $new=in_enum($d['status']??null,['new','open','assigned','in_progress','waiting_customer','waiting_support','solved','closed']);
            if ($a['role']==='customer') {
                if (!in_array($t['status'],['solved','closed'],true) || $new!=='open') app_error('Kunden dürfen nur abgeschlossene Tickets wieder öffnen.',403);
                $new = $t['assigned_supporter_id']===null?'open':'in_progress';
            } else require_assignee($t,$a);
            if ($a['role']!=='admin' && in_array($new,['new','open'],true)) app_error('Bitte stattdessen „Ticket freigeben“ verwenden.',403);
            if ($t['status']!==$new) {
                sql("UPDATE tickets SET status=?,
                    resolved_at=CASE WHEN ?='solved' THEN UTC_TIMESTAMP()
                      WHEN ? IN ('new','open','assigned','in_progress','waiting_customer','waiting_support') THEN NULL ELSE resolved_at END,
                    closed_at=CASE WHEN ?='closed' THEN UTC_TIMESTAMP()
                      WHEN ? IN ('new','open','assigned','in_progress','waiting_customer','waiting_support') THEN NULL ELSE closed_at END
                    WHERE id=?",[$new,$new,$new,$new,$new,$id]);
                history($id,$a,'status_changed',$t['status'],$new);record_event($id,$a,'Status: '.$t['status'].' → '.$new);
            }
        } elseif ($op==='priority') {
            require_assignee($t,$a);$new=in_enum($d['priority']??null,['low','normal','high','critical']);
            sql('UPDATE tickets SET priority=? WHERE id=?',[$new,$id]);history($id,$a,'priority_changed',$t['priority'],$new);
        } elseif ($op==='category') {
            require_assignee($t,$a);$new=valid_category($d['category_id']??null);
            sql('UPDATE tickets SET category_id=? WHERE id=?',[$new,$id]);history($id,$a,'category_changed',(string)$t['category_id'],(string)$new);
        } elseif ($op==='release') {
            require_assignee($t,$a);
            sql("UPDATE tickets SET assigned_supporter_id=NULL,claimed_at=NULL,status='open' WHERE id=?",[$id]);
            history($id,$a,'released',$t['supporter_name'],null);record_event($id,$a,'Ticket wurde in den Pool zurückgelegt.');
        } elseif ($op==='handover') {
            require_assignee($t,$a);
            $supporter=positive_id($d['supporter_id']??null);
            if($supporter === (int)$t['assigned_supporter_id']) app_error('Dieses Ticket ist bereits dir zugewiesen.');
            $g=one("SELECT id,display_name FROM guests WHERE id=? AND role='supporter' AND banned_at IS NULL",[$supporter]);
            if(!$g) app_error('Supporter nicht gefunden.');
            sql("UPDATE tickets SET assigned_supporter_id=?,status='assigned',claimed_at=UTC_TIMESTAMP() WHERE id=?",[$supporter,$id]);
            history($id,$a,'handed_over',$t['supporter_name'],$g['display_name']);
            record_event($id,$a,'Ticket wurde an '.$g['display_name'].' übergeben.');
        } elseif ($op==='assign') {
            if ($a['role']!=='admin') app_error('Nur Dozenten dürfen Tickets zuweisen.',403);
            $supporter=positive_id($d['supporter_id']??null);
            $g=one("SELECT id,display_name FROM guests WHERE id=? AND role='supporter' AND banned_at IS NULL",[$supporter]);
            if (!$g) app_error('Supporter nicht gefunden.');
            sql("UPDATE tickets SET assigned_supporter_id=?,status='assigned',claimed_at=UTC_TIMESTAMP() WHERE id=?",[$supporter,$id]);
            history($id,$a,'assigned',$t['supporter_name'],$g['display_name']);record_event($id,$a,'Ticket wurde '.$g['display_name'].' zugewiesen.');
        } elseif ($op==='publish') {
            if ($a['role']!=='admin' || $t['source']!=='training') app_error('Nur Übungsfälle dürfen veröffentlicht werden.',403);
            sql('UPDATE tickets SET is_published=1 WHERE id=?',[$id]);history($id,$a,'published');
        } else app_error('Unbekannte Änderung.');
        if ($a['role']==='admin') audit($a,'ticket_'.$op,'ticket',$id,json_encode($d,JSON_UNESCAPED_UNICODE));
        db()->commit();return ['id'=>$id,'updated'=>true];
    } catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
function act_message_add(int $id, array $d): array {
    $a=must_auth();$type=in_enum($d['type']??'public',['public','internal']);
    if ($a['role']==='customer' && $type!=='public') app_error('Interne Notizen sind ausschließlich für den Support.',403);
    $body=field_string($d,'body',12000,1);
    throttle('ticket_message',$a['role'].'-'.$a['id'],60,600);
    db()->beginTransaction();
    try {
        $t=ticket_access($id,$a,true);
        if ($a['role']==='supporter') require_assignee($t,$a);
        if (in_array($t['status'],['closed'],true) && $a['role']!=='admin') app_error('Dieses Ticket ist geschlossen. Bitte zuerst wieder öffnen.',409);
        sql('INSERT INTO ticket_messages (ticket_id,sender_kind,sender_guest_id,sender_admin_id,message_type,body)
           VALUES (?,?,?,?,?,?)',[$id,actor_kind($a),$a['kind']==='guest'?$a['id']:null,$a['kind']==='admin'?$a['id']:null,$type,$body]);
        $msgId=(int)db()->lastInsertId();
        if ($type==='public' && $a['role']==='customer' && $t['assigned_supporter_id']) {
            sql("UPDATE tickets SET status='waiting_support' WHERE id=? AND status NOT IN ('solved','closed')",[$id]);
        } elseif ($type==='public' && $a['role']==='supporter') {
            sql("UPDATE tickets SET status='waiting_customer' WHERE id=? AND source='customer' AND status NOT IN ('solved','closed')",[$id]);
        }
        sql('UPDATE tickets SET updated_at=UTC_TIMESTAMP() WHERE id=?',[$id]);
        db()->commit();return ['id'=>$msgId];
    } catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
function act_review(int $id, array $d): array {
    $a=must_role('customer');$t=ticket_access($id,$a);
    if (!in_array($t['status'],['solved','closed'],true) || !$t['assigned_supporter_id']) app_error('Bewertung erst nach Ticketabschluss möglich.',409);
    $numbers=[]; foreach(['stars','friendliness','clarity','resolution','speed'] as $k) {
        $v=(int)($d[$k]??0);if ($v<1||$v>5) app_error('Bewertungen müssen zwischen 1 und 5 liegen.');$numbers[]=$v;
    }
    $comment=trim((string)($d['comment']??''));if (mb_strlen($comment)>1000) app_error('Kommentar zu lang.');
    try {
        sql('INSERT INTO reviews (ticket_id,customer_id,supporter_id,stars,friendliness,clarity,resolution,speed,comment)
          VALUES (?,?,?,?,?,?,?,?,?)',array_merge([$id,$a['id'],$t['assigned_supporter_id']],$numbers,[$comment]));
    } catch(PDOException $e) { if ($e->getCode()==='23000') app_error('Dieses Ticket wurde bereits bewertet.',409);throw $e; }
    history($id,$a,'reviewed',null,(string)$numbers[0]);
    return ['saved'=>true];
}
function act_supporters(): array {
    $a=must_auth();
    if ($a['role']==='customer') app_error('Keine Berechtigung.',403);
    return many("SELECT id,display_name FROM guests WHERE role='supporter' AND banned_at IS NULL ORDER BY display_name,id LIMIT 250");
}
function act_participants(array $q=[]): array {
    $a=must_admin();$term=trim((string)($q['search']??''));if(mb_strlen($term)>120) app_error('Suche zu lang.');
    $w=$term!==''?'WHERE g.display_name LIKE ?':'';$bind=$term!==''?['%'.$term.'%']:[];
    $excludeGenerated = one("SHOW TABLES LIKE 'generator_issued'") !== null
       ? ($w ? ' AND ' : ' WHERE ') . 'NOT EXISTS (SELECT 1 FROM generator_issued gi WHERE gi.guest_id=g.id)'
       : '';
    return many("SELECT g.id,g.display_name,g.role,g.banned_at,g.last_seen_at,
      (g.last_seen_at >= UTC_TIMESTAMP()-INTERVAL 2 MINUTE) online,
      (SELECT COUNT(*) FROM tickets t WHERE t.assigned_supporter_id=g.id AND t.status NOT IN ('solved','closed')) active_tickets,
      (SELECT COUNT(*) FROM private_messages pm WHERE pm.guest_id=g.id AND pm.sender_role='guest' AND pm.read_at IS NULL) unread_pm
      FROM guests g $w $excludeGenerated ORDER BY online DESC,g.last_seen_at DESC LIMIT 200",$bind);
}
function act_admin_ban(array $d): array {
    $a=must_admin();$id=positive_id($d['guest_id']??null);
    $ban=bool_json($d['ban']??true);
    $g=one('SELECT id FROM guests WHERE id=?',[$id]);if(!$g) app_error('Teilnehmer nicht gefunden.',404);
    sql('UPDATE guests SET banned_at=IF(?,UTC_TIMESTAMP(),NULL) WHERE id=?',[$ban?1:0,$id]);
    if($ban) sql('UPDATE guest_sessions SET revoked_at=UTC_TIMESTAMP() WHERE guest_id=?',[$id]);
    audit($a,$ban?'guest_ban':'guest_unban','guest',$id);
    return ['updated'=>true];
}
function act_private_list(array $q): array {
    $a=must_auth();$guest=$a['role']==='admin'?positive_id($q['guest_id']??null):$a['id'];
    if ($a['role']==='admin' && !one('SELECT id FROM guests WHERE id=?',[$guest])) app_error('Teilnehmer nicht gefunden.',404);
    $adminId=$a['role']==='admin'?$a['id']:(int)(one('SELECT id FROM admins ORDER BY id LIMIT 1')['id']??0);
    if (!$adminId) app_error('Es ist noch kein Dozent eingerichtet.',503);
    return ['guest_id'=>$guest,'messages'=>many('SELECT id,sender_role,body,created_at,read_at FROM private_messages
       WHERE guest_id=? AND admin_id=? ORDER BY id DESC LIMIT 200',[$guest,$adminId])];
}
function act_private_read(array $d): array {
    $a=must_auth();
    $guest=$a['role']==='admin'?positive_id($d['guest_id']??null):$a['id'];
    $adminId=$a['role']==='admin'?$a['id']:(int)(one('SELECT id FROM admins ORDER BY id LIMIT 1')['id']??0);
    if(!$adminId)app_error('Dozent fehlt.',503);
    sql('UPDATE private_messages SET read_at=UTC_TIMESTAMP() WHERE guest_id=? AND admin_id=? AND sender_role=? AND read_at IS NULL',
        [$guest,$adminId,$a['role']==='admin'?'guest':'admin']);
    return ['read'=>true];
}
function act_private_send(array $d): array {
    $a=must_auth();$guest=$a['role']==='admin'?positive_id($d['guest_id']??null):$a['id'];
    if ($a['role']==='admin' && !one('SELECT id FROM guests WHERE id=?',[$guest])) app_error('Teilnehmer nicht gefunden.',404);
    $adminId=$a['role']==='admin'?$a['id']:(int)(one('SELECT id FROM admins ORDER BY id LIMIT 1')['id']??0);
    if (!$adminId) app_error('Es ist noch kein Dozent eingerichtet.',503);
    $body=field_string($d,'body',8000);
    throttle('pm_send',$a['role'].'-'.$a['id'],50,600);
    sql('INSERT INTO private_messages (admin_id,guest_id,sender_role,body) VALUES (?,?,?,?)',[$adminId,$guest,$a['role']==='admin'?'admin':'guest',$body]);
    if ($a['role']==='admin') audit($a,'private_message','guest',$guest);
    return ['sent'=>true];
}
function act_unread(): array {
    $a=must_auth();
    if($a['role']==='admin') {
        $n=one("SELECT COUNT(*) n FROM private_messages WHERE sender_role='guest' AND read_at IS NULL");
    } else {
        $n=one("SELECT COUNT(*) n FROM private_messages WHERE guest_id=? AND sender_role='admin' AND read_at IS NULL",[$a['id']]);
    }
    // Änderungs-Signatur statt nur Sekunden-Zeitstempel: parallele Nachrichten und Claims erfassen.
    $rev=one('SELECT (SELECT COALESCE(MAX(id),0) FROM tickets) tickets,
      (SELECT COALESCE(MAX(id),0) FROM ticket_messages) messages,
      (SELECT COALESCE(MAX(id),0) FROM ticket_history) history,
      (SELECT COALESCE(MAX(updated_at),\'1970-01-01 00:00:00\') FROM tickets) touched');
    return ['unread_pm'=>(int)$n['n'],'updated'=>implode(':',array_values($rev))];
}
function act_reviews_list(): array {
    must_admin();
    return many('SELECT r.*,t.ticket_no,t.subject,g.display_name supporter_name,c.display_name customer_name
      FROM reviews r JOIN tickets t ON t.id=r.ticket_id
      JOIN guests g ON g.id=r.supporter_id JOIN guests c ON c.id=r.customer_id ORDER BY r.created_at DESC LIMIT 300');
}
function act_categories_list(): array {
    must_admin();
    return many('SELECT id,name,is_active,sort_order FROM categories ORDER BY sort_order,name');
}
function act_categories_manage(array $d): array {
    $a=must_admin();$name=field_string($d,'name',80,2);
    if (!empty($d['id'])) {
        $id=positive_id($d['id']);
        sql('UPDATE categories SET name=?,is_active=? WHERE id=?',[$name,bool_json($d['is_active']??true)?1:0,$id]);
    } else { sql('INSERT INTO categories (name,sort_order) VALUES (?,100)',[$name]);$id=(int)db()->lastInsertId(); }
    audit($a,'category_save','category',$id);return ['id'=>$id];
}
function act_change_password(array $d): array {
    $a=must_admin();$old=(string)($d['old_password']??'');$new=(string)($d['new_password']??'');
    $row=one('SELECT password_hash FROM admins WHERE id=?',[$a['id']]);
    if(!password_verify($old,$row['password_hash'])) app_error('Aktuelles Passwort ist falsch.',403);
    if(strlen($new)<14 || strlen($new)>1024) app_error('Neues Passwort: mindestens 14 Zeichen.');
    sql('UPDATE admins SET password_hash=? WHERE id=?',[password_hash($new,PASSWORD_ARGON2ID),$a['id']]);
    audit($a,'password_changed');return ['saved'=>true];
}
function act_training_reset(array $d): array {
    $a=must_admin();generator_schema();
    if (($d['confirm']??null)!=='ÜBUNGSFÄLLE LÖSCHEN') app_error('Zur Bestätigung bitte exakt „ÜBUNGSFÄLLE LÖSCHEN“ eingeben.');
    db()->beginTransaction();
    try {
        sql("UPDATE generator_control SET status='stopped',next_due_at=NULL,stopped_at=UTC_TIMESTAMP() WHERE status IN ('running','paused') AND id=1");
        $syntheticIds=array_column(many('SELECT guest_id FROM generator_issued'), 'guest_id');
        $n=one("SELECT COUNT(*) n FROM tickets WHERE source='training'");
        $stored=many("SELECT a.storage_name FROM attachments a
          JOIN ticket_messages m ON m.id=a.message_id
          JOIN tickets t ON t.id=m.ticket_id WHERE t.source='training'");
        sql("DELETE FROM tickets WHERE source='training'");
        // Nur simulierte Gastidentitäten entfernen, niemals echte angemeldete Kunden.
        foreach(array_chunk($syntheticIds,100) as $ids) {
           $marks=implode(',',array_fill(0,count($ids),'?'));
           sql("DELETE FROM guests WHERE id IN ($marks) AND NOT EXISTS (SELECT 1 FROM tickets WHERE tickets.customer_id=guests.id)",$ids);
        }
        audit($a,'training_reset','ticket',null,'deleted training tickets: '.$n['n']);
        db()->commit();
        foreach($stored as $file) @unlink(PROJECT_ROOT.'/storage/uploads/'.$file['storage_name']);
        return ['deleted'=>(int)$n['n']];
    } catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
function act_upload(int $messageId): array {
    $a=must_auth();
    $msg=one('SELECT id,ticket_id,message_type,sender_kind,sender_guest_id,sender_admin_id FROM ticket_messages WHERE id=?',[$messageId]);
    if(!$msg) app_error('Nachricht nicht gefunden.',404);
    $t=ticket_access((int)$msg['ticket_id'],$a);
    if ($a['kind']==='guest' && ((int)$msg['sender_guest_id']!==$a['id'])) app_error('Dateien nur zu eigenen Nachrichten hochladen.',403);
    if ($a['kind']==='admin' && ((int)$msg['sender_admin_id']!==$a['id'])) app_error('Dateien nur zu eigenen Nachrichten hochladen.',403);
    if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) app_error('Keine Datei übermittelt.');
    $f=$_FILES['file'];if((int)$f['error']!==UPLOAD_ERR_OK) app_error('Upload fehlgeschlagen.');
    $max=(int)cfg('app','max_upload_bytes',5242880);
    if((int)$f['size']>$max || (int)$f['size']<1) app_error('Datei zu groß oder leer. Maximal 5 MB.');
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    $allowed=['application/pdf'=>'pdf','image/jpeg'=>'jpg','image/png'=>'png','text/plain'=>'txt'];
    if(!isset($allowed[$mime])) app_error('Nur PDF, JPG, PNG und TXT erlaubt.');
    $original=basename((string)$f['name']);if(mb_strlen($original)>180)$original=mb_substr($original,0,180);
    $storage=random_token(24);
    $dir=PROJECT_ROOT.'/storage/uploads';
    if(!is_dir($dir) && !mkdir($dir,0700,true) && !is_dir($dir)) app_error('Privates Upload-Verzeichnis nicht verfügbar.',500);
    $path=$dir.'/'.$storage;
    if(!move_uploaded_file($f['tmp_name'],$path)) app_error('Datei konnte nicht gespeichert werden.',500);
    chmod($path,0600);
    try {
        sql('INSERT INTO attachments (message_id,original_name,storage_name,mime_type,size_bytes) VALUES (?,?,?,?,?)',
        [$messageId,$original,$storage,$mime,(int)$f['size']]);
        return ['id'=>(int)db()->lastInsertId()];
    } catch(Throwable $e){@unlink($path);throw $e;}
}
function act_download(int $attachmentId): never {
    $a=must_auth();
    $at=one('SELECT a.*,m.ticket_id,m.message_type FROM attachments a JOIN ticket_messages m ON m.id=a.message_id WHERE a.id=?',[$attachmentId]);
    if(!$at) app_error('Datei nicht gefunden.',404);
    ticket_access((int)$at['ticket_id'],$a);
    if ($a['role']==='customer' && $at['message_type']==='internal') app_error('Kein Zugriff.',403);
    $path=PROJECT_ROOT.'/storage/uploads/'.$at['storage_name'];
    if(!is_file($path)) app_error('Datei nicht verfügbar.',404);
    header('Content-Type: '.$at['mime_type']);header('X-Content-Type-Options: nosniff');
    header('Content-Disposition: attachment; filename="download"; filename*=UTF-8\'\''.rawurlencode($at['original_name']));
    header('Content-Length: '.filesize($path)); header('Cache-Control: private, no-store');
    readfile($path);exit;
}
function act_admin_kick(array $d): array {
    $a=must_admin();$id=positive_id($d['guest_id']??null);
    if(!one('SELECT id FROM guests WHERE id=?',[$id])) app_error('Teilnehmer nicht gefunden.',404);
    sql('UPDATE guest_sessions SET revoked_at=UTC_TIMESTAMP() WHERE guest_id=?',[$id]);
    audit($a,'guest_kick','guest',$id);return ['kicked'=>true];
}
function act_training_publish_many(array $d): array {
    $a=must_admin();$ids=$d['ids']??null;
    if(!is_array($ids) || count($ids)<1 || count($ids)>100) app_error('Bitte 1 bis 100 Tickets auswählen.');
    $ids=array_unique(array_map('positive_id',$ids));
    db()->beginTransaction();
    try {
        $published=0;
        foreach($ids as $id) {
            $s=sql("UPDATE tickets SET is_published=1 WHERE id=? AND source='training' AND is_published=0",[$id]);
            if($s->rowCount()) {history($id,$a,'published');$published++;}
        }
        audit($a,'training_bulk_publish','ticket',null,json_encode($ids));
        db()->commit();return ['published'=>$published];
    }catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
function act_supporter_stats(): array {
    $a=must_auth();
    if($a['role']==='customer') app_error('Keine Berechtigung.',403);
    $where=$a['role']==='supporter'?'WHERE g.id=?':'';
    $params=$a['role']==='supporter'?[$a['id']]:[];
    return many("SELECT g.id,g.display_name,
      (SELECT COUNT(*) FROM tickets t WHERE t.assigned_supporter_id=g.id) taken,
      (SELECT COUNT(*) FROM tickets t WHERE t.assigned_supporter_id=g.id AND t.status IN ('solved','closed')) finished,
      (SELECT COUNT(*) FROM tickets t WHERE t.assigned_supporter_id=g.id AND t.status NOT IN ('solved','closed')) active,
      (SELECT ROUND(AVG(r.stars),2) FROM reviews r WHERE r.supporter_id=g.id) avg_rating,
      (SELECT COUNT(*) FROM reviews r WHERE r.supporter_id=g.id) reviews,
      (SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE,t.claimed_at,COALESCE(t.resolved_at,t.closed_at)))/60,1)
       FROM tickets t WHERE t.assigned_supporter_id=g.id AND t.claimed_at IS NOT NULL
       AND (t.resolved_at IS NOT NULL OR t.closed_at IS NOT NULL)) avg_hours
      FROM guests g $where ".($where?'AND':'WHERE')." g.role='supporter' ORDER BY finished DESC,g.display_name LIMIT 200",$params);
}
function act_audit_log(): array {
    must_admin();return many('SELECT al.id,al.action,al.target_type,al.target_id,al.details,al.created_at,ad.username
       FROM audit_log al LEFT JOIN admins ad ON ad.id=al.admin_id ORDER BY al.id DESC LIMIT 200');
}
