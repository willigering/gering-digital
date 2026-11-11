// DAU TO PRO: Live-Vorschau auf der Avatar-Seite. Ohne JavaScript funktioniert das Formular trotzdem.
(function(){
  'use strict';
  var form=document.querySelector('[data-avatare]'),raw=document.getElementById('avatare-data');
  if(!form||!raw)return;
  var data=JSON.parse(raw.textContent),status=form.querySelector('[data-avatare-status]'),dirty=false;
  var urlOk=/^\.\.\/assets\/dau-avatare\/avatar-(?:0[1-9]|1[0-7])-[a-z-]+(?:-192)?\.webp(?:\?v=\d+)?$/;
  function chosen(){var r=form.querySelector('input[name="avatar"]:checked');return r?r.value:null;}
  function stack(id,size){
    if(!id||!data.layers[id])return null;
    var wrap=document.createElement('span');wrap.className='dtp-avatar';wrap.dataset.avatar=id;
    var parts=['basis'];
    data.order[id].forEach(function(p){var box=form.querySelector('input[name="parts['+id+'][]"][value="'+p+'"]');if(box&&box.checked)parts.push(p);});
    parts.forEach(function(p){var src=data.layers[id][p][size];if(!urlOk.test(src))return;var img=document.createElement('img');img.className='dtp-avatar-layer';img.dataset.part=p;img.src=src;img.alt='';img.width=Number(size);img.height=Number(size);img.decoding='async';wrap.append(img);});
    return wrap;
  }
  function render(){
    var id=chosen();
    form.querySelectorAll('[data-parts-for]').forEach(function(f){f.hidden=f.dataset.partsFor!==(id||'');});
    form.querySelectorAll('[data-avatare-preview]').forEach(function(box){var s=stack(id,box.dataset.avatarePreview);box.replaceChildren();if(s)box.append(s);});
    if(dirty&&status)status.textContent='Noch nicht gespeichert.';
  }
  form.addEventListener('change',function(){dirty=true;render();});
  render();
})();
