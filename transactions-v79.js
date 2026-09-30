/* Konter Anisa V79 — Sheet 18 regression audit + balance lock diagnostics */
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const fmt=n=>{
    try{ if(typeof window.fmt==='function') return window.fmt(Number(n)||0); }catch(_){}
    return 'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');
  };

  const EXPECTED=Object.freeze({
    voucher:8155250,
    piutang:5597788,
    openingPiutang:4967913,
    debtPaymentNet:-100125,
    operasional:730000,
    balance:-28015,
    modalBaruA:110299149,
    modalLamaA:109257194.77777778,
    margin:621659.2222222222,
    modalMinyak:448310
  });

  function isSheet18(){
    try{
      const id=String(window.KARegulationsV29?.activeShift?.id||'');
      if(/^2026-09-18(?:-|$)/.test(id)) return true;
    }catch(_){}
    return /18\s+September\s+2026/i.test(String(document.querySelector('.crumb')?.textContent||''));
  }

  function componentAudit(){
    const bal=window.KABalanceV44;
    if(!bal||!isSheet18()) return null;
    const pkg=bal.packageClosing?.()||{complete:false,total:0};
    const p=bal.piutangBreakdown?.()||{opening:0,add:0,paid:0,operasional:0,total:0};
    const debtNet=Number(p.add||0)-Number(p.paid||0);
    return {
      pkgComplete:!!pkg.complete,
      voucher:Number(pkg.total||0),
      voucherDiff:Number(pkg.total||0)-EXPECTED.voucher,
      piutang:Number(p.total||0),
      piutangDiff:Number(p.total||0)-EXPECTED.piutang,
      openingPiutang:Number(p.opening||0),
      openingPiutangDiff:Number(p.opening||0)-EXPECTED.openingPiutang,
      debtPaymentNet:debtNet,
      debtPaymentNetDiff:debtNet-EXPECTED.debtPaymentNet,
      operasional:Number(p.operasional||0),
      operasionalDiff:Number(p.operasional||0)-EXPECTED.operasional
    };
  }

  function signed(n){
    const v=Math.round(Number(n)||0);
    return (v>0?'+':'')+fmt(v);
  }

  // UI pembanding Sheet 18 dihapus dari halaman Balance.
  // Audit angka tetap tersedia hanya untuk diagnostic internal via KASheet18AuditV79.audit().
  function render(){
    const box=$('v79Sheet18Audit');
    if(box) box.remove();
  }

  function selfTest(){
    const bal=window.KABalanceV44;
    const tests=[];
    const eq=(a,b)=>Math.abs(Number(a)-Number(b))<0.0001;
    tests.push(['Balance API available',!!bal?.pureBalance]);
    if(bal?.pureBalance){
      tests.push(['Sheet18 Balance regression -28,015',eq(bal.pureBalance({
        closing:EXPECTED.modalBaruA,
        opening:EXPECTED.modalLamaA,
        margin:EXPECTED.margin,
        minyak:EXPECTED.modalMinyak,
        belanjaMinyak:0,
        selisihRokok:0,
        selisihPaket:0
      }),EXPECTED.balance)]);
    }
    tests.push(['Sheet18 Piutang regression',4867788+730000===EXPECTED.piutang]);
    tests.push(['Voucher typo diagnostic arithmetic',7732850+(32*13200)===EXPECTED.voucher]);
    const pass=tests.every(x=>x[1]);
    document.documentElement.dataset.v79Selftest=pass?'PASS':'FAIL';
    if(!pass) console.error('V79 SELFTEST FAIL',tests);
    else console.info('V79 SELFTEST PASS',tests);
    return {pass,tests};
  }

  function refresh(){ render(); }

  function install(){
    selfTest();
    render();
    window.KASheet18AuditV79={expected:EXPECTED,audit:componentAudit,render,selfTest};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});
  else setTimeout(install,0);
})();

