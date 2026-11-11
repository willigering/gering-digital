(() => {
  const dialog = document.querySelector('#showcase-picker');
  if (typeof dialog?.showModal !== 'function') return;

  const options = [...dialog.querySelectorAll('[data-showcase-value]')];
  const choices = new Map(options.map(option => [option.dataset.showcaseValue, option]));
  let current;

  document.querySelectorAll('[data-showcase-slot]').forEach(button => {
    const select = button.parentElement.querySelector('select');
    const update = () => {
      const choice = choices.get(select.value);
      button.replaceChildren(...[...choice.children].map(node => node.cloneNode(true)));
      button.setAttribute('aria-label', `Platz ${Number(button.dataset.showcaseSlot) + 1}, ${choice.lastElementChild.textContent}. Achievement auswählen`);
    };
    select.addEventListener('change', update);
    update();
    select.hidden = true;
    button.hidden = false;
    button.addEventListener('click', () => {
      current = { button, select };
      dialog.querySelector('h3').textContent = `Achievement für Platz ${Number(button.dataset.showcaseSlot) + 1}`;
      options.forEach(option => option.setAttribute('aria-pressed', String(option.dataset.showcaseValue === select.value)));
      dialog.showModal();
    });
  });

  options.forEach(option => option.addEventListener('click', () => {
    current.select.value = option.dataset.showcaseValue;
    current.select.dispatchEvent(new Event('change', { bubbles: true }));
    dialog.close();
  }));
  dialog.addEventListener('close', () => current?.button.focus());
})();
