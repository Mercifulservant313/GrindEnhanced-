/* UI + events. Uses GG core/analytics/bulk. */
const G = window.GG;

// DOM
const sectionsEl = document.getElementById("sections");
const searchEl = document.getElementById("search");
const dailyGoalEl = document.getElementById("dailyGoal");

const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");
const resetBtn = document.getElementById("resetBtn");
const addSectionBtn = document.getElementById("addSectionBtn");
const fillTodayBtn = document.getElementById("fillTodayBtn");
const clearTodayBtn = document.getElementById("clearTodayBtn");
const todayListEl = document.getElementById("todayList");
const todayMetaEl = document.getElementById("todayMeta");
const activeTaskLabel = document.getElementById("activeTaskLabel");
const timerDisplay = document.getElementById("timerDisplay");
const startTimerBtn = document.getElementById("startTimerBtn");
const pauseTimerBtn = document.getElementById("pauseTimerBtn");
const stopTimerBtn = document.getElementById("stopTimerBtn");
const overallPctEl = document.getElementById("overallPct");
const overallCountEl = document.getElementById("overallCount");
const overallBarEl = document.getElementById("overallBar");
const studiedTodayEl = document.getElementById("studiedToday");
const streakDaysEl = document.getElementById("streakDays");

// Analytics DOM
const totalDurationEl = document.getElementById("totalDuration");
const watchedDurationEl = document.getElementById("watchedDuration");
const pieChartEl = document.getElementById("pieChart");
const pieCenterEl = document.getElementById("pieCenter");
const legendEl = document.getElementById("legend");

// Bulk and appearance
const bulkBtn = document.getElementById("bulkBtn");
const bulkFile = document.getElementById("bulkFile");
const templateBtn = document.getElementById("templateBtn");
const themeSelect = document.getElementById("themeSelect");
const widthSelect = document.getElementById("widthSelect");

// Undo + collapse
const undoBtn = document.getElementById("undoBtn");
const collapseAllBtn = document.getElementById("collapseAllBtn");
const expandAllBtn = document.getElementById("expandAllBtn");

// Templates
const sectionTmpl = document.getElementById("sectionTmpl");
const itemTmpl = document.getElementById("itemTmpl");
const todayItemTmpl = document.getElementById("todayItemTmpl");

// Init
G.initAppearance();
G.renderAll = renderAll;           // expose for undo/bulk
renderAll();
tickTimer(); setInterval(tickTimer, 1000);
setupEvents();

