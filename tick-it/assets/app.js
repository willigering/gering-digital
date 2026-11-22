'use strict';
const API='api.php';
const state={actor:null,csrf:document.body.dataset.csrf,categories:[],view:'tickets',filter:'all',search:'',dateFrom:'',dateTo:'',page:1,
  stats:{cards:{}},list:{items:[],total:0,page:1,pages:1},selected:null,detail:null,
  participants:[],supporters:[],reviews:[],ranking:[],audit:[],private:null,pmGuest:null,unread:0,
  generator:null,generatorError:null,generatorDiagnostics:null,roleChoice:'customer',adminLogin:false,mobileMenu:false,modal:null,loading:false,lastUpdated:null,requestSeq:0};
const el=document.getElementById('app');
const S=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(d)=>{if(!d)return '—';const date=new Date(d.replace(' ','T')+'Z');return Number.isNaN(+date)?S(d):new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(date)};
const statusLabels={new:'Neu',open:'Offen',assigned:'Zugewiesen',in_progress:'In Bearbeitung',waiting_customer:'Warten auf Kunde',waiting_support:'Warten auf Support',solved:'Gelöst',closed:'Geschlossen'};
const priorityLabels={low:'Niedrig',normal:'Normal',high:'Hoch',critical:'Kritisch'};
const roleLabels={customer:'Kunde',supporter:'Supporter',admin:'Dozent'};
const icons={dashboard:'⌂',tickets:'▤',mine:'◉',messages:'▣',participants:'♧',stats:'▥',reviews:'★',training:'⚑',settings:'⚙',audit:'≡'};
const navs={customer:[['tickets','Meine Tickets'],['messages','Nachrichten']],supporter:[['dashboard','Übersicht'],['tickets','Ticketpool'],['mine','Meine Tickets'],['messages','Nachrichten'],['stats','Statistiken']],admin:[['dashboard','Gesamtübersicht'],['tickets','Alle Tickets'],['participants','Teilnehmer'],['messages','Nachrichten'],['reviews','Bewertungen'],['stats','Statistiken'],['training','Schulungsfälle'],['audit','Aktivitätsprotokoll'],['settings','Administration']]};
const headings={dashboard:['Übersicht','Alle wichtigen Informationen auf einen Blick.'],tickets:['Ticketpool','Anfragen priorisieren, übernehmen und bearbeiten.'],mine:['Meine Tickets','Hier liegen deine übernommenen Fälle.'],messages:['Private Nachrichten','Direkter Kontakt zwischen Dozent und Teilnehmern.'],participants:['Teilnehmer','Aktive Sitzungen und Unterrichtsorganisation.'],stats:['Statistiken','Kennzahlen zur Einordnung der Supportarbeit.'],reviews:['Bewertungen','Rückmeldungen aus abgeschlossenen Fällen.'],training:['Schulungsfälle','Realistische IT-Szenarien vorbereiten und freigeben.'],settings:['Administration','Kategorien, Kennwort und Schutzfunktionen.'],audit:['Aktivitätsprotokoll','Nachvollziehbare administrative Eingriffe.']};
const filters={supporter:[['pool','Nicht zugewiesen'],['mine','Meine Tickets'],['active','Aktiv'],['waiting','Wartend'],['closed','Abgeschlossen'],['all','Alle sichtbaren']],customer:[['all','Alle'],['active','Aktiv'],['waiting','Wartend'],['closed','Abgeschlossen']],admin:[['all','Alle'],['pool','Ticketpool'],['active','Aktiv'],['waiting','Wartend'],['closed','Abgeschlossen'],['drafts','Entwürfe']]};
function toast(text,bad=false){const x=document.createElement('div');x.className='toast'+(bad?' error':'');x.textContent=text;document.getElementById('toasts').append(x);setTimeout(()=>x.remove(),4500)}
async function api(action,data=null,qs={}){
  const u=new URL(API,location.href);u.searchParams.set('action',action);for(const [k,v] of Object.entries(qs))if(v!==null&&v!==undefined)u.searchParams.set(k,String(v));
  const opt={credentials:'same-origin',headers:{'Accept':'application/json'}};
  if(data!==null){opt.method='POST';opt.headers['Content-Type']='application/json';opt.headers['X-CSRF-Token']=state.csrf;opt.body=JSON.stringify(data)}
  let res;try{res=await fetch(u,opt)}catch(_){throw new Error('Keine Verbindung zum Server. Netzwerk prüfen.');}
  let result;try{result=await res.json()}catch(_){throw new Error('Der Server hat keine gültige Antwort geliefert.');}
  if(!res.ok||!result.ok){if(res.status===401){state.actor=null;state.detail=null;drawLogin()}throw new Error(result.error||'Unbekannter Fehler.');}
  return result.data;
}
async function post(action,data){try{return await api(action,data)}catch(e){toast(e.message,true);return null}}
const pill=(status)=>`<span class="pill status-${S(status)}">${S(statusLabels[status]||status)}</span>`;
const prio=(priority)=>`<span class="pill priority-${S(priority)}">${S(priorityLabels[priority]||priority)}</span>`;
const avatar=(name)=>`<span class="avatar" aria-hidden="true">${S((name||'?').slice(0,2).toUpperCase())}</span>`;
const empty=(title,desc='')=>`<div class="empty"><div><div class="emoji">▧</div><strong>${S(title)}</strong><p>${S(desc)}</p></div></div>`;
function drawLogin(){
  const admin=state.adminLogin;
  el.innerHTML=`<main class="auth-page"><div class="auth-wrap"><section class="auth-hero">
    <div class="brand"><span class="brand-mark">◈</span><span>IT SUPPORT<small>SERVICE DESK</small></span></div>
    <h1>Support, der<br><span>einfach funktioniert.</span></h1><p>Das gemeinsame Ticketsystem für realistische IT-Supportübungen.</p>
    <div class="auth-features"><div><i>◈</i> Tickets gemeinsam bearbeiten</div><div><i>◉</i> Kommunikation an einem Ort</div><div><i>◎</i> Übersicht ohne unnötiges Chaos</div></div></section>
    <section class="auth-form-side"><h2>${admin?'Dozentenzugang':'Willkommen im Service Desk'}</h2><p class="intro">${admin?'Anmeldung zum geschützten Administrationsbereich.':'Wähle deine Rolle und starte ohne Registrierung.'}</p>
    ${admin?`<form data-form="admin-login"><div class="form-field"><label for="adminname">Benutzername</label><input id="adminname" name="username" autocomplete="username" required></div>
      <div class="form-field"><label for="adminpass">Passwort</label><input type="password" id="adminpass" name="password" autocomplete="current-password" required></div>
      <button class="btn btn-primary btn-block" type="submit">Sicher anmelden →</button></form>`:
      `<div class="role-choices"><button class="role-choice ${state.roleChoice==='customer'?'active':''}" data-action="choice" data-role="customer"><span class="ic">♙</span>Kunde</button>
      <button class="role-choice ${state.roleChoice==='supporter'?'active':''}" data-action="choice" data-role="supporter"><span class="ic">▣</span>Supporter</button></div>
      <form data-form="guest-login"><div class="form-field"><label for="guestname">Dein Anzeigename</label><input id="guestname" name="name" placeholder="z. B. Max Schneider" autocomplete="nickname" maxlength="80" minlength="2" required></div>
      <button class="btn btn-primary btn-block" type="submit">Als ${state.roleChoice==='customer'?'Kunde':'Supporter'} starten →</button></form>`}
      <div class="login-divider"><button class="btn btn-plain btn-block" data-action="toggle-admin">${admin?'← Zurück zum Gastzugang':'⚿ Zugang für Dozenten'}</button></div>
      <p class="auth-footer">Schulungsumgebung · Gastnamen sind kein Identitätsnachweis. Teile keine Passwörter oder vertraulichen persönlichen Daten.</p>
    </section></div></main>`;
}
function sidebar(){const a=state.actor;
  return `<aside class="sidebar ${state.mobileMenu?'mobile-open':''}"><div class="brand brand--side"><span class="brand-mark">◈</span><span class="brand-label">IT SUPPORT<small>SERVICE DESK</small></span></div>
    <p class="nav-title">ARBEITSBEREICH</p><nav aria-label="Hauptnavigation">${navs[a.role].map(([id,label])=>`<button class="nav-item ${state.view===id?'active':''}" data-action="nav" data-view="${id}" aria-label="${label}" title="${label}"><span class="nav-icon">${icons[id]}</span><span class="nav-label">${label}</span>${id==='messages'&&state.unread?`<span class="nav-badge">${state.unread}</span>`:''}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="user-chip">${avatar(a.name)}<div><b>${S(a.name)}</b><small>${roleLabels[a.role]}</small></div></div><button class="btn btn-plain logout" data-action="logout">⇥ Sitzung verlassen</button></div>
    <div class="mobile-nav"><button class="icon-button" data-action="mobile-menu" aria-label="Menü öffnen">☰</button></div></aside>`;
}
function topbar(){const a=state.actor;const h=headings[state.view]||headings.tickets;
  return `<header class="topbar"><div class="top-heading"><h1>${h[0]}</h1><p>${h[1]}</p></div>
  <div class="top-actions"><span class="badge-online"><span class="status-dot"></span> Schulungsumgebung</span>
  <button class="icon-button" data-action="nav" data-view="messages" aria-label="Private Nachrichten">♧${state.unread?'<span class="notification-dot"></span>':''}</button>
  ${a.role==='customer'?'<button class="btn btn-primary" data-action="create">＋ Neues Ticket</button>':''}
  <span class="top-user" title="${S(a.name)}">${avatar(a.name)}</span></div></header>`;
}
function frame(body){el.innerHTML=`<div class="layout">${sidebar()}<main class="content">${topbar()}${body}</main></div>${state.modal?modalHtml():''}`}
function kpis(){const cards=state.stats.cards||{};let set=[];
 if(state.actor.role==='customer')set=[['total','Alle Tickets','▤'],['active','In Bearbeitung','◉'],['waiting','Warten auf mich','◷'],['finished','Abgeschlossen','✓']];
 else if(state.actor.role==='supporter')set=[['pool','Offene Tickets','▤'],['active','Meine aktiven Tickets','♙'],['waiting','Wartend','◷'],['finished','Abgeschlossen','✓']];
 else set=[['open','Offene Tickets','▤'],['ongoing','In Bearbeitung','♙'],['online','Teilnehmer online','◎'],['finished','Abgeschlossen','✓']];
 return `<div class="kpis">${set.map(([key,label,icon],i)=>`<article class="card kpi ${key==='waiting'?'orange':key==='finished'?'green':''}"><div class="kpi-icon">${icon}</div><div><div class="kpi-label">${label}</div><div class="kpi-value">${cards[key]??0}</div></div></article>`).join('')}</div>`;
}
function ticketFilters(){return `<div class="tabs" role="tablist" aria-label="Ticketansicht">${filters[state.actor.role].map(([k,n])=>`<button class="tab ${state.filter===k?'active':''}" data-action="filter" data-filter="${k}" role="tab" aria-selected="${state.filter===k}">${n}</button>`).join('')}</div>`}
function ticketList(){const d=state.list||{items:[],total:0,page:1,pages:1};
  return `<section class="card ticket-list"><div class="ticket-list-head"><div class="section-heading"><h2>Tickets <span class="muted">(${d.total||0})</span></h2>${state.actor.role==='customer'?'<button class="btn btn-sm btn-primary" data-action="create">＋ Ticket erstellen</button>':''}</div>
    <div class="toolbar"><input id="ticket-search" type="search" value="${S(state.search)}" placeholder="Ticket, Kunde, Supporter suchen …" aria-label="Tickets durchsuchen"><button class="btn btn-sm" data-action="refresh">↻ Aktualisieren</button></div>
    ${state.actor.role==='admin'?`<div class="toolbar" style="margin-top:8px"><label for="from-date" style="margin:0">Von</label><input id="from-date" type="date" value="${S(state.dateFrom)}" style="width:145px" aria-label="Tickets ab Datum"><label for="to-date" style="margin:0">Bis</label><input id="to-date" type="date" value="${S(state.dateTo)}" style="width:145px" aria-label="Tickets bis Datum"></div>`:''}</div>
    ${ticketFilters()}${d.items.length?`<div class="table-scroll"><table class="ticket-table"><thead><tr><th>Ticket</th><th>Betreff</th><th>Priorität</th><th class="hide-mid">Status</th><th>Aktion</th></tr></thead><tbody>${d.items.map(t=>`<tr class="${state.selected===+t.id?'selected':''}" data-action="open" data-id="${t.id}" tabindex="0" aria-label="Ticket ${S(t.ticket_no)} öffnen">
    <td><div class="ticket-id mono">${S(t.ticket_no)}</div><div class="ticket-meta">${fmt(t.updated_at)}</div></td><td><div class="ticket-subject" title="${S(t.subject)}">${S(t.subject)}</div><div class="ticket-meta">${S(t.source==='training'?'⚑ Übung':t.customer_name||'')}</div></td>
    <td>${prio(t.priority)}</td><td class="hide-mid">${pill(t.status)}</td><td>${state.actor.role==='supporter'&&!t.assigned_supporter_id&&t.is_published==1?`<button class="btn btn-sm btn-primary" data-action="claim" data-id="${t.id}">Übernehmen</button>`:`<button class="btn btn-sm" data-action="open" data-id="${t.id}">Öffnen</button>`}</td></tr>`).join('')}</tbody></table></div>`:
    empty('Keine Tickets gefunden',state.filter==='pool'?'Im Moment ist tatsächlich mal Ruhe.':'Passe den Filter an oder erstelle ein neues Ticket.')}
    <div class="list-footer"><span>${d.total?((d.page-1)*20+1):0}–${Math.min(d.page*20,d.total)} von ${d.total} Tickets</span>
    <div class="pagination"><button data-action="page" data-page="${d.page-1}" ${d.page<=1?'disabled':''} aria-label="Vorherige Seite">‹</button><b>${d.page} / ${d.pages}</b><button data-action="page" data-page="${d.page+1}" ${d.page>=d.pages?'disabled':''} aria-label="Nächste Seite">›</button></div></div></section>`;
}
function selectOptions(obj,chosen){return Object.entries(obj).map(([k,v])=>`<option value="${S(k)}" ${k===chosen?'selected':''}>${S(v)}</option>`).join('')}
function categoryOptions(chosen){return state.categories.map(c=>`<option value="${c.id}" ${+c.id===+chosen?'selected':''}>${S(c.name)}</option>`).join('')}
function ticketDetail(){if(!state.detail)return `<section class="card detail">${empty('Ticket auswählen','Links ein Ticket öffnen, um den vollständigen Verlauf und die Bearbeitung zu sehen.')}</section>`;
  const {ticket:t,messages,history,review}=state.detail;const a=state.actor;const owner=a.role==='customer'&&+t.customer_id===a.id;
  const assignee=a.role==='supporter'&&+t.assigned_supporter_id===a.id;const staff=assignee||a.role==='admin';const claimable=a.role==='supporter'&&!t.assigned_supporter_id&&+t.is_published===1;
  const statuses=a.role==='admin'?statusLabels:Object.fromEntries(Object.entries(statusLabels).filter(([k])=>!['new','open'].includes(k)));
  const readOnly=a.role==='customer'&&t.status==='closed';
  return `<section class="card detail"><div class="detail-head"><div class="detail-toprow"><div><div class="detail-title"><span class="ticket-id mono">${S(t.ticket_no)}</span> – ${S(t.subject)}</div><div class="minor"><span>♙ ${S(t.customer_name||'Übungsszenario')}</span><span>▣ ${S(t.category_name)}</span><span>◷ ${fmt(t.created_at)}</span></div></div><button class="icon-button" data-action="close-detail" title="Detailansicht schließen">×</button></div></div>
  <div class="detail-body">${t.source==='training'?'<div class="notice">⚑ Übungsfall: Diese Anfrage wurde zu Trainingszwecken erstellt. Simulierte Absender können nicht selbstständig antworten.</div>':''}
    <div class="detail-grid"><div><h3>Kommunikationsverlauf</h3><div class="timeline" id="timeline">${messages.length?messages.map(m=>messageHtml(m,a)).join(''):empty('Noch keine Nachrichten','Beginne die Unterhaltung mit einer freundlichen, konkreten Antwort.')}</div>
    ${(!readOnly&&(owner||staff))?`<form class="compose" data-form="message" data-ticket="${t.id}">${staff?`<label for="message-type">Sichtbarkeit</label><select id="message-type" name="type"><option value="public">Öffentliche Antwort</option><option value="internal">Interne Notiz – nur für Support</option></select>`:''}
       <label for="message-body">${staff?'Antwort oder Notiz':'Nachricht an den Support'}</label><textarea id="message-body" name="body" placeholder="Schreibe hier deine Nachricht …" maxlength="12000" required></textarea>
       <div class="compose-foot"><input type="file" name="file" accept=".pdf,.txt,.png,.jpg,.jpeg" aria-label="Optionalen Anhang auswählen" title="PDF, JPG, PNG oder TXT bis 5 MB"><button class="btn btn-primary btn-sm" type="submit">➤ Senden</button></div><p class="hint">Max. 5 MB · PDF, JPG, PNG oder TXT</p></form>`:
       claimable?`<button class="btn btn-primary btn-block" data-action="claim" data-id="${t.id}">Ticket übernehmen, um zu antworten</button>`:''}
    ${a.role!=='customer'&&history.length?`<details class="more" style="margin-top:16px"><summary>Änderungsprotokoll (${history.length})</summary><div style="margin-top:9px">${history.map(h=>`<p>${fmt(h.created_at)} · ${S(h.actor)} · ${S(h.action)} ${h.old_value||h.new_value?`(${S(h.old_value||'–')} → ${S(h.new_value||'–')})`:''}</p>`).join('')}</div></details>`:''}
    ${owner&&['closed','solved'].includes(t.status)&&!review?`<button class="btn btn-primary" style="margin-top:14px" data-action="review" data-id="${t.id}">★ Support bewerten</button>`:''}
    ${review?`<p class="hint" style="margin-top:15px">★ Bewertung: ${S(review.stars)} / 5 ${owner?'– danke für dein Feedback.':''}</p>`:''}
    ${a.role==='admin'&&t.sample_solution?`<details class="notice" style="margin-top:14px"><summary>🔒 Musterlösung (nur Dozent)</summary><p style="white-space:pre-wrap;margin-top:10px">${S(t.sample_solution)}</p></details>`:''}</div>
    <aside class="detail-info"><h3>Ticketdaten</h3><div class="kv"><span>Status</span>${staff?`<select data-change="status" data-id="${t.id}" aria-label="Ticketstatus ändern">${selectOptions(statuses,t.status)}</select>`:pill(t.status)}</div>
    <div class="kv"><span>Priorität</span>${staff?`<select data-change="priority" data-id="${t.id}" aria-label="Priorität ändern">${selectOptions(priorityLabels,t.priority)}</select>`:prio(t.priority)}</div>
    <div class="kv"><span>Kategorie</span>${staff?`<select data-change="category" data-id="${t.id}" aria-label="Kategorie ändern">${categoryOptions(t.category_id)}</select>`:`<b>${S(t.category_name)}</b>`}</div>
    <div class="kv"><span>Kunde</span><b>${S(t.customer_name||'Übungsszenario')}</b></div><div class="kv"><span>Zugewiesen</span><b>${S(t.supporter_name||'Noch nicht zugewiesen')}</b></div>
    <div class="kv"><span>Erstellt</span><b>${fmt(t.created_at)}</b></div>
    ${claimable?`<button class="btn btn-primary btn-block" data-action="claim" data-id="${t.id}">Ticket übernehmen</button>`:''}
    ${staff?`<button class="btn btn-block" data-action="status-quick" data-id="${t.id}" data-status="solved">✓ Als gelöst markieren</button><button class="btn btn-block" data-action="status-quick" data-id="${t.id}" data-status="closed">Ticket schließen</button>`:''}
    ${staff&&t.assigned_supporter_id?`<button class="btn btn-block" data-action="release" data-id="${t.id}">↶ Freigeben</button>`:''}
    ${assignee?`<label style="margin-top:13px" for="handover-${t.id}">Ticket übergeben</label><div class="input-row"><select id="handover-${t.id}" data-handover-select="${t.id}"><option value="">Supporter wählen</option>${state.supporters.filter(p=>+p.id!==a.id).map(p=>`<option value="${p.id}">${S(p.display_name)}</option>`).join('')}</select><button class="btn btn-sm" data-action="handover" data-id="${t.id}">OK</button></div>`:''}
    ${owner&&['solved','closed'].includes(t.status)?`<button class="btn btn-block" data-action="reopen" data-id="${t.id}">↶ Ticket wieder öffnen</button>`:''}
    ${a.role==='admin'?`<label style="margin-top:13px" for="assign-${t.id}">Supporter zuweisen</label><div class="input-row"><select id="assign-${t.id}" data-assign-select="${t.id}"><option value="">Supporter wählen</option>${state.participants.filter(p=>p.role==='supporter'&&!p.banned_at).map(p=>`<option value="${p.id}">${S(p.display_name)}</option>`).join('')}</select><button class="btn btn-sm" data-action="assign" data-id="${t.id}">OK</button></div>
     ${+t.is_published===0?`<button class="btn btn-primary btn-block" data-action="publish" data-id="${t.id}">⚑ Fall veröffentlichen</button>`:''}`:''}
    </aside></div></div></section>`;
}
function messageHtml(m,a){const self=(a.kind==='guest'&&m.author===a.name)||a.role==='admin'&&m.sender_kind==='admin';
  return `<article class="message ${m.message_type==='internal'?'internal':m.message_type==='event'?'event':self?'self':''}">
    ${m.message_type!=='event'?`<header class="message-head"><b>${S(m.author)}</b><span class="muted">${S(roleLabels[m.sender_kind]||m.sender_kind)}</span>${m.message_type==='internal'?'<span class="tiny-tag">INTERNE NOTIZ</span>':''}<time>${fmt(m.created_at)}</time></header>`:''}
    <div class="message-body">${S(m.body)}</div>${m.attachments?.length?`<div class="attachments">${m.attachments.map(f=>`<a class="attachment" href="api.php?action=download&id=${f.id}">↧ ${S(f.original_name)} (${Math.ceil(f.size_bytes/1024)} KB)</a>`).join('')}</div>`:''}</article>`;
}
function ticketWorkspace(){return `${kpis()}<div class="ticket-workspace">${ticketList()}${ticketDetail()}</div>`}
function participantsView(){return `<div class="card panel-pad"><div class="section-heading"><h2>Teilnehmer (${state.participants.length})</h2><span class="hint">Online: Aktivität in den letzten 2 Minuten</span></div>
  <div class="people-list">${state.participants.length?state.participants.map(p=>`<div class="person-row"><div class="input-row">${avatar(p.display_name)}<div class="person-name">${S(p.display_name)} <span class="pill">${roleLabels[p.role]}</span><small>${p.online?'● Online':'○ Offline'} · ${p.active_tickets} aktive Tickets · zuletzt ${fmt(p.last_seen_at)} ${p.banned_at?'· GESPERRT':''}</small></div></div>
  <div class="person-actions"><button class="btn btn-sm" data-action="participant-tickets" data-name="${S(p.display_name)}">Tickets</button><button class="btn btn-sm" data-action="pm-open" data-id="${p.id}">✉ Nachricht ${p.unread_pm?'('+p.unread_pm+')':''}</button><button class="btn btn-sm" data-action="kick" data-id="${p.id}">Abmelden</button>
  <button class="btn btn-sm ${p.banned_at?'':'btn-danger'}" data-action="ban" data-id="${p.id}" data-ban="${p.banned_at?'0':'1'}">${p.banned_at?'Entsperren':'Sperren'}</button></div></div>`).join(''):empty('Noch keine Teilnehmer','Kunden und Supporter können ohne Registrierung beitreten.')}</div></div>`}
function messagesView(){const a=state.actor;const t=state.private;
  if(a.role==='admin'&&!state.pmGuest)return `<div class="card panel-pad"><h2>Unterhaltung auswählen</h2><p class="muted">Wähle einen Teilnehmer aus der Übersicht, um ihn privat anzuschreiben.</p><button class="btn btn-primary" data-action="nav" data-view="participants">Zur Teilnehmerübersicht</button></div>`;
  const name=a.role==='admin'?(state.participants.find(p=>+p.id===+state.pmGuest)?.display_name||'Teilnehmer'):'Dozent';
  return `<section class="card panel-pad"><div class="section-heading"><h2>Privat: ${S(name)}</h2>${a.role==='admin'?'<button class="btn" data-action="nav" data-view="participants">← Teilnehmer</button>':''}</div>
   <div class="chat" id="private-chat">${t?.messages?.length?[...t.messages].reverse().map(m=>`<div class="pm ${m.sender_role===a.role?'mine':''}"><time>${S(m.sender_role==='admin'?'Dozent':'Teilnehmer')} · ${fmt(m.created_at)}</time><p>${S(m.body)}</p></div>`).join(''):empty('Noch keine Nachrichten','Du kannst hier direkt mit dem Dozenten bzw. Teilnehmer sprechen.')}</div>
   <form data-form="private" class="compose" style="margin-top:14px"><label for="private-body">Private Nachricht verfassen</label><textarea id="private-body" name="body" required maxlength="8000" placeholder="Nachricht schreiben …"></textarea>
   <div class="actions"><button class="btn btn-primary" type="submit">➤ Nachricht senden</button></div></form>
   <p class="hint">Private Nachrichten erscheinen nicht in öffentlichen Ticketverläufen.</p></section>`;
}
function statsView(){const a=state.actor;return `<div class="card panel-pad"><h2>Supporter-Statistik</h2>${state.ranking.length?`<div class="table-scroll"><table class="plain-table"><thead><tr><th>Supporter</th><th>Übernommen</th><th>Abgeschlossen</th><th>Aktiv</th><th>Ø Bewertung</th><th>Ø Dauer</th></tr></thead><tbody>${state.ranking.map(p=>`<tr><td><b>${S(p.display_name)}</b></td><td>${p.taken}</td><td>${p.finished}</td><td>${p.active}</td><td><span class="stars">★</span> ${p.avg_rating??'–'} (${p.reviews})</td><td>${p.avg_hours??'–'} h</td></tr>`).join('')}</tbody></table></div>`:empty('Noch keine Supportdaten','Sobald Tickets bearbeitet werden, erscheinen hier Kennzahlen.')}
  <p class="hint" style="margin-top:16px">Bewertungen sind subjektive Rückmeldungen und keine automatische Leistungsbeurteilung.</p></div>`}
function reviewsView(){return `<div class="card panel-pad"><h2>Ticketbewertungen</h2>${state.reviews.length?`<div class="table-scroll"><table class="plain-table"><thead><tr><th>Ticket</th><th>Supporter</th><th>Sterne</th><th>Einzelkriterien</th><th>Kommentar</th></tr></thead><tbody>${state.reviews.map(r=>`<tr><td>${S(r.ticket_no)}</td><td>${S(r.supporter_name)}</td><td><span class="stars">${'★'.repeat(+r.stars)}${'☆'.repeat(5-(+r.stars))}</span></td>
  <td>Freundlichkeit ${r.friendliness} · Verständlichkeit ${r.clarity} · Lösung ${r.resolution} · Tempo ${r.speed}</td><td>${S(r.comment||'–')}</td></tr>`).join('')}</tbody></table></div>`:empty('Noch keine Bewertungen','Nach einem Abschluss können Kunden ihre Erfahrung bewerten.')}</div>`}
function generatorPanel(){
 const data=state.generator,run=data?.run||{},status=run.status||'idle';
 const running=status==='running',paused=status==='paused',active=running||paused;
 const count=Number(run.generated||0),max=Number(run.max_total||1000),next=run.next_due_at?fmt(run.next_due_at):'—';
 const startCount=active?Number(run.initial_count||100):100;
 const rate=Number(run.batch_count||5),period=Number(run.interval_minutes||5);
 const stateNames={idle:'Noch kein Lauf',running:'Läuft',paused:'Pausiert',stopped:'Gestoppt',complete:'Abgeschlossen'};
 return `<section class="card panel-pad gen-panel" aria-label="Automatischer Anfragenstrom">
   <div class="section-heading"><div><h2>◈ Automatischer Anfrage-Strom</h2><p class="muted" style="margin-top:7px">Realistische IT-Meldungen in Wellen. Nur der Dozent steuert den Lauf.</p></div><span class="pill ${running?'status-in_progress':'status-closed'}">${S(stateNames[status])}</span></div>
   <div class="gen-stats"><div><b>${data?.templates||900}</b><small>verschiedene Formulierungen</small></div><div><b>${data?.topics||60}</b><small>reale Problemarten</small></div><div><b id="generator-issued">${count} / ${max}</b><small>in diesem Lauf gesendet</small></div><div><b id="generator-next">${S(next)}</b><small>nächste Zustellung</small></div></div>
   <p class="hint">Vier Sprachstile · zufällige, unabhängige Absendernamen · 600-Texte-Wiederholungssperre · fällige Wellen beim nächsten Seitenaufruf (oder exakt per STRATO-Cronjob).</p>
   <form data-form="${active?'generator-update':'generator-start'}" class="gen-form">
     ${!active?`<div class="form-field"><label for="gen-initial">Tickets direkt beim Start <b data-range-label="gen-initial">${startCount}</b></label><input id="gen-initial" name="initial_count" type="range" min="0" max="100" step="5" value="${startCount}" aria-label="Sofort zu Beginn" /></div>`:''}
     <div class="form-field"><label for="gen-rate">Neue Tickets je Welle <b data-range-label="gen-rate">${rate}</b></label><input id="gen-rate" name="batch_count" type="range" min="1" max="30" step="1" value="${rate}" aria-label="Ticketanzahl pro Welle" /></div>
     <div class="form-field"><label for="gen-interval">Abstand zwischen Wellen <b><span data-range-label="gen-interval">${period}</span> Min.</b></label><input id="gen-interval" name="interval_minutes" type="range" min="1" max="60" step="1" value="${period}" aria-label="Zeitabstand in Minuten" /></div>
     <div class="form-field"><label for="gen-limit">Maximal für diesen Lauf</label><input id="gen-limit" type="number" name="max_total" value="${max}" min="100" max="5000" step="50" required /></div>
     <div class="gen-actions"><button class="btn btn-primary" type="submit">${active?'Einstellungen übernehmen':'▶ Lauf starten'}</button>
       ${running?'<button class="btn" type="button" data-action="generator-pause">Ⅱ Pausieren</button>':''}
       ${paused?'<button class="btn btn-primary" type="button" data-action="generator-resume">▶ Fortsetzen</button>':''}
       ${active?'<button class="btn btn-danger" type="button" data-action="generator-stop">■ Lauf stoppen</button>':''}<button class="btn" type="button" data-action="generator-diagnostics">Datenbank prüfen</button>
     </div>
   </form>
   <p class="hint">Der Start erzeugt standardmäßig sofort 100 veröffentlichte Übungstickets. Das Stoppen löscht <strong>keine</strong> bereits erzeugten Tickets. Automatische Kundenantworten sind nicht aktiviert.</p>
 </section>`;
}
function trainingView(){const drafts=state.list.items||[];
const diagnostic=state.generatorDiagnostics;
const problem=state.generatorError||(!diagnostic?.ready&&diagnostic?.message)||'';
return `<div class="view-grid">${problem?`<div class="notice" role="alert" style="grid-column:1/-1;border-color:#ce795e"><strong>Generator prüfen:</strong> ${S(problem)} <button class="btn btn-sm" data-action="generator-diagnostics" type="button">Datenbankdiagnose</button></div>`:''}${generatorPanel()}<section class="card panel-pad"><h2>Neuen Übungsfall vorbereiten</h2><form data-form="training"><div class="form-field"><label for="training-subject">Betreff</label><input id="training-subject" name="subject" required minlength="4" maxlength="180" placeholder="z. B. DHCP-Server nicht erreichbar"></div>
<div class="form-grid"><div class="form-field"><label for="training-category">Kategorie</label><select id="training-category" name="category_id">${categoryOptions(null)}</select></div><div class="form-field"><label for="training-prio">Priorität</label><select id="training-prio" name="priority">${selectOptions(priorityLabels,'normal')}</select></div></div>
<div class="form-field"><label for="training-description">Simulierte Kundenanfrage</label><textarea id="training-description" name="description" required minlength="10" maxlength="15000"></textarea></div>
<div class="form-field"><label for="training-solution">Musterlösung (nur Dozent sichtbar)</label><textarea id="training-solution" name="sample_solution" minlength="3" required maxlength="20000"></textarea></div>
<button class="btn btn-primary btn-block" type="submit">⚑ Als Entwurf speichern</button></form></section>
<section class="card panel-pad"><h2>Unveröffentlichte Übungsfälle (${state.list.total})</h2><div class="people-list">${drafts.length?drafts.map(t=>`<div class="person-row"><label class="input-row" style="margin:0"><input type="checkbox" class="training-check" value="${t.id}" style="width:16px;min-height:16px"><span>${S(t.ticket_no)}<small>${S(t.subject)}</small></span></label>
<button class="btn btn-sm" data-action="publish" data-id="${t.id}">Veröffentlichen</button></div>`).join(''):empty('Keine Entwürfe','Lege links einen Übungsfall an.')}</div>
<div class="actions"><button class="btn btn-primary" data-action="publish-many">Auswahl veröffentlichen</button></div><div class="divider"></div>
<h3>Übungsdaten zurücksetzen</h3><p class="hint">Löscht dauerhaft nur Übungsfälle und ihre Verläufe, niemals echte Kundentickets. Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
<button class="btn btn-danger" data-action="training-reset">Übungsfälle löschen …</button></section></div>`}
function auditView(){return `<section class="card panel-pad"><h2>Administrative Aktionen</h2>${state.audit.length?`<div class="table-scroll"><table class="plain-table"><thead><tr><th>Zeitpunkt</th><th>Dozent</th><th>Aktion</th><th>Objekt</th><th>Details</th></tr></thead><tbody>${state.audit.map(r=>`<tr><td>${fmt(r.created_at)}</td><td>${S(r.username||'System')}</td><td>${S(r.action)}</td><td>${S((r.target_type||'')+' '+(r.target_id||''))}</td><td>${S(r.details||'–')}</td></tr>`).join('')}</tbody></table></div>`:empty('Noch keine Aktionen')}</section>`}
function settingsView(){return `<div class="view-grid"><section class="card panel-pad"><h2>Kategorien verwalten</h2><div class="people-list">${(state.allCategories||state.categories).map(c=>`<div class="person-row"><b>${S(c.name)} ${+c.is_active===0?'(inaktiv)':''}</b><div class="person-actions"><button class="btn btn-sm" data-action="edit-category" data-id="${c.id}" data-name="${S(c.name)}">Umbenennen</button><button class="btn btn-sm" data-action="toggle-category" data-id="${c.id}" data-name="${S(c.name)}" data-active="${+c.is_active===0?'1':'0'}">${+c.is_active===0?'Aktivieren':'Deaktivieren'}</button></div></div>`).join('')}</div><div class="divider"></div><form data-form="category"><label for="category-name">Neue Kategorie</label><div class="input-row"><input id="category-name" name="name" minlength="2" maxlength="80" required placeholder="z. B. Telefonie"><button class="btn btn-primary" type="submit">Hinzufügen</button></div></form></section>
<section class="card panel-pad"><h2>Dozentenpasswort ändern</h2><form data-form="password"><div class="form-field"><label for="old-pass">Aktuelles Passwort</label><input type="password" id="old-pass" name="old_password" autocomplete="current-password" required></div>
<div class="form-field"><label for="new-pass">Neues Passwort (mindestens 14 Zeichen)</label><input type="password" id="new-pass" name="new_password" autocomplete="new-password" minlength="14" required></div>
<button class="btn btn-primary" type="submit">Passwort ändern</button></form><div class="divider"></div><h3>Datenschutz & Sicherheit</h3><p class="hint">Gastzugänge sind nicht authentifiziert. Keine echten Zugangsdaten oder sensiblen Daten in Übungstickets verwenden. Aufbewahrungsdauer und Löschung im Betrieb festlegen.</p></section></div>`}
function modalHtml(){const m=state.modal;if(!m)return '';
  if(m.type==='create')return `<div class="floating-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-card"><div class="modal-title"><h2 id="modal-title">Neues IT-Ticket erstellen</h2><button class="icon-button" data-action="modal-close" aria-label="Schließen">×</button></div><form data-form="create">
  <div class="form-field"><label for="new-subject">Betreff *</label><input id="new-subject" name="subject" maxlength="180" minlength="4" placeholder="Was funktioniert nicht?" required></div>
  <div class="form-grid"><div class="form-field"><label for="new-category">Kategorie *</label><select id="new-category" name="category_id">${categoryOptions(null)}</select></div><div class="form-field"><label for="new-prio">Priorität *</label><select id="new-prio" name="priority">${selectOptions(priorityLabels,'normal')}</select></div></div>
  <div class="form-field"><label for="new-description">Problembeschreibung *</label><textarea id="new-description" name="description" maxlength="15000" minlength="10" required placeholder="Was genau ist passiert? Seit wann? Gibt es eine Fehlermeldung?"></textarea></div>
  <div class="actions"><button class="btn" data-action="modal-close" type="button">Abbrechen</button><button class="btn btn-primary" type="submit">➤ Ticket absenden</button></div></form></div></div>`;
  if(m.type==='review')return `<div class="floating-modal" role="dialog" aria-modal="true"><div class="modal-card"><div class="modal-title"><h2>Support bewerten</h2><button class="icon-button" data-action="modal-close">×</button></div><form data-form="review" data-id="${m.id}">
  ${[['stars','Gesamteindruck'],['friendliness','Freundlichkeit'],['clarity','Verständlichkeit'],['resolution','Problemlösung'],['speed','Reaktionsgeschwindigkeit']].map(([k,label])=>`<div class="form-field"><label for="review-${k}">${label}</label><select id="review-${k}" name="${k}">${[5,4,3,2,1].map(n=>`<option value="${n}" ${n===5?'selected':''}>${'★'.repeat(n)} (${n}/5)</option>`).join('')}</select></div>`).join('')}
  <div class="form-field"><label for="review-comment">Kommentar (optional)</label><textarea id="review-comment" name="comment" maxlength="1000"></textarea></div><div class="actions"><button class="btn" type="button" data-action="modal-close">Abbrechen</button><button class="btn btn-primary">Bewertung speichern</button></div></form></div></div>`;
  return '';
}
function draw(){if(!state.actor)return drawLogin();
  let body='';if(state.loading)body=`<div class="card">${empty('Wird geladen …')}</div>`;
  else if(['dashboard','tickets','mine'].includes(state.view))body=ticketWorkspace();
  else if(state.view==='messages')body=messagesView();else if(state.view==='participants')body=participantsView();
  else if(state.view==='stats')body=statsView();else if(state.view==='reviews')body=reviewsView();
  else if(state.view==='training')body=trainingView();else if(state.view==='audit')body=auditView();
  else if(state.view==='settings')body=settingsView();
  if(state.actor.role==='admin'&&state.view==='dashboard'&&state.stats.presence){const p=state.stats.presence;body=`<div class="notice">● ${p.customers} Kunden online · ${p.supporters} Supporter online · ${p.idle_supporters} Supporter ohne aktive Tickets</div>`+body;}
  if(state.actor.role==='customer'&&state.view==='tickets')body=`<div class="notice">Deine Tickets sind privat. Nur du, dein zuständiger Supporter und der Dozent können sie sehen.</div>`+body;
  frame(body);
}
async function route(view,opts={}){
 if(!state.actor)return;
 if(!navs[state.actor.role].some(x=>x[0]===view))view=navs[state.actor.role][0][0];
 const seq=++state.requestSeq;if(view==='training'){state.generatorError=null;state.generatorDiagnostics=null;}state.view=view;state.mobileMenu=false;state.loading=true;state.detail=null;state.selected=null;
 state.filter=view==='mine'?'mine':view==='tickets'&&state.actor.role==='supporter'?'pool':'all';state.page=1;state.search='';state.dateFrom='';state.dateTo='';draw();
 try {
   if(['dashboard','tickets','mine'].includes(view)){
     const [stats,list,people,supporters]=await Promise.all([api('stats'),api('tickets',null,{filter:state.filter,page:1}),state.actor.role==='admin'?api('participants'):Promise.resolve([]),state.actor.role==='supporter'?api('supporters'):Promise.resolve([])]);
     if(seq!==state.requestSeq)return;state.stats=stats;state.list=list;state.participants=people;state.supporters=supporters;
     if(list.items.length&&opts.selectFirst!==false){const tid=+list.items[0].id;state.selected=tid;try{state.detail=await api('ticket',null,{id:tid})}catch(e){state.detail=null}}
   }else if(view==='participants'){state.participants=await api('participants')}
   else if(view==='messages'){
     if(state.actor.role==='admin'&&!state.participants.length)state.participants=await api('participants');
     state.private=state.actor.role==='admin'&&!state.pmGuest?null:await api('private',null,state.actor.role==='admin'?{guest_id:state.pmGuest}:{});
     if(state.private)await api('private_read',state.actor.role==='admin'?{guest_id:state.pmGuest}:{});
   }else if(view==='stats'){state.ranking=await api('supporter_stats')}
   else if(view==='reviews'){state.reviews=await api('reviews')}
   else if(view==='training'){[state.list,state.generator]=await Promise.all([api('tickets',null,{filter:'drafts'}),api('generator_status')]);}
   else if(view==='audit'){state.audit=await api('audit');}
   else if(view==='settings'){state.allCategories=await api('categories_admin');}
 }catch(e){if(view==='training')state.generatorError=e.message;toast(e.message,true)}finally{if(seq===state.requestSeq){state.loading=false;draw();scrollChats()}}
}
async function refreshCurrent(keep=true){if(!state.actor)return;
  const prev=keep?state.selected:null;
  if(['dashboard','tickets','mine'].includes(state.view)){
    try{
      const [stats,list]=await Promise.all([api('stats'),api('tickets',null,{filter:state.filter,page:state.page,search:state.search,date_from:state.dateFrom,date_to:state.dateTo})]);
      state.stats=stats;state.list=list;
      if(prev && (state.actor.role!=='supporter'||list.items.some(x=>+x.id===prev)||state.filter==='mine')){
        try{state.detail=await api('ticket',null,{id:prev});state.selected=prev}catch(_){state.detail=null;state.selected=null}
      }else if(list.items.length){state.selected=+list.items[0].id;state.detail=await api('ticket',null,{id:state.selected})}
      else{state.selected=null;state.detail=null}
      if(state.actor.role==='admin')state.participants=await api('participants');
      draw();scrollChats();
    }catch(e){toast(e.message,true)}
  }else await route(state.view);
}
async function openTicket(id){try{state.detail=await api('ticket',null,{id});state.selected=id;draw();scrollChats();
    if(window.innerWidth<700)document.querySelector('.detail')?.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){toast(e.message,true)}}
function scrollChats(){for(const id of ['timeline','private-chat']){const n=document.getElementById(id);if(n)n.scrollTop=n.scrollHeight}}
async function initialize(){try{const x=await api('session');state.actor=x.actor;state.csrf=x.csrf;state.categories=x.categories||[];
   if(!state.actor){drawLogin();return}state.filter=state.actor.role==='supporter'?'pool':'all';await route(state.actor.role==='supporter'?'dashboard':state.actor.role==='admin'?'dashboard':'tickets');
 }catch(e){el.textContent='Verbindung fehlgeschlagen: '+e.message;}}

async function doClick(node){const action=node.dataset.action;const id=+(node.dataset.id||0);
 if(action==='choice'){state.roleChoice=node.dataset.role;drawLogin();return;}
 if(action==='toggle-admin'){state.adminLogin=!state.adminLogin;drawLogin();return;}
 if(action==='logout'){const x=await post('logout',{});if(!x)return;state.actor=null;state.adminLogin=false;state.pmGuest=null;state.modal=null;state.csrf='';location.reload();return;}
 if(action==='mobile-menu'){state.mobileMenu=!state.mobileMenu;draw();return;}
 if(action==='nav')return route(node.dataset.view);
 if(action==='create'){state.modal={type:'create'};draw();return;}
 if(action==='modal-close'){state.modal=null;draw();return;}
 if(action==='review'){state.modal={type:'review',id};draw();return;}
 if(action==='filter'){state.filter=node.dataset.filter;state.page=1;state.selected=null;await refreshCurrent(false);return;}
 if(action==='page'){state.page=+node.dataset.page;await refreshCurrent(false);return;}
 if(action==='refresh')return refreshCurrent();
 if(action==='open')return openTicket(id);
 if(action==='close-detail'){state.selected=null;state.detail=null;draw();return;}
 if(action==='claim'){if(await post('claim',{id})){toast('Ticket übernommen und aus dem Pool entfernt.');state.filter='mine';await refreshCurrent(false);await openTicket(id)}return;}
 if(action==='release'){if(confirm('Ticket wirklich in den allgemeinen Pool zurücklegen?')&&await post('release',{id})){toast('Ticket freigegeben.');await refreshCurrent(false)}return;}
 if(action==='reopen'){if(await post('status',{id,status:'open'})){toast('Ticket wieder geöffnet.');await refreshCurrent()}return;}
 if(action==='status-quick'){if(await post('status',{id,status:node.dataset.status})){toast('Ticketstatus aktualisiert.');await refreshCurrent()}return;}
 if(action==='handover'){const sel=document.querySelector(`[data-handover-select="${id}"]`);if(!sel?.value)return toast('Bitte einen anderen Supporter auswählen.',true);
   if(confirm('Ticket wirklich an diesen Supporter übergeben?')&&await post('handover',{id,supporter_id:+sel.value})){
     toast('Ticket übergeben.');await refreshCurrent(false);
   }return;}
 if(action==='assign'){const sel=document.querySelector(`[data-assign-select="${id}"]`);if(!sel?.value)return toast('Bitte Supporter auswählen.',true);
   if(await post('assign',{id,supporter_id:+sel.value})){toast('Supporter zugewiesen.');await refreshCurrent()}return;}
 if(action==='publish'){if(await post('publish',{id})){toast('Übungsfall veröffentlicht.');await route(state.view)}return;}
 if(action==='publish-many'){const ids=[...document.querySelectorAll('.training-check:checked')].map(x=>+x.value);
   if(!ids.length)return toast('Bitte zuerst Entwürfe auswählen.',true);
   if(await post('publish_many',{ids})){toast(ids.length+' Übungsfälle zur Veröffentlichung ausgewählt.');await route('training')}return;}
 if(action==='generator-diagnostics'){
   try{const report=await api('generator_diagnostics');state.generatorDiagnostics=report;state.generatorError=report.ready?'':report.message;toast(report.message,!report.ready);draw();}
   catch(err){state.generatorError=err.message;toast(err.message,true);draw();}
   return;
 }
 if(action==='generator-pause'||action==='generator-resume'||action==='generator-stop'){
   const verb=action.split('-')[1];
   if(verb==='stop'&&!confirm('Ticket-Zustrom stoppen? Bereits eingegangene Tickets bleiben erhalten.'))return;
   if(await post('generator_'+verb,{})){toast(verb==='pause'?'Lauf pausiert.':verb==='resume'?'Lauf fortgesetzt.':'Lauf gestoppt.');await route('training');}
   return;
 }
 if(action==='training-reset'){const answer=prompt('Nur Übungsfälle werden dauerhaft gelöscht. Zur Bestätigung exakt eingeben:\nÜBUNGSFÄLLE LÖSCHEN');
   if(answer==='ÜBUNGSFÄLLE LÖSCHEN'){const r=await post('training_reset',{confirm:answer});if(r){toast(r.deleted+' Übungsfälle gelöscht.');await route('training')}}return;}
 if(action==='participant-tickets'){await route('tickets',{selectFirst:false});state.search=node.dataset.name;state.page=1;await refreshCurrent(false);return;}
 if(action==='pm-open'){state.pmGuest=id;return route('messages');}
 if(action==='kick'){if(confirm('Alle Sitzungen dieses Teilnehmers beenden?')&&await post('kick',{guest_id:id})){toast('Teilnehmer abgemeldet.');await route('participants')}return;}
 if(action==='ban'){const ban=node.dataset.ban==='1';if(confirm(ban?'Teilnehmer sperren und abmelden?':'Sperre aufheben?')&&await post('ban',{guest_id:id,ban})){toast(ban?'Teilnehmer gesperrt.':'Sperre aufgehoben.');await route('participants')}return;}
 if(action==='toggle-category'){
    if(await post('category_save',{id,name:node.dataset.name,is_active:node.dataset.active==='1'})){
      toast('Kategorie aktualisiert.');state.allCategories=await api('categories_admin');state.categories=(await api('session')).categories;draw();
    }return;
 }
 if(action==='edit-category'){const n=prompt('Neue Bezeichnung für diese Kategorie:',node.dataset.name);if(n&&n.trim()){if(await post('category_save',{id,name:n.trim(),is_active:true})){toast('Kategorie geändert.');const r=await api('session');state.categories=r.categories;state.allCategories=await api('categories_admin');draw()}}return;}
}
document.addEventListener('click',e=>{const node=e.target.closest('[data-action]');if(!node)return;
 if(node.tagName==='TR'&&e.target.closest('button'))return;
 if(node.closest('form')&&node.type==='submit')return;
 e.preventDefault();doClick(node).catch(x=>toast(x.message,true));});
document.addEventListener('keydown',e=>{const tr=e.target.closest('tr[data-action="open"]');if(tr&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openTicket(+tr.dataset.id)}});
document.addEventListener('change',async e=>{const input=e.target;
 if(input.id==='from-date'||input.id==='to-date'){
   if(input.id==='from-date')state.dateFrom=input.value;else state.dateTo=input.value;
   state.page=1;await refreshCurrent(false);return;
 }
 const change=input.dataset.change;if(!change)return;const id=+input.dataset.id;
 const d={id};if(change==='status')d.status=input.value;if(change==='priority')d.priority=input.value;if(change==='category')d.category_id=+input.value;
 if(await post(change,d)){toast('Änderung gespeichert.');await refreshCurrent();}else await openTicket(id);
});
let searchTimer=null;document.addEventListener('input',e=>{
 if(e.target.matches('input[type=range]')&&e.target.id.startsWith('gen-')){
   const label=document.querySelector(`[data-range-label="${e.target.id}"]`);if(label)label.textContent=e.target.value;
 }
 if(e.target.id==='ticket-search'){
 const value=e.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(async()=>{state.search=value;state.page=1;await refreshCurrent(false);document.getElementById('ticket-search')?.focus()},420);}});
document.addEventListener('submit',async e=>{const form=e.target;if(!form.matches('[data-form]'))return;e.preventDefault();
 const what=form.dataset.form;const data=Object.fromEntries(new FormData(form).entries());const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
 try{
  if(what==='guest-login'||what==='admin-login'){
   const a=what==='guest-login'?'login_guest':'login_admin';if(a==='login_guest')data.role=state.roleChoice;
   const r=await post(a,data);if(!r)return;state.csrf=r.csrf;const session=await api('session');state.actor=session.actor;state.categories=session.categories;state.csrf=session.csrf;
   state.adminLogin=false;await route(state.actor.role==='customer'?'tickets':'dashboard');return;
  }
  if(what==='generator-start'||what==='generator-update'){
   for(const key of ['initial_count','batch_count','interval_minutes','max_total'])if(data[key]!==undefined)data[key]=Number(data[key]);
   const response=await post(what==='generator-start'?'generator_start':'generator_update',data);
   if(!response){try{const d=await api('generator_diagnostics');state.generatorDiagnostics=d;state.generatorError=d.ready?'Der Start ist fehlgeschlagen. Bitte die Fehler-ID aus der Meldung nennen.':d.message;draw();}catch(err){state.generatorError=err.message;draw();}}
   if(response){
     if(what==='generator-start'){
       // Sichere Pakete: keine 100 einzelnen Tickets in einer einzigen PHP-Anfrage.
       // Jede Welle wird serverseitig atomar protokolliert und kann fortgesetzt werden.
       const target=Number(response.initial_target||0);let current=0;let failed=false;
       let label=document.createElement('div');label.className='notice';label.setAttribute('role','status');
       if(target>0){form.prepend(label);label.textContent=`Starte Ticketstrom: 0 / ${target} Tickets …`;}
       for(let i=0;i<Math.ceil(target/10)+3&&current<target;i++){
         try{
           const step=await api('generator_fill',{});
           current=Number(step.generated||0);
           if(target>0)label.textContent=`Ticketstrom wird aufgebaut: ${Math.min(current,target)} / ${target} Tickets …`;
           if(step.status!=='running'||current>=target)break;
           if(Number(step.created||0)===0)await new Promise(resolve=>setTimeout(resolve,450));
         }catch(err){toast('Lauf gespeichert, aber die Sofortzustellung ist unterbrochen: '+err.message,true);failed=true;break;}
       }
       if(!failed)toast(`${current} Übungstickets veröffentlicht. Der Lauf ist aktiv.`);
     }else toast('Zustellfrequenz angepasst.');
     await route('training');
   }
   return;
  }
  if(what==='create'||what==='training'){
   data.category_id=+data.category_id;const r=await post(what==='create'?'ticket_create':'training_create',data);if(!r)return;
   toast(what==='create'?'Ticket '+r.ticket_no+' wurde erstellt.':'Übungsfall gespeichert – noch nicht veröffentlicht.');state.modal=null;
   if(what==='create'){await route('tickets');await openTicket(r.id)}else await route('training');return;
  }
  if(what==='message'){
   const id=+form.dataset.ticket;const file=form.querySelector('input[type="file"]')?.files?.[0];delete data.file;
   const r=await post('message',{id,type:data.type||'public',body:data.body});if(!r)return;
   if(file){const fd=new FormData();fd.append('message_id',String(r.id));fd.append('file',file);
     const u=new URL('api.php?action=upload',location.href);const resp=await fetch(u,{method:'POST',body:fd,headers:{'X-CSRF-Token':state.csrf},credentials:'same-origin'});
     const val=await resp.json();if(!val.ok)toast('Nachricht gespeichert, Anhang fehlgeschlagen: '+val.error,true);
   }
   toast(data.type==='internal'?'Interne Notiz gespeichert.':'Nachricht gesendet.');await refreshCurrent();return;
  }
  if(what==='review'){
   for(const k of ['stars','friendliness','clarity','resolution','speed'])data[k]=+data[k];
   const id=+form.dataset.id;if(await post('review',{id,...data})){toast('Danke für deine Bewertung!');state.modal=null;await refreshCurrent()}return;
  }
  if(what==='private'){
   if(state.actor.role==='admin')data.guest_id=state.pmGuest;
   if(await post('private_send',data)){toast('Private Nachricht gesendet.');state.private=await api('private',null,state.actor.role==='admin'?{guest_id:state.pmGuest}:{});await api('private_read',state.actor.role==='admin'?{guest_id:state.pmGuest}:{});draw();scrollChats()}return;
  }
  if(what==='category'){if(await post('category_save',data)){toast('Kategorie angelegt.');const r=await api('session');state.categories=r.categories;state.allCategories=await api('categories_admin');draw()}return;}
  if(what==='password'){if(await post('password_change',data)){toast('Dozentenpasswort geändert.');form.reset()}return;}
 }catch(err){toast(err.message,true)}finally{if(submit&&submit.isConnected)submit.disabled=false}
});
setInterval(async()=>{
 if(!state.actor||document.hidden)return;
 try{const x=await api('unread');const changed=state.lastUpdated!==null&&state.lastUpdated!==x.updated;
   state.lastUpdated=x.updated;const unreadChanged=state.unread!==x.unread_pm;state.unread=x.unread_pm;
   if(document.activeElement?.matches('input,textarea,select,[contenteditable]'))return;
   if(state.view==='training'&&state.actor.role==='admin'){
     try{state.generator=await api('generator_status');const count=state.generator.run;
       const issued=document.getElementById('generator-issued');if(issued)issued.textContent=count.generated+' / '+count.max_total;
       const next=document.getElementById('generator-next');if(next)next.textContent=count.next_due_at?fmt(count.next_due_at):'—';
     }catch(_){/* unaufdringlich erneut versuchen */}
   }
   if(changed&&['dashboard','tickets','mine'].includes(state.view))await refreshCurrent();
   else if(unreadChanged){if(state.view==='messages')await route('messages');else draw();}
 }catch(_){/* Nächster Abgleich versucht es erneut. */}
},20000);
initialize();
