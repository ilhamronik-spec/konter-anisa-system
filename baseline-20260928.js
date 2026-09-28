/* Konter Anisa — Baseline opening 28 Sep 2026
   Source tunggal: worksheet september benar(7).xlsx, sheet 27 september.
   Sheet 28 sengaja tidak dibaca atau dipakai. */
(function(){
  'use strict';
  const SOURCE='worksheet september benar(7).xlsx • closing 27 September 2026';
  const TARGET='2026-09-28';
  const pkg=[[7100,8000,47],[10150,10000,0],[13900,15000,23],[11950,13000,57],[14550,16000,22],[13500,15000,2],[22850,24000,13],[15900,17000,14],[24000,25000,4],[26000,29000,6],[23200,25000,2],[31800,33000,0],[44000,48000,4],[6800,7000,10],[8900,10000,0],[13750,15000,32],[16000,17000,9],[19500,21000,3],[9750,11000,10],[16700,19000,0],[22300,25000,12],[30000,32000,0],[64500,76000,3],[86750,95000,1],[8400,10000,0],[10275,12000,0],[9900,12000,0],[11850,13000,4],[12700,16000,0],[14675,16000,0],[22200,24000,0],[27200,29000,0],[13500,14000,0],[7800,8000,19],[9150,11000,3],[13250,15000,2],[15150,17000,4],[17100,18000,23],[23100,25000,15],[20100,22000,0],[34750,34000,2],[9600,11000,0],[7750,8000,10],[12500,13000,4],[22850,24000,39],[22500,25000,0],[12100,13000,3],[16500,18000,3],[15750,22000,1],[26800,28000,10],[19500,25000,3],[28500,36000,4],[8750,17000,0],[15000,27000,0],[16000,38000,2],[15000,42000,1],[11000,25000,0],[18500,32000,2]];
  const cig=[[14800,16000,9,80],[35100,37000,6,10],[16600,20000,5,80],[7900,9000,3,10],[25900,27000,7,0],[15200,17000,0,10],[7200,8000,2,10],[16000,18000,3,0],[21300,23000,4,0],[34900,36000,7,0],[22400,24000,9,0],[15500,18000,5,6],[16000,17000,0,10],[25600,27000,6,10],[13200,15000,9,0],[14000,15000,1,0],[15700,18000,8,10],[14700,16000,0,0],[15400,17000,9,10],[15400,20000,0,0],[12900,15000,8,10],[21350,23000,0,0],[25100,26000,2,10],[11600,14000,4,10],[29500,30000,6,0],[15300,16000,8,0],[15350,16000,0,0],[24000,25000,0,0],[16500,18000,0,10],[19500,21000,1,0],[24000,25000,7,10],[42388.88888888889,45000,2,0],[15000,17000,0,0],[34000,35000,0,0],[38950,40000,9,10],[16300,18000,5,0],[37100,40000,0,0],[39400,42000,0,0],[18000,19000,0,0],[23000,24000,0,0],[23500,25000,0,0],[17500,19000,0,0],[16700,18000,7,10],[32000,33000,0,0],[17900,20000,2,20],[15200,17000,0,10],[16800,18000,1,0],[26500,28000,0,0],[32600,34000,1,0],[34000,36000,0,0],[31000,32000,1,0],[13450,15000,0,0],[33000,35000,0,0],[41900,44000,0,0],[13700,15000,3,10],[10500,15000,0,60],[30000,35000,0,0],[30000,35000,0,0],[17900,20000,3,10],[17000,20000,0,0]];
  const modal=[24290932,104271,1882000,36671500,0,13845,0,0,0,689247,1819000,274000,801869,0,1623102,0,0,0,4781468,6795700,2184148,13037400,4638568,10284327.777777778,10387640];

  function jakartaDate(){
    try{
      const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const x=Object.fromEntries(p.filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));
      return x.year+'-'+x.month+'-'+x.day;
    }catch(_){ return ''; }
  }
  function activeDate(){
    try{
      const q=new URLSearchParams(location.search);
      return String(q.get('sim_date')||window.KARegulationsV29?.activeShift?.date||jakartaDate()||'').trim();
    }catch(_){ return jakartaDate(); }
  }
  if(activeDate()!==TARGET) return;
  if(typeof pkgCatalog==='undefined'||typeof cigCatalog==='undefined'||typeof openingPrevModal==='undefined') return;
  if(pkgCatalog.length!==pkg.length||cigCatalog.length!==cig.length||openingPrevModal.length!==modal.length){
    console.error('Baseline 27→28 dibatalkan: struktur katalog tidak sesuai.',{pkg:pkgCatalog.length,cig:cigCatalog.length,modal:openingPrevModal.length});
    return;
  }

  pkgCatalog.forEach((p,i)=>{
    const [base,sell,stock]=pkg[i];
    p.stock=stock;p.base=base;p.sell=sell;
    p._openingBase=base;p.purchaseBase=base;p.activeBase=base;p.activeSell=sell;p.purchaseQty=0;
    if(typeof openingPkg!=='undefined'&&Array.isArray(openingPkg)&&openingPkg[i]) Object.assign(openingPkg[i],{stock,base,sell});
  });
  cigCatalog.forEach((c,i)=>{
    const [base,sell,display,warehouse]=cig[i];
    c.display=display;c.warehouse=warehouse;c.base=base;c.sell=sell;
    c._openingBase=base;c.activeBase=base;c.purchaseQty=0;c.purchaseCost=0;
    if(typeof openingCig!=='undefined'&&Array.isArray(openingCig)&&openingCig[i]) Object.assign(openingCig[i],{display,warehouse,base,sell});
  });
  openingPrevModal.forEach((x,i)=>{x.value=modal[i];});

  window.KAExcelBaselineV1={
    version:'27-to-28-v1',targetDate:TARGET,source:SOURCE,
    packageUnits:pkg.reduce((n,x)=>n+x[2],0),
    cigaretteDisplay:cig.reduce((n,x)=>n+x[2],0),
    cigaretteWarehouse:cig.reduce((n,x)=>n+x[3],0),
    modalTotal:modal.reduce((n,x)=>n+x,0)
  };

  const refresh=()=>{
    try{window.refreshPkgNameViews?.()}catch(_){}
    try{window.KAStockV50?.refreshOpeningSystem?.()}catch(_){}
    try{window.KABalanceV44?.renderBalance?.()}catch(_){}
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
})();
