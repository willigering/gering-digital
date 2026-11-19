// =====================================================================
// BLACKWATER FAIR – Kartendaten (Grundriss, Gebäude, Requisiten, Zugänge, Spawns)
// Wird vor dem Hauptskript geladen. Alle Funktionen greifen erst beim Aufruf auf die
// globalen Spielobjekte (BUILD, FT, solids, FSOL, PROPS, prop() …) zu.
// Alle Koordinaten in Welt-Pixeln. Zufall nur über sr()/srnd() (deterministisch für Multiplayer).
// =====================================================================
const BW_W=2640,BW_H=1300;

// ---- Zentrale Preise (Punkte). Hier anpassen, alles andere liest von hier.
const BW_PRICES={
 AB:750,   // A→B  Verschütteter Durchgang (Eingang → Festzelt/Imbissmeile)
 BD:1250,  // B→D  Metallrolltor (Imbissmeile → Spielhalle)
 BE:1500,  // B→E  Versperrter Wartungszugang (Imbissmeile → Riesenrad/Achterbahn)
 DE:1750,  // D↔E  Servicetor (Spielhalle ↔ Achterbahn) – schließt den Rundweg
 pap:5000,      // erste Waffenverbesserung (jede weitere Stufe: pap × Stufe)
 perkBase:2500, // 1. Perk; jeder weitere +perkStep (2500/3000/3500/4000/4500)
 perkStep:500
};
const BW_START={x:462,y:566};
const BW_GEN={x:2470,y:1004}; // Hauptschalter im Generator-Hof (Bereich E) (Ausgangspunkt der Stromwelle)

// ---- Bereiche (für Spawns, Ortsanzeige, Minikarte)
const BW_ZONES={
 A:{n:'EINGANG & PARKPLATZ',c:'#c8a050',r:[[40,40,840,620]]},
 B:{n:'FESTZELT & IMBISSMEILE',c:'#e05a4a',r:[[892,40,828,620]]},
 D:{n:'SPIELHALLE',c:'#c86aff',r:[[950,672,770,528]]},
 E:{n:'RIESENRAD & ACHTERBAHN',c:'#ffd23a',r:[[1732,40,828,1160]]},
};
function bwZoneAt(x,y){for(const k in BW_ZONES)for(const r of BW_ZONES[k].r)if(x>=r[0]&&x<r[0]+r[2]&&y>=r[1]&&y<r[1]+r[3])return k;return null}

// ---- Bodenflächen [x,y,w,h]
const BWG={
 asph:[[40,40,840,320],[1732,300,828,64],[2096,40,64,1160],[1732,1060,828,60]],
 pave:[[40,360,840,300],[892,40,828,620],[950,672,770,528]],
 dirt:[[1732,40,828,1160]],
 board:[],conc:[],rock:[],plat:[],mid:[],shore:[],
 grass:[[60,400,60,40],[810,604,56,40],[1752,600,120,200],[2170,980,200,60],[1760,860,110,120],[2420,400,120,140],[1810,250,150,40]],
 water:[[0,0,40,1300],[40,672,910,628],[950,1212,1690,88],[2572,40,68,1172]],
 rocks:[[40,668,910,14]],
};
// befahrbare/harte Flächen für Schrittgeräusch & Bepflanzung
const BW_HARD=[...BWG.asph,...BWG.pave];

// ---- Begrenzungen [x,y,w,h,Stil]  brick/conc = Mauer (blockt auch Kugeln), iron/rail = Zaun (Kugeln fliegen durch)
const BW_WALLS=[
 [40,28,2532,12,'iron'],[28,28,12,1162,'iron'],[2560,40,12,1172,'iron'],
 // A | B
 [880,40,12,430,'brick'],[880,540,12,120,'brick'],
 // A: Parkplatz | Vorplatz (Zaun mit Clownstor und zwei Drehkreuzen)
 [40,360,110,8,'iron'],[180,360,215,8,'iron'],[525,360,215,8,'iron'],[770,360,110,8,'iron'],
 // A | Meer (Geländer an der Küste)
 [40,660,840,8,'rail'],
 // B | D
 [892,660,388,12,'brick'],[1350,660,370,12,'brick'],
 // B | E
 [1720,40,12,260,'brick'],[1720,360,12,300,'brick'],
 // D | E (mit Servicetor)
 [1720,672,12,208,'brick'],[1720,940,12,260,'brick'],
 // Süden: Spielhalle | Meer
 [950,1200,782,12,'conc'],
 // E | Meer
 [1792,1200,780,12,'conc'],
];
// Treppen (nur Optik): [x,y,w,h,Richtung]
const BW_STAIRS=[];

