/* Konter Anisa V32 — Professional Input Layout */
(() => {
  'use strict';
  const VERSION = 'V32 — PROFESSIONAL UI';

  const focusCopy = {
    0:'Fokus: cek dan konfirmasi stok Paket, stok Rokok, serta modal shift sebelumnya.',
    1:'Fokus: pilih Nota Purchasing yang benar lalu isi data belanja.',
    2:'Fokus: isi perpindahan stok Rokok dari Gudang ke Display.',
    3:'Fokus: tambahkan Hutang/Piutang satu per satu ke daftar.',
    4:'Fokus: isi transaksi lalu tambahkan ke daftar transaksi shift.',
    5:'Fokus: pilih Nota Operasional yang tersedia. Nominal mengikuti Purchasing.',
    6:'Fokus: isi seluruh Stok Akhir Paket. Jika habis, isi 0.',
    7:'Fokus: isi seluruh Stok Akhir Rokok. Jika habis, isi 0.',
    8:'Fokus: isi saldo modal aktual shift berjalan pada semua kategori.',
    9:'Fokus: periksa ringkasan sebelum menyelesaikan perhitungan.'
  };

  function txt(el){ return String(el?.textContent || '').trim(); }

  function updateVersion(){
    [...document.querySelectorAll('.topbar .status.info')].forEach(el => {
      if (/UI\s+V/i.test(txt(el))) el.textContent = 'UI ' + VERSION;
    });
  }

  function removeAdminControls(){
    document.getElementById('v29AdminOpen')?.remove();
    document.getElementById('v29AdminPanel')?.remove();
  }

  function addFocusCue(section){
    if (!section || section.querySelector(':scope > .v31-focus-cue')) return;
    const i = Number(section.dataset.i ?? -1);
    const head = section.querySelector(':scope > .section-head');
    if (!head) return;
    const cue = document.createElement('div');
    cue.className = 'v31-focus-cue';
    cue.textContent = focusCopy[i] || 'Fokus: lengkapi seluruh isian utama sebelum lanjut.';
    head.insertAdjacentElement('afterend', cue);
  }

  function isStaticRuleNotice(el){
    if (!el?.classList?.contains('notice')) return false;
    if (el.id && ['openingValidationBox','pkgPreviewMessage','cigPreviewMessage','v29ModalConfirmBox'].includes(el.id)) return false;
    if (el.closest('.preview-check-card')) return false;
    const t = txt(el).toLowerCase();
    return /aturan|regulasi|wajib|tidak diizinkan|preview hanya|stok tersedia sudah|jika batas kategori|nota jualan harus/.test(t);
  }

  function collapseRules(section){
    if (!section || section.querySelector(':scope > .v31-rule-drawer')) return;
    const candidates = [...section.querySelectorAll(':scope > .notice')].filter(isStaticRuleNotice);
    if (!candidates.length) return;
    const details = document.createElement('details');
    details.className = 'v31-rule-drawer';
    const summary = document.createElement('summary');
    summary.textContent = 'Aturan & bantuan tahap ini';
    const body = document.createElement('div');
    body.className = 'v31-rule-body';
    details.append(summary, body);
    candidates.forEach(n => body.appendChild(n));
    const footer = section.querySelector(':scope > .footer-actions');
    if (footer) section.insertBefore(details, footer);
    else section.appendChild(details);
  }

  function markForms(section){
    section.querySelectorAll('.card.form').forEach(card => card.classList.add('focus-form-card'));
    section.querySelectorAll('.pkg-end,.cig-end,.stock-correction,.modal-input').forEach(input => {
      input.closest('td')?.classList.add('v31-edit-cell');
      input.closest('.table-wrap')?.classList.add('v31-input-table');
    });
    section.querySelectorAll('input[disabled],input[readonly],select[disabled]').forEach(el => {
      const label = el.closest('.field')?.querySelector('label');
      if (label && !label.querySelector('.v31-auto-tag')) {
        const tag = document.createElement('span');
        tag.className = 'v31-auto-tag';
        tag.textContent = 'OTOMATIS';
        label.appendChild(tag);
      }
    });
  }

  function markLiveFeedback(){
    ['openingValidationBox','pkgPreviewMessage','cigPreviewMessage','v29ModalConfirmBox'].forEach(id => {
      document.getElementById(id)?.classList.add('v31-live-feedback');
    });
  }

  function prioritizeEditableBlocks(section){
    const directNotices = [...section.querySelectorAll(':scope > .notice')];
    const firstFormish = section.querySelector(':scope > .grid, :scope > .card.form, :scope > .table-wrap, :scope > .subtabs, :scope > .subpane');
    if (!firstFormish) return;
    directNotices.filter(n => !isStaticRuleNotice(n)).forEach(n => {
      if (n.classList.contains('red') || n.id) return;
      if (firstFormish.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) {
        // already after
      } else if (!/status|validasi|error|ditolak/i.test(txt(n))) {
        firstFormish.insertAdjacentElement('afterend', n);
      }
    });
  }

  function apply(){
    removeAdminControls();
    updateVersion();
    document.documentElement.dataset.uiVersion = 'v32';
    document.querySelectorAll('.section').forEach(section => {
      addFocusCue(section);
      markForms(section);
      prioritizeEditableBlocks(section);
      collapseRules(section);
    });
    markLiveFeedback();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, {once:true});
  else apply();
})();
