import {GEAR} from './gear.js';
// Small painted SVG objects: material-colored fills, lit facets and dark edges.
const path=(d,fill,stroke='#293a3c',width=1.2)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const line=(d,color='#ead6aa',width=1.2)=>path(d,'none',color,width);
const oval=(x,y,rx,ry,fill)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const rect=(x,y,w,h,fill,r=1)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="#293a3c" stroke-width="1.1"/>`;
const grain=line('M10 18l18-9M12 23l19-10M15 28l15-8','#e0b879',.8);
const gem=(color,light)=>path('M12 5 27 3 37 15 31 35 19 43 8 29 5 15Z',color)+path('M12 5 20 16 27 3 37 15 20 16 19 43 8 29Z',light)+line('M5 15l15 1 17-1M20 16l11 19','#effaff',.9);
const cloak=(body,trim)=>path('M16 5 24 10 32 5 38 17 43 42 25 36 5 42 10 17Z',body)+path('M16 5 24 13 32 5 34 13 24 20 14 13Z',trim)+line('M14 19 10 36M24 22v12M34 19l4 17',trim,1.5)+oval(24,17,2.5,2,'#e8c16e');
const sword=path('M17 29 34 6 42 3 41 13 22 34Z','#bccfd4')+path('M19 29 39 7 22 34Z','#f0f5e6')+line('M14 27 27 37','#d9ad55',4)+line('M18 33 10 42','#8c5738',5)+oval(10,42,3,3,'#d9ad55');
const logs=path('M7 34 35 23 41 31 13 42Z','#916035')+line('M9 39 38 28','#d2a162',2)+oval(9,37,5,5,'#e0b578')+oval(9,37,2.8,3,'#946139');
const flame=path('M25 3C24 17 37 18 36 30 36 43 11 44 11 31c0-8 7-11 9-18 0 10 6 10 5-10Z','#d75a31')+path('M25 18c0 9 7 9 6 15-2 10-16 6-14 0 1-4 5-6 8-15Z','#ffbf4d')+path('M24 28c7 8 1 12-3 8-2-2 1-5 3-8Z','#fff0a2');
const bowl=path('M5 24h38c-1 23-36 23-38 0Z','#795442')+oval(24,24,19,5,'#d5a56a')+oval(24,24,16,3.4,'#906f36')+line('M10 32q14 10 27-1','#b78352',2);
const wall=path('M5 12 38 5 43 12v29L5 43Z','#825737')+path('M5 12 38 5 43 12 10 18Z','#c39561')+path('M10 18 43 12v29l-33 7Z','#a97a47')+line('M17 17v27M25 16v26M34 14v28','#503e30',2)+line('M12 26l29-6M12 37l29-6','#dbc08a',2);
const shield=path('M24 4 42 11 38 33 24 44 10 33 6 11Z','#608caa')+path('M24 4v40L10 33 6 11Z','#34647a')+line('M24 7v32M10 19h28','#daa84f',3)+oval(24,21,5,5,'#edcc7a')+oval(24,21,2.5,2.5,'#947b50');
export const ICON_ART={
 wood:path('M7 29 31 6 41 14 17 39Z','#956238')+path('M7 29 4 23 28 3 31 6Z','#c59358')+oval(13,33,6,8,'#d3a26a')+oval(13,33,3.5,5,'#8d603e')+grain,
 stone:path('M5 29 12 11 30 6 43 23 36 40 16 42Z','#788d95')+path('M12 11 25 24 43 23 30 6Z','#bccbd0')+path('M25 24 36 40 43 23Z','#4f6977')+line('M25 24 20 35l-4 7','#465b68')+oval(11,36,5,2,'#809767'),
 berry:line('M24 25 23 10','#7b6c38',3)+path('M23 18C6 16 11 3 14 5c8 1 11 7 9 13Z','#689e51')+path('M24 15c1-11 13-13 15-9-1 8-7 12-15 9Z','#9ab85b')+[ [15,28],[29,29],[23,37] ].map(([x,y])=>oval(x,y,8,8,'#863c59')+oval(x-2,y-2,5,4,'#d56878')+oval(x-3,y-3,1.6,1.4,'#ffe0c5')).join(''),
 herb:line('M23 43 26 7','#b5a16b',2)+[10,19,28].map((y,i)=>path(`M24 ${y+8}Q${i%2?4:43} ${y+7} ${i%2?10:36} ${y-4}Q25 ${y-2} 24 ${y+8}Z`,i%2?'#629d63':'#93b75e')).join(''),
 mushroom:rect(20,23,8,20,'#e8cba7')+path('M5 25C5 1 41 0 43 25Z','#b45743')+path('M6 24q17-10 36 0Z','#e09161')+oval(17,14,3,2,'#f7d9ab')+oval(30,19,4,2,'#ffe5bc')+oval(27,10,2,2,'#f7d9ab'),
 meat:line('M14 32 6 41','#eadac0',7)+oval(5,42,4,4,'#f5e8d4')+path('M11 28C0 11 28-2 40 12c15 17-13 36-29 16Z','#a74f4c')+path('M16 25C4 15 29 3 35 15c8 14-13 22-19 10Z','#e38b7b')+oval(26,20,6,4,'#f4d0ae'),
 hide:path('M15 4 24 10 32 4 43 14 34 25 40 43 24 36 7 43 13 25 4 14Z','#ae8555')+path('M16 11 24 15 31 11 33 20 29 28 32 34 24 30 16 35 18 25 13 18Z','#ddbc86')+line('M23 17l-3 6 5 6-2 7','#795d40'),
 resin:path('M24 3C20 16 7 22 8 32c1 17 33 17 32 0C40 21 27 14 24 3Z','#c6852d')+path('M24 11c-7 14-13 18-10 25 8 10 19 2 17-5Z','#edb64f')+oval(19,28,3,6,'#ffdf88'),
 sword,
 bow:path('M12 4q41 19 0 40l4-5q29-15 0-30Z','#b7844e')+line('M12 4 18 24 12 44','#e6d4b1',1.2)+line('M5 24h37','#c1b697',2)+path('m34 19 10 5-10 5Z','#b7d0d6'),
 arrow:line('M8 42 37 10','#bd965d',3)+path('M30 9 43 3 39 19 36 11Z','#d1e0e0')+path('M5 31 14 30 18 36 9 45Z','#ce8e63')+line('M9 40 15 34','#f0cf9c'),
 armor:path('M14 5 24 10 34 5 45 17 37 25 33 20v23H15V20l-5 5L3 17Z','#90653f')+path('M15 12 24 16 33 12v27H15Z','#b88c56')+line('M24 16v23M16 30h16','#513e33',2)+[18,30].map(x=>oval(x,20,1.6,1.6,'#efd086')).join(''),
 roast:line('M13 32 5 42','#ebd9b4',7)+path('M11 28C3 9 27 2 39 14c13 14-12 29-28 14Z','#9d5734')+path('M14 23c-2-13 20-13 20-3s-17 19-20 3Z','#d18a48')+line('M18 13l-4 9m12-11-5 14m13-10-5 12','#693e2c',2),
 stew:bowl+oval(17,24,3,2,'#ca7945')+oval(29,23,3,2,'#8daf58')+line('M16 16c-5-5 5-5 1-11M28 16c-5-5 5-5 1-11','#ece6cb',2),
 potion:rect(18,3,12,7,'#ad8452')+path('M17 10h14v9l9 13c8 19-40 19-32 0l9-13Z','#93b8bf')+path('M11 30h26c11 15-36 15-26 0Z','#c95064')+path('M14 31h18c3 3-14 4-18 0Z','#f18a98')+line('M16 23l-5 10m1 4 1 3','#e1f4ee',2)+rect(19,30,10,9,'#efdca2')+line('M24 31v7m-3-3h6','#ae4b51',2),
 trophy:path('M24 8 32 17 30 35 24 43 15 33 16 17Z','#768a4c')+path('M24 14 29 24 24 35 19 24Z','#d6dc87')+line('M17 20 8 15 5 5m10 12-1-10m18 14 9-6 2-10m-10 15 1-11','#9c794c',3),
 crystal:gem('#6badd1','#bceef2'),obsidian:gem('#4d466b','#8b7b9e'),
 frostHeart:gem('#5e99c1','#afe9f2')+line('M23 14v19m-8-9h16m-14-6 12 12m-12 0 12-12','#efffff',2),
 flameHeart:flame+oval(24,33,4,5,'#fff2aa'),
 furCloak:cloak('#8b7661','#e2d6b8'),fireCloak:cloak('#8f4941','#d3ad68'),
 rune:gem('#506d86','#7599a5')+line('M23 13v21m0-18 7 6-7 5-6-5','#a9f7ef',2),
 emberSeal:path('M24 4 41 14v20L24 44 7 34V14Z','#a47647')+path('M24 9 36 17v14L24 38 12 31V17Z','#493d50')+path('m24 14-8 17 8-4 8 4Z','#eea453'),
 floor:path('M3 21 25 9 45 22 24 37 3 27Z','#755437')+path('M3 21 25 9 45 22 24 34Z','#bb9158')+line('M10 17l20 13M17 13l20 12M4 26l20 13 20-13','#e1bc80',1.5),
 wall,
 door:path('M8 44V6l31-3v40Z','#86623f')+path('M14 42V12l19-2v31Z','#b3834d')+line('M20 12v29M28 12v28M14 19l18-2M14 34l18-2','#644c35',1.7)+oval(28,27,2,2,'#edd581'),
 fire:logs+flame,
 bench:rect(8,26,5,18,'#725438')+rect(34,24,5,20,'#725438')+path('M3 19 36 13 45 21 10 29 3 25Z','#b3854f')+path('M10 24 45 17v7l-35 8Z','#7d5839')+rect(10,8,13,12,'#637f8b')+line('M29 13 39 5','#e0ad69',3)+path('m32 4 5-3 8 7-5 4Z','#b7cbd0'),
 chest:path('M5 21V13C5 1 43 1 43 13v8Z','#b98545')+rect(5,21,38,23,'#926039')+line('M13 7v35M35 7v35M6 25h36','#d6b363',3)+rect(20,19,9,13,'#e9c877')+oval(24.5,25,1.6,2,'#594b36'),
 bed:rect(5,19,4,25,'#805b3a')+rect(39,17,4,27,'#805b3a')+path('M8 18 38 16 41 36 8 38Z','#4d8290')+path('M8 19 20 18 22 26 8 27Z','#e0d6b4')+line('M10 32l30-2','#a6c9c6',2)+rect(5,37,38,5,'#ab804a'),
 kitchen:path('M8 17h32c7 33-39 33-32 0Z','#465b66')+oval(24,17,17,4,'#869c9f')+oval(24,17,13,2.5,'#424b4c')+line('M9 17C4 1 44 1 39 17','#cab992',2)+line('M13 40l-3 4m25-4 3 4','#8b7254',3)+line('M17 26q0 7 4 9','#9bb6b3',2),
 reinforce:wall+path('M16 12 35 8v31l-19 4Z','#637c89')+line('M20 13v25m11-27v25','#bfd0ca',2)+[18,31].map(y=>oval(25,y,2,2,'#d4c287')).join(''),
 decor:rect(20,6,9,38,'#9d7243')+path('m10 17 14-12 14 12-14 9Z','#bd9457')+path('m11 33 13-12 13 12-13 9Z','#795a3c')+line('m17 17 7-6 7 6-7 4Zm0 16 7-6 7 6-7 4Z','#e3c276',1.6),
 bag:path('M11 14h26l7 30H4Z','#a77747')+line('M17 14V9c0-8 14-8 14 0v5','#dbb079',4)+rect(14,24,21,16,'#c69a61')+rect(21,23,7,8,'#dfc074'),
 craft:sword+line('M9 8 36 38','#bd8e54',5)+path('M4 7 13 2 24 12 17 20Z','#869ea9')+path('M4 7 17 16 24 12 17 20 4 12Z','#c2d6d5'),
 shield:shield,guard:shield,
 skills:rect(8,6,32,37,'#536e86')+rect(12,9,25,30,'#dcc9a0')+line('M24 14v20m0-12-7-4m7 10 7-5','#69864d',2.5)+oval(17,18,3,3,'#84af65')+oval(31,23,3,3,'#b0bf74'),
 journal:rect(7,5,34,39,'#966346')+rect(12,7,26,34,'#d4b87b')+line('M8 8v32','#e6cc95',3)+line('M18 14h14m-14 6h14m-14 6h10m-10 6h13','#785c45',1.5)+path('M29 5v16l4-4 4 4V5Z','#a84f48'),
 map:path('M3 10 17 5 31 10 45 5v32l-14 6-14-6-14 6Z','#d8c397')+path('M17 5v32l14 6V10Z','#b9a276')+line('M8 31c10-22 18 7 29-15','#8b9b61',3)+path('m31 21 5-11 6 10Z','#7b9296')+oval(13,19,2,2,'#b35444'),
 hand:path('M11 25V13c0-4 5-4 5 0v9-15c0-4 5-4 5 0v14-16c0-4 5-4 5 0v16-12c0-4 5-4 5 0v17l5-6c4-2 7 2 4 5l-8 15H17L7 31c-3-4 1-8 4-6Z','#d9b187')+line('M17 29l5-2 6 3M21 33h7','#aa7656',1.5),
 energy:path('m27 3-19 24h14l-2 18 22-27H27Z','#d6a53e')+path('m26 7-12 16h12l-3 14 14-16H25Z','#fff0a3'),
 root:line('M24 3v21m0-14L12 5m12 14 14-9M24 24 10 43m14-19 14 19m-21-9-12-5m25 6 14-6','#966846',5)+line('M23 5v19l-9 14','#cbab6d',1.6),
 water:path('M24 3C19 16 8 24 8 32c0 18 32 18 32 0C40 23 28 13 24 3Z','#5596bc')+path('M23 12C18 25 12 25 14 34c4 10 15 7 17 3Z','#90d4df')+line('M16 31q-1 6 5 6','#e3ffff',2)
};
for(const [key,g]of Object.entries(GEAR))ICON_ART[key]=ICON_ART[g.base||g.slot].replaceAll(g.slot==='armor'?'#966b43':g.slot==='shield'?'#608caa':'#bccfd4',g.color)+'<g transform="translate(31 30) scale(.3)">'+gem(g.color,'#dbe9da')+'</g>';
ICON_ART.frostHide=cloak('#adcbd1','#e5f4ee');ICON_ART.emberCore=flame;
export function icon(name,cls=''){
 return `<svg class="icon ${cls}" viewBox="0 0 48 48" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_ART[name]||ICON_ART.bag}</svg>`;
}
