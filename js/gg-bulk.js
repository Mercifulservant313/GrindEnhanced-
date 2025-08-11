// Bulk CSV/XLSX import
window.GG = window.GG || {};
(function (G) {
  G.handleBulkFile = function(e){
    const f = e.target.files?.[0]; if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    const reader = new FileReader();

    if (ext === "csv") {
      reader.onload = () => importCSV(reader.result);
      reader.readAsText(f);
    } else if (ext === "xlsx" || ext === "xls") {
      if (window.XLSX){
        reader.onload = () => {
          const wb = XLSX.read(new Uint8Array(reader.result), {type:"array"});
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          importCSV(csv);
        };
        reader.readAsArrayBuffer(f);
      } else { alert("XLSX script not loaded. Save as CSV or keep the XLSX script tag."); }
    } else { alert("Please upload a .csv or .xlsx file."); }
    e.target.value = "";
  };

  function importCSV(csvText){
    const rows = csvToObjects(csvText);
    if (!rows.length){ alert("No rows found."); return; }

    let added=0, updated=0, createdSections=0;
    rows.forEach(r=>{
      const obj = normalizeRow(r);
      if (!obj.section || !obj.title) return;

      let sec = G.state.sections.find(s => (s.title||"").trim() === obj.section);
      if (!sec){ sec = { id: G.cryptoId(), title: obj.section, items: [] }; G.state.sections.push(sec); createdSections++; }
      const existing = sec.items.find(i => (i.title||"").trim() === obj.title);
      if (existing){ existing.duration = obj.duration || existing.duration || ""; existing.notes = obj.notes ?? existing.notes ?? ""; updated++; }
      else { sec.items.push({ id: G.cryptoId(), title: obj.title, duration: obj.duration || "", notes: obj.notes || "", done: false }); added++; }
    });

    G.persist(); if (G.renderAll) G.renderAll();
    alert(`Bulk add complete.\nSections created: ${createdSections}\nItems added: ${added}\nItems updated: ${updated}`);
  }

  function csvToObjects(text){
    const rows = csvToRows(text);
    if (!rows.length) return [];
    const headers = rows[0].map(h => (h||"").trim().toLowerCase());
    const out = [];
    for (let i=1;i<rows.length;i++){
      const row = rows[i];
      if (row.every(c => (c||"").trim()==="")) continue;
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (row[idx]||"").trim(); });
      out.push(obj);
    }
    return out;
  }
  function csvToRows(str){
    const rows = []; let cur = [], val = "", inQuotes = false;
    const s = String(str).replace(/\r\n/g,"\n").replace(/\r/g,"\n");
    for (let i=0;i<s.length;i++){
      const c = s[i], n = s[i+1];
      if (c === '"'){ if (inQuotes && n === '"'){ val += '"'; i++; } else { inQuotes = !inQuotes; } }
      else if (c === ',' && !inQuotes){ cur.push(val); val=""; }
      else if (c === '\n' && !inQuotes){ cur.push(val); rows.push(cur); cur=[]; val=""; }
      else { val += c; }
    }
    cur.push(val); rows.push(cur);
    return rows;
  }
  function normalizeRow(r){
    const g = (k)=> r[k] ?? r[k?.toLowerCase()] ?? "";
    const pick = ks => ks.map(k=>g(k)).find(v=>v!=="") || "";
    return {
      section: pick(["section","sections"]),
      title: pick(["title","item","name"]),
      duration: pick(["duration","length","time"]),
      notes: pick(["notes","note","comment"])
    };
  }
})();
