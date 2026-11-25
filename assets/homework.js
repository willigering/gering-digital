'use strict';
// HomeWork: browser UI only. Categories and module mutations persist via the private API.
let csrf='', modules=[], categories=[], activeCategory='all', searchText='', activeStatus='all', searchMatches=null, searchController=null, searchTimer=0;
let backgrounds=[];
const $=id=>document.getElementById(id);
const statuses={offen:'Offen',bearbeitung:'In Bearbeitung',fertig:'Fertig'};
// Reusable motifs: every category, including new ones, works without an image upload.
const motifs=[
  {image:'cables-768.webp',color:'#76d8df',paths:['M22 26h76v42H22z','M48 68v12m24-12v12M36 82h48','m48 38-10 9 10 9m24-18 10 9-10 9m-7-21-8 24']},
  {image:'circuit-768.webp',color:'#81ddd5',paths:['M44 14h32v24H44zM12 82h30v24H12zM78 82h30v24H78z','M60 38v22H27v22m33-22h33v22','M52 26h16M20 94h14m52 0h14']},
  {image:'csharp-loops-768.webp',color:'#c4afff',paths:['M28 28c0-16 64-16 64 0s-64 16-64 0Z','M28 28v64c0 16 64 16 64 0V28','M28 50c0 16 64 16 64 0M28 72c0 16 64 16 64 0']},
  {image:'hardware-memory-768.webp',color:'#a7d8a1',paths:['M30 30h60v60H30zM44 44h32v32H44z','M42 18v12m18-12v12m18-12v12M42 90v12m18-12v12m18-12v12M18 42h12M18 60h12M18 78h12m60-36h12M90 60h12M90 78h12']},
  {image:'server-768.webp',color:'#edc477',paths:['M26 18h68v24H26zM26 48h68v24H26zM26 78h68v24H26z','M38 30h2m10 0h2m18 0h12M38 60h2m10 0h2m18 0h12M38 90h2m10 0h2m18 0h12']},
  {image:'klausur-bg.webp',color:'#9dc8ef',paths:['M34 32h52v72H34zM46 24h28v16H46z','m44 58 4 4 7-8m-11 23 4 4 7-8M64 58h12M64 77h12']}
];
function motifForCategory(id){
  const index=/^it-[1-6]$/.test(id||'')?Number(id.slice(3))-1:
    Array.from(id||'general').reduce((hash,char)=>(hash*31+char.charCodeAt(0))>>>0,0)%motifs.length;
  return motifs[index];
}
function motifIcon(motif){
  const ns='http://www.w3.org/2000/svg';
  const wrapper=element('span','module-icon');
  wrapper.setAttribute('aria-hidden','true');
  const svg=document.createElementNS(ns,'svg');
  for(const [key,value] of Object.entries({viewBox:'0 0 120 120',fill:'none',stroke:'currentColor','stroke-width':'3','stroke-linejoin':'round','stroke-linecap':'round'}))svg.setAttribute(key,value);
  for(const d of motif.paths){
    const path=document.createElementNS(ns,'path');
    path.setAttribute('d',d);
    svg.append(path);
  }
  wrapper.append(svg);
  return wrapper;
}
function element(tag,classes,text){
  const n=document.createElement(tag);
  if(classes)n.className=classes;
  if(text!==undefined)n.textContent=text;
  return n;
}
function notice(message){
  $('message').textContent=message;
}
async function api(action,data={}){
  const isGet=action==='state';
  const response=await fetch('homework-api.php?action='+encodeURIComponent(action),{
    method:isGet?'GET':'POST',credentials:'same-origin',cache:'no-store',
    ...(isGet?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf,...data})})
  });
  const raw=await response.text();
  let parsed;
  try{parsed=JSON.parse(raw)}
  catch(_){throw new Error('HomeWork-Server antwortet nicht korrekt (HTTP '+response.status+').')}
  if(parsed.csrf)csrf=parsed.csrf;
  if(!response.ok || parsed.error)throw new Error(parsed.error||'Serverfehler (HTTP '+response.status+')');
  return parsed;
}
function categoryLabel(id){
  if(!id)return 'Ohne Kategorie';
  return categories.find(c=>c.id===id)?.name||'Ohne Kategorie';
}
function fillCategorySelect(select,chosen){
  select.replaceChildren();
  const none=element('option','','Ohne Kategorie');
  none.value='';
  select.append(none);
  for(const category of categories){
    const option=element('option','',category.name);
    option.value=category.id;
    select.append(option);
  }
  select.value=chosen;
  if(select.selectedIndex<0)select.value='';
}
function renderSidebar(){
  const nav=$('categoryNav');
  nav.replaceChildren();
  const items=[
    {id:'all',name:'Alle Module',number:'▦',count:modules.length},
    {id:'',name:'Ohne Kategorie',number:'□',count:modules.filter(m=>!m.category_id).length},
    ...categories.map((c,i)=>({
      id:c.id,name:c.name,number:Number(c.is_default)===1?'0'+(i+1):'+',
      count:modules.filter(m=>m.category_id===c.id).length
    }))
  ];
  for(const item of items){
    const button=element('button','category-choice');
    button.type='button';
    button.dataset.category=item.id;
    button.setAttribute('aria-current',String(activeCategory===item.id));
    button.append(
      element('span','category-glyph',item.number),
      element('span','category-text',item.name),
      element('span','category-count',String(item.count))
    );
    button.addEventListener('click',()=>{
      activeCategory=item.id;
      render();
    });
    nav.append(button);
  }
}
function formatDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return '';
  return new Date(value+'T12:00:00').toLocaleDateString('de-DE');
}
function openEditor(module){
  $('editId').value=module.id;
  $('editTitle').value=module.title;
  $('editTopic').value=module.topic||'';
  fillCategorySelect($('editCategory'),module.category_id||'');
  $('editError').textContent='';
  $('editDialog').showModal();
  $('editTitle').focus();
}
async function deleteModule(module){
  const choice=confirm('„'+module.title+'“ dauerhaft löschen?\nDie hochgeladene HTML-Datei und die Kachel werden entfernt. Diese Aktion kann nicht rückgängig gemacht werden.');
  if(!choice)return;
  try{
    await api('delete-module',{id:module.id});
    await refresh();
    notice('Modul gelöscht.');
  }catch(error){notice('Löschen fehlgeschlagen: '+error.message)}
}
function openBackground(module){
  const dialog=$('backgroundDialog'), grid=$('backgroundChoices');
  $('backgroundModule').textContent=module.title;
  $('backgroundError').textContent='';
  grid.replaceChildren();
  const choices=[{id:'',title:'Automatisch (Kategorie)',image:motifForCategory(module.category_id).image},...backgrounds];
  for(const choice of choices){
    const button=element('button','background-choice');
    button.type='button';
    button.setAttribute('aria-pressed',String((module.background_id||'')===choice.id));
    const img=element('img');img.src='assets/dau-backgrounds/'+choice.image;img.alt='';img.loading='lazy';
    button.append(img,element('span','',choice.title));
    button.addEventListener('click',async()=>{
      for(const item of grid.children)item.disabled=true;
      $('cancelBackground').disabled=true;
      try{
        const result=await api('set-background',{id:module.id,backgroundId:choice.id});
        module.background_id=result.backgroundId;
        dialog.close();renderCards();notice('Hintergrund gespeichert.');
      }catch(error){$('backgroundError').textContent=error.message;}
      finally{for(const item of grid.children)item.disabled=false;$('cancelBackground').disabled=false;}
    });
    grid.append(button);
  }
  dialog.showModal();
}
$('cancelBackground').addEventListener('click',()=>$('backgroundDialog').close());
$('backgroundDialog').addEventListener('cancel',event=>{if($('cancelBackground').disabled)event.preventDefault();});
function renderCards(){
  const grid=$('modules');
  grid.replaceChildren();
  const term=searchText.toLocaleLowerCase('de-DE');
  const filtered=modules.filter(m=>{
    const inCategory=activeCategory==='all' || (m.category_id||'')===activeCategory;
    const match=searchMatches!==null?searchMatches.has(m.id):(m.title+' '+m.topic+' '+categoryLabel(m.category_id)).toLocaleLowerCase('de-DE').includes(term);
    return inCategory&&match&&(activeStatus==='all'||m.status===activeStatus);
  });
  $('sectionTitle').textContent=activeCategory==='all'?'Alle Module':categoryLabel(activeCategory);
  $('count').textContent=filtered.length+' von '+modules.length+' Modulen';

  for(const module of filtered){
    const card=element('article','module-card');
    card.dataset.status=statuses[module.status]?module.status:'offen';
    const art=element('div','module-art');
    const motif=motifForCategory(module.category_id);
    const selected=backgrounds.find(b=>b.id===module.background_id);
    const artUrl=new URL('assets/dau-backgrounds/'+(selected?.image||motif.image),document.baseURI).href;
    art.style.setProperty('--art-image','url("'+artUrl+'")');
    card.style.setProperty('--motif-color',motif.color);
    art.append(motifIcon(motif),element('span','module-status',statuses[module.status]||'Offen'));
    card.append(art);

    const body=element('div','module-body');
    const meta=element('div','module-meta');
    const date=element('time','',formatDate(module.date));
    if(date.textContent)date.dateTime=module.date;
    meta.append(element('span','module-category',categoryLabel(module.category_id)),date);
    const heading=element('h3');
    body.append(meta,heading);
    body.append(element('p','module-description',module.topic||'Unterrichtsmaterial'));
    const hit=searchMatches?.get(module.id);
    if(hit?.snippet)body.append(element('p','search-snippet',hit.snippet));
    const actions=element('div','card-actions');
    const a=element('a','openlink',module.title);
    a.href='homework-module.php?id='+encodeURIComponent(module.id);
    heading.append(a);
    const options=element('details','card-options');
    const summary=element('summary','','⋯');
    summary.setAttribute('aria-label','Aktionen für '+module.title);
    const menu=element('div','card-menu');
    const edit=element('button','','Umbenennen / zuweisen');
    edit.type='button';
    edit.addEventListener('click',()=>{options.open=false;openEditor(module)});
    const remove=element('button','danger','Modul löschen');
    remove.type='button';
    remove.addEventListener('click',()=>{options.open=false;deleteModule(module)});
    const exportButton=element('button','','Exportieren …');exportButton.type='button';
    exportButton.addEventListener('click',()=>{options.open=false;$('exportId').value=module.id;$('exportDialog').showModal()});
    const background=element('button','','Hintergrund ändern');
    background.type='button';
    background.addEventListener('click',()=>{options.open=false;openBackground(module)});
    menu.append(edit,background,exportButton,element('hr','menu-divider'));
    const controls=element('div','status-controls');
    controls.setAttribute('role','group');
    controls.setAttribute('aria-label','Status für '+module.title);
    for(const [value,label] of Object.entries(statuses)){
      const button=element('button','',label);
      button.type='button';
      button.setAttribute('aria-pressed',String(module.status===value));
      button.addEventListener('click',async()=>{
        for(const control of controls.children)control.disabled=true;
        try{
          await api('save-status',{id:module.id,status:value});
          module.status=value;
          render();
          notice('Status gespeichert: '+label+'.');
        }catch(error){
          notice('Status konnte nicht gespeichert werden: '+error.message);
          for(const control of controls.children)control.disabled=false;
        }
      });
      controls.append(button);
    }
    menu.append(controls,element('hr','menu-divider'),remove);
    options.append(summary,menu);
    actions.append(options);
    body.append(actions);
    card.append(body);
    grid.append(card);
  }
  if(!filtered.length){
    grid.append(element('div','empty-state',modules.length?'Keine Module für diese Auswahl.':'Noch keine HTML-Module vorhanden.'));
  }
}
function render(){
  renderSidebar();
  renderCards();
  const selection=$('uploadCategory').value;
  fillCategorySelect($('uploadCategory'),selection||((activeCategory!=='all')?activeCategory:''));
}
async function refresh(){
  try{
    const data=await api('state');
    const ready=data.mode==='ready';
    $('login').classList.toggle('hidden',ready);
    $('app').classList.toggle('hidden',!ready);
    if(ready){
      categories=data.categories||[];
      backgrounds=data.backgrounds||[];
      modules=data.modules||[];
      if(activeCategory!=='all'&&activeCategory!==''&&!categories.some(c=>c.id===activeCategory))activeCategory='all';
      render();
    }else if(data.mode==='nosetup'){
      $('error').textContent='Bitte zuerst das Passwort der Bewerbungsseite einrichten.';
    }
  }catch(error){
    $('error').textContent=error.message;
    notice('Verbindung zur HomeWork-Verwaltung fehlgeschlagen: '+error.message);
  }
}

