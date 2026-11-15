// ═══════════════════════════════════════════════════
//  Earth System Trend Detective — NASA Space Apps 2026
//  Data: NASA POWER API (Langley Research Center)
//  Stats: OLS Linear Regression + Mann-Kendall Trend
// ═══════════════════════════════════════════════════

"use strict";

/* ── STARFIELD ── */
(function () {
  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d");
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      o: Math.random() * 0.6 + 0.1,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach((s) => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,210,255,${s.o})`;
      ctx.fill();
    });
  }

  resize();
  draw();
  window.addEventListener("resize", () => { resize(); draw(); });
})();

/* ── Q-CARDS ── */
document.querySelectorAll(".q-card").forEach((el) => {
  el.addEventListener("click", () => {
    document.querySelectorAll(".q-card").forEach((c) => c.classList.remove("active"));
    el.classList.add("active");
  });
});

/* ── VARIABLE META ── */
const VAR_META = {
  T2M:              { label: "Air Temperature (2m)", unit: "°C",    icon: "🌡️" },
  PRECTOTCORR:      { label: "Precipitation",        unit: "mm/day", icon: "🌧️" },
  RH2M:             { label: "Relative Humidity",    unit: "%",      icon: "💧" },
  WS10M:            { label: "Wind Speed (10m)",     unit: "m/s",    icon: "💨" },
  ALLSKY_SFC_SW_DWN:{ label: "Solar Radiation",      unit: "W/m²",   icon: "☀️" },
  T2MDEW:           { label: "Dew Point Temperature",unit: "°C",     icon: "🌫️" },
};

/* ── STATE ── */
let chartInstance = null;

/* ── STATUS ── */
function setStatus(state, msg) {
  const dot = document.getElementById("statusDot");
  const txt = document.getElementById("statusText");
  dot.className = "dot " + state;
  txt.textContent = msg;
}

/* ── FETCH NASA POWER ── */
async function fetchNASAPower(lat, lon, varName) {
  const start = "19900101";
  const end   = "20231231";
  const url = `https://power.larc.nasa.gov/api/temporal/annual/point?parameters=${varName}&community=AG&longitude=${lon}&latitude=${lat}&start=${start}&end=${end}&format=JSON`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NASA POWER returned ${res.status}`);
  const json = await res.json();

  const raw = json?.properties?.parameter?.[varName];
  if (!raw) throw new Error("Variable not found in response");

  // Build ordered array, skip fill value -999
  const years = Object.keys(raw).sort();
  const data = years
    .map((y) => ({ year: parseInt(y), value: raw[y] }))
    .filter((d) => d.value > -990);

  return data;
}

/* ── OLS LINEAR REGRESSION ── */
function ols(data) {
  const n = data.length;
  const xs = data.map((d) => d.year);
  const ys = data.map((d) => d.value);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let ssXY = 0, ssXX = 0, ssYY = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (xs[i] - meanX) * (ys[i] - meanY);
    ssXX += (xs[i] - meanX) ** 2;
    ssYY += (ys[i] - meanY) ** 2;
  }

  const slope     = ssXY / ssXX;          // units per year
  const intercept = meanY - slope * meanX;
  const r2        = (ssXY ** 2) / (ssXX * ssYY);

  // residual standard error
  const residuals = data.map((d) => d.value - (slope * d.year + intercept));
  const sse = residuals.reduce((a, b) => a + b ** 2, 0);
  const se  = Math.sqrt(sse / (n - 2));
  const seSlope = se / Math.sqrt(ssXX);

  // t-test for slope
  const tStat = slope / seSlope;
  const pValue = approxPValue(Math.abs(tStat), n - 2);

  return { slope, intercept, r2, tStat, pValue, meanY };
}

/* ── APPROX P-VALUE (two-tailed t) ── */
function approxPValue(t, df) {
  // approximation using normal dist for large df
  const x = df / (df + t * t);
  const beta = incompleteBeta(x, df / 2, 0.5);
  return Math.min(1, beta);
}

