/**
 * AXILogic website.
 *
 * Firebase is loaded lazily: the marketing site works with no Firebase at all,
 * and the SDK is only fetched when someone opens the admin panel or submits
 * the contact form. That keeps first paint fast for ordinary visitors.
 */

import { firebaseConfig, recaptchaSiteKey, isConfigured } from "/firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.14.1";

/* ------------------------------------------------------------------ */
/* small helpers                                                       */
/* ------------------------------------------------------------------ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Build a DOM node with text content only. Nothing user-supplied is ever
 * passed through innerHTML, which removes the whole XSS surface.
 */
function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

const memStore = new Map();
const store = {
  get(k) {
    try {
      const v = localStorage.getItem(k);
      return v !== null ? v : memStore.has(k) ? memStore.get(k) : null;
    } catch {
      return memStore.has(k) ? memStore.get(k) : null;
    }
  },
  set(k, v) {
    memStore.set(k, v);
    try { localStorage.setItem(k, v); } catch { /* private mode */ }
  },
};

/* ------------------------------------------------------------------ */
/* configuration                                                       */
/* ------------------------------------------------------------------ */

const DEFAULTS = {
  name: "AXILogic",
  desc: "SOLUTIONS & CONSULTANCY",
  heroTag: "Software engineering & operations consulting · Maseru",
  heroH1: "Software for businesses that",
  heroH2: "make, move and sell physical things.",
  heroP:
    "Custom ERP, point of sale, mobile apps and web platforms. Built by engineers who have stood on a factory floor, behind a counter and in a warehouse — not just in front of a screen.",
  email: "hello@axilogic.com",
  phone: "+266 0000 0000",
  loc: "Maseru, Lesotho — serving South Africa",
  accent: "#FF6B00",
  ink: "#141618",
  chatMode: "script",
  chatUrl: "",
  chatHi:
    "Ask me about ERP, point of sale, mobile apps, custom builds or how we price. I answer from a fixed script, so for anything specific use the form and a person will reply.",
  chatKb: [
    "erp,sap,syspro,sage,pastel,accounting|We build ERP systems for businesses outgrowing spreadsheets, or fighting a package that never fitted. Where you already have an ERP we usually extend it rather than replace it — ripping out a working finance system is rarely the cheapest answer.",
    "pos,point of sale,till,retail,counter,cash|We build point-of-sale systems for retail and hospitality: offline-first tills that keep selling when the line drops, stock that reconciles against the back office, and cash-up that balances the same evening.",
    "mobile,app,android,ios,phone,react native|Mobile work is React Native, so one codebase covers Android and iOS. Most of what we build is for people working away from a desk: field sales, delivery proof, stock counts, and operators capturing work at the station.",
    "web,website,site,portal,web app,platform|We build both — marketing sites that load fast and rank, and web applications where the real work happens. Next.js and NestJS on Azure. If the site is only a brochure we will tell you so rather than sell you a platform.",
    "custom,bespoke,tailor,off the shelf,package,fit|Everything we build is custom. Off-the-shelf software asks you to change how you work so the software makes sense; we start from your process and shape the system around it. The discovery exists to find where your business genuinely differs from the template.",
    "product,own product,off shelf,licence,saas|We do not sell a packaged product. Every engagement is a build shaped to one client, and you own the source code at the end of it.",
    "consult,consulting,assessment,audit,advice,strategy|The consulting side is where most clients start. We map how information actually moves through your operation and write up what is broken, with evidence. If the answer is a process change rather than software, the report says that.",
    "price,pricing,cost,rate,budget,quote,how much|Projects are quoted on fixed scope after a short paid discovery, so you are not signing a blank cheque. Send an inquiry with a rough description and we will come back with a range.",
    "stack,tech,technology,framework,language|Next.js and React on the front, NestJS on the back, React Native for mobile, SQL on Azure. We choose boring, well-supported tools on purpose — you should be able to hire someone else to maintain what we build.",
    "time,long,timeline,duration,when|A discovery runs one to two weeks. A first working release is typically six to twelve weeks depending on scope. We keep first scopes deliberately small so you see something real early.",
    "where,location,based,travel,area|We are based in Maseru and work across South Africa. The Free State corridor is day-trip range; Gauteng engagements are planned in blocks.",
    "support,maintain,maintenance,after,warranty|Support is a fixed monthly fee with an agreed response time. No per-seat surprises, and you own the source code.",
    "contact,talk,call,meet,demo,start|Use the form on this page and we reply within one working day, or write to the address in the contact block.",
  ].join("\n"),
  formUrl: "",
  notifyTo: "",
  ga: "",
};

let cfg = { ...DEFAULTS };

