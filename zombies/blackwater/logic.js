// =====================================================================
// BLACKWATER FAIR – Spiellogik: freikaufbare Zugänge, Strom, Stationen, Spawns,
// Multiplayer-Sync, Licht/Glühen, HUD (Ortsanzeige, Minikarte), Zusatz-Zeichnungen.
// Alles wird nur aufgerufen, wenn die Karte aktiv ist (FAIR im Hauptskript).
// =====================================================================
const BW={zun:new Set(['A']),barr:[],zone:null,zoneT:-9,seen:new Set(),synced:false,mm:false,wheelA:0,carA:0,beamA:0,coastA:1,hum:null};
const BW_FLAVOR={A:'Eintritt frei. Austritt unwahrscheinlich.',B:'Heute im Angebot: alles, was noch zuckt.',C:'Baden verboten. Sterben erlaubt.',
 D:'Game Over ist hier wörtlich gemeint.',E:'Keine Rückerstattung im Todesfall.',F:'Hochspannung. Niedrige Lebenserwartung.',G:'Das Licht am Ende des Tunnels ist nur ein Leuchtturm.'};

// ---------------------------------------------------------------------
// Zugänge: Kollision anlegen (vor dem Aufbau des Wegfindungs-Rasters)
// ---------------------------------------------------------------------
function bwInitBarriers(){
 BW.barr=BW_BARR.map((d,i)=>{const [x,y,w,h]=d.r,b=Object.assign({},d,{i,r:{x,y,w,h},open:false,t:-99,cost:BW_PRICES[d.id]});
  b.col={x,y,w,h,barr:1};(d.low?FSOL:solids).push(b.col);
  if(d.k==='debris'){b.pcs=[];const cols=['#6a4a2e','#7a5a3a','#5a3a22','#8a3a2a','#6a6a72','#4a4a52','#b8a888','#c83a3a'];
   for(let k=0;k<44;k++){const px=x-6+Math.random()*(w+10),py=y+Math.random()*h,big=Math.random()<.35;
    b.pcs.push({x:px,y:py,z:Math.random()*(big?6:16),w:big?10+Math.random()*12:3+Math.random()*6,h:big?3+Math.random()*3:2+Math.random()*4,c:cols[Math.random()*cols.length|0],vx:(px-(x+w/2))/(w/2)+Math.random()-.5,vy:(Math.random()-.5)*2})}
   b.pcs.sort((a,c)=>a.y-c.y)}
  return b})}

// Requisiten: Sichtbereich für große Kulissen, Lichter, Gebäudeschilder als Neon
function bwInitWorld(){
 for(const p of PROPS){if(p.t==='wheel')p.vb=[p.x-125,p.y-250,250,260];else if(p.t==='carousel')p.vb=[p.x-70,p.y-115,140,125];else if(p.t==='clowngate')p.vb=[p.x-105,p.y-145,210,155];
  else if(p.t==='billboard')p.vb=[p.x-50,p.y-80,100,90];else if(p.t==='wreck')p.vb=[p.x-60,p.y-50,120,60];
  if(p.t==='flamp')p.lt=bwLight(p.x,p.y-4,p.big?78:62,.85,{lamp:p,hy:p.big?50:40,emer:!!p.emer,c:p.pier?'255,220,170':'255,214,150'});
  else if(p.t==='bulbpole')bwLight(p.x,p.y,42,.55,{hy:46,c:'255,200,120'});
  else if(p.t==='kiosk'||p.t==='icecart')bwLight(p.x,p.y+4,34,.45,{c:'255,170,210',fl:.2});
  else if(p.t==='photobooth')bwLight(p.x,p.y+4,30,.5,{c:'120,220,255',fl:.3})}
 // Notbeleuchtung (immer an, rot) im Kraftwerk und im Tunnel
 for(const [x,y] of [[1100,1290],[1460,1290],[1300,1480],[1760,1260],[1760,1400],[1500,1480]])bwLight(x,y,46,.55,{emer:1,c:'255,60,40'});
 // Innenlicht in Festzelt, Spielhalle, Ständen, Kraftwerk, Leuchtturm
 for(const x of [1140,1260,1380])for(const y of [180,290])bwLight(x,y,70,.6,{c:'255,190,120'});
 for(let x=1060;x<1640;x+=110)for(const y of [760,880,990])bwLight(x,y,58,.55,{c:pick(['200,120,255','90,220,255','255,90,200'])});
 for(const b of BUILD){if(b.kind==='stall')bwLight(b.x+b.w/2,b.y+b.h+6,40,.6,{c:'255,200,120',fl:.15});
  if(b.sign)b.neon=bwNeon(b.x+b.w/2,b.y+b.h+1,b.sign,b.sc||'#ffd23a',{post:false,sy:b.y+b.h-b.z+(b.rup?-b.rup*.25:0)+10,b})}
 for(const [x,y] of [[1140,1320],[1300,1320],[1460,1320],[1140,1460],[1460,1440]])bwLight(x,y,64,.6,{c:'210,230,255',fl:.08});
 bwLight(2378,1336,60,.7,{c:'255,230,170'});
 for(const n of BWN){const by=n.sy!=null?n.sy:n.y-26;n.lt=bwLight(n.x,by-6,Math.max(34,bwTW(n.t,n.s||1)*.7),.55,{c:bwRGB(n.c),sec:n.sec,fl:n.fl,neon:n})}
 // Leuchtturm-Leuchtfeuer
 BW.beacon={x:2378,y:1290+48,z:150};
 // Achterbahn-Überdeckung: grobe Liste der Gleispunkte (für Ausblenden über dem Spieler)
 BW.track=BW_COASTER?BW_COASTER.T.filter((p,i)=>i%6===0&&!p.broke):[]}

