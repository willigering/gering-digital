<?php
// HTML project assets live under data/, which is web-server denied.
// Only static file types are accepted; no PHP or other server-side scripts.
require_once __DIR__.'/lib.php';

function hp_categories(): array {
    return ['lernen'=>'DAU to Pro','windows'=>'Windows-Apps','spiele'=>'Spiele','sonstiges'=>'Sonstiges','apps'=>'Android-Apps'];
}
function hp_valid_slug(string $slug): bool {
    return (bool)preg_match('/^[a-z0-9][a-z0-9-]{2,59}$/D', $slug)
        && !in_array($slug, ['admin','assets','data','index','lib','project','html-project','html-projects','html-preview','impressum','datenschutz','send','api','contact','favicon','__preview','dau-to-pro'], true);
}
function hp_storage(): string { return __DIR__.'/data/html-pages'; }
function hp_version_dir(string $slug,string $version): string {
    if (!hp_valid_slug($slug) || !preg_match('/^[a-f0-9]{24}$/D',$version)) throw new RuntimeException('Ungültiger Projektpfad.');
    return hp_storage().'/'.$slug.'/'.$version;
}
function hp_mime(string $extension): ?string {
    $types=['html'=>'text/html; charset=utf-8','htm'=>'text/html; charset=utf-8','css'=>'text/css; charset=utf-8',
      'js'=>'text/javascript; charset=utf-8','mjs'=>'text/javascript; charset=utf-8','json'=>'application/json; charset=utf-8',
      'webmanifest'=>'application/manifest+json','txt'=>'text/plain; charset=utf-8','xml'=>'application/xml',
      'png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','gif'=>'image/gif','webp'=>'image/webp',
      'ico'=>'image/x-icon','svg'=>'image/svg+xml','woff'=>'font/woff','woff2'=>'font/woff2','ttf'=>'font/ttf',
      'otf'=>'font/otf','mp3'=>'audio/mpeg','ogg'=>'audio/ogg','wav'=>'audio/wav','mp4'=>'video/mp4',
      'webm'=>'video/webm','wasm'=>'application/wasm'];
    return $types[strtolower($extension)]??null;
}
function hp_file_allowed(string $relative): bool {
    if (strlen($relative)>240 || str_contains($relative,'\\') || str_contains($relative,"\0")
       || !preg_match('~^[A-Za-z0-9_-]+(?:[A-Za-z0-9_./-]*[A-Za-z0-9_-])?(?:\.[A-Za-z0-9]+)$~D',$relative)) return false;
    foreach(explode('/',$relative) as $part){
        if ($part==='' || $part==='.' || $part==='..' || str_starts_with($part,'.')) return false;
    }
    return hp_mime(pathinfo($relative,PATHINFO_EXTENSION))!==null;
}
function hp_delete_tree(string $path): void {
    if (!is_dir($path) || is_link($path)) return;
    foreach(new FilesystemIterator($path,FilesystemIterator::SKIP_DOTS) as $item){
        if ($item->isDir() && !$item->isLink()) hp_delete_tree($item->getPathname());
        else @unlink($item->getPathname());
    }
    @rmdir($path);
}
/**
 * Upload a real preview screenshot for the public project card.
 * Only validated raster images are stored. This is not executable page content.
 */
