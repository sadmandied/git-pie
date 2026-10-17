/**
 * GitCity 3D — Main Application Orchestrator
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gitHubService, LANGUAGE_PALETTE } from './github_api.js';
import { CityBuilder } from './city_builder.js';
import { cityAudio } from './audio.js';

class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.cityBuilder = null;

    // Raycasting & Interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedBuilding = null;
    this.highlightBox = null;

    // Camera target for smooth gliding
    this.targetCameraPos = null;
    this.targetLookAt = null;

    // Cinematic Drone Tour Mode
    this.isCinematic = false;
    this.cinematicAngle = 0;

    // Timeline / Time Machine
    this.currentRepoData = null;
    this.isPlayingTimeline = false;
    this.timelineProgress = 1.0;
    this.timelineSpeed = 1.0;
    this.timelineAnimId = null;

    this.clock = new THREE.Clock();
  }

  async init() {
    this.setupThreeScene();
    this.setupLighting();
    this.setupSelectionHighlight();
    this.setupEventListeners();

    this.cityBuilder = new CityBuilder(this.scene);

    // Initial load with showcase repository
    const defaultRepo = 'sadmandied/CoworkingSpaceBookingSystem';
    await this.loadRepository(defaultRepo);

    // Start render loop
    this.animate();
  }

  setupThreeScene() {
    // 1. Scene with atmospheric cyberpunk fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06070a);
    this.scene.fog = new THREE.FogExp2(0x06070a, 0.0022);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      1,
      2500
    );
    this.camera.position.set(160, 140, 210);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't go below horizon floor
    this.controls.minDistance = 20;
    this.controls.maxDistance = 800;
    this.controls.target.set(0, 20, 0);
  }

  setupLighting() {
    // Ambient cyberpunk glow
    const ambient = new THREE.AmbientLight(0x18243b, 1.2);
    this.scene.add(ambient);

    // Directional Key Light with shadows
    const dirLight = new THREE.DirectionalLight(0x00f3ff, 1.4);
    dirLight.position.set(180, 250, 150);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 800;
    const d = 250;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);

    // Secondary Neon Pink rim light
    const pinkRim = new THREE.DirectionalLight(0xff007f, 1.0);
    pinkRim.position.set(-180, 160, -140);
    this.scene.add(pinkRim);
  }

  setupSelectionHighlight() {
    const geo = new THREE.BoxGeometry(7.2, 1, 7.2);
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({
      color: 0x00f3ff,
      linewidth: 3,
      transparent: true,
      opacity: 0.95
    });
    this.highlightBox = new THREE.LineSegments(edges, mat);
    this.highlightBox.visible = false;
    this.scene.add(this.highlightBox);
  }

  async loadRepository(repoSlug) {
    this.showLoading(true, `Connecting to GitHub API for ${repoSlug}...`);
    this.closeInspector();

    try {
      this.setProgress(30);
      const data = await gitHubService.fetchRepository(repoSlug);
      this.setProgress(70);

      this.currentRepoData = data;
      this.cityBuilder.buildFromRepository(data);
      this.setProgress(95);

      this.updateHudStats(data);
      this.updateLegend(data);
      this.initTimeline(data);

      cityAudio.playConstructPulse();

      setTimeout(() => {
        this.setProgress(100);
        this.showLoading(false);
        this.resetCameraOverview();
      }, 350);

    } catch (err) {
      console.error('Error loading repository:', err);
      alert(`Could not build city: ${err.message}. If you have reached GitHub's 60 req/hr rate limit, click the Settings icon to add a token or select a preset.`);
      this.showLoading(false);
    }
  }

  updateHudStats(data) {
    document.getElementById('stat-skyscrapers').textContent = data.totalFiles.toLocaleString();
    document.getElementById('stat-districts').textContent = data.districts.length.toLocaleString();
    document.getElementById('stat-loc').textContent = data.totalSizeKB.toLocaleString();
    document.getElementById('stat-dominant').textContent = data.dominantLanguage;
    document.getElementById('stat-current-repo').textContent = data.repoSlug;
  }

  updateLegend(data) {
    const legendEl = document.getElementById('legend-items');
    legendEl.innerHTML = '';

    const sortedLangs = Object.entries(data.languageDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Top 8 languages

    for (const [langName, count] of sortedLangs) {
      const palette = Object.values(LANGUAGE_PALETTE).find(p => p.name === langName) || { color: '#64748b' };
      const item = document.createElement('div');
      item.className = 'legend-pill';
      item.innerHTML = `
        <span class="legend-color-dot" style="background-color: ${palette.color}; color: ${palette.color};"></span>
        <span>${langName} (${count})</span>
      `;
      legendEl.appendChild(item);
    }
  }

  initTimeline(data) {
    const slider = document.getElementById('timeline-slider');
    slider.value = 100;
    this.timelineProgress = 1.0;
    this.cityBuilder.setEvolutionProgress(1.0);

    const commits = data.commits || [];
    if (commits.length > 0) {
      const latest = commits[commits.length - 1];
      document.getElementById('timeline-commit-date').textContent = latest.date.split('T')[0];
      document.getElementById('timeline-commit-msg').textContent = `${latest.sha}: ${latest.message}`;
    }
  }

  // Handle building click
  onPointerDown(event) {
    // Only left click
    if (event.button !== 0) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cityBuilder.buildings);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      this.selectBuilding(hit);
    }
  }

  selectBuilding(mesh) {
    this.selectedBuilding = mesh;
    const d = mesh.userData;

    // Highlight Box
    const h = d.targetHeight;
    this.highlightBox.scale.set(1, h, 1);
    this.highlightBox.position.set(mesh.position.x, mesh.position.y + h / 2, mesh.position.z);
    this.highlightBox.visible = true;

    // Audio chirp
    cityAudio.playBuildingSelect();

    // Populate Inspector UI
    const ext = d.filename.split('.').pop().toUpperCase();
    document.getElementById('inspect-icon').textContent = ext.substring(0, 3) || 'DOC';
    document.getElementById('inspect-filename').textContent = d.filename;
    document.getElementById('inspect-path').textContent = d.path;
    document.getElementById('inspect-lang').textContent = d.language.name;
    document.getElementById('inspect-lang').style.color = d.language.color;
    document.getElementById('inspect-size').textContent = `${(d.size / 1024).toFixed(1)} KB`;
    document.getElementById('inspect-loc').textContent = `~${d.loc.toLocaleString()} LOC`;
    document.getElementById('inspect-height').textContent = `${Math.round(h)}m`;
    document.getElementById('inspect-district').textContent = d.district;
    document.getElementById('inspect-github-link').href = d.url;

    document.getElementById('inspector-drawer').classList.remove('hidden');

    // Smooth camera glide to inspect the skyscraper
    const camOffset = new THREE.Vector3(25, h * 0.7 + 15, 30);
    this.targetCameraPos = mesh.position.clone().add(camOffset);
    this.targetLookAt = new THREE.Vector3(mesh.position.x, h * 0.5, mesh.position.z);
    this.isCinematic = false;
    document.getElementById('btn-cinematic').classList.remove('active');
  }

  closeInspector() {
    this.selectedBuilding = null;
    this.highlightBox.visible = false;
    document.getElementById('inspector-drawer').classList.add('hidden');
  }

  resetCameraOverview() {
    this.closeInspector();
    this.targetCameraPos = new THREE.Vector3(160, 150, 220);
    this.targetLookAt = new THREE.Vector3(0, 15, 0);
    this.isCinematic = false;
    document.getElementById('btn-cinematic').classList.remove('active');
  }

  toggleCinematicTour() {
    this.isCinematic = !this.isCinematic;
    const btn = document.getElementById('btn-cinematic');
    if (this.isCinematic) {
      btn.classList.add('active');
      this.closeInspector();
    } else {
      btn.classList.remove('active');
    }
  }

  // Commit Time-Machine Playback
  toggleTimelinePlayback() {
    this.isPlayingTimeline = !this.isPlayingTimeline;
    const icon = document.getElementById('icon-play');
    if (this.isPlayingTimeline) {
      icon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
      if (this.timelineProgress >= 1.0) {
        this.timelineProgress = 0.05;
      }
    } else {
      icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));

    // Search & Build
    const input = document.getElementById('repo-input');
    const btnBuild = document.getElementById('btn-build');
    const doBuild = () => {
      const val = input.value.trim();
      if (val) this.loadRepository(val);
    };

    btnBuild.addEventListener('click', doBuild);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doBuild();
    });

    // Presets dropdown
    const btnPresets = document.getElementById('btn-presets');
    const menu = document.getElementById('presets-menu');
    btnPresets.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    });

    document.querySelectorAll('.preset-item').forEach(item => {
      item.addEventListener('click', () => {
        const repo = item.getAttribute('data-repo');
        input.value = repo;
        menu.classList.add('hidden');
        this.loadRepository(repo);
      });
    });

    document.addEventListener('click', () => menu.classList.add('hidden'));

    // Cinematic & Camera Controls
    document.getElementById('btn-cinematic').addEventListener('click', () => this.toggleCinematicTour());
    document.getElementById('btn-reset-cam').addEventListener('click', () => this.resetCameraOverview());
    document.getElementById('btn-close-inspector').addEventListener('click', () => this.closeInspector());

    // Audio
    const btnAudio = document.getElementById('btn-audio');
    btnAudio.addEventListener('click', () => {
      const active = cityAudio.toggle();
      btnAudio.classList.toggle('active', active);
    });

    // Timeline Scrubber & Speed
    const slider = document.getElementById('timeline-slider');
    slider.addEventListener('input', (e) => {
      this.timelineProgress = parseFloat(e.target.value) / 100;
      this.cityBuilder.setEvolutionProgress(this.timelineProgress);
      this.updateTimelineMeta();
    });

    document.getElementById('btn-timeline-play').addEventListener('click', () => this.toggleTimelinePlayback());

    document.querySelectorAll('.btn-speed').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.timelineSpeed = parseFloat(btn.getAttribute('data-speed'));
      });
    });

    // Token Modal
    const tokenModal = document.getElementById('token-modal');
    const tokenInput = document.getElementById('github-token-input');
    document.getElementById('btn-token').addEventListener('click', () => {
      tokenInput.value = gitHubService.token;
      tokenModal.classList.remove('hidden');
    });
    document.getElementById('btn-close-modal').addEventListener('click', () => {
      tokenModal.classList.add('hidden');
    });
    document.getElementById('btn-save-token').addEventListener('click', () => {
      gitHubService.setToken(tokenInput.value);
      tokenModal.classList.add('hidden');
      alert('GitHub token saved securely to browser LocalStorage.');
    });
    document.getElementById('btn-clear-token').addEventListener('click', () => {
      gitHubService.setToken('');
      tokenInput.value = '';
      tokenModal.classList.add('hidden');
      alert('Token removed.');
    });
  }

  updateTimelineMeta() {
    if (!this.currentRepoData || !this.currentRepoData.commits) return;
    const commits = this.currentRepoData.commits;
    const idx = Math.min(commits.length - 1, Math.floor(this.timelineProgress * commits.length));
    const c = commits[idx];
    if (c) {
      document.getElementById('timeline-commit-date').textContent = c.date.split('T')[0];
      document.getElementById('timeline-commit-msg').textContent = `${c.sha}: ${c.message}`;
    }
  }

  showLoading(show, statusText = '') {
    const overlay = document.getElementById('loading-overlay');
    const statusEl = document.getElementById('loading-status');
    if (show) {
      overlay.classList.remove('fade-out');
      if (statusText) statusEl.textContent = statusText;
    } else {
      overlay.classList.add('fade-out');
    }
  }

  setProgress(pct) {
    document.getElementById('progress-bar').style.width = `${pct}%`;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. Update City animations (beacons, data stream traffic)
    this.cityBuilder.update(delta, time);

    // 2. Timeline playback progression
    if (this.isPlayingTimeline) {
      this.timelineProgress += delta * 0.12 * this.timelineSpeed;
      if (this.timelineProgress >= 1.0) {
        this.timelineProgress = 1.0;
        this.toggleTimelinePlayback();
      }
      document.getElementById('timeline-slider').value = Math.round(this.timelineProgress * 100);
      this.cityBuilder.setEvolutionProgress(this.timelineProgress);
      this.updateTimelineMeta();
    }

    // 3. Smooth Camera Gliding
    if (this.targetCameraPos && this.targetLookAt) {
      this.camera.position.lerp(this.targetCameraPos, 0.045);
      this.controls.target.lerp(this.targetLookAt, 0.045);

      if (this.camera.position.distanceTo(this.targetCameraPos) < 1.0) {
        this.targetCameraPos = null;
        this.targetLookAt = null;
      }
    } else if (this.isCinematic) {
      // Cinematic Drone Tour Orbit
      this.cinematicAngle += delta * 0.15;
      const radius = 220;
      const altitude = 110 + Math.sin(this.cinematicAngle * 0.5) * 40;
      this.camera.position.x = Math.sin(this.cinematicAngle) * radius;
      this.camera.position.z = Math.cos(this.cinematicAngle) * radius;
      this.camera.position.y = altitude;
      this.controls.target.set(0, 18, 0);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate and start GitCity 3D
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
