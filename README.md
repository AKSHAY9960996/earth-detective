# 🛰️ Earth System Trend Detective
### NASA Space Apps Challenge 2026 — *Be an Earth System Trend Detective*
**Theme:** The Next Frontier · **Category:** Earth Science (Advanced)

---

## 🔍 What It Does

Pick any location on Earth + a climate variable → the app pulls **34 years of real NASA satellite data** → runs honest statistics → gives you a detective-style report on what changed, when, and whether it's real signal or noise.

**No synthetic data. No mock data. 100% live NASA POWER API.**

---

## 📋 The 4 Detective Questions — Answered

| Case File | Question | How We Answer |
|---|---|---|
| 01 | Is the variable trending up or down? | OLS slope (units/year), direction shown with trend line |
| 02 | Is the trend statistically significant? | OLS p-value + Mann-Kendall τ at 95% confidence |
| 03 | When did the most extreme anomalies occur? | Z-score detection (±2σ), highlighted on chart |
| 04 | How does the rate of change compare across decades? | Decade-by-decade mean comparison |

---

## 🛰️ NASA Data Used

| Variable | NASA Dataset | Source | Record |
|---|---|---|---|
| Air Temperature (2m) | T2M | NASA POWER / MERRA-2 | 1990–2023 |
| Precipitation | PRECTOTCORR | NASA POWER / GPM | 1990–2023 |
| Relative Humidity | RH2M | NASA POWER / MERRA-2 | 1990–2023 |
| Wind Speed (10m) | WS10M | NASA POWER / MERRA-2 | 1990–2023 |
| Solar Radiation | ALLSKY_SFC_SW_DWN | NASA POWER / CERES | 1990–2023 |
| Dew Point Temperature | T2MDEW | NASA POWER / MERRA-2 | 1990–2023 |

**API:** [NASA POWER (Langley Research Center)](https://power.larc.nasa.gov) — Free, no API key required.

---

## 📐 Statistical Methods

- **OLS Linear Regression** — slope (units/year), intercept, R², t-statistic, p-value
- **Mann-Kendall Trend Test** — non-parametric, robust to outliers, Kendall's τ + Z-score
- **Z-Score Anomaly Detection** — flags years beyond ±2σ from long-term mean
- **Decadal Analysis** — decade-by-decade mean comparison

---

## 🚀 How to Run

```bash
# Option 1: Just open in browser (no server needed)
open index.html

# Option 2: Local HTTP server (recommended for CORS)
npx serve .
# or
python3 -m http.server 8080
```

The app auto-runs an analysis for Kerala, India (10°N, 76.5°E) on load.

---

## 🏗️ Tech Stack

- **Vanilla HTML/CSS/JS** — zero build step, works offline-first
- **Chart.js 4.4** (CDN) — trend chart + anomaly markers
- **NASA POWER API** — real satellite data, free, no key
- **Google Fonts** — Space Grotesk + Space Mono

---

## 📁 Project Structure

```
earth-trend-detective/
├── index.html      # UI — detective dashboard
├── app.js          # NASA API fetch + statistics + chart
└── README.md       # This file
```

---

## 🌍 Example Findings

**Kerala, India (10°N, 76.5°E) — Air Temperature 1990–2023:**
- Trend: +0.025°C/year (rising)
- OLS p-value: < 0.05 (significant)
- Mann-Kendall τ: > 0.3
- Anomaly years: typically include strong El Niño years

---

## 👨‍💻 Team

Built for the **2026 NASA Space Apps Challenge** — The Next Frontier  
Challenge: *Be an Earth System Trend Detective*  
Data Provider: NASA Goddard / Langley Research Center

---

## 📜 License

MIT — built on NASA open data (public domain).
