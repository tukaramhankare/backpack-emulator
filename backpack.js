/* ================================================================
   BACKPACK v3 — APPLICATION ENGINE
   © 2026 Tukaram Hankare, Solapur University
   ================================================================ */


// ════════════════════════════════════════════════════════════
//  BACKPACK v3 — CLEAN ENGINE (zero bugs)
// ════════════════════════════════════════════════════════════

// ── UTILS (defined first, used everywhere) ──────────────────
function el(id){ return document.getElementById(id); }
function mk(tag,cls,html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html)e.innerHTML=html; return e; }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtB(b){
  b=b||0;
  if(b<1024)return b+' B';
  if(b<1048576)return(b/1024).toFixed(1)+' KB';
  if(b<1073741824)return(b/1048576).toFixed(1)+' MB';
  return(b/1073741824).toFixed(2)+' GB';
}
function ago(ts){
  const s=Math.floor((Date.now()-ts)/1000);
  if(s<60)return 'just now';
  if(s<3600)return Math.floor(s/60)+'m ago';
  if(s<86400)return Math.floor(s/3600)+'h ago';
  if(s<604800)return Math.floor(s/86400)+'d ago';
  return new Date(ts).toLocaleDateString();
}
function uid(){ return 'x'+(Date.now()).toString(36)+(Math.random()*1e9|0).toString(36); }

// Safe password encode — works with any characters
function encPw(pw){ return btoa(unescape(encodeURIComponent(pw))); }
function decPw(h){
  try{ return decodeURIComponent(escape(atob(h))); }
  catch{ return atob(h); }
}

// ── CATEGORIES ──────────────────────────────────────────────
const CATS={
  images:   ['jpg','jpeg','png','gif','webp','bmp','svg','tiff','tif','ico','avif','heic','raw','cr2','nef'],
  videos:   ['mp4','mkv','avi','mov','wmv','flv','webm','m4v','3gp','mpeg','mpg','ogv','ts'],
  audio:    ['mp3','wav','ogg','flac','aac','wma','m4a','opus','aiff','mid','midi','amr'],
  documents:['pdf','doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp','txt','rtf','csv','md','json','xml','yaml','yml','epub','pages','numbers','key'],
  archives: ['zip','rar','7z','tar','gz','bz2','xz','tgz','cab','iso','dmg','apk','deb','rpm'],
  code:     ['js','jsx','ts','tsx','py','java','c','cpp','cc','cs','php','rb','go','rs','swift','kt','dart','vue','svelte','sh','bash','bat','ps1','css','scss','sass','less','sql','r','lua','pl','scala','html','htm','htaccess','conf','env','gitignore','toml','ini']
};
const CATI={images:'🖼️',videos:'🎬',audio:'🎵',documents:'📄',archives:'📦',code:'💻',others:'📁'};
const CATL={all:'All Files',images:'Images',videos:'Videos',audio:'Audio',documents:'Documents',archives:'Archives',code:'Code',others:'Others',projects:'Projects'};
const FICO={pdf:'📕',doc:'📘',docx:'📘',xls:'📗',xlsx:'📗',ppt:'📙',pptx:'📙',txt:'📝',md:'📝',csv:'📊',json:'🗂',xml:'🗂',html:'🌐',htm:'🌐',zip:'🗜',rar:'🗜','7z':'🗜',tar:'🗜',gz:'🗜',mp3:'🎵',wav:'🎵',flac:'🎵',aac:'🎵',ogg:'🎵',m4a:'🎵',mp4:'🎬',mkv:'🎬',avi:'🎬',mov:'🎬',webm:'🎬',jpg:'🖼️',jpeg:'🖼️',png:'🖼️',gif:'🖼️',webp:'🖼️',svg:'🖼️',bmp:'🖼️',js:'💛',ts:'💙',py:'🐍',java:'☕',cpp:'⚙️',c:'⚙️',go:'🐹',rs:'🦀',php:'🐘',rb:'💎',css:'🎨',scss:'🎨',sh:'🖥️',bat:'🖥️',vue:'💚',svelte:'🟠',apk:'📱',iso:'💿',exe:'⚙️'};

function getCat(name){
  const ext=(name||'').split('.').pop().toLowerCase();
  for(const[c,a]of Object.entries(CATS))if(a.includes(ext))return c;
  return'others';
}
function getIcon(name){
  const ext=(name||'').split('.').pop().toLowerCase();
  return FICO[ext]||'📄';
}
function isHtml(name){ const e=(name||'').split('.').pop().toLowerCase(); return e==='html'||e==='htm'; }

// ── LOCAL STORAGE ────────────────────────────────────────────
const LS={
  getUsers(){ try{return JSON.parse(localStorage.getItem('bp3_u')||'{}')}catch{return{}} },
  saveUsers(u){ localStorage.setItem('bp3_u',JSON.stringify(u)) },
  getData(u){ try{return JSON.parse(localStorage.getItem('bp3_d_'+u)||'{"files":[],"folders":[]}')}catch{return{files:[],folders:[]}} },
  saveData(u,d){ localStorage.setItem('bp3_d_'+u,JSON.stringify(d)) }
};

// ── APP STATE ────────────────────────────────────────────────
let CU=null;   // {username, displayName}
let CD=null;   // {files:[], folders:[]}
let NAV='all'; // nav state
let CurFolder=null;
let Sort='date-desc';
let View='grid';
let Qry='';
let SelMode=false;
let Sel=new Set();
let CtxId=null, CtxType=null;
let PrevId=null;
let FpMode=null, FpIds=null, FpDest=null;
let NfParent=null;
let RenameId=null, RenameType=null;
let _confirmCb=null;
let _pendingFiles=null;
let HtmlPrevProject=null;
let _blobUrl=null;
let _procQ=[], _procRunning=false;

// ── AUTH ────────────────────────────────────────────────────
function showAuth(){
  el('auth-screen').style.display='flex';
  el('app').style.display='none';
}
function showApp(){
  el('auth-screen').style.display='none';
  el('app').style.display='flex';
}

function doLogin(){
  const u=el('l-u').value.trim().toLowerCase();
  const p=el('l-p').value;
  const errEl=el('login-err');
  errEl.style.display='none';
  if(!u||!p){ showErr(errEl,'Please enter username and password.'); return; }
  const users=LS.getUsers();
  if(!users[u]){ showErr(errEl,'Username not found. Please register first.'); return; }
  // Support both old btoa format and new encPw format
  const stored=users[u].password;
  let valid=false;
  try{ valid=(stored===encPw(p)); }catch{}
  if(!valid){ try{ valid=(stored===btoa(p)); }catch{} } // legacy fallback
  if(!valid){ showErr(errEl,'Incorrect password.'); return; }
  loginUser(u, users[u].displayName||u);
}

function doRegister(){
  const u=el('r-u').value.trim().toLowerCase();
  const n=el('r-n').value.trim();
  const p=el('r-p').value;
  const p2=el('r-p2').value;
  const errEl=el('reg-err');
  errEl.style.display='none';

  if(!u){ showErr(errEl,'Username is required.'); return; }
  if(!/^[a-z0-9_]{3,20}$/.test(u)){ showErr(errEl,'Username: 3-20 chars, only letters a-z, numbers 0-9 and _ allowed.'); return; }
  if(!p){ showErr(errEl,'Password is required.'); return; }
  if(p.length<4){ showErr(errEl,'Password must be at least 4 characters.'); return; }
  if(p!==p2){ showErr(errEl,"Passwords don't match."); return; }

  const users=LS.getUsers();
  if(users[u]){ showErr(errEl,'Username already taken. Choose another.'); return; }

  users[u]={ password:encPw(p), displayName:n||u, created:Date.now() };
  LS.saveUsers(users);
  LS.saveData(u,{files:[],folders:[]});
  loginUser(u, n||u);
  toast('Account created! Welcome 🎒','ok');
}

function showErr(el_,msg){ el_.textContent=msg; el_.style.display=''; }

function loginUser(username, displayName){
  CU={username,displayName};
  CD=LS.getData(username);
  if(!Array.isArray(CD.files))CD.files=[];
  if(!Array.isArray(CD.folders))CD.folders=[];
  sessionStorage.setItem('bp3_sess',JSON.stringify({username,displayName}));
  el('tb-av').textContent=(displayName[0]||'?').toUpperCase();
  el('tb-un').textContent=displayName;
  NAV='all'; CurFolder=null; Qry=''; Sel.clear(); SelMode=false;
  el('srch-inp').value='';
  el('sel-tog').textContent='☑ Select';
  showApp();
  renderAll();
  toast('Welcome back, '+displayName+'! 🎒','ok');
}

function doLogout(){
  closeAllModals();
  if(CU&&CD)LS.saveData(CU.username,CD);
  sessionStorage.removeItem('bp3_sess');
  CU=null; CD=null; NAV='all'; CurFolder=null;
  Sel.clear(); SelMode=false; _procQ=[]; _procRunning=false;
  el('uq').innerHTML='';
  el('login-err').style.display='none';
  el('l-u').value=''; el('l-p').value='';
  showAuth();
}

// Restore session
window.addEventListener('load',()=>{
  // Bind all event listeners here, after DOM is ready
  bindEvents();

  const s=sessionStorage.getItem('bp3_sess');
  if(s){
    try{
      const j=JSON.parse(s);
      loginUser(j.username,j.displayName);
    }catch{ showAuth(); }
  } else {
    showAuth();
  }

  if(typeof JSZip==='undefined') toast('JSZip CDN not loaded. ZIP export needs internet.','warn');
});