/* Only these keys may come from remote config. Anything else is ignored,
   so a compromised Firestore document cannot inject unexpected fields. */
const CONFIG_KEYS = Object.keys(DEFAULTS);
const HEX = /^#[0-9a-fA-F]{6}$/;

function sanitiseConfig(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const k of CONFIG_KEYS) {
    const v = raw[k];
    if (typeof v !== "string") continue;
    if ((k === "accent" || k === "ink") && !HEX.test(v)) continue;
    if ((k === "chatUrl" || k === "formUrl") && v && !/^https:\/\//.test(v)) continue;
    out[k] = v.slice(0, 12000);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* content                                                             */
/* ------------------------------------------------------------------ */

const CAPS = [
  { k: "01", h: "ERP systems", p: "Order to cash, stock, production and costing in one place — built to fit your process instead of forcing you into someone else's.", l: ["Custom builds and package extensions", "Stock, BOM, costing, dispatch", "Migration off spreadsheets", "Reporting that closes the same week"] },
  { k: "02", h: "Point of sale", p: "Tills that keep selling when the internet drops, and reconcile cleanly against the back office the moment it returns.", l: ["Offline-first transactions", "Multi-branch stock and pricing", "Cash-up that balances tonight", "Card, cash and mobile payments"] },
  { k: "03", h: "Mobile applications", p: "For people working away from a desk — reps, drivers, stock counters, operators. One React Native codebase, Android and iOS.", l: ["Field sales and route selling", "Proof of delivery and signatures", "Barcode and stock counting", "Works on a bad signal"] },
  { k: "04", h: "Web applications", p: "Customer portals, internal tools, dashboards, booking systems. The places where your business actually gets done.", l: ["Customer and supplier portals", "Internal operations tools", "Dashboards and reporting", "Role-based access and audit trails"] },
  { k: "05", h: "Websites", p: "Fast, accessible, and built to be found. If a brochure site is all you need, we will say so rather than sell you a platform.", l: ["Marketing sites and landing pages", "Search and performance first", "Content you can edit yourself", "Hosting and domain setup"] },
  { k: "06", h: "Operations consulting", p: "Where most clients start. We map how information moves through your business and write up what is broken, with evidence.", l: ["On-site process mapping", "Graded written findings", "System selection and scoping", "Ranked plan of what to fix first"] },
];

const DOMS = [
  { h: "Manufacturers", p: "Discrete and light manufacturing running 50 to 500 people, usually with an ERP in the office and paper on the floor." },
  { h: "Distributors and wholesale", p: "Businesses where stock accuracy, picking and delivery proof decide whether the month is profitable." },
  { h: "Retail and hospitality", p: "Multi-branch operations that need tills, stock and back office to agree without a weekend of spreadsheet work." },
  { h: "Field service", p: "Teams working off-site who need to capture jobs, parts and signatures where the signal is bad." },
];

const FITS = [
  {
    id: "mfg",
    label: "We manufacture",
    build: ["Job capture at the station, on a tablet an operator can use with gloves on", "A live board showing what each line is running and how far behind it is", "Stoppage reasons captured as they happen, not remembered on Friday", "Confirmed production written back to your existing ERP"],
    replace: ["Paper job cards counted at end of shift", "The whiteboard nobody updates after 10am", "A WhatsApp group where the real schedule lives", "Downtime nobody can account for"],
    first: "8–10 weeks",
    scope: "One line first",
  },
  {
    id: "dist",
    label: "We distribute and wholesale",
    build: ["A picking app with barcode scanning that stops the wrong item leaving", "Proof of delivery with signature and photo, captured offline", "Live stock across branches with transfers that actually reconcile", "Reorder alerts based on your real lead times, not a default"],
    replace: ["Printed pick slips and handwritten corrections", "Phone calls to confirm whether a delivery arrived", "Delivery notes in a folder in the van", "Stock counts that never match the system"],
    first: "6–10 weeks",
    scope: "One warehouse first",
  },
  {
    id: "retail",
    label: "We sell to the public",
    build: ["An offline-first till that keeps trading when the line drops", "Pricing and promotions pushed to every branch at once", "Cash-up that balances the same evening, not on Monday", "One stock picture across the shop floor and the back office"],
    replace: ["A legacy till nobody can get parts or support for", "Manual cash-up and the envelope of slips", "Branch prices that drift apart", "A spreadsheet standing in for stock control"],
    first: "8–12 weeks",
    scope: "One branch first",
  },
  {
    id: "field",
    label: "Our people work off-site",
    build: ["Jobs dispatched to a phone with everything the tech needs on it", "Parts, hours and photos captured on site, offline if needed", "Customer signature at completion, syncing when signal returns", "Invoicing triggered by job completion rather than a weekly catch-up"],
    replace: ["Phone calls to find out where everyone is", "Paper job cards that arrive days later, or not at all", "Parts used that nobody billed for", "Invoices going out two weeks after the work"],
    first: "6–10 weeks",
    scope: "One team first",
  },
  {
    id: "unsure",
    label: "We are not sure yet",
    build: ["Time on site watching how the work actually happens", "A map of where information moves and where it stops", "A graded written report, every finding evidenced", "A ranked plan of what to fix, cheapest and highest impact first"],
    replace: ["A vague sense that something is wrong", "Three vendors giving three different answers", "Quotes for systems nobody has scoped properly", "Buying software before understanding the problem"],
    first: "1–2 weeks",
    scope: "Consulting only",
  },
];

const STACK = ["Next.js", "NestJS", "React", "React Native", "TypeScript", "Azure SQL", "Azure", "PostgreSQL", "Node.js", "REST and GraphQL", "Docker", "CI/CD"];

const STEPS = [
  { h: "We come and look", p: "One or two days on site. We watch a shift, follow a job or an order end to end, and talk to the people doing the work rather than only the people managing it.", o: "Output: scope note" },
  { h: "We write down what we found", p: "A graded report on where information breaks. Every finding is evidenced. If the honest answer is a process change rather than software, that is what the report says.", o: "Output: assessment report" },
  { h: "We design it and cost it", p: "What gets captured, where, by whom. Which systems talk to which. Costed, sequenced, and small enough to actually finish.", o: "Output: design and fixed quote" },
  { h: "We build it and prove it", p: "One line, one branch, one team first. It either changes the numbers or it does not, and you decide about the rest with real evidence.", o: "Output: working system, measured" },
];

const ROWS = [
  { n: "Order 4471", s: "24 units · powder coat", t: 420, st: "run" },
  { n: "Order 4468", s: "branch transfer · 3 pallets", t: 380, st: "run" },
  { n: "Order 4462", s: "site install · team B", t: 240, st: "warn" },
  { n: "Order 4455", s: "awaiting stock", t: 300, st: "stop" },
  { n: "Order 4450", s: "retail replenishment", t: 520, st: "run" },
];
const CHIP_CLASS = { run: "c-run", warn: "c-warn", stop: "c-stop" };
const CHIP_LABEL = { run: "On track", warn: "Behind", stop: "Blocked" };

/* ------------------------------------------------------------------ */
/* rendering                                                           */
/* ------------------------------------------------------------------ */

function renderStatic() {
  const caps = $("#caps");
  CAPS.forEach((c) => {
    const card = el("div", "cap");
    card.append(el("div", "cap-k", c.k), el("h3", null, c.h), el("p", null, c.p));
    const ul = el("ul");
    c.l.forEach((x) => ul.append(el("li", null, x)));
    card.append(ul);
    caps.append(card);
  });

  const doms = $("#doms");
  DOMS.forEach((d) => {
    const box = el("div", "dom");
    box.append(el("h3", null, d.h), el("p", null, d.p));
    doms.append(box);
  });

  const strip = $("#strip");
  STACK.concat(STACK).forEach((s) => strip.append(el("span", "strip-item", s)));

  const steps = $("#steps");
  STEPS.forEach((s, i) => {
    const row = el("div", "step");
    const mid = el("div");
    mid.append(el("h3", null, s.h), el("p", null, s.p));
    row.append(el("div", "step-n", String(i + 1)), mid, el("div", "step-o", s.o));
    steps.append(row);
  });

  const rows = $("#uiRows");
  ROWS.forEach((r, i) => {
    const row = el("div", "ui-row");
    const left = el("div");
    left.append(el("div", "ui-n", r.n), el("div", "ui-s", r.s));
    const count = el("div", "ui-c");
    const b = el("b", null, "0");
    b.dataset.c = String(i);
    count.append(b, document.createTextNode(" "), el("i", null, `/ ${r.t}`));
    row.append(left, count, el("div", `chip ${CHIP_CLASS[r.st]}`, CHIP_LABEL[r.st]));
    rows.append(row);
  });

  $("#yr").textContent = String(new Date().getFullYear());
  renderPicker();
}

function renderPicker() {
  const picker = $("#picker");
  FITS.forEach((f, i) => {
    const b = el("button", i === 0 ? "on" : null, f.label);
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", i === 0 ? "true" : "false");
    b.addEventListener("click", () => {
      $$("#picker button").forEach((x) => {
        x.classList.remove("on");
        x.setAttribute("aria-selected", "false");
      });
      b.classList.add("on");
      b.setAttribute("aria-selected", "true");
      renderFit(f);
    });
    picker.append(b);
  });
  renderFit(FITS[0]);
}

function renderFit(f) {
  const box = $("#fit");
  box.textContent = "";
  box.classList.remove("fit-in");
  void box.offsetWidth; // restart the animation
  box.classList.add("fit-in");

  const a = el("div", "fit-col");
  a.append(el("div", "fit-k", "What we would build"), el("h3", null, "The system"));
  const ua = el("ul");
  f.build.forEach((x) => ua.append(el("li", null, x)));
  a.append(ua);

  const b = el("div", "fit-col");
  b.append(el("div", "fit-k", "What it replaces"), el("h3", null, "What goes away"));
  const ub = el("ul");
  f.replace.forEach((x) => ub.append(el("li", "was", x)));
  b.append(ub);

  const band = el("div", "fit-band");
  const s1 = el("span", null, "Typical first release ");
  s1.append(el("b", null, f.first));
  const s2 = el("span", null, "Starting scope ");
  s2.append(el("b", null, f.scope));
  const s3 = el("span", null, "You own the source code");
  band.append(s1, s2, s3);

  box.append(a, b, band);
}

function renderBrandName(name) {
  // Split a CamelCase brand name so the leading capitals carry the accent weight.
  const host = $("#bName");
  host.textContent = "";
  const m = /^([A-Z0-9]+)(?=[A-Z][a-z])/.exec(name);
  if (m) {
    host.append(el("span", "bn-a", m[1]), el("span", "bn-b", name.slice(m[1].length)));
  } else {
    host.textContent = name;
  }
}

function applyConfig() {
  const s = document.documentElement.style;
  s.setProperty("--accent", cfg.accent);
  s.setProperty("--ink", cfg.ink);
  renderBrandName(cfg.name);
  $("#bDesc").textContent = cfg.desc;
  $("#heroTag").textContent = cfg.heroTag;

  const h = $("#heroH");
  h.textContent = cfg.heroH1 + " ";
  h.append(el("span", "quiet", cfg.heroH2));

  $("#heroP").textContent = cfg.heroP;
  $("#cEmail").textContent = cfg.email;
  $("#cPhone").textContent = cfg.phone;
  $("#cLoc").textContent = cfg.loc;
  $("#fBrand").textContent =
    cfg.name + " " + cfg.desc.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  $("#chatMode").textContent =
    cfg.chatMode === "live" ? "Connected to endpoint" : "Scripted mode";
  document.title = cfg.name + " — software built for how your business actually runs";
}

/* ------------------------------------------------------------------ */
/* transformation rig                                                  */
/* ------------------------------------------------------------------ */

const PANEL_COUNT = 12;
const panels = [];
const SCATTER = [
  [-150, -120, 320, -58, 42, -26], [62, -175, 255, 44, -38, 18],
  [178, -95, 395, -30, 55, 32], [240, 55, 300, 38, 48, -40],
  [-215, 45, 255, 52, -36, 22], [-95, 180, 375, -46, 30, -34],
  [105, 150, 290, 35, -52, 26], [225, -160, 340, -40, -44, -18],
  [-250, -55, 300, 48, 38, 30], [45, 205, 355, -52, -30, -24],
  [-130, 120, 265, 30, 50, 36], [190, 180, 320, -36, 42, -30],
];

function makePanels() {
  const body = $("#rigBody");
  const ui = $("#rigUi");
  for (let i = 0; i < PANEL_COUNT; i++) {
    const p = el("div", "pnl");
    p.style.left = (i % 4) * 25 + "%";
    p.style.top = Math.floor(i / 4) * 33.334 + "%";
    body.insertBefore(p, ui);
    panels.push(p);
  }
}

function updateRig() {
  const sec = $("#rig");
  if (!sec) return;
  const rect = sec.getBoundingClientRect();
  const total = sec.offsetHeight - innerHeight;
  const p = clamp(-rect.top / (total || 1), 0, 1);
  const narrow = innerWidth < 760;
  const k = narrow ? 0.55 : 1;

  panels.forEach((node, i) => {
    const s = SCATTER[i];
    let t = clamp((p - i * 0.022) / 0.7, 0, 1);
    t = t * t * (3 - 2 * t);
    node.style.transform =
      `translate3d(${lerp(s[0] * k, 0, t).toFixed(2)}px,${lerp(s[1] * k, 0, t).toFixed(2)}px,${lerp(s[2] * k, 0, t).toFixed(2)}px)` +
      ` rotateX(${lerp(s[3], 0, t).toFixed(2)}deg) rotateY(${lerp(s[4], 0, t).toFixed(2)}deg) rotateZ(${lerp(s[5], 0, t).toFixed(2)}deg)`;
    node.style.opacity = String(clamp(t * 1.6, 0.1, 1));
    node.classList.toggle("hot", p > 0.34 && p < 0.86);
  });

  const settle = clamp(p / 0.8, 0, 1);
  const rot = 1 - settle;
  $("#rigBody").style.transform =
    `rotateX(${(rot * (narrow ? 12 : 20)).toFixed(2)}deg) rotateY(${(rot * (narrow ? -14 : -24)).toFixed(2)}deg) scale(${lerp(0.86, 1, settle).toFixed(3)})`;
  $("#rigUi").style.opacity = String(clamp((p - 0.78) / 0.14, 0, 1));
  $("#rigBar").style.width = (p * 100).toFixed(1) + "%";

  const stage = p < 0.34 ? 0 : p < 0.78 ? 1 : 2;
  $$(".leg").forEach((l) => l.classList.toggle("on", Number(l.dataset.leg) === stage));
}

const counts = ROWS.map(() => 0);
function tickBoard() {
  $$("#uiRows [data-c]").forEach((b, i) => {
    const st = ROWS[i].st;
    if (st === "run" && Math.random() > 0.5) counts[i]++;
    if (st === "warn" && Math.random() > 0.8) counts[i]++;
    if (Number(b.textContent) !== counts[i]) {
      b.textContent = String(counts[i]);
      b.style.color = cfg.accent;
      setTimeout(() => { b.style.color = ""; }, 400);
    }
  });
  const c = $("#clock");
  if (c) c.textContent = new Date().toTimeString().slice(0, 8);
}

function updateStrip() {
  const track = $("#strip");
  if (!track) return;
  const box = track.parentElement.getBoundingClientRect();
  if (box.bottom < 0 || box.top > innerHeight) return;
  const p = 1 - (box.top + box.height) / (innerHeight + box.height);
  track.style.transform = `translateX(${(-p * track.scrollWidth * 0.4).toFixed(1)}px)`;
}

let scrollQueued = false;
function onScroll() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    $("#nav").classList.toggle("stuck", scrollY > 24);
    if (!reduced) { updateRig(); updateStrip(); }
    scrollQueued = false;
  });
}

