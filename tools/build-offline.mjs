import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'offline');
await fs.mkdir(out,{recursive:true});
const files={};
const mime={'.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.ttf':'font/ttf'};
for(const dir of ['assets/source','assets/hud'])for(const name of await fs.readdir(path.join(root,dir))){
 const type=mime[path.extname(name)];if(!type)continue;
 files[dir+'/'+name]='data:'+type+';base64,'+(await fs.readFile(path.join(root,dir,name))).toString('base64');
}
const karambit=JSON.parse(await fs.readFile(path.join(root,'assets/source/karambit.json'),'utf8'));
let fonts=await fs.readFile(path.join(root,'hud.css'),'utf8');
fonts=fonts.split('\n')[0].replace(/\.\/assets\/source\/[\w.-]+\.ttf/g,url=>files[url.slice(2)]);
await fs.writeFile(path.join(out,'assets.js'),'globalThis.MOVEMENT_OFFLINE='+JSON.stringify({files,karambit})+';\n'+
 '(()=>{const style=document.createElement("style");style.textContent='+JSON.stringify(fonts)+';document.head.append(style);})();\n');
await build({absWorkingDir:root,entryPoints:['main.mjs'],outfile:path.join(out,'game.js'),bundle:true,format:'iife',target:'es2022',minify:true,plugins:[{
 name:'wrap-game-startup',setup(api){api.onLoad({filter:/[\\/]main\.mjs$/},async args=>{
  const source=await fs.readFile(args.path,'utf8'),start=source.indexOf('const $=');
  if(start<0)throw Error('Game startup boundary not found');
  return {contents:source.slice(0,start)+'async function startGame(){\n'+source.slice(start)+'\n}\nstartGame().catch(window.movementStartupError);',loader:'js'};
 });}
}]});
console.log('Gotowe: index.html działa również bez serwera.');
