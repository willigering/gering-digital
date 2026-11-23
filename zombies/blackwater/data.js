// =====================================================================
// BLACKWATER FAIR – Kartendaten (Grundriss v5: organische Bereiche, Wege als Engpässe)
// Wird vor dem Hauptskript geladen. Alle Funktionen greifen erst beim Aufruf auf die
// globalen Spielobjekte (BUILD, FT, solids, FSOL, PROPS, prop() …) zu.
// Formen sind SVG-Pfade im Entwurfsmaßstab (Entwurf × 2 = Welt-Pixel).
// =====================================================================
const BW_S=2,BW_W=3200,BW_H=2120;

// ---- Zentrale Preise (Punkte). Hier anpassen, alles andere liest von hier.
const BW_PRICES={
 AF:750,   // Eingang → Festzelt (Schutt)
 FR:1000,  // Festzelt → Rummel (Tor)
 RC:1250,  // Rummel → Achterbahn (Wartungszaun)
 RS:1250,  // Rummel → Spielhalle (Schutt)
 FP:1000,  // Festzelt → Promenade (Tor)
 PS:1250,  // Promenade → Spielhalle (Rolltor)
 SK:1500,  // Spielhalle → Kraftwerk (Wartungszaun)
 PL:2000,  // kaputte Brücke → Leuchtturm
 LK:1000,  // Zipline Leuchtturm → Kraftwerk
 pap:5000,      // erste Waffenverbesserung (jede weitere Stufe: pap × Stufe)
 perkBase:2500, // 1. Perk; jeder weitere +perkStep
 perkStep:500,
 car:[20,120,200,450], // Auto: meist min–max1, mit 12 % Chance max1–max2
 till:[300,800]           // Kasse (Ticketschalter, Festzelt, Spielhalle, Buden …)
};
const BW_START={x:380,y:1330};
const BW_GEN={x:2640,y:640}; // Hauptschalter im Kraftwerkshof (Ausgangspunkt der Stromwelle)

// ---- Formen (Entwurfskoordinaten)
const BW_COAST='M0 0 L1600 0 L1600 420 C1540 470 1480 470 1440 520 C1400 580 1300 600 1220 640 C1160 680 1150 760 1080 790 C1000 820 900 800 820 820 C720 850 640 930 560 960 C440 1010 300 1000 160 1010 C100 1015 40 1030 0 1040Z';
const BW_ZONES={
 A:{n:'EINGANG & PARKPLATZ',c:'#5ad8ff',m:'pave',d:'M50 620 C90 580 260 575 330 600 C370 620 380 690 360 740 L360 820 C410 815 480 825 505 860 C530 900 510 945 470 958 C420 972 320 972 270 950 C230 930 235 860 260 830 C270 820 280 815 280 800 L280 760 C210 765 120 770 80 750 C45 730 30 660 50 620 Z'},
 F:{n:'FESTZELT',c:'#ff7a6a',m:'pave',d:'M470 600 C510 560 580 570 600 590 C620 560 700 550 720 600 C750 650 760 700 720 740 C700 760 690 790 650 790 C620 790 600 760 560 770 C520 785 470 760 460 720 C440 680 450 630 470 600Z'},
 C:{n:'ACHTERBAHN',c:'#ffd23a',m:'dirt',d:'M200 170 C260 110 330 120 350 170 C365 200 380 210 400 180 C430 130 510 150 520 220 C530 290 500 360 450 390 C400 420 330 420 300 390 C280 370 270 350 240 370 C200 390 160 330 170 270 C175 220 180 190 200 170Z'},
 R:{n:'RUMMEL',c:'#ff8ac8',m:'pave',d:'M650 180 C700 130 800 140 830 170 C850 190 880 180 900 210 C925 250 900 290 880 300 C870 330 850 360 810 360 C770 362 760 335 730 340 C690 350 650 330 640 290 C630 250 625 205 650 180Z'},
 S:{n:'SPIELHALLE',c:'#d88aff',m:'pave',d:'M920 400 C980 360 1110 370 1150 420 C1180 470 1170 560 1120 600 C1090 620 1070 640 1040 630 C1000 620 960 630 930 600 C895 560 880 440 920 400Z'},
 K:{n:'KRAFTWERK',c:'#ff5a4a',m:'conc',d:'M1200 150 C1260 100 1360 100 1390 140 C1410 165 1450 130 1480 160 C1520 210 1510 300 1450 330 C1400 350 1370 320 1330 340 C1280 360 1230 340 1215 300 C1195 260 1170 190 1200 150Z'},
 P:{n:'PROMENADE & PIER',c:'#c8a070',m:'board',d:'M780 800 C820 770 860 790 900 775 C950 755 990 770 1030 752 C1080 745 1110 790 1080 815 C1040 840 1000 820 960 840 C920 858 880 845 840 860 C790 875 755 835 780 800Z M920 840 L964 840 L964 980 L1004 980 L1004 1040 L880 1040 L880 980 L920 980 Z'},
 L:{n:'LEUCHTTURM',c:'#e8dcc8',m:'rock',d:'M1260 760 C1300 700 1420 700 1460 750 C1500 810 1470 890 1400 910 C1330 930 1260 900 1240 850 C1230 820 1240 790 1260 760Z'},
};
const BW_FLAVOR={A:'Eintritt frei. Austritt unwahrscheinlich.',F:'Heute im Angebot: alles, was noch zuckt.',C:'Keine Rückerstattung im Todesfall.',R:'Jeder gewinnt. Meistens den Tod.',
 S:'Game Over ist hier wörtlich gemeint.',K:'Hochspannung. Niedrige Lebenserwartung.',P:'Baden verboten. Sterben erlaubt.',L:'Das Licht am Ende des Tunnels.'};
