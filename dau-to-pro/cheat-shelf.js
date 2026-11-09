/* Kompakter Themenstapel: Titel und Karten bleiben an einem gemeinsamen Sticky-Anker.
   Die Scroll-Strecke steuert nur den Kartenwechsel, nicht die Position des Stapels. */
(()=>{
  const grid=document.getElementById("cheat-mini-grid");if(!grid)return;
  const section=grid.closest(".cheat-collection");
  const frame=grid.closest(".cheat-stack-frame");
  if(!section||!frame)return;
  const all=[...grid.querySelectorAll(":scope > .cheat-mini")];
  const wide=matchMedia("(min-width:1120px)"),calm=matchMedia("(prefers-reduced-motion:reduce)");
  const PEEK=19,STEP=.42,TAIL=.30,GAP=14;
  let rows=[],stage=null,shown=null,rowH=0,raf=0,on=false;
  const navH=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-height"))||80;
  // Der Titel bleibt knapp unter der Navigation; die Karten sind Bestandteil desselben Frames.
  const pinY=()=>navH()+16;
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
    const peek=Math.min(rows.length-1,3)*PEEK;
    const stageHeight=peek+rowH+GAP+rowH*TAIL;
    stage.style.height=stageHeight+"px";
    grid.style.height=stageHeight+"px";
    section.style.setProperty("--cheat-pin-top",pinY()+"px");
    section.style.setProperty("--cheat-runway",((rows.length-1)*rowH*STEP+Math.max(rowH,innerHeight*.65))+"px");
    paint();
  }
  function progress(){
    const naturalTop=section.getBoundingClientRect().top+(parseFloat(getComputedStyle(section).paddingTop)||0);
    return Math.max(0,Math.min(rows.length-1,(pinY()-naturalTop)/Math.max(1,rowH*STEP)));
  }
  function paint(){
    raf=0;if(!on)return;
    const target=progress();if(shown===null)shown=target;
    shown+=(target-shown)*.16;
    if(Math.abs(target-shown)<.002)shown=target;else raf=requestAnimationFrame(paint);
    const p=shown,peek=Math.min(rows.length-1,3)*PEEK;
    rows.forEach((r,k)=>{
      const d=p-k,back=Math.min(Math.max(d,0),3);
      // Auch Reihe 3 ist von Beginn an durch einen Kartenrand sichtbar.
      const waiting=Math.max(0,-d),frontIndex=Math.round(p);
      const y=d>=0?peek-back*PEEK:peek+waiting*PEEK;
      r.style.transform='translate3d(0,'+y.toFixed(1)+'px,0) scale('+(1-back*.035).toFixed(3)+')';
      r.style.zIndex=String(k===frontIndex?100:80-Math.abs(k-frontIndex)*10);
      r.style.visibility="visible";
      r.style.opacity=String(d<0?.65+.35*Math.max(0,1-waiting):1);
      r.classList.toggle("is-front",k===frontIndex);
      r.classList.toggle("is-behind",d>=.52);
      r.classList.toggle("is-waiting",d<-.52);
      r.inert=d< -1.1;
    });
  }
  function go(k){
    scrollTo({top:Math.max(0,scrollY+(section.getBoundingClientRect().top+(parseFloat(getComputedStyle(section).paddingTop)||0))-pinY()+k*rowH*STEP),behavior:calm.matches?"auto":"smooth"});
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
