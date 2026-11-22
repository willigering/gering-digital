<?php
// Admin 2.0: Editor für die öffentliche DAU-TO-PRO-Oberseite (Texte und Hero-Grafik).
require __DIR__.'/../lib.php';
require_once __DIR__.'/../dau_lib.php';
require __DIR__.'/admin2_layout.php';
require_login();

function dtp_admin_notice(string $message,bool $ok=true,string $anchor=''): never {
    $_SESSION['dtp_notice']=['message'=>$message,'ok'=>$ok];
    header('Location: dau_page.php'.($anchor!==''?'#'.$anchor:''),true,303);
    exit;
}

if (($_SERVER['REQUEST_METHOD']??'GET')==='POST') {
    // A file above post_max_size empties $_POST; explain that instead of a bare CSRF error.
    if (!$_POST && (int)($_SERVER['CONTENT_LENGTH']??0)>0) dtp_admin_notice('Die Datei ist größer als das Upload-Limit des Servers.',false,'hero');
    check_csrf();
    $action=(string)($_POST['action']??'');
    try {
        if ($action==='preview') {
            // Unsaved preview of the public page; nothing is written to the database.
            $GLOBALS['dtp_preview_content']=dtp_page_validate((array)($_POST['dtp']??[]));
            header('Cache-Control: no-store, private');
            header('X-Robots-Tag: noindex, nofollow');
            ob_start();
            require __DIR__.'/../dau-to-pro/index.php';
            $html=(string)ob_get_clean();
            // Resolve the page's relative URLs exactly like on /dau-to-pro/.
            $html=preg_replace('/<head>/','<head>'."\n".'<base href="../dau-to-pro/">',$html,1);
            $banner='<div style="position:sticky;top:0;z-index:10000;background:#e7b665;color:#16120b;font:800 13px/1.4 Inter,system-ui,sans-serif;text-align:center;padding:9px 14px">VORSCHAU · Diese Texte sind noch nicht gespeichert. Tab schließen und im Editor auf „Speichern“ klicken.</div>';
            $html=preg_replace('/<body([^>]*)>/','<body$1>'.$banner,$html,1);
            echo $html;
            exit;
        }
        if ($action==='save_texts') {
            dtp_page_save((array)($_POST['dtp']??[]));
            dtp_admin_notice('Gespeichert. Die öffentliche DAU-TO-PRO-Oberseite zeigt die neuen Texte ab sofort.');
        }
        if ($action==='reset_texts') {
            dtp_page_reset_texts();
            dtp_admin_notice('Alle Texte wurden auf die ursprüngliche Fassung zurückgesetzt.');
        }
        if ($action==='hero_upload') {
            if (($_FILES['hero_image']['error']??UPLOAD_ERR_NO_FILE)===UPLOAD_ERR_NO_FILE) throw new RuntimeException('Bitte eine Grafik auswählen.');
            $hero=dtp_hero_import($_FILES['hero_image']);
            try {dtp_hero_activate($hero);} catch (Throwable $error) {dtp_hero_delete_file($hero['src']);throw $error;}
            dtp_admin_notice('Neue Hero-Grafik ist online.',true,'hero');
        }
        if ($action==='hero_reset') {
            dtp_hero_restore_default();
            dtp_admin_notice('Die ursprüngliche Hero-Grafik ist wieder aktiv.',true,'hero');
        }
        throw new RuntimeException('Unbekannte Aktion.');
    } catch (Throwable $error) {
        dtp_admin_notice($error->getMessage(),false,$action==='hero_upload'?'hero':'');
    }
}