// Wege zwischen den Bereichen (Breite 26 im Entwurf = 52 px). k = Art des Zugangs
const BW_PATHS=[
 {id:'AF',d:'M420 845 C430 780 455 735 500 700',z:['A','F'],k:'debris',lab:'CLEAR DEBRIS'},
 {id:'FR',d:'M610 560 C640 470 690 400 730 350',z:['F','R'],k:'gate',lab:'OPEN GATE'},
 {id:'RC',d:'M480 260 C560 300 600 250 650 260',z:['R','C'],k:'maint',lab:'UNLOCK COASTER ACCESS'},
 {id:'RS',d:'M860 280 C920 320 940 380 960 400',z:['R','S'],k:'debris',lab:'CLEAR DEBRIS'},
 {id:'FP',d:'M670 720 C720 770 760 800 800 830',z:['F','P'],k:'gate',lab:'OPEN GATE'},
 {id:'PS',d:'M1010 760 C1040 700 1050 640 1040 600',z:['P','S'],k:'shutter',lab:'RAISE SHUTTER'},
 {id:'SK',d:'M1110 400 C1160 350 1190 320 1220 290',z:['S','K'],k:'maint',lab:'UNLOCK POWER PLANT'},
];
const BW_PATHW=26;
const BW_BRIDGE=[2140,1578,370,44]; // Welt-Pixel
const BW_ZIP={a:{x:2742,y:1600},b:{x:2800,y:650}}; // Leuchtturm-Spitze → Kraftwerkshof
const BW_LH_TOP={x:2742,y:1396}; // Galerie oben auf dem Leuchtturm (rup 160)
const BW_LH_STAIRS=[[2780,1398,12,206,'v']],BW_LH_STAIR=BW_LH_STAIRS[0],BW_LH_GAL=[2714,1384,78,24];
function bwHigh(x,y){if(typeof BW_LH_GAL==='undefined')return false;for(const [a,b,w,h] of [...BW_LH_STAIRS,BW_LH_GAL])if(x>a-2&&x<a+w+2&&y>b-2&&y<b+h+2)return true;return false} // Außentreppe (Ostseite) und Galerie, begehbar

// ---- Kleiner SVG-Pfad-Leser (nur M, L, C, Z, absolut) → Punktlisten in Welt-Pixeln
function bwPathPts(d,step=6){const t=d.match(/[MLCZ]|-?[\d.]+/g),out=[];let cur=null,i=0,x=0,y=0,sx=0,sy=0;const num=()=>+t[i++]*BW_S;
 while(i<t.length){const c=t[i++];if(c==='M'){x=num();y=num();sx=x;sy=y;cur=[[x,y]];out.push(cur)}
  else if(c==='L'){x=num();y=num();cur.push([x,y])}
  else if(c==='C'){const x1=num(),y1=num(),x2=num(),y2=num(),x3=num(),y3=num(),n=Math.max(2,Math.ceil(Math.hypot(x3-x,y3-y)/step));
   for(let k=1;k<=n;k++){const u=k/n,v=1-u;cur.push([v*v*v*x+3*v*v*u*x1+3*v*u*u*x2+u*u*u*x3,v*v*v*y+3*v*v*u*y1+3*v*u*u*y2+u*u*u*y3])}x=x3;y=y3}
  else if(c==='Z'){x=sx;y=sy}}
 return out}
