(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const stage = document.querySelector('.hero-stage');
  const hero = document.querySelector('.hero');
  const layers = [...stage.querySelectorAll('[data-parallax]')];
  let targetX=0,targetY=0,x=0,y=0,scroll=0,frame=0,visible=true;
  const paint = () => {
    frame=0;
    const enabled=!reduced.matches;
    x+=(targetX-x)*.12;y+=(targetY-y)*.12;
    const desktop=innerWidth>800;
    layers.forEach(el=>{
      const depth=Number(el.dataset.parallax);
      el.style.setProperty('--x',`${enabled && fine.matches ? x*depth*130 : 0}px`);
      el.style.setProperty('--y',`${enabled && fine.matches ? y*depth*75 : 0}px`);
      el.style.setProperty('--s',`${enabled ? scroll*depth*(desktop?1:.38) : 0}px`);
    });
    if(enabled && visible && (Math.abs(targetX-x)>.001 || Math.abs(targetY-y)>.001))request();
  };
  const request=()=>{if(!frame)frame=requestAnimationFrame(paint)};
  const onScroll=()=>{scroll=Math.max(0,Math.min(-hero.getBoundingClientRect().top,900));if(visible)request()};
  stage.addEventListener('pointermove',e=>{if(!fine.matches||reduced.matches)return;const r=stage.getBoundingClientRect();targetX=(e.clientX-r.left)/r.width-.5;targetY=(e.clientY-r.top)/r.height-.5;request()},{passive:true});
  stage.addEventListener('pointerleave',()=>{targetX=targetY=0;request()});
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll,{passive:true});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)onScroll()}).observe(hero);
  reduced.addEventListener('change',()=>{targetX=targetY=0;request()});fine.addEventListener('change',()=>{targetX=targetY=0;request()});onScroll();
  const menu=document.querySelector('.mobile-menu'),menuBtn=document.querySelector('.mobile-menu-btn');
  const closeMenu=()=>{menu.classList.remove('open');menu.setAttribute('aria-hidden','true');menuBtn.setAttribute('aria-expanded','false');menuBtn.setAttribute('aria-label','Menü öffnen');menu.inert=true};
  closeMenu();menuBtn.addEventListener('click',()=>{const open=menuBtn.getAttribute('aria-expanded')!=='true';menu.classList.toggle('open',open);menu.inert=!open;menu.setAttribute('aria-hidden',String(!open));menuBtn.setAttribute('aria-expanded',String(open));menuBtn.setAttribute('aria-label',open?'Menü schließen':'Menü öffnen')});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&menuBtn.getAttribute('aria-expanded')==='true'){closeMenu();menuBtn.focus()}});
  document.addEventListener('click',e=>{if(!e.target.closest('.nav'))closeMenu()});
  matchMedia('(max-width:800px)').addEventListener('change',closeMenu);
  document.querySelectorAll('.app-card').forEach((card,index)=>{
    const text=card.querySelector('.card-body>p'),button=card.querySelector('.app-details');
    text.id=`app-description-${index}`;button.setAttribute('aria-controls',text.id);
    button.addEventListener('click',()=>{const closed=card.classList.toggle('details-closed');button.setAttribute('aria-expanded',String(!closed));button.innerHTML=closed?'Details anzeigen <span>+</span>':'Details ausblenden <span>−</span>'});
    card.addEventListener('pointermove',e=>{if(!fine.matches||reduced.matches)return;const r=card.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;card.style.setProperty('--rx',`${(py-.5)*-5}deg`);card.style.setProperty('--ry',`${(px-.5)*6}deg`);card.style.setProperty('--lx',`${px*100}%`);card.style.setProperty('--ly',`${py*100}%`);card.style.setProperty('--lift','-5px')},{passive:true});
    const reset=()=>{card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg');card.style.setProperty('--lift','0px');card.classList.remove('is-pressed')};
    card.addEventListener('pointerleave',reset);card.addEventListener('pointerdown',()=>card.classList.add('is-pressed'));card.addEventListener('pointerup',()=>card.classList.remove('is-pressed'));card.addEventListener('pointercancel',reset);reduced.addEventListener('change',reset);fine.addEventListener('change',reset);
  });
  const clock=document.getElementById('phone-digital-clock');
  const tick=()=>{if(document.hidden)return;const now=new Date();clock.textContent=now.toLocaleTimeString('de-DE',{hour12:false});clock.dateTime=now.toISOString()};tick();setInterval(tick,1000);
})();
