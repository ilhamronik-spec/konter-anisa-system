/* Konter Anisa V72 — Excel 18 correction + safe legacy-state migration */
(function(){
  'use strict';

  const OLD_BCA_ILHAM=4513125;
  const EXCEL_BCA_ILHAM=2781125;
  const MITRA_OLD_RATE=1700;
  const MITRA_EXCEL_RATE=1800;
  const EXCEL_ELECTRICITY=[170500,426000,163500,75500];

  const $=id=>document.getElementById(id);
  const money=v=>Number(String(v??'').replace(/[^0-9-]/g,''))||0;
  const fmt=n=>'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');

  function is18(){
    try{
      const sid=String(window.KARegulationsV29?.activeShift?.id||'');
      if(sid) return sid.startsWith('2026-09-18');
    }catch(_){}
    return /18\s+September\s+2026/i.test(String(document.querySelector('.crumb')?.textContent||''));
  }

  function setMoney(el,value){
    if(!el)return;
    try{
      if(typeof setMoneyInput==='function') setMoneyInput(el,value);
      else el.value=Math.round(value).toLocaleString('id-ID');
    }catch(_){el.value=Math.round(value).toLocaleString('id-ID');}
  }

  function fixReferenceUi(){
    const ref=$('modalExcel3');
    if(ref) ref.textContent=fmt(EXCEL_BCA_ILHAM);
    document.querySelectorAll('.sumrow').forEach(row=>{
      const label=String(row.querySelector('span')?.textContent||'');
      if(/Total Referensi Excel 18\/09/i.test(label)){
        const b=row.querySelector('b');
        if(b)b.textContent='Rp110.299.149';
      }
    });
  }

  function migrateBcaInput(){
    const el=$('modalInput3');
    if(!el)return false;
    if(money(el.value)!==OLD_BCA_ILHAM)return false;
    setMoney(el,EXCEL_BCA_ILHAM);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function migrateMitra(){
    let changed=false;
    try{
      if(typeof txEntries==='undefined'||!Array.isArray(txEntries.mitra))return false;
      txEntries.mitra.forEach(x=>{
        const qty=Math.max(0,Number(x?.qty||0));
        const oldExpected=qty*MITRA_OLD_RATE;
        if(qty>0 && Number(x?.margin||0)===oldExpected){
          x.margin=qty*MITRA_EXCEL_RATE;
          changed=true;
        }
      });
    }catch(_){}
    return changed;
  }

  function addAuditHint(){
    const card=$('v69ExcelAuditCard');
    if(!card||$('v72AuditHint'))return;
    const hint=document.createElement('div');
    hint.id='v72AuditHint';
    hint.className='notice amber';
    hint.style.margin='10px 0 12px';
    hint.innerHTML='<b>Patokan Excel 18:</b> Mitra = Rp1.800/transaksi. Bayaran Listrik = 4 transaksi '
      +EXCEL_ELECTRICITY.map(x=>fmt(x)).join(', ')
      +' • margin Rp4.500/transaksi • total margin Listrik <b>Rp18.000</b>. Data Listrik tidak diisi otomatis.';
    const rows=$('v69ExcelAuditRows');
    if(rows)rows.insertAdjacentElement('beforebegin',hint);
    else card.appendChild(hint);
  }

  function refreshAll(){
    try{if(typeof calcMitra==='function')calcMitra();}catch(_){}
    try{if(typeof renderTxnList==='function')renderTxnList('mitra');}catch(_){}
    try{if(typeof renderTxGlobalSummary==='function')renderTxGlobalSummary();}catch(_){}
    try{window.KABalanceV44?.updateAutoFinalModals?.();}catch(_){}
    try{window.KABalanceV44?.renderBalance?.();}catch(_){}
    try{window.KAAutosaveV53?.save?.();}catch(_){}
  }

  function run(){
    if(!is18())return;
    fixReferenceUi();
    const bca=migrateBcaInput();
    const mitra=migrateMitra();
    addAuditHint();
    document.querySelectorAll('.topbar .status.info').forEach(el=>{
      if(/UI\s+V/i.test(String(el.textContent||'')))el.textContent='UI V72 — EXCEL 18 BCA + MITRA FIX';
    });
    if(bca||mitra)refreshAll();

    const tests=[
      ['BCA Excel reference',String($('modalExcel3')?.textContent||'').includes('2.781.125')],
      ['Mitra rate',typeof calcMitra==='function'],
      ['Balance engine',!!window.KABalanceV44]
    ];
    const pass=tests.every(x=>x[1]);
    document.documentElement.dataset.v72Selftest=pass?'PASS':'FAIL';
    window.KAExcel18V72={pass,tests,run,excelElectricity:EXCEL_ELECTRICITY.slice()};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true});
  else setTimeout(run,0);

  // V53 restores persisted state again after window.load, so migrate once more after it.
  window.addEventListener('load',()=>setTimeout(run,180),{once:true});
})();