const bwP2=d=>new Path2D(d); // in Entwurfskoordinaten, mit scale(BW_S) zeichnen

// ---- Begehbarkeits-Raster (4 px): 1 = begehbar. Zonen-Raster: Index+1 der Zone
const BW_G=4,BW_GW=BW_W/BW_G,BW_GH=BW_H/BW_G,BW_ZK=Object.keys(BW_ZONES);
let BW_MASK=null,BW_ZMASK=null,BW_LAND=null;
function bwBuildMask(){
 const mk2=()=>{const c=document.createElement('canvas');c.width=BW_GW;c.height=BW_GH;const x=c.getContext('2d');x.scale(BW_S/BW_G,BW_S/BW_G);return[c,x]};
 const [c1,x1]=mk2();x1.fillStyle='#fff';x1.strokeStyle='#fff';x1.lineCap='round';x1.lineJoin='round';
 for(const k of BW_ZK)x1.fill(bwP2(BW_ZONES[k].d));
 x1.lineWidth=BW_PATHW;for(const p of BW_PATHS)x1.stroke(bwP2(p.d));
 x1.setTransform(1/BW_G,0,0,1/BW_G,0,0);x1.fillRect(...BW_BRIDGE);for(const s of BW_LH_STAIRS)x1.fillRect(s[0],s[1],s[2],s[3]);x1.fillRect(...BW_LH_GAL);
 const d1=x1.getImageData(0,0,BW_GW,BW_GH).data;BW_MASK=new Uint8Array(BW_GW*BW_GH);for(let i=0;i<BW_MASK.length;i++)BW_MASK[i]=d1[i*4+3]>140?1:0;
 const [c2,x2]=mk2();BW_ZK.forEach((k,i)=>{x2.fillStyle='rgb('+((i+1)*25)+',0,0)';x2.fill(bwP2(BW_ZONES[k].d))});
 const d2=x2.getImageData(0,0,BW_GW,BW_GH).data;BW_ZMASK=new Uint8Array(BW_GW*BW_GH);for(let i=0;i<BW_ZMASK.length;i++)BW_ZMASK[i]=d2[i*4+3]>200?Math.round(d2[i*4]/25):0;
 const [c3,x3]=mk2();x3.fillStyle='#fff';x3.fill(bwP2(BW_COAST));const d3=x3.getImageData(0,0,BW_GW,BW_GH).data;BW_LAND=new Uint8Array(BW_GW*BW_GH);for(let i=0;i<BW_LAND.length;i++)BW_LAND[i]=d3[i*4+3]>127?1:0}
const bwCell=(M,x,y)=>{const gx=x/BW_G|0,gy=y/BW_G|0;return gx<0||gy<0||gx>=BW_GW||gy>=BW_GH?0:M[gy*BW_GW+gx]};
const bwWalk=(x,y)=>bwCell(BW_MASK,x,y)===1;
const bwLandAt=(x,y)=>bwCell(BW_LAND,x,y)===1;
// true = Kreis (x,y,r) liegt (teilweise) außerhalb der begehbaren Fläche
function bwOff(x,y,r){return!(bwWalk(x-r,y-r)&&bwWalk(x+r,y-r)&&bwWalk(x-r,y+r)&&bwWalk(x+r,y+r)&&bwWalk(x,y))}
function bwZoneAt(x,y){const i=bwCell(BW_ZMASK,x,y);return i?BW_ZK[i-1]:null}

// Kompatibilität mit älterem Code (rechteckige Listen werden nicht mehr gebraucht)
const BWG={asph:[],pave:[],dirt:[],board:[],conc:[],rock:[],plat:[],mid:[],shore:[],grass:[],water:[],rocks:[]};
const BW_HARD=[];
// ---- Mauern/Zäune [x,y,w,h,Stil]: brick/conc blocken Kugeln, iron/rail nur Bewegung
const BW_WALLS=[
 // Zaun am Clownstor (Engstelle zwischen Parkplatz und Vorplatz)
 [548,1586,26,8,'iron'],[706,1586,30,8,'iron'],
];
const BW_STAIRS=[];

