/**
 * GitCity — Main Application Orchestrator
 * Studio lighting, hover telemetry, camera navigation, and timeline playback.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gitHubService } from './github_api.js';
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

    // Interaction & Raycasting
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredBuilding = null;
    this.selectedBuilding = null;
    this.highlightBox = null;

    // Tooltip Element
    this.tooltip = document.getElementById('hover-tooltip');

    // Smooth Camera Targets
    this.targetCameraPos = null;
    this.targetLookAt = null;

    // Cinematic Tour
    this.isCinematic = false;
    this.cinematicAngle = 0;

    // Timeline
    this.currentRepoData = null;
    this.isPlayingTimeline = false;
    this.timelineProgress = 1.0;
    this.timelineSpeed = 1.0;

    this.clock = new THREE.Clock();
  }

  async init() {
    this.setupScene();
    this.setupStudioLighting();
    this.setupSelectionIndicator();
    this.setupEventListeners();

    this.cityBuilder = new CityBuilder(this.scene);

    const defaultRepo = 'sadmandied/CoworkingSpaceBookingSystem';
    await this.loadRepository(defaultRepo);

    this.animate();
  }

  setupScene() {
    // 1. Scene with subtle studio depth fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090a0f);
    this.scene.fog = new THREE.FogExp2(0x090a0f, 0.0025);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      2000
    );
    this.camera.position.set(150, 130, 190);

    // 3. Renderer with high-end tone mapping & soft shadows
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls (Weighted smooth damping)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 650;
    this.controls.target.set(0, 15, 0);
  }

  setupStudioLighting() {
    // Soft architectural ambient fill
    const hemiLight = new THREE.HemisphereLight(0x2d3748, 0x090a0f, 0.9);
    this.scene.add(hemiLight);

    // Key architectural sunlight
    const sunLight = new THREE.DirectionalLight(0xfff6ea, 1.4);
    sunLight.position.set(160, 220, 140);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 20;
    sunLight.shadow.camera.far = 700;
    const d = 220;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0003;
    this.scene.add(sunLight);

    // Cool blue-gray rim fill light
    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.4);
    rimLight.position.set(-160, 120, -140);
    this.scene.add(rimLight);
  }

  setupSelectionIndicator() {
    // Subtle crisp bounding wireframe for active selection
    const geo = new THREE.BoxGeometry(6.6, 1, 6.6);
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });
    this.highlightBox = new THREE.LineSegments(edges, mat);
    this.highlightBox.visible = false;
    this.scene.add(this.highlightBox);
  }

  async loadRepository(repoSlug) {
    this.showLoading(true, `Querying tree for ${repoSlug}...`);
    this.closeInspector();

    try {
      this.setProgress(30);
      const data = await gitHubService.fetchRepository(repoSlug);
      this.setProgress(70);

      this.currentRepoData = data;
      this.cityBuilder.buildFromRepository(data);
      this.setProgress(95);

      this.updateHudStats(data);
      this.initTimeline(data);

      setTimeout(() => {
        this.setProgress(100);
        this.showLoading(false);
        this.resetCameraOverview();
      }, 250);

    } catch (err) {
      console.error('Failed to load repo:', err);
      alert(`Could not load repository: ${err.message}. If you hit rate limits, enter a GitHub token via API Settings or select a preset.`);
      this.showLoading(false);
    }
  }

  updateHudStats(data) {
    document.getElementById('stat-skyscrapers').textContent = data.totalFiles.toLocaleString();
    document.getElementById('stat-districts').textContent = data.districts.length.toLocaleString();
    document.getElementById('stat-dominant').textContent = data.dominantLanguage;
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

  onPointerMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Position hover tooltip
    this.tooltip.style.left = `${event.clientX}px`;
    this.tooltip.style.top = `${event.clientY}px`;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cityBuilder.buildings);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (this.hoveredBuilding !== hit) {
        this.clearHover();
        this.hoveredBuilding = hit;
        this.applyHover(hit);
      }
      this.showTooltip(hit.userData);
      document.body.style.cursor = 'pointer';
    } else {
      if (this.hoveredBuilding) {
        this.clearHover();
        this.hoveredBuilding = null;
      }
      this.hideTooltip();
      document.body.style.cursor = 'default';
    }
  }

  applyHover(mesh) {
    // Elevate slightly and brighten top crown emissive
    mesh.position.y = 2.4;
    const crown = mesh.material[2];
    if (crown && crown.emissiveIntensity !== undefined) {
      crown.emissiveIntensity = 0.5;
    }
  }

  clearHover() {
    if (this.hoveredBuilding) {
      this.hoveredBuilding.position.y = 1.8;
      const crown = this.hoveredBuilding.material[2];
      if (crown && crown.emissiveIntensity !== undefined) {
        crown.emissiveIntensity = 0.18;
      }
    }
  }

  showTooltip(d) {
    document.getElementById('tooltip-filename').textContent = d.filename;
    document.getElementById('tooltip-lang').textContent = d.language.name;
    document.getElementById('tooltip-lang').style.color = d.language.color;
    document.getElementById('tooltip-loc').textContent = `~${d.loc} LOC`;
    this.tooltip.classList.remove('hidden');
  }

  hideTooltip() {
    this.tooltip.classList.add('hidden');
  }

  onPointerDown(event) {
    if (event.button !== 0) return;

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
    const h = d.targetHeight;

    // Highlight wireframe
    this.highlightBox.scale.set(1, h, 1);
    this.highlightBox.position.set(mesh.position.x, 1.8 + h / 2, mesh.position.z);
    this.highlightBox.visible = true;

    cityAudio.playSelect();

    // Populate clean inspector
    document.getElementById('inspect-filename').textContent = d.filename;
    document.getElementById('inspect-path').textContent = d.path;
    document.getElementById('inspect-indicator').style.backgroundColor = d.language.color;
    document.getElementById('inspect-lang').textContent = d.language.name;
    document.getElementById('inspect-size').textContent = `${(d.size / 1024).toFixed(1)} KB`;
    document.getElementById('inspect-loc').textContent = d.loc.toLocaleString();
    document.getElementById('inspect-district').textContent = d.district;
    document.getElementById('inspect-github-link').href = d.url;

    document.getElementById('inspector-drawer').classList.remove('hidden');

    // Smooth camera framing glide
    const camOffset = new THREE.Vector3(26, h * 0.6 + 18, 30);
    this.targetCameraPos = mesh.position.clone().add(camOffset);
    this.targetLookAt = new THREE.Vector3(mesh.position.x, h * 0.45, mesh.position.z);
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
    this.targetCameraPos = new THREE.Vector3(150, 130, 190);
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

  toggleTimelinePlayback() {
    this.isPlayingTimeline = !this.isPlayingTimeline;
    const icon = document.getElementById('icon-play');
    if (this.isPlayingTimeline) {
      icon.innerHTML = '<rect x="6" y="4" width="3" height="16"></rect><rect x="15" y="4" width="3" height="16"></rect>';
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

    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));

    // Search input
    const input = document.getElementById('repo-input');
    const btnBuild = document.getElementById('btn-build');
    const doBuild = () => {
      const val = input.value.trim();
      if (val) {
        document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        this.loadRepository(val);
      }
    };

    btnBuild.addEventListener('click', doBuild);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doBuild();
    });

    // Preset Chips
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const repo = chip.getAttribute('data-repo');
        input.value = repo;
        this.loadRepository(repo);
      });
    });

    // Camera actions
    document.getElementById('btn-cinematic').addEventListener('click', () => this.toggleCinematicTour());
    document.getElementById('btn-reset-cam').addEventListener('click', () => this.resetCameraOverview());
    document.getElementById('btn-close-inspector').addEventListener('click', () => this.closeInspector());

    // Audio
    const btnAudio = document.getElementById('btn-audio');
    btnAudio.addEventListener('click', () => {
      const active = cityAudio.toggle();
      btnAudio.classList.toggle('active', active);
    });

    // Timeline Scrubber
    const slider = document.getElementById('timeline-slider');
    slider.addEventListener('input', (e) => {
      this.timelineProgress = parseFloat(e.target.value) / 100;
      this.cityBuilder.setEvolutionProgress(this.timelineProgress);
      this.updateTimelineMeta();
      cityAudio.playTimelineStep();
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
    });
    document.getElementById('btn-clear-token').addEventListener('click', () => {
      gitHubService.setToken('');
      tokenInput.value = '';
      tokenModal.classList.add('hidden');
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

    // Timeline playback
    if (this.isPlayingTimeline) {
      this.timelineProgress += delta * 0.1 * this.timelineSpeed;
      if (this.timelineProgress >= 1.0) {
        this.timelineProgress = 1.0;
        this.toggleTimelinePlayback();
      }
      document.getElementById('timeline-slider').value = Math.round(this.timelineProgress * 100);
      this.cityBuilder.setEvolutionProgress(this.timelineProgress);
      this.updateTimelineMeta();
    }

    // Camera Gliding
    if (this.targetCameraPos && this.targetLookAt) {
      this.camera.position.lerp(this.targetCameraPos, 0.05);
      this.controls.target.lerp(this.targetLookAt, 0.05);

      if (this.camera.position.distanceTo(this.targetCameraPos) < 0.6) {
        this.targetCameraPos = null;
        this.targetLookAt = null;
      }
    } else if (this.isCinematic) {
      this.cinematicAngle += delta * 0.12;
      const radius = 210;
      const altitude = 110 + Math.sin(this.cinematicAngle * 0.4) * 35;
      this.camera.position.x = Math.sin(this.cinematicAngle) * radius;
      this.camera.position.z = Math.cos(this.cinematicAngle) * radius;
      this.camera.position.y = altitude;
      this.controls.target.set(0, 15, 0);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
