# Creates your private configuration ON THIS PC. Do not commit or share the generated file.
# Windows PowerShell 5.1+; use from a local clone of gering-digital.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $root "data"
$configPath = Join-Path $dataDir "ai-bridge.php"
if (Test-Path $configPath) {
    throw "Konfiguration existiert bereits: $configPath. Sicherung und Token-Rotation bewusst selbst durchfuehren."
}
if (!(Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }
Write-Host "OPENAI API-Schluessel eingeben (Eingabe bleibt verborgen)." -ForegroundColor Cyan
$secure = Read-Host "OpenAI API-Key" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
if (-not $apiKey.StartsWith("sk-") -or $apiKey.Length -lt 18) {
    throw "Ungueltiger API-Key. Er wurde nicht gespeichert."
}
# Two different credentials: OpenAI key stays server-side; this token stays in your devices.
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$bytes = New-Object byte[] 32
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$clientToken = [BitConverter]::ToString($bytes).Replace("-", "").ToLowerInvariant()
$sha = [System.Security.Cryptography.SHA256]::Create()
try { $digest = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($clientToken)) }
finally { $sha.Dispose() }
$tokenHash = [BitConverter]::ToString($digest).Replace("-", "").ToLowerInvariant()
# Base64 prevents escaping issues in generated PHP, but IS NOT encryption.
$key64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($apiKey))
$content = @"
<?php
// NUR auf STRATO speichern, nie GitHub. data/.htaccess sperrt Webzugriff.
return [
  'openai_api_key' => base64_decode('$key64'),
  'client_token_hash' => '$tokenHash',
  'daily_limit' => 40,
  'minute_limit' => 5,
];
"@
[IO.File]::WriteAllText($configPath, $content, (New-Object System.Text.UTF8Encoding($false)))
$apiKey = $null
$key64 = $null
Write-Host ""
Write-Host "Konfiguration lokal erstellt: $configPath" -ForegroundColor Green
Write-Host "Diese Datei per SFTP MANUELL nach /data/ai-bridge.php auf STRATO kopieren."
Write-Host "Der SFTP-Deploy-Workflow laesst /data/ unveraendert."
Write-Host ""
Write-Host "DEIN PRIVATER SKRIPT-ZUGANGSTOKEN (nur auf deinen Geraeten speichern):" -ForegroundColor Yellow
Write-Host $clientToken
Write-Host "Token in einem Passwortmanager sichern; nicht in GitHub/Chats teilen."
Write-Host "Die OpenAI API-Key-Zeichenfolge gehoert NICHT in Tampermonkey."
