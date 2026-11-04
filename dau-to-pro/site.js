(() => {
  const motionReduced=matchMedia('(prefers-reduced-motion: reduce)');
  // Modul-Fokus wie in der Designvorlage: linearer Aufbau (~4,1 s), schnelles, weiches Ausblenden.
  // Nicht die Deckkraft eines fertig weichgezeichneten Layers animieren:
  // Blur, Helligkeit, Sättigung und Abdunkelung werden in jedem Frame gemeinsam gesetzt.
  (() => {
    const canHover=matchMedia('(hover:hover) and (pointer:fine)');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const cards=[...document.querySelectorAll('.module-card')];
    if(!cards.length||!canHover.matches||reduced.matches)return;
    const overlay=document.createElement('div');
    overlay.className='dtp-focus-overlay';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<i class="dtp-focus-panel dtp-focus-top"></i><i class="dtp-focus-panel dtp-focus-bottom"></i><i class="dtp-focus-panel dtp-focus-left"></i><i class="dtp-focus-panel dtp-focus-right"></i>';
    document.body.append(overlay);
    const ENTER_MS=4100,EXIT_MS=920,INTENT_MS=150;
    let current=null,progress=0,frame=0,entryTimer=0,exitTimer=0;
    const paint=value=>{
      progress=Math.max(0,Math.min(1,value));
      overlay.style.setProperty('--focus-blur',(5.5*progress).toFixed(3)+'px');
      overlay.style.setProperty('--focus-dim',(0.22*progress).toFixed(4));
      overlay.style.setProperty('--focus-brightness',(1-0.24*progress).toFixed(4));
      overlay.style.setProperty('--focus-saturation',(1-0.35*progress).toFixed(4));
      overlay.classList.toggle('is-rendering',progress>0);
    };
    paint(0);
    const layout=()=>{
      if(!current)return;
      if(current.hidden){hide(current);return;}
      const b=current.getBoundingClientRect(),pad=9;
      const y=Math.max(0,Math.round(b.top-pad));
      const bottom=Math.min(innerHeight,Math.round(b.bottom+pad));
      const x=Math.max(0,Math.round(b.left-pad));
      const right=Math.min(innerWidth,Math.round(b.right+pad));
      overlay.style.setProperty('--focus-y',y+'px');
      overlay.style.setProperty('--focus-bottom',bottom+'px');
      overlay.style.setProperty('--focus-height',Math.max(0,bottom-y)+'px');
      overlay.style.setProperty('--focus-x',x+'px');
      overlay.style.setProperty('--focus-right',right+'px');
    };
    const animateTo=target=>{
      cancelAnimationFrame(frame);
      const from=progress,distance=Math.abs(target-from);
      if(distance<.00001){paint(target);return;}
      const started=performance.now();
      const duration=(target>from?ENTER_MS:EXIT_MS)*distance;
      const tick=now=>{
        const t=Math.min(1,(now-started)/duration);
        // Eintritt: exakt linear. Austritt: schneller Beginn, sanftes Ende.
        paint(from+(target-from)*(target>from?t:1-Math.pow(1-t,3)));
        if(t<1)frame=requestAnimationFrame(tick);
      };
      frame=requestAnimationFrame(tick);
    };
    const show=card=>{
      clearTimeout(entryTimer);clearTimeout(exitTimer);
      if(current&&current!==card)current.classList.remove('is-focus-target');
      current=card;
      layout();
      card.classList.add('is-focus-target');
      // Schnelles Vorbeistreichen soll keinen abgebrochenen Fokus hinterlassen.
      entryTimer=setTimeout(()=>{if(current===card)animateTo(1)},INTENT_MS);
    };
    function hide(card){
      if(current!==card)return;
      clearTimeout(entryTimer);clearTimeout(exitTimer);
      exitTimer=setTimeout(()=>{
        if(current!==card)return;
        current.classList.remove('is-focus-target');
        current=null;
        animateTo(0);
      },60);
    }
    const reset=()=>{
      clearTimeout(entryTimer);clearTimeout(exitTimer);
      if(current)current.classList.remove('is-focus-target');
      current=null;cancelAnimationFrame(frame);paint(0);
    };
    cards.forEach(card=>{
      card.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')show(card)});
      card.addEventListener('pointerleave',()=>hide(card));
    });
    addEventListener('scroll',layout,{passive:true});
    addEventListener('resize',layout,{passive:true});
    document.getElementById("module-grid")?.addEventListener("toggle",layout,true);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});
    canHover.addEventListener('change',()=>{if(!canHover.matches)reset()});
  })();
  // Tiefenbewegung als ein System: Je weiter hinten eine Ebene liegt, desto langsamer läuft sie mit.
  // Alles hängt am Scrollfortschritt der ganzen Seite (keine harten Grenzen, an denen etwas plötzlich stehen bleibt)
  // und wird auf Desktop weich nachgeführt. Vorne: Inhalt (1,0). Dahinter: Leiterbahnen, Lichtstrahlen, Platine.
  (() => {
    const reduced=motionReduced;
    const compact=matchMedia('(max-width: 860px)');
    const finePointer=matchMedia('(hover:hover) and (pointer:fine)');
    // Rückstand der seitenlangen Ebenen gegenüber dem Inhalt am Seitenende (px): größer = weiter hinten.
    const layers=[['.dtp-world-traces',150],['.dtp-eternal-rays',260]]
      .map(([sel,lag])=>[document.querySelector(sel),lag]).filter(([el])=>el);
    const stage=document.querySelector('.dtp-world-texture');
    const shots=[...document.querySelectorAll('.module-art.has-image img')];
    if(!layers.length&&!stage)return;
    if(layers.length){
      const clip=document.createElement('div');
      clip.className='dtp-parallax-clip';
      clip.setAttribute('aria-hidden','true');
      layers[0][0].before(clip);
      layers.forEach(([el])=>clip.append(el));
    }
    let frame=0,on=false,smooth=-1;
    const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
    const apply=()=>{
      frame=0;
      const target=on?Math.max(0,scrollY):0;
      // Weiches Nachführen nur mit Maus/Trackpad; auf Touch-Geräten direkt, damit nichts schwimmt.
      const glide=on&&finePointer.matches&&!compact.matches&&smooth>=0;
      smooth=glide?smooth+(target-smooth)*.16:target;
      if(Math.abs(target-smooth)<.3)smooth=target;
      const y=smooth;
      const scale=compact.matches?.5:1;
      const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
      const progress=clamp(y/max,0,1);
      if(stage)stage.style.translate=on&&y?`0 ${(-progress*.28*innerHeight*scale).toFixed(1)}px`:'';
      layers.forEach(([el,lag])=>{
        el.style.translate=on&&y?`0 ${(progress*lag*scale).toFixed(1)}px`:'';
      });
      // Modulbilder: das Motiv gleitet im Kartenfenster leicht gegen die Scrollrichtung (Fenster-Effekt).
      shots.forEach(img=>{
        if(!on||getComputedStyle(img).objectFit!=='cover'){img.style.translate='';img.style.scale='';return;}
        const box=img.parentElement.getBoundingClientRect();
        if(box.bottom<-80||box.top>innerHeight+80)return;
        const offset=clamp((box.top+box.height/2-innerHeight/2)/innerHeight,-1,1);
        img.style.scale='1.08';
        img.style.translate=`0 ${(offset*box.height*.035).toFixed(1)}px`;
      });
      if(smooth!==target)request();
    };
    const request=()=>{if(!frame)frame=requestAnimationFrame(apply)};
    const update=()=>{on=!reduced.matches;request()};
    addEventListener('scroll',request,{passive:true});
    addEventListener('resize',request,{passive:true});
    reduced.addEventListener('change',update);
    compact.addEventListener('change',request);
    // Details, Suchfilter, Bildnachladen und eigene Admin-Texte ändern die Seitenhöhe.
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(request).observe(document.body);
    update();
  })();
  (() => {
    if (!document.querySelector('.hs-achievements')) return;
    const openAchievements = () => {
      if (!/^#hs-achievements-\d+$/.test(location.hash)) return;
      const details = document.getElementById(location.hash.slice(1));
      if (details?.tagName === 'DETAILS') { details.open = true; details.scrollIntoView({block:'center'}); }
    };
    openAchievements(); addEventListener('hashchange',openAchievements);
  })();
  // Einmalige, kurze Einblendung. Ohne Observer oder bei reduzierter Bewegung bleibt alles sichtbar.
  (() => {
    if(motionReduced.matches||typeof IntersectionObserver==='undefined')return;
    const elements=[...document.querySelectorAll('[data-reveal]')];
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    },{threshold:.08});
    elements.forEach(el=>{el.classList.add('will-reveal');observer.observe(el)});
    motionReduced.addEventListener('change',()=>{
      if(!motionReduced.matches)return;
      elements.forEach(el=>el.classList.add('is-revealed'));
      observer.disconnect();
    });
  })();
  // „Mein Konto“-Menü: auf-/zuklappen, Escape und Klick daneben schließen.
  (() => {
    const btn=document.querySelector('.nav-account-menu>.nav-account'),panel=document.getElementById('dtp-account-panel');
    if(!btn||!panel)return;
    const set=open=>{btn.setAttribute('aria-expanded',String(open));panel.hidden=!open};
    btn.addEventListener('click',()=>set(btn.getAttribute('aria-expanded')!=='true'));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){set(false);btn.focus()}});
    document.addEventListener('pointerdown',e=>{if(!e.target.closest('.nav-account-menu'))set(false)});
    panel.addEventListener('focusout',e=>{if(!e.relatedTarget||!e.relatedTarget.closest('.nav-account-menu'))set(false)});
  })();
  // Konto-Einstellungen: Sprungziel (z. B. #change_password) gleich aufgeklappt zeigen.
  (() => {
    if(!document.querySelector('details.settings-item'))return; // nur auf der Kontoseite
    const open=()=>{const el=location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1)));if(el&&el.tagName==='DETAILS')el.open=true};
    open();addEventListener('hashchange',open);
  })();
  (() => {
    const toggle=document.querySelector('.nav-toggle'),menu=document.getElementById('dtp-mobile-menu');
    if(!toggle||!menu)return;
    const closeMenu=()=>{toggle.setAttribute('aria-expanded','false');menu.hidden=true};
    toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));menu.hidden=!open});
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();toggle.focus()}});
    document.addEventListener('pointerdown',e=>{if(!e.target.closest('.dtp-nav'))closeMenu()});
    matchMedia('(min-width: 861px)').addEventListener('change',closeMenu);
  })();
  // Themen-Tabs bleiben unabhängig vom entfernten Prüfungsfinder bedienbar.
  const buttons=[...document.querySelectorAll('[data-filter]')];
  const cards=[...document.querySelectorAll('.module-card')];
  const empty=document.getElementById('search-empty');
  const grid=document.getElementById('module-grid');
  function setFilter(topic){
    let shown=0;
    cards.forEach(card=>{
      const visible=topic==='alle'||card.dataset.topic===topic;
      card.hidden=!visible;
      if(visible)shown++;
    });
    if(grid)grid.dataset.count=String(shown);
    if(empty)empty.hidden=shown!==0;
    buttons.forEach(button=>{
      const active=button.dataset.filter===topic;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }
  buttons.forEach(button=>button.addEventListener('click',()=>setFilter(button.dataset.filter)));
  if(buttons.length)setFilter('alle');
})();


