/* Konter Anisa V74 — clean operational UI only; no business logic changes */
(function(){
  'use strict';

  function addStyle(){
    if(document.getElementById('v74-clean-ui-style')) return;
    const style=document.createElement('style');
    style.id='v74-clean-ui-style';
    style.textContent=`
      /* Hide developer/version clutter */
      .crumb .status.info,
      .side-foot,
      .footer-actions .right-note,
      .v55-enter-hint,
      #v21SelfTest,
      [data-v74-hide="1"]{
        display:none !important;
      }

      /* Tighter visual hierarchy */
      .topbar .crumb{font-weight:700;color:#5f5768}
      .footer-actions{justify-content:flex-end}
      .section-head p{max-width:760px}
      .hero{margin-bottom:14px}
      .hero p{display:none}
    `;
    document.head.appendChild(style);
  }

  const HIDE_PATTERNS=[
    /^Interactive Preview$/i,
    /^UI\s*V\d+/i,
    /^Modal aktual tetap diinput/i,
    /^Tombol kanan bawah selalu aktif/i,
    /^Opening dari stok akhir/i,
    /^Data uji dari Excel/i,
    /^Fokus:/i,
    /^Alur stok:/i,
    /belum terhubung database/i,
    /^↵\s*Enter\s*=/i,
    /^Enter\s*=/i
  ];

  function shouldHideText(text){
    const t=String(text||'').replace(/\s+/g,' ').trim();
    if(!t) return false;
    return HIDE_PATTERNS.some(re=>re.test(t));
  }

  function cleanNode(root=document){
    root.querySelectorAll?.('.notice,.mini,.tiny,.right-note,.v55-enter-hint,.side-foot div,.status.info').forEach(el=>{
      if(shouldHideText(el.textContent)) el.dataset.v74Hide='1';
    });

    document.querySelectorAll('.crumb .status.info').forEach(el=>el.dataset.v74Hide='1');
    const side=document.querySelector('.side-foot');
    if(side) side.dataset.v74Hide='1';
    const right=document.querySelector('.footer-actions .right-note');
    if(right) right.dataset.v74Hide='1';
    document.querySelectorAll('.v55-enter-hint').forEach(el=>el.dataset.v74Hide='1');
  }

  function install(){
    addStyle();
    cleanNode();

    const observer=new MutationObserver(mutations=>{
      for(const m of mutations){
        for(const node of m.addedNodes){
          if(node.nodeType===1) cleanNode(node);
        }
      }
      cleanNode();
    });
    observer.observe(document.body,{childList:true,subtree:true});

    window.KACleanUIV74={refresh:()=>cleanNode()};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();