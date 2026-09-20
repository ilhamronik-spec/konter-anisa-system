/* Konter Anisa V53 — per-shift crash/reload autosave */
(function(){
  'use strict';

  const SCHEMA=53;
  const PREFIX='ka_shift_autosave_v53_';
  const INDEX_KEY='ka_shift_autosave_v53_index';
  let restoring=true;
  let saveTimer=null;
  let lastSavedAt=0;

  const byId=id=>document.getElementById(id);
  const clone=v=>JSON.parse(JSON.stringify(v));
  const safeCall=fn=>{try{return fn();}catch(_){return undefined;}};

  function shiftId(){
    const direct=String(window.KARegulationsV29?.activeShift?.id||'').trim();
    if(direct) return direct;
    const crumb=String(document.querySelector('.crumb')?.textContent||'shift-unknown')
      .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return crumb||'shift-unknown';
  }
  function storageKey(){ return PREFIX+shiftId(); }

  function formSnapshot(){
    const out={};
    document.querySelectorAll('input[id],select[id],textarea[id]').forEach(el=>{
      const type=String(el.type||'').toLowerCase();
      if(['button','submit','reset','file','image'].includes(type)) return;
      out[el.id]={
        value:String(el.value??''),
        checked:!!el.checked,
        type,
        tag:el.tagName
      };
    });
    return out;
  }

  function catalogSnapshot(){
    const out={pkg:[],cig:[]};
    try{
      if(typeof pkgCatalog!=='undefined'){
        out.pkg=pkgCatalog.map(p=>({
          key:String(p.group||'')+'|'+String(p.name||''),
          stock:Number(p.stock||0),
          purchaseQty:Number(p.purchaseQty||0),
          activeBase:Number(p.activeBase??p.base??0),
          activeSell:Number(p.activeSell??p.sell??0)
        }));
      }
    }catch(_){}
    try{
      if(typeof cigCatalog!=='undefined'){
        out.cig=cigCatalog.map(c=>({
          key:String(c.name||''),
          display:Number(c.display||0),
          warehouse:Number(c.warehouse||0),
          purchaseQty:Number(c.purchaseQty||0),
          purchaseCost:Number(c.purchaseCost||0),
          base:Number(c.base||0),
          sell:Number(c.sell||0)
        }));
      }
    }catch(_){}
    return out;
  }

  function coreSnapshot(){
    const out={};
    try{ if(typeof debtEntries!=='undefined') out.debtEntries=clone(debtEntries); }catch(_){}
    try{ if(typeof paymentEntries!=='undefined') out.paymentEntries=clone(paymentEntries); }catch(_){}
    try{ if(typeof opEntries!=='undefined') out.opEntries=clone(opEntries); }catch(_){}
    try{ if(typeof txEntries!=='undefined') out.txEntries=clone(txEntries); }catch(_){}
    try{ if(typeof adminState!=='undefined') out.adminState=clone(adminState); }catch(_){}
    return out;
  }

  function flagSnapshot(){
    const f={};
    try{ if(typeof idx!=='undefined') f.idx=Number(idx||0); }catch(_){}
    try{ if(typeof openingPkgPreviewConfirmed!=='undefined') f.openingPkgPreviewConfirmed=!!openingPkgPreviewConfirmed; }catch(_){}
    try{ if(typeof openingCigPreviewConfirmed!=='undefined') f.openingCigPreviewConfirmed=!!openingCigPreviewConfirmed; }catch(_){}
    try{ if(typeof openingPkgPreviewSignature!=='undefined') f.openingPkgPreviewSignature=String(openingPkgPreviewSignature||''); }catch(_){}
    try{ if(typeof openingCigPreviewSignature!=='undefined') f.openingCigPreviewSignature=String(openingCigPreviewSignature||''); }catch(_){}
    try{ if(typeof openingPkgHardBlock!=='undefined') f.openingPkgHardBlock=!!openingPkgHardBlock; }catch(_){}
    try{ if(typeof openingCigHardBlock!=='undefined') f.openingCigHardBlock=!!openingCigHardBlock; }catch(_){}
    try{ if(typeof openingApprovalState!=='undefined') f.openingApprovalState=String(openingApprovalState||'none'); }catch(_){}
    try{ if(typeof openingCorrectionsSubmitted!=='undefined') f.openingCorrectionsSubmitted=!!openingCorrectionsSubmitted; }catch(_){}
    try{ if(typeof pkgBuyConfirmed!=='undefined') f.pkgBuyConfirmed=!!pkgBuyConfirmed; }catch(_){}
    try{ if(typeof cigBuyConfirmed!=='undefined') f.cigBuyConfirmed=!!cigBuyConfirmed; }catch(_){}
    if(window.KAUIV51?.getPersistentState) f.v51=window.KAUIV51.getPersistentState();
    return f;
  }

  function touchIndex(key,ts){
    try{
      const raw=JSON.parse(localStorage.getItem(INDEX_KEY)||'[]');
      const arr=Array.isArray(raw)?raw.filter(x=>x&&x.key!==key):[];
      arr.unshift({key,ts});
      while(arr.length>20){
        const old=arr.pop();
        if(old?.key) localStorage.removeItem(old.key);
      }
      localStorage.setItem(INDEX_KEY,JSON.stringify(arr));
    }catch(_){}
  }

  function updateStatus(savedAt,recovered=false){
    let el=byId('kaAutosaveV53Status');
    if(!el){
      el=document.createElement('div');
      el.id='kaAutosaveV53Status';
      el.style.cssText='margin-top:8px;font-size:10px;line-height:1.45;color:#94a3b8';
      const foot=document.querySelector('.side-foot');
      if(foot) foot.appendChild(el);
    }
    if(!el) return;
    const d=savedAt?new Date(savedAt):null;
    const time=d&&!Number.isNaN(d.getTime())?d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
    el.textContent=(recovered?'Data dipulihkan • ':'Autosave aktif • ')+(savedAt?'terakhir '+time:'menunggu input');
  }

  function saveNow(reason='auto'){
    if(restoring) return false;
    try{
      const key=storageKey();
      const ts=Date.now();
      const data={
        schema:SCHEMA,
        shiftId:shiftId(),
        savedAt:ts,
        reason,
        forms:formSnapshot(),
        catalogs:catalogSnapshot(),
        core:coreSnapshot(),
        flags:flagSnapshot()
      };
      localStorage.setItem(key,JSON.stringify(data));
      touchIndex(key,ts);
      lastSavedAt=ts;
      updateStatus(ts,false);
      return true;
    }catch(e){
      console.error('V53 autosave gagal',e);
      return false;
    }
  }

  function queueSave(reason='input'){
    if(restoring) return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>saveNow(reason),180);
  }

  function restoreCatalogs(saved){
    const cats=saved?.catalogs||{};
    try{
      if(typeof pkgCatalog!=='undefined' && Array.isArray(cats.pkg)){
        const map=new Map(cats.pkg.map(x=>[String(x.key||''),x]));
        pkgCatalog.forEach(p=>{
          const rec=map.get(String(p.group||'')+'|'+String(p.name||''));
          if(!rec) return;
          p.stock=Number(rec.stock||0);
          p.purchaseQty=Number(rec.purchaseQty||0);
          p.activeBase=Number(rec.activeBase??p.base??0);
          p.activeSell=Number(rec.activeSell??p.sell??0);
        });
      }
    }catch(_){}
    try{
      if(typeof cigCatalog!=='undefined' && Array.isArray(cats.cig)){
        const map=new Map(cats.cig.map(x=>[String(x.key||''),x]));
        cigCatalog.forEach(c=>{
          const rec=map.get(String(c.name||''));
          if(!rec) return;
          c.display=Number(rec.display||0);
          c.warehouse=Number(rec.warehouse||0);
          c.purchaseQty=Number(rec.purchaseQty||0);
          c.purchaseCost=Number(rec.purchaseCost||0);
          if(Number.isFinite(Number(rec.base))) c.base=Number(rec.base);
          if(Number.isFinite(Number(rec.sell))) c.sell=Number(rec.sell);
        });
      }
    }catch(_){}
  }

  function restoreForms(saved){
    const forms=saved?.forms||{};
    Object.entries(forms).forEach(([id,rec])=>{
      const el=byId(id);
      if(!el||!rec) return;
      const type=String(el.type||'').toLowerCase();
      if(['button','submit','reset','file','image'].includes(type)) return;
      if(type==='checkbox'||type==='radio') el.checked=!!rec.checked;
      else el.value=String(rec.value??'');
    });
  }

  function replaceArray(target,data){
    if(!Array.isArray(target)||!Array.isArray(data)) return;
    target.splice(0,target.length,...clone(data));
  }

  function restoreCore(saved){
    const core=saved?.core||{};
    try{ if(typeof debtEntries!=='undefined') replaceArray(debtEntries,core.debtEntries||[]); }catch(_){}
    try{ if(typeof paymentEntries!=='undefined') replaceArray(paymentEntries,core.paymentEntries||[]); }catch(_){}
    try{ if(typeof opEntries!=='undefined') replaceArray(opEntries,core.opEntries||[]); }catch(_){}
    try{
      if(typeof txEntries!=='undefined' && core.txEntries && typeof core.txEntries==='object'){
        Object.keys(txEntries).forEach(k=>{
          if(Array.isArray(txEntries[k])) replaceArray(txEntries[k],Array.isArray(core.txEntries[k])?core.txEntries[k]:[]);
        });
        Object.entries(core.txEntries).forEach(([k,v])=>{
          if(!Object.prototype.hasOwnProperty.call(txEntries,k) && Array.isArray(v)) txEntries[k]=clone(v);
        });
      }
    }catch(_){}
    try{
      if(typeof adminState!=='undefined' && core.adminState && typeof core.adminState==='object'){
        Object.keys(adminState).forEach(k=>delete adminState[k]);
        Object.assign(adminState,clone(core.adminState));
      }
    }catch(_){}
  }

  function restoreFlags(saved){
    const f=saved?.flags||{};
    try{ if(typeof openingPkgPreviewConfirmed!=='undefined') openingPkgPreviewConfirmed=!!f.openingPkgPreviewConfirmed; }catch(_){}
    try{ if(typeof openingCigPreviewConfirmed!=='undefined') openingCigPreviewConfirmed=!!f.openingCigPreviewConfirmed; }catch(_){}
    try{ if(typeof openingPkgPreviewSignature!=='undefined') openingPkgPreviewSignature=String(f.openingPkgPreviewSignature||''); }catch(_){}
    try{ if(typeof openingCigPreviewSignature!=='undefined') openingCigPreviewSignature=String(f.openingCigPreviewSignature||''); }catch(_){}
    try{ if(typeof openingPkgHardBlock!=='undefined') openingPkgHardBlock=!!f.openingPkgHardBlock; }catch(_){}
    try{ if(typeof openingCigHardBlock!=='undefined') openingCigHardBlock=!!f.openingCigHardBlock; }catch(_){}
    try{ if(typeof openingApprovalState!=='undefined' && f.openingApprovalState) openingApprovalState=String(f.openingApprovalState); }catch(_){}
    try{ if(typeof openingCorrectionsSubmitted!=='undefined') openingCorrectionsSubmitted=!!f.openingCorrectionsSubmitted; }catch(_){}
    try{ if(typeof pkgBuyConfirmed!=='undefined') pkgBuyConfirmed=!!f.pkgBuyConfirmed; }catch(_){}
    try{ if(typeof cigBuyConfirmed!=='undefined') cigBuyConfirmed=!!f.cigBuyConfirmed; }catch(_){}
    if(window.KAUIV51?.restorePersistentState) safeCall(()=>window.KAUIV51.restorePersistentState(f.v51||{}));
  }

  function renderRecovered(){
    safeCall(()=>{ if(typeof renderDebtEntries==='function') renderDebtEntries(); });
    safeCall(()=>{ if(typeof renderPaymentEntries==='function') renderPaymentEntries(); });
    safeCall(()=>{ if(typeof renderOperationalEntries==='function') renderOperationalEntries(); });
    safeCall(()=>{
      if(typeof renderTxnList==='function'){
        ['dana','qrisDana','qrisBank','mitra','svplus','tarikBca','transferBca'].forEach(t=>renderTxnList(t));
      }
    });
    safeCall(()=>window.KAPersistRenderV37?.());
    safeCall(()=>window.KAPersistRenderV38?.());
    safeCall(()=>window.KAPersistRenderV39?.());
    safeCall(()=>window.KAPersistRenderV40?.());
    safeCall(()=>window.KAAccObatV41?.refreshSales?.());
    safeCall(()=>{ if(typeof renderTxGlobalSummary==='function') renderTxGlobalSummary(); });

    // Propagate restored opening checks/catalog values through stock flow.
    safeCall(()=>window.KAStockV50?.sync?.());
    safeCall(()=>{
      if(typeof pkgCatalog!=='undefined' && typeof calcPkgEnd==='function'){
        pkgCatalog.forEach((_,ix)=>calcPkgEnd(ix+1));
      }
      if(typeof calcPkgTotals==='function') calcPkgTotals();
    });
    safeCall(()=>{
      if(typeof cigCatalog!=='undefined' && typeof calcCigEnd==='function'){
        cigCatalog.forEach((_,ix)=>calcCigEnd(ix+1));
      }
      if(typeof calcCigTotals==='function') calcCigTotals();
    });

    safeCall(()=>{ if(typeof setDebtMode==='function') setDebtMode(typeof debtEntries!=='undefined' && debtEntries.length>0); });
    safeCall(()=>{ if(typeof setPaymentMode==='function') setPaymentMode(typeof paymentEntries!=='undefined' && paymentEntries.length>0); });
    safeCall(()=>{ if(typeof syncOpeningPreviewConfirmation==='function') syncOpeningPreviewConfirmation(); });
    safeCall(()=>{ if(typeof updateBuyNextState==='function') updateBuyNextState(); });
    safeCall(()=>{ if(typeof calcModalInput==='function') calcModalInput(); });
    safeCall(()=>window.KABalanceV44?.updateAutoFinalModals?.());
    safeCall(()=>window.KABalanceV44?.renderBalance?.());
    safeCall(()=>window.KAUIV51?.refresh?.());
  }

  function restoreStep(saved){
    const raw=Number(saved?.flags?.idx);
    if(!Number.isFinite(raw)) return;
    safeCall(()=>{ if(typeof showStep==='function') showStep(raw); });
  }

  function readSaved(){
    try{
      const raw=localStorage.getItem(storageKey());
      if(!raw) return null;
      const data=JSON.parse(raw);
      if(!data||Number(data.schema)!==SCHEMA||String(data.shiftId)!==shiftId()) return null;
      return data;
    }catch(_){return null;}
  }

  function restoreNow(source='dom'){
    const saved=readSaved();
    if(!saved){ updateStatus(0,false); return false; }
    restoring=true;
    restoreCatalogs(saved);
    restoreForms(saved);
    restoreCore(saved);
    renderRecovered();
    restoreFlags(saved);
    restoreStep(saved);
    lastSavedAt=Number(saved.savedAt||0);
    updateStatus(lastSavedAt,true);
    restoring=false;
    return true;
  }

  function bindAutosave(){
    if(document.documentElement.dataset.v53AutosaveBound==='1') return;
    document.documentElement.dataset.v53AutosaveBound='1';

    document.addEventListener('input',e=>{
      if(e.target?.matches?.('input,select,textarea')) queueSave('input');
    },true);
    document.addEventListener('change',e=>{
      if(e.target?.matches?.('input,select,textarea')) queueSave('change');
    },true);
    document.addEventListener('click',()=>setTimeout(()=>queueSave('action'),40),false);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='hidden') saveNow('hidden');
    });
    window.addEventListener('beforeunload',()=>saveNow('beforeunload'));
    setInterval(()=>saveNow('interval'),2000);
  }

  function initDom(){
    restoreNow('dom');
    bindAutosave();
    setTimeout(()=>{
      restoring=false;
      if(!lastSavedAt) saveNow('initial');
    },120);
  }

  function initLoad(){
    // V27 clears ending stock on window.load. Restore again after that legacy initializer.
    setTimeout(()=>{
      restoreNow('load');
      restoring=false;
      saveNow('post-load');
    },0);
  }

  window.KAAutosaveV53={
    save:()=>saveNow('manual'),
    restore:()=>restoreNow('manual'),
    clearCurrentShift(){
      try{
        localStorage.removeItem(storageKey());
        updateStatus(0,false);
        return true;
      }catch(_){return false;}
    },
    key:()=>storageKey()
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initDom,{once:true});
  else initDom();
  window.addEventListener('load',initLoad,{once:true});
})();
