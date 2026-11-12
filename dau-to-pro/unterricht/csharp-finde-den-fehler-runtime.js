/* Finde den Fehler – C#. Aufgaben und Browser-Prüfer.
   Im Projekt gibt es keine abgesicherte C#-Laufzeit für Nutzercode.
   tests/cs_verify.cjs startet dotnet nur für mitgelieferte Schnipsel, nicht für Eingaben aus dem Browser.
   Dieser Prüfer läuft deshalb lokal im Browser, mit Schrittlimit und ohne Netzwerk.
   Er versteht die Teilmenge, die diese drei Aufgaben brauchen. Gültiges, aber nicht
   unterstütztes C# gilt nicht als falsche Lösung. Ungültiges C# gilt auch in Zweigen
   als Fehler, die zur Laufzeit nicht drankommen.
   XP bleibt aus. xp_add würde einen stabilen Schlüssel pro Konto nur einmal buchen,
   auch bei parallelen Abgaben. Es fehlt der Vergabeweg: kein Endpunkt prüft die Testfälle
   vertrauenswürdig, ohne Nutzercode auf dem Webserver auszuführen. Ein „gelöst“ im Browser
   reicht dafür nicht. Der öffentliche Fortschritt bucht nach Zählerstand, nicht pro Aufgaben-ID.
   task_xp in xp-config.json ist 2. Vorgesehener Schlüssel, falls das Review die Buchung freigibt:
   bonus:csharp-finde-den-fehler:{taskId}. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CSHARP_FEHLER = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const XP_ENABLED = false;
  const TASK_XP = 2;
  const STEP_LIMIT = 100000;
  const SOURCE_LIMIT = 20000;

  const tasks = [
    {
      id: 'csharp-fehler-euro-automat',
      title: '2-Euro-Automat',
      card: 'Drei Ergebnisse: zu wenig, passt, zu viel. Getestet mit 1, 2 und 3 Euro.',
      order: 'Der Automat unterscheidet drei Beträge. Unter 2 Euro schreibt er „Zu wenig“, bei genau 2 Euro „Betrag passt“ und über 2 Euro „Zu viel“. Der Grenzfall ist falsch. Die Prüfung startet das Programm getrennt mit 1, mit 2 und mit 3 Euro.',
      sample: 'Betrag in Euro:\n2\nBetrag passt',
      sampleNote: 'Beispiel für genau 2 Euro. Die Zeile 2 ist die Eingabe. Geprüft wird nur, was das Programm selbst schreibt.',
      sampleInput: '2\n',
      hint: 'Genau 2 Euro ist der Grenzfall. Dieser Fall darf nicht als „Zu wenig“ enden.',
      start:
        'Console.WriteLine("Betrag in Euro:");\n' +
        'string eingabe = Console.ReadLine();\n' +
        'int euro = int.Parse(eingabe);\n' +
        'if (euro < 2)\n' +
        '{\n' +
        '    Console.WriteLine("Zu wenig");\n' +
        '}\n' +
        'else if (euro > 2)\n' +
        '{\n' +
        '    Console.WriteLine("Zu viel");\n' +
        '}\n' +
        'else\n' +
        '{\n' +
        '    Console.WriteLine("Zu wenig");\n' +
        '}\n',
      cases: [
        { id: '1', label: '1 Euro', input: '1\n', output: 'Betrag in Euro:\nZu wenig' },
        { id: '2', label: '2 Euro', input: '2\n', output: 'Betrag in Euro:\nBetrag passt' },
        { id: '3', label: '3 Euro', input: '3\n', output: 'Betrag in Euro:\nZu viel' }
      ]
    },
    {
      id: 'csharp-fehler-inventur',
      title: 'Inventurliste',
      card: 'Artikel aus einem Array ausgeben. Leer, einer, mehrere.',
      order: 'Das Programm liest zuerst die Anzahl und danach jeden Artikelnamen. Anschließend gibt es die Liste nummeriert aus, in der Form „1. Maus“. Bei null Artikeln erscheint nur die Frage, sonst keine zusätzliche Zeile. Die Schleife über das Array greift ein Element zu weit. Die Prüfung nutzt eine leere Liste, einen Artikel und drei Artikel.',
      sample: 'Wie viele Artikel?\n2\nMaus\nTastatur\n1. Maus\n2. Tastatur',
      sampleNote: 'Beispiel mit zwei Artikeln. Anzahl und Namen sind Eingaben. Geprüft wird die Ausgabe des Programms.',
      sampleInput: '2\nMaus\nTastatur\n',
      hint: 'Sieh dir die zweite Schleife an. Der letzte gültige Index ist Length minus 1. Die Bedingung läuft einmal zu weit.',
      start:
        'Console.WriteLine("Wie viele Artikel?");\n' +
        'int anzahl = int.Parse(Console.ReadLine());\n' +
        'string[] artikel = new string[anzahl];\n' +
        'for (int i = 0; i < anzahl; i++)\n' +
        '{\n' +
        '    artikel[i] = Console.ReadLine();\n' +
        '}\n' +
        'for (int i = 0; i <= artikel.Length; i++)\n' +
        '{\n' +
        '    Console.WriteLine((i + 1) + ". " + artikel[i]);\n' +
        '}\n',
      cases: [
        { id: 'leer', label: 'Leere Liste', input: '0\n', output: 'Wie viele Artikel?' },
        { id: 'einer', label: 'Ein Artikel', input: '1\nMaus\n', output: 'Wie viele Artikel?\n1. Maus' },
        { id: 'mehrere', label: 'Mehrere Artikel', input: '3\nMaus\nTastatur\nMonitor\n', output: 'Wie viele Artikel?\n1. Maus\n2. Tastatur\n3. Monitor' }
      ]
    },
    {
      id: 'csharp-fehler-notenschnitt',
      title: 'Notendurchschnitt',
      card: 'Schnitt aus zwei Punktzahlen, mit und ohne Nachkommastelle.',
      order: 'Zwei Punktzahlen werden gemittelt und als „Schnitt: …“ ausgegeben. Ein Schnitt mit Nachkommastelle darf nicht abgeschnitten werden. Ein glatter Schnitt bleibt ohne Komma. Die Prüfung rechnet 2 und 4 sowie 1 und 2.',
      sample: 'Punktzahl 1:\n1\nPunktzahl 2:\n2\nSchnitt: 1,5',
      sampleNote: 'Beispiel mit Nachkommastelle. Auf einem deutschen System kann dort 1,5 stehen, sonst 1.5. Beides gilt.',
      sampleInput: '1\n2\n',
      hint: 'Beide Punktzahlen sind int. Bei der Division zweier int schneidet C# die Nachkommastelle ab. Der Schnitt braucht eine Kommazahl.',
      start:
        'Console.WriteLine("Punktzahl 1:");\n' +
        'int a = int.Parse(Console.ReadLine());\n' +
        'Console.WriteLine("Punktzahl 2:");\n' +
        'int b = int.Parse(Console.ReadLine());\n' +
        'int schnitt = (a + b) / 2;\n' +
        'Console.WriteLine("Schnitt: " + schnitt);\n',
      cases: [
        { id: 'ganz', label: 'Ohne Nachkommastelle', input: '2\n4\n', output: 'Punktzahl 1:\nPunktzahl 2:\nSchnitt: 3' },
        { id: 'komma', label: 'Mit Nachkommastelle', input: '1\n2\n', output: 'Punktzahl 1:\nPunktzahl 2:\nSchnitt: 1.5' }
      ]
    }
  ];

  function problem(line, message, name, unsupported) {
    const error = new Error(line ? 'Zeile ' + line + ': ' + message : message);
    error.line = line || null;
    error.errorName = name || 'CompileError';
    error.unsupported = !!unsupported;
    return error;
  }

  function tokenize(src) {
    const tokens = [];
    let i = 0;
    let line = 1;
    const push = (k, v) => tokens.push({ k: k, v: v, line: line });
    while (i < src.length) {
      const c = src[i];
      if (c === '\n') { line += 1; i += 1; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { i += 1; continue; }
      if (c === '/' && src[i + 1] === '/') {
        while (i < src.length && src[i] !== '\n') i += 1;
        continue;
      }
      if (c === '/' && src[i + 1] === '*') {
        i += 2;
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
          if (src[i] === '\n') line += 1;
          i += 1;
        }
        if (i >= src.length) throw problem(line, 'Kommentar nicht geschlossen.');
        i += 2;
        continue;
      }
      if (c === '"') {
        i += 1;
        let text = '';
        while (i < src.length && src[i] !== '"') {
          if (src[i] === '\n') throw problem(line, 'Zeichenkette nicht geschlossen.');
          if (src[i] === '\\') {
            const n = src[i + 1];
            if (n === undefined) throw problem(line, 'Zeichenkette nicht geschlossen.');
            text += n === 'n' ? '\n' : n === 't' ? '\t' : n === '"' || n === '\\' ? n : n;
            i += 2;
          } else {
            text += src[i];
            i += 1;
          }
        }
        if (src[i] !== '"') throw problem(line, 'Zeichenkette nicht geschlossen.');
        i += 1;
        push('str', text);
        continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        const start = line;
        let text = '';
        while (i < src.length && /[0-9]/.test(src[i])) text += src[i++];
        let kind = 'int';
        if (src[i] === '.' && /[0-9]/.test(src[i + 1] || '')) {
          kind = 'double';
          text += src[i++];
          while (i < src.length && /[0-9]/.test(src[i])) text += src[i++];
        }
        const suffix = src[i];
        if (suffix === 'd' || suffix === 'D' || suffix === 'f' || suffix === 'F') {
          kind = 'double';
          i += 1;
        } else if (suffix === 'm' || suffix === 'M') {
          throw problem(start, 'decimal wird in dieser Browser-Prüfung nicht unterstützt.', 'Unsupported', true);
        }
        const value = Number(text);
        if (kind === 'int' && (!Number.isSafeInteger(value) || value > 2147483647)) {
          throw problem(start, 'Diese ganze Zahl liegt außerhalb von int.');
        }
        push('num', { t: kind, v: value });
        continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let text = '';
        while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) text += src[i++];
        const words = { if: 1, else: 1, for: 1, foreach: 1, while: 1, in: 1, new: 1, int: 1, double: 1, string: 1, bool: 1, true: 1, false: 1, var: 1 };
        const blocked = { switch: 1, class: 1, using: 1, static: 1, return: 1, try: 1, catch: 1, public: 1, private: 1, void: 1, namespace: 1, do: 1, break: 1, continue: 1, List: 1 };
        if (blocked[text]) throw problem(line, text + ' wird in dieser Browser-Prüfung nicht unterstützt.', 'Unsupported', true);
        if (words[text]) push(text, text);
        else push('id', text);
        continue;
      }
      const two = src.slice(i, i + 2);
      if (two === '==' || two === '!=' || two === '<=' || two === '>=' || two === '&&' || two === '||' || two === '++' || two === '--' || two === '+=' || two === '-=') {
        push(two, two);
        i += 2;
        continue;
      }
      if ('(){}[];,.=+-*/%!<>?:'.indexOf(c) >= 0) {
        push(c, c);
        i += 1;
        continue;
      }
      throw problem(line, 'Unbekanntes Zeichen „' + c + '“. Diese Schreibweise kann die Browser-Prüfung nicht ausführen.', 'Unsupported', true);
    }
    push('eof', '');
    return tokens;
  }

  function parse(tokens) {
    let i = 0;
    const peek = () => tokens[i];
    const at = (k) => peek().k === k;
    const eat = (k) => {
      if (!at(k)) throw problem(peek().line, 'Hier fehlt „' + k + '“. Gefunden wurde „' + peek().k + '“.');
      return tokens[i++];
    };
    const accept = (k) => at(k) ? (i += 1, true) : false;
    const isType = () => at('int') || at('double') || at('string') || at('bool');
    const eatType = () => {
      if (!isType()) throw problem(peek().line, 'Hier fehlt ein Typ wie int oder string.');
      return eat(peek().k).k;
    };

    function block() {
      const line = peek().line;
      eat('{');
      const body = [];
      while (!at('}') && !at('eof')) body.push(statement());
      eat('}');
      return { kind: 'block', body: body, line: line };
    }

    function decl(requireSemi) {
      const line = peek().line;
      let declared;
      let elem = null;
      if (accept('var')) declared = 'var';
      else {
        declared = eatType();
        if (accept('[')) {
          eat(']');
          elem = declared;
          declared = 'array';
        }
      }
      const name = eat('id').v;
      eat('=');
      let init;
      if (at('{')) {
        eat('{');
        const items = [];
        if (!at('}')) {
          items.push(expr());
          while (accept(',')) {
            if (at('}')) break;
            items.push(expr());
          }
        }
        eat('}');
        init = { kind: 'init', items: items, elem: elem, line: line };
      } else init = expr();
      if (requireSemi) eat(';');
      return { kind: 'decl', declared: declared, elem: elem, name: name, init: init, line: line };
    }

    function assignment(requireSemi) {
      const line = peek().line;
      if (at('++') || at('--')) {
        const op = eat(peek().k).k === '++' ? 1 : -1;
        const name = eat('id').v;
        if (requireSemi) eat(';');
        return { kind: 'pre', name: name, op: op, line: line };
      }
      const name = eat('id').v;
      if (accept('[')) {
        const index = expr();
        eat(']');
        const op = peek().k;
        if (op !== '=' && op !== '+=' && op !== '-=') throw problem(line, 'Hier fehlt eine Zuweisung.');
        eat(op);
        const value = expr();
        if (requireSemi) eat(';');
        return { kind: 'aset', name: name, index: index, op: op, value: value, line: line };
      }
      if (accept('++')) {
        if (requireSemi) eat(';');
        return { kind: 'post', name: name, op: 1, line: line };
      }
      if (accept('--')) {
        if (requireSemi) eat(';');
        return { kind: 'post', name: name, op: -1, line: line };
      }
      const op = peek().k;
      if (op !== '=' && op !== '+=' && op !== '-=') throw problem(line, 'Diese Anweisung kann die Browser-Prüfung nicht ausführen.', 'Unsupported', true);
      eat(op);
      const value = expr();
      if (requireSemi) eat(';');
      return { kind: 'assign', name: name, op: op, value: value, line: line };
    }

    function statement() {
      if (at('{')) return block();
      if (at('if')) {
        const line = peek().line;
        eat('if');
        eat('(');
        const cond = expr();
        eat(')');
        const then = statement();
        const els = accept('else') ? statement() : null;
        return { kind: 'if', cond: cond, then: then, els: els, line: line };
      }
      if (at('while')) {
        const line = peek().line;
        eat('while');
        eat('(');
        const cond = expr();
        eat(')');
        return { kind: 'while', cond: cond, body: statement(), line: line };
      }
      if (at('for')) {
        const line = peek().line;
        eat('for');
        eat('(');
        const init = at(';') ? null : (isType() || at('var') ? decl(false) : assignment(false));
        eat(';');
        const cond = at(';') ? null : expr();
        eat(';');
        const update = at(')') ? null : assignment(false);
        eat(')');
        return { kind: 'for', init: init, cond: cond, update: update, body: statement(), line: line };
      }
      if (at('foreach')) {
        const line = peek().line;
        eat('foreach');
        eat('(');
        const declared = eatType();
        const name = eat('id').v;
        eat('in');
        const collection = expr();
        eat(')');
        return { kind: 'foreach', declared: declared, name: name, collection: collection, body: statement(), line: line };
      }
      if (accept(';')) return { kind: 'empty', line: peek().line };
      if (isType() || at('var')) return decl(true);
      if (at('id') && peek().v === 'Console' && tokens[i + 1] && tokens[i + 1].k === '.') {
        const line = peek().line;
        eat('id');
        eat('.');
        const method = eat('id').v;
        if (method !== 'WriteLine' && method !== 'Write') {
          throw problem(line, 'Console.' + method + ' wird in dieser Browser-Prüfung nicht unterstützt.', 'Unsupported', true);
        }
        eat('(');
        const value = at(')') ? null : expr();
        eat(')');
        eat(';');
        return { kind: 'write', method: method, value: value, line: line };
      }
      return assignment(true);
    }

    function expr() { return conditional(); }
    function conditional() {
      const left = or();
      if (!accept('?')) return left;
      const yes = expr();
      eat(':');
      const no = expr();
      return { kind: 'cond', cond: left, yes: yes, no: no, line: left.line };
    }
    function or() { return bin(and, ['||']); }
    function and() { return bin(equality, ['&&']); }
    function equality() { return bin(compare, ['==', '!=']); }
    function compare() { return bin(add, ['<', '>', '<=', '>=']); }
    function add() { return bin(mul, ['+', '-']); }
    function mul() { return bin(unary, ['*', '/', '%']); }
    function bin(next, ops) {
      let left = next();
      while (ops.indexOf(peek().k) >= 0) {
        const op = eat(peek().k).k;
        const right = next();
        left = { kind: 'bin', op: op, left: left, right: right, line: left.line };
      }
      return left;
    }
    function unary() {
      const line = peek().line;
      if (accept('!')) return { kind: 'un', op: '!', expr: unary(), line: line };
      if (accept('-')) return { kind: 'un', op: '-', expr: unary(), line: line };
      if (accept('+')) return { kind: 'un', op: '+', expr: unary(), line: line };
      if (at('(') && tokens[i + 1] && (tokens[i + 1].k === 'int' || tokens[i + 1].k === 'double' || tokens[i + 1].k === 'string' || tokens[i + 1].k === 'bool') && tokens[i + 2] && tokens[i + 2].k === ')') {
        eat('(');
        const type = eatType();
        eat(')');
        return { kind: 'cast', type: type, expr: unary(), line: line };
      }
      return postfix();
    }
    function postfix() {
      let node = primary();
      while (true) {
        if (accept('.')) {
          const name = eat('id').v;
          if (accept('(')) {
            const args = argList();
            node = { kind: 'call', target: node, name: name, args: args, line: node.line };
          } else node = { kind: 'member', target: node, name: name, line: node.line };
        } else if (accept('[')) {
          const index = expr();
          eat(']');
          node = { kind: 'index', target: node, index: index, line: node.line };
        } else break;
      }
      return node;
    }
    function argList() {
      const args = [];
      if (!at(')')) {
        args.push(expr());
        while (accept(',')) args.push(expr());
      }
      eat(')');
      return args;
    }
    function primary() {
      const tok = peek();
      if (tok.k === 'num') { i += 1; return { kind: 'lit', value: tok.v, line: tok.line }; }
      if (tok.k === 'str') { i += 1; return { kind: 'lit', value: { t: 'string', v: tok.v }, line: tok.line }; }
      if (tok.k === 'true' || tok.k === 'false') {
        i += 1;
        return { kind: 'lit', value: { t: 'bool', v: tok.k === 'true' }, line: tok.line };
      }
      if ((tok.k === 'int' || tok.k === 'double' || tok.k === 'string') && tokens[i + 1] && tokens[i + 1].k === '.') {
        const type = eat(tok.k).k;
        eat('.');
        const name = eat('id').v;
        eat('(');
        return { kind: 'static', type: type, name: name, args: argList(), line: tok.line };
      }
      if (tok.k === 'id') { i += 1; return { kind: 'var', name: tok.v, line: tok.line }; }
      if (accept('(')) { const inner = expr(); eat(')'); return inner; }
      if (accept('new')) {
        const elem = eatType();
        eat('[');
        const size = expr();
        eat(']');
        return { kind: 'new', elem: elem, size: size, line: tok.line };
      }
      if (tok.k === 'eof' || tok.k === ')' || tok.k === ']' || tok.k === '}' || tok.k === ';' || tok.k === ',') {
        throw problem(tok.line, 'Dieser Ausdruck kann hier nicht gelesen werden.');
      }
      throw problem(tok.line, 'Dieser Ausdruck kann hier nicht gelesen werden.', 'Unsupported', true);
    }

    const body = [];
    while (!at('eof')) body.push(statement());
    return body;
  }

  function formatDouble(n) {
    if (!Number.isFinite(n)) return String(n);
    if (Object.is(n, -0)) return '0';
    if (Math.abs(n) < 1e15 && Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    let text = n.toPrecision(12);
    if (/e/i.test(text)) return String(n);
    if (text.indexOf('.') >= 0) text = text.replace(/0+$/, '').replace(/\.$/, '');
    return text;
  }

  function formatValue(value) {
    if (!value || value.t === 'null') return '';
    if (value.t === 'bool') return value.v ? 'True' : 'False';
    if (value.t === 'int') return String(value.v);
    if (value.t === 'double') return formatDouble(value.v);
    if (value.t === 'string') return value.v;
    return '';
  }

  function execute(program, stdin) {
    const scopes = [new Map()];
    const lines = stdinLines(stdin);
    let pointer = 0;
    let stdout = '';
    let steps = 0;

    function crash(line, name, message) {
      const error = problem(line, message, name, name === 'Unsupported');
      error.errorName = name;
      throw error;
    }
    function tick(line) {
      steps += 1;
      if (steps > STEP_LIMIT) crash(line, 'Timeout', 'Abbruch nach zu vielen Schritten. Die Schleife findet kein Ende.');
    }
    function current() { return scopes[scopes.length - 1]; }
    function lookup(name, line) {
      for (let s = scopes.length - 1; s >= 0; s -= 1) {
        if (scopes[s].has(name)) return scopes[s].get(name);
      }
      crash(line, 'CompileError', '„' + name + '“ ist hier nicht bekannt.');
    }
    function set(name, value, line) {
      for (let s = scopes.length - 1; s >= 0; s -= 1) {
        if (scopes[s].has(name)) { scopes[s].set(name, value); return; }
      }
      crash(line, 'CompileError', '„' + name + '“ ist hier nicht bekannt.');
    }
    function readLine() {
      if (pointer >= lines.length) return { t: 'null', v: null };
      const line = lines[pointer];
      pointer += 1;
      return { t: 'string', v: line };
    }
    function asBool(value, line) {
      if (!value || value.t !== 'bool') crash(line, 'CompileError', 'Die Bedingung muss true oder false ergeben.');
      return value.v;
    }
    function num(value, line) {
      if (!value || (value.t !== 'int' && value.t !== 'double')) crash(line, 'RuntimeException', 'Hier wird eine Zahl erwartet.');
      return value.v;
    }
    function add(left, right, line) {
      if ((left && left.t === 'string') || (right && right.t === 'string') || (left && left.t === 'null') || (right && right.t === 'null')) {
        if ((left && left.t === 'string') || (right && right.t === 'string')) return { t: 'string', v: formatValue(left) + formatValue(right) };
      }
      if (left && right && (left.t === 'string' || right.t === 'string')) return { t: 'string', v: formatValue(left) + formatValue(right) };
      const ld = left && left.t === 'double';
      const rd = right && right.t === 'double';
      if (!left || !right || (left.t !== 'int' && left.t !== 'double') || (right.t !== 'int' && right.t !== 'double')) {
        crash(line, 'CompileError', 'Diese Werte kann + hier nicht verbinden.');
      }
      if (ld || rd) return { t: 'double', v: left.v + right.v };
      return { t: 'int', v: left.v + right.v };
    }
    function arith(op, left, right, line) {
      const lf = num(left, line);
      const rt = num(right, line);
      const isDouble = left.t === 'double' || right.t === 'double';
      if (op === '-' ) return isDouble ? { t: 'double', v: lf - rt } : { t: 'int', v: lf - rt };
      if (op === '*') return isDouble ? { t: 'double', v: lf * rt } : { t: 'int', v: lf * rt };
      if (rt === 0 && !isDouble) crash(line, 'DivideByZeroException', 'Teilen durch 0.');
      if (op === '/') return isDouble ? { t: 'double', v: lf / rt } : { t: 'int', v: Math.trunc(lf / rt) };
      if (op === '%') {
        if (rt === 0) crash(line, 'DivideByZeroException', 'Rest durch 0.');
        return isDouble ? { t: 'double', v: lf % rt } : { t: 'int', v: Math.trunc(lf % rt) };
      }
      crash(line, 'RuntimeException', 'Unbekannter Rechenoperator.');
    }
    function compare(op, left, right, line) {
      if (left && right && (left.t === 'string' || right.t === 'string' || left.t === 'null' || right.t === 'null')) {
        if (op !== '==' && op !== '!=') crash(line, 'CompileError', 'Texte lassen sich hier nur auf Gleichheit prüfen.');
        const same = formatValue(left) === formatValue(right) && (!left || left.t !== 'null') === (!right || right.t !== 'null' || right.t === 'string');
        const eq = (left && left.t === 'null' && right && right.t === 'null') || (left && right && left.t === 'string' && right.t === 'string' && left.v === right.v);
        return { t: 'bool', v: op === '==' ? eq : !eq };
      }
      const lf = num(left, line);
      const rt = num(right, line);
      const ok = op === '==' ? lf === rt : op === '!=' ? lf !== rt : op === '<' ? lf < rt : op === '>' ? lf > rt : op === '<=' ? lf <= rt : lf >= rt;
      return { t: 'bool', v: ok };
    }
    function fit(declared, elem, value, line) {
      if (declared === 'var') {
        if (!value || value.t === 'null') crash(line, 'CompileError', 'var braucht einen erkennbaren Startwert.');
        return value;
      }
      if (declared === 'int') {
        if (value && value.t === 'int') return value;
        crash(line, 'CompileError', 'Dieser Wert passt nicht in int.');
      }
      if (declared === 'double') {
        if (value && value.t === 'double') return value;
        if (value && value.t === 'int') return { t: 'double', v: value.v };
        crash(line, 'CompileError', 'Dieser Wert passt nicht in double.');
      }
      if (declared === 'string') {
        if (value && (value.t === 'string' || value.t === 'null')) return value;
        crash(line, 'CompileError', 'Dieser Wert passt nicht in string.');
      }
      if (declared === 'bool') {
        if (value && value.t === 'bool') return value;
        crash(line, 'CompileError', 'Dieser Wert passt nicht in bool.');
      }
      if (declared === 'array') {
        if (!value || value.t !== 'array') crash(line, 'CompileError', 'Hier wird ein Array erwartet.');
        if (elem && value.elem && value.elem !== elem) crash(line, 'CompileError', 'Der Array-Typ passt nicht.');
        return value;
      }
      crash(line, 'CompileError', 'Unbekannter Typ.');
    }
    function indexOf(array, index, line) {
      if (!array || array.t !== 'array') crash(line, 'RuntimeException', 'Das ist kein Array.');
      if (!index || index.t !== 'int') crash(line, 'CompileError', 'Der Index muss eine ganze Zahl sein.');
      if (index.v < 0 || index.v >= array.items.length) crash(line, 'IndexOutOfRangeException', 'Der Index lag außerhalb des Arrays.');
      return index.v;
    }
    function evalExpr(node) {
      if (node.kind === 'lit') return node.value;
      if (node.kind === 'var') return lookup(node.name, node.line);
      if (node.kind === 'cond') return asBool(evalExpr(node.cond), node.line) ? evalExpr(node.yes) : evalExpr(node.no);
      if (node.kind === 'un') {
        const value = evalExpr(node.expr);
        if (node.op === '!') {
          if (!value || value.t !== 'bool') crash(node.line, 'CompileError', '! braucht true oder false.');
          return { t: 'bool', v: !value.v };
        }
        const n = num(value, node.line);
        if (node.op === '+') return value;
        return { t: value.t, v: -n };
      }
      if (node.kind === 'cast') {
        const value = evalExpr(node.expr);
        if (node.type === 'double') {
          if (value && (value.t === 'double' || value.t === 'int')) return { t: 'double', v: value.v };
          crash(node.line, 'CompileError', 'Das lässt sich hier nicht in double umwandeln.');
        }
        if (node.type === 'int') {
          if (value && value.t === 'int') return value;
          if (value && value.t === 'double') return { t: 'int', v: Math.trunc(value.v) };
          crash(node.line, 'CompileError', 'Das lässt sich hier nicht in int umwandeln.');
        }
        crash(node.line, 'Unsupported', 'Diese Umwandlung wird in der Browser-Prüfung nicht unterstützt.');
      }
      if (node.kind === 'new') {
        const size = evalExpr(node.size);
        if (!size || size.t !== 'int') crash(node.line, 'CompileError', 'Die Array-Größe muss eine ganze Zahl sein.');
        if (size.v < 0) crash(node.line, 'OverflowException', 'Ein Array kann nicht negativ groß sein.');
        if (size.v > 100000) crash(node.line, 'Limit', 'Dieses Array ist für die Browser-Prüfung zu groß.');
        return { t: 'array', elem: node.elem, items: new Array(size.v).fill(null) };
      }
      if (node.kind === 'init') {
        const items = node.items.map(evalExpr);
        return { t: 'array', elem: node.elem || (items[0] ? items[0].t : 'string'), items: items };
      }
      if (node.kind === 'index') {
        const array = evalExpr(node.target);
        const atIndex = indexOf(array, evalExpr(node.index), node.line);
        const item = array.items[atIndex];
        return item == null ? { t: 'null', v: null } : item;
      }
      if (node.kind === 'member') {
        const target = evalExpr(node.target);
        if (node.name === 'Length') {
          if (target && target.t === 'array') return { t: 'int', v: target.items.length };
          if (target && target.t === 'string') return { t: 'int', v: target.v.length };
          crash(node.line, 'RuntimeException', 'Length gibt es hier nicht.');
        }
        crash(node.line, 'Unsupported', node.name + ' wird in dieser Browser-Prüfung nicht unterstützt.');
      }
      if (node.kind === 'static') {
        if ((node.type === 'int' || node.type === 'double') && node.name === 'Parse' && node.args.length === 1) {
          const raw = evalExpr(node.args[0]);
          if (!raw || raw.t === 'null') crash(node.line, 'ArgumentNullException', 'Parse hat keinen Text bekommen.');
          if (raw.t !== 'string') crash(node.line, 'CompileError', 'Parse erwartet einen Text.');
          const text = raw.v.trim();
          if (node.type === 'int') {
            if (!/^[+-]?\d+$/.test(text)) crash(node.line, 'FormatException', '„' + raw.v + '“ ist keine ganze Zahl.');
            const n = Number(text);
            if (!Number.isSafeInteger(n) || n > 2147483647 || n < -2147483648) crash(node.line, 'OverflowException', 'Die Zahl passt nicht in int.');
            return { t: 'int', v: n };
          }
          const normal = text.replace(',', '.');
          if (!/^[+-]?\d+(\.\d+)?$/.test(normal)) crash(node.line, 'FormatException', '„' + raw.v + '“ ist keine Kommazahl.');
          return { t: 'double', v: Number(normal) };
        }
        crash(node.line, 'Unsupported', node.type + '.' + node.name + ' wird in dieser Browser-Prüfung nicht unterstützt.');
      }
      if (node.kind === 'call') {
        if (node.target.kind === 'var' && node.target.name === 'Console' && node.name === 'ReadLine' && node.args.length === 0) return readLine();
        if (node.name === 'ToString' && node.args.length === 0) return { t: 'string', v: formatValue(evalExpr(node.target)) };
        crash(node.line, 'Unsupported', node.name + ' wird in dieser Browser-Prüfung nicht unterstützt.');
      }
      if (node.kind === 'bin') {
        if (node.op === '||' || node.op === '&&') {
          const left = evalExpr(node.left);
          if (!left || left.t !== 'bool') crash(node.line, 'CompileError', node.op + ' braucht true oder false.');
          if (node.op === '||') return left.v ? left : evalExpr(node.right);
          return left.v ? evalExpr(node.right) : left;
        }
        if (node.op === '+') return add(evalExpr(node.left), evalExpr(node.right), node.line);
        if (node.op === '-' || node.op === '*' || node.op === '/' || node.op === '%') return arith(node.op, evalExpr(node.left), evalExpr(node.right), node.line);
        return compare(node.op, evalExpr(node.left), evalExpr(node.right), node.line);
      }
      crash(node.line, 'Unsupported', 'Dieser Ausdruck wird in der Browser-Prüfung nicht unterstützt.');
    }
    function runStmt(node) {
      tick(node.line);
      if (node.kind === 'empty') return;
      if (node.kind === 'block') {
        scopes.push(new Map());
        node.body.forEach(runStmt);
        scopes.pop();
        return;
      }
      if (node.kind === 'decl') {
        if (current().has(node.name)) crash(node.line, 'CompileError', '„' + node.name + '“ gibt es in diesem Block schon.');
        current().set(node.name, fit(node.declared, node.elem, evalExpr(node.init), node.line));
        return;
      }
      if (node.kind === 'assign') {
        const now = lookup(node.name, node.line);
        let value = evalExpr(node.value);
        if (node.op === '+=') value = add(now, value, node.line);
        else if (node.op === '-=') value = arith('-', now, value, node.line);
        set(node.name, value, node.line);
        return;
      }
      if (node.kind === 'post' || node.kind === 'pre') {
        const now = lookup(node.name, node.line);
        if (!now || now.t !== 'int') crash(node.line, 'CompileError', '++ und -- brauchen hier eine int-Variable.');
        set(node.name, { t: 'int', v: now.v + node.op }, node.line);
        return;
      }
      if (node.kind === 'aset') {
        const array = lookup(node.name, node.line);
        const atIndex = indexOf(array, evalExpr(node.index), node.line);
        let value = evalExpr(node.value);
        const currentItem = array.items[atIndex] == null ? { t: 'null', v: null } : array.items[atIndex];
        if (node.op === '+=') value = add(currentItem, value, node.line);
        else if (node.op === '-=') value = arith('-', currentItem, value, node.line);
        if (array.elem === 'string' && value && value.t !== 'string' && value.t !== 'null') crash(node.line, 'CompileError', 'In dieses Array passt nur Text.');
        if (array.elem === 'int' && (!value || value.t !== 'int')) crash(node.line, 'CompileError', 'In dieses Array passt nur int.');
        array.items[atIndex] = value && value.t === 'null' ? null : value;
        return;
      }
      if (node.kind === 'write') {
        const text = node.value ? formatValue(evalExpr(node.value)) : '';
        stdout += text;
        if (node.method === 'WriteLine') stdout += '\n';
        return;
      }
      if (node.kind === 'if') {
        if (asBool(evalExpr(node.cond), node.line)) runStmt(node.then);
        else if (node.els) runStmt(node.els);
        return;
      }
      if (node.kind === 'while') {
        while (asBool(evalExpr(node.cond), node.line)) runStmt(node.body);
        return;
      }
      if (node.kind === 'for') {
        scopes.push(new Map());
        if (node.init) runStmt(node.init);
        while (!node.cond || asBool(evalExpr(node.cond), node.line)) {
          runStmt(node.body);
          if (node.update) runStmt(node.update);
        }
        scopes.pop();
        return;
      }
      if (node.kind === 'foreach') {
        const array = evalExpr(node.collection);
        if (!array || array.t !== 'array') crash(node.line, 'RuntimeException', 'foreach braucht hier ein Array.');
        array.items.forEach(function (item) {
          scopes.push(new Map());
          current().set(node.name, fit(node.declared, null, item == null ? { t: 'null', v: null } : item, node.line));
          runStmt(node.body);
          scopes.pop();
        });
        return;
      }
      crash(node.line, 'Unsupported', 'Diese Anweisung wird in der Browser-Prüfung nicht unterstützt.');
    }

    try {
      program.forEach(runStmt);
      return { stdout: stdout, error: null, errorName: null, line: null, unsupported: false, compile: false };
    } catch (error) {
      return {
        stdout: stdout,
        error: error.message,
        errorName: error.errorName || 'RuntimeException',
        line: error.line || null,
        unsupported: !!error.unsupported,
        compile: error.errorName === 'CompileError' || error.errorName === 'Unsupported'
      };
    }
  }

  function staticCheck(program) {
    const scopes = [new Map()];
    const simple = { int: 1, double: 1, string: 1, bool: 1, null: 1 };
    function current() { return scopes[scopes.length - 1]; }
    function fail(line, message) { throw problem(line, message); }
    function unsupported(line, message) { throw problem(line, message, 'Unsupported', true); }
    function lookup(name, line) {
      for (let s = scopes.length - 1; s >= 0; s -= 1) {
        if (scopes[s].has(name)) return scopes[s].get(name);
      }
      fail(line, '„' + name + '“ ist hier nicht bekannt.');
    }
    function isNum(type) { return type && (type.t === 'int' || type.t === 'double'); }
    function accept(dest, src, line) {
      if (!src) fail(line, 'Hier fehlt ein Wert.');
      if (dest.t === 'int') {
        if (src.t === 'int') return { t: 'int' };
        fail(line, 'Dieser Wert passt nicht in int.');
      }
      if (dest.t === 'double') {
        if (src.t === 'double' || src.t === 'int') return { t: 'double' };
        fail(line, 'Dieser Wert passt nicht in double.');
      }
      if (dest.t === 'string') {
        if (src.t === 'string' || src.t === 'null') return { t: 'string' };
        fail(line, 'Dieser Wert passt nicht in string.');
      }
      if (dest.t === 'bool') {
        if (src.t === 'bool') return { t: 'bool' };
        fail(line, 'Dieser Wert passt nicht in bool.');
      }
      if (dest.t === 'array') {
        if (src.t !== 'array') fail(line, 'Hier wird ein Array erwartet.');
        if (dest.elem && src.elem && dest.elem !== src.elem) fail(line, 'Der Array-Typ passt nicht.');
        return { t: 'array', elem: dest.elem || src.elem };
      }
      fail(line, 'Unbekannter Typ.');
    }
    function plusType(left, right, line) {
      if ((left.t === 'string' || right.t === 'string') && simple[left.t] && simple[right.t]) return { t: 'string' };
      if (isNum(left) && isNum(right)) return { t: left.t === 'double' || right.t === 'double' ? 'double' : 'int' };
      fail(line, 'Diese Werte kann + hier nicht verbinden.');
    }
    function arithType(left, right, line) {
      if (!isNum(left) || !isNum(right)) fail(line, 'Hier wird eine Zahl erwartet.');
      return { t: left.t === 'double' || right.t === 'double' ? 'double' : 'int' };
    }
    function common(left, right, line) {
      if (left.t === 'string' && right.t === 'string') return { t: 'string' };
      if (isNum(left) && isNum(right)) return { t: left.t === 'double' || right.t === 'double' ? 'double' : 'int' };
      if (left.t === 'bool' && right.t === 'bool') return { t: 'bool' };
      if (left.t === 'array' && right.t === 'array' && left.elem === right.elem) return { t: 'array', elem: left.elem };
      fail(line, 'Die beiden Zweige haben keinen gemeinsamen Typ.');
    }
    function demandBool(type, line) {
      if (!type || type.t !== 'bool') fail(line, 'Die Bedingung muss true oder false ergeben.');
    }
    function typeOf(node) {
      if (node.kind === 'lit') return { t: node.value.t };
      if (node.kind === 'var') return lookup(node.name, node.line);
      if (node.kind === 'un') {
        const value = typeOf(node.expr);
        if (node.op === '!') {
          if (value.t !== 'bool') fail(node.line, '! braucht true oder false.');
          return { t: 'bool' };
        }
        if (!isNum(value)) fail(node.line, 'Hier wird eine Zahl erwartet.');
        return { t: value.t };
      }
      if (node.kind === 'cast') {
        const value = typeOf(node.expr);
        if (node.type === 'int' && (value.t === 'int' || value.t === 'double')) return { t: 'int' };
        if (node.type === 'double' && (value.t === 'int' || value.t === 'double')) return { t: 'double' };
        if ((node.type === 'int' || node.type === 'double') && !isNum(value)) fail(node.line, 'Das lässt sich hier nicht in ' + node.type + ' umwandeln.');
        unsupported(node.line, 'Diese Umwandlung wird in der Browser-Prüfung nicht unterstützt.');
      }
      if (node.kind === 'new') {
        const size = typeOf(node.size);
        if (size.t !== 'int') fail(node.line, 'Die Array-Größe muss eine ganze Zahl sein.');
        return { t: 'array', elem: node.elem };
      }
      if (node.kind === 'init') {
        const items = node.items.map(typeOf);
        const elem = node.elem || (items[0] ? items[0].t : 'string');
        items.forEach(function (item) { accept({ t: elem }, item, node.line); });
        return { t: 'array', elem: elem };
      }
      if (node.kind === 'index') {
        const array = typeOf(node.target);
        const index = typeOf(node.index);
        if (array.t !== 'array') fail(node.line, 'Das ist kein Array.');
        if (index.t !== 'int') fail(node.line, 'Der Index muss eine ganze Zahl sein.');
        return { t: array.elem || 'string' };
      }
      if (node.kind === 'member') {
        const target = typeOf(node.target);
        if (node.name === 'Length' && (target.t === 'array' || target.t === 'string')) return { t: 'int' };
        if (node.name === 'Length') fail(node.line, 'Length gibt es hier nicht.');
        unsupported(node.line, node.name + ' wird in dieser Browser-Prüfung nicht unterstützt.');
      }
      if (node.kind === 'static') {
        if ((node.type === 'int' || node.type === 'double') && node.name === 'Parse' && node.args.length === 1) {
          const arg = typeOf(node.args[0]);
          if (arg.t !== 'string' && arg.t !== 'null') fail(node.line, 'Parse erwartet einen Text.');
          return { t: node.type };
        }
        unsupported(node.line, node.type + '.' + node.name + ' wird in dieser Browser-Prüfung nicht unterstützt.');
      }
      if (node.kind === 'call') {
        if (node.target.kind === 'var' && node.target.name === 'Console' && node.name === 'ReadLine' && node.args.length === 0) return { t: 'string' };
        if (node.name === 'ToString' && node.args.length === 0) {
          const target = typeOf(node.target);
          if (simple[target.t] && target.t !== 'null') return { t: 'string' };
        }
        unsupported(node.line, node.name + ' wird in dieser Browser-Prüfung nicht unterstützt.');
      }
      if (node.kind === 'cond') {
        demandBool(typeOf(node.cond), node.line);
        return common(typeOf(node.yes), typeOf(node.no), node.line);
      }
      if (node.kind === 'bin') {
        if (node.op === '||' || node.op === '&&') {
          demandBool(typeOf(node.left), node.line);
          demandBool(typeOf(node.right), node.line);
          return { t: 'bool' };
        }
        const left = typeOf(node.left);
        const right = typeOf(node.right);
        if (node.op === '+') return plusType(left, right, node.line);
        if (node.op === '-' || node.op === '*' || node.op === '/' || node.op === '%') return arithType(left, right, node.line);
        if (node.op === '==' || node.op === '!=') {
          const bothNum = isNum(left) && isNum(right);
          const bothText = (left.t === 'string' || left.t === 'null') && (right.t === 'string' || right.t === 'null');
          const bothBool = left.t === 'bool' && right.t === 'bool';
          if (!bothNum && !bothText && !bothBool) fail(node.line, 'Diese Werte lassen sich hier nicht vergleichen.');
          return { t: 'bool' };
        }
        if (!isNum(left) || !isNum(right)) fail(node.line, 'Hier lassen sich nur Zahlen vergleichen.');
        return { t: 'bool' };
      }
      unsupported(node.line, 'Dieser Ausdruck wird in der Browser-Prüfung nicht unterstützt.');
    }
    function walk(node) {
      if (node.kind === 'empty') return;
      if (node.kind === 'block') {
        scopes.push(new Map());
        node.body.forEach(walk);
        scopes.pop();
        return;
      }
      if (node.kind === 'decl') {
        const actual = typeOf(node.init);
        let stored;
        if (node.declared === 'var') {
          if (!actual || actual.t === 'null') fail(node.line, 'var braucht einen erkennbaren Startwert.');
          stored = actual;
        } else if (node.declared === 'array') stored = accept({ t: 'array', elem: node.elem }, actual, node.line);
        else stored = accept({ t: node.declared }, actual, node.line);
        if (current().has(node.name)) fail(node.line, '„' + node.name + '“ gibt es in diesem Block schon.');
        current().set(node.name, stored);
        return;
      }
      if (node.kind === 'assign') {
        const now = lookup(node.name, node.line);
        const value = typeOf(node.value);
        const next = node.op === '+=' ? plusType(now, value, node.line) : node.op === '-=' ? arithType(now, value, node.line) : value;
        accept(now, next, node.line);
        return;
      }
      if (node.kind === 'post' || node.kind === 'pre') {
        const now = lookup(node.name, node.line);
        if (now.t === 'double') unsupported(node.line, '++ und -- für double werden in dieser Browser-Prüfung nicht unterstützt.');
        if (now.t !== 'int') fail(node.line, '++ und -- brauchen hier eine int-Variable.');
        return;
      }
      if (node.kind === 'aset') {
        const array = lookup(node.name, node.line);
        const index = typeOf(node.index);
        if (array.t !== 'array') fail(node.line, 'Das ist kein Array.');
        if (index.t !== 'int') fail(node.line, 'Der Index muss eine ganze Zahl sein.');
        const value = typeOf(node.value);
        const currentItem = { t: array.elem || 'string' };
        const next = node.op === '+=' ? plusType(currentItem, value, node.line) : node.op === '-=' ? arithType(currentItem, value, node.line) : value;
        accept(currentItem, next, node.line);
        return;
      }
      if (node.kind === 'write') {
        if (!node.value) return;
        const value = typeOf(node.value);
        if (!simple[value.t]) unsupported(node.line, 'Diese Ausgabe wird in der Browser-Prüfung nicht unterstützt.');
        return;
      }
      if (node.kind === 'if') {
        demandBool(typeOf(node.cond), node.line);
        walk(node.then);
        if (node.els) walk(node.els);
        return;
      }
      if (node.kind === 'while') {
        demandBool(typeOf(node.cond), node.line);
        walk(node.body);
        return;
      }
      if (node.kind === 'for') {
        scopes.push(new Map());
        if (node.init) walk(node.init);
        if (node.cond) demandBool(typeOf(node.cond), node.line);
        walk(node.body);
        if (node.update) walk(node.update);
        scopes.pop();
        return;
      }
      if (node.kind === 'foreach') {
        const collection = typeOf(node.collection);
        if (collection.t === 'string') unsupported(node.line, 'foreach über Text wird in dieser Browser-Prüfung nicht unterstützt.');
        if (collection.t !== 'array') fail(node.line, 'foreach braucht hier ein Array.');
        const elem = { t: collection.elem || 'string' };
        accept({ t: node.declared }, elem, node.line);
        scopes.push(new Map());
        current().set(node.name, { t: node.declared });
        walk(node.body);
        scopes.pop();
        return;
      }
      unsupported(node.line, 'Diese Anweisung wird in der Browser-Prüfung nicht unterstützt.');
    }
    program.forEach(walk);
  }

  function prepare(source) {
    if (source.length > SOURCE_LIMIT) {
      return { error: { message: 'Der Code ist zu lang für die Prüfung im Browser.', errorName: 'Limit', line: null, unsupported: true, compile: false } };
    }
    try {
      const program = parse(tokenize(source));
      staticCheck(program);
      return { program: program };
    } catch (error) {
      return {
        error: {
          message: error.message,
          errorName: error.errorName || 'CompileError',
          line: error.line || null,
          unsupported: !!error.unsupported,
          compile: !error.unsupported
        }
      };
    }
  }

  function stdinLines(text) {
    const source = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (source === '') return [];
    const lines = source.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  function norm(text) {
    return String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '').replace(/(\d),(\d)/g, '$1.$2');
  }

  function run(code, stdin) {
    const source = String(code == null ? '' : code).replace(/^\uFEFF/, '');
    const ready = prepare(source);
    if (ready.error) return { stdout: '', error: ready.error.message, errorName: ready.error.errorName, line: ready.error.line, unsupported: ready.error.unsupported, compile: ready.error.compile };
    return execute(ready.program, stdin == null ? '' : String(stdin));
  }

  function taskById(id) {
    return tasks.find(function (task) { return task.id === id; }) || null;
  }

  function check(taskId, code) {
    const task = taskById(taskId);
    if (!task) return { ok: false, status: 'fail', message: 'Unbekannte Aufgabe.', cases: [] };
    const source = String(code == null ? '' : code).replace(/^\uFEFF/, '');
    const ready = prepare(source);
    if (ready.error) {
      return {
        ok: false,
        status: ready.error.unsupported ? 'unsupported' : 'fail',
        message: ready.error.message,
        compile: ready.error.compile,
        cases: []
      };
    }
    const program = ready.program;
    const cases = task.cases.map(function (item) {
      const result = execute(program, item.input);
      if (result.unsupported) {
        return { id: item.id, label: item.label, input: item.input, expected: item.output, actual: result.stdout, error: result.error, errorName: result.errorName, line: result.line, pass: false, unsupported: true };
      }
      const pass = !result.error && norm(result.stdout) === norm(item.output);
      return { id: item.id, label: item.label, input: item.input, expected: item.output, actual: result.stdout, error: result.error, errorName: result.errorName, line: result.line, pass: pass, unsupported: false };
    });
    if (cases.some(function (item) { return item.unsupported; })) {
      return { ok: false, status: 'unsupported', message: cases.find(function (item) { return item.unsupported; }).error, cases: cases };
    }
    const ok = cases.every(function (item) { return item.pass; });
    return { ok: ok, status: ok ? 'pass' : 'fail', message: ok ? 'Alle Testfälle bestanden.' : 'Mindestens ein Testfall ist anders ausgegangen.', cases: cases };
  }

  function award(taskId) {
    return { awarded: 0, xp: 0, taskId: taskId, taskXp: TASK_XP, enabled: XP_ENABLED, reason: 'xp-disabled' };
  }

  return {
    XP_ENABLED: XP_ENABLED,
    TASK_XP: TASK_XP,
    tasks: tasks,
    run: run,
    check: check,
    award: award,
    norm: norm,
    taskById: taskById
  };
});
