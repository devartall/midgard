// No simulation, localStorage or autosave in this isolated visual regression fixture.
import {applyHudLayout,auditHud} from '../src/layout.js';
import {icon} from '../src/icons.js';
const $=id=>document.getElementById(id);
$('panel').innerHTML=`<div class="panel-head"><h2 id="panelTitle">Сумка странника</h2><button class="close-button" aria-label="Закрыть"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div class="inventory-layout"><div class="inventory-grid">${Array.from({length:24},(_,i)=>`<button class="item-slot">${icon(i%2?'wood':'potion')}<span>Зелье здоровья</span><b>999</b></button>`).join('')}</div><aside class="item-detail">${icon('potion','detail-icon')}<h3>Зелье здоровья</h3><p>Восстанавливает 40 здоровья. Между применениями — 20 секунд.</p><button>Выпить</button><div class="slot-assign">${Array.from({length:9},(_,i)=>`<button>${i+1}</button>`).join('')}</div></aside></div>`;
$('quickbar').innerHTML=Array.from({length:9},(_,i)=>`<button class="quick-slot"><kbd>${i+1}</kbd>${icon(i%2?'potion':'sword')}<b>999</b></button>`).join('');
for(const b of document.querySelectorAll('[data-panel]'))b.innerHTML=icon(b.dataset.panel)+`<span>${b.dataset.panel==='build'?'Строить':'Сумка'}</span>`;
$('attack').innerHTML=icon('sword')+'<small>Удар · Пробел</small>';
$('block').innerHTML=icon('guard')+'<small>Блок · Q</small>';
$('interact').innerHTML=icon('wood')+'<small>Рубить: Дерево · E</small>';
$('foodText').textContent='Сытость ещё 45 мин';$('buffText').textContent='Бонус здоровья +40 · 14 мин';
$('bossPhase').textContent='Лес пробудился';
window.runLayoutCase=async({width,height,mode,insets})=>{
 const hud=$('hud');hud.style.padding=`${8+(insets.top||0)}px ${8+(insets.right||0)}px ${8+(insets.bottom||0)}px ${8+(insets.left||0)}px`;
 applyHudLayout(hud,width,height,insets);document.documentElement.style.setProperty('--ui-height',height+'px');
 hud.dataset.mode=mode==='building'?'building':'playing';
 $('toast').textContent='Лесная похлёбка: сытость 45 мин, бонус здоровья 15 мин.';$('toast').style.opacity='1';
 $('raid').classList.remove('hidden');$('raid').textContent='Дом под угрозой · внутри: 5 · нападающих: 8';$('bossHud').classList.remove('hidden');
 $('buildBanner').classList.toggle('hidden',mode!=='building');$('buildHint').textContent='Укрепление · 34 части · камень 170 · дерево 68';
 $('overlay').classList.toggle('hidden',mode!=='inventory');
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 return auditHud(document);
};
