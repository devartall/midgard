import {RECIPE_ORDER,recipeStatus,nextObjective,itemSummary} from './usability.js';
import {OnlineSession,mergeSnapshot} from './online.js';
import {LOOKS,appearance,characterName,randomProfile} from './character.js';
import {installTooltips} from './tooltips.js';
import {GameAudio} from './audio.js';
import { applyHudLayout } from './layout.js';
import { gameKey } from './keys.js';
import { icon } from './icons.js';
import { placementPlan, planCost } from './construction.js';
import { hexRound, fromPlane, wallDistance } from './hex.js';
import { bindPointer, installGestureGuard, joystickSprint, joystickVector, movementVector } from './input.js';
import * as Sim from './game.js';
const G={...Sim};
let online=null,networkBusy=false,diagnosticsAt=0;
let diagnosticsEnabled=new URLSearchParams(globalThis.location?.search||'').get('diagnostics')==='1';
for(const name of ['attack','interact','craft','useItem','eat','assignQuickSlot','useQuickSlot','claimHome','build','buildBatch','repair','removePart','respawn','storeItems','transferSkill'])G[name]=(...args)=>online?online.send(name,args.slice(1)):Sim[name](...args);
import {
  Renderer
}
from './render.js';
const $=id=>document.getElementById(id),canvas=$('world'),renderer=new Renderer(canvas);
const SAVE_KEY='forest-hearth-v1';
let audioSettings={music:true,effects:true};try{const stored=JSON.parse(localStorage.getItem('midgard-audio'));if(stored&&typeof stored.music==='boolean'&&typeof stored.effects==='boolean')audioSettings=stored;}catch{}
const audio=new GameAudio(audioSettings);let lastStep=0;
let helpMode=false;
let game=G.createGame(),started=false,panelName=null,buildType=null,buildEdge=null,buildDrag=null,selectedItem=null,barSignature='',pointer=null,joy=null,autoRun=false,runHeading={x:0,y:1},lastFrame=0,lastHud=0,saveClock=0,lastEvent=0,toastUntil=0,saveError='',knownSave=false;
const input={
  x:0,y:0,block:false
},keys=new Set();
let touchBlock=false,touchInteract=false;
try{
  const raw=localStorage.getItem(SAVE_KEY);
  if(raw){
    game=G.loadGame(raw);
    knownSave=true;
  }
}
catch{
  saveError='Сохранение не удалось прочитать. Можно начать заново или импортировать копию.';
}
function layoutHud(){
  const hud=$('hud'),style=typeof getComputedStyle==='function'?getComputedStyle(hud):null;
  const inset=side=>Math.max(0,(parseFloat(style?.['padding'+side])||8)-8);
  const h=Math.min(innerHeight,window.visualViewport?.height||innerHeight);
  applyHudLayout(hud,innerWidth,h,{left:inset('Left'),right:inset('Right'),top:inset('Top'),bottom:inset('Bottom')});
  if(document.documentElement?.style)document.documentElement.style.setProperty('--ui-height',h+'px');
}
layoutHud();window.visualViewport?.addEventListener('resize',layoutHud);
function safeSave(){
  if(online)return true;
  try{
    localStorage.setItem(SAVE_KEY,G.saveGame(game));
    knownSave=true;
    saveError='';
    return true;
  }
  catch{
    saveError='Браузер не сохранил прогресс. Экспортируйте копию через паузу.';
    G.tell(game,saveError);
    return false;
  }
}
function escape(s){
  return String(s).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }
  [c]));
}
function costText(cost){
  return Object.entries(cost).map(([k,v])=>`<span class="resource-chip" title="${G.ITEMS[k]}">${icon(k)} ${v<0?'вернуть '+(-v):v}</span>`).join(' · ');
}
function stock(inv=game.player.inv){
  return Object.entries(inv).filter(([,v])=>v>0).map(([k,v])=>`<span class="resource-chip" title="${G.ITEMS[k]||k}">${icon(k)} ${v}</span>`).join(' · ')||'Пока пусто';
}
function button(text,action,cls=''){
  if(online&&['save','export','new-confirm'].includes(action))return '';
  return `<button class="${cls}" data-action="${action}">${text}</button>`;
}
function inventoryGrid(inv,selectable=false){
  const entries=Object.entries(inv).filter(([,n])=>n>0);
  if(!entries.length&&!selectable)return '<p class="muted">Пока пусто.</p>';
  return '<div class="inventory-grid">'+entries.map(([k,n])=>`<button class="item-slot ${selectedItem===k&&selectable?'selected':''} ${(G.weaponItem(game.player)===k||k===(game.player.armorItem||'armor')&&G.wearingArmor(game.player)||k===(game.player.shieldItem||'shield')&&G.carryingShield(game.player))?'equipped':''}" ${selectable?`data-action="select:${k}"`:'disabled'} title="${G.ITEMS[k]}" aria-label="${G.ITEMS[k]}, ${n}">${icon(k)}<span>${G.ITEMS[k]}</span><b>${n}</b>${G.weaponItem(game.player)===k?'<i>В руках</i>':(k===(game.player.armorItem||'armor')&&G.wearingArmor(game.player)||k===(game.player.shieldItem||'shield')&&G.carryingShield(game.player))?'<i>Надето</i>':''}</button>`).join('')+Array.from({length:selectable?Math.max(6,Math.ceil(entries.length/6)*6)-entries.length:0},()=>'<div class="item-slot empty" aria-hidden="true">·</div>').join('')+'</div>';
}
function itemDetails(k){
  if(!k||!game.player.inv[k])return '<aside class="item-detail"><div class="detail-emblem">ᛉ</div><h3>Снаряжение странника</h3><p>Выберите предмет, чтобы узнать его свойства, использовать или назначить на пояс.</p><small>Броню и щит нужно надеть в сумке или через пояс.</small></aside>';
  const f=G.FOODS[k],usable=G.usableItem(k);
  return `<aside class="item-detail">${icon(k,'detail-icon')}<small>${f?'ПРИПАСЫ':k==='potion'?'АЛХИМИЯ':['armor','shield'].includes(k)||['armor','shield'].includes(G.GEAR[k]?.slot)?'ЗАЩИТА':usable?'СНАРЯЖЕНИЕ':'МАТЕРИАЛЫ'}</small><h3>${G.ITEMS[k]}</h3><p>${escape(itemSummary(game,k))}</p>${usable?button(f?'Съесть':k==='potion'?'Выпить':G.GEAR[k]?(G.GEAR[k].slot==='weapon'?'Взять в руки':game.player[G.GEAR[k].slot+'Item']===k&&game.player[G.GEAR[k].slot+'Equipped']?'Снять':'Надеть'):['armor','shield'].includes(k)?((game.player[k+'Item']||k)===k&&game.player[k+'Equipped']?'Снять':'Надеть'):'Взять в руки',`use:${k}`,'primary'):''}${(k==='armor'||G.GEAR[k]?.slot==='armor')?button('Ремонт · 2 шкуры','armor-repair'):''}${usable?'<h4>Назначить на пояс</h4><div class="slot-assign">'+Array.from({length:9},(_,i)=>button(i+1,`assign:${k}:${i}`,game.player.quickbar[i]===k?'selected':'')).join('')+'</div><small>Цифры 1–9 или касание ячейки в игре.</small>':''}</aside>`;
}
function renderQuickbar(){
  const p=game.player,signature=JSON.stringify([p.quickbar,p.inv,p.weapon,p.weaponItem,p.armorItem,p.shieldItem,p.armorEquipped,p.shieldEquipped,Math.ceil(p.potionCooldown)]);if(signature===barSignature)return;barSignature=signature;
  $('quickbar').innerHTML=p.quickbar.map((k,i)=>`<button data-slot="${i}" class="quick-slot ${(k===G.weaponItem(p)||k===(p.armorItem||'armor')&&G.wearingArmor(p)||k===(p.shieldItem||'shield')&&G.carryingShield(p))?'equipped':''} ${!p.inv[k]?'depleted':''}" title="${k?G.ITEMS[k]:'Пустая ячейка'} (${i+1})" aria-label="${k?G.ITEMS[k]:'Пустая ячейка'}, ${i+1}"><kbd>${i+1}</kbd>${k?icon(k):'<span class="empty-rune">·</span>'}<b>${k&&p.inv[k]||''}</b>${k==='potion'&&p.potionCooldown>0?`<em>${Math.ceil(p.potionCooldown)}с</em>`:''}</button>`).join('');
}
function title(text){
  return `<div class="panel-head"><h2 id="panelTitle">${text}</h2><button class="close-button" data-action="close" aria-label="Закрыть"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>`;
}
const pointerBindings=[];
installGestureGuard([canvas, $('hud')]);
function clearInput(){
  autoRun=false;input.sprint=false;
  for (const control of pointerBindings) control.reset();
  keys.clear();
  input.x=0;
  input.y=0;
  input.block=false;
  touchBlock=false;
  touchInteract=false;
  joy=null;
  buildDrag=null;
  $('stick').style.transform='';
  document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));
}
function pauseState(){
  game.paused=helpMode||!started||!!panelName||document.hidden||matchMedia('(orientation: portrait) and (max-width: 700px)').matches;
}
function openPanel(name){
  panelName=name;
  clearInput();
  pauseState();
  $('overlay').classList.remove('hidden');
  renderPanel();
}
function closePanel(){
  panelName=null;
  $('overlay').classList.add('hidden');
  clearInput();
  pauseState();
}
function renderPanel(){
  const p=game.player;
  let html='';
  if(panelName==='intro'){
    html=`<div class="intro"><div class="nordic-crest"><span>ᛉ</span><i>ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ</i></div><div class="eyebrow">САГА ТРЁХ ЗЕМЕЛЬ</div><h1 id="panelTitle">Мидгард</h1><p class="lead">Под ветвями мирового древа.<br>Возведите свой дом. Переживите тьму.</p><div class="features"><span>${icon('wall')} Свой чертог</span><span>${icon('sword')} Опасные ночи</span><span>${icon('journal')} Руны леса</span></div><p>Собирайте припасы, обустройте убежище и найдите древнего хранителя. Ночью лес становится опаснее. Все действия происходят только пока вы играете.</p><div class="row">${button(knownSave?'Продолжить путь':'Войти в лес','play','primary')}${knownSave?button('Новый путь','new-confirm','secondary'):''}${button('Управление','help','secondary')}${button('Играть с друзьями','online','secondary')}</div>${saveError?`<p class="notice">${escape(saveError)}</p>`:''}<footer>Три земли · обычная сложность · без аккаунта</footer></div>`;
  }
  else if(panelName==='bag'){
    html=title('Сумка странника')+'<div class="inventory-layout">'+inventoryGrid(p.inv,true)+itemDetails(selectedItem)+'</div><p class="muted">Вещи остаются на месте гибели. Пояс — быстрый доступ к предметам из сумки.</p>';
  }
  else if(panelName==='build'){
    html=title('Ваш дом')+`<p>Один участок, свободная планировка. Пол → стены → дверь прямо на стене → очаг и оборудование. Постройка защищает, когда контур стен закрыт.</p><div class="stock">${stock()}</div>`;
    if(!game.home)html+=`<div class="notice">Отметьте участок там, где стоите. Гексагональный участок радиусом 5 клеток. Стоимость: 4 дерева. Перенос в лесной версии недоступен.</div><br>${button('Отметить участок','claim','primary')}`;
    else html+=`<div class="notice">Сила дома: ${G.homeValue(game)}. Разрушители приходят от 28. Пол, обычные стены и украшения не усиливают набеги.</div><br><div class="cards">`+Object.entries(G.PARTS).map(([k,d])=>`<article class="card"><div class="recipe-icon">${icon(k)}</div><h3>${d.name}</h3><p>${d.desc}</p>${G.homeValue(game)<28&&G.homeValue(game)+d.value>=28?'<p class="notice">После постройки возможен разрушитель.</p>':''}<small>${costText(d.cost)}</small>${button('Разместить',`place:${k}`,G.afford(p.inv,d.cost)?'available':'')}</article>`).join('')+`</div><hr><div class="row">${button('Ремонтировать рядом · 2 дерева','repair','secondary')}${button('Разобрать → вернуть все материалы','demolish','secondary')}</div>`;
  }
  else if(panelName==='craft'){
    html=title('Мастерская')+`<p>Куйте оружие, готовьте еду и варите зелья у оборудования дома. Если рядом монстры, сначала освободите рабочее место.</p><div class="stock">${stock()}</div><div class="cards">`+RECIPE_ORDER.map(k=>[k,G.RECIPES[k]]).map(([k,r])=>`<article class="card"><div class="recipe-icon">${icon(k)}</div><h3>${G.ITEMS[k]} ${r.count>1?`×${r.count}`:''}</h3><p>${G.PARTS[r.station].name} ${G.station(game,r.station)?'· рядом':'· подойдите ближе'}</p><small>${costText(r.cost)}</small>${button(escape(recipeStatus(game,k).text),`craft:${k}`,recipeStatus(game,k).ready?'available':'unavailable')}</article>`).join('')+'</div>';
  }
  else if(panelName==='skills'){
    html=title('Навыки')+`<p>Навыки растут от действий. Выбранное направление получает полный опыт, остальные — 20%. Общий предел — 150 очков: сосредоточение выгоднее.</p><div class="cards">`+Object.entries(G.SKILLS).map(([k,name])=>`<article class="card"><div class="recipe-icon">${icon(k==='guard'?'guard':k)}</div><h3>${name} · ${p.skills[k].toFixed(1)}</h3><div class="skillbar"><i style="width:${p.skills[k]}%"></i></div><p>${k==='guard'?'Улучшает защиту и расход выносливости при блоке. Растёт в столкновениях.':'Каждое очко увеличивает урон оружия на 1,6%.'}</p>${button(p.focus===k?'Основное направление':'Сосредоточиться',`focus:${k}`)}</article>`).join('')+`</div><hr><h3>Перераспределение у верстака</h3><p>Переносит до 10 очков с потерей 20%. Исходный навык ослабевает. Смена направления обучения сама по себе не переносит опыт.</p><div class="row"><label>Из <select id="fromSkill">${Object.entries(G.SKILLS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>В <select id="toSkill">${Object.entries(G.SKILLS).map(([k,v])=>`<option value="${k}" ${k==='bow'?'selected':''}>${v}</option>`).join('')}</select></label>${button('Перенести с потерей','transfer','danger')}</div>`;
  }
  else if(panelName==='storage'){
    html=title('Хранилище')+`<p>Рядом с сундуком не должно быть монстров. Вещи внутри не исчезают при нападениях.</p><h3>В сундуке</h3>${inventoryGrid(game.storage)}<h3>При себе</h3>${inventoryGrid(p.inv)}<div class="row">${button('Оставить ресурсы и еду','deposit','primary')}${button('Взять запасы','withdraw','secondary')}</div>`;
  }
  else if(panelName==='journal'){
    html=title('Находки')+`<p>Лес оставил записи. Внимательное чтение помогает понять его обитателей.</p>`+(game.notes.length?game.notes.map(i=>`<article class="card"><h3>${G.NOTES[i].title}</h3><p>${G.NOTES[i].text}</p></article>`).join('<br>'):'<div class="notice">У начала тропы стоит камень с надписью.</div>');
  }
  else if(panelName==='map'){
    html=title('Карта Мидгарда')+`<div class="map-controls">${button('−','map-zoom:out')}${button('+','map-zoom:in')}${button('Весь мир','map-zoom:reset')}<span id="mapScale"></span></div><div id="mapPlayers" class="map-players">${[game.player,...(game.peers||[])].map(p=>button(escape(p.name||'Странник')+(p===game.player?' (вы)':''),'map-player:'+p.id)).join('')}</div>`+`<canvas id="mapCanvas" class="map-canvas" aria-label="Карта мира и игроков"></canvas><p class="muted">Светлая точка — вы · голубые — друзья (нажмите имя, чтобы найти) · золотая — дом · красная — древний круг · сиреневая — вещи. Голубое — озёра, светло-серое — непроходимые скалы, охристые кольца — логова.</p>`;
  }
  else if(panelName==='death'){
    html=`<div class="eyebrow">ПУТЬ НЕ ЗАКОНЧЕН</div><h2 id="panelTitle">Лес забрал своё</h2><p>Ваши вещи остались на месте гибели. Навыки и запасы дома сохранены.${online?' Пока союзники живы, бой с хранителем продолжается.':' Хранители восстановили здоровье.'}</p><div class="row">${button('Возродиться на старте','respawn:start','primary')}${game.parts.some(v=>v.type==='bed'&&v.hp>0)?button('Возродиться дома','respawn:home','secondary'):''}</div><p class="muted">Дом может быть занят монстрами. Выбор старта всегда доступен.</p>`;
  }
  else if(panelName==='character'||panelName==='online'){
    html=title(panelName==='online'?'Вместе в Мидгарде':'Ваш странник')+profileForm()+ (panelName==='online'?`<p>Приватная комната до 4 игроков. Мир не останавливается, пока вы в меню. Один общий дом, отдельные вещи. PvP выключен по умолчанию.</p><label class="room-code-field">Код комнаты <input id="roomCode" type="text" inputmode="numeric" placeholder="1234" maxlength="10" autocomplete="off" autocapitalize="off" spellcheck="false"></label><div class="row">${button('Создать комнату','room-create','primary')}${button('Войти по коду','room-join')}${button('Соло','intro')}</div><p id="roomError" role="status"></p>`:button('Начать путь','character-start','primary'));
  }
  else if(panelName==='pause'){
    html=title('У огня времени')+`<p>${online?'Сетевой мир продолжает жить. Меню не защищает героя от опасности.':'Игра на паузе. День, голод и нападения остановлены.'}</p><div class="audio-settings">${button('Музыка: '+(audio.settings.music?'вкл':'выкл'),'audio:music','secondary')}${button('Звуки: '+(audio.settings.effects?'вкл':'выкл'),'audio:effects','secondary')}</div><div class="audio-volumes">${['music','effects'].map(channel=>`<label>${channel==='music'?'Музыка':'Эффекты'}<input type="range" min="0" max="100" step="1" data-volume="${channel}" value="${Math.round(audio.settings[channel+'Volume']*100)}" aria-label="Громкость ${channel==='music'?'музыки':'эффектов'}"><output id="volume-${channel}">${Math.round(audio.settings[channel+'Volume']*100)}%</output></label>`).join('')}</div><div class="row">${online?button(diagnosticsEnabled?'Скрыть диагностику':'Диагностика сети','diagnostics')+button(game.player.pvp?'PvP включён — выключить':'Включить PvP','pvp')+button('Выйти из комнаты','leave-online')+`<p>Комната: <b>${online.code}</b>. Мир продолжает жить.</p>`:''}${button('Продолжить','close','primary')}${button('Сохранить','save','secondary')}${button('Копия сохранения','export','secondary')}${button('Управление','help','secondary')}</div><hr><label ${online?'hidden':''}>Восстановить из файла <input id="importFile" type="file" accept="application/json,.json"></label><p class="muted">Импорт заменит текущий мир только после подтверждения. Локальное сохранение принадлежит этому браузеру; очистка его данных удаляет прогресс.</p><hr>${button('Начать новый путь','new-confirm','danger secondary')}${saveError?`<p class="notice">${escape(saveError)}</p>`:''}`;
  }
  else if(panelName==='help'){
    html=title('Как играть')+`<div class="keyhelp"><span>Левый круг / WASD — движение; сильное отклонение / Shift — спринт. Кнопка ➤ рядом со стиком — автобег</span><span>Удар / Пробел — атака ближайшей цели</span><span>Блок / удержание Q — защита</span><span>Действие / E — собрать, открыть, прочитать</span><span>Карта / M · Пауза / Esc</span><span>1–9 — предметы на поясе</span></div><hr><p>Соберите дерево и камень вокруг тропы. В меню строительства отметьте участок и поставьте пол. Затем разместите стены по краям, дверь и очаг. Для пола зажмите и протяните область. Для стен протяните область полов — получите замкнутый контур. Одиночное касание ставит стену на ближайшее ребро; R переключает автоматический выбор и шесть направлений. Для прохода выберите дверь и коснитесь стены: она заменится с зачётом материалов. Двигаться при этом можно левым кругом.</p><p>У верстака создайте меч, лук, стрелы, броню и щит. Броню и щит можно надеть или снять в сумке. Без щита блок руками слабее; лук занимает обе руки. Еду можно съесть в сумке. У очага в закрытом доме здоровье восстанавливается, если вы сыты и рядом нет монстров. Короткая вспышка перед атакой противника — время решить, блокировать ли или отступить.</p><p>Нападение начнётся после предупреждения. Закрытая дверь удерживает обычных врагов; развитый дом привлекает разрушителей. Кнопка действия работает с ближайшим объектом — подойдите непосредственно к нужному.</p><div class="row">${button(started?'Вернуться в игру':'К началу',started?'close':'intro','primary')}</div>`;
  }
  else if(panelName==='new-confirm'){
    html=title('Начать заново?')+`<p>Текущий мир будет заменён. Если он нужен, сначала сохраните копию через меню паузы.</p><div class="row">${button('Заменить мир','new','danger secondary')}${button('Отмена',started?'pause':'intro','primary')}</div>`;
  }
  const latest=game.events.at(-1);
  if(latest&&!['intro','help','death'].includes(panelName))html+=`<p class="notice" role="status">${escape(latest.text)}</p>`;
  $('panel').innerHTML=html;previewProfile();
  if(panelName==='map')drawMap();
  $('importFile')?.addEventListener('change',async event=>{
    if(online)return;
    const f=event.target.files[0];
    if(!f)return;
    if(f.size>2_000_000){
      alert('Файл слишком большой.');
      return;
    }
    try{
      const loaded=G.loadGame(await f.text());
      if(confirm('Заменить текущий мир импортированным сохранением?')){
        game=loaded;
        started=true;
        safeSave();
        closePanel();
      }
    }
    catch{
      alert('Не удалось прочитать сохранение. Текущий мир не изменён.');
    }
  });
}

