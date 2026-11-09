/* Kompakter Themenstapel: Titel und Karten bleiben an einem gemeinsamen Sticky-Anker.
   Die Scroll-Strecke steuert nur den Kartenwechsel, nicht die Position des Stapels. */
(()=>{
  const grid=document.getElementById("cheat-mini-grid");if(!grid)return;
  const section=grid.closest(".cheat-collection");
  const frame=grid.closest(".cheat-stack-frame");
  if(!section||!frame)return;
  const all=[...grid.querySelectorAll(":scope > .cheat-mini")];
  const wide=matchMedia("(min-width:1120px)"),calm=matchMedia("(prefers-reduced-motion:reduce)");
  const PEEK=19,STEP=1.20,TAIL=.30,GAP=14;
  let rows=[],stage=null,shown=null,rowH=0,raf=0,on=false;
  const navH=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-height"))||80;
  // Der Titel bleibt knapp unter der Navigation; die Karten sind Bestandteil desselben Frames.
  // Die aktive Kartenreihe sitzt im Desktop-Viewport stets auf derselben
  // Bildschirmhöhe (ca. 25,5vh). Überschrift und Karten bleiben ein Sticky-Frame.
  const pinY=()=>{
    const head=frame.querySelector('.cheat-head');
    const headH=head?head.getBoundingClientRect().height+parseFloat(getComputedStyle(head).marginBottom||0):80;
    const activeY=Math.max(navH()+100,Math.round(innerHeight*.255));
    return Math.max(navH()+8,activeY-headH);
  };
  const active=()=>Math.round(shown??progress());
  function teardown(){
    if(!on)return;
    on=false;
    rows.forEach(r=>{r.inert=false});
    all.forEach(c=>{c.inert=false;grid.append(c)});
    stage?.remove();stage=null;rows=[];shown=null;
    section.classList.remove("has-stacked-shelf");
    section.style.removeProperty("--cheat-pin-top");
    section.style.removeProperty("--cheat-runway");
    grid.classList.remove("is-stacked");
    grid.style.height="";
    cancelAnimationFrame(raf);raf=0;
  }
  function measure(){
    if(!on)return;
    rows.forEach(r=>{r.style.position="static";r.style.transform="";r.style.height="auto";r.style.visibility="visible"});
    rowH=Math.ceil(Math.max(...rows.map(r=>r.getBoundingClientRect().height),230));
    rows.forEach(r=>{r.style.position="";r.style.height=rowH+"px"});
    const stageHeight=rowH;
    stage.style.height=stageHeight+"px";
    grid.style.height=stageHeight+"px";
    section.style.setProperty("--cheat-pin-top",pinY()+"px");
    section.style.setProperty("--cheat-runway",((rows.length-1)*(rowH+GAP)*1.20+Math.max(24,innerHeight*.08))+"px");
    paint();
  }
  function progress(){
    const naturalTop=section.getBoundingClientRect().top+(parseFloat(getComputedStyle(section).paddingTop)||0);
    return Math.max(0,Math.min(rows.length-1,(pinY()-naturalTop)/Math.max(1,(rowH+GAP)*STEP)));
  }
  function paint(){
    raf=0;if(!on)return;
    const target=progress();if(shown===null)shown=target;
    shown+=(target-shown)*.16;
    if(Math.abs(target-shown)<.002)shown=target;else raf=requestAnimationFrame(paint);
    const p=shown;
    rows.forEach((row,k)=>{
      // Alle Reihen sind anfangs vollständig zu sehen. Mit dem Scrollfortschritt
      // zieht jede untere Reihe auf die Position der ersten Reihe hoch.
      const travel=Math.min(p,k);
      const y=(k-travel)*(rowH+GAP);
      row.style.transform='translate3d(0,'+y.toFixed(1)+'px,0)';
      row.style.zIndex=String(k+1);
      row.style.opacity='1';
      row.style.visibility='visible';
      row.classList.toggle('is-front',k===Math.min(rows.length-1,Math.floor(p+.5)));
      row.classList.toggle('is-behind',k<Math.floor(p+.5));
      row.classList.toggle('is-waiting',false);
      row.inert=false;
    });
  }
  function go(k){
    scrollTo({top:Math.max(0,scrollY+(section.getBoundingClientRect().top+(parseFloat(getComputedStyle(section).paddingTop)||0))-pinY()+k*(rowH+GAP)*STEP),behavior:calm.matches?"auto":"smooth"});
  }
  function build(){
    teardown();if(!wide.matches||calm.matches||all.length<=5)return;
    on=true;section.classList.add("has-stacked-shelf");grid.classList.add("is-stacked");
    stage=document.createElement("div");stage.className="cheat-stack-stage";grid.append(stage);
    for(let i=0;i<all.length;i+=5){
      const row=document.createElement("div");row.className="cheat-stack-row";row.dataset.row=String(rows.length);
      all.slice(i,i+5).forEach(c=>row.append(c));
      row.addEventListener("click",e=>{
        if(row.classList.contains("is-behind")&&Number(row.dataset.row)!==active()){
          e.preventDefault();e.stopPropagation();go(Number(row.dataset.row));
        }
      },true);
      stage.append(row);rows.push(row);
    }
    measure();
  }
  grid.addEventListener("focusin",e=>{const row=e.target.closest(".cheat-stack-row");if(row&&Number(row.dataset.row)!==active())go(Number(row.dataset.row))});
  addEventListener("scroll",()=>{if(on&&!raf)raf=requestAnimationFrame(paint)},{passive:true});
  addEventListener("resize",build,{passive:true});
  wide.addEventListener("change",build);
  calm.addEventListener("change",build);
  addEventListener("load",measure);
  build();
})();