// ---------------------------------------------------------------------
// Öffnen eines Zugangs (Host und Clients; fx=false beim stillen Nachladen)
// ---------------------------------------------------------------------
function bwOpen(i,fx){const b=BW.barr[i];if(!b||b.open)return;b.open=true;b.t=fx?now:now-30;
 for(const L of [solids,FSOL]){const k=L.indexOf(b.col);if(k>=0)L.splice(k,1)}
 rebuildArea(b.r.x-16,b.r.y-16,b.r.x+b.r.w+16,b.r.y+b.r.h+16);
 const nz=b.z.filter(z=>!BW.zun.has(z));for(const z of b.z)BW.zun.add(z);
 if(!fx)return;
 const cx=b.r.x+b.r.w/2,cy=b.r.y+b.r.h/2;shake=Math.max(shake,b.k==='debris'||b.k==='bridge'?4:2.5);
 if(nz.length)say('NEUER BEREICH: '+BW_ZONES[nz[0]].n);
 switch(b.k){
 case'debris':sfx('door_break',cx,cy,1,.8,0);sfx('wood_impact',cx,cy,1,.7,0);setTimeout(()=>sfx('wood_impact',cx,cy,.8,1.1,0),250);
  for(let k=0;k<40;k++)part({x:cx+rnd(-18,18),y:cy+rnd(-30,30),z:rnd(0,10),vx:rnd(-30,30),vy:rnd(-20,20),vz:rnd(5,25),life:rnd(1.2,2.4),c:pick(['#8a7a68','#6a5e52','#a8988a']),s:4,grow:9,smoke:1});
  for(let k=0;k<24;k++)part({x:cx+rnd(-10,10),y:cy+rnd(-30,30),z:6,vx:rnd(-70,70),vy:rnd(-50,50),vz:rnd(30,90),g:220,life:1,c:pick(['#6a4a2e','#8a3a2a','#6a6a72']),s:2,bounce:1});break;
 case'gate':sfx('door_hit',cx,cy,1,.6,0);sfx('pipe_hit',cx,cy,.8,.7,0);setTimeout(()=>sfx('door_hit',cx,cy,.6,.5,0),420);
  for(let k=0;k<12;k++)part({x:cx+rnd(-20,20),y:cy,z:rnd(4,24),vx:rnd(-20,20),vy:rnd(-10,10),vz:rnd(0,20),g:90,life:1.2,c:pick(['#8a4a2a','#6a3a22','#a8602e']),s:1});break;
 case'shutter':for(let k=0;k<6;k++)setTimeout(()=>sfx('pipe_hit',cx,cy,.45,1.3+k*.08,0),k*120);sfx('container_open',cx,cy,1,.6,0);
  for(let k=0;k<20;k++)part({x:cx+rnd(-30,30),y:cy,z:rnd(18,28),vx:rnd(-10,10),vy:rnd(-4,4),vz:rnd(-5,5),g:80,life:1.4,c:pick(['#8a4a22','#5a5e66']),s:1});break;
 case'bridge':for(let k=0;k<7;k++)setTimeout(()=>{sfx('wood_impact',cx,cy,.9,.8+Math.random()*.4,0);for(let j=0;j<5;j++)part({x:b.r.x+b.r.w*(k/7)+rnd(-3,3),y:cy+rnd(-b.r.h/2,b.r.h/2),z:2,vx:rnd(-20,20),vy:rnd(-20,20),vz:rnd(20,50),g:160,life:.6,c:'#c8d8e8',s:1})},k*160);break;
 default:sfx('door_break',cx,cy,.9,.75,0);sfx('pipe_hit',cx,cy,.7,.6,0);
  for(let k=0;k<26;k++)part({x:cx+rnd(-8,8),y:cy+rnd(-6,6),z:rnd(10,24),vx:rnd(-80,80),vy:rnd(-50,50),vz:rnd(20,80),g:200,life:rnd(.3,.7),c:pick(['#ffe08a','#fff','#ffb03a']),s:1,ember:1})}}

// ---------------------------------------------------------------------
// Strom: Hauptschalter im Kraftwerk
// ---------------------------------------------------------------------
function bwPowerOn(fx){if(POWER.on)return;POWER.on=true;POWER.at=fx?now:now-60;
 if(!fx){bwHumStart();return}
 const x=BW_GEN.x,y=BW_GEN.y;shake=Math.max(shake,5);
 sfx('pipe_hit',x,y,1,.5,0);sfx('door_hit',x,y,1,.45,0);
 for(let k=0;k<50;k++)part({x:x+rnd(-10,10),y:y-rnd(10,26),z:rnd(0,10),vx:rnd(-110,110),vy:rnd(-60,60),vz:rnd(20,110),g:220,life:rnd(.3,.9),c:pick(['#fff','#ffe08a','#8ad8ff','#ffb03a']),s:1,ember:1});
 bwSpinUp();setTimeout(bwChime,3400);
 say('HAUPTSCHALTER UMGELEGT – der Park erwacht …');setTimeout(()=>{if(started)say('STROM IST DA! Automaten und Upgrade-Maschine sind aktiv.')},3600)}