function hp_import_preview(array $upload): string {
    if (($upload['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK || !is_uploaded_file($upload['tmp_name']??''))
        throw new RuntimeException('Vorschaubild konnte nicht hochgeladen werden.');
    if (($upload['size']??0)<1 || $upload['size']>5*1024*1024)
        throw new RuntimeException('Vorschaubild zu groß (maximal 5 MB).');
    $tmp=$upload['tmp_name'];
    $info=@getimagesize($tmp);
    $types=[
        IMAGETYPE_JPEG=>['image/jpeg','jpg'],
        IMAGETYPE_PNG=>['image/png','png'],
        IMAGETYPE_WEBP=>['image/webp','webp']
    ];
    if (!$info || !isset($types[$info[2]]) || $info[0]<16 || $info[1]<16 ||
        $info[0]>4096 || $info[1]>4096 || ($info[0]*$info[1])>12000000)
        throw new RuntimeException('Bitte ein gültiges JPG-, PNG- oder WebP-Bild verwenden (max. 4096 px, 12 MP).');
    $actualMime=(new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    [$expectedMime,$extension]=$types[$info[2]];
    if ($actualMime!==$expectedMime) throw new RuntimeException('Dateityp des Vorschaubilds stimmt nicht.');
    $directory=__DIR__.'/assets/uploads';
    if (!is_dir($directory) && !mkdir($directory,0755,true)) throw new RuntimeException('Bildordner kann nicht erstellt werden.');
    $relative='assets/uploads/html-preview-'.bin2hex(random_bytes(16)).'.'.$extension;
    if (!move_uploaded_file($tmp,__DIR__.'/'.$relative)) throw new RuntimeException('Vorschaubild konnte nicht gespeichert werden.');
    return $relative;
}
function hp_delete_preview(string $relative): void {
    if (preg_match('~^assets/uploads/html-preview-[a-f0-9]{32}\.(?:png|jpg|webp)$~D',$relative))
        @unlink(__DIR__.'/'.$relative);
}

function hp_import(array $upload,string $slug): string {
    if (($upload['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK) throw new RuntimeException('Bitte HTML- oder ZIP-Datei auswählen.');
    if (!is_uploaded_file($upload['tmp_name']??'')) throw new RuntimeException('Ungültiger Upload.');
    if (($upload['size']??0)<1 || $upload['size']>20*1024*1024) throw new RuntimeException('Datei zu groß (max. 20 MB).');
    $name=$upload['name']??'';
    $extension=strtolower(pathinfo($name,PATHINFO_EXTENSION));
    if (!in_array($extension,['html','htm','zip'],true)) throw new RuntimeException('Nur HTML oder ZIP-Dateien sind erlaubt.');
    // Reject misleading file types even when the filename ends in .html or .zip.
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($upload['tmp_name']);
    if ($extension==='zip' && !in_array($mime,['application/zip','application/x-zip-compressed','application/octet-stream'],true)) throw new RuntimeException('Datei ist kein gültiges ZIP-Archiv.');
    $version=bin2hex(random_bytes(12));
    $base=hp_version_dir($slug,$version);
    if (!is_dir($base) && !mkdir($base,0750,true)) throw new RuntimeException('Speicherordner konnte nicht angelegt werden.');
    try {
        if ($extension!=='zip') {
            if (!move_uploaded_file($upload['tmp_name'],$base.'/index.html')) throw new RuntimeException('HTML-Upload fehlgeschlagen.');
        } else {
            if (!class_exists(ZipArchive::class)) throw new RuntimeException('ZIP-Unterstützung (PHP ZipArchive) ist auf dem Server nicht aktiviert.');
            $zip=new ZipArchive();
            if ($zip->open($upload['tmp_name'])!==true) throw new RuntimeException('ZIP-Datei kann nicht geöffnet werden.');
            try {
                if ($zip->numFiles>250) throw new RuntimeException('Zu viele ZIP-Einträge (max. 250).');
                $entries=[];$bytes=0;
                for($i=0;$i<$zip->numFiles;$i++){
                    $stat=$zip->statIndex($i);
                    if (!$stat) throw new RuntimeException('Ungültiger ZIP-Eintrag.');
                    $path=$stat['name'];
                    if (str_ends_with($path,'/')) continue;
                    if (!hp_file_allowed($path)) throw new RuntimeException('ZIP-Datei enthält einen unerlaubten Dateinamen oder Dateityp: '.$path);
                    if (method_exists($zip,'getExternalAttributesIndex') && $zip->getExternalAttributesIndex($i,$os,$attr) && $os===ZipArchive::OPSYS_UNIX) {
                        $mode=($attr>>16)&0170000;
                        if ($mode!==0 && $mode!==0100000) throw new RuntimeException('ZIP-Symlinks und Spezialdateien sind nicht erlaubt.');
                    }
                    if (($stat['size']??0)>20*1024*1024) throw new RuntimeException('Einzelne ZIP-Datei zu groß.');
                    $bytes+=(int)($stat['size']??0);
                    if ($bytes>60*1024*1024) throw new RuntimeException('ZIP-Inhalt zu groß (max. 60 MB).');
                    if (($stat['size']??0)>1000000 && ($stat['comp_size']??0)>0 && ($stat['size']/$stat['comp_size'])>200)
                        throw new RuntimeException('Verdächtig hoch komprimierte Datei.');
                    $entries[]=['index'=>$i,'path'=>$path,'size'=>$stat['size']];
                }
                // Support a ZIP containing an index.html either at root or inside one wrapper folder.
                $names=array_column($entries,'path');
                $prefix='';
                if (!in_array('index.html',$names,true)) {
                    $candidate=array_values(array_filter($names,fn($p)=>preg_match('~^[A-Za-z0-9_-]+/index\.html$~D',$p)));
                    if (count($candidate)!==1) throw new RuntimeException('ZIP muss eine index.html im Hauptordner enthalten.');
                    $prefix=substr($candidate[0],0,-strlen('index.html'));
                    foreach($names as $p) if (!str_starts_with($p,$prefix)) throw new RuntimeException('ZIP enthält Dateien außerhalb des Projektordners.');
                }
                foreach($entries as $entry){
                    $relative=substr($entry['path'],strlen($prefix));
                    if (!hp_file_allowed($relative)) throw new RuntimeException('Ungültiger Projektdateiname.');
                    $target=$base.'/'.$relative;
                    if (is_file($target)) throw new RuntimeException('Doppelte Datei im Archiv.');
                    $dir=dirname($target);
                    if (!is_dir($dir) && !mkdir($dir,0750,true)) throw new RuntimeException('Ordner kann nicht angelegt werden.');
                    $stream=$zip->getStream($entry['path']);
                    if (!$stream) throw new RuntimeException('ZIP-Eintrag kann nicht gelesen werden.');
                    $out=fopen($target,'xb');
                    if (!$out) {fclose($stream);throw new RuntimeException('Datei kann nicht geschrieben werden.');}
                    $total=0;
                    while(!feof($stream)){
                        $chunk=fread($stream,8192);
                        if ($chunk===false) break;
                        $total+=strlen($chunk);
                        if ($total>$entry['size'] || $total>20*1024*1024) break;
                        if (fwrite($out,$chunk)!==strlen($chunk)) break;
                    }
                    fclose($out);fclose($stream);
                    if ($total!==$entry['size'] || filesize($target)!==$entry['size']) throw new RuntimeException('ZIP-Inhalt ist beschädigt.');
                }
            } finally {$zip->close();}
        }
        if (!is_file($base.'/index.html')) throw new RuntimeException('index.html fehlt.');
        return $version;
    } catch(Throwable $error) {
        hp_delete_tree($base);
        throw $error;
    }
}
/** Mitgelieferte Lernmodule aus dem Repository (Ordner lernmodule/, per .htaccess gesperrt). */
function hp_bundle_dir(): string { return __DIR__.'/lernmodule'; }
function hp_bundles(): array {
    $raw=@file_get_contents(hp_bundle_dir().'/manifest.json');
    $data=$raw!==false?json_decode($raw,true):null;
    $out=[];
    foreach((is_array($data)?($data['modules']??[]):[]) as $m){
        $slug=(string)($m['slug']??'');$file=(string)($m['file']??'');
        if (!hp_valid_slug($slug) || !preg_match('~^[a-z0-9-]+\.html$~D',$file)) continue;
        $path=hp_bundle_dir().'/'.$file;
        if (!is_file($path)) continue;
        $out[$slug]=['slug'=>$slug,'path'=>$path,'title'=>(string)($m['title']??$slug),'subject'=>(string)($m['subject']??''),'description'=>(string)($m['description']??''),
            'preview'=>preg_match('~^[a-z0-9-]{2,60}$~D',(string)($m['preview']??''))?(string)$m['preview']:'',
            'hash'=>hash_file('sha256',$path),'size'=>filesize($path),'changed'=>filemtime($path)];
    }
    return $out;
}
/** SHA-256 of a stored version's index.html ('' if missing). */
function hp_version_hash(string $slug,?string $version): string {
    if (!$version || !preg_match('~^[a-f0-9]{24}$~D',$version)) return '';
    $file=hp_version_dir($slug,$version).'/index.html';
    return is_file($file)?hash_file('sha256',$file):'';
}
/** Copies a bundled single-file module into a new draft version of $slug. */
function hp_import_local(string $path,string $slug): string {
    if (!is_file($path) || filesize($path)<1 || filesize($path)>20*1024*1024) throw new RuntimeException('Moduldatei fehlt oder ist zu groß.');
    $version=bin2hex(random_bytes(12));
    $base=hp_version_dir($slug,$version);
    if (!is_dir($base) && !mkdir($base,0750,true)) throw new RuntimeException('Speicherordner konnte nicht angelegt werden.');
    if (!copy($path,$base.'/index.html')) {hp_delete_tree($base);throw new RuntimeException('Modul konnte nicht übernommen werden.');}
    return $version;
}
/**
 * @param callable|null $htmlFilter Optional transformation for HTML files (used to add the
 *        DAU TO PRO progress sync to live learning modules). Filtered pages are never cached publicly.
 */
function hp_serve(string $slug,string $version,string $file='',bool $preview=false,?callable $htmlFilter=null): never {
    if (!hp_valid_slug($slug) || !preg_match('/^[a-f0-9]{24}$/D',$version)) {http_response_code(404);exit('Nicht gefunden.');}
    $file=$file===''?'index.html':$file;
    if (!hp_file_allowed($file)) {http_response_code(404);exit('Nicht gefunden.');}
    $base=realpath(hp_version_dir($slug,$version));
    $path=$base ? realpath($base.'/'.$file) : false;
    if (!$base || !$path || !str_starts_with($path,$base.DIRECTORY_SEPARATOR) || !is_file($path)) {http_response_code(404);exit('Nicht gefunden.');}
    $ext=strtolower(pathinfo($path,PATHINFO_EXTENSION));
    header('Content-Type: '.hp_mime($ext));
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('X-Frame-Options: SAMEORIGIN');
    $filtered=$htmlFilter!==null && !$preview && in_array($ext,['html','htm'],true);
    header('Cache-Control: '.(($preview||$filtered)?'no-store, private':'public, max-age=300'));
    if ($preview) {
        // Preview content is isolated from admin origin: it cannot read cookies/localStorage.
        header("Content-Security-Policy: sandbox allow-scripts allow-forms allow-downloads; object-src 'none'");
    } elseif ($ext==='svg') {
        header("Content-Security-Policy: sandbox; object-src 'none'");
    }
    if (($_SERVER['REQUEST_METHOD']??'GET')==='HEAD') exit;
    if ($filtered) {echo $htmlFilter((string)file_get_contents($path),$file);exit;}
    readfile($path);
    exit;
}

/** Vorschaubild eines mitgelieferten Moduls: das im Manifest genannte Motiv, sonst leer (= automatische Zuordnung). */
function hp_bundle_preview(array $bundle): string {
    $id=(string)($bundle['preview']??'');
    if ($id==='' || !function_exists('dtp_preview_catalog') || !isset(dtp_preview_catalog()['motifs'][$id])) return '';
    return DTP_PREVIEW_DIR.'/'.$id.'.webp';
}

/** Legacy public routes keep their URL and progress keys while using the shipped module. */
function hp_current_learning_html(string $html,string $slug,string $file): string {
    if ($file!=='' && strtolower($file)!=='index.html') return $html;
    $aliases=['subnetsprint'=>'subnet-sprint','osi'=>'osi-sprint'];
    if (!isset($aliases[$slug])) return $html;
    $bundle=hp_bundles()[$aliases[$slug]]??null;
    if (!$bundle) return $html;
    $current=file_get_contents($bundle['path']);
    return $current===false?$html:$current;
}