$('loginForm').addEventListener('submit',async event=>{
  event.preventDefault();
  try{
    await api('login',{password:$('password').value});
    $('password').value='';
    $('error').textContent='';
    await refresh();
  }catch(error){$('error').textContent=error.message;}
});
$('logout').addEventListener('click',async()=>{
  try{
    await api('logout');
    modules=[];categories=[];activeCategory='all';activeStatus='all';searchText='';
    $('search').value='';$('statusFilter').value='all';searchMatches=null;searchController?.abort();
    await refresh();
  }catch(error){notice(error.message);}
});
$('categoryCreate').addEventListener('click',()=>{
  $('categoryName').value='';
  $('categoryError').textContent='';
  $('categoryDialog').showModal();
  $('categoryName').focus();
});
$('cancelCategory').addEventListener('click',()=>$('categoryDialog').close());
$('categoryForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const name=$('categoryName').value.trim();
  if(!name)return;
  $('saveCategory').disabled=true;
  try{
    const result=await api('create-category',{name});
    activeCategory=result.category.id;
    $('categoryDialog').close();
    await refresh();
    notice('Kategorie „'+result.category.name+'“ erstellt.');
  }catch(error){$('categoryError').textContent=error.message;}
  finally{$('saveCategory').disabled=false;}
});
$('cancelEdit').addEventListener('click',()=>$('editDialog').close());
$('editForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const id=$('editId').value;
  const module=modules.find(m=>m.id===id);
  if(!module)return;
  const newTitle=$('editTitle').value.trim();
  const newCategory=$('editCategory').value;
  const newTopic=$('editTopic').value.trim();
  if(!newTitle)return;
  $('saveEdit').disabled=true;
  try{
    if(newTitle!==module.title||newTopic!==(module.topic||''))await api('rename-module',{id,title:newTitle,topic:newTopic});
    if(newCategory!==(module.category_id||''))await api('set-category',{id,categoryId:newCategory});
    $('editDialog').close();
    await refresh();
    notice('Modul gespeichert.');
  }catch(error){
    $('editError').textContent=error.message;
    await refresh(); // reflect any successful part without losing original HTML
  }finally{$('saveEdit').disabled=false;}
});
$('search').addEventListener('input',()=>{
  searchText=$('search').value.trim();searchMatches=null;searchController?.abort();clearTimeout(searchTimer);
  if(!searchText){renderCards();return;}
  $('count').textContent='Inhalte werden durchsucht …';
  const term=searchText;
  searchTimer=setTimeout(async()=>{
    searchController=new AbortController();
    try{
      const response=await fetch('homework-api.php?action=search&q='+encodeURIComponent(term),{credentials:'same-origin',cache:'no-store',signal:searchController.signal});
      const result=await response.json();if(!response.ok||result.error)throw Error(result.error||'Suche fehlgeschlagen.');
      if(term!==searchText)return;
      searchMatches=new Map((result.matches||[]).map(match=>[match.id,match]));renderCards();
    }catch(error){if(error.name!=='AbortError'){notice(error.message);renderCards();}}
  },220);
});
$('cancelExport').addEventListener('click',()=>$('exportDialog').close());
$('exportForm').addEventListener('submit',event=>{
  event.preventDefault();
  window.location.assign('homework-export.php?id='+encodeURIComponent($('exportId').value)+'&variant='+$('exportVariant').value+'&format='+$('exportFormat').value);
  $('exportDialog').close();
});
$('statusFilter').addEventListener('change',()=>{activeStatus=$('statusFilter').value;renderCards()});
$('toggleUpload').addEventListener('click',()=>{
  const closed=$('uploadFields').classList.toggle('hidden');
  $('toggleUpload').setAttribute('aria-expanded',String(!closed));
  if(!closed)$('title').focus();
});
const now=new Date();
$('date').value=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
// Only parse metadata fragments. Uploaded scripts, images and styles never run here.
function htmlMetadata(source){
  const title=source.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)||source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i);
  const plain=value=>{
    const escaped=value.replace(/<[^>]*>/g,'');
    const doc=new DOMParser().parseFromString('<body>'+escaped.replace(/</g,'&lt;'),'text/html');
    return doc.body.textContent.replace(/\s+/g,' ').trim();
  };
  let description='';
  for(const match of source.matchAll(/<meta\b[^>]*>/gi)){
    const doc=new DOMParser().parseFromString(match[0],'text/html');
    const meta=doc.querySelector('meta');
    if((meta?.getAttribute('name')||'').toLowerCase()==='description'){
      description=(meta.getAttribute('content')||'').replace(/\s+/g,' ').trim();break;
    }
  }
  return {title:title?plain(title[1]).slice(0,140):'',description:description.slice(0,100)};
}
$('file').addEventListener('change',async()=>{
  const file=$('file').files[0];
  if(!file)return;
  const initialTitle=$('title').value;
  const initialTopic=$('topic').value;
  if(!initialTitle)$('title').value=file.name.replace(/\.html?$/i,'').replace(/[_-]+/g,' ').slice(0,140);
  const fallbackTitle=$('title').value;
  if(file.size>12582912||! /\.html?$/i.test(file.name))return;
  try{
    const metadata=htmlMetadata(await file.text());
    if($('file').files[0]!==file)return;
    if(!initialTitle&&$('title').value===fallbackTitle&&metadata.title)$('title').value=metadata.title;
    if(!initialTopic&&!$('topic').value&&metadata.description)$('topic').value=metadata.description;
  }catch(_){/* Filename and manual fields remain available. */}
});
$('upload').addEventListener('click',async()=>{
  const file=$('file').files[0];
  if(!file){notice('Bitte eine HTML-Datei auswählen.');return;}
  if(!/\.html?$/i.test(file.name)||file.size>12582912||file.size<30){
    notice('Nur HTML-Dateien bis 12 MB erlaubt.');return;
  }
  if(!csrf){notice('Sitzung abgelaufen. Bitte neu anmelden.');return;}
  const id='hw-'+Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
  const title=$('title').value.trim()||file.name.replace(/\.html?$/i,'');
  const topic=$('topic').value.trim()||'Unterrichtsmaterial';
  const date=$('date').value;
  const categoryId=$('uploadCategory').value;
  $('upload').disabled=true;
  try{
    const partSize=512*1024;
    const total=Math.ceil(file.size/partSize);
    for(let i=0;i<total;i++){
      const data=new FormData();
      for(const [key,value] of Object.entries({
        csrf,id,title,topic,date,categoryId,chunkIndex:i,chunkTotal:total
      }))data.append(key,String(value));
      data.append('lesson',file.slice(i*partSize,(i+1)*partSize),'teil.html');
      const response=await fetch('homework-module.php',{
        method:'POST',body:data,credentials:'same-origin'
      });
      const raw=await response.text();
      let result;
      try{result=JSON.parse(raw);}
      catch(_){throw new Error('Upload-Server antwortet nicht korrekt (HTTP '+response.status+'): '+raw.slice(0,160))}
      if(!response.ok||!result.ok)throw new Error(result.error||'Upload fehlgeschlagen.');
      if(i===total-1&&result.moduleId!==id)throw new Error('Server hat den Abschluss nicht bestätigt.');
      notice('Upload '+Math.round((i+1)/total*100)+' %');
    }
    await refresh();
    if(!modules.some(m=>m.id===id))throw new Error('Upload wurde nicht in die Modulliste übernommen.');
    $('file').value='';
    $('title').value='';
    $('topic').value='';
    if(activeCategory!=='all' && activeCategory!==categoryId)activeCategory=categoryId||'all';
    activeStatus='all';$('statusFilter').value='all';
    searchText='';searchMatches=null;searchController?.abort();$('search').value='';
    render();
    $('uploadFields').classList.add('hidden');
    $('toggleUpload').setAttribute('aria-expanded','false');
    notice('HTML-Datei gespeichert.');
  }catch(error){notice('Upload fehlgeschlagen: '+error.message);}
  finally{$('upload').disabled=false;}
});
// Bounded transform-only parallax; never intercept scrolling or move the cards.
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const desktop=matchMedia('(min-width: 761px)');
let sceneFrame=0;
function paintScene(){
  sceneFrame=0;
  const enabled=!motion.matches&&desktop.matches&&!document.hidden;
  const progress=enabled?Math.min(window.scrollY,1800):0;
  const scene=document.querySelector('.homework-scene');
  scene.style.setProperty('--desk-y',Math.round(progress*.025)+'px');
  scene.style.setProperty('--light-y',Math.round(progress*.012)+'px');
}
function scheduleScene(){if(!sceneFrame)sceneFrame=requestAnimationFrame(paintScene)}
window.addEventListener('scroll',scheduleScene,{passive:true});
motion.addEventListener('change',scheduleScene);
desktop.addEventListener('change',scheduleScene);
document.addEventListener('visibilitychange',scheduleScene);
paintScene();
refresh();

