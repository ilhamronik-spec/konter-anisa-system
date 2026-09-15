/* Konter Anisa V29 — Core Regulations */
(() => {
  'use strict';

  const VERSION = 'V30 — KARYAWAN ROLE';
  const DEFAULT_MIN_MARGIN = 1000;
  const PRICE_DROP_APPROVAL_TRIGGER = 3000;
  const ACTIVE_SHIFT = {
    id: '2026-09-13-full-rifda',
    label: '13 September 2026 • Shift Full • Rifda'
  };

  const STORE = {
    exceptions: 'ka_v29_margin_exceptions',
    approvals: 'ka_v29_price_approvals',
    notes: 'ka_v29_purchasing_notes',
    usedNotes: 'ka_v29_used_notes'
  };

  const seedNotes = [
    { id: 'NBJ-0913-01', type: 'package', amount: 1680000, shiftId: ACTIVE_SHIFT.id, shiftLabel: ACTIVE_SHIFT.label, uploadedAt: '07:18', status: 'ready' },
    { id: 'NBJ-0913-02', type: 'cigarette', amount: 850000, shiftId: ACTIVE_SHIFT.id, shiftLabel: ACTIVE_SHIFT.label, uploadedAt: '09:02', status: 'ready' },
    { id: 'NBO-0913-01', type: 'operational', amount: 10000, shiftId: ACTIVE_SHIFT.id, shiftLabel: ACTIVE_SHIFT.label, uploadedAt: '10:15', status: 'ready' }
  ];

  const state = window.KARegulationsV29 = {
    activeShift: ACTIVE_SHIFT,
    modalConfirmed: false,
    exceptions: load(STORE.exceptions, {}),
    approvals: load(STORE.approvals, {}),
    notes: load(STORE.notes, null) || seedNotes,
    usedNotes: load(STORE.usedNotes, {})
  };

  save(STORE.notes, state.notes);

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }
  function fmtMoney(n) {
    const v = Math.round(Number(n) || 0);
    if (typeof window.fmt === 'function') return window.fmt(v);
    return 'Rp' + v.toLocaleString('id-ID');
  }
  function toast(msg, type = 'warn') {
    if (typeof window.uiToast === 'function') window.uiToast(msg, type);
    else alert(msg);
  }
  function activeStep() {
    return Number(document.querySelector('.section.active')?.dataset.i ?? -1);
  }
  function text(el) { return String(el?.textContent || '').trim(); }
  function normIdFromOption(value) { return String(value || '').split('•')[0].trim(); }
  function fieldControlByLabel(section, labelText) {
    if (!section) return null;
    const fields = [...section.querySelectorAll('.field')];
    const f = fields.find(x => text(x.querySelector('label')).toLowerCase().includes(labelText.toLowerCase()));
    return f?.querySelector('select,input,textarea') || null;
  }
  function noteById(id) { return state.notes.find(n => n.id === id) || null; }
  function noteUsable(note, type) {
    return !!note && note.type === type && note.shiftId === ACTIVE_SHIFT.id && note.status !== 'void';
  }
  function noteUsed(id) { return !!state.usedNotes[id]; }
  function markNoteUsed(id, area) {
    state.usedNotes[id] = { area, at: new Date().toISOString(), shiftId: ACTIVE_SHIFT.id };
    save(STORE.usedNotes, state.usedNotes);
    refreshNoteSelectors();
  }
  function freeNote(id) {
    if (state.usedNotes[id]) {
      delete state.usedNotes[id];
      save(STORE.usedNotes, state.usedNotes);
      refreshNoteSelectors();
    }
  }

  function currentException(type, name) {
    const key = type + '::' + name;
    const ex = state.exceptions[key];
    if (!ex) return null;
    if (ex.expires && new Date(ex.expires + 'T23:59:59') < new Date()) return null;
    return ex;
  }
  function effectiveMinMargin(type, name) {
    const ex = currentException(type, name);
    return ex ? Math.max(0, Number(ex.minMargin) || 0) : DEFAULT_MIN_MARGIN;
  }
  function approvalKey(type, name, oldSell, newSell) {
    return [type, name, Math.round(oldSell), Math.round(newSell)].join('::');
  }
  function requestPriceApproval(type, name, oldSell, newSell, base) {
    const key = approvalKey(type, name, oldSell, newSell);
    if (!state.approvals[key]) {
      state.approvals[key] = {
        key, type, name, oldSell, newSell, base,
        oldMargin: oldSell - base,
        newMargin: newSell - base,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };
      save(STORE.approvals, state.approvals);
      renderAdminPanel();
    }
    return state.approvals[key];
  }
  function priceDropNeedsApproval(type, name, oldSell, newSell, base) {
    if (!(newSell < oldSell && (oldSell - base) > PRICE_DROP_APPROVAL_TRIGGER)) return false;
    const rec = state.approvals[approvalKey(type, name, oldSell, newSell)];
    return !rec || rec.status !== 'approved';
  }

  function ensureNoteSelects() {
    const pkgSection = document.querySelector('#buy-paket');
    const cigSection = document.querySelector('#buy-rokok');
    const pkgSel = fieldControlByLabel(pkgSection, 'Nota Purchasing');
    const cigSel = fieldControlByLabel(cigSection, 'Nota Purchasing');
    if (pkgSel) pkgSel.id = 'pkgNoteV29';
    if (cigSel) cigSel.id = 'cigNoteV29';
  }

  function populateNoteSelect(select, type) {
    if (!select) return;
    const current = normIdFromOption(select.value || select.options?.[select.selectedIndex]?.text);
    const notes = state.notes.filter(n => noteUsable(n, type));
    select.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = '— Pilih nota Purchasing —';
    select.appendChild(ph);
    notes.forEach(n => {
      const o = document.createElement('option');
      o.value = n.id;
      o.disabled = noteUsed(n.id);
      o.textContent = `${n.id} • ${fmtMoney(n.amount)} • ${n.shiftLabel}${noteUsed(n.id) ? ' • SUDAH DIPAKAI' : ''}`;
      select.appendChild(o);
    });
    if (current && notes.some(n => n.id === current && !noteUsed(n.id))) select.value = current;
  }

  function refreshNoteSelectors() {
    ensureNoteSelects();
    populateNoteSelect(document.getElementById('pkgNoteV29'), 'package');
    populateNoteSelect(document.getElementById('cigNoteV29'), 'cigarette');
    populateNoteSelect(document.getElementById('opReceipt'), 'operational');
    syncOperationalFromNote();
  }

  function selectedNote(selectId, type) {
    const sel = document.getElementById(selectId);
    const id = normIdFromOption(sel?.value || sel?.options?.[sel?.selectedIndex]?.text);
    const note = noteById(id);
    if (!id || !noteUsable(note, type)) return null;
    return note;
  }

  function packagePurchaseTotal() {
    if (typeof pkgCatalog === 'undefined') return 0;
    return pkgCatalog.reduce((sum, p) => sum + (Number(p.purchaseQty || 0) * Number(p.activeBase || p.base || 0)), 0);
  }
  function cigarettePurchaseTotal() {
    if (typeof cigCatalog === 'undefined') return 0;
    return cigCatalog.reduce((sum, c) => sum + Number(c.purchaseCost || 0), 0);
  }

  function validateNoteExact(type, note, actual) {
    if (!note) {
      toast('ATURAN MATI: pilih Nota Purchasing yang terikat ke shift aktif terlebih dahulu.', 'bad');
      return false;
    }
    if (noteUsed(note.id)) {
      toast(`ATURAN MATI: ${note.id} sudah dipakai dan tidak boleh digunakan dua kali.`, 'bad');
      return false;
    }
    if (note.shiftId !== ACTIVE_SHIFT.id) {
      toast('ATURAN MATI: nota ini bukan milik shift yang sedang aktif.', 'bad');
      return false;
    }
    if (Math.round(actual) !== Math.round(note.amount)) {
      toast(`ATURAN MATI: total ${type} ${fmtMoney(actual)} harus sama persis dengan nota ${note.id} ${fmtMoney(note.amount)}.`, 'bad');
      return false;
    }
    return true;
  }

  function validatePackageRules() {
    const purchaseCount = typeof pkgCatalog === 'undefined' ? 0 : pkgCatalog.filter(p => Number(p.purchaseQty || 0) > 0).length;
    if (purchaseCount === 0) return true;
    const note = selectedNote('pkgNoteV29', 'package');
    const total = packagePurchaseTotal();
    if (!validateNoteExact('belanja Paket', note, total)) return false;

    const bad = [];
    const approvalsNeeded = [];
    pkgCatalog.forEach(p => {
      if (Number(p.purchaseQty || 0) <= 0) return;
      const base = Number(p.activeBase || p.base || 0);
      const sell = Number(p.activeSell || p.sell || 0);
      const min = effectiveMinMargin('package', p.name);
      const margin = sell - base;
      if (margin < min) bad.push(`${p.name}: ${fmtMoney(margin)} < minimum ${fmtMoney(min)}`);
      const oldSell = Number(p.sell || sell);
      const oldBase = Number(p.base || base);
      if (sell < oldSell && (oldSell - oldBase) > PRICE_DROP_APPROVAL_TRIGGER && priceDropNeedsApproval('package', p.name, oldSell, sell, base)) {
        requestPriceApproval('package', p.name, oldSell, sell, base);
        approvalsNeeded.push(p.name);
      }
    });

    if (bad.length) {
      toast('ATURAN MATI MARGIN PAKET: ' + bad.slice(0, 3).join(' • ') + (bad.length > 3 ? ` • +${bad.length - 3} item` : ''), 'bad');
      return false;
    }
    if (approvalsNeeded.length) {
      toast('Harga jual diturunkan dari produk dengan margin lama > Rp3.000. Menunggu konfirmasi Admin: ' + approvalsNeeded.join(', '), 'warn');
      return false;
    }
    return true;
  }

  function validateCigaretteRules() {
    const purchaseCount = typeof cigCatalog === 'undefined' ? 0 : cigCatalog.filter(c => Number(c.purchaseQty || 0) > 0).length;
    if (purchaseCount === 0) return true;
    const note = selectedNote('cigNoteV29', 'cigarette');
    const total = cigarettePurchaseTotal();
    if (!validateNoteExact('belanja Rokok', note, total)) return false;

    const bad = [];
    const approvalsNeeded = [];
    cigCatalog.forEach(c => {
      const q = Number(c.purchaseQty || 0);
      if (q <= 0) return;
      const unitBase = Number(c.purchaseCost || 0) / q;
      const sell = Number(c.sell || 0);
      const min = effectiveMinMargin('cigarette', c.name);
      const margin = sell - unitBase;
      if (margin < min) bad.push(`${c.name}: ${fmtMoney(margin)} < minimum ${fmtMoney(min)}`);
      const oldSell = Number(c._v29OriginalSell ?? c.sell ?? sell);
      const oldBase = Number(c.base || unitBase);
      if (sell < oldSell && (oldSell - oldBase) > PRICE_DROP_APPROVAL_TRIGGER && priceDropNeedsApproval('cigarette', c.name, oldSell, sell, unitBase)) {
        requestPriceApproval('cigarette', c.name, oldSell, sell, unitBase);
        approvalsNeeded.push(c.name);
      }
    });

    if (bad.length) {
      toast('ATURAN MATI MARGIN ROKOK: ' + bad.slice(0, 3).join(' • ') + (bad.length > 3 ? ` • +${bad.length - 3} item` : ''), 'bad');
      return false;
    }
    if (approvalsNeeded.length) {
      toast('Penurunan harga jual Rokok menunggu konfirmasi Admin: ' + approvalsNeeded.join(', '), 'warn');
      return false;
    }
    return true;
  }

  function syncOperationalFromNote() {
    const sel = document.getElementById('opReceipt');
    const amountEl = document.getElementById('opAmount');
    if (!sel || !amountEl) return;
    const note = selectedNote('opReceipt', 'operational');
    amountEl.readOnly = true;
    amountEl.setAttribute('aria-readonly', 'true');
    if (!note || noteUsed(note.id)) {
      amountEl.value = '';
    } else {
      amountEl.value = Number(note.amount).toLocaleString('id-ID');
    }
    if (typeof window.calcOp === 'function') window.calcOp();
  }

  function validateOperational() {
    const note = selectedNote('opReceipt', 'operational');
    const amount = typeof window.moneyValue === 'function' ? window.moneyValue(document.getElementById('opAmount')) : Number(String(document.getElementById('opAmount')?.value || '').replace(/\D/g, ''));
    if (!validateNoteExact('operasional', note, amount)) return false;
    return true;
  }

  function validateEndingStock(selector, catalog, kind) {
    const inputs = [...document.querySelectorAll(selector)];
    if (!inputs.length) return true;
    let firstBad = null;
    const errors = [];
    inputs.forEach((el, ix) => {
      el.classList.remove('hard-block-input');
      const raw = String(el.value ?? '').trim();
      if (raw === '') {
        errors.push(`${kind} ${ix + 1} belum diisi`);
        el.classList.add('hard-block-input');
        if (!firstBad) firstBad = el;
        return;
      }
      const v = Number(raw);
      const max = Number(el.max);
      if (!Number.isFinite(v) || v < 0) {
        errors.push(`${kind} ${ix + 1} tidak valid/minus`);
        el.classList.add('hard-block-input');
        if (!firstBad) firstBad = el;
      } else if (Number.isFinite(max) && max >= 0 && v > max) {
        errors.push(`${kind} ${ix + 1} melebihi stok tersedia`);
        el.classList.add('hard-block-input');
        if (!firstBad) firstBad = el;
      }
    });
    if (errors.length) {
      toast(`ATURAN MATI: semua stok ${kind} wajib diisi. Jika stok fisik kosong/habis, isi angka 0. ${errors.length} kolom belum valid.`, 'bad');
      firstBad?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstBad?.focus();
      return false;
    }
    return true;
  }

  function installModalConfirmation() {
    const pane = document.getElementById('opening-modal');
    if (!pane || document.getElementById('v29ModalConfirmBox')) return;
    const box = document.createElement('div');
    box.id = 'v29ModalConfirmBox';
    box.className = 'notice amber';
    box.style.margin = '0 0 12px';
    box.innerHTML = `<b>WAJIB KONFIRMASI MODAL SEBELUMNYA.</b> Periksa seluruh kategori modal bawaan. Jika sudah benar, klik konfirmasi. Perubahan setelah konfirmasi akan membatalkan konfirmasi.<div style="margin-top:10px"><button type="button" class="btn primary" id="v29ConfirmModalBtn">Konfirmasi Modal Sebelumnya</button> <span class="status warn" id="v29ModalConfirmStatus">Belum dikonfirmasi</span></div>`;
    pane.prepend(box);

    const summary = document.querySelector('.section[data-i="0"] .card.summary');
    if (summary && !document.getElementById('v29ModalSummary')) {
      const row = document.createElement('div');
      row.className = 'sumrow';
      row.innerHTML = '<span>Konfirmasi Modal Sebelumnya</span><b id="v29ModalSummary" style="color:var(--orange)">Belum Dikonfirmasi</b>';
      const validationBox = document.getElementById('openingValidationBox');
      if (validationBox) summary.insertBefore(row, validationBox);
      else summary.appendChild(row);
    }

    document.getElementById('v29ConfirmModalBtn')?.addEventListener('click', () => {
      state.modalConfirmed = true;
      updateModalConfirmationUI();
      toast('Modal shift sebelumnya sudah dikonfirmasi.', 'ok');
    });
    pane.querySelectorAll('input').forEach(el => el.addEventListener('input', () => {
      if (state.modalConfirmed) {
        state.modalConfirmed = false;
        updateModalConfirmationUI();
      }
    }));
    updateModalConfirmationUI();
  }

  function updateModalConfirmationUI() {
    const st = document.getElementById('v29ModalConfirmStatus');
    const sm = document.getElementById('v29ModalSummary');
    const btn = document.getElementById('v29ConfirmModalBtn');
    if (st) {
      st.className = 'status ' + (state.modalConfirmed ? 'ok' : 'warn');
      st.textContent = state.modalConfirmed ? 'Sudah dikonfirmasi' : 'Belum dikonfirmasi';
    }
    if (sm) {
      sm.textContent = state.modalConfirmed ? 'Dikonfirmasi' : 'Belum Dikonfirmasi';
      sm.style.color = state.modalConfirmed ? 'var(--green)' : 'var(--orange)';
    }
    if (btn) btn.textContent = state.modalConfirmed ? '✓ Modal Sudah Dikonfirmasi' : 'Konfirmasi Modal Sebelumnya';
  }

  function openingAllConfirmed() {
    let pkg = false, cig = false;
    try { pkg = !!openingPkgPreviewConfirmed; } catch (_) {}
    try { cig = !!openingCigPreviewConfirmed; } catch (_) {}
    return state.modalConfirmed && pkg && cig;
  }

  function injectRulesSummary() {
    const section = document.querySelector('.section[data-i="0"]');
    if (!section || document.getElementById('v29RuleSummary')) return;
    const box = document.createElement('div');
    box.id = 'v29RuleSummary';
    box.className = 'notice red';
    box.innerHTML = '<b>REGULASI V29 AKTIF:</b> Stok Paket + Rokok + Modal sebelumnya wajib dikonfirmasi • stok minus ditolak • semua stok akhir wajib diisi (0 jika habis) • Belanja & Operasional wajib Nota Purchasing sesuai nominal dan shift • margin Paket/Rokok minimum Rp1.000 kecuali exception Admin • penurunan harga jual dari margin lama > Rp3.000 wajib approval Admin.';
    section.insertBefore(box, section.children[2] || null);
  }

  function buildAdminPanel() {
    if (document.getElementById('v29AdminPanel')) return;
    const topbar = document.querySelector('.topbar');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.id = 'v29AdminOpen';
    btn.textContent = '⚙ Regulasi Admin';
    btn.style.marginLeft = '10px';
    topbar?.querySelector('.user')?.prepend(btn);

    const panel = document.createElement('div');
    panel.id = 'v29AdminPanel';
    panel.innerHTML = `
      <div class="v29-admin-shell">
        <div class="section-head"><div><h3>Regulasi Admin</h3><p>Pengecualian margin, approval penurunan harga, dan Nota Purchasing terikat shift aktif.</p></div><button type="button" class="btn" id="v29AdminClose">Tutup ✕</button></div>
        <div class="notice blue"><b>Shift aktif saat ini:</b> ${ACTIVE_SHIFT.label}. Nota baru otomatis dikunci ke shift ini pada saat di-upload Purchasing.</div>
        <div class="grid two-equal">
          <div class="card form">
            <h4 style="margin-top:0">Pengecualian Minimum Margin Produk</h4>
            <div class="form-grid">
              <div class="field"><label>Jenis</label><select id="v29ExType" class="select"><option value="package">Paket</option><option value="cigarette">Rokok</option></select></div>
              <div class="field"><label>Produk</label><select id="v29ExProduct" class="select"></select></div>
              <div class="field"><label>Minimum Margin Khusus</label><input id="v29ExMin" class="input" type="number" min="0" value="500"></div>
              <div class="field"><label>Berlaku Sampai (opsional)</label><input id="v29ExExpiry" class="input" type="date"></div>
              <div class="field" style="grid-column:1/-1"><label>Alasan Admin (wajib)</label><input id="v29ExReason" class="input" placeholder="Contoh: produk promo / margin supplier khusus"></div>
            </div>
            <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="v29SaveException">Simpan Regulasi Produk</button></div>
            <div id="v29ExceptionList" style="margin-top:14px"></div>
          </div>
          <div class="card form">
            <h4 style="margin-top:0">Approval Penurunan Harga Jual</h4>
            <div id="v29ApprovalList"></div>
          </div>
        </div>
        <div class="card form" style="margin-top:14px">
          <h4 style="margin-top:0">Purchasing — Upload Nota ke Shift Aktif</h4>
          <div class="form-grid">
            <div class="field"><label>No. Nota</label><input id="v29NoteId" class="input" placeholder="Contoh NBJ-0913-03"></div>
            <div class="field"><label>Jenis</label><select id="v29NoteType" class="select"><option value="package">Belanja Paket</option><option value="cigarette">Belanja Rokok</option><option value="operational">Operasional</option></select></div>
            <div class="field"><label>Nominal Nota</label><input id="v29NoteAmount" class="input" inputmode="numeric" placeholder="0"></div>
            <div class="field"><label>Keterangan</label><input id="v29NoteDesc" class="input" placeholder="Opsional"></div>
          </div>
          <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="v29UploadNote">Upload Nota Purchasing</button></div>
          <div id="v29NoteList" style="margin-top:14px"></div>
        </div>
      </div>`;
    document.body.appendChild(panel);

    btn.addEventListener('click', () => { panel.classList.add('open'); renderAdminPanel(); });
    document.getElementById('v29AdminClose')?.addEventListener('click', () => panel.classList.remove('open'));
    document.getElementById('v29ExType')?.addEventListener('change', refreshExceptionProducts);
    document.getElementById('v29SaveException')?.addEventListener('click', saveExceptionFromUI);
    document.getElementById('v29UploadNote')?.addEventListener('click', uploadNoteFromUI);
    panel.addEventListener('click', e => {
      const b = e.target.closest('[data-v29-action]');
      if (!b) return;
      const action = b.dataset.v29Action;
      const key = decodeURIComponent(b.dataset.key || '');
      if (action === 'delete-exception') {
        delete state.exceptions[key]; save(STORE.exceptions, state.exceptions); renderAdminPanel();
      }
      if (action === 'approve-price' && state.approvals[key]) {
        state.approvals[key].status = 'approved'; state.approvals[key].approvedAt = new Date().toISOString(); save(STORE.approvals, state.approvals); renderAdminPanel();
      }
      if (action === 'reject-price' && state.approvals[key]) {
        state.approvals[key].status = 'rejected'; state.approvals[key].rejectedAt = new Date().toISOString(); save(STORE.approvals, state.approvals); renderAdminPanel();
      }
    });
    refreshExceptionProducts();
    renderAdminPanel();
  }

  function refreshExceptionProducts() {
    const type = document.getElementById('v29ExType')?.value || 'package';
    const sel = document.getElementById('v29ExProduct');
    if (!sel) return;
    const arr = type === 'package' ? (typeof pkgCatalog !== 'undefined' ? pkgCatalog : []) : (typeof cigCatalog !== 'undefined' ? cigCatalog : []);
    sel.innerHTML = arr.map(x => `<option value="${escapeHtml(x.name)}">${escapeHtml(x.name)}</option>`).join('');
  }
  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function saveExceptionFromUI() {
    const type = document.getElementById('v29ExType').value;
    const name = document.getElementById('v29ExProduct').value;
    const minMargin = Math.max(0, Number(document.getElementById('v29ExMin').value || 0));
    const expires = document.getElementById('v29ExExpiry').value;
    const reason = document.getElementById('v29ExReason').value.trim();
    if (!name || !reason) return toast('Nama produk dan alasan Admin wajib diisi.', 'warn');
    const key = type + '::' + name;
    state.exceptions[key] = { type, name, minMargin, expires, reason, createdAt: new Date().toISOString() };
    save(STORE.exceptions, state.exceptions);
    document.getElementById('v29ExReason').value = '';
    renderAdminPanel();
    toast(`Regulasi margin khusus ${name} disimpan: minimum ${fmtMoney(minMargin)}.`, 'ok');
  }
  function uploadNoteFromUI() {
    const id = document.getElementById('v29NoteId').value.trim().toUpperCase();
    const type = document.getElementById('v29NoteType').value;
    const raw = document.getElementById('v29NoteAmount').value;
    const amount = Number(String(raw).replace(/[^0-9]/g, ''));
    const description = document.getElementById('v29NoteDesc').value.trim();
    if (!id || amount <= 0) return toast('No. nota dan nominal harus diisi.', 'warn');
    if (state.notes.some(n => n.id === id)) return toast('No. nota sudah ada. Gunakan nomor nota lain.', 'bad');
    state.notes.push({ id, type, amount, description, shiftId: ACTIVE_SHIFT.id, shiftLabel: ACTIVE_SHIFT.label, uploadedAt: new Date().toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}), status: 'ready' });
    save(STORE.notes, state.notes);
    document.getElementById('v29NoteId').value = '';
    document.getElementById('v29NoteAmount').value = '';
    document.getElementById('v29NoteDesc').value = '';
    refreshNoteSelectors(); renderAdminPanel();
    toast(`Nota ${id} otomatis terikat ke ${ACTIVE_SHIFT.label}.`, 'ok');
  }

  function renderAdminPanel() {
    const exList = document.getElementById('v29ExceptionList');
    if (exList) {
      const rows = Object.entries(state.exceptions).filter(([,v]) => currentException(v.type, v.name)).map(([k,v]) => `<div class="v29-rule-row"><div><b>${escapeHtml(v.type === 'package' ? 'Paket' : 'Rokok')} • ${escapeHtml(v.name)}</b><small>Minimum ${fmtMoney(v.minMargin)} • ${escapeHtml(v.reason)}${v.expires ? ' • s.d. ' + escapeHtml(v.expires) : ''}</small></div><button class="btn" type="button" data-v29-action="delete-exception" data-key="${encodeURIComponent(k)}">Hapus</button></div>`).join('');
      exList.innerHTML = rows || '<div class="notice blue">Belum ada pengecualian. Semua produk memakai minimum margin Rp1.000.</div>';
    }
    const apList = document.getElementById('v29ApprovalList');
    if (apList) {
      const rows = Object.values(state.approvals).map(v => `<div class="v29-rule-row"><div><b>${escapeHtml(v.name)}</b><small>${fmtMoney(v.oldSell)} → ${fmtMoney(v.newSell)} • margin ${fmtMoney(v.oldMargin)} → ${fmtMoney(v.newMargin)} • <b>${escapeHtml(v.status.toUpperCase())}</b></small></div>${v.status === 'pending' ? `<div class="actions"><button class="btn primary" data-v29-action="approve-price" data-key="${encodeURIComponent(v.key)}">Setujui</button><button class="btn danger" data-v29-action="reject-price" data-key="${encodeURIComponent(v.key)}">Tolak</button></div>` : ''}</div>`).join('');
      apList.innerHTML = rows || '<div class="notice blue">Belum ada permintaan penurunan harga.</div>';
    }
    const noteList = document.getElementById('v29NoteList');
    if (noteList) {
      noteList.innerHTML = state.notes.map(n => `<div class="v29-rule-row"><div><b>${escapeHtml(n.id)} • ${fmtMoney(n.amount)}</b><small>${escapeHtml(n.type)} • ${escapeHtml(n.shiftLabel)} • upload ${escapeHtml(n.uploadedAt || '-')}</small></div><span class="status ${noteUsed(n.id) ? 'warn' : 'ok'}">${noteUsed(n.id) ? 'Dipakai' : 'Siap'}</span></div>`).join('');
    }
  }

  function installCaptureGuards() {
    document.addEventListener('click', e => {
      const el = e.target.closest('button,a');
      if (!el) return;
      const action = el.getAttribute('data-ui-click') || '';
      const step = activeStep();

      if (el.id === 'pkgPreviewTopBtn' || action.includes('savePackagePreview')) {
        if (!validatePackageRules()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      }
      if (el.id === 'cigPreviewTopBtn' || action.includes('saveCigarettePreview')) {
        if (!validateCigaretteRules()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      }
      if (el.id === 'pkgConfirmPreviewBtn') {
        if (!validatePackageRules()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
        const note = selectedNote('pkgNoteV29', 'package'); if (note) setTimeout(() => markNoteUsed(note.id, 'package'), 0);
      }
      if (el.id === 'cigConfirmPreviewBtn') {
        if (!validateCigaretteRules()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
        const note = selectedNote('cigNoteV29', 'cigarette'); if (note) setTimeout(() => markNoteUsed(note.id, 'cigarette'), 0);
      }
      if (action.includes('addOperationalEntry')) {
        if (!validateOperational()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
        const note = selectedNote('opReceipt', 'operational'); if (note) setTimeout(() => markNoteUsed(note.id, 'operational'), 0);
      }
      if (action.startsWith('removeOp(')) {
        const current = normIdFromOption(document.getElementById('opReceipt')?.value);
        if (current) setTimeout(() => freeNote(current), 0);
      }

      const isForward = action.includes('nextStep') || action.includes('smartNextStep') || el.id === 'globalNextBtn' || el.id === 'openingNextBtn';
      if (!isForward) return;

      if (step === 0 && !openingAllConfirmed()) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!state.modalConfirmed) {
          document.getElementById('stockTabModal')?.click();
          document.getElementById('v29ModalConfirmBox')?.scrollIntoView({behavior:'smooth', block:'center'});
          toast('WAJIB: konfirmasi Modal Sebelumnya, Stok Paket, dan Stok Rokok sebelum lanjut.', 'bad');
        } else toast('WAJIB: Preview & Konfirmasi Stok Paket dan Stok Rokok sebelumnya belum lengkap.', 'bad');
        return;
      }
      if (step === 6 && !validateEndingStock('.pkg-end', typeof pkgCatalog !== 'undefined' ? pkgCatalog : [], 'Paket')) {
        e.preventDefault(); e.stopImmediatePropagation(); return;
      }
      if (step === 7 && !validateEndingStock('.cig-end', typeof cigCatalog !== 'undefined' ? cigCatalog : [], 'Rokok')) {
        e.preventDefault(); e.stopImmediatePropagation(); return;
      }
    }, true);

    document.getElementById('opReceipt')?.addEventListener('change', syncOperationalFromNote);

    document.addEventListener('input', e => {
      if (e.target.matches('.pkg-end,.cig-end')) {
        const raw = String(e.target.value ?? '').trim();
        if (raw !== '' && Number(raw) < 0) {
          e.target.value = '';
          e.target.classList.add('hard-block-input');
          toast('ATURAN MATI: stok tidak boleh minus. Isi 0 jika stok fisik habis.', 'bad');
        }
      }
    }, true);
  }

  function updateVersionBadge() {
    const badge = [...document.querySelectorAll('.topbar .status.info')].find(x => text(x).includes('UI V'));
    if (badge) badge.textContent = 'UI ' + VERSION;
  }

  function init() {
    if (typeof cigCatalog !== 'undefined') cigCatalog.forEach(c => { if (c._v29OriginalSell == null) c._v29OriginalSell = Number(c.sell || 0); });
    updateVersionBadge();
    ensureNoteSelects();
    refreshNoteSelectors();
    installModalConfirmation();
    injectRulesSummary();
    // Admin/Purchasing controls are intentionally NOT rendered in the Karyawan portal.
    document.getElementById('v29AdminOpen')?.remove();
    document.getElementById('v29AdminPanel')?.remove();
    installCaptureGuards();
    syncOperationalFromNote();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
