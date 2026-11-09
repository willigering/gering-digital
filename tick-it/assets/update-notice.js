/* Tick-It: versionsgebundene Update-Meldung; niemals ungefragt neu laden. */
(function () {
  'use strict';
  if (window.__tickitUpdateInitialized) return;
  window.__tickitUpdateInitialized = true;
  const loadedVersion = document.body.dataset.releaseVersion || 'initial';
  const storageKey = 'tickit:update:acknowledged:v1';
  const messages = [
    'Neues Update! Deine Tickets bleiben da, wo du sie zuletzt gesehen hast.',
    'Frische Bits für Tick-It. Deine bearbeiteten Fälle bleiben unangetastet.',
    'Update verfügbar. Niemand hat den Ticketpool in die Tonne getreten.',
    'Tick-It hat neue Funktionen. Deine offenen Fälle haben weiterhin Dienst.',
    'Neue Version am Start. Keine Sorge: Die Tickets sind nicht mit UDP unterwegs.',
    'Ein Update, kein Gedächtnisverlust. Deine Ticketverläufe bleiben gespeichert.',
    'Software frisch, Supportfälle unverändert. So muss das.',
    'Ein paar neue Bits sind eingetroffen. Deine Zuweisungen bleiben bestehen.',
    'Update verfügbar! Der Server hat diesmal nur den Code ausgetauscht.',
    'Neuer Stand, gleiche Tickets. Auch das störrische Druckerproblem ist noch da.',
    'Tick-It wurde verbessert. Deine offenen Baustellen wurden nicht weggebeamt.',
    'Ein Update ist eingetroffen. Ticketnummern bleiben, wie sie sind.',
    'Neue Version verfügbar. Supporter und Kunden behalten ihren Verlauf.',
    'Der Code ist neuer. Die Kundenanfragen sind immer noch dieselben.',
    'Tick-It hat etwas dazugelernt. Deine alten Tickets bleiben erhalten.',
    'Update verfügbar. Auch interne Notizen bleiben weiterhin intern.',
    'Neue Version! Die Arbeit von gestern bleibt auch morgen noch vorhanden.',
    'Update angekommen. Kein Reset, keine verschwundenen Ticketzuweisungen.',
    'Neue Bits, alter Ticketpool. Und das ist ausnahmsweise gut so.',
    'Es gibt ein Update. Deine Bewertungen und Nachrichten bleiben gespeichert.',
    'Tick-It macht einen Versionssprung. Deine Fälle bleiben stehen.',
    'Codewechsel ohne Kahlschlag. So läuft ein ordentliches Update.',
    'Ein Update wartet. Deine bereits übernommenen Tickets warten nicht neu.',
    'Neue Version, keine Amnesie. Die Ticket-Historie bleibt vollständig.',
    'Tick-It ist frisch aktualisiert. Deine Daten sind keine Wegwerfartikel.',
    'Update? Ja. Tickets löschen? Ganz sicher nicht.',
    'Die Anwendung wird besser. Deine Arbeit bleibt nachvollziehbar.',
    'Neues Update verfügbar. Alle geschlossenen Fälle dürfen geschlossen bleiben.',
    'Der Code hat sich geändert, nicht deine Kundengespräche.',
    'Neue Version für Tick-It. Der Supportbetrieb läuft mit denselben Daten weiter.'
  ];
  let pendingVersion = null;
  let dock = null;
  let checking = false;
  let activeAt = Date.now();
  let audioContext = null;
  let acknowledged = null;
  try {
    acknowledged = localStorage.getItem(storageKey);
    if (!acknowledged) {
      localStorage.setItem(storageKey, loadedVersion);
      acknowledged = loadedVersion;
    }
  } catch (_) {
    acknowledged = loadedVersion; // Im privaten Modus wenigstens während des Tabs vergleichen.
  }

  function isActive() {
    return !document.hidden && Date.now() - activeAt < 15 * 60 * 1000;
  }
  function prepareSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || audioContext) return;
      audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') audioContext.resume().catch(function () {});
    } catch (_) { /* Ton ist optional. */ }
  }
  function playSound() {
    try {
      if (!audioContext || audioContext.state !== 'running') return;
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(740, now);
      oscillator.frequency.setValueAtTime(1030, now + 0.08);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(now); oscillator.stop(now + 0.23);
    } catch (_) { /* Keine Auswirkungen auf Tickets. */ }
  }
  function unsavedWork() {
    if (document.querySelector('.floating-modal, [role="dialog"][aria-modal="true"]')) return true;
    if (document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]')) return true;
    return !!document.querySelector('form[data-tickit-dirty="1"]');
  }
  function chooseMessage(version) {
    let seed = 0;
    for (let i = 0; i < version.length; i++) seed = (seed * 31 + version.charCodeAt(i)) >>> 0;
    return messages[seed % messages.length];
  }
  function reveal() {
    if (!pendingVersion || dock || !isActive()) return;
    dock = document.createElement('aside');
    dock.className = 'tickit-update-notice';
    dock.setAttribute('role', 'status');
    dock.setAttribute('aria-live', 'polite');
    const title = document.createElement('strong');
    title.textContent = '↻ TICK-IT UPDATE VERFÜGBAR';
    const message = document.createElement('p');
    message.textContent = chooseMessage(pendingVersion) + ' Zum Übernehmen bitte bewusst aktualisieren.';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Jetzt aktualisieren';
    button.addEventListener('click', function () {
      if (unsavedWork()) {
        message.textContent = 'Offene Eingaben entdeckt! Bitte den Text erst absenden oder das Formular schließen. Danach kannst du sicher aktualisieren.';
        return;
      }
      // Die Bestätigung ist lokal. Ticketdaten liegen ausschließlich in der Serverdatenbank.
      try { localStorage.setItem(storageKey, pendingVersion); } catch (_) {}
      button.disabled = true;
      message.textContent = 'Update wird geladen. Tickets, Nachrichten und Zuweisungen bleiben gespeichert.';
      window.location.reload();
    });
    dock.append(title, message, button);
    document.body.append(dock);
    playSound();
  }
  function markActive(event) {
    activeAt = Date.now();
    if (event?.isTrusted !== false) prepareSound();
    if (pendingVersion) reveal();
  }
  ['pointerdown','keydown','touchstart'].forEach(eventName => document.addEventListener(eventName, markActive, {passive:true}));
  document.addEventListener('input', function (event) {
    const form = event.target.closest('form');
    if (form) form.dataset.tickitDirty = '1';
  });
  document.addEventListener('change', function (event) {
    const form = event.target.closest('form');
    if (form) form.dataset.tickitDirty = '1';
  });
  // Nach erfolgreichem normalen Formularsubmit entfernt die SPA das Formular bzw. lädt neue Inhalte.
  async function check() {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const response = await fetch('version.php?nocache=' + Date.now(), {cache:'no-store', credentials:'same-origin'});
      if (!response.ok) return;
      const data = await response.json();
      if (!/^[a-f0-9]{40}$/.test(data.revision || '')) return;
      if (data.revision !== loadedVersion && data.revision !== acknowledged) {
        pendingVersion = data.revision;
        reveal();
      }
    } catch (_) { /* Eine gestörte Versionsabfrage darf keine Arbeit unterbrechen. */ }
    finally { checking = false; }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) {activeAt=Date.now();check();if(pendingVersion)reveal();} });
  // Auch nach manuellem Neuladen ohne Bestätigung bleibt der Hinweis bestehen.
  if (acknowledged !== loadedVersion && /^[a-f0-9]{40}$/.test(loadedVersion)) {
    pendingVersion = loadedVersion;
    reveal();
  }
  check();
  setInterval(check, 60000);
})();
