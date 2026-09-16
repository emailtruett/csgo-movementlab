import {readAsset,entries} from './vpk.mjs';
export const zstr=(b,o)=>b.toString('utf8',o,b.indexOf(0,o));
export function studio(name){
 const b=readAsset(name),i=o=>b.readInt32LE(o),f=o=>b.readFloatLE(o),vec=(o,n=3)=>Array.from({length:n},(_,j)=>f(o+j*4));
 const bones=Array.from({length:i(156)},(_,j)=>{const p=i(160)+j*216;return {name:zstr(b,p+i(p)),parent:i(p+4),pos:vec(p+32),quat:vec(p+44,4),rot:vec(p+60),posscale:vec(p+72),rotscale:vec(p+84),inverse:vec(p+96,12)};});
 const anims=Array.from({length:i(180)},(_,j)=>{const p=i(184)+j*100;return {name:zstr(b,p+i(p+4)),p,fps:f(p+8),flags:i(p+12),frames:i(p+16),block:i(p+52),index:i(p+56),section:i(p+80),sectionframes:i(p+84)};});
 const seqs=Array.from({length:i(188)},(_,j)=>{const p=i(192)+j*212;return {name:zstr(b,p+i(p+4)),activity:zstr(b,p+i(p+8)),flags:i(p+12),anim:b.readInt16LE(p+i(p+60)),fadein:f(p+104),fadeout:f(p+108),events:Array.from({length:i(p+24)},(_,k)=>{const e=p+i(p+28)+k*80;return {cycle:f(e),id:i(e+4),type:i(e+8),name:i(e+76)?zstr(b,e+i(e+76)):null,options:zstr(b,e+12)};})};});
 const materials=Array.from({length:i(204)},(_,j)=>{const p=i(208)+j*64;return zstr(b,p+i(p));});
 const paths=Array.from({length:i(212)},(_,j)=>zstr(b,i(i(216)+j*4)));
 return {name,b,i,f,bones,anims,seqs,materials,paths};
}
if(process.argv[1]?.endsWith('studio.mjs'))for(const name of ['models/weapons/v_knife_karam.mdl','models/weapons/v_knife_karam_anim.mdl','models/weapons/ct_arms_sas.mdl']){
 const m=studio(name);console.log(JSON.stringify({name,version:m.i(4),bones:m.bones.map(b=>b.name),materials:m.materials,paths:m.paths,anims:m.anims,seqs:m.seqs,tail:Array.from({length:16},(_,j)=>[336+j*4,m.i(336+j*4)])},null,2));
}

