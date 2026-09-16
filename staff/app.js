/* Racing — Yard. Staff-side capture for a hire or a sale, built for a phone
   held in one hand at the car.

   Jobs live in localStorage for now; swapping that for a real backend means
   replacing save()/allJobs() and nothing else.

   The licence photo is deliberately NOT kept. It is read, the fields are
   filled, and the image is dropped — licence numbers are sensitive and there
   is no reason to hold the picture once the details are on the form. */

(function () {
  "use strict";

  // ── the fleet, mirroring the public site ────────────────────────────────
  var FLEET = [
    { id: "swift",     name: "Suzuki Swift Sport",  year: 2010, week: 219, price: 8990,  img: "swift" },
    { id: "corolla",   name: "Toyota Corolla Hatch", year: 2011, week: 249, price: 11990, img: "corolla" },
    { id: "focus",     name: "Ford Focus Trend",     year: 2016, week: 259, price: 13990, img: "focus" },
    { id: "commodore", name: "Holden Commodore",     year: 2008, week: 289, price: 9990,  img: "commodore" },
    { id: "audi-a4",   name: "Audi A4 Avant",        year: 2010, week: 379, price: 15990, img: "audi-a4" },
    { id: "territory", name: "Ford Territory AWD",   year: 2008, week: 339, price: 8490,  img: "territory" },
    { id: "bmw-1",     name: "BMW 1 Series Sport",   year: 2017, week: 399, price: null,  img: "bmw-1" },
    { id: "macan",     name: "Porsche Macan",        year: 2015, week: 599, price: 44990, img: "macan" },
    { id: "cayenne",   name: "Porsche Cayenne",      year: 2011, week: 549, price: 29990, img: "cayenne" }
  ];

  var STEPS = {
    hire: ["customer", "vehicle", "terms", "condition", "sign", "done"],
    sale: ["customer", "vehicle", "terms", "sign", "done"]
  };

  var view = document.getElementById("view");
  var foot = document.getElementById("foot");
  var prog = document.getElementById("prog");
  var backBtn = document.getElementById("back");
  var homeBtn = document.getElementById("home");
  var prevBtn = document.getElementById("prev");
  var nextBtn = document.getElementById("next");
  var subtitle = document.getElementById("subtitle");

  var job = null;        // the job being filled in
  var step = null;       // null = home
  var damageType = "scratch";

  // ── storage ─────────────────────────────────────────────────────────────
  function allJobs() {
    try { return JSON.parse(localStorage.getItem("rr_jobs") || "[]"); }
    catch (e) { return []; }
  }
  function save() {
    if (!job) return;
    var jobs = allJobs().filter(function (j) { return j.id !== job.id; });
    jobs.unshift(job);
    try { localStorage.setItem("rr_jobs", JSON.stringify(jobs.slice(0, 200))); }
    catch (e) { /* quota — the job stays in memory for this session */ }
  }
  function blankJob(type) {
    return {
      id: "J" + Date.now().toString(36).toUpperCase(),
      type: type, createdAt: new Date().toISOString(), complete: false,
      customer: {}, vehicle: null, terms: {}, damage: [], shots: [], signature: null
    };
  }

  // ── helpers ─────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return "$" + Number(n).toLocaleString("en-AU"); }
  function today(offset) {
    var d = new Date(); d.setDate(d.getDate() + (offset || 0));
    return d.toISOString().slice(0, 10);
  }
  function field(key, label, opts) {
    opts = opts || {};
    var v = esc(opts.value || "");
    var filled = opts.value ? " filled" : "";
    var input = opts.textarea
      ? '<textarea id="' + key + '" placeholder="' + esc(opts.ph || "") + '">' + v + '</textarea>'
      : '<input id="' + key + '" type="' + (opts.type || "text") + '" value="' + v + '"' +
        (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : "") +
        (opts.mode ? ' inputmode="' + opts.mode + '"' : "") +
        (opts.auto ? ' autocomplete="' + opts.auto + '"' : "") + '>';
    return '<div class="f' + filled + '"><label for="' + key + '">' + label + '</label>' + input + '</div>';
  }

  /* Shrink a picked photo before it goes anywhere: phones produce 4 MB files
     and none of that detail survives a form field. */
  function readPhoto(file, maxPx, quality) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = reject;
      fr.onload = function () {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var s = Math.min(1, maxPx / Math.max(img.width, img.height));
          var c = document.createElement("canvas");
          c.width = Math.round(img.width * s);
          c.height = Math.round(img.height * s);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", quality || 0.75));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* Tesseract does far better on a card that has been flattened to grey with
     the contrast pushed out to the full range, and scaled up a little. */
  function prepForOCR(dataUrl, scale) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        var ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, c.width, c.height);
        var d = ctx.getImageData(0, 0, c.width, c.height), px = d.data;
        var lo = 255, hi = 0, i, g;
        for (i = 0; i < px.length; i += 4) {
          g = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
          px[i] = px[i + 1] = px[i + 2] = g;
          if (g < lo) lo = g;
          if (g > hi) hi = g;
        }
        var span = Math.max(1, hi - lo);
        for (i = 0; i < px.length; i += 4) {
          g = ((px[i] - lo) * 255 / span) | 0;
          g = g < 0 ? 0 : g > 255 ? 255 : g;
          px[i] = px[i + 1] = px[i + 2] = g;
        }
        ctx.putImageData(d, 0, 0);
        resolve(c.toDataURL("image/png"));
      };
      img.src = dataUrl;
    });
  }

  // ── reading a licence ───────────────────────────────────────────────────
  /* Australian licences carry no machine-readable barcode — that is a US card
     feature — so the front is read as text and the fields are pulled out of it.
     The raw text is always shown: that is what a per-state parser gets written
     from, and it is the only way to tell a bad photo from an unknown layout.
     Every field stays editable regardless. */
  function parseLicence(raw) {
    var out = {}, txt = String(raw || "");

    // AAMVA-style tagged fields, if present
    var tags = { DAC: "first", DCS: "last", DAQ: "licence", DBB: "dob", DBA: "expiry",
                 DAG: "addr", DAI: "suburb", DAJ: "state", DAK: "postcode", DCT: "first" };
    Object.keys(tags).forEach(function (t) {
      var m = txt.match(new RegExp(t + "([^\\n\\r]{1,40})"));
      if (m) out[tags[t]] = m[1].trim();
    });
    if (out.first || out.last) {
      out.name = [out.first, out.last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    }

    // otherwise: pull the shapes we can recognise out of the text
    if (!out.licence) {
      var lic = txt.match(/\b(?:LIC(?:ENCE)?\s*(?:NO|#)?[:\s]*)?([0-9]{6,10}[A-Z]?)\b/);
      if (lic) out.licence = lic[1];
    }
    var dates = txt.match(/\b(\d{2})[\/\-. ](\d{2})[\/\-. ](\d{4})\b/g) ||
                txt.match(/\b(\d{8})\b/g) || [];
    function toISO(d) {
      var m = d.match(/(\d{2})\D?(\d{2})\D?(\d{4})/);
      if (m) return m[3] + "-" + m[2] + "-" + m[1];
      m = d.match(/^(\d{4})(\d{2})(\d{2})$/);
      return m ? m[1] + "-" + m[2] + "-" + m[3] : "";
    }
    var iso = dates.map(toISO).filter(Boolean).sort();
    if (iso.length && !out.dob) out.dob = iso[0];
    if (iso.length > 1 && !out.expiry) out.expiry = iso[iso.length - 1];

    if (!out.name) {
      var caps = txt.split(/[\n\r]+/).filter(function (l) {
        return /^[A-Z][A-Z '\-]{4,40}$/.test(l.trim());
      });
      if (caps.length) out.name = caps[0].trim();
    }
    var st = txt.match(/\b(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\b/);
    if (st) out.state = st[1];
    return out;
  }

  var ocrLoading = null;
  function loadOCR() {
    if (typeof Tesseract !== "undefined") return Promise.resolve();
    if (ocrLoading) return ocrLoading;
    ocrLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      s.onload = resolve;
      s.onerror = function () { reject(new Error("could not load the text reader")); };
      document.head.appendChild(s);
    });
    return ocrLoading;
  }

  function status(el, kind, html) {
    el.className = "status " + kind;
    el.innerHTML = (kind === "work" ? '<span class="spin"></span>' : "") + "<span>" + html + "</span>";
    el.hidden = false;
  }

  function applyFields(found) {
    var map = { name: "c-name", licence: "c-lic", dob: "c-dob", expiry: "c-exp",
                state: "c-state", addr: "c-addr" };
    var n = 0;
    Object.keys(map).forEach(function (k) {
      var el = document.getElementById(map[k]);
      if (el && found[k] && !el.value) {
        el.value = found[k];
        el.parentNode.classList.add("filled");
        n++;
      }
    });
    return n;
  }

  // ── the damage diagram ──────────────────────────────────────────────────
  function drawDiagram() {
    var D = window.RR_DIAGRAM;
    return '<div class="views">' + Object.keys(D.VIEWS).map(function (k) {
      var v = D.VIEWS[k];
      return '<div class="view"><h4>' + v.label + '</h4>' +
        '<div class="plate" data-view="' + k + '">' +
          '<svg class="art" viewBox="' + v.box + '">' + v.art + '</svg>' +
        '</div></div>';
    }).join("") + '</div>';
  }

  function paintMarkers() {
    document.querySelectorAll(".plate").forEach(function (p) {
      p.querySelectorAll(".mk").forEach(function (m) { m.remove(); });
    });
    job.damage.forEach(function (d, i) {
      var p = document.querySelector('.plate[data-view="' + d.view + '"]');
      if (!p) return;
      var t = window.RR_DIAGRAM.typeOf(d.type);
      var m = document.createElement("button");
      m.className = "mk";
      m.type = "button";
      m.style.cssText = "left:" + (d.x * 100) + "%;top:" + (d.y * 100) + "%;background:" + t.colour;
      m.textContent = t.short;
      m.title = t.label + (d.note ? " — " + d.note : "");
      m.setAttribute("aria-label", "Remove " + t.label);
      m.addEventListener("click", function (e) {
        e.stopPropagation();
        job.damage.splice(i, 1); save(); paintMarkers(); paintList();
      });
      p.appendChild(m);
    });
  }

  function paintList() {
    var host = document.getElementById("dmglist");
    if (!host) return;
    if (!job.damage.length) {
      host.innerHTML = '<p class="empty">No damage marked. Tap a panel above where you see any.</p>';
      return;
    }
    host.innerHTML = job.damage.map(function (d, i) {
      var t = window.RR_DIAGRAM.typeOf(d.type);
      var vl = window.RR_DIAGRAM.VIEWS[d.view].label;
      return '<div class="dmg">' +
        '<span class="dot" style="background:' + t.colour + '">' + t.short + '</span>' +
        '<span style="min-width:96px"><b>' + t.label + '</b><br><small style="color:var(--mute)">' +
        vl + '</small></span>' +
        '<input data-note="' + i + '" value="' + esc(d.note || "") + '" placeholder="Note (optional)">' +
        '<button class="x" data-del="' + i + '" aria-label="Remove">&times;</button></div>';
    }).join("");
    host.querySelectorAll("[data-note]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        job.damage[+inp.dataset.note].note = inp.value; save();
      });
    });
    host.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        job.damage.splice(+b.dataset.del, 1); save(); paintMarkers(); paintList();
      });
    });
  }

  // ── signature ───────────────────────────────────────────────────────────
  function initSignature() {
    var c = document.getElementById("sig");
    if (!c) return;
    var ph = document.getElementById("sigph");
    var dpr = window.devicePixelRatio || 1;
    var rect = c.getBoundingClientRect();
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    var ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#0D1B2A";
    if (job.signature) {
      var img = new Image();
      img.onload = function () { ctx.drawImage(img, 0, 0, rect.width, rect.height); };
      img.src = job.signature;
      ph.hidden = true;
    }
    var drawing = false;
    function pos(e) {
      var r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    c.addEventListener("pointerdown", function (e) {
      drawing = true; ph.hidden = true; c.setPointerCapture(e.pointerId);
      var p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    });
    c.addEventListener("pointermove", function (e) {
      if (!drawing) return;
      var p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
    });
    function stop() {
      if (!drawing) return;
      drawing = false;
      job.signature = c.toDataURL("image/png");
      save();
      nextBtn.disabled = false;
    }
    c.addEventListener("pointerup", stop);
    c.addEventListener("pointercancel", stop);
    c.addEventListener("pointerleave", stop);

    document.getElementById("sigclear").addEventListener("click", function () {
      ctx.clearRect(0, 0, c.width, c.height);
      job.signature = null; ph.hidden = false; save(); nextBtn.disabled = true;
    });
  }

  // ══════════════════════ screens ══════════════════════
  function screenHome() {
    var jobs = allJobs();
    view.innerHTML =
      '<div class="pick">' +
        '<button data-new="hire"><span class="ic">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.6" cy="12" r="3.6"/><path d="M11.2 12H21M18.2 12v3.1M15.1 12v2.3"/></svg>' +
        '</span><span><b>New hire</b><span>Customer, licence, car, dates, condition, signature</span></span></button>' +
        '<button data-new="sale"><span class="ic">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.8 3.6H20.4v7.6l-8.8 8.8a1.7 1.7 0 0 1-2.4 0l-5.2-5.2a1.7 1.7 0 0 1 0-2.4Z"/><circle cx="16.5" cy="7.5" r="1.3"/></svg>' +
        '</span><span><b>New sale</b><span>Buyer, licence, car, price, trade-in, signature</span></span></button>' +
      '</div>' +
      '<div class="card" style="margin-top:14px"><h2 class="step" style="font-size:17px">Recent</h2>' +
        (jobs.length
          ? '<div class="jobs">' + jobs.slice(0, 12).map(function (j) {
              var d = new Date(j.createdAt);
              return '<button class="job" data-open="' + j.id + '">' +
                '<span class="tag' + (j.type === "sale" ? " sale" : "") + '">' +
                (j.type === "sale" ? "Sale" : "Hire") + '</span>' +
                '<span><b>' + esc(j.customer.name || "No name yet") + '</b>' +
                '<small>' + esc(j.vehicle ? j.vehicle.name : "No car chosen") + " · " +
                d.toLocaleDateString("en-AU") + (j.complete ? "" : " · unfinished") +
                '</small></span></button>';
            }).join("") + '</div>'
          : '<p class="empty">Nothing yet. Start a hire or a sale above.</p>') +
      '</div>';

    view.querySelectorAll("[data-new]").forEach(function (b) {
      b.addEventListener("click", function () {
        job = blankJob(b.dataset.new); save(); go(0);
      });
    });
    view.querySelectorAll("[data-open]").forEach(function (b) {
      b.addEventListener("click", function () {
        var found = allJobs().filter(function (j) { return j.id === b.dataset.open; })[0];
        if (found) { job = found; go(found.complete ? STEPS[found.type].length - 1 : 0); }
      });
    });
  }

  function screenCustomer() {
    var c = job.customer;
    view.innerHTML =
      '<h2 class="step">Who is taking it?</h2>' +
      '<p class="hint">Scan the licence to fill this in, or just type it.</p>' +
      '<div class="card"><div class="scan">' +
        '<div class="big"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8V5.5A1.5 1.5 0 0 1 4.5 4H8M16 4h3.5A1.5 1.5 0 0 1 21 5.5V8M21 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H4.5A1.5 1.5 0 0 1 3 18.5V16"/><path d="M3 12h18"/></svg></div>' +
        '<b>Scan the licence</b>' +
        '<p>Lay the card flat, fill the frame, and keep the light off the plastic. ' +
          'Daylight or a window beats a ceiling light.</p>' +
        '<div class="row">' +
          '<label class="btn slim" for="licFront">Photograph the licence</label>' +
        '</div>' +
        '<input type="file" id="licFront" accept="image/*" capture="environment">' +
        '<div class="status" id="scanStatus" hidden></div>' +
        '<div class="raw" id="scanRaw" hidden></div>' +
        '<div class="privacy"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex:0 0 auto;margin-top:1px"><path d="M12 3.5 19 6v6c0 4.2-2.9 7.2-7 8.4C7.9 19.2 5 16.2 5 12V6Z"/></svg>' +
        '<span>The photo is used to read the details and is then discarded &mdash; only the fields below are saved.</span></div>' +
      '</div></div>' +
      '<div class="card">' +
        field("c-name", "Full name", { value: c.name, auto: "name" }) +
        '<div class="two">' +
          field("c-lic", "Licence number", { value: c.licence, mode: "numeric" }) +
          field("c-state", "State", { value: c.state || "NSW" }) +
        '</div>' +
        '<div class="two">' +
          field("c-dob", "Date of birth", { value: c.dob, type: "date" }) +
          field("c-exp", "Licence expiry", { value: c.expiry, type: "date" }) +
        '</div>' +
        field("c-addr", "Address", { value: c.addr, auto: "street-address" }) +
        '<div class="two">' +
          field("c-phone", "Mobile", { value: c.phone, type: "tel", auto: "tel" }) +
          field("c-email", "Email", { value: c.email, type: "email", auto: "email" }) +
        '</div>' +
      '</div>';

    var st = document.getElementById("scanStatus");
    var rawBox = document.getElementById("scanRaw");

    function showRaw(text) {
      rawBox.textContent = "Raw from the licence:\n\n" + text;
      rawBox.hidden = false;
    }

    document.getElementById("licFront").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      status(st, "work", "Loading the text reader (first time only \u2014 it is a big download)\u2026");
      var url;
      readPhoto(f, 2000, 0.95)
        .then(function (u) { return prepForOCR(u, 1.5); })
        .then(function (u) { url = u; return loadOCR(); })
        .then(function () {
          status(st, "work", "Reading the card\u2026");
          return Tesseract.createWorker("eng");
        })
        .then(function (worker) {
          return worker.setParameters({
            tessedit_char_whitelist:
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 /-.,'",
            preserve_interword_spaces: "1"
          }).then(function () {
            return worker.recognize(url);
          }).then(function (res) {
            worker.terminate();
            return res;
          });
        })
        .then(function (res) {
          var text = (res.data && res.data.text) || "";
          showRaw(text);
          var n = applyFields(parseLicence(text));
          if (n) status(st, "good", "Filled in " + n + " field" + (n === 1 ? "" : "s") +
                        " from the card. Reading text is never exact \u2014 check every one.");
          else status(st, "warn", "Read the card but could not pick out the fields. The text it " +
                      "got is below \u2014 send it over and I will write the parser for this state.");
        })
        .catch(function (err) {
          status(st, "warn", "Could not read the card. " + esc(err.message || ""));
        });
      e.target.value = "";
    });
  }

  function screenVehicle() {
    var chosen = job.vehicle && job.vehicle.id;
    var sale = job.type === "sale";
    view.innerHTML =
      '<h2 class="step">Which car?</h2>' +
      '<p class="hint">' + (sale ? "What are they buying." : "What are they taking.") + '</p>' +
      '<div class="vlist">' + FLEET.filter(function (v) {
        return sale ? v.price != null : v.week != null;
      }).map(function (v) {
        return '<button class="vrow' + (chosen === v.id ? " on" : "") + '" data-v="' + v.id + '">' +
          '<img src="../cars/' + v.img + '-760.png" alt="" loading="lazy">' +
          '<span><b>' + v.year + " " + esc(v.name) + '</b><small>' +
          (sale ? "Drive away" : "Per week") + '</small></span>' +
          '<span class="pr">' + (sale ? money(v.price) : "$" + v.week) + '</span></button>';
      }).join("") + '</div>';

    view.querySelectorAll("[data-v]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = FLEET.filter(function (x) { return x.id === b.dataset.v; })[0];
        job.vehicle = { id: v.id, name: v.year + " " + v.name, week: v.week, price: v.price };
        if (job.type === "hire" && !job.terms.rate) job.terms.rate = v.week;
        if (job.type === "sale" && !job.terms.price) job.terms.price = v.price;
        save();
        view.querySelectorAll(".vrow").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        nextBtn.disabled = false;
      });
    });
    nextBtn.disabled = !chosen;
  }

  function screenTerms() {
    var t = job.terms;
    if (job.type === "hire") {
      view.innerHTML =
        '<h2 class="step">The hire</h2>' +
        '<p class="hint">Dates and money. Everything here is editable later.</p>' +
        '<div class="card">' +
          '<div class="two">' +
            field("t-from", "Out", { value: t.from || today(), type: "date" }) +
            field("t-to", "Back", { value: t.to || today(7), type: "date" }) +
          '</div>' +
          '<div class="two">' +
            field("t-rate", "Weekly rate", { value: t.rate, type: "number", mode: "numeric" }) +
            field("t-bond", "Bond", { value: t.bond || 500, type: "number", mode: "numeric" }) +
          '</div>' +
          field("t-odo", "Odometer out (km)", { value: t.odo, type: "number", mode: "numeric" }) +
          field("t-fuel", "Fuel out", { value: t.fuel || "Full", ph: "Full / ¾ / ½" }) +
          field("t-notes", "Notes", { value: t.notes, textarea: true,
            ph: "Anything agreed on the day" }) +
        '</div>';
    } else {
      view.innerHTML =
        '<h2 class="step">The sale</h2>' +
        '<p class="hint">Price, trade-in and what they have paid today.</p>' +
        '<div class="card">' +
          field("t-price", "Drive-away price", { value: t.price, type: "number", mode: "numeric" }) +
          '<div class="two">' +
            field("t-trade", "Trade-in allowance", { value: t.trade, type: "number", mode: "numeric" }) +
            field("t-dep", "Deposit paid", { value: t.dep, type: "number", mode: "numeric" }) +
          '</div>' +
          field("t-tradecar", "Trade-in vehicle", { value: t.tradecar,
            ph: "Year, make, model, rego" }) +
          field("t-fin", "Finance", { value: t.fin || "Not required",
            ph: "Not required / wants information" }) +
          field("t-notes", "Notes", { value: t.notes, textarea: true }) +
        '</div>';
    }
  }

  function screenCondition() {
    view.innerHTML =
      '<h2 class="step">Condition</h2>' +
      '<p class="hint">Tap the car where you can see damage. Pick the kind first.</p>' +
      '<div class="card">' +
        '<div class="legend" id="legend">' + window.RR_DIAGRAM.TYPES.map(function (t) {
          return '<button data-t="' + t.key + '"' + (t.key === damageType ? ' class="on"' : "") +
            '><i style="background:' + t.colour + '"></i>' + t.label + '</button>';
        }).join("") + '</div>' +
        '<div style="margin-top:12px">' + drawDiagram() + '</div>' +
        '<div class="dmglist" id="dmglist"></div>' +
      '</div>' +
      '<div class="card">' +
        '<b style="font-size:15px">Photos</b>' +
        '<p class="hint" style="margin:4px 0 10px">Close-ups of anything marked above.</p>' +
        '<label class="btn ghost slim" for="shot">Take a photo</label>' +
        '<input type="file" id="shot" accept="image/*" capture="environment" style="display:none">' +
        '<div class="shots" id="shots"></div>' +
      '</div>';

    document.getElementById("legend").addEventListener("click", function (e) {
      var b = e.target.closest("[data-t]");
      if (!b) return;
      damageType = b.dataset.t;
      this.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
    });

    view.querySelectorAll(".plate").forEach(function (p) {
      p.addEventListener("click", function (e) {
        if (e.target.closest(".mk")) return;
        var r = p.getBoundingClientRect();
        job.damage.push({
          view: p.dataset.view,
          x: (e.clientX - r.left) / r.width,
          y: (e.clientY - r.top) / r.height,
          type: damageType, note: ""
        });
        save(); paintMarkers(); paintList();
      });
    });

    function paintShots() {
      document.getElementById("shots").innerHTML =
        job.shots.map(function (s) { return '<img src="' + s + '" alt="">'; }).join("");
    }
    document.getElementById("shot").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      readPhoto(f, 900, 0.7).then(function (u) {
        job.shots.push(u); save(); paintShots();
      });
      e.target.value = "";
    });

    paintMarkers(); paintList(); paintShots();
  }

  function screenSign() {
    view.innerHTML =
      '<h2 class="step">Signature</h2>' +
      '<p class="hint">' + esc(job.customer.name || "The customer") +
        ' signs to confirm the details' +
        (job.type === "hire" ? " and the condition recorded." : " and the sale terms.") + '</p>' +
      '<div class="card">' +
        '<div class="sigwrap"><canvas id="sig"></canvas>' +
        '<div class="ph" id="sigph">Sign here</div></div>' +
        '<button class="btn ghost slim" id="sigclear" style="margin-top:10px">Clear</button>' +
      '</div>';
    initSignature();
    nextBtn.disabled = !job.signature;
  }

  function screenDone() {
    var t = job.terms, c = job.customer;
    job.complete = true; save();
    var rows = [["Job", job.id], ["Type", job.type === "sale" ? "Sale" : "Hire"],
                ["Customer", c.name], ["Licence", (c.licence || "") + (c.state ? " (" + c.state + ")" : "")],
                ["Mobile", c.phone], ["Vehicle", job.vehicle ? job.vehicle.name : ""]];
    if (job.type === "hire") {
      rows.push(["Out", t.from], ["Back", t.to],
        ["Rate", t.rate ? money(t.rate) + " / week" : ""],
        ["Bond", t.bond ? money(t.bond) : ""],
        ["Odometer", t.odo ? t.odo + " km" : ""],
        ["Damage marked", job.damage.length + " point" + (job.damage.length === 1 ? "" : "s")]);
    } else {
      rows.push(["Price", t.price ? money(t.price) : ""],
        ["Trade-in", t.trade ? money(t.trade) : "None"],
        ["Deposit", t.dep ? money(t.dep) : ""],
        ["Finance", t.fin]);
    }
    view.innerHTML =
      '<h2 class="step">Done</h2>' +
      '<p class="hint">Saved on this device. Print or save a PDF for the customer.</p>' +
      '<div class="card"><div class="sum">' + rows.filter(function (r) { return r[1]; })
        .map(function (r) {
          return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>';
        }).join("") + '</div></div>' +
      (job.damage.length
        ? '<div class="card"><b style="font-size:15px">Condition</b>' +
          '<div style="margin-top:10px">' + drawDiagram() + '</div>' +
          '<div class="dmglist" id="dmglist"></div></div>'
        : "") +
      (job.signature
        ? '<div class="card"><b style="font-size:15px">Signed</b>' +
          '<img src="' + job.signature + '" alt="Signature" ' +
          'style="display:block;max-width:260px;margin-top:8px"></div>'
        : "") +
      '<button class="btn dark noprint" id="printJob">Print / save PDF</button>';
    if (job.damage.length) { paintMarkers(); paintList(); }
    document.getElementById("printJob").addEventListener("click", function () { window.print(); });
  }

  var SCREENS = { customer: screenCustomer, vehicle: screenVehicle, terms: screenTerms,
                  condition: screenCondition, sign: screenSign, done: screenDone };

  // ── collect whatever is on screen before moving on ──────────────────────
  function harvest() {
    if (!job || step == null) return;
    var name = STEPS[job.type][step];
    function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : undefined; }
    if (name === "customer") {
      job.customer = { name: val("c-name"), licence: val("c-lic"), state: val("c-state"),
        dob: val("c-dob"), expiry: val("c-exp"), addr: val("c-addr"),
        phone: val("c-phone"), email: val("c-email") };
    } else if (name === "terms") {
      var t = job.terms;
      if (job.type === "hire") {
        t.from = val("t-from"); t.to = val("t-to"); t.rate = val("t-rate");
        t.bond = val("t-bond"); t.odo = val("t-odo"); t.fuel = val("t-fuel");
        t.notes = val("t-notes");
      } else {
        t.price = val("t-price"); t.trade = val("t-trade"); t.dep = val("t-dep");
        t.tradecar = val("t-tradecar"); t.fin = val("t-fin"); t.notes = val("t-notes");
      }
    }
    save();
  }

  // ── router ──────────────────────────────────────────────────────────────
  function go(i) {
    if (job == null) { step = null; render(); return; }
    step = Math.max(0, Math.min(STEPS[job.type].length - 1, i));
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    var steps = job ? STEPS[job.type] : null;
    backBtn.hidden = step == null || step === 0;
    foot.hidden = step == null;
    subtitle.textContent = job
      ? " · " + (job.type === "sale" ? "Sale" : "Hire") + " " + job.id
      : "";
    prog.style.transform = "scaleX(" + (steps ? (step + 1) / steps.length : 0) + ")";

    if (step == null) { screenHome(); return; }
    nextBtn.disabled = false;
    var name = steps[step];
    SCREENS[name]();
    prevBtn.hidden = step === 0;
    nextBtn.textContent = step === steps.length - 1
      ? "Finish" : (name === "sign" ? "Confirm" : "Next");
  }

  backBtn.addEventListener("click", function () { harvest(); go(step - 1); });
  prevBtn.addEventListener("click", function () { harvest(); go(step - 1); });
  nextBtn.addEventListener("click", function () {
    harvest();
    var steps = STEPS[job.type];
    if (step === steps.length - 1) { job = null; step = null; render(); return; }
    go(step + 1);
  });
  homeBtn.addEventListener("click", function () {
    harvest(); job = null; step = null; render();
  });

  render();
})();
