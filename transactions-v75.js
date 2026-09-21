/* Konter Anisa V76 — Belanja Minyak via Nota Purchasing */
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const fmt=n=>{
    try{ if(typeof window.fmt==='function') return window.fmt(Number(n)||0); }catch(_){}
    return 'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');
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
  function legacyKey(){return 'ka_oil_purchase_v75_legacy_'+shiftId();}

  let entries=[];

  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(key())||'[]');
      const arr=Array.isArray(raw)?raw:[];
      const legacy=arr.filter(x=>!x?.noteId);
      if(legacy.length){
        try{localStorage.setItem(legacyKey(),JSON.stringify(legacy));}catch(_){}
      }
      entries=arr.filter(x=>x?.noteId && Number(x?.amount||0)>0);
      if(legacy.length) save();
    }catch(_){entries=[];}
  }

  function save(){
    try{localStorage.setItem(key(),JSON.stringify(entries));}catch(_){}
    try{window.KAAutosaveV53?.save?.();}catch(_){}
  }

  function purchasing(){
    return window.KAPurchasingV56||null;
  }

  function selectedNote(){
    const id=String($('oilBuyNoteSelect')?.value||'').trim();
    if(!id)return null;
    return purchasing()?.getNote?.(id)||null;
  }

  function refreshNotes(){
    try{purchasing()?.refreshNotes?.();}catch(_){}
    const sel=$('oilBuyNoteSelect');
    const msg=$('oilBuyNoteInfo');
    if(!sel||!msg)return;
    const usable=[...sel.options].filter(o=>o.value&&!o.disabled);
    if(!sel.value && usable.length===1) sel.value=usable[0].value;
    const note=selectedNote();
    if(note){
      msg.className='notice blue';
      msg.innerHTML='<b>'+String(note.id)+'</b> • '+fmt(note.amount)
        +(note.description?' • '+String(note.description):'')
        +'<br><span style="font-size:11px">Nominal berasal dari Purchasing dan tidak dapat diubah oleh karyawan.</span>';
    }else if(!usable.length){
      msg.className='notice amber';
      msg.innerHTML='Belum ada Nota Purchasing <b>Belanja Minyak</b> yang siap untuk shift ini.';
    }else{
      msg.className='notice blue';
      msg.innerHTML='Pilih Nota Purchasing Belanja Minyak. Nominal nota akan digunakan otomatis.';
    }
  }

  function render(){
    const body=$('oilBuyList'),count=$('oilBuyCount');
    if(!body||!count)return;

    if(!entries.length){
      body.innerHTML='<tr><td colspan="5" class="multi-empty">Belum ada Nota Belanja Minyak yang digunakan pada shift ini.</td></tr>';
      count.textContent='0 nota';
    }else{
      body.innerHTML=entries.map((x,i)=>`
        <tr>
          <td>${i+1}</td>
          <td><b>${String(x.noteId||'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</b></td>
          <td>${String(x.description||'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</td>
          <td class="money"><b>${fmt(x.amount)}</b></td>
          <td><button class="btn" type="button" data-oil-buy-remove="${i}">Batalkan</button></td>
        </tr>`).join('');
      const total=entries.reduce((s,x)=>s+Number(x.amount||0),0);
      count.textContent=entries.length+' nota • '+fmt(total);

      body.querySelectorAll('[data-oil-buy-remove]').forEach(btn=>btn.addEventListener('click',()=>{
        const ix=Number(btn.dataset.oilBuyRemove);
        const rec=entries[ix];
        if(rec?.noteId) try{purchasing()?.releaseNote?.(rec.noteId);}catch(_){}
        entries.splice(ix,1);
        save();
        render();
        refreshNotes();
        toast('Nota Belanja Minyak dibatalkan dan dapat dipakai kembali.','ok');
      }));
    }

    const total=entries.reduce((s,x)=>s+Number(x.amount||0),0);
    if($('oilBuyTotalCost'))$('oilBuyTotalCost').textContent=fmt(total);
    if($('oilBuyTotalNotes'))$('oilBuyTotalNotes').textContent=String(entries.length)+' nota';
  }

  function useSelected(){
    const note=selectedNote();
    if(!note){
      toast('Pilih Nota Purchasing Belanja Minyak terlebih dahulu.','warn');
      $('oilBuyNoteSelect')?.focus();
      return;
    }
    if(String(note.type||'')!=='oil'){
      toast('Nota yang dipilih bukan Nota Belanja Minyak.','bad');
      return;
    }
    if(String(note.shiftId||'')!==shiftId()){
      toast('Nota bukan milik shift yang sedang aktif.','bad');
      return;
    }
    if(entries.some(x=>x.noteId===note.id) || purchasing()?.isUsed?.(note.id)){
      toast('Nota ini sudah digunakan dan tidak boleh dipakai dua kali.','bad');
      refreshNotes();
      return;
    }
    const ok=purchasing()?.useNote?.(note.id,'oil-purchase');
    if(!ok){
      toast('Nota tidak dapat digunakan. Pastikan nota masih aktif dan belum dipakai.','bad');
      refreshNotes();
      return;
    }

    entries.push({
      noteId:note.id,
      amount:Number(note.amount||0),
      description:String(note.description||note.label||'Belanja Minyak'),
      createdAt:Date.now(),
      shiftId:shiftId()
    });
    save();
    render();
    if($('oilBuyNoteSelect'))$('oilBuyNoteSelect').value='';
    refreshNotes();
    toast('Nota Belanja Minyak '+note.id+' digunakan: '+fmt(note.amount)+'.','ok');
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
        <b>Belanja Minyak memakai Nota Purchasing.</b> Purchasing menginput nominal uang total nota.
        Karyawan hanya memilih nota yang sesuai shift; tidak menginput liter maupun harga beli/liter.
      </div>
      <div class="grid two">
        <div class="card form">
          <h4 style="margin:0 0 14px">Pilih Nota Belanja Minyak</h4>
          <div class="field">
            <label>Nota Purchasing</label>
            <select class="select" id="oilBuyNoteSelect"><option value="">— Pilih nota Purchasing —</option></select>
          </div>
          <div id="oilBuyNoteInfo" class="notice blue" style="margin-top:12px">Pilih Nota Purchasing Belanja Minyak.</div>
          <div class="actions" style="margin-top:14px">
            <button class="btn primary" id="oilBuyAdd" type="button">Gunakan Nota</button>
            <span class="status info">↵ Enter = Gunakan Nota</span>
          </div>
        </div>
        <div class="card summary">
          <h4>Ringkasan Belanja Minyak</h4>
          <div class="sumrow"><span>Nota Digunakan</span><b id="oilBuyTotalNotes">0 nota</b></div>
          <div class="sumrow"><span>Total Nilai Belanja</span><b id="oilBuyTotalCost">Rp0</b></div>
          <div class="notice amber" style="margin-top:12px;margin-bottom:0">
            Nilai belanja berasal langsung dari nominal nota Purchasing. Belanja stok Minyak ini tidak menambah Margin transaksi dan tidak menggantikan perhitungan modal Minyak yang benar-benar terjual.
          </div>
        </div>
      </div>
      <div class="card multi-list-card" style="margin-top:14px">
        <div class="section-head"><div><h4 style="margin:0">Daftar Nota Belanja Minyak</h4></div><span class="status info" id="oilBuyCount">0 nota</span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>No. Nota</th><th>Keterangan</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody id="oilBuyList"></tbody></table></div>
      </div>`;

    const notaPane=$('buy-nota');
    if(notaPane)notaPane.insertAdjacentElement('beforebegin',pane);
    else section.appendChild(pane);

    const p=section.querySelector('.section-head p');
    if(p)p.textContent='Belanja Paket, Rokok, Minyak, dan kebutuhan lain mengikuti Nota Purchasing sesuai shift.';

    $('oilBuyNoteSelect')?.addEventListener('change',refreshNotes);
    $('oilBuyNoteSelect')?.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.repeat&&!e.shiftKey&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
        e.preventDefault();
        useSelected();
      }
    });
    $('oilBuyAdd')?.addEventListener('click',useSelected);

    load();
    render();
    refreshNotes();

    document.querySelectorAll('.topbar .status.info').forEach(el=>{
      if(/UI\s+V/i.test(String(el.textContent||'')))el.textContent='UI V76 — BELANJA MINYAK VIA NOTA PURCHASING';
    });

    window.KAOilPurchaseV76={
      entries:()=>entries.slice(),
      render,
      refreshNotes,
      useSelected,
      total:()=>entries.reduce((s,x)=>s+Number(x.amount||0),0)
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();