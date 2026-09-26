/* Konter Anisa Final Submit V1 — explicit handoff Karyawan -> Admin */
(() => {
  'use strict';

  const SUM='ka_admin_shift_summaries_v1';
  const AUTH='ka_auth_session_v81';

  const $=id=>document.getElementById(id);
  const read=(k,f)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x==null?f:x}catch(_){return f}};
  const write=(k,v)=>{
    const raw=JSON.stringify(v);
    localStorage.setItem(k,raw);
    try{window.dispatchEvent(new StorageEvent('storage',{key:k,newValue:raw,storageArea:localStorage,url:location.href}))}catch(_){}
  };
  const fmt=n=>'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');
  const slug=v=>String(v||'unknown').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'unknown';

  function shiftContext(){
    const a=window.KARegulationsV29?.activeShift||{};
    const b=window.KA_SHIFT_CONTEXT||{};
    const q=new URLSearchParams(location.search);
    const date=String(a.date||b.date||q.get('sim_date')||'').trim();
    const shift=String(a.shift||b.shift||q.get('sim_shift')||'Full').trim();
    const holder=String(a.holder||b.holder||q.get('sim_holder')||'Karyawan').trim();
    const id=String(a.id||b.id||(date?date+'-'+slug(shift)+'-'+slug(holder):'')).trim();
    const label=String(a.label||b.label||(date?date+' • Shift '+shift+' • '+holder:id));
    return {id,date,shift,holder,label};
  }

  function actorName(){
    const session=read(AUTH,null)||{};
    const master=read('ka_admin_accounts_v59',null);
    const list=Array.isArray(master)?master:Array.isArray(master?.accounts)?master.accounts:[];
    const acc=list.find(x=>String(x?.id||'')===String(session?.accountId||''));
    return String(acc?.name||shiftContext().holder||'Karyawan');
  }

  function balanceState(){
    try{return window.KABalanceV44?.balanceSnapshot?.(false)||null}catch(_){return null}
  }

  function completeState(){
    const value=$('v44BalanceValue');
    return !!(value && !/BELUM\s+BISA\s+DIHITUNG/i.test(String(value.textContent||'')));
  }

  function adminUrl(){
    const s=shiftContext();
    const u=new URL('./admin.html',location.href);
    u.searchParams.set('view','margin');
    if(s.id)u.searchParams.set('shift',s.id);
    return u.href;
  }

  function setStatus(text,type='info'){
    const el=$('kaFinalSubmitStatus');if(!el)return;
    el.className='notice '+(type==='ok'?'green':type==='bad'?'red':type==='warn'?'amber':'blue');
    el.innerHTML=text;
  }

  function markSubmitted(balance){
    const s=shiftContext();
    if(!s.id)throw new Error('ID shift tidak ditemukan.');
    const map=read(SUM,{})||{};
    const rec=map[s.id];
    if(!rec)throw new Error('Snapshot Admin belum terbentuk. Klik Hitung Ulang Balance lalu coba lagi.');
    const b=balance||{};
    const now=new Date().toISOString();
    map[s.id]={
      ...rec,
      submissionStatus:'submitted',
      submittedAt:now,
      submittedBy:actorName(),
      submissionRevision:Number(rec.submissionRevision||0)+1,
      submittedBalance:Number(b?.balance??rec.balance??0),
      submittedMargin:Number(b?.margin??rec.margin??0),
      submittedModalClosing:Number(b?.closing??rec.modalClosing??0),
      savedAt:Date.now()
    };
    write(SUM,map);
    return map[s.id];
  }

  async function submitFinal(){
    const btn=$('kaSubmitFinalBtn');
    try{
      const finalBalance=balanceState();
      if(!(finalBalance&&finalBalance.complete&&finalBalance.pkgComplete&&finalBalance.cigComplete)){
        setStatus('<b>Belum dapat dikirim.</b> Lengkapi Stok Akhir Paket, Stok Akhir Rokok, dan seluruh 25 Modal Inputan terlebih dahulu.','bad');
        return;
      }
      if(btn)btn.disabled=true;
      setStatus('<b>Menyimpan hitungan final…</b> Snapshot shift sedang dipastikan lengkap.','info');

      try{window.KAAutosaveV53?.save?.()}catch(_){}
      try{window.KAAdminBridgeV1?.snapshot?.()}catch(_){}

      // Snapshot bridge memakai DOM live; beri satu tick agar summary lokal sudah tersedia.
      await new Promise(r=>setTimeout(r,80));
      try{window.KAAdminBridgeV1?.snapshot?.()}catch(_){}
      const rec=markSubmitted(finalBalance);

      setStatus('<b>TERSIMPAN KE ADMIN.</b> Balance '+fmt(rec.balance)+' • Margin '+fmt(rec.margin)+'. Menyinkronkan database…','ok');

      // Buka Admin segera setelah simpan lokal. Karena origin sama, Admin langsung
      // membaca snapshot ini; shared DB kemudian menyamakan perangkat lain.
      const opened=window.open(adminUrl(),'_blank');

      let synced=false,paired=false;
      try{
        const st=window.KASharedDBV1?.status?.()||{};
        paired=!!st.paired;
        if(paired)synced=!!(await window.KASharedDBV1.syncNow(true));
      }catch(_){synced=false}

      if(paired&&synced){
        setStatus('<b>SELESAI.</b> Hitungan sudah tersimpan dan tersinkron ke Database Admin. Portal Admin dibuka pada tab baru.','ok');
      }else if(paired){
        setStatus('<b>TERSIMPAN LOKAL.</b> Sinkron database belum berhasil. Data tetap masuk Admin pada browser ini; klik badge DATABASE untuk mencoba sinkron ulang.','warn');
      }else{
        setStatus('<b>TERSIMPAN LOKAL.</b> Database belum dipasangkan. Admin pada browser ini dapat melihat data, tetapi perangkat lain belum menerima sampai DATABASE dipasangkan.','warn');
      }
      if(!opened) setStatus(($('kaFinalSubmitStatus')?.innerHTML||'')+'<br><b>Popup diblokir.</b> Klik tombol Buka Admin.','warn');
    }catch(e){
      console.error('Final submit gagal',e);
      setStatus('<b>Gagal menyimpan ke Admin:</b> '+String(e?.message||e),'bad');
    }finally{
      refresh();
    }
  }

  function openAdmin(){
    window.open(adminUrl(),'_blank');
  }

  function ensureUI(){
    if($('kaFinalSubmitPanel'))return true;
    const section=$('v44-balance-section');
    if(!section)return false;
    const panel=document.createElement('div');
    panel.id='kaFinalSubmitPanel';
    panel.className='card';
    panel.style.marginTop='16px';
    panel.innerHTML=
      '<div class="section-head" style="margin-bottom:10px">'+
        '<div><h4 style="margin:0">Kirim Hitungan ke Admin</h4>'+
        '<p style="margin:4px 0 0;color:var(--muted)">Simpan snapshot final shift, sinkronkan ke database bersama, lalu buka Portal Admin.</p></div>'+
      '</div>'+
      '<div id="kaFinalSubmitStatus" class="notice blue" style="margin-bottom:12px">Belum dikirim ke Admin.</div>'+
      '<div class="actions">'+
        '<button class="btn primary" id="kaSubmitFinalBtn" type="button">SIMPAN & KIRIM KE ADMIN</button>'+
        '<button class="btn" id="kaOpenAdminBtn" type="button">BUKA ADMIN</button>'+
      '</div>';
    section.appendChild(panel);
    $('kaSubmitFinalBtn')?.addEventListener('click',submitFinal);
    $('kaOpenAdminBtn')?.addEventListener('click',openAdmin);
    refresh();
    return true;
  }

  function refresh(){
    if(!ensureUI())return;
    const btn=$('kaSubmitFinalBtn');
    const s=shiftContext();
    const rec=read(SUM,{})?.[s.id];
    const ready=completeState();
    if(btn){
      btn.disabled=!ready;
      btn.title=ready?'Simpan final dan kirim ke Admin':'Lengkapi seluruh data final terlebih dahulu';
    }
    if(rec?.submissionStatus==='submitted'){
      const t=rec.submittedAt?new Date(rec.submittedAt).toLocaleString('id-ID'):'—';
      setStatus('<b>SUDAH DIKIRIM KE ADMIN</b> • '+t+' • revisi '+Number(rec.submissionRevision||1)+' • Balance '+fmt(rec.balance),'ok');
    }else if(!ready){
      setStatus('<b>Belum siap dikirim.</b> Balance final masih menunggu kelengkapan data.','warn');
    }
  }

  function boot(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(ensureUI()||tries>80)clearInterval(timer);
    },150);
    setInterval(refresh,1500);
    window.addEventListener('ka:shared-sync',refresh);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.KAFinalSubmitV1={submitFinal,openAdmin,refresh,shiftContext};
})();