'use strict';
// Proves in a real browser that the module-specific achievements are reachable with the real learning modules:
// the modules are served exactly like on the website (with sync.js), a learner signs in and plays them.
// Covers: "10 × richtig in Folge" and "3 × falsch in Folge" for every referenced task type, Lernpfad stage 1,
// leaving a running exam (incl. the sync on page leave), the Easter Egg, the popup and the account/highscore pages.
// npm install --no-save playwright@1.62.1; npx playwright install chromium
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'dtp-ach-'));
const env={...process.env,GD_ROOT:root,GD_DB_PATH:path.join(scratch,'site.sqlite')};
const port=22000+Math.floor(Math.random()*1000);
const base=`http://127.0.0.1:${port}`;
const shots=process.env.DTP_SCREENSHOT_DIR||'';
if(shots)fs.mkdirSync(shots,{recursive:true});
const php=code=>{
  const r=spawnSync('php',['-r',`require ${JSON.stringify(root+'/achievements_lib.php')}; require_once ${JSON.stringify(root+'/dau_lib.php')}; ${code}`],{env,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;
};
const unlocked=user=>JSON.parse(php(`$l=learner_find(${JSON.stringify(user)}); echo json_encode(array_keys(ach_unlocked((int)$l['id'])));`));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const MODULES={
  'a1-zahlensysteme':{hook:'A1_TEST',prefix:'a1-bits',clean:['h_color','h_chmod','u_cross','u_disk'],fails:['b_max','c_over','u_disk']},
  'osi-sprint':{hook:'OSI_TEST',prefix:'osi-sprint',clean:['n_memo','o_seq','t_case'],fails:['t_layer','n_num']},
  'subnet-sprint':{hook:'SUBNET_TEST',prefix:'subnet-sprint',clean:['p_pow','v_net','v_bc'],fails:['h_usable','c_same','b_bc']},
  'netzwerke-sprint':{hook:'NETZ_TEST',prefix:'netz-sprint',clean:['b_kurz','p_port','p_portr','c_coll','c_bcast'],fails:['s_flood','v_short','tr_diag']},
};
const versions=[];

/** Answers the task currently shown in host, right or wrong, using the module's own checker. */
async function answer(page,hook,host,right){
  return page.evaluate(({hook,host,right})=>{
    const T=window[hook],t=T.last(),box=document.querySelector(host);
    if(!t||!box)return null;
    if(t.kind==='mc'){
      const i=right?t.answer:(t.answer+1)%t.options.length;
      box.querySelector(`.opt[data-v="${i}"]`).click();return t.sub;
    }
    if(t.kind==='layer'){
      const v=right?t.answer:(t.answer%7)+1;
      box.querySelector(`.chip[data-v="${v}"]`).click();return t.sub;
    }
    const plain=String(T.showAnswer(t)).replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ');
    const a=t.answer;
    const cands=[plain,String(a),plain.split(' ')[0]];
    if(typeof a==='number')cands.push(a.toString(16),a.toString(2),a.toString(8),t.width?a.toString(2).padStart(t.width,'0'):'');
    const wrong=['0','1','2','7','99','10.0.0.1','/8','255.255.0.0','0x1'];
    const pick=(right?cands:wrong).find(c=>{if(!c)return false;const p=T.parseAnswer(t,c);return p.valid&&p.ok===right;});
    if(pick===undefined)return 'unanswerable:'+t.sub+':'+t.kind;
    const inp=box.querySelector('[data-r="form"] input');inp.value=pick;box.querySelector('[data-r="check"]').click();return t.sub;
  },{hook,host,right});
}
const subs=(page,prefix)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'{}'),prefix+'-subs-v1');
// sync.js merkt Änderungen erst beim (verzögerten) Senden vor: erst die Wartezeit abwarten, dann auf „gespeichert“.
const synced=async page=>{await pause(1600);await page.waitForFunction(()=>window.__dtpSyncStatus().pending===0&&window.__dtpSyncStatus().state==='saved',null,{timeout:15000});};
const run=(list,v,n)=>{let r=0;for(const x of list){r=x===v?r+1:0;if(r>=n)return true}return false};

