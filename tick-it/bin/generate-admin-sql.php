<?php
declare(strict_types=1);
/** Alternative für Hosting ohne PHP-CLI/SSH: lokal SQL erzeugen, dann via phpMyAdmin importieren. */
if (PHP_SAPI!=='cli') {http_response_code(404);exit;}
function line(string $prompt): string {echo $prompt; return trim((string)fgets(STDIN));}
function secret(string $prompt): string {
    echo $prompt;
    if(strtoupper(substr(PHP_OS,0,3))!=='WIN' && function_exists('shell_exec')) {
        shell_exec('stty -echo 2>/dev/null');
        try {$v=rtrim((string)fgets(STDIN),"\r\n");}finally {shell_exec('stty echo 2>/dev/null');echo PHP_EOL;}
        return $v;
    }
    return rtrim((string)fgets(STDIN),"\r\n");
}
$username=line('Admin-Benutzername (3–100 Zeichen): ');
if (strlen($username)<3 || strlen($username)>100) {fwrite(STDERR,"Ungültiger Name.\n");exit(1);}
$password=secret('Passwort (mind. 14 Zeichen): ');
$repeat=secret('Passwort erneut: ');
if (strlen($password)<14 || $password!==$repeat) {fwrite(STDERR,"Passwort ungültig.\n");exit(1);}
$hash=password_hash($password,PASSWORD_ARGON2ID);
if (!$hash) {fwrite(STDERR,"Argon2id ist nicht verfügbar.\n");exit(1);}
// Namen hexkodiert, damit SQL-Zeichen keinen Einfluss auf die Abfrage nehmen.
$nameSql='CONVERT(0x'.bin2hex($username).' USING utf8mb4)';
$hashSql="'".str_replace("'","''",$hash)."'";
echo "\n--- NUR in die leere System-DB importieren; Ausgabe enthält einen Passworthash. ---\n";
echo "INSERT INTO admins (username,password_hash) SELECT $nameSql, $hashSql WHERE NOT EXISTS (SELECT 1 FROM admins);\n";
echo "--- SQL nicht veröffentlichen und nicht ins Git-Repository einchecken! ---\n";
