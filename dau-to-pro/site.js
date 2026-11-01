(() => {
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
