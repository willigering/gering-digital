/* Gering Digital V3 – scroll light and editorial reveal.
   Die gesamte Smartphone-/Drag-Logik verbleibt unverändert in assets/site.js. */
(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const root=document.documentElement;
  let frame=0;
  function paint(){
    frame=0;
    const y=Math.max(0,scrollY);
    root.style.setProperty('--gdv3-scroll',reduced.matches?'0px':Math.min(y,7000)+'px');
  }
  function queue(){if(!frame)frame=requestAnimationFrame(paint);}
  addEventListener('scroll',queue,{passive:true});
  addEventListener('resize',queue,{passive:true});
  reduced.addEventListener?.('change',queue);
  paint();
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