// ---- Gebäude
function bwStall(x,y,w,h,col,rc,sign,sc,till){return{x,y,w,h,z:34,wall:col,rc,roof:'flat',kind:'stall',floor:'wood',inner:shade(col,.8),pass:1,
 N:[[w/2-10,20,'o']],S:[[10,w-20,'o']],W:[[18,16,'o']],E:[],inner:[],sign,sc,roofFn:bwRoofAwning,wallFn:bwWallStall,rup:18,
 furn:[['counter2',10,h-16],till?['register',w-36,8]:['fryer',8,8],['crate',w-22,h-30]]}}
function bwArcadeFurn(){const f=[];
 for(let x=16;x<360;x+=18)if(x<120||x>200)f.push(['arcade',x,22]);
 for(const [a,b] of [[40,150],[230,330]])for(let x=a;x<b;x+=18){f.push(['arcade',x,96]);f.push(['arcade',x,104]);f.push(['arcade',x,170]);f.push(['arcade',x,178])}
 for(let y=60;y<240;y+=34)if(y<120||y>200)f.push(['pinball',6,y]);
 f.push(['claw',330,230],['claw',348,230],['prize',250,248],['desk',20,250],['register',40,246],['cabinet',360,40]);
 return f}
function bwTentFurn(){const f=[['stage',80,12],['piano',20,16],['barv',248,50],['register',200,176],['crate',240,160]];
 for(const cx of [20,80,160])for(const y of [70,120])if(!(cx===160&&y===70)){f.push(['btable',cx,y]);f.push(['bbench',cx,y-7]);f.push(['bbench',cx,y+14])}return f}
