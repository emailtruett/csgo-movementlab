import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const game=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../csgo');
const dir=fs.readFileSync(path.join(game,'pak01_dir.vpk'));
if(dir.readUInt32LE(0)!==0x55aa1234)throw Error('Invalid VPK');
const header=dir.readUInt32LE(4)===2?28:12,treeSize=dir.readUInt32LE(8);let cursor=header;
const str=()=>{const end=dir.indexOf(0,cursor),s=dir.toString('utf8',cursor,end);cursor=end+1;return s;};
export const entries=new Map();
for(let ext;(ext=str());)for(let folder;(folder=str());)for(let name;(name=str());){
 const crc=dir.readUInt32LE(cursor),preload=dir.readUInt16LE(cursor+4),archive=dir.readUInt16LE(cursor+6),offset=dir.readUInt32LE(cursor+8),length=dir.readUInt32LE(cursor+12);cursor+=18;
 const filename=(folder===' '?'':folder+'/')+name+'.'+ext;
 entries.set(filename,{crc,archive,offset,length,preload:Buffer.from(dir.subarray(cursor,cursor+preload))});cursor+=preload;
}
export function readAsset(name){
 const loose=path.join(game,name);if(fs.existsSync(loose))return fs.readFileSync(loose);
 const e=entries.get(name);if(!e)throw Error('Missing asset '+name);
 if(e.archive===0x7fff)return Buffer.concat([e.preload,dir.subarray(header+treeSize+e.offset,header+treeSize+e.offset+e.length)]);
 const f=fs.openSync(path.join(game,`pak01_${String(e.archive).padStart(3,'0')}.vpk`),'r'),buf=Buffer.alloc(e.length);fs.readSync(f,buf,0,e.length,e.offset);fs.closeSync(f);return Buffer.concat([e.preload,buf]);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const re=new RegExp(process.argv[2]||'karam|knife.*(wav|vmt)|hud.*swf','i');
 for(const [name,e] of entries)if(re.test(name))console.log(name,e.length+e.preload.length);
}
