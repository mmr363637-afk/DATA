/* راستی‌آزمایی لایهٔ هایلایت/نشانه‌ها در jsdom
   ۱) درسنامهٔ عفونی (medx-reader.js + ensureMarksUI)
   ۲) درسنامهٔ چشم‌پزشکی (خودبسنده + marks-lite)
   ۳) بانک آزمون ۷۰۵ سؤالی عفونی (marks-lite + کلید سند پویا)
   ۴) صفحهٔ بخش بانک سؤال (qbank.js + marks-lite + data-marks-doc) */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.resolve(__dirname, "..");
const THEME = p => fs.readFileSync(path.join(ROOT, "assets/theme", p), "utf8");
const ML_JS = THEME("marks-lite.js");
const ML_CSS = THEME("marks-lite.css");

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log("  ✓ " + msg);
  else { console.log("  ✗ " + msg); failures++; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------- ابزارهای کمکی ---------------------------- */
function stubs(win) {
  win.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
  };
  win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  win.requestAnimationFrame = win.requestAnimationFrame || (f => setTimeout(() => f(Date.now()), 16));
  win.cancelAnimationFrame = win.cancelAnimationFrame || clearTimeout;
  win.speechSynthesis = win.speechSynthesis || { speak() {}, cancel() {}, pause() {}, resume() {}, getVoices: () => [], addEventListener() {} };
  win.SpeechSynthesisUtterance = win.SpeechSynthesisUtterance || class { constructor(t) { this.text = t; } };
  win.Element.prototype.scrollIntoView = function () {};
  win.Element.prototype.scrollTo = function () {};
  win.scrollTo = function () {};
  win.HTMLElement.prototype.getBoundingClientRect = function () {
    return { top: 100, left: 40, width: 300, height: 20, right: 340, bottom: 120, x: 40, y: 100 };
  };
  win.Range.prototype.getBoundingClientRect = function () {
    return { top: 120, left: 50, width: 200, height: 18, right: 250, bottom: 138, x: 50, y: 120 };
  };
  win.Range.prototype.getClientRects = function () {
    return [{ top: 120, left: 50, width: 200, height: 18, right: 250, bottom: 138, x: 50, y: 120 }];
  };
  win.matchMedia = win.matchMedia || (q => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
}

/* انتخاب متن ساختگی: jsdom موتور selection کامل ندارد */
function fakeSelection(win) {
  const state = { range: null };
  const sel = {
    get isCollapsed() { return !state.range; },
    get rangeCount() { return state.range ? 1 : 0; },
    getRangeAt: () => state.range,
    removeAllRanges: () => { state.range = null; },
    toString: () => (state.range ? state.range.toString() : ""),
    __set: r => { state.range = r; },
  };
  win.getSelection = () => sel;
  return sel;
}

function selectText(win, sel, node, from, to) {
  const r = win.document.createRange();
  r.setStart(node, from);
  r.setEnd(node, to);
  sel.__set(r);
  return r.toString();
}

function mouseup(win) {
  win.document.dispatchEvent(new win.MouseEvent("mouseup", { bubbles: true }));
}

function firstTextNode(root) {
  const w = root.ownerDocument.createTreeWalker(root, 4 /* SHOW_TEXT */);
  let n;
  while ((n = w.nextNode())) {
    if (n.nodeValue && n.nodeValue.trim().length > 40) return n;
  }
  return null;
}

function externalizeScripts(html, resolver) {
  return html.replace(/<script([^>]*)src="([^"]+)"([^>]*)><\/script>/g, (m, a, src, b) => {
    const file = resolver(src);
    if (!file) return "";
    return "<script>" + fs.readFileSync(file, "utf8") + "</script>";
  });
}

function addMarksLiteInline(html) {
  // نکته: در JS، «$$» در رشتهٔ جایگزینی به «$» تبدیل می‌شود؛ پس از تابع جایگزینی استفاده می‌کنیم
  return html
    .replace("</head>", () => `<style>${ML_CSS}</style></head>`)
    .replace("</body>", () => `<script>${ML_JS}</script></body>`);
}

