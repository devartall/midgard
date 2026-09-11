import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const root=new URL('../',import.meta.url);
async function boot(dataDir){
 const child=spawn(process.execPath,['tools/server.mjs'],{cwd:root,env:{...process.env,PORT:'0',DATA_DIR:dataDir,SERVE_DIR:'.'},stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
 const exited=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal,stderr})));
 const port=await new Promise((resolve,reject)=>{let output='';child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/localhost:(\d+)/);if(match)resolve(match[1]);});child.once('error',reject);child.once('exit',()=>reject(Error(stderr||'Exited before ready')));});
 return {url:'http://127.0.0.1:'+port,child,exited};
}
const post=async(url,path,body)=>{const response=await fetch(url+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.ok(response.ok);return response.json();};
test('Render lifecycle: health endpoint, dynamic PORT and graceful restart preserve rooms', {timeout:15000}, async()=>{
 const dir=await mkdtemp(tmpdir()+'/midgard-render-');let server;
 try{
  server=await boot(dir);const health=await fetch(server.url+'/healthz');assert.equal(health.status,200);assert.deepEqual(await health.json(),{status:'ok',service:'midgard'});
  assert.equal((await fetch(server.url+'/')).status,200);
  const session=await post(server.url,'create',{profile:{name:'Render hero'}});
  server.child.kill('SIGTERM');assert.equal((await server.exited).code,0);
  const data=JSON.parse(await readFile(dir+'/rooms.json','utf8'));assert.equal(data[0].id,session.code);
  server=await boot(dir);const restored=await post(server.url,'join',{code:session.code,token:session.token});assert.equal(restored.playerId,session.playerId);assert.equal(restored.state.player.name,'Render hero');
  server.child.kill('SIGTERM');assert.equal((await server.exited).code,0);server=null;
 }finally{if(server){server.child.kill('SIGKILL');await server.exited;}await rm(dir,{recursive:true,force:true});}
});
