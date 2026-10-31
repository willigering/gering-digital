<?php
require __DIR__.'/lib.php';
$db = db();
$apps = $db->query("SELECT * FROM apps WHERE published=1 ORDER BY sort_order, id DESC")->fetchAll(PDO::FETCH_ASSOC);
$webPages = $db->query("SELECT * FROM html_pages WHERE published=1 ORDER BY updated_at DESC,id DESC")->fetchAll(PDO::FETCH_ASSOC);
foreach ($webPages as $page) {
    $apps[]=['is_html'=>true,'name'=>$page['title'],'short_description'=>$page['description'],
       'category'=>$page['category'],'status'=>'web','icon'=>'assets/gering-digital-logo-icon.png',
       'play_url'=>'','apple_url'=>'','slug'=>$page['slug']];
}
$statusLabels=['entwicklung'=>'In Entwicklung','bald_verfuegbar'=>'Bald verfügbar','google'=>'Bei Google Play','apple'=>'Im Apple App Store','both'=>'Google Play & Apple App Store','web'=>'Online im Browser'];
$categories=project_categories();
$categoryCounts=array_fill_keys(array_keys($categories),0);
foreach ($apps as $app) {
    $category=$app['category']??'apps';
    $categoryCounts[array_key_exists($category,$categories)?$category:'apps']++;
}
?>
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gering Digital – Meine Apps & Programme</title>
<meta name="description" content="Gering Digital ist die persönliche Plattform von Willi: selbst entwickelte Apps und Programme aus Alltagsproblemen, Neugier und Vibe Coding.">
<link rel="stylesheet" href="style.css?v=<?=filemtime(__DIR__.'/style.css')?>">
<link rel="stylesheet" href="assets/personal.css?v=<?=filemtime(__DIR__.'/assets/personal.css')?>">
<link rel="icon" type="image/png" sizes="64x64" href="assets/favicon-64.png">
<link rel="preload" as="image" type="image/webp" href="assets/gering-digital-logo-icon-312.webp" media="(max-width:800px)">

</head>
<body>
<a class="skip-link" href="#apps">Zum Inhalt</a>
<div class="ambient ambient-1" data-parallax="0.10"></div>
<div class="ambient ambient-2" data-parallax="-0.06"></div>
<div class="ambient ambient-3" data-parallax="0.16"></div>
<div class="grain"></div>

<header class="nav glass-nav">
  <div class="wrap navin">
    <a class="brand" href="#top" aria-label="Gering Apps Startseite">
      <picture><source media="(max-width:800px)" type="image/webp" srcset="assets/gering-digital-logo-icon-312.webp"><img class="brand-logo" src="assets/gering-digital-logo-icon.png" alt="Gering Digital Logo"></picture>
      <span><strong>GERING <em>DIGITAL</em></strong><small>EIGENE IDEEN · EIGENE APPS</small></span>
    </a>
    <nav class="desktop-nav"><a href="#top">Startseite</a><a href="#apps">Meine Projekte</a><a href="#ueber-mich">Über mich</a><a href="#leistungen">Wie ich entwickle</a><a href="#anfrage">Kontakt</a></nav>
    <a class="btn small desktop-cta" href="#apps">Projekte <b>→</b></a>
    <button class="mobile-menu-btn" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Menü öffnen"><span></span><span></span><span></span></button>
    <nav class="mobile-menu" id="mobile-menu" aria-hidden="true"><a href="#top">Startseite</a><a href="#apps">Meine Projekte</a><a href="#ueber-mich">Über mich</a><a href="#leistungen">Wie ich entwickle</a><a href="#anfrage">Kontakt</a></nav>
  </div>
