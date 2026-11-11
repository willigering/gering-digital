/* DAU TO PRO – Kapitelstapel und Parallax; die Übungen behalten ihre eigenen Handler */
(()=>{"use strict";const body=document.body,wall=document.querySelector(".dtp-backdrop"),flow=document.querySelector(".dtp-flow"),tabs=[...document.querySelectorAll(".dtp-tab")];if(!flow)return;
const groups=[...flow.querySelectorAll(":scope > .dtp-group")],flat=[...flow.querySelectorAll(".dtp-chapter")],reduce=matchMedia("(prefers-reduced-motion:reduce)"),desktop=matchMedia("(min-width:901px)");
let raf=0;
const head=document.querySelector(".dtp-top"),nav=document.querySelector(".dtp-tabs");
const offset=()=> (head?.offsetHeight||64)+(nav?.offsetHeight||70)+18;
const activeGroup=()=>groups.find(g=>!g.hidden)||flow;
function measure(){const shown=[...activeGroup().querySelectorAll(".dtp-chapter:not([hidden])")];shown.forEach((ch,i)=>{ch.style.setProperty("--dtp-z",String(i+10));ch.style.zIndex=String(i+10);ch.style.setProperty("--dtp-top",Math.min(offset(),innerHeight-ch.offsetHeight-28)+"px")});paint()}
function paint(){raf=0;if(wall){if(reduce.matches)wall.style.removeProperty("--dtp-wall-shift");else wall.style.setProperty("--dtp-wall-shift",(Math.atan(Math.max(0,scrollY)/1100)*62).toFixed(1)+"px")}
if(!desktop.matches||reduce.matches)return;const shown=[...activeGroup().querySelectorAll(".dtp-chapter:not([hidden])")];shown.forEach((ch,i)=>{const next=shown[i+1]?.getBoundingClientRect();const progress=next?Math.max(0,Math.min(1,(innerHeight-next.top)/Math.max(190,innerHeight*.62))):0;ch.style.setProperty("--dtp-light",(1-progress*.35).toFixed(3));ch.style.setProperty("--dtp-scale",(1-progress*.013).toFixed(3))})}
function queue(){if(!raf)raf=requestAnimationFrame(paint)}
function activate(group,scroll=false){groups.forEach(g=>{g.hidden=g.dataset.group!==group;g.querySelectorAll(".page").forEach(p=>p.classList.toggle("on",!g.hidden))});tabs.forEach(t=>{const sel=t.dataset.topic===group;t.classList.toggle("is-current",sel);t.setAttribute("aria-selected",String(sel));t.tabIndex=sel?0:-1});body.dataset.activeTopic=group;requestAnimationFrame(()=>{measure();if(scroll){const y=flow.getBoundingClientRect().top+scrollY-offset()-4;scrollTo({top:Math.max(0,y),behavior:reduce.matches?"instant":"smooth"})}})}
tabs.forEach((t,i)=>{t.addEventListener("click",e=>{e.preventDefault();activate(t.dataset.topic,true);history.replaceState(null,"","#"+t.dataset.topic)});t.addEventListener("keydown",e=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();const n=e.key==="Home"?0:e.key==="End"?tabs.length-1:(i+(e.key==="ArrowRight"?1:tabs.length-1))%tabs.length;tabs[n].focus();activate(tabs[n].dataset.topic,true)})});
window.DTPCSharp={activate,measure};
addEventListener("scroll",queue,{passive:true});addEventListener("resize",measure,{passive:true});addEventListener("load",measure);
if("ResizeObserver"in window)new ResizeObserver(()=>requestAnimationFrame(measure)).observe(flow);reduce.addEventListener?.("change",measure);desktop.addEventListener?.("change",measure);
const hash=decodeURIComponent(location.hash.slice(1));const group=groups.find(g=>g.dataset.group===hash||g.querySelector("#"+CSS.escape(hash)));activate(group?.dataset.group||groups[0]?.dataset.group||"conversion");if(group&&hash!==group.dataset.group){requestAnimationFrame(()=>document.getElementById(hash)?.scrollIntoView({block:"start"}))}
})();