// ---- Gebäude
function bwStall(x,y,w,h,col,rc,sign,sc){return{x,y,w,h,z:34,wall:col,rc,roof:'flat',kind:'stall',floor:'wood',inner:shade(col,.8),pass:1,
 N:[[30,16,'o']],S:[[10,w-20,'o']],W:[[20,16,'o']],E:[],inner:[],sign,sc,roofFn:bwRoofAwning,wallFn:bwWallStall,rup:18,
 furn:[['counter2',10,h-16],['fryer',8,8],['crate',w-22,8]]}}
function bwArcadeFurn(){const f=[];
 for(let x=20;x<470;x+=18)if(x<250||x>380)f.push(['arcade',x,26]);
 for(const [a,b] of [[120,250],[380,480]]){for(let x=a;x<b;x+=18){f.push(['arcade',x,110]);f.push(['arcade',x,118]);f.push(['arcade',x,196]);f.push(['arcade',x,204])}}
 for(let y=40;y<300;y+=34)if(y<160||y>250)f.push(['pinball',8,y]);
 f.push(['claw',540,140],['claw',560,140],['claw',580,160]);
 for(const x of [480,498,516])f.push(['skee',x,250]);
 f.push(['prize',548,250],['desk',540,20],['cabinet',600,12],['locker',616,60],['crate',580,60]);
 return f}
