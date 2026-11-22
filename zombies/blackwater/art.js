// =====================================================================
// BLACKWATER FAIR – Pixel-Art: Boden, Mauern, Dächer, Fahrgeschäfte, Requisiten, Schilder
// Alles wird mit R()/Rechtecken gezeichnet (keine Bilddateien). Statisches wird einmal
// vorgerendert (Bodenleinwand, Mauer- und Dachsprites, Riesenrad, Achterbahn, Clownstor).
// =====================================================================

// ---- 3×5-Pixelschrift für Schilder in der Spielwelt
const BW_FONT={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',
 H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111101101101',N:'110101101101101',
 O:'010101101101010',P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',
 V:'101101101101010',W:'101101101111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111',0:'111101101101111',1:'010110010010111',
 2:'110001010100111',3:'110001010001110',4:'101101111001001',5:'111100110001110',6:'011100111101111',7:'111001010010010',8:'111101111101111',
 9:'111101111001110','!':'010010010000010','?':'110001010000010','.':'000000000000010',',':'000000000010100',"'":'010010000000000',
 '-':'000000111000000','&':'010101010101011',':':'000010000010000','/':'001001010100100','(':'001010010010001',')':'100010010010100',' ':'000000000000000'};
const bwTW=(t,s=1)=>String(t).length*4*s-s;
function bwText(c,t,x,y,col,s=1){t=String(t).toUpperCase().replace(/Ä/g,'A').replace(/Ö/g,'O').replace(/Ü/g,'U');c.fillStyle=col;let cx=Math.round(x);y=Math.round(y);
 for(const ch of t){const gph=BW_FONT[ch]||BW_FONT['?'];for(let i=0;i<15;i++)if(gph[i]==='1')c.fillRect(cx+(i%3)*s,y+(i/3|0)*s,s,s);cx+=4*s}}
function bwTextC(c,t,x,y,col,s=1){bwText(c,t,x-bwTW(t,s)/2,y,col,s)}

// ---- Grundformen in Pixeln
function bwCirc(c,cx,cy,r,col){c.fillStyle=col;for(let dy=-r;dy<=r;dy++){const w=Math.round(Math.sqrt(r*r-dy*dy));c.fillRect(Math.round(cx-w),Math.round(cy+dy),w*2,1)}}
function bwEll(c,cx,cy,rx,ry,col){c.fillStyle=col;for(let dy=-ry;dy<=ry;dy++){const w=Math.round(rx*Math.sqrt(Math.max(0,1-(dy*dy)/(ry*ry))));c.fillRect(Math.round(cx-w),Math.round(cy+dy),w*2,1)}}
function bwLine(c,x0,y0,x1,y1,col,t=1){c.fillStyle=col;const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let i=0;i<=n;i++){const k=i/n;c.fillRect(Math.round(x0+(x1-x0)*k-t/2),Math.round(y0+(y1-y0)*k-t/2),t,t)}}
function bwRing(c,cx,cy,r,col,t=1,step=.004){c.fillStyle=col;const n=Math.ceil(r*6.3);for(let i=0;i<n;i++){const a=i/n*Math.PI*2;c.fillRect(Math.round(cx+Math.cos(a)*r-t/2),Math.round(cy+Math.sin(a)*r-t/2),t,t)}}
const bwRGB=h=>{const n=parseInt(h.slice(1),16);return(n>>16)+','+(n>>8&255)+','+(n&255)};

// ---- Lichtzustand (Strom + Startverzögerung + Flackern)
function bwLit(sec,fl){if(!POWER.on)return 0;const t=now-POWER.at-sec;if(t<0)return 0;if(t<.7)return Math.random()<.5?1:0;if(fl&&Math.random()<fl*.08)return 0;return 1}
function bwStationOn(s){return!FAIR||(POWER.on&&now-POWER.at>bwSec(s.x,s.y))}

// =====================================================================
// Boden
// =====================================================================
function bwNoise(c,r,cols,dens){const n=r[2]*r[3]/dens;for(let i=0;i<n;i++)R(c,r[0]+sr()*r[2],r[1]+sr()*r[3],1+(sr()*2|0),1,spick(cols))}
function bwGround(){const c=gc;
 // Meer als Grund
 R(c,0,0,MW,MH,'#0b1628');
 for(let i=0;i<40000;i++){const x=sr()*MW,y=sr()*MH;R(c,x,y,2+(sr()*5|0),1,spick(['#0e1c34','#0a1322','#10213c','#0c182c']))}
 const clipD=(d,fn)=>{c.save();c.scale(BW_S,BW_S);c.clip(bwP2(d));c.setTransform(1,0,0,1,0,0);fn();c.restore()};
 const bbox=d=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const pl of bwPathPts(d,20))for(const [x,y] of pl){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}return[x0-4|0,y0-4|0,(x1-x0+8)|0,(y1-y0+8)|0]};
 // Flachwasser + Schaum an der Küste
 c.save();c.scale(BW_S,BW_S);c.strokeStyle='#183656';c.lineWidth=7;c.stroke(bwP2(BW_COAST));c.strokeStyle='rgba(150,180,210,.35)';c.lineWidth=2.5;c.stroke(bwP2(BW_COAST));c.restore();
 // Waldboden (unbegehbar)
 clipD(BW_COAST,()=>{R(c,0,0,MW,MH,'#141b14');bwNoise(c,[0,0,MW,MH],['#18221a','#10160f','#1c2a1a','#121a12'],14);
  for(let i=0;i<900;i++){const x=sr()*MW,y=sr()*MH;bwCirc(c,x,y,srnd(3,9)|0,spick(['#1a2a18','#142012','#203222']))}});
 // Felsrand der Insel / unter dem Leuchtturm
 c.save();c.scale(BW_S,BW_S);c.fillStyle='#24222a';c.translate(-3,-3);c.scale(1.006,1.006);c.fill(bwP2(BW_ZONES.L.d));c.restore();
 // Wege (Pflastersteine)
 const PP=new Path2D();for(const p of BW_PATHS)for(const [x,y] of bwPathPts(p.d,6)[0]){PP.moveTo(x+BW_PATHW,y);PP.arc(x,y,BW_PATHW,0,7)}
 c.save();c.clip(PP);R(c,0,0,MW,MH,'#2e2834');c.restore();
 c.save();c.clip(PP);for(const p of BW_PATHS){const [x0,y0,w,h]=bbox(p.d);for(let y=y0-30;y<y0+h+30;y+=6)for(let x=x0-30+((y/6)&1)*4;x<x0+w+30;x+=8)R(c,x+1,y+1,6,4,spick(['#3a3342','#352f3e','#3e3747','#30293a']))}c.restore();
 // Bereiche mit eigenem Boden
 for(const k of BW_ZK){const Z=BW_ZONES[k],r=bbox(Z.d);clipD(Z.d,()=>bwMat(c,Z.m,r))}
 // Parkplatz: Asphalt + Markierungen
 {const r=[60,1150,700,410];c.save();c.scale(BW_S,BW_S);c.clip(bwP2(BW_ZONES.A.d));c.setTransform(1,0,0,1,0,0);c.beginPath();c.rect(0,0,MW,1540);c.clip();bwMat(c,'asph',r);
  for(const car of CARS){R(c,car.x-6,car.y-6,2,car.h+12,'rgba(200,192,160,.45)');R(c,car.x+car.w+4,car.y-6,2,car.h+12,'rgba(200,192,160,.45)')}
  bwText(c,'PARKING',180,1170,'rgba(200,192,160,.35)',2);c.restore()}
 // Mosaik vor dem Clownstor
 for(let ring=0;ring<4;ring++){const rr=40-ring*10;bwRing(c,640,1676,rr,['#6a2a3a','#c8a040','#3a5a7a','#a83a3a'][ring],3)}
 bwCirc(c,640,1676,7,'#c8a040');bwText(c,'WELCOME',626,1724,'rgba(200,170,90,.55)');
 // Randsteine entlang der begehbaren Fläche
 for(let gy=1;gy<BW_GH-1;gy++)for(let gx=1;gx<BW_GW-1;gx++){const i=gy*BW_GW+gx;if(!BW_MASK[i])continue;
  if(!BW_MASK[i-1]||!BW_MASK[i+1]||!BW_MASK[i-BW_GW]||!BW_MASK[i+BW_GW]){const x=gx*BW_G,y=gy*BW_G,land=BW_LAND[i];R(c,x,y,4,4,land?'#1c1820':'#3a2a1e');if(!BW_MASK[i-BW_GW])R(c,x,y,4,1,land?'#4a4452':'#6a5038')}}
 // Eisenzaun zur Rasenfläche: zeigt klar, wo man nicht hin kann
 {const W=BW_GW,PC='#6a6676',PH='#b0acbc',RL='#848092';
  for(let gy=2;gy<BW_GH-2;gy++)for(let gx=2;gx<W-2;gx++){const i=gy*W+gx;if(!BW_MASK[i])continue;const x=gx*BW_G,y=gy*BW_G;
   if(!BW_MASK[i-W]&&BW_LAND[i-W]){R(c,x,y-9,4,1,RL);R(c,x,y-4,4,1,RL);if(x%12===0){R(c,x,y-14,2,14,PC);R(c,x,y-15,2,1,PH)}}
   if(!BW_MASK[i+W]&&BW_LAND[i+W]){R(c,x,y-6,4,1,RL);R(c,x,y-1,4,1,RL);if(x%12===0){R(c,x,y-10,2,14,PC);R(c,x,y-11,2,1,PH)}}
   if(!BW_MASK[i-1]&&BW_LAND[i-1]){R(c,x,y-8,1,4,RL);if(y%12===0){R(c,x-1,y-12,2,14,PC);R(c,x-1,y-13,2,1,PH)}}
   if(!BW_MASK[i+1]&&BW_LAND[i+1]){R(c,x+3,y-8,1,4,RL);if(y%12===0){R(c,x+2,y-12,2,14,PC);R(c,x+2,y-13,2,1,PH)}}}}
 // Pfützen & Gullis
 for(let i=0,n=0;i<400&&n<40;i++){const x=srnd(60,MW-60),y=srnd(60,MH-60),w=srnd(8,24);if(!bwWalk(x-w,y)||!bwWalk(x+w,y)||bwZoneAt(x,y)==='P')continue;n++;PUDDLES.push({x,y,w});bwEll(c,x,y,w|0,Math.max(2,w*.35|0),'#161a2a');bwEll(c,x-w*.2,y-1,Math.max(2,w*.4|0),1,'#2a3048')}
 for(const [x,y] of [[440,1380],[700,1800],[1200,1500],[2000,1180],[2700,660],[1500,700]]){GULLIS.push({x,y});bwEll(c,x,y,6,3,'#26242a');R(c,x-4,y-1,8,1,'#141216');R(c,x-4,y+1,8,1,'#141216')}
 // Popcorn, Ticketreste, Konfetti
 for(let i=0;i<5000;i++){const x=srnd(60,MW-60),y=srnd(60,MH-60);if(!bwWalk(x,y))continue;R(c,x,y,1,1,spick(['#e8dca0','#d83a5a','#3a8ad8','#e8c040','#f0f0e0','#5ad08a']))}
 for(let i=0;i<40;i++){const x=srnd(80,MW-80),y=srnd(80,MH-80);if(bwWalk(x,y))stain(x,y,srnd(3,9),true)}
}
// Bodenmaterialien (füllt Rechteck r im aktuellen Clip)
function bwMat(c,m,r){
 if(m==='pave'){R(c,...r,'#332d3a');for(let y=r[1];y<r[1]+r[3];y+=5){const off=((y/5)&1)*5;for(let x=r[0]-off;x<r[0]+r[2];x+=10)R(c,x+1,y+1,9,4,spick(['#3a3342','#352f3e','#3e3747','#30293a','#383140']))}bwNoise(c,r,['rgba(0,0,0,.25)','rgba(120,110,140,.12)'],14)}
 else if(m==='asph'){R(c,...r,'#24222a');bwNoise(c,r,['#2a2830','#1e1c24','#2e2b36','#26242e'],3);for(let i=0;i<r[2]*r[3]/9000;i++){let x=r[0]+sr()*r[2],y=r[1]+sr()*r[3];const l=srnd(8,30);for(let k=0;k<l;k++){R(c,x,y,1,1,'#16141a');x+=srnd(-1,1.4);y+=srnd(-.6,1)}}}
 else if(m==='dirt'){R(c,...r,'#3a3029');bwNoise(c,r,['#433629','#2f2721','#4a3a2c','#3a2e26'],3);for(let i=0;i<r[2]*r[3]/600;i++)R(c,r[0]+sr()*r[2],r[1]+sr()*r[3],2,1,spick(['#2a4024','#34502a']))}
 else if(m==='conc'){R(c,...r,'#3e3e44');bwNoise(c,r,['#46464c','#36363c','#4a4a50'],4);for(let x=r[0];x<r[0]+r[2];x+=48)R(c,x,r[1],1,r[3],'rgba(0,0,0,.25)');for(let y=r[1];y<r[1]+r[3];y+=48)R(c,r[0],y,r[2],1,'rgba(0,0,0,.25)');
  for(let i=0;i<20;i++){const x=r[0]+sr()*r[2],y=r[1]+sr()*r[3];bwEll(c,x,y,srnd(6,16)|0,srnd(3,6)|0,'rgba(10,10,14,.45)')}}
 else if(m==='board'){R(c,...r,'#3a2a1e');for(let y=r[1];y<r[1]+r[3];y+=5){let x=r[0]-sr()*40;while(x<r[0]+r[2]){const L=srnd(24,60),col=spick(['#5a4432','#4e3a2a','#634a36','#56402e','#4a3626']);R(c,x,y,L-1,4,col);R(c,x,y,L-1,1,shade(col,1.12));x+=L}}
  bwNoise(c,r,['rgba(0,0,0,.18)','rgba(150,130,110,.1)'],16)}
 else if(m==='rock'){R(c,...r,'#3a3742');bwNoise(c,r,['#433f4c','#33303a','#4a4654','#2e3a28'],2.5)}}