function bwBuildings(){const B=[];
 // A: Ticketschalter und Wachhaus am Vorplatz
 B.push({x:740,y:1656,w:52,h:44,z:30,wall:'#7a2a3a',rc:'#c8304a',roof:'flat',kind:'booth',floor:'wood',inner:'#a07a6a',N:[],S:[[8,36,'w']],W:[[14,16,'d']],E:[],inner:[],furn:[['register',14,8]],roofFn:bwRoofBooth,wallFn:bwWallBooth,rup:12,sign:'TICKETS',sc:'#ffd23a'});
 B.push({x:560,y:1700,w:52,h:44,z:30,wall:'#7a2a3a',rc:'#c8304a',roof:'flat',kind:'booth',floor:'wood',inner:'#a07a6a',N:[],S:[[8,36,'w']],W:[],E:[[14,16,'d']],inner:[],furn:[['register',8,8]],roofFn:bwRoofBooth,wallFn:bwWallBooth,rup:12});
 B.push({x:840,y:1770,w:150,h:96,z:36,wall:'#4a5462',rc:'#343a44',roof:'flat',kind:'siding',floor:'tile',inner:'#a8aca0',
  N:[[30,16,'w'],[100,16,'w']],S:[[20,16,'w'],[66,18,'d']],W:[[40,18,'d']],E:[[40,16,'w']],inner:[[96,0,96,96,[[56,18,'d']]]],
  furn:[['desk',10,10],['desk',40,10],['cabinet',70,6],['locker',102,6],['locker',114,6],['locker',126,6],['bench',104,66],['crate',14,66],['register',40,66]],sign:'SECURITY',sc:'#7ad8ff'});
 // F: Festzelt + Buden
 B.push({x:1060,y:1220,w:280,h:200,z:44,wall:'#a8202a',rc:'#c82a34',roof:'flat',kind:'canvas',floor:'boards',inner:'#5a161c',pass:1,
  N:[[120,40,'o']],S:[[110,60,'o']],W:[[80,40,'o']],E:[[80,40,'o']],inner:[],roofFn:bwRoofTent,wallFn:bwWallCanvas,rup:52,rov:6,furn:bwTentFurn()});
 for(const [x,y,c,rc,s,sc] of [[1380,1236,'#c8a030','#d83a2a','CORN DOGS','#ffd23a'],[952,1320,'#3a7ac8','#e8e8f0','BRAIN FREEZE','#7ad8ff']])B.push(bwStall(x,y,72,56,c,rc,s,sc,1));
 // R: Geisterbahn + Wurfbude
 B.push({x:1600,y:420,w:150,h:110,z:46,wall:'#2a2430',rc:'#1a1620',roof:'gable',kind:'wood',floor:'carpet',inner:'#3a2a3a',pass:1,
  N:[],S:[[24,24,'o'],[104,24,'o']],W:[[40,20,'o']],E:[],inner:[[70,30,70,110,[]]],
  furn:[['coffin',20,40],['coffin',96,30],['coffin',110,70]],wallFn:bwWallHaunt,sign:'GEISTERBAHN',sc:'#8aff6a'});
 B.push({x:1300,y:380,w:80,h:60,z:32,wall:'#6a2a5a',rc:'#ffd23a',roof:'flat',kind:'stall',floor:'wood',inner:'#5a2a4a',pass:1,N:[],S:[[10,60,'o']],W:[[20,16,'o']],E:[],inner:[],
  furn:[['counter2',14,40],['register',8,8],['crate',60,8]],roofFn:bwRoofAwning,wallFn:bwWallStall,rup:18,sign:'WHACK-A-ZED',sc:'#ffd23a'});
 // C: Achterbahn-Station
 B.push({x:600,y:480,w:150,h:80,z:36,wall:'#5a3a2a',rc:'#4a2a22',roof:'gable',kind:'wood',floor:'boards',inner:'#6a4a3a',pass:1,
  N:[],S:[[50,44,'o']],W:[[20,36,'o']],E:[[20,36,'o']],inner:[],furn:[['cart',16,14],['cart',66,14],['cart',112,14],['register',14,54]],wallFn:bwWallWood,sign:'THE LAST RIDE',sc:'#ff4a3a'});
 // S: Spielhalle
 B.push({x:1880,y:836,w:380,h:280,z:56,wall:'#2a1a3e',rc:'#1e1628',roof:'flat',kind:'arcade',floor:'arcade',inner:'#2e2240',pass:1,
  N:[[30,60,'o'],[300,50,'o']],S:[[180,60,'o']],W:[[120,50,'o']],E:[[120,40,'o']],inner:[],furn:bwArcadeFurn(),roofFn:bwRoofArcade,wallFn:bwWallArcade,rup:34,sign:'ARCADE',sc:'#ff6aff'});
 // K: Turbinenhalle + Leitstand
 B.push({x:2500,y:340,w:380,h:240,z:60,wall:'#45454c',rc:'#3a3a40',roof:'flat',kind:'metal',floor:'conc2',inner:'#3a3a40',pass:1,
  N:[],S:[[60,50,'o'],[270,50,'o']],W:[[100,40,'o']],E:[],inner:[[260,0,260,130,[[60,20,'d']]]],rooms:[[260,0,120,130,'metal']],
  furn:[['turbine',30,40],['turbine',110,40],['turbine',190,40],['turbine',30,140],['turbine',110,140],['generator',180,150],['panel',280,20],['panel',280,60],['register',300,100],['cabinet',360,10]],
  roofFn:bwRoofPlant,wallFn:bwWallConc,rup:20,sign:'BLACKWATER POWER CO.',sc:'#8ad06a'});
 // P: Imbiss auf der Promenade
 B.push(bwStall(1640,1570,72,56,'#c8602a','#ffe0a0','FRIED EVERYTHING','#ffb040',1));
 // L: Leuchtturm
 B.push({x:2710,y:1560,w:64,h:56,z:70,wall:'#e0dcd2',rc:'#5a4a46',roof:'flat',kind:'light',floor:'stone',inner:'#c8c4ba',N:[],S:[[22,20,'d']],W:[],E:[],inner:[],furn:[['spiral',20,14]],wallFn:bwWallLighthouse,roofFn:bwRoofLighthouse,rup:160});
 return B}

