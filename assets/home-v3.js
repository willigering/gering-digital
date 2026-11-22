/* Gering Digital V3 – scroll light and editorial reveal.
   Die gesamte Smartphone-/Drag-Logik verbleibt unverändert in assets/site.js. */
(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const compact=matchMedia('(max-width: 800px)');
  const root=document.documentElement;
  let frame=0;
  function paint(){
    frame=0;
    const y=Math.max(0,scrollY);
    root.style.setProperty('--gdv3-scroll',(reduced.matches||compact.matches)?'0px':Math.min(y,7000)+'px');
  }
  function queue(){if(!frame)frame=requestAnimationFrame(paint);}
  function updateScroll(){
    removeEventListener('scroll',queue);
    if(!compact.matches&&!reduced.matches)addEventListener('scroll',queue,{passive:true});
    paint();
  }
  compact.addEventListener('change',updateScroll);
  reduced.addEventListener?.('change',updateScroll);
  updateScroll();
  if(!reduced.matches && 'IntersectionObserver' in window){
    root.classList.add('gdv3-enhanced');
    const io=new IntersectionObserver((entries)=>{
      for(const entry of entries)if(entry.isIntersecting){
        entry.target.classList.add('gdv3-visible');io.unobserve(entry.target);
      }
    },{threshold:.06,rootMargin:'0px 0px -30px 0px'});
    document.querySelectorAll('[data-gdv3-reveal]').forEach(el=>io.observe(el));
  }
})();
