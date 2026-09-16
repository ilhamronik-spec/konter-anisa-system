/* Konter Anisa V43 — expose Aksesoris/Obat as dedicated step + harden dynamic transaction tabs */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);

  function getLabels(){
    try { return (typeof labels !== 'undefined' && Array.isArray(labels)) ? labels : null; }
    catch(_) { return null; }
  }

  function ensureAccObatStepLabel(){
    const arr=getLabels();
    if(!arr) return;
    const has=arr.some(x=>/Aksesoris\s*\/\s*Obat|Aksesoris\s*&\s*Obat/i.test(String(x||'')));
    if(!has) arr.splice(6,0,'Aksesoris/Obat');

    // Pastikan tombol lama Aksesoris & Obat tidak lagi berada di submenu Transaksi.
    document.querySelectorAll('.tx-tab').forEach(tab=>{
      if(/^Aksesoris\s*&\s*Obat$/i.test(String(tab.textContent||'').trim())) tab.remove();
    });

    // V42 sudah membuat section khusus. Jika ada, paksa berada di step ke-7 (index 6).
    const accSection=byId('v42-accobat-section');
    if(accSection) accSection.dataset.i='6';

    if(typeof renderSteps==='function') renderSteps();
    if(typeof refreshGlobalNextButton==='function') refreshGlobalNextButton();
  }

  function hardenDynamicTransactionTabs(){
    if(document.documentElement.dataset.v43TxDelegation==='1') return;
    document.documentElement.dataset.v43TxDelegation='1';

    // Capture dipakai agar tombol dinamis tetap hidup meskipun binding lama tidak mengenal tombol tersebut.
    document.addEventListener('click',e=>{
      const tab=e.target.closest('.tx-tab[data-ui-click]');
      if(!tab) return;
      const action=String(tab.getAttribute('data-ui-click')||'');
      const m=action.match(/showTxn\('([^']+)'/);
      if(!m) return;
      const name=m[1];
      const pane=byId('tx-'+name);
      if(!pane || typeof showTxn!=='function') return;
      e.preventDefault();
      e.stopPropagation();
      showTxn(name,tab);
    },true);
  }

  function verifyStepSection(){
    // Fallback jika V42 dijalankan terlalu awal: pindahkan pane ACC/Obat sekarang.
    if(byId('v42-accobat-section')) return;
    const accPane=byId('tx-accobat');
    const pkg=[...document.querySelectorAll('section.section')].find(s=>/Paket/i.test(String(s.querySelector('.section-head h3')?.textContent||'')));
    if(!accPane || !pkg) return;

    // Geser Paket dst hanya bila belum digeser oleh V42.
    [...document.querySelectorAll('section.section')]
      .map(s=>({s,i:Number(s.dataset.i)}))
      .filter(x=>Number.isFinite(x.i) && x.i>=6)
      .sort((a,b)=>b.i-a.i)
      .forEach(x=>{ x.s.dataset.i=String(x.i+1); });

    const section=document.createElement('section');
    section.className='section';
    section.id='v42-accobat-section';
    section.dataset.i='6';
    section.innerHTML='<div class="section-head"><div><h3>7. Aksesoris & Obat</h3><p>Perhitungan Aksesoris dan Obat terpisah dari transaksi digital.</p></div><button class="btn primary" id="v43AccObatDone" type="button">Aksesoris & Obat Selesai</button></div><div class="notice blue"><b>Rumus:</b> Modal Terpakai = Jumlah Uang − Margin. Modal akhir otomatis = Modal Sebelumnya + Belanja − Modal Terpakai.</div>';
    accPane.classList.remove('tx-pane','subpane','active');
    accPane.style.display='block';
    section.appendChild(accPane);
    pkg.insertAdjacentElement('beforebegin',section);
    byId('v43AccObatDone')?.addEventListener('click',()=>{ if(typeof nextStep==='function') nextStep(); });
  }

  function install(){
    hardenDynamicTransactionTabs();
    verifyStepSection();
    ensureAccObatStepLabel();

    document.querySelectorAll('.topbar .status.info').forEach(el=>{
      if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V43 — ACC/OBAT STEP FIX';
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
