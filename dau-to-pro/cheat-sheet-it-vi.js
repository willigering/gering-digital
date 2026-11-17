/* IT.VI · Klausurstoff aus den LF6-Karten und den ITIL-/IT-Recht-Musterlösungen. */
(()=>{
  "use strict";

  globalThis.DTP_CHEAT_GROUPS.unshift({
    id:"it-vi",
    name:"IT.VI – ITIL & IT-Recht",
    symbol:"IT.VI",
    color:"#f2c984",
    sections:[
      [
        "Incident, Request & Problem",
        "Ordne den Vorgang zuerst ein. Daraus ergibt sich, was der Support als Nächstes tun soll.",
        "Incident::Ungeplante Unterbrechung oder Qualitätsminderung eines Services. Ziel ist die schnelle Wiederherstellung.|Service Request::Reguläre Anfrage, etwa nach einer neuen Benutzerrolle. Die nötige Freigabe prüfen.|Problem::Ursache oder mögliche Ursache eines oder mehrerer Incidents.|Known Error::Ein analysiertes, noch ungelöstes Problem. Erkenntnisse und einen verfügbaren Workaround dokumentieren.|Workaround::Mindert die Auswirkungen vorübergehend, etwa mit einem Ersatzdrucker.",
        "Der Drucker fällt jede Woche aus. Was unterscheidet Incident und Problem?",
        "Der aktuelle Ausfall ist ein Incident. Die Ursache der wiederholten Ausfälle wird als Problem untersucht.",
        "Ein Neustart kann den Dienst wiederherstellen, obwohl die Ursache weiterbesteht."
      ],
      [
        "Ticket, Priorität & Eskalation",
        "Leite die Priorität aus der vereinbarten Matrix ab und begründe sie mit Auswirkung und Dringlichkeit.",
        "Ticketaufnahme::ID, Zeit, Melder und Kontakt, betroffener Service, Symptom und Umfang erfassen.|Verlauf::Priorität, Zuständigkeit, Status, Diagnoseschritte, Entscheidungen und nächstes Update dokumentieren.|Priorität::Impact beschreibt die Auswirkung. Urgency beschreibt, wie schnell gehandelt werden muss. Hoch und hoch ergibt in der Beispielmatrix P1.|Funktional::An die fachlich zuständige Stelle eskalieren, etwa ans Netzwerkteam.|Hierarchisch::Leitung einbeziehen, wenn Entscheidungen, Ressourcen oder ein drohender SLA-Verstoß es erfordern.|Abschluss::Funktion aus Nutzersicht prüfen, Ergebnis rückmelden und dokumentieren.",
        "40 Lernende können zwölf Minuten vor Prüfungsbeginn die Lernplattform nicht öffnen. Was tust du?",
        "Hohe Auswirkung und hohe Dringlichkeit begründen P1 in der Beispielmatrix. Ticket erfassen, Fachteam und bei Bedarf Leitung einbinden, Workaround prüfen und ein Update zusagen.",
        "P1 bis P4 oder P5 sind betriebliche Modelle. Verwende in der Klausur die vorgegebene Matrix."
      ],
      [
        "SLA & Ausfallzeit rechnen",
        "Rechne mit dem vereinbarten Messfenster und einheitlichen Zeiteinheiten.",
        "SLA::Service Level Agreement. Regelt Leistungen, Servicezeiten, Messgrößen und Zielwerte zwischen Dienstleister und Kunde.|Reaktionszeit::Zeit bis zur vereinbarten qualifizierten Erstreaktion.|Wiederherstellungszeit::Zeit bis der Service wieder nutzbar ist, gegebenenfalls durch einen akzeptierten Workaround.|Formel::Erlaubte Ausfallzeit = Messzeit × (1 − Verfügbarkeit ÷ 100), wenn die Verfügbarkeit als Prozentzahl eingesetzt wird.|30 Tage rund um die Uhr::43.200 min. Bei 99,9 % sind 43 min 12 s erlaubt. Bei 99,5 % sind es 216 min oder 3 h 36 min.",
        "Im 30-Tage-Fenster bei 24/7 beträgt das Ziel 99,9 %. Es gab 45 Minuten anrechenbaren Ausfall. Ist das SLA eingehalten?",
        "43.200 × 0,001 = 43,2 Minuten. 45 Minuten überschreiten das Limit um 1 Minute 48 Sekunden.",
        "99,9 % Verfügbarkeit lassen 0,1 % Ausfall zu. Prüfe das Servicefenster und vereinbarte Ausschlüsse."
      ],
      [
        "ITIL, Nutzen & Wertschöpfung",
        "ITIL liefert einen anpassbaren Rahmen für das Management von IT-Services.",
        "Service, Output, Outcome::Der Service ermöglicht ein Ergebnis. Output ist das Gelieferte (eingerichtetes Notebook), Outcome der erzielte Nutzen (Mitarbeiterin kann arbeiten).|Utility::Erfüllt der Service den Zweck? Das WLAN ermöglicht Zugang zur Lernplattform.|Warranty::Ist der Service wie vereinbart nutzbar? Dazu zählen Verfügbarkeit, Kapazität, Kontinuität und Sicherheit.|ITIL 4 und SVS::Das Service Value System beschreibt, wie Leitprinzipien, Governance, Service-Wertschöpfungskette, Praktiken und kontinuierliche Verbesserung zur Wertschöpfung beitragen.|Vier Dimensionen::Organisationen und Menschen, Information und Technologie, Partner und Lieferanten, Wertströme und Prozesse.|ITIL (Version 5)::Betont den durchgängigen Lebenszyklus digitaler Produkte und Services, das digitale Nutzungserlebnis und den verantwortungsvollen Einsatz von KI.",
        "Das WLAN öffnet die Lernplattform, fällt aber ständig aus. Welche Seite ist betroffen?",
        "Utility ist vorhanden, weil das WLAN den Zugang ermöglicht. Warranty ist unzureichend, weil die erwartete Verfügbarkeit fehlt.",
        "Output ist die Lieferung. Outcome ist, was sich dadurch für die Nutzer verbessert."
      ],
      [
        "Change, Deployment & Release",
        "Prüfe das Risiko vor der Änderung und definiere, wie du Erfolg und Rückkehr zum alten Stand testest.",
        "Standard Change::Erprobt, risikoarm, dokumentiert und vorab genehmigt.|Normal Change::Wird nach Verfahren einzeln bewertet und autorisiert.|Emergency Change::Dringend erforderlich. Bewertung und Freigabe laufen beschleunigt nach dem Notfallverfahren.|Change-Plan::Ziel, betroffene Systeme, Risiko, Freigabe, Test, Wartungsfenster, Kommunikation, Rollback und Erfolgskriterien festhalten.|Deployment und Release::Deployment bringt die Version technisch in die Zielumgebung. Release stellt die Leistung oder Funktion für die Nutzung bereit.",
        "Eine Version läuft produktiv, das neue Modul bleibt per Feature-Flag gesperrt. Was ist bereits passiert?",
        "Das Deployment ist erfolgt. Das Release der Funktion folgt mit der Freigabe für die Zielgruppe.",
        "Auch ein Emergency Change braucht nachvollziehbare Entscheidungen und Dokumentation."
      ],
      [
        "Dienstvertrag, Werkvertrag & Abnahme",
        "Für die Einordnung zählt, welche Leistung die Parteien tatsächlich vereinbart haben.",
        "Dienstvertrag (§ 611 BGB)::Die vereinbarte Tätigkeit ist geschuldet, etwa laufende Beratung.|Werkvertrag (§ 631 BGB)::Ein vereinbarter Erfolg ist geschuldet, etwa ein funktionsfähiges Kontaktformular nach festgelegten Anforderungen.|Abnahme (§ 640 BGB)::Das Ergebnis anhand der vereinbarten Kriterien prüfen. Soll, Ist, Mängel und die Abnahmeentscheidung dokumentieren.|Leistungsbeschreibung::Messbare Kriterien und Prüfbedingungen vereinbaren, z. B. 95 % der Suchanfragen in höchstens zwei Sekunden bei 200 gleichzeitigen Nutzern.|Rechtsquellen::DSGVO ist EU-Recht, das konkrete SLA eine Vertragsvereinbarung, ISO 27001 eine Norm und die Passwortvorgabe eine interne Regel.",
        "Ein Anbieter schuldet die Lieferung eines funktionsfähigen Formulars nach Spezifikation. Welcher Vertragstyp passt?",
        "Ein Werkvertrag liegt nahe, weil ein konkreter Erfolg vereinbart ist. Die Einordnung richtet sich nach dem Gesamtvertrag.",
        "Eine Vertragsstrafe oder ein Service Credit braucht eine entsprechende Grundlage. Im Support zuerst Fakten dokumentieren und zuständige Stellen einbinden."
      ],
      [
        "DSGVO, Rollen, AV-Vertrag & TOMs",
        "Prüfe im Fall zuerst die Daten, den Zweck und die Rollen der Beteiligten.",
        "Personenbezogene Daten::Informationen zu einer identifizierten oder identifizierbaren Person, etwa Name, Nutzerkennung oder Lernfortschritt.|Verantwortlicher::Bestimmt Zwecke und Mittel der Verarbeitung, bei der Lernplattform beispielsweise der Bildungsträger.|Auftragsverarbeiter::Verarbeitet im Auftrag nach Weisung. Entscheidend ist die tatsächliche Rolle des Anbieters.|Art. 5 und 6 DSGVO::Zweckbindung, Datenminimierung und weitere Grundsätze einhalten. Für die Verarbeitung braucht es eine Rechtsgrundlage.|Art. 28 DSGVO::Auftragsverarbeitung vertraglich regeln, etwa Weisungen, Vertraulichkeit, Unterauftragnehmer, Unterstützung, Rückgabe/Löschung und Nachweise.|Art. 32 DSGVO::Technische und organisatorische Maßnahmen (TOMs) am Risiko ausrichten, etwa Zugriffsrollen, Verschlüsselung und getestete Wiederherstellung.",
        "Wer hat welche Rolle, wenn die Schule über Zwecke und wesentliche Mittel entscheidet und der Hoster nur nach Weisung verarbeitet?",
        "Die Schule ist Verantwortliche. Der Hoster ist für diese Verarbeitung Auftragsverarbeiter. Die Auftragsverarbeitung ist nach Art. 28 zu regeln.",
        "Ein AV-Vertrag regelt das Auftragsverhältnis. Die Verarbeitung selbst braucht eine passende Rechtsgrundlage."
      ],
      [
        "Datenpanne & Meldepflichten",
        "Begrenze den Schaden, sichere die Fakten und lass das Risiko für die betroffenen Personen bewerten.",
        "Erstmaßnahmen::Intern melden, weitere Offenlegung stoppen, Zeitpunkte und Umfang dokumentieren und Datenschutz/Sicherheit einbinden.|Art. 33 DSGVO::Der Verantwortliche meldet unverzüglich und möglichst binnen 72 Stunden ab Kenntnis an die Aufsicht, sofern die Verletzung voraussichtlich ein Risiko für die Rechte und Freiheiten natürlicher Personen mit sich bringt.|Art. 34 DSGVO::Bei voraussichtlich hohem Risiko sind grundsätzlich auch die betroffenen Personen unverzüglich zu benachrichtigen. Gesetzliche Ausnahmen beachten.|Auftragsverarbeiter::Informiert den Verantwortlichen bei Bekanntwerden unverzüglich.|Dokumentation::Der Verantwortliche dokumentiert jede Datenschutzverletzung, einschließlich Fakten, Auswirkungen und Abhilfemaßnahmen.",
        "Der Hoster bemerkt einen unbefugten Zugriff auf Schülerdaten. Wen informiert er direkt und wer prüft die Meldung?",
        "Der Hoster informiert den Verantwortlichen unverzüglich. Dieser bewertet das Risiko und prüft die Meldung an die Aufsicht sowie die Benachrichtigung Betroffener.",
        "Die 72 Stunden laufen ab Kenntnis des Verantwortlichen. Sie sind kein Wartefenster bis zum Abschluss der Untersuchung."
      ]
    ]
  });

  globalThis.DTP_CHEAT_EXTRAS["it-vi"]=[
    ["Ein Mitarbeiter benötigt erstmals Zugriff auf einen Ordner. Welcher Vorgang liegt vor?", "Ein Service Request. Identität und Berechtigungsfreigabe nach Verfahren prüfen."],
    ["Ein vorhandener Zugriff fällt plötzlich aus. Welcher Vorgang liegt vor?", "Ein Incident, sofern der Service ungeplant beeinträchtigt ist."],
    ["Woran erkennst du einen Known Error?", "Das zugrunde liegende Problem ist analysiert und noch ungelöst."],
    ["Welcher Unterschied besteht zwischen Event und Incident?", "Ein Event meldet eine relevante Zustandsänderung. Erst ungeplante Unterbrechung oder Qualitätsminderung eines Service ist ein Incident."],
    ["Wofür steht SPOC beim Service Desk?", "Single Point of Contact, die zentrale Anlaufstelle für Nutzer."],
    ["Wann ist eine Eskalation vom 1st zum 2nd Level sinnvoll?", "Wenn etwa Fachkenntnis oder Zugriffsrechte des 1st Level für die technische Diagnose fehlen."],
    ["Welcher Faktor ändert sich, wenn ein Ersatzdrucker verfügbar ist?", "Die Auswirkung auf den Prozess kann sinken. Priorität danach mit der Matrix neu bewerten."],
    ["Welche vier Diagnosefragen helfen beim Erstkontakt?", "Seit wann? Welche genaue Meldung? Wer oder was ist betroffen? Was hat sich seit dem letzten funktionierenden Zugriff geändert?"],
    ["Wie unterscheidest du Reaktionszeit und Wiederherstellungszeit?", "Die Reaktionszeit endet mit der vereinbarten Erstreaktion, die Wiederherstellungszeit mit der erneuten Nutzbarkeit des Service."],
    ["99,5 % bei 30 Tagen rund um die Uhr. Wie viel Ausfall ist erlaubt?", "30 × 24 × 60 = 43.200 Minuten. 0,5 % davon sind 216 Minuten oder 3 Stunden 36 Minuten."],
    ["Ein Ausfall liegt am Sonntag außerhalb eines Mo–Fr-SLA-Fensters. Wie wird er gerechnet?", "Die vereinbarten Messregeln entscheiden. Zeiten außerhalb des wirklich vereinbarten Messfensters zählen in dieser Verfügbarkeitsrechnung nicht."],
    ["Was ergibt eine FCR von 36 Erstlösungen bei 60 betrachteten Tickets?", "36 ÷ 60 × 100 = 60 %. Die Bezugsmenge muss vergleichbar definiert sein."],
    ["Ordne Dienstleister, internes Team und Zulieferer zu SLA, OLA und UC.", "SLA: Kunde und Dienstleister. OLA: interne Teams. UC: externer Zulieferer über einen unterstützenden Vertrag."],
    ["Was unterscheidet ITSM von ITIL?", "ITSM ist das Management der Services. ITIL ist ein Rahmenwerk, das dieses Management unterstützt."],
    ["Nenne die vier Dimensionen in ITIL 4.", "Organisationen und Menschen, Information und Technologie, Partner und Lieferanten, Wertströme und Prozesse."],
    ["Welche Dimension betrachtet bei einer MFA-Einführung Tokenanbieter und dessen Support?", "Partner und Lieferanten. Die technische Einbindung des Tokens betrifft Information und Technologie."],
    ["Welche Rolle hat Governance im SVS?", "Die Organisation anhand von Zielen und Regeln bewerten, steuern und überwachen."],
    ["Eine risikoarme, dokumentierte Routine ist vorab genehmigt. Welche Change-Klasse?", "Standard Change, sofern das betriebliche Verfahren die konkrete Änderung dafür vorsieht."],
    ["Welche vier Punkte gehören vor ein riskantes Produktivupdate?", "Risiko samt Freigabe klären, testen, Wartungsfenster samt Kommunikation planen und einen getesteten Rollback vorsehen."],
    ["Was macht ein Abnahmekriterium prüfbar?", "Messgröße, Sollwert sowie Prüfbedingungen und Testverfahren müssen konkret festgelegt sein."],
    ["Was gehört in ein Abnahmeprotokoll für eine Website?", "Projekt/Version, Prüffall, Soll/Ist, Ergebnis, Mängel, Entscheidung und gegebenenfalls Vorbehalte dokumentieren."],
    ["Ein externer Vor-Ort-Einsatz kostet 1,75 h × 88 € plus 28 € Anfahrt, jeweils netto. Wie viel brutto bei 19 %?", "154,00 € + 28,00 € = 182,00 € netto. 34,58 € USt ergeben 216,58 € brutto."],
    ["Welche Klärungen brauchst du vor Beauftragung eines Subunternehmers?", "Eignung, Leistungen und Fristen, Vertraulichkeit und Sicherheitsvorgaben klären. Bei Unterauftragsverarbeitung zusätzlich die Voraussetzungen nach Art. 28 prüfen."],
    ["Wie setzt du Datenminimierung im Supportticket um?", "Erfasse nur erforderliche personenbezogene Angaben und verwende z. B. einen geschwärzten Screenshot, wenn er zur Diagnose ausreicht."],
    ["Was tun bei einem Klartextkennwort im Ticket?", "Zugriff beschränken, sichere Bereinigung der zugänglichen Kopien und Historie veranlassen, Kennwort zurücksetzen bzw. ändern und Vorfall intern melden."],
    ["Nenne zwei technische und zwei organisatorische Maßnahmen.", "Technisch etwa MFA und Verschlüsselung, organisatorisch etwa Schulungen und ein geregelter Freigabeprozess für Zugriffsrechte."],
    ["Wann kann die Meldung einer Datenpanne an die Aufsicht entfallen?", "Wenn die Verletzung voraussichtlich kein Risiko für die Rechte und Freiheiten natürlicher Personen darstellt. Der Verantwortliche dokumentiert die Bewertung."],
    ["Was ist zu tun, wenn die 72 Stunden bei einer meldepflichtigen Datenpanne überschritten sind?", "Unverzüglich melden und die Verzögerung begründen. Fehlende Angaben können ohne unangemessene Verzögerung nachgereicht werden."],
    ["Kann ein technischer Ausfall ohne Datenabfluss eine Datenschutzverletzung sein?", "Ja. Auch unbeabsichtigter Verlust, Zerstörung oder eine relevante Beeinträchtigung der Verfügbarkeit personenbezogener Daten kann darunter fallen. Den Einzelfall prüfen."],
    ["Ein Windows-Client erhält 169.254.22.9/16 und hat kein Gateway. Was prüfst du zuerst?", "Die Adresse deutet auf fehlende DHCP-Zuweisung hin. Link/Kabel und IP-Konfiguration prüfen, dann mit einem funktionierenden Client vergleichen und DHCP/VLAN eingrenzen."],
    ["Ein Serverneustart hilft. Wie prüfst du den Abschluss?", "Service aus Nutzersicht testen, Rückmeldung geben und Wirkung, Zeiten und Maßnahmen dokumentieren. Bei weiter ungeklärter Ursache ein Problem-Ticket erwägen."],
    ["Der Kunde ist verärgert, ein Fix-Termin ist offen. Was sagst du zu?", "Auswirkung anerkennen, nächsten Prüfschritt nennen und einen verlässlichen Zeitpunkt für das nächste Statusupdate zusagen."]
  ].map(pair=>pair.join("¦")).join("\n");

  globalThis.DTP_CHEAT_ENRICHMENT["it-vi"]={
    sections:[
      [
        "ITIL-Leitprinzipien & Verbesserung",
        "Im Fallbeispiel zählt, wie du das gewählte Prinzip in eine konkrete Handlung übersetzt.",
        "Sieben Leitprinzipien::Wert im Fokus. Dort beginnen, wo man steht. Iterativ mit Feedback vorgehen. Zusammenarbeiten und Transparenz fördern. Ganzheitlich denken und arbeiten. Einfach und praktisch halten. Optimieren und automatisieren.|Beispiel Passwort-Reset::Bestehende Tickets auswerten, einen vereinfachten Ablauf pilotieren, Rückmeldungen einarbeiten.|Wertstrom::Konkrete Abfolge von Aktivitäten, z. B. melden → erfassen → priorisieren → prüfen → beheben → testen → rückmelden.|Kennzahlen::FCR misst Erstlösungen. MTTR braucht eine eindeutige Definition. Wiedereröffnungen zeigen, ob scheinbar gelöste Fälle erneut Arbeit machen.|PDCA::Planen, umsetzen, Wirkung prüfen und wirksame Änderung übernehmen."
      ],
      [
        "IT-Sicherheit & NIS-2",
        "Bewerte Schutzgut, Eintrittswahrscheinlichkeit und Schaden. Prüfe danach die konkreten Pflichten.",
        "Schutzziele::Vertraulichkeit schützt vor unbefugter Einsicht, Integrität vor unbemerkter Veränderung, Verfügbarkeit sichert Nutzbarkeit.|Verlorenes Admin-Notebook::Gerät und Zugangstoken sperren, Protokolle sichern, Datenspeicherung und Verschlüsselung prüfen, Folgen bewerten und intern eskalieren.|Betroffenheit::In Deutschland bestimmt das BSIG unter anderem anhand von Einrichtungsart, Größe und Sonderfällen, ob eine Einrichtung unter die Regeln fällt (§ 28 BSIG).|Meldung::Bei einem erheblichen Sicherheitsvorfall gilt für erfasste wichtige und besonders wichtige Einrichtungen grundsätzlich die frühe Erstmeldung spätestens nach 24 Stunden, die Vorfallmeldung spätestens nach 72 Stunden und die Abschlussmeldung grundsätzlich binnen eines Monats ab Vorfallmeldung (§ 32 BSIG)."
      ],
      [
        "Softwarelizenzen, Website & Cookies",
        "Bei Websites prüfst du getrennt Nutzungserlaubnis, Anbieterangaben und Datenschutz.",
        "Freeware und Open Source::Freeware kann gratis und trotzdem proprietär sein. Open Source erlaubt Nutzung, Änderung und Weitergabe unter Lizenzbedingungen.|MIT, Apache-2.0, GPL::Lizenztexte und Hinweise prüfen. Bei GPL-Weitergabe können insbesondere Pflichten zum korrespondierenden Quellcode greifen.|Fotos und Bibliotheken::Rechteinhaber, erlaubte Nutzung und Lizenzpflichten prüfen. Bei Fotos erkennbarer Personen auch deren Rechte berücksichtigen.|Impressum und Datenschutzerklärung::Impressum nennt den Anbieter nach den einschlägigen Regeln (z. B. § 5 DDG). Die Datenschutzerklärung informiert über personenbezogene Verarbeitung.|§ 25 TDDDG::Speichern oder Auslesen auf dem Endgerät erfordert grundsätzlich Einwilligung. Eine Ausnahme ist die unbedingte Erforderlichkeit für einen ausdrücklich gewünschten digitalen Dienst. Eine nachgelagerte personenbezogene Verarbeitung separat nach DSGVO prüfen."
      ],
      [
        "Klausurfall: Lernplattform ausgefallen",
        "Schreibe in der Antwort konkrete Schritte und begründe die Entscheidung anhand des Falls.",
        "1. Einordnen::Ungeplanter Ausfall = Incident. Viele Betroffene kurz vor der Prüfung sprechen bei entsprechender Matrix für P1.|2. Eindämmen::Status und letzte Änderungen prüfen, Fachteam hinzuziehen, Ausweichlösung und Rückmeldezeit nennen.|3. Datenschutz prüfen::Zum Beispiel unberechtigte Einsicht oder Verlust personenbezogener Daten intern eskalieren und getrennt bewerten.|4. Abschluss::Anmeldung und Prüfungszugriff mit einem Testkonto prüfen, Betroffene informieren, Zeiten und Maßnahmen dokumentieren.|5. Verbessern::Bei unklarer oder wiederkehrender Ursache ein Problem-Ticket anlegen. Dauerhafte Änderungen nach dem Change-Verfahren durchführen."
      ]
    ],
    questions:[
      ["Wie verbesserst du einen stockenden Passwort-Reset iterativ?", "Ist-Zeiten und Engpass erfassen, einen Schritt mit einer kleinen Gruppe testen, Rückmeldungen und Zeiten auswerten und danach gezielt anpassen."],
      ["Welche vier Beispiele gehören bei MFA in die vier ITIL-Dimensionen?", "Schulung und Rollen, Identitätsdienst und Token, Anbieter und Supportvertrag, Ablauf für Registrierung und Geräteverlust."],
      ["Warum kann ein sinkender MTTR täuschen?", "Wenn komplexe Fälle aus der Auswertung fallen oder die Messung anders endet, sinkt der Durchschnitt auch ohne tatsächlich schnellere Bearbeitung."],
      ["Was prüfst du bei einem verlorenen Administrator-Notebook zuerst?", "Verlust intern melden, Gerät und Zugänge sperren, Verschlüsselung und mögliche Zugriffe prüfen und Risiken für Daten und Services bewerten."],
      ["Ein NIS-2-relevanter erheblicher Sicherheitsvorfall ist zugleich eine Datenpanne. Welche Fristen prüfst du?", "Die Pflichten parallel prüfen: BSIG grundsätzlich früh binnen 24 Stunden und Vorfallmeldung binnen 72 Stunden. DSGVO abhängig vom Risiko unverzüglich und möglichst binnen 72 Stunden ab Kenntnis des Verantwortlichen."],
      ["Darfst du eine kostenlose Schrift beliebig in ein Kundenprojekt einbinden?", "Die Schriftlizenz prüfen, vor allem Web-Einbettung, kommerzielle Nutzung und Hinweise. Bei externem Abruf zusätzlich Datenschutz und gegebenenfalls Endgerätezugriff prüfen."],
      ["Ein technisch notwendiges Login-Cookie und ein Werbetracker sollen geladen werden. Wie prüfst du beide?", "Für das Login-Cookie die Ausnahme der unbedingten Erforderlichkeit prüfen. Für Werbetracking regelmäßig vorherige Einwilligung einholen. Personenbezogene Verarbeitung separat nach DSGVO prüfen."],
      ["Wann würdest du bei einem Ausfall zusätzlich zum Incident ein Problem-Ticket eröffnen?", "Wenn die Ursache ungeklärt bleibt und eine Ursachenanalyse sinnvoll ist, etwa bei einem wiederkehrenden Ausfall trotz wirksamem Workaround."]
    ]
  };
})();
