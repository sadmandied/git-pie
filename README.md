# 🥧 GitPie — Minimal & Precision GitHub Codebase Visualizer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![HTML5 Canvas](https://img.shields.io/badge/Canvas-Precision%20Donut%20Engine-1a1614.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-2e7d32.svg)](#)
[![GitHub Pages](https://img.shields.io/badge/Deployment-GitHub%20Pages-success.svg)](https://sadmandied.github.io/git-pie/)

> **GitPie** is a minimalist, high-craft codebase visualizer for GitHub repositories.  
> Transform any repository into an interactive precision donut chart with dynamic center metrics, breakdown modes (Languages, Folders, Files), and comprehensive file inspection.

---

## 🌟 Key Features

- **🎯 Precision Donut Engine:** Minimalist radial geometry with crisp micro-gaps, smooth physics-driven drag rotation, angular velocity inertia, and hover elevation.
- **📊 Dynamic Central Typography Readout:** Instant center stat breakdown showing the active slice's category, percentage share, and tabular line-of-code (LOC) count.
- **🗂️ Multi-Perspective Slicing:**
  - **Languages Mode:** Deep dive into programming language distribution and ratios.
  - **Folders Mode:** High-level architectural map of repository directory organization.
  - **Top Files Mode:** Identify the heaviest files driving project complexity.
- **🔍 File Inspection Panel:** Clean receipt-style inspection card featuring module summary, exact LOC metrics, code share percentage, and real-time searchable file list with direct GitHub links.
- **✨ High-Craft Aesthetics:** Warm editorial canvas palette (`#faf8f5`), distinct typography pairing (`Spectral` serif + `Outfit` clean sans + `JetBrains Mono`), WCAG AA compliant contrast, and responsive layout.
- **⚡ Zero Build Dependencies:** Built purely with modern standard ES Modules and Canvas 2D. No bundler, no node modules required to run.

---

## 🚀 Quick Start

### 1. Live Web Version
Explore any repository directly in your browser:  
👉 **[https://sadmandied.github.io/git-pie/](https://sadmandied.github.io/git-pie/)**

### 2. Run Locally
```bash
git clone https://github.com/sadmandied/git-pie.git
cd git-pie
python main.py
```
*Opens automatically in your browser on `http://localhost:8080`.*

---

## ⌨️ Controls & Shortcuts

| Action | Control |
| :--- | :--- |
| **Inspect Slice** | Click or hover on any donut arc or legend pill |
| **Rotate Wheel** | Click and drag the donut with your mouse or touch |
| **Spin Wheel** | Press `Spacebar` or click **Spin Pie** |
| **Switch Modes** | Press `1` for Languages, `2` for Folders, `3` for Top Files |
| **Cycle Slices** | Press `ArrowRight` (next) or `ArrowLeft` (previous) |
| **Analyze Any Repo** | Enter any `owner/repo` (e.g. `expressjs/express`, `facebook/react`) in the bottom bar |

---

## 📄 License

MIT © [Sadman](https://github.com/sadmandied)