$content=dtp_page_content();
$defaults=dtp_page_defaults();
$hero=dtp_hero();
$notice=$_SESSION['dtp_notice']??null;unset($_SESSION['dtp_notice']);
$extraHead=<<<'CSS'
<style>
.dtp-editor .editor-layout{grid-template-columns:minmax(0,1fr) 300px}
.dtp-group{padding:22px 24px 6px;border-bottom:1px solid #262c33}
.dtp-group:last-child{border-bottom:0}
.dtp-group h2{font-size:15px;margin:0 0 4px;display:flex;align-items:center;gap:9px}
.dtp-group h2 span{font-size:10px;letter-spacing:1.6px;color:#d9b578;font-weight:800}
.dtp-group>p{font-size:11px;color:#89939b;margin:0 0 18px}
.dtp-field-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px}
.dtp-field-head label{margin:0!important}
.dtp-default{border:0;background:none;color:#c9a466;font-size:10px;padding:0;text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
.dtp-default[hidden]{display:none}
.dtp-count{font-size:10px;color:#6f7982;text-align:right;margin-top:5px;font-variant-numeric:tabular-nums}
.field input.is-changed,.field textarea.is-changed{border-color:#8a6d3f}
.dtp-notice{border-radius:11px;padding:13px 16px;margin:0 0 20px;font-size:13px;border:1px solid #3f7d58;background:#173323;color:#a9e8b9}
.dtp-notice.error{border-color:#8f4b4b;background:#3a1d1d;color:#ffc1c1}
.hero-stage{position:relative;border-radius:14px;border:1px solid #3a3326;overflow:hidden;padding:22px;display:grid;place-items:center;min-height:240px;
 background:radial-gradient(circle at 48% 20%,rgba(0,209,222,.08),transparent 45%),radial-gradient(circle at 82% 70%,rgba(255,191,55,.06),transparent 40%),#080c0e}
.hero-stage img{display:block;max-width:100%;max-height:360px;width:auto;height:auto}
.hero-meta-line{font-size:11px;color:#8e98a0;margin:10px 0 0}
.hero-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:16px}
.hero-actions input[type=file]{color:#c9d0d5;font-size:12px;max-width:100%}
.btn-danger-ghost{background:transparent;border:1px solid #8f4b4b;color:#ffb3aa}
.dtp-side .publish-box p{line-height:1.6}
.dtp-side .btn{width:100%;justify-content:center}
.dtp-side form{margin:0}
.dtp-markup{font-size:10px;color:#7f8a92;margin:-10px 0 18px}
@media(max-width:1040px){.dtp-editor .editor-layout{grid-template-columns:1fr}}
@media(max-width:490px){.dtp-group{padding:18px 16px 4px}.hero-stage{padding:12px;min-height:160px}}
</style>
CSS;
admin2_open('dau_page','Oberseite bearbeiten','Oberseite bearbeiten · Gering Digital Admin',$extraHead);
?>
<div class="dtp-editor">
 <div class="page-heading"><div><p class="eyebrow">DAU TO PRO · ÖFFENTLICHE OBERSEITE</p><h1>Oberseite <span class="text-gold">bearbeiten</span></h1><p class="subtext">Titel, Untertitel, Beschreibung, alle Seitentexte und die Hero-Grafik. Gespeicherte Änderungen sind sofort auf <span class="code-text">/dau-to-pro/</span> sichtbar.</p></div>
 <div class="heading-actions"><a class="btn btn-ghost" href="../dau-to-pro/" target="_blank" rel="noopener"><svg><use href="#i-external"/></svg> Öffentliche Oberseite</a></div></div>
 <?php if($notice): ?><p class="dtp-notice <?=$notice['ok']?'':'error'?>" role="status"><?=e($notice['message'])?></p><?php endif; ?>

 <div class="editor-layout">
  <div class="editor-main">
   <section class="card card-pad" id="hero" style="margin-bottom:20px">
    <div class="section-head"><div><h2>Hero-Grafik</h2><p class="section-sub">Freigestellte PNG- oder WebP-Grafik mit transparentem Hintergrund (JPG möglich, dann ohne Transparenz). Bis 8 MB, 320–4096 Pixel. Die Grafik wird immer vollständig gezeigt; transparente Ränder werden automatisch erkannt.</p></div></div>
    <div class="hero-stage"><img id="hero-preview" src="../<?=e($hero['src'])?>" width="<?=(int)$hero['width']?>" height="<?=(int)$hero['height']?>" alt="Aktuelle Hero-Grafik"></div>
    <p class="hero-meta-line" id="hero-meta"><?=$hero['custom']?'Eigene Grafik':'Originalgrafik'?> · <?=(int)$hero['width']?> × <?=(int)$hero['height']?> Pixel</p>
    <form class="hero-actions" method="post" action="dau_page.php" enctype="multipart/form-data">
     <input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="hero_upload">
     <input type="file" name="hero_image" id="hero-file" accept=".png,.webp,.jpg,.jpeg,image/png,image/webp,image/jpeg" required>
     <button class="btn btn-gold" type="submit"><svg><use href="#i-image"/></svg> Hero-Grafik austauschen</button>
    </form>
    <?php if($hero['custom']): ?>
    <form class="hero-actions" method="post" action="dau_page.php" onsubmit="return confirm('Eigene Hero-Grafik entfernen und die Originalgrafik wieder anzeigen?');">
     <input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="hero_reset">
     <button class="btn btn-danger-ghost" type="submit">Originalgrafik wiederherstellen</button>
    </form>
    <?php endif; ?>
   </section>

   <form class="card" id="dtp-texts" method="post" action="dau_page.php">
    <input type="hidden" name="csrf" value="<?=e(csrf())?>">
    <?php $n=0; foreach(dtp_page_fields() as $group=>$fields): $n++; ?>
    <fieldset class="dtp-group" style="border-left:0;border-right:0;border-top:0;margin:0;min-width:0">
     <h2><span><?=sprintf('%02d',$n)?></span> <?=e($group)?></h2>
     <?php if($group==='Kopfbereich'): ?><p>Titel, Untertitel und Beschreibung ganz oben auf der Seite.</p><?php endif; ?>
     <?php foreach($fields as $key=>[$label,$type,$max,$default,$required]): $id='dtp-'.$key; $value=$content[$key]; ?>
     <div class="field">
      <div class="dtp-field-head"><label for="<?=e($id)?>"><?=e($label)?><?=$required?' *':''?></label><button type="button" class="dtp-default" data-target="<?=e($id)?>" <?=$value===$default?'hidden':''?>>↺ Standardtext</button></div>
      <?php if($type==='textarea'): ?>
       <textarea id="<?=e($id)?>" name="dtp[<?=e($key)?>]" maxlength="<?=(int)$max?>" rows="<?=$max>500?5:3?>" data-default="<?=e($default)?>" <?=$required?'required':''?>><?=e($value)?></textarea>
      <?php else: ?>
       <input id="<?=e($id)?>" type="text" name="dtp[<?=e($key)?>]" maxlength="<?=(int)$max?>" value="<?=e($value)?>" data-default="<?=e($default)?>" <?=$required?'required':''?>>
      <?php endif; ?>
      <div class="dtp-count"><span data-count-for="<?=e($id)?>"><?=mb_strlen($value,'UTF-8')?></span> / <?=(int)$max?></div>
     </div>
     <?php endforeach; ?>
     <?php if($group==='Wichtiger Hinweis'): ?><p class="dtp-markup">Tipp: <span class="code-text">**fett**</span> hebt Text hervor. Andere Formatierungen oder HTML werden als normaler Text angezeigt.</p><?php endif; ?>
    </fieldset>
    <?php endforeach; ?>
   </form>
  </div>

  <aside class="editor-side dtp-side">
   <div class="card publish-box">
    <h3>Änderungen übernehmen</h3>
    <p>„Speichern“ übernimmt alle Texte direkt auf die öffentliche Oberseite. Mit „Vorschau“ siehst du die Seite vorher in einem neuen Tab, ohne etwas zu speichern.</p>
    <div class="editor-actions">
     <button class="btn btn-gold" type="submit" form="dtp-texts" name="action" value="save_texts">Speichern &amp; veröffentlichen</button>
     <button class="btn btn-ghost" type="submit" form="dtp-texts" name="action" value="preview" formtarget="_blank">Vorschau (ungespeichert) ↗</button>
    </div>
    <div class="pub-meta">
     <div class="meta-line"><span>Hero-Grafik</span><span><?=$hero['custom']?'Eigene Grafik':'Original'?></span></div>
     <div class="meta-line"><span>Geänderte Texte</span><span id="changed-count"><?=count(array_filter(array_keys($defaults),static fn($k)=>$content[$k]!==$defaults[$k]))?></span></div>
    </div>
    <form method="post" action="dau_page.php" onsubmit="return confirm('Alle Texte auf die ursprüngliche Fassung zurücksetzen? Die Hero-Grafik bleibt unverändert.');">
     <input type="hidden" name="csrf" value="<?=e(csrf())?>"><input type="hidden" name="action" value="reset_texts">
     <button class="btn btn-danger-ghost" type="submit">Alle Texte zurücksetzen</button>
    </form>
   </div>
  </aside>
 </div>
</div>
<?php
admin2_close(<<<'JS'
<script>
(()=>{
  const form=document.getElementById('dtp-texts');
  if(form){
    const fields=[...form.querySelectorAll('[data-default]')];
    const changed=document.getElementById('changed-count');
    const sync=(field)=>{
      const button=form.querySelector('.dtp-default[data-target="'+field.id+'"]');
      const isChanged=field.value!==field.dataset.default;
      if(button)button.hidden=!isChanged;
      field.classList.toggle('is-changed',isChanged);
      const count=form.querySelector('[data-count-for="'+field.id+'"]');
      if(count)count.textContent=[...field.value].length;
    };
    fields.forEach(field=>field.addEventListener('input',()=>{sync(field);if(changed)changed.textContent=fields.filter(f=>f.value!==f.dataset.default).length;}));
    form.querySelectorAll('.dtp-default').forEach(button=>button.addEventListener('click',()=>{
      const field=document.getElementById(button.dataset.target);
      field.value=field.dataset.default;field.dispatchEvent(new Event('input'));field.focus();
    }));
    fields.forEach(sync);
  }
  // Show the chosen hero artwork before uploading it.
  const file=document.getElementById('hero-file'),preview=document.getElementById('hero-preview'),meta=document.getElementById('hero-meta');
  let url=null;
  file?.addEventListener('change',()=>{
    if(url)URL.revokeObjectURL(url);
    const chosen=file.files?.[0];
    if(!chosen)return;
    url=URL.createObjectURL(chosen);
    preview.onload=()=>{meta.textContent='Ausgewählt (noch nicht übernommen): '+chosen.name+' · '+preview.naturalWidth+' × '+preview.naturalHeight+' Pixel';};
    preview.src=url;
  });
})();
</script>
JS);