async function boot(html, opts = {}) {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on("jsdomError", e => errors.push(String((e && e.message) || e)));
  vc.on("error", (...a) => errors.push(a.join(" ")));
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: opts.url || "http://localhost/content/x.html",
    virtualConsole: vc,
    beforeParse(win) {
      stubs(win);
      if (opts.fetchStub) win.fetch = opts.fetchStub;
    },
  });
  await sleep(opts.wait || 260);
  return { win: dom.window, doc: dom.window.document, errors };
}

/* ============= ۰) درسنامهٔ کامل (قلب): لایهٔ خودکار نباید چیزی بسازد ============= */
async function testFullReaderUnchanged() {
  console.log("\n[۰] content/cardio/acute-and-chronic-myocarditis.html — قلاب‌های کامل، بدون UI تکراری");
  const file = path.join(ROOT, "content/cardio/acute-and-chronic-myocarditis.html");
  let html = fs.readFileSync(file, "utf8");
  ok(/id="sheet-marks"/.test(html) && /id="sheet-hlnote"/.test(html), "شیت‌های نشانه‌ها و یادداشت در HTML خودش هست");
  ok(/نویسنده: <b>مهدی محمدرحیمی<\/b>/.test(html), "اعتبار نویسنده در پانویس هست");
  html = externalizeScripts(html, src => {
    const n = src.split("/").pop().split("?")[0];
    const p = path.join(ROOT, "assets/theme", n);
    return fs.existsSync(p) ? p : null;
  });
  const { win, doc, errors } = await boot(html, { wait: 500 });
  ok(doc.querySelectorAll("#sheet-marks").length === 1, "شیت نشانه‌ها دو بار ساخته نشد");
  ok(doc.querySelectorAll("#sheet-hlnote").length === 1, "شیت یادداشت دو بار ساخته نشد");
  ok(doc.querySelectorAll("[data-open-marks]").length > 0, "دکمهٔ «نشانه‌ها» در صفحه هست");
  ok(doc.querySelectorAll(".ml-fab, .ml-selbar").length === 0, "لایهٔ marks-lite اینجا دخالت نکرد");
  ok(doc.querySelectorAll(".marks-fab").length === 0, "لایهٔ خودکار FAB اضافه نکرد");
  const sel = fakeSelection(win);
  const node = firstTextNode(doc.querySelector(".sec[data-sec-id] .sec__body"));
  selectText(win, sel, node, 4, 42);
  mouseup(win);
  await sleep(60);
  ok(doc.querySelector(".selbar").classList.contains("is-on"), "نوار هایلایت کار می‌کند");
  doc.querySelector(".selbar [data-sel-color=\"g\"]") || doc.querySelector(".selbar button");
  const g = doc.querySelector('.selbar [data-sel-color="g"]') || doc.querySelectorAll(".selbar button")[1];
  g.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(60);
  ok(doc.querySelectorAll("mark.hl").length >= 1, "هایلایت سبز ساخته شد");
  if (errors.length) console.log("  (خطاهای jsdom: " + errors.slice(0, 2).join(" | ").slice(0, 200) + ")");
}

