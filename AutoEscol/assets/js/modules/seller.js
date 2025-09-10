
const KEY = 'autoescolaSellerCfgV1';
export function loadSellerCfg(){
  try{ const raw = localStorage.getItem(KEY); return raw? JSON.parse(raw): { Ewerton:{meta:0, comissao:0}, Darlan:{meta:0, comissao:0} }; }catch(e){ return { Ewerton:{meta:0, comissao:0}, Darlan:{meta:0, comissao:0} }; }
}
export function saveSellerCfg(cfg){
  try{ localStorage.setItem(KEY, JSON.stringify(cfg)); }catch(e){}
}
export function initSellerCfg(){
  const cfg = loadSellerCfg();
  const $ = id => document.getElementById(id);
  $('#btnSaveSellerCfg')?.addEventListener('click', ()=>{
    const vend = $('#cfgVend').value;
    const meta = parseInt($('#cfgMeta').value||'0',10);
    const com = parseFloat($('#cfgComissao').value||'0');
    cfg[vend] = { meta, comissao: com };
    saveSellerCfg(cfg);
    alert('Configurações salvas para ' + vend);
  });
}
