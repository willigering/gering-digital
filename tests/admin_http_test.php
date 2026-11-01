<?php
// End-to-end HTTP tests against PHP's built-in server with a temporary database copy.
// Covers authentication, CSRF, the landing page editor, hero upload and preview image assignment.
declare(strict_types=1);
$root=realpath(__DIR__.'/..');
$db=tempnam(sys_get_temp_dir(),'gd-http-').'.sqlite';
putenv('GD_DB_PATH='.$db);
require $root.'/dau_lib.php';
$pdo=db();
$pdo->prepare('INSERT INTO users(username,password_hash) VALUES(?,?)')->execute(['tester',password_hash('ein-langes-testpasswort',PASSWORD_DEFAULT)]);
$pdo->prepare("INSERT INTO html_pages(slug,title,description,category,published) VALUES('osi-sprint','OSI Sprint','Sieben Schichten','lernen',1)")->execute();
$pdo->prepare("INSERT INTO html_pages(slug,title,description,category,published) VALUES('fremd-projekt','Spiel','Ein Spiel','spiele',1)")->execute();
$port=18000+random_int(0,999);
$cmd=sprintf('GD_ROOT=%s GD_DB_PATH=%s exec php -S 127.0.0.1:%d -t %s %s',escapeshellarg($root),escapeshellarg($db),$port,escapeshellarg($root),escapeshellarg(__DIR__.'/support/router.php'));
$server=proc_open($cmd,[1=>['file','/dev/null','w'],2=>['file','/dev/null','w']],$pipes);
$base="http://127.0.0.1:$port";
for($i=0;$i<50 && !@fsockopen('127.0.0.1',$port);$i++) usleep(100000);
$jar=tempnam(sys_get_temp_dir(),'jar');
$failures=0;$count=0;
function check(bool $ok,string $label): void {global $failures,$count;$count++;if(!$ok){$failures++;fwrite(STDERR,"✗ $label\n");}}
function http(string $method,string $path,array $data=[],bool $cookies=true): array {
    global $base,$jar;
    $ch=curl_init($base.$path);
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_HEADER=>true,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CUSTOMREQUEST=>$method]);
    if($cookies) curl_setopt_array($ch,[CURLOPT_COOKIEJAR=>$jar,CURLOPT_COOKIEFILE=>$jar]);
    if($method==='POST') curl_setopt($ch,CURLOPT_POSTFIELDS,$data);
    $raw=(string)curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$hs=curl_getinfo($ch,CURLINFO_HEADER_SIZE);
    return ['status'=>$status,'headers'=>substr($raw,0,$hs),'body'=>substr($raw,$hs)];
}
function token(string $html): string {preg_match('/name="csrf" value="([a-f0-9]{64})"/',$html,$m);return $m[1]??'';}
function fields(array $values): array {$out=[];foreach($values as $k=>$v)$out["dtp[$k]"]=$v;return $out;}
$cleanup=[];
try {
    // --- Zugriffsschutz ---
    foreach(['/admin/index.php','/admin/dau_page.php','/admin/dau_card_preview.php','/admin/html_projects.php'] as $path){
        $r=http('GET',$path,[],false);
        check($r['status']===302 && str_contains($r['headers'],'Location: login.php'),"$path verlangt Login");
    }
    $r=http('POST','/admin/dau_page.php',['action'=>'save_texts']+fields(['title'=>'Hack']+dtp_page_defaults()),false);
    check($r['status']===302 && dtp_page_content()['title']!=='Hack','Speichern ohne Login ist wirkungslos');
    check(http('GET','/data/site.sqlite',[],false)['status']===403,'data/ ist gesperrt');
    // --- Login ---
    $login=http('GET','/admin/login.php');
    $r=http('POST','/admin/login.php',['csrf'=>token($login['body']),'username'=>'tester','password'=>'ein-langes-testpasswort']);
    check($r['status']===302 && str_contains($r['headers'],'Location: index.php'),'Login erfolgreich');
    foreach(['dashboard','projects','dau','publications','settings'] as $view) check(http('GET','/admin/index.php?view='.$view)['status']===200,"Admin 2.0 Ansicht $view lädt");
    check(http('GET','/admin/legacy.php')['status']===200,'Bisherige App-Verwaltung erreichbar');
    $editor=http('GET','/admin/dau_page.php');
    check($editor['status']===200 && str_contains($editor['body'],'name="dtp[title]"'),'Oberseiten-Editor lädt');
    $csrf=token($editor['body']);
    // --- CSRF ---
    $r=http('POST','/admin/dau_page.php',['action'=>'save_texts','csrf'=>str_repeat('0',64)]+fields(['title'=>'Ohne Token']+dtp_page_defaults()));
    check(dtp_page_content()['title']!=='Ohne Token','Falsches CSRF-Token wird abgelehnt');
    // --- Vorschau speichert nicht ---
    $values=['title'=>'Titel aus Test','title_highlight'=>'<Gold>','subtitle'=>'Eins · Zwei','lead'=>'Neue **Beschreibung** <script>x</script>']+dtp_page_defaults();
    $r=http('POST','/admin/dau_page.php',['action'=>'preview','csrf'=>$csrf]+fields($values));
    check($r['status']===200 && str_contains($r['body'],'Titel aus Test') && str_contains($r['body'],'<base href="../dau-to-pro/">'),'Vorschau zeigt ungespeicherte Texte');
    check(str_contains($r['headers'],'no-store') && str_contains($r['headers'],'noindex'),'Vorschau wird nicht gecacht oder indexiert');
    check(!str_contains(http('GET','/dau-to-pro/',[],false)['body'],'Titel aus Test'),'Vorschau verändert die öffentliche Seite nicht');
    // --- Speichern ---
    $r=http('POST','/admin/dau_page.php',['action'=>'save_texts','csrf'=>$csrf]+fields($values));
    check($r['status']===303,'Speichern leitet zurück (PRG)');
    $public=http('GET','/dau-to-pro/',[],false)['body'];
    check(str_contains($public,'Titel aus Test <span>&lt;Gold&gt;</span>'),'Titel erscheint escaped auf der Oberseite');
    check(str_contains($public,'Neue <strong>Beschreibung</strong> &lt;script&gt;'),'Beschreibung: fett erlaubt, HTML escaped');
    check(str_contains($public,'<span>EINS</span>') && str_contains($public,'<span>ZWEI</span>'),'Untertitel wird übernommen');
    $r=http('POST','/admin/dau_page.php',['action'=>'save_texts','csrf'=>$csrf]+fields(['title'=>'']+dtp_page_defaults()));
    check(dtp_page_content()['title']==='Titel aus Test','Ungültige Eingabe ändert gespeicherte Texte nicht');
    // --- Hero ---
    $png=tempnam(sys_get_temp_dir(),'hero').'.png';
    $im=imagecreatetruecolor(800,500);imagesavealpha($im,true);imagealphablending($im,false);
    imagefill($im,0,0,imagecolorallocatealpha($im,0,0,0,127));imagefilledellipse($im,400,250,500,300,imagecolorallocatealpha($im,240,180,60,0));imagepng($im,$png);
    $fake=tempnam(sys_get_temp_dir(),'fake').'.png';file_put_contents($fake,'<?php echo 1; ?>');
    http('POST','/admin/dau_page.php',['action'=>'hero_upload','csrf'=>$csrf,'hero_image'=>new CURLFile($fake,'image/png','boese.png')]);
    check(!dtp_hero()['custom'],'Getarnte PHP-Datei wird als Hero abgelehnt');
    http('POST','/admin/dau_page.php',['action'=>'hero_upload','csrf'=>$csrf,'hero_image'=>new CURLFile($png,'image/png','hero.png')]);
    $hero=dtp_hero();$cleanup[]=$hero['src'];
    check($hero['custom'] && $hero['width']===800 && is_file($root.'/'.$hero['src']),'Neue Hero-Grafik wird gespeichert');
    $public=http('GET','/dau-to-pro/',[],false)['body'];
    check(str_contains($public,'src="../'.$hero['src'].'"') && str_contains($public,'width="800" height="500"'),'Oberseite zeigt die neue Hero-Grafik');
    http('POST','/admin/dau_page.php',['action'=>'hero_reset','csrf'=>$csrf]);
    clearstatcache();
    check(!dtp_hero()['custom'] && !is_file($root.'/'.$hero['src']),'Original wiederhergestellt, alte Datei entfernt');
    http('POST','/admin/dau_page.php',['action'=>'reset_texts','csrf'=>$csrf]);
    check(dtp_page_content()===dtp_page_defaults(),'Texte zurückgesetzt');
    // --- Vorschaubilder in der Modulverwaltung ---
    $public=http('GET','/dau-to-pro/',[],false)['body'];
    check(str_contains($public,'src="../assets/dau-previews/osi-modell.webp"'),'Bestehendes Modul ohne Bild erhält automatisch sein Motiv');
    $home=http('GET','/',[],false)['body'];
    check(str_contains($home,'src="assets/dau-previews/osi-modell-640.webp"')||str_contains($home,'src="assets/dau-previews/osi-modell.webp"'),'Startseite zeigt dasselbe Modulbild');
    $pm=http('GET','/admin/html_projects.php');$csrf2=token($pm['body']);
    check(str_contains($pm['body'],'value="motif:hardware"') && str_contains($pm['body'],'data-dau-previews'),'Modulverwaltung bietet Motive und Kartenvorschau');
    $id=(int)$pdo->query("SELECT id FROM html_pages WHERE slug='osi-sprint'")->fetchColumn();
    $base_post=['csrf'=>$csrf2,'action'=>'save','id'=>$id,'title'=>'OSI Sprint','description'=>'Sieben Schichten','category'=>'lernen','preview_fit'=>'cover','preview_x'=>'50','preview_y'=>'50'];
    http('POST','/admin/html_projects.php',$base_post+['preview_source'=>'motif:../../lib']);
    check($pdo->query("SELECT preview_image FROM html_pages WHERE id=$id")->fetchColumn()==='','Ungültiges Motiv wird abgelehnt');
    http('POST','/admin/html_projects.php',$base_post+['preview_source'=>'motif:hardware']);
    check($pdo->query("SELECT preview_image FROM html_pages WHERE id=$id")->fetchColumn()==='assets/dau-previews/hardware.webp','Motiv wird fest zugeordnet');
    $shot=tempnam(sys_get_temp_dir(),'shot').'.png';$im=imagecreatetruecolor(1280,720);imagepng($im,$shot);
    http('POST','/admin/html_projects.php',array_merge($base_post,['preview_source'=>'motif:hardware','preview_fit'=>'contain','preview_y'=>'30','preview_image'=>new CURLFile($shot,'image/png','shot.png')]));
    $row=$pdo->query("SELECT preview_image,preview_fit,preview_y FROM html_pages WHERE id=$id")->fetch(PDO::FETCH_ASSOC);$cleanup[]=$row['preview_image'];
    check(str_starts_with($row['preview_image'],'assets/uploads/html-preview-') && $row['preview_fit']==='contain' && (int)$row['preview_y']===30,'Hochgeladenes Bild hat Vorrang, Einpassen/Position gespeichert');
    $public=http('GET','/dau-to-pro/',[],false)['body'];
    check(str_contains($public,'src="../'.$row['preview_image'].'"') && str_contains($public,'object-fit:contain;object-position:50% 30%'),'Oberseite zeigt eigenes Bild mit Einstellungen');
    $card=http('GET','/admin/dau_card_preview.php?'.http_build_query(['title'=>'OSI Sprint','description'=>'Sieben Schichten','slug'=>'osi-sprint','source'=>'keep','image'=>$row['preview_image'],'fit'=>'contain','x'=>50,'y'=>30,'w'=>367]))['body'];
    preg_match('~<a class="module-card".*?</a>~s',$public,$pubCard);
    preg_match('~<div class="module-grid">(<div class="module-card".*?)</div></div>\s*<script>~s',$card,$m);$prevCard=isset($m[1])?[$m[1]]:[];
    $normalize=fn($h)=>preg_replace(['~^<a ~','~</a>$~','~ href="[^"]*"~'],['<div ','</div>',''],$h);
    check(isset($pubCard[0],$prevCard[0]) && $normalize($pubCard[0])===$prevCard[0],'Admin-Kartenvorschau ist identisch mit der öffentlichen Karte');
    $card=http('GET','/admin/dau_card_preview.php?'.http_build_query(['source'=>'keep','image'=>'../lib.php','title'=>'x']))['body'];
    check(!str_contains($card,'lib.php'),'Kartenvorschau akzeptiert keine fremden Pfade');
    http('POST','/admin/html_projects.php',$base_post+['preview_source'=>'auto']);
    clearstatcache();
    check($pdo->query("SELECT preview_image FROM html_pages WHERE id=$id")->fetchColumn()==='' && !is_file($root.'/'.$row['preview_image']),'Löschen: zurück zum automatischen Motiv, Upload-Datei entfernt');
    $other=(int)$pdo->query("SELECT id FROM html_pages WHERE slug='fremd-projekt'")->fetchColumn();
    http('POST','/admin/html_projects.php',['csrf'=>$csrf2,'action'=>'save','id'=>$other,'title'=>'Spiel','description'=>'Ein Spiel','category'=>'spiele','preview_source'=>'keep','preview_fit'=>'cover','preview_x'=>'50','preview_y'=>'0']);
    check($pdo->query("SELECT preview_image FROM html_pages WHERE id=$other")->fetchColumn()==='','Projekte außerhalb von DAU TO PRO bleiben unverändert');
    @unlink($png);@unlink($fake);@unlink($shot);
} finally {
    foreach($cleanup as $file) if(is_string($file) && preg_match('~^assets/uploads/(?:html-preview|dtp-hero)-[a-f0-9]{32}\.\w+$~',$file)) @unlink($root.'/'.$file);
    proc_terminate($server);@unlink($db);@unlink($jar);
}
echo $failures?"$failures von $count Prüfungen fehlgeschlagen\n":"Admin-HTTP-Tests: $count Prüfungen bestanden\n";
exit($failures?1:0);
