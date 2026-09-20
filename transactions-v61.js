/* Konter Anisa V62 — Admin layout fix + Rp5.000 Admin Keluar */
(function(){
'use strict';

const $=id=>document.getElementById(id);
const n=v=>Math.max(0,Number(v)||0);
const money=el=>{
  if(!el) return 0;
  try{ if(typeof moneyValue==='function') return Math.max(0,moneyValue(el)); }catch(_){}
  return Math.max(0,Number(String(el.value||'').replace(/[^0-9.-]/g,''))||0);
};
const fmt61=v=>{
  try{ if(typeof fmt==='function') return fmt(Number(v)||0); }catch(_){}
  return 'Rp'+Math.round(Number(v)||0).toLocaleString('id-ID');
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=(m,t='info')=>{try{if(typeof uiToast==='function')uiToast(m,t);}catch(_){}};

const STEP_LABELS=[
  'Cek Awal','Belanja','Display Rokok','Operasional','Hutang/Piutang','Transaksi',
  'Minyak','Admin','Aksesoris/Obat','Paket','Rokok','Modal Inputan','Balance'
];

function heading(s){return String(s?.querySelector('.section-head h3')?.textContent||'').replace(/\s+/g,' ').trim();}
function findSection(re){return [...document.querySelectorAll('section.section')].find(s=>re.test(heading(s)))||null;}
function setTitle(s,no,title){
  const h=s?.querySelector('.section-head h3');
  if(h)h.textContent=no+'. '+title;
}

/* ---------------- Bayaran Listrik ---------------- */
function listrikMargin(amount){
  const a=n(amount);
  if(a<=0)return 0;
  if(a<=500000)return 4500;
  try{if(typeof bankAdminDefault==='function')return n(bankAdminDefault(a));}catch(_){}
  if(a<3000000)return 5000;
  if(a<5000000)return 8000;
  if(a<10000000)return 10000;
  return 20000+Math.floor((a-10000000)/1000000)*1000;
}
function calcListrik(){
  const a=money($('electricityAmount')),m=listrikMargin(a),modal=Math.max(0,a-m);
  if($('electricityMargin'))$('electricityMargin').textContent=a?fmt61(m):'—';
  if($('electricityModal'))$('electricityModal').textContent=a?fmt61(modal):'—';
  if($('electricityRule'))$('electricityRule').textContent=a?(a>500000?'Tarif Tarik Tunai BCA':'Default Rp4.500'):'—';
  return {amount:a,margin:m,modal};
}
function renderListrik(){
  const arr=typeof txEntries!=='undefined'?(txEntries.electricity||[]):[];
  const body=$('txList_electricity'),count=$('txCount_electricity');
  if(!body||!count)return;
  if(!arr.length){
    body.innerHTML='<tr><td colspan="6" class="multi-empty">Belum ada transaksi Bayaran Listrik.</td></tr>';
    count.textContent='0 transaksi';return;
  }
  let mar=0;
  body.innerHTML=arr.map((x,i)=>{
    mar+=Number(x.margin||0);
    return '<tr><td>'+(i+1)+'</td><td class="money">'+fmt61(x.amount)+'</td><td class="money">'+fmt61(x.margin)+'</td><td class="money">'+fmt61(x.modal)+'</td><td>'+esc(x.rule||'')+'</td><td><button type="button" class="btn" data-v61-elec-remove="'+i+'">Hapus</button></td></tr>';
  }).join('');
  count.textContent=arr.length+' transaksi • Margin '+fmt61(mar);
  body.querySelectorAll('[data-v61-elec-remove]').forEach(b=>b.addEventListener('click',()=>{
    txEntries.electricity.splice(Number(b.dataset.v61ElecRemove),1);
    renderListrik();try{renderTxGlobalSummary();}catch(_){};try{window.KAAutosaveV53?.save?.();}catch(_){}
  }));
}
function addListrik(){
  const x=calcListrik();
  if(x.amount<=0){toast('Nominal Bayaran Listrik harus lebih dari Rp0.','warn');$('electricityAmount')?.focus();return;}
  txEntries.electricity.push({...x,rule:x.amount>500000?'Tarik BCA':'Rp4.500'});
  renderListrik();try{renderTxGlobalSummary();}catch(_){}
  if($('electricityAmount'))$('electricityAmount').value='';
  calcListrik();try{window.KAAutosaveV53?.save?.();}catch(_){}
  toast('Bayaran Listrik ditambahkan.','ok');
}
function installListrik(){
  if(typeof txEntries!=='undefined'&&!Array.isArray(txEntries.electricity))txEntries.electricity=[];
  if($('tx-electricity')){renderListrik();return;}

  const mitraTab=[...document.querySelectorAll('.tx-tab')].find(b=>String(b.textContent||'').trim()==='Mitra');
  const mitraPane=$('tx-mitra');
  if(!mitraTab||!mitraPane)return;

  const tab=document.createElement('button');
  tab.className='subtab tx-tab';tab.type='button';tab.textContent='Bayaran Listrik';
  tab.addEventListener('click',()=>{if(typeof showTxn==='function')showTxn('electricity',tab);});
  mitraTab.insertAdjacentElement('afterend',tab);

  const pane=document.createElement('div');
  pane.className='subpane tx-pane';pane.id='tx-electricity';
  pane.innerHTML=`
    <div class="v62-admin-top">
      <div class="card form focus-form-card">
        <h4 style="margin:0 0 14px">Bayaran Listrik</h4>
        <div class="notice blue">Karyawan hanya mengisi nominal transaksi. Margin otomatis <b>Rp4.500</b> sampai Rp500.000; di atas Rp500.000 mengikuti admin default Tarik Tunai BCA. Sisanya adalah modal.</div>
        <div class="form-grid">
          <div class="field"><label>Nominal Transaksi</label><input autocomplete="off" class="input money-entry" id="electricityAmount" inputmode="numeric" placeholder="Isi nominal Bayaran Listrik"></div>
        </div>
        <div class="calc-grid">
          <div class="calcbox good"><small>Margin / Admin</small><b id="electricityMargin">—</b></div>
          <div class="calcbox"><small>Modal</small><b id="electricityModal">—</b></div>
          <div class="calcbox"><small>Aturan</small><b id="electricityRule">—</b></div>
        </div>
        <div class="actions" style="margin-top:14px"><button class="btn primary" id="electricityAdd" type="button">+ Tambahkan ke Daftar</button><span class="v55-enter-hint">↵ Enter = Tambahkan ke Daftar</span></div>
      </div>
      <div class="card summary">
        <h4>Aturan Bayaran Listrik</h4>
        <div class="sumrow"><span>≤ Rp500.000</span><b>Margin Rp4.500</b></div>
        <div class="sumrow"><span>&gt; Rp500.000</span><b>Admin Tarik BCA</b></div>
        <div class="sumrow"><span>Modal</span><b>Nominal − Margin</b></div>
      </div>
    </div>
    <div class="card multi-list-card" style="margin-top:14px">
      <div class="section-head"><div><h4 style="margin:0">Daftar Bayaran Listrik</h4></div><span class="status info" id="txCount_electricity">0 transaksi</span></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Nominal</th><th>Margin</th><th>Modal</th><th>Aturan</th><th>Aksi</th></tr></thead><tbody id="txList_electricity"></tbody></table></div>
    </div>`;
  mitraPane.insertAdjacentElement('afterend',pane);
  $('electricityAmount')?.addEventListener('input',e=>{try{formatMoneyInput(e.target);}catch(_){}calcListrik();});
  $('electricityAmount')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();addListrik();}});
  $('electricityAdd')?.addEventListener('click',addListrik);
  renderListrik();
}