// ── EVENT BINDING ────────────────────────────────────────────
function bindEvents(){
  // Auth
  el('btn-login').addEventListener('click', doLogin);
  el('btn-reg').addEventListener('click', doRegister);
  el('lnk-reg').addEventListener('click',()=>{ el('pnl-login').style.display='none'; el('pnl-reg').style.display=''; el('reg-err').style.display='none'; });
  el('lnk-login').addEventListener('click',()=>{ el('pnl-reg').style.display='none'; el('pnl-login').style.display=''; el('login-err').style.display='none'; });

  // Enter key on auth inputs
  ['l-u','l-p'].forEach(id=>{ el(id).addEventListener('keydown',e=>{ if(e.key==='Enter')doLogin(); }); });
  ['r-u','r-n','r-p','r-p2'].forEach(id=>{ el(id).addEventListener('keydown',e=>{ if(e.key==='Enter')doRegister(); }); });

  // Topbar actions
  el('btn-about').addEventListener('click',()=>openModal('m-about'));
  // Mobile search toggle
  const mSearchBtn=el('btn-search-mobile');
  if(mSearchBtn) mSearchBtn.addEventListener('click',toggleMobileSearch);
  el('btn-autoorg').addEventListener('click',openAutoOrganize);
  el('btn-nf').addEventListener('click',()=>openNfModal(null));
  el('btn-user').addEventListener('click',showUserModal);
  el('sb-tog').addEventListener('click',()=>{ el('sidebar').classList.toggle('open'); el('sb-back').classList.toggle('open'); });
  el('sb-back').addEventListener('click',()=>{ el('sidebar').classList.remove('open'); el('sb-back').classList.remove('open'); });
  el('btn-logout').addEventListener('click',doLogout);
  el('logout-btn2').addEventListener('click',doLogout);

  // File inputs — topbar
  el('fi-top').addEventListener('change',function(){ handleFilePick(this.files, CurFolder); this.value=''; });
  el('fi-dir').addEventListener('change',function(){ handleFolderPick(this.files); this.value=''; });

  // File inputs — page header
  el('fi-main').addEventListener('change',function(){ handleFilePick(this.files, CurFolder); this.value=''; });
  el('fi-main-dir').addEventListener('change',function(){ handleFolderPick(this.files); this.value=''; });

  // Search
  el('srch-inp').addEventListener('input',function(){ Qry=this.value.trim(); renderFilesArea(); renderCatGrid(); });

  // Sidebar nav items
  el('sidebar').querySelectorAll('.sb-it[data-nav]').forEach(btn=>{
    btn.addEventListener('click',()=>{ navTo(btn.dataset.nav); el('sidebar').classList.remove('open'); el('sb-back').classList.remove('open'); });
  });
  el('sb-nf-btn').addEventListener('click',()=>openNfModal(null));
  el('ph-nf-btn').addEventListener('click',()=>openNfModal(CurFolder));

  // Drop zone
  const dz=el('dz');
  dz.addEventListener('click',()=>el('fi-main').click());
  dz.addEventListener('dragover',e=>{ e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave',()=>dz.classList.remove('over'));
  dz.addEventListener('drop',e=>{ e.preventDefault(); dz.classList.remove('over'); const f=Array.from(e.dataTransfer.files); if(f.length)handleFilePick(f,CurFolder); });

  // Toolbar
  el('vb-g').addEventListener('click',()=>setView('grid'));
  el('vb-l').addEventListener('click',()=>setView('list'));
  el('srt-sel').addEventListener('change',function(){ Sort=this.value; renderFilesArea(); });
  el('sel-tog').addEventListener('click',toggleSelMode);
  el('zip-btn').addEventListener('click',()=>exportCurrentZip());
  el('del-all-btn').addEventListener('click',confirmDeleteAll);

  // Preview modal buttons
  el('prev-move-btn').addEventListener('click',()=>{ closeModal('m-prev'); openFp('move',[PrevId],'file'); });
  el('prev-copy-btn').addEventListener('click',()=>{ closeModal('m-prev'); openFp('copy',[PrevId],'file'); });
  el('prev-dl-btn').addEventListener('click',()=>{ const f=getFile(PrevId); if(f)dlFile(f); });
  el('prev-del-btn').addEventListener('click',()=>{ closeModal('m-prev'); confirmDelete([PrevId],[]); });

  // HTML preview
  el('btn-open-browser').addEventListener('click',openInBrowser);
  el('btn-proj-zip').addEventListener('click',()=>{ if(HtmlPrevProject)exportItemsZip(HtmlPrevProject.files,[],'project'); });
  el('dev-full').addEventListener('click',()=>setDevice('full'));
  el('dev-desk').addEventListener('click',()=>setDevice('1280'));
  el('dev-tab').addEventListener('click',()=>setDevice('768'));
  el('dev-mob').addEventListener('click',()=>setDevice('390'));
  el('dev-xs').addEventListener('click',()=>setDevice('375'));

  // New folder modal
  el('nf-ok-btn').addEventListener('click',doCreateFolder);
  el('nf-inp').addEventListener('keydown',e=>{ if(e.key==='Enter')doCreateFolder(); });

  // Folder suggest modal
  el('sug-custom-btn').addEventListener('click',sugCustom);
  el('sug-root-btn').addEventListener('click',()=>{ closeModal('m-suggest'); enqueue(_pendingFiles||[],null); _pendingFiles=null; });
  el('sug-custom-inp').addEventListener('keydown',e=>{ if(e.key==='Enter')sugCustom(); });

  // Folder picker
  el('fp-nf-btn').addEventListener('click',fpNewFolder);
  el('fp-nf-inp').addEventListener('keydown',e=>{ if(e.key==='Enter')fpNewFolder(); });
  el('fp-ok-btn').addEventListener('click',fpConfirm);

  // Rename
  el('rename-ok-btn').addEventListener('click',doRename);
  el('rename-inp').addEventListener('keydown',e=>{ if(e.key==='Enter')doRename(); });

  // Context menu
  el('ctx-open').addEventListener('click',()=>{ closeCtx(); if(CtxType==='folder')navToFolder(CtxId); else openPreview(CtxId); });
  el('ctx-run').addEventListener('click',()=>{ closeCtx(); runProject(CtxId); });
  el('ctx-dl').addEventListener('click',()=>{ closeCtx(); const f=getFile(CtxId); if(f)dlFile(f); else exportFolderZip(CtxId); });
  el('ctx-zip').addEventListener('click',()=>{ closeCtx(); if(CtxType==='folder')exportFolderZip(CtxId); else{ const f=getFile(CtxId); if(f)exportItemsZip([f],[],(f.name).replace(/\.[^.]+$/,'')); } });
  el('ctx-copy').addEventListener('click',()=>{ closeCtx(); openFp('copy',[CtxId],CtxType); });
  el('ctx-move').addEventListener('click',()=>{ closeCtx(); openFp('move',[CtxId],CtxType); });
  el('ctx-rename').addEventListener('click',()=>{ closeCtx(); openRename(CtxId,CtxType); });
  el('ctx-del').addEventListener('click',()=>{ closeCtx(); if(CtxType==='folder')confirmDelete([],[CtxId]); else confirmDelete([CtxId],[]); });

  // Selection bar
  el('selbar-dl').addEventListener('click',selDownload);
  el('selbar-zip').addEventListener('click',selZip);
  el('selbar-move').addEventListener('click',()=>{ openFp('move',[...Sel],'multi'); });
  el('selbar-copy').addEventListener('click',()=>{ openFp('copy',[...Sel],'multi'); });
  el('selbar-del').addEventListener('click',selDelete);
  el('selbar-close').addEventListener('click',clearSel);

  // Auto-organize modal
  el('ao-preview-btn').addEventListener('click',aoPreview);
  el('ao-apply-btn').addEventListener('click',aoApply);

  // Close buttons with data-close
  document.querySelectorAll('[data-close]').forEach(btn=>{
    btn.addEventListener('click',()=>closeModal(btn.dataset.close));
  });

  // Close overlay on backdrop click
  document.querySelectorAll('.ov').forEach(ov=>{
    ov.addEventListener('click',e=>{ if(e.target===ov)closeModal(ov.id); });
  });

  // Context menu close
  document.addEventListener('click',()=>closeCtx());
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){ closeAllModals(); closeCtx(); el('sidebar').classList.remove('open'); el('sb-back').classList.remove('open'); if(SelMode)clearSel(); }
    if((e.ctrlKey||e.metaKey)&&e.key==='a'&&SelMode){
      e.preventDefault();
      const{files,folders}=getVisible();
      [...files,...folders].forEach(x=>Sel.add(x.id));
      updateSelbar(); renderFilesArea();
    }
  });
}

// ── FOLDER HELPERS ────────────────────────────────────────────
function getFolder(id){ return id?CD.folders.find(f=>f.id===id):null; }
function getFile(id){ return id?CD.files.find(f=>f.id===id):null; }
function rootFolders(){ return CD.folders.filter(f=>!f.parentId); }
function childFolders(pid){ return CD.folders.filter(f=>f.parentId===pid); }
function folderPath(id){
  if(!id)return'/';
  const parts=[];
  let cur=getFolder(id);
  while(cur){ parts.unshift(cur.name); cur=getFolder(cur.parentId); }
  return'/'+parts.join('/');
}
function descendantFolderIds(fid){
  const ids=[fid];
  childFolders(fid).forEach(c=>ids.push(...descendantFolderIds(c.id)));
  return ids;
}
function allFilesInFolder(fid){
  const ids=descendantFolderIds(fid);
  return CD.files.filter(f=>ids.includes(f.folderId));
}
function folderFiles(fid){ return CD.files.filter(f=>f.folderId===fid); }

// ── PROJECT DETECTION ─────────────────────────────────────────
function detectProjects(){
  const projects=[];
  const rootHtml=CD.files.filter(f=>!f.folderId&&isHtml(f.name));
  if(rootHtml.length){
    projects.push({name:'Root',folderId:null,htmlFiles:rootHtml,supportFiles:CD.files.filter(f=>!f.folderId&&!isHtml(f.name)),isRoot:true});
  }
  for(const folder of CD.folders){
    const all=allFilesInFolder(folder.id);
    const htmls=all.filter(f=>isHtml(f.name));
    if(htmls.length){
      folder.isProject=true;
      projects.push({name:folder.name,folderId:folder.id,htmlFiles:htmls,supportFiles:all.filter(f=>!isHtml(f.name)),isRoot:false});
    }
  }
  return projects;
}

// ── FILE UPLOAD ────────────────────────────────────────────────
function handleFilePick(files,folderId){
  if(!files||!files.length)return;
  const arr=Array.from(files);
  // If no folders exist yet or we're inside a folder, skip suggest
  if(CD.folders.length===0||folderId!==null){
    enqueue(arr,folderId);
    return;
  }
  // Show suggestion dialog
  _pendingFiles=arr;
  showSuggest(arr);
}

