<?php
// Standalone Browser-Fixtures for persistent-radio module navigation.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if (in_array($path,['/osi/','/subnetsprint/'],true)) {
    header('Content-Type: text/html; charset=utf-8');
    header('X-Frame-Options: SAMEORIGIN');
    $other=$path==='/osi/'?'/subnetsprint/':'/osi/';
    echo '<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Testmodul</title></head><body>';
    echo '<h1>Testmodul</h1><dtp-back></dtp-back>';
    echo '<a id="next-module" href="'.htmlspecialchars($other,ENT_QUOTES).'">Nächstes Modul</a>';
    echo '<script>const link=document.createElement("a");link.id="back-module";link.href="/dau-to-pro/#lernmodule";link.textContent="Zurück zur Modulauswahl";document.querySelector("dtp-back").attachShadow({mode:"open"}).append(link);</script>';
    echo '</body></html>';
    exit;
}
// Die PHP-Built-in-Server-Router müssen 'false' zurückgeben, damit statische
// Dateien (JS, CSS, WAV) vom Server selbst ausgeliefert werden.
return require __DIR__.'/router.php';