/* ------------------------------------------------------------------ */
/* toasts                                                              */
/* ------------------------------------------------------------------ */

function toast(title, body, kind) {
  const t = el("div", "toast" + (kind ? " " + kind : ""));
  t.append(el("div", "toast-t", title));
  if (body) t.append(el("div", "toast-b", body));
  $("#toasts").append(t);
  requestAnimationFrame(() => t.classList.add("in"));
  setTimeout(() => {
    t.classList.remove("in");
    setTimeout(() => t.remove(), 500);
  }, 5200);
  return t;
}

/* ------------------------------------------------------------------ */
/* lazy Firebase                                                       */
/* ------------------------------------------------------------------ */

let fb = null;
let fbLoading = null;

async function loadFirebase() {
  if (fb) return fb;
  if (!isConfigured()) return null;
  if (fbLoading) return fbLoading;

  fbLoading = (async () => {
    const [appMod, authMod, dbMod] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]);
    const app = appMod.initializeApp(firebaseConfig);

    if (recaptchaSiteKey) {
      try {
        const check = await import(`${SDK}/firebase-app-check.js`);
        check.initializeAppCheck(app, {
          provider: new check.ReCaptchaV3Provider(recaptchaSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (e) {
        console.warn("App Check unavailable:", e);
      }
    }

    const auth = authMod.getAuth(app);
    await authMod.setPersistence(auth, authMod.browserSessionPersistence);

    fb = { app, auth, db: dbMod.getFirestore(app), authMod, dbMod };
    return fb;
  })();

  return fbLoading;
}

/* ------------------------------------------------------------------ */
/* remote config                                                       */
/* ------------------------------------------------------------------ */

async function loadRemoteConfig() {
  const f = await loadFirebase();
  if (!f) return;
  try {
    const { doc, getDoc } = f.dbMod;
    const snap = await getDoc(doc(f.db, "config", "site"));
    if (snap.exists()) {
      cfg = { ...cfg, ...sanitiseConfig(snap.data()) };
      applyConfig();
    }
  } catch (e) {
    console.warn("Config not loaded, using defaults:", e.code || e.message);
  }
}

/* ------------------------------------------------------------------ */
/* contact form                                                        */
/* ------------------------------------------------------------------ */

const formOpenedAt = Date.now();
let lastSubmitAt = 0;

function validate(d) {
  const e = {};
  if (!d.name || d.name.trim().length < 2) e.name = "Enter your name.";
  if (d.name && d.name.length > 120) e.name = "That name is too long.";
  if (!d.company || d.company.trim().length < 2) e.company = "Enter your company.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email || "")) e.email = "Enter a valid work email.";
  if (!d.message || d.message.trim().length < 12) e.message = "Tell us a little more — a sentence or two.";
  if (d.message && d.message.length > 4000) e.message = "That is longer than the form accepts.";
  return e;
}

async function submitInquiry(ev) {
  ev.preventDefault();
  const form = ev.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());

  // Honeypot: a real person never fills a field they cannot see.
  if (data.website) { form.reset(); toast("Thank you", "We will be in touch."); return; }

  // Anything submitted within three seconds of page load is a bot.
  if (Date.now() - formOpenedAt < 3000) {
    toast("Hold on", "Take a moment to fill the form in properly.", "err");
    return;
  }

  // Client-side throttle. The real limit lives in the Firestore rules.
  if (Date.now() - lastSubmitAt < 30000) {
    toast("Just sent", "Give it half a minute before sending another.", "err");
    return;
  }

  $$("[data-err]").forEach((x) => { x.textContent = ""; });
  const errs = validate(data);
  if (Object.keys(errs).length) {
    for (const [k, v] of Object.entries(errs)) {
      const node = $(`[data-err="${k}"]`);
      if (node) node.textContent = v;
    }
    toast("Check the form", "A few fields still need attention.", "err");
    return;
  }

  const btn = $("#sendBtn");
  btn.disabled = true;
  btn.textContent = "Sending…";

  const record = {
    name: data.name.trim().slice(0, 120),
    company: data.company.trim().slice(0, 140),
    email: data.email.trim().slice(0, 200),
    type: String(data.type || "").slice(0, 80),
    message: data.message.trim().slice(0, 4000),
    ref: "INQ-" + Date.now().toString(36).toUpperCase(),
  };

  let stored = false;
  const f = await loadFirebase();
  if (f) {
    try {
      const { collection, addDoc, serverTimestamp } = f.dbMod;
      await addDoc(collection(f.db, "inquiries"), {
        ...record,
        createdAt: serverTimestamp(),
        handled: false,
        source: location.hostname,
      });
      stored = true;
    } catch (e) {
      console.error("Firestore write failed:", e.code || e.message);
    }
  }

  // Optional mirror to a second endpoint.
  if (cfg.formUrl && /^https:\/\//.test(cfg.formUrl)) {
    try {
      await fetch(cfg.formUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      stored = true;
    } catch { /* already handled below */ }
  }

  btn.disabled = false;
  btn.textContent = "Send inquiry";
  lastSubmitAt = Date.now();

  if (stored) {
    form.reset();
    $("#formNote").textContent = "";
    toast("Inquiry sent", `Reference ${record.ref}. We reply within one working day.`, "ok");
  } else {
    const queue = JSON.parse(store.get("axi.pending") || "[]");
    queue.unshift({ ...record, at: new Date().toISOString() });
    store.set("axi.pending", JSON.stringify(queue.slice(0, 50)));
    $("#formNote").textContent =
      "No backend is connected, so this did not reach us. Please email it instead — the address is on the left.";
    toast("Not delivered", "This site has no inquiry backend configured yet.", "err");
  }
}

/* ------------------------------------------------------------------ */
/* assistant                                                           */
/* ------------------------------------------------------------------ */

let chatHistory = [];

function knowledge() {
  return cfg.chatKb.split("\n").filter(Boolean).map((line) => {
    const [keys, ans] = line.split("|");
    return {
      k: (keys || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
      a: (ans || "").trim(),
    };
  });
}

function scriptedAnswer(q) {
  const s = q.toLowerCase();
  let best = null;
  let score = 0;
  for (const entry of knowledge()) {
    let n = 0;
    for (const k of entry.k) if (s.includes(k)) n++;
    if (n > score) { score = n; best = entry; }
  }
  return best
    ? best.a
    : "I do not have a scripted answer for that. Send it through the form on this page and a person will reply within one working day.";
}

function say(text, who) {
  const m = el("div", "msg " + who, text);
  $("#chatBody").append(m);
  $("#chatBody").scrollTop = $("#chatBody").scrollHeight;
  return m;
}

function typingBubble() {
  const t = el("div", "msg bot typing");
  t.append(el("i"), el("i"), el("i"));
  $("#chatBody").append(t);
  $("#chatBody").scrollTop = $("#chatBody").scrollHeight;
  return t;
}

let lastAsk = 0;
async function ask(q) {
  const text = String(q || "").trim().slice(0, 1000);
  if (!text) return;
  if (Date.now() - lastAsk < 1200) return;
  lastAsk = Date.now();

  say(text, "me");
  $("#chatIn").value = "";
  const bubble = typingBubble();

  const finish = (reply) => {
    bubble.remove();
    say(reply, "bot");
    chatHistory.push({ role: "user", content: text }, { role: "assistant", content: reply });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
  };

  if (cfg.chatMode === "live" && /^https:\/\//.test(cfg.chatUrl)) {
    try {
      const res = await fetch(cfg.chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: chatHistory }),
      });
      const json = await res.json();
      finish(json.reply || json.text || "The endpoint replied with nothing usable.");
    } catch {
      bubble.remove();
      say("Could not reach the assistant. Falling back to the script: " + scriptedAnswer(text), "bot");
    }
  } else {
    setTimeout(() => finish(scriptedAnswer(text)), 500 + Math.random() * 420);
  }
}

