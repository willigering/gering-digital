<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
$secure=(!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off');
session_name('GD_HomeWork');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Strict']);
session_start();
$_SESSION['hw_csrf'] ??= bin2hex(random_bytes(32));
require_once __DIR__.'/homework-storage.php';

function output(array $data,int $status=200): never {
    http_response_code($status);
    $data['csrf']=$_SESSION['hw_csrf'];
    echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function fail(string $message,int $status=400): never {
    output(['error'=>$message],$status);
}
function db(): PDO {
    return hw_db();
}
function passwordHash(): ?string {
    $file=__DIR__.'/data/bewerbungen-private.sqlite';
    if(!is_file($file))return null;
    $d=new PDO('sqlite:'.$file,null,null,[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT=>8
    ]);
    $hash=$d->query('SELECT password_hash FROM account WHERE id=1')->fetchColumn();
    return is_string($hash)&&$hash!==''?$hash:null;
}
function require_module(PDO $db,string $id): array {
    if (!hw_valid_id($id)) fail('Ungültige Modul-ID.');
    $q=$db->prepare('SELECT id,title,status,category_id FROM modules WHERE id=?');
    $q->execute([$id]);
    $module=$q->fetch(PDO::FETCH_ASSOC);
    if (!is_array($module)) fail('Modul nicht gefunden.',404);
    return $module;
}

try {
    $action=(string)($_GET['action']??'state');
    if ($action==='state' && $_SERVER['REQUEST_METHOD']==='GET') {
        if (empty($_SESSION['hw_login'])) output(['mode'=>passwordHash()?'login':'nosetup']);
        $db=db();

        // One-time import. A deleted legacy module must never reappear on reload.
        $legacyFile=__DIR__.'/data/homework/lf-vi-03.html';
        if (is_file($legacyFile)) {
            $marker=$db->query("SELECT 1 FROM homework WHERE id='migration:lf-vi-03'")->fetchColumn();
            if (!$marker) {
                $db->beginTransaction();
                $status=$db->query("SELECT value FROM homework WHERE id='status:lf-vi-03'")->fetchColumn();
                $status=in_array($status,['offen','bearbeitung','fertig'],true)?$status:'offen';
                $insert=$db->prepare('INSERT OR IGNORE INTO modules(id,title,topic,date,status,filename,created,category_id) VALUES(?,?,?,?,?,?,?,?)');
                $insert->execute(['lf-vi-03','Dokumentieren & Abschließen','LF VI · IT-Support','2026-11-20',$status,'lf-vi-03.html',gmdate('c'),'it-6']);
                $mark=$db->prepare('INSERT OR IGNORE INTO homework(id,value,updated) VALUES(?,?,?)');
                $mark->execute(['migration:lf-vi-03','done',gmdate('c')]);
                $db->commit();
            }
        }
        $modules=$db->query('SELECT id,title,topic,date,status,category_id FROM modules ORDER BY created DESC')->fetchAll(PDO::FETCH_ASSOC);
        $categories=$db->query('SELECT id,name,is_default FROM categories ORDER BY sort_order,name COLLATE NOCASE')->fetchAll(PDO::FETCH_ASSOC);
        output(['mode'=>'ready','modules'=>$modules,'categories'=>$categories]);
    }

    if ($_SERVER['REQUEST_METHOD']!=='POST') fail('Methode nicht erlaubt.',405);
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>200000) fail('Anfrage zu groß.',413);
    $body=json_decode(file_get_contents('php://input'),true);
    if(!is_array($body)) fail('Ungültige Anfrage.');
    if(!hash_equals($_SESSION['hw_csrf'],(string)($body['csrf']??''))) fail('Sitzung abgelaufen.',403);

    if ($action==='login') {
        if ((int)($_SESSION['hw_locked']??0)>time()) fail('Zu viele Versuche. Bitte später erneut versuchen.',429);
        $hash=passwordHash();
        if(!$hash) fail('Bewerbungs-Passwort muss zuerst eingerichtet werden.',409);
        if(!password_verify((string)($body['password']??''),$hash)){
            $_SESSION['hw_attempts']=(int)($_SESSION['hw_attempts']??0)+1;
            if($_SESSION['hw_attempts']>=8)$_SESSION['hw_locked']=time()+900;
            fail('Passwort stimmt nicht.',401);
        }
        session_regenerate_id(true);
        $_SESSION['hw_login']=true;
        $_SESSION['hw_attempts']=0;
        output(['ok'=>true]);
    }
    if ($action==='logout') {
        unset($_SESSION['hw_login']);
        output(['ok'=>true]);
    }
    if (empty($_SESSION['hw_login'])) fail('Nicht angemeldet.',401);

    if ($action==='create-category') {
        $name=trim((string)($body['name']??''));
        if ($name==='' || hw_length($name)>60 || preg_match('/[\x00-\x1F\x7F]/u',$name)) fail('Kategorie muss 1 bis 60 Zeichen haben.');
        $db=db();
        $exists=$db->prepare('SELECT 1 FROM categories WHERE name=? COLLATE NOCASE');
        $exists->execute([$name]);
        if ($exists->fetchColumn()) fail('Diese Kategorie gibt es bereits.',409);
        $id='cat-'.bin2hex(random_bytes(10));
        $order=(int)$db->query('SELECT COALESCE(MAX(sort_order),100)+1 FROM categories')->fetchColumn();
        $q=$db->prepare('INSERT INTO categories(id,name,sort_order,is_default) VALUES(?,?,?,0)');
        try{$q->execute([$id,$name,$order]);}
        catch(PDOException $e){if($e->getCode()==='23000')fail('Diese Kategorie gibt es bereits.',409);throw $e;}
        output(['ok'=>true,'category'=>['id'=>$id,'name'=>$name]]);
    }

    if ($action==='save-status') {
        $id=(string)($body['id']??'');
        $status=(string)($body['status']??'');
        if(!in_array($status,['offen','bearbeitung','fertig'],true))fail('Ungültiger Modulstatus.');
        $db=db();
        require_module($db,$id);
        $stmt=$db->prepare('UPDATE modules SET status=? WHERE id=?');
        $stmt->execute([$status,$id]);
        output(['ok'=>true,'status'=>$status]);
    }

    if ($action==='rename-module') {
        $id=(string)($body['id']??'');
        $title=trim((string)($body['title']??''));
        if ($title===''||hw_length($title)>140||preg_match('/[\x00-\x1F\x7F]/u',$title)) fail('Bitte einen Titel mit maximal 140 Zeichen eingeben.');
        $db=db();
        require_module($db,$id);
        $stmt=$db->prepare('UPDATE modules SET title=? WHERE id=?');
        $stmt->execute([$title,$id]);
        output(['ok'=>true,'title'=>$title]);
    }

    if ($action==='set-category') {
        $id=(string)($body['id']??'');
        $categoryId=(string)($body['categoryId']??'');
        $db=db();
        require_module($db,$id);
        if (!hw_category_exists($db,$categoryId)) fail('Kategorie nicht gefunden.',404);
        $stmt=$db->prepare('UPDATE modules SET category_id=? WHERE id=?');
        $stmt->execute([$categoryId,$id]);
        output(['ok'=>true,'categoryId'=>$categoryId]);
    }

    if ($action==='delete-module') {
        $id=(string)($body['id']??'');
        $db=db();
        require_module($db,$id);
        $folder=__DIR__.'/data/homework';
        $source=$folder.'/'.$id.'.html';
        $quarantine=null;

        $db->beginTransaction();
        try {
            // Only the known, validated HTML filename is moved; never trust user paths.
            if (is_link($source)) fail('Moduldatei kann nicht sicher gelöscht werden.',409);
            if (is_file($source)) {
                $quarantine=$folder.'/.pending-delete-'.bin2hex(random_bytes(12)).'.html';
                if (!rename($source,$quarantine)) throw new RuntimeException('Moduldatei konnte nicht gelöscht werden.');
            }
            $stmt=$db->prepare('DELETE FROM modules WHERE id=?');
            $stmt->execute([$id]);
            if ($stmt->rowCount()!==1) throw new RuntimeException('Modul wurde während des Löschens geändert.');
            $db->commit();
        } catch(Throwable $e) {
            if($db->inTransaction())$db->rollBack();
            if($quarantine!==null&&is_file($quarantine))rename($quarantine,$source);
            throw $e;
        }
        if ($quarantine!==null && is_file($quarantine) && !unlink($quarantine)) {
            error_log('HomeWork: privat geloeschte Moduldatei konnte nicht entfernt werden: '.$id);
        }
        output(['ok'=>true,'deletedId'=>$id]);
    }

    fail('Unbekannte Aktion.',404);
} catch(Throwable $e) {
    error_log('homework-api: '.$e->getMessage());
    fail('Serverfehler.',500);
}
