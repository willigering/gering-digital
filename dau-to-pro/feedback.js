(() => {
    const trigger = document.querySelector('.dtp-feedback-button');
    const dialog = document.querySelector('#dtp-feedback-dialog');
    if (!trigger || !dialog || typeof dialog.showModal !== 'function') return;

    const form = dialog.querySelector('form');
    const send = form.querySelector('[type="submit"]');
    const status = form.querySelector('[role="status"]');
    trigger.hidden = false;
    trigger.addEventListener('click', () => dialog.showModal());
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