let draftProfile=randomProfile(),mapZoom=1,mapFocus=null,mapRefreshAt=0;
function drawMap(){const roster=[game.player,...(game.peers||[])].map(p=>button(escape(p.name||'Странник')+(p===game.player?' (вы)':''),'map-player:'+p.id)).join('');if($('mapPlayers').innerHTML!==roster)$('mapPlayers').innerHTML=roster;const focus=[game.player,...(game.peers||[])].find(p=>p.id===mapFocus)||game.player;renderer.map($('mapCanvas'),game,mapZoom,focus);$('mapScale').textContent=mapZoom.toFixed(1)+'×';}
function profileForm(){const look=appearance(draftProfile.appearance),labels={sex:'Пол',skin:'Кожа',hair:'Цвет волос',cloth:'Рубаха',style:'Причёска',beard:'Борода'},names={male:'Мужской',female:'Женский',short:'Короткая',braid:'Коса',shaved:'Бритая',none:'Нет',long:'Длинная'};return '<div class="character-editor"><div class="character-fields"><label>Имя <input id="heroName" maxlength="20" value="'+escape(draftProfile.name)+'"></label><div class="profile-options">'+Object.entries(LOOKS).map(([key,choices])=>'<label>'+labels[key]+'<select id="look-'+key+'">'+choices.map((v,i)=>'<option value="'+v+'" '+(v===look[key]?'selected':'')+'>'+(names[v]||({skin:['Светлая','Смуглая','Тёмная'],hair:['Каштановые','Светлые','Чёрные','Седые'],cloth:['Льняная','Сине-зелёная','Терракотовая','Зелёная']}[key]?.[i]))+'</option>').join('')+'</select></label>').join('')+'</div>'+button('Случайный герой','random-profile','secondary')+'</div><div id="heroPreview" class="character-preview"></div></div>';}
function readProfile(){return draftProfile={name:characterName($('heroName')?.value),appearance:appearance(Object.fromEntries(Object.keys(LOOKS).map(k=>[k,$('look-'+k)?.value]))) };}
function previewProfile(){if(!$('heroPreview')||!['character','online'].includes(panelName))return;const a=readProfile().appearance;$('heroPreview').innerHTML=`<svg viewBox="0 0 120 110" width="120" height="110" aria-label="Внешность героя"><path d="${a.sex==='female'?'M44 60h32l-3 16 11 18H36l11-18Z':'M40 60h40l4 34H36Z'}" fill="${a.cloth}"/><path d="M42 94v14m36-14v14" stroke="#4a493c" stroke-width="12"/><path d="M39 64 30 82m51-18 9 18" stroke="${a.cloth}" stroke-width="9"/><circle cx="60" cy="40" r="${a.sex==='female'?18:20}" fill="${a.skin}"/><path d="M40 34q1-27 39-5l2 8-21-8-20 12Z" fill="${a.style==='shaved'?a.skin:a.hair}"/>${a.style==='braid'?'<path d="M42 35 34 50 37 70" stroke="'+a.hair+'" stroke-width="7"/>':''}${a.beard!=='none'?'<path d="M48 49h25L60 '+(a.beard==='long'?74:62)+'Z" fill="'+a.hair+'"/>':''}<path d="M49 40h4m15 0h4" stroke="#283636" stroke-width="3"/></svg>`;}
async function connectRoom(create){if(networkBusy)return;networkBusy=true;try{const code=$('roomCode')?.value.trim().toUpperCase(),profile=readProfile();let stored;try{stored=JSON.parse(localStorage.getItem('midgard-room-'+code));}catch{}
 const session=await OnlineSession.request(create?'create':'join',{code,profile,token:stored?.token});
 const connection=new OnlineSession(session,state=>{if(online!==connection)return;const pvp=game.player.pvp;mergeSnapshot(game,state);pauseState();if(panelName==='pause'&&pvp!==game.player.pvp)renderPanel();},result=>{if(online!==connection)return;if(result.value==='craft'||result.value==='storage')openPanel(result.value);if(result.value?.note)openPanel('journal');if(panelName&&['bag','craft','storage'].includes(panelName))refreshPanel();if(result.error)G.tell(game,result.error);});
 online=connection;online.diagnostics.setEnabled(diagnosticsEnabled);$('onlineDiagnostics').open=diagnosticsEnabled;
 try{localStorage.setItem('midgard-room-'+session.code,JSON.stringify({token:session.token}));}catch{}
 game=session.state;lastEvent=0;barSignature='';start();
 }catch(e){if($('roomError'))$('roomError').textContent=e.message;}finally{networkBusy=false;}}