/* ---------- Renderers ---------- */
function renderAll(){
  dailyGoalEl.value = G.state.settings.dailyGoalMinutes ?? 120;
  renderSections();
  renderToday();
  renderStats();
  renderAnalytics();
}
function renderSections(){
  sectionsEl.innerHTML = "";
  const q = (searchEl.value || "").trim().toLowerCase();
  G.state.sections.forEach(sec=>{
    const el = sectionTmpl.content.firstElementChild.cloneNode(true);
    const titleEl = el.querySelector(".section-title");
    const countEl = el.querySelector(".count");
    const progressEl = el.querySelector(".progress .bar");
    const itemsWrap = el.querySelector(".items");
    titleEl.textContent = sec.title;

    const visibleItems = sec.items.filter(it => matchesQuery(it, q));
    const secTotalSecs = G.sumSectionTotalSeconds(sec);
    const doneCount = sec.items.filter(i=>i.done).length;
    const pct = sec.items.length ? Math.round(100*doneCount/sec.items.length) : 0;
    progressEl.style.width = pct + "%";
    countEl.textContent = `${visibleItems.length}/${sec.items.length} shown • TRT ${G.formatHM(secTotalSecs)}`;

    el.querySelector(".addItem").addEventListener("click", () => addItem(sec.id));
    el.querySelector(".rename").addEventListener("click", () => renameSection(sec.id));
    el.querySelector(".delete").addEventListener("click", () => deleteSection(sec.id));

    visibleItems.forEach(it=>{
      const row = itemTmpl.content.firstElementChild.cloneNode(true);
      const doneEl = row.querySelector(".done");
      const titleIn = row.querySelector(".title");
      const durIn = row.querySelector(".duration");
      const notesIn = row.querySelector(".notes");

      doneEl.checked = !!it.done;
      titleIn.value = it.title || "";
      durIn.value = it.duration || "";
      notesIn.value = it.notes || "";

      doneEl.addEventListener("change", () => {
        G.pushHistory();
        it.done = doneEl.checked;
        removeFromToday(sec.id, it.id, false);
        G.persist(); renderAll();
      });
      titleIn.addEventListener("input", () => { it.title = titleIn.value; G.persist(); });
      durIn.addEventListener("input", () => { it.duration = durIn.value; G.persist(); renderAll(); });
      notesIn.addEventListener("input", () => { it.notes = notesIn.value; G.persist(); });

      row.querySelector(".toToday").addEventListener("click", () => addToToday(sec.id, it.id));
      row.querySelector(".remove").addEventListener("click", () => deleteItem(sec.id, it.id));
      row.querySelector(".moveUp").addEventListener("click", () => moveItem(sec.id, it.id, -1));
      row.querySelector(".moveDown").addEventListener("click", () => moveItem(sec.id, it.id, +1));

      itemsWrap.appendChild(row);
    });

    sectionsEl.appendChild(el);
  });
}
function renderToday(){
  todayListEl.innerHTML = "";
  G.state.today.queue.forEach((q, idx)=>{
    const sec = G.findSection(q.sectionId); if (!sec) return;
    const it = sec.items.find(x=>x.id===q.itemId); if (!it) return;
    const row = todayItemTmpl.content.firstElementChild.cloneNode(true);
    row.querySelector(".ti-title").textContent = it.title;
    row.querySelector(".ti-duration").textContent = it.duration || "--:--";
    row.querySelector(".start").addEventListener("click", ()=> startTimer(q.sectionId, q.itemId));
    row.querySelector(".up").addEventListener("click", ()=> moveToday(idx, -1));
    row.querySelector(".down").addEventListener("click", ()=> moveToday(idx, +1));
    row.querySelector(".remove").addEventListener("click", ()=> removeFromToday(q.sectionId, q.itemId));
    todayListEl.appendChild(row);
  });
  renderTodayMeta();
  renderTimerUI();
}
function renderTodayMeta(){
  const goal = Number(G.state.settings.dailyGoalMinutes || 0);
  const planned = G.totalPlannedMinutes(G.state.today.queue);
  todayMetaEl.textContent = `Planned: ${planned} min  |  Goal: ${goal} min`;
}
function renderStats(){
  const [done,total] = G.totalDoneOverall();
  const pct = total ? Math.round(100*done/total) : 0;
  overallPctEl.textContent = pct + "%";
  overallCountEl.textContent = `${done}/${total}`;
  overallBarEl.style.width = pct + "%";
  const studiedMin = Math.round((G.state.today.studiedSeconds||0)/60);
  studiedTodayEl.textContent = `${studiedMin} min`;
  streakDaysEl.textContent = `${G.calcStreak()} days`;
}
function renderAnalytics(){
  const totals = G.computeTotals();
  totalDurationEl.textContent = G.formatHM(totals.totalSecs);
  watchedDurationEl.textContent = G.formatHM(totals.watchedSecs);
  const pct = totals.totalSecs ? Math.round(100*totals.watchedSecs/totals.totalSecs) : 0;
  pieCenterEl.textContent = `${pct}%`;
  const slices = [];
  totals.perSection.forEach(s=>{ if (s.watchedSecs>0) slices.push({label:s.title, seconds:s.watchedSecs, color:G.getSectionColor(s.id, s.title)}); });
  const remaining = Math.max(0, totals.totalSecs - totals.watchedSecs);
  if (remaining>0) slices.push({label:"Remaining", seconds:remaining, color:"#334155"});
  G.drawDonut(pieChartEl, slices);
  legendEl.innerHTML = "";
  totals.perSection.forEach(s=>{
    const row = document.createElement("div");
    row.className = "legend-row";
    const input = document.createElement("input");
    input.type = "color";
    input.value = G.getSectionColor(s.id, s.title);
    input.addEventListener("input", e=>{ G.setSectionColor(s.id, e.target.value); renderAnalytics(); });
    const label = document.createElement("span");
    label.textContent = `${s.title} — ${G.formatHM(s.watchedSecs)} / ${G.formatHM(s.totalSecs)}`;
    row.appendChild(input); row.appendChild(label); legendEl.appendChild(row);
  });
}