function bwGroundPost(){const c=gc;
 // Becken im Kraftwerk + Gitterrost-Steg
 for(const o of FSOL)if(o.pool){R(c,o.x,o.y,o.w,o.h,'#0e2238');for(let i=0;i<o.w*o.h/30;i++)R(c,o.x+sr()*o.w,o.y+sr()*o.h,srnd(2,6),1,spick(['#163050','#0a1a2c','#1e3a5a']));R(c,o.x,o.y,o.w,1,'#5a7a90');R(c,o.x,o.y+o.h-1,o.w,1,'#2a3a4a')}
 // Löcher im Bohlenweg
 for(const o of FSOL)if(o.hole){R(c,o.x-2,o.y-1,o.w+4,o.h+2,'#2a1e14');R(c,o.x,o.y,o.w,o.h,'#0a1424');R(c,o.x+2,o.y+o.h-3,o.w-4,1,'#1e3a5a');for(let i=0;i<4;i++)R(c,o.x+sr()*o.w,o.y-1+(sr()<.5?0:o.h),2,2,'#6a5038')}
 // Wasser im überfluteten Generatorraum (flache Pfützen, begehbar)
}
// Böden in Gebäuden
function bwFloor(r,type){const c=gc;
 if(type==='boards'){R(c,r.x,r.y,r.w,r.h,'#3a2a1c');for(let y=r.y;y<r.y+r.h;y+=4){R(c,r.x,y,r.w,1,'#2a1e14');for(let x=r.x+((y/4)%4)*11;x<r.x+r.w;x+=44)R(c,x,y,1,4,'#2a1e14')}noise(c,r,['#42301f','#33261a'],r.w*r.h/8);return true}
 if(type==='arcade'){R(c,r.x,r.y,r.w,r.h,'#1c1428');for(let i=0;i<r.w*r.h/26;i++){const x=r.x+sr()*r.w,y=r.y+sr()*r.h;R(c,x,y,spick([1,2,3]),1,spick(['#3a1a5a','#5a1a4a','#1a3a5a','#4a3a1a','#2a1a3a']))}
  for(let i=0;i<r.w*r.h/700;i++){const x=r.x+sr()*r.w,y=r.y+sr()*r.h,col=spick(['#7a2a8a','#2a7a8a','#8a7a2a','#8a2a4a']);R(c,x,y,3,1,col);R(c,x+1,y-1,1,3,col)}return true}
 if(type==='conc2'){R(c,r.x,r.y,r.w,r.h,'#38383e');noise(c,r,['#3e3e44','#323238','#45454a'],r.w*r.h/4);for(let x=r.x;x<r.x+r.w;x+=40)R(c,x,r.y,1,r.h,'rgba(0,0,0,.3)');R(c,r.x+6,r.y+6,r.w-12,1,'#8a7a20');R(c,r.x+6,r.y+r.h-7,r.w-12,1,'#8a7a20');return true}
 if(type==='metal'){R(c,r.x,r.y,r.w,r.h,'#4a5058');for(let y=r.y;y<r.y+r.h;y+=4)for(let x=r.x+((y/4)&1)*2;x<r.x+r.w;x+=4)R(c,x,y,2,1,'#5e646c');noise(c,r,['#3a4048','#2a2e34'],r.w*r.h/30);return true}
 if(type==='stone'){R(c,r.x,r.y,r.w,r.h,'#7a7468');for(let y=r.y;y<r.y+r.h;y+=8)for(let x=r.x+((y/8)&1)*6;x<r.x+r.w;x+=12)R(c,x,y,11,7,spick(['#8a8478','#726c60','#807a6e']));return true}
 return false}