function bootChat() {
  $("#chatBody").textContent = "";
  say(cfg.chatHi, "bot");
  const sug = $("#chatSug");
  sug.textContent = "";
  ["Do you build ERP?", "What about point of sale?", "How do you price?", "Is it all custom?"].forEach((s) => {
    const b = el("button", null, s);
    b.type = "button";
    b.addEventListener("click", () => ask(s));
    sug.append(b);
  });
}

/* ------------------------------------------------------------------ */
/* admin                                                               */
/* ------------------------------------------------------------------ */

let currentUser = null;
let inquiries = [];

function openAdmin() {
  $("#admin").classList.add("on");
  if (!isConfigured()) $("#admSetup").hidden = false;
  loadFirebase().then((f) => {
    if (!f) return;
    f.authMod.onAuthStateChanged(f.auth, (user) => {
      currentUser = user;
      $("#adminLock").hidden = !!user;
      $("#adminMain").hidden = !user;
      $("#adminScope").textContent = user ? user.email : "Not signed in";
      if (user) { fillFields(); loadInquiries(); }
    });
  });
}
function closeAdmin() { $("#admin").classList.remove("on"); }

async function signIn() {
  const f = await loadFirebase();
  if (!f) { $("#admErr").textContent = "Firebase is not configured. See SECURITY.md."; return; }
  const btn = $("#admGo");
  btn.disabled = true;
  $("#admErr").textContent = "";
  try {
    await f.authMod.signInWithEmailAndPassword(f.auth, $("#admEmail").value.trim(), $("#admPw").value);
    $("#admPw").value = "";
  } catch (e) {
    // Deliberately vague: never confirm whether an address has an account.
    $("#admErr").textContent =
      e.code === "auth/too-many-requests"
        ? "Too many attempts. Wait a few minutes."
        : "Sign-in failed. Check the email and password.";
  } finally {
    btn.disabled = false;
  }
}

