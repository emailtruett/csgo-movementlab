import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root = path.dirname(fileURLToPath(import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav','.ttf':'font/ttf'};
http.createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'}).end(body);
  } catch {res.writeHead(404).end('Not found');}
}).listen(3000,'127.0.0.1',()=>{
  console.log('Movement: http://127.0.0.1:3000');
  if(process.argv.includes('--open'))spawn('cmd.exe',['/c','start','','http://127.0.0.1:3000'],{windowsHide:true,stdio:'ignore'});
}).on('error',error=>{
  console.error(error.code==='EADDRINUSE'?'Port 3000 jest zajęty. Jeśli gra już działa, otwórz http://127.0.0.1:3000.':error.message);
  process.exitCode=1;
});
