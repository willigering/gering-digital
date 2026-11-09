<?php // Included by konto.php after authentication. Never evaluates or grants rewards.
$uid=(int)$learner['id'];$dash=xp_dashboard($uid);$recent=xp_recent($uid);$showcase=xp_showcase($uid);$own=ach_unlocked($uid);
?>
<section class="konto-section konto-recent" aria-labelledby="recent-title">
  <div class="konto-section-head"><h2 id="recent-title">Kürzlich freigeschaltet</h2><a class="text-link" href="#achievements">Alle Erfolge →</a></div>
  <?php if(!$recent): ?><p class="konto-empty">Hier ist noch verdächtig wenig los. Sogar dein Router hat mehr Erfolge.</p><a class="primary-action konto-modules-inline" href="./#lernmodule">Zu den Modulen <span aria-hidden="true">→</span></a><?php else: ?>
  <ul class="ach-grid recent-grid">
  <?php foreach($recent as $item): ?><li class="ach-item is-on tier-<?=e($item['tier'])?>" tabindex="0" aria-describedby="recent-condition-<?=e($item['code'])?>">
    <?=xp_icon_html($item)?><span class="ach-text"><b><?=e($item['name'])?></b><small><?=e($item['subject'])?></small><small><?=e(learner_format_time($item['unlocked_at']))?> · +<?=(int)$item['xp']?> XP</small></span>
    <small class="recent-condition" role="tooltip" id="recent-condition-<?=e($item['code'])?>"><?=e($item['desc'])?></small>
  </li><?php endforeach; ?><li class="konto-modules-cell"><a class="primary-action konto-modules-inline" href="./#lernmodule">Zu den Modulen <span aria-hidden="true">→</span></a></li></ul><?php endif; ?>
</section>
<section class="konto-section konto-card" id="vitrine" aria-labelledby="showcase-title">
  <h2 id="showcase-title">Meine Vitrine</h2><p class="konto-hint">Drei Plätze für deine besten Geschichten. Die Reihenfolge bestimmst du hier. Sichtbar werden sie, wenn du den Highscore einschaltest.</p>
  <div class="showcase-preview" aria-label="Aktuelle Vitrine"><?php for($slot=0;$slot<3;$slot++): ?><?=isset($showcase[$slot])?xp_icon_html($showcase[$slot],true):'<span class="showcase-empty" aria-label="Leerer Platz">◇</span>'?><?php endfor; ?></div>
  <form method="post"><?=$hidden('showcase')?>
    <div class="showcase-slots"><?php for($slot=0;$slot<3;$slot++): ?><label>Platz <?=$slot+1?><select name="slots[<?=$slot?>]"><option value="">Leer lassen</option><?php foreach($own as $code=>$at): if(!isset(ach_catalog()[$code]))continue;$item=ach_catalog()[$code]; ?><option value="<?=e($code)?>"<?=($showcase[$slot]['code']??'')===$code?' selected':''?>><?=e($item['name'])?></option><?php endforeach; ?></select></label><?php endfor; ?></div>
    <button class="secondary-action" type="submit">Vitrine speichern</button>
  </form>
</section>
<section class="konto-section konto-card" aria-labelledby="daily-title">
  <h2 id="daily-title">Dranbleiben lohnt sich</h2>
  <dl class="konto-stats"><div><dt>🔥 Aktueller Streak</dt><dd><?=$dash['streak']?> <small><?=(int)$dash['streak'] === 1 ? 'Tag' : 'Tage'?></small></dd></div><div><dt>🏆 Längster Streak</dt><dd><?=$dash['record']?> <small><?=(int)$dash['record'] === 1 ? 'Tag' : 'Tage'?></small></dd></div><div><dt>⚡ Heutige XP</dt><dd><?=$dash['today']?></dd></div><div><dt>📅 Nächster Wochenbonus</dt><dd><?=$dash['next_week']?> <small><?=(int)$dash['next_week'] === 1 ? 'Tag' : 'Tage'?></small></dd></div></dl>
  <ol class="learning-week" aria-label="Letzte sieben Kalendertage"><?php foreach($dash['week'] as $d): ?><li class="<?=$d['done']?'is-done':''?>"><span aria-hidden="true"><?=$d['done']?'✓':'·'?></span><?=$d['day']?><span class="sr-only"><?=$d['done']?' Tagesziel erfüllt':' Tagesziel offen'?></span></li><?php endforeach; ?></ol>
  <p class="konto-hint">Fünf neue richtige Antworten oder eine erstmals gemeisterte Lernstufe: +10 XP. Lernserie: täglich +5 XP, alle 7 Tage +40 XP, alle 30 Tage +150 XP. Einmal pro Kalendertag (Europe/Berlin). Ein Login ist noch kein Workout fürs Gehirn.</p>
</section>
<section class="konto-section" aria-labelledby="xp-title">
  <h2 id="xp-title">Woher kommen meine XP?</h2><p class="konto-hint">PRO wartet bei <?=number_format(xp_config()['pro_xp'],0,',','.')?> XP. Deine bisherigen XP bleiben erhalten; die neue Levelkurve gilt für alle.</p>
  <div class="xp-columns"><div class="konto-card"><table class="xp-breakdown"><caption class="sr-only">Deine tatsächlichen XP nach Quelle</caption><tbody>
  <?php foreach(['tasks'=>'Richtige Aufgaben','practice'=>'Weiterüben','paths'=>'Lernpfade','exams'=>'Prüfungen','achievements'=>'Achievements','daily'=>'Tägliches Lernen','streak'=>'Streak-Boni','legacy'=>'Übernommene bisherige XP'] as $key=>$label): ?><tr><th scope="row"><?=e($label)?></th><td><?=number_format($dash['sources'][$key]??0,0,',','.')?></td></tr><?php endforeach; ?>
  <tr><th scope="row">Gesamt</th><td><?=number_format(array_sum($dash['sources']),0,',','.')?></td></tr></tbody></table></div>
  <details class="konto-card"><summary>XP-Verlauf · letzte Ereignisse</summary><ol class="xp-history"><?php foreach($dash['history'] as $event): ?><li><span><?=e($event['label'])?><small><?=e(learner_format_time($event['created_at']))?></small></span><b>+<?=(int)$event['xp']?> XP</b></li><?php endforeach; ?></ol></details></div>
</section>
