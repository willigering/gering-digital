const FMT={text:'Den gesuchten Begriff eingeben.',out:OUTFMT,code:'C# so schreiben, wie es im Editor stehen würde.',order:'Nur die Buchstaben in der richtigen Reihenfolge.',set:'Alle passenden Buchstaben eingeben, Reihenfolge egal.',free:'Ein kurzer Satz reicht.'};
const PH={text:'Deine Antwort',out:'Ausgabe der Konsole',code:'C#-Code',order:'z. B. BADC',set:'z. B. AC',free:'Deine Antwort in eigenen Worten'};
const normalize=s=>String(s).trim().replace(/\s+/g,' ');
const fold=s=>normalize(s).toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');
/* Entfernt Leerraum außerhalb von Text; Inhalt von "..." bleibt exakt. */
function squeeze(s){let o='',q=false;s=String(s).trim();for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'&&s[i-1]!=='\\')q=!q;if(q||!/\s/.test(c))o+=c}return o}
function parseAnswer(t,raw){
 if(!String(raw??'').trim())return {valid:false,msg:'Erst eine Antwort eingeben. Nichts wurde gewertet.'};
 const given=String(raw).trim();
 if(t.kind==='order'){const v=given.toUpperCase().replace(/[^A-H]/g,'');if(v.length!==t.answer.length)return {valid:false,msg:'Bitte genau '+t.answer.length+' Buchstaben eingeben, z. B. '+'BADCEFGH'.slice(0,t.answer.length)+'.'};return {valid:true,ok:v===t.answer,given:v}}
 if(t.kind==='set'){const max=LETTERS[(t.n||5)-1];const raw2=given.toUpperCase().replace(/[\s,;.+\/-]|UND/g,'');if(!/^[A-H]+$/.test(raw2))return {valid:false,msg:'Nur Buchstaben von A bis '+max+' eingeben, z. B. AC.'};const v=[...new Set(raw2)].sort().join('');if(v.split('').some(c=>c>max))return {valid:false,msg:'Es gibt nur die Buchstaben A bis '+max+'.'};return {valid:true,ok:v===t.answer,given:v}}
 if(t.kind==='code'){const v=squeeze(given);return {valid:true,ok:t.accept.some(a=>squeeze(a)===v),given}}
 if(t.kind==='free'){const v=fold(given);if(v.length<2)return {valid:false,msg:'Bitte mindestens ein Stichwort eingeben.'};const hit=t.groups.filter(g=>g.some(k=>v.includes(fold(k)))).length;return {valid:true,ok:hit>=t.need,given}}
 if(t.kind==='text'){const v=fold(given).replace(/[.;:]+$/,'')||fold(given);return {valid:true,ok:(t.accept||[t.answer]).some(a=>fold(a)===v),given}}
 const v=normalize(given);return {valid:true,ok:(t.accept||[t.answer]).some(a=>normalize(a)===v),given};
}
