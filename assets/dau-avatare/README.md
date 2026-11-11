# DAU TO PRO Avatare

Sieben auswählbare Kopf-Schulter-Porträts im Retro-Arcade-Pixelstil, IDs `avatar-01` bis `avatar-07`.
Die Figuren haben keine festen Namen und keine Rangplätze.

Alle Ebenen einer Figur teilen dieselbe transparente 512 × 512-Leinwand und Position.

| Datei | Inhalt |
| --- | --- |
| `avatar-0N-referenz.png` | vollständiger Look (Basisporträt plus alle drei Teile), Vorschaubild in der Auswahl |
| `avatar-0N-basis.png` | Basisporträt ohne Zubehör |
| `avatar-0N-<teil>.png` | nur die Pixel des Zubehörteils an seiner endgültigen Position |
| `*.webp` | verlustfreie 512er-Ableitung (große Vorschau auf `dau-to-pro/avatare.php`) |
| `*-192.webp` | verlustfreie 192er-Ableitung (Highscore-Sechsecke, Konto, Profil) |

Die PNGs sind die Quelle. WebP neu erzeugen: `python3 tools/dau-avatare/build.py`.

## Stapeln (hinten nach vorne, über dem Basisporträt)

| ID | Teile |
| --- | --- |
| avatar-01 | carbonkragen, kapuze, atemmaske |
| avatar-02 | dreitagebart, techniker-cap, funk-headset |
| avatar-03 | bomberjacke, fliegerbrille, ohrclip |
| avatar-04 | schulterjacke, stirnband, rennvisier |
| avatar-05 | halsschal, kapuze, maske |
| avatar-06 | jacke, kopfhoerer, schlaefenklammer |
| avatar-07 | arbeitsjacke, kinnbart, brille |

Die drei Teile einer Figur sind gemeinsam tragbar und gehören nur zu dieser Figur. Diese Paare überdecken
sich teilweise, sind aber zum Stapeln gedacht und keine Alternativen:

- avatar-01: Carbonkragen unter der Kapuze, der Kragen bleibt am Hals sichtbar
- avatar-03: Ohrclip sitzt vor dem Brillenriemen
- avatar-04: Stirnband unter dem Rennvisier
- avatar-06: Schläfenklammer sitzt vor dem Kopfbügel

Die Reihenfolge steht verbindlich in `dtp_avatar_catalog()` (`avatare_lib.php`); `tests/avatare_test.php`
prüft, dass Basis plus Teile deckungsgleich den Referenz-Look ergeben.

## Speicherung

Die Wahl liegt je Lernkonto in `learner_prefs` unter `avatar_pack` als `{"v":1,"id":"avatar-04","parts":[…]}`.
Alle Figuren und Teile sind frei wählbar; XP, Level und Achievements werden nicht verändert. Ohne Wahl bleibt
die Highscore-Fassung beim bisherigen Platzhalter. Der Schlüssel `avatar` des zurückgenommenen Systems
(PR #214) wird weder gelesen noch gelöscht.
