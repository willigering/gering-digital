(() => {
    const trigger = document.querySelector('.dtp-feedback-button');
    const dialog = document.querySelector('#dtp-feedback-dialog');
    if (!trigger || !dialog || typeof dialog.showModal !== 'function') return;

    const form = dialog.querySelector('form');
    const send = form.querySelector('[type="submit"]');
    const status = form.querySelector('[role="status"]');
    const intro = dialog.querySelector('#dtp-feedback-intro');
    const prompts = [
        "Meckern kann jeder. Was würdest du anders machen?",
        "Der Bug ist unschuldig, bis du die Klickfolge lieferst.",
        "Wenn etwas klemmt, verrat mir, wo. WD-40 kommt dann in Schritt zwei.",
        "Was hat gehakt? Mein erster Verdacht war natürlich der Drucker.",
        "Falls du dreimal auf denselben Button klicken musstest, zählt das als Hinweis und als Fingertraining.",
        "„Geht nicht“ passt auf einen Klebezettel. Hier ist Platz für den Rest.",
        "Hat dich eine Erklärung verloren? Sag mir, an welcher Kreuzung.",
        "Du hast einen Bug gefunden? Glückwunsch. Ich hatte gehofft, er sei im Urlaub.",
        "Was hat dich aufgehalten? Die Antwort „das Internet“ nehme ich nur mit Ortsangabe.",
        "Wenn du kurz mit dem Bildschirm diskutiert hast, interessiert mich der Auslöser.",
        "Welcher Klick hätte bei dir fast zur Kündigung der Maus geführt?",
        "Schreib mir, was fehlt. Ich schaue erst nach, bevor ich behaupte, es sei ein Feature.",
        "Wenn ein Button Verstecken spielt, verrat mir sein letztes bekanntes Versteck.",
        "Was war gut? Auch gute Nachrichten überleben dieses Formular.",
        "Wenn du bei einer Aufgabe „Hä?“ gesagt hast, schreib mir, bei welchem Satz.",
        "Eine Idee fürs nächste Update? Ich habe den Werkzeugkasten schon aufgemacht.",
        "Hat etwas so gut funktioniert, dass du kurz misstrauisch wurdest? Schreib’s mir.",
        "Wenn die Anleitung einen Umweg nimmt, zeig mir die Abzweigung.",
        "Was würdest du mit einem einzigen Klick reparieren? Das Formular verspricht übrigens keinen Zauberstab.",
        "Wo hat die Seite gestottert? Ich höre auch bei Ladebalken zwischen den Zeilen.",
        "Wenn du für eine Erklärung erst eine Erklärung brauchtest, möchte ich beide kennenlernen.",
        "Was war unnötig kompliziert? Mein Maßstab ist ein USB-Stecker, der beim ersten Versuch passt.",
        "Gab’s einen Moment, in dem du lieber das Handbuch vom Router gelesen hättest?",
        "Wenn du an einer Stelle festhingst, schick mir die Koordinaten. Modul und Aufgabe reichen.",
        "Welcher Satz hat mehr Fragen erzeugt, als er beantwortet hat? Der bekommt Nachhilfe.",
        "Wo musste dein Mausrad Überstunden machen?",
        "Was würdest du einem Freund erklären müssen, bevor er hier klarkommt? Das sollte eigentlich die Seite übernehmen.",
        "Welche Kleinigkeit würde dir beim nächsten Besuch einen genervten Seufzer sparen?",
        "Hat der Taschenrechner mehr Fragen aufgeworfen als beantwortet? Sag mir, wo.",
        "Was darf bleiben, was braucht einen Schraubenzieher? Ich nehme beides.",
    ];
    let lastPrompt = -1;

    trigger.hidden = false;
    trigger.addEventListener('click', () => {
        const choice = Math.floor(Math.random() * (prompts.length - Number(lastPrompt >= 0)));
        lastPrompt = lastPrompt >= 0 && choice >= lastPrompt ? choice + 1 : choice;
        intro.textContent = prompts[lastPrompt];
        dialog.showModal();
    });
    dialog.querySelector('[data-feedback-close]').addEventListener('click', () => dialog.close());
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (send.disabled) return;
        send.disabled = true;
        status.textContent = 'Wird gesendet …';
        try {
            const response = await fetch(form.action, {method: 'POST', body: new FormData(form)});
            const result = await response.json();
            if (response.ok && result.ok) form.reset();
            status.textContent = result.message;
        } catch {
            status.textContent = 'Keine Verbindung. Dein Text bleibt im Formular.';
        } finally {
            send.disabled = false;
        }
    });
})();
