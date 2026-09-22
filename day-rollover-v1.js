/* Konter Anisa Day Rollover V1
   Simulation-only rollover. Activated only when index.html has ?sim_date=YYYY-MM-DD.
   Seeds a new shift from the previous shift's closing state, then lets V53 restore it normally.
*/
(function(){
  'use strict';

  const PREFIX='ka_shift_autosave_v53_';
  const INDEX_KEY='ka_shift_autosave_v53_index';
  let started=false,seeding=false,timer=null;

  const read=(k,f=null)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x==null?f:x}catch(_){return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const num=v=>Number(v)||0;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const slug=v=>String(v||'unknown').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'unknown';
  const val=(forms,id,f='')=>String(forms?.[id]?.value??f);

  function config(){
    const q=new URLSearchParams(location.search);
    const date=String(q.get('sim_date')||'').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const shift=String(q.get('sim_shift')||window.KARegulationsV29?.activeShift?.shift||'Full');
    const holder=String(q.get('sim_holder')||window.KARegulationsV29?.activeShift?.holder||'Rifda');
    const active=window.KARegulationsV29?.activeShift;
    const id=String(active?.id||date+'-'+slug(shift)+'-'+slug(holder));
    const d=new Date(date+'T12:00:00');
    d.setDate(d.getDate()-1);
    const prevDate=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    const prevId=prevDate+'-'+slug(shift)+'-'+slug(holder);
    return {date,shift,holder,id,prevDate,prevId};
  }

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
      if(typeof txEntries!=='undefined'&&txEntries&&typeof txEntries==='object'){
        Object.keys(txEntries).forEach(k=>tx[k]=[]);
      }
    }catch(_){}
    return {debtEntries:[],paymentEntries:[],opEntries:[],txEntries:tx,adminState:{}};
  }

  function buildSeed(cfg,prev){
    const forms=formSnapshot();
    const prevForms=prev?.forms||{};
    const prevCats=prev?.catalogs||{};

    // Reset all day-specific drafts/endings first.
    Object.keys(forms).forEach(id=>{
      if(/^modalInput\d+$/.test(id))setForm(forms,id,'');
      else if(/^pkgEnd\d+$/.test(id))setForm(forms,id,'');
      else if(/^cigEnd\d+$/.test(id))setForm(forms,id,'');
      else if(/^move\d+$/.test(id))setForm(forms,id,'0');
      else if(/^(pkgQty|cigQty)$/.test(id))setForm(forms,id,'0');
      else if(/^(cigTotal|opAmount|opNote|debtAmount|debtNote|payAmount|oilBuyAmount)$/.test(id))setForm(forms,id,'');
    });

    // Closing modal 18 -> opening modal 19.
    for(let i=1;i<=25;i++){
      const closing=val(prevForms,'modalInput'+i,'');
      setForm(forms,'prevModalCheck'+i,closing);
      setForm(forms,'prevModalReason'+i,'');
    }

    const pkgPrev=Array.isArray(prevCats.pkg)?prevCats.pkg:[];
    const pkg=pkgPrev.map((p,ix)=>{
      const endRaw=val(prevForms,'pkgEnd'+(ix+1),'');
      const stock=endRaw===''?num(p.stock):Math.max(0,num(endRaw));
      const base=num(p.activeBase??p.purchaseBase??p.openingBase??p.base);
      const sell=num(p.activeSell??p.sell);
      setForm(forms,'pkgCheck'+(ix+1),stock);
      setForm(forms,'pkgReason'+(ix+1),'');
      return {
        key:String(p.key||''),
        stock,purchaseQty:0,
        base,openingBase:base,purchaseBase:base,activeBase:base,activeSell:sell
      };
    });

    const cigPrev=Array.isArray(prevCats.cig)?prevCats.cig:[];
    const cig=cigPrev.map((x,ix)=>{
      const n=ix+1;
      const displayRaw=val(prevForms,'cigEnd'+n,'');
      const display=displayRaw===''?num(x.display):Math.max(0,num(displayRaw));
      const moved=Math.max(0,num(val(prevForms,'move'+n,'0')));
      const warehouse=Math.max(0,num(x.warehouse)+num(x.purchaseQty)-moved);
      const base=num(x.activeBase??x.openingBase??x.base);
      const sell=num(x.sell);
      setForm(forms,'cigDispCheck'+n,display);
      setForm(forms,'cigWhCheck'+n,warehouse);
      setForm(forms,'cigReason'+n,'');
      setForm(forms,'move'+n,'0');
      return {
        key:String(x.key||''),
        display,warehouse,purchaseQty:0,purchaseCost:0,
        base,openingBase:base,activeBase:base,sell
      };
    });

    return {
      schema:53,
      shiftId:cfg.id,
      sourceFingerprint:fingerprint(),
      savedAt:Date.now(),
      reason:'rollover-from-'+cfg.prevId,
      rolloverFrom:cfg.prevId,
      rolloverSimulation:true,
      forms,
      catalogs:{pkg,cig},
      core:emptyTxCore(),
      flags:{
        idx:0,
        openingPkgPreviewConfirmed:false,
        openingCigPreviewConfirmed:false,
        openingPkgPreviewSignature:'',
        openingCigPreviewSignature:'',
        openingPkgHardBlock:false,
        openingCigHardBlock:false,
        openingApprovalState:'none',
        openingCorrectionsSubmitted:false,
        pkgBuyConfirmed:false,
        cigBuyConfirmed:false,
        v51:{displayPreviewConfirmed:false,displayPreviewSignature:''}
      }
    };
  }

  function touchIndex(key,ts){
    let arr=read(INDEX_KEY,[]);
    if(!Array.isArray(arr))arr=[];
    arr=arr.filter(x=>String(x?.key||'')!==key);
    arr.unshift({key,ts});
    while(arr.length>20)arr.pop();
    write(INDEX_KEY,arr);
  }

  function labelDate(iso){
    const d=new Date(iso+'T12:00:00');
    return d.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  }

  function paint(cfg){
    const dateLabel=labelDate(cfg.date);
    const prevLabel=labelDate(cfg.prevDate);
    const replaceDate=(root)=>{
      if(!root)return;
      const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      const nodes=[];while(walk.nextNode())nodes.push(walk.currentNode);
      nodes.forEach(n=>{
        n.textContent=String(n.textContent||'').replace(/18\s+September\s+2026/gi,dateLabel);
      });
    };
    replaceDate(document.querySelector('.crumb'));
    replaceDate(document.querySelector('.hero'));

    if(!document.getElementById('kaRolloverSimBanner')){
      const host=document.querySelector('.content');
      if(host){
        const b=document.createElement('div');
        b.id='kaRolloverSimBanner';
        b.className='notice blue';
        b.style.cssText='margin:0 0 14px;border-width:2px';
        b.innerHTML='<b>MODE SIMULASI '+dateLabel.toUpperCase()+'</b> • Opening otomatis dari penutupan '+prevLabel+' • Shift '+cfg.shift+' • '+cfg.holder;
        host.prepend(b);
      }
    }
  }

  function trySeed(){
    const cfg=config();if(!cfg||seeding)return false;
    paint(cfg);
    const currentKey=PREFIX+cfg.id;
    const current=read(currentKey,null);
    if(current&&String(current.shiftId||'')===cfg.id){
      return true;
    }
    const prev=read(PREFIX+cfg.prevId,null);
    if(!prev||!prev.forms||!prev.catalogs)return false;

    seeding=true;
    const seed=buildSeed(cfg,prev);
    write(currentKey,seed);
    touchIndex(currentKey,seed.savedAt);
    sessionStorage.setItem('ka_rollover_last_v1',JSON.stringify({from:cfg.prevId,to:cfg.id,at:seed.savedAt}));
    const q=new URLSearchParams(location.search);
    q.set('rollover_ready','1');
    location.replace(location.pathname+'?'+q.toString()+location.hash);
    return true;
  }

  function start(){
    if(started)return;started=true;
    const cfg=config();if(!cfg)return;
    paint(cfg);
    if(trySeed())return;
    window.addEventListener('ka:shared-sync',()=>trySeed());
    timer=setInterval(()=>{if(trySeed())clearInterval(timer)},1200);
    setTimeout(()=>{if(timer)clearInterval(timer)},20000);
  }

  window.KADayRolloverV1={start,trySeed};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
