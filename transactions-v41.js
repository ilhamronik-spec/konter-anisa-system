/* Konter Anisa V41 — Aksesoris & Obat + Operasional urutan 4 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const fmt = n => 'Rp' + Math.round(Number(n)||0).toLocaleString('id-ID');
  const num = v => Number(String(v ?? '').replace(/[^\d-]/g,'')) || 0;
  const toast = (msg,type='warn') => typeof uiToast === 'function' ? uiToast(msg,type) : alert(msg);
  const PURCHASE_KEY = 'ka_v41_acc_obat_purchases';

  function loadPurchases(){
    try { return JSON.parse(localStorage.getItem(PURCHASE_KEY) || '{"accessory":[],"medicine":[]}'); }
    catch(_) { return {accessory:[],medicine:[]}; }
  }
  function savePurchases(){ try { localStorage.setItem(PURCHASE_KEY,JSON.stringify(purchases)); } catch(_){} }
  const purchases = loadPurchases();
  purchases.accessory ||= [];
  purchases.medicine ||= [];

  function moveOperationalToStep4(){
    try {
      if(typeof labels !== 'undefined' && Array.isArray(labels) && labels.length >= 6){
        labels.splice(3,3,'Operasional','Hutang/Piutang','Transaksi');
      }
      const sections=[...document.querySelectorAll('section.section')];
      const byHeading=pattern=>sections.find(s=>pattern.test(String(s.querySelector('.section-head h3')?.textContent||'')));
      const op=byHeading(/Operasional/i);
      const debt=byHeading(/Hutang\s*(?:\/|&|dan)\s*Piutang/i);
      const tx=byHeading(/Transaksi/i);
      if(op){ op.dataset.i='3'; const h=op.querySelector('.section-head h3'); if(h) h.textContent='4. Operasional'; }
      if(debt){ debt.dataset.i='4'; const h=debt.querySelector('.section-head h3'); if(h) h.textContent='5. Hutang / Piutang'; }
      if(tx){ tx.dataset.i='5'; const h=tx.querySelector('.section-head h3'); if(h) h.textContent='6. Transaksi'; }
      if(typeof renderSteps === 'function') renderSteps();
    } catch(_) {}
  }

  function ensureEntries(){
    if(typeof txEntries === 'undefined') return false;
    txEntries.aksesoris ||= [];
    txEntries.obat ||= [];
    return true;
  }

  function transactionSection(){
    return [...document.querySelectorAll('section.section')].find(s=>/Transaksi/i.test(String(s.querySelector('.section-head h3')?.textContent||'')));
  }

  function installTransactionUI(){
    if($('tx-accobat') || !ensureEntries()) return;
    const section=transactionSection();
    if(!section) return;
    const tabsWrap=section.querySelector('.subtabs');
    const anchorTab=[...section.querySelectorAll('.tx-tab')].find(x=>/Minyak/i.test(x.textContent||'')) || [...section.querySelectorAll('.tx-tab')].pop();
    const anchorPane=$('tx-minyak') || [...section.querySelectorAll('.tx-pane')].pop();
    if(!tabsWrap || !anchorTab || !anchorPane) return;

    const tab=document.createElement('button');
    tab.className='subtab tx-tab';
    tab.type='button';
    tab.textContent='Aksesoris & Obat';
    tab.setAttribute('data-ui-click',"showTxn('accobat',this)");
    anchorTab.insertAdjacentElement('afterend',tab);

    const pane=document.createElement('div');
    pane.className='subpane tx-pane';
    pane.id='tx-accobat';
    pane.innerHTML=`
      <div class="subtabs" id="accObatSubtabs">
        <button class="subtab active" type="button" data-v41-sub="aksesoris">Aksesoris</button>
        <button class="subtab" type="button" data-v41-sub="obat">Obat</button>
      </div>
      <div id="accObatPane_aksesoris"></div>
      <div id="accObatPane_obat" style="display:none"></div>`;
    anchorPane.insertAdjacentElement('afterend',pane);

    buildSalesPane('aksesoris','Aksesoris');
    buildSalesPane('obat','Obat');
    pane.querySelectorAll('[data-v41-sub]').forEach(btn=>btn.addEventListener('click',()=>{
      pane.querySelectorAll('[data-v41-sub]').forEach(x=>x.classList.toggle('active',x===btn));
      $('accObatPane_aksesoris').style.display=btn.dataset.v41Sub==='aksesoris'?'':'none';
      $('accObatPane_obat').style.display=btn.dataset.v41Sub==='obat'?'':'none';
    }));
  }

  function buildSalesPane(type,label){
    const root=$('accObatPane_'+type);
    if(!root) return;
    const pfx=type==='aksesoris'?'acc':'med';
    root.innerHTML=`
      <div class="grid two">
        <div class="card form focus-form-card">
          <h4 style="margin:0 0 14px">Transaksi ${label}</h4>
          <div class="form-grid">
            <div class="field"><label>Jumlah Uang</label><input autocomplete="off" class="input money-entry" id="${pfx}Amount" inputmode="numeric" type="text" placeholder="Isi total penjualan"/></div>
            <div class="field"><label>Margin</label><input autocomplete="off" class="input money-entry" id="${pfx}Margin" inputmode="numeric" type="text" placeholder="Isi margin"/></div>
            <div class="field"><label>Modal Terpakai</label><input class="input" id="${pfx}Modal" readonly type="text" placeholder="Otomatis"/></div>
          </div>
          <div class="calc-grid">
            <div class="calcbox"><small>Jumlah Uang</small><b id="${pfx}AmountOut">—</b></div>
            <div class="calcbox good"><small>Margin</small><b id="${pfx}MarginOut">—</b></div>
            <div class="calcbox"><small>Modal Terpakai</small><b id="${pfx}ModalOut">—</b></div>
          </div>
          <div class="actions" style="margin-top:14px"><button class="btn primary" type="button" id="${pfx}Add">+ Tambahkan ke Daftar</button></div>
        </div>
        <div class="card summary">
          <h4>Aturan ${label}</h4>
          <div class="sumrow"><span>Input karyawan</span><b>Jumlah Uang + Margin</b></div>
          <div class="sumrow"><span>Modal terpakai</span><b>Jumlah Uang − Margin</b></div>
          <div class="sumrow"><span>Modal akhir</span><b>Otomatis</b></div>
          <div class="sumrow"><span>Belanja baru</span><b>Menambah modal</b></div>
        </div>
      </div>
      <div class="card multi-list-card" style="margin-top:14px">
        <div class="section-head"><div><h4 style="margin:0">Daftar Transaksi ${label}</h4><p style="margin:4px 0 0;color:var(--muted)">Input total transaksi, tidak perlu item satu per satu.</p></div><span class="status info" id="${pfx}Count">0 transaksi</span></div>
        <div class="table-wrap"><table class="table" style="min-width:760px"><thead><tr><th>#</th><th>Jumlah Uang</th><th>Margin</th><th>Modal Terpakai</th><th>Aksi</th></tr></thead><tbody id="${pfx}List"></tbody></table></div>
      </div>`;

    const amount=$(`${pfx}Amount`), margin=$(`${pfx}Margin`);
    const calc=()=>{
      if(typeof formatMoneyInput==='function'){ formatMoneyInput(amount); formatMoneyInput(margin); }
      const a=num(amount.value), m=num(margin.value), used=a-m;
      $(`${pfx}AmountOut`).textContent=a?fmt(a):'—';
      $(`${pfx}MarginOut`).textContent=(a||m)?fmt(m):'—';
      $(`${pfx}ModalOut`).textContent=a?fmt(used):'—';
      $(`${pfx}Modal`).value=a?Math.max(0,used).toLocaleString('id-ID'):'';
      return {a,m,used};
    };
    amount.addEventListener('input',calc);
    margin.addEventListener('input',calc);
    $(`${pfx}Add`).addEventListener('click',()=>{
      const x=calc();
      if(x.a<=0){ toast(`Jumlah uang ${label} harus lebih dari 0.`,'warn'); amount.focus(); return; }
      if(x.m<0 || x.m>x.a){ toast(`Margin ${label} tidak boleh melebihi jumlah uang.`,'bad'); margin.focus(); return; }
      txEntries[type].push({amount:x.a,margin:x.m,modal:x.used});
      amount.value=''; margin.value=''; $(`${pfx}Modal`).value='';
      $(`${pfx}AmountOut`).textContent='—'; $(`${pfx}MarginOut`).textContent='—'; $(`${pfx}ModalOut`).textContent='—';
      renderSales(type,label,pfx);
      updateAutoModals();
      if(typeof renderTxGlobalSummary==='function') renderTxGlobalSummary();
      toast(`Transaksi ${label} ditambahkan.`,'ok');
    });
    renderSales(type,label,pfx);
  }

  function renderSales(type,label,pfx){
    const arr=(typeof txEntries!=='undefined' && txEntries[type]) || [];
    const body=$(`${pfx}List`), count=$(`${pfx}Count`);
    if(!body||!count) return;
    if(!arr.length){ body.innerHTML='<tr><td class="multi-empty" colspan="5">Belum ada transaksi yang ditambahkan.</td></tr>'; count.textContent='0 transaksi'; return; }
    body.innerHTML=arr.map((x,i)=>`<tr><td>${i+1}</td><td class="money">${fmt(x.amount)}</td><td class="money">${fmt(x.margin)}</td><td class="money">${fmt(x.modal)}</td><td><button class="btn" type="button" data-v41-remove="${type}:${i}">Hapus</button></td></tr>`).join('');
    const used=arr.reduce((s,x)=>s+Number(x.modal||0),0), mar=arr.reduce((s,x)=>s+Number(x.margin||0),0);
    count.textContent=`${arr.length} transaksi • Modal terpakai ${fmt(used)} • Margin ${fmt(mar)}`;
    body.querySelectorAll('[data-v41-remove]').forEach(btn=>btn.addEventListener('click',()=>{
      const [t,i]=btn.dataset.v41Remove.split(':');
      txEntries[t].splice(Number(i),1);
      renderSales(t,t==='aksesoris'?'Aksesoris':'Obat',t==='aksesoris'?'acc':'med');
      updateAutoModals();
      if(typeof renderTxGlobalSummary==='function') renderTxGlobalSummary();
    }));
  }

  function activeState(){ return window.KARegulationsV29 || null; }
  function normalizeType(v){ return String(v||'').toLowerCase(); }
  function noteTypeMatches(note,type){
    const t=normalizeType(note?.type);
    return type==='accessory' ? ['accessory','aksesoris','acc'].includes(t) : ['medicine','obat'].includes(t);
  }
  function noteUsedForShift(st,note){
    const rec=st?.usedNotes?.[note?.id];
    if(!rec) return false;
    return !rec.shiftId || !note?.shiftId || String(rec.shiftId)===String(note.shiftId);
  }
  function usableNotes(type){
    const st=activeState();
    if(!st || !Array.isArray(st.notes)) return [];
    return st.notes.filter(n=>{
      if(!noteTypeMatches(n,type) || n.status==='void') return false;
      if(st.activeShift?.id && n.shiftId && n.shiftId!==st.activeShift.id) return false;
      return !noteUsedForShift(st,n);
    });
  }
  function activeShiftId(){
    try { return String(activeState()?.activeShift?.id || ''); }
    catch(_) { return ''; }
  }
  function purchaseInActiveShift(rec){
    const sid=activeShiftId();
    return sid ? String(rec?.shiftId || '')===sid : true;
  }
  function activePurchases(type){
    return (purchases[type]||[]).filter(purchaseInActiveShift);
  }
  function totalPurchases(type){ return activePurchases(type).reduce((s,x)=>s+Number(x.amount||0),0); }
  function totalUsed(type){
    const key=type==='accessory'?'aksesoris':'obat';
    return ((typeof txEntries!=='undefined' && txEntries[key])||[]).reduce((s,x)=>s+Number(x.modal||0),0);
  }
  function previousModal(type){
    const id=type==='accessory'?'prevModalCheck23':'prevModalCheck21';
    const el=$(id);
    if(el && String(el.value||'').trim()) return num(el.value);
    try {
      const target=type==='accessory'?'Modal ACC':'MODAL OBAT';
      const rec=typeof openingPrevModal!=='undefined' ? openingPrevModal.find(x=>String(x.name).toLowerCase()===target.toLowerCase()) : null;
      return Number(rec?.value||0);
    } catch(_){ return 0; }
  }
  function calculatedModal(type){ return previousModal(type)+totalPurchases(type)-totalUsed(type); }

  function installPurchaseUI(){
    if($('buy-aksesoris') || $('buy-obat')) return;
    const buySection=document.querySelector('section.section[data-i="1"]');
    if(!buySection) return;
    const tabs=buySection.querySelector('.subtabs');
    const notaTab=[...tabs.querySelectorAll('.subtab')].find(x=>/Nota Purchasing/i.test(x.textContent||''));
    const notaPane=$('buy-nota');
    if(!tabs||!notaTab||!notaPane) return;

    [['aksesoris','Belanja Aksesoris','accessory'],['obat','Belanja Obat','medicine']].forEach(([name,label,type])=>{
      const btn=document.createElement('button');
      btn.className='subtab'; btn.type='button'; btn.textContent=label;
      btn.setAttribute('data-ui-click',`showBuy('${name}',this)`);
      notaTab.insertAdjacentElement('beforebegin',btn);

      const pane=document.createElement('div');
      pane.className='subpane'; pane.id='buy-'+name;
      pane.innerHTML=purchasePaneHtml(name,label,type);
      notaPane.insertAdjacentElement('beforebegin',pane);
    });

    ['accessory','medicine'].forEach(type=>{
      const pfx=type==='accessory'?'accBuy':'medBuy';
      $(`${pfx}Note`)?.addEventListener('change',()=>syncPurchasePreview(type));
      $(`${pfx}Use`)?.addEventListener('click',()=>applyPurchaseNote(type));
    });
    refreshPurchaseUI();
  }

  function purchasePaneHtml(name,label,type){
    const pfx=type==='accessory'?'accBuy':'medBuy';
    return `<div class="grid two">
      <div class="card form focus-form-card">
        <h4 style="margin:0 0 14px">${label}</h4>
        <div class="notice blue">Nota dan nominal dibuat oleh Purchasing. Karyawan hanya memilih nota yang tersedia; nominal tidak dapat diubah.</div>
        <div class="form-grid">
          <div class="field"><label>Nota Purchasing</label><select class="select" id="${pfx}Note"><option value="">— Belum ada nota —</option></select></div>
          <div class="field"><label>Nominal Belanja</label><input class="input" id="${pfx}Amount" readonly placeholder="Otomatis dari nota"/></div>
        </div>
        <div class="actions" style="margin-top:14px"><button class="btn primary" type="button" id="${pfx}Use">Gunakan Nota Belanja</button></div>
      </div>
      <div class="card summary">
        <h4>Dampak ke Modal</h4>
        <div class="sumrow"><span>Modal sebelumnya</span><b id="${pfx}Prev">Rp0</b></div>
        <div class="sumrow"><span>Total belanja hari ini</span><b id="${pfx}Total">Rp0</b></div>
        <div class="sumrow"><span>Modal terpakai penjualan</span><b id="${pfx}Used">Rp0</b></div>
        <div class="sumrow"><span>Modal terbaru</span><b id="${pfx}Current">Rp0</b></div>
      </div>
    </div>
    <div class="card multi-list-card" style="margin-top:14px"><div class="section-head"><div><h4 style="margin:0">Nota ${label}</h4><p style="margin:4px 0 0;color:var(--muted)">Satu nota hanya dapat dipakai sekali.</p></div><span class="status info" id="${pfx}Count">0 nota</span></div><div class="table-wrap"><table class="table" style="min-width:680px"><thead><tr><th>#</th><th>Nota</th><th>Nominal</th><th>Waktu</th><th>Aksi</th></tr></thead><tbody id="${pfx}List"></tbody></table></div></div>`;
  }

  function refreshSelect(type){
    const pfx=type==='accessory'?'accBuy':'medBuy', sel=$(`${pfx}Note`);
    if(!sel) return;
    const current=sel.value;
    const notes=usableNotes(type);
    sel.innerHTML='<option value="">— Pilih nota Purchasing —</option>'+notes.map(n=>`<option value="${String(n.id).replace(/"/g,'&quot;')}">${n.id} • ${fmt(n.amount)}</option>`).join('');
    if(notes.some(n=>n.id===current)) sel.value=current;
    syncPurchasePreview(type);
  }
  function syncPurchasePreview(type){
    const pfx=type==='accessory'?'accBuy':'medBuy', sel=$(`${pfx}Note`), out=$(`${pfx}Amount`);
    if(!sel||!out) return;
    const st=activeState();
    const note=st?.notes?.find(n=>n.id===sel.value && noteTypeMatches(n,type));
    out.value=note?Number(note.amount||0).toLocaleString('id-ID'):'';
  }
  function applyPurchaseNote(type){
    const pfx=type==='accessory'?'accBuy':'medBuy', sel=$(`${pfx}Note`);
    const st=activeState();
    const note=st?.notes?.find(n=>n.id===sel?.value && noteTypeMatches(n,type));
    if(!note){ toast('Pilih Nota Purchasing terlebih dahulu.','warn'); return; }
    if(noteUsedForShift(st,note)){ toast('Nota ini sudah pernah dipakai pada shift ini.','bad'); refreshPurchaseUI(); return; }
    const amount=Number(note.amount||0);
    if(amount<=0){ toast('Nominal nota tidak valid.','bad'); return; }
    purchases[type].push({id:note.id,amount,uploadedAt:note.uploadedAt||'',shiftId:note.shiftId||st.activeShift?.id||'',usedAt:new Date().toISOString()});
    st.usedNotes ||= {};
    st.usedNotes[note.id]={area:type,at:new Date().toISOString(),shiftId:st.activeShift?.id||note.shiftId||''};
    try { localStorage.setItem('ka_v29_used_notes',JSON.stringify(st.usedNotes)); } catch(_){}
    savePurchases();
    refreshPurchaseUI();
    updateAutoModals();
    toast(`Belanja ${type==='accessory'?'Aksesoris':'Obat'} ${fmt(amount)} masuk ke modal otomatis.`,'ok');
  }
  function removePurchase(type,index){
    const rec=purchases[type]?.[index];
    if(!rec) return;
    purchases[type].splice(index,1);
    const st=activeState();
    if(st?.usedNotes?.[rec.id] && (!st.usedNotes[rec.id].shiftId || String(st.usedNotes[rec.id].shiftId)===String(rec.shiftId||''))) delete st.usedNotes[rec.id];
    try { if(st) localStorage.setItem('ka_v29_used_notes',JSON.stringify(st.usedNotes||{})); } catch(_){}
    savePurchases(); refreshPurchaseUI(); updateAutoModals();
  }
  function renderPurchaseList(type){
    const pfx=type==='accessory'?'accBuy':'medBuy';
    const arr=(purchases[type]||[])
      .map((x,rawIndex)=>({x,rawIndex}))
      .filter(rec=>purchaseInActiveShift(rec.x));
    const body=$(`${pfx}List`), count=$(`${pfx}Count`);
    if(!body||!count) return;
    if(!arr.length){ body.innerHTML='<tr><td class="multi-empty" colspan="5">Belum ada nota belanja pada shift ini.</td></tr>'; count.textContent='0 nota'; return; }
    body.innerHTML=arr.map((rec,i)=>`<tr><td>${i+1}</td><td><b>${rec.x.id}</b></td><td class="money">${fmt(rec.x.amount)}</td><td>${rec.x.uploadedAt||'—'}</td><td><button class="btn" type="button" data-v41-purchase-remove="${type}:${rec.rawIndex}">Batalkan</button></td></tr>`).join('');
    count.textContent=`${arr.length} nota • ${fmt(totalPurchases(type))}`;
    body.querySelectorAll('[data-v41-purchase-remove]').forEach(btn=>btn.addEventListener('click',()=>{ const [t,i]=btn.dataset.v41PurchaseRemove.split(':'); removePurchase(t,Number(i)); }));
  }
  function refreshPurchaseSummary(type){
    const pfx=type==='accessory'?'accBuy':'medBuy';
    if(!$(`${pfx}Prev`)) return;
    $(`${pfx}Prev`).textContent=fmt(previousModal(type));
    $(`${pfx}Total`).textContent=fmt(totalPurchases(type));
    $(`${pfx}Used`).textContent=fmt(totalUsed(type));
    const cur=calculatedModal(type);
    $(`${pfx}Current`).textContent=fmt(cur);
    $(`${pfx}Current`).style.color=cur<0?'var(--red)':'var(--green)';
  }
  function refreshPurchaseUI(){ ['accessory','medicine'].forEach(type=>{ refreshSelect(type); renderPurchaseList(type); refreshPurchaseSummary(type); }); }

  function makeModalAutomatic(inputId,label,sourceText){
    const input=$(inputId);
    if(!input) return;
    input.readOnly=true; input.setAttribute('aria-readonly','true');
    input.placeholder='Otomatis';
    const row=input.closest('tr');
    if(row){
      row.classList.remove('modal-manual'); row.classList.add('modal-auto');
      const cells=row.querySelectorAll('td');
      if(cells[1]) cells[1].innerHTML=`<span class="status info">Otomatis</span><div style="font-size:11px;color:var(--muted);margin-top:4px">${sourceText}</div>`;
    }
  }
  function updateAutoModals(){
    if(!ensureEntries()) return;
    const obat=calculatedModal('medicine'), acc=calculatedModal('accessory');
    const obatInput=$('modalInput21'), accInput=$('modalInput23');
    if(obatInput){ obatInput.value=Math.round(obat).toLocaleString('id-ID'); obatInput.style.color=obat<0?'var(--red)':''; }
    if(accInput){ accInput.value=Math.round(acc).toLocaleString('id-ID'); accInput.style.color=acc<0?'var(--red)':''; }
    refreshPurchaseSummary('medicine'); refreshPurchaseSummary('accessory');
    if(typeof calcModalInput==='function') calcModalInput();
  }

  function exposePurchasingBridge(){
    window.KAAccObatV41={
      addPurchasingNote(note){
        const st=activeState();
        if(!st || !Array.isArray(st.notes)) return false;
        const type=normalizeType(note?.type);
        if(!['accessory','aksesoris','acc','medicine','obat'].includes(type)) return false;
        if(!note.id || !(Number(note.amount)>0)) return false;
        const rec={id:String(note.id),type,amount:Number(note.amount),shiftId:note.shiftId||st.activeShift?.id||'',shiftLabel:note.shiftLabel||st.activeShift?.label||'',uploadedAt:note.uploadedAt||new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),status:note.status||'ready'};
        const ix=st.notes.findIndex(n=>n.id===rec.id);
        if(ix>=0) st.notes[ix]=rec; else st.notes.push(rec);
        try { localStorage.setItem('ka_v29_purchasing_notes',JSON.stringify(st.notes)); } catch(_){}
        refreshPurchaseUI();
        return true;
      },
      refresh:refreshPurchaseUI,
      updateModal:updateAutoModals
    };
  }

  function install(){
    moveOperationalToStep4();
    installTransactionUI();
    installPurchaseUI();
    makeModalAutomatic('modalInput21','MODAL OBAT','Modal sebelumnya + Belanja Obat − Modal terpakai');
    makeModalAutomatic('modalInput23','Modal ACC','Modal sebelumnya + Belanja Aksesoris − Modal terpakai');
    $('prevModalCheck21')?.addEventListener('input',()=>{ updateAutoModals(); refreshPurchaseUI(); });
    $('prevModalCheck23')?.addEventListener('input',()=>{ updateAutoModals(); refreshPurchaseUI(); });
    exposePurchasingBridge();
    updateAutoModals();
    document.querySelectorAll('.topbar .status.info').forEach(el=>{ if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V41 — ACC/OBAT + OPERASIONAL #4'; });
    if(typeof bindRuntimeActions==='function') bindRuntimeActions();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
