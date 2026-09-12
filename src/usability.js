import {RECIPES,PARTS,GEAR,ITEMS,FOODS,station,distance,blocked,wearingArmor,carryingShield} from './game.js';

export const RECIPE_ORDER=['sword','shield','bow','arrow','armor','roast','potion','stew','furCloak','rune','fireCloak','emberSeal',...Object.keys(GEAR)];
export function recipeStatus(g,key){
 const recipe=RECIPES[key];
 if(!station(g,recipe.station)){
  const nearby=g.parts.find(p=>p.type===recipe.station&&p.hp>0&&distance(p,g.player)<3);
  return {ready:false,text:nearby&&blocked(g,nearby)?'Сначала отгоните врагов':`Нужен ${PARTS[recipe.station].name.toLowerCase()} рядом`};
 }
 const missing=Object.entries(recipe.cost).filter(([k,n])=>(g.player.inv[k]||0)<n);
 return missing.length?{ready:false,text:'Не хватает: '+missing.map(([k,n])=>`${ITEMS[k]} ×${n-(g.player.inv[k]||0)}`).join(', ')}:{ready:true,text:'Создать'};
}
export function nextObjective(g){
 const p=g.player;
 if(g.defeated.includes('fire'))return ['Сага трёх земель','Хранители повержены'];
 if(g.defeated.includes('snow'))return ['Земля пламени',p.inv.fireCloak?'Путь на юг':'Создайте огнестойкий плащ'];
 if(g.bossDefeated)return ['В снега Йотунхейма',p.inv.furCloak?'Путь на восток':'Создайте меховой плащ'];
 const armed=Object.keys(p.inv).some(k=>p.inv[k]>0&&(k==='sword'||k==='bow'||GEAR[k]?.slot==='weapon'));
 if(armed){
  if(p.buff<=0)return ['Припасы для вылазки','Приготовьте и съешьте жаркое'];
  if(!wearingArmor(p)&&!carryingShield(p))return ['Защита для вылазки','Создайте и наденьте щит или броню'];
  return ['Древний круг','Исследуйте лес к северо-востоку'];
 }
 if(g.parts.some(p=>p.type==='bench'&&p.hp>0))return ['Первое оружие','Создайте меч у верстака'];
 if(g.parts.some(p=>p.type==='fire'&&p.hp>0))return ['Подготовка к вылазке','Поставьте верстак на пол'];
 if(g.home)return ['Первые стены','Пол, стены, дверь и очаг'];
 return ['Свой угол в лесу','Соберите дерево, отметьте участок'];
}
export function itemSummary(g,key){
 const p=g.player,food=FOODS[key],gear=GEAR[key],base=gear?.base||key,tier=gear?.tier||1;
 if(food)return `Сытость: ${food.sat/60} мин.${food.buff?` Бонус: +${food.hp} к максимуму здоровья и +${food.regen} HP/с на ${food.buff/60} мин.`:''} Более сильный пищевой бонус сохраняется. Еда без пользы не расходуется.`;
 if(base==='sword'||base==='bow'){
  const damage=(base==='sword'?24:19)*[0,1,1.65,2.5][tier]*(1+(p.skills[base]||0)*.016)*(p.inv.emberSeal?1.3:1);
  return `Урон: ${Math.round(damage)}. Энергия: ${base==='sword'?18:16}.${base==='bow'?' Выстрел расходует 1 стрелу. Лук занимает обе руки.':' Направленный взмах вблизи цели.'}`;
 }
 if(key==='armor'||gear?.slot==='armor')return `Поглощает ${Math.round((1-[0,.65,.5,.4][tier]/(1+p.skills.guard*.004))*100)}% урона врагов. Прочность надетой брони: ${Math.floor(p.durability)}%. При нуле не защищает. Ремонт у верстака: 2 шкуры.`;
 if(key==='shield'||gear?.slot==='shield')return `Блок поглощает ${Math.round((1-[0,.2,.16,.12][tier]/(1+p.skills.guard*.01))*100)}% урона. Энергия за удар: ${Math.max(3,7-p.skills.guard*.04).toFixed(1)}. Для блока нужно от 7 энергии. С луком блок выполняется руками.`;
 return {potion:'Лечит 40 HP. Перерыв: 20 с. При полном здоровье не расходуется.',rune:'Ледяная вспышка: 45 базового урона и оглушение ближайшей цели. Энергия: 20. Перерыв: 4 с. Урон не зависит от оружия в руках.',furCloak:'Защищает от мороза, пока находится в сумке. Надевать отдельно не нужно.',fireCloak:'Защищает от жара, пока находится в сумке. Надевать отдельно не нужно.',emberSeal:'Усиливает урон оружия на 30%, пока находится в сумке. Не усиливает руну.'}[key]||'Материал для строительства и ремесла.';
}