/* =========================== ۱) درسنامهٔ عفونی =========================== */
async function testInfectious() {
  console.log("\n[۱] content/infectious/124-approach-infectious-disease.html — medx-reader + ensureMarksUI");
  const file = path.join(ROOT, "content/infectious/124-approach-infectious-disease.html");
  let html = fs.readFileSync(file, "utf8");
  ok(/medx-reader\.js/.test(html), "صفحه medx-reader.js را بارگذاری می‌کند");
  html = externalizeScripts(html, src => {
    const n = src.split("/").pop().split("?")[0];
    const p = path.join(ROOT, "assets/theme", n);
    return fs.existsSync(p) ? p : null;
  });
  const { win, doc, errors } = await boot(html, { wait: 500 });
  ok(!!doc.getElementById("sheet-marks"), "شیت «نشانه‌های من» ساخته شد");
  ok(!!doc.getElementById("sheet-hlnote"), "شیت «هایلایت با یادداشت» ساخته شد");
  ok(!!doc.querySelector("[data-hl-note]"), "جعبهٔ یادداشت هایلایت موجود است");
  ok(doc.querySelectorAll("[data-hlnote-color]").length === 5, "پنج رنگ هایلایت موجود است");
  ok(!!doc.querySelector("[data-marks-list]"), "فهرست نشانه‌ها موجود است");
  ok(!!doc.querySelector("[data-open-marks].marks-fab"), "دکمهٔ شناور نشانه‌ها ساخته شد");
  ok(!!win.MedX && typeof win.MedX.marksFor === "function", "MedX (medx-core) بالا آمده");

  // هایلایت واقعی روی متن درس
  const sel = fakeSelection(win);
  const sec = doc.querySelector(".sec[data-sec-id] .sec__body");
  const node = firstTextNode(sec);
  const picked = selectText(win, sel, node, 3, 40);
  ok(picked.length > 20, "متنی برای هایلایت انتخاب شد: «" + picked.slice(0, 28) + "…»");
  mouseup(win);
  await sleep(60);
  const bar = doc.querySelector(".selbar");
  ok(!!bar && bar.classList.contains("is-on"), "نوار هایلایت روی انتخاب باز شد");
  const noteBtn = bar.querySelector("[data-sel-note]");
  ok(!!noteBtn, "دکمهٔ «هایلایت با یادداشت» در نوار هست");
  noteBtn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(30);
  ok(!doc.getElementById("sheet-hlnote").hidden, "شیت یادداشت باز شد (قبلاً no-op بود)");
  const ta = doc.querySelector("[data-hl-note]");
  ta.value = "یادداشت آزمایش";
  doc.querySelector("[data-hlnote-color='g']").dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  doc.querySelector("[data-hlnote-save]").dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(60);
  const mark = doc.querySelector("mark.hl");
  if (mark) console.log("    (mark: " + mark.outerHTML.slice(0, 150) + ")");
  ok(!!mark, "mark.hl ساخته شد");
  ok(!!mark && mark.getAttribute("data-c") === "g", "رنگ سبز روی mark ثبت شد");
  ok(!!mark && !!mark.getAttribute("data-note") && mark.getAttribute("title") === "یادداشت آزمایش",
    "یادداشت روی mark ثبت شد (data-note + title)");
  const badge = doc.querySelector("[data-marks-badge]");
  ok(!!badge && badge.textContent === "۱" && !badge.hidden, "نشانگر تعداد نشانه‌ها = ۱");
  doc.querySelector("[data-open-marks]").dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(30);
  ok(!doc.getElementById("sheet-marks").hidden, "پنل نشانه‌ها باز شد");
  const list = doc.querySelector("[data-marks-list]");
  ok(list && /یادداشت آزمایش/.test(list.textContent), "پنل، هایلایت + یادداشت را فهرست می‌کند");
  await sleep(200);
  const raw = win.localStorage.getItem("medx.state.v1");
  const keys = [];
  for (let i = 0; i < win.localStorage.length; i++) keys.push(win.localStorage.key(i));
  console.log("    (localStorage keys: " + keys.join(", ") + ")");
  const stored = raw ? JSON.parse(raw) : null;
  const dump = keys.map(k => String(win.localStorage.getItem(k))).join("|");
  ok(/یادداشت آزمایش/.test(dump), "یادداشت در فضای ذخیره‌سازی محلی ماندگار شد");
  if (errors.length) console.log("  (خطاهای jsdom: " + errors.slice(0, 2).join(" | ").slice(0, 200) + ")");
}
function lsKeys(win) { const o = {}; for (let i = 0; i < win.localStorage.length; i++) o[win.localStorage.key(i)] = 1; return Object.keys(o); }

