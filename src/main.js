import { hexRound, fromPlane, wallDistance } from './hex.js';
import { bindPointer, installGestureGuard } from './input.js';
import * as G from './game.js';
import {
  Renderer
}
from './render.js';
const $=id=>document.getElementById(id),canvas=$('world'),renderer=new Renderer(canvas);
const SAVE_KEY='forest-hearth-v1';
let game=G.createGame(),started=false,panelName=null,buildType=null,buildEdge=0,pointer=null,joy=null,lastFrame=0,lastHud=0,saveClock=0,lastEvent=0,toastUntil=0,saveError='',knownSave=false;
const input={
  x:0,y:0,block:false
},keys=new Set();
let touchBlock=false;
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
function safeSave(){
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
  return Object.entries(cost).map(([k,v])=>`${G.ITEMS[k]} ${v}`).join(' · ');
}
function stock(inv=game.player.inv){
  return Object.entries(inv).filter(([,v])=>v>0).map(([k,v])=>`${G.ITEMS[k]||k}: ${v}`).join(' · ')||'Пока пусто';
}
function button(text,action,cls=''){
  return `<button class="${cls}" data-action="${action}">${text}</button>`;
}
function title(text){
  return `<div class="panel-head"><h2 id="panelTitle">${text}</h2><button data-action="close" aria-label="Закрыть">×</button></div>`;
}
const pointerBindings=[];
installGestureGuard([canvas, $('hud')]);
function clearInput(){
  for (const control of pointerBindings) control.reset();
  keys.clear();
  input.x=0;
  input.y=0;
  input.block=false;
  touchBlock=false;
  joy=null;
  $('stick').style.transform='';
  document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));
}
function pauseState(){
  game.paused=!started||!!panelName||document.hidden||matchMedia('(orientation: portrait) and (max-width: 700px)').matches;
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
    html=`<div class="intro"><span class="seal">ᛟ</span><div class="eyebrow">ОДИНОЧНОЕ ПРИКЛЮЧЕНИЕ</div><h1 id="panelTitle">Лесной очаг</h1><p class="lead">Лес помнит тех, кто вошёл.<br>Постройте место, в которое сможете вернуться.</p><div class="features"><span>⌂ Свой дом</span><span>☽ Опасные ночи</span><span>ᚱ Тайны леса</span></div><p>Собирайте припасы, обустройте убежище и найдите древнего хранителя. Ночью лес становится опаснее. Все действия происходят только пока вы играете.</p><div class="row">${button(knownSave?'Продолжить путь':'Войти в лес','play','primary')}${knownSave?button('Новый путь','new-confirm','secondary'):''}${button('Управление','help','secondary')}</div>${saveError?`<p class="notice">${escape(saveError)}</p>`:''}<footer>Лесная проверка · обычная сложность · без аккаунта</footer></div>`;
  }
  else if(panelName==='bag'){
    html=title('Сумка')+`<p class="muted">Содержимое сумки останется на месте гибели. Сундук дома сохраняет запасы.</p><div class="cards">`+Object.entries(p.inv).filter(([,v])=>v>0).map(([k,v])=>`<article class="card"><h3>${G.ITEMS[k]} <small>×${v}</small></h3>${G.FOODS[k]?`<p>Сытость ${G.FOODS[k].sat/60} мин${G.FOODS[k].buff?` · +${G.FOODS[k].hp} к максимуму здоровья на ${G.FOODS[k].buff/60} мин`:''}</p>${button('Съесть',`eat:${k}`)}`:['sword','bow'].includes(k)?`<p>${k==='bow'?'Дальний бой, расходует стрелы':'Меч: направленный взмах с коротким замахом'}</p>${button(p.weapon===k?'В руках':'Взять в руки',`equip:${k}`)}`:k==='armor'?`<p>Снижает урон. Прочность ${Math.floor(p.durability)}%.</p>${button('Починить у верстака · 2 шкуры','armor-repair')}`:'<p>Материал для выживания и развития дома.</p>'}</article>`).join('')+'</div>';
  }
  else if(panelName==='build'){
    html=title('Ваш дом')+`<p>Один участок, свободная планировка. Пол → стены с дверью → очаг и оборудование. Постройка защищает, когда контур стен закрыт.</p><div class="stock">${stock()}</div>`;
    if(!game.home)html+=`<div class="notice">Отметьте участок там, где стоите. Гексагональный участок радиусом 5 клеток. Стоимость: 4 дерева. Перенос в лесной версии недоступен.</div><br>${button('Отметить участок','claim','primary')}`;
    else html+=`<div class="notice">Сила дома: ${G.homeValue(game)}. Разрушители приходят от 28. Пол, обычные стены и украшения не усиливают набеги.</div><br><div class="cards">`+Object.entries(G.PARTS).map(([k,d])=>`<article class="card"><h3>${d.name}</h3><p>${d.desc}</p><small>${costText(d.cost)}</small>${button('Разместить',`place:${k}`,G.afford(p.inv,d.cost)?'available':'')}</article>`).join('')+`</div><hr><div class="row">${button('Ремонтировать рядом · 2 дерева','repair','secondary')}${button('Разобрать часть → вернуть 50%','demolish','secondary')}</div>`;
  }
  else if(panelName==='craft'){
    html=title('Мастерская')+`<p>Готовьте снаряжение и еду у оборудования дома. Если рядом монстры, сначала освободите рабочее место.</p><div class="stock">${stock()}</div><div class="cards">`+Object.entries(G.RECIPES).map(([k,r])=>`<article class="card"><h3>${G.ITEMS[k]} ${r.count>1?`×${r.count}`:''}</h3><p>${G.PARTS[r.station].name} ${G.station(game,r.station)?'· рядом':'· подойдите ближе'}</p><small>${costText(r.cost)}</small>${button('Создать',`craft:${k}`,G.afford(p.inv,r.cost)&&G.station(game,r.station)?'available':'')}</article>`).join('')+'</div>';
  }
  else if(panelName==='skills'){
    html=title('Навыки')+`<p>Навыки растут от действий. Выбранное направление получает полный опыт, остальные — 20%. Общий предел — 150 очков: сосредоточение выгоднее.</p><div class="cards">`+Object.entries(G.SKILLS).map(([k,name])=>`<article class="card"><h3>${name} · ${p.skills[k].toFixed(1)}</h3><div class="skillbar"><i style="width:${p.skills[k]}%"></i></div><p>${k==='guard'?'Улучшает защиту и расход выносливости при блоке. Растёт в столкновениях.':'Каждое очко увеличивает урон оружия на 1,6%.'}</p>${button(p.focus===k?'Основное направление':'Сосредоточиться',`focus:${k}`)}</article>`).join('')+`</div><hr><h3>Перераспределение у верстака</h3><p>Переносит до 10 очков с потерей 20%. Исходный навык ослабевает. Смена направления обучения сама по себе не переносит опыт.</p><div class="row"><label>Из <select id="fromSkill">${Object.entries(G.SKILLS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>В <select id="toSkill">${Object.entries(G.SKILLS).map(([k,v])=>`<option value="${k}" ${k==='bow'?'selected':''}>${v}</option>`).join('')}</select></label>${button('Перенести с потерей','transfer','danger')}</div>`;
  }
  else if(panelName==='storage'){
    html=title('Хранилище')+`<p>Рядом с сундуком не должно быть монстров. Вещи внутри не исчезают при нападениях.</p><h3>В сундуке</h3><div class="stock">${stock(game.storage)}</div><h3>При себе</h3><div class="stock">${stock()}</div><div class="row">${button('Оставить ресурсы и еду','deposit','primary')}${button('Взять запасы','withdraw','secondary')}</div>`;
  }
  else if(panelName==='journal'){
    html=title('Находки')+`<p>Лес оставил записи. Внимательное чтение помогает понять его обитателей.</p>`+(game.notes.length?game.notes.map(i=>`<article class="card"><h3>${G.NOTES[i].title}</h3><p>${G.NOTES[i].text}</p></article>`).join('<br>'):'<div class="notice">У начала тропы стоит камень с надписью.</div>');
  }
  else if(panelName==='map'){
    html=title('Лес')+`<canvas id="mapCanvas" class="map-canvas" aria-label="Карта леса"></canvas><p class="muted">Светлая точка — вы · золотой участок — дом · красная точка — древний круг · сиреневые — потерянные вещи.</p>`;
  }
  else if(panelName==='death'){
    html=`<div class="eyebrow">ПУТЬ НЕ ЗАКОНЧЕН</div><h2 id="panelTitle">Лес забрал своё</h2><p>Ваши вещи остались на месте гибели. Навыки и запасы дома сохранены. Хранитель восстановил здоровье.</p><div class="row">${button('Возродиться на старте','respawn:start','primary')}${game.parts.some(v=>v.type==='bed'&&v.hp>0)?button('Возродиться дома','respawn:home','secondary'):''}</div><p class="muted">Дом может быть занят монстрами. Выбор старта всегда доступен.</p>`;
  }
  else if(panelName==='pause'){
    html=title('У огня времени')+`<p>Игра на паузе. День, голод и нападения остановлены.</p><div class="row">${button('Продолжить','close','primary')}${button('Сохранить','save','secondary')}${button('Копия сохранения','export','secondary')}${button('Управление','help','secondary')}</div><hr><label>Восстановить из файла <input id="importFile" type="file" accept="application/json,.json"></label><p class="muted">Импорт заменит текущий мир только после подтверждения. Локальное сохранение принадлежит этому браузеру; очистка его данных удаляет прогресс.</p><hr>${button('Начать новый путь','new-confirm','danger secondary')}${saveError?`<p class="notice">${escape(saveError)}</p>`:''}`;
  }
  else if(panelName==='help'){
    html=title('Как играть')+`<div class="keyhelp"><span>Левый круг / WASD — движение</span><span>Удар / Пробел — атака ближайшей цели</span><span>Блок / удержание Q — защита</span><span>Действие / E — собрать, открыть, прочитать</span><span>Карта / M · Пауза / Esc</span></div><hr><p>Соберите дерево и камень вокруг тропы. В меню строительства отметьте участок и поставьте пол. Затем разместите стены по краям, дверь и очаг. Для строительства выберите деталь и коснитесь гекса мира; направление стены меняет кнопка «Повернуть» или R. Двигаться при этом можно левым кругом.</p><p>У верстака создайте меч, лук, стрелы и броню. Еду можно съесть в сумке. У очага в закрытом доме здоровье восстанавливается, если вы сыты и рядом нет монстров. Короткая вспышка перед атакой противника — время решить, блокировать ли или отступить.</p><p>Нападение начнётся после предупреждения. Закрытая дверь удерживает обычных врагов; развитый дом привлекает разрушителей. Кнопка действия работает с ближайшим объектом — подойдите непосредственно к нужному.</p><div class="row">${button(started?'Вернуться в игру':'К началу',started?'close':'intro','primary')}</div>`;
  }
  else if(panelName==='new-confirm'){
    html=title('Начать заново?')+`<p>Текущий мир будет заменён. Если он нужен, сначала сохраните копию через меню паузы.</p><div class="row">${button('Заменить мир','new','danger secondary')}${button('Отмена',started?'pause':'intro','primary')}</div>`;
  }
  const latest=game.events.at(-1);
  if(latest&&!['intro','help','death'].includes(panelName))html+=`<p class="notice" role="status">${escape(latest.text)}</p>`;
  $('panel').innerHTML=html;
  if(panelName==='map')renderer.map($('mapCanvas'),game);
  $('importFile')?.addEventListener('change',async event=>{
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
function start(){
  started=true;
  closePanel();
  safeSave();
}
function refreshPanel(){
  if(panelName)renderPanel();
  hud();
}
$('panel').addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');
  if(!b)return;
  const [act,arg]=b.dataset.action.split(':');
  if(act==='close'){
    if(!started)openPanel('intro');
    else if(game.player.dead)openPanel('death');
    else closePanel();
    return;
  }
  if(['intro','pause','help','new-confirm'].includes(act)){
    openPanel(act);
    return;
  }
  if(act==='play'){
    start();
    return;
  }
  if(act==='new'){
    game=G.createGame();
    renderer.camera={
      ...G.START
    };
    lastEvent=0;
    buildType=null;
    start();
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
    game.player.weapon=arg;
    refreshPanel();
  }
  if(act==='focus'){
    game.player.focus=arg;
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
    a.download='forest-hearth-save.json';
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
$('turnBuild').onclick=()=>{buildEdge=(buildEdge+1)%6;hud();};
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
bindAction('attack', () => G.attack(game));

bindAction('interact', doInteract);
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
  joy.x = x; joy.y = y;
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
    const raw=renderer.world(event.clientX,event.clientY),point=hexRound(raw.x,raw.y);
    if (buildType === 'remove') {
      const part=game.parts.filter(o=>G.PARTS[o.type].solid?wallDistance(o,raw)<.22:o.x===point.x&&o.y===point.y).sort((a,b)=>(a.type==='floor')-(b.type==='floor'))[0];
      if (part) G.removePart(game, part.id);
    } else G.build(game, buildType, point.x, point.y,buildEdge);
    safeSave();
  },
  move: event => { pointer = { x: event.clientX, y: event.clientY }; },
}));
window.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  const k=e.key.toLowerCase();
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
  if(k==='r'&&buildType)buildEdge=(buildEdge+1)%6;
  if(k==='e')doInteract();
  if(k==='b')openPanel('build');
  if(k==='i')openPanel('bag');
  if(k==='m')openPanel('map');
  if(k==='c')openPanel('craft');
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{
  clearInput();
  if(started&&!game.player.dead){
    safeSave();
    openPanel('pause');
  }
});
document.addEventListener('visibilitychange',()=>{
  clearInput();
  if(document.hidden&&started)safeSave();
  pauseState();
  lastFrame=performance.now();
});
window.addEventListener('pagehide',()=>{
  if(started)safeSave();
});
window.addEventListener('resize',()=>{
  renderer.resize();
  clearInput();
  pauseState();
});
function hud(){
  const p=game.player,max=G.maxHp(game),phase=game.time%G.DAY,night=G.isNight(game),context=G.context(game);
  $('hpFill').style.width=`${Math.max(0,p.hp/max*100)}%`;
  $('hpText').textContent=`${Math.ceil(p.hp)}`;
  $('staminaFill').style.width=`${p.stamina}%`;
  $('staminaText').textContent=Math.floor(p.stamina);
  $('foodText').textContent=p.food>0?`Сытость · ${Math.floor(p.food/60)}:${String(Math.floor(p.food%60)).padStart(2,'0')}`:'Голод · здоровье убывает';
  $('buffText').textContent=p.buff>0?`Пища: +${p.foodBonus} здоровья · ${Math.ceil(p.buff/60)} мин`:'';
  $('clock').textContent=`${night?'Ночь':'День'} ${Math.floor(game.time/G.DAY)+1}`;
  $('sun').textContent=night?'☾':'☀';
  $('phase').textContent=`${night?'До рассвета':'До ночи'} ${Math.floor((night?G.DAY-phase:300-phase)/60)}:${String(Math.floor((night?G.DAY-phase:300-phase)%60)).padStart(2,'0')} · лес`;
  let objective=['Свой угол в лесу','Соберите дерево, отметьте участок'];
  if(game.home)objective=['Первые стены','Пол, замкнутые стены, дверь и очаг'];
  if(game.parts.some(p=>p.type==='fire'))objective=['Подготовка к вылазке','Верстак, снаряжение и еда'];
  if(p.inv.sword||p.inv.bow)objective=['Древний круг','Исследуйте лес к северо-востоку'];
  if(game.bossDefeated)objective=['Лес помнит вас','Хранитель повержен. Развивайте дом'];
  $('objectiveTitle').textContent=objective[0];
  $('objectiveText').textContent=objective[1];
  $('interact').innerHTML=`${context?escape(context.label):'Действие'}<small>E</small>`;
  $('interact').disabled=!context;
  $('attack').innerHTML=`${p.weapon==='bow'&&p.inv.bow?'Выстрел':'Удар'}<small>Пробел</small>`;

  const invaders=G.invaders(game).length,raiders=game.enemies.filter(e=>e.raid&&!e.dead).length;
  $('raid').classList.toggle('hidden',!game.raidPending&&!raiders&&!invaders);
  $('raid').textContent=game.raidPending?`Вой в лесу · нападение через ${Math.ceil(game.raidWarning)} с`:`Дом под угрозой · внутри: ${invaders} · нападающих: ${raiders}`;
  const boss=game.enemies.find(e=>e.type==='boss');
  $('bossHud').classList.toggle('hidden',!boss||boss.dead||G.distance(p,boss)>10);
  if(boss){
    $('bossFill').style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`;
    $('bossPhase').textContent=boss.hp<boss.maxHp*.5?'Лес пробудился':'Старые корни';
  }
  $('buildBanner').classList.toggle('hidden',!buildType);
  if(buildType)$('buildHint').textContent=buildType==='remove'?'Коснитесь части для разборки · возврат 50%':`${G.PARTS[buildType].name} · ребро ${buildEdge+1} · ${costText(G.PARTS[buildType].cost)} · коснитесь клетки`;
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
  const sx=(joy?.x||0)+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),sy=(joy?.y||0)+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
  const move=fromPlane(sx+sy*2,-sx+sy*2);
  input.x=move.x;
  input.y=move.y;
  input.block=touchBlock||keys.has('q');
  G.tick(game,dt,input);
  if(game.player.dead&&panelName!=='death'){
    safeSave();
    openPanel('death');
  }
  renderer.draw(game,buildType,pointer,buildEdge);
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
  requestAnimationFrame(frame);
}
openPanel('intro');
requestAnimationFrame(frame);
