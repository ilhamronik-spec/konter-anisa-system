import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const BUILD='77';
const EXPECTED=[
  'account-master-v59.js',
  'rules-v29.js',
  'layout-v31.js',
  'transactions-v33.js',
  'transactions-v34.js',
  'transactions-v37.js',
  'transactions-v38.js',
  'transactions-v39.js',
  'transactions-v40.js',
  'transactions-v41.js',
  'transactions-v42.js',
  'transactions-v43.js',
  'transactions-v50.js',
  'transactions-v51.js',
  'transactions-v53.js',
  'transactions-v55.js',
  'transactions-v61.js',
  'transactions-v72.js',
  'ui-clean-v74.js',
  'transactions-v75.js',
  'runtime-lock-v77.js'
];

function fail(message,detail=''){
  console.error('RUNTIME INTEGRITY FAIL:',message);
  if(detail) console.error(detail);
  process.exitCode=1;
}

const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const scriptTags=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)].map(m=>m[1]);
const localScripts=scriptTags
  .filter(src=>!/^https?:\/\//i.test(src))
  .map(src=>{
    const [pathname,query='']=src.replace(/^\.\//,'').split('?');
    const params=new URLSearchParams(query);
    return {src,path:pathname,name:path.basename(pathname),build:params.get('build')||''};
  });

const names=localScripts.map(x=>x.name);
const counts=names.reduce((m,n)=>(m[n]=(m[n]||0)+1,m),{});
const duplicates=Object.entries(counts).filter(([,n])=>n>1);
const missing=EXPECTED.filter(n=>!counts[n]);
const unexpected=names.filter(n=>!EXPECTED.includes(n));
const wrongBuild=localScripts.filter(x=>EXPECTED.includes(x.name)&&x.build!==BUILD);
const exactOrder=EXPECTED.length===names.length && EXPECTED.every((n,i)=>names[i]===n);

if(duplicates.length) fail('duplicate local scripts',JSON.stringify(duplicates));
if(missing.length) fail('missing expected scripts',JSON.stringify(missing));
if(unexpected.length) fail('unexpected/obsolete local scripts',JSON.stringify(unexpected));
if(wrongBuild.length) fail('mixed cache build IDs',JSON.stringify(wrongBuild));
if(!exactOrder) fail('script order differs from locked manifest',JSON.stringify({expected:EXPECTED,actual:names}));

for(const x of localScripts){
  if(!fs.existsSync(path.join(ROOT,x.path))) fail('referenced local script does not exist',x.path);
}

for(const href of [...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css[^"']*)["'][^>]*>/gi)].map(m=>m[1])){
  if(/^https?:\/\//i.test(href)) continue;
  const [pathname,query='']=href.replace(/^\.\//,'').split('?');
  const params=new URLSearchParams(query);
  if(!fs.existsSync(path.join(ROOT,pathname))) fail('referenced local CSS does not exist',pathname);
  if(params.get('build')!==BUILD) fail('CSS uses mixed cache build ID',href);
}

if((html.match(/transactions-v43\.js/g)||[]).length!==1) fail('transactions-v43.js must be loaded exactly once');
if(/transactions-v35\.js/.test(html)) fail('obsolete missing transactions-v35.js reference reintroduced');

const balance=fs.readFileSync(path.join(ROOT,'transactions-v43.js'),'utf8');
if(!balance.includes('function oilPurchaseTotal()')) fail('Balance missing oilPurchaseTotal()');
if(!balance.includes('window.KAOilPurchaseV76?.total?.()')) fail('Balance not reading Belanja Minyak V76 total');
if(!balance.includes('Belanja Minyak (K279)')) fail('Balance UI no longer labels K279 as Belanja Minyak');

const oil=fs.readFileSync(path.join(ROOT,'transactions-v75.js'),'utf8');
if(!oil.includes('window.KABalanceV44?.renderBalance?.()')) fail('Oil purchase changes do not trigger Balance recalculation');

const workflowDir=path.join(ROOT,'.github','workflows');
for(const name of fs.readdirSync(workflowDir)){
  if(!name.endsWith('.yml')&&!name.endsWith('.yaml')) continue;
  if(['deploy-pages.yml','runtime-integrity.yml'].includes(name)) continue;
  const txt=fs.readFileSync(path.join(workflowDir,name),'utf8');
  if(/\bpush\s*:/m.test(txt)||/contents:\s*write/m.test(txt)||/git\s+push/m.test(txt)){
    fail('historical mutating workflow is active',name);
  }
}

for(const file of EXPECTED){
  const full=path.join(ROOT,file);
  const code=fs.readFileSync(full,'utf8');
  try{ new Function(code); }
  catch(err){ fail('JavaScript syntax error in '+file,String(err)); }
}

if(!process.exitCode){
  console.log('RUNTIME INTEGRITY PASS — Konter Anisa BUILD V77');
  console.log('Scripts:',names.join(' -> '));
}