/* ========================= ۲) درسنامهٔ چشم‌پزشکی ========================= */
async function testOphthalmology() {
  console.log("\n[۲] content/ophthalmology/chapter-01.html — خودبسنده + marks-lite");
  const file = path.join(ROOT, "content/ophthalmology/chapter-01.html");
  let html = fs.readFileSync(file, "utf8");
  ok(/marks-lite\.js/.test(html) && /marks-lite\.css/.test(html), "لایهٔ marks-lite لینک شده");
  ok(/<!--ml-credit-->/.test(html) && /نویسنده: <b>مهدی محمدرحیمی<\/b>/.test(html), "اعتبار نویسنده در صفحه هست");
  ok(/<meta name="author" content="مهدی محمدرحیمی">/.test(html), "meta author افزوده شد");
  html = addMarksLiteInline(html);
  const { win, doc, errors } = await boot(html, { wait: 300 });
  ok(!!win.MarksLite, "MarksLite بالا آمده");
  ok(!!doc.querySelector(".ml-fab"), "دکمهٔ شناور «نشانه‌ها» ساخته شد");
  const sel = fakeSelection(win);
  const main = doc.querySelector("main");
  const node = firstTextNode(main);
  const picked = selectText(win, sel, node, 5, 45);
  mouseup(win);
  await sleep(60);
  ok(doc.querySelector(".ml-selbar").classList.contains("is-on"), "نوار رنگ‌ها باز شد");
  doc.querySelector('.ml-selbar__dot[data-c="b"]').dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(60);
  const marks = doc.querySelectorAll("mark.ml-hl");
  ok(marks.length >= 1, "mark.ml-hl ساخته شد (" + marks.length + ")");
  ok(marks[0] && marks[0].getAttribute("data-c") === "b", "رنگ آبی ثبت شد");
  ok(marks.length > 0 && (marks[0].textContent || "").length > 20,
    "متن هایلایت‌شده درست است: «" + (marks.length ? (marks[0].textContent || "").slice(0, 26) : "") + "…»");
  const store = JSON.parse(win.localStorage.getItem("ml-marks/ophthalmology-javadi-chapter-01"));
  ok(store && store.hl.length === 1 && store.hl[0].q.length > 10, "در localStorage با کلید درس ذخیره شد");
  ok(!!doc.querySelector(".ml-fab__n") && doc.querySelector(".ml-fab__n").textContent === "۱", "شمارندهٔ دکمه = ۱");
  doc.querySelector(".ml-fab").dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(20);
  const panel = doc.querySelector(".ml-panel");
  ok(panel && !panel.hidden, "پنل نشانه‌ها باز شد");
  ok(panel.querySelectorAll(".ml-item").length === 1, "یک ردیف هایلایت در پنل");
  ok(!!panel.querySelector("[data-ml-jump]"), "دکمهٔ «رفتن به هایلایت» دارد");
  // حذف
  panel.querySelector("[data-ml-del]").dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(50);
  ok(doc.querySelectorAll("mark.ml-hl").length === 0, "با حذف از پنل، mark پاک شد");
  ok(JSON.parse(win.localStorage.getItem("ml-marks/ophthalmology-javadi-chapter-01")).hl.length === 0, "از ذخیره‌سازی هم پاک شد");
  if (errors.length) console.log("  (خطاهای jsdom: " + errors.slice(0, 2).join(" | ").slice(0, 200) + ")");
}

