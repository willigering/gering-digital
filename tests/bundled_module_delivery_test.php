<?php
declare(strict_types=1);
$tmp=tempnam(sys_get_temp_dir(),'dtp-delivery-');putenv('GD_DB_PATH='.$tmp);
require __DIR__.'/../html_project_lib.php';
require_once __DIR__.'/../learner_lib.php';
function delivery_check(bool $ok,string $label): void {if(!$ok)throw new RuntimeException($label);}
$old='<html><head><link rel="icon" href="data:image/webp;base64,OLD_ICON"><link rel="apple-touch-icon" href="touch.png"><style>.hero h1 span{color:orange}</style></head><body><div class="area-tabs"></div>Offline · ohne Login</body></html>';
$out=learner_inject_sync($old,'a1-zahlensysteme','index.html');
delivery_check(substr_count($out,'<!-- DTP-MODULDESIGN START -->')===1,'Imported module receives one theme');
delivery_check(strpos($out,'DTP-MODULDESIGN START')>strpos($out,'color:orange'),'Theme follows stored CSS');
delivery_check(!str_contains($out,'Offline · ohne Login'),'Old no-login label removed');
delivery_check(str_contains($out,'href="/assets/dau-to-pro-pixelpilz.svg?v=20261103"'),'Mushroom favicon is assigned to every delivered module');
delivery_check(!str_contains($out,'data:image/webp;base64,OLD_ICON'),'Embedded legacy favicon is removed');
delivery_check(str_contains($out,'rel="apple-touch-icon"'),'Unrelated touch icon stays intact');
$twice=learner_inject_sync($out,'a1-zahlensysteme','index.html');
delivery_check(substr_count($twice,'<!-- DTP-MODULDESIGN START -->')===1,'No repeated theme');
delivery_check(substr_count($twice,'rel="icon"')===1,'Reinjection does not duplicate the mushroom favicon');
foreach(['subnetsprint'=>'subnet-sprint','osi'=>'osi-sprint'] as $alias=>$canonical) {
    $bundle=hp_bundles()[$canonical];
    delivery_check(hp_current_learning_html('old',$alias,'index.html')===file_get_contents($bundle['path']),'Current bundle for '.$alias);
    delivery_check(hp_current_learning_html('asset',$alias,'asset.html')==='asset','Other imported files remain unchanged');
}
delivery_check(hp_current_learning_html('custom','my-custom-module','index.html')==='custom','Custom modules remain unchanged');
delivery_check(hp_current_learning_html('draft','subnet-sprint','index.html')==='draft','Canonical imported content is preserved');
delivery_check(substr_count($out,'<!-- DTP-UEBUNGSFOKUS START -->')===1,'Imported module receives exercise focus');
delivery_check(substr_count($twice,'<!-- DTP-UEBUNGSFOKUS START -->')===1,'No duplicate exercise focus');
delivery_check(substr_count($out,'<!-- DTP-MODULEINSTIEG START -->')===1,'Legacy module receives learning path reset');
delivery_check(substr_count($twice,'<!-- DTP-MODULEINSTIEG START -->')===1,'Entry reset is injected only once');
delivery_check(strpos($out,'<!-- DTP-MODULEINSTIEG START -->')>strpos($out,'window.__DTP_SYNC__'),'Sync must hydrate storage before tab reset');
$bundled=file_get_contents(__DIR__.'/../lernmodule/a1-zahlensysteme.html');
$bundledOut=learner_inject_sync($bundled,'a1-zahlensysteme','index.html');
delivery_check(substr_count($bundledOut,'<!-- DTP-MODULEINSTIEG START -->')===1,'Bundled module is not double-injected');
echo "Published module delivery: legacy routes, theme, idempotence and custom content passed.\n";
@unlink($tmp);