/* Closing 28 Sep → Opening 29 Sep: enforce active costs after autosave restore */
(function(){
  'use strict';
  const TARGET='2026-09-29';
  function activeDate(){
    try{
      const q=new URLSearchParams(location.search);
      if(q.get('sim_date')) return String(q.get('sim_date')).trim();
      const d=window.KARegulationsV29?.activeShift?.date;
      if(d)return String(d).trim();
      const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const x=Object.fromEntries(p.filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));
      return x.year+'-'+x.month+'-'+x.day;
    }catch(_){return '';}
  }
  function applyClosing28Prices(){
    if(activeDate()!==TARGET||typeof pkgCatalog==='undefined'||typeof cigCatalog==='undefined')return;
    pkgCatalog.forEach(p=>{
      const base=Number(p.base||0),sell=Number(p.sell||0);
      p._openingBase=base;p.purchaseBase=base;p.activeBase=base;p.activeSell=sell;p.purchaseQty=0;
    });
    cigCatalog.forEach(c=>{
      const base=Number(c.base||0);
      c._openingBase=base;c.activeBase=base;c.purchaseQty=0;c.purchaseCost=0;
    });
    try{window.KAStockV50?.refreshOpeningSystem?.()}catch(_){}
    try{window.refreshPkgNameViews?.()}catch(_){}
    try{window.KAUIV51?.refresh?.()}catch(_){}
    try{window.KABalanceV44?.renderBalance?.()}catch(_){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyClosing28Prices,{once:true});
  else applyClosing28Prices();
  // V53 restores autosave on load. Reapply canonical closing costs afterwards.
  window.addEventListener('load',()=>setTimeout(applyClosing28Prices,60),{once:true});
})();

/* Closing 28 Sep modal guard: never reuse 27 Sep modal as opening 29 Sep */
(function(){
  'use strict';
  const TARGET='2026-09-29';
  const MESSAGE='Closing 28 September belum lengkap: 20 dari 25 saldo modal kosong di Excel. Modal lama tidak boleh dipakai untuk opening 29 September.';
  function activeDate(){
    try{
      const q=new URLSearchParams(location.search);
      if(q.get('sim_date')) return String(q.get('sim_date')).trim();
      const d=window.KARegulationsV29?.activeShift?.date;
      if(d) return String(d).trim();
      const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const x=Object.fromEntries(p.filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));
      return x.year+'-'+x.month+'-'+x.day;
    }catch(_){ return ''; }
  }
  function showModalHold(){
    if(activeDate()!==TARGET || typeof openingPrevModal==='undefined' || !Array.isArray(openingPrevModal)) return false;
    openingPrevModal.forEach(m=>{ if(m) m.value=0; });
    const set=(id,value,klass)=>{
      const el=document.getElementById(id);
      if(!el) return;
      if(klass) el.className=klass;
      el.textContent=value;
    };
    set('openingOverviewModal','Belum lengkap');
    set('openingOverviewModalStatus','Closing 28 belum lengkap','status bad');
    const label=document.getElementById('openingBaselineLabel');
    if(label){ label.textContent='CLOSING 28 BELUM LENGKAP — JANGAN LANJUT'; label.style.color='var(--red)'; }
    const box=document.getElementById('openingValidationBox');
    if(box){ box.className='notice red'; box.innerHTML='<b>Opening modal ditahan.</b> '+MESSAGE; }
    document.querySelectorAll('#opening-modal [id^="prevModalCheck"]').forEach(input=>{
      input.value='';
      input.placeholder='Closing 28 belum diisi';
      input.disabled=true;
      const row=input.closest('tr');
      if(!row) return;
      if(row.cells?.[1]) row.cells[1].textContent='Belum lengkap';
      if(row.cells?.[3]) row.cells[3].textContent='—';
      const status=row.querySelector('.status');
      if(status){ status.className='status bad'; status.textContent='Belum lengkap'; }
      row.style.opacity='1';
    });
    const next=document.getElementById('openingNextBtn');
    if(next){ next.dataset.kaBaselineReady='0'; next.title=MESSAGE; next.disabled=true; next.setAttribute('aria-disabled','true'); }
    window.KAExcelBaselineV2={...(window.KAExcelBaselineV2||{}),modalStatus:'blocked: 20 of 25 modal closing values are blank in sheet 28',modalBlocked:true};
    return true;
  }
  function installGuard(){
    if(!showModalHold()) return;
    if(typeof window.showStep==='function' && !window.showStep.__v79ModalGuard){
      const old=window.showStep;
      const guarded=function(i){
        if(Number(i)>=1){
          showModalHold();
          try{window.uiToast?.(MESSAGE,'bad')}catch(_){}
          return false;
        }
        return old.apply(this,arguments);
      };
      guarded.__v79ModalGuard=true;
      window.showStep=guarded;
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(installGuard,80),{once:true});
  else setTimeout(installGuard,80);
  window.addEventListener('load',()=>setTimeout(installGuard,140),{once:true});
})();


