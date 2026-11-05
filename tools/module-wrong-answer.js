/* Shared wrong-answer quips, approved in the Klausurvorbereitung.
 * No scoring, storage or DOM changes: renderers keep their explanations. */
(function () {
  'use strict';
  if (window.DTPWrongAnswer) return;
  const quips = [
  "Wirklich? Das ist deine Antwort?",
  "Nope. Versuch's nochmal.",
  "Nicht dein Ernst, Digga!",
  "Das war ein Griff ins Netzwerkklo.",
  "Falsch abgebogen. Das Navi weint.",
  "Da hat dein Gehirn kurz 404 gemeldet.",
  "Der Router sagt: Nö.",
  "Das Paket ging wohl an die falsche Adresse.",
  "Autsch. Das tat sogar dem Switch weh.",
  "Mutig. Leider komplett daneben.",
  "Das war eher UDP: abgeschickt und gehofft.",
  "Nein. Aber selbstbewusst war's.",
  "Die Antwort hat Paketverlust.",
  "Dein Wissen hat gerade einen Timeout.",
  "Ganz heiß! Also ungefähr wie ein Eiswürfel.",
  "Fast. Wenn man alle Fehler ignoriert.",
  "Das war kein Treffer, das war ein Broadcast ins Nichts.",
  "Junge, was war denn das?",
  "Der DNS findet deine Lösung nicht.",
  "Das war ein klassischer Layer-8-Moment.",
  "Nicht ganz. Nicht mal mit NAT.",
  "Ping? Keine Antwort.",
  "Sogar die Firewall hat den Kopf geschüttelt.",
  "Falscher Port, falsche Party.",
  "Hoppla. Das ging ins falsche Subnetz.",
  "Der Prüfer hebt gerade eine Augenbraue.",
  "Einfach mal nein.",
  "Der Gedanke war da. Kurz.",
  "Diese Antwort braucht dringend ein Update.",
  "Ein kleiner Fehler für dich, ein großer für die Klausur.",
  "Da ist wohl ein Bit umgekippt.",
  "Dein Ergebnis ist leider nicht im gültigen Bereich.",
  "Das OSI-Modell distanziert sich.",
  "Klingt erfunden. Ist leider auch falsch.",
  "Wenn Raten ein Protokoll wäre, wärst du Admin.",
  "Du hast die Frage elegant umfahren.",
  "Nö. Aber der Mut verdient einen Ping.",
  "Error 418: Ich bin eine Teekanne, keine Lösung.",
  "Das war mehr Kabelsalat als Netzwerk.",
  "Nicht korrekt. Dein Switch möchte reden.",
  "Was zum DHCP war das denn?",
  "Diese Antwort kommt nicht durch die Prüfung.",
  "Schade. Die Lösung wohnt woanders.",
  "Der Taschenrechner ist unschuldig.",
  "Das war ein SYN ohne ACK.",
  "Nope.exe wurde erfolgreich ausgeführt.",
  "Hier hilft auch kein Neustart.",
  "Das war leider eine Nullnummer im Binärsystem.",
  "Das hätte selbst der Drucker hinterfragt.",
  "Noch ein Versuch. Diesmal mit weniger Würfeln."
];
  let bag = [], previous;
  function next() {
    if (!bag.length) {
      bag = quips.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      // Avoid an immediate repeat even at the boundary between two bags.
      if (bag[bag.length - 1] === previous) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
    }
    previous = bag.pop();
    return quips[previous];
  }
  window.DTPWrongAnswer = Object.freeze({next});
})();
