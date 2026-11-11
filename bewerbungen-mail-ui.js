/* Bewerbungskompass – E-Mail, Adress-PDF, Vorlagen, Lebenslauf und Versand. */
(function () {
"use strict";
const app=window.Bewerbungskompass;
if(!app)return;
const $=id=>document.getElementById(id);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const API="bewerbungen-mail.php";
let cfg=null, hasSmtp=false, hasCv=false, cvFilename="", hasOriginal=false, originalFilename="", hasTemplate=false, templateFilename="", selected="",pdfUrl="",approved="",approvedHash="",approvedBlob=null,log=[];
const row=id=>app.rows().find(r=>String(r.id)===String(id));
const now=()=>new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date());
function mapTokens(s,c){
  const m={"FIRMA":c.company||"","ORT":c.city||"","ANSPRECHPARTNER":c.recipient||c.contact||"",
  "STRAßE":c.street||"","PLZ":c.postal||"","POSTORT":c.postCity||c.city||"",
  "ABSENDER":cfg.senderName||"","DATUM":now(),"ZEITRAUM":"09.08.2027–24.03.2028"};
  return String(s||"").replace(/\{(FIRMA|ORT|ANSPRECHPARTNER|STRAßE|PLZ|POSTORT|ABSENDER|DATUM|ZEITRAUM)\}/g,(a,k)=>m[k]||"");
}
async function post(action,payload,files){
  const opts={method:"POST",credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}};
  const p=Object.assign({csrf:app.csrf()},payload||{});
  if(files){
    const fd=new FormData();fd.append("payload",JSON.stringify(p));
    files.forEach(a=>fd.append(a[0],a[1]));opts.body=fd;
  } else {opts.headers["Content-Type"]="application/json";opts.body=JSON.stringify(p)}
  const r=await fetch(API+"?action="+action,opts);
  const d=await r.json().catch(()=>({error:"Unlesbare Serverantwort"}));
  if(!r.ok||d.error)throw new Error(d.error||"Serverfehler");
  return d;
}
async function refreshMail(){
  const r=await fetch(API+"?action=state",{credentials:"same-origin",cache:"no-store"});
  const d=await r.json().catch(()=>({error:"Serverantwort fehlerhaft"}));
  if(!r.ok||d.error)throw new Error(d.error||"Anmeldung notwendig");
  cfg=d.config;hasSmtp=!!d.smtpConfigured;hasCv=!!d.cvStored;cvFilename=d.cvFilename||"";hasOriginal=!!d.originalStored;originalFilename=d.originalFilename||"";hasTemplate=!!d.templateStored;templateFilename=d.templateFilename||"";log=d.history||[];
  refreshSettings();
}
function ready(){if(app.mode()==="ready")return true;alert("Bitte erst im geschützten Bewerbungskompass anmelden. Der SMTP-Versand ist nur online möglich.");return false}
function status(s,bad){const n=$("gdm-settings-status");if(n){n.textContent=s;n.classList.toggle("is-error",!!bad)}}
function uploadStatus(s,bad){const n=$("gdm-upload-status");if(n){n.textContent=s;n.classList.toggle("is-error",!!bad)}status(s,bad)}
function createSettings(){
  if($("gdm-settings-block"))return;
  const wrapper=document.createElement("div");wrapper.id="gdm-settings-block";
  wrapper.innerHTML=[
    '<div class="section-head"><div><p class="eyebrow">POSTAUSGANG / EINRICHTUNG</p><h2>Anschreiben &amp; E-Mail</h2></div></div>',
    '<div class="gdm-settings-cards"><div class="gdm-settings-card">',
    '<h3>Absender</h3><p>Die fünfseitige Mappe übernimmt den Briefkopf und deine Unterschrift unverändert. Die Firmenanschrift auf Seite 2 kommt automatisch aus der Kartei.</p>',
    '<form id="gdm-config-form">',
    '<div class="gdm-two"><label>Name<input id="gdm-senderName" required maxlength="120"></label><label>Absender-Mail<input value="willi.gering@mail.de" disabled></label></div>',
    '<label>Straße und Hausnummer<input id="gdm-senderStreet" maxlength="160" placeholder="Deine Anschrift"></label>',
    '<div class="gdm-two"><label>PLZ<input id="gdm-senderPostal" maxlength="15"></label><label>Ort<input id="gdm-senderCity" maxlength="100"></label></div>',
    '<label>Telefon (optional)<input id="gdm-senderPhone" maxlength="70"></label>',
    '<h3>E-Mail-Vorlage</h3><p>Betreff und Begleittext gelten für die E-Mail. Das Anschreiben stammt aus der Original-PDF.</p>',
    '<label>Betreff<input id="gdm-subjectTemplate" maxlength="250" required></label>',
    '<div hidden><label>Anrede<input id="gdm-salutationTemplate" maxlength="200"></label>',
    '<label>Text des Anschreibens (ohne Anschriften und Gruß)<textarea id="gdm-coverLetter" maxlength="16000" rows="10"></textarea></label></div>',
    '<label>Standard-Text für die E-Mail<textarea id="gdm-mailBodyTemplate" maxlength="6000" rows="6" required></textarea></label>',
    '<p class="gdm-small">Verfügbare Platzhalter: {FIRMA}, {ANSPRECHPARTNER}, {ORT}, {DATUM}, {ABSENDER}, {ZEITRAUM}</p>',
    '<div class="gdm-actions"><button class="button secondary" type="button" id="gdm-import-template">↑ Anschreiben-Vorlage importieren (JSON)</button></div>',
    '<input type="file" id="gdm-template-input" accept=".json,application/json" hidden>',
    '<p class="gdm-small">Vorlage aus deinen Unterlagen importieren, E-Mail-Text prüfen und anschließend „Einstellungen speichern“ klicken. SMTP-Daten bleiben unverändert.</p>',
    '<h3>mail.de verbinden</h3><p>Der Versand erfolgt direkt über smtp.mail.de (Port 587, STARTTLS). Das Kennwort wird verschlüsselt gespeichert, nicht im öffentlichen GitHub-Projekt.</p>',
    '<label>E-Mail-Konto<input value="willi.gering@mail.de" disabled></label>',
    '<label>SMTP-Passwort<input id="gdm-smtp-password" type="password" autocomplete="new-password" maxlength="400" placeholder="Nur zum Einrichten/Ändern eingeben"></label>',
    '<p class="gdm-small" id="gdm-smtp-status">Nicht eingerichtet</p>',
    '<div class="gdm-actions"><button class="button" type="submit" id="gdm-save-settings">Einstellungen speichern</button>',
    '<button class="button secondary" type="button" id="gdm-test-smtp">SMTP testen</button></div>',
    '<p class="gdm-state" id="gdm-settings-status" role="status"></p></form></div>',
    '<div class="gdm-settings-card"><h3>Meine Unterlagen</h3><p>Alle PDF-Dateien liegen privat hinter deinem Passwort auf dem Webserver und nicht im öffentlichen GitHub-Repository.</p>',
    '<details class="gdm-legacy-files"><summary>Optionale Einzeldatei (für die fünfseitige Mappe nicht nötig)</summary><h3>Lebenslauf und Arbeitszeugnis</h3>',
    '<p>Nur als zusätzliche persönliche Archivkopie. Beim Versand der fünfseitigen Bewerbungsmappe wird kein separater Lebenslauf angehängt.</p>',
    '<div class="gdm-file-card"><span class="gdm-file-icon">PDF</span><div><strong id="gdm-cv-status">Nicht hinterlegt</strong><small>PDF-Datei bis 6 MB</small></div></div>',
    '<input type="file" id="gdm-cv-input" accept=".pdf,application/pdf" hidden>',
    '<div class="gdm-actions"><button class="button secondary" id="gdm-upload-cv" type="button">↑ Hochladen/Ersetzen</button>',
    '<a class="button secondary" id="gdm-download-cv" href="bewerbungen-mail.php?action=cv" hidden>↓ Dokument</a>',
    '<button class="button danger" type="button" id="gdm-remove-cv" hidden>Entfernen</button></div></details>',
    '<details class="gdm-legacy-files"><summary>Bisherige PDF-Vorlage</summary>',
    '<p>Hier kannst du deine bisherige PDF-Vorlage herunterladen oder entfernen.</p>',
    '<div class="gdm-file-card"><span class="gdm-file-icon">PDF</span><div><strong id="gdm-map-status">Noch keine fünfseitige Vorlage hinterlegt</strong><small>Nur die vorbereitete Datei Bewerbungsmappe_Editierbare_Vorlage.pdf, bis 10 MB</small></div></div>',
    '<input type="file" id="gdm-map-input" accept=".pdf,application/pdf" hidden>',
    '<div class="gdm-actions"><button type="button" class="button secondary" id="gdm-upload-map">↑ Fünfseitige Vorlage hochladen</button>',
    '<a class="button secondary" id="gdm-download-map" href="bewerbungen-mail.php?action=template" hidden>↓ Vorlage</a>',
    '<button class="button danger" type="button" id="gdm-remove-map" hidden>Entfernen</button></div>',
    '</details>',
    '<h3>Fünfseitige Originalbewerbung</h3>',
    '<p class="gdm-state" id="gdm-upload-status" role="status" aria-live="polite"></p>',
    '<p>Lade die vollständige Original-PDF hoch. In der Vorschau erhält Seite 2 die Firmenanschrift aus der Kartei, das heutige Datum und die feste Anrede „Sehr geehrte Damen und Herren,“.</p>',
    '<div class="gdm-file-card"><span class="gdm-file-icon">PDF</span><div><strong id="gdm-original-status">Noch keine Originalbewerbung hinterlegt</strong><small>PDF-Datei bis 10 MB</small></div></div>',
    '<input type="file" id="gdm-original-input" accept=".pdf,application/pdf" hidden>',
    '<div class="gdm-actions"><button type="button" class="button secondary" id="gdm-upload-original">↑ Original-PDF hochladen</button>',
    '<a class="button secondary" id="gdm-download-original" href="bewerbungen-mail.php?action=original" hidden>↓ Original-PDF</a>',
    '<button class="button danger" type="button" id="gdm-remove-original" hidden>Entfernen</button></div>',
    '<h3>Versandverlauf</h3><p>Protokolliert werden Firma, Empfänger, Betreff, Datum und SMTP-Annahme. Das ist keine Lesebestätigung.</p>',
    '<div id="gdm-send-log"></div><p class="gdm-small">Bei unbestätigtem Versand zuerst bei mail.de im Ordner „Gesendet“ nachsehen, bevor du erneut versendest.</p>',
    '</div></div>'
  ].join("");
  $("settingsView").appendChild(wrapper);
  $("gdm-config-form").addEventListener("submit",async e=>{
    e.preventDefault();if(!ready())return;
    const data={};["senderName","senderStreet","senderPostal","senderCity","senderPhone","subjectTemplate",
      "salutation","coverLetter","mailBody"].forEach(k=>{
      const source=k==="salutation"?"gdm-salutationTemplate":k==="mailBody"?"gdm-mailBodyTemplate":"gdm-"+k;
      data[k]=$(source).value;
    });
    data.smtpPassword=$("gdm-smtp-password").value;
    try{$("gdm-save-settings").disabled=true;const r=await post("save-settings",data);
      cfg=r.config;hasSmtp=r.smtpConfigured;refreshSettings();status("✓ Einstellungen gespeichert.");}
    catch(ex){status(ex.message,true)}finally{$("gdm-save-settings").disabled=false}
  });
  $("gdm-test-smtp").addEventListener("click",async()=>{
    try{$("gdm-test-smtp").disabled=true;status("SMTP-Verbindung wird geprüft …");
      const r=await post("test-smtp",{});status(r.message);}
    catch(ex){status(ex.message,true)}finally{$("gdm-test-smtp").disabled=false}
  });
  $("gdm-upload-cv").addEventListener("click",()=>$("gdm-cv-input").click());
  $("gdm-cv-input").addEventListener("change",async()=>{
    const file=$("gdm-cv-input").files[0];$("gdm-cv-input").value="";
    if(!file)return;if(file.size>6*1024*1024){status("PDF größer als 6 MB.",true);return}
    try{await post("upload-cv",{},[["cv",file]]);await refreshMail();status("✓ Lebenslauf gespeichert.")}
    catch(ex){status(ex.message,true)}
  });
  $("gdm-remove-cv").addEventListener("click",async()=>{
    if(!confirm("Gespeicherten Lebenslauf wirklich entfernen?"))return;
    try{await post("remove-cv",{});await refreshMail();status("Lebenslauf entfernt.")}
    catch(ex){status(ex.message,true)}
  });
  $("gdm-upload-map").addEventListener("click",()=>$("gdm-map-input").click());
  $("gdm-map-input").addEventListener("change",async()=>{
    const file=$("gdm-map-input").files[0];$("gdm-map-input").value="";
    if(!file)return;
    uploadStatus("Prüfe und lade „"+file.name+"“ hoch …");
    if(file.size>10*1024*1024){uploadStatus("PDF-Vorlage größer als 10 MB.",true);return}
    try{await post("upload-template",{},[["template",file]]);await refreshMail();uploadStatus("✓ Fünfseitige Vorlage privat gespeichert.");}
    catch(ex){uploadStatus(ex.message,true)}
  });
  $("gdm-remove-map").addEventListener("click",async()=>{
    if(!confirm("Die fünfseitige Bewerbungsvorlage wirklich entfernen?"))return;
    try{await post("remove-template",{});await refreshMail();status("Bewerbungsvorlage entfernt.");}
    catch(ex){status(ex.message,true)}
  });
  $("gdm-upload-original").addEventListener("click",()=>$("gdm-original-input").click());
  $("gdm-original-input").addEventListener("change",async()=>{
    const file=$("gdm-original-input").files[0];$("gdm-original-input").value="";
    if(!file)return;uploadStatus("Lade Original-PDF „"+file.name+"“ hoch …");
    if(file.size>10*1024*1024){uploadStatus("Original-PDF größer als 10 MB.",true);return}
    try{await post("upload-original",{},[["original",file]]);await refreshMail();uploadStatus("✓ Originalbewerbung privat gespeichert.")}
    catch(ex){uploadStatus(ex.message,true)}
  });
  $("gdm-remove-original").addEventListener("click",async()=>{
    if(!confirm("Die private Originalbewerbung aus dem Bewerbungskompass entfernen?"))return;
    try{await post("remove-original",{});await refreshMail();status("Originalbewerbung entfernt.")}
    catch(ex){status(ex.message,true)}
  });
  $("gdm-import-template").addEventListener("click",()=>$("gdm-template-input").click());
  $("gdm-template-input").addEventListener("change",async()=>{
    const file=$("gdm-template-input").files[0];$("gdm-template-input").value="";
    if(!file)return;
    try{
      if(file.size>30000)throw new Error("Vorlagendatei zu groß.");
      const data=JSON.parse(await file.text());
      const names={senderName:"gdm-senderName",senderStreet:"gdm-senderStreet",
        senderPostal:"gdm-senderPostal",senderCity:"gdm-senderCity",senderPhone:"gdm-senderPhone",
        subjectTemplate:"gdm-subjectTemplate",salutation:"gdm-salutationTemplate",
        coverLetter:"gdm-coverLetter",mailBody:"gdm-mailBodyTemplate"};
      const limits={senderName:120,senderStreet:160,senderPostal:15,senderCity:100,
        senderPhone:70,subjectTemplate:250,salutation:200,coverLetter:16000,mailBody:6000};
      if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Ungültige Vorlage.");
      for(const key of Object.keys(names)){
        if(typeof data[key]!=="string"||data[key].length>limits[key])throw new Error("Ungültiges Feld: "+key);
      }
      if(!confirm("Die Formularfelder mit der hochgeladenen Vorlage ersetzen?\nDie Änderung wird erst über „Einstellungen speichern“ dauerhaft übernommen."))return;
      for(const [key,id] of Object.entries(names))$(id).value=data[key];
      status("✓ Vorlage ins Formular geladen. E-Mail-Text prüfen, danach Einstellungen speichern.");
      $("gdm-coverLetter").focus();
    }catch(ex){status("Vorlagenimport fehlgeschlagen: "+ex.message,true)}
  });

}
function refreshSettings(){
  if(!cfg||!$("gdm-config-form"))return;
  ["senderName","senderStreet","senderPostal","senderCity","senderPhone","subjectTemplate","coverLetter"].forEach(k=>{
    $("gdm-"+k).value=cfg[k]||"";
  });
  $("gdm-salutationTemplate").value=cfg.salutation||"";
  $("gdm-mailBodyTemplate").value=cfg.mailBody||"";
  $("gdm-smtp-password").value="";
  $("gdm-smtp-status").textContent=hasSmtp?"SMTP-Kennwort verschlüsselt hinterlegt.":"Noch kein SMTP-Kennwort hinterlegt.";
  $("gdm-cv-status").textContent=hasCv?cvFilename+" gespeichert":"Kein Lebenslauf oder Arbeitszeugnis hinterlegt";
  $("gdm-download-cv").hidden=!hasCv;$("gdm-remove-cv").hidden=!hasCv;
  $("gdm-original-status").textContent=hasOriginal?originalFilename+" privat gespeichert":"Noch keine Originalbewerbung hinterlegt";
  $("gdm-download-original").hidden=!hasOriginal;$("gdm-remove-original").hidden=!hasOriginal;
  $("gdm-map-status").textContent=hasTemplate?templateFilename+" · fünfseitige Vorlage bereit":"Noch keine fünfseitige Vorlage hinterlegt";
  $("gdm-download-map").hidden=!hasTemplate;$("gdm-remove-map").hidden=!hasTemplate;
  $("gdm-send-log").innerHTML=log.length?log.slice(0,25).map(item=>
    '<div class="gdm-history-row"><span>'+esc(item.created_at)+'<small>'+esc(item.recipient)+'</small></span>'+
    '<span>'+esc(item.subject)+'</span>'+
    '<b class="'+(item.status==="sent"?"ok":"warn")+'">'+(item.status==="sent"?"✓ Gesendet":"! Prüfen")+'</b></div>'
  ).join(""):'<p class="gdm-small">Noch keine E-Mail versendet.</p>';
}
function createComposer(){
  if($("gdm-overlay"))return;
  const overlay=document.createElement("div");overlay.className="gdm-overlay";overlay.id="gdm-overlay";overlay.hidden=true;
  overlay.innerHTML=[
    '<div class="gdm-compose" role="dialog" aria-modal="true" aria-labelledby="gdm-title">',
    '<div class="gdm-compose-head"><div><p class="eyebrow">BEWERBUNG / E-MAIL-VERSAND</p>',
    '<h2 id="gdm-title">Vorbereiten. <span>Prüfen. Senden.</span></h2></div>',
    '<button type="button" id="gdm-close" class="gdm-cross" aria-label="Schließen">×</button></div>',
    '<div class="gdm-compose-layout"><form id="gdm-compose-form" class="gdm-compose-fields">',
    '<div class="gdm-two"><label>Unternehmen<select id="gdm-company" required></select></label>',
    '<label>Von<input value="willi.gering@mail.de" disabled></label></div>',
    '<div id="gdm-address" class="gdm-address" aria-live="polite"></div>',
    '<label>Empfänger-E-Mail<input id="gdm-to" type="email" required placeholder="bewerbung@firma.de"></label>',
    '<label>Betreff<input id="gdm-subject" required maxlength="250"></label>',
    '<p class="gdm-small">Anrede im PDF: Sehr geehrte Damen und Herren,</p>',
    '<label>E-Mail-Begleittext<textarea id="gdm-message" rows="7" maxlength="6000" required></textarea></label>',
    '<div class="gdm-attachments"><strong>Anhänge</strong>',
    '<div><span class="gdm-file-icon">PDF</span><span><strong>Bewerbungsmappe.pdf · 5 Seiten</strong><small>Nur Seite 2 wird für den Betrieb beschriftet. Deckblatt, Lebenslauf, Arbeitszeugnis und Unterschrift bleiben unverändert.</small></span></div>',
    '<label class="gdm-check" id="gdm-cv-choice"><input type="checkbox" id="gdm-attach-cv"><span>Lebenslauf und Zeugnisse sind bereits in der Mappe enthalten</span></label>',
    '<label>Weitere PDFs (optional, höchstens 3 Dateien / insgesamt 8 MB)',
    '<input id="gdm-other-pdfs" type="file" accept=".pdf,application/pdf" multiple></label></div>',
    '<p class="gdm-small">Die PDF-Firmenanschrift kommt aus der Kartei. Stimmt sie nicht, bitte zuerst das Unternehmensprofil bearbeiten.</p>',
    '</form><div class="gdm-pdf-wrap">',
    '<div class="gdm-pdf-head"><div><strong>Vollständige Bewerbungsmappe · 5 Seiten</strong><small>Auf Seite 2 werden Firmenanschrift, Datum und Anrede eingesetzt. Alle Seiten vor dem Versand prüfen.</small></div>',
    '<a class="button secondary small" href="#" id="gdm-pdf-download" download="Bewerbungsmappe.pdf" hidden>↓ PDF</a></div>',
    '<div id="gdm-pdf-placeholder" class="gdm-preview-empty"><span>▤</span><strong>PDF-Vorschau</strong>',
    '<p>Klicke auf „Vorschau erstellen“, um das Anschreiben mit Firmenanschrift zu prüfen.</p></div>',
    '<iframe title="Anschreiben PDF-Vorschau" id="gdm-pdf-frame" hidden></iframe></div></div>',
    '<div class="gdm-compose-bottom"><p id="gdm-composer-state" class="gdm-state" role="status">',
    'Kein automatischer Versand. Du bestätigst jede E-Mail einzeln.</p>',
    '<div class="gdm-actions"><button class="button secondary" id="gdm-preview" type="button">◉ Vorschau erstellen</button>',
    '<button class="button" id="gdm-send" type="button" disabled>↗ E-Mail senden</button></div></div></div>'
  ].join("");
  document.body.appendChild(overlay);
  $("gdm-close").addEventListener("click",close);
  overlay.addEventListener("click",e=>{if(e.target===overlay)close()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!overlay.hidden)close()});
  $("gdm-company").addEventListener("change",()=>{selected=$("gdm-company").value;choose()});
  ["gdm-to","gdm-subject","gdm-message","gdm-attach-cv","gdm-other-pdfs"].forEach(k=>{
    $(k).addEventListener("input",invalidate);$(k).addEventListener("change",invalidate);
  });
  $("gdm-preview").addEventListener("click",preview);
  $("gdm-send").addEventListener("click",send);
}
function signature(){
  const f=fields();
  return JSON.stringify([f,Array.from($("gdm-other-pdfs").files).map(x=>[x.name,x.size,x.lastModified])]);
}
function fields(){
  return {entryId:selected,to:$("gdm-to").value.trim(),subject:$("gdm-subject").value.trim(),
    mailBody:$("gdm-message").value.trim(),attachCv:$("gdm-attach-cv").checked};
}
function invalidate(){
  approved="";approvedHash="";approvedBlob=null;$("gdm-send").disabled=true;
  $("gdm-pdf-frame").hidden=true;$("gdm-pdf-frame").src="about:blank";
  $("gdm-pdf-download").hidden=true;$("gdm-pdf-placeholder").hidden=false;
  if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=""}
}
function choose(){
  const c=row(selected);if(!c||!cfg)return;
  $("gdm-to").value=c.email||"";
  $("gdm-subject").value=mapTokens(cfg.subjectTemplate,c);
  $("gdm-message").value=mapTokens(cfg.mailBody,c);
  const address=[c.company,c.recipient||c.contact||"",c.street||"",
    [c.postal,c.postCity||c.city].filter(Boolean).join(" ")].filter(Boolean);
  const incomplete=!(c.street&&c.postal&&(c.postCity||c.city));
  $("gdm-address").innerHTML='<span>EMPFÄNGER IM PDF</span><strong>'+address.map(esc).join("<br>")+
    '</strong><small class="'+(incomplete?"warn":"")+'">'+
    (incomplete?"Die Anschrift ist noch unvollständig. Bitte Firma bearbeiten.":"Adresse automatisch aus der Firmenkartei.")+'</small>';
  $("gdm-attach-cv").checked=false;$("gdm-attach-cv").disabled=true;$("gdm-other-pdfs").value="";
  invalidate();$("gdm-composer-state").textContent=hasOriginal?
    "Die Vorschau übernimmt das Anschreiben aus deiner fünfseitigen Originalbewerbung.":
    "Bitte unter Daten & Sicherung → Meine Unterlagen die vollständige Original-PDF hinterlegen.";
}
async function open(company){
  if(!ready())return;
  try{await refreshMail()}catch(err){alert(err.message);return}
  const r=app.rows().filter(x=>["nicht_beworben","vorbereitet"].includes(x.status))
    .sort((a,b)=>(a.distanceKm==null?9999:a.distanceKm)-(b.distanceKm==null?9999:b.distanceKm));
  if(!r.length){alert("Keine Betriebe ohne Bewerbung vorhanden. Füge einen neuen Betrieb hinzu oder prüfe die Statusangaben in deiner Kartei.");return}
  $("gdm-company").innerHTML=r.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.company)+' · '+esc(x.city||"")+'</option>').join("");
  selected=company&&r.some(x=>String(x.id)===String(company))?company:r[0].id;
  $("gdm-company").value=selected;choose();
  $("gdm-overlay").hidden=false;document.body.classList.add("gdm-lock");$("gdm-to").focus();
}
function close(){
  $("gdm-overlay").hidden=true;document.body.classList.remove("gdm-lock");invalidate();
}
async function preview(){
  if(!$("gdm-compose-form").reportValidity())return;
  if(!hasOriginal){alert("Bitte unter Daten & Sicherung → Meine Unterlagen zuerst die vollständige Original-PDF hochladen.");return}
  const c=row(selected);if(!c)return;
  if(!(c.company&&c.street&&c.postal&&(c.postCity||c.city))){
    alert("Bitte zuerst die vollständige Firmenanschrift in der Kartei eintragen.");return;
  }
  const initialSignature=signature();
  $("gdm-preview").disabled=true;$("gdm-composer-state").textContent="Originalmappe wird vorbereitet …";
  try{
    const original=await fetch(API+"?action=original",{credentials:"same-origin",cache:"no-store"});
    if(!original.ok)throw new Error("Die gespeicherte Original-PDF konnte nicht geladen werden.");
    const bytes=await original.arrayBuffer();
    const blob=await window.GDMFivePage.make(bytes,{
      company:c.company,recipient:c.recipient||c.contact||"",street:c.street,
      postal:c.postal,city:c.postCity||c.city,date:now()
    });
    if(blob.size<100||blob.size>10*1024*1024)throw new Error("Ungültige Bewerbungsmappe.");
    const buffer=await blob.arrayBuffer();
    const digest=await crypto.subtle.digest("SHA-256",buffer);
    const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
    if(signature()!==initialSignature)throw new Error("Während der Vorschau wurden Eingaben geändert. Bitte erneut erstellen.");
    invalidate();
    approvedBlob=blob;pdfUrl=URL.createObjectURL(blob);
    $("gdm-pdf-frame").src=pdfUrl+"#page=2";
    $("gdm-pdf-frame").hidden=false;$("gdm-pdf-placeholder").hidden=true;
    $("gdm-pdf-download").href=pdfUrl;$("gdm-pdf-download").hidden=false;
    approved=initialSignature;approvedHash=hash;$("gdm-send").disabled=false;
    $("gdm-composer-state").textContent="Fünfseitige Mappe fertig. Bitte Seite 2 und die übrigen vier Seiten vor dem Versand prüfen.";
  }catch(err){invalidate();$("gdm-composer-state").textContent=err.message;alert(err.message)}
  finally{$("gdm-preview").disabled=false}
}
async function send(){
  if(!$("gdm-compose-form").reportValidity())return;
  if(!approved||!approvedHash||!approvedBlob||approved!==signature()){invalidate();$("gdm-composer-state").textContent="Die Vorschau wurde geändert. Bitte neu erstellen.";return}
  const c=row(selected);if(!c)return;
  const f=fields();
  const count=$("gdm-other-pdfs").files.length;
  if(count>3){alert("Maximal drei zusätzliche PDF-Dateien.");return}
  if(!confirm("Bewerbung wirklich absenden?\n\nVon: willi.gering@mail.de\nAn: "+f.to+"\nBetrieb: "+c.company+
    "\n\nAnlagen: Bewerbungsmappe.pdf (5 Seiten)"+
    (count?" + "+count+" zusätzliche PDFs":"")+
    "\n\nHast du die Anschrift und das fertige PDF geprüft?"))return;
  $("gdm-send").disabled=true;$("gdm-preview").disabled=true;
  $("gdm-composer-state").textContent="Versand über mail.de wird ausgeführt. Nicht doppelt klicken.";
  const identifier=window.crypto&&window.crypto.randomUUID?
    window.crypto.randomUUID().replace(/-/g,""):
    "send"+Date.now().toString(36)+Math.random().toString(36).slice(2);
  const files=Array.from($("gdm-other-pdfs").files).map(file=>["extra[]",file]);
  files.push(["map",new File([approvedBlob],"Bewerbungsmappe.pdf",{type:"application/pdf"})]);
  try{
    const r=await post("send",Object.assign({sendId:identifier,expectedPdfHash:approvedHash,useFivePage:true,attachCv:false},f),files);
    if(!r.sent)throw new Error("SMTP-Annahme nicht bestätigt.");
    $("gdm-composer-state").textContent="✓ SMTP hat die Bewerbung angenommen.";
    await app.reload();await refreshMail();
    alert("Bewerbung versendet. Status und Versandverlauf wurden aktualisiert.");
    close();
  }catch(err){
    invalidate();$("gdm-composer-state").textContent="Versand nicht bestätigt. Bitte zuerst in deinem mail.de-Postfach prüfen. "+err.message;
    alert("Versand nicht sicher bestätigt.\n\n"+err.message+"\n\nBitte zuerst den Postausgang prüfen, um Doppelversand zu vermeiden.");
  }finally{$("gdm-preview").disabled=false}
}
function augmentRows(){
  document.querySelectorAll(".data-table tbody tr[data-edit]").forEach(tr=>{
    const td=tr.querySelector(".td-action");
    if(!td||td.querySelector("[data-gdm-mail]"))return;
    const button=document.createElement("button");button.type="button";button.className="row-action gdm-mail-row";
    button.dataset.gdmMail=tr.dataset.edit;button.textContent="✉";button.title="Bewerbung an diese Firma schreiben";
    td.insertBefore(button,td.firstChild);
  });
  document.querySelectorAll(".mobile-card[data-edit]").forEach(card=>{
    if(card.querySelector("[data-gdm-mail]"))return;
    const button=document.createElement("button");button.type="button";button.className="row-action gdm-mail-row";
    button.dataset.gdmMail=card.dataset.edit;button.textContent="✉";button.title="Bewerbung an diese Firma schreiben";
    card.querySelector(".mobile-card-top").appendChild(button);
  });
}
function initialize(){
  createSettings();createComposer();
  const top=document.createElement("button");top.type="button";
  top.className="button secondary gdm-top-button";top.innerHTML="✉ <span>Bewerbung schreiben</span>";
  $("newTop").parentNode.insertBefore(top,$("newTop"));
  top.addEventListener("click",()=>open());
  // Capture: original table-row handler would otherwise open company editor.
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-gdm-mail]");if(!b)return;
    e.preventDefault();e.stopPropagation();open(b.dataset.gdmMail);
  },true);
  document.addEventListener("bewerbungen:render",augmentRows);augmentRows();
  const settingsTab=document.querySelector('.nav-item[data-view="settings"]');
  if(settingsTab)settingsTab.addEventListener("click",()=>{if(app.mode()==="ready")refreshMail().catch(err=>status(err.message,true))});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
else initialize();
})();
