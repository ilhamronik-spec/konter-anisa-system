/* Konter Anisa Day Rollover V2
   Simulation-only. Target date comes from ?sim_date=YYYY-MM-DD.
   Optional ?sim_base=YYYY-MM-DD selects the source closing date.
   The previous closing becomes the REAL system opening, never a correction input.
*/
(function(){
  'use strict';

  const PREFIX='ka_shift_autosave_v53_';
  const INDEX_KEY='ka_shift_autosave_v53_index';
  let started=false,timer=null,currentMeta=null;

  const read=(k,f=null)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x==null?f:x}catch(_){return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const num=v=>Number(v)||0;
  const slug=v=>String(v||'unknown').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'unknown';
  const val=(forms,id,f='')=>String(forms?.[id]?.value??f);

  function config(){
    const q=new URLSearchParams(location.search);
    const date=String(q.get('sim_date')||'').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const shift=String(q.get('sim_shift')||window.KARegulationsV29?.activeShift?.shift||'Full');
    const holder=String(q.get('sim_holder')||window.KARegulationsV29?.activeShift?.holder||'Rifda');
    const id=String(window.KARegulationsV29?.activeShift?.id||date+'-'+slug(shift)+'-'+slug(holder));
    let baseDate=String(q.get('sim_base')||'').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(baseDate)){
      const d=new Date(date+'T12:00:00');d.setDate(d.getDate()-1);
      baseDate=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    }
    const baseId=baseDate+'-'+slug(shift)+'-'+slug(holder);
    return {date,shift,holder,id,baseDate,baseId};
  }

  function isSimulation(){ return !!config(); }

  function fingerprint(){
    try{
      const modal=(typeof openingPrevModal!=='undefined'&&Array.isArray(openingPrevModal))
        ? openingPrevModal.map(x=>[String(x?.name||''),Number(x?.value||0)]) : [];
      const pkg=(typeof pkgCatalog!=='undefined'&&Array.isArray(pkgCatalog))
        ? pkgCatalog.map(x=>[String(x?.group||''),String(x?.name||''),Number(x?.stock||0),Number(x?.base||0),Number(x?.sell||0)]) : [];
      const cig=(typeof cigCatalog!=='undefined'&&Array.isArray(cigCatalog))
        ? cigCatalog.map(x=>[String(x?.name||''),Number(x?.display||0),Number(x?.warehouse||0),Number(x?.base||0),Number(x?.sell||0)]) : [];
      const raw=JSON.stringify({modal,pkg,cig});
      let h=2166136261;
      for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}
      return 'src-'+(h>>>0).toString(16);
    }catch(_){return 'src-unknown'}
  }

  function formSnapshot(){
    const out={};
    document.querySelectorAll('input[id],select[id],textarea[id]').forEach(el=>{
      const type=String(el.type||'').toLowerCase();
      if(['button','submit','reset','file','image'].includes(type))return;
      out[el.id]={value:String(el.value??''),checked:!!el.checked,type,tag:el.tagName};
    });
    return out;
  }
  function setForm(forms,id,value){
    if(!forms[id])forms[id]={value:'',checked:false,type:'text',tag:'INPUT'};
    forms[id].value=String(value??'');
  }

  function emptyTxCore(){
    const tx={};
    try{
      if(typeof txEntries!=='undefined'&&txEntries&&typeof txEntries==='object') Object.keys(txEntries).forEach(k=>tx[k]=[]);
    }catch(_){}
    return {debtEntries:[],paymentEntries:[],opEntries:[],txEntries:tx,adminState:{}};
  }

  function endingWarehouse(prev,ix,x){
    const n=ix+1;
    const moved=Math.max(0,num(val(prev.forms,'move'+n,'0')));
    return Math.max(0,num(x.warehouse)+num(x.purchaseQty)-moved);
  }

  function buildSeed(cfg,prev){
    const forms=formSnapshot();
    const prevForms=prev?.forms||{};
    const prevCats=prev?.catalogs||{};

    // New day fields are empty. Opening check/correction inputs are NOT used to carry balances.
    Object.keys(forms).forEach(id=>{
      if(/^modalInput\d+$/.test(id)) setForm(forms,id,'');
      else if(/^pkgEnd\d+$/.test(id)) setForm(forms,id,'');
      else if(/^cigEnd\d+$/.test(id)) setForm(forms,id,'');
      else if(/^move\d+$/.test(id)) setForm(forms,id,'0');
      else if(/^pkgCheck\d+$/.test(id)) setForm(forms,id,'');
      else if(/^cig(?:Disp|Wh)Check\d+$/.test(id)) setForm(forms,id,'');
      else if(/^prevModalCheck\d+$/.test(id)) setForm(forms,id,'');
      else if(/^(?:pkg|cig|prevModal)Reason\d+$/.test(id)) setForm(forms,id,'');
      else if(/^(pkgQty|cigQty)$/.test(id)) setForm(forms,id,'0');
      else if(/^(cigTotal|opAmount|opNote|debtAmount|debtNote|payAmount|oilBuyAmount)$/.test(id)) setForm(forms,id,'');
    });

    const openingModal=[];
    for(let i=1;i<=25;i++) openingModal.push(num(String(val(prevForms,'modalInput'+i,'0')).replace(/[^0-9.-]/g,'')));

    const pkgPrev=Array.isArray(prevCats.pkg)?prevCats.pkg:[];
    const pkg=pkgPrev.map((p,ix)=>{
      const endRaw=val(prevForms,'pkgEnd'+(ix+1),'');
      const stock=endRaw===''?num(p.stock):Math.max(0,num(endRaw));
      const base=num(p.activeBase??p.purchaseBase??p.openingBase??p.base);
      const sell=num(p.activeSell??p.sell);
      return {key:String(p.key||''),stock,purchaseQty:0,base,openingBase:base,purchaseBase:base,activeBase:base,activeSell:sell};
    });

    const cigPrev=Array.isArray(prevCats.cig)?prevCats.cig:[];
    const cig=cigPrev.map((x,ix)=>{
      const endRaw=val(prevForms,'cigEnd'+(ix+1),'');
      const display=endRaw===''?num(x.display):Math.max(0,num(endRaw));
      const warehouse=endingWarehouse(prev,ix,x);
      const base=num(x.activeBase??x.openingBase??x.base);
      const sell=num(x.sell);
      return {key:String(x.key||''),display,warehouse,purchaseQty:0,purchaseCost:0,base,openingBase:base,activeBase:base,sell};
    });

    return {
      schema:53,shiftId:cfg.id,sourceFingerprint:'pending',savedAt:Date.now(),
      reason:'rollover-from-'+cfg.baseId,
      rolloverFrom:cfg.baseId,rolloverBaseDate:cfg.baseDate,rolloverSimulation:true,rolloverVersion:2,
      rolloverOpeningModal:openingModal,
      forms,catalogs:{pkg,cig},core:emptyTxCore(),
      flags:{idx:0,openingPkgPreviewConfirmed:false,openingCigPreviewConfirmed:false,openingPkgPreviewSignature:'',openingCigPreviewSignature:'',openingPkgHardBlock:false,openingCigHardBlock:false,openingApprovalState:'none',openingCorrectionsSubmitted:false,pkgBuyConfirmed:false,cigBuyConfirmed:false,v51:{displayPreviewConfirmed:false,displayPreviewSignature:''}}
    };
  }

  function formatMoney(n){
    return 'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');
  }

  function applyRuntime(saved){
    if(!saved||saved.rolloverSimulation!==true)return false;
    const cats=saved.catalogs||{};

    try{
      if(typeof openingPrevModal!=='undefined'&&Array.isArray(openingPrevModal)){
        const arr=Array.isArray(saved.rolloverOpeningModal)?saved.rolloverOpeningModal:[];
        openingPrevModal.forEach((x,i)=>{if(i<arr.length)x.value=num(arr[i]);});
        document.querySelectorAll('.modal-prev-row').forEach((row,i)=>{
          if(row.cells?.[1]&&i<arr.length) row.cells[1].textContent=formatMoney(arr[i]);
        });
      }
    }catch(_){}

    try{
      if(typeof pkgCatalog!=='undefined'&&Array.isArray(cats.pkg)){
        const map=new Map(cats.pkg.map(x=>[String(x.key||''),x]));
        pkgCatalog.forEach((p,i)=>{
          const rec=map.get(String(p.group||'')+'|'+String(p.name||''));if(!rec)return;
          p.stock=num(rec.stock);p.purchaseQty=num(rec.purchaseQty);
          p.base=num(rec.base??rec.openingBase);p._openingBase=num(rec.openingBase??rec.base);
          p.purchaseBase=num(rec.purchaseBase??p._openingBase);p.activeBase=num(rec.activeBase??p._openingBase);
          p.activeSell=num(rec.activeSell??p.sell);
          if(typeof openingPkg!=='undefined'&&openingPkg[i]){
            openingPkg[i].stock=p.stock;openingPkg[i].base=p._openingBase;openingPkg[i].sell=p.activeSell;
          }
        });
      }
    }catch(_){}

    try{
      if(typeof cigCatalog!=='undefined'&&Array.isArray(cats.cig)){
        const map=new Map(cats.cig.map(x=>[String(x.key||''),x]));
        cigCatalog.forEach((c,i)=>{
          const rec=map.get(String(c.name||''));if(!rec)return;
          c.display=num(rec.display);c.warehouse=num(rec.warehouse);c.purchaseQty=num(rec.purchaseQty);c.purchaseCost=num(rec.purchaseCost);
          c.base=num(rec.base??rec.openingBase);c._openingBase=num(rec.openingBase??rec.base);c.activeBase=num(rec.activeBase??c._openingBase);c.sell=num(rec.sell??c.sell);
          if(typeof openingCig!=='undefined'&&openingCig[i]){
            openingCig[i].display=c.display;openingCig[i].warehouse=c.warehouse;openingCig[i].base=c._openingBase;openingCig[i].sell=c.sell;
          }
        });
      }
    }catch(_){}

    // Keep physical/correction inputs empty on a fresh simulated day.
    try{
      const forms=saved.forms||{};
      Object.entries(forms).forEach(([id,rec])=>{
        if(!/^(?:pkgCheck|cigDispCheck|cigWhCheck|prevModalCheck|pkgReason|cigReason|prevModalReason)\d+$/.test(id))return;
        const el=document.getElementById(id);if(el)el.value=String(rec?.value??'');
      });
    }catch(_){}

    currentMeta={
      rolloverSimulation:true,rolloverVersion:2,rolloverFrom:String(saved.rolloverFrom||''),
      rolloverBaseDate:String(saved.rolloverBaseDate||''),rolloverOpeningModal:Array.isArray(saved.rolloverOpeningModal)?saved.rolloverOpeningModal.slice():[]
    };
    return true;
  }

  function touchIndex(key,ts){
    let arr=read(INDEX_KEY,[]);if(!Array.isArray(arr))arr=[];
    arr=arr.filter(x=>String(x?.key||'')!==key);arr.unshift({key,ts});
    while(arr.length>20)arr.pop();write(INDEX_KEY,arr);
  }

  function labelDate(iso){
    const d=new Date(iso+'T12:00:00');
    return d.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  }

  function paint(cfg){
    const target=labelDate(cfg.date),base=labelDate(cfg.baseDate);
    const rewrite=root=>{
      if(!root)return;const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];
      while(walk.nextNode())nodes.push(walk.currentNode);
      nodes.forEach(n=>{n.textContent=String(n.textContent||'').replace(/18\s+September\s+2026/gi,target).replace(/19\s+September\s+2026/gi,target);});
    };
    rewrite(document.querySelector('.crumb'));rewrite(document.querySelector('.hero'));
    const foot=document.querySelector('.side-foot div:last-child');
    if(foot)foot.textContent='SIMULASI '+target+' • sistem opening dari closing '+base;
    if(!document.getElementById('kaRolloverSimBanner')){
      const host=document.querySelector('.content');
      if(host){
        const b=document.createElement('div');b.id='kaRolloverSimBanner';b.className='notice blue';b.style.cssText='margin:0 0 14px;border-width:2px';
        b.innerHTML='<b>MODE SIMULASI '+target.toUpperCase()+'</b> • Stok/modal SISTEM berasal dari penutupan '+base+' • kolom koreksi tidak diisi otomatis';
        host.prepend(b);
      }
    }
  }

  function trySeed(){
    const cfg=config();if(!cfg)return false;
    paint(cfg);
    const currentKey=PREFIX+cfg.id;
    let current=read(currentKey,null);

    if(current&&current.rolloverSimulation===true&&String(current.rolloverFrom||'')===cfg.baseId){
      applyRuntime(current);return true;
    }

    const base=read(PREFIX+cfg.baseId,null);
    if(!base||!base.forms||!base.catalogs)return false;

    current=buildSeed(cfg,base);
    applyRuntime(current);
    current.sourceFingerprint=fingerprint();
    write(currentKey,current);touchIndex(currentKey,current.savedAt);
    currentMeta={
      rolloverSimulation:true,rolloverVersion:2,rolloverFrom:cfg.baseId,rolloverBaseDate:cfg.baseDate,
      rolloverOpeningModal:current.rolloverOpeningModal.slice()
    };
    sessionStorage.setItem('ka_rollover_last_v2',JSON.stringify({from:cfg.baseId,to:cfg.id,at:current.savedAt}));
    return true;
  }

  function ready(){
    const cfg=config();if(!cfg)return true;
    const x=read(PREFIX+cfg.id,null);
    return !!(x&&x.rolloverSimulation===true&&String(x.rolloverFrom||'')===cfg.baseId);
  }

  function metadata(){return currentMeta?JSON.parse(JSON.stringify(currentMeta)):{}}

  function start(){
    if(started)return;started=true;
    const cfg=config();if(!cfg)return;
    // Run immediately, before DOMContentLoaded initializers overwrite the opening.
    if(trySeed())return;
    window.addEventListener('ka:shared-sync',()=>{if(trySeed()&&timer){clearInterval(timer);timer=null;}});
    timer=setInterval(()=>{if(trySeed()){clearInterval(timer);timer=null;}},500);
    setTimeout(()=>{if(timer){clearInterval(timer);timer=null;}},20000);
  }

  window.KADayRolloverV1={start,trySeed,ready,metadata,isSimulation,config};
  start();
})();
