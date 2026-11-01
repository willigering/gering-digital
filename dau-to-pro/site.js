(() => {
  // Transparent hero is a dedicated web asset, without sampling its pixels into the backdrop.
  // Calm cinematic focus on a hovered learning module.
  // Slow to appear, noticeably faster (but smooth) to disappear.
  const pointerCanHover=matchMedia('(hover:hover) and (pointer:fine)');
  const motionReduced=matchMedia('(prefers-reduced-motion:reduce)');
  const focusCards=[...document.querySelectorAll('.module-card')];
  if(pointerCanHover.matches && !motionReduced.matches && focusCards.length){
    const overlay=document.createElement('div');
    overlay.className='dtp-focus-overlay';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<i class="dtp-focus-panel dtp-focus-top"></i><i class="dtp-focus-panel dtp-focus-bottom"></i><i class="dtp-focus-panel dtp-focus-left"></i><i class="dtp-focus-panel dtp-focus-right"></i>';
    document.body.append(overlay);
    let current=null,entryTimer=0,exitTimer=0;
    const positionSpotlight=()=>{
      if(!current)return;
      const rect=current.getBoundingClientRect(),pad=9;
      const top=Math.max(0,Math.round(rect.top-pad));
      const bottom=Math.min(innerHeight,Math.round(rect.bottom+pad));
      const left=Math.max(0,Math.round(rect.left-pad));
      const right=Math.min(innerWidth,Math.round(rect.right+pad));
      overlay.style.setProperty('--focus-y',top+'px');
      overlay.style.setProperty('--focus-bottom',bottom+'px');
      overlay.style.setProperty('--focus-height',Math.max(0,bottom-top)+'px');
      overlay.style.setProperty('--focus-x',left+'px');
      overlay.style.setProperty('--focus-right',right+'px');
    };
    const focus=(card)=>{
      clearTimeout(entryTimer);clearTimeout(exitTimer);
      if(current && current!==card)current.classList.remove('is-focus-target');
      current=card;positionSpotlight();card.classList.add('is-focus-target');
      entryTimer=setTimeout(()=>{if(current===card)overlay.classList.add('is-active')},260);
    };
    const unfocus=(card)=>{
      if(current!==card)return;
      clearTimeout(entryTimer);clearTimeout(exitTimer);
      exitTimer=setTimeout(()=>{
        if(current!==card)return;
        overlay.classList.remove('is-active');
        card.classList.remove('is-focus-target');
        current=null;
      },75);
    };
    focusCards.forEach(card=>{
      card.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')focus(card)});
      card.addEventListener('pointerleave',()=>unfocus(card));
    });
    addEventListener('scroll',positionSpotlight,{passive:true});
    addEventListener('resize',positionSpotlight,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden && current)unfocus(current)});
    pointerCanHover.addEventListener('change',()=>{if(current)unfocus(current)});
  }
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
