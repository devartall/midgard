// Netlify Drop accepts static redirects, but does not execute tools/server.mjs.
export function netlifyRedirects(address){
 const url=new URL(address);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('ROOM_SERVER_URL должен быть HTTPS-адресом сервера без пути, логина, параметров и фрагмента.');
 return `/api/* ${url.origin}/api/:splat 200!\n`;
}
