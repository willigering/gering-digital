/* Move the real controls, not copies: existing task, scoring and lesson handlers stay in charge. */
(()=>{
  'use strict';
  const init=()=>{
    if(document.querySelector('.dtp-practice-dialog'))return;
    const special=document.querySelector('[data-dtp-focus="training"]');
    const panel=document.getElementById(special?'focusPanel':'practicePanel');
    const task=document.getElementById(special?'focusTask':'practiceTask');
    const back=document.getElementById(special?'focusBack':'backToLesson');
    const view=special||document.getElementById('pathView');
    if(!panel||!task||!back||!view||typeof HTMLDialogElement==='undefined')return;
    const slot=document.createComment('Exercise panel home');panel.before(slot);
    const backSlot=document.createComment('Lesson button home');back.before(backSlot);
    const dialog=document.createElement('dialog');dialog.className='dtp-practice-dialog';
    dialog.setAttribute('aria-labelledby','practiceKicker');
    const toolbar=document.createElement('div');toolbar.className='dtp-focus-toolbar';
    const note=document.createElement('small');note.textContent=special?'Zur Fragenübersicht zurückkehren: Ohne Prüfen gibt es keine Bewertung. Auch mit Esc.':'Zurück zur Lektion: Die offene Aufgabe wird nicht gewertet. Auch mit Esc.';
    note.id='dtp-focus-note';dialog.setAttribute('aria-describedby',note.id);
    toolbar.append(note);dialog.append(toolbar);document.body.append(dialog);

    // Native ::backdrop is not an ordinary DOM element. Drive a real CSS rule
    // instead of fading the opacity of an already-blurred layer: exactly as
    // with the smooth module-card hover, every effect grows frame by frame.
    const sheetNode=document.createElement('style');
    sheetNode.textContent='.dtp-practice-dialog::backdrop{}';
    document.head.append(sheetNode);
    const backdropRule=sheetNode.sheet&&sheetNode.sheet.cssRules[0];
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const ENTER_MS=4100,EXIT_MS=920;
    let progress=0,animationFrame=0,frame=0,timer=0,closing=false;
    const paint=value=>{
      progress=Math.max(0,Math.min(1,value));
      if(!backdropRule)return;
      const blur=(7*progress).toFixed(3)+'px';
      const brightness=(1-.24*progress).toFixed(4);
      const saturation=(1-.35*progress).toFixed(4);
      const effect='blur('+blur+') brightness('+brightness+') saturate('+saturation+')';
      backdropRule.style.background='rgba(3,7,9,'+(.72*progress).toFixed(4)+')';
      backdropRule.style.backdropFilter=effect;
      backdropRule.style.webkitBackdropFilter=effect;
    };
    const animateTo=target=>{
      cancelAnimationFrame(animationFrame);
      if(reduced.matches){paint(target);return 0;}
      const from=progress,distance=Math.abs(target-from);
      if(distance<.0001){paint(target);return 0;}
      const duration=(target>from?ENTER_MS:EXIT_MS)*distance;
      const started=performance.now();
      const step=now=>{
        const t=Math.min(1,(now-started)/duration);
        // Enter is deliberately linear like card hover. Exit eases out.
        paint(from+(target-from)*(target>from?t:1-Math.pow(1-t,3)));
        if(t<1)animationFrame=requestAnimationFrame(step);
      };
      animationFrame=requestAnimationFrame(step);
      return duration;
    };
    paint(0);
    const restore=()=>{
      clearTimeout(timer);cancelAnimationFrame(frame);cancelAnimationFrame(animationFrame);closing=false;
      dialog.classList.remove('dtp-focus-visible');paint(0);
      if(dialog.open)dialog.close();
      slot.after(panel);backSlot.after(back);document.body.classList.remove('dtp-exercise-open');if(special)document.dispatchEvent(new CustomEvent('dtp:focus-closed'));
    };
    const sync=()=>{
      const active=!task.hidden&&!view.hidden&&task.childElementCount>0;
      if(active){
        if(dialog.open&&!closing)return;
        clearTimeout(timer);closing=false;
        back.hidden=false;toolbar.prepend(back);dialog.append(panel);
        document.body.classList.add('dtp-exercise-open');
        if(!dialog.open)dialog.showModal();
        dialog.scrollTop=0;
        // Paint the initial clear frame before bringing in the real question.
        cancelAnimationFrame(frame);
        frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
          dialog.classList.add('dtp-focus-visible');
          animateTo(1);
        });});
        // Answer fields first: the "?" tip comes earlier in the DOM and would cover the field on phones.
        const input=task.querySelector('input:not([disabled]):not([readonly]):not([hidden]),textarea:not([disabled]):not([readonly]),select:not([disabled])')
          ||task.querySelector('button:not([disabled]),[tabindex="0"]:not(.qhelp)');
        if(input)input.focus({preventScroll:true});
      }else if(dialog.open&&!closing){
        closing=true;cancelAnimationFrame(frame);
        dialog.classList.remove('dtp-focus-visible');
        const duration=animateTo(0);
        timer=setTimeout(restore,reduced.matches?0:Math.max(650,Math.ceil(duration)+60));
      }
    };
    // Escape uses the module's real handler, so abandoning a question never awards points.
    dialog.addEventListener('cancel',event=>{event.preventDefault();back.click();});
    back.addEventListener('click',()=>{
      sync();
      const lesson=document.getElementById('lessonTitle');
      // Return keyboard focus only after the dialog and fading backdrop close.
      setTimeout(()=>{if(!dialog.open&&lesson){lesson.setAttribute('tabindex','-1');lesson.focus({preventScroll:true});}},reduced.matches?0:1100);
    });
    new MutationObserver(sync).observe(task,{attributes:true,attributeFilter:['hidden'],childList:true});
    new MutationObserver(sync).observe(view,{attributes:true,attributeFilter:['hidden']});
    dialog.addEventListener('click',event=>{if(event.target.closest('[data-r="next"]'))requestAnimationFrame(()=>{dialog.scrollTop=0;});});
    sync();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

