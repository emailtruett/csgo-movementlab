import * as THREE from 'three';
import {sourceMaterial} from './source-material.mjs';
import {assetURL,loadKarambitData} from './asset-url.mjs';
const ROOT='./assets/source/';
const vec=new THREE.Vector3(),quat=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1);
export class Karambit {
 constructor(){this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(45,1,.05,200);this.camera.up.set(0,0,1);this.camera.lookAt(1,0,0);this.group=new THREE.Group();this.scene.add(this.group);this.scene.add(new THREE.AmbientLight(0xffffff,1.1));const sun=new THREE.DirectionalLight(0xfff2dd,2.2);sun.position.set(5,-10,25);this.scene.add(sun);const fill=new THREE.DirectionalLight(0xadcaff,.7);fill.position.set(-10,20,5);this.scene.add(fill);this.meshes=[];this.ready=false;this.time=0;this.clock=0;this.nextPrimary=0;this.nextSecondary=0;this.swing=0;this.sounds=new Map();this.playedEvents=new Set();this.blend=0;this.bobTime=0;this.bobSpeed=0;}
 async load(){this.data=await loadKarambitData(ROOT+'karambit.json');this.animMatrices=this.data.animation.bones.map(()=>new THREE.Matrix4());this.pose=this.data.animation.bones.map(b=>[...b.pos,...b.quat]);const loader=new THREE.TextureLoader();
  for(const data of [this.data.knife,this.data.arms]){
   const materials=await Promise.all(data.materialDefs.map(def=>sourceMaterial(def,loader,ROOT)));
   const g=new THREE.BufferGeometry();for(const [name,key,size] of [['position','positions',3],['normal','normals',3],['uv','uv',2],['skinWeight','skinWeight',4]])g.setAttribute(name,new THREE.Float32BufferAttribute(data[key],size));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(data.skinIndex,4));g.setIndex(data.indices);for(const group of data.groups)g.addGroup(group.start,group.count,group.material);
   const bones=data.bones.map(b=>{const bone=new THREE.Bone();bone.name=b.name;return bone;});
   const inverses=data.bones.map(b=>{const r=b.inverse;return new THREE.Matrix4().set(...r.slice(0,4),...r.slice(4,8),...r.slice(8,12),0,0,0,1);});
   const skeleton=new THREE.Skeleton(bones,inverses),mesh=new THREE.SkinnedMesh(g,materials);mesh.bind(skeleton,new THREE.Matrix4());mesh.frustumCulled=false;this.group.add(mesh);
   this.meshes.push({mesh,data,bones,world:data.bones.map(()=>new THREE.Matrix4()),animIndex:data.bones.map(b=>this.data.animation.bones.findIndex(a=>a.name===b.name))});
  }this.ready=true;this.play('idle1',false);this.update(0);return this;
 }
 resize(width,height){this.camera.aspect=width/height;this.camera.fov=2*Math.atan(Math.tan(60*Math.PI/360)*.75)*180/Math.PI;this.camera.updateProjectionMatrix();}
 play(name,blend=true){if(!this.ready)return;const clip=this.data.animation.clips.find(c=>c.name===name);if(!clip)return;this.previousPose=this.pose.map(p=>[...p]);this.clip=clip;this.time=0;this.blend=blend?Math.min(.2,clip.fadein):0;this.playedEvents.clear();}
 deploy(){if(!this.ready)return;this.play('draw',false);this.nextPrimary=this.clock+1;this.nextSecondary=this.clock+1;}
 inspect(held=false){this.inspectHeld=held;if(!this.ready||this.clock<this.nextPrimary||this.clock<this.nextSecondary||this.clip?.name==='lookat01')return;this.play('lookat01');}
 releaseInspect(){this.inspectHeld=false;}
 sound(name){let paths={ 'Weapon_Knife.Deploy':'knife_deploy1.wav','Weapon.WeaponMove1':'movement1.wav','Weapon.WeaponMove2':'movement2.wav','Weapon.WeaponMove3':'movement3.wav'};const file=paths[name]||name;const audio=new Audio(assetURL(ROOT+file));audio.volume=.45;audio.play().catch(()=>{});}
 attack(heavy,hit){if(!this.ready||this.clock<(heavy?this.nextSecondary:this.nextPrimary))return false;
  if(this.clock>this.nextPrimary+.4)this.swing=0;
  const which=this.swing++%2+1;this.play(heavy?(hit?'heavy_hit1':'heavy_miss1'):(hit?'light_hit':'light_miss')+which);
  this.nextPrimary=this.clock+(heavy?(hit?1.1:1):(hit?.5:.4));this.nextSecondary=this.clock+(heavy?(hit?1.1:1):.5);
  this.sound(hit?'knife_hitwall'+(Math.floor(Math.random()*4)+1)+'.wav':'knife_slash'+(Math.floor(Math.random()*2)+1)+'.wav');return true;
 }
 update(dt,speed=0,grounded=true){if(!this.ready)return;this.clock+=dt;this.time+=dt;
  // AE_BEGIN_TAUNT_LOOP: the original model provides both the trigger and return cycle.
  const loop=this.clip.events.find(e=>e.name==='AE_BEGIN_TAUNT_LOOP');
  if(this.inspectHeld&&loop){const end=loop.cycle*this.clip.duration,start=Number(loop.options)*this.clip.duration;
   if(this.time>=end&&end>start){this.time=start+(this.time-end)%(end-start);for(let i=0;i<this.clip.events.length;i++)if(this.clip.events[i].cycle*this.clip.duration>=start)this.playedEvents.delete(i);}
  }
  if(this.time>this.clip.duration){this.play('idle1');}
  const c=this.clip,t=Math.min(this.time,c.duration)*c.fps,f=Math.min(Math.floor(t),c.frames.length-1),next=Math.min(f+1,c.frames.length-1),alpha=t-f;
  for(let i=0;i<this.pose.length;i++){const a=c.frames[f][i],b=c.frames[next][i],p=this.pose[i];for(let j=0;j<3;j++)p[j]=THREE.MathUtils.lerp(a[j],b[j],alpha);quat.fromArray(a,3).slerp(new THREE.Quaternion().fromArray(b,3),alpha);quat.toArray(p,3);
   if(this.blend&&this.time<this.blend){const u=this.time/this.blend,old=this.previousPose[i];for(let j=0;j<3;j++)p[j]=THREE.MathUtils.lerp(old[j],p[j],u);quat.fromArray(old,3).slerp(new THREE.Quaternion().fromArray(p,3),u).toArray(p,3);}
   this.animMatrices[i].compose(vec.fromArray(p),quat.fromArray(p,3),scale);const parent=this.data.animation.bones[i].parent;if(parent>=0)this.animMatrices[i].premultiply(this.animMatrices[parent]);
  }
  for(const model of this.meshes){for(let i=0;i<model.bones.length;i++){const index=model.animIndex[i],bone=model.data.bones[i],mat=model.world[i];if(index>=0)mat.copy(this.animMatrices[index]);else {mat.compose(vec.fromArray(bone.pos),quat.fromArray(bone.quat),scale);if(bone.parent>=0)mat.premultiply(model.world[bone.parent]);}model.bones[i].matrixWorld.copy(mat);}model.mesh.skeleton.update();}
  for(let i=0;i<c.events.length;i++){const e=c.events[i];if(e.id===5004&&this.time>=e.cycle*c.duration&&!this.playedEvents.has(i)){this.playedEvents.add(i);this.sound(e.options);}}
  this.bobSpeed=THREE.MathUtils.clamp(speed,this.bobSpeed-dt*640,this.bobSpeed+dt*640);this.bobTime+=dt*this.bobSpeed/320;
  // Source bob cycle for a weapon whose maximum movement speed is 250.
  const ignore=c.name==='lookat01'&&this.time<.7172414064407349*c.duration;
  const cycle=((1000-(ignore?150:250))/3.5)*.001*.98,multiplier=grounded?.00625:.00125;
  const rawVertical=this.bobSpeed*multiplier*(ignore?.3:.25)*(.3+.7*Math.sin(this.bobTime/cycle*Math.PI*2));
  const vertical=THREE.MathUtils.clamp(rawVertical-21*.2*(ignore?.1:1)*this.bobSpeed*.006,-7,4);
  const lateral=THREE.MathUtils.clamp(this.bobSpeed*multiplier*(ignore?.5:.4)*(.3+.7*Math.sin(this.bobTime/(cycle*2)*Math.PI*2)),-8,8);
  // ViewmodelPresetPos_Callback preset 1: fov 60, offset x=1 y=1 z=-1.
  this.group.position.set((ignore?0:1)+vertical*.4,-(ignore?0:1)-lateral*.2,(ignore?0:-1)+vertical*.1);
  this.group.rotation.set(vertical*.5*Math.PI/180,-vertical*.4*Math.PI/180,-lateral*.3*Math.PI/180,'ZYX');
 }
 render(renderer){if(!this.ready)return;renderer.autoClear=false;renderer.clearDepth();renderer.render(this.scene,this.camera);renderer.autoClear=true;}
}