function bwAudio(){try{return ac()}catch{return null}}
// Generator-Anlauf: tiefer Sägezahn, der hochfährt, plus Rumpeln
function bwSpinUp(){const c=bwAudio();if(!c)return;try{const t=c.currentTime,v=OPT.svol*SFX_MASTER*sfxDist(BW_GEN.x,BW_GEN.y)*1.4;if(v<.01){bwHumStart();return}
  const o=c.createOscillator(),o2=c.createOscillator(),lp=c.createBiquadFilter(),gn=c.createGain();o.type='sawtooth';o2.type='square';
  o.frequency.setValueAtTime(18,t);o.frequency.exponentialRampToValueAtTime(55,t+2.6);o2.frequency.setValueAtTime(9,t);o2.frequency.exponentialRampToValueAtTime(110,t+2.6);
  lp.type='lowpass';lp.frequency.setValueAtTime(200,t);lp.frequency.linearRampToValueAtTime(900,t+2.4);lp.frequency.linearRampToValueAtTime(380,t+3.4);
  gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(v*.5,t+.3);gn.gain.linearRampToValueAtTime(v*.7,t+2.5);gn.gain.exponentialRampToValueAtTime(.001,t+3.6);
  o.connect(lp);o2.connect(lp);lp.connect(gn);gn.connect(c.destination);o.start(t);o2.start(t);o.stop(t+3.7);o2.stop(t+3.7)}catch{}
 setTimeout(bwHumStart,2600)}
// Dauerbrummen in der Nähe des Kraftwerks (Lautstärke in bwUpdate)
function bwHumStart(){if(BW.hum)return;const c=bwAudio();if(!c)return;try{const o=c.createOscillator(),o2=c.createOscillator(),lp=c.createBiquadFilter(),gn=c.createGain();
  o.type='sawtooth';o.frequency.value=50;o2.type='sine';o2.frequency.value=100.6;lp.type='lowpass';lp.frequency.value=320;gn.gain.value=0;
  o.connect(lp);o2.connect(lp);lp.connect(gn);gn.connect(c.destination);o.start();o2.start();BW.hum={o,o2,gn}}catch{}}
// Signal: drei aufsteigende Töne wie eine alte Lautsprecheranlage
function bwChime(){const c=bwAudio();if(!c||!started)return;try{const t0=c.currentTime,v=OPT.svol*SFX_MASTER*.5;
  [523,659,784,1046].forEach((f,i)=>{const t=t0+i*.22,o=c.createOscillator(),gn=c.createGain(),lp=c.createBiquadFilter();o.type='square';o.frequency.value=f;lp.type='bandpass';lp.frequency.value=1400;lp.Q.value=.8;
   gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(v*.5,t+.02);gn.gain.exponentialRampToValueAtTime(.001,t+(i===3?.9:.3));o.connect(lp);lp.connect(gn);gn.connect(c.destination);o.start(t);o.stop(t+1)})}catch{}}
const sfxDist=(x,y)=>{const L=listener();return distGain(Math.hypot(x-L.x,y-L.y))};

// ---------------------------------------------------------------------
// Interaktion (vor den Kaufstationen im Hauptskript). Rückgabe true = erledigt.
// ---------------------------------------------------------------------
function bwInteract(pl,me,EP,auth){
 let bb=null,bd=24;for(const b of BW.barr){if(b.open)continue;const r=b.r,dx=Math.max(r.x-pl.x,0,pl.x-(r.x+r.w)),dy=Math.max(r.y-pl.y,0,pl.y-(r.y+r.h)),d=Math.hypot(dx,dy);if(d<bd){bd=d;bb=b}}
 if(bb){const cost=bb.cost;
  if(me)prompt={x:bb.r.x+bb.r.w/2,y:bb.r.y+bb.r.h/2-30,s:bb.lab+' – '+cost.toLocaleString('en-US')+' POINTS [E]',c:pl.money>=cost?'#fff2a8':'#ff8a7a'};
  if(EP&&auth){if(pl.money<cost){note(pl,'Zu wenig Punkte','#ff8a7a');if(me)sfx('no_money')}
   else{pl.money-=cost;sfx('cash_register',pl.x,pl.y,.7,1,0);ftext(bb.r.x+bb.r.w/2,bb.r.y-20,'-'+cost.toLocaleString('en-US'),'#ffd23a',1);bwOpen(bb.i,true)}}
  return true}
 const st=STATIONS.find(s=>Math.hypot(s.x-pl.x,s.y-pl.y)<20);if(!st)return false;
 if(st.t==='power'){
  if(me)prompt=POWER.on?{x:st.x,y:st.y-40,s:'POWER IS ON',c:'#9fff9f'}:{x:st.x,y:st.y-40,t:'HAUPTSCHALTER',tc:'#ffd23a',d:'Bringt Strom in den ganzen Park',s:'TURN ON THE POWER [E]',c:'#fff2a8'};
  if(EP&&auth&&!POWER.on)bwPowerOn(true);return true}
 if((st.t==='perk'||st.t==='pap')&&!bwStationOn(st)){
  if(me){const I=st.t==='perk'?PERKS[st.k]:{n:'UPGRADE-O-MATIC',c:'#c86bff',d:'Waffen-Verbesserung'};
   prompt={x:st.x,y:st.y-(st.t==='pap'?48:34),t:I.n,tc:shade(I.c,.7),d:I.d,s:POWER.on?'STARTET …':'NO POWER – FIND THE MAIN SWITCH (KRAFTWERK)',c:'#9a96a8'}}
  return true}
 return false}
function bwPerkBuy(pl,k){let s=null,d=1e9;for(const o of STATIONS)if(o.t==='perk'&&o.k===k){const q=Math.hypot(o.x-pl.x,o.y-pl.y);if(q<d){d=q;s=o}}if(s)s.buyT=now}