/* ---------------- Minyak menjadi main step ---------------- */
function installMinyakStep(){
  const pane=$('tx-minyak');
  if(!pane)return null;
  let section=$('v61-minyak-section');
  if(!section){
    const acc=$('v42-accobat-section')||findSection(/Aksesoris\s*(?:&|\/)\s*Obat/i);
    if(!acc)return null;
    section=document.createElement('section');
    section.className='section';section.id='v61-minyak-section';
    section.innerHTML='<div class="section-head"><div><h3>7. Minyak</h3><p>Perhitungan minyak menjadi menu utama dan tetap masuk ke rekonsiliasi Balance.</p></div><button class="btn primary" type="button" id="v61MinyakDone">Minyak Selesai</button></div>';
    acc.insertAdjacentElement('beforebegin',section);
    pane.classList.remove('subpane','tx-pane','active');pane.style.display='block';section.appendChild(pane);
    $('v61MinyakDone')?.addEventListener('click',()=>{try{nextStep();}catch(_){}});
    $('minyakLiter')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();$('minyakAdd')?.click();}});
  }
  [...document.querySelectorAll('.tx-tab')].filter(b=>String(b.textContent||'').trim()==='Minyak').forEach(b=>b.remove());
  return section;
}

/* ---------------- Admin Masuk / Admin Keluar ---------------- */
const OUT_RATES=[2500,14000,1500,6500,7000,5000];
function adminArrays(){
  if(typeof txEntries==='undefined')return;
  if(!Array.isArray(txEntries.adminIn))txEntries.adminIn=[];
  if(!Array.isArray(txEntries.adminOut))txEntries.adminOut=[];
}
function calcAdminOut(){
  let total=0;
  OUT_RATES.forEach((rate,i)=>{
    const qty=Math.max(0,Math.floor(Number($('adminOutQty'+i)?.value||0)));
    const sub=rate*qty;total+=sub;
    if($('adminOutSub'+i))$('adminOutSub'+i).textContent=fmt61(sub);
  });
  if($('adminOutTotal'))$('adminOutTotal').textContent=fmt61(total);
  return total;
}
function renderAdmin(){
  adminArrays();
  const ins=txEntries.adminIn,outs=txEntries.adminOut;
  const inBody=$('adminInList'),outBody=$('adminOutList');
  if(inBody){
    inBody.innerHTML=ins.length?ins.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.note||'—')+'</td><td class="money">'+fmt61(x.amount)+'</td><td><button class="btn" type="button" data-v61-admin-in="'+i+'">Hapus</button></td></tr>').join(''):'<tr><td colspan="4" class="multi-empty">Belum ada Admin Masuk.</td></tr>';
    inBody.querySelectorAll('[data-v61-admin-in]').forEach(b=>b.addEventListener('click',()=>{txEntries.adminIn.splice(Number(b.dataset.v61AdminIn),1);renderAdmin();}));
  }
  if(outBody){
    outBody.innerHTML=outs.length?outs.map((x,i)=>{
      const detail=(x.items||[]).map(a=>a.qty+'× '+fmt61(a.rate)).join(' + ');
      return '<tr><td>'+(i+1)+'</td><td>'+esc(detail||'—')+'</td><td class="money">'+fmt61(x.amount)+'</td><td><button class="btn" type="button" data-v61-admin-out="'+i+'">Hapus</button></td></tr>';
    }).join(''):'<tr><td colspan="4" class="multi-empty">Belum ada Admin Keluar.</td></tr>';
    outBody.querySelectorAll('[data-v61-admin-out]').forEach(b=>b.addEventListener('click',()=>{txEntries.adminOut.splice(Number(b.dataset.v61AdminOut),1);renderAdmin();}));
  }
  const totalIn=ins.reduce((s,x)=>s+Number(x.amount||0),0);
  const totalOut=outs.reduce((s,x)=>s+Number(x.amount||0),0);
  if($('adminTotalIn'))$('adminTotalIn').textContent=fmt61(totalIn);
  if($('adminTotalOut'))$('adminTotalOut').textContent=fmt61(totalOut);
  if($('adminNet'))$('adminNet').textContent=fmt61(totalIn-totalOut);
  if($('adminInCount'))$('adminInCount').textContent=ins.length+' input';
  if($('adminOutCount'))$('adminOutCount').textContent=outs.length+' input';
  try{renderTxGlobalSummary();}catch(_){}
  try{window.KAAutosaveV53?.save?.();}catch(_){}
}
function addAdminIn(){
  const amount=money($('adminInAmount')),note=String($('adminInNote')?.value||'').trim();
  if(amount<=0){toast('Nominal Admin Masuk harus lebih dari Rp0.','warn');return;}
  txEntries.adminIn.push({amount,margin:amount,note});
  if($('adminInAmount'))$('adminInAmount').value='';
  if($('adminInNote'))$('adminInNote').value='';
  renderAdmin();toast('Admin Masuk ditambahkan ke Margin Total.','ok');
}
function addAdminOut(){
  const items=OUT_RATES.map((rate,i)=>({rate,qty:Math.max(0,Math.floor(Number($('adminOutQty'+i)?.value||0)))})).filter(x=>x.qty>0);
  const total=items.reduce((s,x)=>s+x.rate*x.qty,0);
  if(total<=0){toast('Isi jumlah minimal satu Admin Keluar.','warn');return;}
  txEntries.adminOut.push({items,amount:total,margin:-total});
  OUT_RATES.forEach((_,i)=>{if($('adminOutQty'+i))$('adminOutQty'+i).value='0';});
  calcAdminOut();renderAdmin();toast('Admin Keluar dikurangi dari Margin Total.','ok');
}
function installAdminStep(){
  adminArrays();
  if(!$('v62AdminStyle')){
    const style=document.createElement('style');
    style.id='v62AdminStyle';
    style.textContent=`
      #v61-admin-section{min-width:0;overflow:visible;padding-bottom:120px}
      #v61-admin-section .card{min-width:0;overflow:visible}
      #v61-admin-section .table-wrap{max-width:100%;overflow-x:auto}
      #v61-admin-section .grid.two{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start}
      #v61-admin-section .v62-admin-rates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
      #v61-admin-section .v62-admin-rate{
        display:grid;
        grid-template-columns:minmax(72px,1fr) minmax(118px,1.15fr);
        gap:10px;
        align-items:center;
        padding:11px 12px;
        border:1px solid var(--line);
        border-radius:12px;
        background:#fff;
        min-width:0
      }
      #v61-admin-section .v62-admin-rate>div:first-child{min-width:0}
      #v61-admin-section .v62-admin-rate small,
      #v61-admin-section .v62-admin-rate-input label{
        display:block;font-size:9px;color:var(--muted);font-weight:800;
        text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px
      }
      #v61-admin-section .v62-admin-rate>div:first-child b{display:block;white-space:nowrap;font-size:13px}
      #v61-admin-section .v62-admin-rate-input{
        min-width:0;
        display:grid;
        grid-template-columns:minmax(58px,72px) minmax(52px,1fr);
        gap:6px 8px;
        align-items:center
      }
      #v61-admin-section .v62-admin-rate-input label{grid-column:1/-1;margin:0}
      #v61-admin-section .v62-admin-rate-input .input{
        min-width:0;width:100%;height:42px;padding:8px 9px;text-align:center
      }
      #v61-admin-section .v62-admin-rate-input b{
        min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        font-size:12px;text-align:right
      }
      #v61-admin-section .v62-admin-out-total{grid-template-columns:minmax(0,1fr);margin-top:12px}
      #v61-admin-section .v62-admin-out-total .calcbox{min-height:auto}
      #v61-admin-section .v62-admin-results{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;margin-top:16px}
      #v61-admin-section .v62-admin-table{min-width:620px}
      #v61-admin-section #adminOutAdd{margin-top:2px}
      @media(max-width:1180px){
        #v61-admin-section .grid.two{grid-template-columns:minmax(0,1fr)}
        #v61-admin-section .v62-admin-rates{grid-template-columns:repeat(3,minmax(0,1fr))}
      }
      @media(max-width:900px){
        #v61-admin-section{padding-bottom:40px}
        #v61-admin-section .v62-admin-rates{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:620px){
        #v61-admin-section .v62-admin-rates{grid-template-columns:minmax(0,1fr)}
        #v61-admin-section .v62-admin-table{min-width:560px}
      }
    `;
    document.head.appendChild(style);
  }
  let section=$('v61-admin-section');
  if(section){renderAdmin();return section;}
  const acc=$('v42-accobat-section')||findSection(/Aksesoris\s*(?:&|\/)\s*Obat/i);
  if(!acc)return null;
  section=document.createElement('section');section.className='section';section.id='v61-admin-section';
  const rows=OUT_RATES.map((rate,i)=>`<div class="v62-admin-rate"><div><small>Tarif</small><b>${fmt61(rate)}</b></div><div class="v62-admin-rate-input"><label for="adminOutQty${i}">Jumlah</label><input class="input" id="adminOutQty${i}" type="number" min="0" step="1" value="0" inputmode="numeric" aria-label="Jumlah admin keluar ${fmt61(rate)}"><b id="adminOutSub${i}">${fmt61(0)}</b></div></div>`).join('');
  section.innerHTML=`
    <div class="section-head"><div><h3>8. Admin</h3><p>Admin Masuk menambah Margin Total; Admin Keluar mengurangi Margin Total.</p></div><button class="btn primary" id="v61AdminDone" type="button">Admin Selesai</button></div>
    <div class="grid two">
      <div class="card form focus-form-card">
        <h4>Admin Masuk</h4>
        <div class="notice green">Setiap Admin Masuk bernilai positif dan langsung <b>menambah Margin Total</b>.</div>
        <div class="form-grid"><div class="field"><label>Nominal Admin Masuk</label><input autocomplete="off" class="input money-entry" id="adminInAmount" inputmode="numeric" placeholder="Isi uang yang masuk"></div><div class="field"><label>Catatan</label><input class="input" id="adminInNote" placeholder="Opsional"></div></div>
        <div class="actions"><button class="btn primary" id="adminInAdd" type="button">+ Tambahkan Admin Masuk</button></div>
      </div>
      <div class="card form focus-form-card">
        <h4>Admin Keluar</h4>
        <div class="notice amber">Karyawan hanya mengisi <b>berapa kali</b>. Sistem menghitung tarif × jumlah dan menguranginya dari Margin Total.</div>
        <div class="v62-admin-rates">${rows}</div>
        <div class="calc-grid v62-admin-out-total"><div class="calcbox bad"><small>Total Admin Keluar</small><b id="adminOutTotal">${fmt61(0)}</b></div></div>
        <div class="actions"><button class="btn primary" id="adminOutAdd" type="button">+ Tambahkan Admin Keluar</button></div>
      </div>
    </div>
    <div class="calc-grid" style="margin-top:14px"><div class="calcbox good"><small>Total Admin Masuk</small><b id="adminTotalIn">${fmt61(0)}</b></div><div class="calcbox bad"><small>Total Admin Keluar</small><b id="adminTotalOut">${fmt61(0)}</b></div><div class="calcbox"><small>Dampak Bersih ke Margin</small><b id="adminNet">${fmt61(0)}</b></div></div>
    <div class="v62-admin-results">
      <div class="card multi-list-card"><div class="section-head"><h4 style="margin:0">Daftar Admin Masuk</h4><span class="status info" id="adminInCount">0 input</span></div><div class="table-wrap"><table class="table v62-admin-table"><thead><tr><th>#</th><th>Catatan</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody id="adminInList"></tbody></table></div></div>
      <div class="card multi-list-card"><div class="section-head"><h4 style="margin:0">Daftar Admin Keluar</h4><span class="status info" id="adminOutCount">0 input</span></div><div class="table-wrap"><table class="table v62-admin-table"><thead><tr><th>#</th><th>Perhitungan</th><th>Total</th><th>Aksi</th></tr></thead><tbody id="adminOutList"></tbody></table></div></div>
    </div>`;
  acc.insertAdjacentElement('beforebegin',section);
  $('adminInAmount')?.addEventListener('input',e=>{try{formatMoneyInput(e.target);}catch(_){}});
  $('adminInAmount')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();addAdminIn();}});
  $('adminInAdd')?.addEventListener('click',addAdminIn);
  OUT_RATES.forEach((_,i)=>$('adminOutQty'+i)?.addEventListener('input',calcAdminOut));
  OUT_RATES.forEach((_,i)=>$('adminOutQty'+i)?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();addAdminOut();}}));
  $('adminOutAdd')?.addEventListener('click',addAdminOut);
  $('v61AdminDone')?.addEventListener('click',()=>{try{nextStep();}catch(_){}});
  renderAdmin();return section;
}

