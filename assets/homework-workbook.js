(()=>{
 'use strict';
 const configElement=document.getElementById('hw-workbook-config');
 if(!configElement)return;
 const config=JSON.parse(configElement.textContent);
 let revision=config.revision||0,csrf='',timer=0,saving=false,dirty=false,blocked=false;
 let stored=config.fields||{},loaded=false;
 const selector='input:not([type="hidden"]):not([type="password"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="reset"]),textarea,select,[contenteditable="true"]';
 const eligible=()=>[...document.querySelectorAll(selector)].filter(el=>!el.closest('[data-hw-ui]')&&!el.disabled&&!el.readOnly);
 function fields(){
  const seen=new Map();
  return eligible().map((el,index)=>{
   const base=el.id?'id:'+el.id:el.name?'name:'+el.name:'index:'+index;
   const count=seen.get(base)||0;seen.set(base,count+1);
   return {el,key:base+':'+count};
  });
 }
 function capture(){
  const result={};
  for(const {el,key} of fields()){
   if(el.matches('[type="checkbox"],[type="radio"]'))result[key]={kind:'check',checked:el.checked};
   else if(el.tagName==='SELECT')result[key]={kind:'select',values:[...el.selectedOptions].map(o=>o.value)};
   else if(el.isContentEditable)result[key]={kind:'editable',value:el.textContent};
   else result[key]={kind:'text',value:el.value};
  }
  return result;
 }
 function restore(values,blank=false){
  for(const {el,key} of fields()){
   const value=values[key];
   if(blank){
    if(el.matches('[type="checkbox"],[type="radio"]'))el.checked=false;
    else if(el.tagName==='SELECT'){for(const option of el.options)option.selected=false;el.selectedIndex=-1;}
    else if(el.isContentEditable)el.textContent='';else el.value='';
   }else if(value){
    if(value.kind==='check')el.checked=!!value.checked;
    else if(value.kind==='select'&&el.tagName==='SELECT')for(const option of el.options)option.selected=value.values.includes(option.value);
    else if(value.kind==='editable'&&el.isContentEditable)el.textContent=value.value;
    else if(value.kind==='text'&&'value' in el)el.value=value.value;
   }
  }
 }
 function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 const toolbar=node('div');toolbar.id='hw-workbook-toolbar';toolbar.dataset.hwUi='';
 const back=node('a','Zu den Hausaufgaben');back.href='/HA.html';
 const status=node('span',config.standalone?'HTML-Export':'Gespeichert');status.id='hw-save-state';status.setAttribute('role','status');
 const save=node('button','Jetzt speichern');save.type='button';
 const variant=node('select');variant.setAttribute('aria-label','Exportfassung');
 for(const [value,label] of [['edited','Bearbeitet'],['blank','Unbearbeitet']]){const option=node('option',label);option.value=value;variant.append(option);}
 const html=node('button','HTML exportieren');html.type='button';const pdf=node('button','PDF exportieren');pdf.type='button';
 toolbar.append(back,status,...(config.standalone?[]:[save]),variant,html,pdf);document.body.append(toolbar);
 async function request(action,data){
  const response=await fetch('/homework-api.php?action='+action,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf,...data})});
  const result=await response.json();if(!response.ok||result.error){if(response.status===409)blocked=true;throw Error(result.error||'Speichern fehlgeschlagen.');}
  if(result.csrf)csrf=result.csrf;return result;
 }
 async function flush(){
  clearTimeout(timer);if(!loaded)throw Error('Arbeitsblatt wird noch geladen.');
  if(blocked)throw Error('Zwischenzeitliche Änderung in anderem Fenster. Bitte neu laden.');
  if(saving){await new Promise(resolve=>{const poll=()=>saving?setTimeout(poll,40):resolve();poll();});if(dirty)return flush();return;}
  if(!dirty)return;
  saving=true;dirty=false;const snapshot=capture();status.textContent='Speichert …';
  try{
   if(config.standalone){localStorage.setItem('homework-export:'+config.id+':'+config.exportToken,JSON.stringify(snapshot));stored=snapshot;}
   else{const result=await request('save-workbook',{id:config.id,revision,fields:snapshot});revision=result.revision;stored=snapshot;}
   status.textContent=config.standalone?'Lokal gespeichert':'Gespeichert';
  }catch(error){dirty=true;status.textContent=error.message;throw error;}
  finally{saving=false;}
  if(dirty&&!blocked)return flush();
 }
 function changed(event){
  if(!loaded||event.target.closest('[data-hw-ui]')||!event.target.matches(selector))return;
  dirty=true;status.textContent='Ungespeicherte Eingaben';clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),650);
 }
 document.addEventListener('input',changed);document.addEventListener('change',changed);
 save.addEventListener('click',()=>flush().catch(error=>status.textContent=error.message));
 window.addEventListener('beforeunload',event=>{if(dirty||saving){event.preventDefault();event.returnValue='';}});
 back.addEventListener('click',async event=>{
  if(config.standalone||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();try{await flush();window.location.assign(back.href);}catch(error){status.textContent=error.message;}
 });
 function snapshotHtml(blank){
  const clone=document.documentElement.cloneNode(true);
  clone.querySelectorAll('[data-hw-ui],#hw-return,#hw-workbook-config,#hw-workbook-runtime,.hw-answer-print').forEach(el=>el.remove());
  const script=node('script');script.id='hw-workbook-config';script.type='application/json';
  script.textContent=JSON.stringify({...config,fields:blank?{}:capture(),standalone:true,blank,exportToken:crypto.randomUUID()}).replace(/</g,'\\u003c');
  clone.querySelector('body').append(script);
  const runtime=node('script');runtime.id='hw-workbook-runtime';runtime.textContent=document.getElementById('hw-workbook-runtime').textContent;clone.querySelector('body').append(runtime);
  return '<!doctype html>\n'+clone.outerHTML;
 }
 function download(text){const a=node('a');const url=URL.createObjectURL(new Blob([text],{type:'text/html;charset=utf-8'}));a.href=url;a.download=(document.title.replace(/[<>:"/\\|?*]/g,'').slice(0,100)||'Arbeitsblatt')+'-'+(variant.value==='blank'?'unbearbeitet':'bearbeitet')+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 html.addEventListener('click',async()=>{
  try{await flush();if(config.standalone)download(snapshotHtml(variant.value==='blank'));else window.location.assign('/homework-export.php?id='+encodeURIComponent(config.id)+'&variant='+variant.value+'&format=html');}
  catch(error){status.textContent=error.message;}
 });
 pdf.addEventListener('click',async()=>{
  try{await flush();if(config.standalone){
    if(variant.value==='blank'){const before=capture();restore({},true);window.print();restore(before);}else window.print();
   }else window.location.assign('/homework-export.php?id='+encodeURIComponent(config.id)+'&variant='+variant.value+'&format=print');
  }catch(error){status.textContent=error.message;}
 });
 function printAnswers(){
  document.querySelectorAll('.hw-answer-print').forEach(el=>el.remove());
  for(const {el} of fields()){
   if(el.matches('[type="checkbox"],[type="radio"]'))continue;
   const answer=node('div',el.tagName==='SELECT'?[...el.selectedOptions].map(o=>o.textContent).join(', '):el.isContentEditable?el.textContent:el.value);
   answer.className='hw-answer-print';el.dataset.hwPrint='';el.after(answer);
  }
 }
 window.addEventListener('beforeprint',printAnswers);
 window.addEventListener('afterprint',()=>{document.querySelectorAll('.hw-answer-print').forEach(el=>el.remove());document.querySelectorAll('[data-hw-print]').forEach(el=>delete el.dataset.hwPrint);});
 async function init(){
  if(config.standalone&&!config.blank){try{const cached=localStorage.getItem('homework-export:'+config.id+':'+config.exportToken);if(cached)stored=JSON.parse(cached);}catch(_){}}
  restore(stored,!!config.blank);
  if(!config.standalone){
   try{const response=await fetch('/homework-api.php?action=workbook&id='+encodeURIComponent(config.id),{credentials:'same-origin',cache:'no-store'});const result=await response.json();if(!response.ok||result.error)throw Error(result.error||'Laden fehlgeschlagen.');csrf=result.csrf;revision=result.revision;stored=result.fields||{};restore(stored);}
   catch(error){blocked=true;status.textContent=error.message;}
  }
  loaded=true;
 }
 if(document.readyState==='complete')setTimeout(init,200);else window.addEventListener('load',()=>setTimeout(init,200),{once:true});
})();
