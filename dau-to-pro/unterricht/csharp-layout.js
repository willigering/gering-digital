/* Einheitlicher DAU-to-PRO-Unterrichtsaufbau für beide C#-Materialien. */
(()=>{"use strict";
const isT05=!!document.getElementById("p-1"),body=document.body;
body.classList.add("dtp-material");
const top=document.createElement("header");top.className="dtp-top";top.innerHTML='<div class="dtp-wrap"><a href="../index.php#unterrichtsmaterial">← DAU TO PRO / UNTERRICHTSMATERIAL</a><strong>C# <span>// UNTERRICHT</span></strong></div>';
const wall=document.createElement("div");wall.className="dtp-backdrop";wall.setAttribute("aria-hidden","true");
body.prepend(top);body.prepend(wall);
const hero=document.createElement("section");hero.className="dtp-hero";
const heroTitle=isT05?'WENN, DANN,<br><em>SONST ... CHAOS.</em>':'CASTASTROPHE?<br><em>NICHT MIT DIR.</em>';
hero.innerHTML='<div class="dtp-wrap"><span class="dtp-kicker">GRUNDLAGEN DER PROGRAMMIERUNG · C#</span><h1>'+heroTitle+'</h1><p>'+(isT05?'Bedingungen verknüpfen, Eingaben prüfen und Fehler finden. Mit Aufgaben, Selbsttest und interaktiven Code-Laboren.':'Datentypen konvertieren, Werte einlesen und Entscheidungen programmieren. Erst selbst lösen, dann die Musterlösung öffnen.')+'</p><div class="dtp-tags">'+(isT05?'<span>12 Lernabschnitte</span><span>26 Testfragen</span><span>6 Tagesübungen</span>':'<span>3 Themenbereiche</span><span>9 Aufgaben</span><span>Aufklappbare Lösungen</span>')+'<span>Unterrichtsmaterial</span></div></div>';
top.after(hero);
const workspace=document.createElement("div");workspace.className="dtp-workspace dtp-wrap";
const intro=document.createElement("div");intro.className="dtp-intro";intro.innerHTML='<strong>WÄHLE DEIN THEMA</strong><p>Die Themenreiter bleiben beim Scrollen sichtbar. Die Kapitel schieben sich wie in den anderen Unterrichtsmaterialien übereinander. Inhalt und Lösungen bleiben vollständig erhalten.</p>';
workspace.appendChild(intro);
const tabs=document.createElement("nav");tabs.className="dtp-tabs";tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","Themenreiter");
const cfg=isT05?[["learn","01 // LERNSTOFF","Bedingungen verstehen","Abschnitte 1–12"],["quiz","02 // SELBSTTEST","Wissen überprüfen","26 Fragen"],["exercise","03 // PRAXIS","Tagesübungen","6 Übungen"]]:[["conversion","01 // DATENTYPEN","Datenkonvertierung I","4 Übungen"],["input","02 // EINGABEN","Datenkonvertierung II","3 Übungen"],["condition","03 // ENTSCHEIDUNGEN","If-Bedingung","2 Übungen"]];
tabs.innerHTML=cfg.map((c,i)=>'<a class="dtp-tab'+(i===0?' is-current':'')+'" href="#'+c[0]+'" role="tab" data-topic="'+c[0]+'" aria-selected="'+(i===0)+'"><small>'+c[1]+'</small><b>'+c[2]+'</b><small>'+c[3]+'</small></a>').join("");
workspace.appendChild(tabs);
const flow=document.createElement("div");flow.className="dtp-flow";flow.id="dtp-flow";
const groups=Object.fromEntries(cfg.map(c=>{const g=document.createElement("div");g.className="dtp-group";g.dataset.group=c[0];g.id="group-"+c[0];flow.appendChild(g);return[c[0],g]}));
if(isT05){
 const app=document.getElementById("app"),main=document.getElementById("main"),side=document.getElementById("side");
 const tools=document.createElement("details");tools.className="dtp-tools";tools.innerHTML='<summary>FORTSCHRITT, KAPITELÜBERSICHT UND SPEICHERUNG</summary><div class="dtp-tools-inside"></div>';tools.querySelector(".dtp-tools-inside").append(side);workspace.appendChild(tools);workspace.appendChild(app);main.appendChild(flow);app.before(intro,tabs,tools); // Reiter und Fortschritt im selben Inhaltscontainer
 [...main.querySelectorAll(":scope > .page")].forEach((p,index)=>{
  const id=p.id.slice(2),group=id==="quiz"?"quiz":p.dataset.g==="ueb"?"exercise":"learn";
  const title=p.dataset.t||"Kapitel";
  const existing=document.createElement("div");existing.className="dtp-chapter-body";
  while(p.firstChild)existing.appendChild(p.firstChild);
  const heading=document.createElement("div");heading.className="dtp-chapter-head";
  heading.innerHTML='<span class="dtp-num">'+String(index+1).padStart(2,"0")+'</span><span><strong>'+title.replaceAll("&","&amp;").replaceAll("<","&lt;")+'</strong><small>C# · '+(group==="quiz"?"Wissen prüfen":group==="exercise"?"Tagesübungen":"Lernstoff")+'</small></span>';
  p.append(heading,existing);p.classList.add("dtp-chapter");groups[group].appendChild(p);
 });
} else {
 const layout=document.querySelector(".layout"),main=layout?.querySelector("main");
 workspace.appendChild(layout);
 main.appendChild(flow);
 const sections=[...main.querySelectorAll(":scope > section")];
 sections.forEach((p,index)=>{
  const group=cfg[index][0],heading=document.createElement("div"),inner=document.createElement("div");
  heading.className="dtp-chapter-head";inner.className="dtp-chapter-body";
  heading.innerHTML='<span class="dtp-num">'+String(index+1).padStart(2,"0")+'</span><span><strong>'+cfg[index][2]+'</strong><small>'+cfg[index][3]+' · C# Praxis</small></span>';
  while(p.firstChild)inner.appendChild(p.firstChild);
  p.append(heading,inner);p.classList.add("dtp-chapter");groups[group].appendChild(p);
 });
}
if(!isT05)workspace.appendChild(flow);hero.after(workspace);
})();