/* ---------------- Workflow 13 step ---------------- */
function remapSteps(){
  const map=[
    [0,findSection(/Cek Data Awal/i),'Cek Data Awal'],
    [1,findSection(/^\s*\d*\.?\s*Belanja\b/i),'Belanja'],
    [2,findSection(/Pemasukan Display Rokok/i),'Pemasukan Display Rokok'],
    [3,findSection(/Operasional/i),'Operasional'],
    [4,findSection(/Hutang\s*(?:&|\/|dan)\s*Piutang/i),'Hutang & Piutang'],
    [5,findSection(/Input Transaksi|^\s*\d*\.?\s*Transaksi/i),'Input Transaksi'],
    [6,$('v61-minyak-section'),'Minyak'],
    [7,$('v61-admin-section'),'Admin'],
    [8,$('v42-accobat-section')||findSection(/Aksesoris\s*(?:&|\/)\s*Obat/i),'Aksesoris & Obat'],
    [9,findSection(/Stok Akhir Paket/i),'Stok Akhir Paket'],
    [10,findSection(/Stok Akhir Rokok/i),'Stok Akhir Rokok'],
    [11,findSection(/Modal Inputan Shift Berjalan|Modal Inputan/i),'Modal Inputan Shift Berjalan'],
    [12,$('v44-balance-section')||findSection(/Balance Akhir Shift/i),'Balance Akhir Shift']
  ];
  map.forEach(([i,s,title])=>{if(s){s.dataset.i=String(i);setTitle(s,i+1,title);}});
  try{if(typeof labels!=='undefined'&&Array.isArray(labels))labels.splice(0,labels.length,...STEP_LABELS);}catch(_){}
  try{if(typeof renderSteps==='function')renderSteps();}catch(_){}
  try{if(typeof refreshGlobalNextButton==='function')refreshGlobalNextButton();}catch(_){}
}
let oldSmartNext=null;
function installNavigation(){
  if(document.documentElement.dataset.v61Nav==='1')return;
  document.documentElement.dataset.v61Nav='1';
  try{oldSmartNext=typeof smartNextStep==='function'?smartNextStep:null;}catch(_){}
  try{
    smartNextStep=function(){
      const cur=Number(typeof idx!=='undefined'?idx:0);
      if(cur<=2&&oldSmartNext)return oldSmartNext();
      if(typeof showStep==='function')showStep(Math.min(STEP_LABELS.length-1,cur+1));
    };
    smartPrevStep=function(){
      const cur=Number(typeof idx!=='undefined'?idx:0);
      if(typeof showStep==='function')showStep(Math.max(0,cur-1));
    };
  }catch(_){}

  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('section.section > .section-head > button.btn.primary');
    if(!btn||btn.id==='v44RefreshBalance'||Number(btn.closest('section')?.dataset.i)<3)return;
    if(btn.id==='v61MinyakDone'||btn.id==='v61AdminDone')return;
    e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    const section=btn.closest('section'),i=Number(section?.dataset.i);
    if(Number.isFinite(i)&&typeof showStep==='function')showStep(Math.min(STEP_LABELS.length-1,i+1));
  },true);
}

