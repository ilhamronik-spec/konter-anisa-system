/* Konter Anisa V51 — clean step routing, search, display preview, stock UI sync */
(function(){
  'use strict';

  const byId=id=>document.getElementById(id);
  const num=v=>Math.max(0,Number(v)||0);
  const toast=(msg,type='info')=>typeof uiToast==='function'?uiToast(msg,type):void 0;

  const STEP_LABELS=[
    'Cek Awal','Belanja','Display Rokok','Operasional','Hutang/Piutang',
    'Transaksi','Aksesoris/Obat','Paket','Rokok','Modal Inputan','Balance'
  ];

  function heading(section){
    return String(section?.querySelector('.section-head h3')?.textContent||'').replace(/\s+/g,' ').trim();
  }
  function findSection(re){
    return [...document.querySelectorAll('section.section')].find(s=>re.test(heading(s)))||null;
  }
  function title(section,number,text){
    const h=section?.querySelector('.section-head h3');
    if(h) h.textContent=number+'. '+text;
  }

  function normalizeSteps(){
    const map=[
      {i:0,s:findSection(/Cek Data Awal/i),title:'Cek Data Awal'},
      {i:1,s:findSection(/^\s*\d*\.?\s*Belanja\b/i),title:'Belanja'},
      {i:2,s:findSection(/Pemasukan Display Rokok/i),title:'Pemasukan Display Rokok'},
      {i:3,s:findSection(/Operasional/i),title:'Operasional'},
      {i:4,s:findSection(/Hutang\s*(?:&|\/|dan)\s*Piutang/i),title:'Hutang & Piutang'},
      {i:5,s:findSection(/Input Transaksi|^\s*\d*\.?\s*Transaksi/i),title:'Input Transaksi'},
      {i:6,s:byId('v42-accobat-section')||findSection(/Aksesoris\s*(?:&|\/)\s*Obat/i),title:'Aksesoris & Obat'},
      {i:7,s:findSection(/Stok Akhir Paket/i),title:'Stok Akhir Paket'},
      {i:8,s:findSection(/Stok Akhir Rokok/i),title:'Stok Akhir Rokok'},
      {i:9,s:findSection(/Modal Inputan Shift Berjalan|Modal Inputan/i),title:'Modal Inputan Shift Berjalan'},
      {i:10,s:byId('v44-balance-section')||findSection(/Balance Akhir Shift/i),title:'Balance Akhir Shift'}
    ];
    map.forEach(x=>{
      if(!x.s) return;
      x.s.dataset.i=String(x.i);
      title(x.s,x.i+1,x.title);
    });

    try{
      if(typeof labels!=='undefined' && Array.isArray(labels)){
        labels.splice(0,labels.length,...STEP_LABELS);
      }
    }catch(_){}

    if(typeof renderSteps==='function') renderSteps();
    if(typeof refreshGlobalNextButton==='function') refreshGlobalNextButton();

    return map;
  }

  function addStyle(){
    if(byId('v51Style')) return;
    const s=document.createElement('style');
    s.id='v51Style';
    s.textContent=`
      .v51-search-wrap{margin:0 0 12px}
      .v51-search-wrap label{display:block;font-size:11px;font-weight:800;margin-bottom:6px;color:var(--muted)}
      .v51-search-meta{font-size:10px;color:var(--muted);margin-top:5px}
      .v51-display-preview{margin-top:14px}
      .v51-display-preview table{min-width:820px}
      .v51-confirmed{color:var(--green)!important}
    `;
    document.head.appendChild(s);
  }

  function installSelectSearch(selectId,searchId,label,placeholder,syncName){
    const select=byId(selectId);
    if(!select||byId(searchId)) return;
    const field=select.closest('.field');
    if(!field) return;
    const wrap=document.createElement('div');
    wrap.className='field v51-search-wrap';
    wrap.innerHTML='<label>'+label+'</label><input class="input" type="search" id="'+searchId+'" placeholder="'+placeholder+'" autocomplete="off"><div class="v51-search-meta" id="'+searchId+'Meta">Ketik nama untuk menyaring daftar.</div>';
    field.insertAdjacentElement('beforebegin',wrap);
    const input=byId(searchId),meta=byId(searchId+'Meta');
    const options=[...select.options];

    function apply(){
      const q=String(input.value||'').trim().toLowerCase();
      let visible=0,first=null;
      options.forEach(opt=>{
        const ok=!q||String(opt.textContent||'').toLowerCase().includes(q);
        opt.hidden=!ok;
        if(ok){visible++;if(!first)first=opt;}
      });
      meta.textContent=visible+' hasil';
      const selected=select.options[select.selectedIndex];
      if(first && (!selected || selected.hidden)){
        select.value=first.value;
        select.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    input.addEventListener('input',apply);
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        const first=options.find(o=>!o.hidden);
        if(first){
          select.value=first.value;
          select.dispatchEvent(new Event('change',{bubbles:true}));
          select.focus();
        }
      }
    });
    apply();
  }

  function installTableSearch(section,id,placeholder,rowText){
    if(!section||byId(id)) return;
    const table=section.querySelector('.card .table-wrap table');
    if(!table) return;
    const wrap=document.createElement('div');
    wrap.className='v51-search-wrap';
    wrap.innerHTML='<label>Cari Item</label><input class="input" type="search" id="'+id+'" placeholder="'+placeholder+'" autocomplete="off"><div class="v51-search-meta" id="'+id+'Meta"></div>';
    table.closest('.table-wrap').insertAdjacentElement('beforebegin',wrap);
    const input=byId(id),meta=byId(id+'Meta');
    const rows=[...table.tBodies[0]?.rows||[]];
    function apply(){
      const q=String(input.value||'').trim().toLowerCase();
      let shown=0;
      rows.forEach((r,ix)=>{
        const hay=(rowText?rowText(r,ix):r.textContent).toLowerCase();
        const ok=!q||hay.includes(q);
        r.style.display=ok?'':'none';
        if(ok)shown++;
      });
      meta.textContent=shown+' item tampil';
    }
    input.addEventListener('input',apply);
    apply();
  }

  function syncPackageClosingUI(){
    if(typeof pkgCatalog==='undefined') return;
    pkgCatalog.forEach((p,ix)=>{
      const i=ix+1,end=byId('pkgEnd'+i);
      if(!end) return;
      const row=end.closest('tr'),buy=num(p.purchaseQty),avail=num(p.stock)+buy;
      if(row?.cells?.[4]) row.cells[4].textContent=String(num(p.stock));
      const buyCell=byId('pkgBuyQty'+i),availCell=byId('pkgAvail'+i);
      if(buyCell) buyCell.textContent=buy?('+'+buy):'0';
      if(availCell) availCell.textContent=String(avail);
      end.max=String(avail);
    });

    const section=findSection(/Stok Akhir Paket/i);
    const ths=section?.querySelectorAll('thead th');
    if(ths?.[4]) ths[4].textContent='Stok Awal';
    if(ths?.[6]) ths[6].textContent='Stok Tersedia';
    const notice=section?.querySelector('.notice.blue');
    if(notice) notice.innerHTML='<b>Alur stok:</b> Stok Awal = stok akhir tanggal 17 • Belanja = pembelian tanggal 18 • Stok Tersedia = Stok Awal + Belanja • Terjual = Stok Tersedia − Stok Akhir.';
    try{ if(typeof calcPkgTotals==='function') calcPkgTotals(); }catch(_){}
  }

  function syncCigaretteClosingUI(){
    if(typeof cigCatalog==='undefined') return;
    cigCatalog.forEach((c,ix)=>{
      const i=ix+1,move=num(byId('move'+i)?.value),purchase=num(c.purchaseQty);
      const avail=num(c.display)+move,wh=Math.max(0,num(c.warehouse)+purchase-move);
      const moveOut=byId('cigMove'+i),availOut=byId('cigAvail'+i),whOut=byId('cigWh'+i),end=byId('cigEnd'+i);
      if(moveOut) moveOut.textContent=String(move);
      if(availOut) availOut.textContent=String(avail);
      if(whOut) whOut.textContent=String(wh);
      if(end){
        end.max=String(avail);
        const row=end.closest('tr');
        if(row?.cells?.[3]) row.cells[3].textContent=String(num(c.display));
      }
    });
    try{ if(typeof calcCigTotals==='function') calcCigTotals(); }catch(_){}
  }

  let displayPreviewConfirmed=false;
  let displayPreviewSignature='';

  function displaySignature(){
    if(typeof cigCatalog==='undefined') return '';
    return cigCatalog.map((_,ix)=>String(num(byId('move'+(ix+1))?.value))).join('|');
  }
  function invalidateDisplayPreview(){
    if(displayPreviewConfirmed && displaySignature()!==displayPreviewSignature){
      displayPreviewConfirmed=false;
      displayPreviewSignature='';
      const badge=byId('v51DisplayPreviewBadge');
      if(badge){badge.textContent='Belum Dikonfirmasi';badge.className='status warn';}
    }
  }

  function ensureDisplayPreview(){
    const section=findSection(/Pemasukan Display Rokok/i);
    if(!section||byId('v51DisplayPreview')) return;
    const box=document.createElement('div');
    box.id='v51DisplayPreview';
    box.className='preview-check-card preview-modal v51-display-preview';
    box.style.display='none';
    box.innerHTML=`
      <div class="section-head" style="margin-bottom:10px">
        <div><h4 style="margin:0">Preview Pemasukan Display Rokok</h4>
        <p style="margin:4px 0 0;color:var(--muted)">Periksa perpindahan Gudang → Display sebelum melanjutkan.</p></div>
        <span class="status warn" id="v51DisplayPreviewBadge">Belum Dikonfirmasi</span>
      </div>
      <div class="notice blue" id="v51DisplayPreviewMessage">Belum ada preview.</div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Rokok</th><th>Display Awal</th><th>Gudang Sebelum</th><th>Masuk Display</th><th>Display Setelah</th><th>Sisa Gudang</th></tr></thead>
        <tbody id="v51DisplayPreviewBody"></tbody>
      </table></div>
      <div class="actions" style="margin-top:12px">
        <button class="btn primary" type="button" id="v51ConfirmDisplay">Konfirmasi Display Benar</button>
        <button class="btn" type="button" id="v51EditDisplay">Kembali Edit</button>
      </div>`;
    const card=section.querySelector('.card');
    if(card) card.insertAdjacentElement('afterend',box);
    else section.appendChild(box);

    byId('v51ConfirmDisplay')?.addEventListener('click',()=>{
      displayPreviewSignature=displaySignature();
      displayPreviewConfirmed=true;
      const badge=byId('v51DisplayPreviewBadge');
      if(badge){badge.textContent='Sudah Dikonfirmasi';badge.className='status ok';}
      box.style.display='none';
      toast('Display Rokok sudah dikonfirmasi','ok');
      if(typeof refreshGlobalNextButton==='function') refreshGlobalNextButton();
    });
    byId('v51EditDisplay')?.addEventListener('click',()=>{box.style.display='none';});
  }

  function previewDisplay(){
    ensureDisplayPreview();
    const body=byId('v51DisplayPreviewBody'),box=byId('v51DisplayPreview'),msg=byId('v51DisplayPreviewMessage');
    if(!body||!box||typeof cigCatalog==='undefined') return false;
    let rows='',movedTotal=0,invalid=0;
    cigCatalog.forEach((c,ix)=>{
      const i=ix+1,mv=num(byId('move'+i)?.value),whBefore=num(c.warehouse)+num(c.purchaseQty);
      if(mv>whBefore) invalid++;
      if(mv<=0) return;
      movedTotal+=mv;
      rows+=`<tr>
        <td><b>${String(c.name||'')}</b></td>
        <td>${num(c.display)}</td>
        <td>${whBefore}</td>
        <td><b>+${mv}</b></td>
        <td><b>${num(c.display)+mv}</b></td>
        <td><b>${Math.max(0,whBefore-mv)}</b></td>
      </tr>`;
    });
    if(!rows) rows='<tr><td colspan="6"><div class="notice blue" style="margin:0">Tidak ada perpindahan stok ke Display pada shift ini.</div></td></tr>';
    body.innerHTML=rows;
    msg.className='notice '+(invalid?'red':'blue');
    msg.innerHTML=invalid
      ? '<b>TIDAK VALID:</b> ada perpindahan melebihi stok Gudang.'
      : '<b>Preview:</b> total '+movedTotal+' unit dipindahkan dari Gudang ke Display.';
    byId('v51ConfirmDisplay').disabled=invalid>0;
    const badge=byId('v51DisplayPreviewBadge');
    if(badge){
      badge.textContent=displayPreviewConfirmed&&displaySignature()===displayPreviewSignature?'Sudah Dikonfirmasi':'Belum Dikonfirmasi';
      badge.className='status '+(displayPreviewConfirmed&&displaySignature()===displayPreviewSignature?'ok':'warn');
    }
    box.style.display='block';
    box.classList.add('open');
    box.scrollIntoView({behavior:'smooth',block:'center'});
    return invalid===0;
  }
  window.previewDisplayV51=previewDisplay;

  function wireDisplayButtons(){
    const section=findSection(/Pemasukan Display Rokok/i);
    if(!section) return;
    ensureDisplayPreview();
    const old=section.querySelector('.section-head > button.btn.primary');
    if(old && old.id!=='v51DisplayPreviewBtn'){
      const btn=old.cloneNode(true);
      btn.id='v51DisplayPreviewBtn';
      btn.textContent='Simpan & Preview Display';
      btn.removeAttribute('data-ui-click');
      old.replaceWith(btn);
      btn.addEventListener('click',previewDisplay);
    }
    section.querySelectorAll('input[id^="move"]').forEach(el=>{
      if(el.dataset.v51DisplayBound==='1') return;
      el.dataset.v51DisplayBound='1';
      el.addEventListener('input',()=>{
        invalidateDisplayPreview();
        syncCigaretteClosingUI();
      });
    });
  }

  function installSearch(){
    installSelectSearch('pkgBuyType','v51PkgBuySearch','Cari Paket','Contoh: AXIS 1.5 GB','syncPkgBuy');
    installSelectSearch('cigType','v51CigBuySearch','Cari Rokok','Contoh: Slava','syncCigBuy');

    const display=findSection(/Pemasukan Display Rokok/i);
    const pkg=findSection(/Stok Akhir Paket/i);
    const cig=findSection(/Stok Akhir Rokok/i);
    installTableSearch(display,'v51DisplaySearch','Cari rokok di Display...');
    installTableSearch(pkg,'v51PkgEndSearch','Cari paket saat input stok akhir...');
    installTableSearch(cig,'v51CigEndSearch','Cari rokok saat input stok akhir...');
  }

  function directNext(){
    try{ if(typeof showStep==='function') showStep(Math.min(STEP_LABELS.length-1,Number(idx||0)+1)); }catch(_){}
  }

  function installNavigation(){
    const originalSmart=typeof smartNextStep==='function'?smartNextStep:null;
    const replacement=function(){
      const current=Number(typeof idx!=='undefined'?idx:0);
      if(current===2){
        invalidateDisplayPreview();
        if(!displayPreviewConfirmed || displaySignature()!==displayPreviewSignature){
          previewDisplay();
          toast('Periksa lalu konfirmasi Preview Display sebelum lanjut.','info');
          return;
        }
        directNext();
        return;
      }
      if(current===0 || current===1){
        if(originalSmart) return originalSmart();
      }
      directNext();
    };
    try{ smartNextStep=replacement; }catch(_){ window.smartNextStep=replacement; }

    // Tombol lanjut pada section 3-9 dibuat deterministik sesuai data-i.
    [...document.querySelectorAll('section.section')].forEach(section=>{
      const i=Number(section.dataset.i);
      if(!Number.isFinite(i)||i<3||i>9) return;
      const old=section.querySelector('.section-head > button.btn.primary');
      if(!old||old.id==='v44RefreshBalance') return;
      if(old.dataset.v51Wired==='1') return;
      const btn=old.cloneNode(true);
      btn.dataset.v51Wired='1';
      btn.removeAttribute('data-ui-click');
      old.replaceWith(btn);
      btn.addEventListener('click',()=>{ if(typeof showStep==='function') showStep(Math.min(10,i+1)); });
    });

    wireDisplayButtons();
  }

  function refreshEverything(){
    normalizeSteps();
    syncPackageClosingUI();
    syncCigaretteClosingUI();
    installSearch();
    wireDisplayButtons();
    if(typeof renderSteps==='function') renderSteps();
    if(typeof refreshGlobalNextButton==='function') refreshGlobalNextButton();
  }

  function selfTest(){
    const tests=[];
    const ok=(n,c)=>tests.push([n,!!c]);
    const sections=[...document.querySelectorAll('section.section')];
    const indices=sections.map(s=>Number(s.dataset.i)).filter(Number.isFinite).sort((a,b)=>a-b);
    ok('11 unique steps 0..10',indices.length===11 && new Set(indices).size===11 && indices.every((v,i)=>v===i));
    try{ ok('labels normalized',typeof labels!=='undefined' && labels.join('|')===STEP_LABELS.join('|')); }catch(_){ok('labels normalized',false);}
    ok('operasional step 4',Number(findSection(/Operasional/i)?.dataset.i)===3);
    ok('hutang piutang step 5',Number(findSection(/Hutang\s*(?:&|\/|dan)\s*Piutang/i)?.dataset.i)===4);
    ok('package search installed',!!byId('v51PkgBuySearch')&&!!byId('v51PkgEndSearch'));
    ok('cigarette search installed',!!byId('v51CigBuySearch')&&!!byId('v51CigEndSearch')&&!!byId('v51DisplaySearch'));
    ok('display preview installed',!!byId('v51DisplayPreview')&&!!byId('v51DisplayPreviewBtn'));
    if(typeof pkgCatalog!=='undefined' && pkgCatalog.length){
      const row=byId('pkgEnd1')?.closest('tr');
      ok('package row uses active opening stock',Number(row?.cells?.[4]?.textContent||-1)===num(pkgCatalog[0].stock));
      ok('package available uses opening+purchase',Number(byId('pkgAvail1')?.textContent||-1)===num(pkgCatalog[0].stock)+num(pkgCatalog[0].purchaseQty));
    }
    if(typeof cigCatalog!=='undefined' && cigCatalog.length>=3){
      ok('HASTA opening 8/80',num(cigCatalog[0].display)===8&&num(cigCatalog[0].warehouse)===80);
      ok('Sempurna B opening 0/20',num(cigCatalog[1].display)===0&&num(cigCatalog[1].warehouse)===20);
      ok('Slava opening 3/70',num(cigCatalog[2].display)===3&&num(cigCatalog[2].warehouse)===70);
    }
    const pass=tests.every(x=>x[1]);
    document.documentElement.dataset.v51Selftest=pass?'PASS':'FAIL';
    window.KAUIV51={pass,tests,refresh:refreshEverything,previewDisplay};
    if(!pass) console.error('V51 SELFTEST FAIL',tests);
    return {pass,tests};
  }

  function install(){
    addStyle();
    normalizeSteps();
    syncPackageClosingUI();
    syncCigaretteClosingUI();
    installSearch();
    ensureDisplayPreview();
    installNavigation();
    refreshEverything();

    document.querySelectorAll('.topbar .status.info').forEach(el=>{
      if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V51 — FLOW CLEAN + SEARCH + DISPLAY PREVIEW';
    });
    selfTest();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
