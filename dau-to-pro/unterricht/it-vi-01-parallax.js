/* IT VI.01: Parallax der vorhandenen Themen-Hintergründe.
 * Berührt weder die Sticky-Stapeltransforms noch Kontospeicher-/Quizlogik. */
(() => {
  "use strict";
  const hero=document.querySelector(".hero");
  const chapters=[...document.querySelectorAll("#lf6-flow > .lf6-full-chapter")];
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(!hero||!chapters.length)return;
  let requested=0;
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  function paint(){
    requested=0;
    if(reduce.matches){
      hero.style.removeProperty("--itvi-hero-shift");
      for(const chapter of chapters)chapter.style.removeProperty("--itvi-shift");
      return;
    }
    const viewport=window.innerHeight||800;
    const hr=hero.getBoundingClientRect();
    if(hr.bottom>-180&&hr.top<viewport+180){
      const shift=clamp((viewport*.48-(hr.top+hr.height*.50))*.12,-68,68);
      hero.style.setProperty("--itvi-hero-shift",shift.toFixed(1)+"px");
    }
    for(const chapter of chapters){
      if(chapter.classList.contains("lf6-topic-hidden"))continue;
      const rect=chapter.getBoundingClientRect();
      if(rect.bottom< -160||rect.top>viewport+160)continue;
      const visibleCenter=rect.top+Math.min(rect.height,viewport)*.52;
      const shift=clamp((viewport*.50-visibleCenter)*.115,-82,82);
      chapter.style.setProperty("--itvi-shift",shift.toFixed(1)+"px");
    }
  }
  function schedule(){
    if(!requested)requested=requestAnimationFrame(paint);
  }
  window.addEventListener("scroll",schedule,{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  document.querySelector(".lf6-topic-navigation")?.addEventListener("click",()=>{schedule();setTimeout(schedule,90)},{passive:true});
  if(typeof reduce.addEventListener==="function")reduce.addEventListener("change",schedule);
  window.addEventListener("load",schedule,{once:true});
  schedule();
})();