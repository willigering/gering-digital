<?php
/** Match the public stock HTML inspected before the calculator release.
 * Ignore the common wrappers injected by the server and keep admin-edited content independent.
 */
function module_release_matches_legacy(string $slug, string $path): bool {
    $known=[
        'a1-zahlensysteme'=>'45a3b54154b35c438feeb337ccb7cb13e18f290deb0a22920d9409e8611a12f0',
        'b4-ipv6'=>'7c1710ee2da384396773f66159b6db66d9e95c3cbbfc39b5c4826c38a56dd562',
        'b5-netzwerkdienste'=>'094f008e9180a2c913a608a91e1b2af52397c66ef333e8392957ad21ec79d2e1',
        'd1-datenschutz'=>'df4ff4720ebbfab3a6bec5ef11a8e5831915abde8a9b3139093bbaebcd2b347d',
        'd2-it-sicherheit'=>'e9b5cde28fb5ed2ba8d7984258ffc7fe87992918e9e3b2a1098f64162e1d372d',
        'f2-kalkulation'=>'f3288e5c02de71732ec64ced2cc8de88c95318c979f5546622753aa0280786e8',
        'netzwerke-sprint'=>'4362dc11a6add7f5aef3679f1ef5f40d98c1ecebf72d8c34e1124de6a7b9c1e8',
    ];
    if (!isset($known[$slug])) return false;
    $html=file_get_contents($path);
    if ($html===false) return false;
    $html=str_replace(["\r\n",'Offline · ohne Login'],["\n",'Lernen · Üben · Verstehen'],$html);
    $html=preg_replace('~<link\b(?=[^>]*\brel\s*=\s*["\'](?:shortcut\s+)?icon["\'])[^>]*>~i','',$html) ?? $html;
    $html=preg_replace('~<script>window\.__DTP_SYNC__=[\s\S]*?</script>\s*<script>[\s\S]*?</script>~','',$html,1) ?? $html;
    $html=preg_replace('~<!-- DTP-(MODULDESIGN|MODULEINSTIEG|UEBUNGSFOKUS) START -->[\s\S]*?<!-- DTP-\1 END -->~','',$html) ?? $html;
    $html=preg_replace('~(<div\b[^>]*class="foot-brand"[^>]*>)\s*<img\b[^>]*>~i','$1',$html) ?? $html;
    $html=preg_replace('~\n(?:[ \t]*\n)+~',"\n",trim($html)) ?? $html;
    return hash('sha256',$html)===$known[$slug];
}

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
            // Adopt the known public stock versions once. Later admin edits retain their own versions.
            if ($page) {
                $live=(string)$page['live_version'];
                $stored=preg_match('~^[a-f0-9]{24}$~D',$live)?$root.'/data/html-pages/'.$target.'/'.$live.'/index.html':'';
                if ($stored==='' || !is_file($stored)) continue;
                $currentHash=hash_file('sha256',$stored);
                if ($currentHash===$previous && $previous===$release['files'][$file]) continue;
                if (($previous===false || $currentHash!==$previous)
                    && ($page['category']!=='lernen' || !module_release_matches_legacy($target,$stored))) continue;
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
