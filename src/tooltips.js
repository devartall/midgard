export function tooltipText(node){
 if(!node)return '';
 const own=node.dataset?.tooltip||node.getAttribute?.('title')||node.getAttribute?.('aria-label');
 if(own)return own;
 const card=node.closest?.('.card');
 if(card)return [card.querySelector('h3')?.textContent,card.querySelector('p')?.textContent,node.textContent].filter(Boolean).join(' · ');
 return node.textContent?.trim()||'';
}
export function tooltipPosition(rect,width,height,viewport){
 const gap=10,left=viewport.offsetLeft||0,top=viewport.offsetTop||0;
 return {left:Math.max(left+gap,Math.min(rect.left+rect.width/2-width/2,left+viewport.width-width-gap)),top:Math.max(top+gap,Math.min(rect.top-height-gap>=top+gap?rect.top-height-gap:rect.bottom+gap,top+viewport.height-height-gap))};
}
export function installTooltips({root,tip,toggle,onMode=()=>{},message=()=> 'Подсказки: нажмите на предмет или кнопку. Игра на паузе. Нажмите ×, чтобы продолжить.'}){
 let inspecting=false,anchor=null;
 const selector='[data-tooltip],[title],button,input,select,[role="img"],.recipe-icon';
 const find=event=>event.target.closest?.(selector);
 const hide=()=>{tip.hidden=true;anchor?.removeAttribute?.('aria-describedby');anchor=null;};
 const show=node=>{
  const text=tooltipText(node);if(!text)return hide();
  hide();anchor=node;tip.textContent=text;tip.hidden=false;node.setAttribute?.('aria-describedby',tip.id);
  const v=globalThis.visualViewport||{width:innerWidth,height:innerHeight};
  const p=tooltipPosition(node.getBoundingClientRect(),tip.offsetWidth,tip.offsetHeight,v);
  tip.style.left=p.left+'px';tip.style.top=p.top+'px';
 };
 const mode=on=>{inspecting=on;toggle.setAttribute?.('aria-pressed',String(on));toggle.textContent=on?'×':'?';onMode(on);hide();if(on){tip.textContent=message();tip.hidden=false;tip.style.left='12px';tip.style.top='64px';}};
 toggle.addEventListener('click',()=>mode(!inspecting));
 root.addEventListener('pointerover',e=>{if(e.pointerType==='mouse'&&!inspecting)show(find(e));});
 root.addEventListener('pointerout',()=>{if(!inspecting)hide();});
 root.addEventListener('focusin',e=>show(find(e)));
 root.addEventListener('focusout',()=>{if(!inspecting)hide();});
 for(const type of ['pointerdown','pointerup','click'])root.addEventListener(type,e=>{
  if(!inspecting||e.target.closest?.('#tooltipToggle'))return;
  e.preventDefault();e.stopImmediatePropagation();if(type==='pointerdown')show(find(e));
 },true);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){if(inspecting){e.preventDefault();e.stopImmediatePropagation();mode(false);}else hide();}else if(inspecting&&e.key!=='Tab'&&!e.target.closest?.('#tooltipToggle')){e.preventDefault();e.stopImmediatePropagation();}},true);
 root.addEventListener('scroll',hide,true);
 return {hide,close:()=>mode(false)};
}
