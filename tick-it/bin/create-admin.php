<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
require_once __DIR__.'/../app/bootstrap.php';
function read_secret(string $prompt): string {
    echo $prompt;
    if(strtoupper(substr(PHP_OS,0,3))!=='WIN' && function_exists('shell_exec')) {
        shell_exec('stty -echo 2>/dev/null');
        try { $secret=trim((string)fgets(STDIN)); }
        finally { shell_exec('stty echo 2>/dev/null');echo PHP_EOL; }
        return $secret;
    }
    return trim((string)fgets(STDIN)); // Windows: Eingabe kann sichtbar sein; sicheren Terminal nutzen.
}
try {
    $exists=one('SELECT COUNT(*) n FROM admins');
    if((int)$exists['n']>0) {fwrite(STDERR,"Ein Administrator existiert bereits. Passwortänderung erfolgt im Adminbereich.\n");exit(1);}
    echo "Erstinstallation IT Support – Dozentenkonto\n";
    echo "Benutzername (3–100 Zeichen): ";$username=trim((string)fgets(STDIN));
    if(mb_strlen($username)<3 || mb_strlen($username)>100) throw new RuntimeException('Benutzername ungültig.');
    $password=read_secret('Neues Passwort (mind. 14 Zeichen): ');
    $repeat=read_secret('Passwort wiederholen: ');
    if(strlen($password)<14 || strlen($password)>1024 || $password!==$repeat) throw new RuntimeException('Passwörter stimmen nicht überein oder sind zu kurz.');
    $hash=password_hash($password,PASSWORD_ARGON2ID);
    sql('INSERT INTO admins (username,password_hash) VALUES (?,?)',[$username,$hash]);
    echo "Administratorkonto angelegt. Kein Passwort wird in Dateien oder Logs ausgegeben.\n";
}catch(Throwable $e){fwrite(STDERR,'Fehler: '.$e->getMessage().PHP_EOL);exit(1);}
