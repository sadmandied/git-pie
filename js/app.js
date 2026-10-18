/**
 * GitPie — Main Application Orchestrator
 * Coordinates the Precision Donut Canvas, GitHub API, Language Palette Legend,
 * and Codebase Inspection Panel.
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
    // 1. Initialize Precision Donut Canvas Engine
    this.pieEngine = new PieCanvasEngine(
      this.canvas,
      (slice) => this.onSliceSelected(slice),
      (slice) => this.onSliceHover(slice)
    );

    // 2. Setup UI Event Listeners
    this.setupEventListeners();

    // 3. Start Render Loop immediately so canvas renders smoothly from frame 1
    this.loop();

    // 4. Load Sadman's Repositories into the Dropdown
    await this.loadUserRepositories();

    // 5. Load Default Showcase Repository (CoworkingSpaceBookingSystem)
    const defaultRepo = 'sadmandied/CoworkingSpaceBookingSystem';
    await this.analyzeRepository(defaultRepo);
  }

  async loadUserRepositories() {
    const listContainer = document.getElementById('repos-list');
    listContainer.innerHTML = '<div style="padding: 12px; color: var(--ink-secondary); font-size: 0.82rem; text-align: center;">Loading Sadman\'s repositories...</div>';

    try {
      this.userRepos = await gitHubService.fetchUserRepositories('sadmandied');
      listContainer.innerHTML = '';

      this.userRepos.forEach(repo => {
        const item = document.createElement('button');
        item.setAttribute('type', 'button');
        item.setAttribute('role', 'menuitem');
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
          this.analyzeRepository(repoSlug);
        });

        listContainer.appendChild(item);
      });
    } catch (e) {
      console.warn('Error populating repositories dropdown:', e);
    }
  }

  // Alias for backwards compatibility
  async bakeRepository(repoSlug) {
    return this.analyzeRepository(repoSlug);
  }

  async analyzeRepository(repoSlug) {
    this.showLoadingOverlay(true, `Analyzing codebase for ${repoSlug}...`);

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
        this.showLoadingOverlay(false);
      }, 400);

    } catch (err) {
      console.error('Analysis failed:', err);
      alert(`Repository analysis error: ${err.message}`);
      this.showLoadingOverlay(false);
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
      pill.setAttribute('type', 'button');
      pill.className = 'flavor-pill';
      if (slice === this.selectedSlice || idx === 0) pill.classList.add('active');

      const pct = (slice.percentage * 100).toFixed(0);
      const loc = slice.loc.toLocaleString();
      pill.setAttribute('aria-label', `${slice.lang.name}: ${pct}%, ${loc} lines of code`);

      pill.innerHTML = `
        <span class="flavor-dot" style="background-color: ${slice.lang.color};"></span>
        <span class="flavor-name">${slice.lang.name}</span>
        <span class="flavor-stat">${pct}% (${loc} LOC)</span>
      `;

      pill.addEventListener('mouseenter', () => {
        this.pieEngine.hoveredSlice = slice;
        this.updateInspectionPanel(slice, false);
      });

      pill.addEventListener('mouseleave', () => {
        if (this.selectedSlice) {
          this.pieEngine.hoveredSlice = null;
          this.updateInspectionPanel(this.selectedSlice, false);
        }
      });

      pill.addEventListener('focus', () => {
        this.pieEngine.selectSlice(slice);
      });

      pill.addEventListener('click', () => {
        this.pieEngine.selectSlice(slice);
      });

      container.appendChild(pill);
    });
  }

  onSliceHover(slice) {
    if (!slice) return;
    this.updateInspectionPanel(slice, false);
  }

  onSliceSelected(slice) {
    this.selectedSlice = slice;
    this.updateInspectionPanel(slice, true);

    // Update active state in Palette
    const pills = document.querySelectorAll('.flavor-pill');
    const slices = (this.currentMode === 'folders' && this.currentData.folderSlices) ? this.currentData.folderSlices :
                   (this.currentMode === 'files' && this.currentData.fileSlices) ? this.currentData.fileSlices :
                   this.currentData?.slices || [];
    const idx = slices.indexOf(slice);
    pills.forEach((p, i) => {
      p.classList.toggle('active', i === idx);
    });
  }

  // Alias for backwards compatibility
  updateRecipeChalkboard(slice, clearFilter = true) {
    return this.updateInspectionPanel(slice, clearFilter);
  }

  updateInspectionPanel(slice, clearFilter = true) {
    if (!slice) return;

    // Inspection Panel Title & Subtitle
    document.getElementById('recipe-title').textContent = (slice.lang.name || '').toUpperCase();
    const count = slice.files ? slice.files.length : 0;
    document.getElementById('recipe-flavor').textContent = `${count} source file${count === 1 ? '' : 's'} · ${slice.loc.toLocaleString()} lines of code`;

    // Metrics
    document.getElementById('recipe-loc').textContent = slice.loc.toLocaleString();
    document.getElementById('recipe-pct').textContent = `${(slice.percentage * 100).toFixed(1)}%`;
    document.getElementById('recipe-files-count').textContent = count.toLocaleString();

    // Inspection Summary Note
    const notesEl = document.getElementById('baker-notes-text');
    if (notesEl) {
      notesEl.textContent = this.generateSummaryNotes(slice);
    }

    // Clear search input if selected freshly
    const searchInput = document.getElementById('ingredient-search');
    if (clearFilter && searchInput) {
      searchInput.value = '';
    }

    // Render file list
    const filterQuery = searchInput ? searchInput.value : '';
    this.renderFilesList(slice.files, filterQuery);
  }

  generateSummaryNotes(slice) {
    const pct = slice.percentage * 100;
    if (pct > 50) {
      return `Primary technology component representing ${pct.toFixed(1)}% of total codebase volume.`;
    } else if (pct > 20) {
      return `Core functional module delivering substantial architecture and operational logic (${pct.toFixed(1)}% share).`;
    } else if (pct > 5) {
      return `Supporting module contributing ${pct.toFixed(1)}% of total line count with targeted integration scope.`;
    } else {
      return `Lightweight configuration or utility layer representing ${pct.toFixed(1)}% of project files.`;
    }
  }

  // Alias for backwards compatibility
  renderIngredientsList(files, query = '') {
    return this.renderFilesList(files, query);
  }

  renderFilesList(files, query = '') {
    const listEl = document.getElementById('ingredients-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!files || files.length === 0) {
      listEl.innerHTML = '<li class="empty-hint">No source files available for this selection.</li>';
      return;
    }

    const filtered = query.trim()
      ? files.filter(f => f.path.toLowerCase().includes(query.toLowerCase()) || f.filename.toLowerCase().includes(query.toLowerCase()))
      : files;

    if (filtered.length === 0) {
      listEl.innerHTML = `<li class="empty-hint">No files matching "${query}"</li>`;
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
      more.innerHTML = `<em>...and ${filtered.length - 35} more files</em>`;
      listEl.appendChild(more);
    }
  }

  setupEventListeners() {
    // 1. Analyze input & button (manual entry)
    const input = document.getElementById('repo-input');
    const btnBake = document.getElementById('btn-bake');

    const handleAnalyze = () => {
      const val = input.value.trim();
      if (val) this.analyzeRepository(val);
    };

    btnBake.addEventListener('click', handleAnalyze);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAnalyze();
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

    // 3. Spin The Donut Wheel button
    document.getElementById('btn-spin').addEventListener('click', () => {
      this.pieEngine.angularVelocity = 0.28 + Math.random() * 0.25;
    });

    // 4. View Mode Selector (Languages / Folders / Files)
    document.querySelectorAll('.mode-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMode = btn.getAttribute('data-mode');
        this.applyCurrentModeSlices();
      });
    });

    // 5. Highlight Slice button
    document.getElementById('btn-eat-slice').addEventListener('click', () => {
      if (this.pieEngine && this.selectedSlice) {
        this.pieEngine.takeBite(this.selectedSlice);
      }
    });

    // 6. Copy Markdown Badge button
    document.getElementById('btn-copy-badge').addEventListener('click', () => {
      const repoSlug = this.currentData ? this.currentData.repoSlug : 'sadmandied/CoworkingSpaceBookingSystem';
      const badgeMarkdown = `[![Visualized with GitPie](https://img.shields.io/badge/Visualized%20with-GitPie-1a1614?style=for-the-badge)](https://sadmandied.github.io/git-pie/)`;
      navigator.clipboard.writeText(badgeMarkdown).then(() => {
        this.showToast('Markdown Badge Copied to Clipboard!');
      });
    });

    // 7. File search filter
    const searchInput = document.getElementById('ingredient-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        if (this.selectedSlice && this.selectedSlice.files) {
          this.renderFilesList(this.selectedSlice.files, e.target.value);
        }
      });
    }

    // 8. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'Escape') {
        if (!menuDropdown.classList.contains('hidden')) {
          menuDropdown.classList.add('hidden');
          btnDropdown.setAttribute('aria-expanded', 'false');
          btnDropdown.focus();
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.pieEngine.angularVelocity = 0.32 + Math.random() * 0.25;
      } else if (e.key === 'ArrowRight') {
        this.pieEngine.cycleSlice(1);
      } else if (e.key === 'ArrowLeft') {
        this.pieEngine.cycleSlice(-1);
      } else if (e.key === '1') {
        document.querySelector('.mode-pill[data-mode="languages"]')?.click();
      } else if (e.key === '2') {
        document.querySelector('.mode-pill[data-mode="folders"]')?.click();
      } else if (e.key === '3') {
        document.querySelector('.mode-pill[data-mode="files"]')?.click();
      } else if (e.key === 'b' || e.key === 'B' || e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        document.getElementById('btn-eat-slice')?.click();
      }
    });
  }

  // Alias for backwards compatibility
  showBakingOverlay(show, message = '') {
    return this.showLoadingOverlay(show, message);
  }

  showLoadingOverlay(show, message = '') {
    const overlay = document.getElementById('baking-overlay');
    const statusText = document.getElementById('baking-status');
    if (!overlay) return;

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
    if (!toast || !textEl) return;
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
