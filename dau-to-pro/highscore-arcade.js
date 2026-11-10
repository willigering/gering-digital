/* Horizontal ranking: wheel over the rail, touch and arrows; ordinary vertical scrolling at the ends. */
(()=>{const root=document.querySelector('[data-arcade-scroll]');if(!root)return;const rail=root.querySelector('.arcade-rail'),prev=root.querySelector('.arcade-prev'),next=root.querySelector('.arcade-next'),bar=root.querySelector('.arcade-progress>span');if(!rail)return;
const refresh=()=>{const max=Math.max(0,rail.scrollWidth-rail.clientWidth),p=max?rail.scrollLeft/max:0;if(bar){const width=rail.clientWidth/Math.max(rail.scrollWidth,1);bar.style.width=(Math.min(1,width)*100)+'%';bar.style.transform='translateX('+((100/Math.max(width,.01)-100)*p)+'%)'}if(prev)prev.disabled=rail.scrollLeft<=2;if(next)next.disabled=rail.scrollLeft>=max-2;root.classList.toggle('has-overflow',max>2)};
const go=d=>rail.scrollBy({left:d*rail.clientWidth*.77,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
prev?.addEventListener('click',()=>go(-1));next?.addEventListener('click',()=>go(1));
root.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)return;const max=rail.scrollWidth-rail.clientWidth;if(max<=1)return;const delta=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;if((delta<0&&rail.scrollLeft<=1)||(delta>0&&rail.scrollLeft>=max-1))return;if(e.target.closest('button,[role=tooltip]'))return;e.preventDefault();rail.scrollLeft+=delta},{passive:false});
rail.addEventListener('scroll',refresh,{passive:true});window.addEventListener('resize',refresh,{passive:true});refresh();
})();
