import {Rooms,roomRequest} from './rooms.mjs';
const rooms=new Rooms(),dataDir=process.env.DATA_DIR||'.midgard-data';await rooms.load(dataDir);
setInterval(()=>rooms.tick(.05),50).unref();let saving=false;setInterval(async()=>{if(saving)return;saving=true;try{await rooms.save(dataDir);}catch(e){console.error('Room save failed:',e.message);}finally{saving=false;}},10000).unref();
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(process.env.SERVE_DIR || '.');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };
const port = Number(process.env.PORT || 5173);
createServer(async (req, res) => {
  if(await roomRequest(rooms,req,res))return;
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(!(pathname==='/'||pathname==='/index.html'||pathname==='/style.css'||pathname.startsWith('/src/')||pathname.startsWith('/tools/'))||pathname.split('/').some(part=>part.startsWith('.')))throw Error('not found');
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep) || !['.html','.css','.js','.svg','.json'].includes(extname(file)) || !(await stat(file)).isFile()) throw new Error('not found');
    res.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`Forest Hearth: http://localhost:${port}`));