function start(){
  audio.unlock();
  started=true;
  closePanel();
  safeSave();
}
function refreshPanel(){
  if(panelName)renderPanel();
  hud();
}
$('copyDiagnostics').addEventListener('click',async()=>{
 const report=online?.diagnostics.report();if(!report)return;
 const status=$('diagnosticsCopyStatus'),field=$('diagnosticsCopyText');field.hidden=true;
 try{await navigator.clipboard.writeText(report);status.textContent='Отчёт скопирован';}
 catch{field.value=report;field.hidden=false;field.focus();field.select();field.setSelectionRange(0,report.length);status.textContent='Выделите текст и выберите «Копировать»';}
});
$('panel').addEventListener('input',event=>{const channel=event.target.dataset?.volume;if(!['music','effects'].includes(channel))return;audio.setVolume(channel,Number(event.target.value)/100);$('volume-'+channel).textContent=Math.round(audio.settings[channel+'Volume']*100)+'%';});
$('panel').addEventListener('change',event=>{if(event.target.id?.startsWith('look-'))previewProfile();if(event.target.dataset?.volume==='effects')audio.play('equip');if(event.target.dataset?.volume)try{localStorage.setItem('midgard-audio',JSON.stringify(audio.settings));}catch{}});
$('panel').addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');
  if(!b)return;
  const [act,arg,extra]=b.dataset.action.split(':');
  audio.play('ui');
  if(act==='map-zoom'){mapZoom=arg==='reset'?1:Math.max(1,Math.min(3,mapZoom+(arg==='in'?.5:-.5)));drawMap();return;}
  if(act==='map-player'){mapFocus=arg;mapZoom=Math.max(2,mapZoom);drawMap();return;}
  if(act==='random-profile'){draftProfile=randomProfile();refreshPanel();return;}
  if(act==='character-start'){game.player.appearance=readProfile().appearance;game.player.name=readProfile().name;start();return;}
  if(act==='room-create'||act==='room-join'){connectRoom(act==='room-create');return;}
  if(act==='diagnostics'){diagnosticsEnabled=!diagnosticsEnabled;online?.diagnostics.setEnabled(diagnosticsEnabled);$('onlineDiagnostics').open=diagnosticsEnabled;refreshPanel();return;}
  if(act==='pvp'){online?.send('pvp',[!game.player.pvp]);return;}
  if(act==='leave-online'){online=null;started=false;game=G.createGame();try{const raw=localStorage.getItem(SAVE_KEY);if(raw)game=G.loadGame(raw);}catch{}openPanel('intro');return;}
  if(act==='audio'){audio.set(arg,!audio.settings[arg]);try{localStorage.setItem('midgard-audio',JSON.stringify(audio.settings));}catch{}refreshPanel();return;}
  if(act==='select'){selectedItem=arg;refreshPanel();return;}
  if(act==='use'){G.useItem(game,arg);refreshPanel();}
  if(act==='assign'){G.assignQuickSlot(game,Number(extra),arg);refreshPanel();}
  if(act==='close'){
    if(!started)openPanel('intro');
    else if(game.player.dead)openPanel('death');
    else closePanel();
    return;
  }
  if(['intro','pause','help','new-confirm','online','character'].includes(act)){
    openPanel(act);
    return;
  }
  if(act==='play'){
    if(!knownSave){openPanel('character');return;}start();
    return;
  }
  if(act==='new'){
    game=G.createGame();
    renderer.camera={
      ...G.START
    };
    lastEvent=0;
    buildType=null;
    openPanel('character');
    return;
  }
  if(act==='claim'){
    if(G.claimHome(game)){
      buildType='floor';
      closePanel();
    }
    else refreshPanel();
  }
  if(act==='place'){
    buildType=arg;
    closePanel();
  }
  if(act==='demolish'){
    buildType='remove';
    closePanel();
  }
  if(act==='craft'){
    G.craft(game,arg);
    refreshPanel();
  }
  if(act==='eat'){
    G.eat(game,arg);
    refreshPanel();
  }
  if(act==='equip'){
    G.useItem(game,arg);
    refreshPanel();
  }
  if(act==='focus'){
    if(online)online.send('focus',[arg]);else game.player.focus=arg;
    refreshPanel();
  }
  if(act==='transfer'){
    G.transferSkill(game,$('fromSkill').value,$('toSkill').value);
    refreshPanel();
  }
  if(act==='deposit'||act==='withdraw'){
    G.storeItems(game,act==='withdraw');
    refreshPanel();
  }
  if(act==='repair'){
    const part=game.parts.filter(p=>p.hp<G.PARTS[p.type].hp&&G.distance(p,game.player)<3).sort((a,b)=>G.distance(a,game.player)-G.distance(b,game.player))[0];
    if(part)G.repair(game,part);
    else G.tell(game,'Рядом нет повреждённых частей.');
    refreshPanel();
  }
  if(act==='armor-repair'&&online){online.send('armorRepair',[]);return;}
  if(act==='armor-repair'){
    if(G.station(game,'bench')&&G.afford(game.player.inv,{
      hide:2
    })){
      G.add(game.player.inv,'hide',-2);
      game.player.durability=100;
      G.tell(game,'Броня восстановлена.');
    }
    else G.tell(game,'Нужны верстак рядом и 2 шкуры.');
    refreshPanel();
  }
  if(act==='respawn'){
    G.respawn(game,arg==='home');
    closePanel();
    safeSave();
  }
  if(act==='save'){
    safeSave();
    G.tell(game,saveError||'Прогресс сохранён.');
    refreshPanel();
  }
  if(act==='export'){
    const url=URL.createObjectURL(new Blob([G.saveGame(game)],{
      type:'application/json'
    }));
    const a=document.createElement('a');
    a.href=url;
    a.download='midgard-save.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  if(started)safeSave();
  hud();
});
function doInteract(){
  if(game.paused||game.player.dead)return;
  const result=G.interact(game);
  if(result==='craft'||result==='storage')openPanel(result);
  if(result?.note)openPanel('journal');
}
for(const b of document.querySelectorAll('[data-panel]'))b.addEventListener('click',()=>{
  if(started&&!game.player.dead)openPanel(b.dataset.panel);
});
$('mapBtn').onclick=()=>{
  if(started&&!game.player.dead)openPanel('map');
};
$('pauseBtn').onclick=()=>{
  if(started&&!game.player.dead){
    safeSave();
    openPanel('pause');
  }
};
const turnEdge=()=>{buildEdge=buildEdge===null?0:buildEdge===5?null:buildEdge+1;hud();};
$('turnBuild').onclick=turnEdge;
$('quickbar').addEventListener('pointerdown',event=>{
  if(!canControl()||(event.pointerType==='mouse'&&event.button!==0))return;const b=event.target.closest('[data-slot]');if(!b)return;event.preventDefault();
  G.useQuickSlot(game,Number(b.dataset.slot));safeSave();hud();
});
for(const b of document.querySelectorAll('[data-panel]'))b.innerHTML=icon(b.dataset.panel==='build'?'wall':b.dataset.panel)+`<span>${({bag:'Сумка',build:'Строить',craft:'Ремесло',skills:'Навыки',journal:'Сага'})[b.dataset.panel]}</span>`;
$('mapBtn').innerHTML=icon('map');
$('attack').dataset.tooltip='Атака · Пробел. Мечом бейте на длине клинка; лук расходует стрелы.';
$('block').dataset.tooltip='Удерживайте для блока · Q. Щит поглощает намного больше урона, чем руки; попадания расходуют энергию, между ними блок позволяет восстанавливать её.';
$('interact').dataset.tooltip='Действие · E. Сбор ресурсов, двери, сундуки и находки рядом с героем. Дерево и камень требуют нескольких ударов.';
$('block').innerHTML=icon('hand')+'<small>Блок руками · Q</small>';

