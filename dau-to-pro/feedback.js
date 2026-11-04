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
    const escapePrompts = [
        "Du schon wieder? Ich dachte, ich hätte einen Vorsprung.",
        "Ach, du bist’s. Ich war gerade kurz woanders.",
        "Du schon wieder? Mein Fluchtplan hatte nur drei Schritte.",
        "Willkommen zurück. Ich habe offiziell aufgegeben.",
        "Du hast mich erwischt. Dann rück raus mit der Idee.",
        "Du schon wieder? Beim nächsten Mal nehme ich den Seitenausgang.",
        "Da bist du ja. Ich wollte nur kurz meine Ausdauer testen.",
        "Schon wieder Feedback? Ich hole den größeren Notizblock.",
        "Okay, du hast gewonnen. Was soll ich aufschreiben?",
        "Du schon wieder? Meine Tarnung als goldener Button war wohl zu auffällig.",
        "Ich bin extra weggerutscht und trotzdem wieder hier gelandet.",
        "Du schon wieder? Ich hätte die Maus bestechen sollen.",
        "Treffer. Wenn du Bugs genauso gut fängst, wird das ein langer Abend.",
        "Da ist er wieder, der Mauszeiger meines Vertrauens.",
        "Du schon wieder? Ich übe noch an meiner Fluchtroute.",
        "Ich wollte nur kurz Abstand gewinnen. Hat mittelgut geklappt.",
        "Willkommen zurück. Den nächsten Sprint mache ich nach Feierabend.",
        "Du hast mich erwischt. Das Formular ergibt sich.",
        "Du schon wieder? Ich hätte mich hinter dem Ladebalken verstecken sollen.",
        "Schon wieder du. Gut, dass wenigstens einer von uns weiß, wo er hinwill.",
    ];
    const countKey = 'dtp-feedback-sent';
    let sentCount = 0;
    try {
        sentCount = Math.min(3, Number(localStorage.getItem(countKey)) || 0);
    } catch {
        // Keep counting on this page when browser storage is unavailable.
    }

    let lastPrompt = -1;
    let nextEscape = 0;
    let escapeAnimation;
    let escaped = false;

    trigger.hidden = false;
    trigger.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse' || sentCount < 3 || escaped || Date.now() < nextEscape
            || trigger.matches(':focus-visible') || matchMedia('(prefers-reduced-motion: reduce)').matches
            || typeof trigger.animate !== 'function') return;

        const rect = trigger.getBoundingClientRect();
        const left = rect.left > innerWidth - rect.right ? -1 : 1;
        const up = rect.top > innerHeight - rect.bottom ? -1 : 1;
        const x = left * Math.min(100, Math.max(0, (left < 0 ? rect.left : innerWidth - rect.right) - 8));
        const y = up * Math.min(64, Math.max(0, (up < 0 ? rect.top : innerHeight - rect.bottom) - 8));
        const positions = [
            {translate: '0 0'},
            {translate: `${x}px 0`},
            {translate: `${x / 2}px ${y}px`},
        ];
        if (Math.random() < .5) positions.push({translate: `${x}px ${y / 2}px`});
        positions.push({translate: '0 0'});
        escaped = true;
        nextEscape = Date.now() + 30000;
        escapeAnimation = trigger.animate(positions, {duration: (positions.length - 1) * 230, easing: 'ease-in-out'});
    });
    trigger.addEventListener('click', () => {
        escapeAnimation?.cancel();
        if (escaped) {
            escaped = false;
            intro.textContent = escapePrompts[Math.floor(Math.random() * escapePrompts.length)];
            dialog.showModal();
            return;
        }
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
            if (response.ok && result.ok) {
                form.reset();
                if (sentCount < 3) {
                    sentCount++;
                    try {
                        localStorage.setItem(countKey, String(sentCount));
                    } catch {
                        // The in-memory count still works for this page.
                    }
                }
            }
            status.textContent = result.message;
        } catch {
            status.textContent = 'Keine Verbindung. Dein Text bleibt im Formular.';
        } finally {
            send.disabled = false;
        }
    });
})();
