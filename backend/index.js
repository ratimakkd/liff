const LIFF_ID = '2008172947-YN7apd90';

const statusEl = document.getElementById('status');
const grid = document.getElementById('eventGrid');
const homeReco = document.getElementById('home-reco');
const tabs = [...document.querySelectorAll('.tab')];
const chips = [...document.querySelectorAll('.chip[data-target]')];
const views = {
  home: document.getElementById('view-home'),
  events: document.getElementById('view-events'),
};
const btnClose = document.getElementById('btnClose');
const goEvents = document.getElementById('goEvents');

const sheet = document.getElementById('detailSheet');
const sheetClose = document.getElementById('sheetClose');
const dImg = document.getElementById('dImg');
const dTitle = document.getElementById('dTitle');
const dSub = document.getElementById('dSub');
const dPlace = document.getElementById('dPlace');
const dDate = document.getElementById('dDate');
const dPrice = document.getElementById('dPrice');
const dTicket = document.getElementById('dTicket');
const dShare = document.getElementById('dShare');

const setStatus = (m) => { console.log('[STATUS]', m); if (statusEl) statusEl.textContent = m; };
const isLineUA = /Line/i.test(navigator.userAgent) || /LIFF/i.test(navigator.userAgent);

function fmtDate(dtStr) { try { return new Date(dtStr).toLocaleString('en-TH', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return dtStr || '-'; } }
function assetUrl(name) {
  const base = location.pathname.endsWith('/') ? location.pathname : location.pathname.replace(/\/[^/]*$/, '/');
  return location.origin + base + name;
}

function toBubble(ev) {
  return {
    type: 'bubble',
    hero: { type: 'image', url: ev.image, size: 'full', aspectRatio: '20:13', aspectMode: 'cover',
      action: { type: 'uri', uri: ev.url || 'https://line.me/' } },
    body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
      { type: 'text', text: ev.title || 'Untitled', weight: 'bold', size: 'lg', wrap: true },
      { type: 'text', text: ev.tagline || '', size: 'sm', color: '#A6D6D6', wrap: true, margin: 'md' },
      { type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm', contents: [
        row('Place', ev.venue || '-'),
        row('Date & Time', fmtDate(ev.datetime)),
        row('Price', ev.price || '-'),
      ] }
    ] },
    footer: { type: 'box', layout: 'vertical', spacing: 'sm', flex: 0, contents: [
      { type: 'button', style: 'primary', height: 'md', color: '#A6D6D6',
        action: { type: 'uri', label: 'Get tickets', uri: ev.url || 'https://line.me/' } },
      { type: 'button', style: 'link', height: 'sm', color: '#F79B72',
        action: { type: 'uri', label: 'Share', uri: ev.url || 'https://line.me/' } }
    ] }
  };
  function row(label, value) {
    return { type:'box', layout:'baseline', spacing:'sm', contents:[
      { type:'text', text:label, color:'#aaaaaa', size:'sm', flex:1 },
      { type:'text', text:value, color:'#666666', size:'sm', flex:5, wrap:true },
    ]};
  }
}
function toFlex(ev){ return { type:'flex', altText: ev.title || 'Bangkok event', contents: toBubble(ev) }; }

async function loadEvents() {
  const v='v=1';
  const urls=[ './flex-share.json?'+v, 'flex-share.json?'+v, assetUrl('flex-share.json?'+v) ];
  for(const u of urls){
    try{
      const res=await fetch(u,{cache:'no-store'});
      console.log('[fetch flex-share]', u, res.status);
      if(!res.ok) continue;
      const data=await res.json();
      if(data && Array.isArray(data.events)) return data.events;
    }catch(e){ console.warn('try fail',u,e); }
  }
  throw new Error('Cannot load flex-share.json (events).');
}

function renderHome(recos) {
  homeReco.innerHTML = recos.map(ev => `
    <article class="card open-detail" data-id="${ev.id}">
      <img src="${ev.image}" alt="">
      <div class="meta">
        <div class="title">${ev.title}</div>
        <div class="sub">${fmtDate(ev.datetime)} · ${ev.venue}</div>
      </div>
    </article>
  `).join('');
}
function renderEventsList(events) {
  grid.innerHTML = events.map(ev => `
    <article class="card open-detail" data-id="${ev.id}">
      <img src="${ev.image}" alt="">
      <div class="meta">
        <div class="title">${ev.title}</div>
        <div class="sub">${fmtDate(ev.datetime)} · ${ev.venue}</div>
      </div>
    </article>
  `).join('');
}

let currentEvent=null;
function openDetail(ev){
  currentEvent=ev;
  dImg.src=ev.image||''; dTitle.textContent=ev.title||'Untitled';
  dSub.textContent=ev.tagline||''; dPlace.textContent=ev.venue||'-';
  dDate.textContent=fmtDate(ev.datetime); dPrice.textContent=ev.price||'-';
  dTicket.href=ev.url||'https://line.me/';
  sheet.classList.add('open');
}
function closeDetail(){ sheet.classList.remove('open'); currentEvent=null; }
dShare.addEventListener('click', async()=>{
  if(!currentEvent) return;
  if(!window.liff || !liff.isApiAvailable || !liff.isApiAvailable('shareTargetPicker')){
    alert('Open inside LINE to share.'); return;
  }
  try{ await liff.shareTargetPicker([toFlex(currentEvent)]); }
  catch(err){ if(err?.code!=='USER_CANCEL') alert(err?.message||err); }
});
sheetClose.addEventListener('click', closeDetail);
sheet.addEventListener('click', (e)=>{ if(e.target===sheet) closeDetail(); });

function goto(name){
  Object.values(views).forEach(v=>v.classList.remove('active'));
  (views[name]||views.home).classList.add('active');
  tabs.forEach(t=>t.classList.toggle('active', t.dataset.target===name));
  chips.forEach(c=>c.classList.toggle('chip--active', c.dataset.target===name));
}
tabs.forEach(t=>t.addEventListener('click',()=>goto(t.dataset.target)));
chips.forEach(c=>c.addEventListener('click',()=>goto(c.dataset.target)));
goEvents?.addEventListener('click',(e)=>{ e.preventDefault(); goto('events'); });
btnClose.addEventListener('click',()=>{ if(window.liff && liff.closeWindow) liff.closeWindow(); else window.close?.(); });

(async function boot(){
  try{
    if(isLineUA || /miniapp\.line\.me/.test(document.referrer)){
      await liff.init({ liffId: LIFF_ID });
      try{ await liff.getProfile(); }catch{}
      setStatus('Ready.');
    }else{
      setStatus('Preview mode (open in LINE to share).');
    }
  }catch(e){
    console.warn('LIFF init failed → preview mode:', e);
    setStatus('Preview mode (open in LINE to share).');
  }

  try{
    const events=await loadEvents();
    window.__EVENTS__=events;
    renderHome(events.slice(0,3));
    renderEventsList(events);

    document.body.addEventListener('click',(e)=>{
      const el=e.target.closest('.open-detail'); if(!el) return;
      const ev=(window.__EVENTS__||[]).find(x=>x.id===el.dataset.id);
      if(ev) openDetail(ev);
    });
  }catch(err){
    console.error(err);
    setStatus('Failed to load flex-share.json (events).');
  }

  goto('home');
})();