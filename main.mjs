import * as THREE from 'three';
import {Player,CFG} from './physics.mjs';
import {createMap} from './map.mjs';
import {Karambit} from './karambit.mjs';
import {KnifeDecals} from './decals.mjs';
import {knifeTrace} from './knife-trace.mjs';
import {createHUD} from './hud.mjs';
const $=id=>document.getElementById(id),canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x8097a4);
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x8097a4,1400,3400);
const camera=new THREE.PerspectiveCamera(74,innerWidth/innerHeight,0.5,5000);camera.up.set(0,0,1);
const hemi=new THREE.HemisphereLight(0xddecff,0x46515a,2.7);hemi.position.set(0,0,1000);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe2b5,3.4);sun.position.set(-600,-450,1200);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-1500,right:1500,top:1500,bottom:-1500,near:10,far:3000});sun.shadow.normalBias=0.4;scene.add(sun);
const world=createMap(),player=new Player(world,{maxSpeed:250});
const knife=new Karambit(),decals=new KnifeDecals(scene),sourceHUD=createHUD(world);
const preview=new URLSearchParams(location.search).has('preview');
function concreteTexture(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#b5bec2';ctx.fillRect(0,0,256,256);let seed=321;for(let i=0;i<6500;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%256;seed=(seed*1664525+1013904223)>>>0;const y=seed%256;ctx.fillStyle=i%2?'#ffffff0a':'#00000009';ctx.fillRect(x,y,2,2);}ctx.strokeStyle='#54646f50';ctx.strokeRect(0,0,256,256);const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;return tex;}
const texture=concreteTexture();
const colors={floor:0x73818b,wall:0x87989e,concrete:0x8d9da5,step:0xa8b4b4,platform:0x93a6a9,ramp:0xa4b4b5,jump:0xc6cfb1,ceiling:0x71848e};
function meshBox(min,max,color){const size=max.map((v,i)=>v-min[i]);const m=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:.94,map:texture}));m.position.set(...min.map((v,i)=>(v+max[i])/2));m.receiveShadow=true;m.castShadow=true;scene.add(m);return m;}
for(const b of world.brushes){
 if(b.tag!=='ramp')b.mesh=meshBox(b.min,b.max,colors[b.tag]);
 else {const size=b.max.map((v,i)=>v-b.min[i]),center=b.min.map((v,i)=>(v+b.max[i])/2);const g=new THREE.BoxGeometry(...size);const position=g.attributes.position;const [n,d]=b.planes[4];for(let i=0;i<position.count;i++){if(position.getZ(i)>0){const x=position.getX(i)+center[0];position.setZ(i,(d-n[0]*x)/n[2]-center[2]);}}g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:colors.ramp,roughness:.9,side:THREE.DoubleSide,map:texture}));m.position.set(...center);m.receiveShadow=true;m.castShadow=true;scene.add(m);b.mesh=m;}
}
// Surface grid provides an unambiguous visual reference for speed and scale.
const grid=new THREE.GridHelper(1800,36,0xa7bec7,0x8a9ba2);grid.rotation.x=Math.PI/2;grid.position.z=.1;grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);
function line(a,b,color=0xd7ed8b){const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]);scene.add(new THREE.Line(g,new THREE.LineBasicMaterial({color})));}
for(let y=-750;y<800;y+=80){meshBox([-3,y,.2],[3,y+35,.6],0xc9dc8a);}
for(const b of world.brushes.filter(b=>['jump','step','platform'].includes(b.tag))){line([b.min[0],b.min[1]-.1,b.max[2]+.2],[b.max[0],b.min[1]-.1,b.max[2]+.2]);}
function sign(text,sub,pos,width=200){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#172a34';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#d8ed80';ctx.fillRect(0,0,9,256);ctx.font='bold 69px Arial';ctx.fillText(text,48,110);ctx.font='28px monospace';ctx.fillStyle='#adbec7';ctx.fillText(sub,50,181);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));m.rotation.x=Math.PI/2;m.position.set(...pos);scene.add(m);}
sign('MOVEMENT / 01','SOURCE PHYSICS · TEST ENVIRONMENT',[0,898,158],630);
sign('02 / STAIRS','16 UNITS',[-710,49,115],210);
sign('04 / CROUCH','60 UNITS CLEARANCE',[-680,-511,88],230);
sign('03 / JUMP','48     /     64     /     96',[590,-310,171],300);
sign('01 / STRAFE','STOP. TURN. REPEAT.',[638,639,152],280);
// A few structural silhouettes keep the test space legible without assets or weapons.
for(const x of [-970,970])for(const y of [-850,0,850])meshBox([x-10,y-10,0],[x+10,y+10,280],0x3c505b);
const keys=new Set();let jumpPulse=false,yaw=Math.PI/2,pitch=0,locked=false,started=false,sensitivity=2,accumulator=0,last=performance.now(),previous=[...player.pos],previousEye=player.eye,fps=60;
try{sensitivity=Number(localStorage.getItem('movement-sensitivity'))||2;}catch{}
$('sensitivity').value=sensitivity;$('sens-value').value=sensitivity.toFixed(2);
$('sensitivity').oninput=e=>{sensitivity=Number(e.target.value);$('sens-value').value=sensitivity.toFixed(2);try{localStorage.setItem('movement-sensitivity',sensitivity);}catch{}};
const play=$('play');play.disabled=true;play.textContent='Wczytywanie karambita…';
try{await knife.load();play.disabled=false;play.textContent='Wejdź na poligon ↗';}catch(error){$('error').textContent='Nie udało się wczytać karambita: '+error.message;throw error;}
play.onclick=async()=>{try{await canvas.requestPointerLock({unadjustedMovement:true});}catch{try{await canvas.requestPointerLock();}catch{$('error').textContent='Przeglądarka nie przechwyciła myszy. Otwórz grę w Chrome lub Edge i spróbuj ponownie.';}}};
const mouseButtons=new Set();
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;if(locked&&!started)knife.deploy();if(locked)started=true;keys.clear();mouseButtons.clear();jumpPulse=false;accumulator=0;previous=[...player.pos];previousEye=player.eye;$('menu').hidden=locked;sourceHUD.root.hidden=!locked;document.body.classList.toggle('playing',locked);play.textContent='Wróć na poligon ↗';});
function attack(heavy){const origin=[player.pos[0],player.pos[1],player.pos[2]+player.eye],direction=[Math.cos(yaw)*Math.cos(pitch),Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch)];const hit=knifeTrace(world,origin,direction,heavy);if(knife.attack(heavy,!!hit)&&hit)decals.add(hit,yaw);}
document.addEventListener('mousedown',e=>{if(locked&&(e.button===0||e.button===2)){e.preventDefault();mouseButtons.add(e.button);attack(e.button===2);}});
document.addEventListener('mouseup',e=>mouseButtons.delete(e.button));
canvas.addEventListener('contextmenu',e=>{if(locked)e.preventDefault();});
document.addEventListener('keydown',e=>{if(!locked||e.repeat)return;if(e.code==='KeyF'){e.preventDefault();knife.inspect(true);}if(e.code==='Digit3'){e.preventDefault();knife.deploy();}});
document.addEventListener('mousemove',e=>{if(!locked)return;const scale=sensitivity*.022*Math.PI/180;yaw-=e.movementX*scale;pitch=Math.max(-89*Math.PI/180,Math.min(89*Math.PI/180,pitch-e.movementY*scale));});
document.addEventListener('keydown',e=>{if(!locked)return;if(['Space','ControlLeft','ControlRight','ShiftLeft','ShiftRight','KeyW','KeyA','KeyS','KeyD','KeyR'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyR'&&!e.repeat){player.reset();previous=[...player.pos];previousEye=player.eye;yaw=Math.PI/2;pitch=0;}});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyF')knife.releaseInspect();});
canvas.addEventListener('wheel',e=>{if(locked){e.preventDefault();jumpPulse=true;}},{passive:false});
window.addEventListener('blur',()=>{keys.clear();mouseButtons.clear();knife.releaseInspect();jumpPulse=false;if(locked)document.exitPointerLock();});
document.addEventListener('pointerlockchange',()=>{if(!locked)knife.releaseInspect();});
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;/* CS:GO uses 90 horizontal degrees at 4:3, expanded on wide screens. */camera.fov=2*Math.atan(.75)*180/Math.PI;camera.updateProjectionMatrix();knife.resize(innerWidth,innerHeight);}addEventListener('resize',resize);resize();
if(preview){started=true;player.reset([0,868,.03125]);previous=[...player.pos];$('menu').hidden=true;sourceHUD.root.hidden=false;document.body.classList.add('playing');const panel=document.createElement('nav');panel.id='preview-controls';panel.style.cssText='position:fixed;top:80px;right:20px;z-index:20;display:flex;gap:6px;flex-direction:column';for(const [label,callback] of [['Wyciągnij',()=>knife.deploy()],['Inspekcja F',()=>knife.inspect()],['Cięcie LPM',()=>attack(false)],['Pchnięcie PPM',()=>attack(true)]]){const b=document.createElement('button');b.textContent=label;b.onclick=callback;panel.append(b);}const count=document.createElement('span');count.id='decal-count';panel.append(count);document.body.append(panel);}
let frames=0;
function frame(now){requestAnimationFrame(frame);const elapsed=Math.min(.1,(now-last)/1000);last=now;fps=fps*.95+.05/Math.max(elapsed,.001);
 if(locked||preview){knife.update(elapsed,player.speed,player.grounded);if(mouseButtons.has(2))attack(true);else if(mouseButtons.has(0))attack(false);sourceHUD.update(player,yaw);if(preview)$('decal-count').textContent='Ślady: '+decals.items.length+' · '+knife.clip.name;accumulator+=elapsed;while(accumulator>=CFG.dt){previous=[...player.pos];previousEye=player.eye;player.tick({forward:keys.has('KeyW'),back:keys.has('KeyS'),left:keys.has('KeyA'),right:keys.has('KeyD'),jump:keys.has('Space')||jumpPulse,duck:keys.has('ControlLeft')||keys.has('ControlRight'),walk:keys.has('ShiftLeft')||keys.has('ShiftRight')},yaw);jumpPulse=false;accumulator-=CFG.dt;}
 const alpha=accumulator/CFG.dt;const p=previous.map((v,i)=>THREE.MathUtils.lerp(v,player.pos[i],alpha));const eye=THREE.MathUtils.lerp(previousEye,player.eye,alpha);camera.position.set(p[0],p[1],p[2]+eye);camera.lookAt(p[0]+Math.cos(yaw)*Math.cos(pitch),p[1]+Math.sin(yaw)*Math.cos(pitch),p[2]+eye+Math.sin(pitch));
 if(++frames%4===0){$('speed').textContent=Math.round(player.speed);$('speedbar').style.width=Math.min(100,player.speed/3.2)+'%';$('state').textContent=!player.grounded?'W POWIETRZU':player.duck>.1?'KUCANIE':keys.has('ShiftLeft')?'CHÓD':'NA ZIEMI';$('position').textContent=player.pos.map(v=>Math.round(v)).join(' / ');$('fps').textContent=Math.round(fps)+' FPS';}
 }else if(!started){camera.position.set(100,-830,390);camera.lookAt(0,170,5);}
 renderer.render(scene,camera);
 if(locked||preview)knife.render(renderer);
}requestAnimationFrame(frame);
window.addEventListener('error',e=>{$('error').textContent='Błąd uruchomienia: '+e.message;});