/* ---------- Events ---------- */
function setupEvents(){
  searchEl.addEventListener("input", renderSections);
  dailyGoalEl.addEventListener("input", ()=>{ G.state.settings.dailyGoalMinutes = Number(dailyGoalEl.value || 0); G.persist(); renderTodayMeta(); });

  exportBtn.addEventListener("click", onExport);
  importFile.addEventListener("change", onImport);
  resetBtn.addEventListener("click", onReset);

  addSectionBtn.addEventListener("click", addSection);
  fillTodayBtn.addEventListener("click", autoFillToday);
  clearTodayBtn.addEventListener("click", clearTodayQueue);

  startTimerBtn.addEventListener("click", ()=>{ if (G.state.today.active) return; if (G.state.today.queue[0]) startTimer(G.state.today.queue[0].sectionId, G.state.today.queue[0].itemId); });
  pauseTimerBtn.addEventListener("click", pauseTimer);
  stopTimerBtn.addEventListener("click", stopTimer);

  bulkBtn.addEventListener("click", ()=> bulkFile.click());
  bulkFile.addEventListener("change", G.handleBulkFile);
  templateBtn.addEventListener("click", downloadTemplateCSV);

  if (themeSelect) themeSelect.addEventListener("change", e=> G.applyTheme(e.target.value));
  if (widthSelect) widthSelect.addEventListener("change", e=> G.applyContainerWidth(parseInt(e.target.value,10)));

  undoBtn.addEventListener("click", G.undoLast);
  collapseAllBtn.addEventListener("click", ()=> document.querySelectorAll("#sections details").forEach(d => d.open = false));
  expandAllBtn.addEventListener("click",   ()=> document.querySelectorAll("#sections details").forEach(d => d.open = true));
}

/* ---------- CRUD ---------- */
function addSection(){ G.pushHistory(); const title = prompt("Section name (eg, Sketchy — Viruses):"); if (!title) return; G.state.sections.push({ id:G.cryptoId(), title, items: [] }); G.persist(); renderAll(); }
function renameSection(secId){ G.pushHistory(); const sec = G.findSection(secId); if (!sec) return; const title = prompt("Rename section:", sec.title); if (!title) return; sec.title = title; G.persist(); renderAll(); }
function deleteSection(secId){ if (!confirm("Delete this section and all its items?")) return; G.pushHistory(); const sec = G.findSection(secId); if (sec){ sec.items.forEach(it => removeFromToday(secId, it.id, false)); } G.state.sections = G.state.sections.filter(s => s.id !== secId); G.persist(); renderAll(); }
function addItem(secId){ G.pushHistory(); const sec = G.findSection(secId); if (!sec) return; const title = prompt("Item title:"); if (!title) return; sec.items.push({ id:G.cryptoId(), title, duration:"", notes:"", done:false }); G.persist(); renderAll(); }
function deleteItem(secId, itemId){ G.pushHistory(); const sec = G.findSection(secId); if (!sec) return; sec.items = sec.items.filter(i => i.id !== itemId); removeFromToday(secId, itemId, false); G.persist(); renderAll(); }
function moveItem(secId, itemId, dir){ G.pushHistory(); const sec = G.findSection(secId); if (!sec) return; const idx = sec.items.findIndex(i=>i.id===itemId); if (idx<0) return; const j = idx+dir; if (j<0 || j>=sec.items.length) return; [sec.items[idx], sec.items[j]] = [sec.items[j], sec.items[idx]]; G.persist(); renderAll(); }

