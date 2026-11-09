# DAU TO PRO – Achievement-Symbole

62 transparente PNGs, jeweils 512 × 512 px. Motive zentriert, rund 10 % transparenter Rand. Zielgrößen der Oberfläche: 42 px im Konto, 48 px im Popup.

10 Zahlensysteme (`a1.*`), 10 OSI (`osi.*`), 10 Subnetting (`subnet.*`), 12 modulübergreifend (`g.*`), 10 Datenschutz (`d1.*`). Dateinamen sind die Achievement-Codes. Rahmen und Sperrzustände stellt die Oberfläche dar. Die PNGs enthalten keine Achievement-Rahmen oder Medaillen.

Erstellt einzeln mit dem integrierten Bildgenerator. Das erste Symbol diente als gemeinsame Stilreferenz. Für `g.easteregg.png` wurde zusätzlich der originale rote Pixelpilz als Referenz verwendet. Ziffern und Symbole erscheinen nur als Bestandteil des Motivs. Der Level-Up-Effekt des Pilzes ist ein Funkeln ohne Schriftzug.

## Grundprompt für weitere Module

`Pixel art game achievement icon, 32-bit style, single centered object, bold dark outline, vibrant colors with gold (#e8b84a) and teal accents, transparent background, no text, no frame, square 512x512. Motif: …`

Zusatz für jedes Symbol: `Object within central 80 percent, about 10 percent empty margin. Crisp pixel clusters, clear silhouette readable at 42px. No medal, no orange-black warning stripes. Only motif-integral digits or symbols allowed.`

Für neue Module denselben Stil beibehalten und je 10 eigene Motive ergänzen. Die WebP-Dateien in 96 und 192 px werden separat aus diesen PNGs erzeugt.

## Motive

| Datei | Motiv |
| --- | --- |
| `a1.erstes-bit.png` | a single light switch flipping from 0 to 1, small glowing bit |
| `a1.farbcodes.png` | a color picker pipette over three RGB color drops (red, green, blue) |
| `a1.hex.png` | a small wizard hat with the symbol 0x on it |
| `a1.chmod.png` | a padlock with three small key slots, digits 7 5 5 on its body |
| `a1.kibi.png` | a balance scale weighing a hard drive against a stack of bytes, perfectly level |
| `a1.lernpfad.png` | a row of exactly eight glowing bits all lit up, forming a full byte bar |
| `a1.marathon.png` | a sturdy server hard drive with a stopwatch showing 90 |
| `a1.off-by-one.png` | a ruler with one extra tick that sticks out, small confused face |
| `a1.ueberlauf.png` | an odometer rolling over from 255 to 000, overflowing liquid bucket |
| `a1.festplatte.png` | a cracked hard drive with a tiny bandage and a smoke puff |
| `osi.kabel.png` | an RJ45 network plug clicking into a port, small spark |
| `osi.merksatz.png` | an open notebook with a lightbulb above it |
| `osi.paketbote.png` | a cardboard parcel with a blank shipping label and tiny wings |
| `osi.handshake.png` | two pixel hands shaking, three small arrows going back and forth |
| `osi.doktor.png` | a stethoscope wrapped around a network switch |
| `osi.lernpfad.png` | a stacked tower of exactly seven colored layers, like a layer cake |
| `osi.marathon.png` | an hourglass with network packets falling instead of sand |
| `osi.layer8.png` | a confused user sitting in front of a monitor, question marks above the head |
| `osi.richtung.png` | a layer stack turned upside down with two arrows pointing in opposite directions |
| `osi.getrennt.png` | a network cable cut in two, the ends sparking, small running shoe |
| `subnet.oktett.png` | a walnut cracked open with the number 192 inside |
| `subnet.potenzen.png` | a rocket with a small 2 and an exponent n on its side |
| `subnet.maskenball.png` | an elegant masquerade mask with /24 engraved on it |
| `subnet.broadcast.png` | a megaphone sending signal waves to several small computers |
| `subnet.vlsm.png` | a blueprint with a network split into blocks of different sizes, a set square on top |
| `subnet.lernpfad.png` | a pizza cut into perfectly even slices, each slice a small network |
| `subnet.marathon.png` | a glowing crown made of four bright blocks |
| `subnet.host.png` | a row of chairs with one person left standing, musical chairs |
| `subnet.falsches-netz.png` | a fish caught in the wrong fishing net, surprised face |
| `subnet.leere.png` | a megaphone shouting into an empty desert with a tumbleweed, compact isolated vignette |
| `g.willkommen.png` | a doormat with a small waving pixel character standing on it |
| `g.allrounder.png` | a swiss army knife with network tools folded out |
| `g.7tage.png` | a calendar page with exactly seven check marks |
| `g.1000.png` | a big stack of solved task cards with a gold check mark |
| `g.5pfade.png` | a half-built stack of server racks, glowing |
| `g.30tage.png` | a coffee mug with a flame that never goes out |
| `g.10000.png` | a full data center row of server racks with blinking lights |
| `g.15pfade.png` | a sysadmin key card on a lanyard, almost fully charged |
| `g.komplett.png` | a trophy shaped like a network tower, sparkling |
| `g.rampensau.png` | a spotlight shining on a small stage with a microphone |
| `g.nachteule.png` | an owl wearing headphones in front of a glowing laptop at night, isolated transparent vignette |
| `g.easteregg.png` | Originaler roter Pixelpilz mit weißem Punktemuster, cremefarbenem Stiel und gold/türkisem Level-Up-Funkeln ohne Text |


