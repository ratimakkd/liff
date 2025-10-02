const LIFF_ID = '2008172947-YN7apd90';

const $ = (id) => document.getElementById(id);
const homeReco = $('home-reco');
const grid     = $('eventGrid');
const statusEl = $('status');

const sheet      = $('detailSheet');
const sheetClose = $('sheetClose');
const dImg       = $('dImg');
const dTitle     = $('dTitle');
const dSub       = $('dSub');
const dPlace     = $('dPlace');
const dDate      = $('dDate');
const dPrice     = $('dPrice');
const dTicket    = $('dTicket');
const dShare     = $('dShare');

const btnClose   = $('btnClose');
const goEvents   = $('goEvents');

const isLineUA = /Line/i.test(navigator.userAgent) || /LIFF/i.test(navigator.userAgent);
const setStatus = (t) => { if (statusEl) statusEl.textContent = t || ''; };

function fmtDate(dtStr) {
  try { return new Date(dtStr).toLocaleString('en-TH', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return dtStr || '-'; }
}

function infoRow(label, value) {
  return {
    type: 'box', layout: 'baseline', spacing: 'sm',
    contents: [
      { type: 'text', text: label, color: '#aaaaaa', size: 'sm', flex: 1 },
      { type: 'text', text: value, color: '#666666', size: 'sm', flex: 5, wrap: true },
    ],
  };
}

function toBubble(ev) {
  return {
    type: 'bubble',
    hero: {
      type: 'image',
      url: ev.image,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover',
      action: { type: 'uri', uri: ev.url },
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        { type: 'text', text: ev.title || 'Untitled', weight: 'bold', size: 'lg', wrap: true },
        { type: 'text', text: ev.tagline || '', size: 'sm', color: '#A6D6D6', wrap: true, margin: 'md' },
        infoRow('Place', ev.venue || '-'),
        infoRow('Date & Time', fmtDate(ev.datetime)),
        infoRow('Price', ev.price || '-'),
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      flex: 0,
      contents: [
        { type: 'button', style: 'primary', height: 'md', color: '#A6D6D6',
          action: { type: 'uri', label: 'Get tickets', uri: ev.url } },
        // { type: 'button', style: 'link', height: 'sm', color: '#F79B72',
        //   action: { type: 'uri', label: 'Share', uri: ev.url } },
      ],
    },
  };
}
const toFlex = (ev) => ({ type: 'flex', altText: ev.title || 'Bangkok event', contents: toBubble(ev) });

/* ---------- Loader: flex-share.json ---------- */
/** รองรับ 2 รูปแบบ:
 * 1) { "events": [ {id,title,datetime,venue,image,url,price,tagline}, ... ] }
 * 2) Flex object: { type:"flex", contents:{ type:"bubble" | "carousel", ... } }
 *    จะ extract บับเบิลเป็น event อัตโนมัติ
 */
async function loadEvents() {
  const url = new URL('flex-share.json', document.baseURI).href + `?v=${Date.now()}`;
  setStatus('Loading events…');

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
  const data = await res.json();

  const events = normalizeToEvents(data);
  if (!events.length) throw new Error('No events found in flex-share.json');
  // เติม id ถ้าไม่มี
  return events.map((e, i) => ({ id: e.id || `evt_${i}`, ...e }));
}

/* แปลง flex -> events (ดึง title/image/venue/datetime/price/tagline เท่าที่หาได้) */
function normalizeToEvents(data) {
  if (Array.isArray(data?.events)) return data.events;

  // ถ้าเป็น flex object
  if (data?.type === 'flex' && data?.contents) {
    const c = data.contents;
    if (c.type === 'bubble') return [bubbleToEvent(c)];
    if (c.type === 'carousel' && Array.isArray(c.contents)) {
      return c.contents.map(bubbleToEvent);
    }
  }

  // ถ้าเป็น array ของ event อยู่แล้ว
  if (Array.isArray(data)) return data;

  return [];
}

function bubbleToEvent(b) {
  const image = b?.hero?.url || '';
  const url   = b?.hero?.action?.uri || findFooterUrl(b) || '';
  const { title, tagline } = extractTitleTagline(b?.body);
  const meta = extractMeta(b?.body); // { place, datetime, price }

  return {
    title: title || 'Untitled',
    tagline: tagline || '',
    image, url,
    venue: meta.place || '',
    datetime: meta.datetime || '',
    price: meta.price || '',
  };
}

function extractTitleTagline(body) {
  const out = { title: '', tagline: '' };
  const contents = (body?.contents || []).filter(Boolean);
  const textNodes = [];
  (function walk(nodes){
    for (const n of nodes) {
      if (n.type === 'text') textNodes.push(n.text);
      if (Array.isArray(n.contents)) walk(n.contents);
    }
  })(contents);
  out.title = textNodes[0] || '';
  out.tagline = textNodes[1] || '';
  return out;
}

function extractMeta(body) {
  const meta = { place: '', datetime: '', price: '' };
  (function walk(n){
    if (!n) return;
    if (n.type === 'box' && n.layout === 'baseline' && Array.isArray(n.contents)) {
      const texts = n.contents.filter(x => x.type === 'text').map(x => (x.text || '').trim());
      if (texts.length >= 2) {
        const [label, value] = texts;
        if (/^place$/i.test(label)) meta.place = value;
        else if (/^(date ?& ?time|time|date)$/i.test(label)) meta.datetime = value;
        else if (/^price$/i.test(label)) meta.price = value;
      }
    }
    if (Array.isArray(n.contents)) n.contents.forEach(walk);
  })(body);
  return meta;
}

function findFooterUrl(bubble) {
  const ft = bubble?.footer;
  let found = '';
  (function walk(n){
    if (!n) return;
    if (n.type === 'button' && n.action?.type === 'uri' && n.action?.uri) found = found || n.action.uri;
    if (Array.isArray(n.contents)) n.contents.forEach(walk);
  })(ft);
  return found;
}

const card = (ev) => `
  <article class="card open-detail" data-id="${ev.id}">
    <div class="thumb"><img src="${ev.image}" alt=""></div>
    <div class="meta">
      <div class="title">${ev.title}</div>
      <div class="sub">${fmtDate(ev.datetime)} · ${ev.venue}</div>
    </div>
  </article>`;


function renderRecommend(events) {
  homeReco.innerHTML = events.slice(0, 4).map(card).join('') || '<div class="empty">No events.</div>';
}
function renderEventsList(events) {
  grid.innerHTML = events.map(card).join('') || '<div class="empty">No events.</div>';
}

/* ---------- Detail sheet + Share ---------- */
let currentEvent = null;
function openDetail(ev) {
  currentEvent = ev;
  dImg.src = ev.image || '';
  dTitle.textContent = ev.title || 'Untitled';
  dSub.textContent = ev.tagline || '';
  dPlace.textContent = ev.venue || '-';
  dDate.textContent = fmtDate(ev.datetime);
  dPrice.textContent = ev.price || '-';
  dTicket.href = ev.url;
  sheet.classList.add('open');
}
function closeDetail() { sheet.classList.remove('open'); currentEvent = null; }
sheetClose.addEventListener('click', closeDetail);
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeDetail(); });