/* Orange Linien als echte, nahtlose Webseitenebene (nicht im Hero-Bild). */
(() => {
  const svg=document.getElementById('dtp-full-page-rays');
  const root=document.getElementById('dtp-ray-strokes');
  if(!svg||!root) return;
  const NS='http://www.w3.org/2000/svg';
  let raf=0, previous='';
  function render(){
    raf=0;
    const w=Math.max(document.documentElement.clientWidth,320);
    const h=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);
    const signature=w+':'+h;
    if(signature===previous) return;
    previous=signature;
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const fragment=document.createDocumentFragment();
    const gap=Math.max(850,Math.min(1490,w*1.10));
    // Gleiche Richtung wie die originale orange Ecke: links unten -> rechts oben.
    // Mehrere identische komplette Linien reichen durch alle Seitenbereiche.
    for(let i=0,y=460;y<h+w+300;y+=gap,i++){
      const main=`M -130 ${y+130} L ${w+130} ${y-(w+130)}`;
      const parallel=`M -130 ${y+185} L ${w+130} ${y+55-(w+130)}`;
      for(const [cls,d] of [['beam-glow',main],['beam-halo',main],['beam-core',main],['beam-echo',parallel]]){
        const path=document.createElementNS(NS,'path');
        path.setAttribute('class',cls);
        path.setAttribute('d',d);
        if(i%2===1) path.style.opacity=cls==='beam-core'?'.48':cls==='beam-echo'?'.17':'.22';
        fragment.appendChild(path);
      }
    }
    root.replaceChildren(fragment);
  }
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(render)};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
  window.addEventListener('load',schedule,{once:true});
  window.addEventListener('resize',schedule,{passive:true});
  if('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
})();


(() => {
  const notice=document.querySelector('#hinweis details');
  if(!notice)return;
  const openNotice=()=>{if(location.hash==='#hinweis')notice.open=true};
  document.querySelectorAll('a[href="#hinweis"]').forEach(link=>link.addEventListener('click',()=>{notice.open=true}));
  openNotice();addEventListener('hashchange',openNotice);
})();


