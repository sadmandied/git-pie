/**
 * GitPie! — Main Application Orchestrator (v5.0)
 * Coordinates the Cuphead Cartoon Pie Canvas, GitHub API, Flavor Palette Legend,
 * Chef Git Mascot Interactions, and Vintage Recipe Blackboard.
 */

import { gitHubService } from './github_api.js';
import { PieCanvasEngine } from './pie_canvas.js';

class GitPieApp {
  constructor() {
    this.canvas = document.getElementById('pie-canvas');
    this.pieEngine = null;
    this.currentData = null;
    this.selectedSlice = null;
    this.userRepos = [];
    this.currentMode = 'languages'; // 'languages' | 'folders' | 'files'

    // Chef speech quotes
    this.chefQuotes = {
      welcome: "Welcome to the Bakery, Sadman! Let's slice this codebase!",
      spin: "Round and round she goes! A wallop of flavor in every spin!",
      bite: "CHOMP! Delicious refactored code! Save room for dessert!",
      java: "Golly! That's a hearty slice of Java Cherry! Robust and full-bodied!",
      js: "Lemon Meringue JavaScript! Tangy and full of lively async callbacks!",
      ts: "Blueberry TypeScript! Typed to absolute sweet perfection!",
      python: "Key Lime Python! Clean, readable, and smoothly indented!",
      sql: "Butterscotch SQL! Rich relational layers baked to a golden crust!",
      html: "Pumpkin Cobbler HTML! The structural crust holding everything together!",
      css: "Plum Custard CSS! Beautiful styling and elegant presentation!",
      xml: "Sugar Wafer XML! Crispy configuration and metadata sweetness!",
      generic: "Fresh out of the oven! Click any slice to inspect its source files!"
    };
  }

  async init() {
    // 1. Initialize Pie Canvas Engine
    this.pieEngine = new PieCanvasEngine(
      this.canvas,
      (slice) => this.onSliceSelected(slice),
      (slice) => this.onSliceHover(slice)
    );

    // 2. Setup Mascot Eye Tracking & Speech
    this.setupMascotInteractions();

    // 3. Setup UI Event Listeners
    this.setupEventListeners();

    // 4. Load Sadman's Repositories into the Dropdown
    await this.loadUserRepositories();

    // 5. Load Default Showcase Repository (CoworkingSpaceBookingSystem)
    const defaultRepo = 'sadmandied/CoworkingSpaceBookingSystem';
    await this.bakeRepository(defaultRepo);

    // 6. Start 60fps Cartoon Render Loop
    this.loop();
  }

  setupMascotInteractions() {
    const leftPupil = document.getElementById('chef-pupil-left');
    const rightPupil = document.getElementById('chef-pupil-right');

    window.addEventListener('mousemove', (e) => {
      if (!leftPupil || !rightPupil) return;
      const rect = this.canvas.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.008;
      const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.008;

      const clampX = Math.max(-2.5, Math.min(2.5, dx));
      const clampY = Math.max(-3, Math.min(3, dy));

      leftPupil.setAttribute('transform', `translate(${clampX}, ${clampY})`);
      rightPupil.setAttribute('transform', `translate(${clampX}, ${clampY})`);
    });
  }

  setChefSpeech(text) {
    const speechEl = document.getElementById('chef-speech-text');
    const bubbleEl = document.getElementById('chef-speech-bubble');
    if (!speechEl || !bubbleEl) return;

    speechEl.textContent = text;
    bubbleEl.classList.remove('speech-pop');
    void bubbleEl.offsetWidth; // Trigger reflow for CSS animation
    bubbleEl.classList.add('speech-pop');
  }

