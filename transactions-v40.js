/* Konter Anisa V40 — Minyak exact decimal liters */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const toast = (msg,type='warn') => typeof uiToast === 'function' ? uiToast(msg,type) : alert(msg);

  function sanitizeLiterInput(value){
    let s=String(value ?? '').replace(/\s+/g,'').replace(/\./g,',').replace(/[^0-9,]/g,'');
    const first=s.indexOf(',');
    if(first>=0) s=s.slice(0,first+1)+s.slice(first+1).replace(/,/g,'');
    return s;
  }

  function parseDecimal(raw){
    let s=String(raw ?? '').trim().replace(',', '.');
    if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return null;
    if(s.startsWith('.')) s='0'+s;
    const parts=s.split('.');
    const whole=parts[0]||'0';
    const frac=parts[1]||'';
    const digits=(whole+frac).replace(/^0+(?=\d)/,'') || '0';
    return { num: BigInt(digits), scale: frac.length, raw: frac ? `${BigInt(whole).toString()},${frac}` : BigInt(whole).toString() };
  }

  function scaledMultiply(decimal, rate){
    return { num: decimal.num * BigInt(rate), scale: decimal.scale };
  }

  function trimScaled(value){
    let {num,scale}=value;
    while(scale>0 && num%10n===0n){ num/=10n; scale--; }
    return {num,scale};
  }

  function formatScaled(value, currency=false){
    let {num,scale}=trimScaled(value);
    const neg=num<0n;
    if(neg) num=-num;
    let s=num.toString();
    if(scale>0){
      s=s.padStart(scale+1,'0');
      const i=s.length-scale;
      const whole=s.slice(0,i);
      const frac=s.slice(i);
      s=whole+','+frac;
    }
    let [whole,frac]=s.split(',');
    whole=whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    const out=(neg?'-':'')+whole+(frac?','+frac:'');
    return currency ? 'Rp'+out : out;
  }

  function toApproxNumber(decimal, rate){
    const n=Number(String(decimal.raw).replace(',','.'));
    return Number.isFinite(n) ? n*rate : 0;
  }

  function addDecimals(list){
    if(!list.length) return {num:0n,scale:0};
    let maxScale=0;
    const parsed=list.map(v=>parseDecimal(v)).filter(Boolean);
    parsed.forEach(v=>{ if(v.scale>maxScale) maxScale=v.scale; });
    let total=0n;
    parsed.forEach(v=>{ total += v.num * (10n ** BigInt(maxScale-v.scale)); });
    return trimScaled({num:total,scale:maxScale});
  }

  function install(){
    if(byId('tx-minyak')) return;

    const tabs=[...document.querySelectorAll('.tx-tab')];
    const anchorTab=tabs.find(b=>String(b.getAttribute('data-ui-click')||'').includes("showTxn('shopeepay'")) ||
      tabs.find(b=>String(b.textContent||'').trim()==='BRILINK') || tabs[tabs.length-1];
    const anchorPane=byId('tx-shopeepay') || byId('tx-brilink') || document.querySelector('.tx-pane:last-of-type');
    if(!anchorTab || !anchorPane) return;

    if(typeof txEntries !== 'undefined' && !txEntries.minyak) txEntries.minyak=[];

    const tab=document.createElement('button');
    tab.className='subtab tx-tab';
    tab.type='button';
    tab.textContent='Minyak';
    tab.setAttribute('data-ui-click',"showTxn('minyak',this)");
    anchorTab.insertAdjacentElement('afterend',tab);

    const pane=document.createElement('div');
    pane.className='subpane tx-pane';
    pane.id='tx-minyak';
    pane.innerHTML=`
      <div class="grid two">
        <div class="card form focus-form-card">
          <h4 style="margin:0 0 14px">Perhitungan Minyak</h4>
          <div class="form-grid">
            <div class="field">
              <label>Liter Terjual</label>
              <input autocomplete="off" class="input" id="minyakLiter" inputmode="decimal" type="text" placeholder="Contoh: 1,5 atau 2,375"/>
              <small style="display:block;margin-top:6px;color:var(--muted)">Boleh pecahan/desimal. Jumlah angka di belakang koma tidak dibatasi oleh form.</small>
            </div>
          </div>
          <div class="calc-grid">
            <div class="calcbox"><small>Harga Jual / Liter</small><b>Rp12.000</b></div>
            <div class="calcbox"><small>Modal / Liter</small><b>Rp10.000</b></div>
            <div class="calcbox"><small>Margin / Liter</small><b>Rp2.000</b></div>
            <div class="calcbox good"><small>Jumlah Uang</small><b id="minyakJumlah">—</b></div>
            <div class="calcbox"><small>Modal Terjual</small><b id="minyakModal">—</b></div>
            <div class="calcbox good"><small>Margin</small><b id="minyakMargin">—</b></div>
          </div>
          <div class="actions" style="margin-top:14px"><button class="btn primary" id="minyakAdd" type="button">+ Tambahkan ke Daftar</button></div>
        </div>
        <div class="card summary">
          <h4>Aturan Minyak</h4>
          <div class="sumrow"><span>Input karyawan</span><b>Liter terjual saja</b></div>
          <div class="sumrow"><span>Jumlah uang</span><b>Liter × Rp12.000</b></div>
          <div class="sumrow"><span>Margin</span><b>Liter × Rp2.000</b></div>
          <div class="sumrow"><span>Modal terjual</span><b>Liter × Rp10.000</b></div>
        </div>
      </div>
      <div class="card multi-list-card" style="margin-top:14px">
        <div class="section-head"><div><h4 style="margin:0">Daftar Perhitungan Minyak</h4><p style="margin:4px 0 0;color:var(--muted)">Liter dapat dimasukkan lebih dari sekali; sistem menjumlahkan otomatis.</p></div><span class="status info" id="txCount_minyak">0 input</span></div>
        <div class="table-wrap"><table class="table" style="min-width:760px"><thead><tr><th>#</th><th>Liter</th><th>Jumlah Uang</th><th>Modal</th><th>Margin</th><th>Aksi</th></tr></thead><tbody id="txList_minyak"><tr><td class="multi-empty" colspan="6">Belum ada liter minyak yang ditambahkan.</td></tr></tbody></table></div>
      </div>`;
    anchorPane.insertAdjacentElement('afterend',pane);

    const liter=byId('minyakLiter');

    function calculate(){
      const d=parseDecimal(liter.value);
      if(!d || d.num===0n){
        byId('minyakJumlah').textContent='—';
        byId('minyakModal').textContent='—';
        byId('minyakMargin').textContent='—';
        return null;
      }
      const jumlah=scaledMultiply(d,12000);
      const modal=scaledMultiply(d,10000);
      const margin=scaledMultiply(d,2000);
      byId('minyakJumlah').textContent=formatScaled(jumlah,true);
      byId('minyakModal').textContent=formatScaled(modal,true);
      byId('minyakMargin').textContent=formatScaled(margin,true);
      return {d,jumlah,modal,margin};
    }

    liter.addEventListener('input',()=>{
      const clean=sanitizeLiterInput(liter.value);
      if(liter.value!==clean) liter.value=clean;
      calculate();
    });

    function render(){
      const arr=(typeof txEntries!=='undefined' && txEntries.minyak)?txEntries.minyak:[];
      const body=byId('txList_minyak'), count=byId('txCount_minyak');
      if(!arr.length){
        body.innerHTML='<tr><td class="multi-empty" colspan="6">Belum ada liter minyak yang ditambahkan.</td></tr>';
        count.textContent='0 input';
        return;
      }
      body.innerHTML=arr.map((x,i)=>{
        const d=parseDecimal(x.liters);
        return `<tr><td>${i+1}</td><td>${x.liters} L</td><td class="money">${formatScaled(scaledMultiply(d,12000),true)}</td><td class="money">${formatScaled(scaledMultiply(d,10000),true)}</td><td class="money">${formatScaled(scaledMultiply(d,2000),true)}</td><td><button class="btn" type="button" data-v40-remove="${i}">Hapus</button></td></tr>`;
      }).join('');
      const totalLiter=addDecimals(arr.map(x=>x.liters));
      const totalLiterText=formatScaled(totalLiter,false);
      count.textContent=`${arr.length} input • ${totalLiterText} L • Margin ${formatScaled(scaledMultiply(totalLiter,2000),true)}`;
      body.querySelectorAll('[data-v40-remove]').forEach(btn=>btn.addEventListener('click',()=>{
        txEntries.minyak.splice(Number(btn.dataset.v40Remove),1);
        render();
        if(typeof renderTxGlobalSummary==='function') renderTxGlobalSummary();
      }));
    }

    byId('minyakAdd').addEventListener('click',()=>{
      const calc=calculate();
      if(!calc || calc.d.num<=0n){
        toast('Isi jumlah liter minyak lebih dari 0.','warn');
        liter.focus();
        return;
      }
      txEntries.minyak.push({
        liters: calc.d.raw,
        amount: toApproxNumber(calc.d,12000),
        modal: toApproxNumber(calc.d,10000),
        margin: toApproxNumber(calc.d,2000)
      });
      render();
      if(typeof renderTxGlobalSummary==='function') renderTxGlobalSummary();
      liter.value='';
      byId('minyakJumlah').textContent='—';
      byId('minyakModal').textContent='—';
      byId('minyakMargin').textContent='—';
      toast('Perhitungan minyak ditambahkan.','ok');
    });

    window.KAPersistRenderV40=render;

    if(typeof bindRuntimeActions==='function') bindRuntimeActions();
    document.querySelectorAll('.topbar .status.info').forEach(el=>{
      if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V40 — MINYAK';
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
