export const LOOKS={skin:['#d6bd96','#b88b65','#79523e'],hair:['#71543c','#d3b66e','#342d2c','#b8b8ad'],cloth:['#c2b393','#547c7a','#985746','#697b50'],style:['short','braid','shaved'],beard:['none','short','long']};
export function appearance(value={}){const result={};for(const [key,choices]of Object.entries(LOOKS))result[key]=choices.includes(value?.[key])?value[key]:choices[0];return result;}
export function characterName(value){return typeof value==='string'?value.replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,20)||'Странник':'Странник';}
