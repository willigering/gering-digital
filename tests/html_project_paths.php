<?php
// Static input-validation smoke tests; no productive database connection required.
require __DIR__.'/../html_project_lib.php';
$validSlugs=['subnet-sprint','bits-zum-bitteren-ende','ipv4-trainer'];
$invalidSlugs=['admin','data','__preview','dau-to-pro','../secret','Test','a','a/b','../../',str_repeat('x',100)];
$validFiles=['index.html','assets/site.css','css/widgets/theme.css','assets/game.mjs','fonts/normal.woff2','icons/app.svg'];
$invalidFiles=['.htaccess','../../config.php','app.php','folder/../foo.html','/root/index.html','C:\\bad\\file.js','files/.hidden.js','script.sh','backup.sqlite','assets/.user.ini'];
foreach($validSlugs as $slug) if(!hp_valid_slug($slug)) throw new RuntimeException('Valid slug rejected: '.$slug);
foreach($invalidSlugs as $slug) if(hp_valid_slug($slug)) throw new RuntimeException('Invalid slug accepted: '.$slug);
foreach($validFiles as $file) if(!hp_file_allowed($file)) throw new RuntimeException('Valid file rejected: '.$file);
foreach($invalidFiles as $file) if(hp_file_allowed($file)) throw new RuntimeException('Invalid file accepted: '.$file);
echo "HTML project path smoke tests: OK\n";
