<?php
require __DIR__.'/../html_project_lib.php';
require_login();
$db=db();
$categories=hp_categories();
function hp_notice(string $message,bool $ok=true): never {
    $_SESSION['hp_notice']=['message'=>$message,'ok'=>$ok];
    header('Location: html_projects.php',true,303);
    exit;
}
if ($_SERVER['REQUEST_METHOD']==='POST') {
    try {
        check_csrf();
        $action=(string)($_POST['action']??'');
        $id=(int)($_POST['id']??0);
        $stmt=$db->prepare('SELECT * FROM html_pages WHERE id=?');
        $stmt->execute([$id]);
        $old=$id?$stmt->fetch(PDO::FETCH_ASSOC):false;
        if ($id && !$old) throw new RuntimeException('Projekt nicht gefunden.');
        if ($action==='save') {
            $slug=$old?$old['slug']:strtolower(trim((string)($_POST['slug']??'')));
            if (!hp_valid_slug($slug)) throw new RuntimeException('URL: 3–60 Zeichen, nur Kleinbuchstaben, Zahlen und Bindestriche; keine reservierten Namen.');
            $title=trim((string)($_POST['title']??''));
            $description=trim((string)($_POST['description']??''));
            $category=(string)($_POST['category']??'lernen');
            if ($title==='' || strlen($title)>400 || strlen($description)>1600)
                throw new RuntimeException('Titel erforderlich (max. 100 Zeichen); Beschreibung max. 400 Zeichen.');
            if (!array_key_exists($category,$categories)) throw new RuntimeException('Ungültige Kategorie.');
            $uploaded=($_FILES['project_file']['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_NO_FILE;
            $imageUploaded=($_FILES['preview_image']['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_NO_FILE;
            $removePreview=!empty($_POST['remove_preview']);
            if ($imageUploaded && $removePreview) throw new RuntimeException('Bitte entweder ein neues Vorschaubild wählen oder das bisherige entfernen.');
            if (!$old && !$uploaded) throw new RuntimeException('Für ein neues Projekt bitte eine HTML- oder ZIP-Datei hochladen.');
            $version='';
            $newImage='';
            try {
                if ($uploaded) $version=hp_import($_FILES['project_file'],$slug);
                if ($imageUploaded) $newImage=hp_import_preview($_FILES['preview_image']);
                $preview=$newImage?:($removePreview?'':($old['preview_image']??''));
                if ($old) {
                    $sql=$db->prepare('UPDATE html_pages SET title=?,description=?,category=?,draft_version=?,preview_image=?,updated_at=CURRENT_TIMESTAMP WHERE id=?');
                    $sql->execute([$title,$description,$category,$version?:$old['draft_version'],$preview,$id]);
                } else {
                    $sql=$db->prepare('INSERT INTO html_pages(slug,title,description,category,draft_version,preview_image) VALUES(?,?,?,?,?,?)');
                    $sql->execute([$slug,$title,$description,$category,$version,$preview]);
                }
            } catch(Throwable $error) {
                if ($version!=='') hp_delete_tree(hp_version_dir($slug,$version));
                if ($newImage!=='') hp_delete_preview($newImage);
                throw $error;
            }
            if (($newImage!=='' || $removePreview) && !empty($old['preview_image'])) hp_delete_preview($old['preview_image']);
            hp_notice('Gespeichert. Das Vorschaubild erscheint bei veröffentlichten Projekten sofort auf der Projektkarte.');
        }
        if (!$old) throw new RuntimeException('Projekt nicht gefunden.');
        if ($action==='publish') {
            $version=$old['draft_version']?:$old['live_version'];
            if (!$version || !is_file(hp_version_dir($old['slug'],$version).'/index.html')) throw new RuntimeException('Kein gültiger Entwurf vorhanden.');
            $sql=$db->prepare('UPDATE html_pages SET live_version=?,published=1,updated_at=CURRENT_TIMESTAMP WHERE id=?');
            $sql->execute([$version,$id]);
            hp_notice('Veröffentlicht: /'.$old['slug'].'/');
        }
        if ($action==='unpublish') {
            $sql=$db->prepare('UPDATE html_pages SET published=0,updated_at=CURRENT_TIMESTAMP WHERE id=?');
            $sql->execute([$id]);
            hp_notice('Projekt offline geschaltet. Die Dateien und Entwürfe bleiben erhalten.');
        }
        if ($action==='delete') {
            $sql=$db->prepare('DELETE FROM html_pages WHERE id=?');
            $sql->execute([$id]);
            hp_delete_tree(hp_storage().'/'.$old['slug']);
            if (!empty($old['preview_image'])) hp_delete_preview($old['preview_image']);
            hp_notice('Projekt gelöscht.');
        }
        throw new RuntimeException('Unbekannte Aktion.');
    } catch(Throwable $error) {
        hp_notice($error->getMessage(),false);
    }
}
$pages=$db->query('SELECT * FROM html_pages ORDER BY updated_at DESC,id DESC')->fetchAll(PDO::FETCH_ASSOC);
$notice=$_SESSION['hp_notice']??null;unset($_SESSION['hp_notice']);
?>
<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HTML-Projektmanager – Gering Digital</title>
<link rel="stylesheet" href="../style.css">
<style><?php include __DIR__.'/admin.css'; ?></style>
<style>
.hp-layout{max-width:1000px;margin:auto}
.hp-tip{color:#d4bc85;border:1px solid #d2aa5159;padding:15px 18px;border-radius:12px;background:#d2aa5110;font-size:13px;line-height:1.65}
.hp-project{margin:20px 0 26px}
.hp-head{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.hp-url{font-family:monospace;color:#f2c965;overflow-wrap:anywhere}
.hp-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;align-items:center}
.hp-actions form{display:inline-flex;margin:0}
.hp-actions .btn{min-height:42px;padding:10px 14px}
.hp-danger{background:transparent;color:#ffafa4;border:1px solid #b45650;border-radius:9px;min-height:42px;padding:10px 14px;cursor:pointer}
.hp-muted{color:#b9b2a6;font-size:13px}
.hp-message{border:1px solid #579e6e;padding:14px;border-radius:10px;margin:12px 0 22px;background:#25503440;color:#a9e8b9}
.hp-message.error{border-color:#9e5757;background:#50252540;color:#ffb7b7}
.hp-layout details{margin-top:15px}
.hp-layout summary{cursor:pointer;padding:10px 0;color:#e6bf6b;font-weight:650}
.hp-layout input[type=file]{max-width:100%}
.hp-layout .hp-project form.form{margin-top:12px}
.hp-layout .hp-inline{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.hp-image-preview{display:flex;align-items:center;gap:14px;margin:13px 0;padding:10px;border:1px solid #d2aa5133;border-radius:13px;max-width:440px;background:#0004}
.hp-image-preview img{width:155px;max-width:47%;aspect-ratio:16/9;object-fit:cover;object-position:top center;border-radius:8px;border:1px solid #d2aa5166}
.hp-image-preview span{font-size:12px;color:#c3af89}
@media(max-width:650px){.hp-layout .form-grid{grid-template-columns:1fr}.hp-actions{align-items:stretch}.hp-actions a,.hp-actions form,.hp-actions button{width:100%;justify-content:center}}
</style>
</head><body class="admin-page">
<header class="nav"><div class="wrap navin"><a class="brand" href="../index.php"><strong>Gering</strong> <span>Digital</span><small>ADMIN</small></a><a class="btn" href="index.php">← Dashboard</a></div></header>
<main class="admin"><div class="wrap hp-layout">
<p class="eyebrow">GERING DIGITAL · ADMIN</p><h1>HTML-Projektmanager</h1>
<p class="hp-muted">Hier landen deine HTML-Lerntrainer und Experimente. Erst Vorschau, dann veröffentlichen. Kein FTP-Gefummel. 😎</p>
<p class="hp-tip"><strong>Wichtig:</strong> Nur selbst erstellte oder geprüfte HTML-Projekte hochladen. JavaScript auf derselben Domain kann mit der Website interagieren. ZIP-Dateien dürfen ausschließlich statische Dateien enthalten, eine <code>index.html</code> ist Pflicht. Maximal 20 MB Upload / 60 MB entpackt. Für ZIP muss PHP ZipArchive auf STRATO aktiv sein. Die Vorschau läuft isoliert; Browser-Speicherung kann dort eingeschränkt sein.</p>
<?php if($notice): ?><p class="hp-message <?=$notice['ok']?'':'error'?>" role="status"><?=e($notice['message'])?></p><?php endif; ?>
<section class="panel"><h2>＋ Neues HTML-Projekt</h2>
<form class="form" action="html_projects.php" method="post" enctype="multipart/form-data">
<input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="save">
<div class="form-grid"><label>Projekttitel *<input name="title" required maxlength="100" placeholder="Subnet Sprint"></label>
<label>URL-Kürzel *<input name="slug" required minlength="3" maxlength="60" pattern="[a-z0-9][a-z0-9-]{2,59}" placeholder="subnet-sprint" autocomplete="off"></label></div>
<label>Beschreibung<textarea name="description" rows="2" maxlength="400" placeholder="Subnetting lernen, bis die Bits freiwillig kapitulieren."></textarea></label>
<label>Kategorie<select name="category"><?php foreach($categories as $key=>$value): ?><option value="<?=e($key)?>" <?=$key==='lernen'?'selected':''?>><?=e($value)?></option><?php endforeach; ?></select></label>
<label>HTML-Datei oder ZIP-Projekt *<input type="file" name="project_file" required accept=".html,.htm,.zip"></label>
<label>Vorschaubild für die Projektkarte (optional)<input type="file" name="preview_image" accept=".jpg,.jpeg,.png,.webp"><small class="hp-muted">Screenshot der HTML-Seite, empfohlen 16:9 (z. B. 1280 × 720), maximal 5 MB.</small></label>
<button class="btn" type="submit">Entwurf speichern <b>→</b></button>
</form></section>
<section class="panel"><h2>Deine HTML-Projekte <span class="pill"><?=count($pages)?></span></h2>
<?php if(!$pages): ?><p class="hp-muted">Noch nichts hochgeladen. Die Bits warten schon ungeduldig.</p><?php endif; ?>
<?php foreach($pages as $page): ?>
<article class="hp-project">
<div class="hp-head"><div><h3><?=e($page['title'])?></h3><div class="hp-url">geringdigital.de/<?=e($page['slug'])?>/</div><small class="hp-muted"><?=e($categories[$page['category']]??'DAU to Pro')?> · <?=e($page['updated_at'])?></small></div>
<span class="status <?=$page['published']?'live':'soon'?>"><?=$page['published']?'Öffentlich':'Entwurf / offline'?></span></div>
<?php if($page['description']): ?><p class="hp-muted"><?=e($page['description'])?></p><?php endif; ?>
<?php if(!empty($page['preview_image'])): ?><div class="hp-image-preview"><img loading="lazy" src="../<?=e($page['preview_image'])?>" alt="Aktuelles Vorschaubild für <?=e($page['title'])?>"><span>Aktuelles Vorschaubild der Projektkarte</span></div><?php endif; ?>
<div class="hp-actions">
<a class="btn ghost" href="html_project_preview_page.php?slug=<?=rawurlencode($page['slug'])?>" target="_blank" rel="noopener">👁 Vorschau ansehen</a>
<?php if($page['published']): ?><a class="btn ghost" href="../<?=e($page['slug'])?>/" target="_blank" rel="noopener">↗ Öffentliche Seite</a><?php endif; ?>
<form action="html_projects.php" method="post"><input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="publish"><input type="hidden" name="id" value="<?=(int)$page['id']?>"><button class="btn" type="submit"><?=$page['published']?'Entwurf veröffentlichen':'Veröffentlichen'?></button></form>
<?php if($page['published']): ?><form action="html_projects.php" method="post"><input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="unpublish"><input type="hidden" name="id" value="<?=(int)$page['id']?>"><button class="btn ghost" type="submit">Offline schalten</button></form><?php endif; ?>
</div>
<details><summary>✏️ Projekt bearbeiten / neue Version hochladen</summary>
<form class="form" method="post" action="html_projects.php" enctype="multipart/form-data">
<input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="save"><input type="hidden" name="id" value="<?=(int)$page['id']?>">
<div class="form-grid"><label>Titel<input name="title" required maxlength="100" value="<?=e($page['title'])?>"></label><label>Kategorie<select name="category"><?php foreach($categories as $key=>$value): ?><option value="<?=e($key)?>" <?=$page['category']===$key?'selected':''?>><?=e($value)?></option><?php endforeach; ?></select></label></div>
<label>Beschreibung<textarea name="description" maxlength="400" rows="2"><?=e($page['description'])?></textarea></label>
<label>Neue HTML- oder ZIP-Version (optional)<input type="file" name="project_file" accept=".html,.htm,.zip"></label>
<label>Vorschaubild austauschen (optional)<input type="file" name="preview_image" accept=".jpg,.jpeg,.png,.webp"><small class="hp-muted">Ein Screenshot im Querformat (16:9). Nur das Vorschaubild ändern ist auch ohne neue HTML-Datei möglich.</small></label>
<?php if(!empty($page['preview_image'])): ?><label class="check"><input type="checkbox" name="remove_preview" value="1"> Vorschaubild entfernen (zurück zum Standardsymbol)</label><?php endif; ?>
<p class="hp-muted">Die URL bleibt unverändert. Eine neue Version ersetzt die veröffentlichte erst nach Klick auf „Veröffentlichen“.</p>
<button type="submit" class="btn">Änderungen als Entwurf speichern</button>
</form>
</details>
<div class="hp-actions"><form action="html_projects.php" method="post" onsubmit="return confirm('Projekt und alle hochgeladenen Versionen wirklich löschen?');"><input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?=(int)$page['id']?>"><button class="hp-danger" type="submit">Projekt endgültig löschen</button></form></div>
<hr style="border:0;border-top:1px solid #d2aa5138;margin:26px 0">
</article>
<?php endforeach; ?>
</section>
</div></main></body></html>
