const FMT={num:'Komma oder Punkt als Dezimaltrenner. Geld auf 2 Nachkommastellen; Einheiten sind erlaubt.',text:'Den gesuchten Begriff eingeben. Groß- und Kleinschreibung ist egal.'};
const PH={num:'z. B. 1200,50',text:'Deine Antwort'};
const normalize=s=>String(s).trim().toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[.!?]$/,'').replace(/\s+/g,' ');
function parseNumber(raw){
 let s=String(raw??'').trim().replace(/[−–]/g,'-').replace(/\s|\u00a0/g,'');
 s=s.replace(/(?:€\/h|eur\/h|€|eur|%|punkte?|jahre?|auftr[aä]ge?|ger[aä]te?|h)$/i,'');
 if(s.includes(',')){if(!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d+$/.test(s))return NaN;s=s.replace(/\./g,'').replace(',','.');}
 else if(/^-?\d{1,3}(?:\.\d{3})+$/.test(s)){s=s.replace(/\./g,'');}
 if(!/^-?\d+(?:\.\d+)?$/.test(s))return NaN;
 const n=Number(s);return Number.isFinite(n)?n:NaN;
}
function parseAnswer(t,raw){
 if(!String(raw??'').trim())return {valid:false,msg:'Erst eine Antwort eingeben. Nichts wurde gewertet.'};
 if(t.kind==='text'){const s=normalize(raw);return {valid:true,ok:(t.accept||[t.answer]).some(v=>normalize(v)===s),given:String(raw).trim()};}
 const n=parseNumber(raw);
 if(!Number.isFinite(n))return {valid:false,msg:'Bitte eine Zahl eingeben, z. B. 1200,50 oder 1200.50. Keine Rechnung eingeben.'};
 // Fixed half-step tolerance, never a relative percentage of a large money amount.
 const tol=t.d===0?1e-9:0.005000001;
 return {valid:true,ok:Math.abs(n-t.answer)<=tol,given:fd(n,Math.min(4,t.d??2))+(t.unit?' '+t.unit:'')};
}
