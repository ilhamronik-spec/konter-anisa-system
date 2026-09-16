/* Konter Anisa V37 — Transfer Bank Lain: BCA + SeaBank */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const fmtLocal = n => typeof fmt === 'function' ? fmt(Number(n)||0) : 'Rp' + (Number(n)||0).toLocaleString('id-ID');
  const money = el => typeof moneyValue === 'function' ? moneyValue(el) : Number(String(el?.value||'').replace(/\D/g,''))||0;
  const toast = (msg,type='warn') => typeof uiToast === 'function' ? uiToast(msg,type) : alert(msg);

  function install(){
    const outerTab = [...document.querySelectorAll('.tx-tab')].find(b => String(b.getAttribute('data-ui-click')||'').includes("showTxn('transferbca'"));
    const host = byId('tx-transferbca');
    if(!outerTab || !host || host.dataset.v37Installed==='1') return;
    host.dataset.v37Installed='1';
    outerTab.textContent='Transfer Bank Lain';

    if(typeof txEntries !== 'undefined' && !txEntries.seaBank) txEntries.seaBank=[];

    const existing = [...host.childNodes];
    const tabs = document.createElement('div');
    tabs.className='subtabs';
    tabs.style.marginBottom='14px';
    tabs.innerHTML=`
      <button class="subtab active" id="v37TabBca" type="button">Transfer BCA</button>
      <button class="subtab" id="v37TabSeaBank" type="button">Transfer SeaBank</button>`;

    const bcaPane=document.createElement('div');
    bcaPane.id='v37PaneBca';
    bcaPane.className='v37-bank-pane';
    existing.forEach(n=>bcaPane.appendChild(n));

    const seaPane=document.createElement('div');
    seaPane.id='v37PaneSeaBank';
    seaPane.className='v37-bank-pane';
    seaPane.style.display='none';
    seaPane.innerHTML=`
      <div class="grid two">
        <div class="card form focus-form-card">
          <h4 style="margin:0 0 14px">Transfer SeaBank</h4>
          <div class="form-grid">
            <div class="field"><label>Nominal Transfer</label><input autocomplete="off" class="input money-entry" id="seaBankAmount" inputmode="numeric" type="text" placeholder="Isi nominal transfer"/></div>
            <div class="field"><label>Admin <span class="v34-admin-note" style="display:block;margin-top:4px;font-size:9px;font-weight:700;letter-spacing:.03em;color:#7c3aed;text-transform:none">BOLEH UBAH/KOSONG + ALASAN</span></label><input autocomplete="off" class="input money-entry" id="seaBankAdmin" inputmode="numeric" type="text" placeholder="Otomatis setelah nominal diisi"/></div>
          </div>
          <div class="field" id="seaBankReasonWrap" style="display:none;margin-top:11px"><label>Keterangan Perubahan Admin *</label><input class="input" id="seaBankReason" placeholder="Wajib diisi jika admin diubah atau dikosongkan"/></div>
          <div class="calc-grid">
            <div class="calcbox"><small>Admin Tarik Tunai</small><b id="seaBankBase">—</b></div>
            <div class="calcbox"><small>Tambahan Transfer</small><b>Rp2.000</b></div>
            <div class="calcbox good"><small>Admin Default Transfer</small><b id="seaBankDefault">—</b></div>
            <div class="calcbox"><small>Total</small><b id="seaBankTotal">—</b></div>
          </div>
          <div class="calc-grid" style="grid-template-columns:1fr;margin-top:10px">
            <div class="calcbox" id="seaBankStatusBox"><small>Status</small><b id="seaBankStatus">Belum dihitung</b></div>
          </div>
          <div class="actions" style="margin-top:14px"><button class="btn primary" id="seaBankAdd" type="button">+ Tambahkan ke Daftar</button></div>
        </div>
        <div class="card summary">
          <h4>Aturan Transfer SeaBank</h4>
          <div class="sumrow"><span>Acuan admin</span><b>Sama dengan Transfer BCA</b></div>
          <div class="sumrow"><span>Rumus default</span><b>Admin tarik tunai + Rp2.000</b></div>
          <div class="sumrow"><span>Edit/kosong admin</span><b>Alasan wajib</b></div>
        </div>
      </div>
      <div class="card multi-list-card" style="margin-top:14px">
        <div class="section-head"><div><h4 style="margin:0">Daftar Transfer SeaBank</h4><p style="margin:4px 0 0;color:var(--muted)">Bisa lebih dari satu transaksi. Tambahkan satu per satu.</p></div><span class="status info" id="txCount_seaBank">0 transaksi</span></div>
        <div class="table-wrap"><table class="table" style="min-width:760px"><thead><tr><th>#</th><th>Nominal</th><th>Admin</th><th>Margin</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody id="txList_seaBank"><tr><td class="multi-empty" colspan="6">Belum ada transaksi yang ditambahkan.</td></tr></tbody></table></div>
      </div>`;

    host.append(tabs,bcaPane,seaPane);

    const tabBca=byId('v37TabBca'), tabSea=byId('v37TabSeaBank');
    const showInner = which => {
      const sea = which==='sea';
      bcaPane.style.display=sea?'none':'block';
      seaPane.style.display=sea?'block':'none';
      tabBca.classList.toggle('active',!sea);
      tabSea.classList.toggle('active',sea);
    };
    tabBca.addEventListener('click',()=>showInner('bca'));
    tabSea.addEventListener('click',()=>showInner('sea'));

    const amount=byId('seaBankAmount'), admin=byId('seaBankAdmin'), reason=byId('seaBankReason');
    const reasonWrap=byId('seaBankReasonWrap');
    let defaultAdmin=null;

    function isBlank(){ return String(admin.value||'').trim()===''; }
    function isChanged(){ return money(amount)>0 && (isBlank() || (defaultAdmin!==null && money(admin)!==defaultAdmin)); }
    function setReason(){ reasonWrap.style.display=isChanged()?'block':'none'; }

    window.calcSeaBank=function(){
      const a=money(amount);
      if(a<=0){
        defaultAdmin=null;
        byId('seaBankBase').textContent='—'; byId('seaBankDefault').textContent='—'; byId('seaBankTotal').textContent='—';
        byId('seaBankStatus').textContent='Belum dihitung'; byId('seaBankStatusBox').className='calcbox';
        reasonWrap.style.display='none'; return;
      }
      const base=typeof bankAdminDefault==='function'?bankAdminDefault(a):0;
      defaultAdmin=base+2000;
      byId('seaBankBase').textContent=fmtLocal(base);
      byId('seaBankDefault').textContent=fmtLocal(defaultAdmin);
      if(admin.dataset.manual!=='1' && document.activeElement!==admin){
        if(typeof setMoneyInput==='function') setMoneyInput(admin,defaultAdmin); else admin.value=defaultAdmin.toLocaleString('id-ID');
      }
      const actual=money(admin);
      byId('seaBankTotal').textContent=fmtLocal(a+actual);
      const changed=isChanged();
      byId('seaBankStatus').textContent=isBlank()?'Admin dikosongkan':changed?'Admin diubah':'Sesuai Default';
      byId('seaBankStatusBox').className='calcbox '+(changed?'bad':'good');
      setReason();
    };

    amount.addEventListener('input',()=>{ if(typeof formatMoneyInput==='function') formatMoneyInput(amount); window.calcSeaBank(); });
    admin.addEventListener('input',()=>{ admin.dataset.manual='1'; if(typeof formatMoneyInput==='function') formatMoneyInput(admin); window.calcSeaBank(); });

    function renderSeaBank(){
      const body=byId('txList_seaBank'), count=byId('txCount_seaBank');
      const arr=(typeof txEntries!=='undefined' && txEntries.seaBank) ? txEntries.seaBank : [];
      if(!arr.length){ body.innerHTML='<tr><td class="multi-empty" colspan="6">Belum ada transaksi yang ditambahkan.</td></tr>'; count.textContent='0 transaksi'; return; }
      let margin=0;
      body.innerHTML=arr.map((x,i)=>{ margin+=Number(x.margin||0); return `<tr><td>${i+1}</td><td class="money">${fmtLocal(x.amount)}</td><td class="money">${fmtLocal(x.admin)}</td><td class="money">${fmtLocal(x.margin)}</td><td>${String(x.reason||'Default').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</td><td><button class="btn" type="button" data-v37-remove="${i}">Hapus</button></td></tr>`; }).join('');
      count.textContent=`${arr.length} transaksi • Margin ${fmtLocal(margin)}`;
      body.querySelectorAll('[data-v37-remove]').forEach(btn=>btn.addEventListener('click',()=>{
        txEntries.seaBank.splice(Number(btn.dataset.v37Remove),1); renderSeaBank(); if(typeof renderTxGlobalSummary==='function') renderTxGlobalSummary();
      }));
    }

    byId('seaBankAdd').addEventListener('click',()=>{
      window.calcSeaBank();
      const a=money(amount);
      if(a<=0) return toast('Nominal Transfer SeaBank harus lebih dari Rp0.','warn');
      if(isChanged() && !String(reason.value||'').trim()) { toast('Admin diubah atau dikosongkan. Keterangan wajib diisi.','warn'); reason.focus(); return; }
      const actual=money(admin);
      txEntries.seaBank.push({amount:a,admin:actual,margin:actual,reason:String(reason.value||'').trim()});
      renderSeaBank();
      if(typeof renderTxGlobalSummary==='function') renderTxGlobalSummary();
      amount.value=''; admin.value=''; reason.value=''; delete admin.dataset.manual; defaultAdmin=null;
      byId('seaBankBase').textContent='—'; byId('seaBankDefault').textContent='—'; byId('seaBankTotal').textContent='—'; byId('seaBankStatus').textContent='Belum dihitung'; byId('seaBankStatusBox').className='calcbox'; reasonWrap.style.display='none';
      toast('Transfer SeaBank ditambahkan. Form siap untuk transaksi berikutnya.','ok');
    });

    document.querySelectorAll('.topbar .status.info').forEach(el=>{ if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V37 — TRANSFER BANK LAIN'; });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
