/* Oberfläche für Finde den Fehler. Kein Server, kein Lernpfad.
   Der Seitenhintergrund und die Parallax-Formel stammen aus den C#-Unterrichtsseiten. */
(function () {
  'use strict';
  const api = window.CSHARP_FEHLER;
  const storeKey = 'dtp-csharp-fehler-solved-v1';
  const wall = document.querySelector('.dtp-backdrop');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const picker = document.getElementById('picker');
  const game = document.getElementById('game');
  const list = document.getElementById('task-list');
  const code = document.getElementById('code');
  const gutter = document.getElementById('gutter');
  const stdin = document.getElementById('stdin');
  const runView = document.getElementById('run-view');
  let current = null;

  function paintWall() {
    if (!wall) return;
    if (reduce.matches) wall.style.removeProperty('--dtp-wall-shift');
    else wall.style.setProperty('--dtp-wall-shift', (Math.atan(Math.max(0, scrollY) / 1100) * 62).toFixed(1) + 'px');
  }

  function solvedSet() {
    try {
      const raw = JSON.parse(localStorage.getItem(storeKey) || '[]');
      return new Set(Array.isArray(raw) ? raw.filter(function (id) { return typeof id === 'string'; }) : []);
    } catch (error) {
      return new Set();
    }
  }

  function remember(id) {
    const solved = solvedSet();
    solved.add(id);
    try { localStorage.setItem(storeKey, JSON.stringify(Array.from(solved))); } catch (error) { /* Anzeige bleibt trotzdem. */ }
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function paintGutter() {
    const count = code.value.split('\n').length;
    const lines = [];
    for (let i = 1; i <= count; i += 1) lines.push(String(i));
    gutter.textContent = lines.join('\n');
  }

  function renderPicker() {
    const solved = solvedSet();
    clear(list);
    api.tasks.forEach(function (task, index) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'task-card' + (solved.has(task.id) ? ' is-done' : '');
      card.appendChild(el('small', '', String(index + 1).padStart(2, '0')));
      card.appendChild(el('strong', '', task.title));
      card.appendChild(el('span', '', task.card));
      card.appendChild(el('em', '', solved.has(task.id) ? 'Gelöst' : 'Öffnen'));
      card.addEventListener('click', function () { openTask(task.id, true); });
      list.appendChild(card);
    });
  }

  function showRun(result) {
    clear(runView);
    if (result.unsupported) {
      runView.className = 'run-view';
      runView.appendChild(el('p', 'result-line warn', 'Dieser Code kann gültiges C# sein. Die Prüfung im Browser kennt das Konstrukt nicht und führt ihn nicht aus.'));
      if (result.error) runView.appendChild(el('p', 'fehler-note', result.error));
      return;
    }
    runView.className = 'run-view' + (result.error ? ' is-error' : '');
    const box = el('div', 'fehler-console');
    box.appendChild(el('div', 'cap', result.error ? 'Ausführung' : 'Konsolenausgabe'));
    const pre = document.createElement('pre');
    const parts = [];
    if (result.stdout) parts.push(result.stdout.replace(/\n$/, ''));
    if (result.error) parts.push(result.error);
    pre.textContent = parts.length ? parts.join('\n') : '(keine Ausgabe)';
    box.appendChild(pre);
    runView.appendChild(box);
  }

  function showCheck(result) {
    clear(runView);
    runView.className = 'run-view';
    if (result.status === 'unsupported') {
      runView.appendChild(el('p', 'result-line warn', 'Dieser Code kann gültiges C# sein. Die Prüfung im Browser kennt das Konstrukt nicht und wertet ihn nicht als Lösung.'));
      if (result.message) runView.appendChild(el('p', 'fehler-note', result.message));
      return;
    }
    if (!result.cases.length) {
      runView.appendChild(el('p', 'result-line bad', result.message || 'Der Code konnte nicht geprüft werden.'));
      return;
    }
    const cases = el('div', 'cases');
    result.cases.forEach(function (item) {
      const card = el('article', 'case' + (item.pass ? ' pass' : ' fail'));
      const heading = el('h3', '');
      heading.appendChild(el('span', 'tag', item.pass ? 'Bestanden' : 'Abweichung'));
      heading.appendChild(document.createTextNode(' ' + item.label));
      card.appendChild(heading);
      const mini = el('div', 'mini');
      [['Erwartet', item.expected], ['Ausgabe', item.actual || '(keine Ausgabe)']].forEach(function (pair) {
        const col = el('div', '');
        col.appendChild(el('p', '', pair[0]));
        const pre = document.createElement('pre');
        pre.textContent = pair[1];
        col.appendChild(pre);
        mini.appendChild(col);
      });
      if (item.error) {
        const col = el('div', '');
        col.appendChild(el('p', '', 'Meldung'));
        const pre = document.createElement('pre');
        pre.textContent = item.error;
        col.appendChild(pre);
        mini.appendChild(col);
      }
      card.appendChild(mini);
      cases.appendChild(card);
    });
    runView.appendChild(cases);
    if (result.ok && current) {
      remember(current.id);
      const grant = api.award(current.id);
      let xpText = 'XP wird in dieser Fassung nicht vergeben.';
      if (grant.enabled && grant.awarded > 0) xpText = 'Dafür gibt es ' + grant.awarded + ' XP.';
      else if (grant.enabled) xpText = 'Für diese Aufgabe ist das XP schon verbucht.';
      runView.appendChild(el('p', 'result-line ok', 'Alle Testfälle bestanden. ' + xpText));
    } else {
      runView.appendChild(el('p', 'result-line bad', 'Noch nicht alle Testfälle bestanden.'));
    }
  }

  function openTask(id, push) {
    const task = api.taskById(id);
    if (!task) return;
    current = task;
    document.getElementById('kicker').textContent = 'Aufgabe';
    document.getElementById('title').textContent = task.title;
    document.getElementById('order').textContent = task.order;
    document.getElementById('sample').textContent = task.sample;
    document.getElementById('sample-note').textContent = task.sampleNote;
    document.getElementById('hint').textContent = task.hint;
    code.value = task.start;
    code.defaultValue = task.start;
    stdin.value = task.sampleInput;
    clear(runView);
    runView.className = 'run-view';
    paintGutter();
    picker.hidden = true;
    game.hidden = false;
    if (push) history.pushState(null, '', '#' + encodeURIComponent(task.id));
    window.scrollTo(0, 0);
  }

  function showPicker() {
    current = null;
    game.hidden = true;
    picker.hidden = false;
    renderPicker();
    if (location.hash) history.pushState(null, '', location.pathname + location.search);
  }

  code.addEventListener('input', paintGutter);
  code.addEventListener('scroll', function () { gutter.scrollTop = code.scrollTop; });
  code.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab' || event.shiftKey) return;
    event.preventDefault();
    const start = code.selectionStart;
    const end = code.selectionEnd;
    code.value = code.value.slice(0, start) + '    ' + code.value.slice(end);
    code.selectionStart = code.selectionEnd = start + 4;
    paintGutter();
  });
  document.getElementById('back').addEventListener('click', showPicker);
  document.getElementById('run').addEventListener('click', function () {
    if (!current) return;
    showRun(api.run(code.value, stdin.value));
  });
  document.getElementById('check').addEventListener('click', function () {
    if (!current) return;
    showCheck(api.check(current.id, code.value));
  });
  document.getElementById('reset').addEventListener('click', function () {
    if (!current) return;
    code.value = current.start;
    paintGutter();
    clear(runView);
    runView.className = 'run-view';
  });
  window.addEventListener('hashchange', function () {
    const id = decodeURIComponent(location.hash.slice(1));
    if (api.taskById(id)) openTask(id, false);
    else showPicker();
  });
  addEventListener('scroll', paintWall, { passive: true });
  if (reduce.addEventListener) reduce.addEventListener('change', paintWall);
  paintWall();
  renderPicker();
  const initial = decodeURIComponent(location.hash.slice(1));
  if (api.taskById(initial)) openTask(initial, false);
})();
