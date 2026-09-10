import test from 'node:test';
import assert from 'node:assert/strict';
import {GroundField,GroundPainter,groundPixels,mountainShape,GROUND_CACHE_LIMIT} from '../src/landscape.js';
import {fromPlane} from '../src/hex.js';
import {createGame,terrain} from '../src/game.js';

test('ground color is continuous across cell boundaries and blends shoreline materials',()=>{
 const field=new GroundField(createGame(1));
 for(let x=17;x<28;x++)for(let y=15;y<25;y++){
  const a=field.sample(x-1e-5,y+.3),b=field.sample(x+1e-5,y+.3);assert.ok(a.every((v,i)=>Math.abs(v-b[i])<=1));
 }
 let blends=0;for(let x=17;x<28;x++)for(let y=15;y<25;y++)if(terrain(x,y)!==terrain(x+1,y)){
  const a=field.vertex(x,y),b=field.vertex(x+1,y),m=field.sample(x+.5,y);
  assert.ok(m.every((v,i)=>Math.abs(v-(a[i]+b[i])*.5)<=.5));blends++;
 }assert.ok(blends>0);
});
test('cached terrain tiles have identical overlapping gutter pixels and deterministic colors',()=>{
 const field=new GroundField(createGame(1)),a=groundPixels(field,5,4),b=groundPixels(field,6,4);
 for(let y=0;y<a.height;y++)for(let gutter=0;gutter<2;gutter++){
  const ai=(y*a.width+a.width-2+gutter)*4,bi=(y*b.width+gutter)*4;
  assert.deepEqual(a.data.slice(ai,ai+4),b.data.slice(bi,bi+4));
 }
 assert.deepEqual(a,groundPixels(field,5,4));assert.ok(a.data.every((v,i)=>i%4!==3||v===255));
});
test('ground surfaces are reused, bounded and invalidated when a legacy house moves',()=>{
 let generated=0,draws=0;
 const make=(w,h)=>{generated++;return {getContext:()=>({createImageData:()=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})};};
 const r={ctx:{save(){},restore(){},transform(){},drawImage(){draws++;}},scale:25,camera:{x:12,y:43},w:844,h:390},g=createGame(1),painter=new GroundPainter(make),bounds=[{x:10,y:40},{x:13,y:44}];
 painter.draw(r,g,bounds);const count=generated;painter.draw(r,g,bounds);assert.equal(generated,count);assert.ok(draws>0);
 for(let i=0;i<110;i++){const point=fromPlane((i%11)*8+1,Math.floor(i/11)*8+1);painter.draw(r,g,[point]);}
 assert.ok(painter.tiles.size<=GROUND_CACHE_LIMIT);
 g.legacyTerrainHome=true;g.home={x:12,y:43};painter.draw(r,g,bounds);assert.ok(generated>count);
});
test('mountains vary by silhouette, width, height and offset without animation jitter',()=>{
 const variants=new Set(),heights=new Set();for(let x=27;x<36;x++)for(let y=37;y<48;y++){
  const a=mountainShape(x,y);assert.deepEqual(a,mountainShape(x,y));variants.add(a.variant);heights.add(a.height);assert.ok(a.height>=1.2&&a.height<=3);assert.ok(a.width>0);
 }assert.equal(variants.size,4);assert.ok(heights.size>50);
});
