'use strict';
// Prints each stage's intro as plain text for editorial review.
const {chromium}=require('playwright'),path=require('node:path');
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://'+path.resolve(__dirname,'../lernmodule',process.argv[2]+'.html'));
console.log((await p.evaluate(()=>{const H=Object.entries(window).find(([k,v])=>/_TEST$/.test(k)&&v&&v.genTask)[1];const c=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();return H.STAGES.map(s=>'## '+s.title+': '+c(s.intro)+' MEMO: '+c(s.memo))})).join('\n'));await b.close()})();
