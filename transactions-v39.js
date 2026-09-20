/* Konter Anisa V39 — BRILINK + unified Transaksi BCA */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const fmtLocal = n => typeof fmt === 'function' ? fmt(Number(n)||0) : 'Rp' + (Number(n)||0).toLocaleString('id-ID');
  const money = el => typeof moneyValue === 'function' ? moneyValue(el) : Number(String(el?.value||'').replace(/\D/g,''))||0;
  const toast = (msg,type='warn') => typeof uiToast === 'function' ? uiToast(msg,type) : alert(msg);
  const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));

  function install(){
    if(byId('tx-brilink') || byId('tx-bca')) return;

    const tabs=[...document.querySelectorAll('.tx-tab')];
    const tarikTab=tabs.find(b=>String(b.getAttribute('data-ui-click')||'').includes("showTxn('tarikbca'"));
    const transferOuterTab=tabs.find(b=>String(b.getAttribute('data-ui-click')||'').includes("showTxn('transferbca'"));
    const tarikPane=byId('tx-tarikbca');
    const transferHost=byId('tx-transferbca');
    if(!tarikTab || !tarikPane || !transferOuterTab || !transferHost) return;

    // ------------------------------------------------------------
    // 1) TRANSaksi BCA = Tarik Tunai BCA + Transfer BCA
    //    Formula masing-masing tetap memakai logic lama.
    // ------------------------------------------------------------
    const bcaTab=document.createElement('button');
    bcaTab.className='subtab tx-tab';
    bcaTab.type='button';
    bcaTab.textContent='Transaksi BCA';
    tarikTab.replaceWith(bcaTab);

    const bcaPane=document.createElement('div');
    bcaPane.className='subpane tx-pane';
    bcaPane.id='tx-bca';

    const bcaInnerTabs=document.createElement('div');
    bcaInnerTabs.className='subtabs';
    bcaInnerTabs.style.marginBottom='14px';
    bcaInnerTabs.innerHTML=`
      <button class="subtab active" id="v39BcaTarikTab" type="button">Tarik Tunai BCA</button>
      <button class="subtab" id="v39BcaTransferTab" type="button">Transfer BCA</button>`;

    const bcaTarikPanel=document.createElement('div');
    bcaTarikPanel.id='v39BcaTarikPanel';
    const bcaTransferPanel=document.createElement('div');
    bcaTransferPanel.id='v39BcaTransferPanel';
    bcaTransferPanel.style.display='none';

    while(tarikPane.firstChild) bcaTarikPanel.appendChild(tarikPane.firstChild);

    const oldBcaPane=byId('v37PaneBca');
    if(oldBcaPane){
      while(oldBcaPane.firstChild) bcaTransferPanel.appendChild(oldBcaPane.firstChild);
    } else {
      // fallback jika V37 belum sempat membungkus form Transfer BCA
      const children=[...transferHost.childNodes];
      children.forEach(n=>bcaTransferPanel.appendChild(n));
    }

    bcaPane.append(bcaInnerTabs,bcaTarikPanel,bcaTransferPanel);
    tarikPane.insertAdjacentElement('beforebegin',bcaPane);
    tarikPane.remove();

    const showBcaInner = which => {
      const transfer=which==='transfer';
      bcaTarikPanel.style.display=transfer?'none':'block';
      bcaTransferPanel.style.display=transfer?'block':'none';
      byId('v39BcaTarikTab').classList.toggle('active',!transfer);
      byId('v39BcaTransferTab').classList.toggle('active',transfer);
    };
    byId('v39BcaTarikTab').addEventListener('click',()=>showBcaInner('tarik'));
    byId('v39BcaTransferTab').addEventListener('click',()=>showBcaInner('transfer'));
    bcaTab.addEventListener('click',()=>{ if(typeof showTxn==='function') showTxn('bca',bcaTab); });

    // SeaBank dipertahankan, tetapi Transfer BCA dikeluarkan dari menu ini.
    const seaPane=byId('v37PaneSeaBank');
    if(seaPane){
      const frag=document.createDocumentFragment();
      while(seaPane.firstChild) frag.appendChild(seaPane.firstChild);
      transferHost.innerHTML='';
      transferHost.appendChild(frag);
      transferOuterTab.textContent='Transfer SeaBank';
    }

    // ------------------------------------------------------------
    // 2) BRILINK — Transfer & Tarik Tunai
    //    KEDUANYA memakai admin default Tarik Tunai BCA.
    // ------------------------------------------------------------
    if(typeof txEntries !== 'undefined'){
      if(!txEntries.brilinkTransfer) txEntries.brilinkTransfer=[];
      if(!txEntries.brilinkTarik) txEntries.brilinkTarik=[];
    }

    const brilinkTab=document.createElement('button');
    brilinkTab.className='subtab tx-tab';
    brilinkTab.type='button';
    brilinkTab.textContent='BRILINK';
    bcaTab.insertAdjacentElement('afterend',brilinkTab);

    const brilinkPane=document.createElement('div');
    brilinkPane.className='subpane tx-pane';
    brilinkPane.id='tx-brilink';
    brilinkPane.innerHTML=`
      <div class="subtabs" style="margin-bottom:14px">
        <button class="subtab active" id="v39BrilinkTransferTab" type="button">Transfer</button>
        <button class="subtab" id="v39BrilinkTarikTab" type="button">Tarik Tunai</button>
      </div>
      <div id="v39BrilinkTransferPanel"></div>
      <div id="v39BrilinkTarikPanel" style="display:none"></div>`;
    bcaPane.insertAdjacentElement('afterend',brilinkPane);

    const buildBrilinkPanel=(mode,label)=>{
      const prefix=mode==='transfer'?'brilinkTransfer':'brilinkTarik';
      const panel=byId(mode==='transfer'?'v39BrilinkTransferPanel':'v39BrilinkTarikPanel');
      panel.innerHTML=`
        <div class="grid two">
          <div class="card form focus-form-card">
            <h4 style="margin:0 0 14px">${label} BRILINK</h4>
            <div class="form-grid">
              <div class="field"><label>Nominal ${mode==='transfer'?'Transfer':'Tarik Tunai'}</label><input autocomplete="off" class="input money-entry" id="${prefix}Amount" inputmode="numeric" type="text" placeholder="Isi nominal"/></div>
              <div class="field"><label>Admin <span style="display:block;margin-top:4px;font-size:9px;font-weight:700;letter-spacing:.03em;color:#7c3aed;text-transform:none">BOLEH UBAH/KOSONG + ALASAN</span></label><input autocomplete="off" class="input money-entry" id="${prefix}Admin" inputmode="numeric" type="text" placeholder="Otomatis setelah nominal diisi"/></div>
            </div>
            <div class="field" id="${prefix}ReasonWrap" style="display:none;margin-top:11px"><label>Keterangan Perubahan Admin *</label><input class="input" id="${prefix}Reason" placeholder="Wajib diisi jika admin diubah atau dikosongkan"/></div>
            <div class="calc-grid">
              <div class="calcbox good"><small>Admin Default</small><b id="${prefix}Default">—</b></div>
              <div class="calcbox"><small>Total</small><b id="${prefix}Total">—</b></div>
              <div class="calcbox" id="${prefix}StatusBox"><small>Status</small><b id="${prefix}Status">Belum dihitung</b></div>
              <div class="calcbox"><small>Acuan</small><b>Tarik Tunai BCA</b></div>
            </div>
            <div class="actions" style="margin-top:14px"><button class="btn primary" id="${prefix}Add" type="button">+ Tambahkan ke Daftar</button></div>
          </div>
          <div class="card summary">
            <h4>${label} BRILINK</h4>
            <div class="sumrow"><span>Patokan admin</span><b>Sama dengan Tarik Tunai BCA</b></div>
            <div class="sumrow"><span>Tambahan admin transfer</span><b>Tidak ada</b></div>
            <div class="sumrow"><span>Edit/kosong admin</span><b>Alasan wajib</b></div>
          </div>
        </div>
        <div class="card multi-list-card" style="margin-top:14px">
          <div class="section-head"><div><h4 style="margin:0">Daftar ${label} BRILINK</h4><p style="margin:4px 0 0;color:var(--muted)">Bisa lebih dari satu transaksi. Tambahkan satu per satu.</p></div><span class="status info" id="txCount_${prefix}">0 transaksi</span></div>
          <div class="table-wrap"><table class="table" style="min-width:760px"><thead><tr><th>#</th><th>Nominal</th><th>Admin</th><th>Margin</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody id="txList_${prefix}"><tr><td class="multi-empty" colspan="6">Belum ada transaksi yang ditambahkan.</td></tr></tbody></table></div>
        </div>`;

      const amount=byId(prefix+'Amount');
      const admin=byId(prefix+'Admin');
      const reason=byId(prefix+'Reason');
      const reasonWrap=byId(prefix+'ReasonWrap');
      let defaultAdmin=null;

      const isBlank=()=>String(admin.value||'').trim()==='';
      const isChanged=()=>money(amount)>0 && (isBlank() || (defaultAdmin!==null && money(admin)!==defaultAdmin));

      const calc=()=>{
        const a=money(amount);
        if(a<=0){
          defaultAdmin=null;
          byId(prefix+'Default').textContent='—';
          byId(prefix+'Total').textContent='—';
          byId(prefix+'Status').textContent='Belum dihitung';
          byId(prefix+'StatusBox').className='calcbox';
          reasonWrap.style.display='none';
          return;
        }
        // PENTING: kedua jenis BRILINK memakai bankAdminDefault langsung,
        // sama seperti Tarik Tunai BCA, tanpa tambahan Rp2.000.
        defaultAdmin=typeof bankAdminDefault==='function'?bankAdminDefault(a):0;
        byId(prefix+'Default').textContent=fmtLocal(defaultAdmin);
        if(admin.dataset.manual!=='1' && document.activeElement!==admin){
          if(typeof setMoneyInput==='function') setMoneyInput(admin,defaultAdmin);
          else admin.value=defaultAdmin.toLocaleString('id-ID');
        }
        const actual=money(admin);
        byId(prefix+'Total').textContent=fmtLocal(a+actual);
        const changed=isChanged();
        byId(prefix+'Status').textContent=isBlank()?'Admin dikosongkan':changed?'Admin diubah':'Sesuai Default';
        byId(prefix+'StatusBox').className='calcbox '+(changed?'bad':'good');
        reasonWrap.style.display=changed?'block':'none';
      };

      amount.addEventListener('input',()=>{
        if(typeof formatMoneyInput==='function') formatMoneyInput(amount);
        calc();
      });
      admin.addEventListener('input',()=>{
        admin.dataset.manual='1';
        if(typeof formatMoneyInput==='function') formatMoneyInput(admin);
        calc();
      });

      const render=()=>{
        const arr=(typeof txEntries!=='undefined' && txEntries[prefix])?txEntries[prefix]:[];
        const body=byId('txList_'+prefix), count=byId('txCount_'+prefix);
        if(!arr.length){
          body.innerHTML='<tr><td class="multi-empty" colspan="6">Belum ada transaksi yang ditambahkan.</td></tr>';
          count.textContent='0 transaksi';
          return;
        }
        let margin=0;
        body.innerHTML=arr.map((x,i)=>{
          margin+=Number(x.margin||0);
          return `<tr><td>${i+1}</td><td class="money">${fmtLocal(x.amount)}</td><td class="money">${fmtLocal(x.admin)}</td><td class="money">${fmtLocal(x.margin)}</td><td>${esc(x.reason||'Default')}</td><td><button class="btn" type="button" data-v39-remove="${i}">Hapus</button></td></tr>`;
        }).join('');
        count.textContent=`${arr.length} transaksi • Margin ${fmtLocal(margin)}`;
        body.querySelectorAll('[data-v39-remove]').forEach(btn=>btn.addEventListener('click',()=>{
          txEntries[prefix].splice(Number(btn.dataset.v39Remove),1);
          render();
          if(typeof renderTxGlobalSummary==='function') renderTxGlobalSummary();
        }));
      };

      byId(prefix+'Add').addEventListener('click',()=>{
        calc();
        const a=money(amount);
        if(a<=0) return toast(`Nominal ${label} BRILINK harus lebih dari Rp0.`,'warn');
        const changed=isChanged();
        const reasonText=String(reason.value||'').trim();
        if(changed && !reasonText){
          toast('Admin diubah atau dikosongkan. Keterangan wajib diisi.','warn');
          reason.focus();
          return;
        }
        const actual=money(admin);
        txEntries[prefix].push({amount:a,admin:actual,margin:actual,reason:changed?reasonText:''});
        render();
        if(typeof renderTxGlobalSummary==='function') renderTxGlobalSummary();
        amount.value=''; admin.value=''; reason.value=''; delete admin.dataset.manual; defaultAdmin=null;
        byId(prefix+'Default').textContent='—';
        byId(prefix+'Total').textContent='—';
        byId(prefix+'Status').textContent='Belum dihitung';
        byId(prefix+'StatusBox').className='calcbox';
        reasonWrap.style.display='none';
        toast(`${label} BRILINK ditambahkan. Form siap untuk transaksi berikutnya.`,'ok');
      });
      return render;
    };

    const renderBrilinkTransfer=buildBrilinkPanel('transfer','Transfer');
    const renderBrilinkTarik=buildBrilinkPanel('tarik','Tarik Tunai');
    window.KAPersistRenderV39=()=>{
      if(typeof renderBrilinkTransfer==='function') renderBrilinkTransfer();
      if(typeof renderBrilinkTarik==='function') renderBrilinkTarik();
    };

    const showBrilinkInner=which=>{
      const tarik=which==='tarik';
      byId('v39BrilinkTransferPanel').style.display=tarik?'none':'block';
      byId('v39BrilinkTarikPanel').style.display=tarik?'block':'none';
      byId('v39BrilinkTransferTab').classList.toggle('active',!tarik);
      byId('v39BrilinkTarikTab').classList.toggle('active',tarik);
    };
    byId('v39BrilinkTransferTab').addEventListener('click',()=>showBrilinkInner('transfer'));
    byId('v39BrilinkTarikTab').addEventListener('click',()=>showBrilinkInner('tarik'));
    brilinkTab.addEventListener('click',()=>{ if(typeof showTxn==='function') showTxn('brilink',brilinkTab); });

    document.querySelectorAll('.topbar .status.info').forEach(el=>{
      if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V39 — BRILINK + TRANSAKSI BCA';
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
