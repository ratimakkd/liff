const LIFF_ID = '2008172947-YN7apd90';

// ---------- small helpers ----------
const $ = (id) => document.getElementById(id);
const setText = (id, v) => { const el = $(id); if (el) el.textContent = String(v ?? ""); };
const setAttr = (id, name, v) => { const el = $(id); if (el && v != null) el.setAttribute(name, v); };

// detect running inside LINE Mini App / LIFF client
const isInMiniApp = () =>
  (window.liff && typeof liff.isInClient === "function" && liff.isInClient()) ||
  /miniapp\.line\.me/.test(document.referrer);

// ---------- optional UI buttons (if exist in HTML) ----------
function wireButtons() {
  $("btnLogin")?.addEventListener("click", () => liff.login({ redirectUri: location.href }));
  $("btnLogout")?.addEventListener("click", () => { liff.logout(); location.reload(); });

  // ตัวอย่าง share ถ้ามีปุ่มและเปิดใน LINE
  $("btnShare")?.addEventListener("click", async () => {
    try {
      if (!liff.isApiAvailable?.("shareTargetPicker")) {
        alert("Please open inside LINE to use Share.");
        return;
      }
      await liff.shareTargetPicker([
        { type: "text", text: "Hello from my LIFF app 👋" },
      ]);
    } catch (err) {
      if (err?.code !== "USER_CANCEL") alert(err?.message || String(err));
    }
  });
}

// ---------- feature funcs คุณอ้างในโค้ดเดิม ----------
async function getEnvironment() {
  setText("os", liff.getOS?.());
  setText("lang", liff.getLanguage?.());
  setText("ver", liff.getVersion?.());
  setText("inClient", liff.isInClient?.());
}

async function getUserProfile() {
  const p = await liff.getProfile();
  setText("uid", p.userId);
  setText("displayName", p.displayName);
  setText("statusMessage", p.statusMessage || "");
  setAttr("pictureUrl", "src", p.pictureUrl || "");
}

function getContext() {
  const c = liff.getContext?.();
  setText("context", c ? JSON.stringify(c) : "");
}

function createUniversalLink() {
  const url = liff.permanentLink?.createUrl?.() || location.href;
  const a = $("universalLink");
  if (a) { a.href = url; a.textContent = url; }
}

// ---------- main ----------
async function main() {
  try {
    await liff.init({ liffId: LIFF_ID });

    // แสดงสถานะ login
    const loggedIn = liff.isLoggedIn?.() ?? true;
    setText("isLoggedIn", loggedIn);

    // เปิดบนเว็บ (นอก LINE) และยังไม่ล็อกอิน → ส่งไป login แล้วเด้งกลับ
    if (!isInMiniApp() && !loggedIn) {
      liff.login({ redirectUri: location.href });
      return; // รอ redirect
    }

    // เรียกฟังก์ชันที่ต้องการ (มี/ไม่มีในหน้า ก็ไม่พัง)
    await Promise.allSettled([
      getEnvironment(),
      getUserProfile(),
      getContext(),
      createUniversalLink(),
      // getFriendship() // ถ้าตั้ง scope ถูกต้องค่อยเปิดใช้
    ]);

    wireButtons();
  } catch (e) {
    console.error("LIFF init error:", e);
    alert(`Init failed: ${e?.code ?? ""} ${e?.message ?? e}`);
  }
}

// ให้แน่ใจว่า DOM พร้อมก่อนค่อยเริ่ม
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