// A private, locally prepared bundle is uploaded through the same authenticated chunk API.
$('worksheetImport').addEventListener('change',async()=>{
 const selected=$('worksheetImport').files[0];if(!selected)return;
 const control=$('worksheetImport');control.disabled=true;
 try{
  if(selected.size>260000000)throw Error('Importpaket ist zu groß (maximal 250 MB).');
  const bundle=JSON.parse(await selected.text());
  if(bundle.format!=='homework-worksheets-v1'||!Array.isArray(bundle.modules)||bundle.modules.length>500)throw Error('Kein gültiges HomeWork-Arbeitsblattpaket.');
  let imported=0,skipped=0;
  for(const [index,item] of bundle.modules.entries()){
   if(typeof item.id!=='string'||!/^hw-[a-f0-9]{24}$/.test(item.id)||typeof item.html!=='string'||typeof item.title!=='string')throw Error('Ungültiger Moduleintrag '+(index+1));
   if(modules.some(m=>m.id===item.id)){skipped++;continue;}
   let category=categories.find(c=>c.name===item.category);
   if(!category){const result=await api('create-category',{name:item.category});category=result.category;categories.push(category);}
   const file=new Blob([item.html],{type:'text/html'});
   if(file.size>12582912)throw Error('Modul überschreitet 12 MB: '+item.title);
   const partSize=512*1024,total=Math.ceil(file.size/partSize);
   for(let part=0;part<total;part++){
    const data=new FormData();
    for(const [key,value] of Object.entries({csrf,id:item.id,title:item.title.slice(0,140),topic:String(item.topic||'Arbeitsblatt').slice(0,100),date:item.date||'',categoryId:category.id,chunkIndex:part,chunkTotal:total}))data.append(key,String(value));
    data.append('lesson',file.slice(part*partSize,(part+1)*partSize),'teil.html');
    const response=await fetch('homework-module.php',{method:'POST',body:data,credentials:'same-origin'});
    const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Import fehlgeschlagen: '+item.title);
    if(part===total-1&&result.moduleId!==item.id)throw Error('Import wurde nicht bestätigt.');
   }
   modules.push({id:item.id});imported++;
   notice('Import '+(index+1)+'/'+bundle.modules.length+': '+item.title);
  }
  await refresh();notice(imported+' Arbeitsblätter importiert, '+skipped+' bereits vorhandene übersprungen.');
 }catch(error){await refresh();notice('Import unterbrochen: '+error.message+' Erneut starten überspringt bereits importierte Arbeitsblätter.');}
 finally{control.disabled=false;control.value='';}
});
