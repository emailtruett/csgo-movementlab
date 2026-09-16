import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {readAsset} from './vpk.mjs';
const root='assets/source',manifest=JSON.parse(fs.readFileSync(root+'/manifest.json'));
for(const file of ['hudhealtharmormodule','hudplayercounttime','hudradarmodule','hudweaponmodule','iconlib','fontlib_latin']){
 const name='resource/flash/'+file+'.swf',b=readAsset(name),target=path.join(root,'original',name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,b);if(!manifest.some(e=>e.path===name))manifest.push({path:name,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});
}
fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2));
