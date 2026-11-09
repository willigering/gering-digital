/* IT VI.01 · Parallax nur auf der separaten BG-Ebene hinter den Modulkarten.
 * Scroll-Stapel und Inhalte bleiben auf ihren eigenen Ebenen unverändert. */
(() => {
  "use strict";
  const wall=document.querySelector(".itvi-backdrop");
  const calm=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(!wall)return;
  let raf=0;
  const paint=()=>{
    raf=0;
    if(calm.matches){
      wall.style.removeProperty("--itvi-wall-shift");
      return;
    }
    // Scroll-abhängig, weich und auch bei langen Themenblättern ohne Bildkanten.
    const shift=Math.atan(Math.max(0,window.scrollY)/1100)*62;
    wall.style.setProperty("--itvi-wall-shift",shift.toFixed(1)+"px");
  };
  const schedule=()=>{if(!raf)raf=window.requestAnimationFrame(paint)};
  window.addEventListener("scroll",schedule,{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  if(calm.addEventListener)calm.addEventListener("change",schedule);
  schedule();
})();
