/* 32 ergänzende, unabhängige Prüfungsfragen je Themenblatt.
   Zusammen mit acht vorhandenen Abschnittsfragen: exakt 40 pro Thema.
   Eigenständige Übungsaufgaben, keine echten Prüfungsaufgaben. */
globalThis.DTP_CHEAT_EXTRAS={
zahlen: \`
Wie viele Bit sind 5 Byte?¦40 Bit.
Wieviele Byte enthalten 2.048 Bit?¦256 Byte.
Wieviele Kilobyte sind 3.000 Byte (dezimal)?¦3 kB.
Wie viele KiB sind 2.048 Byte?¦2 KiB.
Wandel 10110101₂ in Dezimal um.¦128 + 32 + 16 + 4 + 1 = 181.
Wandel 01101110₂ in Dezimal um.¦64 + 32 + 8 + 4 + 2 = 110.
Wandle 42 dezimal in Binär um.¦101010₂.
Wandle 255 dezimal in Binär um.¦11111111₂.
Wandle 64 dezimal in Binär um.¦1000000₂.
Wie viele verschiedene Werte kann ein Byte ohne Vorzeichen darstellen?¦256 Werte von 0 bis 255.
Was bedeutet das höchstwertige Bit in 10000000₂?¦Es hat den Stellenwert 128.
Was entspricht der Hex-Ziffer B dezimal?¦11.
Wandle 7C₁₆ in Dezimal um.¦7 × 16 + 12 = 124.
Wandle 255 dezimal in Hexadezimal um.¦FF₁₆.
Wandle 1010 1101₂ in Hex um.¦AD₁₆.
Wie viele Bit repräsentieren drei Hex-Ziffern?¦12 Bit.
Warum sind MAC-Adressen oft hexadezimal geschrieben?¦Hex kürzt Binärdarstellungen: eine Hex-Ziffer entspricht vier Bit.
Wie viele Byte hat 1 KiB?¦1.024 Byte.
Wie viele Byte hat 1 MB (SI)?¦1.000.000 Byte.
Welche Zahl ist größer: 1 MiB oder 1 MB?¦1 MiB = 1.048.576 Byte und ist größer.
Wie viel Mbit entsprechen 25 MB (dezimal)?¦200 Mbit.
Wie lange dauert die ideale Übertragung von 50 MB bei 20 Mbit/s?¦50 × 8 / 20 = 20 Sekunden.
Wie viele MB/s entsprechen 80 Mbit/s ideal?¦10 MB/s.
Warum dauert eine echte Übertragung länger als Datenmenge / Leitungsgeschwindigkeit?¦Durch Protokolloverhead, Wartezeiten, Retransmits und Auslastung.
Welche Größenordnung steht hinter Gbit/s?¦Eine Milliarde Bit pro Sekunde.
Was ist 11111111₂ bei vorzeichenbehaftetem 8-Bit-Zweierkomplement?¦−1.
Welcher Wertebereich gilt für einen signed 8-Bit-Wert?¦−128 bis +127.
Wie stellt man −1 im 8-Bit-Zweierkomplement dar?¦11111111₂.
Warum reicht ASCII nicht für alle Weltsprachen?¦ASCII hat nur 128 Zeichenpositionen.
Wie viele Byte benötigt ein ASCII-Buchstabe in UTF-8?¦Ein Byte.
Wie viel UTF-8-Speicher braucht ein Unicode-Codepunkt maximal?¦Bis zu vier Byte.
Ist ein Emoji in UTF-8 immer genau ein Zeichen und vier Byte?¦Nein. Ein sichtbares Emoji kann aus mehreren Codepunkten bestehen.
\`.trim(),
osi: \`
Welche OSI-Schicht überträgt rohe Bits?¦Schicht 1: Bitübertragung.
Welche OSI-Schicht verarbeitet Ethernet-Frames?¦Schicht 2: Sicherung.
Welche Schicht ist für IP-Routing zuständig?¦Schicht 3: Vermittlung.
Auf welcher Schicht ordnet man TCP zu?¦Schicht 4: Transport.
Welche Schichten bündelt TCP/IP in der Anwendungsschicht?¦Grob die OSI-Schichten 5, 6 und 7.
Was bedeutet Kapselung?¦Schichten ergänzen Nutzdaten um eigene Header und ggf. Trailer.
Welches Gerät leitet normalerweise Frames anhand von MAC-Adressen weiter?¦Ein Layer-2-Switch.
Welches Gerät leitet IP-Pakete zwischen Netzen weiter?¦Ein Router.
Was ist die PDU auf OSI-Schicht 2?¦Ein Frame.
Was ist die PDU auf OSI-Schicht 3?¦Ein Paket.
Welche PDU verwendet TCP auf Schicht 4?¦Ein Segment.
Warum steht eine Ziel-MAC nicht für einen Internet-Endpunkt?¦Sie gilt auf dem jeweiligen lokalen Übertragungsabschnitt.
Auf welcher Schicht befinden sich Portnummern?¦Auf der Transportschicht, Schicht 4.
Nenne zwei Aufgaben der Transportschicht.¦Endpunktadressierung über Ports und je nach Protokoll Transportsteuerung.
Was ist ein Three-Way-Handshake?¦Der TCP-Aufbau mit SYN, SYN-ACK, ACK.
Wofür steht ACK bei TCP?¦Eine Bestätigung von empfangenen Daten bzw. Verbindungszuständen.
Was ist ein Vorteil von UDP bei Echtzeitdaten?¦Geringer Overhead ohne transportseitige Neuübertragung.
Welche OSI-Schicht ist zuerst zu prüfen, wenn die Link-LED aus ist?¦Schicht 1: Kabel, Port oder Signal.
Ein Host hat die falsche Subnetzmaske. Welche Schicht ist betroffen?¦Schicht 3, die IP-Konfiguration.
Ein HTTPS-Dienst lauscht nicht auf 443. Welche Schichten prüfst du besonders?¦Transport und Anwendung sowie Firewall.
Wird bei jedem Router-Hop die Ziel-IP verändert?¦Normalerweise nein; der Layer-2-Frame wird neu gekapselt.
Was passiert mit Quell- und Ziel-MAC beim Routing?¦Sie werden für das neue lokale Segment ersetzt.
Wo befinden sich Ethernet-FCS-Prüfinformationen?¦Im Trailer des Ethernet-Frames.
Was ist die Aufgabe von ICMP?¦Diagnose- und Kontrollmeldungen für IP.
Warum ist ARP kein Transportprotokoll?¦Es löst lokale IPv4-Zuordnungen zu MAC-Adressen auf.
Welche Schicht behandelt eine IP-Adresse im OSI-Modell?¦Schicht 3.
Nenne ein Protokoll auf der Anwendungsebene.¦Zum Beispiel HTTP, DNS oder SMTP.
Warum ist das OSI-Modell hilfreich bei Fehlern?¦Es strukturiert die Suche vom physischen Link bis zur Anwendung.
Auf welcher Schicht ordnet man VLAN-Tags bei Ethernet ein?¦Schicht 2.
Wodurch unterscheiden sich TCP und UDP bei der Zustellung?¦TCP bietet geordneten, zuverlässigen Bytestrom; UDP keine Liefergarantie.
Welches Konzept teilt im TCP/IP-Modell die Aufgaben der unteren OSI-Schichten auf?¦Die Netzzugangsschicht.
Warum ist die Aussage „HTTPS arbeitet nur auf OSI-Schicht 7“ ungenau?¦HTTPS nutzt HTTP, TLS und den darunterliegenden Transport.
\`.trim(),
subnet: \`
Wie viele IPv4-Bits bestehen insgesamt?¦32 Bit.
Was bedeutet /25 bei IPv4?¦25 Netzbits und 7 Hostbits.
Welche Maske entspricht /27?¦255.255.255.224.
Welche Maske entspricht /29?¦255.255.255.248.
Wie viele Adressen enthält ein /26-Netz?¦64.
Wie viele klassische Hostadressen passen in /26?¦62.
Wie viele klassische Hostadressen passen in /30?¦2.
Was ist die Sprungweite bei /28 im letzten Oktett?¦16.
Was ist die Sprungweite bei /26 im letzten Oktett?¦64.
Zu welchem /28-Netz gehört 192.168.2.31?¦192.168.2.16/28; .31 ist die Broadcastadresse.
Wie lautet der Broadcast zu 192.168.5.128/26?¦192.168.5.191.
Was ist der erste Host in 10.1.2.64/27?¦10.1.2.65.
Was ist der letzte Host in 10.1.2.64/27?¦10.1.2.94.
Welche Netzadresse hat 172.16.5.145/28?¦172.16.5.144/28.
Welche Netzadresse hat 192.168.10.207/27?¦192.168.10.192/27.
Welche Netzadresse hat 10.20.30.200/26?¦10.20.30.192/26.
Welches kleinste klassische Subnetz fasst 20 Hosts?¦/27 mit 30 nutzbaren Hosts.
Welches kleinste klassische Subnetz fasst 50 Hosts?¦/26 mit 62 nutzbaren Hosts.
Welches kleinste klassische Subnetz fasst 100 Hosts?¦/25 mit 126 nutzbaren Hosts.
Wie viele /26-Netze passen in ein /24?¦Vier.
Wie viele /28-Netze passen in ein /24?¦16.
Was ist eine Netzadresse?¦Die Adresse mit auf null gesetzten Hostbits.
Was ist eine IPv4-Broadcastadresse im üblichen Subnetz?¦Die Adresse mit auf eins gesetzten Hostbits.
Warum muss das Gateway innerhalb des Hostbereichs liegen?¦Damit Clients es im lokalen Subnetz direkt erreichen können, sofern keine Sonderkonfiguration besteht.
Was heißt VLSM?¦Variable Length Subnet Mask: unterschiedliche Präfixlängen je Netz.
Warum bei VLSM große Teilnetze zuerst planen?¦Das verhindert unnötige Fragmentierung des Adressraums.
Wie bestimmst du die Netzadresse per Bitoperation?¦IP-Adresse AND Subnetzmaske.
Was ist das Ergebnis der AND-Verknüpfung mit einem Maskenbit 0?¦0, unabhängig vom IP-Bit.
Ein /24 hat welche Maskenbits im letzten Oktett?¦00000000₂.
Wie viele Hostbits hat /20?¦12.
Wie viele Adressen enthält /20?¦2¹² = 4096.
Welche Sonderregel gilt für /31 auf Punkt-zu-Punkt-Links?¦Beide Adressen können als Endpunkte genutzt werden.
\`.trim(),
netzwerk: \`
Was speichert eine MAC-Tabelle im Switch?¦MAC-Adressen und die zugehörigen Switchports je VLAN.
Wie lernt ein Switch MAC-Adressen?¦Aus der Quell-MAC empfangener Frames.
Was macht ein Switch mit unbekanntem Unicast-Ziel?¦Er flutet den Frame im betreffenden VLAN.
Wozu dient ein Default Gateway?¦Es ist der nächste Router für Ziele ohne spezifischere Route.
Was bedeutet längstes Präfix beim Routing?¦Die passendste, spezifischste Route hat Vorrang.
Was ist der Unterschied zwischen LAN und WAN?¦LAN ist ein lokales Netz, WAN verbindet entfernte Standorte/Netze.
Wofür steht WLAN?¦Wireless Local Area Network.
Warum trennt ein VLAN Broadcast-Domänen?¦Switches behandeln VLANs als separate Layer-2-Netze.
Was ist ein Access-Port?¦Ein Switchport, der üblicherweise ein ungetaggtes VLAN für Endgeräte bereitstellt.
Wozu dient IEEE 802.1Q?¦Zur Markierung von VLANs in Ethernet-Frames.
Kann VLAN 20 ohne Routing direkt mit VLAN 30 kommunizieren?¦Nein, zwischen den VLAN-IP-Netzen ist Routing erforderlich.
Wozu dient ARP bei IPv4?¦Es ermittelt die lokale MAC-Adresse zu einer IPv4-Adresse.
Welche Adresse sucht ARP für entfernte Ziele?¦Die MAC des nächsten Routers, nicht die des entfernten Hosts.
Nenne einen privaten IPv4-Adressbereich.¦10.0.0.0/8 oder 172.16.0.0/12 oder 192.168.0.0/16.
Was unterscheidet PAT von reinem NAT?¦PAT bezieht auch Portnummern in die Zuordnung ein.
Verschlüsselt NAT den Datenverkehr?¦Nein.
Was ist der Vorteil der Sterntopologie?¦Ein Kabelbruch trifft normalerweise nur einen Teilnehmer.
Welcher Nachteil entsteht beim zentralen Switch einer Sterntopologie?¦Er kann zum Single Point of Failure werden.
Was bedeutet Full Duplex?¦Gleichzeitiges Senden und Empfangen.
Warum gibt es bei geswitchtem Full-Duplex-Ethernet keine Ethernet-Kollisionen?¦Die Punkt-zu-Punkt-Verbindung verwendet kein CSMA/CD.
Welche maximale Länge ist für einen üblichen Kupfer-Ethernet-Kanal oft vorgesehen?¦100 Meter, abhängig vom Standard.
Wofür steht PoE?¦Power over Ethernet, elektrische Versorgung über Netzwerkkabel.
Welche Vorteile hat Glasfaser gegenüber Kupfer?¦Hohe Reichweite, elektrische Trennung und Unempfindlichkeit gegen EMV.
Was ist der Unterschied zwischen Singlemode und Multimode?¦Singlemode für große Entfernungen, Multimode meist für kürzere.
Was beeinflusst die WLAN-Datenrate?¦Abstand, Störung, Kanalbreite, Standard, Endgeräte und Netzlast.
Warum kann 2,4 GHz stärker überlastet sein als 5 GHz?¦Weniger nicht überlappende Kanäle und viele Störquellen.
Welches WLAN-Verfahren gilt als veraltet und unsicher?¦WEP.
Was ist ein SSID?¦Der Name eines WLAN-Netzes.
Wozu wird WPA3 verwendet?¦Zur Absicherung von WLAN-Verbindungen.
Wie prüfst du zuerst einen ausgefallenen LAN-Anschluss?¦Kabel/Link-LED, Port, Adapter und IP-Konfiguration prüfen.
Wofür steht EMV?¦Elektromagnetische Verträglichkeit.
Worin liegt der Unterschied zwischen physischer und logischer Topologie?¦Physisch ist Verkabelung; logisch ist Kommunikationsstruktur.
\`.trim()
,
ipv6: \`
Wie lang ist eine IPv6-Adresse?¦128 Bit.
Aus wie vielen Gruppen besteht eine ausgeschriebene IPv6-Adresse?¦Acht Gruppen.
Wie viele Hex-Ziffern hat eine vollständig ausgeschriebene IPv6-Adresse?¦32 Hex-Ziffern.
Wie viele Bit umfasst eine IPv6-Gruppe?¦16 Bit.
Wie viele Hostbits bleiben bei einem /64-Präfix?¦64 Bit.
Was ist die Loopbackadresse von IPv6?¦::1.
Was ist die nicht spezifizierte IPv6-Adresse?¦::.
Welche IPv6-Adressfamilie beginnt bei ff00::/8?¦Multicast.
Welche Adressen zählen zu Link-Local?¦fe80::/10.
Ist fe80::1 als Standardgateway möglich?¦Ja, Router nutzen oft Link-Local-Adressen als Next Hop.
Was ist die Aufgabe einer Zone-ID wie %3?¦Sie wählt die lokale Schnittstelle für eine Link-Local-Adresse.
Wozu dient SLAAC?¦Ein Host erzeugt eigenständig Adressen aus per Router angekündigten Präfixen.
Welche Nachrichten transportieren Router Advertisements?¦ICMPv6-Nachrichten.
Wird der IPv6-Default-Router normalerweise durch DHCPv6 verteilt?¦Nein, üblicherweise durch Router Advertisements.
Wofür steht DAD?¦Duplicate Address Detection; prüft die Einmaligkeit einer Adresse am Link.
Welche Technik ersetzt ARP in IPv6?¦Neighbor Discovery mit ICMPv6.
Was ist Neighbor Solicitation?¦Eine ICMPv6-Anfrage, etwa zur Ermittlung eines Nachbarn.
Was ist Neighbor Advertisement?¦Eine ICMPv6-Antwort mit Informationen über Nachbarn.
Worin unterscheiden sich Global Unicast und ULA?¦Global Unicast ist für globales Routing vorgesehen; ULA für interne Netze.
Wie lautet das Präfix für Unique Local Addresses?¦fc00::/7.
Welche Präfixlänge hat ein übliches IPv6-LAN?¦/64.
Wie viele /64-Subnetze stecken in /56?¦2⁸ = 256.
Wie viele /64-Netze stecken in /48?¦2¹⁶ = 65.536.
Kürze 2001:0db8:0000:0000:0000:0000:0000:abcd.¦2001:db8::abcd.
Schreibe 2001:db8::2 vollständig aus.¦2001:0db8:0000:0000:0000:0000:0000:0002.
Warum darf :: nur einmal vorkommen?¦Sonst wäre die Zahl ausgelassener Nullgruppen mehrdeutig.
Darfst du in einer IPv6-Gruppe Nullen am Ende einfach streichen?¦Nein, nur führende Nullen dürfen ohne :: wegfallen.
Wie erkennst du eine Dokumentationsadresse im IPv6-Beispielnetz?¦Sie verwendet 2001:db8::/32.
Was heißt Dual Stack?¦IPv4 und IPv6 werden parallel betrieben.
Existiert bei IPv6 ein klassischer Broadcast?¦Nein, entsprechende Funktionen nutzen Multicast.
Warum ist ICMPv6 wichtig für IPv6?¦Unter anderem für NDP, Fehlermeldungen und Router Advertisements.
Kann eine IPv6-Adresse ohne DHCPv6 automatisch entstehen?¦Ja, durch SLAAC.
\`.trim(),
dienste: \`
Welcher TCP-Port wird üblicherweise für SSH genutzt?¦22.
Welcher Port wird standardmäßig für Telnet genutzt?¦TCP 23.
Was ist der Standardport für HTTP?¦TCP 80.
Was ist der klassische HTTPS-Port?¦TCP 443; HTTP/3 nutzt UDP 443.
Welche Ports nutzt DNS?¦UDP und TCP 53.
Welche Ports verwendet DHCPv4?¦UDP 67 für Server, 68 für Client.
Welcher Port dient SMTP zwischen Mailservern meist?¦TCP 25.
Welcher Port wird für Mail-Submission häufig verwendet?¦TCP 587.
Welcher Port ist für IMAPS typisch?¦TCP 993.
Welcher Port ist für POP3S typisch?¦TCP 995.
Wie lautet der Standardport von RDP?¦TCP 3389, teils auch UDP 3389.
Welcher Port gehört zu NTP?¦UDP 123.
Welcher Port gehört zu LDAP ohne TLS?¦TCP/UDP 389 je nach Verwendung.
Welcher Port gehört zu LDAPS?¦TCP 636.
Welcher Dienst nutzt TCP 445 typischerweise?¦SMB/CIFS für Windows-Dateifreigaben.
Was bedeutet DNS-A-Record?¦Er ordnet einem Namen eine IPv4-Adresse zu.
Wozu dient ein AAAA-Record?¦Er ordnet einem Namen eine IPv6-Adresse zu.
Wofür steht ein MX-Record?¦Er nennt Mail-Exchanger für eine Domain.
Was ist ein DNS-CNAME?¦Ein Alias auf einen anderen Domainnamen.
Welche vier DORA-Schritte verwendet DHCPv4?¦Discover, Offer, Request, Acknowledge.
Was bewirkt eine DHCP-Lease?¦Sie begrenzt die Nutzungszeit einer zugeteilten Adresse.
Was ist APIPA unter Windows?¦Automatische IPv4-Adresse aus 169.254.0.0/16 bei fehlender geeigneter Konfiguration.
Kann APIPA ein gewöhnliches Internet-Gateway ersetzen?¦Nein.
Wozu dient TTL bei einem DNS-Record?¦Sie legt die maximale Cache-Lebensdauer fest.
Was ist ein TCP-SYN?¦Das gesetzte SYN-Flag initiiert eine TCP-Verbindung.
Welches TCP-Flag bestätigt typischerweise Empfang?¦ACK.
Was bedeutet verbindungslos bei UDP?¦Es gibt keinen verbindungsorientierten Handshake oder Transportzustellgarantie.
Warum nutzt man TLS bei Webdiensten?¦Zur Sicherung der Übertragung und Authentifizierung des Servers.
Welche Folge kann ein abgelaufenes TLS-Zertifikat haben?¦Der Client warnt oder verweigert die Verbindung.
Was prüft nslookup?¦Die Namensauflösung über DNS.
Wozu dient traceroute/tracert?¦Zur groben Ermittlung der durchlaufenen Router-Hops.
Ping funktioniert, Webseiten nicht: nenne zwei Ursachen.¦DNS-Fehler oder gestörter Webdienst/Port/Proxy.
\`.trim(),
sicherheit: \`
Welche drei Schutzziele bilden die CIA-Triade?¦Vertraulichkeit, Integrität, Verfügbarkeit.
Welches Schutzziel verletzt das Mitlesen von Kundendaten?¦Vertraulichkeit.
Welches Schutzziel verletzt die heimliche Änderung einer Rechnung?¦Integrität.
Welches Schutzziel ist bei einem Serverausfall verletzt?¦Verfügbarkeit.
Was ist der Unterschied zwischen Hash und Verschlüsselung?¦Hashing ist nicht reversibel; verschlüsselte Daten sind mit Schlüssel entschlüsselbar.
Nenne zwei Eigenschaften eines kryptografischen Hashverfahrens.¦Deterministisch und praktisch kollisionsresistent.
Was bedeutet Salt bei Passwort-Hashes?¦Ein individueller Zusatzwert pro Passwort erschwert vorberechnete Angriffe.
Warum sollte man Passwörter nicht mit einfachem SHA-256 speichern?¦Es ist für Passwortangriffe zu schnell; KDFs wie Argon2id sind geeigneter.
Was ist ein symmetrischer Schlüssel?¦Derselbe geheime Schlüssel dient zum Ver- und Entschlüsseln.
Wie funktionieren öffentliche und private Schlüssel grundsätzlich?¦Sie sind mathematisch verbunden und unterstützen asymmetrische Verfahren.
Womit prüft man eine digitale Signatur?¦Mit dem öffentlichen Schlüssel des Unterzeichners.
Welche Ziele unterstützt eine digitale Signatur?¦Authentizität und Integrität.
Warum bietet eine Signatur allein keine Vertraulichkeit?¦Sie macht Daten nicht geheim.
Nenne die drei Arten von Authentifizierungsfaktoren.¦Wissen, Besitz, biometrisches Merkmal.
Sind Passwort und Sicherheitsfrage echte MFA?¦Nein, beides ist Wissen.
Was ist ein Vorteil von FIDO2/Passkeys?¦Phishing-resistente, schlüsselbasierte Authentisierung.
Warum ist RAID 1 kein Backup?¦Fehlerhafte Änderungen und Löschungen werden mitgespiegelt.
Was bedeutet 3-2-1 bei Backups?¦Drei Kopien auf zwei Medientypen, eine extern.
Wofür steht RTO?¦Angestrebte maximale Wiederherstellungszeit.
Wofür steht RPO?¦Maximal tolerierter Datenverlust, gemessen in Zeit.
Wozu dient ein Restore-Test?¦Er prüft, ob Backups tatsächlich wiederherstellbar sind.
Was sind Malware und Ransomware?¦Malware ist Schadsoftware; Ransomware sperrt/verschlüsselt Daten gegen Lösegeld.
Was ist Phishing?¦Betrug mit gefälschten Nachrichten oder Seiten zur Datenerbeutung.
Was bedeutet Social Engineering?¦Manipulation von Menschen zur Umgehung von Schutzmaßnahmen.
Was ist Least Privilege?¦Berechtigungen auf das tatsächlich benötigte Minimum begrenzen.
Wozu dient eine Firewall?¦Sie filtert Netzwerkverkehr nach Regeln.
Warum ist eine Firewall kein Virenscanner?¦Sie kontrolliert Verkehr, untersucht aber nicht automatisch jede Schadsoftware.
Was versteht man unter einem Patch?¦Softwareaktualisierung, oft zum Beheben von Fehlern und Sicherheitslücken.
Was ist eine Schwachstelle?¦Eine ausnutzbare Sicherheitslücke in Technik, Prozess oder Verhalten.
Was ist eine Bedrohung?¦Ein möglicher Auslöser eines Schadens.
Was ist eine Risikoanalyse?¦Bewertung von Eintrittswahrscheinlichkeit und Schadensfolgen.
Was bedeutet Schutzbedarf „sehr hoch“?¦Ein Schaden könnte besonders gravierende Auswirkungen haben.
\`.trim(),
datenschutz: \`
Was sind personenbezogene Daten?¦Informationen über identifizierte oder identifizierbare Personen.
Ist eine Personalnummer personenbezogen?¦Ja, wenn sie einer Person zugeordnet werden kann.
Sind pseudonymisierte Daten grundsätzlich frei von Datenschutzregeln?¦Nein, wenn Re-Identifizierung möglich ist.
Was ist der Unterschied zwischen anonymisiert und pseudonymisiert?¦Anonyme Daten sind nicht mehr mit vertretbarem Aufwand zuordenbar; Pseudonyme grundsätzlich schon.
Nenne zwei Rechtsgrundlagen aus Art. 6 DSGVO.¦Vertragserfüllung und rechtliche Verpflichtung, beispielsweise.
Ist eine Einwilligung für jede Datenverarbeitung nötig?¦Nein, es gibt andere Rechtsgrundlagen.
Was heißt Zweckbindung?¦Daten dürfen nur für festgelegte, legitime Zwecke verarbeitet werden.
Was bedeutet Datenminimierung?¦Es dürfen nur die notwendigen Daten erhoben werden.
Was bedeutet Speicherbegrenzung?¦Daten sind nicht länger als nötig zu speichern.
Was ist ein Verantwortlicher?¦Die Stelle, die Zwecke und Mittel der Verarbeitung festlegt.
Was ist ein Auftragsverarbeiter?¦Eine Stelle, die personenbezogene Daten im Auftrag verarbeitet.
Wann ist ein AV-Vertrag relevant?¦Bei Auftragsverarbeitung nach Art. 28 DSGVO.
Darf jede Person eine Datenauskunft verlangen?¦Betroffene haben grundsätzlich ein Auskunftsrecht nach Art. 15.
Was beschreibt das Recht auf Berichtigung?¦Falsche personenbezogene Daten dürfen korrigiert werden.
Besteht ein uneingeschränktes Recht auf Löschung?¦Nein, Ausnahmen wie Aufbewahrungspflichten können entgegenstehen.
Was ist das Recht auf Datenübertragbarkeit?¦Unter bestimmten Bedingungen Daten in einem gängigen Format erhalten/übermitteln.
Was sind TOM?¦Technische und organisatorische Maßnahmen zum Schutz personenbezogener Daten.
Nenne zwei technische Schutzmaßnahmen.¦Verschlüsselung und Zugangskontrolle.
Nenne zwei organisatorische Schutzmaßnahmen.¦Berechtigungskonzept und Mitarbeiterschulung.
Was ist eine Datenpanne?¦Eine Verletzung der Sicherheit personenbezogener Daten.
Wann läuft die 72-Stunden-Frist einer meldepflichtigen Panne?¦Ab Bekanntwerden bei dem Verantwortlichen.
Muss jede Datenpanne der Behörde gemeldet werden?¦Nein, nicht wenn voraussichtlich kein Risiko für Rechte und Freiheiten besteht.
Wann müssen Betroffene über eine Panne informiert werden?¦Grundsätzlich bei voraussichtlich hohem Risiko.
Warum sind Auskunftsrechte wichtig?¦Sie schaffen Transparenz und Kontrolle über Daten.
Was ist eine Datenschutz-Folgenabschätzung?¦Eine strukturierte Risikobewertung bei voraussichtlich hohem Risiko.
Wozu braucht man ein Löschkonzept?¦Für rechtmäßige, nachvollziehbare Löschfristen und -abläufe.
Was ist „Privacy by Design“?¦Datenschutz bereits bei der technischen Gestaltung berücksichtigen.
Was ist „Privacy by Default“?¦Datenschutzfreundliche Voreinstellungen.
Wann brauchen nicht notwendige Tracking-Cookies üblicherweise Einwilligung?¦Vor dem Setzen bzw. Endgerätezugriff.
Ersetzt ein Cookie-Banner automatisch eine gültige Einwilligung?¦Nein; Einwilligung muss informiert und freiwillig sein.
Warum können IP-Adressen personenbezogen sein?¦Weil sie unter Umständen einer Person zugeordnet werden können.
Warum sollte ein Admin Kundendaten nicht wahllos einsehen?¦Zweckbindung, Vertraulichkeit und geringstmögliche Zugriffsrechte.
\`.trim()
,
rechnung: \`
Ein Listenpreis beträgt 500 €, Rabatt 10 %. Zielpreis?¦450 €.
Ein Zielpreis beträgt 800 €, Skonto 2 %. Skontobetrag?¦16 €.
Ein Artikel kostet nach 5 % Rabatt noch 950 €. Listenpreis?¦950 / 0,95 = 1.000 €.
Wozu dienen Bezugskosten?¦Sie erfassen zusätzliche Kosten bis zur Beschaffung.
Was ist der Unterschied zwischen Brutto und Netto?¦Brutto enthält die relevante Umsatzsteuer, Netto nicht.
Ein Artikel kostet 100 € netto, USt 19 %. Bruttopreis?¦119 €.
Aus 119 € brutto bei 19 % USt: Nettopreis?¦119 / 1,19 = 100 €.
Kann man 10 % Rabatt und 2 % Skonto einfach zu 12 % addieren?¦Nein, sie beziehen sich auf unterschiedliche Zwischensummen.
Nenne drei Kriterien einer Nutzwertanalyse.¦Zum Beispiel Preis, Qualität, Lieferzeit.
Wie müssen Gewichte in einer Nutzwertanalyse summiert werden?¦Zu 100 % bzw. 1,0.
Ein Kriterium hat 30 % Gewicht und 5 Punkte: Beitrag?¦0,30 × 5 = 1,5 Punkte.
Wie berechnet man die gewichtete Gesamtnote?¦Summe aus Gewicht × Bewertung für alle Kriterien.
Was gehört zu TCO?¦Anschaffung, Betrieb, Wartung, Lizenzen und Entsorgung.
Warum vergleicht man TCO über denselben Zeitraum?¦Nur dann sind Alternativen sinnvoll vergleichbar.
Ein Gerät verbraucht 100 W über 10 h. Energiebedarf?¦1 kWh.
Ein Server zieht 200 W für 24 Stunden. Verbrauch?¦4,8 kWh.
1.000 kWh bei 0,35 €/kWh kosten wie viel?¦350 €.
Eine SSD kostet 120 €, eine HDD 80 €. Welcher weitere Faktor zählt?¦Leistung, Strom, Haltbarkeit und Einsatzzweck.
Was ist lineare Abschreibung?¦Gleichmäßige Verteilung des abschreibbaren Wertes über die Nutzungsjahre.
Ein Gerät kostet 1.800 €, Nutzungsdauer 3 Jahre, kein Restwert: jährlich?¦600 €.
Welchen Zweck hat ein Restwert bei der Abschreibung?¦Er mindert den insgesamt abzuschreibenden Betrag.
Was ist die einfache Amortisationsdauer?¦Investitionsbetrag geteilt durch jährliche Netto-Rückflüsse/Einsparungen.
Investition 9.000 €, Einsparung 3.000 € pro Jahr: Zeit?¦3 Jahre.
Wie unterscheidet sich Amortisation von Gewinn?¦Amortisation betrachtet die Rückgewinnung der Ausgabe, Gewinn einen Überschuss.
Was sind Fixkosten?¦Kosten, die im betrachteten Bereich nicht von der Stückzahl abhängen.
Was sind variable Kosten?¦Kosten, die mit der produzierten/verkauften Menge variieren.
Wie berechnet man den Deckungsbeitrag pro Stück?¦Verkaufspreis minus variable Stückkosten.
Preis 50 €, variable Kosten 30 €: Deckungsbeitrag?¦20 €.
Fixkosten 5.000 €, DB 25 €: Break-even-Menge?¦200 Stück.
Was passiert, wenn der Deckungsbeitrag negativ ist?¦Mehr Verkäufe decken die Fixkosten nicht.
Welche Faktoren beeinflussen Make-or-Buy?¦Kosten, Know-how, Qualität, Kapazität und Abhängigkeiten.
Warum sind Leasing und Kauf nicht nur über Monatsraten vergleichbar?¦Laufzeit, Restwert, Wartung und Gesamtkosten unterscheiden sich.
\`.trim(),
csharp: \`
Was speichert der Typ int typischerweise?¦Eine 32-Bit-Ganzzahl.
Welchen Typ nutzt du für true/false?¦bool.
Wie lautet ein einzelnes Zeichen in C#?¦Zum Beispiel 'A' als char.
Wie schreibt man eine Zeichenfolge?¦Zum Beispiel "Hallo" als string.
Welcher Operator weist einen Wert zu?¦=.
Welcher Operator prüft Gleichheit?¦==.
Wie lautet der Operator für ungleich?¦!=.
Wie kombinierst du zwei bool-Bedingungen mit UND?¦&&.
Wie kombinierst du Bedingungen mit ODER?¦||.
Was prüft if (alter >= 18)?¦Ob alter mindestens 18 ist.
Was ist der Unterschied zwischen if und else if?¦else if wird erst geprüft, wenn vorherige Zweige nicht zutrafen.
Was wird bei int x = 8 / 3; gespeichert?¦2.
Was ist 9 % 4 als Ganzzahl?¦1.
Wie erzielst du bei 5 / 2 ein Gleitkommaergebnis?¦Zum Beispiel 5.0 / 2 = 2.5.
Was bedeutet var zahl = 3; für den Typ?¦Der Compiler leitet int ab.
Kann eine var-Variable nachträglich den Typ wechseln?¦Nein, C# bleibt statisch typisiert.
Welche Schleife ist für eine bekannte Wiederholungszahl geeignet?¦for.
Welche Schleife prüft vor jedem Durchlauf?¦while oder for.
Welche Schleife läuft mindestens einmal?¦do-while.
Wie oft läuft for (int i=1; i<=4; i++)?¦Viermal.
Was bewirkt i++?¦Es erhöht i um eins.
Was bewirkt break in einer Schleife?¦Beendet die Schleife.
Was bewirkt continue in einer Schleife?¦Springt zum nächsten Durchlauf.
Was gibt Console.WriteLine aus?¦Text bzw. Werte in der Konsole mit Zeilenende.
Was liefert Console.ReadLine()?¦Einen string oder null.
Warum ist TryParse bei Nutzereingaben sinnvoll?¦Es meldet ungültige Zahlen ohne Format-Ausnahme.
Wie ist der erste Index eines C#-Arrays?¦0.
Wie viele gültige Indizes hat ein Array mit Length 4?¦0, 1, 2 und 3.
Wie liest du die Länge eines Arrays arr?¦arr.Length.
Was ist der Unterschied zwischen Parameter und Rückgabewert?¦Parameter sind Eingaben, return liefert ein Ergebnis.
Was bedeutet void bei einer Methode?¦Sie liefert keinen Rückgabewert.
Warum sind Methoden hilfreich?¦Sie zerlegen Programme in wiederverwendbare, testbare Aufgaben.
\`.trim(),
mix: \`
Was bedeutet RAID 0?¦Striping ohne Redundanz.
Welche Redundanz bietet RAID 1?¦Spiegelung derselben Daten auf mindestens zwei Laufwerke.
Wie viele Laufwerke braucht RAID 5 mindestens?¦Drei.
Vier Platten à 2 TB in RAID 5: rohe nutzbare Kapazität?¦(4 − 1) × 2 TB = 6 TB.
Warum ist RAID kein Backup?¦Löschungen und Verschlüsselungen können alle Verbunddaten treffen.
Ist RAM flüchtig?¦Ja, gewöhnlicher RAM verliert ohne Strom den Inhalt.
Welche typische Stärke hat eine SSD gegenüber einer HDD?¦Geringere Zugriffszeit durch fehlende mechanische Teile.
Wofür steht NVMe?¦Non-Volatile Memory Express, Protokoll für schnellen nichtflüchtigen Speicher.
Was ist eine USV?¦Unterbrechungsfreie Stromversorgung zur Überbrückung und geordneten Abschaltung.
Welche Einheit misst elektrische Leistung?¦Watt.
Warum sind VA und W nicht immer gleich?¦Der Leistungsfaktor beeinflusst die Wirkleistung.
Was ist ein Hypervisor?¦Softwareebene, die virtuelle Maschinen bereitstellt und verwaltet.
Was bedeutet Typ-1-Hypervisor?¦Läuft direkt auf der Hardware.
Was bedeutet Typ-2-Hypervisor?¦Läuft auf einem Host-Betriebssystem.
Warum ist ein VM-Snapshot kein Backup?¦Er hängt oft vom selben Speicher/der VM-Infrastruktur ab.
Welche Windows-Konsole zeigt die IP-Konfiguration?¦ipconfig /all.
Welcher Linux-Befehl zeigt IP-Adressen?¦ip addr.
Wie zeigst du Linux-Routingtabellen an?¦ip route.
Welcher Windows-Befehl testet DNS-Namensauflösung?¦nslookup.
Was macht SELECT in SQL?¦Liest Daten aus einer Datenquelle.
Was macht WHERE in SQL?¦Filtert Zeilen nach einer Bedingung.
Was bedeutet ein Primärschlüssel?¦Eindeutige Kennung eines Datensatzes.
Was bedeutet ein Fremdschlüssel?¦Verweis auf Schlüsselwerte einer anderen Tabelle.
Warum kann ein Fremdschlüssel doppelt vorkommen?¦Mehrere Datensätze dürfen auf denselben Eltern-Datensatz zeigen.
Was ist ein ER-Modell?¦Modell von Entitäten und ihren Beziehungen.
Was ist das Lastenheft?¦Anforderungen aus Sicht des Auftraggebers.
Was ist das Pflichtenheft?¦Beschreibung, wie der Auftragnehmer Anforderungen umsetzt.
Wofür steht SMART bei Zielen?¦Spezifisch, messbar, attraktiv/akzeptiert, realistisch und terminiert.
Was beschreibt der kritische Pfad eines Netzplans?¦Vorgangskette, deren Verzögerung den Endtermin verschiebt.
Was bedeutet TCO bei einer Beschaffung?¦Gesamtkosten über die Nutzungszeit.
Warum muss eine IT-Dokumentation aktuell sein?¦Sie unterstützt Betrieb, Fehlersuche, Wartung und Vertretung.
Was ist ein Ticket in einem Supportsystem?¦Dokumentierter Vorgang mit Problem, Status, Bearbeitung und Kommunikation.
\`.trim()
};