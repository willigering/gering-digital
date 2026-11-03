// Hero: a visible purchase calculation, not an unrelated bit animation.
$('bitwall').innerHTML='<p>LISTE → RABATT → SKONTO → FRACHT</p><div class="cash">1.000 € → 902 €</div><p>10 % Rabatt · 2 % Skonto · 20 € Fracht<br>Der Preis hat einen Rechenweg.</p>';
function labResult(i,v){
 const [a,b,c,d,e]=v;
 switch(i){
 case 0:if(!Number.isInteger(b)||b<1)throw Error('Menge als positive ganze Zahl.');return `A: ${b} × ${money(a)} + ${money(c)} = ${money(a*b+c)}\nB: ${money(d)}\n${a*b+c===d?'Gleichstand':a*b+c<d?'A ist günstiger':'B ist günstiger'}`;
 case 1:if(b>=100||c>=100)throw Error('Nachlässe müssen unter 100 % liegen.');{const r=cent(a*b/100),z=cent(a-r),s=cent(z*c/100),bar=cent(z-s);return `Rabatt: ${money(r)}\nZiel: ${money(z)}\nSkonto auf Ziel: ${money(s)}\nBar: ${money(bar)}\nBezug mit Fracht: ${money(bar+d)}`;}
 case 2:{const h=cent(a*b/100),s=cent(a+h),g=cent(s*c/100);return `Handlungskosten: ${money(h)}\nSelbstkosten: ${money(s)}\nGewinn: ${money(g)}\nBarverkaufspreis netto: ${money(s+g)}`;}
 case 3:if(a>100||[b,c,d,e].some(x=>x>5))throw Error('Gewicht 0–100 %, Punkte 0–5.');{const x=a*b/100+(100-a)*c/100,y=a*d/100+(100-a)*e/100;return `Preisgewicht ${a} %, Supportgewicht ${100-a} %\nA: ${fd(x,2)} Punkte\nB: ${fd(y,2)} Punkte\n${Math.abs(x-y)<1e-9?'Gleichstand':x>y?'A gewinnt':'B gewinnt'}\nNur Angebote ohne verletzte Pflichtanforderung bewerten.`;}
 case 4:if(c<=0)throw Error('Laufzeit muss positiv sein.');return `Kauf: ${money(a)} + ${c} × ${money(b)} − ${money(d)} = ${money(a+c*b-d)}\nMiete: ${c*12} × ${money(e)} = ${money(c*12*e)}\nOhne Zins-, Steuer- und Abzinsungseffekte.`;
 case 5:if(b<=0||c>b||!Number.isInteger(c))throw Error('Nutzungsdauer positiv; volle Jahre zwischen 0 und Nutzungsdauer.');return `Linear jährlich: ${money(a)} ÷ ${b} = ${money(a/b)}\nNach ${c} vollen Jahren: ${money(a-c*a/b)} Buchwert\nUnterrichtsmodell ohne Restwert und ohne steuerliche Sonderregeln.`;
 case 6:{const r=b-c;return `Netto-Rückfluss: ${money(b)} − ${money(c)} = ${money(r)} jährlich\n${r>0?money(a)+' ÷ '+money(r)+' = '+fd(a/r,2)+' Jahre':'Kein positiver Rückfluss: keine endliche Amortisation.'}`;}
 case 7:{const db=b-c;return `Deckungsbeitrag: ${money(db)} je Auftrag\n${db>0?'Rechnerische Gewinnschwelle: '+fd(a/db,2)+'; erste verlustfreie ganze Menge: '+Math.ceil(a/db):'Bei positiven Fixkosten keine endliche Gewinnschwelle.'}\nGewinn bei ${d} Aufträgen: ${money(d*db-a)}`;}
 case 8:if(b<=0)throw Error('Abrechenbare Stunden müssen positiv sein.');return `Kosten-Stundensatz: ${money(a)} ÷ ${b} = ${money(a/b)}/h\nMit ${c} % Gewinnzuschlag: ${money(a/b*(1+c/100))}/h netto`;
 case 9:return `Make: ${money(a)} + ${d} × ${money(b)} = ${money(a+d*b)}\nBuy: ${d} × ${money(c)} = ${money(d*c)}\n${c>b?'Kritische Menge: '+fd(a/(c-b),2)+' Geräte. An dieser Menge Gleichstand.':'Buy ist bei nichtnegativen Make-Fixkosten und diesen Stückkosten nicht teurer.'}`;
 }
}
document.querySelectorAll('[data-lab]').forEach(lab=>{
 const i=Number(lab.dataset.lab),inputs=[...lab.querySelectorAll('input')],out=lab.querySelector('.lab-out');
 function update(){try{const vals=inputs.map(x=>parseNumber(x.value));if(vals.some(x=>!Number.isFinite(x)||x<0))throw Error('Bitte gültige, nichtnegative Zahlen eingeben.');out.textContent=labResult(i,vals);}catch(e){out.textContent=e.message;}}
 inputs.forEach(x=>x.addEventListener('input',update));update();
});
