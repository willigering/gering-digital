<?php
declare(strict_types=1);
$file=tempnam(sys_get_temp_dir(),'dtp-presentation-');
putenv('GD_DB_PATH='.$file);
require __DIR__.'/../dau_lib.php';
function expect(bool $ok,string $label): void {if(!$ok)throw new RuntimeException($label);echo "OK: $label\n";}
$db=db();
try {
    dtp_setting_set('dtp.meta_2','Kein Login');
    expect(dtp_page_content()['meta_2']==='Mit persönlichem Lernkonto','Gespeicherter alter Login-Hinweis wird ersetzt');
    dtp_setting_set('dtp.meta_2','Dein eigener Lernfortschritt');
    expect(dtp_page_content()['meta_2']==='Dein eigener Lernfortschritt','Eigener Hinweis bleibt erhalten');
    $insert=$db->prepare('INSERT INTO html_pages(slug,title,preview_image) VALUES(?,?,?)');
    $insert->execute(['osi-sprint','OSI','assets/uploads/old-osi.png']);
    $insert->execute(['subnet-sprint','Subnetting','assets/uploads/old-subnet.png']);
    $insert->execute(['anderes-modul','Hardware','assets/uploads/hardware.png']);
    $old=$db->query("SELECT * FROM html_pages WHERE slug='osi-sprint'")->fetch(PDO::FETCH_ASSOC);
    $preview=dtp_preview_resolve($old);
    expect($preview['source']==='auto' && $preview['motif']==='osi-modell','Bereits gelesene OSI-Karte verwendet aktuelles Motiv');
    expect($db->query("SELECT preview_image FROM html_pages WHERE slug='subnet-sprint'")->fetchColumn()==='','Alte Subnetting-Miniatur zurückgesetzt');
    expect($db->query("SELECT preview_image FROM html_pages WHERE slug='anderes-modul'")->fetchColumn()==='assets/uploads/hardware.png','Andere Vorschauen bleiben erhalten');
    $db->exec("UPDATE html_pages SET preview_image='assets/uploads/neues-bild.png' WHERE slug='osi-sprint'");
    dtp_retire_legacy_previews();
    expect($db->query("SELECT preview_image FROM html_pages WHERE slug='osi-sprint'")->fetchColumn()==='assets/uploads/neues-bild.png','Spätere Bildänderungen bleiben erhalten');
} finally {unlink($file);}
