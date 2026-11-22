const FMT={num:'Zahl eingeben, Komma oder Punkt als Dezimaltrenner. Einheiten wie €, % oder Stimmen sind erlaubt.',text:'Den gesuchten Begriff eingeben. Groß-/Kleinschreibung, Punkte und Leerzeichen sind egal.'};
const PH={num:'z. B. 12500 oder 7,5',text:'Deine Antwort'};
// Compare terms without case, umlauts (ä = ae = a), punctuation or spaces: "e.K." = "ek", "UG (haftungsbeschränkt)" = "ug haftungsbeschraenkt".
const normalize=s=>String(s).trim().toLocaleLowerCase('de-DE').replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ae/g,'a').replace(/oe/g,'o').replace(/ue/g,'u').replace(/\bund\b/g,'&').replace(/[^a-z0-9&]/g,'');
function parseNumber(raw){
 let s=String(raw??'').trim().replace(/[\u2212\u2013]/g,'-').replace(/\s|\u00a0/g,'');
 s=s.replace(/(?:€|eur|euro|%|prozent|[a-zäöüß]+)\.?$/i,'');
 if(s.includes(',')){if(!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d+$/.test(s))return NaN;s=s.replace(/\./g,'').replace(',','.');}
 else if(/^-?\d{1,3}(?:\.\d{3})+$/.test(s)){s=s.replace(/\./g,'');}
 if(!/^-?\d+(?:\.\d+)?$/.test(s))return NaN;
 const n=Number(s);return Number.isFinite(n)?n:NaN;
}
function parseAnswer(t,raw){
 if(!String(raw??'').trim())return {valid:false,msg:'Erst eine Antwort eingeben. Nichts wurde gewertet.'};
 if(t.kind==='text'){const s=normalize(raw);if(!s)return {valid:false,msg:'Bitte einen Begriff eingeben. Nichts wurde gewertet.'};return {valid:true,ok:(t.accept||[t.answer]).some(v=>normalize(v)===s),given:String(raw).trim()};}
 const n=parseNumber(raw);
 if(!Number.isFinite(n))return {valid:false,msg:'Bitte eine Zahl eingeben, z. B. 12500 oder 12.500,00. Keine Rechnung eingeben.'};
 const tol=t.d===0?1e-9:0.5*Math.pow(10,-(t.d??2))+1e-9;
 return {valid:true,ok:Math.abs(n-t.answer)<=tol,given:fd(n,Math.min(4,t.d??2))+(t.unit?' '+t.unit:'')};
}
