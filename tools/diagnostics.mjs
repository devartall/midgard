import {monitorEventLoopDelay} from 'node:perf_hooks';
import {RateMeter,percentile} from '../src/diagnostics.js';
export class ServerDiagnostics{
 constructor(){this.rooms=new WeakMap();this.members=new WeakMap();this.loop=monitorEventLoopDelay({resolution:10});this.loop.enable();this.loopP95Ms=null;this.loopMaxMs=null;
  this.timer=setInterval(()=>{this.loopP95Ms=this.loop.percentile(95)/1e6;this.loopMaxMs=this.loop.max/1e6;this.loop.reset();},1000);this.timer.unref();
 }
 tick(room,cpuMs){let d=this.rooms.get(room);if(!d){d={rate:new RateMeter(),cpu:[]};this.rooms.set(room,d);}d.rate.mark();d.cpu.push(cpuMs);if(d.cpu.length>100)d.cpu.shift();}
 snapshot(member){let d=this.members.get(member);if(!d){d=new RateMeter();this.members.set(member,d);}d.mark();}
 read(room,member){const d=this.rooms.get(room);return {simulationHz:d?.rate.rate()??null,snapshotsHz:this.members.get(member)?.rate()??null,tickCpuP95Ms:percentile(d?.cpu||[]),loopP95Ms:this.loopP95Ms,loopMaxMs:this.loopMaxMs};}
 close(){clearInterval(this.timer);this.loop.disable();}
}