/* ======================= ۳) بانک آزمون عفونی (۷۰۵) ======================= */
async function testExamBank() {
  console.log("\n[۳] content/subject/infectious-exam.html — بانک آزمون + کلید سند پویا");
  const file = path.join(ROOT, "content/subject/infectious-exam.html");
  let html = fs.readFileSync(file, "utf8");
  html = externalizeScripts(html, src => {
    const n = src.split("/").pop().split("?")[0];
    const p = path.join(ROOT, "assets/theme", n);
    return fs.existsSync(p) ? p : null;
  });
  html = addMarksLiteInline(html);
  const t0 = Date.now();
  const { win, doc, errors } = await boot(html, { wait: 1200 });
  console.log("  (زمان بالا آمدن: " + (Date.now() - t0) + "ms)");
  ok(!!win.MarksLite, "MarksLite بالا آمده");
  const stage = doc.querySelector(".qx__stage");
  ok(!!stage, "صحنهٔ سؤال‌ها (.qx__stage) پیدا شد");
  ok(stage.querySelectorAll(".qx__q").length === 705, "۷۰۵ مقالهٔ سؤال در DOM");
  const visible = [...stage.querySelectorAll(".qx__q")].filter(a => !a.hidden);
  ok(visible.length === 1, "فقط یک سؤال نمایشی است");
  ok(stage.getAttribute("data-marks-doc") === visible[0].getAttribute("data-qid"),
    "کلید سند = data-qid سؤال جاری (" + stage.getAttribute("data-marks-doc") + ")");
  const sel = fakeSelection(win);
  const stem = visible[0].querySelector(".qx__stem");
  const node = firstTextNode(stem);
  const picked = selectText(win, sel, node, 2, 40);
  mouseup(win);
  await sleep(80);
  ok(doc.querySelector(".ml-selbar").classList.contains("is-on"), "نوار رنگ‌ها روی صورت سؤال باز شد");
  doc.querySelector('.ml-selbar__dot[data-c="y"]').dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(80);
  ok(visible[0].querySelectorAll("mark.ml-hl").length >= 1, "هایلایت داخل همان سؤال ساخته شد");
  const qid = visible[0].getAttribute("data-qid");
  const store = JSON.parse(win.localStorage.getItem("ml-marks/infectious-exam"));
  ok(store.hl.length === 1 && store.hl[0].d === qid, "رکورد با کلید سند همان سؤال ذخیره شد");

  // سؤال بعدی → هایلایت قبلی نباید برگردد
  const next = doc.querySelector("[data-bank-next]") || doc.querySelector("[data-qx-next]") ||
    [...doc.querySelectorAll("button")].find(b => /بعدی/.test(b.textContent));
  ok(!!next, "دکمهٔ سؤال بعدی پیدا شد");
  next.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(120);
  const nowVisible = [...stage.querySelectorAll(".qx__q")].filter(a => !a.hidden);
  ok(nowVisible[0] !== visible[0], "سؤال عوض شد");
  ok(nowVisible[0].querySelectorAll("mark.ml-hl").length === 0, "هایلایت سؤال قبلی به سؤال جدید نشت نکرد");
  ok(doc.querySelector(".ml-fab__n").hidden === true, "شمارندهٔ نشانه‌ها برای سند جدید صفر است");

  // بازگشت → هایلایت باید برگردد
  const prev = doc.querySelector("[data-bank-prev]");
  ok(!!prev, "دکمهٔ پرسش قبلی پیدا شد");
  prev.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(200);
  const shown = [...stage.querySelectorAll(".qx__q")].filter(a => !a.hidden && a.style.display !== "none");
  console.log("    (سؤال‌های نمایشی پس از «قبلی»: " + shown.map(a => a.getAttribute("data-qid")).join(",") + ")");
  const back = shown[0];
  ok(back === visible[0], "به سؤال اول برگشتیم");
  ok(back.querySelectorAll("mark.ml-hl").length >= 1, "هایلایت پس از بازگشت بازیابی شد");
  if (errors.length) console.log("  (خطاهای jsdom: " + errors.slice(0, 3).join(" | ").slice(0, 240) + ")");
}

