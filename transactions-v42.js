/* Konter Anisa V42 — fix dynamic tabs + Aksesoris/Obat own step */
(() => {
  'use strict';

  const byId = id => document.getElementById(id);

  function parseAction(el, fnName){
    const action = String(el?.getAttribute('data-ui-click') || '');
    const re = fnName === 'showTxn'
      ? /showTxn\('([^']+)'/
      : /showBuy\('([^']+)'/;
    const m = action.match(re);
    return m ? m[1] : '';
  }

  // Tombol yang ditambahkan setelah page load (ShopeePay, Minyak, dll.)
  // sebelumnya hanya punya data-ui-click tetapi tidak pernah dibind.
  // Delegasi ini membuat semua tab transaksi/belanja dinamis selalu hidup.
  function installDynamicTabDelegation(){
    if(document.documentElement.dataset.v42Delegation === '1') return;
    document.documentElement.dataset.v42Delegation = '1';

    document.addEventListener('click', e => {
      const txTab = e.target.closest('.tx-tab[data-ui-click]');
      if(txTab){
        const name = parseAction(txTab,'showTxn');
        if(name && byId('tx-'+name) && typeof window.showTxn === 'function'){
          e.preventDefault();
          window.showTxn(name,txTab);
          return;
        }
      }

      const buyTab = e.target.closest('button.subtab[data-ui-click]');
      if(buyTab){
        const name = parseAction(buyTab,'showBuy');
        if(name && byId('buy-'+name) && typeof window.showBuy === 'function'){
          e.preventDefault();
          window.showBuy(name,buyTab);
        }
      }
    }, false);
  }

  function headingText(section){
    return String(section?.querySelector('.section-head h3')?.textContent || '');
  }

  function findSection(re){
    return [...document.querySelectorAll('section.section')].find(s => re.test(headingText(s)));
  }

  function renumberSectionHeading(section, number){
    const h = section?.querySelector('.section-head h3');
    if(!h) return;
    const title = String(h.textContent || '').replace(/^\s*\d+\.\s*/,'').trim();
    h.textContent = `${number}. ${title}`;
  }

  function moveAccObatToOwnStep(){
    if(byId('v42-accobat-section')) return;

    const accPane = byId('tx-accobat');
    const txSection = findSection(/Transaksi/i);
    const pkgSection = findSection(/Stok Akhir Paket|Paket/i);
    if(!accPane || !txSection || !pkgSection) return;

    // Hapus tombol Aksesoris & Obat dari deretan submenu Transaksi.
    [...txSection.querySelectorAll('.tx-tab')].forEach(tab => {
      if(/^Aksesoris\s*&\s*Obat$/i.test(String(tab.textContent||'').trim())) tab.remove();
    });

    // Geser step Paket sampai Stop satu nomor ke kanan.
    [...document.querySelectorAll('section.section')]
      .map(s => ({s, i:Number(s.dataset.i)}))
      .filter(x => Number.isFinite(x.i) && x.i >= 6)
      .sort((a,b) => b.i-a.i)
      .forEach(x => { x.s.dataset.i = String(x.i + 1); });

    // Sisipkan label step baru sesudah Transaksi.
    if(typeof window.labels !== 'undefined' && Array.isArray(window.labels)){
      const exists = window.labels.some(x => /Aksesoris\s*\/\s*Obat|Aksesoris\s*&\s*Obat/i.test(String(x)));
      if(!exists) window.labels.splice(6,0,'Aksesoris/Obat');
    }

    const section = document.createElement('section');
    section.className = 'section';
    section.dataset.i = '6';
    section.id = 'v42-accobat-section';

    const head = document.createElement('div');
    head.className = 'section-head';
    head.innerHTML = `<div><h3>7. Aksesoris & Obat</h3><p>Perhitungan Aksesoris dan Obat dipisahkan dari transaksi digital. Karyawan mengisi jumlah uang dan margin; modal terpakai dihitung otomatis.</p></div>`;

    const next = document.createElement('button');
    next.className = 'btn primary';
    next.type = 'button';
    next.textContent = 'Aksesoris & Obat Selesai';
    next.addEventListener('click',()=>{
      if(typeof window.nextStep === 'function') window.nextStep();
      if(typeof window.refreshGlobalNextButton === 'function') window.refreshGlobalNextButton();
    });
    head.appendChild(next);

    const note = document.createElement('div');
    note.className = 'notice blue';
    note.innerHTML = '<b>Rumus:</b> Modal Terpakai = Jumlah Uang − Margin. Modal ACC/Obat akhir tetap otomatis dari Modal Sebelumnya + Belanja − Modal Terpakai.';

    accPane.classList.remove('tx-pane','subpane','active');
    accPane.style.display = 'block';

    section.append(head,note,accPane);
    pkgSection.insertAdjacentElement('beforebegin',section);

    // Rapikan nomor judul setelah penambahan step baru.
    [...document.querySelectorAll('section.section')].forEach(s => {
      const i = Number(s.dataset.i);
      if(Number.isFinite(i)) renumberSectionHeading(s,i+1);
    });

    if(typeof window.renderSteps === 'function') window.renderSteps();
    if(typeof window.refreshGlobalNextButton === 'function') window.refreshGlobalNextButton();
  }

  function verifyDynamicTabs(){
    // Fallback direct binding untuk tiga tombol yang sebelumnya mati.
    [
      ['ShopeePay','shopeepay'],
      ['Minyak','minyak']
    ].forEach(([label,name])=>{
      const tab=[...document.querySelectorAll('.tx-tab')].find(x=>String(x.textContent||'').trim()===label);
      if(!tab || tab.dataset.v42Bound==='1') return;
      tab.dataset.v42Bound='1';
      tab.addEventListener('click',()=>{
        if(typeof window.showTxn==='function' && byId('tx-'+name)) window.showTxn(name,tab);
      });
    });
  }

  function install(){
    installDynamicTabDelegation();
    moveAccObatToOwnStep();
    verifyDynamicTabs();

    document.querySelectorAll('.topbar .status.info').forEach(el=>{
      if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V42 — TAB FIX + ACC/OBAT STEP';
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
