/* DAU TO PRO – Opt-in update notification; never reload without a click. */
(function () {
  'use strict';
  var cfg=window.__DTP_UPDATE__;
  if (!cfg || (!cfg.preview && (!cfg.url || !cfg.revision))) return;
  if(window.__dtpUpdateInitialized)return;window.__dtpUpdateInitialized=true;
  var landing=!cfg.slug;
  if(cfg.preview===true)document.addEventListener('dtp:preview-update',function(){if(!pending){pending=true;reveal();}});
  var pending=false, checking=false, audio=null;
  ['pointerdown','keydown'].forEach(function(event){document.addEventListener(event,prepareSound,{once:true});});
  function activeExercise() {
    return !!document.querySelector('body[data-dtp-exam-active], #examRun:not([hidden]), #tab-train[aria-disabled="true"], #tab-path[aria-disabled="true"], dialog[open], [role="dialog"][aria-modal="true"]:not([hidden]), .dtp-practice-dialog[open], .modal.open')
      || !!(document.activeElement && document.activeElement.matches('input:not([type=button]):not([type=submit]),textarea,[contenteditable="true"]'));
  }
  function prepareSound() {
    try {
      if (localStorage.getItem('dtp-sound') === 'off') return;
      var Context=window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      audio=audio || new Context();
      if (audio.state !== 'running') audio.resume().catch(function(){});
    } catch(e) {}
  }
  function ping() {
    try {
      if (!audio || audio.state !== 'running' || localStorage.getItem('dtp-sound') === 'off') return;
      var tone=audio.createOscillator(), gain=audio.createGain(), now=audio.currentTime;
      tone.frequency.setValueAtTime(880,now);
      tone.frequency.setValueAtTime(1175,now+.07);
      gain.gain.setValueAtTime(.035,now);
      gain.gain.exponentialRampToValueAtTime(.001,now+.22);
      tone.connect(gain); gain.connect(audio.destination);
      tone.start(now); tone.stop(now+.22);
    } catch(e) {}
  }
  function followAchievements(dock) {
    var host, resize=new ResizeObserver(position);
    function position() {
      dock.style.bottom=Math.max(92,host ? Math.ceil(host.getBoundingClientRect().height)+8 : 0)+'px';
    }
    function findHost() {
      var next=document.querySelector('dtp-achievement');
      if (next!==host) {
        resize.disconnect();
        host=next;
        if (host) resize.observe(host);
      }
      position();
    }
    new MutationObserver(findHost).observe(document.body,{childList:true});
    findHost();
  }
  function reveal() {
      var dock=document.createElement('aside');
      dock.setAttribute('role','status');
      dock.setAttribute('aria-live','polite');
      dock.style.cssText='position:fixed;right:16px;bottom:92px;z-index:2147483000;max-width:min(390px,calc(100vw - 32px));box-sizing:border-box;padding:17px;border:1px solid var(--cyan,#65dce0);border-radius:13px;background:var(--panel,#10191e);color:var(--text,#f4f1e8);font:600 14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px #0009';
      var message=document.createElement('p');
      message.textContent=landing ? '✨ Neues DAU-TO-PRO-Update verfügbar.' : '✨ Neues Update verfügbar. Dein Lernfortschritt bleibt gespeichert. Beende eine gerade offene Aufgabe vor dem Aktualisieren.';
      message.style.cssText='margin:0 0 12px';
      var actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
      var updateBtn=document.createElement('button');updateBtn.type='button';updateBtn.textContent='Jetzt aktualisieren';
      updateBtn.style.cssText='cursor:pointer;padding:9px 12px;border-radius:8px;border:1px solid var(--cyan,#65dce0);background:var(--cyan,#65dce0);color:#071014;font:inherit';
      updateBtn.addEventListener('click',function(){
        if(activeExercise()){
          message.textContent=landing ? 'Schließe zuerst das offene Formular. Danach kannst du aktualisieren.' : '🔒 Deine aktuelle Aufgabe hat Vorrang! Beende die laufende Übung oder Prüfung. Danach kannst du hier aktualisieren.';
          return;
        }
        try {
          // Module already persist progress to localStorage and, when logged in, sync it.
          // Refuse to reload if browser persistence is blocked.
          var key='dtp-update-probe';
          if (!landing) {
            localStorage.setItem(key,'ok');
            if(localStorage.getItem(key)!=='ok')throw Error('Storage unavailable');
            localStorage.removeItem(key);
          }
        } catch(e) {
          message.textContent='Speichern ist im Browser blockiert. Bitte nicht aktualisieren – dein Fortschritt könnte verloren gehen.';
          return;
        }
        updateBtn.disabled=true;
        message.textContent=landing ? 'Update wird geladen …' : 'Update wird geladen … Dein gespeicherter Lernstand bleibt erhalten.';
        location.reload();
      });
      actions.append(updateBtn);dock.append(message,actions);document.body.append(dock);
      if (typeof ResizeObserver === 'function') followAchievements(dock);
      ping();
  }
  function check(){
    if(document.hidden || pending || checking) return;
    checking=true;
    fetch(landing ? cfg.url : cfg.url+'?slug='+encodeURIComponent(cfg.slug),{cache:'no-store',credentials:'same-origin'})
      .then(function(r){if(!r.ok)throw Error('update unavailable');return r.json()})
      .then(function(data){
        if(!document.hidden && data.revision && data.revision!==cfg.revision){
          pending=true;
          reveal();
        }
      }).catch(function(){/* Network errors must never interrupt learning. */})
      .finally(function(){checking=false;});
  }
  function init(){if(cfg.preview===true)return;check();setInterval(check,60000);document.addEventListener('visibilitychange',function(){if(!document.hidden)check();});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

