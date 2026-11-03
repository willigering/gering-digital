<?php
/** Activate only complete releases uploaded by the deployment workflow. No public write endpoint. */
function module_release_sync(PDO $db, ?string $root=null): void {
    $root??=__DIR__;
    $receipt=@file_get_contents($root.'/lernmodule/release.json');
    $release=$receipt===false?null:json_decode($receipt,true);
    if (!is_array($release) || !is_array($release['files']??null) || !isset($release['files']['manifest.json'])) return;
    $signature=hash('sha256',$receipt);
    $q=$db->prepare('SELECT value FROM settings WHERE key=?');
    $q->execute(['module_release']);
    if ($q->fetchColumn()===$signature) return;
    foreach($release['files'] as $file=>$hash) {
        if (!preg_match('~^(?:manifest\.json|[a-z0-9-]+\.html)$~D',$file) || !is_string($hash)
            || !is_file($root.'/lernmodule/'.$file) || hash_file('sha256',$root.'/lernmodule/'.$file)!==$hash) return;
    }
    $manifest=json_decode(file_get_contents($root.'/lernmodule/manifest.json'),true,512,JSON_THROW_ON_ERROR);
    $created=[];
    $db->exec('BEGIN IMMEDIATE');
    try {
        $q->execute(['module_release']);
        if ($q->fetchColumn()===$signature) {$db->exec('COMMIT');return;}
        $aliases=['osi-sprint'=>'osi','subnet-sprint'=>'subnetsprint'];
        $save=$db->prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
        foreach($manifest['modules']??[] as $m) {
            $slug=(string)($m['slug']??'');$file=(string)($m['file']??'');
            if (!preg_match('~^[a-z0-9][a-z0-9-]{2,59}$~D',$slug) || !preg_match('~^[a-z0-9-]+\.html$~D',$file)
                || !isset($release['files'][$file])) throw new RuntimeException('Ungültiges Release-Modul.');
            $find=$db->prepare('SELECT * FROM html_pages WHERE slug=?');$find->execute([$slug]);$page=$find->fetch(PDO::FETCH_ASSOC);
            if (!$page && isset($aliases[$slug])) {$find->execute([$aliases[$slug]]);$page=$find->fetch(PDO::FETCH_ASSOC);}
            $target=$page['slug']??$slug;
            $key='module_hash:'.$target;$q->execute([$key]);$previous=$q->fetchColumn();
            // Existing manual projects are left alone. Managed modules update unless manually replaced.
            if ($page) {
                $live=(string)$page['live_version'];
                $stored=preg_match('~^[a-f0-9]{24}$~D',$live)?$root.'/data/html-pages/'.$target.'/'.$live.'/index.html':'';
                if ($previous===false || $stored==='' || !is_file($stored) || hash_file('sha256',$stored)!==$previous) continue;
                if ($previous===$release['files'][$file]) continue;
            }
            $version=bin2hex(random_bytes(12));
            $dir=$root.'/data/html-pages/'.$target.'/'.$version;
            if (!mkdir($dir,0750,true)) throw new RuntimeException('Modulordner kann nicht erstellt werden.');
            $created[]=$dir;
            if (!copy($root.'/lernmodule/'.$file,$dir.'/index.html')) throw new RuntimeException('Modul kann nicht kopiert werden.');
            if ($page) {
                // Preserve publication, metadata, previews and independent admin drafts.
                $draft=$page['draft_version']===$page['live_version']?$version:$page['draft_version'];
                $db->prepare('UPDATE html_pages SET live_version=?,draft_version=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$version,$draft,$page['id']]);
            } else {
                $preview=(string)($m['preview']??'');
                $preview=preg_match('~^[a-z0-9-]{2,60}$~D',$preview)&&is_file($root.'/assets/dau-previews/'.$preview.'.webp')?'assets/dau-previews/'.$preview.'.webp':'';
                $db->prepare("INSERT INTO html_pages(slug,title,subject,description,category,draft_version,live_version,published,preview_image) VALUES(?,?,?,?,'lernen',?,?,1,?)")
                    ->execute([$target,$m['title']??$target,$m['subject']??'',$m['description']??'',$version,$version,$preview]);
            }
            $save->execute([$key,$release['files'][$file]]);
        }
        $save->execute(['module_release',$signature]);$db->exec('COMMIT');
    } catch(Throwable $error) {
        $db->exec('ROLLBACK');
        foreach($created as $dir) {@unlink($dir.'/index.html');@rmdir($dir);}
        throw $error;
    }
}
