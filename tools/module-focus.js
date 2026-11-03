/* Move the real controls, not copies: existing task, scoring and lesson handlers stay in charge. */
(()=>{
  'use strict';
  const init=()=>{
    if(document.querySelector('.dtp-practice-dialog'))return;
    const panel=document.getElementById('practicePanel');
    const task=document.getElementById('practiceTask');
    const back=document.getElementById('backToLesson');
    const view=document.getElementById('pathView');
    if(!panel||!task||!back||!view||typeof HTMLDialogElement==='undefined')return;
    const slot=document.createComment('Exercise panel home');panel.before(slot);
    const backSlot=document.createComment('Lesson button home');back.before(backSlot);
    const dialog=document.createElement('dialog');dialog.className='dtp-practice-dialog';
    dialog.setAttribute('aria-labelledby','practiceKicker');
    const toolbar=document.createElement('div');toolbar.className='dtp-focus-toolbar';
    const note=document.createElement('small');note.textContent='Zurück zur Lektion: Die offene Aufgabe wird nicht gewertet. Auch mit Esc.';
    note.id='dtp-focus-note';dialog.setAttribute('aria-describedby',note.id);
    toolbar.append(note);dialog.append(toolbar);document.body.append(dialog);
    let timer=0,frame=0,closing=false;
    const restore=()=>{
      clearTimeout(timer);cancelAnimationFrame(frame);closing=false;
      dialog.classList.remove('dtp-focus-visible');
      if(dialog.open)dialog.close();
      slot.after(panel);backSlot.after(back);document.body.classList.remove('dtp-exercise-open');
    };
    const sync=()=>{
      const active=!task.hidden&&!view.hidden&&task.childElementCount>0;
      if(active){
        if(dialog.open&&!closing)return;
        clearTimeout(timer);closing=false;
        toolbar.prepend(back);dialog.append(panel);
        document.body.classList.add('dtp-exercise-open');
        if(!dialog.open)dialog.showModal();
        dialog.scrollTop=0;
        // Let the initial invisible frame paint before fading in. No scrollIntoView race.
        frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>dialog.classList.add('dtp-focus-visible'));});
        const input=task.querySelector('input:not([disabled]),textarea:not([disabled]),select:not([disabled]),button:not([disabled]),[tabindex="0"]');
        if(input)input.focus({preventScroll:true});
      }else if(dialog.open&&!closing){
        closing=true;cancelAnimationFrame(frame);dialog.classList.remove('dtp-focus-visible');
        timer=setTimeout(restore,matchMedia('(prefers-reduced-motion: reduce)').matches?0:300);
      }
    };
    // Escape uses the module's real handler, so abandoning a question never awards points.
    dialog.addEventListener('cancel',event=>{event.preventDefault();back.click();});
    back.addEventListener('click',()=>{
      sync();
      const lesson=document.getElementById('lessonTitle');
      // Restore first, then let keyboard users continue at the lesson.
      setTimeout(()=>{if(!dialog.open&&lesson){lesson.setAttribute('tabindex','-1');lesson.focus({preventScroll:true});}},320);
    });
    new MutationObserver(sync).observe(task,{attributes:true,attributeFilter:['hidden'],childList:true});
    new MutationObserver(sync).observe(view,{attributes:true,attributeFilter:['hidden']});
    // A new task starts at its question; answering/typing never moves the viewport.
    dialog.addEventListener('click',event=>{if(event.target.closest('[data-r="next"]'))requestAnimationFrame(()=>{dialog.scrollTop=0;});});
    sync();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