// ---------------------------------------------------------------------
// Multiplayer: Zustand im Snapshot (offene Zugänge + Strom). Spätere Mitspieler übernehmen ihn still.
// ---------------------------------------------------------------------
function bwSnap(){return{o:BW.barr.filter(b=>b.open).map(b=>b.i),p:POWER.on?1:0}}
function bwApply(s){const fx=BW.synced;for(const i of s.o||[])bwOpen(i,fx);if(s.p&&!POWER.on)bwPowerOn(fx);BW.synced=true}

// ---------------------------------------------------------------------
// Spawns: nur in geöffneten Bereichen, bevorzugt 150–650 px von den Spielern entfernt
// ---------------------------------------------------------------------
function bwPickSpawn(){const act=SPAWNS.filter(s=>BW.zun.has(s.z));if(!act.length)return SPAWNS[0];
 const ps=PL.filter(p=>!p.dead&&!p.away);const md=s=>{let m=1e9;for(const p of ps)m=Math.min(m,Math.hypot(s.x-p.x,s.y-p.y));return m};
 const good=act.filter(s=>{const d=md(s);return d>150&&d<650});const ok=good.length?good:act.filter(s=>md(s)>150);
 const s=pick(ok.length?ok:act);
 if(s.sea)for(let k=0;k<10;k++)part({x:s.x+rnd(-6,6),y:s.y+rnd(-3,3),z:1,vx:rnd(-25,25),vy:rnd(-12,12),vz:rnd(30,70),g:200,life:.6,c:pick(['#c8d8e8','#8aa8c8','#fff']),s:1});
 return s}

// ---------------------------------------------------------------------
// Laufende Aktualisierung (alle Rechner)
// ---------------------------------------------------------------------
function bwUpdate(dt){const pw=POWER.on&&now-POWER.at>1;
 BW.wheelA+=dt*(pw?.11:0);BW.carA+=dt*(pw?.6:0);BW.beamA+=dt*.55;
 const z=P.dead?null:bwZoneAt(P.x,P.y);if(z&&z!==BW.zone){BW.zone=z;if(!BW.seen.has(z)){BW.seen.add(z);BW.zoneT=now}}
 if(BW.hum){const v=OPT.svol*SFX_MASTER*.22*sfxDist(BW_GEN.x,BW_GEN.y)*(1+Math.sin(now*1.7)*.08);try{BW.hum.gn.gain.value=Math.min(.25,v)}catch{}}
 // Funken an defekten Leuchten und Trafos
 if(pw&&Math.random()<dt*2){const n=pick(BWN);if(n&&n.fl>.2&&Math.abs(n.x-P.x)<260&&Math.abs(n.y-P.y)<200)for(let k=0;k<6;k++)part({x:n.x+rnd(-12,12),y:n.y,z:26+rnd(0,8),vx:rnd(-40,40),vy:rnd(-10,10),vz:rnd(0,40),g:200,life:.5,c:pick(['#fff','#ffe08a','#8ad8ff']),s:1,ember:1})}
 if(pw&&Math.random()<dt*1.2&&Math.hypot(1660-P.x,1300-P.y)<300)for(let k=0;k<5;k++)part({x:1660+rnd(-20,20),y:1296,z:20,vx:rnd(-50,50),vy:rnd(-10,10),vz:rnd(10,60),g:200,life:.4,c:pick(['#fff','#8ad8ff']),s:1,ember:1});
 // Gischt an der Küste
 if(Math.random()<dt*6){const x=P.x+rnd(-200,200);if(x>40&&x<2600){const y=x<560?1192:x<1690&&x>624?1702:1704;if(Math.abs(y-P.y)<220)part({x,y:y+rnd(0,6),z:1,vx:rnd(-8,8),vy:rnd(-4,0),vz:rnd(10,30),g:90,life:.8,c:'#d8e4f0',s:1})}}
 // Achterbahn über dem Spieler ausblenden
 let under=false;if(P.x>1720&&P.y<1220)for(const p of BW.track)if(Math.abs(p.x-P.x)<14&&P.y<p.y+4&&P.y>p.y-p.z-10){under=true;break}
 BW.coastA+=((under?.35:1)-BW.coastA)*Math.min(1,dt*8)}

// ---------------------------------------------------------------------
// Zeichnen: Boden-Ebene (nach dem Bodenbild), sortierte Ebene, Überlagerung
// ---------------------------------------------------------------------
function bwRenderGround(cx,cy){
 // Wasser: Mondglitzern und Wellenlinien nur im sichtbaren Bereich
 for(const [x,y,w,h] of BWG.water){const x0=Math.max(x,cx-10),y0=Math.max(y,cy-10),x1=Math.min(x+w,cx+W+10),y1=Math.min(y+h,cy+H+10);if(x1<=x0||y1<=y0)continue;
  for(let gy=Math.floor(y0/12)*12;gy<y1;gy+=12)for(let gx=Math.floor(x0/16)*16;gx<x1;gx+=16){const hsh=((gx*73856093)^(gy*19349663))>>>0,ph=(hsh%1000)/159;
   const s=Math.sin(now*1.6+ph);if(s>.82){const px=gx+(hsh>>10)%16,py=gy+(hsh>>16)%12;if(px>x&&px<x+w-3&&py>y&&py<y+h)R(g,px,py,s>.95?3:2,1,s>.95?'#c8d8f0':'#5a6a8a')}
   else if(s<-.9){const px=gx+(hsh>>8)%16,py=gy+(hsh>>14)%12;if(px>x&&px<x+w-5&&py>y&&py<y+h)R(g,px,py,5,1,'rgba(20,30,60,.6)')}}}
 for(const b of BW.barr)if(b.k==='bridge'&&b.r.x+b.r.w>cx-20&&b.r.x<cx+W+20&&b.r.y+b.r.h>cy-20&&b.r.y<cy+H+20)bwDrawBridge(b)}
