<?php
require __DIR__.'/../module_release_lib.php';
$root=sys_get_temp_dir().'/dtp-release-'.bin2hex(random_bytes(6));
mkdir($root.'/lernmodule',0750,true);mkdir($root.'/assets/dau-previews',0750,true);
$db=new PDO('sqlite::memory:');$db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$db->exec("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE html_pages(id INTEGER PRIMARY KEY,slug TEXT UNIQUE,title TEXT,subject TEXT,description TEXT,category TEXT,draft_version TEXT,live_version TEXT,published INTEGER,preview_image TEXT,updated_at TEXT)");
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
function receipt($root){$files=[];foreach(glob($root.'/lernmodule/*') as $p)if(basename($p)!=='release.json')$files[basename($p)]=hash_file('sha256',$p);file_put_contents($root.'/lernmodule/release.json',json_encode(['files'=>$files]));}
function page($db,$slug){$q=$db->prepare('SELECT * FROM html_pages WHERE slug=?');$q->execute([$slug]);return $q->fetch(PDO::FETCH_ASSOC);}
try {
    file_put_contents($root.'/lernmodule/new-module.html','first version');
    file_put_contents($root.'/lernmodule/osi-sprint.html','osi');
    file_put_contents($root.'/assets/dau-previews/test-motif.webp','preview');
    $modules=[['slug'=>'new-module','file'=>'new-module.html','title'=>'New','subject'=>'Subject','description'=>'Description','preview'=>'test-motif'],['slug'=>'osi-sprint','file'=>'osi-sprint.html','title'=>'OSI']];
    file_put_contents($root.'/lernmodule/manifest.json',json_encode(['modules'=>$modules]));
    $db->exec("INSERT INTO html_pages(slug,title,category,published,live_version,draft_version) VALUES('osi','Manual OSI','lernen',1,'old','draft')");
    module_release_sync($db,$root);check(!page($db,'new-module'),'No activation without receipt');
    receipt($root);file_put_contents($root.'/lernmodule/new-module.html','incomplete upload');
    module_release_sync($db,$root);check(!page($db,'new-module'),'No partial release');
    file_put_contents($root.'/lernmodule/new-module.html','first version');
    module_release_sync($db,$root);$first=page($db,'new-module');
    check($first['published']==1 && $first['preview_image']==='assets/dau-previews/test-motif.webp','Published with preview');
    check(!page($db,'osi-sprint') && page($db,'osi')['title']==='Manual OSI','Preserve legacy URL without duplicate');
    module_release_sync($db,$root);check(page($db,'new-module')['live_version']===$first['live_version'],'Idempotent');
    $db->exec("UPDATE html_pages SET published=0,title='Admin title',draft_version='manual-draft' WHERE slug='new-module'");
    file_put_contents($root.'/lernmodule/new-module.html','second version');receipt($root);module_release_sync($db,$root);
    $next=page($db,'new-module');check($next['live_version']!==$first['live_version'],'Update managed module');
    check($next['published']==0 && $next['title']==='Admin title' && $next['draft_version']==='manual-draft','Preserve admin overrides');
    check(is_file($root.'/data/html-pages/new-module/'.$first['live_version'].'/index.html'),'Retain previous versions');
    file_put_contents($root.'/data/html-pages/new-module/'.$next['live_version'].'/index.html','manual content');
    file_put_contents($root.'/lernmodule/new-module.html','third version');receipt($root);module_release_sync($db,$root);
    check(page($db,'new-module')['live_version']===$next['live_version'],'Preserve manual content');
    $modules[]=['slug'=>'another-module','file'=>'missing.html'];file_put_contents($root.'/lernmodule/manifest.json',json_encode(['modules'=>$modules]));receipt($root);
    try {module_release_sync($db,$root);throw new RuntimeException('Expected failure');}catch(RuntimeException $e){check($e->getMessage()==='Ungültiges Release-Modul.','Reject invalid complete release');}
    check(!$db->inTransaction(),'Rollback closes transaction');
    echo "Module release: publication, completeness, idempotency, legacy routes, admin overrides, versions and rollback OK\n";
} finally {
    $it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);
    foreach($it as $p){if($p->isDir())rmdir($p->getPathname());else unlink($p->getPathname());}rmdir($root);
}
