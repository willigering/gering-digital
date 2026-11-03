// ==UserScript==
// @name         Gering Digital – privater KI-Test
// @namespace    https://geringdigital.de/
// @version      1.0.0
// @description  Beispiel: markierten Text mit deinem geschützten OpenAI-Proxy erklären.
// @match        https://supportia.docentio.de/*
// @match        https://geringdigital.de/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      geringdigital.de
// ==/UserScript==
(function () {
  'use strict';
  const endpoint = 'https://geringdigital.de/api/ai.php';

  // Enter credentials only on your own trusted domain, not on a third-party page.
  if (location.hostname === 'geringdigital.de') {
  GM_registerMenuCommand('KI-Zugangstoken einrichten/ändern', function () {
    const token = prompt('Privaten KI-Zugangstoken eingeben (NICHT den OpenAI-API-Key):');
    if (token === null) return;
    if (!/^[a-f0-9]{64}$/.test(token.trim())) {
      alert('Ungültiges Tokenformat. Benötigt: 64 Hex-Zeichen.');
      return;
    }
    GM_setValue('gd_ai_access_token', token.trim());
    alert('Privater Zugangstoken lokal in Tampermonkey gespeichert.');
  });

    return;
  }

  GM_registerMenuCommand('Markierten Text mit KI erklären', function () {
    const token = GM_getValue('gd_ai_access_token', '');
    if (!token) { alert('Öffne zuerst geringdigital.de und richte dort im Tampermonkey-Menü den KI-Zugangstoken ein.'); return; }
    const selected = String(window.getSelection() || '').trim();
    if (!selected) { alert('Markiere zuerst einen Text auf der Seite.'); return; }
    GM_xmlhttpRequest({
      method: 'POST', url: endpoint,
      headers: { 'Content-Type': 'application/json', 'X-GD-AI-Token': token },
      data: JSON.stringify({
        prompt: selected.slice(0, 8000),
        instructions: 'Erkläre den markierten Inhalt kurz, verständlich und auf Deutsch.',
        max_output_tokens: 500
      }),
      timeout: 55000,
      onload: function (res) {
        let data;
        try { data = JSON.parse(res.responseText); }
        catch (_) { alert('Ungültige Serverantwort (' + res.status + ').'); return; }
        alert(data.ok ? data.text : 'KI-Fehler (' + res.status + '): ' + (data.error || 'Unbekannt'));
      },
      ontimeout: function () { alert('Die KI-Anfrage hat zu lange gedauert.'); },
      onerror: function () { alert('Netzwerkfehler – HTTPS und @connect prüfen.'); }
    });
  });
})();