</header>
<main id="top">
<section class="hero parallax-section" id="home">
  <div class="hero-lines"></div>
  <div class="hero-grid wrap">
    <div class="hero-copy" data-parallax="0.05">
      <p class="eyebrow">EIGENE APPS · PROGRAMME · EXPERIMENTE</p>
      <h1 class="pd-hero-title">Aus einer Idee wurde eine App.<br><span>Dann noch eine.</span><br>Und irgendwie hört das nicht auf.</h1>
      <div class="pd-hero-text">
        <p class="lead">Ich entwickle Apps, weil mich Dinge nerven, die eigentlich einfacher gehen müssten. Was als kleines Experiment begann, hat sich inzwischen zu einer ziemlich ausgewachsenen Leidenschaft entwickelt.</p>
        <p class="lead">Hier stelle ich meine Apps, Programme und digitalen Experimente vor. Manche lösen echte Alltagsprobleme, andere sind einfach aus Neugier entstanden.</p>
        <p class="lead">Und falls jemand anderes damit auch etwas anfangen kann: umso besser!</p>
      </div>
      <div class="actions"><a class="btn" href="#apps">Meine Projekte entdecken <b>→</b></a></div>
    </div>

    <div class="hero-stage">
      <div class="depth-ring ring-1" data-parallax="0.05"></div>
      <div class="depth-ring ring-2" data-parallax="-0.08"></div>
      <div class="stage-grid" data-parallax="0.025"></div>
      <div class="phone-glow" data-parallax="0.10"></div>
      <div class="phone-orbit orbit-gold" data-parallax="-0.06"></div>
      <div class="phone-orbit orbit-cyan" data-parallax="0.08"></div>

      <div class="phone phone-locked" data-parallax="0.20">
        <div class="phone-volume" aria-hidden="true"></div>
        <div class="phone-back" aria-hidden="true"><div class="phone-camera"><i></i><i></i><i></i><i></i></div><picture><source media="(max-width:800px)" type="image/webp" srcset="assets/gering-digital-logo-icon-312.webp"><img src="assets/gering-digital-logo-icon.png" alt=""></picture></div>
        <div class="phone-frame"><span class="phone-edge-glint" aria-hidden="true"></span>
          <div class="phone-side-button button-a"></div><div class="phone-side-button button-b"></div>
          <div class="phone-screen">
            <div class="phone-notch"></div>
            <div class="appbar phone-brandbar"><div class="phone-brand-lockup"><picture><source media="(max-width:800px)" type="image/webp" srcset="assets/gering-digital-logo-icon-312.webp"><img src="assets/gering-digital-logo-icon.png" alt="Gering Digital"></picture><strong>Gering Digital</strong></div><span>☰</span></div>
            <div class="phone-clock-block" aria-label="Aktuelle Uhrzeit">
              <div class="phone-tagline">DIGITALE IDEEN · REALE LÖSUNGEN.</div>
              <time id="phone-digital-clock" class="phone-digital-clock" datetime="">00:00:00</time>
            </div>
            <div class="contact-hero pd-phone-fill">
              <small>DIGITALE IDEEN · SOFTWARE · APPS</small>
              <h3>Lass uns etwas<br><em>entwickeln!</em></h3>
              <p>Du hast eine Idee?<br>Ich freue mich auf deine Nachricht.</p>
            </div>
            <div class="phone-contact-hit pd-phone-fill"><a class="phone-contact" href="#anfrage"><span class="mail-icon">✉</span><strong>Zum Kontaktformular</strong><b>→</b></a></div>
            <div class="phone-tabs" aria-label="Navigation">
              <a href="#apps"><span class="active">▦<small>Apps</small></span></a>
              <a href="#leistungen"><span>⌘<small>Entwicklung</small></span></a>
              <a href="#anfrage"><span>✉<small>Kontakt</small></span></a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
      <button class="phone-spin-control" type="button" aria-label="Smartphone einmal drehen">↔ Zum Drehen ziehen</button>
  <div class="scroll-hint"><span></span>SCROLL FÜR MEHR</div>
</section>

