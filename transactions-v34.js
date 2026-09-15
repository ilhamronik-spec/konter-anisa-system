/* Konter Anisa V34 — Global admin override policy */
(() => {
  'use strict';
  const prefixes=['dana','qrisDana','qrisBank','tarikBca','transferBca'];
  const defaults={};
  const byId=id=>document.getElementById(id);
  const raw=input=>String(input?.value??'').trim();
  const amountOf=prefix=>typeof moneyValue==='function'?moneyValue(byId(prefix+'Amount')):0;
  const adminOf=prefix=>typeof moneyValue==='function'?moneyValue(byId(prefix+'Admin')):0;
  const fmtLocal=n=>typeof fmt==='function'?fmt(n):String(n||0);

  function hasNominal(prefix){ return amountOf(prefix)>0; }
  function markManual(prefix){ const input=byId(prefix+'Admin'); if(input) input.dataset.adminManual='1'; }
  function isManual(prefix){ return byId(prefix+'Admin')?.dataset.adminManual==='1'; }
  function clearManual(prefix){ const input=byId(prefix+'Admin'); if(input) delete input.dataset.adminManual; }

  function setReasonVisibility(prefix,show){ const wrap=byId(prefix+'ReasonWrap'); if(wrap) wrap.style.display=show?'block':'none'; }

  window.checkAdminOverride=function(prefix,blocked=false){
    const input=byId(prefix+'Admin');
    if(!input) return;
    const def=defaults[prefix];
    const hasAmount=hasNominal(prefix);
    const isBlank=raw(input)==='';
    const actual=adminOf(prefix);
    const changed=hasAmount && (isBlank || (def!==null && def!==undefined && actual!==def));
    setReasonVisibility(prefix,changed && !blocked);

    const status=byId(prefix+'Status');
    const box=byId(prefix+'StatusBox');
    const total=byId(prefix+'Total');
    if(status){
      if(blocked) status.textContent='DITOLAK — > Rp500.000';
      else if(!hasAmount) status.textContent='Belum dihitung';
      else if(isBlank) status.textContent='Admin dikosongkan';
      else status.textContent=changed?'Admin diubah':'Sesuai Default';
    }
    if(box) box.className='calcbox '+(blocked?'bad':changed?'bad':hasAmount?'good':'');
    if(total && hasAmount && !blocked) total.textContent=fmtLocal(amountOf(prefix)+actual);
  };

  window.requireAdminReason=function(prefix){
    const input=byId(prefix+'Admin');
    const reason=byId(prefix+'Reason');
    if(!input) return true;
    const def=defaults[prefix];
    const isBlank=raw(input)==='';
    const actual=adminOf(prefix);
    const changed=hasNominal(prefix) && (isBlank || (def!==null && def!==undefined && actual!==def));
    if(!changed) return true;
    if(!raw(reason)){
      if(typeof uiToast==='function') uiToast('Admin diubah atau dikosongkan. Keterangan wajib diisi.','warn');
      reason?.focus();
      return false;
    }
    return true;
  };

  window.setDefault=function(prefix,def,totalAmount,blocked=false){
    defaults[prefix]=def;
    const input=byId(prefix+'Admin');
    const d=byId(prefix+'Default');
    const total=byId(prefix+'Total');
    if(d) d.textContent=def===null?'—':fmtLocal(def);
    if(input && !blocked && def!==null && !isManual(prefix) && document.activeElement!==input && typeof setMoneyInput==='function') setMoneyInput(input,def);
    if(total) total.textContent=blocked?'—':fmtLocal((Number(totalAmount)||0)+adminOf(prefix));
    window.checkAdminOverride(prefix,blocked);
  };

  window.calcQrisDana=function(){
    const a=amountOf('qrisDana');
    const d=typeof qrisDanaAdminDefault==='function'?qrisDanaAdminDefault(a):null;
    const blocked=d===null;
    defaults.qrisDana=d;
    const input=byId('qrisDanaAdmin');
    if(blocked){ if(input){ input.disabled=true; input.value=''; clearManual('qrisDana'); } }
    else if(input){
      input.disabled=false;
      if(!isManual('qrisDana') && document.activeElement!==input && typeof setMoneyInput==='function') setMoneyInput(input,d);
    }
    const defEl=byId('qrisDanaDefault'); if(defEl) defEl.textContent=blocked?'—':fmtLocal(d);
    const total=byId('qrisDanaTotal'); if(total) total.textContent=blocked?'—':fmtLocal(a+adminOf('qrisDana'));
    window.checkAdminOverride('qrisDana',blocked);
  };

  window.calcTransferBca=function(){
    const a=amountOf('transferBca');
    const base=typeof bankAdminDefault==='function'?bankAdminDefault(a):0;
    const d=base+2000;
    defaults.transferBca=d;
    const baseEl=byId('transferBcaBase'); if(baseEl) baseEl.textContent=fmtLocal(base);
    const defEl=byId('transferBcaDefault'); if(defEl) defEl.textContent=fmtLocal(d);
    const input=byId('transferBcaAdmin');
    if(input && !isManual('transferBca') && document.activeElement!==input && typeof setMoneyInput==='function') setMoneyInput(input,d);
    const total=byId('transferBcaTotal'); if(total) total.textContent=fmtLocal(a+adminOf('transferBca'));
    window.checkAdminOverride('transferBca');
  };

  function install(){
    prefixes.forEach(prefix=>{
      const input=byId(prefix+'Admin');
      if(!input) return;
      input.addEventListener('input',()=>{ markManual(prefix); window.checkAdminOverride(prefix); },true);
      input.addEventListener('change',()=>{ markManual(prefix); window.checkAdminOverride(prefix); },true);
      const label=input.closest('.field')?.querySelector('label');
      if(label && !label.querySelector('.v34-admin-note')){
        const note=document.createElement('span');
        note.className='v34-admin-note';
        note.textContent='BOLEH UBAH/KOSONG + ALASAN';
        note.style.cssText='display:block;margin-top:4px;font-size:9px;font-weight:700;letter-spacing:.03em;color:#7c3aed;text-transform:none';
        label.appendChild(note);
      }
    });
    document.querySelectorAll('.topbar .status.info').forEach(el=>{ if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V34 — ADMIN OVERRIDE POLICY'; });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