  async loadUserRepositories() {
    const listContainer = document.getElementById('repos-list');
    listContainer.innerHTML = '<div style="padding: 12px; color: #795548; font-family: var(--font-hand); text-align: center;">Fetching Sadman\'s pantry...</div>';

    try {
      this.userRepos = await gitHubService.fetchUserRepositories('sadmandied');
      listContainer.innerHTML = '';

      this.userRepos.forEach(repo => {
        const item = document.createElement('button');
        item.className = 'dropdown-repo-item';
        if (repo.name === 'CoworkingSpaceBookingSystem') {
          item.classList.add('active');
        }

        item.innerHTML = `
          <div class="repo-item-main">
            <span class="repo-item-star">★</span>
            <span class="repo-item-name">${repo.name}</span>
          </div>
          <span class="repo-item-lang">${repo.language}</span>
        `;

        item.addEventListener('click', () => {
          document.querySelectorAll('.dropdown-repo-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');

          document.getElementById('selected-repo-label').textContent = repo.name;
          document.getElementById('repos-menu').classList.add('hidden');
          document.getElementById('btn-repos-dropdown').setAttribute('aria-expanded', 'false');

          const repoSlug = repo.fullName || `sadmandied/${repo.name}`;
          document.getElementById('repo-input').value = repoSlug;
          this.bakeRepository(repoSlug);
        });

        listContainer.appendChild(item);
      });
    } catch (e) {
      console.warn('Error populating repositories dropdown:', e);
    }
  }

  async bakeRepository(repoSlug) {
    this.showBakingOverlay(true, `Mixing code ingredients for ${repoSlug}...`);
    this.setChefSpeech(`Stirring up a fresh batch for ${repoSlug.split('/')[1] || repoSlug}!`);

    try {
      const data = await gitHubService.fetchRepository(repoSlug);
      this.currentData = data;

      // Update pie slices for current mode
      this.applyCurrentModeSlices();

      // Update grand totals in footer
      document.getElementById('stat-total-loc').textContent = data.totalLoc.toLocaleString();
      document.getElementById('stat-total-files').textContent = data.totalFiles.toLocaleString();
      document.getElementById('stat-total-kb').textContent = data.totalKB.toLocaleString();
      document.getElementById('recipe-repo-tag').textContent = `Repo: ${data.repoSlug}`;

      // Update dropdown label if matching
      const shortName = repoSlug.includes('/') ? repoSlug.split('/')[1] : repoSlug;
      document.getElementById('selected-repo-label').textContent = shortName;

      setTimeout(() => {
        this.showBakingOverlay(false);
      }, 400);

    } catch (err) {
      console.error('Baking failed:', err);
      alert(`Oven malfunction: ${err.message}`);
      this.showBakingOverlay(false);
    }
  }

  applyCurrentModeSlices() {
    if (!this.currentData) return;
    let targetSlices = this.currentData.slices;
    if (this.currentMode === 'folders' && this.currentData.folderSlices) {
      targetSlices = this.currentData.folderSlices;
    } else if (this.currentMode === 'files' && this.currentData.fileSlices) {
      targetSlices = this.currentData.fileSlices;
    }

    this.pieEngine.setSlices(targetSlices);
    this.renderFlavorPaletteLegend(targetSlices);

    if (targetSlices.length > 0) {
      this.onSliceSelected(targetSlices[0]);
    }
  }

  renderFlavorPaletteLegend(slices) {
    const container = document.getElementById('pie-legend-bar');
    if (!container) return;
    container.innerHTML = '';

    slices.forEach((slice, idx) => {
      const pill = document.createElement('button');
      pill.className = 'flavor-pill';
      if (slice === this.selectedSlice || idx === 0) pill.classList.add('active');

      const pct = (slice.percentage * 100).toFixed(0);
      const loc = slice.loc.toLocaleString();

      pill.innerHTML = `
        <span class="flavor-dot" style="background-color: ${slice.lang.color};"></span>
        <span class="flavor-name">${slice.lang.name}</span>
        <span class="flavor-stat">${pct}% (${loc} LOC)</span>
      `;

      pill.addEventListener('mouseenter', () => {
        this.pieEngine.hoveredSlice = slice;
        this.updateRecipeChalkboard(slice, false);
      });

      pill.addEventListener('mouseleave', () => {
        if (this.selectedSlice) {
          this.pieEngine.hoveredSlice = null;
          this.updateRecipeChalkboard(this.selectedSlice, false);
        }
      });

      pill.addEventListener('click', () => {
        this.pieEngine.selectSlice(slice);
      });

      container.appendChild(pill);
    });
  }

  onSliceHover(slice) {
    if (!slice) return;
    this.updateRecipeChalkboard(slice, false);
  }

