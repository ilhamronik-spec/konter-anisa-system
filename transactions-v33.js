/* Konter Anisa V33 — Transaction Cleanup */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const setText = (id, value='—') => { const el=$(id); if(el) el.textContent=value; };
  const clear = (id) => { const el=$(id); if(el) el.value=''; };

  function neutralStatus(prefix, text='Menunggu input'){
    setText(prefix+'Status', text);
    const box=$(prefix+'StatusBox');
    if(box) box.className='calcbox';
  }

  function ensureMitraPlaceholder(){
    const sel=$('mitraNominal');
    if(!sel) return;
    let opt=[...sel.options].find(o=>o.value==='');
    if(!opt){
      opt=document.createElement('option');
      opt.value='';
      opt.textContent='Pilih nominal';
      opt.disabled=true;
      sel.insertBefore(opt,sel.firstChild);
    }
    sel.value='';
  }

  function resetTxnForm(type){
    switch(type){
      case 'dana':
        clear('danaAmount'); clear('danaAdmin'); clear('danaReason');
        if($('danaReasonWrap')) $('danaReasonWrap').style.display='none';
        setText('danaDefault'); setText('danaTotal'); setText('danaMargin');
        neutralStatus('dana');
        break;
      case 'qrisDana':
        clear('qrisDanaAmount'); clear('qrisDanaAdmin'); clear('qrisDanaReason');
        if($('qrisDanaAdmin')) $('qrisDanaAdmin').disabled=false;
        if($('qrisDanaReasonWrap')) $('qrisDanaReasonWrap').style.display='none';
        setText('qrisDanaDefault'); setText('qrisDanaTotal');
        neutralStatus('qrisDana');
        break;
      case 'qrisBank':
        clear('qrisBankAmount'); clear('qrisBankAdmin'); clear('qrisBankReason');
        if($('qrisBankReasonWrap')) $('qrisBankReasonWrap').style.display='none';
        setText('qrisBankDefault'); setText('qrisBankTotal');
        neutralStatus('qrisBank');
        break;
      case 'mitra':
        ensureMitraPlaceholder(); clear('mitraCustomNominal'); clear('mitraQty');
        if($('mitraCustomWrap')) $('mitraCustomWrap').style.display='none';
        setText('mitraModal'); setText('mitraMargin'); setText('mitraQtyOut');
        break;
      case 'svplus':
        clear('svType'); clear('svBase'); clear('svSell'); clear('svMarginInput');
        setText('svBaseOut'); setText('svSellOut'); setText('svMargin');
        break;
      case 'tarikBca':
        clear('tarikBcaAmount'); clear('tarikBcaAdmin'); clear('tarikBcaReason');
        if($('tarikBcaReasonWrap')) $('tarikBcaReasonWrap').style.display='none';
        setText('tarikBcaDefault'); setText('tarikBcaTotal');
        neutralStatus('tarikBca');
        break;
      case 'transferBca':
        clear('transferBcaAmount'); clear('transferBcaAdmin'); clear('transferBcaReason');
        if($('transferBcaReasonWrap')) $('transferBcaReasonWrap').style.display='none';
        setText('transferBcaBase'); setText('transferBcaDefault'); setText('transferBcaTotal');
        break;
    }
  }

  function resetAll(){
    ['dana','qrisDana','qrisBank','mitra','svplus','tarikBca','transferBca'].forEach(resetTxnForm);
  }

  function wrapAddTxn(){
    if(typeof window.addTxn!=='function' || window.addTxn.__v33wrapped) return;
    const original=window.addTxn;
    const wrapped=function(type){
      let before=-1;
      try{
        if(typeof txEntries!=='undefined' && txEntries[type]) before=txEntries[type].length;
      }catch(_e){}
      const result=original.apply(this,arguments);
      let added=false;
      try{
        if(before>=0 && typeof txEntries!=='undefined' && txEntries[type]) added=txEntries[type].length>before;
      }catch(_e){}
      if(added) setTimeout(()=>resetTxnForm(type),0);
      return result;
    };
    wrapped.__v33wrapped=true;
    window.addTxn=wrapped;
  }

  function apply(){
    resetAll();
    wrapAddTxn();
  }

  if(document.readyState==='complete') setTimeout(apply,0);
  else window.addEventListener('load',()=>setTimeout(apply,0),{once:true});
})();
