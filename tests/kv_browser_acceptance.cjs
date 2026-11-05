'use strict';
const assert=require('node:assert/strict');
exports.focus=async(page,viewport)=>{
 const before=await page.evaluate(()=>JSON.stringify(localStorage));
 const original=await page.locator('.question').first().getAttribute('data-id');
 await page.locator('#practiceGo').click();
 await page.waitForFunction(()=>document.querySelector('.dtp-practice-dialog')?.open);
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.dtp-practice-dialog'),'::backdrop').backdropFilter.includes('blur(7px)'),null,{timeout:9500});
 const shape=await page.locator('.dtp-practice-dialog').evaluate(d=>{const r=d.getBoundingClientRect();return{modal:d.matches(':modal'),focused:d.contains(document.activeElement),x:(r.left+r.right)/2,y:(r.top+r.bottom)/2,left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
 assert(shape.modal&&shape.focused);assert(Math.abs(shape.x-viewport.width/2)<3&&Math.abs(shape.y-viewport.height/2)<3);assert(shape.left>=0&&shape.right<=viewport.width&&shape.top>=0&&shape.bottom<=viewport.height);
 assert.equal(await page.locator('#focusTask .question').getAttribute('data-id'),original);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.dtp-practice-dialog').open);
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),before,'Opening and abandoning a training task awards nothing');
 assert.equal(await page.locator('#questions .question').first().getAttribute('data-id'),original,'Original controls return to the overview');
 await page.locator('#practiceGo').click();await page.locator('#focusBack').click();await page.waitForFunction(()=>!document.querySelector('.dtp-practice-dialog').open);
};
exports.mobile=async(page,width)=>{
 for(const tab of ['mix','category','reference','exam']){
  await page.locator('#tab-'+tab).click();
  const s=await page.evaluate(()=>({width:document.documentElement.scrollWidth,vw:innerWidth,small:[...document.querySelectorAll('input,select,textarea')].filter(e=>e.offsetParent&&parseFloat(getComputedStyle(e).fontSize)<16).length}));
  assert(s.width<=s.vw,'Special module fits mobile viewport');assert.equal(s.small,0);
 }
 await page.locator('#tab-mix').click();await page.locator('#practiceGo').tap();await page.waitForFunction(()=>document.querySelector('.dtp-practice-dialog')?.open);
 assert.equal(await page.locator('#focusTask .qtip').isVisible(),false);
 await page.locator('#focusTask .qmark').tap();assert.equal(await page.locator('#focusTask .qtip').isVisible(),true);
 await page.locator('#focusTask .qmark').tap();assert.equal(await page.locator('#focusTask .qtip').isVisible(),false);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.dtp-practice-dialog').open);
 await page.locator('#tab-exam').click();await page.locator('[data-n="20"]').click();await page.locator('#examAnswer').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollBy(0,250));
 const top=await page.locator('#examTimer').evaluate(e=>e.getBoundingClientRect().top);assert(top>=0&&top<140,'Special exam timer remains reachable');
};