function fillFields() {
  $$("[data-cfg]").forEach((node) => { node.value = cfg[node.dataset.cfg] || ""; });
}

async function loadInquiries() {
  const f = await loadFirebase();
  if (!f) return;
  const hint = $("#inboxHint");
  try {
    const { collection, query, orderBy, limit, getDocs } = f.dbMod;
    const snap = await getDocs(
      query(collection(f.db, "inquiries"), orderBy("createdAt", "desc"), limit(200))
    );
    inquiries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    hint.textContent = `${inquiries.length} stored in Firestore.`;
    renderInbox();
  } catch (e) {
    hint.textContent = "Could not read inquiries: " + (e.code || e.message);
  }
}

function renderInbox() {
  const box = $("#inbox");
  box.textContent = "";
  $("#inqCount").textContent = inquiries.length ? `(${inquiries.length})` : "";
  if (!inquiries.length) {
    box.append(el("div", "empty", "No inquiries yet. Submit the form on the page to see one land here."));
    return;
  }
  inquiries.forEach((q) => {
    const card = el("div", "inq");
    const head = el("div", "inq-h");
    const when = q.createdAt?.toDate ? q.createdAt.toDate().toLocaleString() : "just now";
    const ref = el("span", "sp", q.ref || "");
    head.append(el("b", null, q.name || ""), el("span", null, q.company || ""), ref, el("span", null, when));
    card.append(head, el("div", "inq-meta", `${q.email || ""} · ${q.type || ""}`), el("p", null, q.message || ""));
    box.append(card);
  });
}