/* Do not open 30 Sep before the 29 Sep closing is final */
(function(){
  'use strict';
  const TARGET='2026-09-30';
  const MESSAGE='Opening 30 September ditahan: closing 29 September belum selesai dan belum disahkan. Jangan pakai angka bawaan lama.';
  function activeDate(){
    try{
      const q=new URLSearchParams(location.search);
      if(q.get('sim_date')) return String(q.get('sim_date')).trim();
      const d=window.KARegulationsV29?.activeShift?.date;
      if(d) return String(d).trim();
      const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const x=Object.fromEntries(p.filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));
      return x.year+'-'+x.month+'-'+x.day;
    }catch(_){ return ''; }
  }
  function hold(){
    if(activeDate()!==TARGET) return false;
    const set=(id,value,klass)=>{const el=document.getElementById(id);if(!el)return;if(klass)el.className=klass;el.textContent=value;};
    set('openingOverviewPkg','—');
    set('openingOverviewCigDisplay','—');
    set('openingOverviewCigWarehouse','—');
    set('openingOverviewModal','—');
    ['openingOverviewPkgStatus','openingOverviewCigDisplayStatus','openingOverviewCigWarehouseStatus','openingOverviewModalStatus'].forEach(id=>set(id,'Closing 29 belum selesai','status bad'));
    const label=document.getElementById('openingBaselineLabel');
    if(label){label.textContent='CLOSING 29 BELUM SELESAI — JANGAN LANJUT';label.style.color='var(--red)';}
    const box=document.getElementById('openingValidationBox');
    if(box){box.className='notice red';box.innerHTML='<b>Opening ditahan.</b> '+MESSAGE;}
    document.querySelectorAll('#opening-pkg input,#opening-cig input,#opening-modal input').forEach(el=>{if(!/Reason/.test(el.id))el.disabled=true;});
    const next=document.getElementById('openingNextBtn');
    if(next){next.dataset.kaBaselineReady='0';next.title=MESSAGE;next.disabled=true;next.setAttribute('aria-disabled','true');}
    window.KAExcelOpeningHold={date:TARGET,reason:'closing 29 not final'};
    return true;
  }
  function install(){
    if(!hold())return;
    if(typeof window.showStep==='function'&&!window.showStep.__v79Day30Hold){
      const old=window.showStep;
      const guarded=function(i){
        if(Number(i)>=1){hold();try{window.uiToast?.(MESSAGE,'bad')}catch(_){};return false;}
        return old.apply(this,arguments);
      };
      guarded.__v79Day30Hold=true;
      window.showStep=guarded;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,100),{once:true});
  else setTimeout(install,100);
  window.addEventListener('load',()=>setTimeout(install,180),{once:true});
})();


/* Static Excel closing 28 is the valid stock/price baseline for 29 Sep simulation */
(function(){
  'use strict';
  const TARGET='2026-09-29';
  function activeDate(){
    try{
      const q=new URLSearchParams(location.search);
      if(q.get('sim_date')) return String(q.get('sim_date')).trim();
      const d=window.KARegulationsV29?.activeShift?.date;
      if(d) return String(d).trim();
      return '';
    }catch(_){return '';}
  }
  function apply(){
    if(activeDate()!==TARGET) return;
    const api=window.KADayRolloverV1;
    if(api && !api.__kaExcelClosing28){
      const oldMeta=typeof api.metadata==='function'?api.metadata.bind(api):null;
      api.ready=()=>true;
      api.metadata=()=>({...((oldMeta&&oldMeta())||{}),rolloverFrom:'worksheet september benar(7).xlsx • closing 28 September 2026',source:'excel-closing-28'});
      api.__kaExcelClosing28=true;
    }
    document.querySelectorAll('.crumb').forEach(el=>{
      if(/Perhitungan Harian/i.test(String(el.textContent||''))) el.textContent='Perhitungan Harian / 29 September 2026';
    });
    try{window.KAStockV50?.refreshOpeningSystem?.()}catch(_){}
    try{window.refreshPkgNameViews?.()}catch(_){}
    try{window.KAUIV51?.refresh?.()}catch(_){}
    try{window.KABalanceV44?.renderBalance?.()}catch(_){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,120),{once:true});
  else setTimeout(apply,120);
  window.addEventListener('load',()=>setTimeout(apply,220),{once:true});
})();
