/***********************
 *  LIFF (แก้เป็นของคุณได้)
 ***********************/
const LIFF_ID = '2008172947-YN7apd90';

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const statusEl   = $('status');
const homeReco   = $('home-reco');
const grid       = $('eventGrid');

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

/* ---------- Utils ---------- */
const setStatus = (t) => { if (statusEl) statusEl.textContent = t ?? ''; };
const isLineUA = /Line/i.test(navigator.userAgent) || /LIFF/i.test(navigator.userAgent);

function fmtDate(dtStr) {
  try { return new Date(dtStr).toLocaleString('en-TH', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return dtStr || '-'; }
}

/* ---------- Flex builder (ใช้ตอนแชร์) ---------- */
function toBubble(ev) {
  return {
    type: 'bubble',
    hero: {
      type: 'image',
      url: ev.image,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover',
      action: { type: 'uri', uri: ev.url || 'https://line.me/' },
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
          action: { type: 'uri', label: 'Get tickets', uri: ev.url || 'https://line.me/' } },
        { type: 'button', style: 'link', height: 'sm', color: '#F79B72',
          action: { type: 'uri', label: 'Share', uri: ev.url || 'https://line.me/' } },
      ],
    },
  };
  function infoRow(label, value) {
    return {
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      contents: [
        { type: 'text', text: label, color: '#aaaaaa', size: 'sm', flex: 1 },
        { type: 'text', text: value, color: '#666666', size: 'sm', flex: 5, wrap: true },
      ],
    };
  }
}
function toFlex(ev) {
  return { type: 'flex', altText: ev.title || 'Bangkok event', contents: toBubble(ev) };
}

/* ---------- โหลด flex-share.json (ตรง ๆ + timeout + ข้อความดีบัก) ---------- */
async function loadEvents() {
  // document.baseURI ให้ URL ที่ตรงกับไฟล์ index ปัจจุบันแน่ ๆ
  const url = new URL('flex-share.json', document.baseURI).href + `?v=${Date.now()}`;
  setStatus('Loading from: ' + url);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000); // กันค้าง 6 วิ

  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' when GET ' + url);

    const data = await res.json();
    if (!Array.isArray(data?.events)) {
      throw new Error('flex-share.json missing "events" array');
    }
    // เติม id ถ้าไม่มี
    return data.events.map((e, i) => ({ id: e.id || 'evt_' + i, ...e }));
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Renderers ---------- */
function card(ev) {
  return `
    <article class="card open-detail" data-id="${ev.id}">
      <img src="${ev.image}" alt="">
      <div class="meta">
        <div class="title">${ev.title}</div>
        <div class="sub">${fmtDate(ev.datetime)} · ${ev.venue}</div>
      </div>
    </article>
  `;
}
function renderRecommend(events) {
  homeReco.innerHTML = events.slice(0, 4).map(card).join('');
}
function renderEventsList(events) {
  grid.innerHTML = events.map(card).join('');
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
  dTicket.href = ev.url || 'https://line.me/';
  sheet.classList.add('open');
}
function closeDetail() { sheet.classList.remove('open'); currentEvent = null; }

sheetClose.addEventListener('click', closeDetail);
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeDetail(); });

dShare.addEventListener('click', async () => {
  if (!currentEvent) return;
  if (!window.liff || !liff.isApiAvailable?.('shareTargetPicker')) {
    alert('Open inside LINE to share.');
    return;
  }
  try {
    await liff.shareTargetPicker([toFlex(currentEvent)]);
  } catch (err) {
    if (err?.code !== 'USER_CANCEL') alert(err?.message || String(err));
  }
});

/* ---------- การ์ด → เปิดรายละเอียด ---------- */
document.body.addEventListener('click', (e) => {
  const el = e.target.closest('.open-detail');
  if (!el) return;
  const id = el.dataset.id;
  const ev = (window.__EVENTS__ || []).find((x) => x.id === id);
  if (ev) openDetail(ev);
});

/* ---------- Nav / Close ---------- */
function goto(name) {
  const views = {
    home: document.getElementById('view-home'),
    events: document.getElementById('view-events'),
  };
  Object.values(views).forEach((v) => v.classList.remove('active'));
  (views[name] || views.home).classList.add('active');

  document.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.target === name)
  );
  document.querySelectorAll('.chip[data-target]').forEach((c) =>
    c.classList.toggle('chip--active', c.dataset.target === name)
  );
}
document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => goto(t.dataset.target))
);
document.querySelectorAll('.chip[data-target]').forEach((c) =>
  c.addEventListener('click', () => goto(c.dataset.target))
);
goEvents?.addEventListener('click', (e) => { e.preventDefault(); goto('events'); });

btnClose?.addEventListener('click', () => {
  if (window.liff && liff.closeWindow) liff.closeWindow();
  else window.close?.();
});

/* ---------- Boot ---------- */
(async function boot() {
  // 1) init LIFF (เพื่อเปิดใช้ share เมื่ออยู่ใน LINE)
  try {
    if (isLineUA || /miniapp\.line\.me/.test(document.referrer)) {
      await liff.init({ liffId: LIFF_ID });
      try { await liff.getProfile(); } catch {}
    }
  } catch (e) {
    // เปิดนอก LINE ให้เป็น preview ได้ เงียบ ๆ
    console.warn('LIFF init failed (preview mode):', e);
  }

  // 2) โหลด events แล้วเรนเดอร์
  try {
    setStatus('Loading…');
    const events = await loadEvents();
    window.__EVENTS__ = events;
    renderRecommend(events);
    renderEventsList(events);
    setStatus('');
  } catch (err) {
    console.error(err);
    setStatus('Failed to load events: ' + (err?.message || err));

    // Fallback demo ให้ UI โผล่สำหรับทดสอบ
    const demo = [
      {
        id: 'demo_1',
        title: 'ART ISLAND FESTIVAL',
        datetime: '2025-09-26T16:00:00+07:00',
        venue: 'Rama III',
        image: 'https://picsum.photos/800/400?1',
        url: 'https://example.com/tickets/art-island',
        price: 'Free',
        tagline: '3 days of art, music & food!'
      },
      {
        id: 'demo_2',
        title: 'City Music Live',
        datetime: '2025-10-04T20:00:00+07:00',
        venue: 'Asiatique',
        image: 'https://picsum.photos/800/400?2',
        url: 'https://example.com/tickets/music-live',
        price: '฿890',
        tagline: 'Live bands by the river'
      }
    ];
    window.__EVENTS__ = demo;
    renderRecommend(demo);
    renderEventsList(demo);
  }

  goto('home');
})();
