(() => {
  'use strict';
  const trigger = document.querySelector('.hero-art-wrap');
  const dialog = document.querySelector('#sl-preview');
  if (!trigger || !dialog || typeof dialog.showModal !== 'function') return;
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    dialog.showModal();
    document.documentElement.classList.add('sl-preview-open');
  });
  dialog.querySelector('.sl-preview-close').addEventListener('click', () => dialog.close());
  let backdropPress = false;
  dialog.addEventListener('pointerdown', (event) => { backdropPress = event.target === dialog; });
  dialog.addEventListener('click', (event) => {
    if (backdropPress && event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    }
    backdropPress = false;
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('sl-preview-open');
    trigger.focus({ preventScroll: true });
  });
})();
