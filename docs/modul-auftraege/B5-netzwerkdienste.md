# B5 – Netzwerkdienste & Protokolle

**Port 80, bitte kommen · v1.0**

Einzeldatei: `lernmodule/b5-netzwerkdienste.html`. Präfix: `b5-dienste`. Hintergrund: `cables-fiber` (eingebettet). Akzent: `#7ad0ff`. Zehn Stufen und Kapitel, je ein interaktives Labor und Kurz-Check. Training: Themen, Baustellen, einzeln bewertete Port-Zuordnungen, 90-Sekunden-Sprint. Prüfungen: 30/60/90 Minuten mit 20/40/60 Aufgaben und exakt 100 ganzzahligen Punkten. Jede Aufgabe hat eine Ausgangslage, eine Frage und eine Antwort. Fachbegriffe werden ausgeschrieben und in Alltagssituationen erklärt. Keine freie KI-Bewertung: Fachbegriffe/Keywords werden gegen eine eindeutige Lösung mit Schreibvarianten geprüft.

## Aufgabentypen

`min` bezeichnet die erste Lernpfadstufe (1–10); im freien Training und in Prüfungen sind alle Themen verfügbar. Stufenindex im Speicher/Achievement: `min - 1`.

| ID | Deutscher Name | Teilthema | Ab Stufe |
| --- | --- | --- | --- |
| `t_choose` | Transport passend wählen | TCP oder UDP | 1 |
| `t_property` | Transporteigenschaft erkennen | TCP oder UDP | 1 |
| `t_header` | UDP-Header berechnen | TCP oder UDP | 1 |
| `t_quic` | QUIC richtig einordnen | TCP oder UDP | 1 |
| `t_security` | Zuverlässigkeit und Schutz trennen | TCP oder UDP | 1 |
| `p_port` | Standardport zum Dienst | Ports & Verbindungen | 2 |
| `p_service` | Dienst zum Port | Ports & Verbindungen | 2 |
| `p_reply` | Antwortport im Mitschnitt | Ports & Verbindungen | 2 |
| `p_range` | Portbereich einordnen | Ports & Verbindungen | 2 |
| `p_socket` | TCP-Verbindung unterscheiden | Ports & Verbindungen | 2 |
| `c_synack` | SYN bestätigen | TCP-Ablauf | 3 |
| `c_ack` | Datenbytes bestätigen | TCP-Ablauf | 3 |
| `c_order` | Handshake ergänzen | TCP-Ablauf | 3 |
| `c_fin` | FIN bestätigen | TCP-Ablauf | 3 |
| `c_trace` | TCP-Mitschnitt deuten | TCP-Ablauf | 3 |
| `d_dora` | DHCP-Schritt ergänzen | DHCP | 4 |
| `d_t1` | Lease-Erneuerung berechnen | DHCP | 4 |
| `d_t2` | Lease-Rebinding berechnen | DHCP | 4 |
| `d_relay` | DHCP über Netzgrenzen | DHCP | 4 |
| `d_holiday` | DHCP-Server im Urlaub | DHCP | 4 |
| `n_record` | DNS-Record passend wählen | DNS | 5 |
| `n_ttl` | DNS-Cache-Restzeit | DNS | 5 |
| `n_transport` | DNS-Transport bestimmen | DNS | 5 |
| `n_trace` | DNS-Ausgabe lesen | DNS | 5 |
| `n_always` | It’s always DNS – wirklich? | DNS | 5 |
| `a_return` | PAT-Antwort zurückübersetzen | NAT & PAT | 6 |
| `a_port` | PAT-Port zurückübersetzen | NAT & PAT | 6 |
| `a_type` | NAT und PAT unterscheiden | NAT & PAT | 6 |
| `a_forward` | Portweiterleitung lesen | NAT & PAT | 6 |
| `a_security` | NAT ist keine Verschlüsselung | NAT & PAT | 6 |
| `r_local` | ARP-Ziel im eigenen Netz | ARP | 7 |
| `r_remote` | ARP-Ziel bei entferntem Netz | ARP | 7 |
| `r_reply` | ARP-Antwort einordnen | ARP | 7 |
| `r_v6` | IPv6 ohne ARP | ARP | 7 |
| `r_scope` | MAC und IP am Router | ARP | 7 |
| `i_echo` | Ping-Nachricht erkennen | ICMP | 8 |
| `i_ttl` | TTL beim Weiterleiten | ICMP | 8 |
| `i_trace` | Traceroute-Antwort verstehen | ICMP | 8 |
| `i_filter` | Ping richtig interpretieren | ICMP | 8 |
| `i_port` | ICMP ohne Portnummer | ICMP | 8 |
| `h_status` | HTTP-Statuscode einsetzen | HTTP & HTTPS | 9 |
| `h_method` | HTTP-Methode wählen | HTTP & HTTPS | 9 |
| `h_tls` | HTTPS und TLS zuordnen | HTTP & HTTPS | 9 |
| `h_url` | URL-Port auslesen | HTTP & HTTPS | 9 |
| `h_version` | HTTP-Version und Transport | HTTP & HTTPS | 9 |
| `s_mail` | Mail-Protokoll zum Zweck | Mail & Fernzugriff | 10 |
| `s_submit` | Submission statt Servertransport | Mail & Fernzugriff | 10 |
| `s_ftp` | FTP-Datenkanal unterscheiden | Mail & Fernzugriff | 10 |
| `s_secure` | SFTP und FTPS unterscheiden | Mail & Fernzugriff | 10 |
| `s_telnet` | Telnet im Jahr 2026 | Mail & Fernzugriff | 10 |

