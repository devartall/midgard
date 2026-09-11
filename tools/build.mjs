import {netlifyRedirects} from './deploy-config.mjs';
const redirects=process.env.ROOM_SERVER_URL?netlifyRedirects(process.env.ROOM_SERVER_URL):null;
import { mkdir, copyFile, cp, writeFile, rm } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const f of ['index.html', 'style.css']) await copyFile(f, `dist/${f}`);
await cp('src', 'dist/src', { recursive: true });
if(redirects)await writeFile('dist/_redirects',redirects);else await rm('dist/_redirects',{force:true});
console.log(redirects?'Build ready: dist/; Netlify room API proxy configured.':'Build ready: dist/. Netlify Drop: solo only until ROOM_SERVER_URL is configured. Node server: solo and rooms.');
