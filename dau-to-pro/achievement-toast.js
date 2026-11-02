/* DAU TO PRO · Achievement-Popup wie bei Steam: fährt von unten herein, kurzer Ton, fährt wieder hinaus.
   Wird in Lernmodulen zusammen mit sync.js eingebunden und auf der Startseite für das Easter Egg geladen. */
(function () {
  'use strict';
  if (window.dtpAchievementToast) return;
  var toastHost, toastList, queue = [], showing = false;
  var shown = [];
  function celebrate(json) {
    if (!json) return;
    (json.achievements || []).forEach(function (a) {
      if (!a || shown.indexOf(a.code) >= 0) return;
      shown.push(a.code);
      queue.push({ kicker: 'Achievement freigeschaltet · ' + (a.tier_label || ''), title: a.name, text: a.desc, xp: '+' + a.xp + ' XP', tier: a.tier });
    });
    if (json.level_up && json.level) queue.push({ kicker: 'Level up!', title: 'Level ' + json.level.level + ' · ' + json.level.title, text: json.level.xp + ' XP gesammelt.', xp: '', tier: 'level' });
    next();
  }
  function toastMount() {
    if (toastHost || !document.body) return !!toastHost;
    toastHost = document.createElement('dtp-achievement');
    toastHost.setAttribute('style', 'all:initial;position:fixed;right:14px;bottom:0;z-index:2147483001;overflow:hidden;padding:24px 0 14px 24px');
    var root = toastHost.attachShadow ? toastHost.attachShadow({ mode: 'closed' }) : toastHost;
    var css = document.createElement('style');
    css.textContent = [
      ':host{all:initial}',
      '.t{display:grid;grid-template-columns:44px 1fr;gap:4px 12px;align-items:center;width:min(340px,calc(100vw - 28px));box-sizing:border-box;padding:12px 14px;',
      'background:linear-gradient(135deg,rgba(18,22,26,.97),rgba(10,13,15,.97));border:1px solid rgba(234,180,72,.55);border-left:4px solid var(--c,#eab448);',
      'box-shadow:0 14px 38px rgba(0,0,0,.55);font:500 12px/1.35 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#f5f0df;',
      'clip-path:polygon(0 0,96% 0,100% 18%,100% 100%,4% 100%,0 82%);transform:translateY(calc(100% + 40px));transition:transform .4s cubic-bezier(.55,0,.9,.4)}',
      // Wie bei Steam: von unten hereinfahren, kurz stehen bleiben, wieder nach unten verschwinden.
      '.t.on{transform:none;transition:transform .5s cubic-bezier(.16,1,.3,1)}',
      '.i{grid-row:span 3;width:44px;height:44px;display:grid;place-items:center;font-size:24px;background:rgba(255,255,255,.05);border:1px solid var(--c,#eab448)}',
      '.k{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--c,#eab448)}',
      '.n{font-size:15px;font-weight:800;color:#fff}.d{color:#c9cfcf}.x{color:#5fd99a;font-weight:800}',
      '@media (prefers-reduced-motion:reduce){.t{transition:none}}@media print{.t{display:none}}'
    ].join('');
    toastList = document.createElement('div');
    toastList.setAttribute('role', 'status');
    toastList.setAttribute('aria-live', 'polite');
    root.appendChild(css); root.appendChild(toastList);
    document.body.appendChild(toastHost);
    return true;
  }
  var COLORS = { bronze: '#d08b55', silber: '#c8d0d6', gold: '#eab448', platin: '#7fe0e6', witzig: '#c4a8ff', versteckt: '#ff7f8f', level: '#5fd99a' };
  var ICONS = { bronze: '🏆', silber: '🏆', gold: '🏆', platin: '💎', witzig: '🤡', versteckt: '🍄', level: '⚡' };
  // Kurzer, belohnender Ton (Web Audio, keine Datei nötig). Stumm mit localStorage 'dtp-sound' = 'off'.
  var audio = null;
  function ping(tier) {
    try {
      if (localStorage.getItem('dtp-sound') === 'off') return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio = audio || new AC();
      if (audio.state === 'suspended') audio.resume();
      var now = audio.currentTime + 0.02;
      var notes = tier === 'level' ? [523.25, 659.25, 783.99, 1046.5] : tier === 'witzig' ? [392, 523.25, 466.16] : [659.25, 987.77, 1318.5];
      notes.forEach(function (f, i) {
        var o = audio.createOscillator(), g = audio.createGain(), at = now + i * 0.09;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.09, at + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.55);
        o.connect(g); g.connect(audio.destination); o.start(at); o.stop(at + 0.6);
      });
    } catch (e) { /* Ton ist nur Zugabe */ }
  }
  function next() {
    if (showing || !queue.length || !toastMount()) return;
    showing = true;
    var item = queue.shift();
    if (window.dtpAchievementToast) window.dtpAchievementToast.last = item;   // für Tests
    var t = document.createElement('div');
    t.className = 't';
    t.style.setProperty('--c', COLORS[item.tier] || '#eab448');
    [['span', 'i', ICONS[item.tier] || '🏆'], ['span', 'k', item.kicker], ['span', 'n', item.title], ['span', 'd', item.text + (item.xp ? ' ' : '')]].forEach(function (p) {
      var n = document.createElement(p[0]); n.className = p[1]; n.textContent = p[2]; t.appendChild(n);
    });
    if (item.xp) { var x = document.createElement('b'); x.className = 'x'; x.textContent = item.xp; t.lastChild.appendChild(x); }
    toastList.appendChild(t);
    setTimeout(function () { t.classList.add('on'); ping(item.tier); }, 30);
    setTimeout(function () { t.classList.remove('on'); setTimeout(function () { t.remove(); showing = false; next(); }, 450); }, 5200);
  }

  window.dtpAchievementToast = { celebrate: celebrate, show: function (item) { if (item) { queue.push(item); next(); } } };
})();
