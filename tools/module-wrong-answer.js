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
  // Neue Sprüche: eingepflegt, aber erst aktiv, wenn dieser Schalter auf true steht.
  const NEW_QUIPS_LIVE = false;
  const newQuips = [
  "Richtig! Könnte ich jetzt sagen. Wäre aber gelogen.",
  "Oha, das ist ja richt… Oh. Doch nicht.",
  "WOW! Eine Antwort! Und sie ist FALSCH.",
  "Ehrlich? DAS ist deine Antwort?",
  "Das hast du jetzt nicht gesagt!?",
  "Das war einfach nur scheiße.",
  "Das war Bockmist. Der nächste Versuch ist gratis.",
  "Falsch. Hast du das gerade wirklich abgeschickt?",
  "Falsch. Aber mutig.",
  "Falsch. Und ich hatte so viel Hoffnung.",
  "Falsch. Das tat beim Lesen weh.",
  "Deine Antwort ist durchgefallen. Du noch nicht.",
  "Falsch. Tu einfach so, als hättest du das nie abgeschickt.",
  "Falsch. Steht in keiner Doku. Nicht mal in der schlechten.",
  "Falsch. Sag das bitte nie im Bewerbungsgespräch.",
  "Falsch. Und zwar richtig falsch.",
  "Falsch. Ich hab extra noch mal nachgeschaut.",
  "Falsch. Ich muss mich kurz setzen.",
  "Falsch. Ich bin nicht wütend, nur enttäuscht.",
  "Falsch. Das sagen wir jetzt einfach niemandem.",
  "Falsch. Erklär mir bitte nicht, wie du darauf gekommen bist.",
  "Falsch. Die Frage hat das nicht verdient.",
  "Falsch. Aber schön, dass du da bist.",
  "Falsch. Das war so daneben, das hat schon wieder Stil.",
  "Falsch. Noch so eine, und ich rufe deine Mutter an.",
  "Falsch. Das kannst du besser. Hoffe ich.",
  "Falsch. Und du hattest so viel Zeit.",
  "Falsch. Und das auch noch mit Absicht?",
  "Falsch. Hoffentlich war das nur geraten.",
  "Falsch. Das hat mir jetzt den Abend versaut."
];
  if (NEW_QUIPS_LIVE) quips.push(...newQuips);
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