function bwRender(L,vis,cx,cy){
 bwPushWalls(L,vis,cx,cy);
 for(const b of BW.barr){if(b.k==='bridge')continue;if(b.open&&now-b.t>1.2&&b.k==='debris')continue;if(!vis(b.r.x-10,b.r.y-40,b.r.w+20,b.r.h+50))continue;L.push({y:b.r.y+b.r.h,f:()=>bwDrawBarrier(b)})}
 for(const n of BWN)if(vis(n.x-60,n.y-50,120,60))L.push({y:n.y+(n.post===false?0:.5),f:()=>bwDrawNeon(n)})}
function bwRenderOver(cx,cy){
 if(BW_COASTER){const c=BW_COASTER;if(c.x0<cx+W&&c.x0+c.cv.width>cx&&c.y0<cy+H&&c.y0+c.cv.height>cy){g.globalAlpha=BW.coastA;g.drawImage(c.cv,c.x0,c.y0);g.globalAlpha=1}}
 // Lichterketten zwischen den Masten der Imbissmeile
 const pw=POWER.on;const poles=[[920,400,1040,440],[1040,440,1200,640],[1480,440,1400,640],[1480,440,1700,400],[1200,640,1400,640],[920,100,1700,100]];
 for(const [x0,y0,x1,y1] of poles){if(Math.max(x0,x1)<cx-20||Math.min(x0,x1)>cx+W+20||Math.max(y0,y1)<cy-60||Math.min(y0,y1)>cy+H+20)continue;
  const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/10);for(let i=0;i<=n;i++){const t=i/n,x=lerp(x0,x1,t),y=lerp(y0,y1,t)-44-Math.sin(t*Math.PI)*(-14)+Math.sin(now*1.3+x*.01)*.6;
   R(g,x,y,1,1,'#2a2228');if(i%2===0){const lit=pw&&bwLit(bwSec(x,y+44),0)&&((i+(x|0))%7!==0);R(g,x-1,y+1,2,2,lit?['#ffd23a','#ff6a4a','#7ad8ff','#ff8ad8'][(i/2)%4]:'#3a3036')}}}}

// Stationen: Hauptschalter und Upgrade-Automat (Arcade/Industrie-Mix)
function bwDrawStation(s){const x=Math.round(s.x),y=Math.round(s.y);
 if(s.t==='power'){const on=POWER.on,k=on?clamp((now-POWER.at)/.4,0,1):0;
  R(g,x-16,y-2,32,4,'rgba(0,0,0,.4)');R(g,x-14,y-38,28,38,'#4a4e46');R(g,x-14,y-38,28,2,'#6a6e64');R(g,x-14,y-38,1,38,'#5e6258');R(g,x+13,y-38,1,38,'#33362f');
  for(let i=0;i<28;i+=6){R(g,x-14+i,y-6,3,4,'#c8a020');R(g,x-11+i,y-6,3,4,'#1a1a1a')}
  R(g,x-11,y-34,16,10,'#1a1c18');R(g,x-10,y-33,4,3,on?'#4af06a':'#2a3a2a');R(g,x-5,y-33,4,3,on?((now*3|0)%2?'#4af06a':'#2a5a2a'):'#3a2020');R(g,x,y-33,4,3,on?'#ffd23a':((now*2|0)%2?'#ff3a2a':'#4a1a14'));
  bwText(g,on?'ON':'OFF',x-10,y-28,on?'#4af06a':'#ff5a4a');
  R(g,x-11,y-21,16,12,'#d8d0b8');bwText(g,'DANGER',x-10,y-20,'#b02a2a');bwText(g,'HV',x-6,y-14,'#1a1a1a');
  // Hebel
  const a=lerp(-1.1,1.1,k),hx=x+10,hy=y-22;R(g,hx-2,hy-3,6,8,'#2a2a2e');bwLine(g,hx+1,hy,hx+1+Math.sin(a)*2+3,hy-Math.cos(a)*14,'#8a8a90',2);bwCirc(g,hx+4+Math.sin(a)*2,hy-Math.cos(a)*14,2.5,'#c83a2a');
  if(!on){const b=(Math.sin(now*4)+1)/2;g.globalAlpha=.4+b*.6;bwTextC(g,'PULL',x,y-46,'#ffd23a');g.globalAlpha=1}
  // Kabel zum Generator
  R(g,x-14,y-10,-10,2,'#1a1a1c');return}
 // Upgrade-Automat
 const on=bwStationOn(s),j=s.job,act=!!j,pulse=.5+Math.sin(now*3)*.5;
 R(g,x-17,y-2,34,4,'rgba(0,0,0,.45)');
 if(on){g.globalAlpha=.22+pulse*.15;g.fillStyle='#b050ff';g.beginPath();g.ellipse(x,y,28,9,0,0,7);g.fill();g.globalAlpha=1}
 // Gehäuse (Industrie-Unterbau + Arcade-Aufsatz)
 R(g,x-15,y-16,30,16,'#3a3a40');R(g,x-15,y-16,30,1,'#5a5a62');for(let i=0;i<30;i+=6){R(g,x-15+i,y-4,3,3,'#c8a020');R(g,x-12+i,y-4,3,3,'#1a1a1a')}
 R(g,x-6,y-13,12,6,'#1a1a1e');R(g,x-5,y-12,10,1,act?'#ff6bff':on?'#7a3aa0':'#2a2a30');
 R(g,x-13,y-48,26,33,'#2a1036');R(g,x-13,y-48,26,1,'#6a3a8a');R(g,x-13,y-48,1,33,'#4a2a5e');R(g,x+12,y-48,1,33,'#1a0826');
 R(g,x-14,y-54,28,7,'#1a0a22');R(g,x-14,y-54,28,1,'#8a4aaa');bwTextC(g,'UPGRADE',x,y-53,on?((act&&(now*8|0)%2)?'#ffffff':'#ff8aff'):'#4a2a5a');
 // Bildschirm
 R(g,x-10,y-44,20,15,'#06040a');
 if(on){if(act){const p=1-j.t/j.T;for(let i=0;i<5;i++){const yy=y-44+((now*40+i*6)%15);R(g,x-10,yy,20,1,'rgba(200,107,255,.6)')}const [len,c]=GUNPIX[j.k]||[10,'#ccc'];R(g,x-len/2,y-38+Math.sin(now*6)*1.5,len,3,c);R(g,x-9,y-31,18*p,1,'#ff8aff')}
  else{for(let i=0;i<3;i++){const a=now*1.5+i*2.1;R(g,x+Math.cos(a)*6-1,y-37+Math.sin(a)*4,2,2,['#ff6bff','#8ae0ff','#fff'][i])}bwTextC(g,'5000',x,y-34,'#c86bff')}
  R(g,x-10,y-44,20,1,'rgba(255,255,255,.2)')}
 else{R(g,x-9,y-43,18,13,'#0c0a10');R(g,x-12,y-40,24,7,'#d8d0c0');bwTextC(g,'NO POWER',x,y-39,'#8a1a1a')}
 // Bedienfeld
 R(g,x-13,y-28,26,6,'#3a1a4a');R(g,x-10,y-27,3,3,on?'#ff3a6a':'#3a1a2a');R(g,x-5,y-27,3,3,on?'#3ad8ff':'#1a2a3a');R(g,x+2,y-26,8,2,'#1a0a22');
 // Zahnräder an der Seite
 for(const sx of [-1,1]){const gx=x+sx*16,gy=y-24,a=act?now*6*sx:on?now*.4*sx:0;bwCirc(g,gx,gy,4,'#5a5a62');for(let i=0;i<6;i++){const aa=a+i*Math.PI/3;R(g,gx+Math.cos(aa)*4-1,gy+Math.sin(aa)*4-1,2,2,'#7a7a82')}bwCirc(g,gx,gy,1.5,'#2a2a2e')}
 if(act&&Math.random()<.4)part({x:x+rnd(-14,14),y:y-rnd(20,50),z:0,vx:rnd(-30,30),vy:0,vz:rnd(10,40),g:80,life:.5,c:pick(['#ff6bff','#ffffff','#8ae0ff']),s:1,ember:1})}