  onSliceSelected(slice) {
    this.selectedSlice = slice;
    this.updateRecipeChalkboard(slice, true);

    // Update active state in Flavor Palette
    const pills = document.querySelectorAll('.flavor-pill');
    const slices = (this.currentMode === 'folders' && this.currentData.folderSlices) ? this.currentData.folderSlices :
                   (this.currentMode === 'files' && this.currentData.fileSlices) ? this.currentData.fileSlices :
                   this.currentData?.slices || [];
    const idx = slices.indexOf(slice);
    pills.forEach((p, i) => {
      p.classList.toggle('active', i === idx);
    });

    // Dynamic Chef Speech
    const langKey = slice.lang.key || slice.lang.name.toLowerCase();
    if (this.chefQuotes[langKey]) {
      this.setChefSpeech(this.chefQuotes[langKey]);
    } else {
      const pct = (slice.percentage * 100).toFixed(0);
      this.setChefSpeech(`A generous ${pct}% slice of ${slice.lang.name}! Mixed with care!`);
    }
  }

  updateRecipeChalkboard(slice, clearFilter = true) {
    if (!slice) return;

    // Blackboard Title & Flavor
    document.getElementById('recipe-title').textContent = (slice.lang.name + ' ' + (slice.lang.flavor || '')).toUpperCase();
    document.getElementById('recipe-flavor').textContent = `A fresh batch made with ${slice.files.length} source ingredients!`;

    // Metrics
    document.getElementById('recipe-loc').textContent = slice.loc.toLocaleString();
    document.getElementById('recipe-pct').textContent = `${(slice.percentage * 100).toFixed(1)}%`;
    document.getElementById('recipe-files-count').textContent = slice.files.length.toLocaleString();

    // Baker's Tasting Notes
    const notesEl = document.getElementById('baker-notes-text');
    if (notesEl) {
      notesEl.textContent = this.generateBakerNotes(slice);
    }

    // Clear search input if selected freshly
    const searchInput = document.getElementById('ingredient-search');
    if (clearFilter && searchInput) {
      searchInput.value = '';
    }

    // Render file ingredients list
    const filterQuery = searchInput ? searchInput.value : '';
    this.renderIngredientsList(slice.files, filterQuery);
  }

  generateBakerNotes(slice) {
    const pct = slice.percentage * 100;
    if (pct > 50) {
      return `Dominant codebase ingredient! Comprising over ${pct.toFixed(0)}% of the entire parlor's recipes. Baked with heavy flavor!`;
    } else if (pct > 20) {
      return `A substantial code filling! Balanced nicely against the other ingredients for maximum architectural stability.`;
    } else if (pct > 5) {
      return `A delightful seasoning layer! Adds distinct texture and functionality to the project pastry.`;
    } else {
      return `A light powdered-sugar sprinkle! Small but essential configuration spice.`;
    }
  }

  renderIngredientsList(files, query = '') {
    const listEl = document.getElementById('ingredients-list');
    listEl.innerHTML = '';

    const cleanQuery = query.toLowerCase().trim();
    const filtered = files.filter(f => !cleanQuery || f.path.toLowerCase().includes(cleanQuery));

    if (filtered.length === 0) {
      listEl.innerHTML = `<li class="empty-hint" style="text-align: center; color: #a8e6cf;">No ingredients matching "${query}"!</li>`;
      return;
    }

    filtered.slice(0, 35).forEach(file => {
      const li = document.createElement('li');
      li.className = 'ingredient-item';

      const fileName = file.path.split('/').pop();
      const dirPath = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '';

      li.innerHTML = `
        <div class="ingredient-name-col">
          <span class="file-name">${fileName}</span>
          ${dirPath ? `<span class="file-dir">${dirPath}</span>` : ''}
        </div>
        <span class="file-loc">${file.loc.toLocaleString()} LOC</span>
      `;

      listEl.appendChild(li);
    });

    if (filtered.length > 35) {
      const more = document.createElement('li');
      more.className = 'ingredient-item';
      more.style.justifyContent = 'center';
      more.innerHTML = `<em>...and ${filtered.length - 35} more ingredients!</em>`;
      listEl.appendChild(more);
    }
  }

