// D1 ergänzt die vorhandenen Pixel-Symbole um zehn eigene Motive.
// SVG-Quellen bleiben editierbar; PNG 512 und WebP 96/192 werden daraus gerendert.
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const C={edge:'#18212c',shade:'#a56b2d',gold:'#eab448',light:'#ffe2a0',cream:'#f5f0df',teal:'#69dbce',pink:'#ff8fa3',dark:'#344450'};
const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C[c]||c}"/>`;
const path=(d,c)=>`<path d="${d}" fill="${C[c]||c}"/>`;
const star=(x,y)=>rect(x+2,y,2,8,'light')+rect(x,y+3,6,2,'light');
const lock=(x,y)=>path(`M${x+5} ${y+12}v-8h4v-4h12v4h4v8h5v24h-30v-24Z`,'edge')+path(`M${x+9} ${y+12}v-6h12v6h-4v-2h-4v2Z`,'teal')+rect(x+3,y+15,24,18,'gold')+rect(x+3,y+15,4,18,'light')+rect(x+22,y+15,5,18,'shade')+rect(x+12,y+20,6,5,'edge')+rect(x+14,y+24,2,5,'edge');
const card=()=>path('M10 10H50V14H54V50H50V54H10V50H6V14H10Z','edge')+rect(10,14,40,36,'cream')+rect(10,14,40,5,'gold')+rect(16,24,8,8,'teal')+rect(13,32,14,7,'teal')+rect(32,25,13,3,'dark')+rect(32,32,10,3,'dark')+rect(15,43,30,3,'pink');
const clock=()=>path('M22 8H42V12H50V20H54V44H50V52H42V56H22V52H14V44H10V20H14V12H22Z','edge')+path('M22 12H42V16H46V22H50V42H46V48H40V52H24V48H18V42H14V22H18V16H22Z','gold')+rect(24,18,16,28,'cream')+rect(18,24,28,16,'cream')+rect(30,20,4,15,'edge')+rect(33,31,10,4,'edge')+rect(30,15,4,4,'pink')+rect(47,30,4,4,'pink');
const icons={
 'd1.personenbezug':card()+star(46,5),
 'd1.grundsaetze':path('M10 15H24V11H40V15H54V51H39V55H25V51H10Z','edge')+rect(14,19,16,28,'gold')+rect(34,19,16,28,'light')+rect(30,15,4,36,'shade')+rect(18,24,9,3,'cream')+rect(18,31,9,3,'cream')+path('M37 33l4 4 8-12v8l-8 12-7-8Z','teal'),
 'd1.rechte':path('M27 8H37V13H42V30H48V35H52V46H48V53H22V48H17V38H12V28H21V33H25V13H27Z','edge')+path('M29 12H34V33H39V26H43V34H47V44H43V49H25V44H21V35H16V32H18V36H29Z','gold')+rect(29,12,3,21,'light')+star(9,10),
 'd1.kontrolle':path('M11 7H49V57H11Z','edge')+rect(15,11,30,42,'gold')+rect(20,16,20,37,'dark')+rect(24,20,12,30,'teal')+rect(34,33,3,4,'light')+rect(8,53,44,4,'shade'),
 'd1.panne':path('M8 12H53V44H39V50H50V55H10V50H23V44H8Z','edge')+rect(12,16,37,24,'dark')+rect(12,16,5,24,'teal')+rect(26,44,10,6,'gold')+path('M29 20H34V31H29Z','pink')+rect(29,34,5,4,'pink')+path('M43 32H53V37H57V49H53V55H40V50H36V42H40V37H43Z','edge')+rect(43,39,10,12,'gold')+rect(46,32,4,7,'teal'),
 'd1.lernpfad':path('M31 7H37V11H53V34H49V44H44V49H37V55H27V51H20V46H15V37H11V14H27V11H31Z','edge')+path('M16 18H28V15H36V18H48V34H44V42H39V47H33V51H30V47H24V42H20V34H16Z','gold')+path('M20 19H28V16H32V47H28V43H24V35H20Z','light')+path('M24 31l7 7 12-17v10L31 46l-12-12Z','teal'),
 'd1.pruefung':lock(12,10)+star(45,6)+star(45,42)+rect(8,47,7,4,'teal'),
 'd1.cookie':path('M23 9H40V14H45V20H52V26H47V33H55V44H50V50H42V55H22V51H15V44H10V24H15V15H23Z','edge')+path('M23 14H37V19H42V24H38V34H47V38H50V42H45V46H39V50H24V46H19V39H15V25H19V19H23Z','gold')+rect(21,23,6,6,'shade')+rect(29,36,6,6,'shade')+rect(39,40,5,5,'shade')+rect(20,40,4,4,'shade')+rect(49,13,5,5,'pink')+rect(55,23,3,3,'gold'),
 'd1.verbergen':path('M21 9H43V13H50V21H54V52H47V48H41V53H34V49H28V53H21V48H15V52H10V23H14V15H21Z','edge')+path('M22 14H42V18H46V24H49V45H44V42H38V47H34V43H28V47H24V43H19V46H15V24H18V18H22Z','cream')+rect(23,25,6,8,'dark')+rect(36,25,6,8,'dark')+rect(24,25,2,3,'teal')+rect(37,25,2,3,'teal')+rect(29,37,7,3,'pink'),
 'd1.frist':clock()+path('M4 15H15V19H9V23H4Z','pink')+rect(2,28,7,4,'pink')+rect(5,40,7,4,'pink')+star(48,4)
};
const pngDir=resolve(root,'achievement-icons'),webpDir=resolve(root,'assets/achievement-icons'),svgDir=resolve(root,'tools/dau-previews/svg/icons');
for(const d of [pngDir,webpDir,svgDir])mkdirSync(d,{recursive:true});
const browser=await chromium.launch(process.env.DTP_CHROMIUM_PATH?{executablePath:process.env.DTP_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']}:{});
const page=await browser.newPage();
for(const [code,inner] of Object.entries(icons)){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 64 64" shape-rendering="crispEdges">${inner}</svg>`;
 writeFileSync(resolve(svgDir,code+'.svg'),svg);
 const data=await page.evaluate(async svg=>{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await img.decode();const out={};for(const [size,type] of [[512,'png'],[96,'webp'],[192,'webp']]){const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0,size,size);out[size]=c.toDataURL('image/'+type,.95).split(',')[1]}return out},svg);
 writeFileSync(resolve(pngDir,code+'.png'),Buffer.from(data[512],'base64'));
 writeFileSync(resolve(webpDir,code+'.webp'),Buffer.from(data[96],'base64'));
 writeFileSync(resolve(webpDir,code+'-192.webp'),Buffer.from(data[192],'base64'));
}
await browser.close();console.log('10 D1-Symbole: SVG, PNG 512, WebP 96/192');
