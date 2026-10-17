/**
 * GitCity 3D — Procedural City & District Layout Engine
 * Generates 3D cyberpunk skyscrapers, neon roads, and district zones.
 */

import * as THREE from 'three';

export class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.cityGroup = new THREE.Group();
    this.scene.add(this.cityGroup);

    this.buildings = [];      // Array of building meshes
    this.districtMeshes = []; // Array of district platforms
    this.trafficSystems = []; // Particle systems for moving data packets
    this.beacons = [];        // Antenna lights to blink

    // Procedural window texture cache
    this.windowTexture = this.createProceduralWindowTexture();
  }

  clearCity() {
    // Dispose of previous city meshes and materials
    while (this.cityGroup.children.length > 0) {
      const obj = this.cityGroup.children[0];
      this.cityGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
    this.buildings = [];
    this.districtMeshes = [];
    this.trafficSystems = [];
    this.beacons = [];
  }

  // Generate dynamic canvas texture of cyberpunk office skyscraper windows
  createProceduralWindowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cols = 8;
    const rows = 18;
    const padX = 4;
    const padY = 4;
    const cellW = (canvas.width - padX * (cols + 1)) / cols;
    const cellH = (canvas.height - padY * (rows + 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * (cellW + padX);
        const y = padY + r * (cellH + padY);

        // Randomly illuminate windows
        const rand = Math.random();
        if (rand > 0.45) {
          ctx.fillStyle = rand > 0.85 ? '#00f3ff' : (rand > 0.7 ? '#ffe600' : '#496084');
          ctx.fillRect(x, y, cellW, cellH);
        } else {
          ctx.fillStyle = '#141c2c';
          ctx.fillRect(x, y, cellW, cellH);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 2);
    return texture;
  }

  buildFromRepository(repoData) {
    this.clearCity();

    // 1. Group files by top-level or immediate district
    const districtsMap = new Map();
    repoData.files.forEach(file => {
      // Pick first 1-2 directory segments as district
      const parts = file.path.split('/');
      let distName = 'Root Corridor';
      if (parts.length > 2) {
        distName = `${parts[0]}/${parts[1]}`;
      } else if (parts.length === 2) {
        distName = parts[0];
      }

      if (!districtsMap.has(distName)) {
        districtsMap.set(distName, []);
      }
      districtsMap.get(distName).push(file);
    });

    const numDistricts = districtsMap.size;
    const districtList = Array.from(districtsMap.entries());

    // 2. Arrange districts on a spiral or ring grid
    const districtSpacing = 95;
    const gridCols = Math.ceil(Math.sqrt(numDistricts));

    districtList.forEach(([distName, files], index) => {
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      const centerX = (col - gridCols / 2 + 0.5) * districtSpacing;
      const centerZ = (row - gridCols / 2 + 0.5) * districtSpacing;

      this.buildDistrict(distName, files, centerX, centerZ);
    });

    // 3. Create Cyberpunk Roads & Data Packet Traffic between districts
    this.createInterDistrictRoads(districtList, gridCols, districtSpacing);

    // 4. City Ground Grid with Holo-glow
    this.createCityGround();

    return this.buildings;
  }

  buildDistrict(distName, files, centerX, centerZ) {
    const numFiles = files.length;
    const bCols = Math.ceil(Math.sqrt(numFiles));
    const bSpacing = 11;
    const platformW = Math.max(48, bCols * bSpacing + 16);
    const platformD = Math.max(48, Math.ceil(numFiles / bCols) * bSpacing + 16);

    // District Elevated Cyber Platform
    const platGeo = new THREE.BoxGeometry(platformW, 2.5, platformD);
    const platMat = new THREE.MeshStandardMaterial({
      color: 0x090c14,
      roughness: 0.6,
      metalness: 0.8
    });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.set(centerX, 1.25, centerZ);
    platform.receiveShadow = true;
    this.cityGroup.add(platform);

    // Glowing Neon District Boundary Line
    const edgesGeo = new THREE.EdgesGeometry(platGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x00f3ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.55
    });
    const border = new THREE.LineSegments(edgesGeo, edgesMat);
    border.position.copy(platform.position);
    this.cityGroup.add(border);

    // Place skyscrapers inside this district
    files.forEach((file, fIdx) => {
      const bCol = fIdx % bCols;
      const bRow = Math.floor(fIdx / bCols);

      const offsetX = (bCol - bCols / 2 + 0.5) * bSpacing;
      const offsetZ = (bRow - Math.ceil(numFiles / bCols) / 2 + 0.5) * bSpacing;

      const posX = centerX + offsetX;
      const posZ = centerZ + offsetZ;

      this.createSkyscraper(file, posX, posZ, fIdx);
    });
  }

  createSkyscraper(file, x, z, index) {
    // Map LOC / Size to height (min 8 units, max 130 units)
    const baseHeight = Math.min(130, Math.max(8, Math.log10(file.size + 10) * 22));
    const width = 6.5;
    const depth = 6.5;

    // Building Geometry
    const bGeo = new THREE.BoxGeometry(width, baseHeight, depth);
    // Translate origin to base for easy scaling in time-machine
    bGeo.translate(0, baseHeight / 2, 0);

    const langColor = new THREE.Color(file.language.color);
    const emissiveColor = new THREE.Color(file.language.emissive);

    // Multi-material: sides have window textures, top is solid dark roof
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x1a2130,
      map: this.windowTexture,
      roughness: 0.35,
      metalness: 0.75,
      emissive: emissiveColor,
      emissiveIntensity: 0.28
    });

    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x0a0e17,
      roughness: 0.8,
      metalness: 0.5
    });

    const materials = [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat];
    const buildingMesh = new THREE.Mesh(bGeo, materials);
    buildingMesh.position.set(x, 2.5, z);
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;

    // Save metadata for raycasting & timeline
    buildingMesh.userData = {
      ...file,
      targetHeight: baseHeight,
      currentProgress: 1.0,
      initialY: 2.5
    };

    // Neon Edge Outline
    const edgeGeo = new THREE.EdgesGeometry(bGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: langColor,
      transparent: true,
      opacity: 0.85
    });
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    buildingMesh.add(edgeLines);

    // Rooftop Antenna / Beacons for tall skyscrapers
    if (baseHeight > 35) {
      const antennaHeight = Math.min(14, baseHeight * 0.15);
      const antGeo = new THREE.CylinderGeometry(0.12, 0.25, antennaHeight, 6);
      antGeo.translate(0, antennaHeight / 2, 0);
      const antMat = new THREE.MeshBasicMaterial({ color: 0x556677 });
      const antenna = new THREE.Mesh(antGeo, antMat);
      antenna.position.set(0, baseHeight, 0);
      buildingMesh.add(antenna);

      // Blinking Beacon sphere on top
      const beaconGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xff0055 : 0x00f3ff
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, baseHeight + antennaHeight, 0);
      buildingMesh.add(beacon);

      this.beacons.push({
        mesh: beacon,
        speed: 1.5 + Math.random() * 2.5,
        offset: Math.random() * Math.PI * 2
      });
    }

    this.cityGroup.add(buildingMesh);
    this.buildings.push(buildingMesh);
  }

  createInterDistrictRoads(districtList, gridCols, spacing) {
    // Flowing highway data packets
    const curvePoints = [];
    for (let i = 0; i < districtList.length; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const x = (col - gridCols / 2 + 0.5) * spacing;
      const z = (row - gridCols / 2 + 0.5) * spacing;
      curvePoints.push(new THREE.Vector3(x, 1.8, z));
    }

    if (curvePoints.length > 1) {
      const particleCount = 180;
      const pGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const pt = curvePoints[i % curvePoints.length];
        positions[i * 3] = pt.x + (Math.random() - 0.5) * 40;
        positions[i * 3 + 1] = 1.8 + Math.random() * 2;
        positions[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 40;

        colors[i * 3] = 0.0;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 1.0;
      }

      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const pMat = new THREE.PointsMaterial({
        size: 1.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });

      const particles = new THREE.Points(pGeo, pMat);
      this.cityGroup.add(particles);
      this.trafficSystems.push(particles);
    }
  }

  createCityGround() {
    // Wide holographic floor grid
    const size = 600;
    const divisions = 60;
    const grid = new THREE.GridHelper(size, divisions, 0x00f3ff, 0x141a29);
    grid.position.y = 0;
    this.cityGroup.add(grid);

    // Deep dark ground plane to absorb lighting underneath
    const planeGeo = new THREE.PlaneGeometry(1200, 1200);
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x030407,
      roughness: 0.9,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(planeGeo, planeMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.cityGroup.add(ground);
  }

  // Animate blinking beacons & traffic particles
  update(delta, time) {
    // Blink antenna beacons
    for (const b of this.beacons) {
      const intensity = (Math.sin(time * b.speed + b.offset) + 1) / 2;
      b.mesh.visible = intensity > 0.35;
    }

    // Move traffic data particles
    for (const traffic of this.trafficSystems) {
      const positions = traffic.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += Math.sin(time * 0.8 + i) * 0.08;
        positions[i + 2] += Math.cos(time * 0.8 + i) * 0.08;
      }
      traffic.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Time-machine timeline scrubber updater:
  // fraction: 0.0 (oldest/empty) to 1.0 (full present day metropolis)
  setEvolutionProgress(fraction) {
    const total = this.buildings.length;
    const activeCount = Math.floor(fraction * total);

    this.buildings.forEach((b, idx) => {
      if (idx <= activeCount) {
        b.visible = true;
        // Animated growth factor for recent buildings
        const growth = Math.min(1.0, (activeCount - idx + 1) * 0.4);
        b.scale.set(1, growth, 1);
      } else {
        b.visible = false;
      }
    });
  }
}