## D1 Datenschutz

Die zehn D1-Motive erweitern den vorhandenen Pixel-Stil. Editierbare SVG-Quellen liegen unter `tools/dau-previews/svg/icons/`. `node tools/dau-previews/d1-icons.mjs` erzeugt daraus transparente PNGs (512 px) und WebP-Dateien (96/192 px) unter `assets/achievement-icons/`. Konto, Highscore und Popup verwenden diese WebP-Dateien.

| Code | Motiv |
| --- | --- |
| d1.personenbezug | Personenkarte mit Funkeln |
| d1.grundsaetze | Aufgeschlagenes Regelbuch mit Haken |
| d1.rechte | Erhobene Hand |
| d1.kontrolle | Geschützte Tür |
| d1.panne | Laptop mit Warnsymbol und kleinem Löscher |
| d1.lernpfad | Schild mit Haken |
| d1.pruefung | Schloss mit Funkeln |
| d1.cookie | Angebissener Cookie |
| d1.verbergen | Kleiner Datengespenst-Geist |
| d1.frist | Uhr mit Bewegungslinien |

## D2 IT-Sicherheit & Schutzbedarf

Zehn einzeln generierte Pixelmotive mit transparentem Hintergrund, PNG 512 px und WebP 96/192 px. Darstellungsprüfung bei 42 px; Zuordnung über die bestehenden Achievement-Codes. Schild/Schloss (`cia`), Risikorechner (`risiko`), höchster Schutzbedarf (`maximum`), Schlüssel und Smartphone (`faktoren`), Würfel (`entropie`), Checkliste (`lernpfad`), Server/Sanduhr (`marathon`), kaputtes Schloss (`passwort123`), gekrönte Phishing-Mail (`prinz`), verdächtiger USB-Stick (`usb`).

## CS1 „Compiler sagt nein“

Die zehn `cs1.*`-Symbole sind nicht generiert, sondern per Skript als Pixel-Art gezeichnet: `python3 tools/cs1-icons.py` (64 × 64 Raster, 8-fach vergrößert, erzeugt auch die WebP-Fassungen). Gleiche Farbwelt, schlichter im Detail. Sie können jederzeit durch generierte Symbole mit demselben Dateinamen ersetzt werden.

| Datei | Motiv |
| --- | --- |
| `cs1.hallo.png` | Monitor mit Eingabeaufforderung „>HI“ |
| `cs1.semikolon.png` | großes goldenes Semikolon auf Kachel |
| `cs1.schublade.png` | Schrank mit offener Schublade, darin der Wert 24 |
| `cs1.typsicher.png` | Schild mit Haken |
| `cs1.uebersetzer.png` | Sprechblase mit Code, Pfeil, Sprechblase mit Bits |
| `cs1.lernpfad.png` | Treppe aus zehn Stufen mit Fahne |
| `cs1.marathon.png` | Stoppuhr mit 90 |
| `cs1.html.png` | spitze Klammern </> mit Fragezeichen |
| `cs1.nein.png` | rotes Stoppschild mit Semikolon |
| `cs1.ueberlauf.png` | randvoller Messbalken, Pfeil springt ins Minus |
