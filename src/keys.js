// Physical key positions work with Latin and Cyrillic keyboard layouts.
const codes={Space:' ',Escape:'escape',ArrowUp:'arrowup',ArrowDown:'arrowdown',ArrowLeft:'arrowleft',ArrowRight:'arrowright',Tab:'tab'};
export function gameKey(event){
  if(codes[event.code])return codes[event.code];
  if(/^Key[A-Z]$/.test(event.code||''))return event.code.slice(3).toLowerCase();
  if(/^(Digit|Numpad)[1-9]$/.test(event.code||''))return event.code.at(-1);
  const k=(event.key||'').toLowerCase();return ({ц:'w',ф:'a',ы:'s',в:'d',у:'e',й:'q',к:'r',и:'b',ш:'i',ь:'m',с:'c'})[k]||k;
}
