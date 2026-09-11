import {Rooms,roomRequest} from './rooms.mjs';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const rooms=new Rooms(),dataDir=process.env.DATA_DIR||'.midgard-data';
await rooms.load(dataDir);
// Fail startup if the persistent directory is not writable, rather than silently
// accepting players whose progress cannot be saved.
await rooms.save(dataDir);
let stopping=false,saving=null;
const simulation=setInterval(()=>rooms.tick(.05),50);
const autosave=setInterval(()=>{
 if(saving||stopping)return;
 saving=rooms.save(dataDir).catch(e=>console.error('Room save failed:',e.message)).finally(()=>saving=null);
},10000);
const root=resolve(process.env.SERVE_DIR||'.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml'};
const port=Number(process.env.PORT||5173);
const server=createServer(async(req,res)=>{
 if(stopping){res.writeHead(503,{'Content-Type':'application/json','Retry-After':'5'});res.end(JSON.stringify({error:'Сервер перезапускается. Подключитесь снова через несколько секунд.'}));return;}
 if(req.url.split('?')[0]==='/healthz'&&['GET','HEAD'].includes(req.method)){
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({status:'ok',service:'midgard'}));return;
 }
 if(await roomRequest(rooms,req,res))return;
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!(pathname==='/'||pathname==='/index.html'||pathname==='/style.css'||pathname.startsWith('/src/')||pathname.startsWith('/tools/'))||pathname.split('/').some(part=>part.startsWith('.')))throw Error('not found');
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+sep)||!['.html','.css','.js','.svg','.json'].includes(extname(file))||!(await stat(file)).isFile())throw Error('not found');
  res.writeHead(200,{'Content-Type':types[extname(file)],'Cache-Control':'no-cache'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'0.0.0.0',()=>console.log(`Midgard: http://localhost:${server.address().port}`));
async function shutdown(){
 if(stopping)return;stopping=true;clearInterval(simulation);clearInterval(autosave);
 const forceClose=setTimeout(()=>server.closeAllConnections(),5000);forceClose.unref();
 try{
  await new Promise(resolve=>server.close(resolve));clearTimeout(forceClose);
  if(saving)await saving;
  await rooms.save(dataDir);
  process.exitCode=0;
 }catch(error){console.error('Final room save failed:',error.message);process.exitCode=1;}
}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
