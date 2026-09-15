/* Konter Anisa V35 — Unified QRIS source flow */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  const raw=el=>String(el?.value??'').trim();
  const money=el=>typeof moneyValue==='function'?moneyValue(el):Number(String(el?.value||'').replace(/\D/g,''))||0;
  const fmtLocal=n=>typeof fmt==='function'?fmt(n):'Rp'+Number(n||0).toLocaleString('id-ID');
  let adminManual=false;

  function qrisDefault(source, amount){
    if(source==='wallet') return typeof qrisDanaAdminDefault==='function'?qrisDanaAdminDefault(amount):null;
    return typeof bankAdminDefault==='function'?bankAdminDefault(amount):0;
  }

  function updateUnified(){
    const source=byId('qrisUnifiedSource')?.value||'wallet';
    const amount=money(byId('qrisUnifiedAmount'));
    const adminInput=byId('qrisUnifiedAdmin');
    const def=qrisDefault(source,amount);
    const blocked=source==='wallet' && def===null;

    if(blocked){
      if(adminInput){adminInput.value='';adminInput.disabled=true;}
    }else if(adminInput){
      adminInput.disabled=false;
      if(!adminManual && document.activeElement!==adminInput && typeof setMoneyInput==='function') setMoneyInput(adminInput,def||0);
    }

    const adminBlank=raw(adminInput)==='';
    const actual=money(adminInput);
    const changed=amount>0 && !blocked && (adminBlank || actual!==Number(def||0));
    const reasonWrap=byId('qrisUnifiedReasonWrap');
    if(reasonWrap) reasonWrap.style.display=changed?'block':'none';

    const defEl=byId('qrisUnifiedDefault'); if(defEl) defEl.textContent=blocked?'—':amount>0?fmtLocal(def):'—';
    const totalEl=byId('qrisUnifiedTotal'); if(totalEl) totalEl.textContent=blocked||amount<=0?'—':fmtLocal(amount+actual);
    const status=byId('qrisUnifiedStatus');
    const statusBox=byId('qrisUnifiedStatusBox');
    if(status){
      if(blocked) status.textContent='Ditolak — E-Wallet maks Rp500.000';
      else if(amount<=0) status.textContent='Belum dihitung';
      else if(adminBlank) status.textContent='Admin dikosongkan';
      else status.textContent=changed?'Admin diubah':'Sesuai default';
    }
    if(statusBox) statusBox.className='calcbox '+(blocked?'bad':changed?'bad':amount>0?'good':'');
    const rule=byId('qrisUnifiedRule');
    if(rule) rule.textContent=source==='wallet'?'E-Wallet • maks Rp500.000':'Bank • mengikuti tarif bank';
    const btn=byId('qrisUnifiedAdd'); if(btn) btn.disabled=blocked||amount<=0;
  }

  function resetUnified(){
    const amount=byId('qrisUnifiedAmount'), admin=byId('qrisUnifiedAdmin'), reason=byId('qrisUnifiedReason');
    if(amount) amount.value='';
    if(admin){admin.value='';admin.disabled=false;}
    if(reason) reason.value='';
    adminManual=false;
    updateUnified();
  }

  function copyToLegacy(prefix){
    const amount=byId('qrisUnifiedAmount');
    const admin=byId('qrisUnifiedAdmin');
    const reason=byId('qrisUnifiedReason');
    const legacyAmount=byId(prefix+'Amount');
    const legacyAdmin=byId(prefix+'Admin');
    const legacyReason=byId(prefix+'Reason');
    if(legacyAmount){legacyAmount.value=raw(amount); if(typeof formatMoneyInput==='function') formatMoneyInput(legacyAmount);}
    if(legacyAdmin){
      legacyAdmin.value=raw(admin);
      legacyAdmin.dataset.adminManual='1';
      if(raw(admin)!=='' && typeof formatMoneyInput==='function') formatMoneyInput(legacyAdmin);
    }
    if(legacyReason) legacyReason.value=raw(reason);
  }

  function addUnified(){
    const source=byId('qrisUnifiedSource')?.value||'wallet';
    const amount=money(byId('qrisUnifiedAmount'));
    const admin=byId('qrisUnifiedAdmin');
    const def=qrisDefault(source,amount);
    const blocked=source==='wallet' && def===null;
    if(amount<=0) return typeof uiToast==='function'&&uiToast('Nominal QRIS harus lebih dari Rp0.','warn');
    if(blocked) return typeof uiToast==='function'&&uiToast('QRIS E-Wallet maksimal Rp500.000.','bad');
    const changed=raw(admin)==='' || money(admin)!==Number(def||0);
    if(changed && !raw(byId('qrisUnifiedReason'))){
      if(typeof uiToast==='function') uiToast('Admin diubah atau dikosongkan. Keterangan wajib diisi.','warn');
      byId('qrisUnifiedReason')?.focus();
      return;
    }
    const prefix=source==='wallet'?'qrisDana':'qrisBank';
    copyToLegacy(prefix);
    if(typeof addTxn==='function') addTxn(prefix);
    resetUnified();
  }

  function renderUnifiedList(){
    const b=byId('txList_qris');
    if(!b || typeof txEntries==='undefined') return;
    const combined=[
      ...txEntries.qrisDana.map((x,i)=>({...x,_type:'qrisDana',_label:'E-Wallet',_i:i})),
      ...txEntries.qrisBank.map((x,i)=>({...x,_type:'qrisBank',_label:'Bank',_i:i}))
    ];
    const count=byId('txCount_qris');
    if(!combined.length){
      if(typeof setListEmpty==='function') setListEmpty('txList_qris',7);
      if(count) count.textContent='0 transaksi';
      return;
    }
    let total=0,margin=0;
    b.innerHTML=combined.map((x,i)=>{
      total+=Number(x.amount||0); margin+=Number(x.margin||0);
      const del=typeof deleteBtn==='function'?deleteBtn(`removeTxn('${x._type}',${x._i})`):'';
      return `<tr><td>${i+1}</td><td><b>${x._label}</b></td><td class="money">${fmtLocal(x.amount)}</td><td class="money">${fmtLocal(x.admin)}</td><td class="money">${fmtLocal(x.margin)}</td><td>${x.reason||'—'}</td><td>${del}</td></tr>`;
    }).join('');
    if(count) count.textContent=`${combined.length} transaksi • ${fmtLocal(total)} • margin ${fmtLocal(margin)}`;
    if(typeof bindRuntimeActions==='function') bindRuntimeActions();
  }

  function install(){
    const pane=byId('tx-qris');
    if(!pane || byId('qrisUnifiedCard')) return;
    const oldGrid=pane.querySelector(':scope > .grid.two');
    if(oldGrid) oldGrid.style.display='none';

    const card=document.createElement('div');
    card.id='qrisUnifiedCard';
    card.className='card form focus-form-card';
    card.style.marginBottom='14px';
    card.innerHTML=`
      <div class="section-head" style="margin-bottom:14px"><div><h4 style="margin:0">Transaksi QRIS</h4><p style="margin:4px 0 0;color:var(--muted)">Satu QRIS, pilih sumber pembayaran agar patokan admin otomatis menyesuaikan.</p></div><span class="status info">1 QRIS • 2 SUMBER</span></div>
      <div class="form-grid">
        <div class="field"><label>Sumber QRIS</label><select class="select" id="qrisUnifiedSource"><option value="wallet">E-Wallet</option><option value="bank">Bank</option></select></div>
        <div class="field"><label>Nominal Transaksi</label><input autocomplete="off" class="input money-entry" id="qrisUnifiedAmount" inputmode="numeric" placeholder="Isi nominal QRIS" type="text"/></div>
        <div class="field"><label>Admin <span class="v34-admin-note" style="display:block;margin-top:4px;font-size:9px;font-weight:700;color:#7c3aed;text-transform:none">BOLEH UBAH/KOSONG + ALASAN</span></label><input autocomplete="off" class="input money-entry" id="qrisUnifiedAdmin" inputmode="numeric" placeholder="Otomatis sesuai sumber" type="text"/></div>
      </div>
      <div class="field" id="qrisUnifiedReasonWrap" style="display:none;margin-top:11px"><label>Keterangan Perubahan Admin *</label><input class="input" id="qrisUnifiedReason" placeholder="Wajib diisi jika admin diubah atau dikosongkan"/></div>
      <div class="calc-grid"><div class="calcbox"><small>Admin Default</small><b id="qrisUnifiedDefault">—</b></div><div class="calcbox"><small>Total</small><b id="qrisUnifiedTotal">—</b></div><div class="calcbox" id="qrisUnifiedStatusBox"><small>Status</small><b id="qrisUnifiedStatus">Belum dihitung</b></div><div class="calcbox"><small>Patokan</small><b id="qrisUnifiedRule">E-Wallet • maks Rp500.000</b></div></div>
      <div class="actions" style="margin-top:14px"><button class="btn primary" id="qrisUnifiedAdd" type="button">+ Tambahkan QRIS</button></div>`;

    const listCard=byId('txList_qris')?.closest('.multi-list-card');
    if(listCard) pane.insertBefore(card,listCard); else pane.prepend(card);

    const table=byId('txList_qris')?.closest('table');
    const sourceHead=table?.querySelector('thead th:nth-child(2)');
    if(sourceHead) sourceHead.textContent='Sumber';
    const title=listCard?.querySelector('h4'); if(title) title.textContent='Daftar Transaksi QRIS';
    const desc=listCard?.querySelector('.section-head p'); if(desc) desc.textContent='Semua transaksi QRIS masuk ke satu daftar. Sumber E-Wallet dan Bank tetap tercatat terpisah.';

    const source=byId('qrisUnifiedSource'), amount=byId('qrisUnifiedAmount'), admin=byId('qrisUnifiedAdmin');
    source?.addEventListener('change',()=>{adminManual=false; if(admin) admin.value=''; const r=byId('qrisUnifiedReason'); if(r) r.value=''; updateUnified();});
    amount?.addEventListener('input',()=>{if(typeof formatMoneyInput==='function') formatMoneyInput(amount); adminManual=false; updateUnified();});
    admin?.addEventListener('input',()=>{if(typeof formatMoneyInput==='function') formatMoneyInput(admin); adminManual=true; updateUnified();});
    byId('qrisUnifiedAdd')?.addEventListener('click',addUnified);

    try{ renderQrisList=renderUnifiedList; }catch(e){ window.renderQrisList=renderUnifiedList; }
    renderUnifiedList();
    updateUnified();
    document.querySelectorAll('.topbar .status.info').forEach(el=>{if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V35 — UNIFIED QRIS';});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
