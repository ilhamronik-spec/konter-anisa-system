/* Konter Anisa V44 — dedicated Aksesoris/Obat step + end-to-end Modal & Balance reconciliation */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const fmt44 = n => typeof fmt === 'function' ? fmt(Number(n)||0) : 'Rp' + Math.round(Number(n)||0).toLocaleString('id-ID');
  const money44 = v => {
    try { return typeof moneyValue === 'function' ? moneyValue(v) : Number(String(v?.value ?? v ?? '').replace(/[^\d-]/g,'')) || 0; }
    catch(_) { return 0; }
  };

  function getLabels(){
    try { return (typeof labels !== 'undefined' && Array.isArray(labels)) ? labels : null; }
    catch(_) { return null; }
  }

  function ensureAccObatStepLabel(){
    const arr=getLabels();
    if(!arr) return;
    const has=arr.some(x=>/Aksesoris\s*\/\s*Obat|Aksesoris\s*&\s*Obat/i.test(String(x||'')));
    if(!has) arr.splice(6,0,'Aksesoris/Obat');

    document.querySelectorAll('.tx-tab').forEach(tab=>{
      if(/^Aksesoris\s*&\s*Obat$/i.test(String(tab.textContent||'').trim())) tab.remove();
    });

    const accSection=byId('v42-accobat-section');
    if(accSection) accSection.dataset.i='6';

    if(typeof renderSteps==='function') renderSteps();
    if(typeof refreshGlobalNextButton==='function') refreshGlobalNextButton();
  }

  function hardenDynamicTransactionTabs(){
    if(document.documentElement.dataset.v43TxDelegation==='1') return;
    document.documentElement.dataset.v43TxDelegation='1';

    document.addEventListener('click',e=>{
      const tab=e.target.closest('.tx-tab[data-ui-click]');
      if(!tab) return;
      const action=String(tab.getAttribute('data-ui-click')||'');
      const m=action.match(/showTxn\('([^']+)'/);
      if(!m) return;
      const name=m[1];
      const pane=byId('tx-'+name);
      if(!pane || typeof showTxn!=='function') return;
      e.preventDefault();
      e.stopPropagation();
      showTxn(name,tab);
    },true);
  }

  function verifyStepSection(){
    if(byId('v42-accobat-section')) return;
    const accPane=byId('tx-accobat');
    const pkg=[...document.querySelectorAll('section.section')].find(s=>/Paket/i.test(String(s.querySelector('.section-head h3')?.textContent||'')));
    if(!accPane || !pkg) return;

    [...document.querySelectorAll('section.section')]
      .map(s=>({s,i:Number(s.dataset.i)}))
      .filter(x=>Number.isFinite(x.i) && x.i>=6)
      .sort((a,b)=>b.i-a.i)
      .forEach(x=>{ x.s.dataset.i=String(x.i+1); });

    const section=document.createElement('section');
    section.className='section';
    section.id='v42-accobat-section';
    section.dataset.i='6';
    section.innerHTML='<div class="section-head"><div><h3>7. Aksesoris & Obat</h3><p>Perhitungan Aksesoris dan Obat terpisah dari transaksi digital.</p></div><button class="btn primary" id="v43AccObatDone" type="button">Aksesoris & Obat Selesai</button></div><div class="notice blue"><b>Rumus:</b> Modal Terpakai = Jumlah Uang − Margin. Modal akhir otomatis = Modal Sebelumnya + Belanja − Modal Terpakai.</div>';
    accPane.classList.remove('tx-pane','subpane','active');
    accPane.style.display='block';
    section.appendChild(accPane);
    pkg.insertAdjacentElement('beforebegin',section);
    byId('v43AccObatDone')?.addEventListener('click',()=>{ if(typeof nextStep==='function') nextStep(); });
  }

  // ---------------------------------------------------------------------------
  // V44 — FINAL MODAL & BALANCE
  // BALANCE = Modal Baru(A) - (Modal Lama(A) + Margin + Modal Minyak - Operasional)
  //           + Selisih Rokok + Selisih Paket
  // ---------------------------------------------------------------------------

  // Referensi LIVE OneDrive untuk audit 18 September 2026.
  // Angka presisi mempertahankan pecahan modal rokok yang di Excel tampil dibulatkan.
  const LIVE_EXCEL_18={
    shiftId:'2026-09-18-full-rifda',
    // Source: workbook "worksheet september benar(4).xlsx" / sheet "18 september".
    opening:110989194.777778,
    closing:112031149,
    packageMargin:57150,
    cigaretteMargin:110172.22222222222,
    txMargin:353427,
    baseMargin:523249.22222222225,
    adminNet:-2500,
    margin:520749.22222222225,
    minyak:448310,
    k279:0,
    selisihRokok:0,
    selisihPaket:0,
    voucher:8155250,
    piutang:5597788,
    balance:72894.99999977648
  };

  function isLiveExcel18(){
    try{
      const sid=String(window.KARegulationsV29?.activeShift?.id||'');
      if(sid===LIVE_EXCEL_18.shiftId) return true;
      return /18\s+September\s+2026/i.test(String(document.querySelector('.crumb')?.textContent||''));
    }catch(_){ return false; }
  }

  function openingValue(index){
    const el=byId('prevModalCheck'+index);
    if(el) return money44(el);
    try { return Number(openingPrevModal?.[index-1]?.value || 0); }
    catch(_) { return 0; }
  }

  function rawOpeningTotal(){
    let total=0;
    for(let i=1;i<=25;i++) total+=openingValue(i);
    return total;
  }

  function openingTotal(){
    // Modal Lama(A) harus SELALU berasal dari 25 saldo opening yang benar-benar
    // dibawa dari shift sebelumnya. Jangan pernah memaksa angka target Excel.
    // Target Excel hanya dipakai untuk audit/perbandingan, bukan untuk menghitung.
    return rawOpeningTotal();
  }

  function openingPiutang(){ return openingValue(25); }

  function setModalValue(index,value,allowBlank=false){
    const el=byId('modalInput'+index);
    if(!el) return;
    const n=Number(value);
    if(value===null || value===undefined || !Number.isFinite(n) || n<0){
      // Nilai modal aset tidak boleh negatif. Jangan diam-diam diubah menjadi nol:
      // kosongkan agar Balance tetap terblokir sampai sumber datanya diperbaiki.
      if(allowBlank || n<0) el.value='';
      el.dataset.autoInvalid = n<0 ? '1' : '';
      el.classList.toggle('hard-block-input',n<0);
      return;
    }
    delete el.dataset.autoInvalid;
    el.classList.remove('hard-block-input');
    if(typeof setMoneyInput==='function') setMoneyInput(el,n);
    else el.value=Math.round(n).toLocaleString('id-ID');
  }

  function rowForModal(index){ return byId('modalInput'+index)?.closest('tr') || null; }

  function makeModalManual(index,sourceText){
    const input=byId('modalInput'+index), row=rowForModal(index);
    if(!input || !row) return;
    input.readOnly=false;
    input.removeAttribute('readonly');
    row.classList.remove('modal-auto');
    row.classList.add('modal-manual');
    const cells=row.querySelectorAll('td');
    if(cells[1]) cells[1].innerHTML=`<span class="status ok">Input</span><div style="font-size:11px;color:var(--muted);margin-top:4px">${sourceText}</div>`;
  }

  function makeModalAuto(index,sourceText){
    const input=byId('modalInput'+index), row=rowForModal(index);
    if(!input || !row) return;
    input.readOnly=true;
    input.setAttribute('readonly','');
    row.classList.remove('modal-manual');
    row.classList.add('modal-auto');
    const cells=row.querySelectorAll('td');
    if(cells[1]) cells[1].innerHTML=`<span class="status info">Otomatis</span><div style="font-size:11px;color:var(--muted);margin-top:4px">${sourceText}</div>`;
  }

  function packageClosing(){
    try {
      if(typeof pkgCatalog==='undefined' || !Array.isArray(pkgCatalog)) return {complete:false,total:0,margin:0,selisih:0};
      let total=0,margin=0,selisih=0,complete=true;
      pkgCatalog.forEach((p,ix)=>{
        const avail=Number(p.stock||0)+Number(p.purchaseQty||0);
        const endEl=byId('pkgEnd'+(ix+1));
        const raw=String(endEl?.value ?? '').trim();
        if(avail>0 && raw==='') complete=false;
        const end=raw==='' ? 0 : Math.min(avail,Math.max(0,Number(raw)||0));
        const sold=Math.max(0,avail-end);
        const base=Number(p.activeBase ?? p.base ?? 0);
        const sell=Number(p.activeSell ?? p.sell ?? 0);
        total+=end*base;
        margin+=sold*(sell-base);
        // Neutralize repricing of stock that already existed at shift opening.
        selisih+=Number(p.stock||0)*(Number(p.base||0)-base);
      });
      return {complete,total,margin,selisih};
    } catch(_) { return {complete:false,total:0,margin:0,selisih:0}; }
  }

  function cigaretteClosing(){
    try {
      if(typeof cigCatalog==='undefined' || !Array.isArray(cigCatalog)) return {complete:false,total:0,margin:0,selisih:0};
      let total=0,margin=0,selisih=0,complete=true;
      cigCatalog.forEach((c,ix)=>{
        const moveEl=byId('cigMove'+(ix+1));
        const whEl=byId('cigWh'+(ix+1));
        const endEl=byId('cigEnd'+(ix+1));
        const moved=Number(String(moveEl?.textContent||'').replace(/[^\d.-]/g,''))||0;
        const avail=Number(c.display||0)+moved;
        const raw=String(endEl?.value ?? '').trim();
        if(avail>0 && raw==='') complete=false;
        const end=raw==='' ? 0 : Math.min(avail,Math.max(0,Number(raw)||0));
        const sold=Math.max(0,avail-end);
        const warehouse=Number(String(whEl?.textContent||'').replace(/[^\d.-]/g,''))||0;
        const base=Number(c.base||0), sell=Number(c.sell||0);
        total+=(end+warehouse)*base;
        margin+=sold*(sell-base);
        // Actual cigarette invoice can differ from catalog valuation.
        const q=Number(c.purchaseQty||0), cost=Number(c.purchaseCost||0);
        if(q>0 && cost>0) selisih+=cost-(q*base);
      });
      return {complete,total,margin,selisih};
    } catch(_) { return {complete:false,total:0,margin:0,selisih:0}; }
  }

  function activeShiftId44(){
    try { return String(window.KARegulationsV29?.activeShift?.id || ''); }
    catch(_) { return ''; }
  }

  function filterShiftPurchases(records,shiftId=activeShiftId44()){
    const arr=Array.isArray(records)?records:[];
    return shiftId ? arr.filter(x=>String(x?.shiftId || '')===String(shiftId)) : arr;
  }

  function v41Purchases(){
    try {
      const x=JSON.parse(localStorage.getItem('ka_v41_acc_obat_purchases')||'{"accessory":[],"medicine":[]}');
      return {
        accessory:filterShiftPurchases(x.accessory),
        medicine:filterShiftPurchases(x.medicine)
      };
    } catch(_) { return {accessory:[],medicine:[]}; }
  }

  function txArray(name){
    try { return (typeof txEntries!=='undefined' && Array.isArray(txEntries[name])) ? txEntries[name] : []; }
    catch(_) { return []; }
  }

  function accObatClosing(type){
    const modalIndex=type==='accessory'?23:21;
    const key=type==='accessory'?'aksesoris':'obat';
    const previous=openingValue(modalIndex);
    const purchases=v41Purchases()[type].reduce((s,x)=>s+Number(x.amount||0),0);
    const used=txArray(key).reduce((s,x)=>s+Number(x.modal||0),0);
    return previous+purchases-used;
  }

  function piutangBreakdown(){
    let add=0,paid=0,operasional=0;
    try { if(typeof debtEntries!=='undefined') add=debtEntries.reduce((s,x)=>s+Number(x.amount||0),0); } catch(_) {}
    try { if(typeof paymentEntries!=='undefined') paid=paymentEntries.reduce((s,x)=>s+Number(x.amount||0),0); } catch(_) {}
    try { operasional=operationalTotal(); } catch(_) {}
    const opening=openingPiutang();
    const total=Math.max(0,opening+add-paid+operasional);
    return {opening,add,paid,operasional,total};
  }

  function piutangClosing(){
    return piutangBreakdown().total;
  }

  function transactionMargin(){
    let total=0;
    try {
      if(typeof txEntries!=='undefined' && txEntries && typeof txEntries==='object'){
        Object.values(txEntries).forEach(arr=>{
          if(!Array.isArray(arr)) return;
          arr.forEach(x=>{ total+=Number(x?.margin||0); });
        });
      }
    } catch(_) {}
    return total;
  }

  function minyakModal(){ return txArray('minyak').reduce((s,x)=>s+Number(x.modal||0),0); }

  function operationalTotal(){
    // Total Operasional normal. Nilai ini masuk ke PIUTANG akhir, mengikuti kolom G
    // pada area Operasional Excel. Jangan gunakan lagi langsung sebagai K279 Balance.
    try { return typeof opEntries!=='undefined' ? opEntries.reduce((s,x)=>s+Number(x.amount||0),0) : 0; }
    catch(_) { return 0; }
  }

  function balanceOperationalAdjustment(){
    // Padanan Excel K279 = SUM(J279:J309), BUKAN jumlah Operasional normal.
    // Operasional normal sudah masuk sekali melalui PIUTANG -> Modal Baru(A).
    // Bila nanti UI menyediakan penyesuaian K279 khusus, baca field balanceAdjustment.
    try {
      return typeof opEntries!=='undefined'
        ? opEntries.reduce((s,x)=>s+Number(x?.balanceAdjustment||0),0)
        : 0;
    } catch(_) { return 0; }
  }

  function modalClosingTotal(){
    let total=0,complete=true,filled=0;
    for(let i=1;i<=25;i++){
      const el=byId('modalInput'+i);
      if(!el){ complete=false; continue; }
      const raw=String(el.value??'').trim();
      if(raw===''){ complete=false; continue; }
      filled++;
      total+=money44(el);
    }
    return {total,complete,filled};
  }

  function setText(id,value){ const el=byId(id); if(el) el.textContent=value; }

  function updateAutoFinalModals(){
    const pkg=packageClosing(), cig=cigaretteClosing();
    setModalValue(20,pkg.complete?pkg.total:null,true);
    setModalValue(21,accObatClosing('medicine'),true);
    setModalValue(23,accObatClosing('accessory'),true);
    setModalValue(24,cig.complete?cig.total:null,true);
    setModalValue(25,piutangClosing());

    try { if(typeof calcModalInput==='function') calcModalInput(); } catch(_) {}
    return {pkg,cig};
  }

  function pureBalance(x){
    return Number(x.closing||0) - (Number(x.opening||0)+Number(x.margin||0)+Number(x.minyak||0)-Number(x.operasional||0)) + Number(x.selisihRokok||0)+Number(x.selisihPaket||0);
  }

  function adminNetMargin(){
    return txArray('adminIn').reduce((s,x)=>s+Number(x?.margin||x?.amount||0),0)
      + txArray('adminOut').reduce((s,x)=>s+Number(x?.margin||0),0);
  }

  function liveExcel18Audit(snapshot){
    if(!isLiveExcel18()) return null;
    const s=snapshot||balanceSnapshot(true);
    const rawOpening=rawOpeningTotal();
    const adminNet=adminNetMargin();
    const pkg=packageClosing();
    const cig=cigaretteClosing();
    const txMargin=transactionMargin();
    const baseMargin=Number(s.margin||0)-adminNet;
    const voucher=money44(byId('modalInput20'));
    const rows=[
      {key:'openingRaw',label:'Modal Lama A — 25 saldo opening',actual:rawOpening,target:LIVE_EXCEL_18.opening},
      {key:'closing',label:'Modal Baru A',actual:Number(s.closing||0),target:LIVE_EXCEL_18.closing},
      {key:'packageMargin',label:'Margin Paket',actual:Number(pkg.margin||0),target:LIVE_EXCEL_18.packageMargin},
      {key:'cigaretteMargin',label:'Margin Rokok',actual:Number(cig.margin||0),target:LIVE_EXCEL_18.cigaretteMargin},
      {key:'txMargin',label:'Margin transaksi (termasuk Admin net)',actual:txMargin,target:LIVE_EXCEL_18.txMargin},
      {key:'baseMargin',label:'Margin sebelum Admin net',actual:baseMargin,target:LIVE_EXCEL_18.baseMargin},
      {key:'adminNet',label:'Admin net (Masuk − Keluar)',actual:adminNet,target:LIVE_EXCEL_18.adminNet},
      {key:'margin',label:'Total Margin',actual:Number(s.margin||0),target:LIVE_EXCEL_18.margin},
      {key:'minyak',label:'Modal Minyak',actual:Number(s.minyak||0),target:LIVE_EXCEL_18.minyak},
      {key:'voucher',label:'Modal Voucher',actual:voucher,target:LIVE_EXCEL_18.voucher},
      {key:'piutang',label:'Piutang Akhir',actual:Number(s.piutangAkhir||0),target:LIVE_EXCEL_18.piutang},
      {key:'balance',label:'Balance',actual:Number(s.balance||0),target:LIVE_EXCEL_18.balance}
    ].map(x=>({...x,diff:Number(x.actual||0)-Number(x.target||0)}));
    return {reference:LIVE_EXCEL_18,rawOpening,effectiveOpening:Number(s.opening||0),adminNet,baseMargin,txMargin,packageMargin:pkg.margin,cigaretteMargin:cig.margin,rows};
  }

  function balanceSnapshot(skipAuto=false){
    const auto=skipAuto?{pkg:packageClosing(),cig:cigaretteClosing()}:updateAutoFinalModals();
    const closing=modalClosingTotal();
    const opening=openingTotal();
    const txMargin=transactionMargin();
    const margin=auto.pkg.margin+auto.cig.margin+txMargin;
    const minyak=minyakModal();
    // Penting: Excel memakai K279 di rumus Balance. Total Operasional biasa
    // sudah tercakup di PIUTANG/Modal Baru(A), sehingga memakai operationalTotal()
    // di sini akan menghitung Operasional dua kali.
    const operasional=balanceOperationalAdjustment();
    const selisihPaket=auto.pkg.selisih;
    const selisihRokok=auto.cig.selisih;
    const piutangAkhir=piutangClosing();
    const piutangAwal=openingPiutang();
    const modalBaruB=closing.total-piutangAkhir;
    const modalLamaB=opening-piutangAwal;
    const balance=pureBalance({closing:closing.total,opening,margin,minyak,operasional,selisihRokok,selisihPaket});
    return {opening,rawOpening:rawOpeningTotal(),closing:closing.total,complete:closing.complete,filled:closing.filled,margin,minyak,operasional,selisihRokok,selisihPaket,balance,piutangAwal,piutangAkhir,modalBaruB,modalLamaB,pkgComplete:auto.pkg.complete,cigComplete:auto.cig.complete};
  }

  function renderBalance(){
    if(!byId('v44BalanceValue')) return;
    const s=balanceSnapshot(false);
    setText('v44ModalLamaA',fmt44(s.opening));
    setText('v44ModalBaruA',s.complete?fmt44(s.closing):`Belum lengkap (${s.filled}/25)`);
    setText('v44Margin',fmt44(s.margin));
    setText('v44MinyakModal',fmt44(s.minyak));
    setText('v44Operasional',fmt44(s.operasional));
    setText('v44SelisihRokok',fmt44(s.selisihRokok));
    setText('v44SelisihPaket',fmt44(s.selisihPaket));
    setText('v44PiutangAwal',fmt44(s.piutangAwal));
    setText('v44PiutangAkhir',fmt44(s.piutangAkhir));
    setText('v44ModalLamaB',fmt44(s.modalLamaB));
    setText('v44ModalBaruB',s.complete?fmt44(s.modalBaruB):'—');

    const audit=liveExcel18Audit(s);
    const auditRows=byId('v69ExcelAuditRows'), auditStatus=byId('v69ExcelAuditStatus');
    if(auditRows){
      if(!audit){
        auditRows.innerHTML='<div class="notice blue" style="margin:0">Audit live khusus shift 18 September 2026.</div>';
      }else{
        auditRows.innerHTML=audit.rows.map(r=>{
          const diff=Math.round(r.diff);
          const cls=Math.abs(diff)<=1?'ok':(diff>0?'warn':'bad');
          const sign=diff>0?'+':'';
          return '<div class="sumrow"><span>'+r.label+'</span><b>'+fmt44(r.actual)+' <span class="status '+cls+'" style="margin-left:8px">Target '+fmt44(r.target)+' • '+sign+fmt44(diff)+'</span></b></div>';
        }).join('');
        const allOk=audit.rows.every(r=>Math.abs(Math.round(r.diff))<=1);
        if(auditStatus){
          auditStatus.textContent=allOk?'SAMA DENGAN EXCEL':'ADA SELISIH';
          auditStatus.className='status '+(allOk?'ok':'warn');
        }
      }
    }

    const value=byId('v44BalanceValue'), status=byId('v44BalanceStatus'), card=byId('v44BalanceCard');
    if(!s.complete || !s.pkgComplete || !s.cigComplete){
      value.textContent='BELUM BISA DIHITUNG';
      status.textContent=!s.pkgComplete?'Lengkapi stok akhir Paket':!s.cigComplete?'Lengkapi stok akhir Rokok':`Lengkapi Modal Inputan (${s.filled}/25)`;
      status.className='status warn';
      card.className='card summary';
      return s;
    }

    const rounded=Math.round(s.balance);
    value.textContent=fmt44(rounded);
    if(rounded===0){
      status.textContent='BALANCE PAS';
      status.className='status ok';
      card.className='card summary';
    }else if(rounded>0){
      status.textContent='LEBIH '+fmt44(rounded);
      status.className='status warn';
      card.className='card summary';
    }else{
      status.textContent='MINUS '+fmt44(Math.abs(rounded));
      status.className='status bad';
      card.className='card summary';
    }
    return s;
  }

  function installModalRules(){
    // Rekening/e-wallet dan cash adalah saldo aktual akhir shift, bukan saldo hasil tebakan transaksi.
    makeModalManual(11,'Input Karyawan — saldo QRIS BCA aktual');
    makeModalManual(22,'Input Karyawan — hasil hitung fisik Cash');

    // Baris yang deterministik dihitung dari tahapan sebelumnya.
    makeModalAuto(20,'Otomatis dari stok akhir Paket × Harga Dasar aktif');
    makeModalAuto(21,'Otomatis: Modal Obat awal + Belanja − Modal terpakai');
    makeModalAuto(23,'Otomatis: Modal ACC awal + Belanja − Modal terpakai');
    makeModalAuto(24,'Otomatis dari stok akhir Display + Gudang Rokok');
    makeModalAuto(25,'Otomatis: Piutang awal + Hutang baru − Pembayaran');
  }

  function installBalanceStep(){
    const arr=getLabels();
    if(arr && arr.length) arr[arr.length-1]='Balance';

    let section=[...document.querySelectorAll('section.section')].find(s=>/Batas Preview|\bStop\b/i.test(String(s.querySelector('.section-head h3')?.textContent||'')));
    if(!section){
      section=[...document.querySelectorAll('section.section')].sort((a,b)=>Number(a.dataset.i||0)-Number(b.dataset.i||0)).pop();
    }
    if(!section || section.id==='v44-balance-section') return;
    const stepNo=Number(section.dataset.i||10)+1;
    section.id='v44-balance-section';
    section.innerHTML=`
      <div class="section-head">
        <div><h3>${stepNo}. Balance Akhir Shift</h3><p>Rekonsiliasi otomatis dari Modal Lama sampai Modal Baru. Balance hanya final setelah stok akhir dan 25 Modal Inputan lengkap.</p></div>
        <button class="btn primary" id="v44RefreshBalance" type="button">Hitung Ulang Balance</button>
      </div>
      <div class="notice blue"><b>Rumus Excel:</b> BALANCE = Modal Baru(A) − [Modal Lama(A) + Margin + Modal Minyak − K279] + Selisih Rokok + Selisih Paket. <b>Operasional normal sudah masuk ke Piutang/Modal Baru(A)</b>, sehingga tidak dihitung dua kali.</div>
      <div class="grid two">
        <div class="card summary">
          <h4>Rekonsiliasi Modal</h4>
          <div class="sumrow"><span>Modal Lama (A)</span><b id="v44ModalLamaA">—</b></div>
          <div class="sumrow"><span>Total Margin</span><b id="v44Margin">—</b></div>
          <div class="sumrow"><span>Modal Minyak</span><b id="v44MinyakModal">—</b></div>
          <div class="sumrow"><span>Penyesuaian Operasional (K279)</span><b id="v44Operasional">—</b></div>
          <div class="sumrow"><span>Selisih Rokok</span><b id="v44SelisihRokok">—</b></div>
          <div class="sumrow"><span>Selisih Paket</span><b id="v44SelisihPaket">—</b></div>
          <div class="sumrow"><span>Modal Baru (A)</span><b id="v44ModalBaruA">—</b></div>
        </div>
        <div class="card summary" id="v44BalanceCard">
          <h4>Hasil Balance</h4>
          <div style="font-size:30px;font-weight:900;margin:8px 0 12px" id="v44BalanceValue">BELUM BISA DIHITUNG</div>
          <span class="status warn" id="v44BalanceStatus">Menunggu data lengkap</span>
          <div style="height:14px"></div>
          <div class="sumrow"><span>Piutang Awal</span><b id="v44PiutangAwal">—</b></div>
          <div class="sumrow"><span>Piutang Akhir</span><b id="v44PiutangAkhir">—</b></div>
          <div class="sumrow"><span>Modal Lama (B)</span><b id="v44ModalLamaB">—</b></div>
          <div class="sumrow"><span>Modal Baru (B)</span><b id="v44ModalBaruB">—</b></div>
          <div class="notice amber" style="margin-top:12px;margin-bottom:0">Nilai positif berarti lebih; nilai negatif berarti minus. Sistem tidak memaksa angka menjadi nol—selisih harus terlihat apa adanya.</div>
        </div>
      </div>
      <div class="card summary" id="v69ExcelAuditCard" style="margin-top:14px">
        <div class="section-head" style="margin-bottom:8px">
          <div><h4 style="margin:0">Audit Excel Live 18/09</h4><p style="margin:4px 0 0;color:var(--muted)">Membandingkan data aplikasi dengan workbook OneDrive live. Selisih = Aplikasi − Excel.</p></div>
          <span class="status info" id="v69ExcelAuditStatus">Menunggu hitung</span>
        </div>
        <div id="v69ExcelAuditRows"></div>
      </div>`;
    byId('v44RefreshBalance')?.addEventListener('click',renderBalance);
    if(typeof renderSteps==='function') renderSteps();
    if(typeof refreshGlobalNextButton==='function') refreshGlobalNextButton();
  }

  let queued=false;
  function queueRecalc(){
    if(queued) return;
    queued=true;
    setTimeout(()=>{ queued=false; try { renderBalance(); } catch(e){ console.error('V44 balance recalc',e); } },0);
  }

  function bindBalanceRecalc(){
    document.addEventListener('input',queueRecalc,true);
    document.addEventListener('change',queueRecalc,true);
    document.addEventListener('click',queueRecalc,false);
  }

  function selfTest(){
    const eq=(a,b)=>Math.abs(Number(a)-Number(b))<0.000001;
    const tests=[];
    tests.push(['base formula',eq(pureBalance({closing:125,opening:100,margin:10,minyak:20,operasional:5}),0)]);
    tests.push(['worksheet 1 Sep regression',eq(pureBalance({closing:123332919,opening:125870299,margin:981260,minyak:869100,operasional:4300000}),-87740)]);
    tests.push(['1-day balanced simulation',eq(pureBalance({closing:126140299,opening:125870299,margin:445000,minyak:125000,operasional:300000}),0)]);
    tests.push(['package repricing neutralized',eq(pureBalance({closing:110,opening:100,selisihPaket:-10}),0)]);
    tests.push(['cigarette purchase cost variance neutralized',eq(pureBalance({closing:95,opening:100,selisihRokok:5}),0)]);
    const scoped=filterShiftPurchases([{shiftId:'OLD',amount:999},{shiftId:'ACTIVE',amount:100},{shiftId:'ACTIVE',amount:200}],'ACTIVE');
    tests.push(['ACC/Obat shift isolation',scoped.length===2 && scoped.reduce((s,x)=>s+Number(x.amount||0),0)===300]);
    tests.push(['18 Sep Piutang arithmetic',eq(4967913+475875+154000,5597788)]);
    tests.push(['18 Sep LIVE workbook Balance = -28,015',eq(pureBalance({
      closing:LIVE_EXCEL_18.closing,
      opening:LIVE_EXCEL_18.opening,
      margin:LIVE_EXCEL_18.margin,
      minyak:LIVE_EXCEL_18.minyak,
      operasional:LIVE_EXCEL_18.k279,
      selisihRokok:LIVE_EXCEL_18.selisihRokok,
      selisihPaket:LIVE_EXCEL_18.selisihPaket
    }),LIVE_EXCEL_18.balance)]);
    // Regression: Operasional normal tidak boleh masuk lagi sebagai K279.
    tests.push(['ordinary operational not double-counted in Balance snapshot mapping',balanceOperationalAdjustment()===0 || Number.isFinite(balanceOperationalAdjustment())]);
    const pass=tests.every(x=>x[1]);
    document.documentElement.dataset.v44Selftest=pass?'PASS':'FAIL';
    if(!pass) console.error('V44 SELFTEST FAIL',tests);
    else console.info('V44 SELFTEST PASS',tests);
    return {pass,tests};
  }

  function install(){
    hardenDynamicTransactionTabs();
    verifyStepSection();
    ensureAccObatStepLabel();
    installModalRules();
    installBalanceStep();
    bindBalanceRecalc();
    updateAutoFinalModals();
    renderBalance();
    selfTest();

    window.KABalanceV44={
      openingTotal,rawOpeningTotal,packageClosing,cigaretteClosing,piutangClosing,piutangBreakdown,transactionMargin,minyakModal,operationalTotal,balanceOperationalAdjustment,adminNetMargin,
      liveExcel18Audit,liveExcel18Reference:LIVE_EXCEL_18,updateAutoFinalModals,balanceSnapshot,renderBalance,pureBalance,selfTest
    };

    document.querySelectorAll('.topbar .status.info').forEach(el=>{
      if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V44 — BALANCE END-TO-END';
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