function handleFolderPick(files){
  if(!files||!files.length)return;
  const arr=Array.from(files);
  const folderMap={};
  const allPaths=new Set();
  arr.forEach(f=>{ const parts=f.webkitRelativePath.split('/'); for(let i=1;i<parts.length;i++)allPaths.add(parts.slice(0,i).join('/')); });
  [...allPaths].sort((a,b)=>a.split('/').length-b.split('/').length).forEach(path=>{
    const parts=path.split('/');
    const name=parts[parts.length-1];
    const parentPath=parts.slice(0,-1).join('/');
    const parentId=parentPath?folderMap[parentPath]:null;
    const existing=CD.folders.find(f=>f.name===name&&f.parentId===(parentId||null));
    folderMap[path]=existing?existing.id:(()=>{ const f={id:uid(),name,parentId:parentId||null,created:Date.now(),isProject:false}; CD.folders.push(f); return f.id; })();
  });
  arr.forEach(f=>{
    const parts=f.webkitRelativePath.split('/');
    const dirPath=parts.slice(0,-1).join('/');
    enqueue([f],dirPath?folderMap[dirPath]:null);
  });
  LS.saveData(CU.username,CD);
  renderSbFolders();
  toast('Folder uploaded! Processing files…','info');
}

function showSuggest(files){
  const sEl=el('suggest-list');
  sEl.innerHTML='';
  const grouped={};
  files.forEach(f=>{
    const cat=getCat(f.name);
    const match=CD.folders.find(folder=>folder.name.toLowerCase().includes(cat)||folder.name.toLowerCase().replace(/[^a-z]/g,'').includes(cat.replace(/[^a-z]/g,'')));
    const key=match?match.id:'root';
    if(!grouped[key])grouped[key]={label:match?folderPath(match.id):'/ (Root)',folderId:match?match.id:null,files:[]};
    grouped[key].files.push(f);
  });
  Object.values(grouped).forEach(g=>{
    const d=mk('div','',`<div style="font-size:12px;font-weight:700;margin-bottom:3px">📁 ${esc(g.label)}</div><div style="font-size:10.5px;color:var(--tx2)">${g.files.map(f=>esc(f.name)).join(', ')}</div>`);
    d.style.cssText='margin-bottom:9px;padding:9px 11px;background:var(--surf2);border-radius:var(--rs);border:1px solid var(--bdr)';
    const btn=mk('button','btn btn-xs btn-g','✅ Save here');
    btn.style.marginTop='7px';
    btn.addEventListener('click',()=>{ closeModal('m-suggest'); enqueue(_pendingFiles||[],g.folderId); _pendingFiles=null; });
    d.appendChild(btn);
    sEl.appendChild(d);
  });
  el('sug-custom-inp').value='';
  openModal('m-suggest');
}

function sugCustom(){
  const name=el('sug-custom-inp').value.trim();
  if(!name){ toast('Enter a folder name.','warn'); return; }
  const folder={id:uid(),name,parentId:null,created:Date.now(),isProject:false};
  CD.folders.push(folder);
  LS.saveData(CU.username,CD);
  closeModal('m-suggest');
  enqueue(_pendingFiles||[],folder.id);
  _pendingFiles=null;
  toast('Folder "'+name+'" created.','ok');
  renderSbFolders();
}

function enqueue(files,folderId){
  files.forEach(f=>{
    const item={id:uid(),file:f,folderId:folderId||null,status:'pend'};
    _procQ.push(item);
    renderQueueItem(item);
  });
  if(!_procRunning)processQueue();
}

function renderQueueItem(item){
  const wrap=el('uq');
  const d=mk('div','qi');
  d.id='qi_'+item.id;
  d.innerHTML=`<span class="qi-ico">${getIcon(item.file.name)}</span>
    <div class="qi-info">
      <div class="qi-name">${esc(item.file.name)}</div>
      <div class="qi-path">${esc(item.folderId?folderPath(item.folderId):'/ Root')} · ${fmtB(item.file.size)}</div>
      <div class="qi-pg"><div class="qi-pb" id="qb_${item.id}"></div></div>
    </div>
    <span class="qi-tag pend" id="qt_${item.id}">Pending</span>`;
  wrap.appendChild(d);
}

function processQueue(){
  const pend=_procQ.filter(i=>i.status==='pend');
  if(!pend.length){ _procRunning=false; return; }
  _procRunning=true;
  const batch=pend.slice(0,3);
  let done=0;
  batch.forEach(item=>processItem(item,()=>{ done++; if(done===batch.length)processQueue(); }));
}

function processItem(item,cb){
  item.status='proc';
  const statEl=el('qt_'+item.id), barEl=el('qb_'+item.id);
  if(statEl){ statEl.textContent='Reading…'; statEl.className='qi-tag proc'; }
  let prog=0;
  const tick=setInterval(()=>{ prog=Math.min(prog+Math.random()*16+4,87); if(barEl)barEl.style.width=prog+'%'; },90);
  const reader=new FileReader();
  reader.onload=e=>{
    clearInterval(tick);
    if(barEl)barEl.style.width='100%';
    const fid=item.folderId||null;
    const rec={
      id:uid(), name:item.file.name, size:item.file.size,
      type:item.file.type||'application/octet-stream',
      category:getCat(item.file.name), data:e.target.result,
      folderId:fid,
      path:(fid?folderPath(fid):'')+'/'+item.file.name,
      added:Date.now(), lastModified:item.file.lastModified||Date.now()
    };
    CD.files.push(rec);
    LS.saveData(CU.username,CD);
    item.status='done';
    if(statEl){ statEl.textContent='✓ Done'; statEl.className='qi-tag done'; }
    setTimeout(()=>{ const q=el('qi_'+item.id); if(q){ q.style.opacity='0'; setTimeout(()=>q.remove(),300); } },1300);
    renderAll();
    cb();
  };
  reader.onerror=()=>{ clearInterval(tick); item.status='err'; if(statEl){ statEl.textContent='✕ Error'; statEl.className='qi-tag err'; } cb(); };
  reader.readAsDataURL(item.file);
}

// ── RENDER ─────────────────────────────────────────────────────
function renderAll(){
  if(!CD)return;
  updateCounts();
  renderStorageBar();
  renderSbFolders();
  renderBreadcrumb();
  renderProjCards();
  renderCatGrid();
  renderFilesArea();
}

function updateCounts(){
  el('cnt-all').textContent=CD.files.length;
  el('cnt-proj').textContent=detectProjects().length;
  Object.keys(CATS).forEach(c=>{
    const e=el('cnt-'+c); if(e)e.textContent=CD.files.filter(f=>f.category===c).length;
  });
}

function renderStorageBar(){
  const total=CD.files.reduce((a,f)=>a+(f.size||0),0);
  const pct=Math.min((total/(100*1024*1024))*100,100);
  el('sf').style.width=pct+'%';
  el('si-txt').textContent=fmtB(total)+' used';
}

function renderSbFolders(){
  const wrap=el('sb-folders');
  wrap.innerHTML='';
  function rLevel(pid,depth){
    CD.folders.filter(f=>f.parentId===(pid||null)).sort((a,b)=>a.name.localeCompare(b.name)).forEach(folder=>{
      const btn=mk('button','sb-it'+(NAV==='folder:'+folder.id?' active':''));
      btn.style.paddingLeft=(8+depth*12)+'px';
      const cnt=allFilesInFolder(folder.id).length;
      btn.innerHTML=`<span class="ico">${folder.isProject?'🚀':'📁'}</span>${esc(folder.name)}<span class="sb-badge">${cnt}</span>`;
      btn.addEventListener('click',()=>{ navToFolder(folder.id); el('sidebar').classList.remove('open'); el('sb-back').classList.remove('open'); });
      wrap.appendChild(btn);
      rLevel(folder.id,depth+1);
    });
  }
  rLevel(null,0);
}

function renderBreadcrumb(){
  const bc=el('breadcrumb');
  bc.innerHTML='';
  if(!NAV.startsWith('folder:')){ bc.style.display='none'; return; }
  bc.style.display='flex';
  const fid=NAV.replace('folder:','');
  const chain=[];
  let cur=getFolder(fid);
  while(cur){ chain.unshift(cur); cur=getFolder(cur.parentId); }
  const crumbs=[{label:'🎒 Root',id:null},...chain.map(f=>({label:f.name,id:f.id}))];
  crumbs.forEach((c,i)=>{
    const isLast=i===crumbs.length-1;
    const span=mk('span',isLast?'bc-cur':'bc-item',esc(c.label));
    if(!isLast)span.addEventListener('click',()=>c.id?navToFolder(c.id):navTo('all'));
    bc.appendChild(span);
    if(!isLast){ const sep=mk('span','bc-sep','›'); bc.appendChild(sep); }
  });
}

function renderProjCards(){
  const wrap=el('pj-cards');
  wrap.innerHTML='';
  if(NAV!=='projects')return;
  const projs=detectProjects();
  if(!projs.length){
    wrap.innerHTML='<div class="empty"><div class="ei">🚀</div><h3>No projects detected</h3><p>Upload a folder containing an .html file. Backpack auto-detects it as a project.</p></div>';
    return;
  }
  projs.forEach(p=>{
    const card=mk('div','pjc');
    const mainHtml=p.htmlFiles[0];
    card.innerHTML=`<div class="pch"><span style="font-size:20px">${p.isRoot?'📄':'🚀'}</span><span class="pname">${esc(p.name)}</span></div>
      <div style="font-size:11.5px;color:var(--tx2);margin-bottom:7px">${p.htmlFiles.length} HTML · ${p.supportFiles.length} support files · ${p.isRoot?'Root':esc(folderPath(p.folderId))}</div>
      <div class="pf">${p.htmlFiles.map(f=>`<span>${esc(f.name)}</span>`).join('')}</div>
      <div class="pa"></div>`;
    const pa=card.querySelector('.pa');
    const runBtn=mk('button','btn btn-pu btn-sm','🌐 Run Preview');
    runBtn.addEventListener('click',()=>runProject(mainHtml.id));
    const zipBtn=mk('button','btn btn-b btn-sm','📦 Export ZIP');
    zipBtn.addEventListener('click',()=>exportFolderZip(p.folderId||'root'));
    pa.appendChild(runBtn); pa.appendChild(zipBtn);
    if(p.folderId){
      const openBtn=mk('button','btn btn-out btn-sm','📂 Open Folder');
      openBtn.addEventListener('click',()=>navToFolder(p.folderId));
      pa.appendChild(openBtn);
    }
    wrap.appendChild(card);
  });
}