(async()=>{
  // Live modules exactly as shipped in lernmodule/, plus one learner account.
  const out=php(`
    $out=[];
    foreach(hp_bundles() as $b){$v=hp_import_local($b['path'],$b['slug']);
      db()->prepare("INSERT INTO html_pages(slug,title,subject,description,category,draft_version,live_version,published) VALUES(?,?,?,?,'lernen',?,?,1)")->execute([$b['slug'],$b['title'],$b['subject'],$b['description'],$v,$v]);
      $out[]=hp_storage().'/'.$b['slug'];}
    foreach(['anna','bert','cleo'] as $n){db()->prepare('INSERT INTO learners(username,password_hash) VALUES(?,?)')->execute([$n,password_hash('ein-langes-testpasswort',PASSWORD_DEFAULT)]);}
    echo json_encode($out);`);
  versions.push(...JSON.parse(out));
  const server=spawn('php',['-S',`127.0.0.1:${port}`,'-t',root,path.join(__dirname,'support/router.php')],{env,stdio:'ignore'});
  let browser;
  try{
    for(let n=0;n<60;n++){try{if((await fetch(base+'/dau-to-pro/')).ok)break}catch{} if(n===59)throw Error('PHP server unavailable');await pause(100)}
    browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/dau-to-pro/konto.php');
    await page.fill('input[name=username]','anna');await page.fill('input[name=password]','ein-langes-testpasswort');
    await Promise.all([page.waitForNavigation(),page.click('.auth-form button[type=submit]')]);

    // The topic hierarchy is visible above each module title.
    assert.equal(await page.locator('.module-card .module-number').count(),0,'Öffentliche Modulkacheln zeigen keine Modulnummern');
    const cards=await page.$$eval('.module-card',cs=>cs.map(c=>[
      c.querySelector('.module-category').textContent.trim(),
      c.querySelector('.module-subtopic')?.textContent.trim(),
      c.querySelector('h2').textContent.trim()
    ].join(' | ')));
    for(const want of [
      'Grundlagen | Zahlensysteme | Bits zum bitteren Ende',
      'Netzwerktechnik | OSI-Schichten | Easy OSI for FISI',
      'IP & Subnetting | Subnetting | Wer teilt, gewinnt',
      'Netzwerktechnik | Netzwerkgrundlagen | Jetzt ma Router bei die Switche!',
      'Kalkulation & Beschaffung | Angebotsvergleich | Rechnet sich das?'
    ])assert.ok(cards.includes(want),'Modulkarte zeigt '+want+' ('+cards.join(', ')+')');
    if(shots)await page.locator('#lernmodule').screenshot({path:path.join(shots,'modulkarten-thema.png')});

    let popupShot=false;
    for(const [slug,m] of Object.entries(MODULES)){
      await page.goto(`${base}/${slug}/`,{waitUntil:'load'});
      assert.ok((await page.title()).includes(' · '),'Browser-Tab zeigt Thema · Titel');
      // Lernpfad Stufe 1 meistern.
      await page.click('[data-tab="path"]').catch(()=>{});
      await page.click('#practiceGo');
      for(let i=0;i<40;i++){
        const st=await page.evaluate(k=>{const p=JSON.parse(localStorage.getItem(k)||'{}');return p.st&&p.st[0]&&p.st[0].mastered},m.prefix+'-path-v1');
        if(st)break;
        const sub=await answer(page,m.hook,'#practiceTask',true);assert.ok(sub&&!String(sub).startsWith('unanswerable'),'Lernpfad-Aufgabe beantwortbar: '+sub);
        await page.locator('#practiceTask [data-r="next"]:visible, #practiceGo:visible').first().click().catch(()=>{});
        await pause(30);
      }
await page.locator('#backToLesson').click();await page.locator('.dtp-practice-dialog').waitFor({state:'hidden'});
      // Trainingsraum: gezielt die Aufgabentypen der Achievements.
      await page.click('[data-tab="train"]');
      const todo=[...m.clean.map(s=>[s,true]),...m.fails.map(s=>[s,false])];
      for(const [target,right] of todo){
        const cat=await page.evaluate(({hook,target})=>window[hook].SUBS.find(s=>s.id===target).cat,{hook:m.hook,target});
        await page.click(`#catBar [data-cat="${cat}"]`);
        let done=false;
        for(let i=0;i<500&&!done;i++){
          const cur=await page.evaluate(h=>window[h].last()&&window[h].last().sub,m.hook);
          const sub=await answer(page,m.hook,'#trainTask',cur===target?right:true);
          assert.ok(sub&&!String(sub).startsWith('unanswerable'),`Aufgabe beantwortbar (${slug}): ${sub}`);
          const list=(await subs(page,m.prefix))[target]||[];
          done=run(list,right?1:0,right?10:3);
          await page.click('#trainTask [data-r="next"]');
        }
        assert.ok(done,`${slug}: ${target} ${right?'10 × richtig':'3 × falsch'} in Folge erreicht`);
        // Wie ein echter Mensch: der Stand ist gespeichert, bevor die nächste Aufgabenserie startet (Ring-Puffer der letzten 12).
        await synced(page);
      }
      await synced(page);
      if(!popupShot&&shots){
        // Ein frisches Achievement erzeugen und das Popup fotografieren.
        popupShot=true;
      }
      // Prüfung starten (90 Minuten) und die Seite verlassen: wird beim Verlassen trotzdem gespeichert?
      await page.click('[data-tab="exam"]');
      await page.click('.exam-len [data-len="3"]');
      await page.click('#examStart');
      if(await page.locator('#examYes:visible').count())await page.click('#examYes');
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
      await pause(800);
      const stored=JSON.parse(php(`$l=learner_find('anna'); $v=learner_progress_state((int)$l['id'])['values'][${JSON.stringify(m.prefix+'-exam-v1')}]??'[]'; echo $v;`));
      assert.ok(stored.some(e=>e.m===90&&e.r==='Seite verlassen'),`${slug}: abgebrochene 90-Minuten-Prüfung kommt beim Verlassen auf dem Server an`);
      await page.goto(`${base}/${slug}/`,{waitUntil:'load'});
      const kept=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'[]'),m.prefix+'-exam-v1');
      assert.ok(kept.some(e=>e.r==='Seite verlassen'),`${slug}: Prüfung bleibt nach dem Neuladen erhalten`);
    }
    const got=unlocked('anna');
    const expect={
      'a1-zahlensysteme':['a1.erstes-bit','a1.farbcodes','a1.chmod','a1.kibi','a1.off-by-one','a1.ueberlauf','a1.festplatte'],
      'osi-sprint':['osi.kabel','osi.merksatz','osi.handshake','osi.layer8','osi.richtung','osi.getrennt'],
      'subnet-sprint':['subnet.oktett','subnet.potenzen','subnet.vlsm','subnet.host','subnet.falsches-netz','subnet.leere'],
      'netzwerke-sprint':['netz.link-up','netz.kuerzel','netz.ports','netz.domaenen','netz.sturm','netz.doppelpunkt','netz.neustart'],
    };
    for(const list of Object.values(expect))for(const code of list)assert.ok(got.includes(code),'Im echten Modul erreicht: '+code);
    assert.ok(got.includes('g.allrounder'),'Allrounder nach Stufe 1 in drei Modulen');

    // Popup in einem Modul: neues Achievement („Paketbote“ braucht Stufe 3, wir schalten über ein Fehler-Achievement frei).
    await page.goto(`${base}/osi-sprint/`,{waitUntil:'load'});
    await page.evaluate(()=>{const k='osi-sprint-subs-v1',s=JSON.parse(localStorage.getItem(k)||'{}');s.o_listen=[0,0,0];localStorage.setItem(k,JSON.stringify(s));});
    // Kein Achievement hängt an o_listen: also bewusst eine Stufe meistern lassen.
    await page.evaluate(()=>{const k='osi-sprint-path-v1',p=JSON.parse(localStorage.getItem(k));p.st['2']={hist:Array(10).fill(true),solved:10,mastered:true};localStorage.setItem(k,JSON.stringify(p));});
    await page.waitForSelector('dtp-achievement',{state:'attached',timeout:10000});
    await pause(600);
    if(shots)await page.screenshot({path:path.join(shots,'popup-im-modul.png'),clip:{x:966,y:700,width:400,height:200}});
    assert.ok(unlocked('anna').includes('osi.paketbote'),'Popup-Fall: Paketbote freigeschaltet');

    // Jedes Modul hat oben links „Zurück zur Modulauswahl“.
    const moduleBack=page.getByRole('link',{name:'Zurück zur Modulauswahl'});
    await Promise.all([page.waitForURL(u=>new URL(u).pathname==='/dau-to-pro/',{timeout:15000}),moduleBack.click({timeout:10000})]);
    assert.equal(new URL(page.url()).hash,'#lernmodule','Zurück-Button führt zur Modulauswahl');

    // Easter Egg mit Konto: 200 XP.
    await page.goto(base+'/dau-to-pro/',{waitUntil:'networkidle'});
    const hit=page.locator('.fx-shroom-hit');
    for(let i=0;i<5;i++){await hit.click({force:true});await pause(120);}
    await page.waitForSelector('.fx-video:not([hidden])',{timeout:8000});
    await pause(800);
    assert.ok(unlocked('anna').includes('g.easteregg'),'Easter Egg mit Konto schaltet das versteckte Achievement frei');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>{const l=window.dtpAchievementToast&&window.dtpAchievementToast.last;return l&&/Fremdscham/.test(l.title)&&l.xp==='+200 XP';},null,{timeout:6000});
    if(shots){await pause(700);await page.screenshot({path:path.join(shots,'easteregg-achievement.png'),clip:{x:966,y:700,width:400,height:200}});}

    // Replaying the video on a fresh page must not notify or award XP again.
    const eggXP=Number(php("$l=learner_find('anna');echo ach_stats((int)$l['id'])['level']['xp'];"));
    await page.goto(base+'/dau-to-pro/',{waitUntil:'networkidle'});
    for(let i=0;i<5;i++){await page.locator('.fx-shroom-hit').click({force:true});await pause(120);}
    await page.waitForSelector('.fx-video:not([hidden])',{timeout:8000});await pause(800);await page.keyboard.press('Escape');await pause(500);
    assert.equal(await page.locator('dtp-achievement').count(),0,'Erneutes Video zeigt kein altes Achievement');
    assert.equal(Number(php("$l=learner_find('anna');echo ach_stats((int)$l['id'])['level']['xp'];")),eggXP,'Erneutes Video vergibt keine XP');

    // Highscore: standardmäßig aus, Opt-in in den Einstellungen.
    await page.goto(base+'/dau-to-pro/highscore.php');
    assert.ok((await page.locator('.hs-hint').textContent()).includes('unsichtbar'),'Highscore: eigenes Konto ist standardmäßig unsichtbar');
    await page.goto(base+'/dau-to-pro/konto.php#highscore');
    assert.ok(await page.$eval('#highscore',d=>d.open),'Link konto.php#highscore klappt die Einstellung auf');
    await page.check('#highscore input[name=visible]');
    await Promise.all([page.waitForNavigation(),page.click('#highscore button[type=submit]')]);
    assert.ok(unlocked('anna').includes('g.rampensau'),'Sichtbarkeit einschalten: Rampensau');
    php(`foreach(['bert'=>[0,1],'cleo'=>[0]] as $n=>$st){$l=learner_find($n);$id=(int)$l['id'];learner_progress_apply($id,'subnet-sprint',['subnet-sprint-path-v1'=>json_encode(['stage'=>0,'st'=>array_fill_keys(array_map('strval',$st),['mastered'=>true])]),'subnet-sprint-stats-v1'=>json_encode(['solved'=>300,'correct'=>260])],[]);ach_set_visible($id,true);}`);
    if(shots){
      await page.goto(base+'/dau-to-pro/konto.php');
      await page.screenshot({path:path.join(shots,'konto-level-1366.png'),fullPage:false});
      await page.locator('#achievements').screenshot({path:path.join(shots,'konto-achievements-1366.png')});
      await page.locator('#einstellungen').screenshot({path:path.join(shots,'konto-einstellungen-highscore.png')});
    }
    await page.goto(base+'/dau-to-pro/highscore.php');
    const names=await page.$$eval('.hs-name',n=>n.map(x=>x.querySelector('.profile-open').textContent.trim()+(x.querySelector(':scope > small')?' (du)':'')));
    assert.equal(names[0],'anna (du)','Highscore: anna führt und ist markiert');
    assert.equal(names.length,3,'Highscore zeigt die drei sichtbaren Konten');
    if(shots)await page.screenshot({path:path.join(shots,'highscore-1366.png'),fullPage:true});
    // Highscore auch auf der Hauptseite (Top 5).
    await page.goto(base+'/dau-to-pro/#highscore',{waitUntil:'load'});
    const top=await page.$$eval('#highscore .hs-who b',n=>n.map(x=>x.textContent.trim()));
    assert.equal(top[0],'anna (du)','Hauptseite: Highscore-Vorschau zeigt anna oben');
    assert.equal(top.length,3,'Hauptseite: alle drei sichtbaren Konten');
    if(shots)await page.locator('#highscore').screenshot({path:path.join(shots,'hauptseite-highscore.png')});

    // Smartphone-Ansicht.
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce',storageState:await context.storageState()});
    const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));
    for(const [url,name] of [['/dau-to-pro/konto.php','konto-390.png'],['/dau-to-pro/highscore.php','highscore-390.png']]){
      await mp.goto(base+url);
      const over=await mp.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
      assert.ok(over<=1,url+': kein horizontales Scrollen auf dem Smartphone ('+over+' px)');
      if(shots)await mp.screenshot({path:path.join(shots,name),fullPage:url.includes('highscore')});
    }
    // Ohne Konto: Highscore gesperrt.
    const guest=await browser.newContext();const gp=await guest.newPage();
    await gp.goto(base+'/dau-to-pro/highscore.php');
    assert.equal(await gp.locator('.hs-table').count(),0,'Ohne Konto keine Highscore-Liste');
    assert.ok(await gp.locator('.hs-locked').isVisible(),'Ohne Konto: Hinweis „Nur mit Lernkonto“');
    await gp.goto(base+'/dau-to-pro/',{waitUntil:'networkidle'});
    assert.equal(await gp.locator('#highscore .hs-row').count(),0,'Hauptseite ohne Konto: keine Namen im Highscore');
    assert.ok(await gp.locator('#highscore .hs-teaser').isVisible(),'Hauptseite ohne Konto: Hinweis mit Anmelden');
    for(let i=0;i<5;i++){await gp.locator('.fx-shroom-hit').click({force:true});await pause(120);}
    await gp.waitForSelector('.fx-video:not([hidden])',{timeout:8000});
    await gp.keyboard.press('Escape');
    await pause(500);
    assert.equal(await gp.locator('dtp-achievement').count(),0,'Ohne Konto kein vorgetäuschtes Achievement-Popup');
    assert.deepEqual(errors,[],'Keine JavaScript-Fehler');
    console.log('Achievements im Browser: alle Prüfungen bestanden');
  } finally {
    if(browser)await browser.close();
    server.kill();
    for(const dir of versions)fs.rmSync(dir,{recursive:true,force:true});
    fs.rmSync(scratch,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exit(1);});