// ---- Möbeltypen [Breite, Tiefe, Höhe, Oberseite, Front, durchsuchbar]
const BW_FT={arcade:[12,8,26,'#24162e','#3a2050',1],pinball:[12,24,12,'#1a1a2a','#4a2a6a',1],claw:[16,14,30,'#c8c8d8','#c83a6a',1],skee:[14,44,8,'#6a4a2a','#4a3220'],
 prize:[60,10,14,'#d8b848','#a83a3a',1],stage:[120,26,8,'#5a3a24','#3a2416'],btable:[40,12,8,'#8a6a44','#6a4e32'],bbench:[40,5,9,'#c8904a','#8a5a2a'],
 barv:[12,70,14,'#6a4a2a','#4a3220',1],piano:[30,12,16,'#1a1414','#2a2020',1],counter2:[52,6,12,'#c8b890','#8a6a48'],fryer:[18,10,14,'#9a9aa0','#6a6a70',1],
 turbine:[50,30,30,'#6a7078','#4a5058'],generator:[60,30,24,'#7a6a3a','#5a4a28'],panel:[60,10,14,'#4a5a5a','#2a3a3a',1],bumper:[16,12,8,'#c83a3a','#8a2a2a'],
 cart:[26,12,10,'#a83020','#6a2016',1],coffin:[10,22,8,'#3a2418','#2a180e',1],spiral:[24,24,40,'#8a8a90','#5a5a60']};
const BW_LOOT={arcade:[],pinball:[],claw:[],prize:['magnum','vector','golf','bat','uzi'],panel:['pipe','smg','lmg'],cart:['bat','pipe','akmp'],coffin:['shotgun','deagle','bat','ak47','dbarrel'],piano:[],fryer:['pipe'],barv:['shotgun','bat','famas']};

// ---- Lichter
const BWL=[],BWN=[];
const bwSec=(x,y)=>.5+Math.hypot(x-BW_GEN.x,y-BW_GEN.y)/900;
function bwLight(x,y,r,a,o={}){const l=Object.assign({x,y,r,a,sec:bwSec(x,y),c:'255,214,150'},o);BWL.push(l);return l}
function bwNeon(x,y,t,c,o={}){const n=Object.assign({x,y,t,c,sec:bwSec(x,y),post:true,fl:0},o);BWN.push(n);return n}

// =====================================================================
// Aufbau – wird vom Hauptskript an den passenden Stellen aufgerufen
// =====================================================================
function bwDefine(){
 bwBuildMask();
 Object.assign(FT,BW_FT);
 for(const b of bwBuildings())BUILD.push(b);
 for(const [x,y,w,h,s] of BW_WALLS){const o={x,y,w,h,st:s};(s==='brick'||s==='conc'?solids:FSOL).push(o)}
}
// Parkplatz voller Autos (alle durchsuchbar)
function bwCars(){const C=[],cols=['#3d6c8a','#8a3d3d','#c9c3b5','#4c6b3c','#555','#7a4a8a','#a33','#ddd','#2d4a6d','#c8a030','#6a6a3a'];let i=0;
 for(const [y,xs] of [[1196,[150,214,330,394,458,522]],[1270,[120,184,248,440,504,568,632]],[1420,[120,184,248,440,504,568]],[1490,[150,214,330,394]]])
  for(const x of xs){C.push({x,y,v:0,c:cols[i%cols.length],burn:i%7===3?1:0});i++}
 C.push({x:96,y:1330,v:1,c:'#4a5a6a'},{x:680,y:1330,v:1,c:'#8a5a3a',burn:1});
 return C}

