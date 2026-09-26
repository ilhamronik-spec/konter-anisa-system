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
  const BASE23={"modal":[22391759,13309271,0,8193765,0,2898345,0,0,0,689247,1835000,274000,4182836,0,711100,0,10521,0,0,6632804,2204510,27032800,4690768,7419883.333333334,11061640],"pkg":[["AXIS","1.5 GB/1H",7050,8000,38],["AXIS","5gb/2H",9600,10000,5],["AXIS","5 gb/5 H",13950,15000,11],["AXIS","5,5 GB/3 H",11950,13000,40],["AXIS","6 gb/5H",14550,16000,21],["AXIS","8,5 GB/3H",13500,15000,0],["AXIS","16 GB/5H",23000,24000,12],["AXIS","12,5/3h",15950,17000,7],["AXIS","10GB/7H",24000,25000,2],["AXIS","24/5H",26000,29000,4],["AXIS","5gb\\15h",23100,25000,0],["AXIS","11GB/7H",31800,33000,0],["AXIS","24gb/15H",44000,48000,4],["SMARTFREEN","1GB/3H",6800,7000,12],["SMARTFREEN","2GB/3H",8900,10000,0],["SMARTFREEN","3GB/5H",13750,15000,35],["SMARTFREEN","4GB/7H",16000,17000,11],["SMARTFREEN","4GB/14H",19500,21000,3],["SMARTFREEN","4gb/3h",9750,11000,18],["SMARTFREEN","UNLI 1GB/7H",16700,19000,9],["SMARTFREEN","UNLI 2GB/7H",22300,25000,17],["SMARTFREEN","UNLI 3 GB/7H",30000,32000,0],["SMARTFREEN","UNLI 700MB/28H",64500,76000,3],["SMARTFREEN","UNLI 2GB/28H",86750,95000,1],["TELKOMSEL","1,5GB/3H",8400,10000,0],["TELKOMSEL","6gb/2h",10300,12000,5],["TELKOMSEL","2GB/3H",9900,12000,0],["TELKOMSEL","2GB/5H",11850,13000,4],["TELKOMSEL","7GB/3H",14550,16000,0],["TELKOMSEL","6GB/5H",14700,16000,0],["TELKOMSEL","9GB/5H",22200,24000,1],["TELKOMSEL","9GB/7H",27300,29000,3],["TELKOMSEL","4GB/5H",13500,14000,0],["IM3","1,5GB/1H",7800,8000,20],["IM3","5/2h",9150,11000,7],["IM3","2,5GB/5H",13250,15000,2],["IM3","3,5GB/5H",15150,17000,4],["IM3","5GB/5H",17100,18000,19],["IM3","7GB/7H",23100,25000,13],["IM3","3GB/30H",20100,22000,0],["IM3","7GB/30H",34750,34000,2],["TRI","6gb/2h",9600,11000,0],["TRI","5gb 1hri",7750,8000,9],["TRI","4GB/3H",12500,13000,11],["TRI","12GB/7H",22800,24000,40],["TRI","3GB/30H",22500,25000,0],["XL","2,5GB",12100,13000,0],["XL","3,5GB",16500,18000,3],["XL","5,5GB",15750,22000,1],["XL","9GB",26800,28000,10],["PERDANA","TELS 0",19500,25000,3],["PERDANA","TELS 4",28500,36000,5],["PERDANA","AXIS 0",8750,17000,0],["PERDANA","AXIS 3GB",15000,27000,0],["PERDANA","IM3 3GB",16000,38000,2],["PERDANA","TRI 3GB",15000,42000,1],["PERDANA","SMARTFREEN 12GB",11000,25000,0],["PERDANA","SMARTFREEN 3GB",18500,32000,2]],"cig":[["HASTA",14700,16000,6,30],["Sempurna B",35100,37000,0,10],["Slava",16500,20000,4,20],["LM",7900,9000,0,20],["Surya Kecil",25900,27000,0,0],["Rasta bluberi",15200,17000,0,10],["Harum Manis",7200,8000,7,0],["Novem",16000,18000,0,0],["Dji Samso hitam",21300,23000,5,0],["Surya Besar",34900,36000,5,0],["Aspro",22400,24000,9,0],["A.O",15500,18000,5,6],["Savero",16000,17000,2,10],["Sempurna K",25600,27000,6,10],["rasta",13200,15000,0,10],["Tunggal",14000,15000,1,0],["Titan",15700,18000,4,0],["Konser",14700,16000,0,0],["sempurna A kretek",15400,17000,9,10],["Sempurna A 2 +",15400,20000,0,0],["Wezz",12900,15000,8,10],["Twizz",21350,23000,0,0],["EVO",25100,26000,4,10],["Luffman",11600,14000,4,0],["Clasmid",29500,30000,9,0],["sempurna prima",15300,16000,8,0],["Sempurna hijau",15350,16000,0,0],["duff",24000,25000,0,0],["abs",16500,18000,3,10],["di jam su kretek 234",19500,21000,1,0],["Malboro KECIL",24000,25000,8,10],["Esse Double Change",42388.88888888889,45000,6,0],["Chiff",15000,17000,0,0],["L.A ice",34000,35000,0,0],["malboro besar",38950,40000,7,0],["Novem Manggo",16300,18000,8,0],["la bold hitam",37100,40000,0,0],["esse merah",39400,42000,0,0],["gudang garam merah",18000,19000,0,0],["Sempurna zetta",23000,24000,0,0],["twizz biru",23500,25000,0,0],["king garet",17500,19000,0,0],["titan biru",16700,18000,0,0],["honey pop",32000,33000,0,0],["slava klik",17900,20000,3,10],["rasta mangga",15200,17000,0,10],["aspro 12",16800,18000,1,0],["aspro bold",26500,28000,0,0],["sempurna 89 edition",32600,34000,1,0],["sempurna min",34000,36000,0,0],["malboro 16",31000,32000,2,0],["sempurna prima kertas",13450,15000,0,0],["malboro vista",33000,35000,0,0],["sempurna evolution",41900,44000,0,0],["oris",13700,15000,4,10],["marlong",10500,15000,8,70],["sempurna tropizal",30000,35000,0,0],["sempurna royal",30000,35000,0,0],["slava semangka",17900,20000,0,10],["slava ice blast",17000,20000,0,0]]};

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
        ? pkgCatalog.map(x=>[String(x?._sourceKey||((x?.group||'')+'|'+(x?.name||''))),Number(x?.stock||0),Number(x?.base||0),Number(x?.sell||0)]) : [];
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

  function canonicalBase(date){
    if(String(date)!=='2026-09-23') return null;
    const forms={};
    BASE23.modal.forEach((v,i)=>{forms['modalInput'+(i+1)]={value:String(v),checked:false,type:'text',tag:'INPUT'};});
    return {
      schema:53,
      shiftId:'2026-09-23-full-rifda',
      savedAt:Date.now(),
      sourceLabel:'worksheet september benar(6).xlsx • sheet 23 september',
      forms,
      catalogs:{
        pkg:BASE23.pkg.map(x=>({key:x[0]+'|'+x[1],stock:x[4],purchaseQty:0,base:x[2],openingBase:x[2],purchaseBase:x[2],activeBase:x[2],activeSell:x[3]})),
        cig:BASE23.cig.map(x=>({key:x[0],display:x[3],warehouse:x[4],purchaseQty:0,purchaseCost:0,base:x[1],openingBase:x[1],activeBase:x[1],sell:x[2]}))
      }
    };
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
      else if(/^prevModalCheck\d+$/.test(id)) setForm(forms,id,''); // diisi dari modal lama setelah openingModal terbentuk
      else if(/^(?:pkg|cig|prevModal)Reason\d+$/.test(id)) setForm(forms,id,'');
      else if(/^(pkgQty|cigQty)$/.test(id)) setForm(forms,id,'0');
      else if(/^(cigTotal|opAmount|opNote|debtAmount|debtNote|payAmount|oilBuyAmount)$/.test(id)) setForm(forms,id,'');
    });

    const openingModal=[];
    for(let i=1;i<=25;i++) openingModal.push(num(String(val(prevForms,'modalInput'+i,'0')).replace(/[^0-9.-]/g,'')));

    // Modal check default = modal lama. Karyawan hanya mengubah kolom ini bila nilai aktual berbeda.
    openingModal.forEach((v,i)=>setForm(forms,'prevModalCheck'+(i+1),Math.round(v).toLocaleString('id-ID')));

    const pkgPrev=Array.isArray(prevCats.pkg)?prevCats.pkg:[];
    const pkg=pkgPrev.map((p,ix)=>{
      const endRaw=val(prevForms,'pkgEnd'+(ix+1),'');
      const stock=endRaw===''?num(p.stock):Math.max(0,num(endRaw));
      const base=num(p.activeBase??p.purchaseBase??p.openingBase??p.base);
      const sell=num(p.activeSell??p.sell);
      return {key:String(p.key||''),sourceKey:String(p.sourceKey||p.key||''),group:String(p.group||''),name:String(p.name||String(p.key||'').split('|').slice(1).join('|')),stock,purchaseQty:0,base,openingBase:base,purchaseBase:base,activeBase:base,activeSell:sell};
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
      rolloverFrom:cfg.baseId,rolloverBaseDate:cfg.baseDate,rolloverSimulation:true,rolloverVersion:5,
      rolloverSource:String(prev?.sourceLabel||'shift '+cfg.baseId),
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
        const map=new Map();
        cats.pkg.forEach(x=>{const stable=String(x.sourceKey||x.key||'');if(stable)map.set(stable,x);});
        pkgCatalog.forEach((p,i)=>{
          if(!p._sourceKey)p._sourceKey=String((p.group||'')+'|'+(p.name||''));
          const rec=map.get(String(p._sourceKey||''))||map.get(String(p.group||'')+'|'+String(p.name||''));if(!rec)return;
          p.stock=num(rec.stock);p.purchaseQty=num(rec.purchaseQty);
          if(String(rec.name||'').trim())p.name=String(rec.name).trim();
          if(String(rec.group||'').trim())p.group=String(rec.group).trim();
          p.base=num(rec.base??rec.openingBase);p._openingBase=num(rec.openingBase??rec.base);
          p.purchaseBase=num(rec.purchaseBase??p._openingBase);p.activeBase=num(rec.activeBase??p._openingBase);
          p.activeSell=num(rec.activeSell??p.sell);
          if(typeof openingPkg!=='undefined'&&openingPkg[i]){
            openingPkg[i].stock=p.stock;openingPkg[i].base=p._openingBase;openingPkg[i].sell=p.activeSell;
          }
        });
        try{window.refreshPkgNameViews?.()}catch(_){}
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

    // Stok fisik/koreksi tetap kosong pada hari simulasi baru.
    // Khusus cek modal, nilai default adalah modal lama agar karyawan hanya mengubah jika berbeda.
    try{
      const forms=saved.forms||{};
      Object.entries(forms).forEach(([id,rec])=>{
        if(!/^(?:pkgCheck|cigDispCheck|cigWhCheck|prevModalCheck|pkgReason|cigReason|prevModalReason)\d+$/.test(id))return;
        const el=document.getElementById(id);if(el)el.value=String(rec?.value??'');
      });
    }catch(_){}

    currentMeta={
      rolloverSimulation:true,rolloverVersion:Number(saved.rolloverVersion||3),rolloverFrom:String(saved.rolloverFrom||''),
      rolloverBaseDate:String(saved.rolloverBaseDate||''),rolloverSource:String(saved.rolloverSource||''),
      rolloverOpeningModal:Array.isArray(saved.rolloverOpeningModal)?saved.rolloverOpeningModal.slice():[]
    };
    try{window.KAStockV50?.refreshOpeningSystem?.();}catch(_){}
    try{if(typeof syncPkgBuy==='function')syncPkgBuy();}catch(_){}
    try{if(typeof syncCigBuy==='function')syncCigBuy();}catch(_){}
    try{window.KABalanceV44?.renderBalance?.();}catch(_){}
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

  function persistSimulation(cfg){
    try{
      write('ka_sim_active_shift_v1',{
        date:cfg.date,shift:cfg.shift,holder:cfg.holder,id:cfg.id,
        baseDate:cfg.baseDate,updatedAt:Date.now()
      });
    }catch(_){}
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
        b.innerHTML='<b>MODE SIMULASI '+target.toUpperCase()+'</b> • Stok/modal SISTEM berasal dari penutupan '+base+' • cek modal otomatis terisi modal lama; ubah hanya jika berbeda';
        host.prepend(b);
      }
    }
  }

  function trySeed(){
    const cfg=config();if(!cfg)return false;
    paint(cfg);
    persistSimulation(cfg);
    const currentKey=PREFIX+cfg.id;
    let current=read(currentKey,null);

    if(current&&current.rolloverSimulation===true&&String(current.rolloverFrom||'')===cfg.baseId&&Number(current.rolloverVersion||0)>=3){
      // V5 khusus simulasi 24/09: reset ulang dari closing 23 yang kanonik.
      // Ini membuang snapshot simulasi lama yang sempat tercampur nilai kolom koreksi.
      if(cfg.date==='2026-09-24' && cfg.baseDate==='2026-09-23' && Number(current.rolloverVersion||0)<5){
        const cleanBase=canonicalBase(cfg.baseDate)||read(PREFIX+cfg.baseId,null);
        if(cleanBase&&cleanBase.forms&&cleanBase.catalogs){
          current=buildSeed(cfg,cleanBase);
          current.rolloverVersion=5;
          current.reason='migrate-v5-clean-system-opening';
          applyRuntime(current);
          current.sourceFingerprint=fingerprint();
          write(currentKey,current);touchIndex(currentKey,current.savedAt);
          currentMeta={
            rolloverSimulation:true,rolloverVersion:5,rolloverFrom:cfg.baseId,rolloverBaseDate:cfg.baseDate,
            rolloverSource:String(current.rolloverSource||''),rolloverOpeningModal:current.rolloverOpeningModal.slice()
          };
          return true;
        }
      }
      applyRuntime(current);return true;
    }

    const base=canonicalBase(cfg.baseDate)||read(PREFIX+cfg.baseId,null);
    if(!base||!base.forms||!base.catalogs)return false;

    current=buildSeed(cfg,base);
    applyRuntime(current);
    current.sourceFingerprint=fingerprint();
    write(currentKey,current);touchIndex(currentKey,current.savedAt);
    currentMeta={
      rolloverSimulation:true,rolloverVersion:5,rolloverFrom:cfg.baseId,rolloverBaseDate:cfg.baseDate,
      rolloverSource:String(current.rolloverSource||''),rolloverOpeningModal:current.rolloverOpeningModal.slice()
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
    // Selalu re-assert setelah cloud pull agar snapshot simulasi lama tidak mengalahkan baseline yang benar.
    window.addEventListener('ka:shared-sync',()=>{trySeed();});
    // Run immediately, before DOMContentLoaded initializers overwrite the opening.
    if(trySeed())return;
    timer=setInterval(()=>{if(trySeed()){clearInterval(timer);timer=null;}},500);
    setTimeout(()=>{if(timer){clearInterval(timer);timer=null;}},20000);
  }

  window.KADayRolloverV1={start,trySeed,ready,metadata,isSimulation,config};
  start();
})();
