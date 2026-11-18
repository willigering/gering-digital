/* Gering Digital – private Abo-Übersicht. Kein Framework, keine Abhängigkeiten. */
(function (root) {
"use strict";

/* ---------- Reine Hilfsfunktionen (auch für tests/abo_smoke.cjs) ---------- */
var DAY = 86400000;
function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  var p = s.split("-").map(Number), d = new Date(p[0], p[1] - 1, p[2]);
  return d.getMonth() === p[1] - 1 ? d : null;
}
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function daysUntil(s, today) {
  var d = parseDate(s); if (!d) return null;
  return Math.round((d - startOfDay(today || new Date())) / DAY);
}
function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
/* Nächster Zeitraum: +1 Monat bzw. +1 Jahr, Monatsende sauber begrenzt (31.01. → 28./29.02.). */
function addInterval(s, intervall) {
  var d = parseDate(s); if (!d || (intervall !== "monatlich" && intervall !== "jaehrlich")) return "";
  var y = d.getFullYear() + (intervall === "jaehrlich" ? 1 : 0), m = d.getMonth() + (intervall === "monatlich" ? 1 : 0);
  var last = new Date(y, m + 1, 0).getDate();
  return iso(new Date(y, m, Math.min(d.getDate(), last)));
}
function monthly(item) {
  if (typeof item.preis !== "number" || !isFinite(item.preis)) return null;
  if (item.intervall === "monatlich") return item.preis;
  if (item.intervall === "jaehrlich") return item.preis / 12;
  return null;
}
function isActive(item) { return item.status !== "gekuendigt"; }
function needsInput(item) {
  return !item.ablaufdatum || !item.intervall || typeof item.preis !== "number";
}
/* Dringlichkeit für Farben: expired | today | soon (≤ 7 Tage) | near (≤ 30) | ok | none */
function urgency(item, today) {
  var n = daysUntil(item.ablaufdatum, today);
  if (n === null) return "none";
  if (n < 0) return "expired";
  if (n === 0) return "today";
  if (n <= 7) return "soon";
  if (n <= 30) return "near";
  return "ok";
}
function compare(a, b, today) {
  var ca = isActive(a) ? 0 : 1, cb = isActive(b) ? 0 : 1;
  if (ca !== cb) return ca - cb;
  var da = daysUntil(a.ablaufdatum, today), db = daysUntil(b.ablaufdatum, today);
  if (da === null && db !== null) return 1;
  if (db === null && da !== null) return -1;
  if (da !== null && db !== null && da !== db) return da - db;
  return String(a.name || "").localeCompare(String(b.name || ""), "de", { sensitivity: "base" });
}
function sortItems(items, today) { return items.slice().sort(function (a, b) { return compare(a, b, today); }); }
function summary(items, today) {
  var active = items.filter(isActive), perMonth = 0, priced = 0, next = null;
  active.forEach(function (it) {
    var m = monthly(it);
    if (m !== null) { perMonth += m; priced++; }
    var n = daysUntil(it.ablaufdatum, today);
    if (n !== null && n >= 0 && (!next || n < next.days)) next = { item: it, days: n };
  });
  perMonth = Math.round(perMonth * 100) / 100;
  return { count: active.length, perMonth: perMonth, perYear: Math.round(perMonth * 12 * 100) / 100,
           unpriced: active.length - priced, next: next };
}
function parsePrice(v) {
  v = String(v == null ? "" : v).trim().replace(/\s|€/g, "");
  if (v === "") return null;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(v)) v = v.replace(/\./g, "");
  v = v.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return NaN;
  var n = Number(v); return n <= 100000 ? n : NaN;
}
var EUR = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
function euro(n) { return EUR.format(n); }
function dateDe(s) { var d = parseDate(s); return d ? d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""; }
function relDays(n) {
  if (n === null) return "";
  if (n === 0) return "heute";
  if (n === 1) return "morgen";
  if (n === -1) return "seit gestern";
  return n > 0 ? "in " + n + " Tagen" : "seit " + (-n) + " Tagen";
}
function safeUrl(u) { return typeof u === "string" && /^https?:\/\/[^\s]+$/i.test(u) ? u : ""; }

var Core = { parseDate: parseDate, daysUntil: daysUntil, addInterval: addInterval, monthly: monthly, urgency: urgency,
  sortItems: sortItems, summary: summary, parsePrice: parsePrice, needsInput: needsInput, relDays: relDays, safeUrl: safeUrl, euro: euro };
root.AboCore = Core;
if (typeof document === "undefined") return;

/* ---------- Oberfläche ---------- */
var API = "api.php";
var state = { mode: "loading", rows: [], csrf: "", filter: "all", editing: null };
var $ = function (id) { return document.getElementById(id); };
var INTERVAL_LABEL = { monatlich: "Monatlich", jaehrlich: "Jährlich" };

