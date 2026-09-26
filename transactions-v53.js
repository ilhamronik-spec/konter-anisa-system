/* Konter Anisa V53 — per-shift crash/reload autosave */
(function(){
  'use strict';

  const SCHEMA=53;
  const PREFIX='ka_shift_autosave_v53_';
  const INDEX_KEY='ka_shift_autosave_v53_index';
  let restoring=true;
  let saveTimer=null;
  let lastSavedAt=0;
  let lastInteractionAt=0;
  let recoveredBuyConfirmation=false;

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

  function sourceFingerprint(){
    try{
      const modal=(typeof openingPrevModal!=='undefined'&&Array.isArray(openingPrevModal))
        ? openingPrevModal.map(x=>[String(x?.name||''),Number(x?.value||0)]) : [];
      const pkg=(typeof pkgCatalog!=='undefined'&&Array.isArray(pkgCatalog))
        ? pkgCatalog.map(x=>[String(x?._sourceKey||((x?.group||'')+'|'+(x?.name||''))),Number(x?.stock||0),Number(x?.base||0),Number(x?.sell||0)]) : [];
      const cig=(typeof cigCatalog!=='undefined'&&Array.isArray(cigCatalog))
        ? cigCatalog.map(x=>[String(x?.name||''),Number(x?.display||0),Number(x?.warehouse||0),Number(x?.base||0),Number(x?.sell||0)]) : [];
      const raw=JSON.stringify({modal,pkg,cig});
      let h=2166136261;
      for(let i=0;i<raw.length;i++){ h^=raw.charCodeAt(i); h=Math.imul(h,16777619); }
      return 'src-'+(h>>>0).toString(16);
    }catch(_){ return 'src-unknown'; }
  }

  function isOpeningSourceField(id){
    return /^(?:prevModalCheck|prevModalReason|pkgCheck|pkgReason|cigDispCheck|cigWhCheck)\d+$/.test(String(id||''));
  }

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
          sourceKey:String(p._sourceKey||((p.group||'')+'|'+(p.name||''))),
          group:String(p.group||''),
          name:String(p.name||''),
          stock:Number(p.stock||0),
          purchaseQty:Number(p.purchaseQty||0),
          base:Number(p.base||0),
          openingBase:Number(p._openingBase??p.base??0),
          purchaseBase:Number(p.purchaseBase??p._openingBase??p.base??0),
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
          openingBase:Number(c._openingBase??c.base??0),
          activeBase:Number(c.activeBase??c.base??0),
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
    try{
      const pane=[...document.querySelectorAll('.subpane[id^="buy-"]')].find(x=>x.classList.contains('active'));
      if(pane?.id) f.buyTab=String(pane.id).replace(/^buy-/,'');
    }catch(_){}
    if(window.KAUIV51?.getPersistentState) f.v51=window.KAUIV51.getPersistentState();
    try{
      const prev=readSaved();
      f.progressMaxIdx=Math.max(Number(f.idx||0),Number(prev?.flags?.progressMaxIdx||0),Number(prev?.flags?.idx||0));
      const recoveryResume=Number(prev?.flags?.recoveryResumeIdx);
      if(Number.isFinite(recoveryResume) && !f.v51?.displayPreviewConfirmed){
        f.recoveryResumeIdx=recoveryResume;
      }
    }catch(_){f.progressMaxIdx=Number(f.idx||0)}
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
    if(window.KADayRolloverV1?.isSimulation?.() && !window.KADayRolloverV1?.ready?.()) return false;
    try{
      const key=storageKey();
      const ts=Date.now();
      const roll=window.KADayRolloverV1?.metadata?.()||{};
      const data={
        schema:SCHEMA,
        shiftId:shiftId(),
        sourceFingerprint:sourceFingerprint(),
        savedAt:ts,
        reason,
        ...roll,
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

  function restoreCatalogs(saved,sameSource){
    const cats=saved?.catalogs||{};
    // Pada mode simulasi, snapshot rollover adalah sumber opening yang sah.
    // Fingerprint boleh berbeda dari HTML statis; jangan kembali ke stok bawaan lama.
    const forceOpening=!!(sameSource || saved?.rolloverSimulation===true);
    try{
      if(typeof pkgCatalog!=='undefined' && Array.isArray(cats.pkg)){
        const map=new Map();
        cats.pkg.forEach(x=>{
          const stable=String(x.sourceKey||x.key||'');
          if(stable)map.set(stable,x);
        });
        pkgCatalog.forEach(p=>{
          if(!p._sourceKey)p._sourceKey=String((p.group||'')+'|'+(p.name||''));
          const rec=map.get(String(p._sourceKey||'')) || map.get(String(p.group||'')+'|'+String(p.name||''));
          if(!rec) return;
          if(forceOpening) p.stock=Number(rec.stock||0);
          if(String(rec.name||'').trim())p.name=String(rec.name).trim();
          if(String(rec.group||'').trim())p.group=String(rec.group).trim();
          p.purchaseQty=Number(rec.purchaseQty||0);
          p._openingBase=Number(rec.openingBase??rec.base??p.base??0);
          p.purchaseBase=Number(rec.purchaseBase??rec.activeBase??p._openingBase??0);
          const openingStock=Number(p.stock||0),q=Number(p.purchaseQty||0),totalUnits=openingStock+q;
          p.activeBase=totalUnits>0
            ? ((openingStock*Number(p._openingBase||0))+(q*Number(p.purchaseBase||0)))/totalUnits
            : Number(p._openingBase||0);
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
          if(forceOpening){
            c.display=Number(rec.display||0);
            c.warehouse=Number(rec.warehouse||0);
            if(Number.isFinite(Number(rec.base))) c.base=Number(rec.base);
            if(Number.isFinite(Number(rec.sell))) c.sell=Number(rec.sell);
          }
          c.purchaseQty=Number(rec.purchaseQty||0);
          c.purchaseCost=Number(rec.purchaseCost||0);
          c._openingBase=Number(rec.openingBase??c.base??0);
          const q=Number(c.purchaseQty||0),cost=Number(c.purchaseCost||0);
          const openingUnits=Number(c.display||0)+Number(c.warehouse||0),totalUnits=openingUnits+q;
          if(q>0 && cost>0 && totalUnits>0) c.activeBase=((openingUnits*Number(c._openingBase||0))+cost)/totalUnits;
          else if(Number.isFinite(Number(rec.activeBase))) c.activeBase=Number(rec.activeBase);
          else c.activeBase=Number(c._openingBase||0);
        });
      }
    }catch(_){}
  }

  function restoreForms(saved,sameSource){
    const forms=saved?.forms||{};
    Object.entries(forms).forEach(([id,rec])=>{
      if(!sameSource && isOpeningSourceField(id)) return;
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

  function purchaseTotal(kind){
    try{
      if(kind==='pkg' && typeof pkgCatalog!=='undefined'){
        return Math.round(pkgCatalog.reduce((s,p)=>s+(Number(p.purchaseQty||0)*Number(p.purchaseBase??p._openingBase??p.base??0)),0));
      }
      if(kind==='cig' && typeof cigCatalog!=='undefined'){
        return Math.round(cigCatalog.reduce((s,c)=>s+Number(c.purchaseCost||0),0));
      }
    }catch(_){}
    return 0;
  }

  function confirmationFromUsedNote(kind){
    try{
      const raw=JSON.parse(localStorage.getItem('ka_v29_used_notes')||'{}');
      const area=kind==='pkg'?'package':'cigarette';
      const total=purchaseTotal(kind);
      if(total<=0||!raw||typeof raw!=='object')return null;
      const sid=shiftId();
      for(const [id,rec] of Object.entries(raw)){
        if(!rec||String(rec.area||'')!==area)continue;
        if(rec.shiftId&&String(rec.shiftId)!==sid)continue;
        if(Math.round(Number(rec.validatedTotal||0))!==total)continue;
        if(rec.noteAmount!=null&&Math.round(Number(rec.noteAmount||0))!==total)continue;
        return {id,total};
      }
    }catch(_){}
    return null;
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
    const usedPkg=confirmationFromUsedNote('pkg');
    const usedCig=confirmationFromUsedNote('cig');
    const pkgConfirmed=!!f.pkgBuyConfirmed || !!usedPkg;
    const cigConfirmed=!!f.cigBuyConfirmed || !!usedCig;
    if(!f.pkgBuyConfirmed&&usedPkg) recoveredBuyConfirmation=true;
    if(!f.cigBuyConfirmed&&usedCig) recoveredBuyConfirmation=true;
    try{ if(typeof pkgBuyConfirmed!=='undefined') pkgBuyConfirmed=pkgConfirmed; }catch(_){}
    try{ if(typeof cigBuyConfirmed!=='undefined') cigBuyConfirmed=cigConfirmed; }catch(_){}
    if(window.KAUIV51?.restorePersistentState) safeCall(()=>window.KAUIV51.restorePersistentState(f.v51||{}));
    // Confirmation flags are restored after renderRecovered(). Repaint the badges
    // now so the UI cannot show "Belum Dikonfirmasi" while runtime is already confirmed.
    safeCall(()=>{ if(typeof setBuyConfirmVisual==='function') setBuyConfirmVisual('pkg',pkgConfirmed); });
    safeCall(()=>{ if(typeof setBuyConfirmVisual==='function') setBuyConfirmVisual('cig',cigConfirmed); });
    safeCall(()=>{ if(typeof updateBuyNextState==='function') updateBuyNextState(); });
  }

  function renderRecovered(){
    safeCall(()=>{ if(typeof renderDebtEntries==='function') renderDebtEntries(); });
    safeCall(()=>{ if(typeof syncDebtDebtorMode==='function') syncDebtDebtorMode(); });
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

    // Propagate restored opening/catalog values through stock flow.
    safeCall(()=>window.KAStockV50?.refreshOpeningSystem?.());
    safeCall(()=>window.KAStockV50?.sync?.());
    safeCall(()=>window.refreshPkgNameViews?.());
    // Belanja derives stock/base/name from the restored catalog. Re-sync after
    // form restore so stale HTML/autosave display values can never win.
    safeCall(()=>{ if(typeof syncPkgBuy==='function') syncPkgBuy(); });
    safeCall(()=>{ if(typeof syncCigBuy==='function') syncCigBuy(); });
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

    safeCall(()=>{
      const hasDraft=String(byId('debtAmount')?.value||'').trim()!=='' || String(byId('debtNote')?.value||'').trim()!=='';
      if(typeof setDebtMode==='function') setDebtMode((typeof debtEntries!=='undefined' && debtEntries.length>0)||hasDraft);
    });
    safeCall(()=>{
      const hasDraft=String(byId('payDebtBalance')?.value||'').trim()!=='';
      if(typeof setPaymentMode==='function') setPaymentMode((typeof paymentEntries!=='undefined' && paymentEntries.length>0)||hasDraft);
    });
    safeCall(()=>{ if(typeof syncOpeningPreviewConfirmation==='function') syncOpeningPreviewConfirmation(); });
    safeCall(()=>{ if(typeof updateBuyNextState==='function') updateBuyNextState(); });
    safeCall(()=>{ if(typeof calcModalInput==='function') calcModalInput(); });
    safeCall(()=>window.KABalanceV44?.updateAutoFinalModals?.());
    safeCall(()=>window.KABalanceV44?.renderBalance?.());
    safeCall(()=>window.KAUIV51?.refresh?.());
    safeCall(()=>window.KAFeaturesV61?.refresh?.());
  }

  function restoreStep(saved){
    const recoveryResume=Number(saved?.flags?.recoveryResumeIdx);
    let raw=Number.isFinite(recoveryResume)
      ? recoveryResume
      : Math.max(Number(saved?.flags?.idx||0),Number(saved?.flags?.progressMaxIdx||0));

    // Hard prerequisite guard for the Sep 24 recovery. The page must not show
    // Display while the cigarette purchase note still has no valid detail rows.
    if(shiftId()==='2026-09-24-full-rifda'){
      const validCigRows=Array.isArray(saved?.catalogs?.cig)
        ? saved.catalogs.cig.filter(x=>Number(x?.purchaseQty||0)>0&&Number(x?.purchaseCost||0)>0).length
        : 0;
      if(validCigRows===0 || !saved?.flags?.cigBuyConfirmed){
        raw=1;
        saved.flags=saved.flags||{};
        saved.flags.buyTab='rokok';
        saved.flags.recoveryResumeIdx=1;
      }
    }

    if(Number.isFinite(raw)) safeCall(()=>{ if(typeof showStep==='function') showStep(raw); });

    // Keep the last Belanja sub-tab. Older snapshots did not store it, so when
    // Paket is already validated continue naturally on Rokok instead of Paket.
    let tab=String(saved?.flags?.buyTab||'');
    if(!tab && raw===1){
      try{
        if(typeof pkgBuyConfirmed!=='undefined' && pkgBuyConfirmed &&
           (typeof cigBuyConfirmed==='undefined' || !cigBuyConfirmed)) tab='rokok';
      }catch(_){}
    }
    if(tab){
      safeCall(()=>{
        const buttons=[...document.querySelectorAll('.subtab')];
        const btn=buttons.find(b=>String(b.dataset.uiClick||'').includes("showBuy('"+tab+"'"));
        if(btn&&typeof showBuy==='function') showBuy(tab,btn);
      });
    }
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

  function durableUsedNotes(){
    try{
      const raw=JSON.parse(localStorage.getItem('ka_v29_used_notes')||'{}');
      return raw&&typeof raw==='object'?raw:{};
    }catch(_){return {}}
  }
  function durableNotes(){
    try{
      const raw=JSON.parse(localStorage.getItem('ka_v29_purchasing_notes')||'[]');
      return Array.isArray(raw)?raw:[];
    }catch(_){return []}
  }
  function moveSignatureFromSaved(saved){
    const forms=saved?.forms||{},parts=[];
    for(let i=1;i<=60;i++)parts.push(String(forms?.['move'+i]?.value??'0').replace(/[^0-9.-]/g,'')||'0');
    return parts.join('|');
  }
  function recoverOperationalFromDurableNotes(saved,used,notes){
    const sid=shiftId();
    const usages=Object.entries(used)
      .filter(([,r])=>r&&String(r.area||'')==='operational'&&String(r.shiftId||sid)===sid)
      .sort((a,b)=>String(a[1]?.at||'').localeCompare(String(b[1]?.at||'')));
    if(!usages.length)return false;
    saved.core=saved.core||{};
    if(Array.isArray(saved.core.opEntries)&&saved.core.opEntries.length)return false;
    const baseMap={transport:[210000,300000],sedekah:[150000,500000],alat:[320000,750000],repair:[1250000,1000000],routine:[869000,869000]};
    const added={};
    saved.core.opEntries=usages.map(([id])=>{
      const n=notes.find(x=>String(x?.id||'')===String(id))||{};
      const cat=String(n.category||'routine');
      const amount=Math.max(0,Number(n.amount||0));
      const [baseUsed,limit]=baseMap[cat]||[0,Number.MAX_SAFE_INTEGER];
      const before=baseUsed+Number(added[cat]||0);
      const after=before+amount;added[cat]=Number(added[cat]||0)+amount;
      return {receipt:String(id),cat,amount,note:String(n.label||n.description||''),before,limit,after,over:after>limit};
    });
    return true;
  }
  function repairKnownShiftProgress(saved){
    if(!saved||String(saved.shiftId||'')!==shiftId())return saved;
    const used=durableUsedNotes(),notes=durableNotes(),sid=shiftId();
    const usage=(area)=>Object.entries(used).find(([,r])=>r&&String(r.area||'')===area&&String(r.shiftId||sid)===sid);
    const pkg=usage('package'),cig=usage('cigarette');
    const opUsed=Object.values(used).some(r=>r&&String(r.area||'')==='operational'&&String(r.shiftId||sid)===sid);
    saved.flags=saved.flags||{};

    // Sep 24 cigarette recovery guard:
    // the corrupted snapshot had purchaseQty > 0 but purchaseCost = 0, which
    // produced a false weighted modal (e.g. HASTA Rp3.891) and inflated Gudang.
    // Repair that local snapshot before it can be rendered or re-uploaded.
    let brokenCigPurchase=false;
    if(sid==='2026-09-24-full-rifda'&&Array.isArray(saved?.catalogs?.cig)){
      brokenCigPurchase=saved.catalogs.cig.some(x=>Number(x?.purchaseQty||0)>0&&Number(x?.purchaseCost||0)<=0);
      if(brokenCigPurchase){
        saved.catalogs.cig=saved.catalogs.cig.map(x=>({
          ...x,
          purchaseQty:0,
          purchaseCost:0,
          activeBase:Number(x?.openingBase??x?.base??0)
        }));
        if(saved.forms?.cigQty)saved.forms.cigQty.value='0';
        if(saved.forms?.cigTotal)saved.forms.cigTotal.value='';
        saved.flags.cigBuyConfirmed=false;
        saved.flags.buyTab='rokok';
        saved.flags.recoveryResumeIdx=1;
        saved.flags.progressMaxIdx=Math.max(Number(saved.flags.progressMaxIdx||0),5);
        saved.recoveryVersion=Math.max(Number(saved.recoveryVersion||0),5);
        saved.recoveryNote='Corrupted cigarette purchase snapshot repaired locally; re-enter Belanja Rokok, Display inputs are preserved.';
      }
    }

    if(pkg)saved.flags.pkgBuyConfirmed=true;
    // Never resurrect the old cigarette validation from a stale local note
    // while the cigarette purchase snapshot is being repaired.
    if(cig&&!brokenCigPurchase&&saved.recoveryVersion!==5)saved.flags.cigBuyConfirmed=true;
    if(opUsed){
      recoverOperationalFromDurableNotes(saved,used,notes);
      // Operational note usage proves the workflow had already passed Belanja.
      saved.flags.progressMaxIdx=Math.max(Number(saved.flags.progressMaxIdx||0),4);
    }
    // One-time recovery for the active 24 Sep simulation: user confirmed in-session
    // that Display, Operasional and Hutang/Piutang had already been completed.
    if(sid==='2026-09-24-full-rifda'&&pkg&&opUsed){
      saved.flags.v51=saved.flags.v51||{};
      const hasRealMove=Object.entries(saved.forms||{}).some(([k,v])=>/^move\d+$/.test(k)&&Number(v?.value||0)!==0);
      const cigPurchaseRows=Array.isArray(saved?.catalogs?.cig)
        ? saved.catalogs.cig.filter(x=>Number(x?.purchaseQty||0)>0&&Number(x?.purchaseCost||0)>0).length
        : 0;

      // This shift has a real Rp7.113.000 cigarette note. Until valid per-item
      // cigarette purchase rows exist and are confirmed, never allow recovery
      // to skip ahead to Display/Operational. Display move inputs are preserved.
      if(brokenCigPurchase || saved.recoveryVersion>=4 || cigPurchaseRows===0 || !saved.flags.cigBuyConfirmed){
        saved.flags.cigBuyConfirmed=false;
        saved.flags.buyTab='rokok';
        saved.flags.recoveryResumeIdx=1;
        saved.flags.v51.displayPreviewConfirmed=false;
        saved.flags.v51.displayPreviewSignature='';
        saved.recoveryVersion=Math.max(Number(saved.recoveryVersion||0),6);
        saved.recoveryNote='Belanja Rokok must be re-entered and confirmed before Display. Existing Display move inputs are preserved.';
      }else if(!hasRealMove){
        saved.flags.v51.displayPreviewConfirmed=false;
        saved.flags.v51.displayPreviewSignature='';
        saved.flags.recoveryResumeIdx=2;
        saved.recoveryVersion=Math.max(Number(saved.recoveryVersion||0),3);
      }
      saved.flags.progressMaxIdx=Math.max(Number(saved.flags.progressMaxIdx||0),5);
    }
    return saved;
  }

  function restoreNow(source='dom'){
    let saved=readSaved();
    saved=repairKnownShiftProgress(saved);
    if(!saved){ updateStatus(0,false); return false; }
    restoring=true;
    const sameSource=String(saved?.sourceFingerprint||'')===sourceFingerprint();
    restoreCatalogs(saved,sameSource);
    restoreForms(saved,sameSource || saved?.rolloverSimulation===true);
    restoreCore(saved);
    renderRecovered();
    if(saved?.rolloverSimulation===true){
      safeCall(()=>window.KAStockV50?.refreshOpeningSystem?.());
      safeCall(()=>{ if(typeof syncPkgBuy==='function') syncPkgBuy(); });
      safeCall(()=>{ if(typeof syncCigBuy==='function') syncCigBuy(); });
    }
    restoreFlags(saved);
    restoreStep(saved);
    lastSavedAt=Number(saved.savedAt||0);
    updateStatus(lastSavedAt,true);
    if(!sameSource){
      console.info('V79 opening source changed: canonical opening retained; operational autosave restored.');
    }
    restoring=false;
    if(recoveredBuyConfirmation){
      recoveredBuyConfirmation=false;
      setTimeout(()=>saveNow('recover-buy-confirmation'),0);
    }
    return true;
  }

  function maybeRestoreNewerCloud(){
    const saved=readSaved();
    if(!saved)return false;
    const ts=Number(saved.savedAt||0);
    if(!ts||ts<=lastSavedAt)return false;
    const active=document.activeElement;
    const editing=!!active&&/^(INPUT|SELECT|TEXTAREA)$/.test(String(active.tagName||''))&&
      !active.disabled&&!active.readOnly;
    if(editing||Date.now()-lastInteractionAt<1200){
      setTimeout(maybeRestoreNewerCloud,1400);
      return false;
    }
    return restoreNow('cloud-newer');
  }

  function bindAutosave(){
    if(document.documentElement.dataset.v53AutosaveBound==='1') return;
    document.documentElement.dataset.v53AutosaveBound='1';

    document.addEventListener('input',e=>{
      if(e.target?.matches?.('input,select,textarea')){
        lastInteractionAt=Date.now();
        queueSave('input');
      }
    },true);
    document.addEventListener('change',e=>{
      if(e.target?.matches?.('input,select,textarea')){
        lastInteractionAt=Date.now();
        queueSave('change');
      }
    },true);
    document.addEventListener('keydown',e=>{
      if(e.target?.matches?.('input,select,textarea')) lastInteractionAt=Date.now();
    },true);
    document.addEventListener('click',()=>{
      lastInteractionAt=Date.now();
      setTimeout(()=>queueSave('action'),40);
    },false);
    // Cloud sync may update notes/accounts, but active shift UI is local-first.
    // Full shift restore only happens on page load/manual restore, never mid-entry.
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='hidden') saveNow('hidden');
    });
    window.addEventListener('beforeunload',()=>saveNow('beforeunload'));
    setInterval(()=>saveNow('interval'),2000);
  }

  function initDom(){
    restoreNow('dom');
    bindAutosave();
    document.querySelectorAll('.topbar .status.info').forEach(el=>{
      if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V57 — MANUAL DEBTOR + AUTOSAVE';
    });
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
    key:()=>storageKey(),
    restoreNewerCloud:()=>maybeRestoreNewerCloud(),
    lastSavedAt:()=>lastSavedAt
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initDom,{once:true});
  else initDom();
  window.addEventListener('load',initLoad,{once:true});
})();
