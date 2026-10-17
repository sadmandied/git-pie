/**
 * GitCity — Architectural Codebase Layout Engine
 * Monolithic architectural towers, precision district plinths, and subtle typography.
 */

import * as THREE from 'three';

export class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.cityGroup = new THREE.Group();
    this.scene.add(this.cityGroup);

    this.buildings = [];
    this.districtLabels = [];
  }

  clearCity() {
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
    this.districtLabels = [];
  }

  buildFromRepository(repoData) {
    this.clearCity();

    // Group files by district
    const districtsMap = new Map();
    repoData.files.forEach(file => {
      const parts = file.path.split('/');
      let distName = 'root';
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

    const districtList = Array.from(districtsMap.entries());
    const numDistricts = districtList.length;

    // Arrange districts in a clean modern campus grid
    const spacing = 88;
    const gridCols = Math.ceil(Math.sqrt(numDistricts));

    districtList.forEach(([distName, files], index) => {
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      const centerX = (col - gridCols / 2 + 0.5) * spacing;
      const centerZ = (row - gridCols / 2 + 0.5) * spacing;

      this.buildDistrict(distName, files, centerX, centerZ);
    });

    // Create precision architectural ground plane
    this.createGround();

    return this.buildings;
  }

  buildDistrict(distName, files, centerX, centerZ) {
    const numFiles = files.length;
    const bCols = Math.ceil(Math.sqrt(numFiles));
    const bSpacing = 10;
    const platformW = Math.max(42, bCols * bSpacing + 14);
    const platformD = Math.max(42, Math.ceil(numFiles / bCols) * bSpacing + 14);

    // District Plinth (Milled dark architectural slab)
    const slabGeo = new THREE.BoxGeometry(platformW, 1.8, platformD);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x12151e,
      roughness: 0.85,
      metalness: 0.2
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(centerX, 0.9, centerZ);
    slab.receiveShadow = true;
    this.cityGroup.add(slab);

    // Subtle edge outline for plinth
    const slabEdges = new THREE.EdgesGeometry(slabGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x273042,
      transparent: true,
      opacity: 0.6
    });
    const border = new THREE.LineSegments(slabEdges, edgeMat);
    border.position.copy(slab.position);
    this.cityGroup.add(border);

    // District Monospace Name Billboard
    this.createDistrictLabel(distName, centerX - platformW / 2 + 4, centerZ - platformD / 2 + 3);

    // Build skyscrapers
    files.forEach((file, fIdx) => {
      const bCol = fIdx % bCols;
      const bRow = Math.floor(fIdx / bCols);

      const offsetX = (bCol - bCols / 2 + 0.5) * bSpacing;
      const offsetZ = (bRow - Math.ceil(numFiles / bCols) / 2 + 0.5) * bSpacing;

      const posX = centerX + offsetX;
      const posZ = centerZ + offsetZ;

      this.createSkyscraper(file, posX, posZ);
    });
  }

  createSkyscraper(file, x, z) {
    // Proportional architectural height
    const baseHeight = Math.min(120, Math.max(6, Math.log10(file.size + 10) * 20));
    const width = 6.0;
    const depth = 6.0;

    const bGeo = new THREE.BoxGeometry(width, baseHeight, depth);
    bGeo.translate(0, baseHeight / 2, 0);

    const langColor = new THREE.Color(file.language.color || '#3b82f6');

    // Architectural Matte Monolith Material (Dark Charcoal body)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x181c26,
      roughness: 0.45,
      metalness: 0.65
    });

    // Crown roof material with subtle language color tint
    const crownMat = new THREE.MeshStandardMaterial({
      color: langColor,
      roughness: 0.25,
      metalness: 0.8,
      emissive: langColor,
      emissiveIntensity: 0.18
    });

    // Materials: Sides are dark architectural matte; top cap is language-tinted
    const materials = [bodyMat, bodyMat, crownMat, bodyMat, bodyMat, bodyMat];
    const buildingMesh = new THREE.Mesh(bGeo, materials);
    buildingMesh.position.set(x, 1.8, z);
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;

    // Fine wireframe edges (subtle architectural outline)
    const edgeGeo = new THREE.EdgesGeometry(bGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x2e384d,
      transparent: true,
      opacity: 0.45
    });
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    buildingMesh.add(edgeLines);

    // Save metadata
    buildingMesh.userData = {
      ...file,
      targetHeight: baseHeight,
      baseColor: langColor,
      defaultEmissive: 0.18,
      materials: materials
    };

    this.cityGroup.add(buildingMesh);
    this.buildings.push(buildingMesh);
  }

  createDistrictLabel(name, x, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(name, 4, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, 2.8, z);
    sprite.scale.set(16, 4, 1);

    this.cityGroup.add(sprite);
    this.districtLabels.push(sprite);
  }

  createGround() {
    // Subtle architectural grid floor
    const size = 700;
    const divisions = 70;
    const grid = new THREE.GridHelper(size, divisions, 0x1f2636, 0x131722);
    grid.position.y = 0;
    this.cityGroup.add(grid);

    // Infinite dark absorbing floor
    const floorGeo = new THREE.PlaneGeometry(1600, 1600);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x07080c,
      roughness: 0.95,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    this.cityGroup.add(floor);
  }

  setEvolutionProgress(fraction) {
    const total = this.buildings.length;
    const activeCount = Math.floor(fraction * total);

    this.buildings.forEach((b, idx) => {
      if (idx <= activeCount) {
        b.visible = true;
        const growth = Math.min(1.0, (activeCount - idx + 1) * 0.35);
        b.scale.set(1, Math.max(0.05, growth), 1);
      } else {
        b.visible = false;
      }
    });
  }
}
