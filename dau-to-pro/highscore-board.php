<?php
/** Shared ranking for the landing page and the full Highscore. */
require_once __DIR__.'/../avatare_lib.php';
function dtp_highscore_board(array $rows, int $learnerId, bool $reveal, bool $fullPage = false): void {
    $avatars = dtp_avatar_for_rows_safe($rows);
    // Hex-Fassung: gewählter Avatar mit Zubehör; ohne Wahl (oder freier Platz) bleibt der bisherige Platzhalter.
    $avatar = static function (?array $row) use ($avatars): string {
        $cfg = $row ? ($avatars[(int)$row['id']] ?? null) : null;
        return '<span class="arcade-avatar'.($cfg ? ' has-avatar' : '').'" aria-hidden="true">'.dtp_avatar_stack_html($cfg).'</span>';
    };
    $profile = static function (array $row) use ($fullPage, $learnerId): string {
        $id = (int)$row['id'];
        $name = e($row['username']);
        if (!$learnerId) return '<span class="arcade-name">'.$name.'</span>';
        if ($fullPage) {
            return '<button type="button" class="arcade-name profile-open" data-profile="'.$id.'">'.$name.'</button>';
        }
        return '<a class="arcade-name" href="highscore.php?profil='.$id.'">'.$name.'</a>';
    };
    $showcase = static function (array $row, string $class): void { ?>
        <div class="<?=$class?> hs-showcase" aria-label="Achievement-Vitrine">
            <?php for ($slot = 0; $slot < 3; $slot++): ?>
                <?=isset($row['showcase'][$slot]) ? xp_icon_html($row['showcase'][$slot], true) : '<span class="hs-showcase-empty" aria-label="Leerer Vitrinenplatz">◇</span>'?>
            <?php endfor; ?>
        </div>
    <?php };
    ?>
    <div class="arcade-stage<?=$fullPage ? '' : ' arcade-stage--landing'?>">
        <?php if (!$fullPage): ?>
            <header class="arcade-heading">
                <h2 id="hs-title">Wer ist schon <span>PRO?</span></h2>
                <p>Die besten Lernenden nach XP.</p>
            </header>
        <?php endif; ?>
        <div class="arcade-champions" role="group" aria-label="Die ersten drei Plätze">
            <?php for ($rank = 1; $rank <= 3; $rank++):
                $row = $rows[$rank - 1] ?? null;
                $self = $row && (int)$row['id'] === $learnerId;
            ?>
                <article class="arcade-champion rank-<?=$rank?><?=$row ? '' : ' is-vacant'?><?=$self ? ' is-self' : ''?>" aria-label="Platz <?=$rank?>"<?=$self && $reveal ? ' data-highscore-reveal' : ''?>>
                    <div class="arcade-rank" aria-hidden="true">
                        <?php if ($rank === 1): ?><span class="arcade-crown">♛</span><?php endif; ?>
                        <span><?=$rank?></span>
                    </div>
                    <span class="arcade-frame-glints" aria-hidden="true"></span>
                    <?=$avatar($row)?>
                    <?php if ($row): ?>
                    <div class="arcade-profile">
                        <div class="hs-name"><?=$profile($row)?><?php if ($self): ?> <small class="arcade-you">(du)</small><?php endif; ?></div>
                        <span class="arcade-level">Level <?=(int)$row['level']?> · <?=e($row['title'])?></span>
                    </div>
                    <div class="arcade-score"><strong><?=number_format((int)$row['xp'], 0, ',', '.')?></strong><span>XP</span></div>
                    <?php $showcase($row, 'arcade-medals showcase-inline'); ?>
                    <span class="arcade-ach-count"><?=(int)$row['achievements']?> Achievements</span>
                    <?php else: ?>
                        <span class="arcade-name">Platz frei</span>
                    <?php endif; ?>
                </article>
            <?php endfor; ?>
        </div>
    </div>
    <?php if (count($rows) > 3): ?>
        <section class="arcade-next-places" aria-labelledby="arcade-next-title" data-arcade-scroll>
            <h3 class="arcade-next-head" id="arcade-next-title">Weitere Plätze</h3>
            <div class="arcade-rail-wrap">
                <button class="arcade-arrow arcade-prev" type="button" aria-label="Vorherige Plätze">‹</button>
                <ol class="arcade-rail" start="4" tabindex="0" aria-label="Plätze ab Rang vier, horizontal scrollbar">
                    <?php foreach (array_slice($rows, 3) as $row):
                        $rank = (int)$row['rank'];
                        $self = (int)$row['id'] === $learnerId;
                    ?>
                        <li class="arcade-runner<?=$self ? ' is-self' : ''?>" aria-label="Platz <?=$rank?>"<?=$self && $reveal ? ' data-highscore-reveal' : ''?>>
                            <span class="arcade-runner-rank" aria-hidden="true"><?=$rank?></span>
                            <?=$avatar($row)?>
                            <div class="arcade-runner-info">
                                <div class="hs-name"><?=$profile($row)?><?php if ($self): ?> <small class="arcade-you">(du)</small><?php endif; ?></div>
                                <span>Level <?=(int)$row['level']?> · <?=e($row['title'])?></span>
                                <strong><?=number_format((int)$row['xp'], 0, ',', '.')?> <small>XP</small></strong>
                                <span><?=(int)$row['achievements']?> Achievements</span>
                            </div>
                            <?php $showcase($row, 'arcade-runner-medals showcase-inline'); ?>
                        </li>
                    <?php endforeach; ?>
                </ol>
                <button class="arcade-arrow arcade-next" type="button" aria-label="Nächste Plätze">›</button>
                <div class="arcade-progress" aria-hidden="true"><span></span></div>
            </div>
            <p class="arcade-scroll-hint">Mit dem Mausrad, den Pfeilen oder per Wischgeste durch die Plätze</p>
        </section>
    <?php elseif (!$fullPage): ?>
        <section class="arcade-next-places arcade-next-places--empty" aria-labelledby="arcade-next-title">
            <h3 class="arcade-next-head" id="arcade-next-title">Weitere Plätze</h3>
            <p>Sobald Platz 4 belegt ist, erscheint er hier.</p>
        </section>
    <?php endif;
}
