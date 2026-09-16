import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {readAsset,entries} from './vpk.mjs';
import {studio} from './studio.mjs';
const out='assets/source';fs.mkdirSync(out,{recursive:true});const manifest=[];
function original(name){const b=readAsset(name);manifest.push({path:name,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});const p=path.join(out,'original',name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);return b;}
const half=h=>{const s=h&32768?-1:1,e=(h>>10)&31,m=h&1023;return s*(e===0?2**-14*m/1024:e===31?(m?NaN:Infinity):2**(e-15)*(1+m/1024));};
function q48(b,p,small=false){const a=b.readUInt16LE(p),c=b.readUInt16LE(p+2),d=b.readUInt16LE(p+4);if(!small){const q=[(a-32768)/32768.5,(c-32768)/32768.5,((d&32767)-16384)/16384.5];return [...q,Math.sqrt(Math.max(0,1-q.reduce((s,x)=>s+x*x,0)))*(d&32768?-1:1)];}const offset=((a>>15)<<1)+(c>>15),q=[0,0,0,0];q[offset]=((a&32767)-16384)/23168;q[(offset+1)%4]=((c&32767)-16384)/23168;q[(offset+2)%4]=((d&32767)-16384)/23168;q[(offset+3)%4]=Math.sqrt(Math.max(0,1-q.reduce((s,x)=>s+x*x,0)))*(d&32768?-1:1);return q;}
function animations(){const name='models/weapons/v_knife_karam_anim.mdl',m=studio(name),ani=original(name.replace('.mdl','.ani'));original(name);const clips=[];
 for(const seq of m.seqs){const a=m.anims[seq.anim];if(!(a.flags&64))throw Error('Expected frame animation');const frames=[];
  for(let frame=0;frame<a.frames;frame++){
   let local=frame,block=a.block,index=a.index;
   if(a.sectionframes){let sec;if(a.frames>a.sectionframes&&frame===a.frames-1){sec=Math.floor(a.frames/a.sectionframes)+1;local=0;}else {sec=Math.floor(frame/a.sectionframes);local-=sec*a.sectionframes;}const p=a.p+a.section+sec*8;block=m.i(p);index=m.i(p+4);}
   const b=block===0?m.b:ani,p=block===0?a.p+index:m.i(m.i(356)+block*8)+index;
   let c=p+b.readInt32LE(p),v=p+b.readInt32LE(p+4)+local*b.readInt32LE(p+8);const pose=[];
   for(let bone=0;bone<m.bones.length;bone++){
    const flags=b[p+24+bone];let quat=m.bones[bone].quat,pos=m.bones[bone].pos;
    if(flags&8){quat=q48(b,v);v+=6;}else if(flags&128){quat=q48(b,v,true);v+=6;}else if(flags&2){quat=q48(b,c);c+=6;}else if(flags&64){quat=q48(b,c,true);c+=6;}
    if(flags&4){pos=[0,1,2].map(j=>half(b.readUInt16LE(v+j*2)));v+=6;}else if(flags&1){pos=[0,1,2].map(j=>half(b.readUInt16LE(c+j*2)));c+=6;}else if(flags&16){pos=[0,1,2].map(j=>b.readFloatLE(v+j*4));v+=12;}else if(flags&32){pos=[0,1,2].map(j=>b.readFloatLE(c+j*4));c+=12;}
    if([...pos,...quat].some(v=>!Number.isFinite(v)))throw Error(`Invalid pose ${seq.name}/${frame}/${bone}`);
    pose.push([...pos,...quat]);
   }frames.push(pose);
  }clips.push({...seq,fps:a.fps,duration:(a.frames-1)/a.fps,frames});
 }return {bones:m.bones,clips};
}
function geometry(name){const m=studio(name);original(name);const vvd=original(name.replace('.mdl','.vvd')),vtx=original(name.replace('.mdl','.dx90.vtx')),vi=o=>vtx.readInt32LE(o);
 if(m.i(8)!==vvd.readInt32LE(8)||m.i(8)!==vi(16))throw Error('Checksum mismatch');
 const count=vvd.readInt32LE(16),base=vvd.readInt32LE(56),fixes=vvd.readInt32LE(48),fixbase=vvd.readInt32LE(52);let map=[];
 if(fixes)for(let i=0;i<fixes;i++){const p=fixbase+i*12;for(let j=0;j<vvd.readInt32LE(p+8);j++)map.push(vvd.readInt32LE(p+4)+j);}else map=Array.from({length:count},(_,i)=>i);
 const positions=[],normals=[],uv=[],skinIndex=[],skinWeight=[];
 for(let j=0;j<count;j++){const p=base+map[j]*48;positions.push(...[0,1,2].map(k=>vvd.readFloatLE(p+16+k*4)));normals.push(...[0,1,2].map(k=>vvd.readFloatLE(p+28+k*4)));uv.push(vvd.readFloatLE(p+40),1-vvd.readFloatLE(p+44));skinIndex.push(vvd[p+12],vvd[p+13],vvd[p+14],0);skinWeight.push(vvd.readFloatLE(p),vvd.readFloatLE(p+4),vvd.readFloatLE(p+8),0);}
 const indices=[],groups=[];let vertexBase=0;
 for(let bi=0;bi<m.i(232);bi++){const bp=m.i(236)+bi*16,vbp=vi(32)+bi*8;
  for(let mi=0;mi<m.i(bp+4);mi++){const model=bp+m.i(bp+12)+mi*148,vmodel=vbp+vi(vbp+4)+mi*8,lod=vmodel+vi(vmodel+4);
   for(let mesh=0;mesh<m.i(model+72);mesh++){const mm=model+m.i(model+76)+mesh*116,vm=lod+vi(lod+4)+mesh*9,start=indices.length;
    for(let sg=0;sg<vi(vm);sg++){const sp=vm+vi(vm+4)+sg*33;for(let j=0;j<vi(sp+8);j++){const ix=vtx.readUInt16LE(sp+vi(sp+12)+j*2);const id=vtx.readUInt16LE(sp+vi(sp+4)+ix*9+4);indices.push(vertexBase+m.i(mm+12)+id);}}
    groups.push({start,count:indices.length-start,material:m.i(mm)});
   }vertexBase+=m.i(model+80);
  }
 }
 if(indices.some(i=>i>=count))throw Error('Invalid vertex index');
 console.log(name,count,'vertices',indices.length/3,'triangles',m.materials);
 return {bones:m.bones,positions,normals,uv,skinIndex,skinWeight,indices,groups,materials:m.materials,paths:m.paths};
}
function texture(name){const b=original(name),width=b.readUInt16LE(16),height=b.readUInt16LE(18),format=b.readUInt32LE(52),mips=b[56],frames=b.readUInt16LE(24);let offset=b.readUInt32LE(12);
 if(b.readUInt32LE(8)>=3){for(let i=0;i<b.readUInt32LE(68);i++){const p=80+i*8;if((b.readUInt32LE(p)&0xffffff)===0x30)offset=b.readUInt32LE(p+4);}}
 else offset+=Math.max(1,Math.ceil(b[61]/4))*Math.max(1,Math.ceil(b[62]/4))*8;
 const size=(w,h)=>format===13||format===14||format===15?Math.ceil(w/4)*Math.ceil(h/4)*(format===13?8:16):w*h*4;
 for(let mip=mips-1;mip>0;mip--)offset+=size(Math.max(1,width>>mip),Math.max(1,height>>mip))*frames;
 const data=b.subarray(offset,offset+size(width,height));
 const hdr=Buffer.alloc(128);hdr.write('DDS ');hdr.writeUInt32LE(124,4);hdr.writeUInt32LE(0x1007,8);hdr.writeUInt32LE(height,12);hdr.writeUInt32LE(width,16);hdr.writeUInt32LE(data.length,20);hdr.writeUInt32LE(32,76);
 if([13,14,15].includes(format)){hdr.writeUInt32LE(4,80);hdr.write(format===13?'DXT1':format===14?'DXT3':'DXT5',84);}else if([0,12,16].includes(format)){hdr.writeUInt32LE(0x41,80);hdr.writeUInt32LE(32,88);hdr.writeUInt32LE(format===0?0xff:0xff0000,92);hdr.writeUInt32LE(0xff00,96);hdr.writeUInt32LE(format===0?0xff0000:0xff,100);hdr.writeUInt32LE(0xff000000,104);}else throw Error('Unsupported VTF format '+format+' '+name);
 hdr.writeUInt32LE(0x1000,108);const filename=name.replace(/^materials\//,'').replaceAll('/','_').replace('.vtf','.dds');fs.writeFileSync(path.join(out,filename),Buffer.concat([hdr,data]));return filename.replace('.dds','.png');
}
const animation=animations();const knife=geometry('models/weapons/v_knife_karam.mdl'),arms=geometry('models/weapons/ct_arms_sas.mdl');
for(const model of [knife,arms]){model.materialDefs=model.materials.map(mat=>{
 const found=model.paths.map(p=>'materials/'+p.replaceAll('\\','/')+mat+'.vmt').find(p=>entries.has(p));if(!found)throw Error('Material missing '+mat);const vmt=original(found).toString().replace(/\/\/[^\r\n]*/g,'');const params={};for(const match of vmt.matchAll(/"?(\$[\w]+)"?\s+(?:"([^"\r\n]+)"|([^\s{}]+))/g))params[match[1].toLowerCase()]=match[2]??match[3];const textures={};for(const key of ['$basetexture','$bumpmap','$phongexponenttexture'])if(params[key])textures[key]=texture('materials/'+params[key].replaceAll('\\','/').toLowerCase()+'.vtf');return {params,textures};});}
fs.writeFileSync(path.join(out,'karambit.json'),JSON.stringify({knife,arms,animation}));
for(const name of entries.keys())if(/^sound\/weapons\/knife\/.*\.wav$/.test(name)||/^sound\/weapons\/movement[123]\.wav$/.test(name)){const b=original(name);fs.writeFileSync(path.join(out,path.basename(name)),b);}
original('resource/flash/econ/weapons/base_weapons/weapon_knife_karambit.png');fs.copyFileSync(path.join(out,'original/resource/flash/econ/weapons/base_weapons/weapon_knife_karambit.png'),path.join(out,'karambit-icon.png'));
for(let i=1;i<=5;i++)texture(`materials/decals/concrete/shot${i}.vtf`);
for(const suffix of ['', '2','3']){original(`materials/decals/manhackcut${suffix}.vmt`);texture(`materials/decals/manhackcut${suffix}.vtf`);}
for(const name of ['stratum2bold','stratum2medium']){
 const b=original(`resource/${name}.vfont`);if(b.toString('ascii',b.length-6)!=='VFONT1')throw Error('VFONT tag');const end=b.length-6,salt=b[end-1],length=end-salt;let key=167;for(let i=length;i<end-1;i++)key^=(b[i]+167)&255;const decoded=Buffer.alloc(length);for(let i=0;i<length;i++){decoded[i]=b[i]^key;key=(b[i]+167)&255;}fs.writeFileSync(path.join(out,name+'.ttf'),decoded);
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));console.log('Exported',manifest.length,'original assets');