// =====================================================================
// Mauern / Zäune (vorgerendert, in Abschnitten tiefensortiert)
// =====================================================================
const BW_WH={brick:28,conc:28,iron:16,rail:7};
const BWW=[];
const BW_GRAF=['REPENT','HA HA HA','ITS BEHIND YOU','RUN','NO EXIT','BOZO WAS HERE','THE END IS FUNNY','SMILE','DONT FEED THE CLOWNS','HELP'];
function bwBuildWalls(){let gi=0;
 for(const [x,y,w,h,st] of BW_WALLS){const H=BW_WH[st];if(!H)continue;const hz=w>h,[cv,c]=mk(w,h+H);
  if(st==='brick'||st==='conc'){const cap=st==='brick'?'#3a2a2a':'#4a4a52',face=st==='brick'?'#5a2e2a':'#55555c';
   R(c,0,0,w,h,cap);R(c,0,0,w,1,shade(cap,1.4));
   if(hz){R(c,0,h,w,H,face);
    if(st==='brick'){for(let yy=0;yy<H;yy+=3){R(c,0,h+yy,w,1,shade(face,.72));for(let xx=((yy/3)&1)*4-(x%8);xx<w;xx+=8)R(c,xx,h+yy,1,3,shade(face,.78))}
     for(let i=0;i<w*H/14;i++)R(c,Math.random()*w,h+Math.random()*H,2,1,pick([shade(face,1.15),shade(face,.85),'#3a4a2a']))}
    else{for(let xx=-(x%24);xx<w;xx+=24)R(c,xx,h,1,H,shade(face,.75));for(let i=0;i<w/6;i++){const xx=Math.random()*w;R(c,xx,h+2,1,Math.random()*H*.8,'rgba(60,40,30,.35)')}}
    R(c,0,h+H-4,w,4,shade(face,.55));for(let i=0;i<w/5;i++)R(c,Math.random()*w,h+H-3-Math.random()*4,1,2,'#3a5a2a');
    if(w>120)for(let k=0;k<Math.floor(w/220);k++){const t=BW_GRAF[gi++%BW_GRAF.length],gx=20+k*220+Math.random()*40;if(gx+bwTW(t)<w)bwText(c,t,gx,h+8+Math.random()*8,pick(['#c83a5a','#e8e0d0','#5ac8e8','#e8c040']))}}}
  else if(st==='iron'){if(hz){for(let xx=0;xx<w;xx+=4)R(c,xx,h+2,1,H-2,'#2a2a30');for(let xx=0;xx<w;xx+=16){R(c,xx,h-1,2,H+1,'#3a3a44');R(c,xx,h-2,2,1,'#6a6a74')}R(c,0,h+3,w,1,'#4a4a54');R(c,0,h+H-4,w,1,'#4a4a54')}
   else{R(c,0,0,w,h,'rgba(40,40,48,.9)');for(let yy=0;yy<h;yy+=12){R(c,0,yy,w,2,'#3a3a44')}}}
  else if(st==='rail'){if(hz){for(let xx=0;xx<w;xx+=20)R(c,xx,h-2,2,H+2,'#8a7a66');R(c,0,h,w,2,'#a8987e');R(c,0,h+3,w,1,'#7a6a56')}}
  BWW.push({x,y,w,h,st,H,hz,cv})}}
function bwPushWalls(L,vis,cx,cy){
 for(const o of BWW){if(!vis(o.x,o.y-o.H,o.w,o.h+o.H))continue;
  if(o.hz){for(let s=0;s<o.w;s+=64){const sw=Math.min(64,o.w-s),X=o.x+s;if(!vis(X,o.y-o.H,sw,o.h+o.H))continue;
    L.push({y:o.y+o.h,f:()=>{const behind=!P.dead&&P.x>X-6&&P.x<X+sw+6&&P.y<o.y+2&&P.y>o.y-o.H-16;g.globalAlpha=behind?.45:1;g.drawImage(o.cv,s,0,sw,o.h+o.H,X,o.y-o.H,sw,o.h+o.H);g.globalAlpha=1}})}}
  else{for(let s=0;s<o.h;s+=8){const sh=Math.min(8,o.h-s),Y=o.y+s;if(!vis(o.x,Y-o.H,o.w,sh+o.H))continue;const last=s+8>=o.h;
    L.push({y:Y+sh,f:()=>{g.drawImage(o.cv,0,s,o.w,sh,o.x,Y-o.H,o.w,sh);if(last&&(o.st==='brick'||o.st==='conc'))R(g,o.x,Y+sh-o.H,o.w,o.H,o.st==='brick'?'#4a2622':'#46464c')}})}}}}

// =====================================================================
// Wände von Gebäuden (Südfassade) und Dächer
// =====================================================================
function bwWallCanvas(c,w,fy,fh,pc){const x0=pc.r.x;for(let x=-(x0%10);x<w;x+=10){R(c,x,fy,5,fh,'#a8202a');R(c,x+5,fy,5,fh,'#d8ccb4');R(c,x+4,fy,1,fh,'rgba(0,0,0,.18)')}
 for(let x=0;x<w;x+=10)R(c,x+2,fy+2,6,3,x%20?'#e8dcc4':'#c8303a');R(c,0,fy,w,2,'#5a1014');R(c,0,fy+fh-4,w,4,'#2a1a14');for(let i=0;i<w/3;i++)R(c,Math.random()*w,fy+fh-6-Math.random()*6,1,2,'rgba(40,30,20,.5)')}
function bwWallBooth(c,w,fy,fh,pc){R(c,0,fy,w,fh,'#6a1e2c');for(let x=0;x<w;x+=6)R(c,x,fy,1,fh,'#5a1824');R(c,0,fy,w,3,'#c8a040');R(c,0,fy+fh-5,w,5,'#3a1018')}
function bwWallStall(c,w,fy,fh,pc){const b=pc.b,col=b.wall;R(c,0,fy,w,fh,col);for(let x=-(pc.r.x%6);x<w;x+=6)R(c,x,fy,1,fh,shade(col,.8));R(c,0,fy,w,2,shade(col,1.3));R(c,0,fy+fh-5,w,5,shade(col,.5));
 for(let x=0;x<w;x+=8)R(c,x,fy+fh-9,4,4,x%16?'#f0e8d0':shade(b.rc,1))}
function bwWallArcade(c,w,fy,fh,pc){R(c,0,fy,w,fh,'#24162e');for(let x=-(pc.r.x%32);x<w;x+=32){R(c,x,fy,1,fh,'#140c1c');R(c,x+3,fy+4,2,fh-12,'#3a1a4a');R(c,x+5,fy+4,1,fh-12,'#5a2a6a')}
 R(c,0,fy+fh-10,w,10,'#1a1022');for(let x=-(pc.r.x%8);x<w;x+=8)R(c,x,fy+fh-10,4,4,'#2e1e3a');R(c,0,fy+4,w,1,'#5a2a6a');R(c,0,fy+fh-12,w,1,'#2a6a7a');
 for(let i=0;i<w/90;i++){const px=Math.random()*(w-20);R(c,px,fy+14,16,20,pick(['#6a2a3a','#2a4a6a','#6a5a2a']));R(c,px+2,fy+16,12,8,'#d8c8a0');R(c,px+2,fy+26,12,1,'#1a1a1a')}}
function bwWallConc(c,w,fy,fh,pc){R(c,0,fy,w,fh,'#56565c');for(let x=-(pc.r.x%24);x<w;x+=24)R(c,x,fy,1,fh,'#45454a');for(let y=fy+12;y<fy+fh;y+=16)R(c,0,y,w,1,'#4a4a50');
 for(let i=0;i<w/5;i++){const xx=Math.random()*w;R(c,xx,fy+Math.random()*10,1,Math.random()*fh*.7,'rgba(90,50,30,.3)')}
 for(let x=-(pc.r.x%10);x<w;x+=10){R(c,x,fy+fh-6,5,6,'#c8a020');R(c,x+5,fy+fh-6,5,6,'#1e1e20')}}
function bwWallWood(c,w,fy,fh,pc){const col=pc.b.wall;R(c,0,fy,w,fh,col);for(let y=fy;y<fy+fh;y+=4){R(c,0,y,w,1,shade(col,.7));for(let x=-(pc.r.x%27)+((y/4)%3)*9;x<w;x+=27)R(c,x,y,1,4,shade(col,.75))}
 for(let i=0;i<w*fh/40;i++)R(c,Math.random()*w,fy+Math.random()*fh,2,1,shade(col,pick([.85,1.15])));R(c,0,fy+fh-3,w,3,shade(col,.5))}
function bwWallMetal(c,w,fy,fh,pc){R(c,0,fy,w,fh,'#46525e');for(let x=-(pc.r.x%4);x<w;x+=4){R(c,x,fy,1,fh,'#5a6672');R(c,x+2,fy,1,fh,'#36404a')}for(let i=0;i<w/4;i++)R(c,Math.random()*w,fy+Math.random()*fh,1,3,'rgba(120,60,30,.45)');R(c,0,fy+fh-4,w,4,'#2a3038')}
function bwWallHaunt(c,w,fy,fh,pc){bwWallWood(c,w,fy,fh,pc);for(let i=0;i<w/40;i++){const x=Math.random()*(w-14);R(c,x,fy+10,12,10,'#d8d0c0');R(c,x+2,fy+13,3,3,'#000');R(c,x+7,fy+13,3,3,'#000');R(c,x+3,fy+18,6,1,'#000')}for(let i=0;i<w/6;i++)R(c,Math.random()*w,fy,1,4+Math.random()*12,'#6a0a14')}
function bwWallLighthouse(c,w,fy,fh,pc){R(c,0,fy,w,fh,'#e0dcd2');for(let y=fy;y<fy+fh;y+=6)for(let x=-(pc.r.x%12)+((y/6)&1)*6;x<w;x+=12)R(c,x,y,1,6,'#c8c4ba');R(c,0,fy+fh*.45,w,8,'#b02a2a');R(c,0,fy+fh-4,w,4,'#6a665e')}