function renderCatGrid(){
  const wrap=el('cat-grid');
  if(NAV!=='all'||Qry){ wrap.style.display='none'; return; }
  const cats=Object.keys(CATS);
  const hasAny=cats.some(c=>CD.files.some(f=>f.category===c));
  if(!hasAny){ wrap.style.display='none'; return; }
  wrap.style.display='grid';
  wrap.innerHTML=cats.map(c=>{
    const fls=CD.files.filter(f=>f.category===c);
    if(!fls.length)return'';
    const sz=fls.reduce((a,f)=>a+(f.size||0),0);
    return`<div class="cc" data-cat="${c}"><div class="ci">${CATI[c]}</div><div class="cl">${CATL[c]}</div><div class="cn">${fls.length}</div><div class="cs">${fmtB(sz)}</div></div>`;
  }).join('');
  wrap.querySelectorAll('.cc').forEach(card=>{
    card.addEventListener('click',()=>navTo('cat:'+card.dataset.cat));
  });
}

function getVisible(){
  let files=[...CD.files], folders=[];
  if(NAV==='all'){
    if(Qry){ const q2=Qry.toLowerCase(); files=files.filter(f=>f.name.toLowerCase().includes(q2)||(f.path||'').toLowerCase().includes(q2)); folders=CD.folders.filter(f=>f.name.toLowerCase().includes(q2)); }
    else{ folders=rootFolders(); files=CD.files.filter(f=>!f.folderId); }
  } else if(NAV.startsWith('folder:')){
    const fid=NAV.replace('folder:','');
    folders=childFolders(fid); files=folderFiles(fid);
    if(Qry){ const q2=Qry.toLowerCase(); files=files.filter(f=>f.name.toLowerCase().includes(q2)); folders=folders.filter(f=>f.name.toLowerCase().includes(q2)); }
  } else if(NAV.startsWith('cat:')){
    const cat=NAV.replace('cat:','');
    files=CD.files.filter(f=>f.category===cat);
    if(Qry){ const q2=Qry.toLowerCase(); files=files.filter(f=>f.name.toLowerCase().includes(q2)); }
  } else if(NAV==='projects'){
    return{files:[],folders:[]};
  }
  files.sort((a,b)=>{
    if(Sort==='date-desc')return b.added-a.added;
    if(Sort==='date-asc')return a.added-b.added;
    if(Sort==='name-asc')return a.name.localeCompare(b.name);
    if(Sort==='name-desc')return b.name.localeCompare(a.name);
    if(Sort==='size-desc')return b.size-a.size;
    if(Sort==='size-asc')return a.size-b.size;
    return 0;
  });
  folders.sort((a,b)=>a.name.localeCompare(b.name));
  return{files,folders};
}

function renderFilesArea(){
  const wrap=el('files-area');
  const tb=el('toolbar');

  if(NAV==='projects'){
    wrap.innerHTML=''; tb.style.display='none';
    el('pg-title').textContent='🚀 Projects';
    el('pg-sub').textContent=detectProjects().length+' project(s) detected';
    return;
  }

  const{files,folders}=getVisible();
  const total=files.length+folders.length;

  // Title
  if(NAV==='all')el('pg-title').textContent='All Files';
  else if(NAV.startsWith('folder:')){
    const f=getFolder(NAV.replace('folder:',''));
    el('pg-title').textContent=f?(f.isProject?'🚀 ':'📁 ')+f.name:'Folder';
  } else if(NAV.startsWith('cat:')){
    const c=NAV.replace('cat:','');
    el('pg-title').textContent=(CATI[c]||'')+' '+(CATL[c]||c);
  }
  el('pg-sub').textContent=files.length+' file'+(files.length!==1?'s':'')+(folders.length?', '+folders.length+' folder'+(folders.length!==1?'s':''):'');

  tb.style.display=total>0?'flex':'none';
  el('tb-cnt').textContent=total+' item'+(total!==1?'s':'');
  el('zip-btn').style.display=total>0||NAV.startsWith('folder:')?'':'none';
  el('del-all-btn').style.display=total>0?'':'none';

  wrap.className=View==='grid'?'fg':'fl';

  if(!total){
    const gspan=View==='grid'?'grid-column:1/-1':'';
    wrap.innerHTML=`<div class="empty" style="${gspan}"><div class="ei">${NAV.startsWith('folder:')?'📁':'🎒'}</div><h3>${Qry?'No results':'Empty here'}</h3><p>${Qry?'Try different search terms.':'Upload files or drop them here.'}</p></div>`;
    return;
  }

  wrap.innerHTML='';

  // Render folders first
  folders.forEach(folder=>{
    const isProj=folder.isProject||allFilesInFolder(folder.id).some(f=>isHtml(f.name));
    if(isProj)folder.isProject=true;
    const allF=allFilesInFolder(folder.id);
    const isSel=Sel.has(folder.id);

    const card=mk('div','fc fdr'+(isProj?' prj':'')+(isSel?' sel':''));
    card.dataset.id=folder.id; card.dataset.type='folder';
    card.draggable=true;

    if(View==='grid'){
      card.innerHTML=`<div class="ft">${isProj?'🚀':'📁'}</div>
        <div class="fbdg ${isProj?'prj-bdg':'fdr-bdg'}">${isProj?'PROJECT':'FOLDER'}</div>
        ${isSel?'<div class="fck">✓</div>':''}
        <div class="fb"><div class="fn" title="${esc(folder.name)}">${esc(folder.name)}</div>
        <div class="fm"><span>${allF.length} files</span><span>${fmtB(allF.reduce((a,f)=>a+(f.size||0),0))}</span></div></div>`;
    } else {
      card.innerHTML=`<div class="ft">${isProj?'🚀':'📁'}</div>
        <div class="fbdg ${isProj?'prj-bdg':'fdr-bdg'}">${isProj?'PROJECT':'FOLDER'}</div>
        <div class="fb"><div class="fn">${esc(folder.name)}</div>
        <div class="fm"><span>${allF.length} files</span><span>${fmtB(allF.reduce((a,f)=>a+(f.size||0),0))}</span></div></div>
        ${isSel?'<div class="fck">✓</div>':''}`;
    }

    card.addEventListener('click',()=>{ if(SelMode){ toggleSel(folder.id); }else{ navToFolder(folder.id); } });
    card.addEventListener('contextmenu',e=>{ e.preventDefault(); openCtx(e,folder.id,'folder'); });
    card.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',JSON.stringify({id:folder.id,type:'folder'})));
    card.addEventListener('dragover',e=>{ e.preventDefault(); card.style.outline='2px solid var(--g)'; });
    card.addEventListener('dragleave',()=>card.style.outline='');
    card.addEventListener('drop',e=>{ e.preventDefault(); card.style.outline=''; try{ const{id,type}=JSON.parse(e.dataTransfer.getData('text/plain')); if(id===folder.id)return; if(type==='file'){ const f=getFile(id); if(f){ f.folderId=folder.id; f.path=folderPath(folder.id)+'/'+f.name; LS.saveData(CU.username,CD); renderAll(); toast('Moved to '+folder.name,'ok'); } } else { const fo=getFolder(id); if(fo&&fo.id!==folder.id){ fo.parentId=folder.id; LS.saveData(CU.username,CD); renderAll(); toast('Folder moved.','ok'); } } }catch{} });
    wrap.appendChild(card);
  });

  // Render files
  files.forEach(file=>{
    const ext=file.name.split('.').pop().toLowerCase();
    const isImg=CATS.images.includes(ext);
    const isVid=CATS.videos.includes(ext);
    const isHtmlFile=isHtml(file.name);
    const isSel=Sel.has(file.id);

    const card=mk('div','fc'+(isHtmlFile?' prj':'')+(isSel?' sel':''));
    card.dataset.id=file.id; card.dataset.type='file';
    card.draggable=true;

    let thumb='';
    if(isImg)thumb=`<img src="${file.data}" alt="${esc(file.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover"/>`;
    else if(isVid)thumb=`<video src="${file.data}" preload="none" muted style="width:100%;height:100%;object-fit:cover"></video>`;
    else thumb=getIcon(file.name);

    if(View==='grid'){
      card.innerHTML=`<div class="ft">${thumb}</div>
        ${isHtmlFile?'<div class="fbdg html-bdg">HTML</div>':''}
        ${isSel?'<div class="fck">✓</div>':''}
        <div class="fb">
          <div class="fn" title="${esc(file.name)}">${esc(file.name)}</div>
          <div class="fm"><span>${fmtB(file.size)}</span><span>${ago(file.added)}</span></div>
          ${NAV==='all'?`<div class="fp">${esc(file.path||'/')}</div>`:''}
        </div>`;
    } else {
      card.innerHTML=`<div class="ft">${thumb}</div>
        ${isHtmlFile?'<div class="fbdg html-bdg">HTML</div>':''}
        <div class="fb">
          <div class="fn">${esc(file.name)}</div>
          <div class="fm"><span>${fmtB(file.size)}</span><span>${ago(file.added)}</span><span>${esc(file.path||'/')}</span></div>
        </div>
        ${isSel?'<div class="fck">✓</div>':''}`;
    }

    card.addEventListener('click',()=>{ if(SelMode)toggleSel(file.id); else openPreview(file.id); });
    card.addEventListener('contextmenu',e=>{ e.preventDefault(); openCtx(e,file.id,'file'); });
    card.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',JSON.stringify({id:file.id,type:'file'})));
    wrap.appendChild(card);
  });
}

// ── NAVIGATION ─────────────────────────────────────────────────
function navTo(state){
  NAV=state; CurFolder=null; Qry=''; el('srch-inp').value='';
  Sel.clear(); if(SelMode)toggleSelMode();
  el('sidebar').querySelectorAll('.sb-it[data-nav]').forEach(b=>{ b.classList.toggle('active',b.dataset.nav===state); });
  renderAll();
}

function navToFolder(id){
  NAV='folder:'+id; CurFolder=id; Qry=''; el('srch-inp').value='';
  Sel.clear(); if(SelMode)toggleSelMode();
  el('sidebar').querySelectorAll('.sb-it[data-nav]').forEach(b=>b.classList.remove('active'));
  renderAll();
}

