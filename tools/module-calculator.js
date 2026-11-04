(() => {
  'use strict';

  const calculationTypes = {
    osi: /^(d_count|d_topo|e_mss|e_frame|e_ttl|e_hops|o_seq)$/,
    netzwerke: /^(b_rate|t_mesh|t_ports|t_meshr|t_meshd|c_coll|c_bcast|c_lenrest|s_flood|s_vlan|v_zero|v_bits|x_dom|mesh_freitext)$/,
    ipv6: /^(b_total|b_block|b_hex|b_bytes|b_zeros|p_net|p_rest|u_iid|u_flip|u_mac|n_count|n_nth|n_number|n_need|n_last)$/,
    dienste: /^(t_header|c_synack|c_ack|c_fin|d_t1|d_t2|n_ttl|i_ttl)$/
  };
  const jokes = [
    'Haha, hättest du wohl gern?',
    'Netter Versuch. Die Bits zählst du heute noch selbst.',
    'Der Knopf war kurz vor der Lösung. Jetzt ist er Staub.',
    'Umrechnen per Klick? Der Button hat sich gerade aus dem Staub gemacht.'
  ];

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
    const binary = module === 'zahlen' && (/^(b2d|d2b|calc|neg)$/.test(task.cat) || /^h_(b2h|h2b)$/.test(task.sub)) && task.sub !== 'n_method'
      || module === 'subnet' && (/^o_(b2d|d2b|maskval|ones|and|bin2ip)$/.test(task.sub) || task.sub === 'm_bin')
      || module === 'ipv6' && /^(u_iid|u_flip|u_mac)$/.test(task.sub);
    const arithmetic = calculationTypes[module]?.test(task.sub)
      || /^(f2|datenschutz|sicherheit)$/.test(module) && task.kind === 'num' && task.sub !== 'n_rules'
      || module === 'f2' && /^(n_sieger|o_wahl)$/.test(task.sub)
      || module === 'zahlen' && task.kind !== 'mc' && task.sub !== 's_text'
      || module === 'subnet' && !/^(o_valid|m_valid|h_special|c_private|c_special)$/.test(task.sub);
    if (!binary && !arithmetic) return;

    const box = document.createElement('details');
    box.className = 'dtp-calculator';
    box.innerHTML = '<summary aria-label="Taschenrechner" title="Taschenrechner">'
      + '<svg width="19" height="19" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="1.5" width="12" height="17" rx="2"/><path d="M7 5h6M7 9h2m2 0h2m-6 3h2m2 0h2m-6 3h2m2 0h2"/></svg></summary>';
    box.addEventListener('toggle', function initialise() {
      if (!box.open) return;
      box.removeEventListener('toggle', initialise);
      const panel = document.createElement('div');
      panel.className = 'dtp-calculator-panel';
      panel.innerHTML = '<label>Rechnung <input type="text" maxlength="120" autocomplete="off" spellcheck="false" placeholder="z. B. (2^8 − 2) / 2"></label>'
        + '<div class="dtp-calculator-keys"></div><output aria-live="polite"></output>';
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
        try { output.textContent = '= ' + evaluate(input.value); }
        catch (_) { output.textContent = 'Die Rechnung geht so nicht auf. Prüfe Eingabe, Klammern und Division.'; }
      };
      for (const label of ['7','8','9','÷','^','4','5','6','×','(', '1','2','3','−',')','0',',','%','+','=','C']) {
        const key = button(label);
        if (label === 'C') key.setAttribute('aria-label', 'Rechnung löschen');
        key.addEventListener('click', () => {
          if (label === '=') calculate();
          else if (label === 'C') input.value = output.textContent = '';
          else {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            if (input.value.length - (end - start) < input.maxLength) input.setRangeText(label, start, end, 'end');
          }
        });
        keys.append(key);
      }
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        event.stopPropagation();
        calculate();
      });
      if (binary) {
        const trick = button('Binär → Dezimal');
        const message = document.createElement('p');
        message.setAttribute('role', 'status');
        message.className = 'dtp-calculator-joke';
        trick.addEventListener('click', () => {
          message.textContent = jokes[Math.floor(Math.random() * jokes.length)];
          box.querySelector('summary').focus({preventScroll: true});
          trick.disabled = true;
          if (!matchMedia('(prefers-reduced-motion: reduce)').matches && trick.animate) {
            const dust = document.createElement('span');
            dust.className = 'dtp-calculator-dust';
            dust.setAttribute('aria-hidden', 'true');
            trick.after(dust);
            const particles = Array.from({length: 18}, (_, index) => {
              const grain = document.createElement('i');
              grain.style.left = (index * 37 % 100) + '%';
              grain.style.top = (index * 29 % 100) + '%';
              dust.append(grain);
              return grain.animate([
                {opacity: 1, transform: 'translate(0, 0)'},
                {opacity: 0, transform: 'translate(' + ((index * 13 % 75) - 37) + 'px, ' + (-12 - index * 7 % 28) + 'px) scale(.3)'}
              ], {duration: 480, delay: index % 4 * 35, fill: 'both'}).finished;
            });
            trick.animate([{opacity: 1}, {opacity: 0, filter: 'blur(4px)'}], {duration: 420, fill: 'forwards'});
            Promise.allSettled(particles).then(() => { trick.remove(); dust.remove(); });
          } else trick.remove();
        }, {once: true});
        const prank = document.createElement('div');
        prank.className = 'dtp-calculator-prank';
        prank.append(trick);
        panel.append(prank, message);
      }
      box.append(panel);
    });
    host.append(box);
  }
  window.dtpMountCalculator = mount;
})();