function bwRoofTent(c,b){const w=b.w,h=b.h,px=w/2,py=h*.42-b.rup*.85,id=c.createImageData(w,h),d=id.data;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=Math.atan2(y-py,x-px),k=Math.floor((a+Math.PI)/(Math.PI*2)*28),dist=Math.hypot((x-px)/w,(y-py)/h),red=k%2===0;
  let r=red?176:222,gg=red?34:208,bb=red?44:186;const sh=.62+.5*clamp(1-dist*1.3,0,1)+((x-px)<0?.06:-.06);const i=(y*w+x)*4;d[i]=clamp(r*sh,0,255);d[i+1]=clamp(gg*sh,0,255);d[i+2]=clamp(bb*sh,0,255);d[i+3]=255}
 c.putImageData(id,c.getTransform().e,c.getTransform().f);
 for(let x=0;x<w;x+=12){bwEll(c,x+6,h,6,4,(x/12)&1?'#d8ccb4':'#a8202a')}
 for(let i=0;i<w*h/60;i++)R(c,Math.random()*w,Math.random()*h,2,1,'rgba(0,0,0,.12)');
 R(c,px-1,py-26,2,26,'#3a3036');R(c,px+1,py-26,12,6,'#c8303a');R(c,px+1,py-23,10,1,'#e8dcc4');bwCirc(c,px,py,3,'#c8a040')}
function bwRoofAwning(c,b){const w=b.w,h=b.h;for(let x=0;x<w;x+=8){R(c,x,0,4,h,b.rc);R(c,x+4,0,4,h,'#f0e8d8')}for(let y=0;y<h;y++)R(c,0,y,w,1,'rgba(0,0,0,'+(.3*y/h)+')');
 for(let x=0;x<w;x+=8)bwEll(c,x+4,h,4,3,(x/8)&1?'#f0e8d8':b.rc);R(c,0,0,w,1,'rgba(255,255,255,.2)');R(c,4,-14,w-8,12,'#1a1418');R(c,4,-14,w-8,1,'#4a3a40');R(c,8,-2,2,4,'#3a3036');R(c,w-10,-2,2,4,'#3a3036')}
function bwRoofBooth(c,b){const w=b.w,h=b.h;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(((x+y)>>3)&1)R(c,x,y,1,1,'#c8303a');else R(c,x,y,1,1,'#e8dcc4')}R(c,0,0,w,1,'#ffffff');R(c,0,h-2,w,2,'#5a1014');R(c,4,-10,w-8,9,'#1a1418');R(c,w/2-1,-12,2,2,'#c8a040')}
function bwRoofArcade(c,b){const w=b.w,h=b.h;R(c,0,0,w,h,'#1a1420');for(let i=0;i<w*h/6;i++)R(c,Math.random()*w,Math.random()*h,1,1,pick(['#221a2a','#141018','#2a2230']));
 R(c,0,0,w,3,'#3a2a4a');R(c,0,h-3,w,3,'#0e0a12');R(c,0,0,3,h,'#2e2238');R(c,w-3,0,3,h,'#0e0a12');
 for(const [x,y] of [[60,60],[180,200],[420,80],[520,240]]){R(c,x+3,y+4,40,26,'rgba(0,0,0,.4)');R(c,x,y,40,26,'#5a5e66');R(c,x,y,40,4,'#7a7e86');bwCirc(c,x+20,y+15,8,'#3a3e44');bwLine(c,x+12,y+15,x+28,y+15,'#6a6e76');bwLine(c,x+20,y+7,x+20,y+23,'#6a6e76')}
 for(const [x,y] of [[260,120],[340,120],[260,200],[340,200]]){R(c,x,y,50,40,'#2a3a4a');for(let k=0;k<5;k++)R(c,x+k*10,y,1,40,'#4a5a6a');R(c,x,y,50,2,'#5a6a7a')}
 for(let i=0;i<5;i++)bwEll(c,100+Math.random()*440,40+Math.random()*260,10+Math.random()*20|0,4+Math.random()*5|0,'#100c16');
 R(c,30,-30,w-60,28,'#100a14');R(c,30,-30,w-60,2,'#3a2a4a');for(let x=40;x<w-40;x+=60){R(c,x,-4,3,8,'#2a2030')}}
function bwRoofPlant(c,b){const w=b.w,h=b.h;R(c,0,0,w,h,'#3a3a40');for(let i=0;i<w*h/5;i++)R(c,Math.random()*w,Math.random()*h,1,1,pick(['#424248','#323238','#4a4a50']));
 R(c,0,0,w,3,'#56565c');R(c,0,h-3,w,3,'#26262a');for(let x=0;x<w;x+=40)R(c,x,0,1,h,'#303036');
 for(const [x,y,s] of [[40,40,26],[100,40,26]]){R(c,x-s/2+4,y-b.rup+8,s,b.rup,'rgba(0,0,0,.35)');R(c,x-s/2,y-b.rup,s,b.rup,'#6a5e56');for(let k=0;k<b.rup;k+=6)R(c,x-s/2,y-b.rup+k,s,1,'#5a4e48');R(c,x-s/2,y-b.rup,4,b.rup,'#7a6e66');R(c,x+s/2-4,y-b.rup,4,b.rup,'#4a3e38');
  bwEll(c,x,y-b.rup,s/2,4,'#2a2420');bwEll(c,x,y-b.rup,s/2-3,2,'#0a0808');R(c,x-s/2,y-b.rup+10,s,3,'#b02a2a');R(c,x-s/2,y-b.rup+22,s,3,'#e8e4dc')}
 for(const [x,y] of [[400,40],[440,40],[400,200],[220,180]]){R(c,x,y,24,16,'#5a5a60');R(c,x,y,24,3,'#7a7a80');for(let k=0;k<4;k++)R(c,x+3+k*5,y+6,3,8,'#2a2a30')}
 for(let x=160;x<w-20;x+=2)R(c,x,120,2,4,'#4e5a4e');for(let x=160;x<w-20;x+=2)R(c,x,126,2,3,'#5a4e3e');
 bwText(c,'DANGER',300,226,'#c8a020',2);bwText(c,'HIGH VOLTAGE',280,240,'#c8a020',2)}
function bwRoofTunnel(c,b){const w=b.w,h=b.h;R(c,0,0,w,h,'#3e3e44');for(let i=0;i<w*h/4;i++)R(c,Math.random()*w,Math.random()*h,1,1,pick(['#46464c','#36363a']));for(let y=10;y<h;y+=46){R(c,8,y,w-16,24,'#1e1e22');for(let k=0;k<w-16;k+=3)R(c,8+k,y,1,24,'#4a4a50')}
 for(let y=0;y<h;y+=10){R(c,0,y,4,5,'#c8a020');R(c,w-4,y+5,4,5,'#c8a020')}}
function bwRoofBumper(c,b){const w=b.w,h=b.h;for(let x=0;x<w;x+=4){R(c,x,0,2,h,'#4a5866');R(c,x+2,0,2,h,'#3a4652')}for(let i=0;i<w*h/40;i++)R(c,Math.random()*w,Math.random()*h,2,1,'rgba(140,70,30,.5)');R(c,0,0,w,2,'#6a7886');R(c,0,h-2,w,2,'#20262e');R(c,20,-22,w-40,20,'#100c14');R(c,20,-22,w-40,1,'#3a3040')}
function bwRoofLighthouse(c,b){const w=b.w,h=b.h;R(c,0,0,w,h,'#5a4a46');for(let y=0;y<h;y+=4)R(c,0,y,w,1,'#4a3a36');R(c,0,0,w,2,'#7a6a66');
 const cx=w/2,base=h*.55,top=base-b.rup+36;
 for(let y=top;y<base;y++){const k=(y-top)/(base-top),r=Math.round(w*.3+k*w*.12);const band=Math.floor((y-top)/22)%2===0;R(c,cx-r,y,r*2,1,band?'#e8e4dc':'#b02a2a');R(c,cx-r,y,3,1,band?'#ffffff':'#d04040');R(c,cx+r-5,y,5,1,band?'#a8a49c':'#7a1a1a')}
 bwEll(c,cx,base,w*.42|0,6,'#3a3432');bwEll(c,cx,top,w*.32|0,5,'#2a2a2e');R(c,cx-(w*.32|0),top-2,(w*.64|0),3,'#3a3a40');for(let x=-(w*.32|0);x<=(w*.32|0);x+=4)R(c,cx+x,top-8,1,7,'#3a3a40');
 R(c,cx-12,top-24,24,18,'#1a2028');for(let x=-12;x<12;x+=6)R(c,cx+x,top-24,1,18,'#4a4a50');R(c,cx-12,top-24,24,1,'#5a5a60');
 bwEll(c,cx,top-26,14,6,'#7a1a1a');bwEll(c,cx,top-29,8,4,'#9a2a2a');R(c,cx-1,top-38,2,9,'#2a2a2e');bwCirc(c,cx,top-39,2,'#c8a040');
 for(let y=top+30;y<base-10;y+=36)R(c,cx-4,y,8,10,'#1a2028')}

