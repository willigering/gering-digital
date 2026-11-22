const FMT={text:'Den gesuchten Begriff eingeben.',out:OUTFMT,code:'C# so schreiben, wie es im Editor stehen würde.',order:'Nur die Buchstaben in der richtigen Reihenfolge.'};
const PH={text:'Deine Antwort',out:'Ausgabe der Konsole',code:'C#-Code',order:'z. B. BADC'};
const normalize=s=>String(s).trim().replace(/\s+/g,' ');
/* Entfernt Leerraum außerhalb von Text; Inhalt von "..." bleibt exakt. */
function squeeze(s){let o='',q=false;s=String(s).trim();for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'&&s[i-1]!=='\\')q=!q;if(q||!/\s/.test(c))o+=c}return o}
function parseAnswer(t,raw){
 if(!String(raw??'').trim())return {valid:false,msg:'Erst eine Antwort eingeben. Nichts wurde gewertet.'};
 const given=String(raw).trim();
 if(t.kind==='order'){const v=given.toUpperCase().replace(/[^A-H]/g,'');if(v.length!==t.answer.length)return {valid:false,msg:'Bitte genau '+t.answer.length+' Buchstaben eingeben, z. B. '+'BADCEFGH'.slice(0,t.answer.length)+'.'};return {valid:true,ok:v===t.answer,given:v}}
 if(t.kind==='code'){const v=squeeze(given);return {valid:true,ok:t.accept.some(a=>squeeze(a)===v),given}}
 const v=normalize(given);return {valid:true,ok:(t.accept||[t.answer]).some(a=>normalize(a)===v),given};
}
