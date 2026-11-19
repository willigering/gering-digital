const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../zombies/index.html'), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];
new vm.Script(script);
const part = (start, end) => script.slice(script.indexOf(start), script.indexOf(end, script.indexOf(start)));
const listeners = {};
const on = (event, fn) => (listeners[event] ||= []).push(fn);
let saved;
const context = vm.createContext({
  location: {protocol: 'https:', host: 'test.invalid'},
  store: {get: () => ({hd: true, mvol: .75, gvol: .3, svol: .7}), set: (_, opt) => {saved = {...opt};}},
  MODE: 'rtc', started: false, menu: {screen: 'options', sel: 0},
  MUI: {}, NET: {}, OPT: undefined,
  cv: {addEventListener: on}, addEventListener: on,
  sfx() {}, musApply() {}, openFeedback() {},
  mAn: () => ({}), clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
});
const run = code => vm.runInContext(code, context);
run(script.match(/^const OPT=.*$/m)[0]);
assert.equal(run('OPT.hd'), false, 'Previously saved HD=true must be disabled');
run(part('function menuItems()', 'function needName()'));
run(part('function setOpt(', 'const FB='));
run(part('let menuRects=[];', 'function MT('));
assert.ok(!run('menuItems().some(item => /HD-EFFEKTE/.test(item[0]))'));
// Exercise the actual registered mouse handlers, including release (no double-step).
run('menuRects=menuItems().map((_,i)=>[50,100+i*60,360,45]);');
for (const [index, key, initial] of [[1, 'mvol', .75], [2, 'gvol', .3], [3, 'svol', .7]]) {
  const click = x => {
    const event = {button: 0, clientX: x, clientY: 120+index*60};
    for (const fn of listeners.mousedown) fn(event);
    for (const fn of listeners.mouseup) fn(event);
  };
  click(75);
  assert.equal(run(`OPT.${key}`), Math.round((initial-.05)*100)/100, `${key}: left is quieter`);
  click(390);
  assert.equal(run(`OPT.${key}`), initial, `${key}: right is louder`);
  for (let i=0;i<30;i++) click(75);
  assert.equal(run(`OPT.${key}`), 0, `${key}: lower bound`);
  for (let i=0;i<30;i++) click(390);
  assert.equal(run(`OPT.${key}`), 1, `${key}: upper bound`);
  assert.equal(saved[key], 1, `${key}: setting persisted`);
}
// Execute the production death-processing loop and verify rewards are paid only once.
const deathLoop = part(' for(let i=zombies.length-1;i>=0;i--)if(zombies[i].hp<=0)', ' for(let i=PL.length-1;i>0;i--)');
for (const [flags, expected] of [[{},50],[{head:true},100],[{melee:true},130],[{expl:true},50],[{run:true},50]]) {
  const player = {money:500, kills:0, heads:0};
  const zombies = [{hp:0,x:0,y:0,face:0,look:{skin:'#aaa'},last:{own:player,...flags}}];
  const ctx = vm.createContext({zombies,P:player,NET:{client:false},part(){},rnd:()=>1,pick:a=>a[0],dropPowerup(){},addCorpse(){},stain(){},sfx(){},ftext(){}});
  vm.runInContext(deathLoop, ctx);
  assert.equal(player.money, 500+expected);
  assert.equal(player.kills, 1);
  vm.runInContext(deathLoop, ctx);
  assert.equal(player.money, 500+expected, 'No duplicate reward after death');
}
console.log('Zombies: syntax, saved HD setting, mouse volume controls, bounds, persistence and kill rewards passed.');
