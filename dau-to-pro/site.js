(() => {
  // Build a lightweight, seamless stone texture from the logo's own unlettered edge.
  // It keeps the entire page visually consistent without duplicating the logo artwork.
  const artwork=document.querySelector('.hero-logo');
  const makeStone=()=>{
    if(!artwork?.naturalWidth)return;
    try{
      const tile=document.createElement('canvas');tile.width=tile.height=640;
      const ctx=tile.getContext('2d');if(!ctx)return;
      const sw=artwork.naturalWidth,sh=artwork.naturalHeight;
      ctx.filter='brightness(.53) contrast(.90)';
      for(let y=0;y<2;y++)for(let x=0;x<2;x++){
        ctx.save();
        ctx.translate(x*320+(x?320:0),y*320+(y?320:0));
        ctx.scale(x?-1:1,y?-1:1);
        ctx.drawImage(artwork,sw*.857,sh*.221,sw*.118,sh*.184,0,0,320,320);
        ctx.restore();
      }
      document.documentElement.style.setProperty('--dtp-stone', 'url("'+tile.toDataURL('image/webp',.62)+'")');
    }catch(error){/* Keep the no-JavaScript CSS texture fallback. */}
  };
  if(artwork?.complete)makeStone();else artwork?.addEventListener('load',makeStone,{once:true});
  const toggle=document.querySelector('.nav-toggle'),menu=document.getElementById('dtp-mobile-menu');
  const closeMenu=()=>{toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Menü öffnen');menu.hidden=true};
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Menü schließen':'Menü öffnen');menu.hidden=!open});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.dtp-nav'))closeMenu()});
  matchMedia('(min-width: 861px)').addEventListener('change',closeMenu);
  const input=document.getElementById('module-search'),buttons=[...document.querySelectorAll('[data-filter]')],cards=[...document.querySelectorAll('.module-card')],indicator=document.getElementById('result-indicator'),empty=document.getElementById('search-empty');
  if(!input)return;
  let current='alle';
  const apply=()=>{
    const q=input.value.toLocaleLowerCase('de-DE').trim();let found=0;
    cards.forEach(card=>{const show=(current==='alle'||current===card.dataset.topic)&&(!q||card.dataset.search.includes(q));card.hidden=!show;if(show)found++});
    indicator.textContent=`${found} von ${cards.length} ${cards.length===1?'Modul':'Modulen'}`;
    if(empty)empty.hidden=found!==0;
  };
  input.addEventListener('input',apply);
  buttons.forEach(button=>button.addEventListener('click',()=>{current=button.dataset.filter;buttons.forEach(b=>{const on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});apply()}));
  apply();
})();
