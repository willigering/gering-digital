<?php
/**
 * Repo-tracked catalogue entries that should appear after a file deploy.
 * Production apps live in SQLite and are not replaced. This only inserts
 * a missing entry once; the admin can afterwards edit, unpublish or delete it.
 */
function catalog_sync(PDO $db): void {
    catalog_sync_app($db, 'catalog_sync_sharplab', 'SharpLab', [
        'Der interaktive C#-Trainer. Von Basics bis Profi – 27 Lektionen, 216 Übungen, Quiz und eingebauter Compiler.',
        'https://github.com/willigering/SharpLab/releases/latest/download/SharpLab-Setup.exe',
        '',
        'https://github.com/willigering/SharpLab',
        '/sharplab/',
        'assets/uploads/sharplab.png',
        1,
        0,
        'download',
        'windows',
    ]);
    catalog_sync_app($db, 'catalog_sync_deskrecall', 'DeskRecall', [
        'Mit Desk Recall legst du einmalig fest, welche Anwendungen auf welchem virtuellen Desktop gestartet werden sollen. Bei jedem Windows-Start stellt die App deine persönliche Arbeitsumgebung automatisch wieder her.',
        'https://github.com/willigering/DeskRecall/releases/latest',
        '',
        'https://github.com/willigering/DeskRecall',
        '/deskrecall/',
        'assets/uploads/deskrecall.png',
        1,
        0,
        'download',
        'windows',
    ]);
}

/**
 * Insert one named catalogue row if the sync flag is unset and no row of that name exists.
 * Never overwrites an existing row. Sets the flag afterwards so later deploys stay put.
 *
 * @param list<string|int> $fields short_description, play_url, apple_url, source_url, details_url, icon, published, sort_order, status, category
 */
function catalog_sync_app(PDO $db, string $flagKey, string $name, array $fields): void {
    $flag = $db->prepare('SELECT value FROM settings WHERE key=?');
    $flag->execute([$flagKey]);
    if ((string)$flag->fetchColumn() === '1') {
        return;
    }

    $existing = $db->prepare('SELECT id FROM apps WHERE name = ?');
    $existing->execute([$name]);
    if (!$existing->fetchColumn()) {
        $insert = $db->prepare(
            'INSERT INTO apps(name, short_description, play_url, apple_url, source_url, details_url, icon, published, sort_order, status, category)
             VALUES(?,?,?,?,?,?,?,?,?,?,?)'
        );
        $insert->execute(array_merge([$name], $fields));
    }

    $db->prepare("INSERT INTO settings(key,value) VALUES(?,'1') ON CONFLICT(key) DO UPDATE SET value='1'")->execute([$flagKey]);
}
