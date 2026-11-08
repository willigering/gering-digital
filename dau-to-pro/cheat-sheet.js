/* DAU TO PRO // Pocket-Deck. Unabhängig vom Modulstapel der Startseite. */
(()=>{
  "use strict";
  const groups=globalThis.DTP_CHEAT_GROUPS||[];
  const board=document.getElementById("sheet-board");
  const filters=document.getElementById("sheet-filters");
  const search=document.getElementById("sheet-search");
  const count=document.getElementById("sheet-count");
  const progress=document.getElementById("stack-progress");
  if(!board||!groups.length)return;
  const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let selected="alle",query="",cards=[],rows=[],stage=null,rowH=0,shown=null,frame=0,stacked=false,activeIndex=-1;
  const wide=matchMedia("(min-width:1120px)"),calm=matchMedia("(prefers-reduced-motion:reduce)");
  const PEEK=19,STEP=.46,TAIL=.3;
  const navH=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h"))||92;
  const total=groups.reduce((n,g)=>n+g.cards.length,0);
  document.querySelectorAll("[data-cheat-total]").forEach(el=>el.textContent=String(total));
  document.querySelectorAll("[data-cheat-groups]").forEach(el=>el.textContent=String(groups.length));
  function cardHTML(g,c,i){
    const [title,lead,factString,question,answer,trap,kind]=c;
    const facts=factString.split("|").filter(Boolean).map(f=>{
      const cut=f.indexOf("::"),key=cut<0?"Merke":f.slice(0,cut),value=cut<0?f:f.slice(cut+2);
      return '<li><b>'+safe(key)+'</b><span>'+safe(value)+'</span></li>';
    }).join("");
    const label=kind||(g.id==="rechnung"||g.id==="subnet"||g.id==="zahlen"?"RECHNEN":"WISSEN");
    return '<article class="sheet" style="--tone:'+g.color+'" data-title="'+safe(g.name+" "+title+" "+lead+" "+factString+" "+question+" "+answer+" "+trap).toLowerCase()+'" data-group="'+safe(g.id)+'">'
      +'<header class="sheet-top"><span>'+safe(g.symbol)+' &nbsp; '+safe(g.name)+'</span><span class="sheet-nr">'+String(i+1).padStart(2,"0")+'</span></header>'
      +'<div class="sheet-type">'+safe(label)+' <span aria-hidden="true">/ /</span></div>'
      +'<h2>'+safe(title)+'</h2><p class="sheet-lead">'+safe(lead)+'</p>'
      +'<ul class="sheet-facts">'+facts+'</ul>'
      +'<div class="sheet-question"><span>✦ &nbsp;PRÜFUNGSFRAGE</span><strong>'+safe(question)+'</strong><p>'+safe(answer)+'</p></div>'
      +'<p class="sheet-trap"><b>⚠ MERK DIR:</b> '+safe(trap)+'</p>'
      +'</article>';
  }
  function buildFilters(){
    const list=[{id:"alle",name:"Alle Themen",color:"#eadbaf"},...groups];
    filters.innerHTML=list.map(g=>'<button type="button" class="filter-chip" data-topic="'+safe(g.id)+'" style="--tone:'+g.color+'" aria-pressed="'+(g.id===selected?'true':'false')+'">'+safe(g.name)+'</button>').join("");
    filters.addEventListener("click",e=>{
      const b=e.target.closest("button[data-topic]");if(!b)return;
      selected=b.dataset.topic;
      [...filters.querySelectorAll("button")].forEach(x=>x.setAttribute("aria-pressed",x===b?"true":"false"));
      render();
    });
  }
  function dispose(){
    if(!stacked)return;
    cards.forEach(c=>board.append(c));
    stage?.remove();stage=null;rows=[];stacked=false;shown=null;activeIndex=-1;
    board.classList.remove("is-stacked");board.style.height="";
    cancelAnimationFrame(frame);frame=0;
  }
  function measure(){
    if(!stacked||!stage)return;
    rows.forEach(r=>{r.style.position="static";r.style.transform="";r.style.height="auto"});
    rowH=Math.ceil(Math.max(...rows.map(r=>r.getBoundingClientRect().height),400));
    rows.forEach(r=>{r.style.position="";r.style.height=rowH+"px"});
    const peeks=Math.min(rows.length-1,3)*PEEK;
    const stageH=peeks+rowH+rowH*TAIL;
    stage.style.height=stageH+"px";
    stage.style.top=(navH()+14)+"px";
    board.style.height=(stageH+(rows.length-1)*rowH*STEP)+"px";
    paint();
  }
  const stepPx=()=>rowH*STEP;
  function scrollPos(){
    if(!rows.length)return 0;
    const top=board.getBoundingClientRect().top-navH()-14;
    return Math.max(0,Math.min(rows.length-1,-top/Math.max(1,stepPx())));
  }
  function active(){return Math.round(shown===null?scrollPos():shown)}
  function go(k){
    const target=scrollY+board.getBoundingClientRect().top-navH()-14+k*stepPx();
    scrollTo({top:Math.max(0,target),behavior:calm.matches?"auto":"smooth"});
  }
  function paint(){
    frame=0;if(!stacked)return;
    const goal=scrollPos();if(shown===null)shown=goal;
    shown+=(goal-shown)*.17;
    if(Math.abs(goal-shown)<.002)shown=goal;else frame=requestAnimationFrame(paint);
    const peeks=Math.min(rows.length-1,3)*PEEK,p=shown,now=Math.round(p);
    rows.forEach((r,k)=>{
      const d=p-k,back=Math.min(Math.max(0,d),3);
      const y=d>=0?peeks-back*PEEK:peeks+(-d)*(rowH+14);
      const scale=1-back*.028;
      r.style.transform='translate3d(0,'+y.toFixed(1)+'px,0) scale('+scale.toFixed(3)+')';
      r.style.zIndex=String(k+1);
      r.classList.toggle("is-front",Math.abs(d)<.5);
      r.classList.toggle("is-behind",d>.52);
      r.inert=d< -1.15;
    });
    if(now!==activeIndex){
      activeIndex=now;
      progress.textContent=String(now+1).padStart(2,"0")+" / "+String(rows.length).padStart(2,"0")+" · REIHEN";
    }
  }
  function queue(){if(stacked&&!frame)frame=requestAnimationFrame(paint)}
  function rebuild(){
    dispose();
    if(!wide.matches||calm.matches||cards.length<=5){
      progress.hidden=true;return;
    }
    progress.hidden=false;stacked=true;board.classList.add("is-stacked");
    stage=document.createElement("div");stage.className="sheet-stage";board.append(stage);
    for(let i=0;i<cards.length;i+=5){
      const row=document.createElement("div");
      row.className="sheet-row";row.dataset.row=String(rows.length);
      cards.slice(i,i+5).forEach(c=>row.append(c));
      row.addEventListener("click",e=>{
        const k=Number(row.dataset.row);
        if(k!==active()&&row.classList.contains("is-behind")){
          e.preventDefault();e.stopPropagation();go(k);
        }
      },true);
      stage.append(row);rows.push(row);
    }
    measure();
  }
  function render(){
    dispose();
    const fragments=[];
    groups.forEach(g=>{
      if(selected!=="alle"&&g.id!==selected)return;
      g.cards.forEach((c,i)=>{
        const searchable=(g.name+" "+c.join(" ")).toLocaleLowerCase("de");
        if(query&& !searchable.includes(query))return;
        fragments.push(cardHTML(g,c,i));
      });
    });
    board.innerHTML=fragments.join("");
    cards=[...board.querySelectorAll(".sheet")];
    count.textContent=cards.length+" / "+total+" KARTEN";
    document.getElementById("sheet-empty").hidden=cards.length!==0;
    board.hidden=cards.length===0;
    rebuild();
  }
  buildFilters();
  search.addEventListener("input",()=>{query=search.value.trim().toLocaleLowerCase("de");render()});
  addEventListener("scroll",queue,{passive:true});
  addEventListener("resize",()=>{rebuild()},{passive:true});
  wide.addEventListener("change",rebuild);
  calm.addEventListener("change",rebuild);
  addEventListener("load",()=>{if(stacked)measure()},{once:true});
  if("ResizeObserver" in window){
    let timer;new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{if(stacked)measure()},120)}).observe(document.querySelector(".topbar"));
  }
  board.addEventListener("focusin",e=>{const r=e.target.closest(".sheet-row");if(r&&Number(r.dataset.row)!==active())go(Number(r.dataset.row))});
  board.addEventListener("pointermove",e=>{
    if(e.pointerType!=="mouse")return;
    const card=e.target.closest(".sheet");if(!card)return;
    const b=card.getBoundingClientRect();
    card.style.setProperty("--cursor-x",((e.clientX-b.left)/b.width*100).toFixed(1)+"%");
    card.style.setProperty("--cursor-y",((e.clientY-b.top)/b.height*100).toFixed(1)+"%");
  },{passive:true});
  render();
})();