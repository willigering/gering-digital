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
            $previewFit=(string)($_POST['preview_fit']??($old['preview_fit']??'cover'));
            $previewX=filter_var((string)($_POST['preview_x']??($old['preview_x']??50)),FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100]]);
            $previewY=filter_var((string)($_POST['preview_y']??($old['preview_y']??0)),FILTER_VALIDATE_INT,['options'=>['min_range'=>0,'max_range'=>100]]);
            if (!in_array($previewFit,['cover','contain'],true) || $previewX===false || $previewY===false)
                throw new RuntimeException('Ungültige Vorschaubild-Einstellung. Bitte Einpassmodus und Position prüfen.');
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
                    $sql=$db->prepare('UPDATE html_pages SET title=?,description=?,category=?,draft_version=?,preview_image=?,preview_fit=?,preview_x=?,preview_y=?,updated_at=CURRENT_TIMESTAMP WHERE id=?');
                    $sql->execute([$title,$description,$category,$version?:$old['draft_version'],$preview,$previewFit,$previewX,$previewY,$id]);
                } else {
                    $sql=$db->prepare('INSERT INTO html_pages(slug,title,description,category,draft_version,preview_image,preview_fit,preview_x,preview_y) VALUES(?,?,?,?,?,?,?,?,?)');
                    $sql->execute([$slug,$title,$description,$category,$version,$preview,$previewFit,$previewX,$previewY]);
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

/** Shared card thumbnail editor for creating and updating an HTML project. */
function hp_render_thumb_editor(array $page=[]): void {
    $src=(string)($page['preview_image']??'');
    $fit=($page['preview_fit']??'cover')==='contain'?'contain':'cover';
    $x=max(0,min(100,(int)($page['preview_x']??50)));
    $y=max(0,min(100,(int)($page['preview_y']??0)));
    $style='--thumb-fit:'.$fit.';--thumb-x:'.$x.'%;--thumb-y:'.$y.'%';
?>
<fieldset class="hp-thumb-editor" data-thumb-src="<?=$src!==''?'../'.e($src):''?>">
  <legend>Vorschaubild einpassen · Live-Ansicht</legend>
  <p class="hp-muted">So wird dein Screenshot auf der öffentlichen Projektkarte dargestellt. Änderungen erscheinen hier sofort, noch vor dem Speichern.</p>
  <div class="hp-thumb-fields">
    <label>Darstellung
      <select name="preview_fit" data-thumb-fit>
        <option value="cover" <?=$fit==='cover'?'selected':''?>>Ausfüllen – Bildausschnitt</option>
        <option value="contain" <?=$fit==='contain'?'selected':''?>>Einpassen – ganzes Bild zeigen</option>
      </select>
    </label>
    <label>Horizontaler Ausschnitt <span data-thumb-x-value><?=$x?>%</span>
      <input type="range" name="preview_x" data-thumb-x min="0" max="100" step="1" value="<?=$x?>">
    </label>
    <label>Vertikaler Ausschnitt <span data-thumb-y-value><?=$y?>%</span>
      <input type="range" name="preview_y" data-thumb-y min="0" max="100" step="1" value="<?=$y?>">
    </label>
  </div>
  <p class="hp-muted hp-thumb-tip">Im Modus „Einpassen“ bleibt das ganze Bild sichtbar; dadurch können seitliche oder obere Ränder entstehen.</p>
  <div class="hp-thumb-previews">
    <figure><figcaption>Desktop-Projektkarte</figcaption>
      <div class="hp-thumb-stage hp-thumb-desktop" style="<?=e($style)?>">
        <img class="hp-thumb-image" src="<?=$src!==''?'../'.e($src):''?>" alt="Bildvorschau Desktop" <?=$src===''?'hidden':''?>>
        <span class="hp-thumb-empty" <?=$src!==''?'hidden':''?>>Vorschaubild auswählen</span>
      </div>
    </figure>
    <figure><figcaption>Smartphone-Projektkarte</figcaption>
      <div class="hp-thumb-stage hp-thumb-mobile" style="<?=e($style)?>">
        <img class="hp-thumb-image" src="<?=$src!==''?'../'.e($src):''?>" alt="Bildvorschau Smartphone" <?=$src===''?'hidden':''?>>
        <span class="hp-thumb-empty" <?=$src!==''?'hidden':''?>>Vorschaubild auswählen</span>
      </div>
    </figure>
  </div>
</fieldset>
<?php
}
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

.hp-thumb-editor{min-width:0;margin:18px 0 22px;padding:19px;border:1px solid #d2aa5160;border-radius:16px;background:linear-gradient(135deg,#101a25,#0c1119)}
.hp-thumb-editor legend{padding:0 8px;color:#f0c76c;font-size:15px;font-weight:750}
.hp-thumb-editor>.hp-muted{margin:4px 0 16px;line-height:1.55}
.hp-thumb-fields{display:grid;grid-template-columns:minmax(190px,1.2fr) minmax(130px,1fr) minmax(130px,1fr);align-items:end;gap:12px}
.hp-thumb-fields label{min-width:0;color:#d8cbb1;font-size:13px}
.hp-thumb-fields select{display:block;width:100%;min-height:44px;margin-top:6px}
.hp-thumb-fields input[type=range]{width:100%;min-height:32px;cursor:pointer;accent-color:#efc76b}
.hp-thumb-fields input[type=range]:disabled{opacity:.4;cursor:not-allowed}
.hp-thumb-fields [data-thumb-x-value],.hp-thumb-fields [data-thumb-y-value]{color:#eac271;font-variant-numeric:tabular-nums}
.hp-thumb-editor .hp-thumb-tip{font-size:12px;margin:9px 0 16px}
.hp-thumb-previews{display:flex;align-items:flex-start;gap:22px;flex-wrap:wrap}
.hp-thumb-previews figure{margin:0;min-width:0;max-width:100%}
.hp-thumb-previews figcaption{font-size:12px;font-weight:700;color:#e2c17b;margin:0 0 8px}
.hp-thumb-stage{position:relative;border:1px solid #d8ae4928;border-radius:13px;background:radial-gradient(ellipse at 50% 5%,rgba(227,182,83,.10),#0c1520 75%);padding:12px;overflow:hidden;display:flex;align-items:stretch}
.hp-thumb-desktop{width:330px;max-width:100%;height:190px}
.hp-thumb-mobile{width:220px;max-width:100%;height:auto;aspect-ratio:16/10;padding:9px}
.hp-thumb-stage .hp-thumb-image{width:100%;height:100%;min-height:0;min-width:0;display:block;object-fit:var(--thumb-fit,cover);object-position:var(--thumb-x,50%) var(--thumb-y,0%);border:1px solid rgba(218,168,64,.33);border-radius:12px;background:#09111b}
.hp-thumb-stage .hp-thumb-image[hidden],.hp-thumb-stage .hp-thumb-empty[hidden]{display:none!important}
.hp-thumb-stage .hp-thumb-empty{display:grid;place-items:center;width:100%;color:#c7b995;text-align:center;border:1px dashed rgba(218,168,64,.35);border-radius:12px;font-size:12px}
@media(max-width:700px){.hp-thumb-fields{grid-template-columns:1fr 1fr}.hp-thumb-fields label:first-child{grid-column:1/-1}}
@media(max-width:420px){.hp-thumb-fields{grid-template-columns:1fr}}

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
<?php hp_render_thumb_editor(); ?>
<button class="btn" type="submit">Entwurf speichern <b>→</b></button>
</form></section>
<section class="panel"><h2>Deine HTML-Projekte <span class="pill"><?=count($pages)?></span></h2>
<?php if(!$pages): ?><p class="hp-muted">Noch nichts hochgeladen. Die Bits warten schon ungeduldig.</p><?php endif; ?>
<?php foreach($pages as $page): ?>
<article class="hp-project">
<div class="hp-head"><div><h3><?=e($page['title'])?></h3><div class="hp-url">geringdigital.de/<?=e($page['slug'])?>/</div><small class="hp-muted"><?=e($categories[$page['category']]??'DAU to Pro')?> · <?=e($page['updated_at'])?></small></div>
<span class="status <?=$page['published']?'live':'soon'?>"><?=$page['published']?'Öffentlich':'Entwurf / offline'?></span></div>
<?php if($page['description']): ?><p class="hp-muted"><?=e($page['description'])?></p><?php endif; ?>

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
<?php hp_render_thumb_editor($page); ?>
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
