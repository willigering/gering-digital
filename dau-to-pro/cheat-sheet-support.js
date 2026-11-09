/* IT-Support Pocket Guide · Inhalte aus den bereitgestellten Arbeitsblättern.
   Ergänzte prüfungsnahe Fragen sind eigenständige Lernhilfen, keine Originalprüfungsfragen. */
(function(){
"use strict";
if(!Array.isArray(globalThis.DTP_CHEAT_GROUPS))return;
if(globalThis.DTP_CHEAT_GROUPS.some(g=>g.id==="support"))return;
globalThis.DTP_CHEAT_GROUPS.push({
  "id": "support",
  "name": "IT-Support",
  "symbol": "HELP",
  "color": "#66dbe4",
  "sections": [
    [
      "IT-Service & ITSM",
      "Support ist kein Reparatur-Lotto, sondern Teil eines vereinbarten IT-Services.",
      "IT-Service::Ermöglicht gewünschte Kundenergebnisse und gemeinsame Wertschöpfung ohne eigene Steuerung aller Kosten und Risiken.|ITSM::Planung, Bereitstellung, Steuerung und Verbesserung von IT-Services nach Qualität, Kosten und Kundennutzen.|ITIL::Sammlung bewährter Praktiken für IT-Service-Management, kein einzelnes Ticketsystem.|Service Desk::Zentrale Anlaufstelle für Support und Serviceanfragen.|Ziel::Nutzer arbeitsfähig halten, nachvollziehbar handeln und zugesagte Leistungen einhalten.",
      "Wie unterscheiden sich ITIL und ITSM?",
      "ITSM ist das Management von IT-Services; ITIL liefert dafür bewährte Praktiken.",
      "Ein Tickettool allein ist noch kein funktionierendes ITSM.",
      "BASIS"
    ],
    [
      "SPOC & drei Supportlevel",
      "Wer Probleme über Zuruf löst, verschenkt Nachvollziehbarkeit.",
      "SPOC::Single Point of Contact: definierte zentrale Anlaufstelle per Portal, E-Mail oder Hotline.|1st Level::Nimmt Tickets auf, qualifiziert sie und löst Standardfälle mithilfe einer Wissensdatenbank.|2nd Level::Technische Tiefenanalyse, Konfiguration, Netz- und Systemprobleme, Vor-Ort-Service.|3rd Level::Spezialisten, Hersteller oder Entwicklung bei komplexen Architektur-, Code- oder Firmwarefehlern.|Eskalation::Weitergeben, wenn Wissen, Berechtigung oder vereinbarte Zeit nicht ausreichen.",
      "Welche Aufgabe übernimmt der 1st-Level-Support zuerst?",
      "Anfrage erfassen, wesentliche Angaben aufnehmen und das Problem vorqualifizieren.",
      "Nicht jeder schwierige Kunde braucht 3rd Level – manchmal reicht eine klare Rückfrage.",
      "WISSEN"
    ],
    [
      "Ticket-Lebenszyklus",
      "Ein Ticket braucht einen nachvollziehbaren Weg von Neu bis Geschlossen.",
      "Erfassen::Wer meldet was, wann, an welchem System und mit welcher Fehlermeldung?|Einordnen::Anfragetyp, Kategorie, Auswirkung und Dringlichkeit festlegen.|Erstprüfung::Möglichst direkt im 1st Level beheben (First Contact Resolution).|Zuweisen::Bei Bedarf an zuständiges Fachteam oder Hersteller weiterleiten.|Bearbeiten::Diagnose, Workaround oder dauerhafte Lösung dokumentieren.|Abschluss::Nutzer informieren, Wirksamkeit prüfen, Lösung dokumentieren und Ticket schließen.",
      "Nenne die sechs Schritte eines typischen Ticket-Workflows.",
      "Erfassen, kategorisieren/priorisieren, erstprüfen, zuweisen/eskalieren, bearbeiten und abschließen.",
      "Ohne Fehlerbeschreibung ist das Ticket eher ein Ratespiel mit Zeitstempel.",
      "ABLAUF"
    ],
    [
      "Vier Anfragetypen",
      "Nicht jede Anfrage ist eine Störung – und nicht jede Störung ist das eigentliche Problem.",
      "Incident::Ungeplante Unterbrechung oder Qualitätsminderung eines IT-Services; Ziel ist schnelle Wiederherstellung.|Service Request::Reguläre Anforderung, z. B. Software, Berechtigung, Passwortzurücksetzung oder Hardware.|Change Request::Geplante Änderung an IT-Systemen; erfordert je nach Prozess Prüfung und Genehmigung.|Problem::Zugrunde liegende Ursache wiederkehrender oder unbekannter Incidents finden und dauerhaft beseitigen.|Merke::Drucker kaputt = Incident; zweiter Drucker gewünscht = Service Request.",
      "Ein ERP-System wird jeden Freitag langsam. Welcher Anfragetyp untersucht die wiederkehrende Ursache?",
      "Problem: Die wiederkehrende Störung erfordert Ursachenanalyse.",
      "Ersatz-Hardware kann je nach Vorgang Teil einer Incident-Behebung oder eines Service Requests sein.",
      "ZUORDNUNG"
    ],
    [
      "Impact × Urgency = Priorität",
      "Nicht die Lautstärke des Anrufers legt P1 fest.",
      "Impact::Auswirkung auf Geschäftsprozess, Zahl betroffener Nutzer und wirtschaftlichen Schaden.|Urgency::Wie schnell muss gehandelt werden, um erhebliche Folgen zu verhindern?|Matrix Hoch/Hoch::P1 kritisch.|Matrix Hoch/Mittel & Mittel/Hoch::P2 hoch.|Matrix Hoch/Niedrig, Mittel/Mittel & Niedrig/Hoch::P3 mittel.|Matrix Mittel/Niedrig & Niedrig/Mittel::P4 niedrig; Niedrig/Niedrig = P5 sehr niedrig.|Praxis::Ein Arbeitsplatz mit Ersatzdrucker hat geringeren Impact als ein unternehmensweiter Ausfall.",
      "Welche Priorität hat ein Incident mit hoher Auswirkung und hoher Dringlichkeit?",
      "P1 – kritisch.",
      "VIP-Status ist keine eigene Maßeinheit für Impact.",
      "ENTSCHEIDEN"
    ],
    [
      "SLA & Kennzahlen",
      "Ein SLA misst Zusagen – nicht die Hoffnung, dass der Router sich zusammenreißt.",
      "SLA::Vereinbart Leistungen, Zuständigkeiten, Servicezeiten und messbare Serviceziele zwischen Kunde und Dienstleister.|Reaktionszeit::Zeit vom Ticket-Eingang bis zum Beginn der Bearbeitung; automatische Bestätigung genügt nicht.|Lösungs-/Wiederherstellungszeit::Zeit bis Fix oder geeigneter Workaround zur Wiederherstellung.|Verfügbarkeit::Anteil funktionsfähiger Zeit im vereinbarten Servicefenster.|FCR::First Contact Resolution – Anteil direkt beim Erstkontakt gelöster Tickets.|MTTR::Mittlere Zeit bis Reparatur oder Wiederherstellung; Definition im Kontext prüfen.|Servicezeiten::5×8 = z. B. Mo–Fr acht Stunden; 7×24 = durchgehend.",
      "Wie berechnet man die maximal zulässige SLA-Downtime?",
      "Gesamtzeit in Minuten × (1 − zugesicherte Verfügbarkeit als Dezimalzahl).",
      "Reaktionszeit und Lösungszeit sind zwei verschiedene Uhren.",
      "RECHNEN"
    ],
    [
      "Ticketstatus & SLA-Uhr",
      "Warten ist kein Freibrief zum Zeitstoppen.",
      "Neu::Ticket eingegangen und noch nicht zugewiesen.|In Arbeit::Aktive Analyse oder Behebung läuft.|Warten auf Kunde::Rückfrage offen; Pausenregel nur, wenn das SLA sie vorsieht.|Warten auf Dritte::Hersteller oder Ersatzteil ausstehend; Vertragsregel beachten.|Gelöst::Technische Lösung umgesetzt, Bestätigung kann noch ausstehen.|Geschlossen::Final abgeschlossen und archiviert; je nach System nicht weiter bearbeitbar.|SLA-Uhr::Zählt grundsätzlich gemäß vereinbarten Servicezeiten und Pausenregeln, nicht nach Bauchgefühl.",
      "Darf ein Ticket im Status „Warten auf Kunde“ immer die SLA-Uhr pausieren?",
      "Nein. Ob und wann pausiert wird, ergibt sich aus SLA und vereinbartem Workflow.",
      "Statusfarbe ist kein Ersatz für schriftlich vereinbarte SLA-Regeln.",
      "WISSEN"
    ],
    [
      "Servicearten & Bereitstellung",
      "Technische Komponenten sind nicht immer der Service, den der Kunde eigentlich bestellt.",
      "Core Service::Liefert direkten Hauptnutzen, z. B. Webshop oder Patientenverwaltung.|Enabling Service::Ermöglicht den Kernservice im Hintergrund, z. B. VPN, DNS, DHCP oder Identitätsverwaltung.|Enhancing Service::Erhöht Komfort/Mehrwert, z. B. SMS-Erinnerung oder Self-Service-Funktion.|Interne Services::Für Fachabteilungen im eigenen Unternehmen.|Externe Services::Für Kunden anderer Unternehmen, z. B. Systemhaus oder Cloudprovider.|On-Premises::Eigene Infrastruktur und Betrieb vor Ort.|Cloud::Verantwortlichkeiten je nach IaaS, PaaS oder SaaS unterschiedlich verteilt.",
      "Ordne einen zentralen DNS-Dienst ein: Core, Enabling oder Enhancing?",
      "Enabling: Er ermöglicht im Hintergrund andere Kernservices.",
      "„Steht auf einem Server“ verrät noch nicht, ob etwas ein Kernservice ist.",
      "WISSEN"
    ]
  ]
});
globalThis.DTP_CHEAT_EXTRAS=globalThis.DTP_CHEAT_EXTRAS||{};
globalThis.DTP_CHEAT_EXTRAS.support="Was macht ein Service Desk als SPOC?¦Er erfasst und steuert Anfragen über einen definierten zentralen Kontaktweg.\nWelche Angaben gehören in ein neues Incident-Ticket?¦Melder, System, Zeitpunkt, Auswirkung, Fehlerbild, relevante Meldungen und bisherige Schritte.\nWelche Information hilft bei der Reproduzierbarkeit eines Fehlers?¦Genaue Schritte, Zeitpunkt, Umgebung und erwartetes gegenüber tatsächlichem Verhalten.\nEin Passwort muss zurückgesetzt werden. Welcher Tickettyp ist üblich?¦Service Request, sofern es sich um die reguläre Standardleistung handelt.\nEin vorhandener Drucker druckt plötzlich nicht mehr. Welcher Tickettyp?¦Incident: Der bestehende Service ist gestört.\n250 Mitarbeitende können sich nicht anmelden. Wie ist der Impact?¦Hoch: Viele Mitarbeitende und ein zentraler Geschäftsprozess sind betroffen.\nDer Core-Switch wird im Wartungsfenster ersetzt. Welcher Anfragetyp?¦Change Request: Eine geplante Änderung an der Infrastruktur.\nEin SQL-Dienst muss jeden Freitag neu gestartet werden. Welches Management sucht die Ursache?¦Problem Management; der Neustart ist zunächst nur ein Workaround.\nWorin unterscheiden sich Incident und Problem?¦Incident stellt Betrieb rasch wieder her; Problem identifiziert die zugrunde liegende Ursache.\nWer übernimmt häufig einen komplexen Treiberkonflikt?¦2nd-Level-Support nach Erfassung/Vorqualifizierung.\nWann ist Hersteller-/3rd-Level-Support sinnvoll?¦Bei produktspezifischen Code-, Firmware- oder Architekturfehlern außerhalb interner Kompetenz.\nNenne zwei Vorteile einer lückenlosen Ticketdokumentation.¦Nachvollziehbarkeit für Kollegen und belastbare Auswertungen/Kontinuität bei Vertretung.\nWoraus leitet sich eine Ticketpriorität ab?¦Aus Impact und Urgency anhand der vereinbarten Prioritätenmatrix.\nEinzelplatz betroffen, keine zeitliche Eile: Welche Priorität zeigt die Beispielmatrix?¦Niedriger Impact und niedrige Urgency ergeben P5.\nAbteilung eingeschränkt, hohe Dringlichkeit: Welche Priorität?¦Mittlerer Impact und hohe Urgency ergeben P2.\nGesamtes Werk betroffen, niedrige Dringlichkeit: Welche Priorität?¦Hoher Impact und niedrige Urgency ergeben P3 gemäß der Beispielmatrix.\nEin Farbdrucker streift, Ersatzdrucker funktioniert. Was senkt die Priorität?¦Der vorhandene Workaround vermindert die Auswirkung auf den Geschäftsprozess.\nKassenterminal ausgefallen, keine Barzahlung möglich. Welche Überlegung ist entscheidend?¦Zeitkritischer Verkaufsausfall; Auswirkung auf Umsatz/Kundenfluss und betroffene Prozesse bewerten.\nWas ist eine Reaktionszeit in einem SLA?¦Zeitraum bis zum Beginn der Bearbeitung, nicht nur bis zur automatischen Eingangsbestätigung.\nWas ist der Unterschied zur Wiederherstellungszeit?¦Sie endet erst mit funktionsfähigem Service oder akzeptiertem Workaround.\nWas bedeutet FCR als Kennzahl?¦Anteil der Tickets, die beim ersten Kontakt ohne Weiterleitung gelöst werden.\nWas beschreibt MTTR?¦Eine durchschnittliche Reparatur- oder Wiederherstellungsdauer gemäß definierter Messweise.\nBerechne die Zeitspanne eines 30-Tage-Monats bei 24/7 in Minuten.¦30 × 24 × 60 = 43.200 Minuten.\nWie groß ist der maximale Ausfallanteil bei 99,8 % Verfügbarkeit?¦0,2 % der vereinbarten Betriebszeit.\nWie viele Stunden sind 86,4 Minuten?¦1 Stunde, 26 Minuten und 24 Sekunden.\n42 und 55 Minuten Ausfall bei 86,4 Minuten Limit: eingehalten?¦Nein; insgesamt 97 Minuten, also 10,6 Minuten über dem Limit.\nWas bedeuten Servicezeiten 5×12?¦An fünf Tagen pro Woche jeweils zwölf vereinbarte Supportstunden.\nWann zählt das SLA-Wochenende bei einem Mo–Fr-Servicefenster?¦Außerhalb des Fensters normalerweise nicht; maßgeblich ist die konkrete SLA-Vereinbarung.\nOrdne SMS-OP-Termin-Erinnerungen als Serviceart ein.¦Enhancing Service: Komfort-/Mehrwertfunktion zusätzlich zum Kernservice.\nOrdne ein Online-Banking-Portal als Serviceart ein.¦Core Service: direkter Hauptnutzen für den Kunden.\nWarum ist ein VPN-Gateway oft ein Enabling Service?¦Es schafft die notwendige technische Voraussetzung für andere IT-Kernservices.\nNenne drei Risiken beim Wechsel zu reinem SaaS.¦Vendor Lock-in, Datenschutzrisiken und Abhängigkeit von der Internetverbindung.";
globalThis.DTP_CHEAT_ENRICHMENT=globalThis.DTP_CHEAT_ENRICHMENT||{};
globalThis.DTP_CHEAT_ENRICHMENT.support={sections:[
  [
    "Eskalation & Kundenkommunikation",
    "Fachlich weiterleiten oder Führung einbeziehen? Beides ist nicht dasselbe.",
    "Funktional::Übergabe an technisch zuständige Experten, z. B. 1st an 2nd Level.|Hierarchisch::Einbezug von Teamleitung oder Service-Management bei SLA-Risiko, Budget oder Eskalationskonflikt.|Aktiv zuhören::Problem sachlich in eigenen Worten zusammenfassen.|Klartext::Verständliche Formulierungen statt Fachjargon.|Transparenz::Nächste Schritte und realistische Rückmeldezeiten nennen.",
    "Ein SLA droht verletzt zu werden. Wann ist eine hierarchische Eskalation sinnvoll?",
    "Wenn Führungskräfte zur Entscheidung, Priorisierung oder Konfliktlösung eingebunden werden müssen.",
    "„Haben Sie schon neu gestartet?“ ersetzt kein aktives Zuhören.",
    "PRAXIS"
  ],
  [
    "SLA, OLA, UC & Vertragsfolgen",
    "Drei Abkürzungen, drei unterschiedliche Beziehungen.",
    "SLA::Vereinbarung zwischen Dienstleister und Kunde.|OLA::Interne Leistungsvereinbarung zwischen beteiligten Teams.|UC::Unterstützender Vertrag mit einem externen Lieferanten.|SLA Breach::Eine vertraglich zugesagte Zielgröße wird nicht eingehalten.|Mögliche Folgen::Je nach Vertrag Service Credits/Pönalen, Kündigungsrechte oder Schadenersatz.|Wichtig::Konkrete Ansprüche hängen von vertraglichen Voraussetzungen ab.",
    "Unterscheide SLA, OLA und UC in einem Satz.",
    "SLA bindet Kunde/Dienstleister; OLA koordiniert interne Teams; UC regelt externe Zulieferer.",
    "Eine Vertragsstrafe entsteht nicht automatisch ohne entsprechende Vertragsgrundlage.",
    "WISSEN"
  ],
  [
    "Cloud & Shared Responsibility",
    "Der Provider nimmt dir Arbeit ab – aber nicht jede Verantwortung.",
    "On-Premises::Eigene IT verantwortet Hardware, Virtualisierung, OS, Daten und Anwendungen weitgehend selbst.|IaaS::Provider betreibt die physische/virtualisierte Infrastruktur; Kunde verwaltet in der Regel OS und Anwendungen.|PaaS::Provider verwaltet Plattform und Laufzeit; Kunde verantwortet primär Anwendungscode, Daten und deren Nutzung.|SaaS::Fertige Anwendung; Kunde bleibt u. a. für Nutzer, Berechtigungen und rechtmäßige Datennutzung verantwortlich.|Risiken::Vendor Lock-in, Datenschutz/DSGVO, Internetabhängigkeit und begrenzte Anpassbarkeit.",
    "Wer aktualisiert bei klassischem IaaS das Gastbetriebssystem?",
    "In der Regel der Kunde bzw. dessen IT; Vertragsdetails prüfen.",
    "SaaS bedeutet nicht, dass Datenschutz und Berechtigungen verschwinden.",
    "VERSTEHEN"
  ],
  [
    "ITIL-v3-Servicelebenszyklus",
    "Fünf Phasen beschreiben, wie aus einer Idee ein betreuter IT-Service wird.",
    "Strategy::Welcher Service für wen und wozu? Business Case und Portfolio.|Design::Architektur, SLA, Kapazität, Sicherheit und Notfallplanung entwerfen.|Transition::Tests, Freigaben, Schulung und Rollout in den Betrieb.|Operation::Incidents, Requests, Events und Zugriffe im laufenden Betrieb bearbeiten.|Continual Service Improvement::KPIs auswerten und Verbesserung kontinuierlich umsetzen.|Praxis::Rollout gehört zur Transition; Ticketannahme zum Betrieb.",
    "In welche Phase gehört der Rollout einer Buchhaltungssoftware?",
    "Service Transition, weil eine vorbereitete Änderung in den produktiven Betrieb überführt wird.",
    "Ein Modell ist kein Stundenplan: Verbesserungen können jederzeit nötig werden.",
    "ZUORDNUNG"
  ],
  [
    "ITIL 4 & ITSM-Steuerung",
    "Vom linearen Bild zur laufenden Wertschöpfung.",
    "ITIL 4::Service Value System (SVS) und Service Value Chain statt starrer Phasenfolge.|Gemeinsamer Wert::Kunden und Anbieter tragen zur Wertschöpfung bei.|Serviceportfolio/-katalog::Geplante, aktive und eingestellte Leistungen überblicken.|Service Level Management::SLAs vereinbaren, überwachen und berichten.|CMDB::Configuration Items (CIs) und ihre Beziehungen dokumentieren.|ISO/IEC 20000::Normenfamilie für IT-Service-Management.",
    "Wozu dient eine CMDB?",
    "Sie dokumentiert Configuration Items und ihre Abhängigkeiten.",
    "ITIL 4 ersetzt kein technisches Troubleshooting.",
    "WISSEN"
  ],
  [
    "PDCA, Beispiele & SLA-Rechnung",
    "Verbessern heißt messen, handeln und erneut messen.",
    "Plan::Ursache für zu lange Ticketzeiten ermitteln und Ziel definieren.|Do::Beispielsweise Wissensdatenbank, Routing und Schulung verbessern.|Check::Erstlösungszeit und FCR vor/nach Maßnahmen vergleichen.|Act::Bewährte Verbesserungen standardisieren und nächste Runde starten.|SLA-Rechnung::30 Tage × 24 × 60 = 43.200 Minuten; bei 99,8 % sind 0,2 % = 86,4 Minuten Ausfall erlaubt.|Ist-Ausfall::42 + 55 = 97 Minuten, das SLA wird um 10,6 Minuten überschritten.|5×12 Beispiel::Fr 18:45 bis 19:00 = 15 Minuten SLA-Zeit; Rest ab Mo 07:00, sofern so vereinbart.",
    "Ein Service Desk braucht 4,5 statt erlaubter 2 Stunden. Nenne die PDCA-Schritte.",
    "Plan: Engpass finden; Do: Maßnahme testen; Check: Zeiten messen; Act: wirksame Lösung übernehmen.",
    "Für SLA-Rechnungen zuerst Stunden und Minuten sauber vereinheitlichen.",
    "RECHNEN"
  ]
],questions:[
  [
    "Was steht typischerweise in einem Servicekatalog?",
    "Für Kunden verfügbare Services mit Leistungsbeschreibung, Zuständigkeit und vereinbarten Bedingungen."
  ],
  [
    "Was bedeutet funktionale Eskalation bei Routingproblemen?",
    "Das Ticket wechselt zu einem zuständigen fachlichen Spezialteam, etwa Netzwerk/2nd Level."
  ],
  [
    "Wann ist eine hierarchische Eskalation zusätzlich zur funktionalen sinnvoll?",
    "Wenn eine SLA-Verletzung droht oder eine übergeordnete Entscheidung nötig ist."
  ],
  [
    "Worin unterscheiden sich 5×8 und 7×24?",
    "5×8 = fünf Tage mit je acht Service-Stunden, 7×24 = durchgehender Service."
  ],
  [
    "Freitag 18:45, 5×12 bis 19 Uhr, P1-Reaktion 30 Min.: Deadline?",
    "15 Minuten laufen Freitag, verbleibende 15 ab Montag 07:00: Montag 07:15, sofern das SLA so zählt."
  ],
  [
    "Wo liegt die Verantwortung für Benutzerberechtigungen bei SaaS typischerweise?",
    "Beim Kunden beziehungsweise dessen Administration, auch wenn der Provider die Anwendung betreibt."
  ],
  [
    "Warum analysiert man Ticketstatistiken regelmäßig?",
    "Wiederkehrende Ursachen, Engpässe und Chancen für kontinuierliche Serviceverbesserung erkennen."
  ],
  [
    "Was gehört in eine kundenorientierte Rückmeldung bei Verzögerung?",
    "Sachlicher Status, nächster Schritt, zuständige Stelle und realistische Updatezeit."
  ]
]};
})();
