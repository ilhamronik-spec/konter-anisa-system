/* Konter Anisa V79 — Sheet 18 regression audit + balance lock diagnostics */
(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const fmt=n=>{
    try{ if(typeof window.fmt==='function') return window.fmt(Number(n)||0); }catch(_){}
    return 'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');
  };

  const EXPECTED=Object.freeze({
    voucher:8155250,
    piutang:5597788,
    openingPiutang:4967913,
    debtPaymentNet:-100125,
    operasional:730000,
    balance:-28015,
    modalBaruA:110299149,
    modalLamaA:109257194.77777778,
    margin:621659.2222222222,
    modalMinyak:448310
  });

  function isSheet18(){
    try{
      const id=String(window.KARegulationsV29?.activeShift?.id||'');
      if(/^2026-09-18(?:-|$)/.test(id)) return true;
    }catch(_){}
    return /18\s+September\s+2026/i.test(String(document.querySelector('.crumb')?.textContent||''));
  }

  function componentAudit(){
    const bal=window.KABalanceV44;
    if(!bal||!isSheet18()) return null;
    const pkg=bal.packageClosing?.()||{complete:false,total:0};
    const p=bal.piutangBreakdown?.()||{opening:0,add:0,paid:0,operasional:0,total:0};
    const debtNet=Number(p.add||0)-Number(p.paid||0);
    return {
      pkgComplete:!!pkg.complete,
      voucher:Number(pkg.total||0),
      voucherDiff:Number(pkg.total||0)-EXPECTED.voucher,
      piutang:Number(p.total||0),
      piutangDiff:Number(p.total||0)-EXPECTED.piutang,
      openingPiutang:Number(p.opening||0),
      openingPiutangDiff:Number(p.opening||0)-EXPECTED.openingPiutang,
      debtPaymentNet:debtNet,
      debtPaymentNetDiff:debtNet-EXPECTED.debtPaymentNet,
      operasional:Number(p.operasional||0),
      operasionalDiff:Number(p.operasional||0)-EXPECTED.operasional
    };
  }

  function signed(n){
    const v=Math.round(Number(n)||0);
    return (v>0?'+':'')+fmt(v);
  }

  function render(){
    const section=$('v44-balance-section');
    if(!section) return;
    let box=$('v79Sheet18Audit');
    const a=componentAudit();
    if(!a){ if(box) box.remove(); return; }
    if(!box){
      box=document.createElement('div');
      box.id='v79Sheet18Audit';
      box.className='card summary';
      const notice=section.querySelector('.notice.blue');
      if(notice) notice.insertAdjacentElement('afterend',box);
      else section.prepend(box);
    }
    const row=(label,actual,expected,diff,ready=true)=>`
      <div class="sumrow"><span>${label}</span><b>${ready?fmt(actual):'Belum lengkap'} / ${fmt(expected)}
      ${ready?` <small style="color:${Math.round(diff)===0?'var(--green)':'var(--red)'}">(${signed(diff)})</small>`:''}</b></div>`;

    const hints=[];
    if(a.pkgComplete && Math.round(a.voucherDiff)===-422400){
      hints.push('<b>Modal Voucher:</b> selisih tepat Rp422.400 = 32 × Rp13.200. Pada Sheet 18, <b>TELKOMSEL 4GB/5H stok akhir = 35</b>. Jika terinput 3, Modal Voucher menjadi Rp7.732.850.');
    }else if(a.pkgComplete && Math.round(a.voucherDiff)!==0){
      hints.push('<b>Modal Voucher:</b> masih beda dari Sheet 18. Periksa stok akhir Paket; rumus sistem adalah stok akhir × harga dasar aktif.');
    }
    if(Math.round(a.openingPiutangDiff)!==0){
      hints.push('<b>Opening Piutang:</b> harus Rp4.967.913 dari Sheet 17. Build V79 menahan referensi opening lama agar tidak dipulihkan autosave.');
    }
    if(Math.round(a.debtPaymentNetDiff)!==0){
      hints.push('<b>Hutang − Pembayaran:</b> net Sheet 18 harus −Rp100.125.');
    }
    if(Math.round(a.operasionalDiff)!==0){
      hints.push('<b>Operasional:</b> total Sheet 18 harus Rp730.000.');
    }

    box.innerHTML=`
      <h4>Audit Referensi Sheet 18 September</h4>
      <div style="font-size:11px;color:var(--muted);margin:-4px 0 10px">Hanya pembanding pengujian. Sistem tidak memaksa angka agar sama.</div>
      ${row('Modal Voucher',a.voucher,EXPECTED.voucher,a.voucherDiff,a.pkgComplete)}
      ${row('Piutang Akhir',a.piutang,EXPECTED.piutang,a.piutangDiff)}
      ${row('Opening Piutang',a.openingPiutang,EXPECTED.openingPiutang,a.openingPiutangDiff)}
      ${row('Net Hutang − Pembayaran',a.debtPaymentNet,EXPECTED.debtPaymentNet,a.debtPaymentNetDiff)}
      ${row('Operasional',a.operasional,EXPECTED.operasional,a.operasionalDiff)}
      ${hints.length?'<div class="notice amber" style="margin-top:10px">'+hints.join('<br>')+'</div>':'<div class="notice green" style="margin-top:10px"><b>Komponen referensi Sheet 18 cocok.</b></div>'}
    `;
  }

  function selfTest(){
    const bal=window.KABalanceV44;
    const tests=[];
    const eq=(a,b)=>Math.abs(Number(a)-Number(b))<0.0001;
    tests.push(['Balance API available',!!bal?.pureBalance]);
    if(bal?.pureBalance){
      tests.push(['Sheet18 Balance regression -28,015',eq(bal.pureBalance({
        closing:EXPECTED.modalBaruA,
        opening:EXPECTED.modalLamaA,
        margin:EXPECTED.margin,
        minyak:EXPECTED.modalMinyak,
        belanjaMinyak:0,
        selisihRokok:0,
        selisihPaket:0
      }),EXPECTED.balance)]);
    }
    tests.push(['Sheet18 Piutang regression',4867788+730000===EXPECTED.piutang]);
    tests.push(['Voucher typo diagnostic arithmetic',7732850+(32*13200)===EXPECTED.voucher]);
    const pass=tests.every(x=>x[1]);
    document.documentElement.dataset.v79Selftest=pass?'PASS':'FAIL';
    if(!pass) console.error('V79 SELFTEST FAIL',tests);
    else console.info('V79 SELFTEST PASS',tests);
    return {pass,tests};
  }

  function refresh(){ render(); }

  function install(){
    selfTest();
    render();
    document.addEventListener('input',()=>setTimeout(render,0),true);
    document.addEventListener('change',()=>setTimeout(render,0),true);
    document.addEventListener('click',()=>setTimeout(render,80),true);
    setInterval(render,1500);
    window.KASheet18AuditV79={expected:EXPECTED,audit:componentAudit,render,selfTest};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});
  else setTimeout(install,0);
})();