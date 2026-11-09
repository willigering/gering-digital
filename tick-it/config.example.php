<?php
/** Kopieren nach config.local.php (liegt AUSSERHALB des public-Verzeichnisses). */
return [
    'db' => [
        'dsn' => 'mysql:host=localhost;port=3306;dbname=it_support;charset=utf8mb4',
        'user' => 'DATENBANKBENUTZER',
        'password' => 'DATENBANKPASSWORT',
    ],
    'app' => [
        'name' => 'IT Support',
        'https_required' => true,
        'session_idle_minutes' => 120,
        'admin_idle_minutes' => 30,
        'guest_session_days' => 7,
        'max_upload_bytes' => 5 * 1024 * 1024,
    ],
];
