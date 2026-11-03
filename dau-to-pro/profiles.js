(function(){
  'use strict';
  var dialog=document.getElementById('learner-profile'),content=document.getElementById('profile-content');
  if(!dialog)return;
  var trigger,request=0;
  function el(tag,text,cls){var n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function icon(a){var n=el('span',undefined,'ach-icon');if(a.icon&&!a.secret&&/^\/(?:assets\/achievement-icons\/[a-z0-9.-]+\.webp|achievement-icons\/[a-z0-9.-]+\.png)$/.test(a.icon)){var img=el('img');img.src=a.icon;img.alt='';img.width=42;img.height=42;n.append(img);}else n.textContent=a.secret?'?':'🏆';return n;}
  function date(a){return a?new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeZone:'Europe/Berlin'}).format(new Date(a.replace(' ','T')+'Z')):'';}
  function render(p){
    content.replaceChildren();document.getElementById('profile-title').textContent=p.username;
    content.append(el('p','Level '+p.level.level+' · '+p.level.title+' · '+p.level.xp.toLocaleString('de-DE')+' XP · '+p.collection.done+' Achievements','konto-lead'));
    var showcase=el('div',undefined,'showcase-preview');p.showcase.forEach(function(a){var n=el('span',undefined,'showcase-icon tier-'+a.tier);n.title=a.name;n.append(icon(a),el('span',a.name));showcase.append(n);});content.append(showcase);
    var label=el('label','Sammlung sortieren '),select=el('select');[['recent','Zuletzt freigeschaltet'],['module','Modul'],['rarity','Seltenheit']].forEach(function(o){var option=el('option',o[1]);option.value=o[0];select.append(option);});label.append(select);content.append(label);
    var list=el('ul',undefined,'ach-grid');content.append(list);
    var items=[];p.collection.groups.forEach(function(g){g.items.forEach(function(a){items.push(a);});});
    function draw(){list.replaceChildren();var tiers={platin:0,gold:1,silber:2,bronze:3,witzig:4,versteckt:5};items.sort(function(a,b){if(select.value==='module')return a.subject.localeCompare(b.subject,'de')||a.name.localeCompare(b.name,'de');if(select.value==='rarity')return tiers[a.tier]-tiers[b.tier]||a.name.localeCompare(b.name,'de');return Number(b.unlocked)-Number(a.unlocked)||(b.unlocked_at||'').localeCompare(a.unlocked_at||'')||a.name.localeCompare(b.name,'de');}).forEach(function(a){var li=el('li',undefined,'ach-item tier-'+a.tier+(a.unlocked?' is-on':''));li.append(icon(a));var text=el('span',undefined,'ach-text');text.append(el('b',a.name),el('small',a.subject+' · '+a.desc),el('small',a.tier_label+(a.secret?'':' · '+a.xp+' XP')+' · '+(a.unlocked?date(a.unlocked_at):'Gesperrt')));li.append(text);list.append(li);});}
    select.addEventListener('change',draw);draw();
  }
  document.querySelectorAll('[data-profile]').forEach(function(button){button.addEventListener('click',async function(){trigger=button;var current=++request;content.textContent='Profil wird geladen …';document.getElementById('profile-title').textContent='Lernprofil';dialog.showModal();try{var r=await fetch('api/profile.php?id='+encodeURIComponent(button.dataset.profile),{credentials:'same-origin',cache:'no-store'}),p=await r.json();if(current!==request)return;if(!r.ok)throw Error(p.error||'Profil nicht verfügbar.');render(p);}catch(e){if(current===request)content.textContent=e.message;}});});
  function close(){dialog.close();}
  dialog.querySelector('[data-profile-close]').addEventListener('click',close);
  dialog.addEventListener('click',function(e){if(e.target===dialog){var r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  var selected=new URLSearchParams(location.search).get('profil');if(selected&&/^[0-9]+$/.test(selected)){var initial=document.querySelector('[data-profile="'+selected+'"]');if(initial)initial.click();}
  dialog.addEventListener('close',function(){request++;if(trigger)trigger.focus();});
})();