$('rotateBuild').onclick=()=>{
  buildType=null;
  hud();
};
const canControl = () => !game.paused && !game.player.dead;
function bindAction(id, down, up = () => {}) {
  const element = $(id);
  pointerBindings.push(bindPointer(element, {
    enabled: canControl,
    start: () => { element.classList.add('pressed'); down(); },
    end: () => { element.classList.remove('pressed'); up(); },
  }));
}
bindAction('attack', () => {autoRun=false;G.attack(game);});
$('autoRun').addEventListener('click',()=>{if(canControl()){autoRun=!autoRun;$('autoRun').setAttribute?.('aria-pressed',String(autoRun));}});

bindAction('interact',()=>{touchInteract=true;doInteract();},()=>{touchInteract=false;});
bindAction('block', () => touchBlock = true, () => touchBlock = false);
pointerBindings.push(bindPointer($('joystick'), {
  enabled: canControl,
  start: event => {
    const rect = $('joystick').getBoundingClientRect();
    joy = { id: event.pointerId, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, x: 0, y: 0 };
    updateJoy(event);
  },
  move: updateJoy,
  end: () => { joy = null; $('stick').style.transform = ''; },
}));
function updateJoy(event) {
  if (!joy) return;
  let x = (event.clientX - joy.cx) / 42, y = (event.clientY - joy.cy) / 42;
  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  const move=joystickVector(x,y);joy.x=move.x;joy.y=move.y;
  joy.sprint = joystickSprint(length,joy.sprint);
  $('stick').style.transform = 'translate(' + x * 30 + 'px,' + y * 30 + 'px)';
}
// Mouse hover still previews placement without requiring a pressed button.
canvas.addEventListener('pointermove', event => {
  if (event.pointerType === 'mouse') pointer = { x: event.clientX, y: event.clientY };
});
pointerBindings.push(bindPointer(canvas, {
  enabled: canControl,
  start: event => {
    pointer = { x: event.clientX, y: event.clientY };
    if (!buildType) return;
    buildDrag={start:renderer.world(event.clientX,event.clientY),end:renderer.world(event.clientX,event.clientY)};
  },
  move: event => {pointer={x:event.clientX,y:event.clientY};if(buildDrag)buildDrag.end=renderer.world(event.clientX,event.clientY);},
  end: event => {
    const drag=buildDrag;buildDrag=null;
    if(!drag||event?.type!=='pointerup'||!canControl()||!buildType)return;
    drag.end=renderer.world(event.clientX,event.clientY);
    if(buildType==='remove'){
      const cell=hexRound(drag.end.x,drag.end.y),part=game.parts.filter(o=>G.PARTS[o.type].solid?wallDistance(o,drag.end)<.22:o.x===cell.x&&o.y===cell.y).sort((a,b)=>(a.type==='floor')-(b.type==='floor'))[0];
      if(part)G.removePart(game,part.id);
    }else G.buildBatch(game,placementPlan(game,buildType,drag.start,drag.end,buildEdge));
    safeSave();hud();
  },
}));
window.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  const k=gameKey(e);
  if([' ','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(k))e.preventDefault();
  if(k==='escape'){
    if(started&&!game.player.dead){
      if(panelName)closePanel();
      else if(buildType){
        buildType=null;
      }
      else openPanel('pause');
    }
    return;
  }
  if(game.paused||game.player.dead)return;
  keys.add(k);
  if(e.repeat)return;
  if(k===' ')G.attack(game);
  if(k==='r'&&buildType)turnEdge();
  if(/^[1-9]$/.test(k)){G.useQuickSlot(game,Number(k)-1);safeSave();hud();}
  if(k==='e')doInteract();
  if(k==='b')openPanel('build');
  if(k==='i')openPanel('bag');
  if(k==='m')openPanel('map');
  if(k==='c')openPanel('craft');
});
window.addEventListener('keyup',e=>keys.delete(gameKey(e)));
window.addEventListener('blur',()=>{
  clearInput();
  if(started&&!game.player.dead){
    safeSave();audio.update(game,false);
    openPanel('pause');
  }
});
document.addEventListener('visibilitychange',()=>{
  online?.diagnostics.reset();
  clearInput();
  if(document.hidden&&started){safeSave();audio.update(game,false);}
  pauseState();
  lastFrame=performance.now();
});
window.addEventListener('pagehide',()=>{
  if(started)safeSave();
});
window.addEventListener('resize',()=>{
  layoutHud();
  renderer.resize();
  clearInput();
  pauseState();
});
function hud(){
  $('modeLabel').textContent=online?'Комната · '+online.code:'Соло · три земли';
  $('hud').dataset.mode=buildType?'building':'playing';
  renderQuickbar();
  const p=game.player,max=G.maxHp(game),phase=game.time%G.DAY,night=G.isNight(game),context=G.context(game);
  $('hpFill').style.width=`${Math.max(0,p.hp/max*100)}%`;
  $('hpText').textContent=`${Math.ceil(p.hp)} / ${max}`;
  $('staminaFill').style.width=`${p.stamina}%`;
  $('staminaText').textContent=Math.floor(p.stamina);
  $('staminaFill').classList.toggle('energy-denied',!!p.feedback?.energy&&game.time-p.feedback.at<.7);
  $('foodText').textContent=p.food>0?`Сытость · ${Math.floor(p.food/60)}:${String(Math.floor(p.food%60)).padStart(2,'0')}`:'Голод · здоровье убывает';
  $('buffText').textContent='';
  $('statusEffects').innerHTML=G.statusEffects(game).map(effect=>`<button type="button" class="status-icon ${effect.kind}" aria-label="${escape(effect.name)}" data-tooltip="${escape(effect.name)}">${icon(effect.icon)}${effect.seconds?`<small>${effect.seconds<60?`${Math.ceil(effect.seconds)}с`:`${Math.ceil(effect.seconds/60)}м`}</small>`:''}</button>`).join('');
  $('clock').textContent=`${night?'Ночь':'День'} ${Math.floor(game.time/G.DAY)+1}`;
  $('sun').textContent=night?'☾':'☀';
  $('phase').textContent=`${night?'До рассвета':'До ночи'} ${Math.floor((night?G.DAY-phase:300-phase)/60)}:${String(Math.floor((night?G.DAY-phase:300-phase)%60)).padStart(2,'0')} · ${G.BIOME_NAMES[G.biomeAt(p.x,p.y)]}`;
  const objective=nextObjective(game);
  $('objectiveTitle').textContent=objective[0];
  $('objectiveText').textContent=online?.error?'Связь: '+online.error:objective[1];
  $('interact').innerHTML=icon(context?.kind==='resource'?context.type:context?.kind==='part'?context.type:context?.kind==='note'?'journal':context?.kind==='grave'?'bag':'hand')+`<small>Действие<span class="keyboard-label"> · E</span></small>`;
  $('interact').disabled=game.player.dead;
  $('block').innerHTML=icon(G.usingShield(p)?'shield':'hand')+`<small>Блок<span class="keyboard-label"> · Q</span></small>`;
  $('attack').innerHTML=icon(G.weaponOwned(p)?p.weapon:'hand')+'<small>Удар<span class="keyboard-label"> · Пробел</span></small>';

  const invaders=G.invaders(game).length,raiders=game.enemies.filter(e=>e.raid&&!e.dead).length;
  $('raid').classList.toggle('hidden',!game.raidPending&&!raiders&&!invaders);
  $('raid').textContent=game.raidPending?`Вой в лесу · нападение через ${Math.ceil(game.raidWarning)} с`:`Дом под угрозой · внутри: ${invaders} · нападающих: ${raiders}`;
  const boss=game.enemies.filter(e=>e.type==='boss'&&!e.dead).sort((a,b)=>G.distance(p,a)-G.distance(p,b))[0];
  $('bossHud').classList.toggle('hidden',!boss||boss.dead||G.distance(p,boss)>17);
  if(boss){
    $('bossName').textContent=G.BOSSES.find(b=>b.biome===(boss.biome||'forest')).name;
    $('bossFill').style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`;
    $('bossPhase').textContent=boss.phase==='windup'?({ranged:'Залп — двигайтесь в сторону',slam:'Круговой удар — отступите',swipe:'Замах — выйдите из сектора',frostwave:'Ледяная волна — внутрь кольца',meteor:'Метеор — уйдите с отметки',summon:'Призыв помощников'})[boss.attackKind]||'Замах':boss.hp<boss.maxHp*.5?'Ярость йотуна':'Страж мирового древа';
  }
  $('buildBanner').classList.toggle('hidden',!buildType);
  $('turnBuild').textContent=buildEdge===null?'Ребро: авто':'Ребро '+(buildEdge+1)+' ↻';
  if(buildType){
    const plan=buildDrag&&buildType!=='remove'?placementPlan(game,buildType,buildDrag.start,buildDrag.end,buildEdge):[];
    $('buildHint').innerHTML=buildType==='remove'?'Коснитесь части для разборки':`${G.PARTS[buildType].name} · ${plan.length?(plan.some(p=>p.replaces)?'Замена · доплата/возврат: ':'частей: '+plan.length+' · ')+costText(planCost(plan,G.PARTS)):buildType==='door'?'коснитесь стены или свободного ребра':G.PARTS[buildType].solid?'протяните по полам или коснитесь ребра':'выберите место'}`;
  }
  const event=game.events.at(-1);
  if(event&&event.id!==lastEvent){
    lastEvent=event.id;
    $('toast').textContent=event.text;
    toastUntil=performance.now()+5000;
  }
  $('toast').style.opacity=performance.now()<toastUntil?'1':'0';
}
function frame(now){
  const dt=lastFrame?Math.min(.1,(now-lastFrame)/1000):0;
  lastFrame=now;
  pauseState();
  let sx=(joy?.x||0)+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),sy=(joy?.y||0)+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
  if(keys.has('q')||touchBlock||keys.has(' '))autoRun=false;
  if(Math.hypot(sx,sy)>.1){const length=Math.hypot(sx,sy);runHeading={x:sx/length,y:sy/length};}
  else if(autoRun){sx=runHeading.x;sy=runHeading.y;}
  input.sprint=autoRun||!!joy?.sprint||keys.has('shift');
  $('autoRun').setAttribute?.('aria-pressed',String(autoRun));
  const move=movementVector(sx,sy);
  input.x=move.x;
  input.y=move.y;
  input.block=touchBlock||keys.has('q');
  if(canControl()&&(touchInteract||keys.has('e'))){const target=G.context(game);if(target?.kind==='resource'&&target.ready<=game.time)G.interact(game);}
  const oldX=game.player.x,oldY=game.player.y;
  if(online)online.update(now,game.paused||document.hidden?{}:input);else G.tick(game,dt,input);
  if(started&&!game.paused&&(oldX!==game.player.x||oldY!==game.player.y)&&game.time-lastStep>.36){G.sound(game,'step');lastStep=game.time;}
  audio.update(game,started&&!document.hidden);
  if(game.player.dead&&panelName!=='death'){
    safeSave();
    openPanel('death');
  }
  const preview=buildType&&buildType!=='remove'&&(buildDrag||pointer)?placementPlan(game,buildType,buildDrag?.start||renderer.world(pointer.x,pointer.y),buildDrag?.end||renderer.world(pointer.x,pointer.y),buildEdge):null;
  const diagnostic=online?.diagnostics;
  diagnostic?.frame(now,game.player);
  const drawStart=diagnostic?.enabled?performance.now():0;
  const visualGame=online?online.presentation.draw(game,now):game;
  renderer.draw(visualGame,buildType,pointer,buildEdge,preview);
  diagnostic?.visualFrame(now,visualGame.player);
  if(diagnostic?.enabled)diagnostic.drawn(performance.now()-drawStart);
  if(now-diagnosticsAt>500){diagnosticsAt=now;$('onlineDiagnostics').hidden=!diagnostic?.enabled;if(diagnostic?.enabled)$('diagnosticsReadout').textContent=diagnostic.report(now);}
  if(now-lastHud>100){
    hud();
    lastHud=now;
  }
  if(started&&!game.paused){
    saveClock+=dt;
    if(saveClock>10){
      saveClock=0;
      safeSave();
    }
  }
  if(panelName==='map'&&now-mapRefreshAt>500){mapRefreshAt=now;drawMap();}
  requestAnimationFrame(frame);
}
installTooltips({root:document,tip:$('gameTooltip'),toggle:$('tooltipToggle'),message:()=>online?'Подсказки: нажмите на элемент. Онлайн-мир продолжает жить! × — выйти.':'Подсказки: нажмите на элемент. Игра на паузе. × — продолжить.',onMode:on=>{helpMode=on;clearInput();pauseState();}});
openPanel('intro');
requestAnimationFrame(frame);