function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
var toastTimer = 0;
function toast(msg, bad) {
  var t = $("toast"); t.textContent = msg; t.hidden = false; t.classList.toggle("bad", !!bad);
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3400);
}
async function request(action, payload) {
  var res = await fetch(API + "?action=" + encodeURIComponent(action), { method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(Object.assign({ csrf: state.csrf }, payload || {})) });
  var data = await res.json().catch(function () { return { error: "Ungültige Antwort vom Server." }; });
  if (data && data.csrf) state.csrf = data.csrf;
  if (res.status === 401 && action !== "login") { showAuth("login"); }
  if (!res.ok || data.error) throw new Error(data.error || "Serverfehler");
  return data;
}
function setRows(items) { state.rows = Array.isArray(items) ? items : []; render(); }

function filtered(today) {
  var rows = sortItems(state.rows, today);
  if (state.filter === "soon") return rows.filter(function (r) { var u = urgency(r, today); return isActive(r) && (u === "expired" || u === "today" || u === "soon"); });
  if (state.filter === "todo") return rows.filter(needsInput);
  if (state.filter === "gekuendigt") return rows.filter(function (r) { return !isActive(r); });
  return rows;
}

function card(item, index, today) {
  var active = isActive(item), u = urgency(item, today), n = daysUntil(item.ablaufdatum, today), m = monthly(item);
  var c = el("article", "abo u-" + u + (active ? "" : " cancelled"));
  c.dataset.id = item.id;
  c.appendChild(el("span", "ghost-num", String(index + 1).padStart(2, "0")));

  var head = el("header", "abo-head");
  var title = el("h3", "abo-name", item.name);
  head.appendChild(title);
  var tags = el("div", "tags");
  tags.appendChild(item.intervall ? el("span", "tag " + item.intervall, INTERVAL_LABEL[item.intervall]) : el("span", "tag missing", "Intervall?"));
  if (!active) tags.appendChild(el("span", "tag cancelled", "Gekündigt"));
  head.appendChild(tags);
  c.appendChild(head);

  var due = el("div", "due");
  due.appendChild(el("p", "due-label", active ? "Nächste Verlängerung" : "Läuft aus am"));
  if (n === null) {
    due.appendChild(el("p", "due-date missing", "Datum fehlt"));
    due.appendChild(el("p", "due-rel todo", "bitte ergänzen"));
  } else {
    due.appendChild(el("p", "due-date", dateDe(item.ablaufdatum)));
    var rel = el("p", "due-rel r-" + u, (n < 0 ? (active ? "Abgelaufen · " : "Beendet · ") : "") + relDays(n));
    due.appendChild(rel);
  }
  c.appendChild(due);

  var meta = el("div", "abo-meta");
  var price = el("div", "price");
  if (typeof item.preis === "number") {
    price.appendChild(el("strong", "", euro(item.preis)));
    price.appendChild(el("span", "", item.intervall === "jaehrlich" ? " / Jahr" : item.intervall === "monatlich" ? " / Monat" : ""));
    if (item.intervall === "jaehrlich" && m !== null) price.appendChild(el("small", "", "≈ " + euro(m) + " / Monat"));
  } else {
    price.appendChild(el("strong", "missing", "Preis fehlt"));
  }
  meta.appendChild(price);
  c.appendChild(meta);

  if (item.notiz) c.appendChild(el("p", "note", item.notiz));

  var actions = el("footer", "abo-actions");
  var edit = el("button", "btn small", "Bearbeiten"); edit.type = "button"; edit.dataset.edit = item.id;
  actions.appendChild(edit);
  if (active && n !== null && n < 0 && item.intervall) {
    var renew = el("button", "btn small accent", "↻ Verlängert: +1 " + (item.intervall === "jaehrlich" ? "Jahr" : "Monat"));
    renew.type = "button"; renew.dataset.renew = item.id;
    actions.appendChild(renew);
  }
  var link = safeUrl(item.kuendigungslink);
  if (link) {
    var a = el("a", "btn small ghost", "Kündigen / Konto ↗"); a.href = link; a.target = "_blank"; a.rel = "noopener noreferrer";
    actions.appendChild(a);
  }
  c.appendChild(actions);
  return c;
}

