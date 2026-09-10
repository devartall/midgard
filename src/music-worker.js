import {instrumentSamples,instrumentBank} from './music.js';
self.onmessage=()=>{
 for(const {name,root}of instrumentBank()){const samples=instrumentSamples(name,22050,root);self.postMessage({name,root,samples},[samples.buffer]);}
 self.postMessage({ready:true});
};