function refresh(){
  installListrik();installMinyakStep();installAdminStep();remapSteps();
  renderListrik();renderAdmin();try{window.KAPersistRenderV40?.();}catch(_){}
  document.querySelectorAll('.topbar .status.info').forEach(el=>{if(/UI\s+V/i.test(String(el.textContent||'')))el.textContent='UI V62 — ADMIN LAYOUT FIX + Rp5.000';});
}
function selfTest(){
  const t=[],ok=(n,c)=>t.push([n,!!c]);
  ok('13 labels',(()=>{try{return labels.length===13;}catch(_){return false;}})());
  ok('Minyak main step',Number($('v61-minyak-section')?.dataset.i)===6&&!$('tx-minyak')?.classList.contains('tx-pane'));
  ok('Admin main step',Number($('v61-admin-section')?.dataset.i)===7);
  ok('Electricity tab/pane',!!$('tx-electricity'));
  ok('Electricity <=500k margin 4500',listrikMargin(500000)===4500);
  ok('Electricity >500k follows BCA',listrikMargin(500001)===5000);
  ok('Admin rates exact',OUT_RATES.join(',')==='2500,14000,1500,6500,7000,5000');
  const pass=t.every(x=>x[1]);document.documentElement.dataset.v61Selftest=pass?'PASS':'FAIL';
  window.KAFeaturesV61={pass,tests:t,refresh,renderListrik,renderAdmin,listrikMargin};
  if(!pass)console.error('V61 SELFTEST FAIL',t);
}
function install(){refresh();installNavigation();setTimeout(()=>{refresh();selfTest();},0);setTimeout(refresh,1100);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();