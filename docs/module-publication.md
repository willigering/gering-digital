# Automatische Veröffentlichung

Fertige Module mit eindeutiger Slug, HTML-Datei und Vorschaumotiv in `lernmodule/manifest.json` eintragen. Ein Merge nach `main` startet den STRATO-Upload. Der Workflow schreibt erst nach vollständiger Übertragung eine atomare Release-Datei. Beim nächsten Seitenaufruf übernimmt die Website das vollständige Release in einer Datenbanktransaktion.

Neue Module werden sofort mit Vorschau veröffentlicht. Weitere Deployments aktualisieren automatisch übernommene HTML-Versionen. Bestehende manuell angelegte Projekte sowie die bisherigen URLs `/osi/` und `/subnetsprint/` bleiben erhalten; es entstehen keine doppelten Kacheln. Keine Benutzer- oder Fortschrittsdaten werden ersetzt.

Der Adminbereich bleibt verfügbar: Ausblenden, Titel, Beschreibung, Vorschau und ein separater Entwurf bleiben bei Updates erhalten. Nach einem manuellen Austausch der Live-Datei überschreibt die Automatik dieses Projekt nicht mehr. Alte Versionen werden nicht gelöscht. Ein Löschen eines automatisch verwalteten Projekts bleibt bis zum nächsten geänderten Release wirksam; zum dauerhaften Entfernen auch den Manifest-Eintrag entfernen.

Bei unvollständiger Übertragung bleibt die Veröffentlichung aus. Ein erneutes Deployment kann sie nachholen. Fehler werden im PHP-Fehlerprotokoll ausgegeben; die vorhandene Website bleibt erreichbar. `release.json` wird vom Workflow erzeugt, nicht von Hand gepflegt.