// Perk-Automaten: ohne Strom abgedunkelt, Kaufanimation
function bwPerkOverlay(s){const x=Math.round(s.x),y=Math.round(s.y);
 if(!bwStationOn(s)){R(g,x-11,y-34,22,34,'rgba(8,6,16,.62)');R(g,x-8,y-31,16,7,'#d8d0c0');bwTextC(g,'OFF',x,y-30,'#8a1a1a');R(g,x-1,y-34,2,3,'#6a6a70');return}
 const t=now-(s.buyT||-9);if(t<1.4){const k=t/1.4;g.globalAlpha=(1-k)*.8;R(g,x-11,y-34,22,34,'#ffffff');g.globalAlpha=1;
  const cy=y-22+Math.min(1,k*2.5)*17;R(g,x-4,cy-4,5,4,PERKS[s.k].c);R(g,x-4,cy-4,5,1,'#fff');
  for(let i=0;i<3;i++)R(g,x-12+((now*60+i*9)%24),y-36-((now*40+i*7)%10),1,1,'#fff')}}

// Zusatzdetails für neue Möbel (Grundkörper zeichnet das Hauptskript)
function bwFurn(f){const x=f.x,y=f.y,w=f.w,d=f.d,h=f.hh,pw=POWER.on&&now-POWER.at>bwSec(x,y),fy=y+d-h;
 switch(f.t){
 case'arcade':{R(g,x+1,fy,w-2,3,pw?['#ff3a6a','#3ad8ff','#ffd23a','#7aff6a'][(x/18|0)%4]:'#2a2030');R(g,x+2,fy+5,w-4,9,'#06040a');
  if(pw){const c=['#4a2aff','#ff2a8a','#2affc8','#ffd23a'][((x+y)/7|0)%4];R(g,x+3,fy+6,w-6,7,shade(c,.45));R(g,x+3+((now*20+x)%(w-7)),fy+8,2,2,c);R(g,x+3,fy+11,w-6,1,shade(c,.8))}
  R(g,x+2,fy+16,w-4,2,'#3a3040');R(g,x+3,fy+16,2,1,'#c83a3a');R(g,x+w-5,fy+16,2,1,'#3ac83a');break}
 case'pinball':for(let i=0;i<4;i++)R(g,x+2+(i%2)*6,y-h+3+i*5,2,2,pw&&((now*6+i)|0)%2?'#ffd23a':'#5a3a2a');R(g,x+1,y-h+d-4,w-2,2,'#c8c8d0');break;
 case'claw':R(g,x+1,y-h-12,w-2,14,'rgba(170,210,230,.35)');R(g,x+1,y-h-13,w-2,2,'#c83a6a');for(let i=0;i<5;i++)R(g,x+2+i*3,y-h+(i%2)*2,3,3,['#e8a0c8','#a0c8e8','#e8e0a0','#a0e8b0','#c8a0e8'][i]);R(g,x+w/2,y-h-10,1,4+Math.sin(now)*2,'#9a9aa0');break;
 case'skee':for(let i=0;i<3;i++)R(g,x+2+i*4,y-h+4,2,d-10,'#4a3220');bwCirc(g,x+w/2,y-h+d-6,4,'#2a1a10');bwCirc(g,x+w/2,y-h+d-6,2,pw?'#ffd23a':'#4a3a20');break;
 case'prize':for(let i=0;i<10;i++)R(g,x+3+i*6,y-h-4,4,5,['#e85a8a','#5ac8e8','#e8d05a','#8ae85a','#c88ae8'][i%5]);R(g,x+20,y-h-6,3,3,'#1a1a1a');break;
 case'stage':R(g,x,y-h-30,w,3,'#5a1a22');for(let i=0;i<w;i+=6)R(g,x+i,y-h-27,3,6,'#7a222c');R(g,x+w/2-6,y-h+2,12,6,'#2a1a14');break;
 case'piano':for(let i=0;i<w-4;i+=2)R(g,x+2+i,fy+2,1,3,i%6===4?'#1a1414':'#e8e0d0');break;
 case'turbine':{const cx=x+w/2,cy=y-h+d/2,a=pw?now*8:0;bwEll(g,cx,cy,w/2-3,d/2-2,'#3a4048');for(let i=0;i<6;i++){const aa=a+i*Math.PI/3;bwLine(g,cx,cy,cx+Math.cos(aa)*(w/2-5),cy+Math.sin(aa)*(d/2-4),'#8a9098')}bwCirc(g,cx,cy,2,'#c8a040');break}
 case'generator':for(let i=0;i<w;i+=8){R(g,x+i,fy+h-4,4,3,'#c8a020');R(g,x+i+4,fy+h-4,4,3,'#1a1a1a')}R(g,x+6,y-h+4,10,4,pw?'#4af06a':'#3a2020');if(pw&&Math.random()<.1)R(g,x+rnd(4,w-4),fy+rnd(2,h-4),1,1,'#fff');break;
 case'panel':for(let i=0;i<8;i++)R(g,x+4+i*7,fy+3,3,2,pw?(((now*4+i*3)|0)%3?'#4af06a':'#ff3a2a'):'#2a2a2a');R(g,x+4,fy+8,w-8,3,'#1a2a2a');break;
 case'bumper':R(g,x-1,y-h+d-2,w+2,2,'#2a2a2a');R(g,x+3,y-h+2,w-6,4,'#1a1a1a');R(g,x+w/2,y-h-12,1,12,'#8a8a90');break;
 case'cart':R(g,x+2,y-h+2,6,d-4,'#3a1a10');R(g,x+12,y-h+2,6,d-4,'#3a1a10');R(g,x+w-3,y-h-1,2,3,'#c8a040');break;
 case'coffin':R(g,x+w/2-1,y-h+4,2,10,'#c8b890');R(g,x+w/2-3,y-h+7,6,2,'#c8b890');break;
 case'spiral':{const cx=x+w/2,cy=y-h+d/2;for(let i=0;i<10;i++){const a=i*.62;bwLine(g,cx,cy,cx+Math.cos(a)*11,cy+Math.sin(a)*11,'#6a6a72')}bwCirc(g,cx,cy,3,'#3a3a40');break}
 case'btable':R(g,x+2,y-h+2,4,2,'#c8a040');R(g,x+w-10,y-h+3,5,3,'#e8e0c8');break;
 case'barv':for(let i=0;i<d;i+=14){bwCirc(g,x+w/2,y-h+i+6,5,'#5a3a20');bwCirc(g,x+w/2,y-h+i+6,2,'#3a2412')}break;
 case'fryer':R(g,x+2,y-h+2,w-4,d-4,'#3a2a10');R(g,x+3,y-h+3,w-6,2,'#c8a040');break;
 case'counter2':R(g,x+4,y-h-3,6,3,'#c8c8d0');R(g,x+w-14,y-h-4,8,4,'#d8b040');break}}

