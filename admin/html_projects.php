<?php
require __DIR__.'/../html_project_lib.php';
require_once __DIR__.'/../dau_lib.php';
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
            // Formelles Thema (Etikett über dem Titel), z. B. „OSI-Schichten“. Optional.
            $subject=trim((string)($_POST['subject']??($old['subject']??'')));
            if (mb_strlen($subject,'UTF-8')>60) throw new RuntimeException('Das Thema darf höchstens 60 Zeichen lang sein.');
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
            // Bildquelle: keep = bisheriges Bild, auto = passendes mitgeliefertes Motiv, motif:<id> = Motiv fest zuordnen.
            $previewSource=(string)($_POST['preview_source']??'keep');
            $chosenMotif='';
            if (str_starts_with($previewSource,'motif:')) {
                $motifId=substr($previewSource,6);
                if (!isset(dtp_preview_catalog()['motifs'][$motifId])) throw new RuntimeException('Unbekanntes Vorschaubild-Motiv.');
                $chosenMotif=DTP_PREVIEW_DIR.'/'.$motifId.'.webp';
            } elseif (!in_array($previewSource,['keep','auto'],true)) throw new RuntimeException('Ungültige Bildquelle.');
            if (!$old && !$uploaded) throw new RuntimeException('Für ein neues Projekt bitte eine HTML- oder ZIP-Datei hochladen.');
            $version='';
            $newImage='';
            try {
                if ($uploaded) $version=hp_import($_FILES['project_file'],$slug);
                if ($imageUploaded) $newImage=hp_import_preview($_FILES['preview_image']);
                $preview=$newImage?:($chosenMotif?:(($removePreview||$previewSource==='auto')?'':($old['preview_image']??'')));
                if ($old) {
                    $sql=$db->prepare('UPDATE html_pages SET title=?,subject=?,description=?,category=?,draft_version=?,preview_image=?,preview_fit=?,preview_x=?,preview_y=?,updated_at=CURRENT_TIMESTAMP WHERE id=?');
                    $sql->execute([$title,$subject,$description,$category,$version?:$old['draft_version'],$preview,$previewFit,$previewX,$previewY,$id]);
                } else {
                    $sql=$db->prepare('INSERT INTO html_pages(slug,title,subject,description,category,draft_version,preview_image,preview_fit,preview_x,preview_y) VALUES(?,?,?,?,?,?,?,?,?,?)');
                    $sql->execute([$slug,$title,$subject,$description,$category,$version,$preview,$previewFit,$previewX,$previewY]);
                }
            } catch(Throwable $error) {
                if ($version!=='') hp_delete_tree(hp_version_dir($slug,$version));
                if ($newImage!=='') hp_delete_preview($newImage);
                throw $error;
            }
            // Replaced or removed uploads are deleted; bundled motifs are never deleted (hp_delete_preview only touches uploads).
            if (!empty($old['preview_image']) && $preview!==$old['preview_image']) hp_delete_preview($old['preview_image']);
            hp_notice('Gespeichert. Das Vorschaubild erscheint bei veröffentlichten Projekten sofort auf der Projektkarte.');
        }
        if ($action==='bundle_import') {
            // Mitgeliefertes Lernmodul aus dem Repository als Entwurf übernehmen. Live bleibt unverändert,
            // bis du auf „Veröffentlichen“ klickst.
            $bundle=hp_bundles()[(string)($_POST['bundle']??'')]??null;
            if (!$bundle) throw new RuntimeException('Unbekanntes Lernmodul.');
            $target=(string)($_POST['target']??'');
            if ($target==='new') {
                $exists=$db->prepare('SELECT COUNT(*) FROM html_pages WHERE slug=?');
                $exists->execute([$bundle['slug']]);
                if ((int)$exists->fetchColumn()>0) throw new RuntimeException('Das Kürzel /'.$bundle['slug'].'/ gibt es schon. Bitte das bestehende Projekt als Ziel wählen.');
                $version=hp_import_local($bundle['path'],$bundle['slug']);
                try {
                    $db->prepare("INSERT INTO html_pages(slug,title,subject,description,category,draft_version,preview_image) VALUES(?,?,?,?,'lernen',?,?)")
                       ->execute([$bundle['slug'],$bundle['title'],$bundle['subject'],$bundle['description'],$version,hp_bundle_preview($bundle)]);
                } catch(Throwable $error) {hp_delete_tree(hp_version_dir($bundle['slug'],$version));throw $error;}
                hp_notice('„'.$bundle['title'].'“ als neuer Entwurf angelegt (/'.$bundle['slug'].'/). Vorschau prüfen, dann „Veröffentlichen“.');
            }
            $stmt->execute([(int)$target]);
            $dest=$stmt->fetch(PDO::FETCH_ASSOC);
            if (!$dest) throw new RuntimeException('Zielprojekt nicht gefunden.');
            $current=hp_version_hash($dest['slug'],$dest['draft_version']?:$dest['live_version']);
            if ($current===$bundle['hash']) hp_notice('„'.$dest['title'].'“ hat diese Version bereits'.((string)$dest['draft_version']!==(string)$dest['live_version']||!$dest['published']?' als Entwurf. Jetzt nur noch „Veröffentlichen“.':'.'));
            $version=hp_import_local($bundle['path'],$dest['slug']);
            $db->prepare('UPDATE html_pages SET draft_version=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$version,(int)$dest['id']]);
            // Optional auch Name, Thema und Beschreibung aus dem Paket übernehmen (z. B. nach einer Umbenennung)
            // und das passende Vorschaubild-Motiv statt eines alten Screenshots.
            if (!empty($_POST['take_names'])) {
                $motif=hp_bundle_preview($bundle);
                $preview=$motif!==''?$motif:(string)($dest['preview_image']??'');
                $db->prepare("UPDATE html_pages SET title=?,subject=?,description=?,preview_image=?,preview_fit='cover',preview_x=50,preview_y=50 WHERE id=?")
                   ->execute([$bundle['title'],$bundle['subject'],$bundle['description'],$preview,(int)$dest['id']]);
                if (!empty($dest['preview_image']) && $preview!==$dest['preview_image']) hp_delete_preview((string)$dest['preview_image']);
            }
            hp_notice('Neue Version als Entwurf bei „'.$dest['title'].'“ hinterlegt. Die öffentliche Seite bleibt unverändert, bis du „Veröffentlichen“ klickst. Gespeicherter Fortschritt bleibt erhalten, weil die URL gleich bleibt.');
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
    $resolved=dtp_preview_resolve($page+['title'=>'','description'=>'','slug'=>'']);
    $catalog=dtp_preview_catalog()['motifs'];
    $bundledId=dtp_preview_bundled_id($src);
    $current=$src===''?'auto':($bundledId!==null?'motif:'.$bundledId:'keep');
    $fit=($page['preview_fit']??'cover')==='contain'?'contain':'cover';
    $x=max(0,min(100,(int)($page['preview_x']??50)));
    $y=max(0,min(100,(int)($page['preview_y']??0)));
    $style='--thumb-fit:'.$fit.';--thumb-x:'.$x.'%;--thumb-y:'.$y.'%';
?>
<fieldset class="hp-thumb-editor" data-thumb-src="<?=$src!==''?'../'.e($src):''?>" data-auto-src="<?=$resolved['src']!==''?'../'.e($resolved['small']?:$resolved['src']):''?>">
  <legend>Vorschaubild einpassen · Live-Ansicht</legend>
  <p class="hp-muted">So wird dein Screenshot auf der öffentlichen Projektkarte dargestellt. Änderungen erscheinen hier sofort, noch vor dem Speichern.</p>
  <label class="hp-source">Bildquelle
    <select name="preview_source" data-thumb-source>
      <?php if($src!=='' && $bundledId===null): ?><option value="keep" selected>Eigenes hochgeladenes Bild behalten</option><?php endif; ?>
      <option value="auto" <?=$current==='auto'?'selected':''?>>Automatisch: thematisch passendes DAU-TO-PRO-Motiv</option>
      <optgroup label="Mitgeliefertes Motiv fest zuordnen">
      <?php foreach($catalog as $id=>$motif): ?><option value="motif:<?=e($id)?>" data-motif-src="../<?=e($motif['src'])?>" <?=$current==='motif:'.$id?'selected':''?>><?=e($motif['label'])?></option><?php endforeach; ?>
      </optgroup>
    </select>
    <small class="hp-muted">Für DAU-TO-PRO-Lernmodule. Ein hochgeladenes Bild hat immer Vorrang. „Automatisch“ wählt anhand von URL, Titel und Beschreibung<?=$src===''&&$resolved['label']!==''?' (derzeit: '.e($resolved['label']).')':''?>.</small>
  </label>
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
  <div class="hp-dau-previews" data-dau-previews data-image="<?=e($src)?>">
    <p class="hp-dau-title">DAU-TO-PRO-Modulkarte – exakt wie auf <code>/dau-to-pro/</code> <span class="hp-muted" data-dau-info></span></p>
    <div class="hp-dau-frames">
      <figure><figcaption>Desktop &amp; Notebook (Kartenbreite 367 px)</figcaption><iframe title="Vorschau Modulkarte Desktop" data-width="367" width="391" height="420" loading="lazy"></iframe></figure>
      <figure><figcaption>Smartphone 390 px (Kartenbreite 324 px)</figcaption><iframe title="Vorschau Modulkarte Smartphone" data-width="324" width="348" height="420" loading="lazy"></iframe></figure>
    </div>
  </div>
  <p class="hp-dau-title" data-main-title>Karte im Projektkatalog der Startseite</p>
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
.hp-source{display:block;margin:0 0 14px;color:#d8cbb1;font-size:13px}
.hp-source select{display:block;width:100%;min-height:44px;margin-top:6px}
.hp-source small{display:block;margin-top:6px;line-height:1.5}
.hp-subject{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#76d8df}
.hp-dau-title{margin:20px 0 10px;color:#f0c76c;font-weight:750;font-size:13px}
.hp-dau-title code{color:#eac271}
.hp-dau-frames{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}
.hp-dau-frames figure{margin:0;max-width:100%;min-width:0}
.hp-dau-frames figcaption{font-size:12px;font-weight:700;color:#e2c17b;margin:0 0 8px}
.hp-dau-frames iframe{display:block;border:1px solid #d8ae4930;border-radius:12px;background:#0d1316;max-width:100%}
.hp-dau-previews[hidden]{display:none}
@media(max-width:700px){.hp-thumb-fields{grid-template-columns:1fr 1fr}.hp-thumb-fields label:first-child{grid-column:1/-1}}
@media(max-width:420px){.hp-thumb-fields{grid-template-columns:1fr}}

.hp-bundle-target{display:flex;align-items:center;gap:8px;font-weight:700}.hp-bundle-target select{min-width:240px;max-width:100%}.hp-bundle .btn[disabled]{opacity:.45;cursor:default}
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
<div class="form-grid"><label>Projekttitel *<input name="title" required maxlength="100" placeholder="Wer teilt, gewinnt"></label>
<label>URL-Kürzel *<input name="slug" required minlength="3" maxlength="60" pattern="[a-z0-9][a-z0-9\-]{2,59}" placeholder="subnet-sprint" autocomplete="off"></label></div>
<label>Thema (Etikett über dem Titel, optional)<input name="subject" maxlength="60" placeholder="Subnetting"></label>
<label>Beschreibung<textarea name="description" rows="2" maxlength="400" placeholder="Subnetting lernen, bis die Bits freiwillig kapitulieren."></textarea></label>
<label>Kategorie<select name="category"><?php foreach($categories as $key=>$value): ?><option value="<?=e($key)?>" <?=$key==='lernen'?'selected':''?>><?=e($value)?></option><?php endforeach; ?></select></label>
<label>HTML-Datei oder ZIP-Projekt *<input type="file" name="project_file" required accept=".html,.htm,.zip"></label>
<label>Vorschaubild für die Projektkarte (optional)<input type="file" name="preview_image" accept=".jpg,.jpeg,.png,.webp"><small class="hp-muted">Screenshot der HTML-Seite, empfohlen 16:9 (z. B. 1280 × 720), maximal 5 MB.</small></label>
<?php hp_render_thumb_editor(); ?>
<button class="btn" type="submit">Entwurf speichern <b>→</b></button>
</form></section>
<?php $bundles=hp_bundles(); if($bundles): $bySlug=array_column($pages,null,'slug'); ?>
<section class="panel" id="lernmodule"><h2>📦 Mitgelieferte Lernmodule <span class="pill"><?=count($bundles)?></span></h2>
<p class="hp-muted">Diese DAU-TO-PRO-Module kommen mit dem Website-Update aus GitHub. „Als Entwurf übernehmen“ legt sie als neue Version an. Öffentlich wird es erst mit „Veröffentlichen“ im Projekt unten. Bei einem bestehenden Projekt bleibt die URL gleich, gespeicherter Lernfortschritt bleibt also erhalten.</p>
<?php foreach($bundles as $b): $dest=$bySlug[$b['slug']]??null;
  // Live-Kürzel kann anders heißen (z. B. /osi-schichten/): dann das DAU-Projekt mit demselben Thema vorschlagen.
  if(!$dest){$topic=dtp_preview_match(['slug'=>$b['slug'],'title'=>$b['title'],'description'=>'']);foreach($pages as $p){if(($p['category']??'')==='lernen'&&$topic!==''&&dtp_preview_match($p)===$topic){$dest=$p;break;}}}
  $live=$dest&&$dest['published']?hp_version_hash($dest['slug'],$dest['live_version']):'';
  $draft=$dest?hp_version_hash($dest['slug'],$dest['draft_version']):'';
  if(!$dest){$state=['soon','Noch nicht auf der Website'];}
  elseif($live===$b['hash']){$state=['live','✓ Live ist aktuell'];}
  elseif($draft===$b['hash']){$state=['soon','Als Entwurf übernommen – noch veröffentlichen'];}
  else{$state=['soon','Neuere Version verfügbar'];} ?>
<article class="hp-project hp-bundle">
<div class="hp-head"><div><?php if($b['subject']!==''): ?><small class="hp-subject"><?=e($b['subject'])?></small><?php endif; ?><h3><?=e($b['title'])?></h3><div class="hp-url">geringdigital.de/<?=e($dest['slug']??$b['slug'])?>/</div><small class="hp-muted"><?=number_format($b['size']/1024,0,',','.')?> KB · Prüfsumme <?=e(substr($b['hash'],0,10))?></small></div>
<span class="status <?=$state[0]?>"><?=e($state[1])?></span></div>
<form class="hp-actions" action="html_projects.php#lernmodule" method="post"><input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="bundle_import"><input type="hidden" name="bundle" value="<?=e($b['slug'])?>">
<label class="hp-bundle-target">Ziel <select name="target">
<?php if(!isset($bySlug[$b['slug']])): ?><option value="new"<?=$dest?'':' selected'?>>Neues Projekt /<?=e($b['slug'])?>/</option><?php endif; ?>
<?php foreach($pages as $p): ?><option value="<?=(int)$p['id']?>"<?=$dest&&(int)$dest['id']===(int)$p['id']?' selected':''?>><?=e($p['title'])?> (/<?=e($p['slug'])?>/)</option><?php endforeach; ?>
</select></label>
<?php $motif=hp_bundle_preview($b); $namesDiffer=$dest&&(($dest['title']??'')!==$b['title']||($dest['subject']??'')!==$b['subject']||($motif!==''&&($dest['preview_image']??'')!==$motif)); ?>
<?php if($dest): ?><label class="check"><input type="checkbox" name="take_names" value="1"<?=$namesDiffer?' checked':''?>> Titel, Thema, Beschreibung<?=$motif!==''?' und Vorschaubild':''?> aus dem Paket übernehmen<?=$namesDiffer?' (bisher: „'.e(trim(($dest['subject']??'').' · '.$dest['title'],' ·')).'“)':''?></label><?php endif; ?>
<button class="btn" type="submit"<?=$state[1]==='✓ Live ist aktuell'&&!$namesDiffer?' disabled':''?>>Als Entwurf übernehmen</button>
</form>
</article>
<?php endforeach; ?>
</section>
<?php endif; ?>
<section class="panel"><h2>Deine HTML-Projekte <span class="pill"><?=count($pages)?></span></h2>
<?php if(!$pages): ?><p class="hp-muted">Noch nichts hochgeladen. Die Bits warten schon ungeduldig.</p><?php endif; ?>
<?php foreach($pages as $page): ?>
<article class="hp-project" id="projekt-<?=(int)$page['id']?>">
<div class="hp-head"><div><?php if(($page['subject']??'')!==''): ?><small class="hp-subject"><?=e($page['subject'])?></small><?php endif; ?><h3><?=e($page['title'])?></h3><div class="hp-url">geringdigital.de/<?=e($page['slug'])?>/</div><small class="hp-muted"><?=e($categories[$page['category']]??'DAU to Pro')?> · <?=e($page['updated_at'])?></small></div>
<span class="status <?=$page['published']?'live':'soon'?>"><?=$page['published']?'Öffentlich':'Entwurf / offline'?></span></div>
<?php if($page['description']): ?><p class="hp-muted"><?=e($page['description'])?></p><?php endif; ?>

<div class="hp-actions">
<a class="btn ghost" href="html_project_preview_page.php?slug=<?=rawurlencode($page['slug'])?>" target="_blank" rel="noopener">👁 Vorschau ansehen</a>
<?php if($page['published']): ?><a class="btn ghost" href="../<?=e($page['slug'])?>/" target="_blank" rel="noopener">↗ Öffentliche Seite</a><?php endif; ?>
<form action="html_projects.php" method="post"><input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="publish"><input type="hidden" name="id" value="<?=(int)$page['id']?>"><button class="btn" type="submit"><?=$page['published']?'Entwurf veröffentlichen':'Veröffentlichen'?></button></form>
<?php if($page['published']): ?><form action="html_projects.php" method="post"><input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="unpublish"><input type="hidden" name="id" value="<?=(int)$page['id']?>"><button class="btn ghost" type="submit">Offline schalten</button></form><?php endif; ?>
</div>
<details><summary>✏️ Projekt bearbeiten / neue Version hochladen</summary>
<form class="form" method="post" action="html_projects.php" enctype="multipart/form-data" data-slug="<?=e($page['slug'])?>">
<input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="save"><input type="hidden" name="id" value="<?=(int)$page['id']?>">
<div class="form-grid"><label>Titel<input name="title" required maxlength="100" value="<?=e($page['title'])?>"></label><label>Kategorie<select name="category"><?php foreach($categories as $key=>$value): ?><option value="<?=e($key)?>" <?=$page['category']===$key?'selected':''?>><?=e($value)?></option><?php endforeach; ?></select></label></div>
<label>Thema (Etikett über dem Titel, optional)<input name="subject" maxlength="60" value="<?=e($page['subject']??'')?>" placeholder="z. B. OSI-Schichten"></label>
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
</div></main>
<script>
(() => {
  const objectUrls = new Set();
  document.querySelectorAll('.hp-thumb-editor').forEach(editor => {
    const form = editor.closest('form');
    const file = form.querySelector('input[name="preview_image"]');
    const remove = form.querySelector('input[name="remove_preview"]');
    const fit = editor.querySelector('[data-thumb-fit]');
    const x = editor.querySelector('[data-thumb-x]');
    const y = editor.querySelector('[data-thumb-y]');
    const xValue = editor.querySelector('[data-thumb-x-value]');
    const yValue = editor.querySelector('[data-thumb-y-value]');
    const stages = editor.querySelectorAll('.hp-thumb-stage');
    const originalSrc = editor.dataset.thumbSrc || '';
    let objectUrl = null;

    const refresh = () => {
      const sourceSelect = editor.querySelector('[data-thumb-source]');
      const motif = sourceSelect?.selectedOptions?.[0]?.dataset?.motifSrc || '';
      const keepStored = !sourceSelect || sourceSelect.value === 'keep' || (sourceSelect.value !== 'auto' && !motif);
      const categorySelect = form.querySelector('[name="category"]');
      const autoMode = !objectUrl && !motif && (remove?.checked || sourceSelect?.value === 'auto') && (!categorySelect || categorySelect.value === 'lernen');
      const source = autoMode ? (editor.dataset.autoSrc || '') : (remove?.checked ? '' : (objectUrl || motif || (keepStored ? originalSrc : '')));
      const fullImage = fit.value === 'contain';
      x.disabled = fullImage;
      y.disabled = fullImage;
      xValue.textContent = x.value + '%';
      yValue.textContent = y.value + '%';
      stages.forEach(stage => {
        // Automatische Motive füllen die Karte immer zentriert (wie auf der Website).
        stage.style.setProperty('--thumb-fit', autoMode ? 'cover' : fit.value);
        stage.style.setProperty('--thumb-x', autoMode ? '50%' : x.value + '%');
        stage.style.setProperty('--thumb-y', autoMode ? '50%' : y.value + '%');
        const img = stage.querySelector('img');
        const placeholder = stage.querySelector('.hp-thumb-empty');
        if (source) {
          if (img.getAttribute('src') !== source) img.src = source;
          img.hidden = false;
          placeholder.hidden = true;
        } else {
          img.hidden = true;
          img.removeAttribute('src');
          placeholder.hidden = false;
        }
      });
    };
    const clearObjectUrl = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrls.delete(objectUrl);
        objectUrl = null;
      }
    };
    file?.addEventListener('change', () => {
      clearObjectUrl();
      const selected = file.files?.[0];
      if (selected) {
        objectUrl = URL.createObjectURL(selected);
        objectUrls.add(objectUrl);
        if (remove) remove.checked = false;
      }
      refresh();
    });
    remove?.addEventListener('change', () => {
      if (remove.checked && file) {
        file.value = '';
        clearObjectUrl();
      }
      refresh();
    });
    [fit, x, y].forEach(input => input.addEventListener('input', refresh));
    refresh();

    // Exakte DAU-TO-PRO-Modulkarte: Server rendert die Karte mit derselben Funktion wie die Oberseite.
    const dau = editor.querySelector('[data-dau-previews]');
    const source = editor.querySelector('[data-thumb-source]');
    const frames = dau ? [...dau.querySelectorAll('iframe')] : [];
    const info = dau?.querySelector('[data-dau-info]');
    const mainTitle = editor.querySelector('[data-main-title]');
    const field = name => form.querySelector('[name="' + name + '"]');
    const category = field('category');
    let reloadTimer = 0;
    const effectiveSource = () => (file?.files?.length ? 'upload' : (remove?.checked ? 'auto' : source.value));
    const pushLocal = frame => {
      const win = frame.contentWindow;
      if (!win || typeof win.dtpCardUpdate !== 'function') return;
      const src = effectiveSource();
      const state = src === 'auto' ? {} : {fit: fit.value, x: x.value, y: y.value};
      if (src === 'upload' && objectUrl) state.src = objectUrl;
      win.dtpCardUpdate(state);
      const doc = frame.contentDocument;
      if (doc?.body) frame.style.height = Math.ceil(doc.documentElement.scrollHeight) + 'px';
      if (info && win.dtpCardInfo) {
        info.textContent = src === 'upload' ? '· neues Bild (noch nicht gespeichert)' :
          win.dtpCardInfo.source === 'auto' ? '· automatisch: ' + win.dtpCardInfo.label :
          win.dtpCardInfo.source === 'bundled' ? '· Motiv: ' + win.dtpCardInfo.label :
          win.dtpCardInfo.source === 'custom' ? '· eigenes Bild' : '';
      }
    };
    const reloadCards = () => {
      if (!dau) return;
      const src = effectiveSource();
      const params = new URLSearchParams({
        title: field('title')?.value || '', subject: field('subject')?.value || '', description: field('description')?.value || '',
        slug: field('slug')?.value || form.dataset.slug || '',
        source: src === 'upload' ? 'auto' : src, image: dau.dataset.image || '',
        fit: fit.value, x: x.value, y: y.value
      });
      frames.forEach(frame => {
        params.set('w', frame.dataset.width);
        frame.onload = () => pushLocal(frame);
        frame.src = 'dau_card_preview.php?' + params.toString();
      });
    };
    const scheduleReload = () => {clearTimeout(reloadTimer); reloadTimer = setTimeout(reloadCards, 350);};
    const toggleDau = () => {
      const isDau = !category || category.value === 'lernen';
      if (dau) dau.hidden = !isDau;
      source.closest('.hp-source').hidden = !isDau;
      if (mainTitle) mainTitle.hidden = false;
    };
    const syncControls = () => {
      const auto = effectiveSource() === 'auto';
      fit.disabled = auto;
      x.disabled = auto || fit.value === 'contain';
      y.disabled = auto || fit.value === 'contain';
    };
    source?.addEventListener('change', () => {
      if (source.value.startsWith('motif:')) {
        // Mitgelieferte Motive sind für die Karte gestaltet: zentriert ausfüllen.
        fit.value = 'cover'; x.value = 50; y.value = 50;
        if (file) {file.value = ''; clearObjectUrl();}
        if (remove) remove.checked = false;
      }
      refresh(); syncControls(); reloadCards();
    });
    file?.addEventListener('change', () => {syncControls(); frames.forEach(pushLocal); reloadCards();});
    remove?.addEventListener('change', () => {syncControls(); reloadCards();});
    [fit, x, y].forEach(input => input.addEventListener('input', () => {syncControls(); frames.forEach(pushLocal);}));
    ['title', 'subject', 'description', 'slug'].forEach(name => field(name)?.addEventListener('input', scheduleReload));
    category?.addEventListener('change', () => {toggleDau(); refresh();});
    toggleDau(); syncControls();
    // Lazy: Karten erst rendern, wenn der Editor sichtbar ist (z. B. aufgeklapptes <details>).
    const details = editor.closest('details');
    if (details && !details.open) details.addEventListener('toggle', () => {if (details.open && !frames[0]?.src) reloadCards();});
    else reloadCards();
  });
  const openFromHash = () => {
    const target = location.hash.startsWith('#projekt-') ? document.getElementById(location.hash.slice(1)) : null;
    const details = target?.querySelector('details');
    if (details) {details.open = true; target.scrollIntoView({block: 'start'});}
  };
  openFromHash();
  addEventListener('hashchange', openFromHash);
  addEventListener('pagehide', () => {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls.clear();
  });
})();
</script>
</body></html>