// =====================================================================
// Große Kulissen: Clownstor, Riesenrad, Karussell, Achterbahn
// =====================================================================
let BW_GATE=null,BW_WHEEL=null,BW_CAR=null,BW_COASTER=null;
function bwPrerender(){
 // Clownstor (240×210) nach Willis Bild: riesiger Clownskopf, das offene Maul ist der Durchgang. Fußpunkt unten Mitte = (120,206)
 {const [cv,c]=mk(240,210),ox=120,oy=206;
  // Pfosten mit Streifen und Lampen
  for(const sx of [-68,52]){R(c,ox+sx,oy-160,16,160,'#2a1a1e');for(let y=0;y<156;y+=10){R(c,ox+sx+2,oy-158+y,12,5,'#b8202a');R(c,ox+sx+2,oy-153+y,12,5,'#e8dcc4')}R(c,ox+sx-3,oy-166,22,7,'#c8a040');R(c,ox+sx+2,oy-6,12,6,'#3a2a2a')}
  // Haare (rot-orange Büschel)
  for(const s2 of [-1,1])for(let i=0;i<7;i++){const a=-.3+i*.32;bwCirc(c,ox+s2*(46+Math.cos(a)*12),oy-112+Math.sin(a)*30-10,12-(i%2)*3,['#c83a12','#e8601e','#a82a10'][i%3])}
  for(let i=0;i<5;i++)bwCirc(c,ox-24+i*12,oy-150,9,['#c83a12','#e8601e'][i%2]);
  // Gesicht
  bwEll(c,ox,oy-100,50,52,'#1e1418');bwEll(c,ox,oy-101,47,49,'#e8dcc8');
  for(let i=0;i<220;i++){const a=Math.random()*6.3,r=Math.random()*44;R(c,ox+Math.cos(a)*r,oy-101+Math.sin(a)*r*1.05,2,1,pick(['#d0c4ae','#c8bca6','#f0e6d4']))}
  for(const s2 of [-1,1]){bwEll(c,ox+s2*30,oy-86,10,7,'rgba(200,60,70,.45)');
   // Augenhöhlen + Brauen
   bwEll(c,ox+s2*17,oy-118,11,10,'#2a1418');bwEll(c,ox+s2*17,oy-118,8,7,'#5a1a14');bwLine(c,ox+s2*6,oy-128,ox+s2*30,oy-136,'#1a1014',3);
   for(let k=0;k<6;k++)R(c,ox+s2*(36+k),oy-122+k*3,1,2,'rgba(60,40,30,.6)')}
  // Nase
  bwCirc(c,ox,oy-100,10,'#9a1a1a');bwCirc(c,ox,oy-101,9,'#d82a2a');R(c,ox-4,oy-106,3,3,'#ff9a8a');
  // Maul = Tor: rote Lippen, dunkler Schlund, Zähne
  bwEll(c,ox,oy-40,46,42,'#7a0a12');bwEll(c,ox,oy-38,42,38,'#b01a22');bwEll(c,ox,oy-36,36,34,'#0a0406');R(c,ox-38,oy-36,76,36,'#0a0406');R(c,ox-46,oy-40,8,40,'#b01a22');R(c,ox+38,oy-40,8,40,'#b01a22');
  for(let x=-32;x<=26;x+=8){for(let k=0;k<9;k++)R(c,ox+x+k*.45,oy-70+k,Math.max(1,7-k*.8),1,k<2?'#f0e6c0':'#d8c890')}
  for(const x of [-38,30])for(let k=0;k<14;k++)R(c,ox+x+(x<0?k*.3:-k*.3),oy-60+k*4,4,3,'#d8c890');
  bwEll(c,ox,oy-20,18,6,'rgba(120,20,30,.5)');
  // Schmutz und Risse
  for(let i=0;i<40;i++)R(c,ox-44+Math.random()*88,oy-150+Math.random()*80,1,2,'rgba(50,34,26,.5)');
  BW_GATE=cv}
 // Riesenrad: Rad mit Speichen (R=108)
 {const S=232,[cv,c]=mk(S,S),m=S/2;bwRing(c,m,m,108,'#9a9088',3);bwRing(c,m,m,96,'#7a706a',2);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;bwLine(c,m,m,m+Math.cos(a)*107,m+Math.sin(a)*107,'#8a8078',1);const a2=a+Math.PI/16;bwLine(c,m+Math.cos(a)*96,m+Math.sin(a)*96,m+Math.cos(a2)*108,m+Math.sin(a2)*108,'#6a625c',1)}
  for(let i=0;i<40;i++){const a=Math.random()*6.3,r=96+Math.random()*12;R(c,m+Math.cos(a)*r,m+Math.sin(a)*r,2,2,'#7a3a22')}
  bwCirc(c,m,m,10,'#4a4248');bwCirc(c,m,m,6,'#2a2428');R(c,m-1,m-1,2,2,'#c8a040');BW_WHEEL=cv}
 // Karussell: Plattform + Dach
 {const [cv,c]=mk(120,110);const cx=60,cy=84;bwEll(c,cx,cy+4,54,22,'#1a1418');bwEll(c,cx,cy,54,20,'#5a3a24');bwEll(c,cx,cy,50,18,'#7a5234');for(let i=0;i<24;i++){const a=i/24*Math.PI*2;bwLine(c,cx,cy,cx+Math.cos(a)*49,cy+Math.sin(a)*17,'#5e3e26')}
  bwEll(c,cx,cy,12,5,'#c8a040');BW_CAR={plat:cv};
  const [cv2,c2]=mk(130,60);const tx=65,ty=40;for(let y=-24;y<=14;y++){const k=(y+24)/38,r=Math.round(8+k*54);for(let x=-r;x<r;x++){const a=Math.atan2(y*2.4,x),idx=Math.floor((a+Math.PI)/(Math.PI*2)*16);R(c2,tx+x,ty+y,1,1,idx%2?'#d8ccb4':'#2a6a8a')}}
  for(let x=-62;x<62;x+=8)bwEll(c2,tx+x+4,ty+15,4,3,((x+62)/8)&1?'#d8ccb4':'#2a6a8a');R(c2,tx-1,ty-34,2,10,'#3a3036');R(c2,tx+1,ty-34,8,4,'#c8a040');BW_CAR.top=cv2}
 // Achterbahn: Schienen, Stützen, Querschwellen in eine Leinwand über Bereich E
 {const T=bwTrack();let mx=1e9,my=1e9,Mx=-1e9,My=-1e9;for(const p of T){mx=Math.min(mx,p.x);my=Math.min(my,p.y-p.z);Mx=Math.max(Mx,p.x);My=Math.max(My,p.y)}const x0=Math.floor(mx-20),y0=Math.floor(my-20),[cv,c]=mk(Math.ceil(Mx-mx+40),Math.ceil(My-my+40));c.translate(-x0,-y0);
  for(let i=0;i<T.length;i+=12){const p=T[i];if(p.broke)continue;const col=p.z>40?'#3a2a22':'#4a3426';R(c,p.x-1,p.y-p.z,2,p.z,col);R(c,p.x-1,p.y-p.z,1,p.z,'#5a4436');if(i%24===0&&p.z>16){bwLine(c,p.x-6,p.y-2,p.x,p.y-p.z*.6,'#3a2a22');bwLine(c,p.x+6,p.y-2,p.x,p.y-p.z*.6,'#3a2a22')}R(c,p.x-2,p.y-1,4,2,'#22181a')}
  for(let i=0;i<T.length;i++){const p=T[i];if(p.broke)continue;const sx=p.x,sy=p.y-p.z;if(i%3===0)bwLine(c,sx+p.nx*4,sy+p.ny*3,sx-p.nx*4,sy-p.ny*3,'#5a3a26');R(c,sx+p.nx*4-1,sy+p.ny*3-1,2,2,'#9a4a32');R(c,sx-p.nx*4-1,sy-p.ny*3-1,2,2,'#b85a3a')}
  for(const p of T)if(p.broke&&p.dangle)bwLine(c,p.x,p.y-p.z,p.x+p.dangle*6,p.y-p.z+18,'#8a3a2a',2);
  BW_COASTER={cv,x0,y0,T}}}
// Achterbahnstrecke: Kontrollpunkte (Bodenposition + Höhe), Catmull-Rom geglättet
const BW_TRACKD='M230 200 C300 130 460 140 490 210 C520 280 480 370 400 380 C320 390 300 300 260 330 C210 360 180 260 230 200Z';
function bwTrack(){const pts=bwPathPts(BW_TRACKD,2)[0],T=pts.map(([x,y],i)=>({x,y,z:44+Math.sin(i/pts.length*Math.PI*4)*22+Math.sin(i/pts.length*Math.PI*10)*8}));
 for(let i=0;i<T.length;i++){const p=T[i],q=T[(i+1)%T.length],dx=q.x-p.x,dy=q.y-p.y,l=Math.hypot(dx,dy)||1;p.nx=-dy/l;p.ny=dx/l}
 const b0=Math.floor(T.length*.42),b1=b0+16;for(let i=b0;i<b1;i++){T[i].broke=1;if(i===b0||i===b1-1)T[i].dangle=i===b0?1:-1}
 return T}
