let match=[],matchRound=0;
const MATCH_BANK=__MATCH__;
function matchNew(){
 matchRound++;$('trainNo').textContent='RUNDE '+matchRound;match=shuffle(MATCH_BANK).slice(0,5);
 const options=shuffle(MATCH_BANK);
 $('matchList').innerHTML=match.map((r,i)=>'<div class="match-row"><span>'+r[1]+' '+helpHtml({plain:'Wähle den Fachbegriff, der zu dieser Beschreibung gehört.'},'matchTip'+i)+'</span><select id="ms'+i+'" aria-label="Begriff für '+esc(r[1])+'"><option value="">– wählen –</option>'+options.map(o=>'<option value="'+o[0]+'">'+o[0]+'</option>').join('')+'</select><span class="mk" id="mk'+i+'"></span></div>').join('');
 $('matchResult').innerHTML='';$('matchCheck').disabled=false;
}
const unesc=s=>{const d=document.createElement('textarea');d.innerHTML=s;return d.value};
$('matchCheck').addEventListener('click',()=>{
 if(match.some((_,i)=>!$('ms'+i).value)){$('matchResult').textContent='Erst alle Zeilen beantworten. Noch nichts gewertet.';return;}
 let c=0;const lines=[];
 match.forEach((r,i)=>{const given=$('ms'+i).value,ok=given===unesc(r[0]);if(ok)c++;count(ok,'match');$('ms'+i).disabled=true;$('mk'+i).textContent=ok?'✓':'✗';lines.push('<p>'+(ok?'✓':'✗')+' '+r[1]+': <strong>'+r[0]+'</strong>. Deine Antwort: '+esc(given)+'<span class="quip">'+(ok?qOk():qBad())+'</span></p>');});
 $('matchResult').innerHTML='<strong>'+c+' von 5 richtig. Jede Zeile einzeln gewertet.</strong>'+lines.join('');$('matchCheck').disabled=true;
});
$('matchNext').addEventListener('click',matchNew);