<section id="apps" class="section apps-section">
  <div class="wrap">
    <div class="glass-panel apps-panel pd-card" data-parallax="0.025">
      <div class="pd-apps-intro">
        <div class="pd-head"><p class="eyebrow">MEINE PROJEKTE</p><h2>Aus dem Alltag. Für den Alltag. <span>Und manchmal einfach so.</span></h2></div>
        <div class="pd-flow">
          <p>Die meisten meiner Projekte beginnen mit einem ziemlich unspektakulären Gedanken:</p>
          <p class="pd-quote">„Das müsste doch auch einfacher gehen.“</p>
          <p>Also versuche ich, eine Lösung zu entwickeln.</p>
          <p>Mal ist es eine praktische Anwendung, mal ein Werkzeug, das ich selbst vermisst habe. Und manchmal entsteht etwas, weil ich einfach wissen wollte, ob ich es hinbekomme.</p>
          <p class="pd-punch">Nicht alles ist perfekt. Aber alles hat einen Grund, warum es entstanden ist.</p>
        </div>
      </div>
      <div class="catalog-filters" role="group" aria-label="Projekte nach Kategorie filtern">
        <button type="button" class="catalog-filter is-active" data-category="alle" aria-pressed="true">Alle <span><?=count($apps)?></span></button>
        <?php foreach($categories as $key=>$label): ?>
        <button type="button" class="catalog-filter" data-category="<?=e($key)?>" aria-pressed="false"><?=e($label)?> <span><?= (int)$categoryCounts[$key] ?></span></button>
        <?php endforeach; ?>
      </div>
      <p id="catalog-empty" class="catalog-empty" role="status" hidden>Hier ist noch nichts gelandet. Aber die Ideen stehen schon Schlange. 😎</p>
      <div class="cards">
      <?php foreach($apps as $app): $preview='assets/app-previews/'.basename($app['icon']).'.webp'; $icon=is_file(__DIR__.'/'.$preview)?$preview:$app['icon']; $st=$app['status']??($app['play_url']?'google':'bald_verfuegbar'); ?>
        <article class="card glass-card app-card" data-category="<?=e(array_key_exists($app['category']??'apps',$categories)?$app['category']:'apps')?>">
          <div class="icon-wrap"><?php if(!empty($app['is_html'])): ?><div class="html-project-icon" aria-hidden="true">&lt;/&gt;</div><?php else: ?><img loading="lazy" width="164" height="164" class="appicon" src="<?=e($icon)?>" alt="<?=e($app['name'])?>"><?php endif; ?></div>
          <div class="card-body"><span class="category-badge"><?=e($categories[$app['category']??'apps']??'Apps')?></span><h3><?=e($app['name'])?></h3><p><?=e($app['short_description'])?></p>
          <div class="app-status status-<?=e($st)?>"><?=e($statusLabels[$st]??$st)?></div>
          <button class="app-details" type="button" aria-expanded="true">Details ausblenden <span>−</span></button><div class="store-links">
          <?php if(!empty($app['is_html'])): ?><a class="store" href="/<?=e($app['slug'])?>/" target="_blank" rel="noopener">Im Browser öffnen <b>↗</b></a><?php endif; ?>
          <?php if(in_array($st,['google','both'],true) && $app['play_url']): ?><a class="store" href="<?=e($app['play_url'])?>" target="_blank" rel="noopener">Google Play <b>↗</b></a><?php endif; ?>
          <?php if(in_array($st,['apple','both'],true) && !empty($app['apple_url'])): ?><a class="store" href="<?=e($app['apple_url'])?>" target="_blank" rel="noopener">Apple App Store <b>↗</b></a><?php endif; ?>
          <?php if($st==='bald_verfuegbar'): ?><span class="store muted">Bald verfügbar</span><?php endif; ?>
          <?php if($st==='entwicklung'): ?><span class="store muted">In Entwicklung</span><?php endif; ?>
          </div></div>
        </article>
      <?php endforeach; ?>
      </div>
    </div>
  </div>
</section>

<section id="ueber-mich" class="section pd-section">
  <div class="wrap">
      <div class="pd-wrap pd-single">
        <div class="pd-head"><p class="eyebrow">ÜBER MICH</p><h2>Hallo, ich bin Willi!</h2><p class="pd-sub">Knapp 20 Jahre Produktion. Und jetzt noch mal was völlig anderes.</p></div>
        <div class="pd-flow">
          <p>Knapp 20 Jahre habe ich in der Produktion gearbeitet. Eine ziemlich lange Zeit, in der ich viel erlebt, einiges gelernt und jede Menge Menschen kennengelernt habe.</p>
          <p>Und nein, ich bereue diese Zeit nicht.</p>
          <p>Im Gegenteil. Ich habe dort unglaublich viel fürs Leben mitgenommen. Vor allem, dass man Probleme am besten anpackt, statt lange darüber zu reden. Dass nicht immer alles nach Plan läuft. Und dass gute Kollegen manchmal mehr wert sind als jede noch so ausgefeilte Technik.</p>
          <p>Gerade die Menschen werde ich sicherlich vermissen.</p>
          <p>Aber irgendwann kam der Punkt, an dem ich mir dachte: War’s das jetzt schon? Oder geht da noch was?</p>
          <p>Offenbar geht da noch was.</p>
          <p>Also habe ich nach fast zwei Jahrzehnten den Sprung gewagt und eine Umschulung zum Fachinformatiker für Systemintegration begonnen.</p>
          <p>Ein kompletter Neuanfang. Noch mal die Schulbank drücken, Netzwerke verstehen, Server konfigurieren und sich freiwillig mit Dingen beschäftigen, bei denen andere schon beim Lesen der Fehlermeldung aufgeben.</p>
          <p class="pd-punch">Und wisst ihr was? Ich freue mich drauf!</p>
        </div>
      </div>
  </div>
</section>