/* ---------- Today Queue ---------- */
function addToToday(sectionId, itemId){ G.pushHistory(); const sec = G.findSection(sectionId); if (!sec) return; const it = sec.items.find(i=>i.id===itemId); if (!it || it.done) return; if (!G.state.today.queue.find(q=> q.sectionId===sectionId && q.itemId===itemId)){ G.state.today.queue.push({sectionId, itemId}); G.persist(); renderToday(); } }
function removeFromToday(sectionId, itemId, rerender=true){ G.pushHistory(); G.state.today.queue = G.state.today.queue.filter(q => !(q.sectionId===sectionId && q.itemId===itemId)); if (G.state.today.active && G.state.today.active.sectionId===sectionId && G.state.today.active.itemId===itemId){ G.state.today.active = null; } G.persist(); if (rerender) renderToday(); }
function moveToday(idx, dir){ G.pushHistory(); const j = idx + dir; if (j<0 || j>=G.state.today.queue.length) return; [G.state.today.queue[idx], G.state.today.queue[j]] = [G.state.today.queue[j], G.state.today.queue[idx]]; G.persist(); renderToday(); }
function clearTodayQueue(){ G.pushHistory(); G.state.today.queue=[]; G.state.today.active=null; G.state.today.studiedSeconds = G.state.today.studiedSeconds || 0; G.persist(); renderToday(); }
function autoFillToday(){ G.pushHistory(); const goal = Number(G.state.settings.dailyGoalMinutes||0); if (!goal) return; const remaining = G.uncompletedItems(); let minutes = G.totalPlannedMinutes(G.state.today.queue); for (const {sec,it} of remaining){ if (minutes >= goal) break; if (!G.state.today.queue.find(q => q.sectionId===sec.id && q.itemId===it.id)){ G.state.today.queue.push({sectionId: sec.id, itemId: it.id}); minutes += G.asMinutes(it.duration || "0"); } } G.persist(); renderToday(); }

/* ---------- Timer ---------- */
function startTimer(sectionId, itemId){ const sec = G.findSection(sectionId); if (!sec) return; const it = sec.items.find(x=>x.id===itemId); if (!it) return; G.state.today.active = { sectionId, itemId, startedAt: Date.now(), elapsed: 0 }; G.persist(); renderTimerUI(); setActiveLabel(it.title); }
function pauseTimer(){ if (!G.state.today.active) return; G.pushHistory(); const delta = Math.floor((Date.now() - G.state.today.active.startedAt)/1000); G.state.today.active.elapsed += delta; G.state.today.active.startedAt = Date.now(); G.state.today.studiedSeconds += delta; G.persist(); renderTimerUI(); renderStats(); }
function stopTimer(){ if (!G.state.today.active) return; G.pushHistory(); const delta = Math.floor((Date.now() - G.state.today.active.startedAt)/1000); G.state.today.studiedSeconds += delta; const {sectionId, itemId} = G.state.today.active; const sec = G.findSection(sectionId); if (sec){ const it = sec.items.find(i=>i.id===itemId); if (it) it.done = true; } removeFromToday(sectionId, itemId, false); G.state.today.active = null; G.persist(); renderAll(); }
function tickTimer(){ if (!G.state.today.active){ timerDisplay.textContent = "00:00:00"; return; } const secs = Math.floor((Date.now() - G.state.today.active.startedAt)/1000) + (G.state.today.active.elapsed||0); timerDisplay.textContent = G.formatHMS(secs); }
function renderTimerUI(){ if (!G.state.today.active){ setActiveLabel("No active task"); timerDisplay.textContent = "00:00:00"; return; } const it = G.getItem(G.state.today.active.sectionId, G.state.today.active.itemId); setActiveLabel(it ? it.title : "Active task"); }
function setActiveLabel(txt){ activeTaskLabel.textContent = txt; }

/* ---------- Import/Export ---------- */
function onExport(){ const blob=new Blob([JSON.stringify(G.state,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`goal-grinder-${G.todayISO()}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },0); }
function onImport(e){ const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ const imported=JSON.parse(reader.result); if(!imported.settings) imported.settings=G.state.settings; G.state=imported; G.persist(); renderAll(); alert("Import complete."); }catch{ alert("Invalid JSON."); } finally{ importFile.value=""; } }; reader.readAsText(file); }
function onReset(){ if (!confirm("This resets ALL data. Continue?")) return; G.state = structuredClone(DEFAULT_DATA); G.persist(); renderAll(); }

/* ---------- Utils ---------- */
function matchesQuery(it, q){ if (!q) return true; return (it.title||"").toLowerCase().includes(q) || (it.notes||"").toLowerCase().includes(q); }
function downloadTemplateCSV(){ const sample=`Section,Title,Duration,Notes\nPathoma — Chapters 1–3,1.1 Growth Adaptations,,\nPathoma — Chapters 1–3,1.2 Cellular Injury,,\n`; const blob = new Blob([sample], {type:"text/csv"}); const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="bulk-template.csv"; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(url); a.remove();},0); }
