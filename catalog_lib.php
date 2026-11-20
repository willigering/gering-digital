<?php
/**
 * Repo-tracked catalogue entries that should appear after a file deploy.
 * Production apps live in SQLite and are not replaced. This only inserts
 * a missing entry once; the admin can afterwards edit, unpublish or delete it.
 */
function catalog_sync(PDO $db): void {
    $flag = $db->prepare("SELECT value FROM settings WHERE key='catalog_sync_sharplab'");
    $flag->execute();
    if ((string)$flag->fetchColumn() === '1') {
        return;
    }

    $existing = $db->prepare('SELECT id FROM apps WHERE name = ?');
    $existing->execute(['SharpLab']);
    if (!$existing->fetchColumn()) {
        $insert = $db->prepare(
            'INSERT INTO apps(name, short_description, play_url, apple_url, source_url, details_url, icon, published, sort_order, status, category)
             VALUES(?,?,?,?,?,?,?,?,?,?,?)'
        );
        $insert->execute([
            'SharpLab',
            'Der interaktive C#-Trainer. Von Basics bis Profi – 27 Lektionen, 216 Übungen, Quiz und eingebauter Compiler.',
            'https://github.com/willigering/SharpLab/releases/latest/download/SharpLab-Windows.zip',
            '',
            'https://github.com/willigering/SharpLab',
            '/sharplab/',
            'assets/uploads/sharplab.png',
            1,
            0,
            'download',
            'windows',
        ]);
    }

    $db->prepare("INSERT INTO settings(key,value) VALUES('catalog_sync_sharplab','1') ON CONFLICT(key) DO UPDATE SET value='1'")->execute();
}
