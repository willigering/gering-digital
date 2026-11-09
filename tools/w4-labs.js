// Hero: who pays when it crashes – the liability ladder instead of an unrelated animation.
$('bitwall').innerHTML='<p>GARAGE → GEWINN → GERICHTSVOLLZIEHER</p><div class="cash">Wer haftet?</div><p>e.K., GbR, OHG: alles, auch das Sofa<br>KG: einer voll, einer begrenzt<br>GmbH, UG, AG: nur die Firmenkasse</p>';
const LAB_LVL=n=>n<=1?'einer':n<10?'wenige':'viele';
const LAB_IDX=n=>n<=1?0:n<10?1:2;
const PROKURA_LAB=[
 ['Laptops für das Büro kaufen',true,true],['Neue Mitarbeiterin einstellen',true,true],['Bankkredit aufnehmen',true,false],['Firmengrundstück verkaufen',false,false],['Jemand anderem Prokura erteilen',false,false],['Jahresabschluss unterschreiben',false,false],['Prozess gegen einen Kunden führen',true,false]
];
function labResult(i,v){
 const [a,b,c,d,e]=v;
 switch(i){
 case 0:{const s=a+b+c;if(s<=0)throw Error('Mindestens ein Sektor braucht Beschäftigte.');return `Primär:   ${fd(a/s*100,1)} %\nSekundär: ${fd(b/s*100,1)} %\nTertiär:  ${fd(c/s*100,1)} %\nBeispielwerte. Je weiter eine Volkswirtschaft entwickelt ist,\ndesto größer ist meist der tertiäre Anteil.`;}
 case 1:{if(c>a+b)throw Error('Es können nicht mehr Produkte wegfallen, als es gibt.');return `Palette vorher: ${fd(a,0)} Produkte\nPalette nachher: ${fd(a+b-c,0)} Produkte\nÄnderungen der Palette: ${fd(b+c,0)}\n${fd(d,0)} Preisänderung(en) und ${fd(e,0)} neue(s) Gebiet(e) ändern die Palette nicht.`;}
 case 2:{if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1)throw Error('Anbieter und Nachfrager als ganze Zahlen ab 1.');return `Anbieter: ${LAB_LVL(a)} · Nachfrager: ${LAB_LVL(b)}\nMarktform: ${MF[LAB_IDX(a)][LAB_IDX(b)]}\nLernmodell: 1 = einer, 2–9 = wenige, ab 10 = viele.\nIn Aufgaben steht die Stufe immer im Text.`;}
 case 3:{const rest=Math.max(0,a-b),priv=Math.min(rest,c);return `Aus dem Betrieb: ${euro(Math.min(a,b))}\nAus dem Privatvermögen: ${euro(priv)}\n${rest>priv?'Bleibt offen: '+euro(rest-priv)+' (Schuld bleibt bestehen)':'Forderung vollständig gedeckt.'}`;}
 case 4:{const s=b+c+d;if(s!==0&&Math.abs(s-100)>1e-9)throw Error('Beteiligungen müssen zusammen 100 % ergeben (oder alle 0 für „nichts vereinbart“).');if(s===0)return `Nichts vereinbart → nach Köpfen (§ 709 Abs. 3 BGB)\nJe Gesellschafter: ${euro(round(a/3,2))}`;return `A: ${euro(round(a*b/100,2))}\nB: ${euro(round(a*c/100,2))}\nC: ${euro(round(a*d/100,2))}\nVerteilt nach vereinbarten Beteiligungsverhältnissen.`;}
 case 5:{if(c>b)throw Error('Eingezahlt kann nicht mehr sein als die Haftsumme.');const k=Math.min(b-c,a);return `Kommanditist haftet noch: ${euro(k)}\nKomplementär haftet: bis ${euro(a)} (unbeschränkt)\nGläubiger darf sich beim Komplementär den vollen Betrag holen.`;}
 case 6:{const gm=a>=25000?euro(Math.max(a/4,12500)):'– (unter 25.000 €: nur als UG, dann voll einzahlen)';return `GmbH-Mindesteinzahlung: ${gm}\nUG-Rücklage aus ${euro(b)}: ${euro(round(b/4,2))}\nUG höchstens ausschüttbar: ${euro(round(b*0.75,2))}`;}
 case 7:{if(b<1)throw Error('Nennbetrag mindestens 1 €.');if(a<50000)throw Error('Unter 50.000 € Grundkapital gibt es keine AG.');const n=a/b;if(!Number.isInteger(n))throw Error('Grundkapital muss durch den Nennbetrag teilbar sein.');if(c>n)throw Error('Anna kann nicht mehr Aktien haben, als es gibt.');return `Aktien insgesamt: ${fd(n,0)}\nStimmanteil Anna: ${fd(c/n*100,2)} %\nDividende Anna: ${euro(round(c*d,2))}`;}
 case 8:{if(!Number.isInteger(a)||a<1||a>7)throw Error('Bitte eine Nummer von 1 bis 7 wählen.');const [t,p,h]=PROKURA_LAB[a-1];return `Geschäft ${a}: ${t}\nProkurist: ${p?'darf':'darf nicht'}\nAllgemeiner Handlungsbevollmächtigter: ${h?'darf':'darf nicht (ohne besondere Befugnis)'}\n\n1 Laptops · 2 Einstellung · 3 Kredit · 4 Grundstück verkaufen\n5 Prokura erteilen · 6 Jahresabschluss · 7 Prozess`;}
 case 9:{if(!Number.isInteger(a)||a<1)throw Error('Mindestens ein Gründer.');if([c,d,e].some(x=>x!==0&&x!==1))throw Error('Für Ja/Nein bitte 1 oder 0 eingeben.');let r;
  if(e)r=b>=50000?'AG':'AG – aber erst ab 50.000 € Grundkapital';
  else if(c)r=b>=25000?'GmbH':'UG (haftungsbeschränkt)';
  else if(a===1)r=d?'Einzelunternehmen (e.K., ins Handelsregister)':'Einzelunternehmen';
  else r=d?'OHG (oder KG, wenn jemand nur Kapital gibt)':'GbR';
  return `Vorschlag: ${r}\nLernmodell nach den fünf Fragen der Lektion. Echte Gründungen\nbrauchen zusätzlich Steuer- und Rechtsberatung.`;}
 }
}
document.querySelectorAll('[data-lab]').forEach(lab=>{
 const i=Number(lab.dataset.lab),inputs=[...lab.querySelectorAll('input')],out=lab.querySelector('.lab-out');
 function update(){try{const vals=inputs.map(x=>parseNumber(x.value));if(vals.some(x=>!Number.isFinite(x)||x<0))throw Error('Bitte gültige, nichtnegative Zahlen eingeben.');out.textContent=labResult(i,vals);}catch(e){out.textContent=e.message;}}
 inputs.forEach(x=>x.addEventListener('input',update));update();
});
