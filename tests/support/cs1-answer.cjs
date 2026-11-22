// Answer through the actual controls; also used by the account-sync regression.
exports.answer=async(page,host,right=true,task)=>{
 const t=task||await page.evaluate(()=>CS1START_TEST.last());
 if(t.kind==='mc'){await page.locator(host+` .opt[data-v="${right?t.answer:(t.answer+1)%t.options.length}"]`).click();return}
 if(t.kind==='order'){
  const want=right?t.answer:t.answer.split('').reverse().join('');
  for(let i=0;i<want.length;i++){
   let current=await page.locator(host+' [data-answer]').evaluate(e=>Array.from(e.querySelectorAll('[data-row] code'),x=>x.textContent));
   let j=current.indexOf(t.items['ABCDEFGH'.indexOf(want[i])]);
   while(j>i){await page.locator(host+` [data-move="${j}"][data-dir="-1"]`).click();j--}
  }
 }else if(t.kind==='set'){
  const want=right?t.answer:('ABCDEFGH'.slice(0,t.items.length).split('').filter(x=>!t.answer.includes(x)).join(''));
  for(const key of want)await page.locator(host+` [data-statement="${key}"]`).click();
 }else{
  for(let i=0;i<t.slots.length;i++){
   const value=right?t.slots[i]:t.bank.find(x=>x!==t.slots[i]);
   await page.locator(host+` [data-slot="${i}"]`).click();await page.locator(host+` [data-term="${t.bank.indexOf(value)}"]`).click();
  }
 }
 const check=page.locator(host+' [data-r="check"]');if(await check.count())await check.click();
};
