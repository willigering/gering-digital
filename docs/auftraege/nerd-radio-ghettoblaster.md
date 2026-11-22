# AUFTRAG: NERD RADIO – INTERAKTIVER CYBERPUNK-GHETTOBLASTER

## 1. Projekt und Ziel

Repository: `willigering/gering-digital`

Website: `https://geringdigital.de/dau-to-pro/`

Bestehender Entwicklungsbranch: `feature/nerd-radio-20261106`

Bestehender Pull Request: `#157`

Entwickle den bereits begonnenen Musikplayer zu einem vollständig funktionsfähigen, dreidimensional wirkenden Cyberpunk-Ghettoblaster weiter.

**Die beigefügte Konzeptgrafik ist die verbindliche visuelle Referenz.**

Ziel ist keine gewöhnliche Musikplayer-Oberfläche, sondern ein hochwertiges, interaktives Gerät, das optisch wie ein echter futuristischer Ghettoblaster wirkt.

Der Player soll nicht nur ähnlich aussehen, sondern möglichst nah an die Vorlage herankommen.

## 2. WICHTIG: Keine aufgelegten Bedienelemente!

Alle Buttons müssen optisch fest in das Gehäuse integriert sein.

Das betrifft insbesondere:

- Play/Pause
- Stopp
- Vorheriger Titel
- Nächster Titel
- Zufallswiedergabe
- Lautstärkeregler
- Playlist

Die Buttons müssen wie echte physische Tasten aussehen.

Gewünschte Effekte:

- Räumliche Tiefe durch Schatten und Lichtkanten
- Beleuchtete Konturen in Türkis und Gold
- Sanftes Aufleuchten beim Hover
- Sichtbares Eindrücken beim Anklicken
- Aktive Play-Taste leuchtet orange
- Kleine, passende Sound- und Lichteffekte optional

**Wichtig:** Keine unsichtbaren HTML-Buttons über eine Grafik mit bereits aufgemalten Buttons legen.

Die tatsächlichen HTML-Bedienelemente sollen selbst das sichtbare Design bilden.

Verwende CSS, SVG und gegebenenfalls getrennte Grafik-Assets, um die Gehäuseteile und die interaktiven Komponenten sauber zusammenzusetzen.

## 3. Das Display – echte Waveform

Das zentrale Display ist einer der wichtigsten Bestandteile.

**Die Waveform muss tatsächlich mit dem Audiosignal verbunden sein!**

Verwende dafür die Web Audio API mit `AnalyserNode` und ein HTML-Canvas.

Anforderungen:

1. Die Waveform reagiert in Echtzeit auf die abgespielte Musik.
2. Höhen und Tiefen werden anhand echter Audiodaten dargestellt.
3. Unterschiedliche Musik erzeugt unterschiedliche Ausschläge.
4. Bei Stille bleibt die Anzeige ruhig.
5. Beim Stoppen wird die Anzeige zurückgesetzt.
6. Bei Pause soll die Anzeige entsprechend reagieren.
7. Die Animation läuft flüssig und möglichst ressourcenschonend.

Die Visualisierung soll vollständig innerhalb des integrierten Displays stattfinden.

Keine Waveform außerhalb des Gerätes!

Keine zufällig animierten Balken, die nur so tun, als würden sie auf Musik reagieren.

Die Darstellung soll leuchtend türkis sein, mit einzelnen goldenen Akzenten für kräftige Pegel.

Das Display zeigt außerdem den aktuellen Songtitel, Wiedergabestatus, Titelnummer und gegebenenfalls echte Zeitinformationen an.

Bei endlosen, generierten Musikloops soll keine erfundene Titeldauer angezeigt werden.

## 4. Ghettoblaster-Design

Orientiere dich möglichst exakt an der Referenzgrafik.

### Gehäuse

- Dunkles, metallisches Cyberpunk-Gehäuse
- Massive, leicht abgeschrägte Bauweise
- Räumlich ausgeprägte Kanten
- Sichtbare Verschraubungen
- Kleine technische Details und Lüftungsschlitze
- Tragegriff oben
- Dezente Gebrauchsspuren
- Goldene und türkise Neonakzente
- DAU-TO-PRO-Schriftzug
- Pixelpilz-Elemente

### Lautsprecher

Zwei große runde Lautsprecher links und rechts.

Die Lautsprecher erhalten:

- Metallische Schutzgitter
- Leuchtende Ringe
- Dezente Reaktion auf laufende Musik
- Optional eine sehr leichte pulsierende Bassanimation

Die Animationen dürfen nicht nerven oder übertrieben wirken.

### Display und Bedienfeld

Das Display sitzt zwischen den Lautsprechern.

Direkt darunter befinden sich die großen, physischen Bedientasten.

Der Lautstärkeregler ist ebenfalls Bestandteil der Vorderseite.

**Die gesamte Vorderseite soll wie ein einziges zusammenhängendes Gerät wirken.**

Es darf nicht aussehen, als wäre ein normaler Webplayer auf eine Ghettoblaster-Grafik geklebt worden.

## 5. Funktionalität

Prüfe zunächst die vorhandene Implementierung des NERD RADIO.