<section id="leistungen" class="section feature-section parallax-section pd-section">
  <div class="feature-orbit orbit-a" data-parallax="0.13"></div>
  <div class="feature-orbit orbit-b" data-parallax="-0.08"></div>
  <div class="wrap">
      <div class="pd-wrap pd-single">
        <div class="pd-head"><p class="eyebrow">WIE ICH ENTWICKLE</p><h2>Ich habe die Ideen. Die KI hilft beim Code. <span>Und ich kümmere mich um den Rest.</span></h2></div>
        <div class="pd-flow">
          <p>Ich mache kein Geheimnis daraus, dass ich künstliche Intelligenz zur Softwareentwicklung einsetze.</p>
          <p>Die Ideen, Anforderungen, Entscheidungen und Überprüfung liegen bei mir.</p>
          <p>Die KI hilft bei der technischen Umsetzung.</p>
          <p>Ein großer Teil meiner Arbeit besteht darin, die KI dazu zu bringen, genau das zu tun, was ich möchte. Und sie anschließend davon abzuhalten, Dinge zu tun, die ich definitiv nicht wollte.</p>
          <p class="pd-punch">KI ist für mich kein Ersatz fürs Lernen, sondern ein ziemlich spannendes Werkzeug dafür.</p>
        </div>
      </div>
  </div>
</section>

<section id="warum" class="section pd-section">
  <div class="wrap">
      <div class="pd-wrap pd-single">
        <div class="pd-head"><p class="eyebrow">WARUM ICH MEINE APPS TEILE</p><h2>Gute Ideen müssen nicht in der eigenen <span>Schublade verstauben.</span></h2></div>
        <div class="pd-flow">
          <p>Meine Anwendungen entstehen zunächst aus eigenen Bedürfnissen. Wenn sie mir helfen, könnten sie vielleicht auch anderen nützlich sein.</p>
          <p>Deshalb möchte ich meine Projekte vorstellen und nach Möglichkeit zum Download anbieten. Einige Apps sind bereits veröffentlicht, andere befinden sich noch in Entwicklung.</p>
          <p class="pd-punch">An Ideen mangelt es jedenfalls nicht. Eher an Stunden pro Tag.</p>
        </div>
      </div>
  </div>
</section>


<section id="anfrage" class="section inquiry-section">
  <div class="wrap">
    <div class="glass-panel inquiry pd-card">
      <div class="inquiry-copy"><p class="eyebrow">KONTAKT</p><h2>Fragen, Ideen oder einen Bug gefunden?<br><span>Immer her damit!</span></h2><div class="pd-flow pd-flow-plain"><p>Ob Lob, Verbesserungsvorschlag oder eine Fehlermeldung, bei der ich mich frage, wie das überhaupt passieren konnte – ich freue mich über Rückmeldungen.</p></div></div>
      <?php if(isset($_GET["sent"])): ?><p class="form-success" role="status">Vielen Dank! Deine Nachricht wurde gespeichert.</p><?php endif; ?>
      <form method="post" action="send.php" class="form glass-inner"><input type="hidden" name="csrf" value="<?=e(csrf())?>">
        <div class="form-row"><label>Name *<input name="name" required maxlength="100" placeholder="Dein Name"></label><label>E-Mail *<input type="email" name="email" required maxlength="180" placeholder="deine@email.de"></label></div>
        <label>Betreff<input name="subject" maxlength="180" placeholder="Worum geht es?"></label>
        <label>Nachricht *<textarea name="message" required maxlength="5000" rows="6" placeholder="Lob, Idee, Bug – raus damit …"></textarea></label>
        <label class="check"><input type="checkbox" name="privacy" required> <span>Ich habe die <a href="datenschutz.php">Datenschutzerklärung</a> gelesen. *</span></label>
        <button class="btn" type="submit">Nachricht senden <b>→</b></button>
      </form>
    </div>
  </div>
</section>
</main>

<footer><div class="wrap footer"><a class="brand" href="#top"><picture><source media="(max-width:800px)" type="image/webp" srcset="assets/gering-digital-logo-icon-312.webp"><img class="brand-logo" src="assets/gering-digital-logo-icon.png" alt="Gering Digital Logo"></picture><span><strong>GERING <em>DIGITAL</em></strong><small>Eigene Ideen. Echte Probleme. Digitale Lösungen.</small></span></a><p class="pd-footer-quote">„Entstanden aus Neugier, einer Portion Hartnäckigkeit und der Frage: Kann man das nicht irgendwie einfacher machen?“</p><div><a href="impressum.php">Impressum</a> · <a href="datenschutz.php">Datenschutz</a> · <a href="admin/">Admin</a></div><small>© <?=date('Y')?> Gering Digital</small></div></footer>

<script src="assets/site.js?v=<?=filemtime(__DIR__.'/assets/site.js')?>" defer></script>
</body></html>
