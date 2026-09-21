/* Konter Anisa V75 — Belanja Minyak */
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const fmt=n=>{
    try{ if(typeof window.fmt==='function') return window.fmt(Number(n)||0); }catch(_){}
    return 'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');
  };
  const money=el=>{
    if(!el)return 0;
    try{ if(typeof window.moneyValue==='function') return Math.max(0,window.moneyValue(el)); }catch(_){}
    return Math.max(0,Number(String(el.value||'').replace(/[^0-9.-]/g,''))||0);
  };
  const toast=(m,t='info')=>{try{if(typeof window.uiToast==='function')window.uiToast(m,t);}catch(_){}};

  function shiftId(){
    try{
      const id=String(window.KARegulationsV29?.activeShift?.id||'').trim();
      if(id)return id;
    }catch(_){}
    return String(document.querySelector('.crumb')?.textContent||'shift').toLowerCase().replace(/[^a-z0-9]+/g,'-');
  }
  function key(){return 'ka_oil_purchase_v75_'+shiftId();}

  let entries=[];
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(key())||'[]');
      entries=Array.isArray(raw)?raw:[];
    }catch(_){entries=[];}
  }
  function save(){
    try{localStorage.setItem(key(),JSON.stringify(entries));}catch(_){}
    try{window.KAAutosaveV53?.save?.();}catch(_){}
  }

  function parseLiter(v){
    const raw=String(v||'').trim().replace(',','.');
    const n=Number(raw);
    return Number.isFinite(n)&&n>0?n:0;
  }

  function calc(){
    const liters=parseLiter($('oilBuyLiter')?.value);
    const unit=money($('oilBuyUnit'));
    const total=liters*unit;
    if($('oilBuyTotal'))$('oilBuyTotal').textContent=total>0?fmt(total):'—';
    if($('oilBuyLiterOut'))$('oilBuyLiterOut').textContent=liters>0?liters.toLocaleString('id-ID',{maximumFractionDigits:3})+' L':'—';
    return {liters,unit,total};
  }

  function render(){
    const body=$('oilBuyList'),count=$('oilBuyCount');
    if(!body||!count)return;
    if(!entries.length){
      body.innerHTML='<tr><td colspan="6" class="multi-empty">Belum ada Belanja Minyak pada shift ini.</td></tr>';
      count.textContent='0 pembelian';
    }else{
      body.innerHTML=entries.map((x,i)=>`
        <tr>
          <td>${i+1}</td>
          <td>${String(x.note||'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</td>
          <td>${Number(x.liters||0).toLocaleString('id-ID',{maximumFractionDigits:3})} L</td>
          <td class="money">${fmt(x.unit)}</td>
          <td class="money"><b>${fmt(x.total)}</b></td>
          <td><button class="btn" type="button" data-oil-buy-remove="${i}">Hapus</button></td>
        </tr>`).join('');
      const liters=entries.reduce((s,x)=>s+Number(x.liters||0),0);
      const total=entries.reduce((s,x)=>s+Number(x.total||0),0);
      count.textContent=entries.length+' pembelian • '+liters.toLocaleString('id-ID',{maximumFractionDigits:3})+' L • '+fmt(total);
      body.querySelectorAll('[data-oil-buy-remove]').forEach(btn=>btn.addEventListener('click',()=>{
        entries.splice(Number(btn.dataset.oilBuyRemove),1);
        save();render();
      }));
    }

    const liters=entries.reduce((s,x)=>s+Number(x.liters||0),0);
    const total=entries.reduce((s,x)=>s+Number(x.total||0),0);
    if($('oilBuyTotalLiter'))$('oilBuyTotalLiter').textContent=liters.toLocaleString('id-ID',{maximumFractionDigits:3})+' L';
    if($('oilBuyTotalCost'))$('oilBuyTotalCost').textContent=fmt(total);
  }

  function add(){
    const {liters,unit,total}=calc();
    const note=String($('oilBuyNote')?.value||'').trim();
    if(liters<=0){toast('Isi jumlah liter Belanja Minyak lebih dari 0.','warn');$('oilBuyLiter')?.focus();return;}
    if(unit<=0){toast('Harga beli per liter harus lebih dari Rp0.','warn');$('oilBuyUnit')?.focus();return;}
    entries.push({note:note||'Belanja Minyak',liters,unit,total,createdAt:Date.now(),shiftId:shiftId()});
    save();render();
    if($('oilBuyLiter'))$('oilBuyLiter').value='';
    if($('oilBuyNote'))$('oilBuyNote').value='';
    if($('oilBuyTotal'))$('oilBuyTotal').textContent='—';
    if($('oilBuyLiterOut'))$('oilBuyLiterOut').textContent='—';
    toast('Belanja Minyak disimpan.','ok');
    $('oilBuyLiter')?.focus();
  }

  function install(){
    if($('buy-minyak'))return;

    const section=[...document.querySelectorAll('section.section')].find(s=>/\bBelanja\b/i.test(String(s.querySelector('.section-head h3')?.textContent||'')));
    if(!section)return;

    const tabs=section.querySelector('.subtabs');
    const notaTab=[...(tabs?.querySelectorAll('.subtab')||[])].find(b=>/Nota Purchasing/i.test(String(b.textContent||'')));
    if(!tabs)return;

    const tab=document.createElement('button');
    tab.className='subtab';
    tab.type='button';
    tab.textContent='Belanja Minyak';
    tab.setAttribute('data-ui-click',"showBuy('minyak',this)");
    if(notaTab)notaTab.insertAdjacentElement('beforebegin',tab);else tabs.appendChild(tab);

    const pane=document.createElement('div');
    pane.className='subpane';
    pane.id='buy-minyak';
    pane.innerHTML=`
      <div class="notice blue" style="margin-bottom:12px">
        <b>Belanja Minyak = stok masuk/pembelian.</b> Menu ini tidak menambah Margin dan tidak dihitung lagi sebagai Modal Minyak di Balance.
        Balance tetap memakai modal minyak yang benar-benar terjual agar tidak terjadi hitung ganda.
      </div>
      <div class="grid two">
        <div class="card form">
          <h4 style="margin:0 0 14px">Input Belanja Minyak</h4>
          <div class="form-grid">
            <div class="field"><label>Nota / Keterangan</label><input class="input" id="oilBuyNote" autocomplete="off" placeholder="Contoh: Nota Minyak 18/09"/></div>
            <div class="field"><label>Jumlah Liter Dibeli</label><input class="input" id="oilBuyLiter" autocomplete="off" inputmode="decimal" placeholder="Contoh: 10 atau 12,5"/></div>
            <div class="field"><label>Harga Beli / Liter</label><input class="input money-entry" id="oilBuyUnit" autocomplete="off" inputmode="numeric" value="10.000"/></div>
          </div>
          <div class="calc-grid">
            <div class="calcbox"><small>Liter Pembelian</small><b id="oilBuyLiterOut">—</b></div>
            <div class="calcbox good"><small>Total Belanja</small><b id="oilBuyTotal">—</b></div>
          </div>
          <div class="actions" style="margin-top:14px">
            <button class="btn primary" id="oilBuyAdd" type="button">+ Simpan Belanja Minyak</button>
            <span class="status info">↵ Enter = Simpan</span>
          </div>
        </div>
        <div class="card summary">
          <h4>Ringkasan Belanja Minyak</h4>
          <div class="sumrow"><span>Total Liter Dibeli</span><b id="oilBuyTotalLiter">0 L</b></div>
          <div class="sumrow"><span>Total Nilai Belanja</span><b id="oilBuyTotalCost">Rp0</b></div>
          <div class="sumrow"><span>Harga Modal Normal</span><b>Rp10.000/L</b></div>
          <div class="notice amber" style="margin-top:12px;margin-bottom:0">Harga beli dapat dikoreksi sesuai nota. Perubahan harga beli tidak otomatis mengubah aturan penjualan Minyak Rp12.000/L dan modal terjual Rp10.000/L.</div>
        </div>
      </div>
      <div class="card multi-list-card" style="margin-top:14px">
        <div class="section-head"><div><h4 style="margin:0">Daftar Belanja Minyak</h4></div><span class="status info" id="oilBuyCount">0 pembelian</span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Nota/Keterangan</th><th>Liter</th><th>Harga/Liter</th><th>Total</th><th>Aksi</th></tr></thead><tbody id="oilBuyList"></tbody></table></div>
      </div>`;

    const notaPane=$('buy-nota');
    if(notaPane)notaPane.insertAdjacentElement('beforebegin',pane);
    else section.appendChild(pane);

    const p=section.querySelector('.section-head p');
    if(p)p.textContent='Belanja Paket, Rokok, dan Minyak dicatat terpisah sesuai logika masing-masing.';

    $('oilBuyLiter')?.addEventListener('input',calc);
    $('oilBuyUnit')?.addEventListener('input',e=>{try{window.formatMoneyInput?.(e.target);}catch(_){}calc();});
    ['oilBuyLiter','oilBuyUnit','oilBuyNote'].forEach(id=>$(id)?.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.repeat&&!e.shiftKey&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();add();}
    }));
    $('oilBuyAdd')?.addEventListener('click',add);

    load();render();calc();

    document.querySelectorAll('.topbar .status.info').forEach(el=>{
      if(/UI\s+V/i.test(String(el.textContent||'')))el.textContent='UI V75 — BELANJA MINYAK';
    });

    window.KAOilPurchaseV75={entries:()=>entries.slice(),render,add,total:()=>entries.reduce((s,x)=>s+Number(x.total||0),0)};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
