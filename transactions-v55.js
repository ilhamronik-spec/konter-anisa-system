/* Konter Anisa V55 — Enter to save active transaction form */
(function(){
  'use strict';

  const byId=id=>document.getElementById(id);

  function isVisible(el){
    if(!el) return false;
    const cs=getComputedStyle(el);
    return cs.display!=='none' && cs.visibility!=='hidden' && !el.hidden;
  }

  function findSubmitButton(target){
    const formCard=target.closest('.card.form');
    if(!formCard) return null;

    const candidates=[...formCard.querySelectorAll('button.btn.primary, button[type="button"]')];
    return candidates.find(btn=>{
      if(!isVisible(btn) || btn.disabled) return false;
      const txt=String(btn.textContent||'').toLowerCase();
      const action=String(btn.getAttribute('data-ui-click')||'').toLowerCase();
      const id=String(btn.id||'').toLowerCase();
      return /tambah|tambahkan|simpan/.test(txt)
        || /addtxn|addoperationalentry/.test(action)
        || /add$/.test(id);
    }) || null;
  }

  function shouldHandle(e){
    if(e.key!=='Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || e.isComposing || e.repeat) return false;
    const t=e.target;
    if(!(t instanceof HTMLElement)) return false;
    if(t.matches('textarea,button,[contenteditable="true"]')) return false;
    if(!t.matches('input,select')) return false;

    const pane=t.closest('.tx-pane.active');
    if(!pane) return false;
    if(!isVisible(pane)) return false;

    // Search boxes should keep their own Enter behavior.
    if(String(t.type||'').toLowerCase()==='search') return false;
    return true;
  }

  function installHints(){
    document.querySelectorAll('.tx-pane .card.form').forEach(card=>{
      if(card.querySelector('.v55-enter-hint')) return;
      const actions=card.querySelector('.actions');
      if(!actions) return;
      const hint=document.createElement('span');
      hint.className='v55-enter-hint';
      hint.textContent='↵ Enter = Tambahkan ke Daftar';
      hint.style.cssText='align-self:center;font-size:10px;font-weight:800;color:#7c3aed;background:#f5f0ff;border:1px solid #ddd6fe;border-radius:999px;padding:6px 9px';
      actions.appendChild(hint);
    });
  }

  document.addEventListener('keydown',e=>{
    if(!shouldHandle(e)) return;
    const btn=findSubmitButton(e.target);
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    btn.click();

    // Setelah transaksi tersimpan, kembalikan fokus ke input pertama yang masih aktif
    // supaya input berulang lebih cepat.
    setTimeout(()=>{
      const card=e.target.closest('.card.form');
      const first=card?.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled])');
      if(first && isVisible(first)) first.focus({preventScroll:true});
    },0);
  },true);

  function refresh(){
    installHints();
    document.querySelectorAll('.topbar .status.info').forEach(el=>{
      if(/UI\s+V/i.test(String(el.textContent||''))) el.textContent='UI V61 — MINYAK + LISTRIK + ADMIN + AUTOSAVE';
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();

  // Modul transaksi dinamis dibuat setelah DOMContentLoaded; scan singkat agar hint ikut muncul.
  setTimeout(refresh,250);
  setTimeout(refresh,900);

  window.KAEnterSaveV55={refresh};
})();
