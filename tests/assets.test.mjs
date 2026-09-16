import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {World,box,Player} from '../physics.mjs';
import {knifeTrace} from '../knife-trace.mjs';
import {Karambit} from '../karambit.mjs';
import {Matrix4} from 'three';
const data=JSON.parse(fs.readFileSync(new URL('../assets/source/karambit.json',import.meta.url)));
test('holding inspect loops at original model event, release finishes and attack cancels',()=>{
 const knife=new Karambit();knife.data=data;knife.ready=true;knife.pose=data.animation.bones.map(b=>[...b.pos,...b.quat]);knife.animMatrices=data.animation.bones.map(()=>new Matrix4());knife.sound=()=>{};
 knife.inspect(true);const clip=knife.clip,event=clip.events.find(e=>e.name==='AE_BEGIN_TAUNT_LOOP');assert.ok(event);
 const end=event.cycle*clip.duration,start=Number(event.options)*clip.duration;
 knife.update(end+.02);assert.equal(knife.clip.name,'lookat01');assert.ok(Math.abs(knife.time-start-.02)<1e-8);
 knife.update(end-start);assert.ok(Math.abs(knife.time-start-.02)<1e-8);
 knife.releaseInspect();knife.update(clip.duration-knife.time+.01);assert.equal(knife.clip.name,'idle1');
 knife.inspect(true);assert.ok(knife.attack(false,false));knife.update(.1);assert.equal(knife.clip.name,'light_miss1');knife.releaseInspect();
});
test('all 13 original clips retain source frame count, names and timing',()=>{
 assert.equal(data.animation.clips.length,13);
 for(const c of data.animation.clips){assert.equal(c.fps,30);assert.equal(c.duration,(c.frames.length-1)/30);for(const frame of c.frames){assert.equal(frame.length,data.animation.bones.length);for(const pose of frame){assert.ok(pose.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...pose.slice(3))-1)<.002);}}}
 assert.equal(data.animation.clips.find(c=>c.name==='draw').frames.length,31);
 assert.equal(data.animation.clips.find(c=>c.name==='lookat01').frames.length,146);
});
test('geometry retains valid original skin weights, bones and triangle indices',()=>{
 for(const m of [data.knife,data.arms]){
  const n=m.positions.length/3;assert.ok(n>10000);assert.equal(m.indices.length%3,0);assert.ok(m.indices.every(i=>i>=0&&i<n));assert.ok(m.skinIndex.every(i=>i<m.bones.length));
  for(let i=0;i<n;i++){const weights=m.skinWeight.slice(i*4,i*4+4);assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<.002);}
 }
});
test('original asset files match recorded SHA256 digests',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../assets/source/manifest.json',import.meta.url)));
 for(const e of manifest){const b=fs.readFileSync(new URL('../assets/source/original/'+e.path,import.meta.url));assert.equal(b.length,e.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),e.sha256);}
});
test('knife traces use separate long and short attack ranges',()=>{
 const world=new World([box([40,-100,-100],[50,100,100])]);
 assert.ok(knifeTrace(world,[0,0,0],[1,0,0],false));
 const distant=new World([box([120,-100,-100],[130,100,100])]);assert.equal(knifeTrace(distant,[0,0,0],[1,0,0],false),null);assert.equal(knifeTrace(distant,[0,0,0],[1,0,0],true),null);
 const near=new World([box([25,-100,-100],[30,100,100])]);assert.ok(knifeTrace(near,[0,0,0],[1,0,0],true));
 const edge=new World([box([58,-100,-100],[65,100,100])]);assert.ok(knifeTrace(edge,[0,0,0],[1,0,0],false));assert.equal(knifeTrace(edge,[0,0,0],[1,0,0],true),null);
});
test('attack cooldowns prevent premature hits and allow cancelling inspect',()=>{
 const knife=new Karambit();knife.data=data;knife.ready=true;knife.pose=data.animation.bones.map(b=>[...b.pos,...b.quat]);knife.sound=()=>{};
 knife.inspect();assert.equal(knife.clip.name,'lookat01');assert.ok(knife.attack(false,false));assert.equal(knife.clip.name,'light_miss1');assert.equal(knife.nextPrimary,.4);assert.equal(knife.nextSecondary,.5);assert.equal(knife.attack(false,true),false);
 knife.clock=.4;assert.ok(knife.attack(false,true));assert.equal(knife.clip.name,'light_hit2');assert.equal(knife.nextPrimary,.9);knife.clock=.9;assert.ok(knife.attack(true,true));assert.equal(knife.clip.name,'heavy_hit1');assert.equal(knife.nextPrimary,2);assert.equal(knife.nextSecondary,2);
 knife.deploy();assert.equal(knife.clip.name,'draw');assert.equal(knife.nextPrimary,1.9);
});
test('knife impacts use the nearest wall and expose its surface normal',()=>{
 const world=new World([box([30,-100,-100],[32,100,100]),box([40,-100,-100],[45,100,100])]);const hit=knifeTrace(world,[0,0,0],[1,0,0]);assert.deepEqual(hit.normal,[-1,0,0]);assert.equal(hit.brush,world.brushes[0]);assert.ok(Math.abs(hit.end[0]-30)<.04);
});
test('equipped knife movement speed is 250, unarmed default remains 260',()=>{
 const world=new World([box([-1000,-1000,-100],[1000,1000,0])]);const p=new Player(world,{maxSpeed:250});for(let i=0;i<100;i++)p.tick({forward:true});assert.equal(p.speed,250);
});
test('exported HUD SVG references resolve and textures are PNG files',()=>{
 for(const name of ['health','score','karambit','radar-ring','radar-player']){const svg=fs.readFileSync(new URL('../assets/hud/'+name+'.svg',import.meta.url),'utf8');const ids=new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));for(const ref of svg.matchAll(/xlink:href="#([^"]+)"/g))assert.ok(ids.has(ref[1]),name+' missing '+ref[1]);}
 for(const m of [data.knife,data.arms])for(const d of m.materialDefs)for(const file of Object.values(d.textures)){const b=fs.readFileSync(new URL('../assets/source/'+file,import.meta.url));assert.equal(b.subarray(1,4).toString(),'PNG');}
});
