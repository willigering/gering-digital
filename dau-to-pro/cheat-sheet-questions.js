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
};