function bwBuildings(){const B=[];
 // A: Kassenhäuschen und Wachgebäude
 B.push({x:92,y:376,w:52,h:44,z:30,wall:'#7a2a3a',rc:'#c8304a',roof:'flat',kind:'booth',floor:'wood',inner:'#a07a6a',N:[],S:[[8,36,'w']],W:[],E:[[14,16,'d']],inner:[],furn:[['register',8,8]],roofFn:bwRoofBooth,wallFn:bwWallBooth,rup:12});
 B.push({x:776,y:376,w:52,h:44,z:30,wall:'#7a2a3a',rc:'#c8304a',roof:'flat',kind:'booth',floor:'wood',inner:'#a07a6a',N:[],S:[[8,36,'w']],W:[[14,16,'d']],E:[],inner:[],furn:[['register',14,8]],roofFn:bwRoofBooth,wallFn:bwWallBooth,rup:12});
 B.push({x:640,y:250,w:160,h:100,z:36,wall:'#4a5462',rc:'#343a44',roof:'flat',kind:'siding',floor:'tile',inner:'#a8aca0',
  N:[[40,16,'w'],[110,16,'w']],S:[[20,16,'w'],[70,18,'d'],[120,16,'w']],W:[[40,16,'w']],E:[[40,18,'d']],inner:[[100,0,100,100,[[60,18,'d']]]],
  furn:[['desk',10,10],['desk',40,10],['cabinet',80,6],['locker',106,6],['locker',118,6],['locker',130,6],['bench',110,70],['crate',14,70]],sign:'SECURITY',sc:'#7ad8ff'});
 // B: Festzelt
 B.push({x:1060,y:110,w:400,h:250,z:44,wall:'#a8202a',rc:'#c82a34',roof:'flat',kind:'canvas',floor:'boards',inner:'#5a161c',pass:1,
  N:[],S:[[170,60,'o']],W:[[96,40,'o']],E:[[96,40,'o']],inner:[],roofFn:bwRoofTent,wallFn:bwWallCanvas,rup:52,rov:6,
  furn:(()=>{const f=[['stage',140,12],['piano',40,16],['barv',368,60],['crate',360,200],['crate',374,212]];for(const cx of [20,80,240,300])for(const y of [76,126,176]){f.push(['btable',cx,y]);f.push(['bbench',cx,y-7]);f.push(['bbench',cx,y+14])}return f})()});
 // B: Imbissmeile
 const ST=[[910,'#c8a030','#d83a2a','CORN DOGS','#ffd23a'],[994,'#3a7ac8','#e8e8f0','BRAIN FREEZE','#7ad8ff'],[1078,'#a83a7a','#ffb0d8','COTTON CANDY','#ff8ad8'],
  [1470,'#4a8a3a','#f0e0a0','MYSTERY MEAT','#a8ff6a'],[1554,'#c8602a','#ffe0a0','FRIED EVERYTHING','#ffb040'],[1638,'#6a3a2a','#e0c090','LAST MEAL','#ff6a4a']];
 for(const [x,c,rc,s,sc] of ST)B.push(bwStall(x,470,72,56,c,rc,s,sc));
 // D: Spielhalle
 B.push({x:1000,y:700,w:640,h:340,z:56,wall:'#2a1a3e',rc:'#1e1628',roof:'flat',kind:'arcade',floor:'arcade',inner:'#2e2240',pass:1,
  N:[[280,70,'o']],S:[[100,50,'o'],[480,50,'o']],W:[[176,60,'o']],E:[[156,40,'o']],
  inner:[[520,0,520,110,[[40,20,'d']]],[520,110,640,110,[[50,20,'o']]]],rooms:[[520,0,120,110,'tile']],furn:bwArcadeFurn(),roofFn:bwRoofArcade,wallFn:bwWallArcade,rup:34});
 // E: Achterbahn-Station, Autoscooter, Geisterbahn, Buden
 B.push({x:1780,y:520,w:150,h:80,z:36,wall:'#5a3a2a',rc:'#4a2a22',roof:'gable',kind:'wood',floor:'boards',inner:'#6a4a3a',pass:1,
  N:[],S:[[50,44,'o']],W:[[20,36,'o']],E:[[20,36,'o']],inner:[],furn:[['cart',16,14],['cart',66,14],['cart',112,14],['bench',20,52]],wallFn:bwWallWood,sign:'THE LAST RIDE',sc:'#ff4a3a'});
 B.push({x:2200,y:700,w:230,h:140,z:40,wall:'#3a4a5a',rc:'#2a3440',roof:'flat',kind:'metal',floor:'metal',inner:'#3a4a5a',pass:1,
  N:[[80,70,'o']],S:[[20,60,'o'],[150,60,'o']],W:[[46,40,'o']],E:[[46,40,'o']],inner:[],
  furn:[['bumper',30,30],['bumper',90,52],['bumper',150,24],['bumper',60,92],['bumper',172,96],['bumper',118,104]],roofFn:bwRoofBumper,wallFn:bwWallMetal,rup:26});
 B.push({x:1780,y:80,w:200,h:150,z:46,wall:'#2a2430',rc:'#1a1620',roof:'gable',kind:'wood',floor:'carpet',inner:'#3a2a3a',pass:1,
  N:[],S:[[30,24,'o'],[150,24,'o']],W:[],E:[[56,20,'o']],inner:[[60,40,60,150,[]],[130,0,130,110,[]]],
  furn:[['coffin',20,70],['coffin',88,40],['coffin',96,90],['coffin',160,20]],wallFn:bwWallHaunt,sign:'GEISTERBAHN',sc:'#8aff6a'});
 B.push({x:2240,y:80,w:100,h:60,z:32,wall:'#6a2a5a',rc:'#ffd23a',roof:'flat',kind:'stall',floor:'wood',inner:'#5a2a4a',pass:1,N:[],S:[[10,80,'o']],W:[[20,16,'o']],E:[],inner:[],
  furn:[['counter2',24,40],['crate',10,8],['crate',74,8]],roofFn:bwRoofAwning,wallFn:bwWallStall,rup:18,sign:'WHACK-A-ZED',sc:'#ffd23a'});
 B.push({x:2380,y:80,w:120,h:60,z:32,wall:'#2a4a3a',rc:'#e8e0d0',roof:'flat',kind:'stall',floor:'wood',inner:'#2a3a2a',pass:1,N:[],S:[[10,100,'o']],W:[],E:[[20,16,'o']],inner:[],
  furn:[['counter2',34,40],['cabinet',10,8],['crate',90,8]],roofFn:bwRoofAwning,wallFn:bwWallStall,rup:18,sign:'SHOOTING GALLERY',sc:'#ff8a3a'});
 return B}

