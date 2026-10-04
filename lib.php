<?php
session_start();
function db(){
    static $db=null;
    if($db) return $db;
    $dir=__DIR__.'/data'; if(!is_dir($dir)) mkdir($dir,0750,true);
    $db=new PDO('sqlite:'.$dir.'/site.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
    $db->exec("PRAGMA foreign_keys=ON");
    $db->exec("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL)");
    $db->exec("CREATE TABLE IF NOT EXISTS apps(id INTEGER PRIMARY KEY, name TEXT NOT NULL, short_description TEXT NOT NULL, play_url TEXT, icon TEXT, published INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0)");
    $db->exec("CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')");

    // Extend existing app installations without replacing existing data.
    $cols = $db->query("PRAGMA table_info(apps)")->fetchAll(PDO::FETCH_ASSOC);
    $names = array_column($cols, 'name');
    if (!in_array('status', $names, true)) $db->exec("ALTER TABLE apps ADD COLUMN status TEXT NOT NULL DEFAULT 'bald_verfuegbar'");
    if (!in_array('apple_url', $names, true)) $db->exec("ALTER TABLE apps ADD COLUMN apple_url TEXT NOT NULL DEFAULT ''");

    $db->exec("INSERT OR IGNORE INTO settings(key,value) VALUES('site_email','info@geringdigital.de')");
    $db->exec("CREATE TABLE IF NOT EXISTS inquiries(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT, message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, is_read INTEGER NOT NULL DEFAULT 0)");
    // Initial app catalogue. Only inserts when the catalogue is empty.
    if ((int)$db->query("SELECT COUNT(*) FROM apps")->fetchColumn() === 0) {
        $seed = [
            ['TECHDECK', 'Lernkarten einfach selbst erstellen und anschließend gezielt damit lernen.', '', 'assets/uploads/techdeck.png', 1],
            ['Again', 'Die etwas andere Rezeptapp.', '', 'assets/uploads/again.png', 2],
            ['Nook', 'Ideen und Projekte verwalten – und sich daran erinnern lassen, wenn etwas zu lange liegen geblieben ist.', '', 'assets/uploads/nook.png', 3],
            ['Ausmalwelt', 'Kreatives Ausmalen für Kinder und alle, die gerne gestalten.', '', 'assets/uploads/ausmalwelt.png', 6],
            ['WorkingTime', 'Arbeitszeiten einfach erfassen und im Blick behalten.', 'https://play.google.com/store/apps/details?id=de.willigering.workingtime', 'assets/uploads/workingtime.jpg', 7],
        ];
        $stmt = $db->prepare("INSERT INTO apps(name, short_description, play_url, icon, sort_order, status) VALUES(?,?,?,?,?,?)");
        foreach ($seed as $a) { $status = $a[2] ? 'google' : 'bald_verfuegbar'; $stmt->execute([$a[0],$a[1],$a[2],$a[3],$a[4],$status]); }
    }

    return $db;
}
function e($s){return htmlspecialchars((string)$s,ENT_QUOTES,'UTF-8');}
function csrf(){if(empty($_SESSION['csrf'])) $_SESSION['csrf']=bin2hex(random_bytes(32));return $_SESSION['csrf'];}
function check_csrf(){if(!hash_equals($_SESSION['csrf']??'',$_POST['csrf']??'')) die('Ungültige Anfrage.');}
function logged(){return !empty($_SESSION['admin_id']);}
function require_login(){if(!logged()){header('Location: login.php');exit;}}
function setting($key,$default=''){
    $defaults=['site_email'=>'info@geringdigital.de','owner_name'=>'','address'=>'','imprint_extra'=>''];
    if ($key==='site_email') { $v=db()->query("SELECT value FROM settings WHERE key='site_email'")->fetchColumn(); return $v!==false && $v!=='' ? $v : $defaults[$key]; }
    return $defaults[$key]??$default;
}