function bwCoasterSupports(){const T=bwTrack();for(let i=0;i<T.length;i+=12){const p=T[i];if(p.broke)continue;if(blocked(p.x,p.y,7)||STATIONS.some(s=>Math.hypot(s.x-p.x,s.y-p.y)<22))continue;FSOL.push({x:p.x-2,y:p.y-3,w:4,h:4})}}

// ---- Requisiten
function bwDrawProp(p){const x=Math.round(p.x),y=Math.round(p.y);
 switch(p.t){
 case'flamp':{const on=p.emer?(Math.sin(now*19+x)+Math.sin(now*7+y)>1.3?0:1):bwLit(bwSec(x,y),p.fl||0),H=p.big?50:40;R(g,x-1,y-H,3,H,'#2a2a34');R(g,x-1,y-H,1,H,'#4a4a56');R(g,x-3,y-3,7,3,'#1e1e26');R(g,x-6,y-H,13,2,'#2a2a34');
  for(const s of [-6,6]){bwCirc(g,x+s,y-H+3,3,on?'#fff2c8':'#3a3a44');if(on)R(g,x+s-1,y-H+2,2,2,'#ffffff')}bwCirc(g,x,y-H-3,2,on?'#ffe8a0':'#3a3a44');break}
 case'clowngate':{const a=fadeIf(x-120,y-210,240,210,y);g.globalAlpha=a;g.drawImage(BW_GATE,x-120,y-206);
  const on=POWER.on,eye=.65+Math.sin(now*3)*.35;for(const s of [-1,1]){bwEll(g,x+s*17,y-118,5,4,'rgba(255,214,60,'+eye+')');R(g,x+s*17-2,y-119,3,2,'#fff6c0')}
  // Neon-Bogen BLACKWATER / FAIR mit Glühbirnen
  for(let i=0;i<=28;i++){const t=i/28,bx=x-62+t*124,by=y-176-Math.sin(t*Math.PI)*16,lit=on?((i+(now*6|0))%3!==0):(i%9===4&&Math.random()<.5);R(g,bx-1,by-1,2,2,lit?'#fff2a0':'#3a2a1e')}
  R(g,x-46,y-196,92,30,'rgba(20,6,10,.85)');
  const nc=on?((now*1.3%5)<.08?'#5a1a10':'#ff5a2a'):'#4a1a14';bwTextC(g,'BLACKWATER',x,y-192,nc,2);bwTextC(g,'FAIR',x,y-180,on?'#ffb03a':'#4a2a14',2);
  g.globalAlpha=1;break}
 case'turnstile':R(g,x-6,y-12,2,12,'#5a5a64');R(g,x+4,y-12,2,12,'#5a5a64');R(g,x-6,y-12,12,2,'#7a7a84');bwLine(g,x-5,y-8,x+5,y-5,'#9a9aa4');break;
 case'billboard':{R(g,x-30,y-50,3,50,'#3a3036');R(g,x+27,y-50,3,50,'#3a3036');R(g,x-36,y-76,72,30,'#1a1418');R(g,x-35,y-75,70,28,'#d8ccb0');R(g,x-35,y-75,70,6,'#b02a2a');for(let i=0;i<14;i++)R(g,x-35+Math.random()*0+i*5,y-48,2,2,'rgba(60,40,30,.5)');
  bwTextC(g,p.txt[0],x,y-66,'#2a1a1a');bwTextC(g,p.txt[1],x,y-59,'#8a1a1a');R(g,x-35+((x*3)%40),y-75,10,28,'rgba(0,0,0,.15)');R(g,x+10,y-62,22,14,'rgba(40,30,30,.25)');break}
 case'fountain':{bwEll(g,x,y-8,28,13,'#4a4450');bwEll(g,x,y-9,25,11,'#1c2a3a');bwEll(g,x-6,y-11,10,3,'#2a3e52');R(g,x-3,y-30,6,22,'#5a5462');bwEll(g,x,y-30,10,4,'#6a6472');
  R(g,x-4,y-46,8,14,'#d8ccb8');bwCirc(g,x,y-50,5,'#e8dcc8');R(g,x-2,y-51,1,1,'#000');R(g,x+1,y-51,1,1,'#000');R(g,x-1,y-49,2,2,'#d82a2a');R(g,x-5,y-57,10,3,'#3a2a5a');
  if(POWER.on)for(let i=0;i<3;i++){const t=(now*1.4+i/3)%1;R(g,x-8+i*8,y-30+t*20,1,2,'rgba(140,180,220,.7)')}break}
 case'infoboard':R(g,x-12,y-30,2,30,'#3a3036');R(g,x+10,y-30,2,30,'#3a3036');R(g,x-14,y-44,28,18,'#2a3a4a');R(g,x-13,y-43,26,16,'#c8c0a8');bwTextC(g,p.txt[0],x,y-40,'#2a2a2a');bwTextC(g,p.txt[1],x,y-34,'#8a1a1a');R(g,x-4,y-30,3,3,'#d82a2a');break;
 case'planter':R(g,x-20,y-12,40,12,'#4a3a32');R(g,x-20,y-12,40,2,'#6a5a4a');R(g,x-18,y-11,36,3,'#2a2a1e');break;
 case'balloons':{R(g,x,y-30,1,30,'#aaa');for(let i=0;i<5;i++){const bx=x-8+i*4+Math.sin(now*1.5+i)*2,by=y-36-((i*7)%10),col=['#d83a3a','#3a8ad8','#e8c040','#5ad08a','#d870d8'][i];bwEll(g,bx,by,3,4,shade(col,.7));R(g,bx-1,by-2,1,1,'#fff');bwLine(g,x,y-30,bx,by+4,'rgba(200,200,200,.5)')}break}
 case'icecart':R(g,x-15,y-16,30,13,'#e8e0d0');R(g,x-15,y-16,30,3,'#d84a8a');R(g,x-13,y-12,26,6,'#c8c0b0');bwCirc(g,x-10,y-2,3,'#1a1a1a');bwCirc(g,x+10,y-2,3,'#1a1a1a');R(g,x-15,y-28,2,12,'#888');bwEll(g,x-8,y-29,12,3,'#3a8ad8');bwText(g,'ICE',x-5,y-13,'#d84a8a');break;
 case'trolley':R(g,x-5,y-8,10,6,'rgba(160,160,170,.0)');for(let k=0;k<10;k+=2)R(g,x-5+k,y-9,1,7,'#8a8a94');R(g,x-6,y-9,12,1,'#a8a8b0');R(g,x-6,y-3,12,1,'#a8a8b0');R(g,x-5,y-1,2,2,'#222');R(g,x+3,y-1,2,2,'#222');break;
 case'picnic':R(g,x-15,y-8,30,6,'#7a5a3a');R(g,x-15,y-8,30,1,'#9a7a54');R(g,x-15,y-2,30,2,'#4a3422');R(g,x-15,y-12,30,2,'#6a4a30');R(g,x-15,y+1,30,2,'#6a4a30');break;
 case'striker':{R(g,x-2,y-56,4,56,'#d8ccb0');for(let k=0;k<56;k+=8)R(g,x-2,y-56+k,4,4,['#d83a3a','#e8c040','#5ad08a','#3a8ad8'][(k/8)%4]);bwCirc(g,x,y-58,4,'#c8a040');R(g,x-5,y-4,10,4,'#5a3a2a');const pk=POWER.on?(Math.sin(now*2)*.5+.5)*48:4;R(g,x-1,y-6-pk,2,3,'#ffffff');bwText(g,'TEST YOUR',x-17,y-64,'#e8c040');bwText(g,'BRAINS',x-11,y-70+0,'#d83a3a');break}
 case'bulbpole':R(g,x-1,y-44,3,44,'#3a3036');R(g,x-3,y-46,7,3,'#5a4a3a');break;
 case'kiosk':{R(g,x-17,y-22,34,22,'#c8302a');for(let k=0;k<34;k+=6)R(g,x-17+k,y-22,3,22,'#e8dcc4');R(g,x-17,y-26,34,5,'#ffd23a');R(g,x-14,y-18,28,8,'#2a1a14');for(let i=0;i<10;i++)R(g,x-13+((i*7)%26),y-17+((i*3)%6),2,2,'#fff4c0');bwTextC(g,'POPCORN',x,y-25,'#8a1a1a');R(g,x-17,y-3,34,3,'#5a1a14');break}
 case'lifeguard':R(g,x-8,y-30,2,30,'#a8987e');R(g,x+6,y-30,2,30,'#a8987e');bwLine(g,x-7,y-2,x+7,y-26,'#8a7a66');R(g,x-10,y-46,20,16,'#d8d0c0');R(g,x-10,y-46,20,3,'#d83a3a');R(g,x-12,y-50,24,4,'#c83030');bwText(g,'SOS',x-5,y-40,'#d83a3a');break;
 case'binoc':R(g,x-1,y-16,2,16,'#4a4a54');R(g,x-5,y-22,10,6,'#3a5a7a');R(g,x-5,y-22,10,2,'#5a7a9a');R(g,x+5,y-21,2,4,'#2a2a34');break;
 case'lifering':R(g,x-1,y-16,2,10,'#8a7a66');bwRing(g,x,y-20,4,'#e8dcc8',2);R(g,x-4,y-21,2,2,'#d83a3a');R(g,x+3,y-21,2,2,'#d83a3a');break;
 case'horse':R(g,x-9,y-6,18,6,'#e8dcc8');R(g,x+6,y-11,6,6,'#e8dcc8');R(g,x+10,y-12,2,2,'#2a1a1a');R(g,x-9,y-7,6,2,'#d83a3a');R(g,x-6,y-2,2,2,'#c8a040');R(g,x-12,y-3,4,2,'#c8a040');R(g,x-2,y-14,1,10,'#c8a040');break;
 case'net':for(let i=0;i<5;i++)for(let k=0;k<5;k++)R(g,x-8+i*4,y-4+k*2,3,1,'rgba(120,140,110,.6)');R(g,x-2,y-2,4,3,'#c8a040');break;
 case'photobooth':R(g,x-10,y-32,20,32,'#3a2a4a');R(g,x-10,y-32,20,4,'#c86aff');R(g,x-8,y-26,9,22,'#8a1a2a');R(g,x+2,y-24,6,6,POWER.on&&(now*2|0)%3===0?'#ffffff':'#2a2a3a');bwText(g,'SMILE',x-9,y-38,'#c86aff');break;
 case'transformer':R(g,x-15,y-20,30,20,'#4a5a4a');for(let k=0;k<30;k+=3)R(g,x-15+k,y-20,1,20,'#3a4a3a');R(g,x-15,y-20,30,2,'#6a7a6a');for(const s of [-8,0,8]){R(g,x+s-1,y-30,3,10,'#c8c8b8');R(g,x+s-2,y-26,5,1,'#8a8a7a')}R(g,x-6,y-14,12,6,'#c8a020');R(g,x-1,y-13,2,4,'#1a1a1a');break;
 case'drum':bwEll(g,x,y-5,7,5,'#6a4a2a');bwEll(g,x,y-6,5,3,'#4a3420');R(g,x-1,y-7,2,2,'#2a1e14');break;
 case'pylon':R(g,x-1,y-70,3,70,'#3a3a40');bwLine(g,x-4,y,x,y-70,'#4a4a50');bwLine(g,x+4,y,x,y-70,'#4a4a50');R(g,x-10,y-64,21,2,'#4a4a50');R(g,x-10,y-66,2,4,'#c8c8b8');R(g,x+9,y-66,2,4,'#c8c8b8');break;
 case'boulder':{const s=p.s;bwEll(g,x,y-s*.35,s*.6|0,s*.45|0,'#3a3640');bwEll(g,x-s*.12,y-s*.45,s*.42|0,s*.3|0,'#4a4652');R(g,x-s*.3,y-s*.65,s*.3,1,'#6a6672');break}
 case'log':R(g,x-15,y-6,30,6,'#5a4632');R(g,x-15,y-6,30,1,'#7a6448');bwEll(g,x+15,y-3,2,3,'#8a7458');break;
 case'buoy':{const b=Math.sin(now*1.6+x)*1.5;R(g,x-3,y-6+b,6,6,'#c83a2a');R(g,x-1,y-12+b,2,6,'#3a3a3a');const on=(now+x*.01)%2<.2;R(g,x-1,y-14+b,2,2,on?'#ff6a4a':'#5a2a1a');R(g,x-6,y+b,12,1,'rgba(150,180,210,.35)');break}
 case'wreck':{R(g,x-46,y-16,92,16,'#3a2a1e');for(let k=0;k<92;k+=6)R(g,x-46+k,y-16,1,16,'#2a1e14');R(g,x-46,y-18,92,3,'#5a4632');R(g,x-30,y-40,3,24,'#4a3a2a');R(g,x-32,y-38,14,1,'#4a3a2a');R(g,x+20,y-30,2,14,'#4a3a2a');bwText(g,'S.S. LAST LAUGH',x-30,y-12,'#8a7a5a');R(g,x+10,y-14,12,8,'#0e1a2a');break}
 case'derail':R(g,x-13,y-12,26,12,'#8a2a1a');R(g,x-13,y-12,26,2,'#b84a2a');R(g,x-10,y-16,20,4,'#2a1a14');R(g,x-12,y-2,4,2,'#111');R(g,x+8,y-2,4,2,'#111');bwText(g,'13',x-3,y-9,'#e8c040');break;
 case'wheel':bwDrawWheel(p);break;
 case'carousel':bwDrawCarousel(p);break}}
