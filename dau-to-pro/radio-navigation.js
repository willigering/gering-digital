/* Keep the DAU TO PRO landing page and its AudioContext alive while
   viewing lessons in a same-origin frame. No audio restarts on navigation. */
(() => {
  'use strict';
  const radio = document.querySelector('[data-nerd-radio]');
  if (!radio) return;
  // Account/highscore routes use DENY frame headers; leave them alone.
  const links = [
    '#module-grid a.module-card[href]',
    '#module-grid a.module-open[href]',
    '.urgent-row a.module-card[href]',
    '.unterricht-grid a.module-card[href]',
    '.cheat-mini[href]', '.cheat-all[href]'
  ].join(', ');
  const home = new URL('/dau-to-pro/', location.origin);
  const originalTitle = document.title;
  const displayTitle = radio.querySelector('[data-radio-title]');
  const radioButton = name => radio.querySelector('[data-radio-' + name + ']');
  let shell, frame, titleLabel, playButton, volumeInput, lastFocus;

  function isHome(url) {
    return url.origin === home.origin &&
      (url.pathname === home.pathname || url.pathname === home.pathname + 'index.php');
  }
  function updateMini() {
    if (!shell) return;
    titleLabel.textContent = displayTitle ? displayTitle.textContent.trim() : 'NERD FM';
    const playing = radio.dataset.state === 'playing';
    playButton.textContent = playing ? 'Ⅱ' : '▶';
    playButton.setAttribute('aria-label', playing ? 'Radio pausieren' : 'Radio abspielen');
    playButton.title = playing ? 'Pause' : 'Abspielen';
    const source = radioButton('volume');
    if (source && document.activeElement !== volumeInput) volumeInput.value = source.value;
  }
  function hideModule() {
    if (!shell || shell.hidden) return;
    shell.hidden = true;
    document.documentElement.classList.remove('nrm-module-open');
    document.title = originalTitle;
    frame.removeAttribute('src');
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({preventScroll:true});
  }
  function exitModule() {
    if (history.state && history.state.dtpNerdModule) history.back();
    else hideModule();
  }
  function createShell() {
    shell = document.createElement('section');
    shell.className = 'nrm-shell';
    shell.hidden = true;
    shell.setAttribute('aria-label', 'Lerninhalt mit laufendem Radio');
    shell.innerHTML = [
      '<div class="nrm-toolbar">',
      '<button class="nrm-back" type="button" data-nrm-back aria-label="Zurück zu den Lernmodulen">← <span>Module</span></button>',
      '<div class="nrm-now" aria-label="NERD FM"><span class="nrm-live">NERD FM</span><span class="nrm-title" data-nrm-title></span></div>',
      '<div class="nrm-controls" role="group" aria-label="Radiosteuerung">',
      '<button type="button" data-nrm-prev aria-label="Vorheriger Titel" title="Vorheriger Titel">⏮</button>',
      '<button type="button" data-nrm-play aria-label="Radio pausieren" title="Pause">Ⅱ</button>',
      '<button type="button" data-nrm-next aria-label="Nächster Titel" title="Nächster Titel">⏭</button>',
      '<label class="nrm-volume"><span class="nrm-sr">Radio-Lautstärke</span><span aria-hidden="true">♪</span><input type="range" min="0" max="100" step="1" data-nrm-volume aria-label="Radio-Lautstärke"></label>',
      '</div></div>',
      '<iframe class="nrm-frame" title="Lerninhalt" referrerpolicy="same-origin"></iframe>'
    ].join('');
    document.body.append(shell);
    frame = shell.querySelector('iframe');
    titleLabel = shell.querySelector('[data-nrm-title]');
    playButton = shell.querySelector('[data-nrm-play]');
    volumeInput = shell.querySelector('[data-nrm-volume]');
    shell.querySelector('[data-nrm-back]').addEventListener('click', exitModule);
    shell.querySelector('[data-nrm-prev]').addEventListener('click', () => radioButton('prev')?.click());
    shell.querySelector('[data-nrm-next]').addEventListener('click', () => radioButton('next')?.click());
    playButton.addEventListener('click', () => radioButton('play')?.click());
    volumeInput.addEventListener('input', () => {
      const source = radioButton('volume');
      if (!source) return;
      source.value = volumeInput.value;
      source.dispatchEvent(new Event('input', {bubbles:true}));
    });
    volumeInput.addEventListener('change', () => radioButton('volume')?.dispatchEvent(new Event('change', {bubbles:true})));
    frame.addEventListener('load', () => {
      let child, address;
      try {
        child = frame.contentWindow;
        address = new URL(child.location.href);
      } catch (_) { return; }
      if (isHome(address)) { exitModule(); return; }
      if (address.protocol === 'about:') return;
      // Return links inside a lesson must not load a second radio.
      try {
        child.document.addEventListener('click', event => {
          if (event.defaultPrevented || event.button !== 0 || event.ctrlKey ||
              event.metaKey || event.shiftKey || event.altKey) return;
          const a = event.target.closest('a[href]');
          if (!a || a.target || a.hasAttribute('download')) return;
          if (isHome(new URL(a.href))) {
            event.preventDefault();
            exitModule();
          }
        }, true);
      } catch (_) { /* Content outside this origin is not inspected. */ }
    });
    updateMini();
  }
  function showModule(url, newHistory) {
    if (!shell) createShell();
    if (shell.hidden) lastFocus = document.activeElement;
    shell.hidden = false;
    document.documentElement.classList.add('nrm-module-open');
    document.title = 'Lernmodul · ' + originalTitle;
    const next = new URL(url, home);
    if (newHistory) history.pushState({dtpNerdModule:next.href}, '', next.href);
    if (frame.src !== next.href) frame.src = next.href;
    updateMini();
    shell.querySelector('[data-nrm-back]').focus({preventScroll:true});
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey ||
        event.metaKey || event.shiftKey || event.altKey) return;
    const a = event.target.closest('a[href]');
    if (!a || !a.matches(links) || a.target || a.hasAttribute('download')) return;
    const active = radio.nerdRadio && radio.nerdRadio.state;
    if (active !== 'playing' && active !== 'paused') return;
    const url = new URL(a.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    event.preventDefault();
    showModule(url.href, true);
  });
  addEventListener('popstate', event => {
    if (event.state && event.state.dtpNerdModule) showModule(event.state.dtpNerdModule, false);
    else hideModule();
  });
  if (displayTitle) new MutationObserver(updateMini)
    .observe(displayTitle, {childList:true, subtree:true, characterData:true});
  new MutationObserver(updateMini)
    .observe(radio, {attributes:true, attributeFilter:['data-state']});
})();