function render() {
  var today = new Date();
  $("todayLabel").textContent = today.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).toUpperCase();
  var s = summary(state.rows, today);
  $("statCount").textContent = String(s.count);
  var cancelled = state.rows.length - s.count;
  $("statCountSub").textContent = cancelled ? cancelled + " gekündigt" : "keins gekündigt";
  $("statMonth").textContent = euro(s.perMonth);
  $("statMonthSub").textContent = s.unpriced ? s.unpriced + " noch ohne Preis · Jahresabos ÷ 12" : "Jahresabos anteilig ÷ 12";
  $("statYear").textContent = euro(s.perYear);
  $("statYearSub").textContent = s.unpriced ? "ohne " + s.unpriced + " unvollständige" : "alle Abos eingerechnet";
  var nc = $("statNextCard");
  nc.className = "stat next" + (s.next ? " u-" + urgency(s.next.item, today) : "");
  $("statNext").textContent = s.next ? dateDe(s.next.item.ablaufdatum) : "–";
  $("statNextSub").textContent = s.next ? s.next.item.name + " · " + relDays(s.next.days) : "noch kein Datum eingetragen";

  var all = state.rows, soon = all.filter(function (r) { var u = urgency(r, today); return isActive(r) && (u === "expired" || u === "today" || u === "soon"); });
  $("countAll").textContent = all.length; $("countSoon").textContent = soon.length;
  $("countTodo").textContent = all.filter(needsInput).length; $("countCancelled").textContent = all.length - s.count;

  var list = $("list"); list.textContent = "";
  var rows = filtered(today);
  rows.forEach(function (it, i) { list.appendChild(card(it, i, today)); });
  var empty = $("empty");
  empty.classList.toggle("hidden", rows.length > 0);
  empty.querySelector("h3").textContent = all.length ? "Nichts in diesem Filter." : "Hier ist noch nichts.";
  $("emptyNew").classList.toggle("hidden", all.length > 0);
}

/* ---------- Editor ---------- */
function radio(name, value) { var r = document.querySelector('input[name="' + name + '"][value="' + value + '"]'); if (r) r.checked = true; }
function radioValue(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; }
function openEdit(id) {
  var item = id ? state.rows.find(function (r) { return r.id === id; }) : null;
  state.editing = item ? item.id : null;
  $("editorKicker").textContent = item ? "Abo bearbeiten" : "Neues Abo";
  $("editorTitle").textContent = item ? item.name : "Abo eintragen";
  $("fName").value = item ? item.name : "";
  $("fPreis").value = item && typeof item.preis === "number" ? String(item.preis.toFixed(2)).replace(".", ",") : "";
  $("fDatum").value = item ? item.ablaufdatum || "" : "";
  $("fLink").value = item ? item.kuendigungslink || "" : "";
  $("fNotiz").value = item ? item.notiz || "" : "";
  radio("fIntervall", item ? item.intervall || "" : "monatlich");
  radio("fStatus", item ? item.status || "aktiv" : "aktiv");
  $("deleteEntry").classList.toggle("hidden", !item);
  $("formError").textContent = "";
  $("scrim").hidden = false; $("editor").hidden = false; document.body.classList.add("locked");
  setTimeout(function () { $("fName").focus(); }, 30);
}
function closeEdit() { $("scrim").hidden = true; $("editor").hidden = true; document.body.classList.remove("locked"); state.editing = null; }
function newId(name) {
  var base = String(name).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "abo";
  return "abo-" + base + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
$("editForm").addEventListener("submit", async function (ev) {
  ev.preventDefault();
  var name = $("fName").value.trim(), preis = parsePrice($("fPreis").value), link = $("fLink").value.trim();
  if (!name) { $("formError").textContent = "Bitte einen Namen eintragen."; $("fName").focus(); return; }
  if (Number.isNaN(preis)) { $("formError").textContent = "Preis bitte als Zahl, z. B. 23,00."; $("fPreis").focus(); return; }
  if (link && !safeUrl(link)) { $("formError").textContent = "Der Link muss mit https:// oder http:// beginnen."; $("fLink").focus(); return; }
  var old = state.editing ? state.rows.find(function (r) { return r.id === state.editing; }) : null;
  var item = { id: old ? old.id : newId(name), name: name, preis: preis, intervall: radioValue("fIntervall"),
    ablaufdatum: $("fDatum").value, kuendigungslink: link, notiz: $("fNotiz").value.trim(), status: radioValue("fStatus") || "aktiv" };
  try {
    $("saveEntry").disabled = true;
    var r = await request("save", { item: item });
    setRows(r.items); closeEdit(); toast(old ? "Gespeichert." : "Abo eingetragen.");
  } catch (err) { $("formError").textContent = err.message; }
  finally { $("saveEntry").disabled = false; }
});
$("deleteEntry").addEventListener("click", async function () {
  var item = state.rows.find(function (r) { return r.id === state.editing; });
  if (!item || !confirm("„" + item.name + "“ wirklich löschen?")) return;
  try { var r = await request("delete", { id: item.id }); setRows(r.items); closeEdit(); toast("Abo gelöscht."); }
  catch (err) { $("formError").textContent = err.message; }
});
["closeEdit", "cancelEdit", "scrim"].forEach(function (id) { $(id).addEventListener("click", closeEdit); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("editor").hidden) closeEdit(); });
["newTop", "emptyNew"].forEach(function (id) { $(id).addEventListener("click", function () { openEdit(null); }); });
$("list").addEventListener("click", async function (e) {
  var b = e.target.closest("button"); if (!b) return;
  if (b.dataset.edit) openEdit(b.dataset.edit);
  if (b.dataset.renew) {
    var it = state.rows.find(function (r) { return r.id === b.dataset.renew; }); if (!it) return;
    var next = it.ablaufdatum, today = new Date(), guard = 0;
    do { next = addInterval(next, it.intervall); } while (next && daysUntil(next, today) < 0 && ++guard < 400);
    if (!next) return;
    try { b.disabled = true; var r = await request("save", { item: Object.assign({}, it, { ablaufdatum: next }) }); setRows(r.items); toast(it.name + ": nächste Verlängerung " + dateDe(next) + "."); }
    catch (err) { toast(err.message, true); b.disabled = false; }
  }
});
document.querySelectorAll(".filter").forEach(function (f) {
  f.addEventListener("click", function () {
    state.filter = f.dataset.filter;
    document.querySelectorAll(".filter").forEach(function (x) { x.classList.toggle("active", x === f); x.setAttribute("aria-selected", x === f ? "true" : "false"); });
    render();
  });
});