function bwDrawWheel(p){const x=p.x,y=p.y,hx=x,hy=y-128,a=BW.wheelA,fa=fadeIf(x-118,y-250,236,250,y);g.globalAlpha=fa;
 for(const s of [-1,1])bwLine(g,x+s*44,y-4,hx+s*3,hy+2,'#3a3a44',3);
 g.save();g.translate(Math.round(hx),Math.round(hy));g.rotate(a);g.drawImage(BW_WHEEL,-116,-116);g.restore();
 const on=POWER.on&&now-POWER.at>bwSec(x,y);
 for(let i=0;i<24;i++){const aa=a+i/24*Math.PI*2,bx=hx+Math.cos(aa)*108,by=hy+Math.sin(aa)*108,lit=on?((i+(now*5|0))%4!==0):(i===3&&Math.random()<.4);R(g,bx-1,by-1,3,3,lit?['#ff4a4a','#ffd23a','#4ad8ff','#ff6ad8'][i%4]:'#3a3036')}
 for(let i=0;i<12;i++){const aa=a+i/12*Math.PI*2,gx=hx+Math.cos(aa)*108,gy=hy+Math.sin(aa)*108,sw=Math.sin(now*1.3+i)*1.5;R(g,gx,gy,1,5,'#3a3036');
  const cx=Math.round(gx+sw-6),cy=Math.round(gy+5),col=['#c83a3a','#3a7ac8','#c8a030','#4a9a4a'][i%4];R(g,cx,cy,12,9,shade(col,.7));R(g,cx,cy,12,3,col);R(g,cx+2,cy+3,8,3,on?'#fff2c0':'#1a1a22');R(g,cx-1,cy-1,14,1,'#2a2a30')}
 for(const s of [-1,1])bwLine(g,x+s*46,y-2,hx+s*6,hy+3,'#5a5a66',3);bwCirc(g,hx,hy,5,'#6a6a74');
 R(g,x-50,y-10,100,10,'#3a3036');R(g,x-50,y-10,100,2,'#5a4a50');for(let k=0;k<100;k+=10)R(g,x-50+k,y-8,1,8,'#2a2028');bwText(g,'RIDE AT YOUR OWN RISK',x-41,y-7,'#c8a040');g.globalAlpha=1}
function bwDrawCarousel(p){const x=p.x,y=p.y,cx=x,cy=y-14,a=BW.carA,fa=fadeIf(x-60,y-110,120,110,y+6);g.globalAlpha=fa;
 g.drawImage(BW_CAR.plat,x-60,cy-84);const on=POWER.on&&now-POWER.at>bwSec(x,y);
 const hs=[];for(let i=0;i<8;i++){const aa=a+i/8*Math.PI*2;hs.push({aa,hx:cx+Math.cos(aa)*38,hy:cy+Math.sin(aa)*14,bob:Math.sin(now*3+i)*(on?3:0)})}
 const horse=h=>{const hx=Math.round(h.hx),hy=Math.round(h.hy-14+h.bob),d=Math.cos(h.aa+Math.PI/2)>0?1:-1;R(g,hx,cy-44,1,44+(h.hy-cy),'#c8a040');R(g,hx-6,hy,12,6,'#e8dcc8');R(g,hx+d*5-2,hy-5,4,6,'#e8dcc8');R(g,hx+d*6,hy-4,1,1,'#1a1a1a');R(g,hx-4,hy+6,2,4,'#d8ccb8');R(g,hx+3,hy+6,2,4,'#d8ccb8');R(g,hx-3,hy,6,2,['#d83a3a','#3a8ad8','#5ad08a','#e8c040'][(h.aa*10|0)%4])};
 for(const h of hs)if(Math.sin(h.aa)<0)horse(h);R(g,cx-4,cy-44,8,44,'#5a3a5a');R(g,cx-4,cy-44,2,44,'#7a5a7a');for(const h of hs)if(Math.sin(h.aa)>=0)horse(h);
 g.drawImage(BW_CAR.top,cx-65,cy-84);for(let i=0;i<16;i++){const bx=cx-60+i*8;R(g,bx,cy-58,2,2,on&&((i+(now*4|0))%2)?'#fff2a0':'#3a2a2a')}g.globalAlpha=1}