/* ==================== ۴) صفحهٔ بخش بانک سؤال (qbank.js) ==================== */
async function testQbankPart() {
  console.log("\n[۴] content/qbank/inf.html — qbank.js + marks-lite");
  const file = path.join(ROOT, "content/qbank/inf.html");
  let html = fs.readFileSync(file, "utf8");
  ok(/نویسنده: <b>مهدی محمدرحیمی<\/b>/.test(html), "اعتبار نویسنده در پانویس هست");
  ok(/data-marks-key="qb-inf"/.test(html), "کلید marks روی body هست");
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "qbank/data/inf.json"), "utf8"));
  html = externalizeScripts(html, src => {
    const n = src.split("/").pop().split("?")[0];
    const p = path.join(ROOT, "assets/theme", n);
    return fs.existsSync(p) ? p : null;
  });
  html = addMarksLiteInline(html);
  const { win, doc, errors } = await boot(html, {
    wait: 400,
    fetchStub: () => Promise.resolve({ ok: true, json: () => Promise.resolve(data) }),
  });
  const app = doc.getElementById("qb-app");
  ok(!!app && app.querySelector(".qb-stem"), "qbank.js سؤال را رندر کرد");
  ok(app.getAttribute("data-marks-doc") === data[0].id + "|" + data[0].part,
    "کلید سند = شناسهٔ سؤال (" + app.getAttribute("data-marks-doc") + ")");
  ok(!!win.MarksLite, "MarksLite بالا آمده");
  const sel = fakeSelection(win);
  const node = firstTextNode(app.querySelector(".qb-stem"));
  selectText(win, sel, node, 4, 44);
  mouseup(win);
  await sleep(80);
  ok(doc.querySelector(".ml-selbar").classList.contains("is-on"), "نوار رنگ‌ها باز شد");
  doc.querySelector('.ml-selbar__dot[data-c="o"]').dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(80);
  ok(app.querySelectorAll("mark.ml-hl").length >= 1, "هایلایت در صورت سؤال ساخته شد");
  const key = "ml-marks/qb-inf";
  ok(JSON.parse(win.localStorage.getItem(key)).hl[0].d === data[0].id + "|" + data[0].part, "با کلید سند ذخیره شد");
  // سؤال بعدی (qbank.js با تیر راست/چپ یا دکمه جابه‌جا می‌شود)
  const nextBtn = [...doc.querySelectorAll("button")].find(b => /بعدی|next/i.test(b.textContent + b.className));
  if (nextBtn) nextBtn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  else doc.dispatchEvent(new win.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
  await sleep(150);
  ok(app.getAttribute("data-marks-doc") !== data[0].id + "|" + data[0].part, "کلید سند با رفتن به سؤال بعد عوض شد");
  ok(app.querySelectorAll("mark.ml-hl").length === 0, "هایلایت سؤال قبل در سؤال بعد دیده نمی‌شود");
  if (errors.length) console.log("  (خطاهای jsdom: " + errors.slice(0, 3).join(" | ").slice(0, 240) + ")");
}

