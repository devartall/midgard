export const GEAR={
 frostSword:{name:'Клинок инея',slot:'weapon',base:'sword',tier:2,color:'#abe3ee',cost:{crystal:12,frostHide:4,wood:6}},
 frostBow:{name:'Лук ледяных жил',slot:'weapon',base:'bow',tier:2,color:'#a4cbdc',cost:{crystal:10,frostHide:6,wood:10}},
 frostArmor:{name:'Панцирь Хрима',slot:'armor',tier:2,color:'#749daf',cost:{crystal:14,frostHide:8}},
 frostShield:{name:'Щит ледника',slot:'shield',tier:2,color:'#9cc8d7',cost:{crystal:10,frostHide:4,wood:8}},
 emberSword:{name:'Клинок Сурта',slot:'weapon',base:'sword',tier:3,color:'#ffac65',cost:{obsidian:18,emberCore:6,crystal:8}},
 emberBow:{name:'Лук пепла',slot:'weapon',base:'bow',tier:3,color:'#e89b65',cost:{obsidian:14,emberCore:8,wood:12}},
 emberArmor:{name:'Обсидиановый доспех',slot:'armor',tier:3,color:'#755060',cost:{obsidian:20,emberCore:10,frostHide:6}},
 emberShield:{name:'Щит раскалённых недр',slot:'shield',tier:3,color:'#b06648',cost:{obsidian:16,emberCore:6,crystal:6}}
};
export const weaponItem=p=>p.inv[p.weaponItem]?p.weaponItem:p.weapon;
export const weaponOwned=p=>!!p.inv[weaponItem(p)];
export const gearTier=(p,slot)=>GEAR[slot==='weapon'?weaponItem(p):p[slot+'Item']]?.tier||1;
export const weaponPower=p=>[0,1,1.65,2.5][gearTier(p,'weapon')];
export const gearColor=(p,slot,fallback)=>GEAR[slot==='weapon'?weaponItem(p):p[slot+'Item']]?.color||fallback;