function incompleteBeta(x, a, b) {
  if (x === 0) return 0;
  if (x === 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  let result = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a;
  // simple continued fraction (Lentz's method, 20 iters)
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  result *= d;
  for (let m = 1; m <= 20; m++) {
    let aa = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; result *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; const del = d * c; result *= del;
    if (Math.abs(del - 1) < 1e-7) break;
  }
  return Math.min(1, result);
}

function lgamma(z) {
  // Stirling approx
  const c = [76.18009173,-86.50532033,24.01409822,-1.231739516,0.00120858003,-0.00000536382];
  let s = 1.000000000190015;
  for (let i = 0; i < c.length; i++) s += c[i] / (z + i + 1);
  return (z + 0.5) * Math.log(z + 5.5) - (z + 5.5) + Math.log(2.5066282746310005 * s / z);
}

/* ── MANN-KENDALL TAU ── */
function mannKendall(data) {
  const ys = data.map((d) => d.value);
  const n = ys.length;
  let S = 0;
  for (let i = 0; i < n - 1; i++)
    for (let j = i + 1; j < n; j++)
      S += Math.sign(ys[j] - ys[i]);

  const varS = (n * (n - 1) * (2 * n + 5)) / 18;
  const Z = S > 0 ? (S - 1) / Math.sqrt(varS) : S < 0 ? (S + 1) / Math.sqrt(varS) : 0;
  const tau = (2 * S) / (n * (n - 1));
  const pMK = 2 * (1 - normalCDF(Math.abs(Z)));
  return { tau, Z, pMK };
}

function normalCDF(z) {
  const t = 1 / (1 + 0.2316419 * z);
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
}

/* ── ANOMALY DETECTION (z-score ±2σ) ── */
function findAnomalies(data) {
  const vals = data.map((d) => d.value);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std  = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  return data.map((d) => ({ ...d, z: (d.value - mean) / std, mean, std }));
}

/* ── DECADAL ANALYSIS ── */
function decadalRates(data) {
  const decades = {};
  data.forEach((d) => {
    const dec = Math.floor(d.year / 10) * 10;
    if (!decades[dec]) decades[dec] = [];
    decades[dec].push(d.value);
  });
  return Object.entries(decades).map(([dec, vals]) => ({
    decade: parseInt(dec),
    mean: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));
}

/* ── RENDER CHART ── */
function renderChart(data, reg, meta, annot) {
  if (chartInstance) chartInstance.destroy();

  const labels = data.map((d) => d.year.toString());
  const values = data.map((d) => d.value);
  const trendLine = data.map((d) => reg.slope * d.year + reg.intercept);

  const anomalies = annot.filter((a) => Math.abs(a.z) >= 2);
  const anomalyMap = {};
  anomalies.forEach((a) => { anomalyMap[a.year] = a; });

  const pointColors = data.map((d) =>
    anomalyMap[d.year]
      ? anomalyMap[d.year].z > 0 ? "rgba(255,95,126,0.9)" : "rgba(0,229,160,0.9)"
      : "rgba(56,178,255,0.5)"
  );

  const ctx = document.getElementById("trendChart").getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: meta.label,
          data: values,
          borderColor: "rgba(56,178,255,0.6)",
          backgroundColor: "rgba(56,178,255,0.06)",
          borderWidth: 1.5,
          pointRadius: 4,
          pointBackgroundColor: pointColors,
          pointBorderColor: "transparent",
          tension: 0.3,
          fill: true,
          order: 2,
        },
        {
          label: "Trend (OLS)",
          data: trendLine,
          borderColor: reg.slope > 0 ? "rgba(255,95,126,0.9)" : "rgba(0,229,160,0.9)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0,
          fill: false,
          borderDash: [6, 3],
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: {
        legend: {
          labels: { color: "#5a7399", font: { family: "Space Grotesk", size: 11 }, boxWidth: 16 },
        },
        tooltip: {
          backgroundColor: "#0d1526",
          borderColor: "#1e3050",
          borderWidth: 1,
          titleColor: "#eaf2ff",
          bodyColor: "#cdd9f0",
          callbacks: {
            afterBody: (items) => {
              const yr = parseInt(items[0].label);
              if (anomalyMap[yr]) return [`⚡ Anomaly: z=${anomalyMap[yr].z.toFixed(2)}σ`];
              return [];
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#5a7399", font: { family: "Space Mono", size: 10 }, maxTicksLimit: 10 },
          grid: { color: "rgba(30,48,80,0.5)" },
        },
        y: {
          ticks: { color: "#5a7399", font: { family: "Space Mono", size: 10 } },
          grid: { color: "rgba(30,48,80,0.5)" },
          title: { display: true, text: meta.unit, color: "#5a7399", font: { family: "Space Grotesk", size: 11 } },
        },
      },
    },
  });
}

/* ── FORMAT P-VALUE ── */
function fmtP(p) {
  if (p < 0.001) return "< 0.001";
  if (p < 0.01)  return "< 0.01";
  return p.toFixed(3);
}

/* ── BUILD VERDICT HTML ── */
function buildVerdict(reg, mk, annot, meta, data) {
  const sigClass  = reg.pValue < 0.05 ? "significant" : reg.pValue < 0.1 ? "borderline" : "noise";
  const sigLabel  = reg.pValue < 0.05 ? "SIGNIFICANT" : reg.pValue < 0.1 ? "BORDERLINE" : "NOT SIGNIFICANT";
  const direction = reg.slope > 0 ? "RISING" : "FALLING";
  const dirClass  = reg.slope > 0 ? "up" : "down";

  const perDecade = (reg.slope * 10).toFixed(3);
  const anomalies = annot.filter((a) => Math.abs(a.z) >= 2);

  return `
    <div class="metric-block">
      <div class="metric-label">TREND DIRECTION</div>
      <div class="metric-value ${dirClass}">${direction}</div>
      <div class="metric-unit">${reg.slope > 0 ? "▲" : "▼"} ${Math.abs(reg.slope).toFixed(4)} ${meta.unit}/year</div>
    </div>
    <hr class="divider" />
    <div class="metric-block">
      <div class="metric-label">SIGNIFICANCE (OLS p-value)</div>
      <div class="metric-value" style="font-size:1.1rem">${fmtP(reg.pValue)}</div>
      <div class="metric-unit" style="margin-top:8px"><span class="sig-pill ${sigClass}">${sigLabel}</span></div>
    </div>
    <hr class="divider" />
    <div class="metric-block">
      <div class="metric-label">MANN-KENDALL τ</div>
      <div class="metric-value" style="font-size:1.1rem">${mk.tau.toFixed(3)}</div>
      <div class="metric-unit">Z = ${mk.Z.toFixed(2)} · p = ${fmtP(mk.pMK)}</div>
    </div>
    <hr class="divider" />
    <div class="metric-block">
      <div class="metric-label">R² (variance explained)</div>
      <div class="metric-value" style="font-size:1.1rem">${(reg.r2 * 100).toFixed(1)}%</div>
    </div>
    <hr class="divider" />
    <div class="metric-block">
      <div class="metric-label">EXTREME ANOMALIES (|z|≥2σ)</div>
      <div class="metric-value" style="font-size:1.1rem">${anomalies.length} year${anomalies.length !== 1 ? "s" : ""}</div>
      <div class="metric-unit">${anomalies.map((a) => a.year).join(", ") || "none"}</div>
    </div>
  `;
}

/* ── BUILD 4 ANSWERS ── */
function buildAnswers(reg, mk, annot, meta, data, lat, lon) {
  const dir       = reg.slope > 0 ? "rising" : "falling";
  const perDecade = (reg.slope * 10).toFixed(3);
  const anomalies = annot.filter((a) => Math.abs(a.z) >= 2);
  const worstAnomaly = anomalies.sort((a, b) => Math.abs(b.z) - Math.abs(a.z))[0];
  const sigText   = reg.pValue < 0.05 ? "statistically significant (p = " + fmtP(reg.pValue) + ")" : "not statistically significant at the 95% level (p = " + fmtP(reg.pValue) + ")";

  // Decadal
  const decades = decadalRates(data);
  const decStr  = decades.map((d) => `${d.decade}s: ${d.mean.toFixed(2)} ${meta.unit}`).join(" · ");

  document.getElementById("ans0").innerHTML = `
    <div class="q">CASE FILE 01 — DIRECTION</div>
    <div class="a">
      <strong>${meta.icon} ${meta.label}</strong> at (${lat}°, ${lon}°) is <strong>${dir}</strong> at a rate of
      <strong>${Math.abs(reg.slope).toFixed(4)} ${meta.unit}/year</strong> over the 1990–2023 period.
      That translates to roughly <strong>${Math.abs(perDecade)} ${meta.unit} per decade</strong>.
    </div>`;
  document.getElementById("ans0").classList.remove("empty");

  document.getElementById("ans1").innerHTML = `
    <div class="q">CASE FILE 02 — SIGNIFICANCE</div>
    <div class="a">
      The trend is <strong>${sigText}</strong>. The Mann-Kendall test confirms this
      with τ = ${mk.tau.toFixed(3)} (Z = ${mk.Z.toFixed(2)}, p = ${fmtP(mk.pMK)}).
      The linear model explains <strong>${(reg.r2 * 100).toFixed(1)}%</strong> of the year-to-year variance.
    </div>`;
  document.getElementById("ans1").classList.remove("empty");

  const anomalyAnswer = worstAnomaly
    ? `The most extreme anomaly occurred in <strong>${worstAnomaly.year}</strong> (z = ${worstAnomaly.z.toFixed(2)}σ),
       ${worstAnomaly.z > 0 ? "above" : "below"} the long-term mean.
       A total of <strong>${anomalies.length}</strong> year(s) exceeded ±2σ: ${anomalies.map((a) => a.year).join(", ")}.`
    : `No years exceeded the ±2σ threshold — the signal is consistent with low interannual variability.`;

  document.getElementById("ans2").innerHTML = `
    <div class="q">CASE FILE 03 — ANOMALIES</div>
    <div class="a">${anomalyAnswer} Red/green dots on the chart mark these outlier years.</div>`;
  document.getElementById("ans2").classList.remove("empty");

  document.getElementById("ans3").innerHTML = `
    <div class="q">CASE FILE 04 — DECADAL RATE</div>
    <div class="a">
      Decade-by-decade averages: <strong>${decStr}</strong>. 
      ${decades.length >= 2
        ? `The difference between the first and last full decade is
           <strong>${(decades[decades.length - 1].mean - decades[0].mean).toFixed(3)} ${meta.unit}</strong>.`
        : ""}
    </div>`;
  document.getElementById("ans3").classList.remove("empty");
}

/* ── MAIN ANALYSIS ── */
async function runAnalysis() {
  const lat     = parseFloat(document.getElementById("lat").value);
  const lon     = parseFloat(document.getElementById("lon").value);
  const varName = document.getElementById("varSelect").value;
  const meta    = VAR_META[varName];
  const btn     = document.getElementById("analyzeBtn");

  if (isNaN(lat) || isNaN(lon)) {
    setStatus("error", "Please enter valid latitude and longitude.");
    return;
  }

  btn.disabled = true;
  setStatus("fetching", `Fetching ${meta.label} data from NASA POWER (1990–2023)…`);

  document.getElementById("resultsGrid").style.display = "none";
  document.getElementById("answersGrid").style.display = "none";

  try {
    const data = await fetchNASAPower(lat, lon, varName);

    if (data.length < 10) throw new Error("Not enough data points for trend analysis.");

    setStatus("fetching", `Running OLS regression and Mann-Kendall test on ${data.length} annual values…`);

    // Stats
    const reg  = ols(data);
    const mk   = mannKendall(data);
    const annot = findAnomalies(data);

    // Chart
    document.getElementById("chartTitle").textContent = `${meta.icon} ${meta.label} — Annual Trend`;
    document.getElementById("chartSubtitle").textContent = `NASA POWER · ${data[0].year}–${data[data.length - 1].year} · ${data.length} values`;
    renderChart(data, reg, meta, annot);

    // Verdict
    document.getElementById("verdictPanel").innerHTML = buildVerdict(reg, mk, annot, meta, data);

    // 4 Answers
    buildAnswers(reg, mk, annot, meta, data, lat, lon);

    document.getElementById("resultsGrid").style.display = "grid";
    document.getElementById("answersGrid").style.display = "grid";

    setStatus("done", `Analysis complete — ${data.length} annual values · NASA POWER · OLS + Mann-Kendall`);
  } catch (err) {
    setStatus("error", `Error: ${err.message}. Try a different variable or location.`);
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}

// Auto-run with defaults on load
window.addEventListener("load", () => {
  setTimeout(runAnalysis, 600);
});
