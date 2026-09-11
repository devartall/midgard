// One layout budget for every HUD region. CSS consumes these exact dimensions.
export function hudLayout(width,height,insets={}) {
  const pad={left:8+(insets.left||0),right:8+(insets.right||0),top:8+(insets.top||0),bottom:8+(insets.bottom||0)};
  const w=Math.max(1,width-pad.left-pad.right),h=Math.max(1,height-pad.top-pad.bottom);
  const short=h<340,compact=h<360||w<760,gap=short?4:6;
  const side=Math.min(compact?120:136,Math.max(100,w*.21));
  const header=short?28:32,status=short?78:132;
  const toast=36,bar=short?32:36,nav=short?28:32,dock=toast+bar+nav+gap*2;
  const middle=Math.max(0,h-header-dock-gap*2),center=w-side*2-gap*2;
  const x=pad.left+side+gap,bottom=height-pad.bottom,top=pad.top;
  const rect=(x,y,width,height)=>({x,y,width,height});
  return {density:short?'short':compact?'compact':'regular',side,header,status:Math.min(status,middle),middle,toast,bar,nav,dock,gap,pad,
    regions:{header:rect(pad.left,top,w,header),vitals:rect(pad.left,top+header+gap,side,Math.min(status,middle)),objective:rect(width-pad.right-side,top+header+gap,side,Math.min(status,middle)),alerts:rect(x,top+header+gap,center,middle),movement:rect(pad.left,bottom-dock,side,dock),combat:rect(width-pad.right-side,bottom-dock,side,dock),toast:rect(x,bottom-dock,center,toast),quickbar:rect(x,bottom-nav-gap-bar,center,bar),navigation:rect(x,bottom-nav,center,nav)}};
}
export function applyHudLayout(hud,width,height,insets={}){
  const layout=hudLayout(width,height,insets);hud.dataset.density=layout.density;
  const props={'--ui-height':height,'--hud-side':layout.side,'--hud-header':layout.header,'--hud-status':layout.status,'--hud-middle':layout.middle,'--hud-toast':layout.toast,'--hud-bar':layout.bar,'--hud-nav':layout.nav,'--hud-dock':layout.dock,'--hud-gap':layout.gap};
  for(const [key,n]of Object.entries(props)){if(hud.style.setProperty)hud.style.setProperty(key,`${n}px`);else hud.style[key]=`${n}px`;}
  return layout;
}
export function overlap(a,b,tolerance=.5){return Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>tolerance&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>tolerance;}
// Browser-side audit used by tools/layout-check.html. Backgrounds/containers are excluded.
export const HUD_TARGETS=['.topbar','.vitals','.objective','#raid','#bossHud','#buildBanner','#toast','#quickbar','.bottom-nav','#joystick','.combat'];
export function auditHud(doc){
  const items=HUD_TARGETS.map(selector=>({selector,node:doc.querySelector(selector)})).filter(({node})=>node&&node.getClientRects().length&&!node.closest('.hidden'));
  const errors=[];const view=doc.defaultView,w=view.innerWidth,h=view.visualViewport?.height||view.innerHeight;
  for(const item of items){item.rect=item.node.getBoundingClientRect();const r=item.rect;if(r.x<-.5||r.y<-.5||r.right>w+.5||r.bottom>h+.5)errors.push(`${item.selector}: outside viewport`);}
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)if(overlap(items[i].rect,items[j].rect))errors.push(`${items[i].selector} overlaps ${items[j].selector}`);
  for(const selector of ['.panel-head','.slot-assign','.quickbar','.combat','.bottom-nav']){
    const parent=doc.querySelector(selector);if(!parent||!parent.getClientRects().length)continue;
    const buttons=[...parent.querySelectorAll('button')].filter(n=>n.getClientRects().length);
    for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++)if(overlap(buttons[i].getBoundingClientRect(),buttons[j].getBoundingClientRect()))errors.push(`${selector}: buttons overlap`);
  }
  const close=doc.querySelector('.close-button'),glyph=close?.querySelector('svg');
  if(close?.getClientRects().length&&glyph){const a=close.getBoundingClientRect(),b=glyph.getBoundingClientRect();if(Math.abs(a.x+a.width/2-b.x-b.width/2)>.5||Math.abs(a.y+a.height/2-b.y-b.height/2)>.5)errors.push('close icon is not centred');}
  return errors;
}