// ---- Möbeltypen [Breite, Tiefe, Höhe, Oberseite, Front, durchsuchbar]
const BW_FT={arcade:[12,8,26,'#24162e','#3a2050',1],pinball:[12,24,12,'#1a1a2a','#4a2a6a',1],claw:[16,14,30,'#c8c8d8','#c83a6a',1],skee:[14,44,8,'#6a4a2a','#4a3220'],
 prize:[60,10,14,'#d8b848','#a83a3a',1],stage:[120,26,8,'#5a3a24','#3a2416'],btable:[40,12,8,'#8a6a44','#6a4e32'],bbench:[40,4,5,'#7a5a3a','#5a4028'],
 barv:[12,70,14,'#6a4a2a','#4a3220',1],piano:[30,12,16,'#1a1414','#2a2020',1],counter2:[52,6,12,'#c8b890','#8a6a48'],fryer:[18,10,14,'#9a9aa0','#6a6a70',1],
 turbine:[50,30,30,'#6a7078','#4a5058'],generator:[60,30,24,'#7a6a3a','#5a4a28'],panel:[60,10,14,'#4a5a5a','#2a3a3a',1],bumper:[16,12,8,'#c83a3a','#8a2a2a'],
 cart:[26,12,10,'#a83020','#6a2016',1],coffin:[10,22,8,'#3a2418','#2a180e',1],spiral:[24,24,40,'#8a8a90','#5a5a60']};
const BW_LOOT={arcade:[],pinball:[],claw:[],prize:['magnum','smg','golf','bat'],panel:['pipe','smg'],cart:['bat','pipe'],coffin:['shotgun','magnum','bat','rifle'],piano:[],fryer:['pipe'],barv:['shotgun','bat']};

// ---- Lichter: {x,y,r,a,sec(Verzögerung nach Strom), emer(=Notlicht, immer an), fl(defekt, flackert), c(Farbe für Glühen)}
const BWL=[],BWN=[];
const bwSec=(x,y)=>.5+Math.hypot(x-BW_GEN.x,y-BW_GEN.y)/650;
function bwLight(x,y,r,a,o={}){BWL.push(Object.assign({x,y,r,a,sec:bwSec(x,y),c:'255,214,150'},o))}
// Neonschild (frei stehend auf Pfosten oder an Fassade): Text in Pixelschrift
function bwNeon(x,y,t,c,o={}){const n=Object.assign({x,y,t,c,sec:bwSec(x,y),post:true,fl:0},o);BWN.push(n);return n}

// =====================================================================
// Aufbau – wird vom Hauptskript an den passenden Stellen aufgerufen
// =====================================================================
function bwDefine(){
 for(const r of BW_HARD)LOTS.push({x:r[0],y:r[1],w:r[2],h:r[3],c:'#444'});
 Object.assign(FT,BW_FT);
 for(const b of bwBuildings())BUILD.push(b);
 // Wasser, Felsen, Begrenzungen
 for(const [x,y,w,h] of BWG.water)FSOL.push({x,y,w,h,water:1});
 for(const [x,y,w,h] of BWG.rocks)FSOL.push({x,y,w,h});
 for(const [x,y,w,h,s] of BW_WALLS){const o={x,y,w,h,st:s};(s==='brick'||s==='conc'?solids:FSOL).push(o)}
}
function bwCars(){return[
 {x:70,y:100,v:0,c:'#3d6c8a'},{x:170,y:100,v:0,c:'#8a3d3d',burn:1},{x:300,y:104,v:0,c:'#c9c3b5'},{x:560,y:100,v:0,c:'#4c6b3c'},{x:700,y:96,v:0,c:'#555',burn:1},
 {x:90,y:214,v:0,c:'#7a4a8a'},{x:240,y:210,v:0,c:'#a33',burn:1},{x:600,y:206,v:0,c:'#ddd'},{x:330,y:280,v:0,c:'#2d4a6d'},
 {x:2120,y:1100,v:1,c:'#c8a030',burn:1}]}

