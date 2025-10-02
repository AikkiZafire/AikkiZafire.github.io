// Basic interactivity for nav toggle
const navToggle = document.querySelector('.nav-toggle');
const siteMenu = document.getElementById('site-menu');
if (navToggle && siteMenu) {
  navToggle.addEventListener('click', () => {
    const open = siteMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
}

/** ---------- SVG Visualization ---------- */

(function gamingBarChart(){
  const mount = document.getElementById('viz');
  if (!mount) return;

  const data = [
    { label: 'Mon', value: 1.5 },
    { label: 'Tue', value: 3 },
    { label: 'Wed', value: 4.5 },
    { label: 'Thu', value: 2.2 },
    { label: 'Fri', value: 4 },
    { label: 'Sat', value: 6 },
    { label: 'Sun', value: 3.5 }
  ];

  const width = 720, height = 360;
  const x0 = 50, y0 = 300;        // chart origin
  const chartW = 620, chartH = 250;
  const barW = 60, gap = 20;
  const maxVal = 6;                // max hours gaming

  // helper: map hours → color gradient
  function getColor(val) {
    // normalize between 0 and 1
    const t = (val - 1) / (6 - 1); 
    // gradient stops: green (low) → orange (mid) → red (high)
    if (t <= 0.5) {
      // green to orange
      const ratio = t / 0.5;
      return `rgb(${Math.round(120 + ratio*135)}, ${Math.round(200 - ratio*120)}, 0)`; 
    } else {
      // orange to red
      const ratio = (t - 0.5) / 0.5;
      return `rgb(${255}, ${Math.round(80 - ratio*80)}, 0)`; 
    }
  }

  // build SVG
  let svg = `
    <svg width="${width}" height="${height}" style="background:#0e1620;">
      <!-- Axes -->
      <line x1="${x0}" y1="${y0}" x2="${x0+chartW}" y2="${y0}" stroke="#33516b" stroke-width="2" />
      <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0-chartH}" stroke="#33516b" stroke-width="2" />
  `;

  // Y-axis numbers
  for (let i = 0; i <= maxVal; i++) {
    const y = y0 - (i/maxVal)*chartH;
    svg += `<text x="${x0-10}" y="${y+4}" text-anchor="end" fill="#a8b2bd" font-size="12">${i}</text>`;
    svg += `<line x1="${x0-4}" y1="${y}" x2="${x0}" y2="${y}" stroke="#555" />`; 
  }

  // Creates the Bars + labels
  data.forEach((d, i) => {
    const h = (d.value / maxVal) * chartH;
    const x = x0 + gap + i * (barW + gap);
    const y = y0 - h;
    const color = getColor(d.value);

    svg += `
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${color}" />
      <text x="${x + barW/2}" y="${y-6}" text-anchor="middle" fill="#ffd166" font-size="12">${d.value}</text>
      <text x="${x + barW/2}" y="${y0+16}" text-anchor="middle" fill="#a8b2bd" font-size="12">${d.label}</text>
    `;
  });

  svg += `</svg>`;
  mount.innerHTML = svg;
})();




