/**
 * GitPie! — Main Application Orchestrator
 * Coordinates the Cuphead Cartoon Pie Canvas, GitHub API recipe fetcher, and user repository dropdown.
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
  }

  async init() {
    // 1. Initialize Pie Canvas Engine (supports both click and instant hover)
    this.pieEngine = new PieCanvasEngine(
      this.canvas,
      (slice) => this.onSliceSelected(slice),
      (slice) => this.onSliceSelected(slice)
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

      // Update pie slices
      this.pieEngine.setSlices(data.slices);

      // Update grand totals
      document.getElementById('stat-total-loc').textContent = data.totalLoc.toLocaleString();
      document.getElementById('stat-total-files').textContent = data.totalFiles.toLocaleString();
      document.getElementById('stat-total-kb').textContent = data.totalKB.toLocaleString();
      document.getElementById('recipe-repo-tag').textContent = `Repo: ${data.repoSlug}`;

      // Update dropdown label if matching
      const shortName = repoSlug.includes('/') ? repoSlug.split('/')[1] : repoSlug;
      document.getElementById('selected-repo-label').textContent = shortName;

      // Auto-select largest pie slice for the chalkboard
      if (data.slices.length > 0) {
        this.onSliceSelected(data.slices[0]);
      }

      setTimeout(() => {
        this.showBakingOverlay(false);
      }, 450);

    } catch (err) {
      console.error('Baking failed:', err);
      alert(`Oven malfunction: ${err.message}`);
      this.showBakingOverlay(false);
    }
  }

  onSliceSelected(slice) {
    this.selectedSlice = slice;

    // Blackboard Title & Flavor
    document.getElementById('recipe-title').textContent = `${slice.lang.name.toUpperCase()} ${slice.lang.flavor.toUpperCase()}`;
    document.getElementById('recipe-flavor').textContent = `A fresh batch made with ${slice.files.length} source files!`;

    // Metrics
    document.getElementById('recipe-loc').textContent = slice.loc.toLocaleString();
    document.getElementById('recipe-pct').textContent = `${(slice.percentage * 100).toFixed(1)}%`;
    document.getElementById('recipe-files-count').textContent = slice.files.length.toLocaleString();

    // Ingredients / File List
    const listEl = document.getElementById('ingredients-list');
    listEl.innerHTML = '';

    slice.files.slice(0, 30).forEach(file => {
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

    if (slice.files.length > 30) {
      const more = document.createElement('li');
      more.className = 'ingredient-item';
      more.style.justifyContent = 'center';
      more.innerHTML = `<em>...and ${slice.files.length - 30} more ingredients!</em>`;
      listEl.appendChild(more);
    }
  }

  setupEventListeners() {
    // 1. Bake input & button (for manual entry if desired)
    const input = document.getElementById('repo-input');
    const btnBake = document.getElementById('btn-bake');

    const handleBake = () => {
      const val = input.value.trim();
      if (val) {
        this.bakeRepository(val);
      }
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
      this.pieEngine.angularVelocity = 0.25 + Math.random() * 0.25;
    });
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
