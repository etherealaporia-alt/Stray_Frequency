export type UILayout = {
  barPosition: 'top' | 'bottom';
  sidebarSide: 'left' | 'right';
  mainOrder: 'scene-chat' | 'chat-scene';
  sidebarOrder: 'character-tabs' | 'tabs-character';
};
const STORAGE_KEY = 'stray-frequency.ui-layout.v1';
export const DEFAULT_UI_LAYOUT: UILayout = { barPosition:'bottom', sidebarSide:'right', mainOrder:'scene-chat', sidebarOrder:'character-tabs' };
function valid(v: unknown): v is UILayout {
  if (!v || typeof v !== 'object') return false;
  const x=v as Partial<UILayout>;
  return (x.barPosition==='top'||x.barPosition==='bottom') &&
    (x.sidebarSide==='left'||x.sidebarSide==='right') &&
    (x.mainOrder==='scene-chat'||x.mainOrder==='chat-scene') &&
    (x.sidebarOrder==='character-tabs'||x.sidebarOrder==='tabs-character');
}
export function loadUILayout(): UILayout {
  try { const raw=localStorage.getItem(STORAGE_KEY); if (!raw) return {...DEFAULT_UI_LAYOUT}; const v:unknown=JSON.parse(raw); return valid(v)?v:{...DEFAULT_UI_LAYOUT}; }
  catch { return {...DEFAULT_UI_LAYOUT}; }
}
export function saveUILayout(v:UILayout):void { localStorage.setItem(STORAGE_KEY,JSON.stringify(v)); }
export function applyUILayout(v:UILayout):void {
  const app=document.querySelector<HTMLElement>('#app'); if(!app)return;
  app.dataset.barPosition=v.barPosition; app.dataset.sidebarSide=v.sidebarSide;
  app.dataset.mainOrder=v.mainOrder; app.dataset.sidebarOrder=v.sidebarOrder;
}
export function resetUILayout():UILayout { const v={...DEFAULT_UI_LAYOUT}; saveUILayout(v); applyUILayout(v); return v; }
