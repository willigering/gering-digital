<?php
declare(strict_types=1);

/**
 * Shared HomeWork schema for the API and HTML uploader.
 * Migrations are additive: existing modules, files and statuses stay untouched.
 */
function hw_db(): PDO {
    $dir=__DIR__.'/data';
    if (!is_dir($dir) || !is_writable($dir)) {
        throw new RuntimeException('Privater Serverspeicher nicht verfügbar.');
    }
    $db=new PDO('sqlite:'.$dir.'/homework-private.sqlite',null,null,[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT=>8
    ]);
    $db->exec('PRAGMA busy_timeout=8000');
    $db->exec('CREATE TABLE IF NOT EXISTS homework (id TEXT PRIMARY KEY, value TEXT NOT NULL, updated TEXT NOT NULL)');
    $db->exec("CREATE TABLE IF NOT EXISTS modules (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, topic TEXT NOT NULL,
        date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'offen',
        filename TEXT NOT NULL, created TEXT NOT NULL,
        category_id TEXT NOT NULL DEFAULT ''
    )");
    $columns=$db->query('PRAGMA table_info(modules)')->fetchAll(PDO::FETCH_ASSOC);
    if (!in_array('category_id',array_column($columns,'name'),true)) {
        $db->exec("ALTER TABLE modules ADD COLUMN category_id TEXT NOT NULL DEFAULT ''");
    }
    if (!in_array('background_id',array_column($columns,'name'),true)) {
        $db->exec("ALTER TABLE modules ADD COLUMN background_id TEXT NOT NULL DEFAULT ''");
    }
    $db->exec('CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        sort_order INTEGER NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0
    )');
    $add=$db->prepare('INSERT OR IGNORE INTO categories(id,name,sort_order,is_default) VALUES(?,?,?,1)');
    foreach (['I','II','III','IV','V','VI'] as $idx=>$roman) {
        $add->execute(['it-'.($idx+1),'IT '.$roman,$idx+1]);
    }
    require_once __DIR__.'/homework-workbook.php';
    hw_workbook_schema($db);
    return $db;
}

function hw_valid_id(string $id): bool {
    return preg_match('/\A[a-z0-9-]{3,80}\z/D',$id)===1;
}

function hw_category_exists(PDO $db,string $categoryId): bool {
    if ($categoryId==='') return true;
    $q=$db->prepare('SELECT 1 FROM categories WHERE id=?');
    $q->execute([$categoryId]);
    return (bool)$q->fetchColumn();
}

function hw_length(string $value): int {
    return function_exists('mb_strlen') ? mb_strlen($value,'UTF-8') : strlen($value);
}

function hw_backgrounds(): array {
    $dir=__DIR__.'/assets/dau-backgrounds/';
    $manifest=json_decode((string)@file_get_contents($dir.'manifest.json'),true);
    $items=[];
    foreach(($manifest['assets']??[]) as $asset){
        $id=$asset['id']??'';
        if(!is_string($id)||!preg_match('/\\A[a-z0-9-]+\\z/D',$id))continue;
        foreach(($asset['variants']??[]) as $variant){
            $path=$variant['path']??'';
            if($path===$id.'-768.webp' && is_file($dir.$path)){
                $items[]=['id'=>$id,'title'=>$asset['title']??$id,'image'=>$path];
                break;
            }
        }
    }
    return $items;
}