function bwProps(){
 // ===== A: Parkplatz & Eingang
 prop({t:'clowngate',x:640,y:1594});solids.push({x:572,y:1580,w:16,h:14},{x:692,y:1580,w:16,h:14});
 prop({t:'billboard',x:420,y:1176,solid:[70,6],txt:['FUN FOR THE','WHOLE CORPSE!']});
 prop({t:'billboard',x:880,y:1676,solid:[70,6],txt:['KIDS EAT FREE','(KIDS ARE FOOD)']});
 for(const [x,y] of [[300,1240],[600,1240],[300,1460],[600,1460],[120,1380],[660,1400]])prop({t:'flamp',x,y,big:1});
 for(const [x,y] of [[380,1240],[400,1450],[230,1350],[560,1370]])prop({t:'cone',x,y});
 for(const [x,y] of [[230,1320],[520,1360],[640,1270]])prop({t:'trolley',x,y,solid:[10,5]});
 prop({t:'fountain',x:720,y:1850,solid:[56,26]});
 prop({t:'infoboard',x:960,y:1720,solid:[24,5],txt:['YOU ARE HERE','(SORRY)']});
 for(const [x,y] of [[620,1660],[680,1900],[960,1880],[540,1860]])prop({t:'flamp',x,y});
 for(const [x,y] of [[620,1800],[880,1910]])prop({t:'bench',x,y,solid:[28,4]});
 for(const [x,y] of [[700,1720],[1000,1800]])prop({t:'trash',x,y});
 prop({t:'balloons',x:800,y:1700,solid:[6,4]});prop({t:'icecart',x:600,y:1880,solid:[30,10]});
 for(const [x,y] of [[400,2010],[200,2060],[1300,1980],[1500,2080],[2300,1900]])prop({t:'buoy',x,y});
 prop({t:'wreck',x:1080,y:2040,solid:[90,22]});
 // ===== F: Festzelt
 for(const [x,y] of [[1000,1460],[1380,1360],[1250,1180]])prop({t:'picnic',x,y,solid:[30,10]});
 prop({t:'striker',x:1430,y:1440,solid:[10,6]});prop({t:'balloons',x:1020,y:1260,solid:[6,4]});
 for(const [x,y] of [[980,1220],[1440,1210],[1000,1520],[1360,1530]])prop({t:'bulbpole',x,y});
 for(const [x,y] of [[1110,1480],[1300,1490]])prop({t:'trash',x,y});
 prop({t:'barrel',x:1450,y:1300,solid:[8,6],fire:1});
 // ===== C: Achterbahn
 prop({t:'derail',x:900,y:700,solid:[26,14]});
 for(const [x,y] of [[460,320],[880,340],[560,720],[860,600]])prop({t:'flamp',x,y});
 prop({t:'barrel',x:420,y:700,solid:[8,6],fire:1});prop({t:'bench',x:720,y:600,solid:[28,4]});prop({t:'trash',x:560,y:600});
 bwNeon(680,470,'YOU MUST BE THIS TALL TO DIE','#ff8a3a',{fl:.25});
 // ===== R: Rummel
 prop({t:'wheel',x:1480,y:600,solid:[100,20]});
 for(const [x,y] of [[1290,480],[1700,330],[1640,660],[1380,680]])prop({t:'flamp',x,y});
 prop({t:'icecart',x:1300,y:600,solid:[30,10]});prop({t:'photobooth',x:1780,y:600,solid:[20,10]});prop({t:'trash',x:1560,y:680});
 // ===== S: Spielhalle (außen)
 for(const [x,y] of [[1860,800],[2300,840],[1860,1150],[2300,1140]])prop({t:'flamp',x,y});
 prop({t:'dumpster',x:2300,y:980,solid:[26,12]});prop({t:'horse',x:2000,y:1180,solid:[18,6]});prop({t:'trash',x:1900,y:1180});
 bwNeon(2070,1200,'LOST CHILDREN','#ffd23a',{fl:.5});
 // ===== K: Kraftwerk
 for(const [x,y] of [[2560,640],[2720,640]])prop({t:'transformer',x,y,solid:[30,14]});
 for(const [x,y] of [[2470,600],[2900,620]])prop({t:'drum',x,y,solid:[14,10]});
 prop({t:'pylon',x:2800,y:610,solid:[8,6]});prop({t:'pylon',x:2940,y:300,solid:[8,6]});
 // ===== P: Promenade & Pier
 prop({t:'carousel',x:1884,y:2036,solid:[72,30]});
 for(const [x,y] of [[1620,1540],[1820,1560],[2000,1520],[2120,1560]])prop({t:'flamp',x,y,pier:1});
 for(const y of [1720,1820,1920])prop({t:'flamp',x:1846,y,solid:[4,4],pier:1});
 for(const [x,y] of [[1760,1640],[1990,1620]])prop({t:'bench',x,y,solid:[28,4]});
 for(const x of [1700,1950,2100])prop({t:'lifering',x,y:1690});
 prop({t:'kiosk',x:2060,y:1600,solid:[34,14]});
 // ===== L: Leuchtturm
 for(const [x,y] of [[2600,1500],[2860,1720],[2580,1760]])prop({t:'boulder',x,y,solid:[20,10]});
}
function bwBirds(){for(let i=0;i<5;i++)BIRDS.push({x:1620+i*110+srnd(0,30),y:1690,z:7,perch:true,ph:sr()*6});
 for(let i=0;i<4;i++)BIRDS.push({x:1100+i*60,y:1330,z:96,perch:true,ph:sr()*6})}