function setView(v){
  View=v;
  el('vb-g').classList.toggle('active',v==='grid');
  el('vb-l').classList.toggle('active',v==='list');
  renderFilesArea();
}

// ── SELECTION ──────────────────────────────────────────────────
function toggleSelMode(){
  SelMode=!SelMode;
  el('sel-tog').textContent=SelMode?'✕ Cancel':'☑ Select';
  if(!SelMode)clearSel();
}
function clearSel(){ Sel.clear(); SelMode=false; el('sel-tog').textContent='☑ Select'; updateSelbar(); renderFilesArea(); }
function toggleSel(id){ Sel.has(id)?Sel.delete(id):Sel.add(id); updateSelbar(); renderFilesArea(); }
function updateSelbar(){ const n=Sel.size; el('selbar').classList.toggle('open',n>0); if(n>0)el('sel-cnt').textContent=n+' selected'; }

function selDownload(){
  Sel.forEach(id=>{ const f=getFile(id); if(f)dlFile(f); else exportFolderZip(id); });
  toast(Sel.size+' item(s) downloading.','ok'); clearSel();
}
function selZip(){ exportSelectedZip(); }
function selDelete(){
  const ids=[...Sel];
  const fids=ids.filter(id=>getFolder(id));
  const fileids=ids.filter(id=>getFile(id));
  confirmDelete(fileids,fids);
}

// ── FILE PREVIEW ───────────────────────────────────────────────
function openPreview(id){
  const f=getFile(id); if(!f)return;
  PrevId=id;
  el('prev-ttl').textContent=f.name;
  const ext=f.name.split('.').pop().toLowerCase();
  let html='';

  if(CATS.images.includes(ext)) html=`<img class="pv-img" src="${f.data}" alt="${esc(f.name)}"/>`;
  else if(CATS.videos.includes(ext)) html=`<video class="pv-vid" src="${f.data}" controls></video>`;
  else if(CATS.audio.includes(ext)) html=`<div class="pv-ico">${getIcon(f.name)}</div><audio class="pv-aud" src="${f.data}" controls></audio>`;
  else if(ext==='pdf') html=`<embed src="${f.data}" type="application/pdf" style="width:100%;height:280px;border-radius:5px;border:1px solid var(--bdr)"/>`;
  else if(['txt','md','csv','json','xml','html','htm','css','js','ts','jsx','tsx','py','sh','bat','yaml','yml','log','env','conf','vue','svelte','sql','gitignore','toml','ini'].includes(ext)){
    html=`<div class="pv-ico">${getIcon(f.name)}</div>`;
    try{ const raw=decodeURIComponent(escape(atob(f.data.split(',')[1]))); html+=`<pre class="pv-code">${esc(raw.slice(0,6000))}${raw.length>6000?'\n… (truncated)':''}</pre>`; }
    catch{ html+=`<pre class="pv-code">${esc(atob(f.data.split(',')[1]).slice(0,6000))}</pre>`; }
  }
  else html=`<div class="pv-ico">${getIcon(f.name)}</div>`;

  if(isHtml(f.name)){
    html+=`<div style="margin-top:12px;padding:11px;background:var(--pu-lt);border:1.5px solid var(--pu);border-radius:var(--r)">
      <div style="font-size:12px;font-weight:800;color:var(--pu);margin-bottom:6px">🚀 HTML Project File</div>
      <p style="font-size:11.5px;color:var(--tx2);margin-bottom:9px">Run with all CSS, JS, and images loaded from the same folder.</p>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button class="btn btn-pu btn-sm" id="pv-run-btn">🌐 Run Live Preview</button>
        <button class="btn btn-b btn-sm" id="pv-org-btn">🗂 Suggest Folder Structure</button>
      </div>
    </div>`;
  }

  html+=`<table class="itbl" style="margin-top:13px">
    <tr><td>Name</td><td>${esc(f.name)}</td></tr>
    <tr><td>Category</td><td>${CATI[f.category]||'📄'} ${CATL[f.category]||f.category}</td></tr>
    <tr><td>Size</td><td>${fmtB(f.size)}</td></tr>
    <tr><td>Path</td><td style="font-family:var(--mo);font-size:10.5px">${esc(f.path||'/')}</td></tr>
    <tr><td>Added</td><td>${new Date(f.added).toLocaleString()}</td></tr>
  </table>`;

  el('prev-body').innerHTML=html;

  if(isHtml(f.name)){
    el('pv-run-btn').addEventListener('click',()=>{ closeModal('m-prev'); runProject(id); });
    el('pv-org-btn').addEventListener('click',()=>{ closeModal('m-prev'); openAutoOrganizeForHtml(id); });
  }

  openModal('m-prev');
}

// ── HTML PREVIEW ───────────────────────────────────────────────
function runProject(htmlFileId){
  const htmlFile=getFile(htmlFileId); if(!htmlFile)return;
  closeModal('m-prev');
  const fid=htmlFile.folderId;
  let support=fid?allFilesInFolder(fid).filter(f=>f.id!==htmlFileId):CD.files.filter(f=>!f.folderId&&f.id!==htmlFileId);
  HtmlPrevProject={files:[htmlFile,...support]};
  el('html-ttl').textContent='🌐 '+htmlFile.name;
  buildPreview(htmlFile,support);
  setDevice('full');
  openModal('m-html');
}

