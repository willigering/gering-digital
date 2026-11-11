<?php
/** Shared ranking for the landing page and the full Highscore. */
function dtp_highscore_board(array $rows, int $learnerId, bool $reveal, bool $fullPage = false): void {
    $profile = static function (array $row, string $class) use ($fullPage): void {
        $id = (int)$row['id'];
        if ($fullPage): ?>
            <button type="button" class="<?=$class?> profile-open" data-profile="<?=$id?>"><?=e($row['username'])?></button>
        <?php else: ?>
            <a class="<?=$class?>" href="highscore.php?profil=<?=$id?>"><?=e($row['username'])?></a>
        <?php endif;
    };
    $showcase = static function (array $row, string $class): void { ?>
        <div class="<?=$class?> hs-showcase" aria-label="Achievement-Vitrine">
            <?php for ($slot = 0; $slot < 3; $slot++): ?>
                <?=isset($row['showcase'][$slot]) ? xp_icon_html($row['showcase'][$slot], true) : '<span class="hs-showcase-empty" aria-label="Leerer Vitrinenplatz">◇</span>'?>
            <?php endfor; ?>
        </div>
    <?php };
    ?>
    <div class="arcade-stage">
        <div class="arcade-mascot" aria-hidden="true">
            <div class="arcade-mascot-art"><span></span></div>
            <span class="arcade-marquee">Highscore</span>
        </div>
        <div class="arcade-champions" role="group" aria-label="Die ersten drei Plätze">
            <?php foreach (array_slice($rows, 0, 3) as $row):
                $rank = (int)$row['rank'];
                $self = (int)$row['id'] === $learnerId;
            ?>
                <article class="arcade-champion rank-<?=$rank?><?=$self ? ' is-self' : ''?>" aria-label="Platz <?=$rank?>"<?=$self && $reveal ? ' data-highscore-reveal' : ''?>>
                    <span class="arcade-rank" aria-hidden="true"><?=$rank?></span>
                    <?php if ($rank === 1): ?><span class="arcade-crown" aria-hidden="true">♛</span><?php endif; ?>
                    <span class="arcade-avatar" aria-hidden="true"></span>
                    <div class="arcade-profile">
                        <div class="hs-name"><?php $profile($row, 'arcade-name'); ?><?php if ($self): ?> <small class="arcade-you">(du)</small><?php endif; ?></div>
                        <span class="arcade-level">Level <?=(int)$row['level']?> · <?=e($row['title'])?></span>
                    </div>
                    <div class="arcade-score"><strong><?=number_format((int)$row['xp'], 0, ',', '.')?></strong><span>XP</span></div>
                    <?php $showcase($row, 'arcade-medals showcase-inline'); ?>
                    <span class="arcade-ach-count"><?=(int)$row['achievements']?> Achievements</span>
                </article>
            <?php endforeach; ?>
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
                            <span class="arcade-avatar" aria-hidden="true"></span>
                            <div class="arcade-runner-info">
                                <div class="hs-name"><?php $profile($row, 'arcade-name'); ?><?php if ($self): ?> <small class="arcade-you">(du)</small><?php endif; ?></div>
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
    <?php endif;
}
