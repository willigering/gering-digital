let match=[],matchRound=0;
const MATCH_BANK=[
 ['Rabatt','Nachlass vom Listenpreis','a_rabatt'],['Skonto','Nachlass für fristgerechte schnelle Zahlung','b_skonto'],['Bezugspreis','Bareinkaufspreis plus Bezugskosten','b_bezug'],['Selbstkosten','Bezugspreis plus Handlungskosten','v_selbst'],['Nutzwert','Summe der gewichteten Bewertungspunkte','n_summe'],['Abschreibung','Verteilung des Wertverbrauchs über die Nutzungsdauer','d_jahr'],['Amortisationsdauer','Zeit bis Rückflüsse die Investition decken','m_zeit'],['Deckungsbeitrag','Erlös minus variable Kosten','e_db'],['Kosten-Stundensatz','Jahreskosten geteilt durch abrechenbare Stunden','s_kosten'],['Make or Buy','Eigenleistung oder Fremdbezug entscheiden','o_wahl']
];
function matchNew(){
 matchRound++;$('trainNo').textContent='RUNDE '+matchRound;match=shuffle(MATCH_BANK).slice(0,5);
 const options=shuffle(MATCH_BANK);
 $('matchList').innerHTML=match.map((r,i)=>'<div class="match-row"><span>'+esc(r[1])+' '+helpHtml({plain:'Wähle den Fachbegriff, der zu dieser Erklärung gehört.'},'matchTip'+i)+'</span><select id="ms'+i+'" aria-label="Begriff für '+esc(r[1])+'"><option value="">– wählen –</option>'+options.map(o=>'<option value="'+esc(o[0])+'">'+esc(o[0])+'</option>').join('')+'</select><span class="mk" id="mk'+i+'"></span></div>').join('');
 $('matchResult').innerHTML='';$('matchCheck').disabled=false;
}
$('matchCheck').addEventListener('click',()=>{
 if(match.some((_,i)=>!$('ms'+i).value)){$('matchResult').textContent='Erst alle Zeilen beantworten. Noch nichts gewertet.';return;}
 let c=0;const lines=[];
 match.forEach((r,i)=>{const given=$('ms'+i).value,ok=given===r[0];if(ok)c++;count(ok,'match');$('ms'+i).disabled=true;$('mk'+i).textContent=ok?'✓':'✗';lines.push('<p>'+(ok?'✓':'✗')+' '+esc(r[1])+': <strong>'+esc(r[0])+'</strong>. Deine Antwort: '+esc(given)+(ok?'':'<span class="quip">'+qBad()+'</span>')+'</p>');});
 $('matchResult').innerHTML='<strong>'+c+' von 5 richtig. Jede Zeile einzeln gewertet.</strong>'+lines.join('');$('matchCheck').disabled=true;
});
$('matchNext').addEventListener('click',matchNew);
