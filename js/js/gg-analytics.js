// Analytics: totals + donut + legend
window.GG = window.GG || {};
(function (G) {
  G.computeTotals = function(){
    let totalSecs=0, watchedSecs=0;
    const perSection = G.state.sections.map(sec=>{
      const total = G.sumSectionTotalSeconds(sec);
      const watched = G.sumSectionWatchedSeconds(sec);
      totalSecs += total; watchedSecs += watched;
      return { id:sec.id, title:sec.title, totalSecs:total, watchedSecs:watched };
    });
    return { totalSecs, watchedSecs, perSection };
  };

  G.getSectionColor = function(id,title){
    const map = G.state.settings.sectionColors || {};
    if (map[id]) return map[id];
    const palette = ["#ef4444","#22c55e","#06b6d4","#f59e0b","#a855f7","#14b8a6","#e11d48","#84cc16","#3b82f6","#f97316"];
    const idx = Math.abs(G.hash(title)) % palette.length;
    const c = palette[idx]; G.setSectionColor(id,c); return c;
  };
  G.setSectionColor = function(id,c){
    G.state.settings.sectionColors = G.state.settings.sectionColors || {};
    G.state.settings.sectionColors[id] = c; G.persist();
  };

  G.drawDonut = function(svg, slices){
    const cx=110, cy=110, R=100, r=62;
    const total = slices.reduce((a,b)=>a+b.seconds,0) || 1;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    let a0 = -Math.PI/2;
    slices.forEach(s=>{
      const a1 = a0 + (s.seconds/total)*Math.PI*2;
      const path = document.createElementNS("http://www.w3.org/2000/svg","path");
      path.setAttribute("d", donutPath(cx,cy,R,r,a0,a1));
      path.setAttribute("fill", s.color);
      svg.appendChild(path);
      a0 = a1;
    });
    function donutPath(cx,cy,R,r,a0,a1){
      const large = (a1-a0) > Math.PI ? 1 : 0;
      const x0=cx+R*Math.cos(a0), y0=cy+R*Math.sin(a0);
      const x1=cx+R*Math.cos(a1), y1=cy+R*Math.sin(a1);
      const x2=cx+r*Math.cos(a1), y2=cy+r*Math.sin(a1);
      const x3=cx+r*Math.cos(a0), y3=cy+r*Math.sin(a0);
      return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
    }
  };
})();
