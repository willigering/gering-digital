<?php
// Static regression for the DeskRecall portal and verified release links.
$root=dirname(__DIR__);
$index=file_get_contents($root.'/index.php');
$page=file_get_contents($root.'/deskrecall/index.php');
$css=file_get_contents($root.'/assets/home-v3.css');
$checks=[
  [strpos($index,'deskrecall-portal-card')!==false,'Windows portal class'],
  [strpos($index,'href="/deskrecall/"')!==false,'Card links to detail page'],
  [strpos($index,'$isHtml||$isSharpLab||$isDeskRecall')!==false,'Clickable portal'],
  [strpos($css,'.deskrecall-portal-card .project-preview-wide>.deskrecall-cover')!==false,'Landscape cover'],
  [strpos($page,'sharplab/sharplab.css')!==false,'Shared layout'],
  [strpos($page,'DeskRecall-\'.$version.\'-portable-win-x64.zip')!==false,'Portable asset'],
  [strpos($page,'DeskRecall-\'.$version.\'-win-x64.zip')!==false,'Small asset'],
  [strpos($page,'/download/dotnet/10.0')!==false,'Runtime link'],
  [is_file($root.'/assets/app-previews/deskrecall.png.webp'),'Local logo'],
  [strpos($page,"../#apps")!==false,'Back link'],
  [is_file($root.'/assets/deskrecall-page-preview.svg'),'Custom landscape artwork'],
  [strpos($page,'id="sl-preview"')!==false,'Shared lightbox'],
  [strpos($page,'virustotal.com/gui/file/')!==false,'VirusTotal hash lookup'],
  [strpos($page,'9bbd1345999d6a026dfcc419fcb4da9c76e5443b52bc68bb6556db3068887473')!==false,'Portable SHA-256'],
  [strpos($page,'1c4aad4e9df07ac8f2fb4a41fffbef6269948ecca2556b265384059a6eb4cc39')!==false,'Small SHA-256']
];
foreach($checks as [$ok,$label]){if(!$ok){fwrite(STDERR,"FAIL: ".$label.PHP_EOL);exit(1);}}
echo "DeskRecall portal checks passed".PHP_EOL;