## Plattform-Anbindung

Manifest registriert B5 mit dem eigenen Motiv `netzwerkdienste` (1280×720 und 640×360 WebP). Die zentrale Ausgabe installiert/veröffentlicht das Modul im Admin und injiziert unverändert die bestehende Konto-Synchronisierung sowie den Rückweg. Keine zweite Login- oder XP-Lösung. `achievements_lib.php` registriert zehn B5-Achievements mit echten Typ-IDs; 2 Bronze, 2 Silber, 2 Gold, 1 Platin, 3 witzige, zusammen 590 Achievement-XP. Dazu gelten die bestehenden Aufgaben- und Stufen-XP.

## Abnahme nach Abschnitt 7 der Anleitung

- [x] Offline-Datei ohne HTTP-Anfragen, externe Skripte oder Konsolenfehler. Etikett/Titel, genau vier Bereichskacheln; kein oberes Logo oder Navigationsmenü.
- [x] Akzent und eingebetteter Glasfaserhintergrund. Vorgaben des B5-Steckbriefs einschließlich TCP-Abbau, DNS-TCP, Mail-Ports und FTP-Kanälen abgedeckt.
- [x] Zehn Stufen; erste drei Antworten mit automatischem Hinweis, ohne Eintrag in die Meisterungs-Historie. Erst 8 richtige unter zehn Antworten ohne Hilfe öffnen die nächste Stufe; Meisterung bleibt erhalten. Jede gewertete Antwort zählt in Statistik und Teilthema.
- [x] Ausgangslage und Frage getrennt; einfachere Frage per eingekreistem, fokussierbarem Fragezeichen (auch per Tippen). Pro Aufgabe nur eine gewertete Antwort.
- [x] Erste Lektion und mehr als 20 Fälle quer durch alle zehn Themen inhaltlich gelesen; typische Verwechslungen, entscheidende Angaben und Lösungen geprüft. Fachquellen im Nachschlagwerk verlinkt (IANA/IETF).
- [x] 50 Typen jeweils 1000-mal generiert, Referenzantwort akzeptiert und falsche Antwort abgelehnt. 20 richtige Antworten zusätzlich über die Trainingsoberfläche eingegeben.
- [x] Lernpfad über 13 Antworten geprüft: drei geführte, dann zehn ohne Hilfe. Lektion beim Üben ausgeblendet.
- [x] Vollständige 30/60/90-Minuten-Prüfungen mit je 100 Punkten; IHK-Notenschwellen geprüft. Rückblick zeigt eigenen Wert, richtige Antwort, Situation und Lösungsweg. Aufgabenpunkte und Themenpunkte getrennt beschriftet.
- [x] Sprint beendet bei Tabwechsel; Prüfung bei Tabwechsel abgegeben und als „Seite verlassen“ gespeichert.
- [x] Kein horizontaler Überlauf in allen vier Bereichen bei 1440/390/320 px. Modulansicht und echte Modulkarte visuell kontrolliert.
- [x] Nur die sechs erlaubten Modulschlüssel; JSON-Werte. Zentrale Sync-Verwaltungsschlüssel werden nur vom bestehenden Plattformskript gesetzt.
- [x] Separater PHP-Test: Fortschritt gespeichert, alle zehn Achievements erreichbar, XP stabil bei Wiederholung, Vorschau automatisch zugeordnet, zentrale Injektion vor Modulcode.
- [x] Separater Plattform-Browsertest: gespeicherter Konto-Stand vor Modulstart geladen, Antwort an die vorhandene Progress-API übertragen (HTTP im Test abgefangen), Rückweg geprüft, echte PHP-Modulkarte bei 1440/390 px mit geladenem Bild geprüft.
- [x] Bestehende Achievement-Suite: 219 Prüfungen erfolgreich. Die feste Kataloganzahl wurde auf die tatsächliche Modulzahl umgestellt.

## Reproduzieren

```sh
php tests/achievements_test.php
php tests/b5_integration_test.php
node tests/b5_browser.cjs
node tests/b5_platform_browser.cjs
```

Browserprüfungen brauchen Playwright/Chromium; optional `CHROME_PATH`. Der PHP-Test nutzt eine frische temporäre SQLite-Datei. Keine produktiven Konten oder Daten werden verwendet. `b5-module.yml` führt diese Prüfungen für den Pull Request aus.

## Bereitstellung und Grenzen

Nach einem ausdrücklich beauftragten Merge: die neue Moduldatei, `lernmodule/manifest.json`, `achievements_lib.php`, das Vorschau-Manifest und beide WebP-Dateien auf STRATO übernehmen. Bestehende Datenbank und Uploads behalten. Danach B5 im Admin unter „Mitgelieferte Lernmodule“ installieren/veröffentlichen. Der Pull Request allein macht nichts auf STRATO live.

Die Offline-Datei, PHP-Integration und isolierte Browser-Synchronisierung sind geprüft. Eine Anmeldung gegen die produktive STRATO-Installation wurde nicht durchgeführt. Aussagen über vollständige IHK-Abdeckung werden nicht gemacht.