/* ========= ۶) درسنامهٔ ارتوپدی: marks-lite + «علامت‌گذاری فصل» بومی ========= */
async function testOrthopedics() {
  console.log("\n[۶] content/orthopedics/chapter-01.html — همزیستی marks-lite با سازوکار بومی صفحه");
  const file = path.join(ROOT, "content/orthopedics/chapter-01.html");
  let html = fs.readFileSync(file, "utf8");
  ok(/data-marks-roots="\.sec-body"/.test(html), "فقط بدنهٔ بخش‌ها انتخاب‌پذیر است (نه گزینه‌های آزمون)");
  ok(/<!--ml-credit-->/.test(html), "اعتبار نویسنده افزوده شد");
  html = addMarksLiteInline(html);
  const { win, doc, errors } = await boot(html, { wait: 400 });
  ok(!!win.MarksLite, "MarksLite بالا آمده");
  ok(doc.querySelectorAll(".sec-body").length > 5, "بدنهٔ بخش‌ها پیدا شد (" + doc.querySelectorAll(".sec-body").length + ")");

  // هایلایت رنگی marks-lite
  const sel = fakeSelection(win);
  const node = firstTextNode(doc.querySelector(".sec-body"));
  selectText(win, sel, node, 6, 46);
  mouseup(win);
  await sleep(80);
  ok(doc.querySelector(".ml-selbar").classList.contains("is-on"), "نوار رنگ‌ها باز شد");
  doc.querySelector('.ml-selbar__dot[data-c="p"]').dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(80);
  ok(doc.querySelectorAll("mark.ml-hl[data-c=\"p\"]").length >= 1, "هایلایت صورتی ساخته شد");
  const store = JSON.parse(win.localStorage.getItem("ml-marks/orthopedics/chapter-01"));
  ok(store.hl.length === 1, "در کلید ml-marks/orthopedics/chapter-01 ذخیره شد");

  // سازوکار بومی صفحه (data-hl → body.hl-mode + .mk) باید دست‌نخورده کار کند
  const hlBtn = doc.querySelector("[data-hl]");
  ok(!!hlBtn, "دکمهٔ «علامت‌گذاری» بومی صفحه سر جایش است");
  hlBtn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(40);
  ok(doc.body.classList.contains("hl-mode"), "حالت علامت‌گذاری بومی فعال شد");
  const target = doc.querySelector(".sec-body p") || doc.querySelector(".sec-body li");
  target.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(40);
  ok(doc.querySelectorAll(".mk").length >= 1, "علامت‌گذاری بومی (.mk) کار کرد");
  const native = JSON.parse(win.localStorage.getItem("medx.orthopedics.progress.v1") || "{}");
  ok(!!native && JSON.stringify(native).includes("hl"), "وضعیت بومی هم ذخیره شد (جدا از marks-lite)");
  ok(doc.querySelectorAll("mark.ml-hl").length >= 1, "هایلایت marks-lite با کلیک بومی پاک نشد");
  if (errors.length) console.log("  (خطاهای jsdom: " + errors.slice(0, 3).join(" | ").slice(0, 240) + ")");
}

/* ============================== ۵) بانک ریشه ============================== */
async function testRootBank() {
  console.log("\n[۵] chashm.html (بانک ریشه، خودبسنده) — marks-lite درون‌خطی");
  const file = path.join(ROOT, "chashm.html");
  const html = fs.readFileSync(file, "utf8");
  ok(/__marksLiteLoaded/.test(html), "marks-lite درون‌خطی تزریق شده");
  ok(/<meta name="author" content="مهدی محمدرحیمی">/.test(html), "meta author دارد");
  ok(/<!--ml-credit-->/.test(html), "بلوک اعتبار نویسنده دارد");
  ok(/data-marks-key="chashm-root"/.test(html), "کلید marks روی body");
  const { win, doc, errors } = await boot(html, { wait: 500, url: "http://localhost/chashm.html" });
  ok(!!win.MarksLite, "MarksLite بالا آمده");
  ok(!!doc.getElementById("questionCard"), "کارت سؤال رندر شده");
  ok(doc.getElementById("questionCard").getAttribute("data-marks-doc") === "q1", "کلید سند = q1");
  const sel = fakeSelection(win);
  const node = firstTextNode(doc.getElementById("questionStem") || doc.getElementById("questionCard"));
  selectText(win, sel, node, 3, 38);
  mouseup(win);
  await sleep(80);
  ok(doc.querySelector(".ml-selbar").classList.contains("is-on"), "نوار رنگ‌ها باز شد");
  doc.querySelector('.ml-selbar__dot[data-c="g"]').dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  await sleep(80);
  ok(doc.querySelectorAll("mark.ml-hl").length >= 1, "هایلایت ساخته شد");
  ok(JSON.parse(win.localStorage.getItem("ml-marks/chashm-root")).hl[0].d === "q1", "با کلید سند q1 ذخیره شد");
  if (errors.length) console.log("  (خطاهای jsdom: " + errors.slice(0, 3).join(" | ").slice(0, 240) + ")");
}

(async () => {
  await testFullReaderUnchanged();
  await testInfectious();
  await testOphthalmology();
  await testQbankPart();
  await testRootBank();
  await testOrthopedics();
  await testExamBank();
  console.log("\n" + (failures ? "✗ " + failures + " مورد ناموفق" : "✓ همهٔ راستی‌آزمایی‌ها پاس شدند"));
  process.exit(failures ? 1 : 0);
})();
