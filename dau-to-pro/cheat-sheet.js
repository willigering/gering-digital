/* DAU TO PRO – Zwölf THEMEN-Spickzettel, keine 88 Einzelkarten. */
(()=>{
  "use strict";
  const groups=globalThis.DTP_CHEAT_GROUPS||[];
  const board=document.getElementById("sheet-board");
  const search=document.getElementById("sheet-search");
  const count=document.getElementById("sheet-count");
  const detail=document.getElementById("sheet-detail");
  const progress=document.getElementById("stack-progress");
  const intro=document.getElementById("board-intro");
  const empty=document.getElementById("sheet-empty");
  if(!board||!detail||!groups.length)return;
  const enrichments=globalThis.DTP_CHEAT_ENRICHMENT||{};
  const deepSections=g=>(enrichments[g.id]?.sections||[]);
  const fullSections=g=>g.sections.concat(deepSections(g));
  const descriptions={
    zahlen:"Bit, Byte, Binär, Hex und Datenraten",
    osi:"Sieben Schichten, Protokolle, Kapselung",
    subnet:"CIDR, Netzadresse, Hosts, VLSM",
    netzwerk:"Router, Switch, VLAN, WLAN und Kabel",
    ipv6:"Adressarten, Kürzung, SLAAC, NDP",
    dienste:"Ports, DNS, DHCP, TCP und TLS",
    sicherheit:"Schutzziele, Hashes, MFA und Backup",
    datenschutz:"DSGVO, Rechtsgrundlagen und TOM",
    rechnung:"Rabatt, Skonto, TCO und Break-even",
    csharp:"Datentypen, Bedingungen und Schleifen",
    mix:"Hardware, RAID, SQL und Projektplanung",
    support:"Ticketarten, Service Desk, SLA, Eskalation und ITSM"
  };
  const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let cards=[],rows=[],stage=null,rowH=0,shown=null,frame=0,stacked=false,lastRow=-1;
  const wide=matchMedia("(min-width:1120px)"),calm=matchMedia("(prefers-reduced-motion:reduce)");
  const PEEK=20,STEP=.47,TAIL=.32;
  const overlapY=()=>Math.max(navH()+110,Math.min(innerHeight*.30,navH()+150));
  const stagePin=()=>navH()+34;
  const navH=()=>document.querySelector(".topbar")?.getBoundingClientRect().height||86;
  const start=document.title;
  const textureByTopic={
    zahlen:"circuit-micro",osi:"circuit-signal",subnet:"cables-patch",
    netzwerk:"cables",ipv6:"circuit-copper",dienste:"network-ports",
    sicherheit:"server",datenschutz:"circuit-sockets",rechnung:"hardware-memory",
    csharp:"circuit",mix:"hardware-connectors",support:"server"
  };
  const reducedMotion=matchMedia("(prefers-reduced-motion:reduce)");
  const parallaxAllowed=()=>!reducedMotion.matches;
  let parallaxFrame=0;
  document.querySelectorAll("[data-cheat-total]").forEach(x=>x.textContent=String(groups.length));
  document.querySelectorAll("[data-cheat-groups]").forEach(x=>x.textContent=String(groups.length));
  function topicLink(g,n){
    return '<a class="topic-card" href="?thema='+encodeURIComponent(g.id)+'" style="--tone:'+g.color+'" data-id="'+safe(g.id)+'">'
      +'<span class="topic-top"><span>POCKET GUIDE // '+String(n+1).padStart(2,"0")+'</span><b>'+safe(g.symbol)+'</b></span>'
      +'<span class="topic-icon" aria-hidden="true">'+safe(g.symbol)+'</span>'
      +'<span class="topic-subtitle">SPICKZETTEL '+String(n+1).padStart(2,"0")+'</span>'
      +'<strong class="topic-name">'+safe(g.name)+'</strong>'
      +'<span class="topic-desc">'+safe(descriptions[g.id]||g.sections.map(c=>c[0]).slice(0,3).join(", "))+'</span>'
      +'<span class="topic-foot"><span>'+fullSections(g).length+' ABSCHNITTE</span><b>LESEN ↗</b></span>'
      +'</a>';
  }
  function destroyStack(){
    if(!stacked)return;
    cards.forEach(c=>{c.inert=false;board.append(c)});
    stage?.remove();stage=null;rows=[];stacked=false;shown=null;lastRow=-1;
    board.classList.remove("is-stacked");board.style.height="";
    cancelAnimationFrame(frame);frame=0;
  }
  function measure(){
    if(!stacked)return;
    rows.forEach(r=>{r.style.transform="";r.style.position="static";r.style.height="auto";r.style.visibility="visible"});
    rowH=Math.ceil(Math.max(...rows.map(r=>r.getBoundingClientRect().height),260));
    rows.forEach(r=>{r.style.position="";r.style.height=rowH+"px"});
    const offset=Math.min(rows.length-1,3)*PEEK;
    const stHeight=offset+rowH+rowH*TAIL;
    stage.style.top=stagePin()+"px";stage.style.height=stHeight+"px";
    board.style.height=stHeight+(rows.length-1)*rowH*STEP+"px";
    paint();
  }
  const position=()=>Math.max(0,Math.min(rows.length-1,(overlapY()-board.getBoundingClientRect().top)/Math.max(1,rowH*STEP)));
  const active=()=>Math.round(shown??position());
  function go(k){
    scrollTo({top:Math.max(0,scrollY+board.getBoundingClientRect().top-overlapY()+k*rowH*STEP),behavior:calm.matches?"auto":"smooth"});
  }
  function paint(){
    frame=0;if(!stacked)return;
    const goal=position();if(shown===null)shown=goal;
    shown+=(goal-shown)*.17;
    if(Math.abs(goal-shown)<.002)shown=goal;else frame=requestAnimationFrame(paint);
    const p=shown,peek=Math.min(rows.length-1,3)*PEEK;
    rows.forEach((r,k)=>{
      const d=p-k,back=Math.min(Math.max(d,0),3);
      // Nachfolgende Reihen bleiben als schmale Kanten des Stapels sichtbar.
      // Kein visibility-Sprung mehr bei der letzten, einzelnen Themenkarte.
      const waiting=Math.max(0,-d);
      const y=d>=0?peek-back*PEEK:peek+waiting*PEEK;
      const near=Math.max(0,1-Math.abs(d));
      const frontIndex=Math.round(p);
      r.style.transform='translate3d(0,'+y.toFixed(1)+'px,0) scale('+(1-back*.03-waiting*.008).toFixed(3)+')';
      r.style.zIndex=String(k===frontIndex?100:80-Math.abs(k-frontIndex)*10);
      r.style.visibility="visible";
      r.style.opacity=String(d<0 ? .63+.37*near : 1);
      r.classList.toggle("is-front",k===frontIndex);
      r.classList.toggle("is-behind",d>=.52);
      r.classList.toggle("is-waiting",d<-.52);
      r.inert=d< -1.1;
    });
    const index=Math.round(p);
    if(lastRow!==index){
      lastRow=index;progress.textContent=String(index+1).padStart(2,"0")+" / "+String(rows.length).padStart(2,"0")+" REIHEN";
    }
  }
  function rebuild(){
    destroyStack();
    if(!wide.matches||calm.matches||cards.length<=5){progress.hidden=true;return}
    progress.hidden=false;stacked=true;board.classList.add("is-stacked");
    stage=document.createElement("div");stage.className="sheet-stage";board.append(stage);
    for(let i=0;i<cards.length;i+=5){
      const row=document.createElement("div");row.className="sheet-row";row.dataset.row=String(rows.length);
      cards.slice(i,i+5).forEach(c=>row.append(c));
      row.addEventListener("click",e=>{
        if(row.classList.contains("is-behind")&&Number(row.dataset.row)!==active()){
          e.preventDefault();e.stopPropagation();go(Number(row.dataset.row));
        }
      },true);
      stage.append(row);rows.push(row);
    }
    measure();
  }
  function listing(){
    destroyStack();
    document.title=start;
    document.querySelector(".hero").hidden=false;
    detail.hidden=true;intro.hidden=false;
    board.hidden=false;search.closest(".search").hidden=false;
    const q=search.value.trim().toLocaleLowerCase("de");
    const visible=groups.filter(g=>(g.name+" "+descriptions[g.id]+" "+fullSections(g).map(c=>c.join(" ")).join(" ")).toLocaleLowerCase("de").includes(q));
    board.innerHTML=visible.map(g=>topicLink(g,groups.indexOf(g))).join("");
    cards=[...board.querySelectorAll(".topic-card")];
    count.textContent=visible.length+" / "+groups.length+" THEMEN";
    empty.hidden=visible.length!==0;
    if(visible.length===0){board.hidden=true;progress.hidden=true;return}
    rebuild();
  }
  function sectionHTML(c,i){
    const [heading,lead,lines]=c;
    const facts=lines.split("|").map(f=>{
      const n=f.indexOf("::");
      return '<div class="fact"><dt>'+safe(n>=0?f.slice(0,n):"Merke")+'</dt><dd>'+safe(n>=0?f.slice(n+2):f)+'</dd></div>';
    }).join("");
    return '<section class="detail-section"><span class="section-num">'+String(i+1).padStart(2,"0")+'</span><div>'
      +'<h3>'+safe(heading)+'</h3><p class="section-lead">'+safe(lead)+'</p><dl>'+facts+'</dl></div></section>';
  }
  function getQuestions(g){
    const own=g.sections.map(c=>[c[3],c[4]]);
    const extra=(globalThis.DTP_CHEAT_EXTRAS||{})[g.id]||"";
    const additional=extra.split(/\r?\n/).filter(Boolean).map(row=>{
      const divider=row.indexOf("¦");
      return divider<0?null:[row.slice(0,divider).trim(),row.slice(divider+1).trim()];
    }).filter(Boolean);
    return own.concat(additional,(enrichments[g.id]?.questions||[]));
  }
  function refreshParallax(){
    parallaxFrame=0;
    const sheet=detail.querySelector(".one-sheet");if(!sheet||detail.hidden||!parallaxAllowed())return;
    const rect=sheet.getBoundingClientRect();
    if(rect.bottom<0||rect.top>innerHeight)return;
    const range=Math.max(1,rect.height-innerHeight);
    const progress=Math.max(0,Math.min(1,-rect.top/range));
    const shift=(progress-.5)*120;
    sheet.style.setProperty("--sheet-scroll-back",(-shift*.44).toFixed(2)+"px");
    sheet.style.setProperty("--sheet-scroll-front",(shift*.85).toFixed(2)+"px");
  }
  function requestParallax(){
    if(!parallaxFrame&&!detail.hidden&&parallaxAllowed())parallaxFrame=requestAnimationFrame(refreshParallax);
  }
  detail.addEventListener("pointermove",e=>{
    if(e.pointerType!=="mouse"||!parallaxAllowed())return;
    const sheet=e.target.closest(".one-sheet");
    if(!sheet)return;
    const b=sheet.getBoundingClientRect();
    const x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/Math.min(b.height,innerHeight)-.5;
    sheet.style.setProperty("--parallax-back-x",(-x*7).toFixed(1)+"px");
    sheet.style.setProperty("--parallax-back-y",(-y*7).toFixed(1)+"px");
    sheet.style.setProperty("--parallax-front-x",(x*13).toFixed(1)+"px");
    sheet.style.setProperty("--parallax-front-y",(y*11).toFixed(1)+"px");
  },{passive:true});
  detail.addEventListener("pointerleave",()=>{
    const sheet=detail.querySelector(".one-sheet");if(!sheet)return;
    for(const key of ["--parallax-back-x","--parallax-back-y","--parallax-front-x","--parallax-front-y"]){sheet.style.setProperty(key,"0px")}
  });
  function showTopic(id){
    const g=groups.find(item=>item.id===id);
    if(!g){history.replaceState(null,"",location.pathname);listing();return}
    destroyStack();board.hidden=true;intro.hidden=true;empty.hidden=true;detail.hidden=false;
    document.querySelector(".hero").hidden=true;
    search.closest(".search").hidden=true;
    document.title=g.name+" · Spickzettel · DAU TO PRO";
    const questions=getQuestions(g),sections=fullSections(g),texture=textureByTopic[g.id]||"circuit";
    const imageUrl="../assets/dau-backgrounds/"+texture+"-1536.webp";
    const images='<div class="sheet-parallax" aria-hidden="true"><div class="sheet-parallax-viewport">'
      +'<div class="sheet-parallax-back"></div><div class="sheet-parallax-front"></div></div></div>';
    const rendered=questions.map((c,i)=>'<div class="exam-qa"><span>'+String(i+1).padStart(2,"0")+'</span>'
      +'<strong>'+safe(c[0])+'</strong><p>'+safe(c[1])+'</p></div>').join("");
    const traps=[0,4,7].filter(n=>n<g.sections.length).map(i=>'<li>'+safe(g.sections[i][5])+'</li>').join("");
    detail.innerHTML='<div class="detail-actions"><a class="detail-back" href="cheat-sheet.html">← ALLE SPICKZETTEL</a><button type="button" class="print-button" id="sheet-print">⎙ ALS PDF DRUCKEN</button></div>'
      +'<article class="one-sheet" style="--tone:'+g.color+';--sheet-texture:url(&quot;'+safe(imageUrl)+'&quot;)">'
      +images
      +'<div class="detail-header"><span class="detail-kicker">DAU TO PRO // SPICKZETTEL</span><span class="detail-code">'+safe(g.symbol)+'</span>'
      +'<h2>'+safe(g.name)+'</h2><p>'+safe(descriptions[g.id])+' – die wichtigsten Regeln, Zusammenhänge und Beispiele übersichtlich auf einem Themenblatt.</p>'
      +'<div class="detail-line"><span>'+sections.length+' FACHABSCHNITTE</span><span>'+questions.length+' PRÜFUNGSFRAGEN MIT LÖSUNGEN</span></div></div>'
      +'<div class="detail-grid">'+sections.map(sectionHTML).join("")+'</div>'
      +'<div class="detail-exam"><h3>✦ '+questions.length+' TYPISCHE PRÜFUNGSFRAGEN MIT ANTWORTEN</h3><div class="exam-grid">'+rendered+'</div></div>'
      +'<div class="detail-traps"><strong>⚠ HIER PASSIEREN DIE KLASSIKER:</strong><ul>'+traps+'</ul></div>'
      +'<p class="detail-signoff">DAU TO PRO · Wissen anwenden, nicht bloß aufsagen.</p>'
      +'</article>';
    document.getElementById("sheet-print").addEventListener("click",()=>print());
    progress.hidden=true;
    scrollTo({top:0,behavior:"auto"});
    requestParallax();
  }
  function route(){
    const id=new URLSearchParams(location.search).get("thema");
    if(id)showTopic(id);else listing();
  }
  search.addEventListener("input",()=>{if(!new URLSearchParams(location.search).has("thema"))listing()});
  addEventListener("popstate",route);
  addEventListener("scroll",requestParallax,{passive:true});
  addEventListener("scroll",()=>{if(stacked&&!frame)frame=requestAnimationFrame(paint)},{passive:true});
  addEventListener("resize",()=>{if(!detail.hidden)return;rebuild()},{passive:true});
  wide.addEventListener("change",()=>{if(detail.hidden)rebuild()});
  calm.addEventListener("change",()=>{if(detail.hidden)rebuild()});
  addEventListener("load",()=>{if(stacked)measure();requestParallax()},{once:true});
  addEventListener("resize",requestParallax,{passive:true});
  route();
})();