  setupEventListeners() {
    // 1. Order input & button (manual entry)
    const input = document.getElementById('repo-input');
    const btnBake = document.getElementById('btn-bake');

    const handleBake = () => {
      const val = input.value.trim();
      if (val) this.bakeRepository(val);
    };

    btnBake.addEventListener('click', handleBake);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleBake();
    });

    // 2. Dropdown Menu Toggle
    const btnDropdown = document.getElementById('btn-repos-dropdown');
    const menuDropdown = document.getElementById('repos-menu');

    btnDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = menuDropdown.classList.contains('hidden');
      menuDropdown.classList.toggle('hidden');
      btnDropdown.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!menuDropdown.contains(e.target) && e.target !== btnDropdown) {
        menuDropdown.classList.add('hidden');
        btnDropdown.setAttribute('aria-expanded', 'false');
      }
    });

    // 3. Spin The Pie Wheel button
    document.getElementById('btn-spin').addEventListener('click', () => {
      this.pieEngine.angularVelocity = 0.28 + Math.random() * 0.25;
      this.setChefSpeech(this.chefQuotes.spin);
    });

    // 4. Recipe Mode Selector (Languages / Folders / Files)
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMode = btn.getAttribute('data-mode');
        this.applyCurrentModeSlices();
      });
    });

    // 5. Take a Bite button (with comic popup)
    document.getElementById('btn-eat-slice').addEventListener('click', () => {
      if (this.pieEngine && this.selectedSlice) {
        this.pieEngine.takeBite(this.selectedSlice);
        this.triggerComicChomp();
        this.setChefSpeech(this.chefQuotes.bite);
      }
    });

    // 6. Copy Markdown Badge button
    document.getElementById('btn-copy-badge').addEventListener('click', () => {
      const repoSlug = this.currentData ? this.currentData.repoSlug : 'sadmandied/CoworkingSpaceBookingSystem';
      const badgeMarkdown = `[![Baked with GitPie](https://img.shields.io/badge/Baked%20with-GitPie%20🥧-d63031?style=for-the-badge)](https://sadmandied.github.io/git-pie/)`;
      navigator.clipboard.writeText(badgeMarkdown).then(() => {
        this.showToast('📋 Markdown Badge Copied!');
      });
    });

    // 7. Ingredient search filter
    const searchInput = document.getElementById('ingredient-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        if (this.selectedSlice && this.selectedSlice.files) {
          this.renderIngredientsList(this.selectedSlice.files, e.target.value);
        }
      });
    }

    // 8. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.pieEngine.angularVelocity = 0.32 + Math.random() * 0.25;
        this.setChefSpeech(this.chefQuotes.spin);
      } else if (e.key === 'ArrowRight') {
        this.pieEngine.cycleSlice(1);
      } else if (e.key === 'ArrowLeft') {
        this.pieEngine.cycleSlice(-1);
      } else if (e.key === '1') {
        document.querySelector('.mode-btn[data-mode="languages"]')?.click();
      } else if (e.key === '2') {
        document.querySelector('.mode-btn[data-mode="folders"]')?.click();
      } else if (e.key === '3') {
        document.querySelector('.mode-btn[data-mode="files"]')?.click();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        document.getElementById('btn-eat-slice')?.click();
      }
    });
  }

  triggerComicChomp() {
    const burst = document.getElementById('comic-chomp-burst');
    if (!burst) return;
    burst.classList.remove('hidden');
    burst.classList.remove('pop-anim');
    void burst.offsetWidth;
    burst.classList.add('pop-anim');

    setTimeout(() => {
      burst.classList.add('hidden');
    }, 700);
  }

  showBakingOverlay(show, message = '') {
    const overlay = document.getElementById('baking-overlay');
    const statusText = document.getElementById('baking-status');
    if (show) {
      if (message && statusText) statusText.textContent = message;
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  showToast(message) {
    const toast = document.getElementById('cartoon-toast');
    const textEl = document.getElementById('toast-text');
    textEl.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
  }

  loop() {
    this.pieEngine.render();
    requestAnimationFrame(() => this.loop());
  }
}

// Bootstrap on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new GitPieApp();
  app.init();
});
