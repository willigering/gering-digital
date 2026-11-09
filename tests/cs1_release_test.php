<?php
// CS1 „Compiler sagt nein“ ersetzt „Der Compiler hat immer recht“ unter derselben Adresse:
// alter Standardtitel → neue Metadaten und Veröffentlichung, eigener Admin-Titel → unangetastet.
require __DIR__.'/../module_release_lib.php';
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
function receipt($root){$files=[];foreach(glob($root.'/lernmodule/*') as $p)if(basename($p)!=='release.json')$files[basename($p)]=hash_file('sha256',$p);file_put_contents($root.'/lernmodule/release.json',json_encode(['files'=>$files]));}
function page($db,$slug){$q=$db->prepare('SELECT * FROM html_pages WHERE slug=?');$q->execute([$slug]);return $q->fetch(PDO::FETCH_ASSOC);}
function scenario(string $adminTitle): array {
    $root=sys_get_temp_dir().'/dtp-cs1-'.bin2hex(random_bytes(6));
    mkdir($root.'/lernmodule',0750,true);
    $db=new PDO('sqlite::memory:');$db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
    $db->exec("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE html_pages(id INTEGER PRIMARY KEY,slug TEXT UNIQUE,title TEXT,subject TEXT,description TEXT,category TEXT,draft_version TEXT,live_version TEXT,published INTEGER,preview_image TEXT,updated_at TEXT)");
    try {
        $manifest=fn($title,$desc)=>file_put_contents($root.'/lernmodule/manifest.json',json_encode(['modules'=>[['slug'=>'cs1-csharp','file'=>'cs1-csharp.html','title'=>$title,'subject'=>'Programmieren mit C#','description'=>$desc]]]));
        file_put_contents($root.'/lernmodule/cs1-csharp.html','altes C#-Modul');$manifest('Der Compiler hat immer recht','alt');receipt($root);
        module_release_sync($db,$root);
        $db->prepare("UPDATE html_pages SET published=0,title=? WHERE slug='cs1-csharp'")->execute([$adminTitle]);  // Willi schaltet im Admin offline
        file_put_contents($root.'/lernmodule/cs1-csharp.html','neues CS1');$manifest('Compiler sagt nein','neu');receipt($root);
        module_release_sync($db,$root);
        $p=page($db,'cs1-csharp');$p['content']=file_get_contents($root.'/data/html-pages/cs1-csharp/'.$p['live_version'].'/index.html');
        return $p;
    } finally {
        $it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);
        foreach($it as $f){if($f->isDir())rmdir($f->getPathname());else unlink($f->getPathname());}rmdir($root);
    }
}
$a=scenario('Der Compiler hat immer recht');
check($a['content']==='neues CS1','Neuer Inhalt ausgeliefert');
check($a['title']==='Compiler sagt nein' && $a['description']==='neu' && (int)$a['published']===1,'Alter Standardtitel: neue Metadaten und veröffentlicht');
$b=scenario('Mein eigener Titel');
check($b['content']==='neues CS1','Neuer Inhalt auch bei eigenem Titel');
check($b['title']==='Mein eigener Titel' && (int)$b['published']===0,'Eigener Admin-Titel und Offline-Status bleiben');
echo "CS1-Release: Ersetzung, Veröffentlichung und Admin-Vorrang OK\n";
