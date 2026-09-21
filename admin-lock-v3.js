/* Konter Anisa Admin V3 — runtime integrity + workflow lock */
(function(){
  'use strict';

  const BUILD='3';
  const AUTHORITY='admin-v3';
  const REQUIRED_IDS=[
    'adminName','adminAvatar',
    'kpiMargin','kpiMinus','kpiOperational','kpiAttendance',
    'marginBody','minusBody','opBody',
    'capitalBody','capitalChart','debtBody',
    'reviewBody','attBody','accountBody',
    'reportPaper','reportBody','auditList',
    'returnConfirm','accAdd'
  ];
  const REQUIRED_VIEWS=[
    'dashboard','margin','minus','operational','capital','debt',
    'review','attendance','accounts','reports','audit'
  ];
  const REQUIRED_GROUPS=['dashboard','finance','capitaldebt','review','people','reports'];
  const REQUIRED_TOKENS=[
    'renderDashboard','renderMargin','renderMinus','renderOp',
    'renderCapital','renderCapitalChart','renderDebt','renderReview',
    'renderAttendance','renderAccounts','renderReport','renderAudit',
    'submitReturn','resolveCorrection','addAccount','changeRole','toggleAccount',
    'exportReportCsv','printReport'
  ];

  function inlineSource(){
    return [...document.scripts].filter(s=>!s.src).map(s=>String(s.textContent||'')).join('\n');
  }

  function localScript(name){
    return [...document.querySelectorAll('script[src]')].find(s=>{
      try{return new URL(s.src,location.href).pathname.endsWith('/'+name)}catch(_){return false}
    })||null;
  }

  function setBadge(pass,detail){
    const crumb=document.querySelector('.crumb');
    if(!crumb)return;
    let badge=document.getElementById('kaAdminLockBadge');
    if(!badge){
      badge=document.createElement('span');
      badge.id='kaAdminLockBadge';
      badge.style.marginLeft='8px';
      crumb.appendChild(badge);
    }
    const cls='status '+(pass?'ok':'bad');
    const txt=pass?'ADMIN V3 • LOCKED':'ADMIN V3 • LOCK FAILED';
    if(badge.className!==cls)badge.className=cls;
    if(badge.textContent!==txt)badge.textContent=txt;
    badge.title=detail||'';
    badge.dataset.adminLock='1';
  }

  function gate(pass){
    const selectors=[
      '#returnConfirm','#accAdd',
      '[data-role-id]','[data-toggle-id]','[data-resolve]','[data-return]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(el=>{
      if(!pass){
        el.disabled=true;
        el.dataset.adminLockDisabled='1';
        el.title='Integritas runtime Admin gagal. Aksi perubahan diblokir.';
      }else if(el.dataset.adminLockDisabled==='1'){
        el.disabled=false;
        delete el.dataset.adminLockDisabled;
        el.removeAttribute('title');
      }
    });
  }

  function audit(){
    const build=document.querySelector('meta[name="ka-admin-build"]')?.content||'';
    const missingIds=REQUIRED_IDS.filter(id=>!document.getElementById(id));
    const missingViews=REQUIRED_VIEWS.filter(v=>!document.getElementById('view-'+v));

    const groups=[...document.querySelectorAll('.nav [data-group]')].map(x=>String(x.dataset.group||''));
    const missingGroups=REQUIRED_GROUPS.filter(g=>!groups.includes(g));

    const src=inlineSource();
    const missingTokens=REQUIRED_TOKENS.filter(t=>!src.includes(t));

    const account=localScript('account-master-v59.js');
    const self=localScript('admin-lock-v3.js');
    let accountBuild='',selfBuild='';
    try{accountBuild=account?new URL(account.src,location.href).searchParams.get('build')||'':''}catch(_){}
    try{selfBuild=self?new URL(self.src,location.href).searchParams.get('build')||'':''}catch(_){}

    const forbiddenDebtPayment=!!document.querySelector(
      '#debtPay,[data-debt-pay],[data-action="pay-debt"],button[name="payDebt"]'
    );

    const pass=
      build===BUILD &&
      !missingIds.length &&
      !missingViews.length &&
      !missingGroups.length &&
      !missingTokens.length &&
      !!account && accountBuild==='80' &&
      !!self && selfBuild===BUILD &&
      !forbiddenDebtPayment;

    const result={
      build:BUILD,authority:AUTHORITY,pass,
      missingIds,missingViews,missingGroups,missingTokens,
      accountBuild,selfBuild,forbiddenDebtPayment
    };

    document.documentElement.dataset.kaAdminBuild=BUILD;
    document.documentElement.dataset.kaAdminAuthority=AUTHORITY;
    document.documentElement.dataset.kaAdminLock=pass?'PASS':'FAIL';
    window.KA_ADMIN_BUILD=BUILD;
    gate(pass);
    setBadge(pass,JSON.stringify(result));

    if(pass) console.info('KONTER ANISA ADMIN V3 WORKFLOW LOCKED',result);
    else console.error('KONTER ANISA ADMIN V3 LOCK FAIL',result);
    return result;
  }

  window.KAAdminLockV3=Object.freeze({
    build:BUILD,
    authority:AUTHORITY,
    audit
  });

  function run(){setTimeout(audit,120)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
  window.addEventListener('load',run,{once:true});
  window.addEventListener('pageshow',run);
  window.addEventListener('storage',e=>{
    if(['ka_admin_accounts_v59','ka_admin_correction_requests_v1'].includes(String(e.key||'')))run();
  });
  setInterval(audit,5000);
})();