function bwProps(){
 // ===== A: Parkplatz & Eingang
 prop({t:'clowngate',x:460,y:370});solids.push({x:392,y:356,w:16,h:14},{x:512,y:356,w:16,h:14});
 for(const x of [165,755])prop({t:'turnstile',x,y:368});
 prop({t:'billboard',x:800,y:82,solid:[70,6],txt:['FUN FOR THE','WHOLE CORPSE!']});
 prop({t:'billboard',x:170,y:350,solid:[70,6],txt:['KIDS EAT FREE','(KIDS ARE FOOD)']});
 for(const [x,y] of [[400,160],[520,160],[400,300],[520,300],[120,320],[800,230]])prop({t:'flamp',x,y,solid:[4,4],big:1});
 for(const [x,y] of [[400,220],[440,120],[480,250],[620,150],[150,180],[760,330],[30+30,300]])prop({t:'cone',x,y});
 for(const [x,y] of [[300,900],[640,1020],[180,1120],[820,1180],[1400,1260],[2200,1270]])prop({t:'buoy',x,y});
 prop({t:'wreck',x:480,y:1060,solid:[90,22]});
 for(const x of [100,260,620,800])prop({t:'lifering',x,y:664});
 for(const [x,y] of [[640,180],[260,290],[110,160]])prop({t:'trolley',x,y,solid:[10,5]});
 prop({t:'fountain',x:240,y:530,solid:[56,26]});
 prop({t:'infoboard',x:640,y:420,solid:[24,5],txt:['YOU ARE HERE','(SORRY)']});
 for(const [x,y] of [[180,430],[740,430],[180,640],[740,640],[460,460],[360,640]])prop({t:'flamp',x,y,solid:[4,4]});
 for(const [x,y] of [[320,440],[600,520],[120,560],[800,540]])prop({t:'bench',x,y,solid:[28,4]});
 for(const [x,y] of [[90,436],[838,640]])prop({t:'planter',x,y,solid:[40,14]});
 for(const [x,y] of [[360,470],[560,620],[800,470],[90,620]])prop({t:'trash',x,y});
 prop({t:'balloons',x:330,y:600,solid:[6,4]});prop({t:'icecart',x:690,y:560,solid:[30,10]});
 for(const [x,y] of [[130,520],[700,450]])prop({t:'propane',x,y,solid:[6,5]});
 // ===== B: Festzelt & Imbissmeile
 for(const [x,y] of [[1150,420],[1360,420],[1240,610],[960,620],[1600,610]])prop({t:'picnic',x,y,solid:[30,10]});
 prop({t:'striker',x:950,y:240,solid:[10,6]});prop({t:'balloons',x:1520,y:250,solid:[6,4]});
 for(const [x,y] of [[920,100],[1700,100],[920,400],[1700,400],[1040,440],[1480,440],[1200,640],[1400,640]])prop({t:'bulbpole',x,y,solid:[4,4]});
 for(const [x,y] of [[980,560],[1150,560],[1390,560],[1560,560],[1260,410]])prop({t:'trash',x,y});
 for(const [x,y] of [[1040,580],[1450,580],[930,460]])prop({t:'propane',x,y,solid:[6,5]});
 prop({t:'barrel',x:1500,y:120,solid:[8,6],fire:1});prop({t:'barrel',x:930,y:330,solid:[8,6]});
 bwNeon(1260,362,'BEER TENT','#ff5a4a',{post:false,sy:322});
 // ===== D: Spielhalle (außen)
 for(const [x,y] of [[1100,1190],[1500,1190],[970,800],[1700,800],[1700,1100]])prop({t:'flamp',x,y,solid:[4,4]});
 prop({t:'kiosk',x:1200,y:1150,solid:[34,14]});prop({t:'horse',x:1500,y:1150,solid:[18,6]});
 prop({t:'photobooth',x:1600,y:1120,solid:[20,10]});prop({t:'bench',x:1230,y:1110,solid:[28,4]});prop({t:'bench',x:1420,y:1110,solid:[28,4]});
 prop({t:'dumpster',x:1680,y:1000,solid:[26,12]});prop({t:'dumpster',x:1680,y:720,solid:[26,12]});
 for(const [x,y] of [[1050,1100],[1550,1180],[985,1000]])prop({t:'trash',x,y});
 bwNeon(1320,1160,'LOST CHILDREN','#ffd23a',{fl:.5});
 // ===== E: Riesenrad, Achterbahn, Karussell
 prop({t:'wheel',x:2160,y:432,solid:[100,20]});
 prop({t:'carousel',x:1990,y:900,solid:[72,34]});
 prop({t:'derail',x:2500,y:880,solid:[26,14]});
 for(const [x,y] of [[1780,280],[2060,300],[2290,300],[2540,330],[2110,600],[2110,1000],[2290,1080],[2540,1080],[1860,1080],[1860,700],[2440,520]])prop({t:'flamp',x,y,solid:[4,4]});
 for(const [x,y] of [[2000,330],[2400,340],[1900,1050],[2380,1100]])prop({t:'bench',x,y,solid:[28,4]});
 for(const [x,y] of [[1990,520],[2310,480],[2490,620],[1800,800],[2200,1180]])prop({t:'trash',x,y});
 prop({t:'icecart',x:2280,y:560,solid:[30,10]});prop({t:'balloons',x:2050,y:700,solid:[6,4]});
 prop({t:'barrel',x:2520,y:1170,solid:[8,6],fire:1});prop({t:'barrel',x:1770,y:1170,solid:[8,6],fire:1});
 bwNeon(1860,660,'YOU MUST BE THIS TALL TO DIE','#ff8a3a',{fl:.25});
 // ===== E: Generator-Hof (Hauptschalter)
 for(const [x,y] of [[2415,990],[2525,990]])prop({t:'transformer',x,y,solid:[30,14]});
 for(const [x,y] of [[2400,1040],[2540,1040]])prop({t:'drum',x,y,solid:[14,10]});
 prop({t:'pylon',x:2470,y:950,solid:[8,6]});
 bwNeon(2470,936,'BLACKWATER POWER CO.','#8ad06a',{fl:.15});
}
// Vögel (Krähen) auf Geländern und Zeltdach – eigener Aufruf, BIRDS entsteht erst später
function bwBirds(){for(let i=0;i<6;i++)BIRDS.push({x:80+i*130+srnd(0,30),y:662,z:7,perch:true,ph:sr()*6});
 for(let i=0;i<4;i++)BIRDS.push({x:1110+i*90,y:240,z:96,perch:true,ph:sr()*6})}