/* ---------- Sicherung ---------- */
$("exportJson").addEventListener("click", function () {
  var blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), items: state.rows }, null, 2)], { type: "application/json;charset=utf-8" });
  var url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = "abos-backup-" + iso(new Date()) + ".json"; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
});
$("importBtn").addEventListener("click", function () { $("importFile").click(); });
$("importFile").addEventListener("change", async function () {
  var file = this.files[0]; this.value = ""; if (!file) return;
  try {
    var parsed = JSON.parse(await file.text()), arr = Array.isArray(parsed) ? parsed : parsed && parsed.items;
    if (!Array.isArray(arr)) throw new Error("Die Datei enthält keine gültige Abo-Liste.");
    if (!confirm(arr.length + " Abos importieren? Abos mit derselben ID werden ersetzt.")) return;
    var r = await request("import", { items: arr }); setRows(r.items); toast(arr.length + " Abos importiert.");
  } catch (err) { toast(err.message || "Import fehlgeschlagen.", true); }
});

/* ---------- Anmeldung ---------- */
function showAuth(mode) {
  state.mode = mode;
  $("auth").classList.remove("hidden"); $("app").classList.add("blurred");
  var nosetup = mode === "nosetup", broken = mode === "offline";
  $("authField").classList.toggle("hidden", nosetup || broken);
  $("authSubmit").classList.toggle("hidden", nosetup || broken);
  $("authTitle").textContent = broken ? "Keine Verbindung." : "Abos.";
  $("authDesc").textContent = nosetup ? "Es gibt noch keinen Zugang. Richte zuerst unter /b.html das Passwort der Bewerbungsliste ein – es gilt auch hier."
    : broken ? "Der Server ist gerade nicht erreichbar. Bitte später neu laden."
    : "Melde dich mit dem Passwort deiner Bewerbungsliste an.";
  $("authError").textContent = "";
  if (!nosetup && !broken) setTimeout(function () { $("authPassword").focus(); }, 30);
}
function hideAuth() { $("auth").classList.add("hidden"); $("app").classList.remove("blurred"); state.mode = "ready"; }
$("authForm").addEventListener("submit", async function (ev) {
  ev.preventDefault();
  try {
    $("authSubmit").disabled = true; $("authError").textContent = "";
    var r = await request("login", { password: $("authPassword").value });
    if (r.mode !== "ready") throw new Error("Anmeldung fehlgeschlagen.");
    $("authPassword").value = ""; hideAuth(); setRows(r.items);
  } catch (err) { $("authError").textContent = err.message; }
  finally { $("authSubmit").disabled = false; }
});
async function logout() {
  try { await request("logout", {}); } catch (err) { /* Sitzung ist ohnehin weg */ }
  state.rows = []; render(); showAuth("login"); toast("Abgemeldet.");
}
$("logoutTop").addEventListener("click", logout);

async function boot() {
  render();
  try {
    var r = await fetch(API + "?action=state", { credentials: "same-origin", cache: "no-store", headers: { "Accept": "application/json" } });
    var data = await r.json();
    state.csrf = data.csrf || "";
    if (data.mode === "ready") { hideAuth(); setRows(data.items); }
    else if (data.mode === "login" || data.mode === "nosetup") showAuth(data.mode);
    else throw new Error(data.error || "Unbekannter Serverstatus");
  } catch (err) { showAuth("offline"); }
}
boot();
})(typeof window !== "undefined" ? window : globalThis);