Bereits vorhandene Funktionen sollen möglichst weiterverwendet werden.

Benötigt werden:

- Funktionierende Audiowiedergabe
- Play und Pause
- Tatsächlicher Stopp
- Titel vor und zurück
- Zufälliger Titel
- Einstellbare Lautstärke
- Auswahl aus einer Playlist
- Aktueller Titel im Display
- Echte Audio-Visualisierung

Nutze zunächst die vorhandenen drei generierten Musiktracks.

Die Architektur soll später die Einbindung eigener MP3- oder WAV-Dateien ermöglichen.

Keine externen Streamingdienste oder kostenpflichtigen APIs erforderlich.

Die Wiedergabe darf erst nach einer bewussten Benutzeraktion beginnen.

## 6. Platzierung auf der Website

Der Ghettoblaster gehört auf die DAU-TO-PRO-Startseite.

Position:

- Rechts neben dem Trainingsbereich
- Etwas tiefer als die Modulüberschrift
- Leicht schräg gedreht
- Nicht als schwebendes Standard-Widget
- Passend in den Hintergrund integriert

**Die Modulkarten müssen weiterhin mittig ausgerichtet bleiben!**

Verändere nicht einfach die Breite oder Position des bestehenden Modulrasters, um Platz für den Player zu schaffen.

Die ursprüngliche zentrierte Ausrichtung ist zu erhalten.

Der Ghettoblaster nutzt den verfügbaren rechten Bereich. Falls bei kleineren Bildschirmbreiten nicht genügend Platz vorhanden ist, muss sich die Position responsiv ändern.

Auf Smartphones darf das Gerät weder die Module verdecken noch horizontales Scrollen verursachen.

## 7. Visuelle Effekte

Der Ghettoblaster soll wirkungsvoll, aber nicht überladen sein.

Erwünscht sind:

- Türkises Displayleuchten
- Goldene Beleuchtung an Lautsprechern und Tasten
- Weiche Lichtreflexionen am unteren Gehäuserand
- Dezenter Bodenschatten
- Räumliche Wirkung durch Perspektive
- Sehr leichte Animationen während der Wiedergabe

Die vorhandene Hintergrundgrafik der Website bleibt erhalten.

Der Player soll sich farblich harmonisch in die bestehende DAU-TO-PRO-Optik einfügen.

Bei `prefers-reduced-motion` müssen nicht notwendige Animationen reduziert werden.

## 8. Technische Umsetzung

Die gesamte Implementierung soll wartbar und nachvollziehbar sein.

Bevorzuge:

- HTML für echte Bedienelemente
- CSS für Gehäuse, Beleuchtung und 3D-Effekte
- SVG für präzise dekorative Elemente
- JavaScript für die Interaktionen
- Web Audio API für Audiowiedergabe und Waveform

Falls die Referenzgrafik als Hintergrund verwendet wird, dürfen darunter keine aufgemalten Tasten oder Waveform sichtbar bleiben, die nicht zu den tatsächlichen Funktionen passen.

Im Zweifel muss das Gerät aus mehreren Ebenen rekonstruiert werden.

**Optische Qualität und tatsächliche Funktionalität sind gleich wichtig.**

## 9. Tests und Qualität

Prüfe insbesondere:

- Alle Buttons reagieren zuverlässig.
- Play/Pause und Stopp funktionieren korrekt.
- Die Waveform reagiert auf echte Audiodaten.
- Titelwechsel aktualisieren die Anzeige.
- Lautstärkeänderungen wirken sich tatsächlich auf die Wiedergabe aus.
- Keine doppelten Musikinstanzen entstehen.
- Keine JavaScript-Fehler in der Browserkonsole.
- Die Modulkarten behalten ihre ursprüngliche Ausrichtung.
- Desktop und Smartphone funktionieren.
- Die Website wird nicht unnötig langsamer.

Teste die Darstellung mit unterschiedlichen Bildschirmbreiten.

## 10. Veröffentlichung

Arbeite mit dem vorhandenen GitHub-Repository und berücksichtige die Änderungen aus PR #157.

Verhindere doppelte Player oder Konflikte mit der bisherigen Implementierung.

Erstelle nach der Implementierung aussagekräftige Screenshots der tatsächlichen Browserdarstellung.

**WICHTIG: Vorläufig nicht veröffentlichen!**

Kein Merge, kein Auto-Merge und kein Deployment ohne meine ausdrückliche Freigabe.

Ich möchte zuerst sehen, wie der tatsächlich programmierte Ghettoblaster auf der Website aussieht.

Nicht nur ein generiertes Konzeptbild zeigen, sondern einen Screenshot der echten HTML-/CSS-/JavaScript-Implementierung.

Erst nach meiner Zustimmung darf die Veröffentlichung erfolgen.

### Qualitätsziel

Der fertige Ghettoblaster soll möglichst genauso hochwertig aussehen wie die beigefügte Referenzgrafik.

Er soll wirken wie ein echtes, interaktives Cyberpunk-Gerät – nicht wie ein gewöhnlicher Audioplayer mit einer schicken Hintergrundgrafik.
---

Referenzgrafik: `docs/auftraege/nerd-radio-referenz.png` (verbindlich).