// ---- Kaufstationen. Perk-Automaten werden im Spiel zufällig auf BW_PERKSLOTS verteilt (immer vor einer Wand)
const BW_PERKSLOTS=[[766,1712],[930,1878],[1110,1432],[1300,1432],[1416,1304],[1680,542],[1720,542],[640,572],[700,572],[1960,1128],[2180,1128],[2560,592],[2840,592],[1676,1638],[2732,1632],[988,1388]];
function bwStations(){return[
 {t:'perk',k:'thicc',x:0,y:0},{t:'perk',k:'popcorn',x:0,y:0},{t:'perk',k:'twixx',x:0,y:0},{t:'perk',k:'ravioli',x:0,y:0},{t:'perk',k:'brain',x:0,y:0},
 {t:'pap',x:2070,y:1000},{t:'power',x:BW_GEN.x,y:BW_GEN.y},
 {t:'wall',k:'uzi',x:612,y:1755},{t:'wall',k:'dbarrel',x:1230,y:1432},{t:'wall',k:'ak47',x:780,y:572},{t:'wall',k:'akmp',x:1420,y:424},
 {t:'wall',k:'famas',x:2060,y:1128},{t:'wall',k:'shotgun',x:1600,y:1638},{t:'wall',k:'lmg',x:2700,y:592},
 {t:'ammo',x:500,y:1720},{t:'ammo',x:1140,y:1180},{t:'ammo',x:880,y:540},{t:'ammo',x:1820,y:1060},{t:'ammo',x:2950,y:460},{t:'ammo',x:1520,y:420}]}
function bwBoxSpots(){return[[560,1350],[1000,1200],[560,280],[1300,480],[2290,880],[2900,520],[1900,1560],[2620,1660]]}

// ---- Zombie-Spawns: am Rand jeder Zone (automatisch)
function bwSpawns(){const S=[];
 for(const k of BW_ZK){const pts=bwPathPts(BW_ZONES[k].d,10)[0];let cx=0,cy=0;for(const p of pts){cx+=p[0];cy+=p[1]}cx/=pts.length;cy/=pts.length;
  const c=[];for(let i=0;i<pts.length;i+=3){const [x,y]=pts[i],l=Math.hypot(cx-x,cy-y)||1,ix=x+(cx-x)/l*26,iy=y+(cy-y)/l*26;if(!blocked(ix,iy,8)&&bwZoneAt(ix,iy)===k)c.push([ix,iy])}
  const n=Math.min(8,c.length);for(let i=0;i<n;i++){const [x,y]=c[Math.floor(i*c.length/n)];S.push({x,y,z:k,sea:k==='P'||k==='L'})}}
 return S}

// ---- Freikaufbare Zugänge: auf der Mitte jedes Weges
function bwBarrDefs(){const D=[];
 for(const p of BW_PATHS){const pts=bwPathPts(p.d,4)[0],m=pts[pts.length>>1],q=pts[(pts.length>>1)+1]||pts[(pts.length>>1)-1],dx=Math.abs(q[0]-m[0]),dy=Math.abs(q[1]-m[1]);
  let v=dx>dy?1:0;if(p.k==='shutter')v=0;if(p.k==='maint')v=1;const cx=Math.round(m[0]),cy=Math.round(m[1]),L=BW_PATHW*BW_S+16;
  D.push({id:p.id,k:p.k,lab:p.lab,z:p.z,v,r:v?[cx-10,cy-L/2,20,L]:[cx-L/2,cy-10,L,20],c:[cx-L/2+4,cy-L/2+4,L-8,L-8]})}
 const [bx,by,bw,bh]=BW_BRIDGE;D.push({id:'PL',k:'bridge',lab:'REPAIR BRIDGE',z:['P','L'],r:[bx+30,by,bw-60,bh],c:[bx+26,by-8,bw-52,bh+16],low:1});
 D.push({id:'LK',k:'zip',lab:'UNLOCK ZIPLINE',z:['L','K'],r:[BW_LH_TOP.x-16,BW_LH_TOP.y-10,32,20],noCol:1,top:1});
 return D}
const BW_BARR=[];
// Bäume: auf Land außerhalb der begehbaren Fläche (Wald zwischen den Bereichen)
function bwTreeOk(x,y){return bwLandAt(x,y)&&!bwWalk(x,y)&&!bwWalk(x-20,y)&&!bwWalk(x+20,y)&&!bwWalk(x,y+16)&&!bwWalk(x,y-30)&&bwLandAt(x,y+20)}
function bwGrassOk(x,y){return bwLandAt(x,y)&&!bwWalk(x,y)}