async function saveConfig() {
  const f = await loadFirebase();
  if (!f || !currentUser) { toast("Not signed in", "Sign in to save changes.", "err"); return; }
  try {
    const { doc, setDoc, serverTimestamp } = f.dbMod;
    const clean = sanitiseConfig(cfg);
    await setDoc(doc(f.db, "config", "site"), {
      ...clean,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid,
    });
    toast("Changes saved", "Live for everyone now.", "ok");
  } catch (e) {
    toast("Save failed", e.code || e.message, "err");
  }
}

function exportInquiries() {
  const blob = new Blob([JSON.stringify(inquiries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = el("a");
  a.href = url;
  a.download = "axilogic-inquiries.json";
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* wiring                                                              */
/* ------------------------------------------------------------------ */

function wire() {
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  addEventListener("orientationchange", onScroll, { passive: true });

  $("#burger").addEventListener("click", function () {
    this.setAttribute("aria-expanded", String($("#navLinks").classList.toggle("on")));
  });
  $$("#navLinks a").forEach((a) =>
    a.addEventListener("click", () => $("#navLinks").classList.remove("on"))
  );
  $$("[data-scroll]").forEach((b) =>
    b.addEventListener("click", function () {
      const target = $(this.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    })
  );

  $("#inqForm").addEventListener("submit", submitInquiry);

  $("#chatOpen").addEventListener("click", function () {
    $("#chat").classList.add("on");
    this.classList.add("hide");
    if (!$("#chatBody").children.length) bootChat();
    $("#chatIn").focus();
  });
  $("#chatX").addEventListener("click", () => {
    $("#chat").classList.remove("on");
    $("#chatOpen").classList.remove("hide");
  });
  $("#chatSend").addEventListener("click", () => ask($("#chatIn").value));
  $("#chatIn").addEventListener("keydown", (e) => { if (e.key === "Enter") ask(e.target.value); });

  addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") { e.preventDefault(); openAdmin(); }
    if (e.key === "Escape") {
      closeAdmin();
      $("#chat").classList.remove("on");
      $("#chatOpen").classList.remove("hide");
    }
  });
  if (location.hash === "#admin") openAdmin();
  $("#adminX").addEventListener("click", closeAdmin);
  $("#admin").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeAdmin(); });
  $("#admGo").addEventListener("click", signIn);
  $("#admPw").addEventListener("keydown", (e) => { if (e.key === "Enter") signIn(); });
  $("#signOut").addEventListener("click", async () => {
    const f = await loadFirebase();
    if (f) await f.authMod.signOut(f.auth);
    toast("Signed out", "", "ok");
  });
  $("#saveCfg").addEventListener("click", saveConfig);
  $("#exportInq").addEventListener("click", exportInquiries);

  $$("#tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      $$("#tabs button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      $$(".pane").forEach((p) => p.classList.toggle("on", p.dataset.pane === b.dataset.p));
    })
  );

  document.addEventListener("input", (e) => {
    const key = e.target?.dataset?.cfg;
    if (!key) return;
    cfg[key] = e.target.value;
    $$(`[data-cfg="${key}"]`).forEach((o) => { if (o !== e.target) o.value = e.target.value; });
    applyConfig();
  });
  $$("[data-preset]").forEach((b) =>
    b.addEventListener("click", () => { cfg.accent = b.dataset.preset; fillFields(); applyConfig(); })
  );

  // Two links threading together on load, echoing the chain.
  if (!reduced) {
    const m = $("#axMark");
    if (m) {
      m.style.transformOrigin = "50px 32px";
      m.style.transform = "scale(0.78)";
      m.style.opacity = "0";
      setTimeout(() => {
        m.style.transform = "none";
        m.style.opacity = "1";
      }, 140);
    }
  }
}