// ---------------------------------------------------------------------
// Licht (Dunkelheits-Ausschnitte) und farbiges Glühen
// ---------------------------------------------------------------------
function bwLights(LS,cx,cy){
 for(const l of BWL){if(l.x<cx-120||l.x>cx+W+120||l.y<cy-120||l.y>cy+H+120){l.on=0;continue}
  l.on=l.emer?(Math.sin(now*19+l.x)+Math.sin(now*7+l.y)>1.5?.25:1):bwLit(l.sec,l.fl||0);if(l.on)LS.push([l.x,l.y,l.r,l.a*l.on])}
 for(const b of BW.barr)if(!b.open)LS.push([b.r.x+b.r.w/2,b.r.y+b.r.h/2,26,.35]);
 if(POWER.on&&now-POWER.at>bwSec(BW.beacon.x,BW.beacon.y)){const a=BW.beamA;for(let i=1;i<6;i++)LS.push([BW.beacon.x+Math.cos(a)*i*55,BW.beacon.y+Math.sin(a)*i*30,30+i*8,.5-i*.06])}}
function bwGlow(glow){
 for(const l of BWL){if(!l.on)continue;const hy=l.hy?l.y+4-l.hy:l.y-14;if(l.neon){const n=l.neon,by=n.sy!=null?n.sy:n.y-26;glow(n.x,by-6,bwTW(n.t,n.s||1)*.7+10,l.c,.32*l.on);continue}
  glow(l.x,hy,l.hy?12:18,l.c,.55*l.on);glow(l.x,l.y,l.r*.8,l.c,(l.emer?.14:.1)*l.on)}
 if(POWER.on){const bx=BW.beacon.x,by=BW.beacon.y-BW.beacon.z;if(now-POWER.at>bwSec(BW.beacon.x,BW.beacon.y)){glow(bx,by,26,'255,240,190',.8);const a=BW.beamA;
   for(let i=1;i<9;i++)glow(bx+Math.cos(a)*i*36,by+Math.sin(a)*i*20+i*10,14+i*6,'255,240,200',.22-i*.02)}
  // Riesenrad-Leuchtring
  const wh=PROPS.find(p=>p.t==='wheel');if(wh&&now-POWER.at>bwSec(wh.x,wh.y))glow(wh.x,wh.y-128,130,'255,140,200',.08)}
 // Upgrade-Automat und Hauptschalter
 for(const s of STATIONS){if(s.t==='power')glow(s.x,s.y-30,16,POWER.on?'80,240,110':'255,60,40',.35+(POWER.on?0:Math.sin(now*4)*.2))}}
