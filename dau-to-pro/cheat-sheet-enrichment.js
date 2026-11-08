/* Vertiefung zu allen elf Fachthemen: zusätzliche Fachabschnitte und praxisnahe Prüfungsaufgaben.
   Bleibt jeweils Bestandteil desselben Spickzettels, keine Unterkarten. */
globalThis.DTP_CHEAT_ENRICHMENT={
  "zahlen": {
    "sections": [
      [
        "Bitoperationen und Masken",
        "Mit Binärlogik prüfst und veränderst du einzelne Bits gezielt.",
        "AND::Bit ist nur 1, wenn beide Eingaben 1 sind, z. B. 1010 AND 1100 = 1000.|OR::Bit ist 1, sobald mindestens ein Eingang 1 ist, z. B. 1010 OR 1100 = 1110.|XOR::Bit ist 1, wenn die Eingaben unterschiedlich sind; 1010 XOR 1100 = 0110.|Bitmaske::Mit AND gezielt Bits auslesen; mit OR Bits setzen.",
        "Warum eignet sich AND für das Prüfen einer Bitmaske?",
        "Nicht gewünschte Bits werden zu 0, die interessierenden Stellen bleiben erhalten.",
        "Binäres AND ist nicht das logische && in C#.",
        "PRAXIS"
      ],
      [
        "Geschwindigkeit und Laufzeit",
        "Übertragungsrate ist nicht dieselbe Größe wie Reaktionszeit.",
        "Bandbreite::Maximale beziehungsweise nutzbare Datenmenge pro Zeit, zum Beispiel Mbit/s.|Latenz::Zeit bis eine Nachricht oder Antwort ankommt, meist Millisekunden.|Durchsatz::Tatsächlich erreichte Nutzdatenrate unter realen Bedingungen.|Overhead::Header, Bestätigungen und Wiederholungen reduzieren den Nutzdatendurchsatz.",
        "Eine Verbindung bietet 100 Mbit/s, überträgt aber nur 80 Mbit/s Nutzdaten. Warum?",
        "Unter anderem durch Protokolloverhead, Auslastung und Retransmits.",
        "100 Mbit/s bedeutet nicht 100 MB/s.",
        "VERSTEHEN"
      ],
      [
        "Zahlendarstellung in der Praxis",
        "Gleiche Bits können je nach Kontext Unterschiedliches bedeuten.",
        "Unsigned 8 Bit::Werte 0 bis 255.|Signed 8 Bit::-128 bis 127 im Zweierkomplement.|Überlauf::Ein Ergebnis außerhalb des Typbereichs kann je nach Sprache und Kontext einen Fehler auslösen oder überlaufen.|Endianess::Byte-Reihenfolge mehrbyteiger Werte: Big Endian und Little Endian.",
        "Warum muss man bei einem Bytewert Typ und Interpretation kennen?",
        "11111111 bedeutet unsigned 255, im signed 8-Bit-Zweierkomplement aber −1.",
        "Bitmuster und numerischer Wert sind nicht immer identisch.",
        "WISSEN"
      ]
    ],
    "questions": [
      [
        "Nenne drei Gründe, warum ein Datei-Download langsamer als die beworbene Leitungsgeschwindigkeit sein kann.",
        "Protokolloverhead, parallele Netzauslastung und Paketverluste mit Neuübertragung."
      ],
      [
        "Ein Backup umfasst 750 MB. Berechne die ideale Übertragungsdauer bei 50 Mbit/s.",
        "750 × 8 / 50 = 120 Sekunden = 2 Minuten, ohne Overhead."
      ],
      [
        "Eine Datei ist 2 MiB groß. Erkläre, warum sie nicht genau 2 MB umfasst.",
        "2 MiB = 2 × 1.048.576 Byte, 2 MB = 2 × 1.000.000 Byte."
      ],
      [
        "Beschreibe zwei praktische Einsatzmöglichkeiten hexadezimaler Zahlen in der IT.",
        "Kompakte Darstellung von MAC-Adressen und von Speicher-/Debugwerten."
      ],
      [
        "Welche zwei Prüfungen helfen, einen Fehler beim Binär-zu-Dezimal-Umrechnen zu erkennen?",
        "Stellenwerte jeder gesetzten 1 addieren und Ergebnis durch Rückumwandlung kontrollieren."
      ],
      [
        "Ein Status-Byte ist 10101100. Ermittle das Ergebnis mit der Maske 00001111 per AND.",
        "00001100₂ = 12₁₀."
      ],
      [
        "Vergleiche Bandbreite und Latenz anhand einer Videokonferenz.",
        "Bandbreite bestimmt mögliche Datenrate und Bildqualität, Latenz beeinflusst Gesprächsverzögerung."
      ],
      [
        "Nenne zwei Unterschiede von ASCII und UTF-8.",
        "ASCII hat 128 Zeichenpositionen; UTF-8 codiert Unicode-Codepunkte mit 1 bis 4 Byte."
      ]
    ]
  },
  "osi": {
    "sections": [
      [
        "Paketweg im LAN und WAN",
        "Jeder Router-Hop verändert die lokale Übertragung, nicht automatisch die Zieladresse.",
        "Quell-/Ziel-MAC::Gelten für den aktuellen lokalen Link und wechseln beim Weiterleiten über Router.|Quell-/Ziel-IP::Bleiben ohne NAT normalerweise über den Weg gleich.|TTL/Hop Limit::Wird an Routern reduziert, um Schleifen zu begrenzen.|ARP/NDP::Ermitteln die Link-Layer-Zuordnung im lokalen Netz bei IPv4 beziehungsweise IPv6.",
        "Warum erhält ein IP-Paket nach einem Router einen anderen Ethernet-Frame?",
        "Der nächste Link hat eigene MAC-Adressen und eine neue Frame-Prüfsumme.",
        "MAC-Adressen werden nicht unverändert durchs Internet transportiert.",
        "PRAXIS"
      ],
      [
        "Verbindungsaufbau und Kontrolle",
        "TCP organisiert zuverlässige Übertragung, nicht jede Anwendung braucht das.",
        "Drei-Wege-Handshake::SYN, SYN-ACK, ACK bauen eine TCP-Verbindung auf.|Sequenznummern::Ordnen Daten; verlorene Segmente können erneut übertragen werden.|Flusskontrolle::Empfängerfenster begrenzt Datenmenge beim Empfänger.|UDP::Keine integrierte Reihenfolge oder Retransmission; Anwendung kann selbst Mechanismen ergänzen.",
        "Nenne zwei Zuverlässigkeitsmechanismen von TCP.",
        "Sequenznummern mit geordneter Zustellung und Wiederholung fehlender Segmente.",
        "TCP garantiert keine erfolgreiche Verarbeitung durch die Anwendung.",
        "WISSEN"
      ],
      [
        "MTU und Fragmentierung",
        "Nicht jedes Paket passt auf jede Verbindung.",
        "MTU::Maximum Transmission Unit begrenzt die Größe eines Pakets/Frames auf einem Link.|IPv4::Router können fragmentieren, wenn erlaubt; das ist meist unerwünscht.|IPv6::Router fragmentieren nicht; Sender passt Paketgröße an oder fragmentiert selbst.|Fehlersuche::Path-MTU-Probleme können einzelne Dienste trotz funktionierender Pings beeinträchtigen.",
        "Warum kann ein kleiner Ping funktionieren, eine größere HTTPS-Antwort aber hängen bleiben?",
        "Ein Path-MTU-Problem oder blockierte ICMP-Meldungen können größere Pakete verhindern.",
        "MTU ist nicht gleich Nutzdatenmenge einer Anwendung.",
        "PRAXIS"
      ]
    ],
    "questions": [
      [
        "Nenne drei OSI-Schichten und jeweils ein typisches Diagnosebeispiel.",
        "Schicht 1: Link/Kabel; Schicht 3: falsches Gateway; Schicht 7: DNS-/Anwendungsfehler."
      ],
      [
        "Ein Client erreicht per IP, aber nicht per Hostname einen Server. Welche zwei Bereiche prüfst du?",
        "Namensauflösung/DNS-Konfiguration und Anwendungs- beziehungsweise Firewall-Einstellungen."
      ],
      [
        "Erkläre den Unterschied zwischen Frame, IP-Paket und TCP-Segment.",
        "Ethernet-Frame auf Schicht 2, IP-Paket auf Schicht 3, TCP-Segment auf Schicht 4."
      ],
      [
        "Ein Router leitet ein Paket weiter. Welche beiden Adressarten ändern sich üblicherweise beziehungsweise bleiben gleich?",
        "Lokale Quell-/Ziel-MAC ändern sich; Ziel-IP bleibt ohne NAT erhalten."
      ],
      [
        "Nenne zwei Vorteile der Schichtenmodelle für die Fehlersuche.",
        "Strukturierte Eingrenzung und eindeutige Zuordnung von Protokollen/Komponenten."
      ],
      [
        "Warum ist ein Switch allein nicht genug für Kommunikation zwischen zwei IP-Subnetzen?",
        "Ein Layer-2-Switch leitet Frames innerhalb einer Broadcast-Domäne; zwischen IP-Netzen ist Routing nötig."
      ],
      [
        "Beschreibe die drei Nachrichten des TCP-Verbindungsaufbaus in der richtigen Reihenfolge.",
        "SYN → SYN-ACK → ACK."
      ],
      [
        "Warum sind Zuverlässigkeit und geringe Latenz bei Videotelefonie ein Zielkonflikt?",
        "Erneute Übertragung alter Echtzeitdaten erhöht Verzögerung; fehlende Pakete sind oft weniger schädlich."
      ]
    ]
  },
  "subnet": {
    "sections": [
      [
        "Private und besondere IPv4-Bereiche",
        "Adressarten vor der Netzplanung unterscheiden.",
        "RFC 1918::10.0.0.0/8, 172.16.0.0/12 und 192.168.0.0/16 sind private Bereiche.|Loopback::127.0.0.0/8, typisch 127.0.0.1.|APIPA::169.254.0.0/16 für IPv4-Link-Local bei fehlender Konfiguration.|Dokumentation::192.0.2.0/24, 198.51.100.0/24 und 203.0.113.0/24 sind für Beispiele reserviert.",
        "Gehört 172.25.4.1 zu den privaten IPv4-Adressen?",
        "Ja, weil 172.16.0.0 bis 172.31.255.255 privat sind.",
        "Nicht der ganze Bereich 172.0.0.0/8 ist privat.",
        "BASIS"
      ],
      [
        "Subnetting über Oktettgrenzen",
        "Bei /19 oder /20 entscheidet das dritte Oktett.",
        "/19::255.255.224.0; Sprungweite 32 im dritten Oktett.|/20::255.255.240.0; Sprungweite 16 im dritten Oktett.|Beispiel /20::10.20.93.54 liegt in 10.20.80.0 bis 10.20.95.255.|Hostbereich::Bei 10.20.80.0/20 klassisch 10.20.80.1 bis 10.20.95.254.",
        "Bestimme Netz-ID und Broadcast von 172.16.47.19/19.",
        "Netz-ID 172.16.32.0; Broadcast 172.16.63.255.",
        "Nicht das vierte Oktett allein betrachten, wenn das Präfix im dritten endet.",
        "RECHNEN"
      ],
      [
        "Netze zusammenfassen",
        "Summarization fasst passende Netze zu einer Route zusammen.",
        "Voraussetzung::Gleiche Präfixbits und passend ausgerichtete, zusammenhängende Adressbereiche.|Beispiel::192.168.4.0/24 und 192.168.5.0/24 → 192.168.4.0/23.|Vorteil::Kleinere Routingtabellen und übersichtlichere Netzpläne.|Achtung::Eine zu breite Zusammenfassung kann fremde Netze einschließen.",
        "Welche Route fasst 10.0.8.0/24 bis 10.0.11.0/24 zusammen?",
        "10.0.8.0/22.",
        "Nur zusammenhängende und korrekt ausgerichtete Netze lassen sich verlustfrei aggregieren.",
        "PRAXIS"
      ]
    ],
    "questions": [
      [
        "Ein Standort benötigt 90 klassische Hostadressen. Welches kleinste IPv4-Präfix passt?",
        "/25: 128 Adressen, davon klassisch 126 nutzbar."
      ],
      [
        "Berechne Netz-ID und Broadcast von 192.168.18.177/26.",
        "Netz-ID 192.168.18.128; Broadcast 192.168.18.191."
      ],
      [
        "Nenne drei Informationen, die eine saubere Subnetz-Dokumentation enthalten sollte.",
        "Netz-ID mit Präfix, Hostbereich/Broadcast und Gateway beziehungsweise VLAN-Zuordnung."
      ],
      [
        "Warum erleichtert VLSM die IP-Adressplanung? Nenne zwei Vorteile.",
        "Weniger ungenutzte Adressen und passende Netzgrößen für verschiedene Abteilungen."
      ],
      [
        "Ein /20-Netz beginnt bei 10.4.64.0. Wie lautet sein Broadcast?",
        "10.4.79.255."
      ],
      [
        "Ein Client besitzt 169.254.17.20/16. Nenne zwei mögliche Ursachen und einen sinnvollen Test.",
        "DHCP nicht erreichbar oder DHCP-Konfiguration defekt; DHCP-Server/Lease und Netzverbindung prüfen."
      ],
      [
        "Nenne zwei Unterschiede zwischen /24 und /26.",
        "/24 hat 256 Adressen, Maske 255.255.255.0; /26 hat 64 Adressen, Maske 255.255.255.192."
      ],
      [
        "Warum sind Netzadresse und Broadcast im gewöhnlichen IPv4-LAN keine Hostadressen?",
        "Sie identifizieren das gesamte Subnetz beziehungsweise alle Ziele im Subnetz."
      ]
    ]
  },
  "netzwerk": {
    "sections": [
      [
        "Schleifen und Spanning Tree",
        "Redundante Switch-Verbindungen brauchen einen kontrollierten Pfad.",
        "Layer-2-Schleife::Kann Broadcast-Stürme und ständig wechselnde MAC-Tabellen verursachen.|STP/RSTP::Blockiert redundante Pfade logisch und öffnet sie bei Bedarf.|Vorteil::Redundante Verkabelung ohne aktive Schleife.|Praxis::Trunk, VLAN und Spanning Tree gemeinsam prüfen.",
        "Nenne zwei Folgen einer Layer-2-Schleife.",
        "Broadcast-Sturm und instabile MAC-Adress-Tabellen.",
        "Zwei Kabel zwischen Switches sind nicht automatisch ein schnellerer Uplink.",
        "PRAXIS"
      ],
      [
        "WLAN und Funkkanäle",
        "Funknetze teilen sich das Medium und reagieren auf Umgebung.",
        "2,4 GHz::Oft größere Reichweite, aber häufig stärker belegt.|5/6 GHz::Meist mehr Kanäle und höhere Raten, oft geringere Reichweite.|WPA2/WPA3::Schützen WLAN-Zugriff und Kommunikation, wenn korrekt konfiguriert.|Roaming::Client wechselt zwischen Access Points, idealerweise ohne lange Unterbrechung.",
        "Warum kann ein voller WLAN-Empfang trotzdem langsam sein?",
        "Störungen, Auslastung, viele Clients oder ungünstige Funkkanäle begrenzen den Durchsatz.",
        "WLAN-Balken messen nicht die verfügbare Datenrate.",
        "WISSEN"
      ],
      [
        "Verkabelung und Duplex",
        "Kabel und Ports entscheiden, was auf Layer 1 möglich ist.",
        "Kupfer::Twisted-Pair-Ethernet nutzt je nach Standard unterschiedliche Kategorien und Reichweiten.|LWL::Glasfaser ist unempfindlich gegen elektromagnetische Störungen und für lange Strecken geeignet.|Duplex::Full-Duplex sendet und empfängt gleichzeitig, Half-Duplex nicht.|Fehlerquelle::Beschädigte Adern, falsche Aushandlung und defekte Stecker verursachen Abbrüche.",
        "Nenne zwei Vorteile von Glasfaser gegenüber Kupfer.",
        "Größere mögliche Reichweite und Unempfindlichkeit gegen elektromagnetische Störungen.",
        "Die Kabelkategorie allein bestimmt nicht die Geschwindigkeit des gesamten Links.",
        "PRAXIS"
      ]
    ],
    "questions": [
      [
        "Nenne drei Vorteile von VLANs und eine Grenze ihrer Schutzwirkung.",
        "Segmentierung, kleinere Broadcast-Domänen und einfachere Verwaltung; keine vollständige Sicherheitsgrenze ohne ACL/Firewall."
      ],
      [
        "Ein Switch kennt die Ziel-MAC nicht. Was geschieht innerhalb des VLANs?",
        "Der Frame wird an die anderen geeigneten Ports geflutet."
      ],
      [
        "Welche zwei Prüfungen helfen bei einem Netzwerkport ohne Link?",
        "Kabel/Stecker prüfen und Gegenport samt Adapter/Link-LED kontrollieren."
      ],
      [
        "Vergleiche Access-Port und Trunk-Port in zwei Punkten.",
        "Access führt typischerweise ein VLAN ungetaggt, Trunk mehrere VLANs mit 802.1Q-Tags."
      ],
      [
        "Nenne drei Ursachen schlechter WLAN-Leistung trotz gutem Signal.",
        "Überbelegte Kanäle, Interferenzen und viele konkurrierende Clients."
      ],
      [
        "Ein PC kann einen anderen VLAN-Bereich nicht erreichen. Welche zwei Konfigurationen prüfst du?",
        "VLAN-Zuordnung/Trunk und Inter-VLAN-Routing bzw. ACL."
      ],
      [
        "Warum ist STP in einem Netz mit redundanten Switch-Verbindungen sinnvoll?",
        "Es verhindert aktive Layer-2-Schleifen und ermöglicht alternative Wege bei Ausfall."
      ],
      [
        "Was unterscheiden Broadcast-Domäne und Kollisionsdomäne?",
        "Broadcast erreicht Teilnehmer derselben Layer-2-Domäne; moderne Full-Duplex-Switchports haben praktisch keine klassischen Kollisionen."
      ]
    ]
  },
  "ipv6": {
    "sections": [
      [
        "Adressbereiche gezielt erkennen",
        "Ein Präfix verrät häufig die Rolle einer IPv6-Adresse.",
        "Global Unicast::Typischerweise 2000::/3, öffentlich routbar.|Link-Local::fe80::/10, nur auf einem Link gültig.|ULA::fc00::/7, in der Praxis lokal vergeben häufig fd00::/8.|Loopback::Die einzelne Adresse ::1/128.",
        "Warum kann fe80::1 ohne Interface-Angabe uneindeutig sein?",
        "Mehrere Netzadapter können dieselbe Link-Local-Adresse auf verschiedenen Links besitzen.",
        "fe80::/10 ist kein öffentlich routbarer Adressbereich.",
        "BASIS"
      ],
      [
        "SLAAC, RA und DHCPv6",
        "IPv6 kann Adressen und weitere Konfiguration auf mehreren Wegen erhalten.",
        "Router Advertisement::Router meldet Präfixe und Default-Router-Informationen über ICMPv6.|SLAAC::Host bildet eine Adresse aus beworbenem Präfix plus Interface Identifier.|DHCPv6::Kann zusätzliche Optionen und je nach Netz auch Adressen vergeben.|DNS::Kann über RA/RDNSS oder DHCPv6 mitgeteilt werden, abhängig von Geräten und Netz.",
        "Warum reicht DHCPv6 allein nicht immer für ein IPv6-Default-Gateway?",
        "Default-Router-Information kommt üblicherweise über Router Advertisements.",
        "IPv6 verwendet für Nachbarsuche NDP statt ARP.",
        "PRAXIS"
      ],
      [
        "Kürzen, Präfixe und Darstellung",
        "Korrekte Notation ist Teil der technischen Aussage.",
        "Regel 1::Führende Nullen je Hextett entfernen, nicht beliebige Nullen.|Regel 2::Eine zusammenhängende Null-Hextett-Folge einmal mit :: ersetzen.|Länge::Ausgeschrieben acht Hextetts zu je 16 Bit = 128 Bit.|/64::Typische Präfixlänge für SLAAC-LANs; das ist keine starre Regel für alle Netze.",
        "Ist 2001:db8::1:0::2 eine gültige IPv6-Schreibweise?",
        "Nein, der Doppel-Doppelpunkt darf nur einmal auftreten.",
        "Zwei :: in derselben Adresse machen die Anzahl ausgelassener Hextetts uneindeutig.",
        "RECHNEN"
      ]
    ],
    "questions": [
      [
        "Nenne drei typische IPv6-Adressarten und ihren Einsatz.",
        "Global Unicast für geroutete Netze, Link-Local für den lokalen Link, ULA für interne Netze."
      ],
      [
        "Ein Host hat nur fe80::/10. Welche zwei Gründe können das erklären?",
        "Keine gültige RA/SLAAC-Information und keine weitere statische/DHCPv6-Konfiguration."
      ],
      [
        "Welche zwei Aufgaben erledigt NDP in IPv6?",
        "Nachbarauflösung und Router-/Präfix-Erkennung."
      ],
      [
        "Kürze 2001:0db8:0000:0000:0000:0000:00ab:0001 korrekt.",
        "2001:db8::ab:1."
      ],
      [
        "Warum ist eine Link-Local-Adresse kein Ersatz für eine globale IPv6-Adresse?",
        "Sie ist nur auf dem lokalen Link gültig und wird nicht über Router hinweg weitergeleitet."
      ],
      [
        "Was bewirkt das Präfix /64 bei einer IPv6-Adresse?",
        "Die ersten 64 Bit kennzeichnen das Netzpräfix; die übrigen 64 Bit sind der Interface-Identifier."
      ],
      [
        "Nenne zwei Unterschiede zwischen IPv4-ARP und IPv6-NDP.",
        "NDP nutzt ICMPv6 statt ARP und ermöglicht zusätzlich Router-/Präfix-Erkennung."
      ],
      [
        "Warum muss ICMPv6 in einer IPv6-Firewall differenziert erlaubt werden?",
        "Essenzielle Funktionen wie NDP, Router Advertisements und Path-MTU benötigen passende ICMPv6-Typen."
      ]
    ]
  },
  "dienste": {
    "sections": [
      [
        "Mail-Protokolle im Zusammenhang",
        "Senden, Abrufen und Synchronisieren unterscheiden sich.",
        "SMTP::Port 25 Server-zu-Server; Submission typischerweise 587 mit STARTTLS oder 465 mit implizitem TLS.|IMAP::143, mit implizitem TLS 993; synchronisiert Ordner und Nachrichten.|POP3::110, mit implizitem TLS 995; einfaches Abrufen.|MX::DNS-Eintrag benennt Mailserver für eine Domain.",
        "Warum wird Port 587 für den Mailversand durch Clients genutzt?",
        "Er ist der übliche Message-Submission-Port mit Authentifizierung und STARTTLS.",
        "Portnummer sagt allein nicht, ob die Verbindung tatsächlich sicher ist.",
        "PRAXIS"
      ],
      [
        "DHCP- und DNS-Abläufe",
        "Zwei grundlegende Netzdienste arbeiten zusammen, sind aber verschieden.",
        "DHCPv4::DORA = Discover, Offer, Request, Acknowledge.|Ports::DHCPv4 nutzt UDP 67 (Server) und 68 (Client).|DNS::Fragt A/AAAA, MX, CNAME, TXT und weitere Records ab.|Cache::TTL im DNS steuert, wie lange Antworten gecacht werden können.",
        "Ein Client hat eine IP, aber keine funktionierende Namensauflösung. Welche zwei Checks sind sinnvoll?",
        "DNS-Serveradresse prüfen und mit nslookup/dig gezielt eine Abfrage durchführen.",
        "Ein funktionierender DHCP-Server garantiert keinen funktionierenden DNS-Server.",
        "WISSEN"
      ],
      [
        "TLS und Fehlersuche",
        "Verschlüsselung und Erreichbarkeit getrennt beurteilen.",
        "TLS::Schützt Transport vor Mitlesen und Änderungen und authentifiziert bei HTTPS den Server.|Zertifikat::Gültigkeitszeitraum, Vertrauenskette und Hostname müssen passen.|HTTP::Port 80 ist häufig Klartext und wird oft auf HTTPS umgeleitet.|Werkzeuge::nslookup/dig für DNS, curl für HTTP, ss/netstat für lauschende Ports.",
        "Ein Browser meldet Zertifikatsfehler. Nenne zwei mögliche Ursachen.",
        "Abgelaufenes Zertifikat oder Hostname passt nicht zum Zertifikat.",
        "Ein offener Port 443 garantiert keine korrekte TLS-Konfiguration.",
        "PRAXIS"
      ]
    ],
    "questions": [
      [
        "Nenne drei wichtige Dienste und ihre Standardports.",
        "Zum Beispiel DNS 53, HTTPS 443 und SSH 22 (Transportprotokolle beachten)."
      ],
      [
        "Ein Client kann IP-Adressen erreichen, aber keine Namen. Beschreibe drei Diagnoseschritte.",
        "DNS-Eintrag prüfen, DNS-Server erreichen, mit nslookup/dig konkrete Records abfragen."
      ],
      [
        "Vergleiche IMAP und POP3 in zwei Punkten.",
        "IMAP synchronisiert Mailbox und Ordner auf dem Server, POP3 lädt Nachrichten typischerweise herunter."
      ],
      [
        "Was bedeutet DHCP-DORA? Nenne die vier Schritte.",
        "Discover, Offer, Request, Acknowledge."
      ],
      [
        "Nenne zwei Unterschiede von TCP und UDP und je einen typischen Einsatz.",
        "TCP verbindet und sichert Reihenfolge etwa bei HTTPS; UDP hat geringeren Transportaufwand etwa bei DNS."
      ],
      [
        "Ein Nutzer meldet ein abgelaufenes HTTPS-Zertifikat. Was wird geprüft?",
        "Zertifikatsgültigkeit, Uhrzeit, Hostname und Zertifikatskette."
      ],
      [
        "Warum kann ein Dienst erreichbar sein, obwohl ein Ping fehlschlägt?",
        "ICMP-Echo kann gefiltert sein, obwohl der TCP-/UDP-Dienstport offen ist."
      ],
      [
        "Wofür benötigt ein Unternehmen einen DNS-MX-Eintrag?",
        "Zur Bekanntgabe der Mailserver für eingehende E-Mails einer Domain."
      ]
    ]
  },
  "sicherheit": {
    "sections": [
      [
        "ISB und Sicherheitsmanagement",
        "Informationssicherheit betrifft mehr als personenbezogene Daten.",
        "ISB::Informationssicherheitsbeauftragter berät und koordiniert Sicherheitsmanagement und Sicherheitskonzept.|Schutzobjekte::Systeme, Geschäftsgeheimnisse, Prozesse und Informationen aller Art.|ISMS::Regeln für Risiken, Maßnahmen, Verantwortlichkeiten und kontinuierliche Verbesserung.|Rollen::Geschäftsleitung trägt Gesamtverantwortung, ISB koordiniert und berichtet.",
        "Nenne zwei Aufgaben eines ISB.",
        "Sicherheitsrisiken und Maßnahmen koordinieren sowie die Leitung beraten und über den Stand berichten.",
        "Der ISB ist nicht automatisch der Datenschutzbeauftragte.",
        "PRAXIS"
      ],
      [
        "Risikoanalyse und Priorisierung",
        "Nicht jedes Risiko ist gleich wahrscheinlich oder gleich teuer.",
        "Risiko::Kombination aus Eintrittswahrscheinlichkeit und Auswirkung, häufig qualitativ bewertet.|Schutzbedarf::Vertraulichkeit, Integrität und Verfügbarkeit je Informationswert beurteilen.|Maßnahme::Risiko mindern, vermeiden, übertragen oder bewusst akzeptieren.|Kontrolle::Wirksamkeit nach Einführung der Maßnahme überprüfen.",
        "Ein Server ist hochkritisch, aber schlecht gesichert. Welche zwei Schritte sind sinnvoll?",
        "Schutzbedarf/Risiko bewerten und angemessene technische wie organisatorische Maßnahmen priorisieren.",
        "Viele Maßnahmen ohne Risikobezug sind noch kein wirksames Sicherheitskonzept.",
        "WISSEN"
      ],
      [
        "Backups, RPO und RTO",
        "Wiederherstellung muss im Notfall auch funktionieren.",
        "3-2-1::Drei Kopien, auf zwei Medientypen, eine Kopie getrennt/offsite – praxisorientierte Faustregel.|RPO::Maximal tolerierter Datenverlust als Zeitspanne, bestimmt Sicherungsintervall.|RTO::Zulässige Zeit bis zur Wiederaufnahme des Betriebs.|Restore-Test::Nur erfolgreich wiederhergestellte Daten sind ein verlässlicher Nachweis.",
        "RPO 4 Stunden und RTO 2 Stunden: Was bedeutet das?",
        "Maximal etwa 4 Stunden Datenverlust und Wiederanlauf innerhalb von 2 Stunden als Zielwerte.",
        "RAID und Snapshots ersetzen keine unabhängigen Backups.",
        "PRAXIS"
      ]
    ],
    "questions": [
      [
        "Nenne die drei klassischen Schutzziele und für jedes ein Beispiel.",
        "Vertraulichkeit: Rechtekonzept; Integrität: Hash/Signatur; Verfügbarkeit: Redundanz/Backup."
      ],
      [
        "Welche zwei Aufgaben gehören zu einem ISB?",
        "Risikobewertung koordinieren und Sicherheitsmaßnahmen mit der Leitung abstimmen."
      ],
      [
        "Vergleiche Hash, Verschlüsselung und digitale Signatur.",
        "Hash als Prüfsumme, Verschlüsselung für Vertraulichkeit, Signatur für Authentizität und Integrität."
      ],
      [
        "Nenne drei Vorteile einer Mehrfaktor-Authentisierung.",
        "Schutz trotz bekanntem Passwort, Hürde für Phishing-Angriffe und erschwerte Kontoübernahme (je nach MFA-Art)."
      ],
      [
        "Ein Backup ist vorhanden, aber die Rücksicherung scheitert. Welche zwei Konsequenzen ergeben sich?",
        "Wiederherstellbarkeit ist nicht gesichert; Restore-Tests und Backupprozess müssen verbessert werden."
      ],
      [
        "Unterscheide RPO und RTO an einem Praxisbeispiel.",
        "RPO 1 h erlaubt höchstens 1 h Datenverlust; RTO 4 h erlaubt 4 h Ausfallzeit."
      ],
      [
        "Warum ist das Least-Privilege-Prinzip wichtig? Nenne zwei Effekte.",
        "Reduziert Missbrauchsmöglichkeiten und begrenzt den Schaden kompromittierter Konten."
      ],
      [
        "Nenne drei organisatorische IT-Sicherheitsmaßnahmen.",
        "Schulung, Berechtigungsfreigaben mit Vier-Augen-Prinzip und Notfall-/Incident-Prozess."
      ]
    ]
  },
  "datenschutz": {
    "sections": [
      [
        "Datenschutzbeauftragter (DSB)",
        "Der DSB ist Kontroll- und Beratungsinstanz, nicht automatisch die IT-Leitung.",
        "Aufgaben nach Art. 39::Beraten, Datenschutzvorgaben überwachen, sensibilisieren, bei DSFA beraten und mit Behörden kooperieren.|Benennung::Art. 37 DSGVO; in Deutschland für nichtöffentliche Stellen zusätzlich § 38 BDSG.|20-Personen-Regel::Wenn in der Regel mindestens 20 Personen ständig personenbezogene Daten automatisiert verarbeiten, besteht eine Benennungspflicht nach § 38 BDSG.|Unabhängigkeit::Bei seinen DSGVO-Aufgaben keine Weisungen; Interessenkonflikte vermeiden; Leitung bleibt verantwortlich.",
        "Ein Unternehmen beschäftigt 23 Personen regelmäßig mit automatisierter personenbezogener Datenverarbeitung. Ist ein DSB zu benennen?",
        "Ja, grundsätzlich nach § 38 BDSG; zusätzlich können weitere Benennungstatbestände greifen.",
        "Die Pflicht hängt nicht nur von der Zahl aller Beschäftigten ab.",
        "RECHT"
      ],
      [
        "ISB und DSB unterscheiden",
        "Beide arbeiten zusammen, haben aber unterschiedliche Schutzaufträge.",
        "DSB::Schützt Rechte und Freiheiten natürlicher Personen bei der Verarbeitung ihrer Daten.|ISB::Steuert/koordiniert Schutz von Informationen und IT, auch wenn sie nicht personenbezogen sind.|Zusammenarbeit::Zum Beispiel bei Zugriffsrechten, Sicherheitsvorfällen und Datenschutz-Folgenabschätzungen.|Trennung::DSB berät und kontrolliert unabhängig; ISB organisiert Sicherheitsmaßnahmen im Managementsystem.",
        "Ein Angriff legt die Produktion lahm, ohne personenbezogene Daten zu betreffen. Wer ist primär für die Sicherheitskoordination zuständig?",
        "Die Informationssicherheitsorganisation bzw. der ISB; bei Personenbezug ist auch der DSB zu beteiligen.",
        "Datenschutz und Informationssicherheit sind überlappend, aber nicht identisch.",
        "PRAXIS"
      ],
      [
        "Dokumentationspflichten",
        "Nachweisen können ist Teil von Compliance.",
        "Verzeichnis Art. 30::Verarbeitungstätigkeiten mit Zwecken, Kategorien, Empfängern und Löschfristen dokumentieren, soweit einschlägig.|Informationspflichten::Art. 13/14: unter anderem Zweck, Rechtsgrundlage, Speicherdauer und Rechte transparent mitteilen.|Aufbewahrung::Fristen je Datentyp und Pflicht bestimmen; nach Frist löschen oder anonymisieren.|Rechenschaft::Art. 5 Abs. 2 verlangt nachweisbare Einhaltung der Grundsätze.",
        "Nenne drei Angaben, die eine Datenschutzerklärung bei Datenerhebung typischerweise enthalten muss.",
        "Verarbeitungszweck, Rechtsgrundlage und Informationen über Speicherdauer beziehungsweise Kriterien.",
        "Ein Datenschutztext macht eine rechtswidrige Verarbeitung nicht rechtmäßig.",
        "RECHT"
      ],
      [
        "Datenschutz-Folgenabschätzung",
        "Hohes Risiko verlangt eine systematische Vorabprüfung.",
        "DSFA Art. 35::Bei voraussichtlich hohem Risiko für Rechte und Freiheiten erforderlich.|Beispiele::Umfangreiche Verarbeitung sensibler Daten oder systematische Überwachung, je nach Kontext.|Prüfung::Notwendigkeit und Verhältnismäßigkeit, Risiken und Gegenmaßnahmen untersuchen.|DSB::Ist benannt, wird sein Rat eingeholt; Verantwortung bleibt bei der verantwortlichen Stelle.",
        "Warum reicht bei einem Hochrisikoprojekt eine normale Einwilligung allein nicht aus?",
        "Rechtsgrundlage und DSFA sind unterschiedliche Anforderungen; die Risikoprüfung bleibt erforderlich.",
        "Eine DSFA ist keine einmalige Checkbox ohne Aktualisierung.",
        "WISSEN"
      ],
      [
        "Datenschutzvorfall: Entscheidung",
        "Die Risikoentscheidung bestimmt den Meldeweg.",
        "Erkennen::Unberechtigte Offenlegung, Verlust und Ausfall personenbezogener Daten können Verletzungen darstellen.|Art. 33::Wenn voraussichtlich ein Risiko für Betroffene besteht, unverzüglich und möglichst binnen 72 Stunden an die Aufsicht melden.|Art. 34::Bei voraussichtlich hohem Risiko Betroffene in der Regel unverzüglich informieren.|Nachbereitung::Jeden Vorfall dokumentieren, Folgen begrenzen und Ursachen beheben.",
        "Ein unverschlüsseltes Notebook mit Kundendaten geht verloren. Welche drei Sofortmaßnahmen sind wichtig?",
        "Vorfall dokumentieren/eingrenzen, Risiken prüfen und ggf. Behörden-/Betroffenenmeldung veranlassen.",
        "72 Stunden sind die Meldefrist der Aufsicht, keine pauschale Frist für die Betroffeneninformation.",
        "PRAXIS"
      ]
    ],
    "questions": [
      [
        "Nenne drei Aufgaben eines Datenschutzbeauftragten nach Art. 39 DSGVO.",
        "Datenschutzberatung, Überwachung der Einhaltung und Unterstützung/Beratung bei einer DSFA."
      ],
      [
        "Worin unterscheiden sich DSB und ISB hinsichtlich ihrer Schutzziele?",
        "DSB: Rechte natürlicher Personen und Datenschutzkonformität; ISB: Schutz von Informationen/IT insgesamt."
      ],
      [
        "Eine Firma hat 23 Personen, die ständig automatisiert Personendaten verarbeiten. Welche gesetzliche Pflicht ergibt sich regelmäßig?",
        "Benennung eines DSB nach § 38 BDSG, vorbehaltlich der konkreten gesetzlichen Voraussetzungen."
      ],
      [
        "Nenne drei Datenschutzgrundsätze aus Art. 5 DSGVO und erkläre sie knapp.",
        "Zweckbindung: nur für festgelegte Zwecke; Datenminimierung: nur Notwendiges; Speicherbegrenzung: nicht länger als erforderlich."
      ],
      [
        "Ein Mitarbeitender verschickt vertrauliche Kundendaten an die falsche Adresse. Nenne drei Schritte.",
        "Vorfall eindämmen, Risiko bewerten/dokumentieren und ggf. nach Art. 33/34 melden."
      ],
      [
        "Unterscheide Verantwortlichen und Auftragsverarbeiter an einem Hosting-Beispiel.",
        "Verantwortlicher bestimmt Zwecke und Mittel; Hostinganbieter kann weisungsgebunden Auftragsverarbeiter sein."
      ],
      [
        "Wann ist eine DSFA erforderlich, und welche zwei Inhalte müssen bewertet werden?",
        "Bei voraussichtlich hohem Risiko; Erforderlichkeit/Verhältnismäßigkeit sowie Risiken und Abhilfemaßnahmen."
      ],
      [
        "Nenne drei geeignete TOM für eine Kundendatenbank.",
        "Rollenbasierte Zugriffe, Verschlüsselung und dokumentierte Backup-/Wiederherstellungsprozesse."
      ]
    ]
  },
  "rechnung": {
    "sections": [
      [
        "Deckungsbeitrag und Break-even",
        "Ab wann deckt ein Produkt die Fixkosten?",
        "Deckungsbeitrag je Stück::Nettoverkaufspreis minus variable Stückkosten.|Break-even-Menge::Fixkosten / Deckungsbeitrag je Stück (bei positivem Deckungsbeitrag).|Beispiel::10.000 € Fixkosten, 50 € Verkauf, 30 € variabel → 500 Stück.|Gewinn::(Absatz × Deckungsbeitrag) minus Fixkosten.",
        "Ein Produkt kostet variabel 45 €, Verkauf 75 €, Fixkosten 9.000 €. Wie viele Stück für Break-even?",
        "9.000 / (75 − 45) = 300 Stück.",
        "Ist der Deckungsbeitrag null oder negativ, funktioniert die Division nicht sinnvoll.",
        "RECHNEN"
      ],
      [
        "Wirtschaftlichkeit und ROI",
        "Rechenergebnisse müssen im richtigen Zusammenhang stehen.",
        "Wirtschaftlichkeit::Ertrag / Aufwand; Wert über 1 bedeutet in dieser Definition wirtschaftlich.|ROI::Gewinn im Verhältnis zum eingesetzten Kapital, als Prozentzahl.|Amortisation::Zeit bis sich eine Investition durch Rückflüsse deckt, vereinfacht Investition / jährlicher Rückfluss.|Achtung::Cashflow, Gewinn und Kostenersparnis sind nicht dasselbe.",
        "Eine Maßnahme kostet 6.000 € und spart jährlich 2.000 €. Wie lange ist die einfache Amortisationsdauer?",
        "3 Jahre ohne Zins, Folgekosten oder Schwankungen.",
        "Prozentbasis und Betrachtungszeitraum immer angeben.",
        "RECHNEN"
      ],
      [
        "Strom- und Betriebskosten",
        "Technischer Verbrauch lässt sich in Geld umrechnen.",
        "Leistung::Watt (W), Energie::Kilowattstunden (kWh).|Formel::kWh = Leistung in kW × Betriebsstunden.|Serverbeispiel::150 W × 24 h × 365 = 1.314 kWh/Jahr.|TCO::Strom, Kühlung, Administration, Wartung und Lizenzen berücksichtigen.",
        "Was kostet ein 150-W-Server bei 0,30 €/kWh pro Jahr bei Dauerbetrieb?",
        "1.314 kWh × 0,30 € = 394,20 € (nur Strom).",
        "Watt mit Kilowattstunden nicht verwechseln.",
        "RECHNEN"
      ]
    ],
    "questions": [
      [
        "Nenne drei Kostenarten für die TCO eines Servers.",
        "Anschaffung, Strom/Kühlung, Lizenzen und Wartung (drei genügen)."
      ],
      [
        "Ein Produkt kostet 40 € variabel, der Preis beträgt 65 €. Wie hoch ist der Deckungsbeitrag?",
        "25 € pro Stück."
      ],
      [
        "Fixkosten 15.000 €, Deckungsbeitrag 30 € je Stück. Break-even-Menge?",
        "500 Stück."
      ],
      [
        "Warum sollte eine Nutzwertanalyse mehrere Kriterien enthalten? Nenne zwei Gründe.",
        "Preis ist nicht alles und gewichtete Qualitäts-/Risikokriterien ermöglichen nachvollziehbare Entscheidungen."
      ],
      [
        "Ein 200-W-PC läuft 8 Stunden täglich an 220 Tagen. Berechne den Energiebedarf.",
        "0,2 × 8 × 220 = 352 kWh."
      ],
      [
        "Was ist der Unterschied zwischen Rabatt und Skonto?",
        "Rabatt mindert den Preis nach Preiskondition; Skonto wird bei fristgerechter Zahlung abgezogen."
      ],
      [
        "Nenne drei typische Risiken einer Investitionsrechnung.",
        "Unterschätzte Folgekosten, falsche Nutzungsdauer und unrealistische Einsparungsannahmen."
      ],
      [
        "Ein Server kostet 5.000 €, spart 1.250 € pro Jahr. Berechne die einfache Amortisationsdauer.",
        "5.000 / 1.250 = 4 Jahre ohne Zins/Folgekosten."
      ]
    ]
  },
  "csharp": {
    "sections": [
      [
        "Typen, Null und Konvertierung",
        "Typen und Initialisierung entscheiden, ob Code überhaupt übersetzt.",
        "int::Ganzzahl; double::Gleitkommazahl; bool::true/false; char::ein UTF-16-Code-Unit.|string::Text, z. B. \"Hallo\"; char nutzt einfache Hochkommas wie 'A'.|var::Compiler leitet den Typ aus dem Initialisierer ab, nicht dynamisch bei jeder Zuweisung.|Parsing::int.TryParse liefert Erfolg als bool, ohne bei ungültiger Eingabe zu werfen.",
        "Warum ist var zahl = 3; danach zahl = \"Text\"; ungültig?",
        "zahl wurde als int erkannt und kann keinen string aufnehmen.",
        "var ist keine Typfreiheit wie dynamic.",
        "BASIS"
      ],
      [
        "Kontrollfluss und Schleifen",
        "Bedingungen steuern Pfade, Schleifen wiederholen Arbeit.",
        "if/else::Führt einen Zweig abhängig von einer bool-Bedingung aus.|for::Geeignet bei bekannter Anzahl; foreach::durchläuft eine Sammlung.|while::Prüft Bedingung vor dem Durchlauf; do-while danach.|Logik::&& steht für UND und || für ODER mit Kurzschlussauswertung.",
        "Wann ist foreach oft sinnvoller als for?",
        "Wenn eine Sammlung elementweise gelesen werden soll und kein Index benötigt wird.",
        "Ein Semikolon nach if kann die Bedingung wirkungslos machen.",
        "PRAXIS"
      ],
      [
        "Methoden und Fehlerbehandlung",
        "Wiederverwendbarer Code braucht klare Ein- und Ausgaben.",
        "Signatur::Rückgabetyp, Methodenname und Parameterliste.|return::Gibt Wert zurück oder beendet bei void eine Methode.|Scope::Lokale Variablen gelten im vorgesehenen Block.|try/catch::Fängt erwartbare Ausnahmen ab, ersetzt aber keine Eingabeprüfung.",
        "Schreibe die Signatur einer Methode, die zwei int addiert und int zurückgibt.",
        "static int Addiere(int a, int b) { return a + b; }",
        "Eine Methode mit int-Rückgabewert muss auf allen erreichbaren Pfaden zurückgeben.",
        "WISSEN"
      ]
    ],
    "questions": [
      [
        "Nenne drei Unterschiede zwischen int, double und bool.",
        "int für Ganzzahlen, double für Fließkommawerte und bool für wahr/falsch."
      ],
      [
        "Welche Ausgabe erzeugt int x = 5; if (x > 3) Console.WriteLine(\"OK\");?",
        "OK."
      ],
      [
        "Wann verwendet man TryParse statt Parse? Nenne zwei Gründe.",
        "Ungültige Benutzereingaben werden ohne Exception abgefangen und Erfolg ist direkt prüfbar."
      ],
      [
        "Wie schreibt man eine Bedingung, die x größer 0 und kleiner 10 prüft?",
        "x > 0 && x < 10."
      ],
      [
        "Nenne zwei Unterschiede zwischen for und while.",
        "for bündelt typischerweise Startwert/Prüfung/Änderung; while prüft nur eine Bedingung vor jedem Durchlauf."
      ],
      [
        "Was liefert eine Methode mit Rückgabetyp bool üblicherweise?",
        "true oder false."
      ],
      [
        "Was passiert bei Division zweier int in C# wie 7 / 2?",
        "Ganzzahldivision ergibt 3; für 3,5 muss mindestens ein Operand passend als Gleitkommawert vorliegen."
      ],
      [
        "Warum helfen Methoden bei größeren Projekten? Nenne drei Vorteile.",
        "Wiederverwendbarkeit, bessere Lesbarkeit und gezielteres Testen."
      ]
    ]
  },
  "mix": {
    "sections": [
      [
        "RAID-Level vergleichen",
        "Redundanz kostet nutzbare Kapazität.",
        "RAID 0::Striping ohne Ausfallschutz, n × Kapazität.|RAID 1::Spiegelung, gleiche Daten auf mindestens zwei Laufwerken.|RAID 5::Verteilte Parität, mindestens drei Laufwerke; nutzbar grob (n−1) × kleinste Kapazität.|RAID 6::Zwei Paritäten, mindestens vier Laufwerke; nutzbar grob (n−2) × kleinste Kapazität.",
        "Vier SSDs mit je 2 TB in RAID 5: ungefähr wie viel nutzbare Kapazität?",
        "(4−1) × 2 TB = 6 TB, ohne Dateisystem-Overhead.",
        "RAID schützt nicht vor Löschung, Diebstahl oder Ransomware.",
        "PRAXIS"
      ],
      [
        "Active Directory und Gruppenrichtlinien",
        "Identitäten und Einstellungen zentral verwalten.",
        "AD DS::Domänendienst für Benutzer, Computer, Gruppen und Authentifizierung.|OU::Organisationseinheit zur Strukturierung und Verknüpfung von GPOs.|GPO::Gruppenrichtlinie für systemweite und benutzerbezogene Einstellungen.|Praxis::Zielgruppe und Vererbung prüfen, bevor eine Richtlinie breit ausgerollt wird.",
        "Nenne zwei Beispiele, was eine GPO zentral konfigurieren kann.",
        "Passwortrichtlinien und Desktop-/Sicherheitseinstellungen.",
        "Eine GPO wirkt nur im passenden Anwendungsbereich und bei geeigneten Berechtigungen.",
        "WISSEN"
      ],
      [
        "SQL und Schlüssel",
        "Relationale Tabellen werden mit Schlüsseln verbunden.",
        "PRIMARY KEY::Eindeutige Identifikation eines Datensatzes.|FOREIGN KEY::Verweis auf einen Schlüssel einer anderen Tabelle.|INNER JOIN::Liefert passende Zeilen aus beiden Tabellen anhand einer Bedingung.|WHERE::Filtert Zeilen, ORDER BY sortiert das Ergebnis.",
        "Welche SQL-Technik verbindet passende Datensätze aus Kunden und Bestellungen?",
        "Ein JOIN über die passenden Schlüssel, zum Beispiel INNER JOIN.",
        "JOIN ohne ON-Bedingung kann sehr viele Kombinationen liefern.",
        "PRAXIS"
      ]
    ],
    "questions": [
      [
        "Nenne drei Unterschiede von RAID 0, RAID 1 und RAID 5.",
        "RAID 0 ohne Redundanz, RAID 1 Spiegelung, RAID 5 Paritätsverteilung mit mindestens drei Laufwerken."
      ],
      [
        "Was bedeutet Typ-1- gegenüber Typ-2-Hypervisor?",
        "Typ 1 läuft direkt auf Hardware, Typ 2 auf einem Host-Betriebssystem."
      ],
      [
        "Eine GPO soll nur bestimmte Computer erreichen. Nenne zwei Einflussgrößen.",
        "Verknüpfte OU/Domänenebene und Sicherheitsfilterung/Vererbungsregeln."
      ],
      [
        "Warum ist ein Snapshot kein vollwertiges Backup? Nenne zwei Gründe.",
        "Er hängt häufig am gleichen Speicher und ersetzt keine getrennte Wiederherstellungskopie."
      ],
      [
        "Ein RAID 5 besteht aus fünf gleich großen 1-TB-Laufwerken. Berechne die rohe Nutzkapazität.",
        "(5−1) × 1 TB = 4 TB, ohne Dateisystem-Overhead."
      ],
      [
        "Nenne drei typische Elemente eines guten Pflichtenhefts.",
        "Technische Umsetzung, überprüfbare Anforderungen und Abnahmekriterien."
      ],
      [
        "Warum braucht eine Datenbank einen Primärschlüssel?",
        "Damit einzelne Datensätze eindeutig identifizierbar und verknüpfbar sind."
      ],
      [
        "Nenne zwei Vorteile der Virtualisierung im Unterrichts- oder Testbetrieb.",
        "Isolation und einfache Erstellung/Reproduktion verschiedener Umgebungen."
      ]
    ]
  }
};