// ---- Neonschilder
function bwDrawNeon(n){const t=n.t,s=n.s||1,w=bwTW(t,s)+6,h=5*s+6,x=Math.round(n.x-w/2),by=Math.round(n.sy!=null?n.sy:n.y-26),on=bwLit(n.sec,n.fl);
 if(n.b&&n.b.cut>.5)return;
 if(n.post!==false){R(g,x+3,by,2,n.y-by,'#2a2a30');R(g,x+w-5,by,2,n.y-by,'#2a2a30')}
 R(g,x,by-h,w,h,'#140e16');R(g,x,by-h,w,1,'#3a3040');bwText(g,t,x+3,by-h+3,on?n.c:shade(n.c,.25),s);if(on)bwText(g,t,x+3,by-h+3,'rgba(255,255,255,.35)',s)}

// ---- Freikaufbare Zugänge zeichnen
function bwDrawBarrier(b){const {x,y,w,h}=b.r,e=b.open?clamp((now-b.t)/.9,0,1):0;if(b.open&&e>=1&&b.k!=='shutter'&&b.k!=='gate'&&b.k!=='door'&&b.k!=='maint'&&b.k!=='hatch')return;
 switch(b.k){
 case'debris':{if(b.open)g.globalAlpha=1-e;for(const pc of b.pcs){const fx=pc.x+(b.open?pc.vx*e*30:0),fy=pc.y+(b.open?pc.vy*e*20:0),fz=pc.z+(b.open?Math.sin(e*Math.PI)*14:0);R(g,fx,fy-fz-pc.h,pc.w,pc.h,pc.c);R(g,fx,fy-fz-pc.h,pc.w,1,shade(pc.c,1.25))}
  if(!b.open){R(g,x-4,y+20,36,8,'#4a3a2a');bwText(g,'SOUVENIRS',x-16,y+8,'#8a6a4a')}g.globalAlpha=1;break}
 case'gate':{const H=30;if(!b.v){const lw=w/2*(1-e*.85);R(g,x-3,y+h/2-H-6,4,H+10,'#3a2a22');R(g,x+w-1,y+h/2-H-6,4,H+10,'#3a2a22');
   for(const [ox,dir] of [[x+1,1],[x+w-1,-1]]){for(let k=0;k<lw;k+=4)R(g,ox+dir*k-(dir<0?1:0),y+h/2-H,1,H,'#6a3a22');R(g,Math.min(ox,ox+dir*lw),y+h/2-H,lw,2,'#8a4a2a');R(g,Math.min(ox,ox+dir*lw),y+h/2-H/2,lw,1,'#7a4026');R(g,Math.min(ox,ox+dir*lw),y+h/2-2,lw,2,'#5a3020')}
   if(!b.open){R(g,x+w/2-14,y+h/2-H+6,28,9,'#c8c0a8');bwTextC(g,'STAFF',x+w/2,y+h/2-H+8,'#8a1a1a');R(g,x+w/2-2,y+h/2-12,4,5,'#c8a040');bwLine(g,x+w/2-8,y+h/2-14,x+w/2+8,y+h/2-10,'#8a8a90')}}
  else{const lh=h/2*(1-e*.85);for(const [oy,dir] of [[y,1],[y+h,-1]]){for(let k=0;k<lh;k+=3)R(g,x+w/2-1,oy+dir*k-H,2,H,'#6a3a22');R(g,x+w/2-2,Math.min(oy,oy+dir*lh)-H,4,lh,'rgba(138,74,42,.6)')}
   R(g,x+w/2-2,y-H-4,4,H+6,'#3a2a22');R(g,x+w/2-2,y+h-H-4,4,H+6,'#3a2a22');if(!b.open){R(g,x+w/2-6,y+h/2-H+4,12,9,'#c8c0a8');R(g,x+w/2-2,y+h/2-10,4,5,'#c8a040')}}break}
 case'shutter':{const H=28,top=y+h/2-H+4,vis=Math.round(H*(1-e));R(g,x,top-5,w,6,'#3a3e46');R(g,x,top-5,w,1,'#5a5e66');
  if(vis>0){for(let k=0;k<vis;k+=3){R(g,x+1,top+1+k,w-2,2,'#6a7280');R(g,x+1,top+3+k,w-2,1,'#4a505a')}for(let i=0;i<12;i++)R(g,x+((i*13)%w),top+((i*7)%Math.max(1,vis)),3,2,'rgba(140,70,30,.55)');
   R(g,x+1,top+vis-3,w-2,3,'#1e1e22');for(let k=0;k<w-2;k+=8)R(g,x+1+k,top+vis-3,4,3,'#c8a020');if(!b.open)bwTextC(g,'LOADING BAY',x+w/2,top+8,'#c8a020')}
  R(g,x-3,top-5,3,H+6,'#2a2e36');R(g,x+w,top-5,3,H+6,'#2a2e36');break}
 case'door':{const H=26,top=y+h/2-H+4,off=Math.round(w*e);g.save();g.beginPath();g.rect(x,top-2,w,H+4);g.clip();R(g,x+off,top,w,H,'#4a5058');R(g,x+off,top,w,2,'#6a7078');R(g,x+off+3,top+4,w-6,8,'#3a4048');
  for(let k=0;k<w;k+=8){R(g,x+off+k,top+H-5,4,5,'#c8a020');R(g,x+off+k+4,top+H-5,4,5,'#1a1a1a')}if(!b.open){R(g,x+off+w/2-12,top+5,24,6,'#c8a020');bwTextC(g,'DANGER',x+off+w/2,top+6,'#1a1a1a');R(g,x+w/2-3,top+14,6,6,'#c8a040');bwLine(g,x+4,top+12,x+w-4,top+18,'#8a8a94',2)}
  g.restore();R(g,x-3,top-4,3,H+4,'#2e2e34');R(g,x+w,top-4,3,H+4,'#2e2e34');R(g,x-3,top-4,w+6,3,'#2e2e34');break}
 case'hatch':{const H=14,top=y+h/2-H+2,vis=Math.round(H*(1-e));R(g,x-2,top-3,w+4,3,'#2e2e34');for(let k=0;k<vis;k+=2)R(g,x,top+k,w,1,'#5a5e66');for(let k=0;k<w;k+=4)R(g,x+k,top,1,vis,'#3a3e46');
  if(!b.open){bwTextC(g,'MAINTENANCE',x+w/2,top-10,'#c8a020');R(g,x+w/2-2,top+vis-6,4,4,'#c8a040')}R(g,x-3,top-3,3,H+3,'#2e2e34');R(g,x+w,top-3,3,H+3,'#2e2e34');break}
 case'maint':{const H=30,lh=h*(1-e*.85);R(g,x+w/2-2,y-H-4,4,H+6,'#3a3a44');R(g,x+w/2-2,y+h-H-4,4,H+6,'#3a3a44');
  for(let k=0;k<lh;k+=2)for(let j=0;j<H;j+=4)R(g,x+w/2-1+((k/2+j/4)&1),y+k-H+j,1,2,'rgba(150,150,160,.7)');R(g,x+w/2-1,y-H,2,lh,'#6a6a74');
  if(!b.open){R(g,x+w/2-12,y+h/2-H+2,24,10,'#d8d0c0');bwTextC(g,'NO',x+w/2,y+h/2-H+3,'#b02a2a');bwTextC(g,'ENTRY',x+w/2,y+h/2-H+7+1,'#b02a2a');R(g,x+w/2-2,y+h/2-8,4,5,'#c8a040');for(let k=0;k<h;k+=4)R(g,x+w/2-1+(k%8?1:-1),y+k-H-4,2,1,'#9a9aa4')}break}}}
// Brücken/Stege (Bodenebene)
function bwDrawBridge(b){const {x,y,w,h}=b.r,e=b.open?clamp((now-b.t)/1.2,0,1):0,np=Math.ceil(w/5);
 for(let i=0;i<np;i++){const px=x+i*5,edge=i<2||i>=np-2,show=b.open?(i/np<=e):edge||((i*37)%7===0&&i%3===0);
  if(show){const col=b.open?(i%2?'#6a5038':'#5a4430'):'#4a3626';R(g,px,y+1,4,h-2,col);R(g,px,y+1,4,1,shade(col,1.2));if(!b.open&&!edge)R(g,px,y+h*.3,4,h*.3,'#0c1a30')}
  else if(!b.open&&i%4===1){const t=Math.sin(now*1.3+i)*1;R(g,px,y+h*.6+t,4,3,'#3a2a1c')}}
 if(b.open){for(const yy of [y,y+h-2]){R(g,x,yy-6,Math.round(w*e),2,'#7a6450');for(let k=0;k<w*e;k+=10)R(g,x+k,yy-6,2,7,'#5a4430')}}
 else{R(g,x-1,y-6,8,2,'#7a6450');R(g,x+w-7,y-6,8,2,'#7a6450');bwLine(g,x+7,y-5,x+14,y+4,'#7a6450',2);bwLine(g,x+w-7,y-5,x+w-16,y+6,'#7a6450',2);
  for(let i=0;i<3;i++){const t=(now*.8+i/3)%1;g.strokeStyle='rgba(180,200,230,'+(1-t)*.4+')';g.lineWidth=1;g.beginPath();g.ellipse(x+w/2,y+h*.6,4+t*14,(4+t*14)*.35,0,0,7);g.stroke()}}}
