(function () {
  "use strict";

  const cfg = window.ROTATION_CONFIG || {};
  const students = (cfg.students || []).map(s => String(s).trim()).filter(Boolean);
  const N = students.length;
  const TZ = cfg.timeZone || undefined;
  const DAY_MS = 86400000;

  // ---------- date helpers (whole days counted from 1970-01-01) ----------
  const ymd = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d) / DAY_MS; };
  const mod = (a, n) => ((a % n) + n) % n;

  function todayNum() {
    const s = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return ymd(s);
  }
  const asDate = d => new Date(d * DAY_MS);
  const fmt = (d, opts) => new Intl.DateTimeFormat("en-GB", Object.assign({ timeZone: "UTC" }, opts)).format(asDate(d));
  const weekday = d => fmt(d, { weekday: "long" });
  const shortDay = d => fmt(d, { weekday: "short" });
  const longDate = d => fmt(d, { day: "numeric", month: "long", year: "numeric" });
  const shortDate = d => fmt(d, { day: "numeric", month: "short" });

  const START = ymd(cfg.startDate || "2026-11-01");

  // ---------- rotation ----------
  // Day k after the start: student k has AI Studio, student k-1 has Google Flow.
  const studioIndex = d => mod(d - START, N);
  const flowIndex = d => (N < 2 ? -1 : mod(d - START - 1, N));
  const nextStudio = (i, from) => from + mod(i - (from - START), N);
  const nextFlow = (i, from) => from + mod(i + 1 - (from - START), N);
  const toolOn = (i, d) => (studioIndex(d) === i ? "studio" : flowIndex(d) === i ? "flow" : null);

  function relLabel(d, today) {
    const diff = d - today;
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return weekday(d);
  }
  const whenText = (d, today) => {
    const diff = d - today;
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return `${shortDay(d)}, ${shortDate(d)}`;
  };

  const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function initials(name) {
    const words = name.split(/\s+/).filter(w => /\p{L}/u.test(w));
    return ((words[0] || "?")[0] + (words[1] ? words[1][0] : "")).toUpperCase();
  }
  const TOOL_NAME = { studio: "AI Studio", flow: "Google Flow" };

  // ---------- state ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  let today = todayNum();
  let viewDay = today;
  let weekOffset = 0;
  let me = students.includes(store.get("rotation-me")) ? store.get("rotation-me") : "";
  let query = "";

  const $ = id => document.getElementById(id);

  // ---------- spotlight ----------
  function swap(el, html) {
    if (el.innerHTML === html) return;
    el.classList.remove("swap-in");
    el.classList.add("swap-out");
    setTimeout(() => {
      el.innerHTML = html;
      el.classList.remove("swap-out");
      void el.offsetWidth;
      el.classList.add("swap-in");
    }, 200);
  }

  function renderSpotlight() {
    const label = relLabel(viewDay, today);
    swap($("hero-day"), esc(label));
    $("hero-date").textContent = (label === weekday(viewDay) ? "" : weekday(viewDay) + " · ") + longDate(viewDay);
    $("go-today").disabled = viewDay === today;
    document.title = `${label} · Tool Rotation · AbuSuhailah`;

    const tag = viewDay === today ? ["Live today", false] : viewDay > today ? ["Upcoming", true] : ["Past", true];

    const fill = (key, idx, nextIdx) => {
      const name = idx >= 0 ? students[idx] : "Nobody";
      swap($(`${key}-name`), esc(name));
      swap($(`${key}-avatar`), esc(idx >= 0 ? initials(name) : "–"));
      const t = $(`${key}-tag`);
      t.textContent = tag[0];
      t.classList.toggle("off", tag[1]);
      $(`${key}-next`).innerHTML = nextIdx >= 0
        ? `Next day → <strong>${esc(students[nextIdx])}</strong>`
        : "";
      $(`${key}-name`).closest(".tool-card").classList.toggle("is-me", !!me && name === me);
    };
    fill("studio", studioIndex(viewDay), studioIndex(viewDay + 1));
    fill("flow", flowIndex(viewDay), flowIndex(viewDay + 1));
  }

  // ---------- my schedule ----------
  function renderMe() {
    const body = $("me-body");
    if (!me) { body.hidden = true; return; }
    body.hidden = false;
    const i = students.indexOf(me);
    const tool = toolOn(i, today);

    const status = $("me-status");
    status.className = "me-status" + (tool ? " " + tool : "");
    if (tool) {
      status.innerHTML = `<p class="small">Today, ${esc(weekday(today))}</p>
        <p class="big">You have ${TOOL_NAME[tool]}</p>
        <p class="small">${tool === "studio" ? "Tomorrow you move to Google Flow." : "Enjoy it — then you rest until your next turn."}</p>`;
    } else {
      const ns = nextStudio(i, today);
      status.innerHTML = `<p class="small">Today, ${esc(weekday(today))}</p>
        <p class="big">No tool today</p>
        <p class="small">Your next turn is AI Studio ${whenText(ns, today).toLowerCase() === "tomorrow" ? "tomorrow" : "on " + esc(whenText(ns, today))}.</p>`;
    }

    const rows = [];
    for (let d = today; rows.length < 6 && d < today + 4 * N + 2; d++) {
      const t = toolOn(i, d);
      if (t) rows.push({ d, t });
    }
    $("me-upcoming").innerHTML = rows.map(r => `
      <div class="up-row">
        <div class="up-date">${esc(whenText(r.d, today))}<span>${esc(weekday(r.d))} · ${esc(longDate(r.d))}</span></div>
        <span class="chip ${r.t}">${TOOL_NAME[r.t]}</span>
      </div>`).join("");
  }

  // ---------- week ----------
  function renderWeek() {
    // A rolling week that starts today, so the coming days are always visible.
    const monday = today + weekOffset * 7;
    $("week-title").textContent = weekOffset === 0 ? "Next 7 days" : weekOffset > 0 ? `${weekOffset * 7}+ days ahead` : "Earlier days";
    $("week-range").textContent = `${shortDate(monday)} – ${longDate(monday + 6)}`;
    $("this-week").disabled = weekOffset === 0;

    let html = "";
    for (let k = 0; k < 7; k++) {
      const d = monday + k;
      const s = studioIndex(d), f = flowIndex(d);
      const cls = ["day", d === today ? "today" : "", d === viewDay ? "selected" : ""].join(" ");
      const slot = (type, idx) => idx < 0 ? "" :
        `<span class="slot ${type}${me && students[idx] === me ? " mine" : ""}"><small>${TOOL_NAME[type]}</small><b>${esc(students[idx])}</b></span>`;
      html += `<button class="${cls}" role="listitem" data-day="${d}" style="animation-delay:${k * 0.05}s">
          <span class="day-name">${esc(weekday(d))}</span>
          <span class="day-date">${esc(shortDate(d))}</span>
          ${slot("studio", s)}${slot("flow", f)}
        </button>`;
    }
    $("week").innerHTML = html;
  }

  // ---------- all students ----------
  function renderStudents() {
    const q = query.toLowerCase();
    const list = students.map((name, i) => ({ name, i })).filter(s => s.name.toLowerCase().includes(q));
    if (!list.length) { $("students").innerHTML = `<p class="empty">No student matches “${esc(query)}”.</p>`; return; }

    $("students").innerHTML = list.map(({ name, i }, n) => {
      const t = toolOn(i, today);
      const chip = t ? `<span class="chip ${t}">${TOOL_NAME[t]} today</span>` : `<span class="chip rest">Resting</span>`;
      const ns = nextStudio(i, today), nf = nextFlow(i, today);
      const cls = ["student", t ? "on-" + t : "", name === me ? "mine" : ""].join(" ");
      return `<div class="${cls}" role="listitem" style="animation-delay:${Math.min(n, 12) * 0.04}s">
          <div class="student-top">
            <span class="mini-avatar">${esc(initials(name))}</span>
            <span class="student-name">${esc(name)}</span>
          </div>
          ${chip}
          <div class="student-next">
            <span>AI Studio: <b>${esc(whenText(ns, today))}</b></span>
            ${N > 1 ? `<span>Google Flow: <b>${esc(whenText(nf, today))}</b></span>` : ""}
          </div>
        </div>`;
    }).join("");
  }

  function renderAll() { renderSpotlight(); renderMe(); renderWeek(); renderStudents(); }

  // ---------- clock & midnight rollover ----------
  const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  function tick() {
    $("clock-time").textContent = timeFmt.format(new Date());
    const t = todayNum();
    if (t !== today) {
      if (viewDay === today) viewDay = t;
      today = t;
      renderAll();
    }
  }

  // ---------- events ----------
  function setViewDay(d) { viewDay = d; renderSpotlight(); renderWeek(); }
  $("prev-day").addEventListener("click", () => setViewDay(viewDay - 1));
  $("next-day").addEventListener("click", () => setViewDay(viewDay + 1));
  $("go-today").addEventListener("click", () => { weekOffset = 0; setViewDay(today); });
  $("prev-week").addEventListener("click", () => { weekOffset--; renderWeek(); });
  $("next-week").addEventListener("click", () => { weekOffset++; renderWeek(); });
  $("this-week").addEventListener("click", () => { weekOffset = 0; renderWeek(); });
  $("week").addEventListener("click", e => {
    const b = e.target.closest("[data-day]");
    if (!b) return;
    setViewDay(Number(b.dataset.day));
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.addEventListener("keydown", e => {
    if (e.target.matches("input, select, textarea")) return;
    if (e.key === "ArrowLeft") setViewDay(viewDay - 1);
    if (e.key === "ArrowRight") setViewDay(viewDay + 1);
  });

  const sel = $("me-select");
  students.slice().sort((a, b) => a.localeCompare(b)).forEach(n => sel.add(new Option(n, n)));
  sel.value = me;
  sel.addEventListener("change", () => { me = sel.value; store.set("rotation-me", me); renderAll(); });
  $("search").addEventListener("input", e => { query = e.target.value.trim(); renderStudents(); });

  if (!N) {
    document.querySelector("main").innerHTML = `<p class="empty">No students yet — add names in students.js.</p>`;
    return;
  }
  $("all-sub").textContent = `${N} students · each person gets AI Studio, then Google Flow the next day, every ${N} days.`;
  renderAll();
  tick();
  setInterval(tick, 1000);
})();
