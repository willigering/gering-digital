/* DAU TO PRO – Opt-in update notification; never reload without a click. */
(function () {
  'use strict';
  var cfg=window.__DTP_UPDATE__;
  if (!cfg || !cfg.slug || !cfg.url) return;
  var base=null, pending=null, dock=null, message=null, updateBtn=null;
  function activeExercise() {
    return !!document.querySelector('dialog[open], [role="dialog"][aria-modal="true"], .dtp-practice-dialog[open], .modal.open')
      || !!(document.activeElement && document.activeElement.matches('input:not([type=button]):not([type=submit]),textarea,[contenteditable="true"]'));
  }
  function reveal() {
    if (!dock) {
      dock=document.createElement('aside');
      dock.setAttribute('role','status');
      dock.setAttribute('aria-live','polite');
      dock.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2147483000;max-width:min(390px,calc(100vw - 32px));box-sizing:border-box;padding:17px;border:1px solid var(--cyan,#65dce0);border-radius:13px;background:var(--panel,#10191e);color:var(--text,#f4f1e8);font:600 14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px #0009';
      message=document.createElement('p');
      message.textContent='✨ Neues Update verfügbar. Dein Lernfortschritt bleibt gespeichert. Beende eine gerade offene Aufgabe vor dem Aktualisieren.';
      message.style.cssText='margin:0 0 12px';
      var actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
      updateBtn=document.createElement('button');updateBtn.type='button';updateBtn.textContent='Jetzt aktualisieren';
      var later=document.createElement('button');later.type='button';later.textContent='Später';
      [updateBtn,later].forEach(function(b){b.style.cssText='cursor:pointer;padding:9px 12px;border-radius:8px;border:1px solid var(--cyan,#65dce0);background:var(--panel,#10191e);color:inherit;font:inherit'});
      updateBtn.style.background='var(--cyan,#65dce0)';updateBtn.style.color='#071014';
      later.addEventListener('click',function(){dock.remove();dock=null;});
      updateBtn.addEventListener('click',function(){
        if(activeExercise()){
          message.textContent='🔒 Deine aktuelle Aufgabe hat Vorrang! Schließe sie erst ab. Danach kannst du hier aktualisieren.';
          return;
        }
        try {
          // Module already persist progress to localStorage and, when logged in, sync it.
          // Refuse to reload if browser persistence is blocked.
          var key='dtp-update-probe';
          localStorage.setItem(key,'ok');
          if(localStorage.getItem(key)!=='ok')throw Error('Storage unavailable');
          localStorage.removeItem(key);
        } catch(e) {
          message.textContent='Speichern ist im Browser blockiert. Bitte nicht aktualisieren – dein Fortschritt könnte verloren gehen.';
          return;
        }
        updateBtn.disabled=true;
        message.textContent='Update wird geladen … Dein gespeicherter Lernstand bleibt erhalten.';
        location.reload();
      });
      actions.append(updateBtn,later);dock.append(message,actions);document.body.append(dock);
    }
  }
  function check(){
    if(document.hidden || pending) return;
    fetch(cfg.url+'?slug='+encodeURIComponent(cfg.slug)+'&_='+Date.now(),{cache:'no-store',credentials:'same-origin'})
      .then(function(r){if(!r.ok)throw Error('update unavailable');return r.json()})
      .then(function(data){
        if(!data.revision)return;
        if(base===null)base=data.revision;
        else if(data.revision!==base){pending=data.revision;reveal();}
      }).catch(function(){/* Network errors must never interrupt learning. */});
  }
  function init(){check();setInterval(check,60000);document.addEventListener('visibilitychange',function(){if(!document.hidden)check();});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
