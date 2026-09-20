/* Konter Anisa V38 — ShopeePay transaction */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const fmtLocal = n => typeof fmt === 'function' ? fmt(Number(n)||0) : 'Rp' + (Number(n)||0).toLocaleString('id-ID');
  const money = el => typeof moneyValue === 'function' ? moneyValue(el) : Number(String(el?.value||'').replace(/\D/g,''))||0;
  const toast = (msg,type='warn') => typeof uiToast === 'function' ? uiToast(msg,type) : alert(msg);
  const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function install(){
    if(byId('tx-shopeepay')) return;

    const svTab = [...document.querySelectorAll('.tx-tab')].find(b => String(b.getAttribute('data-ui-click')||'').includes("showTxn('svplus'"));
    const svPane = byId('tx-svplus');
    if(!svTab || !svPane) return;

    if(typeof txEntries !== 'undefined' && !txEntries.shopeePay) txEntries.shopeePay=[];

    const tab=document.createElement('button');
    tab.className='subtab tx-tab';
    tab.type='button';
    tab.textContent='ShopeePay';
    tab.setAttribute('data-ui-click',"showTxn('shopeepay',this)");
    svTab.insertAdjacentElement('afterend',tab);

    const pane=document.createElement('div');
    pane.className='subpane tx-pane';
    pane.id='tx-shopeepay';
    pane.innerHTML=`
      <div class="grid two">
        <div class="card form focus-form-card">
          <h4 style="margin:0 0 14px">Transaksi ShopeePay</h4>
          <div class="form-grid">
            <div class="field"><label>Transaksi</label><input autocomplete="off" class="input" id="shopeePayType" type="text" placeholder="Isi transaksi"/></div>
            <div class="field"><label>Harga Dasar</label><input autocomplete="off" class="input money-entry" id="shopeePayBase" inputmode="numeric" type="text" placeholder="Isi harga dasar"/></div>
            <div class="field"><label>Harga Jual</label><input autocomplete="off" class="input money-entry" id="shopeePaySell" inputmode="numeric" type="text" placeholder="Isi harga jual"/></div>
            <div class="field"><label>Margin</label><input class="input" disabled id="shopeePayMarginInput" value="" placeholder="Otomatis"/></div>
          </div>
          <div class="calc-grid">
            <div class="calcbox"><small>Harga Dasar</small><b id="shopeePayBaseOut">—</b></div>
            <div class="calcbox"><small>Harga Jual</small><b id="shopeePaySellOut">—</b></div>
            <div class="calcbox good"><small>Margin Otomatis</small><b id="shopeePayMargin">—</b></div>
            <div class="calcbox"><small>Input Karyawan</small><b>3 kolom</b></div>
          </div>
          <div class="actions" style="margin-top:14px"><button class="btn primary" id="shopeePayAdd" type="button">+ Tambahkan ke Daftar</button></div>
        </div>
        <div class="card summary">
          <h4>ShopeePay</h4>
          <div class="sumrow"><span>Transaksi</span><b>Input karyawan</b></div>
          <div class="sumrow"><span>Harga dasar</span><b>Input karyawan</b></div>
          <div class="sumrow"><span>Harga jual</span><b>Input karyawan</b></div>
          <div class="sumrow"><span>Margin</span><b>Otomatis</b></div>
        </div>
      </div>
      <div class="card multi-list-card" style="margin-top:14px">
        <div class="section-head"><div><h4 style="margin:0">Daftar Transaksi ShopeePay</h4><p style="margin:4px 0 0;color:var(--muted)">Bisa lebih dari satu transaksi. Tambahkan satu per satu; transaksi yang sudah masuk dapat dihapus lalu diinput ulang.</p></div><span class="status info" id="txCount_shopeePay">0 transaksi</span></div>
        <div class="table-wrap"><table class="table" style="min-width:760px"><thead><tr><th>#</th><th>Transaksi</th><th>Harga Dasar</th><th>Harga Jual</th><th>Margin</th><th>Aksi</th></tr></thead><tbody id="txList_shopeePay"><tr><td class="multi-empty" colspan="6">Belum ada transaksi yang ditambahkan.</td></tr></tbody></table></div>
      </div>`;
    svPane.insertAdjacentElement('afterend',pane);

    const type=byId('shopeePayType'), base=byId('shopeePayBase'), sell=byId('shopeePaySell');
    const marginInput=byId('shopeePayMarginInput');

    window.calcShopeePay=function(){
      const rawBase=String(base.value||'').trim(), rawSell=String(sell.value||'').trim();
      if(!rawBase && !rawSell){
        byId('shopeePayBaseOut').textContent='—';
        byId('shopeePaySellOut').textContent='—';
        byId('shopeePayMargin').textContent='—';
        marginInput.value='';
        return;
      }
      const b=Math.max(0,money(base)), s=Math.max(0,money(sell)), m=s-b;
      byId('shopeePayBaseOut').textContent=rawBase?fmtLocal(b):'—';
      byId('shopeePaySellOut').textContent=rawSell?fmtLocal(s):'—';
      byId('shopeePayMargin').textContent=(rawBase&&rawSell)?fmtLocal(m):'—';
      marginInput.value=(rawBase&&rawSell)?m.toLocaleString('id-ID'):'';
    };

    base.addEventListener('input',()=>{ if(typeof formatMoneyInput==='function') formatMoneyInput(base); window.calcShopeePay(); });
    sell.addEventListener('input',()=>{ if(typeof formatMoneyInput==='function') formatMoneyInput(sell); window.calcShopeePay(); });

    function render(){
      const arr=(typeof txEntries!=='undefined' && txEntries.shopeePay) ? txEntries.shopeePay : [];
      const body=byId('txList_shopeePay'), count=byId('txCount_shopeePay');
      if(!arr.length){
        body.innerHTML='<tr><td class="multi-empty" colspan="6">Belum ada transaksi yang ditambahkan.</td></tr>';
        count.textContent='0 transaksi';
        return;
      }
      let margin=0;
      body.innerHTML=arr.map((x,i)=>{
        margin+=Number(x.margin||0);
        return `<tr><td>${i+1}</td><td>${esc(x.name)}</td><td class="money">${fmtLocal(x.base)}</td><td class="money">${fmtLocal(x.sell)}</td><td class="money">${fmtLocal(x.margin)}</td><td><button class="btn" type="button" data-v38-remove="${i}">Hapus</button></td></tr>`;
      }).join('');
      count.textContent=`${arr.length} transaksi • Margin ${fmtLocal(margin)}`;
      body.querySelectorAll('[data-v38-remove]').forEach(btn=>btn.addEventListener('click',()=>{
        txEntries.shopeePay.splice(Number(btn.dataset.v38Remove),1);
        render();
        if(typeof renderTxGlobalSummary==='function') renderTxGlobalSummary();
      }));
    }

    byId('shopeePayAdd').addEventListener('click',()=>{
      window.calcShopeePay();
      const name=String(type.value||'').trim(), b=money(base), s=money(sell), m=s-b;
      if(!name || b<=0 || s<=0){
        toast('Lengkapi transaksi, harga dasar, dan harga jual ShopeePay.','warn');
        return;
      }
      txEntries.shopeePay.push({name,base:b,sell:s,margin:m});
      render();
      if(typeof renderTxGlobalSummary==='function') renderTxGlobalSummary();
      type.value=''; base.value=''; sell.value=''; marginInput.value='';
      byId('shopeePayBaseOut').textContent='—';
      byId('shopeePaySellOut').textContent='—';
      byId('shopeePayMargin').textContent='—';
      toast('Transaksi ShopeePay ditambahkan. Form siap untuk transaksi berikutnya.','ok');
    });

    window.KAPersistRenderV38=render;

    if(typeof bindRuntimeActions==='function') bindRuntimeActions();
    document.querySelectorAll('.topbar .status.info').forEach(el=>{ if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V38 — SHOPEEPAY'; });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