dShare.addEventListener('click', async () => {
  if (!currentEvent) return;
  if (!window.liff || !liff.isApiAvailable?.('shareTargetPicker')) {
    alert('Please open inside the LINE app to share.'); return;
  }
  try {
    await liff.shareTargetPicker([toFlex(currentEvent)]);
  } catch (err) {
    if (err?.code !== 'USER_CANCEL') alert(err?.message || String(err));
  }
});

/* ---------- เปิดการ์ด → รายละเอียด ---------- */
document.body.addEventListener('click', (e) => {
  const el = e.target.closest('.open-detail'); if (!el) return;
  const id = el.dataset.id;
  const ev = (window.__EVENTS__ || []).find((x) => x.id === id);
  if (ev) openDetail(ev);
});

/* ---------- Nav / Close ---------- */
function goto(name) {
  const views = { home: $('view-home'), events: $('view-events') };
  Object.values(views).forEach(v => v.classList.remove('active'));
  (views[name] || views.home).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.target === name));
  document.querySelectorAll('.chip[data-target]').forEach(c => c.classList.toggle('chip--active', c.dataset.target === name));
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => goto(t.dataset.target)));
document.querySelectorAll('.chip[data-target]').forEach(c => c.addEventListener('click', () => goto(c.dataset.target)));
goEvents?.addEventListener('click', (e) => { e.preventDefault(); goto('events'); });

btnClose?.addEventListener('click', () => {
  if (window.liff && liff.closeWindow) liff.closeWindow();
  else window.close?.();
});

/* ---------- Boot ---------- */
(async function boot() {
  // เปิดใช้ share ใน LINE (ไม่บังคับให้ login ถ้าเป็น Mini App)
  try {
    if (isLineUA || /miniapp\.line\.me/.test(document.referrer)) {
      await liff.init({ liffId: LIFF_ID });
      try { await liff.getProfile(); } catch {}
    }
  } catch (e) {
    console.warn('LIFF init failed (preview mode):', e);
  }

  try {
    const events = await loadEvents();
    window.__EVENTS__ = events;
    renderRecommend(events);
    renderEventsList(events);
    setStatus('');
  } catch (err) {
    console.error(err);
    setStatus('Failed to load events from flex-share.json');
  }

  goto('home');
})();