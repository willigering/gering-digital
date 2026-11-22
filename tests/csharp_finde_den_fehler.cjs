'use strict';
/* Finde den Fehler – C#: Startcode fällt durch, Korrekturen bestehen,
   die XP-Anbindung bleibt aus. Der Vergleich mit dem echten Compiler
   läuft nur lokal in einem eigenen Prozess pro Testfall. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const api = require(path.join(root, 'dau-to-pro/unterricht/csharp-finde-den-fehler-runtime.js'));
const page = fs.readFileSync(path.join(root, 'dau-to-pro/unterricht/csharp-finde-den-fehler.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'dau-to-pro/unterricht/csharp-finde-den-fehler.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'dau-to-pro/unterricht/csharp-finde-den-fehler.css'), 'utf8');
const material = fs.readFileSync(path.join(root, 'dau-to-pro/unterricht/csharp-material.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'dau-to-pro/unterricht/csharp-finde-den-fehler-runtime.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'dau-to-pro/index.php'), 'utf8');
const fails = [];
const ran = [];

function check(name, ok, detail) {
  ran.push(name);
  if (!ok) fails.push(name + (detail ? '\n  ' + detail : ''));
}

function task(id) { return api.taskById(id); }
function grade(id, code) { return api.check(id, code); }

const euro = task('csharp-fehler-euro-automat');
const inventur = task('csharp-fehler-inventur');
const noten = task('csharp-fehler-notenschnitt');

check('drei stabile Aufgaben', euro && inventur && noten && api.tasks.length === 3);
check('XP aus', api.XP_ENABLED === false && api.TASK_XP === 2);

function expectFail(name, id, code, extra) {
  const result = grade(id, code);
  const detail = JSON.stringify({ status: result.status, message: result.message, cases: result.cases.map(function (item) {
    return { id: item.id, pass: item.pass, errorName: item.errorName, actual: item.actual };
  }) });
  check(name, result.ok === false && result.status === 'fail' && (!extra || extra(result)), detail);
  return result;
}
function expectPass(name, id, code) {
  const result = grade(id, code);
  check(name, result.ok === true && result.status === 'pass' && result.cases.every(function (item) { return item.pass && !item.error; }), JSON.stringify(result.cases));
  return result;
}

const euroStart = expectFail('Euro-Start fällt durch', euro.id, euro.start, function (result) {
  const byId = Object.fromEntries(result.cases.map(function (item) { return [item.id, item]; }));
  return byId['1'].pass && !byId['2'].pass && byId['3'].pass && !byId['2'].error && /Zu wenig/.test(byId['2'].actual) && !/Betrag passt/.test(byId['2'].actual);
});
const inventurStart = expectFail('Inventur-Start fällt durch', inventur.id, inventur.start, function (result) {
  return result.cases.every(function (item) {
    return !item.pass && item.errorName === 'IndexOutOfRangeException';
  });
});
const notenStart = expectFail('Noten-Start fällt durch', noten.id, noten.start, function (result) {
  const byId = Object.fromEntries(result.cases.map(function (item) { return [item.id, item]; }));
  return byId.ganz.pass && !byId.komma.pass && /Schnitt: 1\n?$/.test(byId.komma.actual) && !/1\.5/.test(byId.komma.actual);
});

function replaceLine(source, from, to) {
  if (!source.includes(from)) throw new Error('Zeile fehlt: ' + from);
  return source.replace(from, to);
}

const euroElse = 'else\n{\n    Console.WriteLine("Zu wenig");\n}';
const euroFixed = euro.start.replace(euroElse, 'else\n{\n    Console.WriteLine("Betrag passt");\n}');
expectPass('Euro Grenzfall', euro.id, euroFixed);
expectPass('Euro neu geordnet', euro.id,
  'Console.WriteLine("Betrag in Euro:");\nstring eingabe = Console.ReadLine();\nint euro = int.Parse(eingabe);\nif (euro == 2)\n    Console.WriteLine("Betrag passt");\nelse if (euro < 2)\n    Console.WriteLine("Zu wenig");\nelse\n    Console.WriteLine("Zu viel");\n');
expectPass('Euro ternär', euro.id,
  'Console.WriteLine("Betrag in Euro:");\nstring eingabe = Console.ReadLine();\nint euro = int.Parse(eingabe);\nConsole.WriteLine(euro < 2 ? "Zu wenig" : euro > 2 ? "Zu viel" : "Betrag passt");\n');
expectFail('Euro 2 als zu viel', euro.id, euro.start.replace(euroElse, 'else\n{\n    Console.WriteLine("Zu viel");\n}'));
expectFail('Euro ab 2 passt', euro.id, euro.start.replace('else if (euro > 2)', 'else if (euro >= 2)').replace('Console.WriteLine("Zu viel");', 'Console.WriteLine("Betrag passt");'));

expectPass('Inventur kleiner', inventur.id, replaceLine(inventur.start, 'i <= artikel.Length', 'i < artikel.Length'));
expectPass('Inventur foreach', inventur.id,
  'Console.WriteLine("Wie viele Artikel?");\nint anzahl = int.Parse(Console.ReadLine());\nstring[] artikel = new string[anzahl];\nfor (int i = 0; i < anzahl; i++)\n{\n    artikel[i] = Console.ReadLine();\n}\nint n = 1;\nforeach (string name in artikel)\n{\n    Console.WriteLine(n + ". " + name);\n    n++;\n}\n');
expectPass('Noten 2.0', noten.id, replaceLine(noten.start, 'int schnitt = (a + b) / 2;', 'double schnitt = (a + b) / 2.0;'));
expectPass('Noten Cast davor', noten.id, replaceLine(noten.start, 'int schnitt = (a + b) / 2;', 'double schnitt = (double)(a + b) / 2;'));
expectPass('Noten direkt', noten.id, noten.start
  .replace('int schnitt = (a + b) / 2;\nConsole.WriteLine("Schnitt: " + schnitt);\n', 'Console.WriteLine("Schnitt: " + ((a + b) / 2.0));\n'));
expectPass('Noten Suffix', noten.id, replaceLine(noten.start, 'int schnitt = (a + b) / 2;', 'double schnitt = (a + b) / 2d;'));
expectFail('Noten Cast danach', noten.id, replaceLine(noten.start, 'int schnitt = (a + b) / 2;', 'double schnitt = (double)((a + b) / 2);'));
expectPass('Noten Komma als Text', noten.id,
  'Console.WriteLine("Punktzahl 1:");\nint a = int.Parse(Console.ReadLine());\nConsole.WriteLine("Punktzahl 2:");\nint b = int.Parse(Console.ReadLine());\nif (a == 1)\n    Console.WriteLine("Schnitt: 1,5");\nelse\n    Console.WriteLine("Schnitt: 3");\n');

const unsupported = grade(euro.id, 'switch (euro) { }');
check('switch ist keine falsche Lösung', unsupported.status === 'unsupported' && unsupported.ok === false && /switch/.test(unsupported.message), JSON.stringify(unsupported));
check('switch-Meldung in der Oberfläche', ui.includes('kennt das Konstrukt nicht und wertet ihn nicht als Lösung'));
const syntax = grade(euro.id, 'if (');
check('Syntaxfehler bleibt Fehler', syntax.status === 'fail' && syntax.ok === false && syntax.cases.length === 0, JSON.stringify(syntax));
const dead = 'if (false) { int x = "text"; } Console.WriteLine(42);';
const deadRun = api.run(dead, '');
check('toter ungültiger Zweig läuft nicht', !!deadRun.error && deadRun.unsupported === false && !/42/.test(deadRun.stdout) && /int/.test(deadRun.error), JSON.stringify(deadRun));
const deadGrade = grade(euro.id, dead);
check('toter ungültiger Zweig besteht nicht', deadGrade.ok === false && deadGrade.status === 'fail' && deadGrade.cases.length === 0, JSON.stringify(deadGrade));
const alive = api.run('if (false) { int x = 1; }\nConsole.WriteLine(42);\n', '');
check('gültiger toter Zweig läuft', !alive.error && alive.stdout.replace(/\s+$/, '') === '42', JSON.stringify(alive));

check('Norm akzeptiert Komma', api.norm('Schnitt: 1,5') === api.norm('Schnitt: 1.5'));

const first = api.award(euro.id);
const second = api.award(euro.id);
check('erste Abgabe vergibt kein XP', first.awarded === 0 && first.xp === 0 && first.enabled === false && first.reason === 'xp-disabled' && first.taskXp === 2, JSON.stringify(first));
check('zweite Abgabe vergibt kein weiteres XP', second.awarded === 0 && second.xp === 0 && second.taskId === euro.id, JSON.stringify(second));
check('parallele Abgabe vergibt kein XP', api.award(euro.id).awarded === 0 && api.award(inventur.id).awarded === 0 && api.XP_ENABLED === false);
check('XP-Lücke benannt', /vertrauenswürdig/.test(runtime) && /Webserver/.test(runtime));

['csharp-finde-den-fehler.html', 'csharp-finde-den-fehler.js', 'csharp-finde-den-fehler-runtime.js'].forEach(function (name) {
  const text = name.endsWith('.html') ? page : name.endsWith('.js') && name.indexOf('runtime') < 0 ? ui : runtime;
  check(name + ' ohne Serveraufruf', !/progress\.php|xp_add\s*\(|ach_evaluate\s*\(|\bfetch\s*\(/.test(text));
});
check('Seite nutzt das Unterrichts-Backdrop', page.includes('class="dtp-material fehler-page"') && page.includes('class="dtp-backdrop"') && page.includes('href="csharp-material.css"') && !page.includes('data-active-topic'));
check('Wand ist circuit-signal-1536', /\.dtp-backdrop\{[^}]*circuit-signal-1536\.webp/.test(material));
check('Wandregeln stehen nur im Material-CSS', !css.includes('circuit-signal') && !css.includes('--dtp-wall'));
check('Knöpfe und Parallax', page.includes('>Ausführen<') && page.includes('>Lösung prüfen<') && page.includes('>Code zurücksetzen<') && ui.includes('Math.atan(Math.max(0, scrollY) / 1100) * 62') && page.includes('href="../index.php#bonusmodule"'));
check('Startcode unmarkiert in der Seite', !page.includes('Zu wenig') && !page.includes('Betrag passt') && ui.indexOf('innerHTML') < 0);
const unterricht = index.slice(index.indexOf('class="unterricht-collection"'), index.indexOf('</section>', index.indexOf('class="unterricht-collection"')));
const bonus = index.slice(index.indexOf('id="bonusmodule"'), index.indexOf('id="highscore"'));
check('Unterricht ohne Bonus-Kachel', unterricht.includes('>04 <small>MATERIALIEN</small>') && unterricht.includes('href="unterricht/it-vi-01.php"') && !unterricht.includes('csharp-finde-den-fehler') && !unterricht.includes('Finde den Fehler'));
check('Kachel im Abschnitt Bonusmodule', bonus.includes('href="unterricht/csharp-finde-den-fehler.html"') && bonus.includes('id="bonus-title"') && bonus.includes('Bonus'));
check('kein Lernpfad auf der Seite', !/Prüfungsmodus|Nachschlagwerk|Lernpfad/.test(page) || page.includes('keinen Lernpfad'));

const programs = [
  ['Euro-Start', euro.id, euro.start],
  ['Euro Grenzfall', euro.id, euroFixed],
  ['Euro ternär', euro.id, 'Console.WriteLine("Betrag in Euro:");\nstring eingabe = Console.ReadLine();\nint euro = int.Parse(eingabe);\nConsole.WriteLine(euro < 2 ? "Zu wenig" : euro > 2 ? "Zu viel" : "Betrag passt");\n'],
  ['Inventur-Start', inventur.id, inventur.start],
  ['Inventur kleiner', inventur.id, replaceLine(inventur.start, 'i <= artikel.Length', 'i < artikel.Length')],
  ['Inventur foreach', inventur.id, 'Console.WriteLine("Wie viele Artikel?");\nint anzahl = int.Parse(Console.ReadLine());\nstring[] artikel = new string[anzahl];\nfor (int i = 0; i < anzahl; i = i + 1)\n{\n    artikel[i] = Console.ReadLine();\n}\nint n = 1;\nforeach (string name in artikel)\n{\n    Console.WriteLine(n + ". " + name);\n    n += 1;\n}\n'],
  ['Noten-Start', noten.id, noten.start],
  ['Noten 2.0', noten.id, replaceLine(noten.start, 'int schnitt = (a + b) / 2;', 'double schnitt = (a + b) / 2.0;')],
  ['Noten Cast davor', noten.id, replaceLine(noten.start, 'int schnitt = (a + b) / 2;', 'double schnitt = (double)(a + b) / 2;')],
  ['Noten Cast danach', noten.id, replaceLine(noten.start, 'int schnitt = (a + b) / 2;', 'double schnitt = (double)((a + b) / 2);')],
  ['Noten direkt', noten.id, noten.start.replace('int schnitt = (a + b) / 2;\nConsole.WriteLine("Schnitt: " + schnitt);\n', 'Console.WriteLine("Schnitt: " + ((a + b) / 2.0));\n')]
];

function findDotnet() {
  const local = path.join(process.env.LOCALAPPDATA || '', 'dotnet', 'dotnet.exe');
  if (fs.existsSync(local)) return local;
  const probe = spawnSync('dotnet', ['--version'], { encoding: 'utf8' });
  return probe.status === 0 ? 'dotnet' : null;
}

function compiler(dotnet) {
  const listed = spawnSync(dotnet, ['--list-sdks'], { encoding: 'utf8' });
  if (listed.status !== 0) return null;
  const line = listed.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
  const match = /^(\S+) \[(.+)\]$/.exec(line || '');
  if (!match) return null;
  const sdk = path.join(match[2], match[1]);
  const csc = path.join(sdk, 'Roslyn', 'bincore', 'csc.dll');
  const rtBase = path.join(match[2], '..', 'shared', 'Microsoft.NETCore.App');
  if (!fs.existsSync(csc) || !fs.existsSync(rtBase)) return null;
  const rtVer = fs.readdirSync(rtBase).sort().pop();
  const rt = path.join(rtBase, rtVer);
  const refs = fs.readdirSync(rt).filter(function (file) {
    return /^(System(\..*)?|Microsoft\.CSharp|netstandard|mscorlib)\.dll$/.test(file) && !/\.Native\.dll$/i.test(file);
  }).map(function (file) { return '-r:' + path.join(rt, file); });
  return { dotnet: dotnet, csc: csc, refs: refs, rtVer: rtVer };
}

function crossCheck(dotnetInfo) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csharp-fehler-'));
  const usings = path.join(tmp, 'usings.cs');
  fs.writeFileSync(usings, 'global using System;\nglobal using System.Globalization;\n');
  let compared = 0;
  programs.forEach(function (entry, index) {
    const itemTask = task(entry[1]);
    const source = entry[2];
    const file = path.join(tmp, 'p' + index + '.cs');
    const dll = path.join(tmp, 'p' + index + '.dll');
    const wrapped = 'CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;\nCultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;\ntry\n{\n' + source + '\n}\ncatch (Exception ex)\n{\n    Console.Error.WriteLine("EXC:" + ex.GetType().Name);\n}\n';
    fs.writeFileSync(file, wrapped);
    const compiled = spawnSync(dotnetInfo.dotnet, [dotnetInfo.csc, '-nologo', '-langversion:12', '-t:exe', ...dotnetInfo.refs, '-out:' + dll, usings, file], { encoding: 'utf8' });
    if (compiled.status !== 0) {
      fails.push('Compiler ' + entry[0] + '\n  ' + (compiled.stdout + compiled.stderr).slice(0, 800));
      return;
    }
    fs.writeFileSync(dll.replace(/\.dll$/, '.runtimeconfig.json'), JSON.stringify({
      runtimeOptions: { tfm: 'net8.0', framework: { name: 'Microsoft.NETCore.App', version: dotnetInfo.rtVer } }
    }));
    itemTask.cases.forEach(function (item) {
      const browser = api.run(source, item.input);
      const real = spawnSync(dotnetInfo.dotnet, [dll], {
        input: item.input,
        encoding: 'utf8',
        cwd: tmp,
        timeout: 20000,
        env: Object.assign({}, process.env, { DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: '1' })
      });
      compared += 1;
      const stderr = String(real.stderr || '');
      const exc = /EXC:([A-Za-z0-9_]+)/.exec(stderr);
      const realName = exc ? exc[1] : null;
      const sameOut = api.norm(real.stdout) === api.norm(browser.stdout);
      const sameErr = realName === (browser.errorName || null);
      ran.push('dotnet ' + entry[0] + ' / ' + item.label);
      if (!sameOut || !sameErr) {
        fails.push('dotnet ' + entry[0] + ' / ' + item.label + '\n  Browser ' + JSON.stringify({ out: browser.stdout, err: browser.errorName }) + '\n  dotnet ' + JSON.stringify({ out: real.stdout, err: realName, stderr: stderr.slice(0, 300) }));
      }
    });
  });
  const deadFile = path.join(tmp, 'dead.cs');
  fs.writeFileSync(deadFile, 'if (false) { int x = "text"; }\nConsole.WriteLine(42);\n');
  const deadCompile = spawnSync(dotnetInfo.dotnet, [dotnetInfo.csc, '-nologo', '-langversion:12', '-t:exe', ...dotnetInfo.refs, '-out:' + path.join(tmp, 'dead.dll'), usings, deadFile], { encoding: 'utf8' });
  ran.push('dotnet toter ungültiger Zweig');
  compared += 1;
  if (deadCompile.status === 0) fails.push('dotnet hat ungültigen Code im toten Zweig übersetzt');
  const switchFile = path.join(tmp, 'switch.cs');
  fs.writeFileSync(switchFile, 'switch (1) { default: Console.WriteLine("x"); break; }\n');
  const switchCompile = spawnSync(dotnetInfo.dotnet, [dotnetInfo.csc, '-nologo', '-langversion:12', '-t:exe', ...dotnetInfo.refs, '-out:' + path.join(tmp, 'switch.dll'), usings, switchFile], { encoding: 'utf8' });
  const switchBrowser = api.check(euro.id, fs.readFileSync(switchFile, 'utf8'));
  ran.push('dotnet switch bleibt unterstützt');
  compared += 1;
  if (switchCompile.status !== 0) fails.push('dotnet übersetzt gültiges switch nicht\n  ' + (switchCompile.stdout + switchCompile.stderr).slice(0, 500));
  if (switchBrowser.ok || switchBrowser.status !== 'unsupported') fails.push('Browser wertet switch falsch: ' + JSON.stringify(switchBrowser));
  return compared;
}

const dotnet = findDotnet();
const dotnetInfo = dotnet ? compiler(dotnet) : null;
let dotnetCases = 0;
if (!dotnetInfo) {
  console.log('Compiler-Vergleich: nicht gelaufen. dotnet wurde nicht gefunden.');
} else {
  dotnetCases = crossCheck(dotnetInfo);
  console.log('Compiler-Vergleich: ' + dotnetCases + ' Testfälle mit ' + dotnet);
}

console.log('Geprüft: ' + ran.length + ' Behauptungen.');
if (euroStart && inventurStart && notenStart) console.log('Startcode: Euro, Inventur und Noten fallen durch.');
if (fails.length) {
  console.log(fails.join('\n\n'));
  process.exit(1);
}
console.log('Alle Behauptungen bestanden.');
