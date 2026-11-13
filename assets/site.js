(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const stage = document.querySelector('.hero-stage');
  const hero = document.querySelector('.hero');
  const layers = [...stage.querySelectorAll('[data-parallax]')];
  let targetX=0,targetY=0,x=0,y=0,scroll=0,frame=0,visible=true,glassAngle=0;
  const paint = () => {
    frame=0;
    const enabled=!reduced.matches;
    x+=(targetX-x)*.12;y+=(targetY-y)*.12;
    const desktop=innerWidth>800;
    layers.forEach(el=>{
      const depth=Number(el.dataset.parallax);
      const mouseScale=el.classList.contains("phone")?.18:1;
      el.style.setProperty('--x',`${enabled && fine.matches ? x*depth*130*mouseScale : 0}px`);
      el.style.setProperty('--y',`${enabled && fine.matches ? y*depth*75*mouseScale : 0}px`);
      el.style.setProperty('--s',`${enabled ? scroll*depth*(desktop?1:.38) : 0}px`);
    });
    updateGlass();
    if(enabled && visible && (Math.abs(targetX-x)>.001 || Math.abs(targetY-y)>.001))request();
  };
  const request=()=>{if(!frame)frame=requestAnimationFrame(paint)};
  const onScroll=()=>{scroll=Math.max(0,Math.min(-hero.getBoundingClientRect().top,900));if(visible)request()};
  stage.addEventListener('pointermove',e=>{if(drag || spinning || !fine.matches||reduced.matches)return;const r=stage.getBoundingClientRect();targetX=(e.clientX-r.left)/r.width-.5;targetY=(e.clientY-r.top)/r.height-.5;request()},{passive:true});
  stage.addEventListener('pointerleave',()=>{targetX=targetY=0;request()});
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll,{passive:true});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)onScroll()}).observe(hero);
  reduced.addEventListener('change',()=>{targetX=targetY=0;request()});fine.addEventListener('change',()=>{targetX=targetY=0;request()});onScroll();
  // Pointer distance previews a turn; recent release speed changes duration, never the one-turn limit.
  const phone=stage.querySelector('.phone'),spinControl=document.querySelector('.phone-spin-control');
  const buildChassis=()=>{
    const w=phone.offsetWidth,h=phone.offsetHeight,r=52,points=[];
    // Clockwise rounded perimeter; each chord becomes a real face spanning the depth.
    for(const [cx,cy,start] of [[w-r,r,-90],[w-r,h-r,0],[r,h-r,90],[r,r,180]]){
      for(let step=0;step<=16;step++){const a=(start+step*90/16)*Math.PI/180;points.push([cx+r*Math.cos(a),cy+r*Math.sin(a)])}
    }
    const faces=points.map((point,index)=>{
      const next=points[(index+1)%points.length],dx=next[0]-point[0],dy=next[1]-point[1],face=document.createElement('i');
      face.style.width=`${Math.hypot(dx,dy)+.6}px`;face.style.left=`${(point[0]+next[0])/2}px`;face.style.top=`${(point[1]+next[1])/2}px`;
      face.style.transform=`translate(-50%,-50%) rotateZ(${Math.atan2(dy,dx)}rad) rotateX(90deg)`;return face;
    });phone.querySelector('.phone-volume').replaceChildren(...faces);
  };
  buildChassis();new ResizeObserver(buildChassis).observe(phone);
  let drag=null,spinning=false,spinFrame=0;
  // A stationary studio light reflected by a rotating surface: the highlight
  // sweeps across the glass, strengthens at grazing angles and fades on the rear.
  function updateGlass(){
    const phoneElement=stage.querySelector('.phone');
    const yaw=(glassAngle-15)*Math.PI/180,front=Math.cos(yaw),sweep=Math.sin(yaw);
    const pointer=reduced.matches?0:x*7;
    phoneElement.style.setProperty('--glass-x',`${48+sweep*65+pointer}%`);
    phoneElement.style.setProperty('--glass-opacity',String(Math.max(0,front)*(.4+Math.abs(sweep)*.48)));
    phoneElement.style.setProperty('--glass-light-x',`${18+sweep*105+pointer}%`);
    phoneElement.style.setProperty('--glass-light-y',`${4+(reduced.matches?0:y*18)}%`);
    phoneElement.style.setProperty('--glass-edge',String(Math.max(0,front)*(.3+Math.abs(sweep)*.55)));
    // The edge catches the studio light only as the front reappears after the rear.
    const travelled=Math.abs(glassAngle),phase=travelled%360;
    const glint=!reduced.matches && travelled>180 && phase>304 && phase<338
      ? Math.pow(Math.sin((phase-304)/34*Math.PI),2) : 0;
    phoneElement.style.setProperty('--glint',String(glint));
    phoneElement.style.setProperty('--glint-y',`${(phase-304)*1.1}px`);
    const edge=glassAngle<0?'right':'left';
    const glintElement=phoneElement.querySelector('.phone-edge-glint');
    glintElement.style.left=edge==='left'?'10px':'auto';glintElement.style.right=edge==='right'?'10px':'auto';
  }
  const setSpin=angle=>{glassAngle=angle;phone.style.setProperty('--spin',`${angle}deg`);updateGlass()};
  updateGlass();
  const resetSpin=()=>{cancelAnimationFrame(spinFrame);spinFrame=0;spinning=false;setSpin(0);phone.classList.remove('is-dragging');if(drag && phone.hasPointerCapture(drag.id))phone.releasePointerCapture(drag.id);drag=null};
  const settle=(start,turns,direction,speed)=>{
    if(reduced.matches){resetSpin();return}
    spinning=true;const end=direction*360*Math.min(1,turns);
    const duration=turns===0?380:Math.max(900,Math.min(2600,2600/(1+speed*.8)));
    const began=performance.now();
    const animate=now=>{if(reduced.matches){resetSpin();return}const t=Math.min(1,(now-began)/duration),ease=1-Math.pow(1-t,3);setSpin(start+(end-start)*ease);if(t<1)spinFrame=requestAnimationFrame(animate);else resetSpin()};
    spinFrame=requestAnimationFrame(animate);
  };
  phone.addEventListener('pointerdown',e=>{
    if((e.pointerType==='mouse'&&e.button!==0)||!e.isPrimary||reduced.matches||e.target.closest('a,button'))return;
    resetSpin();drag={id:e.pointerId,start:e.clientX,angle:0,samples:[{x:e.clientX,t:performance.now()}]};
    phone.setPointerCapture(e.pointerId);phone.classList.add('is-dragging');targetX=targetY=0;request();e.preventDefault();
  });
  phone.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const now=performance.now();const restingYaw=parseFloat(getComputedStyle(phone).getPropertyValue('--yaw'))||0;drag.angle=Math.max(-55-restingYaw,Math.min(55-restingYaw,(e.clientX-drag.start)*.45));setSpin(drag.angle);
    drag.samples.push({x:e.clientX,t:now});drag.samples=drag.samples.filter(sample=>now-sample.t<130);if(drag.samples.length>12)drag.samples.shift();
  });
  phone.addEventListener('pointerup',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const last=drag.samples.at(-1),first=drag.samples[0],now=performance.now();
    const velocity=now-last.t>160?0:(last.x-first.x)/Math.max(16,last.t-first.t);
    const distance=e.clientX-drag.start,start=drag.angle;drag=null;phone.classList.remove('is-dragging');phone.releasePointerCapture(e.pointerId);
    const speed=Math.abs(velocity),turns=Math.abs(distance)<12?0:1;
    settle(start,turns,Math.sign(velocity||distance)||1,speed);
  });
  phone.addEventListener('pointercancel',resetSpin);
  phone.addEventListener('lostpointercapture',()=>{if(drag)resetSpin()});
  spinControl.addEventListener('click',()=>{resetSpin();settle(0,1,1,.6)});
  reduced.addEventListener('change',resetSpin);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetSpin()});
  const menu=document.querySelector('.mobile-menu'),menuBtn=document.querySelector('.mobile-menu-btn');
  const closeMenu=()=>{menu.classList.remove('open');menu.setAttribute('aria-hidden','true');menuBtn.setAttribute('aria-expanded','false');menuBtn.setAttribute('aria-label','Menü öffnen');menu.inert=true};
  closeMenu();menuBtn.addEventListener('click',()=>{const open=menuBtn.getAttribute('aria-expanded')!=='true';menu.classList.toggle('open',open);menu.inert=!open;menu.setAttribute('aria-hidden',String(!open));menuBtn.setAttribute('aria-expanded',String(open));menuBtn.setAttribute('aria-label',open?'Menü schließen':'Menü öffnen')});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&menuBtn.getAttribute('aria-expanded')==='true'){closeMenu();menuBtn.focus()}});
  document.addEventListener('click',e=>{if(!e.target.closest('.nav'))closeMenu()});
  matchMedia('(max-width:800px)').addEventListener('change',closeMenu);
  // Catalogue filters work without page reloads and never hide existing project data.
  const filters=document.querySelector('.catalog-filters');
  if(filters){
    const buttons=[...filters.querySelectorAll('.catalog-filter')];
    const cards=[...document.querySelectorAll('#apps .app-card')];
    const empty=document.getElementById('catalog-empty');
    const applyCategory=category=>{
      let visible=0;
      cards.forEach(card=>{
        const show=category==='alle'||card.dataset.category===category;
        card.hidden=!show;
        if(show)visible++;
      });
      buttons.forEach(button=>{
        const active=button.dataset.category===category;
        button.classList.toggle('is-active',active);
        button.setAttribute('aria-pressed',String(active));
      });
      if(empty)empty.hidden=visible>0;
    };
    buttons.forEach(button=>button.addEventListener('click',()=>applyCategory(button.dataset.category)));
    applyCategory(buttons.find(button=>button.classList.contains('is-active'))?.dataset.category||buttons[0]?.dataset.category);
  }
  document.querySelectorAll('.app-card').forEach((card,index)=>{
    const text=card.querySelector('.card-body>p'),button=card.querySelector('.app-details');
    if(button && text){
      text.id=`app-description-${index}`;button.setAttribute('aria-controls',text.id);
      button.addEventListener('click',()=>{const closed=card.classList.toggle('details-closed');button.setAttribute('aria-expanded',String(!closed));button.innerHTML=closed?'Details anzeigen <span>+</span>':'Details ausblenden <span>−</span>'});
    }
    card.addEventListener('pointermove',e=>{if(!fine.matches||reduced.matches)return;const r=card.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;card.style.setProperty('--rx',`${(py-.5)*-5}deg`);card.style.setProperty('--ry',`${(px-.5)*6}deg`);card.style.setProperty('--lx',`${px*100}%`);card.style.setProperty('--ly',`${py*100}%`);card.style.setProperty('--lift','-5px')},{passive:true});
    const reset=()=>{card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg');card.style.setProperty('--lift','0px');card.classList.remove('is-pressed')};
    card.addEventListener('pointerleave',reset);card.addEventListener('pointerdown',()=>card.classList.add('is-pressed'));card.addEventListener('pointerup',()=>card.classList.remove('is-pressed'));card.addEventListener('pointercancel',reset);reduced.addEventListener('change',reset);fine.addEventListener('change',reset);
  });
  const clock=document.getElementById('phone-digital-clock');
  const tick=()=>{if(document.hidden)return;const now=new Date();clock.textContent=now.toLocaleTimeString('de-DE',{hour12:false});clock.dateTime=now.toISOString()};tick();setInterval(tick,1000);
})();
