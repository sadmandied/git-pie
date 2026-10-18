/**
 * GitPie! — Main Application Orchestrator
 * Coordinates the Cuphead Cartoon Pie Canvas, GitHub API, View Modes, and Interactive Recipe Book.
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
  }

  async init() {
    // 1. Initialize Pie Canvas Engine (supports click & hover)
    this.pieEngine = new PieCanvasEngine(
      this.canvas,
      (slice) => this.onSliceSelected(slice),
      (slice) => this.onSliceHover(slice)
    );

    // 2. Setup Event Listeners
    this.setupEventListeners();

    // 3. Load Sadman's Repositories into the Dropdown
    await this.loadUserRepositories();

    // 4. Load Default Showcase Repository (CoworkingSpaceBookingSystem)
    const defaultRepo = 'sadmandied/CoworkingSpaceBookingSystem';
    await this.bakeRepository(defaultRepo);

    // 5. Start 60fps Cartoon Render Loop
    this.loop();
  }

  async loadUserRepositories() {
    const listContainer = document.getElementById('repos-list');
    listContainer.innerHTML = '<div style="padding: 10px; color: #795548; font-family: var(--font-hand);">Fetching repositories...</div>';

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
          <span class="repo-item-name">${repo.name}</span>
          <span class="repo-item-lang">${repo.language}</span>
        `;

        item.addEventListener('click', () => {
          document.querySelectorAll('.dropdown-repo-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');

          document.getElementById('selected-repo-label').textContent = repo.name;
          document.getElementById('repos-menu').classList.add('hidden');

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

    try {
      const data = await gitHubService.fetchRepository(repoSlug);
      this.currentData = data;

      // Update pie slices for current mode
      this.applyCurrentModeSlices();

      // Update grand totals
      document.getElementById('stat-total-loc').textContent = data.totalLoc.toLocaleString();
      document.getElementById('stat-total-files').textContent = data.totalFiles.toLocaleString();
      document.getElementById('stat-total-kb').textContent = data.totalKB.toLocaleString();
      document.getElementById('recipe-repo-tag').textContent = `Repo: ${data.repoSlug}`;

      // Update dropdown label if matching
      const shortName = repoSlug.includes('/') ? repoSlug.split('/')[1] : repoSlug;
      document.getElementById('selected-repo-label').textContent = shortName;

      setTimeout(() => {
        this.showBakingOverlay(false);
      }, 450);

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

    if (targetSlices.length > 0) {
      this.onSliceSelected(targetSlices[0]);
    }
  }

  onSliceHover(slice) {
    if (!slice) return;
    this.updateRecipeChalkboard(slice, false);
  }

  onSliceSelected(slice) {
    this.selectedSlice = slice;
    this.updateRecipeChalkboard(slice, true);
  }

  updateRecipeChalkboard(slice, clearFilter = true) {
    if (!slice) return;

    // Blackboard Title & Flavor
    document.getElementById('recipe-title').textContent = `${slice.lang.name.toUpperCase()} ${slice.lang.flavor.toUpperCase()}`;
    document.getElementById('recipe-flavor').textContent = `A fresh batch made with ${slice.files.length} source files!`;

    // Metrics
    document.getElementById('recipe-loc').textContent = slice.loc.toLocaleString();
    document.getElementById('recipe-pct').textContent = `${(slice.percentage * 100).toFixed(1)}%`;
    document.getElementById('recipe-files-count').textContent = slice.files.length.toLocaleString();

    if (clearFilter) {
      const searchInput = document.getElementById('ingredient-search');
      if (searchInput) searchInput.value = '';
    }

    this.renderIngredientsList(slice.files);
  }

  renderIngredientsList(files, filterTerm = '') {
    const listEl = document.getElementById('ingredients-list');
    listEl.innerHTML = '';

    const term = filterTerm.trim().toLowerCase();
    const filtered = term ? files.filter(f => f.filename.toLowerCase().includes(term) || f.path.toLowerCase().includes(term)) : files;

    if (filtered.length === 0) {
      listEl.innerHTML = '<li class="empty-hint">No matching ingredients found in this slice!</li>';
      return;
    }

    filtered.slice(0, 30).forEach(file => {
      const li = document.createElement('li');
      li.className = 'ingredient-item';
      li.innerHTML = `
        <a href="${file.url}" target="_blank" rel="noopener noreferrer" class="ingredient-name" title="${file.path}">
          📄 ${file.filename}
        </a>
        <span class="ingredient-loc">${file.loc} LOC</span>
      `;
      listEl.appendChild(li);
    });

    if (filtered.length > 30) {
      const more = document.createElement('li');
      more.className = 'ingredient-item';
      more.style.justifyContent = 'center';
      more.innerHTML = `<em>...and ${filtered.length - 30} more ingredients!</em>`;
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
      menuDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!menuDropdown.contains(e.target) && e.target !== btnDropdown) {
        menuDropdown.classList.add('hidden');
      }
    });

    // 3. Spin The Pie Wheel button
    document.getElementById('btn-spin').addEventListener('click', () => {
      this.pieEngine.angularVelocity = 0.28 + Math.random() * 0.28;
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

    // 5. Take a Bite button
    document.getElementById('btn-eat-slice').addEventListener('click', () => {
      if (this.pieEngine && this.selectedSlice) {
        this.pieEngine.takeBite(this.selectedSlice);
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
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.pieEngine.angularVelocity = 0.32 + Math.random() * 0.25;
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
        document.getElementById('repo-input').focus();
      }
    });
  }

  showToast(msg) {
    const toast = document.getElementById('cartoon-toast');
    const txt = document.getElementById('toast-text');
    txt.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2200);
  }

  showBakingOverlay(show, text = '') {
    const overlay = document.getElementById('baking-overlay');
    const desc = document.getElementById('baking-status');
    if (show) {
      if (text) desc.textContent = text;
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    if (this.pieEngine) {
      this.pieEngine.render();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new GitPieApp();
  app.init();
});
