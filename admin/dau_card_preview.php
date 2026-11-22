<?php
// Exact preview of a public DAU-TO-PRO module card for the admin editor.
// Uses the same renderer (dtp_module_card) and the same stylesheet as /dau-to-pro/.
require __DIR__.'/../lib.php';
require_once __DIR__.'/../dau_lib.php';
require_once __DIR__.'/../nerd_fm_lib.php';
require_login();

$text=static fn(string $key,int $max): string => mb_substr(trim((string)($_GET[$key]??'')),0,$max,'UTF-8');
$width=(int)($_GET['w']??367);
$width=max(260,min(480,$width));
$source=(string)($_GET['source']??'auto');
$stored=(string)($_GET['image']??'');
$image='';
if ($source==='keep' && (preg_match('~^assets/uploads/html-preview-[a-f0-9]{32}\.(?:png|jpg|webp)$~D',$stored) || dtp_preview_bundled_id($stored)!==null)) $image=$stored;
if (str_starts_with($source,'motif:')) {
    $motif=substr($source,6);
    if (isset(dtp_preview_catalog()['motifs'][$motif])) $image=DTP_PREVIEW_DIR.'/'.$motif.'.webp';
}
$module=[
    'slug'=>preg_replace('/[^a-z0-9-]/','',strtolower($text('slug',60))),
    'title'=>$text('title',100)!==''?$text('title',100):'Titel des Lernmoduls',
    'subject'=>$text('subject',60),
    'description'=>$text('description',400),
    'preview_image'=>$image,
    'preview_fit'=>($_GET['fit']??'cover')==='contain'?'contain':'cover',
    'preview_x'=>(int)($_GET['x']??50),
    'preview_y'=>(int)($_GET['y']??0),
];
$resolved=dtp_preview_resolve($module);
header('Cache-Control: no-store, private');
header('X-Frame-Options: SAMEORIGIN');
?>
<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Modulkarten-Vorschau</title>
<link rel="stylesheet" href="../dau-to-pro/style.css?v=<?=filemtime(__DIR__.'/../dau-to-pro/style.css')?>">
<style>
/* Only the surroundings differ: the card itself uses the unchanged public stylesheet. */
html,body{background:#0d1316!important;overflow:hidden}
body:before{display:none}
.preview-shell{padding:12px;width:<?=$width+24?>px}
.preview-shell .module-grid{display:block;width:<?=$width?>px}
.preview-shell .module-card{pointer-events:none}
</style>
</head><body>
<div class="preview-shell"><div class="module-grid"><?=dtp_module_card($module,'../',false,note:nfm_card_note((string)($module['slug']??''),[]))?></div></div>
<script>
// Called by the editor for live changes that need no server round trip (local file, position, fit).
window.dtpCardUpdate=function(state){
  const art=document.querySelector('.module-art');
  let img=art.querySelector('img');
  if(state.src){
    if(!img){
      art.querySelector('.module-art-symbol')?.remove();
      img=document.createElement('img');img.alt='';img.decoding='async';art.prepend(img);art.classList.add('has-image');
    }
    if(img.getAttribute('src')!==state.src){img.removeAttribute('srcset');img.src=state.src;}
  }
  if(img&&state.fit){img.style.objectFit=state.fit;img.style.objectPosition=state.x+'% '+state.y+'%';}
};
window.dtpCardInfo=<?=json_encode(['source'=>$resolved['source'],'label'=>$resolved['label'],'fit'=>$resolved['fit']],JSON_UNESCAPED_UNICODE|JSON_HEX_TAG|JSON_HEX_AMP)?>;
</script>
</body></html>
