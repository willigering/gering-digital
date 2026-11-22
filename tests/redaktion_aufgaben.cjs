'use strict';
// Prints one generated sample per task type as plain text for editorial and plausibility review.
const {chromium}=require('playwright'),path=require('node:path');
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://'+path.resolve(__dirname,'../lernmodule',process.argv[2]+'.html'));
const r=await p.evaluate(()=>{const H=Object.entries(window).find(([k,v])=>/_TEST$/.test(k)&&v&&v.genTask)[1];const c=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();return H.SUBS.map(s=>{const t=H.genTask(s.cat,3,[],s.id);return s.id+' | '+c(t.scenario||t.context||t.situation||'')+' Q: '+c(t.prompt)+' A: '+c(H.showAnswer(t))+(t.options?' OPT: '+t.options.map(c).join(' / '):'')+' WHY: '+c(t.why)})});
console.log(r.join('\n'));await b.close()})();
