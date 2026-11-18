(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const type = get('loop-type');
  const size = get('loop-size');
  let steps = [];
  let cursor = 0;

  function build() {
    const kind = type.selectedIndex;
    const start = Number(size.value);
    const collection = [2, 4, 6, 8].slice(0, start);
    const body = '    Console.WriteLine(i);';
    const snippets = [
      `for (int i = ${start}; i < 3; i++)\n{\n${body}\n}`,
      `int i = ${start};\nwhile (i < 3)\n{\n${body}\n    i++;\n}`,
      `int i = ${start};\ndo\n{\n${body}\n    i++;\n} while (i < 3);`,
      `int[] werte = { ${collection.join(', ')} };\nforeach (int i in werte)\n{\n${body}\n}`
    ];
    get('loop-code').textContent = snippets[kind];
    get('loop-size-label').textContent = kind === 3 ? 'Anzahl der Elemente' : 'Startwert';
    steps = [[kind === 3 ? 'Sammlung steht bereit.' : `Startwert i = ${start}.`]];
    if (kind === 3) {
      collection.forEach(value => {
        steps.push([`Nächstes Element ist ${value}.`], [`Ausgabe von ${value}.`, value]);
      });
      steps.push(['Kein weiteres Element vorhanden. Die Schleife endet.']);
    } else {
      let value = start;
      const test = () => steps.push([`${value} < 3 ergibt ${value < 3 ? 'true' : 'false'}.`]);
      if (kind !== 2) test();
      while (value < 3 || (kind === 2 && value === start)) {
        steps.push([`Ausgabe von i = ${value}.`, value]);
        value++;
        steps.push([`i++ erhöht i auf ${value}.`]);
        test();
      }
      steps.push(['Die Schleife endet. Der Code danach ist jetzt dran.']);
    }
    cursor = 0;
    render();
  }

  function render() {
    get('loop-status').textContent = steps[cursor][0];
    get('loop-output').textContent = steps.slice(0, cursor + 1)
      .map(([, value]) => value).filter(value => value !== undefined).join(' · ') || '–';
    get('loop-step').disabled = get('loop-run').disabled = cursor === steps.length - 1;
  }

  type.addEventListener('change', build);
  size.addEventListener('change', build);
  get('loop-step').onclick = () => { cursor++; render(); };
  get('loop-run').onclick = () => { cursor = steps.length - 1; render(); };
  get('loop-reset').onclick = () => { cursor = 0; render(); };
  build();

  const tasks = [
    ['Wie oft läuft der Block?', 'for (int i = 0; i < 6; i += 2)\n{\n    Console.WriteLine(i);\n}', '3', 'i ist 0, 2 und 4. Bei 6 ist i < 6 falsch.'],
    ['Was ist die erste Ausgabe?', 'int i = 5;\ndo\n{\n    Console.WriteLine(i);\n    i++;\n} while (i < 3);', '5', 'Der Block gibt 5 aus. Die erste Prüfung erfolgt danach bei i = 6.'],
    ['Welcher Vergleichsoperator gehört an die Stelle von <=?', 'int[] zahlen = { 2, 4, 6 };\nfor (int i = 0; i <= zahlen.Length; i++)\n{\n    Console.WriteLine(zahlen[i]);\n}', '<', 'Bei drei Elementen sind die gültigen Indizes 0, 1 und 2.'],
    ['Was ist die Summe am Ende?', 'int summe = 0;\nforeach (int zahl in new[] { 3, 5, 7 })\n{\n    summe += zahl;\n}', '15', 'summe steigt von 0 auf 3, dann auf 8 und schließlich auf 15.'],
    ['Was ist die Ausgabe? Gib die Zahlen mit Kommas an.', 'for (int i = 0; i < 5; i++)\n{\n    if (i == 1) continue;\n    if (i == 3) break;\n    Console.WriteLine(i);\n}', '0,2', 'Bei 1 wird die Ausgabe übersprungen. Bei 3 endet die Schleife.'],
    ['Wie viele Durchläufe gibt es?', 'int i = 8;\nwhile (i < 4)\n{\n    i++;\n}', '0', '8 < 4 ist bereits bei der ersten Prüfung falsch.'],
    ['Welche Schleife passt, wenn das Menü mindestens einmal angezeigt werden muss? Gib den Schleifennamen ein.', '', 'dowhile', 'do … while prüft erst nach der Menüanzeige.'],
    ['Wie oft erscheint das Sternchen insgesamt?', 'for (int zeile = 0; zeile < 3; zeile++)\n{\n    for (int spalte = 0; spalte < 2; spalte++)\n    {\n        Console.Write("*");\n    }\n}', '6', 'Die innere Schleife startet für jede der drei Zeilen neu und gibt zwei Sternchen aus.']
  ];
  const panel = get('practicePanel');
  const answer = get('practice-answer');
  const result = get('practice-result');
  let current = 0;
  function paintTask() {
    const [question, code] = tasks[current];
    get('practiceKicker').textContent = `Aufgabe ${current + 1} von ${tasks.length}`;
    get('practice-question').textContent = question;
    get('practice-code').textContent = code;
    get('practice-code').parentElement.hidden = !code;
    answer.value = '';
    result.textContent = '';
    answer.focus();
  }
  get('start-practice').onclick = () => { panel.hidden = get('practiceTask').hidden = false; paintTask(); };
  get('backToLesson').onclick = () => { get('practiceTask').hidden = true; };
  const home = panel.parentElement;
  new MutationObserver(() => { if (panel.parentElement === home && !panel.hidden && get('practiceTask').hidden) panel.hidden = true; }).observe(home, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  get('practice-next').onclick = () => { current = (current + 1) % tasks.length; paintTask(); };
  get('practiceTask').addEventListener('submit', event => {
    event.preventDefault();
    const [, , expected, explanation] = tasks[current];
    const normalized = answer.value.toLowerCase().replace(/[\s.\u2026-]/g, '');
    result.textContent = normalized === expected ? `Richtig. ${explanation}` : 'Noch nicht. Geh den Ablauf Zeile für Zeile durch und versuch es erneut.';
  });
})();
