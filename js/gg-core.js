// Core: state, persistence, helpers, undo, theme/width
window.GG = window.GG || {};
(function (G) {
  const LS_KEY = "step1_planner_state_v1";
  const THEME_KEY = "gg_theme";
  const WIDTH_KEY = "gg_container";

  // ------- State -------
  G.state = loadState();
  function loadState() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      const s = structuredClone(DEFAULT_DATA);
      s.settings = s.settings || {};
      s.settings.dailyGoalMinutes ??= 120;
      s.settings.sectionColors ??= {};
      persist(s);
      return s;
    }
    try {
      const s = JSON.parse(raw);
      if (!s.today || s.today.date !== todayISO()) {
        s.today = { date: todayISO(), queue: [], active: null, studiedSeconds: 0 };
      }
      s.settings = s.settings || {};
      s.settings.dailyGoalMinutes ??= 120;
      s.settings.sectionColors ??= {};
      return s;
    } catch {
      const s = structuredClone(DEFAULT_DATA);
      s.settings = { dailyGoalMinutes: 120, sectionColors: {} };
      persist(s);
      return s;
    }
  }
  function persist(s = G.state) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }
  G.persist = persist;

  // ------- Undo -------
  const UNDO_LIMIT = 50;
  const undoStack = [];
  G.pushHistory = function () {
    undoStack.push(JSON.parse(JSON.stringify(G.state)));
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  };
  G.undoLast = function () {
    if (!undoStack.length) { alert("Nothing to undo."); return; }
    G.state = undoStack.pop(); persist(); if (G.renderAll) G.renderAll();
  };

  // ------- Theme & width -------
  G.applyTheme = function (name) {
    document.body.classList.remove("theme-dark","theme-light","theme-sepia","theme-forest","theme-rose");
    document.body.classList.add(`theme-${name}`);
    localStorage.setItem(THEME_KEY, name);
    const sel = document.getElementById("themeSelect"); if (sel) sel.value = name;
  };
  G.applyContainerWidth = function (px) {
    document.documentElement.style.setProperty("--container-max", (px >= 9999 ? "100vw" : `${px}px`));
    localStorage.setItem(WIDTH_KEY, String(px));
    const sel = document.getElementById("widthSelect"); if (sel) sel.value = String(px);
  };
  G.initAppearance = function () {
    G.applyTheme(localStorage.getItem(THEME_KEY) || "dark");
    G.applyContainerWidth(parseInt(localStorage.getItem(WIDTH_KEY) || "1400", 10));
  };

  // ------- Helpers -------
  G.asMinutes = function (hms) {
    if (!hms) return 0; const p = hms.split(":").map(Number);
    if (p.some(isNaN)) return 0;
    if (p.length === 3) { const [h,m,s]=p; return h*60 + m + Math.round(s/60); }
    if (p.length === 2) { const [m,s]=p; return m + Math.round(s/60); }
    if (p.length === 1) { return Number(p[0]) || 0; }
    return 0;
  };
  G.toSeconds = function (hms) {
    if (!hms) return 0; const p = hms.split(":").map(Number);
    if (p.some(isNaN)) return 0;
    if (p.length === 3) { const [h,m,s]=p; return h*3600 + m*60 + s; }
    if (p.length === 2) { const [m,s]=p; return m*60 + s; }
    if (p.length === 1) { return Number(p[0]) * 60 || 0; }
    return 0;
  };
  G.formatHMS = function (secs) {
    const h=Math.floor(secs/3600), m=Math.floor((secs%3600)/60), s=secs%60;
    const pad = n => String(n).padStart(2, "0"); return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };
  G.formatHM = function (secs) {
    const h=Math.floor(secs/3600), m=Math.floor((secs%3600)/60);
    return h ? `${h}h ${String(m).padStart(2,"0")}m` : `${m}m`;
  };
  G.sumSectionTotalSeconds = sec => sec.items.reduce((sum,it)=> sum + G.toSeconds(it.duration||"0"), 0);
  G.sumSectionWatchedSeconds = sec => sec.items.reduce((sum,it)=> sum + (it.done ? G.toSeconds(it.duration||"0") : 0), 0);
  G.uncompletedItems = function () {
    const out=[]; G.state.sections.forEach(sec=> sec.items.forEach(it=>{ if(!it.done) out.push({sec,it}); })); return out;
  };
  G.totalPlannedMinutes = function (queue) {
    let total = 0; queue.forEach(q=>{ const it = G.getItem(q.sectionId,q.itemId); total += G.asMinutes(it?.duration||"0"); }); return total;
  };
  G.totalDoneOverall = function(){
    let done=0,total=0; G.state.sections.forEach(sec=> sec.items.forEach(it=>{ total++; if(it.done) done++; })); return [done,total];
  };
  G.calcStreak = function (){
    const today = todayISO(); G.state.history[today] = Math.round((G.state.today.studiedSeconds||0)/60); persist();
    let streak=0; const d = new Date(today);
    while (true) {
      const key = d.toISOString().slice(0,10);
      const minutes = G.state.history[key] || 0;
      if (minutes>0) { streak++; d.setDate(d.getDate()-1); } else break;
    }
    return streak;
  };
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  G.todayISO = todayISO;
  G.findSection = id => G.state.sections.find(s => s.id === id);
  G.getItem = function(sectionId, itemId){ const sec = G.findSection(sectionId); if(!sec) return null; return sec.items.find(i=>i.id===itemId)||null; };
  G.cryptoId = function(){ if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); return 'id-'+Math.random().toString(36).slice(2,10); };
  G.hash = function(str){ let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; } return h; };
})();