// ---- Kaufstationen
function bwStations(){return[
 {t:'perk',k:'thicc',x:1500,y:420},{t:'perk',k:'popcorn',x:580,y:446},{t:'perk',k:'twixx',x:1990,y:640},{t:'perk',k:'ravioli',x:1060,y:1020},{t:'perk',k:'brain',x:2040,y:190},
 {t:'pap',x:1320,y:1000},{t:'power',x:BW_GEN.x,y:BW_GEN.y},
 {t:'wall',k:'smg',x:620,y:654},{t:'wall',k:'rifle',x:960,y:430},{t:'wall',k:'shotgun',x:1680,y:900},{t:'wall',k:'magnum',x:2200,y:1056},
 {t:'ammo',x:140,y:610},{t:'ammo',x:1200,y:1100},{t:'ammo',x:1810,y:410},{t:'ammo',x:2300,y:1150},{t:'ammo',x:1200,y:250}]}

// ---- Zombie-Spawns (z = Bereich; aktiv, sobald der Bereich geöffnet ist)
function bwSpawns(){const S=[];const a=(z,l)=>{for(const [x,y,sea] of l)S.push({x,y,z,sea:!!sea})};
 a('A',[[70,70],[860,70],[450,70],[70,640],[860,600],[70,400]]);
 a('B',[[920,70],[1700,70],[920,640],[1700,640],[1260,175],[1700,250]]);
 a('D',[[970,690],[1700,690],[970,1180],[1700,1180],[1690,760],[1310,1180]]);
 a('E',[[1760,60],[2540,60],[2540,500],[2540,1180],[2150,1180],[1760,1040],[1760,620],[2320,250],[1960,320],[2300,900]]);
 return S}

// ---- Freikaufbare Zugänge
// k: debris | gate | shutter | maint | door | hatch | bridge   v: senkrechte Durchgangsrichtung (Wand verläuft vertikal)
// low: Kollision nur für Bewegung (Wasserlücke), sonst blockt sie auch Kugeln
const BW_BARR=[
 {id:'AB',k:'debris',r:[872,470,28,70],z:['A','B'],lab:'CLEAR DEBRIS',v:1},
 {id:'BD',k:'shutter',r:[1280,656,70,20],z:['B','D'],lab:'RAISE SHUTTER'},
 {id:'BE',k:'maint',r:[1716,300,20,60],z:['B','E'],lab:'UNLOCK MAINTENANCE ACCESS',v:1},
 {id:'DE',k:'gate',r:[1716,880,20,60],z:['D','E'],lab:'OPEN SERVICE GATE',v:1},
];
// Bäume nur in Grünflächen, Gras ebenso
function bwTreeOk(x,y){return BWG.grass.some(r=>x>r[0]+6&&x<r[0]+r[2]-6&&y>r[1]+10&&y<r[1]+r[3]-2)}
function bwGrassOk(x,y){return BWG.grass.some(r=>x>r[0]&&x<r[0]+r[2]&&y>r[1]&&y<r[1]+r[3])||(x>1740&&x<2560&&y>40&&y<1200&&!BWG.asph.some(r=>x>r[0]-4&&x<r[0]+r[2]+4&&y>r[1]-4&&y<r[1]+r[3]+4)&&sr()<.18)}