/* ------------------------------------------------------------------ */
/* progressive web app                                                 */
/* ------------------------------------------------------------------ */

function initPwa() {
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((e) =>
        console.warn("Service worker registration failed:", e)
      );
    });
  }

  let deferred = null;
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    if (store.get("axi.installDismissed")) return;
    setTimeout(() => {
      if (!deferred) return;
      const t = toast("Install AXILogic", "Add it to your home screen for quick access, and it keeps working offline.");
      const actions = el("div", "toast-actions");
      const go = el("button", "btn btn-primary btn-sm", "Install");
      const no = el("button", "btn btn-ghost btn-sm", "Not now");
      go.addEventListener("click", () => {
        t.remove();
        deferred.prompt();
        deferred.userChoice.finally(() => { deferred = null; });
      });
      no.addEventListener("click", () => { store.set("axi.installDismissed", "1"); t.remove(); });
      actions.append(go, no);
      t.append(actions);
    }, 12000);
  });

  addEventListener("appinstalled", () => {
    store.set("axi.installDismissed", "1");
    toast("Installed", "AXILogic is on your home screen.", "ok");
  });
}

/* ------------------------------------------------------------------ */
/* start                                                               */
/* ------------------------------------------------------------------ */

const observer = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); observer.unobserve(e.target); }
  }),
  { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
);

renderStatic();
applyConfig();
makePanels();
wire();
initPwa();
$$(".rev").forEach((n) => observer.observe(n));
setInterval(tickBoard, 900);
tickBoard();
onScroll();
loadRemoteConfig();
