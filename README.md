# 🏙️ GitCity 3D — Cyberpunk Repository Metropolis Visualizer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Three.js](https://img.shields.io/badge/Three.js-0.160.0-00f3ff.svg)](https://threejs.org/)
[![GitHub Pages](https://img.shields.io/badge/Deployment-GitHub%20Pages-brightgreen.svg)](https://sadmandied.github.io/git-city-3d/)
[![Audio](https://img.shields.io/badge/WebAudio-Procedural%20Synth-ff007f.svg)](#)

> **Transform any GitHub repository into an interactive 3D cyberpunk metropolis in real-time.**  
> Directories rise as district platforms, code files become neon-lit skyscrapers, and an interactive time-machine reconstructs your project commit by commit.

---

## 🌟 Key Features

- **🌆 Procedural Metropolis Engine:** Converts repository folder trees into modular cyber districts. Skyscrapers scale dynamically by lines of code and file size.
- **🎨 Language Hologram Palette:** Procedural neon edge outlines and illuminated office windows color-coded by language (Java, JavaScript, TypeScript, Python, Vue, HTML/CSS, SQL, Rust, Go, and more).
- **⏳ Chrono-Machine (Commit Evolution):** Scrub through project history to watch buildings rise up and evolve as commits land.
- **🛰️ Cinematic Drone Flight:** One-click orbital drone tour around the metropolis with dynamic altitude tracking.
- **🔍 Skyscraper Intel Inspector:** Click any skyscraper to glide the camera to it, revealing file size, lines of code, district zone, and direct links to GitHub source code.
- **⚡ Zero Build Dependencies:** Pure Three.js ES Modules. Runs instantly in any modern browser without requiring `npm install` or bundlers.
- **🎵 Built-in Cyberpunk Synthesizer:** Pure Web Audio API ambient drone and holographic UI sounds with zero external audio assets.
- **🚀 Dual-Mode GitHub API:** Query any live public repository via the search bar, with instant fallback to rich built-in presets (e.g., `sadmandied/CoworkingSpaceBookingSystem`, `expressjs/express`, `facebook/react`).

---

## 🏗️ City Architecture Mapping

| Repository Concept | Metropolis Representation |
| :--- | :--- |
| **Directory / Folder** | Elevated floating cyber district platform bounded by glowing neon borders |
| **File** | 3D skyscraper with procedural glowing windows and roof structures |
| **File Size / LOC** | Skyscraper height and architectural volume |
| **Programming Language** | Skyscraper neon edge glow & window emission palette |
| **Commit History** | Dynamic time-machine timeline that constructs buildings chronologically |
| **Dependencies / Bus** | High-speed neon data packet streams coursing between districts |

---

## 🚀 Quick Start

### Option 1: Live Demo
Explore directly on GitHub Pages:  
👉 **[https://sadmandied.github.io/git-city-3d/](https://sadmandied.github.io/git-city-3d/)**

### Option 2: Run Locally (Zero Setup)
Clone the repository and launch with the included Python launcher:

```bash
git clone https://github.com/sadmandied/git-city-3d.git
cd git-city-3d
python main.py
```
*The server will start on `http://localhost:8080` and automatically open your default browser.*

Alternatively, use any static web server:
```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .
```

---

## 🎮 Navigation & Controls

| Action | Control |
| :--- | :--- |
| **Orbit / Rotate** | Left-Click + Drag |
| **Pan** | Right-Click + Drag (or Shift + Left-Click) |
| **Zoom** | Scroll Wheel / Pinch |
| **Inspect Building** | Click any skyscraper |
| **Reset View** | Click the Reset Camera button |
| **Drone Tour** | Click the Drone Tour button for cinematic auto-orbit |
| **Toggle Synth Sound** | Click the Audio button in the top toolbar |

---

## 🔑 GitHub API Token (Optional)

Unauthenticated requests to the GitHub REST API are limited to 60 requests per hour by GitHub.  
To increase your limit to **5,000 requests per hour**:
1. Click the **Settings (Gear)** icon in the top right.
2. Enter a GitHub Personal Access Token (classic or fine-grained with `public_repo` read scope).
3. The token is stored strictly in your browser's `localStorage` and is never sent to any external server.

---

## 🛠️ Tech Stack

- **Graphics:** [Three.js](https://threejs.org/) (WebGL 3D, OrbitControls, PCFSoftShadows, ACESFilmicToneMapping)
- **Audio:** Web Audio API (Procedural dual-oscillator sub-drone & filter sweep)
- **Data Source:** [GitHub REST API v3](https://docs.github.com/en/rest)
- **Styling:** CSS3 Glassmorphism, CRT scanline overlay, Orbitron & Space Grotesk fonts

---

## 📄 License

MIT © [Sadman](https://github.com/sadmandied)
