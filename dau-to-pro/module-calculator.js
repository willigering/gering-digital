(() => {
  'use strict';

  const calculationTypes = {
    osi: /^(d_count|d_topo|e_mss|e_frame|e_ttl|e_hops|o_seq)$/,
    netzwerke: /^(b_rate|t_mesh|t_ports|t_meshr|t_meshd|c_coll|c_bcast|c_lenrest|s_flood|s_vlan|v_zero|v_bits|x_dom|mesh_freitext)$/,
    ipv6: /^(b_total|b_block|b_hex|b_bytes|b_zeros|p_net|p_rest|u_iid|u_flip|u_mac|n_count|n_nth|n_number|n_need|n_last)$/,
    dienste: /^(t_header|c_synack|c_ack|c_fin|d_t1|d_t2|n_ttl|i_ttl)$/
  };
  const replies = [
    'Hättest du wohl gern.', 'Ätschbätsch.', 'Der Shortcut hat gekündigt.',
    'Das Bit bleibt bei dir.', 'Schön versucht, Tastaturcowboy.',
    'Heute rechnet die Chefetage. Du.', 'Die Taste hat sich abgemeldet.',
    'Zugriff verweigert. Frechheit erkannt.', 'Hier wird noch von Hand gebitet.',
    'Der Rechner ist gerade nur Deko. Diese Taste jedenfalls.',
    'Dein Cheatcode hat Hausverbot.', 'Die Null ist unschuldig.',
    'Die Eins sagt auch nein.', 'Frag die Zweierpotenzen.',
    'Tja. Jetzt hast du Staub.', 'Tastendruck erkannt. Abkürzung entsorgt.',
    'Die Taste war aus Sollbruchstellen.', 'Keine Sorge, der Rest hält.',
    'Hinter der Taste war nur Hoffnung.', 'Da hat jemand am falschen Port geklopft.',
    'Rechenhilfe gefunden. Hintertür zugeschweißt.', 'Hier könnte deine Lösung stehen.',
    'Die Taste war fürs gute Gefühl.', 'Firewall sagt nö.',
    'Dafür war kein Bit im Budget.', 'Premium-Abkürzung. Abo abgelehnt.',
    'Die Eins hat das Kabel gezogen.', 'Das war die Abrissbirne.',
    'Du hast gerade Hardware zu Staubware gemacht.',
    'Ticket eröffnet. Von der Taste geschlossen.',
    'Die Taste hat ihre Probezeit nicht überlebt.',
    'Umrechnung läuft. Bei dir im Kopf.'
  ];
  let remaining = [];
  let previous;
  const nextReply = () => {
    if (!remaining.length) remaining = [...replies];
    const choices = remaining.filter(reply => reply !== previous);
    previous = choices[Math.floor(Math.random() * choices.length)];
    remaining.splice(remaining.indexOf(previous), 1);
    return previous;
  };

  const names = {
    zahlen: ['BIT', 'WERK'], subnet: ['SUBNET', 'RIG'], osi: ['LAYER', 'RIG'],
    netzwerke: ['NET', 'WERK'], ipv6: ['HEX', 'CORE'], dienste: ['PORT', 'SCAN'],
    f2: ['PREIS', 'SCAN'], datenschutz: ['DATA', 'GUARD'], sicherheit: ['RISK', 'SCAN']
  };

  function floatingPanel(panel, launcher) {
    const heading = panel.querySelector('.dtp-calculator-heading');
    const close = panel.querySelector('.dtp-calculator-close');
    let drag;
    let x, y;
    const place = () => {
      x = Math.max(8, Math.min(x, document.documentElement.clientWidth - panel.offsetWidth - 8));
      y = Math.max(8, Math.min(y, window.innerHeight - panel.offsetHeight - 8));
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
    };
    panel.addEventListener('toggle', () => {
      if (!panel.matches(':popover-open')) {
        launcher.setAttribute('aria-expanded', 'false');
        return;
      }
      launcher.setAttribute('aria-expanded', 'true');
      x = (document.documentElement.clientWidth - panel.offsetWidth) / 2;
      y = (window.innerHeight - panel.offsetHeight) / 2;
      place();
    });
    close.addEventListener('click', () => {
      panel.hidePopover();
      launcher.focus({preventScroll: true});
    });
    heading.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      drag = {x: event.clientX - x, y: event.clientY - y};
      heading.setPointerCapture(event.pointerId);
    });
    heading.addEventListener('pointermove', event => {
      if (!drag) return;
      x = event.clientX - drag.x;
      y = event.clientY - drag.y;
      place();
    });
    heading.addEventListener('lostpointercapture', () => { drag = undefined; });
    new ResizeObserver(() => {
      if (panel.matches(':popover-open')) place();
    }).observe(panel);
    panel.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close.click();
    });
  }
  function evaluate(expression) {
    const source = expression.replace(/\s/g, '').replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    if (!source || source.length > 120) throw new Error();
    const tokens = source.match(/\d+(?:\.\d*)?|\.\d+|[()+*/^%-]/g) || [];
    if (tokens.join('') !== source) throw new Error();
    let index = 0;
    function primary() {
      const token = tokens[index++];
      if (token === '(') {
        const value = sum();
        if (tokens[index++] !== ')') throw new Error();
        return value;
      }
      if (!token || !/^(?:\d|\.)/.test(token)) throw new Error();
      return Number(token);
    }
    function power() {
      if (tokens[index] === '+' || tokens[index] === '-') {
        return (tokens[index++] === '-' ? -1 : 1) * power();
      }
      let value = primary();
      if (tokens[index] === '%') {
        index++;
        value /= 100;
      }
      if (tokens[index] === '^') {
        index++;
        value **= power();
      }
      return value;
    }
    function product() {
      let value = power();
      while (tokens[index] === '*' || tokens[index] === '/') {
        value = tokens[index++] === '*' ? value * power() : value / power();
      }
      return value;
    }
    function sum() {
      let value = product();
      while (tokens[index] === '+' || tokens[index] === '-') {
        value = tokens[index++] === '+' ? value + product() : value - product();
      }
      return value;
    }
    const value = sum();
    if (index !== tokens.length || !Number.isFinite(value)) throw new Error();
    return Number(value.toPrecision(15)).toLocaleString('de-DE', {useGrouping: false, maximumSignificantDigits: 15});
  }

  function mount(host, task, module) {
    const binary = module === 'zahlen' && /^(d_plain|d_octet|d_pattern|e_plain|e_ones|e_msb|e_mask|h_b2h|h_h2b|n_to|n_from|c_net)$/.test(task.sub)
      || module === 'subnet' && /^(o_b2d|o_d2b|o_maskval|o_bin2ip|m_bin)$/.test(task.sub);
    const arithmetic = calculationTypes[module]?.test(task.sub)
      || /^(f2|datenschutz|sicherheit)$/.test(module) && task.kind === 'num' && task.sub !== 'n_rules'
      || module === 'f2' && /^(n_sieger|o_wahl)$/.test(task.sub)
      || module === 'zahlen' && task.kind !== 'mc' && task.sub !== 's_text'
      || module === 'subnet' && !/^(o_valid|m_valid|h_special|c_private|c_special)$/.test(task.sub);
    if (!binary && !arithmetic) return;

    const box = document.createElement('div');
    box.className = 'dtp-calculator';
    box.innerHTML = '<button type="button" class="dtp-calculator-launcher" aria-expanded="false" aria-label="Taschenrechner" title="Taschenrechner">'
      + '<svg width="19" height="19" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="1.5" width="12" height="17" rx="2"/><path d="M7 5h6M7 9h2m2 0h2m-6 3h2m2 0h2m-6 3h2m2 0h2"/></svg></button>';
    const launcher = box.firstElementChild;
    launcher.addEventListener('click', function initialise() {
      launcher.removeEventListener('click', initialise);
      const panel = document.createElement('div');
      const [first, last] = names[module] ?? ['RECHEN', 'WERK'];
      panel.className = 'dtp-calculator-panel';
      panel.setAttribute('popover', 'manual');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', first + '//' + last);
      panel.innerHTML = '<div class="dtp-calculator-heading"><div><small>DAU TO PRO / RECHENMODUL</small>'
        + '<div class="dtp-calculator-title"><span>' + first + '</span><b>//</b><span>' + last + '</span></div></div>'
        + '<button type="button" class="dtp-calculator-close" aria-label="Taschenrechner schließen">×</button></div>'
        + '<div class="dtp-calculator-display"><label>Rechnung <input type="text" maxlength="120" autocomplete="off" spellcheck="false" placeholder="z. B. (2^8 − 2) / 2"></label>'
        + '<output aria-live="polite"></output></div><div class="dtp-calculator-keys"></div>';
      const input = panel.querySelector('input');
      const output = panel.querySelector('output');
      const keys = panel.querySelector('.dtp-calculator-keys');
      const button = label => {
        const key = document.createElement('button');
        key.type = 'button';
        key.textContent = label;
        return key;
      };
      const calculate = () => {
        output.removeAttribute('data-error');
        try { output.textContent = '= ' + evaluate(input.value); }
        catch (_) {
          output.setAttribute('data-error', '');
          output.textContent = 'Die Rechnung geht so nicht auf. Prüfe Eingabe, Klammern und Division.';
        }
      };
      const clear = button('AC');
      clear.setAttribute('aria-label', 'Rechnung löschen');
      clear.addEventListener('click', () => {
        input.value = output.textContent = '';
        output.removeAttribute('data-error');
      });
      clear.style.gridColumn = "span 3";
      keys.append(clear);
      const back = button('⌫');
      back.setAttribute('aria-label', 'Letzte Ziffer löschen');
      back.addEventListener('click', () => input.setRangeText('', input.selectionStart === input.selectionEnd ? Math.max(0, input.selectionStart - 1) : input.selectionStart, input.selectionEnd, 'end'));
      back.style.gridColumn = "span 2";
      keys.append(back);
      for (const label of ['7','8','9','÷','^','4','5','6','×','(', '1','2','3','−',')','0',',','%','+','=']) {
        const key = button(label);
        if (label === '=') {
          key.dataset.tone = 'equals';
          key.addEventListener('click', calculate);
        } else {
          if (!/[0-9,]/.test(label)) key.dataset.tone = 'operator';
          key.addEventListener('click', () => {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            if (input.value.length - (end - start) < input.maxLength) input.setRangeText(label, start, end, 'end');
          });
        }
        keys.append(key);
      }
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        event.stopPropagation();
        calculate();
      });
      if (binary) {
        const trick = button('BIN → DEC');
        const message = document.createElement('p');
        message.setAttribute('role', 'status');
        message.className = 'dtp-calculator-joke';
        trick.addEventListener('click', () => {
          message.textContent = 'GESPERRT · ' + nextReply();
          document.dispatchEvent(new Event('dtp:calculator-cheater'));
          panel.querySelector('.dtp-calculator-close').focus({preventScroll: true});
          trick.style.visibility = 'hidden';
          trick.disabled = true;
          if (!matchMedia('(prefers-reduced-motion: reduce)').matches && trick.animate) {
            const dust = document.createElement('span');
            dust.className = 'dtp-calculator-dust';
            dust.setAttribute('aria-hidden', 'true');
            trick.after(dust);
            const particles = Array.from({length: 80}, (_, index) => {
              const grain = document.createElement('i');
              grain.style.left = (index * 37 % 100) + '%';
              grain.style.top = (index * 29 % 100) + '%';
              grain.style.setProperty('--grain-size', (index < 32 ? 6 : 2) + 'px');
              dust.append(grain);
              return grain.animate([
                {opacity: 1, transform: 'translate(0, 0)'},
                {opacity: 0, transform: 'translate(' + ((index * 13 % 75) - 37) + 'px, ' + (15 + index * 7 % 53) + 'px) rotate(180deg) scale(.2)'}
              ], {duration: 530 + index % 7 * 48, fill: 'both'}).finished;
            });
            Promise.allSettled(particles).then(() => dust.remove());
          }
          setTimeout(() => { trick.style.visibility = ''; trick.disabled = false; }, 1800);
        });
        const prank = document.createElement('div');
        prank.className = 'dtp-calculator-prank';
        prank.append(trick);
        keys.before(message, prank);
      }
      box.append(panel);
      floatingPanel(panel, launcher);
      launcher.addEventListener('click', () => panel.togglePopover());
      panel.showPopover();
    });
    host.append(box);
  }
  window.dtpMountCalculator = mount;
})();