function bwGlowLo(cx,cy){const glow=(x,y,r,col,a)=>{if(x<cx-r||x>cx+W+r||y<cy-r||y>cy+H+r)return;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba('+col+','+a*.7+')');gr.addColorStop(1,'rgba('+col+',0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)};bwGlow(glow)}

// ---------------------------------------------------------------------
// HUD: Ortsanzeige, Stromstatus, Minikarte [M]
// ---------------------------------------------------------------------
function bwHud(VW,VH,k){
 const zt=now-BW.zoneT;if(BW.zone&&zt<3.4){const Z=BW_ZONES[BW.zone],a=clamp(Math.min(zt*3,(3.4-zt)*1.5),0,1);u.globalAlpha=a;
  HT('BLACKWATER FAIR',VW/2,VH*.3-36*k,16*k,'#b8a8c8','center','"VT323",monospace',700);HT(Z.n,VW/2,VH*.3,44*k,Z.c,'center');HT(BW_FLAVOR[BW.zone],VW/2,VH*.3+26*k,18*k,'#e8e0d4','center');u.globalAlpha=1}
 const R0=VW-24;let y=36*k;
 if(!POWER.on){const b=.6+Math.sin(now*3)*.4;u.globalAlpha=.6+b*.4;HT('⚡ KEIN STROM',R0,y,22*k,'#ff7a5a','right');u.globalAlpha=1;HT('Hauptschalter im Kraftwerk',R0,y+18*k,15*k,'#c8c0b8','right','"VT323",monospace',700);y+=40*k}
 else if(now-POWER.at<6){HT('⚡ STROM AN',R0,y,22*k,'#7aff8a','right');y+=26*k}
 if(!BW.mm){HT('[M] Karte',R0,y,14*k,'#8a8480','right','"VT323",monospace',700);return}
 const mw=Math.min(300*k,VW*.3),s=mw/BW_W,mh=BW_H*s,x0=R0-mw,y0=y;
 u.fillStyle='rgba(6,4,12,.82)';u.fillRect(x0-6,y0-6,mw+12,mh+12);u.fillStyle='#0c1a30';u.fillRect(x0,y0,mw,mh);
 for(const zk in BW_ZONES){const Z=BW_ZONES[zk],open=BW.zun.has(zk);for(const r of Z.r){u.fillStyle=open?shade(Z.c,.42):'#1c1a22';u.fillRect(x0+r[0]*s,y0+r[1]*s,r[2]*s,r[3]*s);
   if(!open){u.fillStyle='rgba(255,255,255,.04)';for(let i=0;i<r[2]*s;i+=5)u.fillRect(x0+r[0]*s+i,y0+r[1]*s,1,r[3]*s)}}}
 for(const r of BWG.water.slice(0,7)){u.fillStyle='#0c1a30';u.fillRect(x0+r[0]*s,y0+r[1]*s,r[2]*s,r[3]*s)}
 for(const [x,y2,w,h,st] of BW_WALLS){if(st==='rail')continue;u.fillStyle=st==='cliff'?'#5a5048':'#8a8290';u.fillRect(x0+x*s,y0+y2*s,Math.max(1,w*s),Math.max(1,h*s))}
 for(const zk in BW_ZONES){const Z=BW_ZONES[zk],r=Z.r[0];u.font='700 '+Math.max(10,11*k)+'px "VT323",monospace';u.textAlign='center';u.fillStyle=BW.zun.has(zk)?'#fff':'#5a5662';u.fillText(zk,x0+(r[0]+r[2]/2)*s,y0+(r[1]+r[3]/2)*s+4)}
 for(const b of BW.barr){const cx2=x0+(b.r.x+b.r.w/2)*s,cy2=y0+(b.r.y+b.r.h/2)*s;u.fillStyle=b.open?'#5aff7a':'#ff4a3a';u.fillRect(cx2-2,cy2-2,4,4)}
 for(const st of STATIONS){if(st.t!=='perk'&&st.t!=='pap'&&st.t!=='power')continue;const c=st.t==='perk'?PERKS[st.k].c:st.t==='pap'?'#c86bff':'#ffd23a';u.fillStyle='#000';u.fillRect(x0+st.x*s-3,y0+st.y*s-3,6,6);u.fillStyle=bwStationOn(st)||st.t==='power'?c:shade(c,.4);u.fillRect(x0+st.x*s-2,y0+st.y*s-2,4,4)}
 for(const p of PL)if(!p.dead){u.fillStyle=p===P?'#ffffff':pcol(p);u.beginPath();u.arc(x0+p.x*s,y0+p.y*s,p===P?3.5:2.5,0,7);u.fill()}
 u.textAlign='left';HT('■ offen  ■ gesperrt  ● Spieler',x0,y0+mh+20*k,13*k,'#a8a0b0','left','"VT323",monospace',700)}
