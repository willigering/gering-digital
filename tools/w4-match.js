let match=[],matchRound=0;
const MATCH_BANK=[
 ['Komplementär','haftet in der KG persönlich und unbeschränkt','k_rolle'],['Kommanditist','haftet in der KG nur bis zur Haftsumme','k_rest'],['Prokura','Vollmacht für fast alle Geschäfte, aber keine Grundstücke verkaufen','r_prokura'],['Handlungsvollmacht','Vollmacht nur für gewöhnliche Geschäfte','r_handlung'],['Stammkapital','Mindestens 25.000 € bei der GmbH','h_einzahl'],['Grundkapital','Mindestens 50.000 € bei der AG','a_aktien'],['Aufsichtsrat','bestellt und überwacht den Vorstand','a_organ'],['Hauptversammlung','Versammlung der Aktionäre','a_organ'],['Polypol','viele Anbieter und viele Nachfrager','f_name'],['Nachfragemonopol','viele Anbieter, ein einziger Käufer','f_name'],['Angebotsoligopol','wenige Anbieter, viele Nachfrager','f_name'],['Kapitalmarkt','Markt für langfristiges Geld','m_markt'],['Beschaffungsmarkt','Markt, auf dem der Betrieb einkauft','m_markt'],['tertiärer Sektor','Handel, Banken und Dienstleistungen','s_sektor'],['Istkaufmann','muss wegen seines Betriebsumfangs ins Handelsregister','e_register'],['eGbR','im Gesellschaftsregister eingetragene GbR','g_egbr']
];
function matchNew(){
 matchRound++;$('trainNo').textContent='RUNDE '+matchRound;match=shuffle(MATCH_BANK).slice(0,5);
 const options=shuffle(MATCH_BANK);
 $('matchList').innerHTML=match.map((r,i)=>'<div class="match-row"><span>'+esc(r[1])+' '+helpHtml({plain:'Wähle den Fachbegriff, der zu dieser Beschreibung gehört.'},'matchTip'+i)+'</span><select id="ms'+i+'" aria-label="Begriff für '+esc(r[1])+'"><option value="">– wählen –</option>'+options.map(o=>'<option value="'+esc(o[0])+'">'+esc(o[0])+'</option>').join('')+'</select><span class="mk" id="mk'+i+'"></span></div>').join('');
 $('matchResult').innerHTML='';$('matchCheck').disabled=false;
}
$('matchCheck').addEventListener('click',()=>{
 if(match.some((_,i)=>!$('ms'+i).value)){$('matchResult').textContent='Erst alle Zeilen beantworten. Noch nichts gewertet.';return;}
 let c=0;const lines=[];
 match.forEach((r,i)=>{const given=$('ms'+i).value,ok=given===r[0];if(ok)c++;count(ok,'match');$('ms'+i).disabled=true;$('mk'+i).textContent=ok?'✓':'✗';lines.push('<p>'+(ok?'✓':'✗')+' '+esc(r[1])+': <strong>'+esc(r[0])+'</strong>. Deine Antwort: '+esc(given)+'<span class="quip">'+(ok?qOk():qBad())+'</span>'+'</p>');});
 $('matchResult').innerHTML='<strong>'+c+' von 5 richtig. Jede Zeile einzeln gewertet.</strong>'+lines.join('');$('matchCheck').disabled=true;
});
$('matchNext').addEventListener('click',matchNew);
