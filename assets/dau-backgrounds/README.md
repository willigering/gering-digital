# DAU TO PRO – dezente IT-Hintergründe

Drei zusammengehörige, dunkle Hintergrundmotive für Lernmodule. Matte Anthrazitflächen, gedämpftes Cyan und wenig Gold; Details am Rand, freie Mitte. Dekoration, keine fachlichen Schaltbilder. Die Motive sind **nicht nahtlos kachelbar**.

| ID | Motiv | Passende Module |
| --- | --- | --- |
| circuit | Leiterplatte mit Leiterbahnen und Bauteilen | Hardware, Zahlensysteme, Grundlagen |
| cables | Geordnete Netzwerkkabel und RJ45-Stecker | Subnetting, Ethernet, VLAN, Netzwerk |
| server | Serverracks, Metallgitter und Kabelführung | Server, Administration, Betriebssysteme |

Pro Motiv: `*-1536.webp` (1536 × 1024) und `*-768.webp` (768 × 512). Dateigrößen und Pfade: [manifest.json](manifest.json). Kein Hochskalieren auf riesige Originaldateien nötig. [preview.html](preview.html) lokal oder nach Deployment im Browser öffnen.

## Für Claude / Modul-Erstellung

1. Diesen Ordner aus dem Repository lesen. Motiv aus `manifest.json` wählen.
2. Bestehende Modulstruktur, Lernlogik, Fortschritts-Schlüssel und Inhalte beibehalten.
3. Hintergrund rein dekorativ verwenden. Inhalte auf ausreichend deckende dunkle Karten setzen; keinen Lesetext direkt über Kabel oder Bauteile legen. Kontrast im fertigen Modul prüfen.
4. Keine zusätzlichen Neonfilter, leuchtenden Linien oder Animationen ergänzen. Auf kleinen Displays darf `cover` die Ränder beschneiden; dort zählt gute Lesbarkeit mehr als die Sichtbarkeit aller Stecker.
5. **Vor dem Verpacken die Ausgabeform wählen:** gehostete Moduldatei oder eigenständige Offline-HTML. GitHub-Dateipfade sind keine automatisch öffentlich erreichbaren Bild-URLs.

### Gehostetes Modul auf geringdigital.de

Den kompletten Ordner nach `/assets/dau-backgrounds/` auf STRATO übertragen. Im Modul:

```html
<link rel="stylesheet" href="/assets/dau-backgrounds/backgrounds.css">
<body class="dtp-module-bg dtp-bg-cables">
  <!-- Bestehende Moduloberfläche -->
</body>
```

Klassen: `dtp-bg-circuit`, `dtp-bg-cables`, `dtp-bg-server`. Das Stylesheet betrifft nur die ausdrücklich gesetzten Klassen und aktiviert keine Bewegung. Es verwendet `body::before` als feste Hintergrundebene; wenn ein Modul diese Pseudoebene bereits nutzt, in einen eigenen dekorativen Container übertragen. Kein eigenes Parallax-Skript erforderlich.

### Einzelne HTML-Datei / offline / ZIP-Upload

Wenn das Modul eine **einzige HTML-Datei** bleiben soll, das gewählte WebP beim Erstellen als Base64-Data-URL direkt in das Modul-CSS einbetten:

```css
/* <BASE64> beim Erstellen durch den echten Dateiinhalt ersetzen. */
body {
  background: #090e11 url("data:image/webp;base64,<BASE64>") center top / cover no-repeat;
}
```

Base64 lässt sich z. B. mit Python `base64.b64encode(Path(pfad).read_bytes()).decode("ascii")` erzeugen. Für kurze Module passt dieses einfache Beispiel; für lange Seiten die feste Ebene aus `backgrounds.css` ins Modul übernehmen und die Bild-URL dort ersetzen. Für eine kompakte Ein-Datei-Ausgabe nur die benötigte Bildgröße einbetten (1536 für Desktop, 768 für kleine Ansichten). Nicht alle Motive in jedes Modul einbetten.

Alternativ als ZIP: Bild und CSS lokal mitliefern und relativ referenzieren. Nur im Modulordner vorhandene Dateien oder nachweislich deployte absolute Pfade verwenden; keine privaten GitHub-Raw-URLs und keine GitHub-Tokens in HTML einbauen.

## Herkunft und Umfang

Neue Motive mit dem integrierten Imagegen-Werkzeug erstellt; Prompts stehen in [prompts.md](prompts.md). Anschließend nur für die Auslieferung skaliert und als WebP optimiert. Die vorhandenen Platinenbilder, die Hauptseite, Figuren und der interaktive Pilz werden durch dieses Asset-Paket nicht verändert.
