(() => {
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
    document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});
    canHover.addEventListener('change',()=>{if(!canHover.matches)reset()});
  })();
  // Parallax: Hintergrund-Ebenen (Textur, Leiterbahnen, Lichtstrahlen) laufen langsamer als der Inhalt,
  // das Hero-Bild zieht beim Wegscrollen etwas schneller nach oben weg. Nur transform/translate, ein rAF pro Frame.
  // Bei reduzierter Bewegung komplett aus.
  (() => {
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const layers=[['.dtp-world-traces',.14],['.dtp-eternal-rays',.08]]
      .map(([sel,speed])=>[document.querySelector(sel),speed]).filter(([el])=>el);
    const hero=document.querySelector('.hero');
    const art=document.querySelector('.hero-art-wrap');
    const marks=[...document.querySelectorAll('.section-mark')];
    const stage=document.querySelector('.dtp-world-texture'); // fest stehende Hintergrundbühne (128vh hoch)
    if(!layers.length&&!art&&!stage)return;
    // Eigene Clip-Ebene, damit verschobene Hintergründe die Seite nicht verlängern.
    // Ohne z-index/isolation: mix-blend-mode der Ebenen wirkt weiter auf den Seitenhintergrund.
    if(layers.length){
      const clip=document.createElement('div');
      clip.className='dtp-parallax-clip';
      clip.setAttribute('aria-hidden','true');
      layers[0][0].before(clip);
      layers.forEach(([el])=>clip.append(el));
    }
    let frame=0,on=false;
    const apply=()=>{
      frame=0;
      const y=on?scrollY:0;
      if(stage){
        const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
        stage.style.translate=on&&y?`0 ${(-(y/max)*.28*innerHeight).toFixed(1)}px`:'';
      }
      layers.forEach(([el,speed])=>{el.style.translate=y?`0 ${(y*speed).toFixed(1)}px`:''});
      const h=hero?hero.offsetHeight:0,inHero=on&&y<h+200;
      if(art)art.style.translate=inHero&&y?`0 ${(-y*.1).toFixed(1)}px`:''; // Bild zieht etwas schneller nach oben weg als der Text
      marks.forEach(el=>{
        if(!on){el.style.translate='';return;}
        const r=el.getBoundingClientRect(),mid=r.top+r.height/2-innerHeight/2;
        el.style.translate=`0 ${(-mid*.18).toFixed(1)}px`;
      });
    };
    const request=()=>{if(!frame)frame=requestAnimationFrame(apply)};
    const update=()=>{on=!reduced.matches;request()};
    addEventListener('scroll',request,{passive:true});
    addEventListener('resize',request,{passive:true});
    reduced.addEventListener('change',update);
    update();
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
    const open=()=>{const el=location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1)));if(el&&el.tagName==='DETAILS')el.open=true};
    open();addEventListener('hashchange',open);
  })();
  const toggle=document.querySelector('.nav-toggle'),menu=document.getElementById('dtp-mobile-menu');
  const closeMenu=()=>{toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Menü öffnen');menu.hidden=true};
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Menü schließen':'Menü öffnen');menu.hidden=!open});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.dtp-nav'))closeMenu()});
  matchMedia('(min-width: 861px)').addEventListener('change',closeMenu);
  // Mehrthemen-Prüfungsfinder: findet ausschließlich tatsächlich veröffentlichte PHP-Module.
  const form=document.getElementById('exam-form');
  const input=document.getElementById('exam-topics');
  const buttons=[...document.querySelectorAll('[data-filter]')];
  const cards=[...document.querySelectorAll('.module-card')];
  const indicator=document.getElementById('result-indicator');
  const empty=document.getElementById('search-empty');
  const reset=document.getElementById('exam-reset');
  if(!input)return;
  let current='alle';
  const normalize=(value)=>String(value||'').toLocaleLowerCase('de-DE')
    .normalize('NFD').replace(/\p{M}/gu,'').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g,' ').trim();
  const ignore=new Set(['ich','will','muss','mich','auf','eine','einen','die','der','das','dem','den','und','oder','zu','zur','zum','fur','meine','meiner','prüfung','prufung','lernen','vorbereiten','themen','thema','uber','mit','sowie','ist','im','in','von','bei','bitte','noch']);
  const aliasGroups=[
    ['ipv4','ip adresse','ip adressen','subnet','subnetting','cidr','wildcard'],
    ['ipv6','slaac','link local'],
    ['osi','schichtenmodell','7 schichten'],
    ['vlan','switch','switching'],
    ['dhcp','dns','netzwerk','router','routing','topologie','wlan'],
    ['dsgvo','datenschutz','datensicherheit','verschlüsselung','verschlusselung','hash','it sicherheit','kryptografie'],
    ['binär','binar','dezimal','hexadezimal','bits'],
    ['wiso','ihk','prufungsvorbereitung']
  ].map(g=>g.map(normalize));
  function words(query){
    return [...new Set(normalize(query).split(' ').filter(w=>w.length>1&&!ignore.has(w)))];
  }
  function equivalent(term){
    const groups=aliasGroups.filter(g=>g.some(a=>a===term||a.split(' ').includes(term)));
    return groups.length?[...new Set(groups.flat())]:[term];
  }
  function containsTerm(haystack,token){
    const phrase=normalize(token);
    return phrase&&(' '+haystack+' ').includes(' '+phrase+' ');
  }
  function showResults(){
    const terms=words(input.value);
    let found=0;
    cards.forEach(card=>{
      const topicOK=current==='alle'||card.dataset.topic===current;
      const haystack=normalize(card.dataset.search);
      const matches=terms.length===0||terms.some(term=>equivalent(term).some(alias=>
        alias&&((alias.length>3&&haystack.includes(alias))||containsTerm(haystack,alias))
      ));
      const show=topicOK&&matches;
      card.hidden=!show;
      card.classList.toggle('is-search-result',show&&terms.length>0);
      if(show)found++;
    });
    const unit=found===1?'Modul':'Module';
    if(indicator)indicator.textContent=terms.length
      ? (found ? found+' passende '+unit+' gefunden' : 'Leider kein passendes Modul gefunden')
      : found+' '+unit+' verfügbar';
    if(empty)empty.hidden=found!==0;
    if(reset)reset.hidden=!input.value.trim()&&current==='alle';
  }
  function setFilter(filter){
    current=filter;
    buttons.forEach(button=>{
      const active=button.dataset.filter===filter;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    showResults();
  }
  input.addEventListener('input',showResults);
  form?.addEventListener('submit',event=>{
    event.preventDefault();
    setFilter('alle');
    const target=document.getElementById('module-grid')||document.querySelector('.catalog-panel');
    target?.scrollIntoView({behavior:motionReduced.matches?'auto':'smooth',block:'start'});
  });
  document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{
    input.value=button.dataset.example||'';
    setFilter('alle');
    input.focus();
  }));
  reset?.addEventListener('click',()=>{input.value='';setFilter('alle');input.focus()});
  buttons.forEach(button=>button.addEventListener('click',()=>setFilter(button.dataset.filter)));
  showResults();
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
