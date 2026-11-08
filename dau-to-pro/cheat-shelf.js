/* Separate compact stack. Does not touch #module-grid or its interactions. */
(()=>{
  const grid=document.getElementById("cheat-mini-grid");if(!grid)return;
  const all=[...grid.querySelectorAll(":scope > .cheat-mini")];
  const wide=matchMedia("(min-width:1120px)"),calm=matchMedia("(prefers-reduced-motion:reduce)");
  const PEEK=19,STEP=.46,TAIL=.30;
  let rows=[],stage=null,shown=null,rowH=0,frame=0,on=false;
  const navH=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-height"))||80;
  const triggerY=()=>Math.max(navH()+18,window.innerHeight*.5);
  const stickY=()=>Math.max(navH()+16,triggerY()-rowH*.38);
  const active=()=>Math.round(shown??progress());
  function teardown(){
    if(!on)return;
    on=false;all.forEach(c=>grid.append(c));stage?.remove();stage=null;rows=[];shown=null;
    grid.classList.remove("is-stacked");grid.style.height="";cancelAnimationFrame(frame);frame=0;
  }
  function measure(){
    if(!on)return;
    rows.forEach(r=>{r.style.position="static";r.style.transform="";r.style.height="auto";r.style.visibility="visible"});
    rowH=Math.ceil(Math.max(...rows.map(r=>r.getBoundingClientRect().height),230));
    rows.forEach(r=>{r.style.position="";r.style.height=rowH+"px"});
    const peek=Math.min(rows.length-1,3)*PEEK;
    const sh=peek+rowH+rowH*TAIL;
    stage.style.height=sh+"px";stage.style.top=stickY()+"px";
    grid.style.height=sh+(rows.length-1)*rowH*STEP+"px";
    paint();
  }
  function progress(){return Math.max(0,Math.min(rows.length-1,-(grid.getBoundingClientRect().top-triggerY())/Math.max(1,rowH*STEP)))}
  function paint(){
    frame=0;if(!on)return;
    const target=progress();if(shown===null)shown=target;
    shown+=(target-shown)*.16;if(Math.abs(target-shown)<.002)shown=target;else frame=requestAnimationFrame(paint);
    const p=shown,peek=Math.min(rows.length-1,3)*PEEK;
    rows.forEach((r,k)=>{
      const d=p-k,back=Math.min(Math.max(d,0),3);
      const y=d>=0?peek-back*PEEK:peek+(-d)*(rowH+14);
      r.style.transform='translate3d(0,'+y.toFixed(1)+'px,0) scale('+(1-back*.032).toFixed(3)+')';
      r.style.zIndex=String(k+1);r.style.visibility=d< -1.5?"hidden":"visible";
      r.classList.toggle("is-front",Math.abs(d)<.5);
      r.classList.toggle("is-behind",d>=.52);
      r.inert=d< -1.1;
    });
  }
  function go(k){scrollTo({top:Math.max(0,scrollY+grid.getBoundingClientRect().top-triggerY()+k*rowH*STEP),behavior:calm.matches?"auto":"smooth"})}
  function build(){
    teardown();if(!wide.matches||calm.matches||all.length<=5)return;
    on=true;grid.classList.add("is-stacked");stage=document.createElement("div");stage.className="cheat-stack-stage";grid.append(stage);
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
  addEventListener("scroll",()=>{if(on&&!frame)frame=requestAnimationFrame(paint)},{passive:true});
  addEventListener("resize",build,{passive:true});
  wide.addEventListener("change",build);
  calm.addEventListener("change",build);
  addEventListener("load",measure);
  build();
})();