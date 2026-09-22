/* Konter Anisa V50 — single source of truth stok: akhir 17 -> opening 18 -> belanja -> display -> closing */
(function(){
  'use strict';

  const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  const source17=[
    {name:'HASTA',base:14700,sell:16000,display:8,warehouse:80},
    {name:'Sempurna B',base:35100,sell:37000,display:0,warehouse:20},
    {name:'Slava',base:16500,sell:20000,display:3,warehouse:70},
    {name:'LM',base:7900,sell:9000,display:1,warehouse:20},
    {name:'Surya Kecil',base:25900,sell:27000,display:2,warehouse:10},
    {name:'Rasta bluberi',base:15200,sell:17000,display:0,warehouse:10},
    {name:'Harum Manis',base:7200,sell:8000,display:0,warehouse:10},
    {name:'Novem',base:16000,sell:18000,display:6,warehouse:10},
    {name:'Dji Samso hitam',base:21300,sell:23000,display:6,warehouse:0},
    {name:'Surya Besar',base:34900,sell:36000,display:5,warehouse:10},
    {name:'Aspro',base:22400,sell:24000,display:9,warehouse:0},
    {name:'A.O',base:15500,sell:18000,display:5,warehouse:6},
    {name:'Savero',base:16000,sell:17000,display:3,warehouse:10},
    {name:'Sempurna K',base:25600,sell:27000,display:6,warehouse:10},
    {name:'rasta',base:13200,sell:15000,display:1,warehouse:10},
    {name:'Tunggal',base:14000,sell:15000,display:1,warehouse:0},
    {name:'Titan',base:15700,sell:18000,display:7,warehouse:10},
    {name:'Konser',base:14700,sell:16000,display:0,warehouse:0},
    {name:'sempurna A kretek',base:15400,sell:17000,display:1,warehouse:20},
    {name:'Sempurna A 2 +',base:15400,sell:20000,display:0,warehouse:0},
    {name:'Wezz',base:12900,sell:15000,display:8,warehouse:10},
    {name:'Twizz',base:21350,sell:23000,display:0,warehouse:0},
    {name:'EVO',base:25100,sell:26000,display:7,warehouse:10},
    {name:'Luffman',base:11600,sell:14000,display:9,warehouse:10},
    {name:'Clasmid',base:29500,sell:30000,display:3,warehouse:10},
    {name:'sempurna prima',base:15300,sell:16000,display:9,warehouse:0},
    {name:'Sempurna hijau',base:15350,sell:16000,display:0,warehouse:0},
    {name:'duff',base:24000,sell:25000,display:0,warehouse:0},
    {name:'abs',base:16500,sell:18000,display:6,warehouse:10},
    {name:'di jam su kretek 234',base:19500,sell:21000,display:1,warehouse:0},
    {name:'Malboro KECIL',base:24000,sell:25000,display:9,warehouse:10},
    {name:'Esse Double Change',base:42388.88888888889,sell:45000,display:2,warehouse:9},
    {name:'Chiff',base:15000,sell:17000,display:0,warehouse:0},
    {name:'L.A ice',base:34000,sell:35000,display:0,warehouse:0},
    {name:'malboro besar',base:38950,sell:40000,display:9,warehouse:10},
    {name:'Novem Manggo',base:16300,sell:18000,display:0,warehouse:10},
    {name:'la bold hitam',base:37100,sell:40000,display:0,warehouse:0},
    {name:'esse merah',base:39400,sell:42000,display:0,warehouse:0},
    {name:'gudang garam merah',base:18000,sell:19000,display:0,warehouse:0},
    {name:'Sempurna zetta',base:23000,sell:24000,display:0,warehouse:0},
    {name:'twizz biru',base:23500,sell:25000,display:0,warehouse:0},
    {name:'king garet',base:17500,sell:19000,display:0,warehouse:0},
    {name:'titan biru',base:16700,sell:18000,display:8,warehouse:10},
    {name:'honey pop',base:32000,sell:33000,display:0,warehouse:0},
    {name:'slava klik',base:17900,sell:20000,display:2,warehouse:20},
    {name:'rasta mangga',base:15200,sell:17000,display:0,warehouse:10},
    {name:'aspro 12',base:16800,sell:18000,display:1,warehouse:0},
    {name:'aspro bold',base:26500,sell:28000,display:0,warehouse:0},
    {name:'sempurna 89 edition',base:32600,sell:34000,display:1,warehouse:0},
    {name:'sempurna min',base:34000,sell:36000,display:0,warehouse:0},
    {name:'malboro 16',base:31000,sell:32000,display:4,warehouse:0},
    {name:'sempurna prima kertas',base:13450,sell:15000,display:0,warehouse:0},
    {name:'malboro vista',base:33000,sell:35000,display:0,warehouse:0},
    {name:'sempurna evolution',base:41900,sell:44000,display:0,warehouse:0},
    {name:'oris',base:13700,sell:15000,display:5,warehouse:10},
    {name:'marlong',base:10700,sell:15000,display:1,warehouse:50},
    {name:'esse gicar purple',base:0,sell:0,display:0,warehouse:0},
    {name:'sempurna tropizal',base:30000,sell:35000,display:0,warehouse:0},
    {name:'sempurna royal',base:30000,sell:35000,display:0,warehouse:0},
    {name:'slava semangka',base:17900,sell:20000,display:6,warehouse:10},
    {name:'slava ice blast',base:17000,sell:20000,display:0,warehouse:0}
  ];
  const sourceMap=new Map(source17.map(x=>[norm(x.name),x]));

  const byId=id=>document.getElementById(id);
  const num=v=>Math.max(0,Number(v)||0);
  const money=n=>typeof fmt==='function'?fmt(Number(n)||0):'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');

  function recalcCigActiveBase(c){
    if(!c) return 0;
    const openingBase=Number(c._openingBase ?? c.base ?? 0);
    if(c._openingBase==null) c._openingBase=openingBase;
    const openingUnits=num(c.display)+num(c.warehouse);
    const q=num(c.purchaseQty),cost=num(c.purchaseCost);
    const totalUnits=openingUnits+q;
    const weighted=totalUnits>0?((openingUnits*openingBase)+cost)/totalUnits:openingBase;
    c.activeBase=Number.isFinite(weighted)?weighted:openingBase;
    return c.activeBase;
  }

  function canonicalFor(c){
    return sourceMap.get(norm(c?.name)) || null;
  }

  function syncCanonicalCatalogs(){
    if(typeof pkgCatalog!=='undefined' && typeof openingPkg!=='undefined'){
      pkgCatalog.forEach((p,i)=>{
        if(openingPkg[i]){
          openingPkg[i].stock=num(p.stock);
          openingPkg[i].base=Number(p.base||0);
          openingPkg[i].sell=Number(p.sell||0);
        }
      });
    }

    if(typeof cigCatalog!=='undefined'){
      cigCatalog.forEach(c=>{
        const s=canonicalFor(c);
        if(!s) return;
        c.base=s.base;
        c._openingBase=s.base;
        c.activeBase=s.base;
        c.sell=s.sell;
        c.display=s.display;
        c.warehouse=s.warehouse;
        c.purchaseQty=0;
        c.purchaseCost=0;
      });
    }

    if(typeof openingCig!=='undefined'){
      openingCig.forEach(c=>{
        const s=canonicalFor(c);
        if(!s) return;
        c.base=s.base;
        c.sell=s.sell;
        c.display=s.display;
        c.warehouse=s.warehouse;
      });
    }
  }

  function hydratePackageOpeningUI(resetInputs){
    if(typeof pkgCatalog==='undefined') return;
    pkgCatalog.forEach((p,ix)=>{
      const i=ix+1, input=byId('pkgCheck'+i);
      if(!input) return;
      const row=input.closest('tr');
      if(row?.cells?.[3]) row.cells[3].innerHTML='<b>'+num(p.stock)+'</b>';
      if(resetInputs) input.value=String(num(p.stock));
    });
  }

  function hydrateCigOpeningUI(resetInputs){
    if(typeof cigCatalog==='undefined') return;
    cigCatalog.forEach((c,ix)=>{
      const i=ix+1, di=byId('cigDispCheck'+i), wi=byId('cigWhCheck'+i);
      if(!di||!wi) return;
      const row=di.closest('tr');
      const activeBase=recalcCigActiveBase(c);
      if(row?.cells?.[1]) row.cells[1].textContent=money(activeBase);
      if(row?.cells?.[2]) row.cells[2].innerHTML='<b>'+num(c.display)+'</b>';
      if(row?.cells?.[4]) row.cells[4].innerHTML='<b>'+num(c.warehouse)+'</b>';
      if(resetInputs){ di.value=String(num(c.display)); wi.value=String(num(c.warehouse)); }
    });
  }

  function openingSnapshot(ix){
    const i=ix+1,c=cigCatalog[ix];
    const d=byId('cigDispCheck'+i),w=byId('cigWhCheck'+i);
    return {
      display:d?num(d.value):num(c.display),
      warehouse:w?num(w.value):num(c.warehouse)
    };
  }

  function commitOpeningToCatalog(){
    if(typeof pkgCatalog!=='undefined'){
      pkgCatalog.forEach((p,ix)=>{
        const input=byId('pkgCheck'+(ix+1));
        if(input) p.stock=num(input.value);
        if(typeof openingPkg!=='undefined' && openingPkg[ix]) openingPkg[ix].stock=num(p.stock);
      });
    }
    if(typeof cigCatalog!=='undefined'){
      cigCatalog.forEach((c,ix)=>{
        const s=openingSnapshot(ix);
        c.display=s.display;
        c.warehouse=s.warehouse;
        recalcCigActiveBase(c);
        if(typeof openingCig!=='undefined' && openingCig[ix]){
          openingCig[ix].display=s.display;
          openingCig[ix].warehouse=s.warehouse;
        }
      });
    }
  }

  function refreshDisplayRow(i,{resetMove=false}={}){
    const c=cigCatalog[i-1], move=byId('move'+i);
    if(!c||!move) return;
    const activeBase=recalcCigActiveBase(c);
    const purchase=num(c.purchaseQty), whBefore=num(c.warehouse)+purchase;
    if(resetMove) move.value='0';
    let mv=num(move.value);
    if(mv>whBefore){mv=whBefore;move.value=String(mv);}
    move.max=String(whBefore);

    const row=move.closest('tr');
    if(row?.cells?.[1]) row.cells[1].textContent=money(activeBase);
    if(row?.cells?.[2]) row.cells[2].textContent=String(whBefore);
    if(row?.cells?.[3]) row.cells[3].textContent=String(num(c.display));

    const run=num(c.display)+mv, rem=whBefore-mv;
    const wh=byId('wh'+i),disp=byId('disp'+i),remEl=byId('rem'+i),st=byId('moveStatus'+i);
    if(wh) wh.textContent=String(whBefore);
    if(disp) disp.textContent=String(run);
    if(remEl) remEl.textContent=String(rem);
    if(st) st.innerHTML='<span class="status ok">Valid</span>';

    const moveOut=byId('cigMove'+i), avail=byId('cigAvail'+i), end=byId('cigEnd'+i), cigWh=byId('cigWh'+i);
    if(moveOut) moveOut.textContent=String(mv);
    if(avail) avail.textContent=String(run);
    if(end) end.max=String(run);
    if(cigWh) cigWh.textContent=String(rem);
    refreshWarehouseAuditRow(i);

    if(end){
      const endRow=end.closest('tr');
      if(endRow?.cells?.[1]) endRow.cells[1].textContent=money(activeBase);
      if(endRow?.cells?.[2]) endRow.cells[2].textContent=money(c.sell);
      if(endRow?.cells?.[3]) endRow.cells[3].textContent=String(num(c.display));
    }
    const whModal=byId('cigWhModal'+i);
    if(whModal) whModal.textContent=money(rem*activeBase);
  }

  function installWarehouseAuditColumns(){
    const end=byId('cigEnd1');
    const table=end?.closest('table');
    if(!table || table.dataset.kaWarehouseAudit==='1') return;
    const head=table.tHead?.rows?.[0];
    if(!head) return;

    const addHead=(index,label)=>{
      const th=document.createElement('th');
      th.textContent=label;
      th.className='ka-wh-audit-head';
      head.insertBefore(th,head.cells[index]||null);
    };
    // Setelah Display Sebelumnya: Gudang Awal + Belanja + Gudang Tersedia.
    addHead(4,'Gudang Awal');
    addHead(5,'Belanja Masuk');
    addHead(6,'Gudang Tersedia');

    // Rename "Sisa Gudang" menjadi istilah yang lebih jelas.
    [...head.cells].forEach(th=>{
      if(String(th.textContent||'').trim().toLowerCase()==='sisa gudang') th.textContent='Gudang Akhir';
    });

    cigCatalog.forEach((_,ix)=>{
      const i=ix+1,row=byId('cigEnd'+i)?.closest('tr');
      if(!row) return;
      const make=(id,cls='')=>{
        const td=document.createElement('td');
        td.id=id;
        if(cls) td.className=cls;
        return td;
      };
      const before=row.cells[4]||null;
      row.insertBefore(make('cigWhOpen'+i),before);
      row.insertBefore(make('cigBuyIn'+i,'ka-wh-incoming'),row.cells[5]||null);
      row.insertBefore(make('cigWhAvailable'+i),row.cells[6]||null);
    });
    table.dataset.kaWarehouseAudit='1';
  }

  function refreshWarehouseAuditRow(i){
    const c=cigCatalog[i-1];
    if(!c) return;
    const opening=num(c.warehouse),incoming=num(c.purchaseQty),available=opening+incoming;
    const a=byId('cigWhOpen'+i),b=byId('cigBuyIn'+i),d=byId('cigWhAvailable'+i);
    if(a) a.textContent=String(opening);
    if(b){
      b.textContent=incoming?('+'+incoming):'0';
      b.style.fontWeight=incoming?'800':'';
      b.style.color=incoming?'var(--green)':'';
    }
    if(d) d.textContent=String(available);
  }

  function refreshAllDisplay({resetMoves=false}={}){
    if(typeof cigCatalog==='undefined') return;
    installWarehouseAuditColumns();
    cigCatalog.forEach((_,ix)=>refreshDisplayRow(ix+1,{resetMove:resetMoves}));
    calcDisplayTotalV50();
    try{ if(typeof calcCigTotals==='function') calcCigTotals(); }catch(_){}
  }

  function calcDisplayTotalV50(){
    let moved=0,displayRun=0,warehouseRun=0;
    if(typeof cigCatalog==='undefined') return;
    cigCatalog.forEach((c,ix)=>{
      const mv=num(byId('move'+(ix+1))?.value);
      const wh=num(c.warehouse)+num(c.purchaseQty);
      moved+=mv;
      displayRun+=num(c.display)+mv;
      warehouseRun+=Math.max(0,wh-mv);
    });
    if(byId('displayTotal')) byId('displayTotal').textContent=moved+' unit';
    if(byId('displayRunningTotal')) byId('displayRunningTotal').textContent=displayRun+' unit';
    if(byId('warehouseTotal')) byId('warehouseTotal').textContent=warehouseRun+' unit';
  }

  window.calcDisplayTotal=calcDisplayTotalV50;
  window.calcMove=function(i){
    refreshDisplayRow(Number(i)||0);
    calcDisplayTotalV50();
    try{ if(typeof calcCigEnd==='function') calcCigEnd(Number(i)||0); }catch(_){}
  };

  window.syncCigBuy=function(){
    const sel=byId('cigType');
    if(!sel||typeof cigCatalog==='undefined') return;
    const i=Number(sel.value||0),c=cigCatalog[i];
    if(!c) return;
    const qty=byId('cigQty'),total=byId('cigTotal'),unit=byId('cigUnit'),sell=byId('cigSell'),margin=byId('cigMarginUnit');
    if(qty) qty.value=String(num(c.purchaseQty));
    if(total){
      if(typeof setMoneyInput==='function') setMoneyInput(total,num(c.purchaseCost));
      else total.value=num(c.purchaseCost)?Math.round(num(c.purchaseCost)).toLocaleString('id-ID'):'';
    }
    const purchaseUnit=num(c.purchaseQty)?num(c.purchaseCost)/num(c.purchaseQty):num(c.base);
    const activeBase=recalcCigActiveBase(c);
    if(unit) unit.value=num(c.purchaseQty)?Math.round(activeBase).toLocaleString('id-ID'):'0';
    if(sell){
      if(typeof setMoneyInput==='function') setMoneyInput(sell,num(c.sell));
      else sell.value=Math.round(num(c.sell)).toLocaleString('id-ID');
    }
    const unitMargin=num(c.sell)-activeBase;
    if(margin) margin.value=Math.round(unitMargin).toLocaleString('id-ID');
    const notice=byId('cigMarginNotice');
    if(notice){
      const bad=num(c.purchaseQty)>0 && unitMargin<1000;
      notice.className='notice '+(bad?'red':'blue');
      notice.innerHTML=bad
        ? '<b>Margin rata-rata kurang dari Rp1.000.</b> Harga beli nota '+money(purchaseUnit)+' • modal aktif '+money(activeBase)+'.'
        : '<b>Weighted average aktif.</b> Harga beli nota '+money(purchaseUnit)+' • modal aktif rata-rata '+money(activeBase)+'.';
    }
    if(byId('cigWarehouseBeforeCard')) byId('cigWarehouseBeforeCard').textContent=String(num(c.warehouse));
    if(byId('cigQtyOut')) byId('cigQtyOut').textContent='+'+num(c.purchaseQty);
    if(byId('cigWarehouseAfter')) byId('cigWarehouseAfter').textContent=String(num(c.warehouse)+num(c.purchaseQty));
    refreshDisplayRow(i+1);
    calcDisplayTotalV50();
  };

  window.calcCigBuy=function(){
    const sel=byId('cigType');
    if(!sel||typeof cigCatalog==='undefined') return;
    const i=Number(sel.value||0),c=cigCatalog[i];
    if(!c) return;
    const q=num(byId('cigQty')?.value);
    const total=typeof moneyValue==='function'?num(moneyValue(byId('cigTotal'))):num(String(byId('cigTotal')?.value||'').replace(/[^\d.-]/g,''));
    const sellEl=byId('cigSell');
    const newSell=sellEl
      ? (typeof moneyValue==='function'?num(moneyValue(sellEl)):num(String(sellEl.value||'').replace(/[^\d.-]/g,'')))
      : num(c.sell);
    if(c._v29OriginalSell==null) c._v29OriginalSell=num(c.sell);
    c.purchaseQty=q;
    c.purchaseCost=total;
    if(newSell>0) c.sell=newSell;
    const activeBase=recalcCigActiveBase(c);
    const purchaseUnit=q>0?total/q:0;
    const unitMargin=q>0?num(c.sell)-activeBase:0;
    if(byId('cigUnit')) byId('cigUnit').value=q?Math.round(activeBase).toLocaleString('id-ID'):'0';
    if(byId('cigMarginUnit')) byId('cigMarginUnit').value=q?Math.round(unitMargin).toLocaleString('id-ID'):'0';
    const notice=byId('cigMarginNotice');
    if(notice){
      const bad=q>0 && unitMargin<1000;
      notice.className='notice '+(bad?'red':'blue');
      notice.innerHTML=bad
        ? '<b>BLOKIR:</b> margin rata-rata '+money(unitMargin)+' masih di bawah minimum Rp1.000. Harga beli nota '+money(purchaseUnit)+'.'
        : '<b>AMAN — weighted average:</b> harga beli nota '+money(purchaseUnit)+' • modal aktif '+money(activeBase)+' • margin '+money(unitMargin)+'.';
    }
    if(byId('cigWarehouseBeforeCard')) byId('cigWarehouseBeforeCard').textContent=String(num(c.warehouse));
    if(byId('cigQtyOut')) byId('cigQtyOut').textContent='+'+q;
    if(byId('cigWarehouseAfter')) byId('cigWarehouseAfter').textContent=String(num(c.warehouse)+q);
    refreshDisplayRow(i+1);
    calcDisplayTotalV50();
    try{ if(typeof calcCigEnd==='function') calcCigEnd(i+1); }catch(_){}
    try{ if(typeof updateBuyNextState==='function') updateBuyNextState(); }catch(_){}
  };

  function resetDaySpecificDefaults(){
    if(typeof cigCatalog!=='undefined'){
      cigCatalog.forEach(c=>{c.purchaseQty=0;c.purchaseCost=0;c._openingBase=Number(c.base||0);c.activeBase=Number(c.base||0);});
    }
    document.querySelectorAll('input[id^="move"]').forEach(el=>{el.value='0';});
    const cq=byId('cigQty'),ct=byId('cigTotal');
    if(cq) cq.value='0';
    if(ct) ct.value='';
  }

  function syncBeforeOperationalStep(){
    commitOpeningToCatalog();
    refreshAllDisplay();
    try{ if(typeof syncCigBuy==='function') syncCigBuy(); }catch(_){}
  }

  function wrapNavigation(){
    if(typeof window.showStep==='function' && !window.showStep.__v50){
      const old=window.showStep;
      const wrapped=function(i){
        if(Number(i)>=1) syncBeforeOperationalStep();
        const result=old.apply(this,arguments);
        if(Number(i)===2) refreshAllDisplay();
        return result;
      };
      wrapped.__v50=true;
      window.showStep=wrapped;
    }
  }

  function updateLabels(){
    document.querySelectorAll('.crumb').forEach(el=>{
      el.childNodes.forEach(n=>{
        if(n.nodeType===Node.TEXT_NODE && /Perhitungan Harian\s*\/\s*13 September 2026/i.test(n.textContent||'')){
          n.textContent=(n.textContent||'').replace(/13 September 2026/i,'18 September 2026');
        }
      });
    });
    const foot=document.querySelector('.side-foot div:last-child');
    if(foot) foot.textContent='Opening dari stok akhir sheet 17 • input uji tanggal 18 • belum terhubung database';
    const tab=byId('stockTabCig');
    if(tab) tab.textContent='Rokok • 60 item aktif';
  }

  function selfTest(){
    const results=[];
    const ok=(name,cond)=>results.push([name,!!cond]);
    const matched=typeof cigCatalog!=='undefined'?cigCatalog.map(c=>canonicalFor(c)).filter(Boolean):[];
    ok('60 app cigarette items mapped by name',matched.length===60);
    ok('Sheet17 opening totals display=155',matched.reduce((s,x)=>s+num(x.display),0)===155);
    ok('Sheet17 opening totals warehouse=505',matched.reduce((s,x)=>s+num(x.warehouse),0)===505);
    const simMoves=new Map([['sempurna b',10],['slava',10],['novem manggo',10],['marlong',10]]);
    let d=0,w=0,m=0;
    matched.forEach(x=>{const mv=simMoves.get(norm(x.name))||0;d+=x.display+mv;w+=x.warehouse-mv;m+=mv;});
    ok('Sheet18 transfer simulation total move=40',m===40);
    ok('Sheet18 after transfer display=195',d===195);
    ok('Sheet18 after transfer warehouse=465',w===465);
    ok('Sempurna Prima base corrected to 15300',Number(canonicalFor({name:'sempurna prima'}).base)===15300);
    const testCig={base:16500,display:3,warehouse:70,purchaseQty:10,purchaseCost:200000};
    const testWeighted=((73*16500)+200000)/83;
    ok('Rokok weighted average preserves opening modal + purchase',Math.abs(recalcCigActiveBase(testCig)-testWeighted)<0.0001);
    ok('Rokok weighted modal identity',Math.abs((83*testCig.activeBase)-((73*16500)+200000))<0.001);
    installWarehouseAuditColumns();
    ok('Rokok warehouse audit columns installed',!!byId('cigWhOpen1')&&!!byId('cigBuyIn1')&&!!byId('cigWhAvailable1'));
    const pass=results.every(x=>x[1]);
    document.documentElement.dataset.v50Selftest=pass?'PASS':'FAIL';
    window.KAStockV50={source17,results,pass,sync:syncBeforeOperationalStep};
  }

  function init(){
    syncCanonicalCatalogs();
    resetDaySpecificDefaults();
    hydratePackageOpeningUI(true);
    hydrateCigOpeningUI(true);
    try{
      if(typeof openingPkgPreviewConfirmed!=='undefined') openingPkgPreviewConfirmed=false;
      if(typeof openingCigPreviewConfirmed!=='undefined') openingCigPreviewConfirmed=false;
      if(typeof openingPkgPreviewSignature!=='undefined') openingPkgPreviewSignature='';
      if(typeof openingCigPreviewSignature!=='undefined') openingCigPreviewSignature='';
      if(typeof openingApprovalState!=='undefined') openingApprovalState='none';
    }catch(_){}
    updateLabels();
    commitOpeningToCatalog();
    refreshAllDisplay({resetMoves:true});
    try{ if(typeof syncCigBuy==='function') syncCigBuy(); }catch(_){}
    try{ if(typeof updateOpeningCorrections==='function') updateOpeningCorrections(); }catch(_){}
    wrapNavigation();
    selfTest();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
