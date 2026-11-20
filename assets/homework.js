'use strict';
// HomeWork: browser UI only. Categories and module mutations persist via the private API.
let csrf='', modules=[], categories=[], activeCategory='all', searchText='';
const $=id=>document.getElementById(id);
const statuses={offen:'Offen',bearbeitung:'In Bearbeitung',fertig:'Fertig'};
const artByCategory={
  'it-1':'assets/dau-backgrounds/cables-768.webp',
  'it-2':'assets/dau-backgrounds/circuit-768.webp',
  'it-3':'assets/dau-backgrounds/csharp-loops-768.webp',
  'it-4':'assets/dau-backgrounds/hardware-memory-768.webp',
  'it-5':'assets/dau-backgrounds/server-768.webp',
  'it-6':'assets/dau-backgrounds/klausur-bg.webp'
};
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
function renderCards(){
  const grid=$('modules');
  grid.replaceChildren();
  const term=searchText.toLocaleLowerCase('de-DE');
  const filtered=modules.filter(m=>{
    const inCategory=activeCategory==='all' || (m.category_id||'')===activeCategory;
    const match=(m.title+' '+m.topic+' '+categoryLabel(m.category_id)).toLocaleLowerCase('de-DE').includes(term);
    return inCategory&&match;
  });
  $('sectionTitle').textContent=activeCategory==='all'?'Alle HTML-Module':categoryLabel(activeCategory);
  $('count').textContent=filtered.length+' von '+modules.length+' Modulen angezeigt';

  for(const module of filtered){
    const card=element('article','module-card');
    card.dataset.status=statuses[module.status]?module.status:'offen';
    const art=element('div','module-art');
    const artPath=artByCategory[module.category_id]||'assets/dau-backgrounds/klausur-bg.webp';
    art.style.setProperty('--art-image','url("'+artPath+'")');
    art.append(element('span','module-category',categoryLabel(module.category_id)));
    art.append(element('span','module-icon','</>'));
    card.append(art);

    const body=element('div','module-body');
    const meta=element('div','module-meta');
    meta.append(element('span','',module.topic||'Unterrichtsmaterial'),
                element('time','',formatDate(module.date)));
    body.append(meta,element('h3','',module.title));
    body.append(element('div','module-subtitle','Originaldatei unverändert · HTML-Modul'));
    const status=element('div','module-status',statuses[module.status]||'Offen');
    body.append(status);

    const controls=element('div','status-controls');
    controls.setAttribute('role','group');
    controls.setAttribute('aria-label','Status für '+module.title);
    for(const [value,label] of Object.entries(statuses)){
      const button=element('button','',label==='In Bearbeitung'?'In Arbeit':label);
      button.type='button';
      button.setAttribute('aria-pressed',String(module.status===value));
      button.addEventListener('click',async()=>{
        button.disabled=true;
        try{
          await api('save-status',{id:module.id,status:value});
          module.status=value;
          render();
        }catch(error){notice('Status konnte nicht gespeichert werden: '+error.message);button.disabled=false;}
      });
      controls.append(button);
    }
    body.append(controls);
    const actions=element('div','card-actions');
    const a=element('a','openlink','HTML öffnen ↗');
    a.href='homework-module.php?id='+encodeURIComponent(module.id);
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
    menu.append(edit,remove);
    options.append(summary,menu);
    actions.append(a,options);
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
  $('totalCount').textContent=String(modules.length);
  $('doneCount').textContent=String(modules.filter(m=>m.status==='fertig').length);
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
    modules=[];categories=[];activeCategory='all';
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
  if(!newTitle)return;
  $('saveEdit').disabled=true;
  try{
    if(newTitle!==module.title)await api('rename-module',{id,title:newTitle});
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
  searchText=$('search').value.trim();
  renderCards();
});
$('toggleUpload').addEventListener('click',()=>{
  const closed=$('uploadFields').classList.toggle('hidden');
  $('toggleUpload').setAttribute('aria-expanded',String(!closed));
  if(!closed)$('title').focus();
});
const now=new Date();
$('date').value=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
$('file').addEventListener('change',()=>{
  const file=$('file').files[0];
  if(file&&!$('title').value)$('title').value=file.name.replace(/\.html?$/i,'').replace(/[_-]+/g,' ');
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
    render();
    notice('HTML-Datei gespeichert.');
  }catch(error){notice('Upload fehlgeschlagen: '+error.message);}
  finally{$('upload').disabled=false;}
});
refresh();