function buildPreview(htmlFile,support){
  try{
    // Decode HTML
    let raw='';
    try{ raw=decodeURIComponent(escape(atob(htmlFile.data.split(',')[1]))); }
    catch{ raw=atob(htmlFile.data.split(',')[1]); }

    // Build asset lookup by filename (lowercase)
    const am={};
    support.forEach(sf=>{
      const n=sf.name.toLowerCase();
      am[n]=sf;
      const b=n.split('/').pop().split('?')[0];
      if(!am[b])am[b]=sf;
    });

    function resAsset(val){
      if(!val||/^(?:data:|https?:|blob:|mailto:|javascript:|#)/i.test(val))return null;
      const clean=val.split('?')[0].split('#')[0];
      const base=clean.split('/').pop().toLowerCase();
      return am[base]||am[clean.toLowerCase()]||null;
    }

    function patchCss(css){
      return css.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi,(m,v)=>{ const sf=resAsset(v); return sf?`url("${sf.data}")`:m; });
    }

    function decodeFile(sf){
      try{ return decodeURIComponent(escape(atob(sf.data.split(',')[1]))); }
      catch{ return atob(sf.data.split(',')[1]); }
    }

    // 1. Inline <link rel="stylesheet">
    raw=raw.replace(/<link([^>]*?)>/gi,(match,attrs)=>{
      if(!/rel=["']stylesheet["']/i.test(attrs))return match;
      const hm=attrs.match(/href=["']([^"']+)["']/i);
      if(!hm||/^https?:\/\//i.test(hm[1]))return match;
      const sf=resAsset(hm[1]); if(!sf)return match;
      try{ return`<style>/* inlined:${sf.name} */\n${patchCss(decodeFile(sf))}\n</style>`; }
      catch{ return match; }
    });

    // 2. Inline <script src="...">
    raw=raw.replace(/<script([^>]*?)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,(match,b,src,a)=>{
      if(/^https?:\/\//i.test(src))return match;
      const sf=resAsset(src); if(!sf)return match;
      try{ return`<script${b}${a}>\n/* inlined:${sf.name} */\n${decodeFile(sf)}\n<\/script>`; }
      catch{ return match; }
    });

    // 3. src= and poster= attributes
    raw=raw.replace(/((?:src|poster)=["'])([^"']+)(["'])/gi,(m,pre,val,post)=>{ const sf=resAsset(val); return sf?pre+sf.data+post:m; });

    // 4. href= (non-text resources)
    raw=raw.replace(/(href=["'])([^"']+)(["'])/gi,(m,pre,val,post)=>{
      if(/^(?:https?:|#|javascript:|mailto:)/i.test(val))return m;
      const ext=val.split('.').pop().toLowerCase().split('?')[0];
      if(['css','js','html','htm','php'].includes(ext))return m;
      const sf=resAsset(val); return sf?pre+sf.data+post:m;
    });

    // 5. inline style url()
    raw=raw.replace(/(style=["'])([^"']*url\([^)]+\)[^"']*)(["'])/gi,(m,p,css,s)=>p+patchCss(css)+s);

    // 6. <style> blocks
    raw=raw.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,(m,o,css,c)=>o+patchCss(css)+c);

    // 7. Runtime patcher script
    const miniMap={};
    support.forEach(sf=>{ if((sf.size||0)<4*1024*1024){ const n=sf.name.toLowerCase(); miniMap[n]=sf.data; const b=n.split('/').pop(); if(!miniMap[b])miniMap[b]=sf.data; } });
    const rtp=`<script id="__bp_rt__">
(function(){
var A=${JSON.stringify(miniMap).replace(/<\/script>/gi,'<\\/script>')};
function res(v){if(!v||/^(?:data:|https?:|blob:|#|javascript:)/i.test(v))return null;var c=v.split('?')[0].split('#')[0];var b=c.split('/').pop().toLowerCase();return A[b]||A[c.toLowerCase()]||null;}
function fixEl(n){if(!n||n.nodeType!==1)return;['src','poster'].forEach(function(a){var v=n.getAttribute&&n.getAttribute(a);if(v){var r=res(v);if(r)n.setAttribute(a,r);}});var s=n.getAttribute&&n.getAttribute('style');if(s&&s.indexOf('url(')>-1)n.setAttribute('style',s.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi,function(m,v){var r=res(v);return r?'url("'+r+'")':m;}));n.querySelectorAll&&n.querySelectorAll('[src],[poster],[style*="url("]').forEach(fixEl);}
function fixStyles(){document.querySelectorAll('style').forEach(function(s){var t=s.textContent;var p=t.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi,function(m,v){var r=res(v);return r?'url("'+r+'")':m;});if(p!==t)s.textContent=p;});}
function init(){fixEl(document.documentElement);fixStyles();}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(fixEl);});}).observe(document.documentElement,{childList:true,subtree:true});
})();
<\/script>`;

    const hci=raw.indexOf('</head>');
    raw=hci>-1?raw.slice(0,hci)+rtp+raw.slice(hci):rtp+raw;

    // Create blob
    const blob=new Blob([raw],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const frame=el('hpf');
    if(_blobUrl){ URL.revokeObjectURL(_blobUrl); }
    _blobUrl=url;
    frame.src=url;

  }catch(err){
    el('hpf').srcdoc=`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;color:#b83232"><h3>⚠ Preview Error</h3><pre style="font-size:11px;background:#fdeaea;padding:12px;border-radius:6px;overflow:auto">${esc(String(err))}</pre><p style="font-size:12px;color:#666;margin-top:10px">Tip: Upload all CSS/JS/image files in the same folder as your HTML.</p></body></html>`;
  }
}

function setDevice(w){
  const frame=el('hpf'), wrap=el('iframe-wrap');
  document.querySelectorAll('.dev-btn').forEach(b=>b.classList.remove('active'));
  if(w==='full'){ frame.style.width='100%'; wrap.style.overflowX='hidden'; el('dev-sz').textContent=''; el('dev-full').classList.add('active'); }
  else{ const px=parseInt(w); frame.style.width=px+'px'; wrap.style.overflowX='auto'; el('dev-sz').textContent=px+'px'; const m={'1280':'dev-desk','768':'dev-tab','390':'dev-mob','375':'dev-xs'}; if(m[w])el(m[w]).classList.add('active'); }
  frame.style.height='62vh';
}

function openInBrowser(){ if(_blobUrl)window.open(_blobUrl,'_blank'); else toast('No preview active.','warn'); }

// ── AUTO-ORGANIZE ENGINE ───────────────────────────────────────
// GitHub-standard folder structure for web projects:
//
//  project-name/
//  ├── index.html          ← main HTML (root)
//  ├── assets/
//  │   ├── css/            ← stylesheets
//  │   ├── js/             ← scripts
//  │   ├── images/         ← images
//  │   ├── fonts/          ← font files
//  │   ├── audio/          ← audio files
//  │   └── video/          ← video files
//  ├── libs/               ← 3rd-party libraries (CDN local copies)
//  ├── data/               ← JSON / XML / CSV data files
//  ├── docs/               ← documentation / text files / PDFs
//  └── vendor/             ← vendored 3rd-party code

// Extension → folder mapping
const AO_MAP = {
  // CSS / SCSS / SASS → assets/css
  css:    { folder:'assets/css',    label:'Stylesheets' },
  scss:   { folder:'assets/css',    label:'Stylesheets' },
  sass:   { folder:'assets/css',    label:'Stylesheets' },
  less:   { folder:'assets/css',    label:'Stylesheets' },
  // Images → assets/images
  jpg:    { folder:'assets/images', label:'Images' },
  jpeg:   { folder:'assets/images', label:'Images' },
  png:    { folder:'assets/images', label:'Images' },
  gif:    { folder:'assets/images', label:'Images' },
  webp:   { folder:'assets/images', label:'Images' },
  svg:    { folder:'assets/images', label:'Images' },
  bmp:    { folder:'assets/images', label:'Images' },
  ico:    { folder:'assets/images', label:'Images' },
  tiff:   { folder:'assets/images', label:'Images' },
  tif:    { folder:'assets/images', label:'Images' },
  avif:   { folder:'assets/images', label:'Images' },
  // Fonts → assets/fonts
  woff:   { folder:'assets/fonts',  label:'Fonts' },
  woff2:  { folder:'assets/fonts',  label:'Fonts' },
  ttf:    { folder:'assets/fonts',  label:'Fonts' },
  otf:    { folder:'assets/fonts',  label:'Fonts' },
  eot:    { folder:'assets/fonts',  label:'Fonts' },
  // Audio → assets/audio
  mp3:    { folder:'assets/audio',  label:'Audio' },
  wav:    { folder:'assets/audio',  label:'Audio' },
  ogg:    { folder:'assets/audio',  label:'Audio' },
  flac:   { folder:'assets/audio',  label:'Audio' },
  aac:    { folder:'assets/audio',  label:'Audio' },
  m4a:    { folder:'assets/audio',  label:'Audio' },
  opus:   { folder:'assets/audio',  label:'Audio' },
  // Video → assets/video
  mp4:    { folder:'assets/video',  label:'Video' },
  webm:   { folder:'assets/video',  label:'Video' },
  mkv:    { folder:'assets/video',  label:'Video' },
  avi:    { folder:'assets/video',  label:'Video' },
  mov:    { folder:'assets/video',  label:'Video' },
  ogv:    { folder:'assets/video',  label:'Video' },
  // Data → data/
  json:   { folder:'data',          label:'Data' },
  xml:    { folder:'data',          label:'Data' },
  csv:    { folder:'data',          label:'Data' },
  yaml:   { folder:'data',          label:'Data' },
  yml:    { folder:'data',          label:'Data' },
  // Docs → docs/
  pdf:    { folder:'docs',          label:'Documents' },
  txt:    { folder:'docs',          label:'Documents' },
  md:     { folder:'docs',          label:'Documents' },
  doc:    { folder:'docs',          label:'Documents' },
  docx:   { folder:'docs',          label:'Documents' },
  // Config / env → (keep at root — don't move)
  env:    { folder:null,            label:'Root (config)' },
  gitignore:{ folder:null,          label:'Root (config)' },
  htaccess:{ folder:null,           label:'Root (config)' },
  toml:   { folder:null,            label:'Root (config)' },
  ini:    { folder:null,            label:'Root (config)' },
  conf:   { folder:null,            label:'Root (config)' },
};

// For JS files, detect if it looks like a library vs app code
function aoJsFolder(filename) {
  const n = filename.toLowerCase();
  // Common library name patterns → libs/
  const libPatterns = [
    'jquery','bootstrap','react','vue','angular','svelte','alpine',
    'lodash','underscore','moment','axios','fetch','popper','tippy',
    'gsap','anime','three','d3','chart','highcharts','apexchart',
    'swiper','slick','owl','glide','splide','lottie','aos',
    'normalize','reset','bulma','tailwind','foundation','materialize',
    'fontawesome','ionicons','feather','lucide','heroicon',
    'scrollreveal','scrollmagic','wow','animate','particles',
    'select2','chosen','flatpickr','pikaday','datepicker',
    'quill','tinymce','codemirror','prism','highlight',
    'socket','firebase','supabase','stripe','paypal',
    '.min.','bundle.','vendor.','lib.','-lib','-min'
  ];
  const isLib = libPatterns.some(p => n.includes(p));
  if (isLib) return 'libs';
  // TypeScript definition files → libs/
  if (n.endsWith('.d.ts')) return 'libs';
  // Map files (source maps) → assets/js
  if (n.endsWith('.map')) return 'assets/js';
  // Default app JS → assets/js
  return 'assets/js';
}

// State for auto-organize
let _aoPlan = null;       // { projectFolderId, items:[{file, targetFolder, targetFolderId, isNew}] }
let _aoOptions = {};      // checkbox states
let _aoHtmlFileId = null; // html file that triggered organize

// Build the organize plan for a set of files in a context
function buildAoPlan(htmlFileId, contextFolderId) {
  // Gather all files in context (same folder as HTML, or all root files)
  let allFiles;
  if (contextFolderId !== null) {
    allFiles = allFilesInFolder(contextFolderId);
  } else {
    allFiles = CD.files.filter(f => !f.folderId);
  }

  // Separate HTML from support files
  const htmlFiles = allFiles.filter(f => isHtml(f.name));
  const supportFiles = allFiles.filter(f => !isHtml(f.name));

  // Determine project root folder
  // If files are already in a folder, organize within that folder
  // If files are at root, we create a project folder named after the HTML file
  let projectFolderName = null;
  let projectFolderId = contextFolderId; // null = root

  if (!contextFolderId && htmlFileId) {
    // Suggest a project folder named after the HTML file
    const htmlF = getFile(htmlFileId);
    if (htmlF) {
      projectFolderName = htmlF.name.replace(/\.html?$/i,'').replace(/[^a-zA-Z0-9_-]/g,'-').toLowerCase() || 'my-project';
    }
  }

  // Build plan items
  const items = [];
  const folderCache = {}; // folderPath → folderId (will be resolved on apply)

  // HTML files stay at project root (or current folder root)
  htmlFiles.forEach(f => {
    items.push({
      file: f,
      targetFolder: null, // root of project
      targetFolderPath: projectFolderName || '(root)',
      targetFolderLabel: '📄 Project Root (HTML stays here)',
      action: f.folderId === projectFolderId ? 'keep' : 'move',
      isHtmlRoot: true
    });
  });

  // Support files
  supportFiles.forEach(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    let mapping = AO_MAP[ext] || null;
    let targetPath, targetLabel, action;

    if (ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx' || ext === 'mjs') {
      targetPath = aoJsFolder(f.name);
      targetLabel = targetPath === 'libs' ? '📚 libs/ (Library)' : '⚙️ assets/js/ (App Script)';
    } else if (mapping && mapping.folder) {
      targetPath = mapping.folder;
      targetLabel = '📁 ' + targetPath + '/';
    } else if (!mapping) {
      // Unknown extension — keep at root or assets/
      targetPath = 'assets';
      targetLabel = '📦 assets/ (Other)';
    } else {
      // mapping.folder === null → keep at root
      targetPath = null;
      targetLabel = '📄 Project Root (config file)';
    }

    // Check if already in correct place
    const currentFolderPath = f.folderId ? folderPath(f.folderId) : '/';
    const alreadyCorrect = targetPath === null
      ? (!f.folderId || f.folderId === projectFolderId)
      : currentFolderPath.endsWith('/' + targetPath);

    items.push({
      file: f,
      targetFolder: targetPath,
      targetFolderPath: targetPath || '(root)',
      targetFolderLabel: targetLabel,
      action: alreadyCorrect ? 'keep' : 'move'
    });
  });

  return {
    projectFolderName,
    projectFolderId,
    items,
    htmlFileId,
    contextFolderId
  };
}

// Get or create nested folder by path like "assets/css" under a parent
function getOrCreateNestedFolder(pathStr, parentId) {
  if (!pathStr) return parentId || null;
  const parts = pathStr.split('/').filter(Boolean);
  let curParentId = parentId || null;
  for (const part of parts) {
    let existing = CD.folders.find(f => f.name === part && f.parentId === curParentId);
    if (!existing) {
      existing = { id: uid(), name: part, parentId: curParentId, created: Date.now(), isProject: false };
      CD.folders.push(existing);
    }
    curParentId = existing.id;
  }
  return curParentId;
}

// Open auto-organize for a specific HTML file
function openAutoOrganizeForHtml(htmlFileId) {
  _aoHtmlFileId = htmlFileId;
  const f = getFile(htmlFileId);
  const ctx = f ? f.folderId : null;
  openAutoOrganizeModal(htmlFileId, ctx, f ? f.name : 'Project');
}

// Open auto-organize for all files (global button)
function openAutoOrganize() {
  // Find first HTML file or use all files
  const firstHtml = CD.files.find(f => isHtml(f.name));
  _aoHtmlFileId = firstHtml ? firstHtml.id : null;
  const ctx = firstHtml ? firstHtml.folderId : null;
  openAutoOrganizeModal(_aoHtmlFileId, ctx, firstHtml ? firstHtml.name : 'All Files');
}

function openAutoOrganizeModal(htmlFileId, contextFolderId, title) {
  _aoPlan = buildAoPlan(htmlFileId, contextFolderId);
  _aoOptions = { createProjectFolder: !contextFolderId && !!_aoPlan.projectFolderName };

  el('ao-title').textContent = '🗂 Smart Auto-Organize';
  el('ao-subtitle').textContent = 'Analyzing: ' + title;

  renderAoBody(false);
  openModal('m-autoorg');
}

function renderAoBody(showPreview) {
  if (!_aoPlan) return;
  const plan = _aoPlan;
  const body = el('ao-body');

  const moveItems = plan.items.filter(i => i.action === 'move');
  const keepItems = plan.items.filter(i => i.action === 'keep');
  const newFolderPaths = [...new Set(plan.items.filter(i=>i.action==='move'&&i.targetFolder).map(i=>i.targetFolder))];

  let html = '';

  // Info banner
  html += `<div class="ao-info">
    ℹ️ Backpack will organize your files into GitHub-standard web project folders automatically.
    HTML file stays at root. JS goes to <code>assets/js/</code> or <code>libs/</code>, CSS to <code>assets/css/</code>, images to <code>assets/images/</code>, and so on.
  </div>`;

  // Stats
  html += `<div class="ao-stats">
    <div class="ao-stat"><div class="asn">${plan.items.length}</div><div class="asl">Total Files</div></div>
    <div class="ao-stat"><div class="asn">${moveItems.length}</div><div class="asl">To Organize</div></div>
    <div class="ao-stat"><div class="asn">${newFolderPaths.length}</div><div class="asl">Folders to Create</div></div>
  </div>`;

  // Option: create project root folder
  if (plan.projectFolderName) {
    html += `<div class="ao-sec-title">⚙️ Options</div>`;
    html += `<label class="ao-opt">
      <input type="checkbox" id="ao-chk-projfolder" ${_aoOptions.createProjectFolder ? 'checked' : ''}>
      <div><div class="aot">Create project root folder: <code>${esc(plan.projectFolderName)}/</code></div>
      <div class="aos">Wraps all files in a named project folder (recommended for GitHub)</div></div>
    </label>`;
  }

  // Group by target folder
  const byFolder = {};
  plan.items.forEach(item => {
    const key = item.targetFolderPath;
    if (!byFolder[key]) byFolder[key] = { label: item.targetFolderLabel, items: [], isHtmlRoot: item.isHtmlRoot };
    byFolder[key].items.push(item);
  });

  html += `<div class="ao-sec-title">📋 File Distribution Plan</div>`;

  Object.entries(byFolder).sort((a,b) => {
    // HTML root first
    if (a[1].isHtmlRoot) return -1;
    if (b[1].isHtmlRoot) return 1;
    return a[0].localeCompare(b[0]);
  }).forEach(([path, group]) => {
    const isNew = !group.isHtmlRoot && group.items.some(i => i.action === 'move');
    const existingFolder = path !== '(root)' && CD.folders.find(f => f.name === path.split('/').pop() && !f.parentId);
    const bdgClass = group.isHtmlRoot ? 'html' : (existingFolder ? 'exist' : 'new');
    const bdgLabel = group.isHtmlRoot ? 'HTML' : (existingFolder ? 'EXISTS' : 'NEW');

    html += `<div class="ao-folder-card">
      <div class="ao-folder-head">
        <span style="font-size:15px">${group.isHtmlRoot ? '🌐' : '📁'}</span>
        <span class="aofn">${esc(path === '(root)' ? 'Project Root' : path + '/')}</span>
        <span class="ao-bdg ${bdgClass}">${bdgLabel}</span>
        <span style="font-size:10.5px;color:var(--tx3);margin-left:4px">${group.items.length} file${group.items.length!==1?'s':''}</span>
      </div>
      <div class="ao-file-list">
        ${group.items.map(item => `
          <div class="ao-file-row">
            <span class="afi">${getIcon(item.file.name)}</span>
            <span class="afn" title="${esc(item.file.name)}">${esc(item.file.name)}</span>
            <span class="afs">${fmtB(item.file.size)}</span>
            <span class="aft ${item.action}">${item.action === 'move' ? '→ Move' : '✓ OK'}</span>
          </div>`).join('')}
      </div>
    </div>`;
  });

  if (moveItems.length === 0) {
    html += `<div style="text-align:center;padding:20px;color:var(--g);font-weight:700;font-size:13px">✅ Already perfectly organized!</div>`;
  }

  body.innerHTML = html;

  // Bind checkbox
  const projChk = el('ao-chk-projfolder');
  if (projChk) {
    projChk.addEventListener('change', function() {
      _aoOptions.createProjectFolder = this.checked;
    });
  }
}

function aoPreview() {
  renderAoBody(true);
  toast('Preview updated.', 'info');
}

function aoApply() {
  if (!_aoPlan) return;
  const plan = _aoPlan;
  const moveItems = plan.items.filter(i => i.action === 'move');

  if (moveItems.length === 0) {
    toast('Already organized — nothing to move.', 'info');
    closeModal('m-autoorg');
    return;
  }

  // Determine project root parent
  let projectRootId = plan.contextFolderId || null;

  // Optionally create project root folder
  if (_aoOptions.createProjectFolder && plan.projectFolderName) {
    let projFolder = CD.folders.find(f => f.name === plan.projectFolderName && !f.parentId);
    if (!projFolder) {
      projFolder = { id: uid(), name: plan.projectFolderName, parentId: null, created: Date.now(), isProject: true };
      CD.folders.push(projFolder);
    }
    projectRootId = projFolder.id;
    // Move HTML files to project root too
    plan.items.filter(i => isHtml(i.file.name)).forEach(item => {
      item.file.folderId = projectRootId;
      item.file.path = folderPath(projectRootId) + '/' + item.file.name;
    });
  }

  // Move each file to its target folder
  const folderIdCache = {}; // "assets/css" → folderId

  moveItems.forEach(item => {
    const targetPath = item.targetFolder; // e.g. "assets/css" or null
    let targetFolderId;

    if (!targetPath) {
      // Keep at project root
      targetFolderId = projectRootId;
    } else {
      const cacheKey = (projectRootId || 'root') + '/' + targetPath;
      if (folderIdCache[cacheKey] !== undefined) {
        targetFolderId = folderIdCache[cacheKey];
      } else {
        targetFolderId = getOrCreateNestedFolder(targetPath, projectRootId);
        folderIdCache[cacheKey] = targetFolderId;
      }
    }

    item.file.folderId = targetFolderId;
    item.file.path = (targetFolderId ? folderPath(targetFolderId) : '') + '/' + item.file.name;
  });

  // Mark project folders as projects
  detectProjects().forEach(p => {
    if (p.folderId) { const f = getFolder(p.folderId); if (f) f.isProject = true; }
    if (projectRootId) { const f = getFolder(projectRootId); if (f) f.isProject = true; }
  });

  LS.saveData(CU.username, CD);
  closeModal('m-autoorg');
  renderAll();

  // Navigate to project folder if we created one
  if (projectRootId) navToFolder(projectRootId);

  toast('✅ Organized ' + moveItems.length + ' file(s) into ' + (Object.keys(folderIdCache).length + (projectRootId ? 1 : 0)) + ' folder(s)!', 'ok');
}

// ── FOLDER PICKER ──────────────────────────────────────────────
function openFp(mode,ids,type){
  FpMode=mode; FpIds=ids; FpDest=null;
  const isMulti=type==='multi';
  el('fp-ttl').textContent=(mode==='move'?'✂️ Move':'📋 Copy')+(isMulti?' '+ids.length+' items':' Item');
  const item=type==='file'?getFile(ids[0]):type==='folder'?getFolder(ids[0]):null;
  el('fp-item-name').textContent=isMulti?ids.length+' selected items':(item?item.name:'');
  el('fp-ok-btn').textContent='✅ '+(mode.includes('move')?'Move Here':'Copy Here');
  el('fp-ok-btn').onclick=fpConfirm; // reset to default
  el('fp-dest-bar').textContent='/ (Root)';
  el('fp-nf-inp').value='';
  buildFpList();
  openModal('m-fp');
}

function buildFpList(){
  const list=el('fp-list'); list.innerHTML='';
  function addItem(folder,depth){
    const d=mk('div','fpi'+(FpDest===(folder?folder.id:null)?' sel':''));
    d.style.paddingLeft=(11+depth*14)+'px';
    d.innerHTML=`<span>${folder?(folder.isProject?'🚀':'📁'):'🎒'}</span> <span>${folder?esc(folder.name):'Root'}</span>`;
    d.addEventListener('click',()=>{
      FpDest=folder?folder.id:null;
      el('fp-dest-bar').textContent=folder?folderPath(folder.id):'/ (Root)';
      list.querySelectorAll('.fpi').forEach(i=>i.classList.remove('sel'));
      d.classList.add('sel');
    });
    list.appendChild(d);
    if(folder)childFolders(folder.id).forEach(c=>addItem(c,depth+1));
    else rootFolders().forEach(c=>addItem(c,0));
  }
  addItem(null,0);
}

function fpNewFolder(){
  const name=el('fp-nf-inp').value.trim();
  if(!name){ toast('Enter folder name.','warn'); return; }
  const folder={id:uid(),name,parentId:FpDest||null,created:Date.now(),isProject:false};
  CD.folders.push(folder);
  FpDest=folder.id;
  LS.saveData(CU.username,CD);
  el('fp-nf-inp').value='';
  el('fp-dest-bar').textContent=folderPath(folder.id);
  buildFpList();
  toast('Folder created.','ok');
}

function fpConfirm(){
  const dest=FpDest;
  const destPath=(dest?folderPath(dest):'')+'/';

  if(FpMode==='move'){
    FpIds.forEach(id=>{
      const f=getFile(id);
      if(f){ f.folderId=dest||null; f.path=destPath+f.name; }
      const folder=getFolder(id);
      if(folder)folder.parentId=dest||null;
    });
    toast('Moved '+FpIds.length+' item(s).','ok');
  } else if(FpMode==='copy'){
    FpIds.forEach(id=>{
      const f=getFile(id);
      if(f){ const c={...f,id:uid(),folderId:dest||null,path:destPath+f.name,added:Date.now()}; CD.files.push(c); }
    });
    toast('Copied '+FpIds.length+' item(s).','ok');
  }

  LS.saveData(CU.username,CD);
  closeModal('m-fp');
  Sel.clear(); updateSelbar();
  renderAll();
}

// ── NEW FOLDER ─────────────────────────────────────────────────
function openNfModal(parentId){
  NfParent=parentId;
  el('nf-parent-lbl').textContent=parentId?getFolder(parentId)?.name||'Folder':'Root';
  el('nf-inp').value='';
  openModal('m-nf');
  setTimeout(()=>el('nf-inp').focus(),80);
}

function doCreateFolder(){
  const name=el('nf-inp').value.trim();
  if(!name){ toast('Enter a folder name.','warn'); return; }
  const folder={id:uid(),name,parentId:NfParent||null,created:Date.now(),isProject:false};
  CD.folders.push(folder);
  LS.saveData(CU.username,CD);
  closeModal('m-nf');
  renderAll();
  toast('Folder "'+name+'" created.','ok');
}

// ── RENAME ─────────────────────────────────────────────────────
function openRename(id,type){
  RenameId=id; RenameType=type;
  const item=type==='file'?getFile(id):getFolder(id);
  el('rename-inp').value=item?item.name:'';
  openModal('m-rename');
  setTimeout(()=>{ el('rename-inp').select(); },80);
}

function doRename(){
  const name=el('rename-inp').value.trim();
  if(!name){ toast('Enter a name.','warn'); return; }
  if(RenameType==='file'){
    const f=getFile(RenameId);
    if(f){ f.name=name; f.category=getCat(name); f.path=(f.folderId?folderPath(f.folderId):'')+'/'+name; }
  } else {
    const fo=getFolder(RenameId); if(fo)fo.name=name;
  }
  LS.saveData(CU.username,CD);
  closeModal('m-rename');
  renderAll();
  toast('Renamed.','ok');
}

// ── CONTEXT MENU ───────────────────────────────────────────────
function openCtx(e,id,type){
  CtxId=id; CtxType=type;
  const ctx=el('ctx');
  const f=type==='file'?getFile(id):null;
  el('ctx-run').style.display=(f&&isHtml(f.name))?'':'none';
  el('ctx-zip').textContent=type==='folder'?'📦 Export Folder ZIP':'📦 Export as ZIP';
  ctx.style.display='block'; ctx.classList.add('open');
  let x=e.clientX,y=e.clientY;
  if(x+185>window.innerWidth)x=window.innerWidth-185;
  if(y+220>window.innerHeight)y=window.innerHeight-220;
  ctx.style.left=x+'px'; ctx.style.top=y+'px';
}

function closeCtx(){ el('ctx').classList.remove('open'); el('ctx').style.display='none'; }

// ── CONFIRM DELETE ─────────────────────────────────────────────
function confirmDelete(fileIds,folderIds){
  const n=fileIds.length+folderIds.length;
  el('conf-ttl').textContent='Delete '+n+' item'+(n!==1?'s':'')+'?';
  el('conf-msg').textContent=folderIds.length?'This will delete the selected item(s) and ALL folder contents. This cannot be undone.':'This will permanently delete '+n+' file'+(n!==1?'s':'')+'. Cannot be undone.';
  el('conf-ok-btn').onclick=()=>{
    closeModal('m-confirm');
    fileIds.forEach(id=>{ CD.files=CD.files.filter(f=>f.id!==id); });
    folderIds.forEach(fid=>{
      const dids=descendantFolderIds(fid);
      dids.forEach(did=>{ CD.files=CD.files.filter(f=>f.folderId!==did); CD.folders=CD.folders.filter(f=>f.id!==did); });
    });
    LS.saveData(CU.username,CD);
    Sel.clear(); updateSelbar();
    renderAll();
    toast('Deleted.','info');
  };
  openModal('m-confirm');
}

function confirmDeleteAll(){
  const{files,folders}=getVisible();
  confirmDelete(files.map(f=>f.id),folders.map(f=>f.id));
}

// ── ZIP EXPORT ─────────────────────────────────────────────────
async function exportCurrentZip(){
  if(NAV.startsWith('folder:')) await exportFolderZip(NAV.replace('folder:',''));
  else{ const{files,folders}=getVisible(); await exportItemsZip(files,folders,'backpack-export'); }
}

async function exportFolderZip(fid){
  if(fid==='root'){ const files=CD.files.filter(f=>!f.folderId); await exportItemsZip(files,[],'root'); return; }
  const folder=getFolder(fid); if(!folder)return;
  const files=allFilesInFolder(fid);
  await exportItemsZip(files,[],folder.name);
}

async function exportSelectedZip(){
  const files=[]; const folderIds=[];
  Sel.forEach(id=>{
    const f=getFile(id); if(f)files.push(f);
    const fo=getFolder(id); if(fo){ folderIds.push(fo.id); allFilesInFolder(fo.id).forEach(ff=>{ if(!files.find(x=>x.id===ff.id))files.push(ff); }); }
  });
  await exportItemsZip(files,[],'backpack-selection');
  clearSel();
}

async function exportItemsZip(files,_,name){
  if(typeof JSZip==='undefined'){ toast('JSZip not available. Check internet.','err'); return; }
  if(!files||!files.length){ toast('Nothing to export.','warn'); return; }
  el('zip-ttl').textContent='📦 Creating '+name+'.zip…';
  el('zip-bar').style.width='0%';
  el('zip-lbl').textContent='Preparing…';
  openModal('m-zip');
  try{
    const zip=new JSZip();
    for(let i=0;i<files.length;i++){
      const f=files[i];
      el('zip-bar').style.width=Math.round((i/files.length)*88)+'%';
      el('zip-lbl').textContent='Adding: '+f.name;
      let zipPath=f.name;
      if(f.folderId){ const fp=folderPath(f.folderId); zipPath=fp.replace(/^\//,'')+'/'+f.name; }
      const b64=f.data.split(',')[1];
      zip.file(zipPath,b64,{base64:true});
      await new Promise(r=>setTimeout(r,0));
    }
    el('zip-bar').style.width='92%'; el('zip-lbl').textContent='Compressing…';
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}},m=>{ el('zip-bar').style.width=(92+m.percent*.08)+'%'; });
    el('zip-bar').style.width='100%'; el('zip-lbl').textContent='Done!';
    await new Promise(r=>setTimeout(r,350));
    closeModal('m-zip');
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=name+'.zip';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),3000);
    toast('Downloaded: '+name+'.zip','ok');
  }catch(err){ closeModal('m-zip'); toast('ZIP error: '+err.message,'err'); console.error(err); }
}

function selZip(){ exportSelectedZip(); }

// ── DOWNLOAD ───────────────────────────────────────────────────
function dlFile(f){
  const a=document.createElement('a'); a.href=f.data; a.download=f.name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── USER MODAL ─────────────────────────────────────────────────
function showUserModal(){
  const files=CD.files, folders=CD.folders;
  const total=files.reduce((a,f)=>a+(f.size||0),0);
  el('user-body').innerHTML=`
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--surf2);border-radius:var(--r);margin-bottom:14px">
      <div style="width:42px;height:42px;border-radius:50%;background:var(--g);color:#fff;font-size:17px;font-weight:800;display:flex;align-items:center;justify-content:center">${(CU.displayName[0]||'?').toUpperCase()}</div>
      <div><div style="font-weight:800;font-size:13.5px">${esc(CU.displayName)}</div><div style="font-size:11px;color:var(--tx2)">@${esc(CU.username)}</div></div>
    </div>
    <table class="itbl">
      <tr><td>Total Files</td><td>${files.length}</td></tr>
      <tr><td>Folders</td><td>${folders.length}</td></tr>
      <tr><td>Projects</td><td>${detectProjects().length}</td></tr>
      <tr><td>Storage Used</td><td>${fmtB(total)}</td></tr>
    </table>`;
  openModal('m-user');
}

// ── MODALS ─────────────────────────────────────────────────────
function openModal(id){ el(id).classList.add('open'); }
function closeModal(id){
  el(id).classList.remove('open');
  if(id==='m-prev'){ el('prev-body').querySelectorAll('audio,video').forEach(e=>{ e.pause(); try{e.src='';}catch{} }); }
  if(id==='m-html'){ const frame=el('hpf'); if(_blobUrl){ URL.revokeObjectURL(_blobUrl); _blobUrl=null; } try{frame.src='about:blank';}catch{} }
}
function closeAllModals(){ document.querySelectorAll('.ov.open').forEach(o=>closeModal(o.id)); }

// ── TOAST ──────────────────────────────────────────────────────
function toast(msg,type=''){
  const wrap=el('toast-wrap');
  const d=mk('div','toast '+type,esc(msg));
  wrap.appendChild(d);
  setTimeout(()=>{ d.style.transition='opacity .3s'; d.style.opacity='0'; setTimeout(()=>d.remove(),300); },3500);
}

// ── SERVICE WORKER ─────────────────────────────────────────────
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}

// ── MOBILE SEARCH TOGGLE ─────────────────────────────────────────
// Wired in bindEvents via btn-search-mobile
function toggleMobileSearch() {
  const searchEl = el('srch-inp').parentElement;
  const isActive = searchEl.classList.toggle('mobile-active');
  if (isActive) {
    el('srch-inp').focus();
  } else {
    el('srch-inp').value = '';
    Qry = '';
    renderFilesArea();
    renderCatGrid();
  }
}
