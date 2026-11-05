import * as THREE from 'three';
import { HOTEL_AREAS } from './virtualHotelData';

export interface SceneObjects {
  scene: THREE.Scene;
  hotspotMeshes: { mesh: THREE.Mesh; areaId: string }[];
  updateAnimations: (delta: number, time: number) => void;
  cleanup: () => void;
}

export function buildHotelScene(): SceneObjects {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c10);
  scene.fog = new THREE.FogExp2(0x0a0c10, 0.018);

  const materialsToDispose: THREE.Material[] = [];
  const geometriesToDispose: THREE.BufferGeometry[] = [];

  const registerMat = <T extends THREE.Material>(mat: T): T => {
    materialsToDispose.push(mat);
    return mat;
  };

  const registerGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    geometriesToDispose.push(geo);
    return geo;
  };

  // -------------------------------------------------------------
  // 1. LIGHTING
  // -------------------------------------------------------------
  const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.9);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
  dirLight.position.set(10, 20, 15);
  scene.add(dirLight);

  // Interior Warm Accent Point Lights for each area
  const createRoomLight = (x: number, y: number, z: number, color: number, intensity: number, dist: number) => {
    const light = new THREE.PointLight(color, intensity, dist);
    light.position.set(x, y, z);
    scene.add(light);
    return light;
  };

  // Reception chandelier lights
  createRoomLight(0, 4.5, 0, 0xffd89b, 2.5, 18);
  createRoomLight(0, 3.0, -3, 0x38bdf8, 1.8, 12); // Backlit desk glow

  // Suite warm ambient lights
  createRoomLight(-18, 3.5, 0, 0xffe8d6, 2.0, 16);
  createRoomLight(-16, 2.0, -2, 0xf59e0b, 1.2, 8); // Bedside lamp

  // Restaurant atmospheric dining lights
  createRoomLight(18, 3.5, 0, 0xffd27d, 2.2, 16);
  createRoomLight(18, 2.5, -2, 0xff9900, 1.5, 10); // Table 1 pendant

  // Café warm barista lights
  createRoomLight(18, 3.5, 18, 0xffb703, 2.4, 16);
  createRoomLight(18, 2.2, 16, 0xec4899, 1.2, 8); // Pastry display glow

  // Kitchen bright cool task lighting
  createRoomLight(18, 4.0, -18, 0xe0f2fe, 3.0, 18);
  createRoomLight(18, 2.5, -20, 0x38bdf8, 1.5, 10); // KDS screen glow

  // Executive lounge quiet luxury lighting
  createRoomLight(-18, 3.5, 18, 0x93c5fd, 2.0, 16);
  createRoomLight(-18, 2.0, 16, 0x8b5cf6, 1.5, 10); // Boardroom glow

  // -------------------------------------------------------------
  // 2. SHARED REUSABLE MATERIALS
  // -------------------------------------------------------------
  const wallMaterial = registerMat(new THREE.MeshStandardMaterial({
    color: 0x181b22,
    roughness: 0.85,
    metalness: 0.1
  }));

  const ceilingMaterial = registerMat(new THREE.MeshStandardMaterial({
    color: 0x12141a,
    roughness: 0.9,
    metalness: 0.05
  }));

  const marbleFloorMat = registerMat(new THREE.MeshStandardMaterial({
    color: 0x222630,
    roughness: 0.25,
    metalness: 0.4
  }));

  const woodFloorMat = registerMat(new THREE.MeshStandardMaterial({
    color: 0x3a2518,
    roughness: 0.5,
    metalness: 0.15
  }));

  const tileFloorMat = registerMat(new THREE.MeshStandardMaterial({
    color: 0x1e222a,
    roughness: 0.4,
    metalness: 0.3
  }));

  const brassMat = registerMat(new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.2,
    metalness: 0.9
  }));

  const stainlessMat = registerMat(new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.15,
    metalness: 0.95
  }));

  const glassMat = registerMat(new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    transmission: 0.9,
    thickness: 0.5
  }));

  const darkWoodMat = registerMat(new THREE.MeshStandardMaterial({
    color: 0x2b1d14,
    roughness: 0.6,
    metalness: 0.1
  }));

  const fabricWhiteMat = registerMat(new THREE.MeshStandardMaterial({
    color: 0xf0f0f5,
    roughness: 0.95,
    metalness: 0.0
  }));

  const leatherNavyMat = registerMat(new THREE.MeshStandardMaterial({
    color: 0x102030,
    roughness: 0.6,
    metalness: 0.2
  }));

  // Helper: Create a Box Mesh
  const createBox = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, ry = 0) => {
    const geo = registerGeo(new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    if (ry) mesh.rotation.y = ry;
    scene.add(mesh);
    return mesh;
  };

  // -------------------------------------------------------------
  // 3. ARCHITECTURAL ROOMS & ENCLOSURES
  // -------------------------------------------------------------
  const roomWidth = 14;
  const roomDepth = 14;
  const wallHeight = 5;

  const buildRoomEnclosure = (cx: number, cz: number, floorMat: THREE.Material) => {
    // Floor
    const floorGeo = registerGeo(new THREE.PlaneGeometry(roomWidth, roomDepth));
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    scene.add(floor);

    // Ceiling
    const ceilGeo = registerGeo(new THREE.PlaneGeometry(roomWidth, roomDepth));
    const ceil = new THREE.Mesh(ceilGeo, ceilingMaterial);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, wallHeight, cz);
    scene.add(ceil);

    // North Wall
    createBox(roomWidth, wallHeight, 0.4, wallMaterial, cx, wallHeight / 2, cz - roomDepth / 2);
    // South Wall (with opening)
    createBox(roomWidth * 0.35, wallHeight, 0.4, wallMaterial, cx - roomWidth * 0.32, wallHeight / 2, cz + roomDepth / 2);
    createBox(roomWidth * 0.35, wallHeight, 0.4, wallMaterial, cx + roomWidth * 0.32, wallHeight / 2, cz + roomDepth / 2);
    // West Wall
    createBox(0.4, wallHeight, roomDepth, wallMaterial, cx - roomWidth / 2, wallHeight / 2, cz);
    // East Wall
    createBox(0.4, wallHeight, roomDepth, wallMaterial, cx + roomWidth / 2, wallHeight / 2, cz);
  };

  // Build the 6 interconnected rooms
  buildRoomEnclosure(0, 0, marbleFloorMat);    // 1. Reception (Center)
  buildRoomEnclosure(-18, 0, woodFloorMat);   // 2. Suite 304 (West)
  buildRoomEnclosure(18, 0, darkWoodMat);     // 3. Restaurant (East)
  buildRoomEnclosure(18, 18, tileFloorMat);   // 4. Café (South-East)
  buildRoomEnclosure(18, -18, stainlessMat);  // 5. Kitchen (North-East)
  buildRoomEnclosure(-18, 18, tileFloorMat);  // 6. Lounge (South-West)

  // -------------------------------------------------------------
  // 4. INTERCONNECTING CORRIDORS & ARCHWAYS
  // -------------------------------------------------------------
  // Corridor 1: Reception -> Suite (-9, 0, 0)
  createBox(4.5, 0.1, 4, woodFloorMat, -9, 0.05, 0);
  createBox(4.5, 4.5, 0.2, wallMaterial, -9, 2.25, 2);
  createBox(4.5, 4.5, 0.2, wallMaterial, -9, 2.25, -2);

  // Corridor 2: Reception -> Restaurant (9, 0, 0)
  createBox(4.5, 0.1, 4, marbleFloorMat, 9, 0.05, 0);
  createBox(4.5, 4.5, 0.2, wallMaterial, 9, 2.25, 2);
  createBox(4.5, 4.5, 0.2, wallMaterial, 9, 2.25, -2);

  // Corridor 3: Restaurant -> Kitchen (18, -9, 0)
  createBox(4, 0.1, 4.5, stainlessMat, 18, 0.05, -9);
  createBox(0.2, 4.5, 4.5, wallMaterial, 16, 2.25, -9);
  createBox(0.2, 4.5, 4.5, wallMaterial, 20, 2.25, -9);

  // Corridor 4: Restaurant -> Café (18, 9, 0)
  createBox(4, 0.1, 4.5, tileFloorMat, 18, 0.05, 9);
  createBox(0.2, 4.5, 4.5, wallMaterial, 16, 2.25, 9);
  createBox(0.2, 4.5, 4.5, wallMaterial, 20, 2.25, 9);

  // Corridor 5: Suite -> Lounge (-18, 9, 0)
  createBox(4, 0.1, 4.5, woodFloorMat, -18, 0.05, 9);
  createBox(0.2, 4.5, 4.5, wallMaterial, -16, 2.25, 9);
  createBox(0.2, 4.5, 4.5, wallMaterial, -20, 2.25, 9);

  // -------------------------------------------------------------
  // 5. DETAILED ROOM FURNITURE & ASSETS
  // -------------------------------------------------------------

  // --- ROOM 1: RECEPTION FURNITURE ---
  // Grand Curved Front Desk
  createBox(7.5, 1.15, 1.4, darkWoodMat, 0, 0.58, -2.5);
  createBox(7.6, 0.08, 1.5, brassMat, 0, 1.17, -2.5); // Brass Countertop
  createBox(5.0, 0.05, 0.3, registerMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8 })), 0, 0.9, -1.8); // Glowing desk accent

  // Wall Backlit Brand Sign
  const signGeo = registerGeo(new THREE.BoxGeometry(6, 1.2, 0.1));
  const signMat = registerMat(new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.35,
    roughness: 0.2
  }));
  const signMesh = new THREE.Mesh(signGeo, signMat);
  signMesh.position.set(0, 3.2, -6.8);
  scene.add(signMesh);

  // Reception Monitors & Terminals
  createBox(0.8, 0.5, 0.05, stainlessMat, -1.8, 1.45, -2.5);
  createBox(0.8, 0.5, 0.05, stainlessMat, 1.8, 1.45, -2.5);

  // Brass Luggage Trolley
  createBox(1.2, 0.1, 0.8, brassMat, -4.5, 0.1, 2.5);
  createBox(0.08, 1.8, 0.08, brassMat, -4.5, 0.9, 2.9);
  createBox(0.08, 1.8, 0.08, brassMat, -4.5, 0.9, 2.1);
  createBox(1.2, 0.08, 0.08, brassMat, -4.5, 1.8, 2.5);

  // Grand Reception Chandelier
  const chandelierGeo = registerGeo(new THREE.TorusGeometry(1.6, 0.04, 16, 50));
  const chandelier = new THREE.Mesh(chandelierGeo, brassMat);
  chandelier.rotation.x = Math.PI / 2;
  chandelier.position.set(0, 4.4, 0);
  scene.add(chandelier);

  // --- ROOM 2: DELUXE SUITE 304 FURNITURE ---
  // King-Size Bed Frame & Mattress
  createBox(3.2, 0.45, 3.6, darkWoodMat, -18, 0.23, -3.2); // Base
  createBox(3.0, 0.5, 3.4, fabricWhiteMat, -18, 0.65, -3.2); // Mattress & Linens
  createBox(3.4, 1.8, 0.2, registerMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })), -18, 1.1, -4.9); // Velvet Headboard
  createBox(1.1, 0.2, 0.6, fabricWhiteMat, -19.0, 0.95, -4.2); // Pillow 1
  createBox(1.1, 0.2, 0.6, fabricWhiteMat, -17.0, 0.95, -4.2); // Pillow 2

  // Nightstands & Bedside Lamps
  createBox(0.8, 0.7, 0.8, darkWoodMat, -20.5, 0.35, -4.2);
  createBox(0.8, 0.7, 0.8, darkWoodMat, -15.5, 0.35, -4.2);
  createBox(0.3, 0.5, 0.3, registerMat(new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xf59e0b, emissiveIntensity: 0.6 })), -20.5, 0.95, -4.2);
  createBox(0.3, 0.5, 0.3, registerMat(new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xf59e0b, emissiveIntensity: 0.6 })), -15.5, 0.95, -4.2);

  // Lounge Sofa & Coffee Table
  createBox(2.8, 0.7, 1.1, leatherNavyMat, -18, 0.35, 1.8);
  createBox(1.6, 0.4, 0.8, darkWoodMat, -18, 0.2, 3.2);

  // Wall Flat-Screen TV
  createBox(2.2, 1.2, 0.06, stainlessMat, -18, 2.5, 6.7);

  // --- ROOM 3: RESTAURANT FURNITURE ---
  // 4 Dining Tables with Tablecloths & Chairs
  const tablePositions = [
    { x: 15, z: -2 },
    { x: 21, z: -2 },
    { x: 15, z: 3 },
    { x: 21, z: 3 }
  ];

  tablePositions.forEach((tp) => {
    // Pedestal & Top
    createBox(0.2, 0.85, 0.2, darkWoodMat, tp.x, 0.43, tp.z);
    createBox(1.8, 0.08, 1.8, fabricWhiteMat, tp.x, 0.86, tp.z);

    // 2 Chairs per table
    createBox(0.6, 0.5, 0.6, leatherNavyMat, tp.x - 1.2, 0.25, tp.z);
    createBox(0.1, 0.9, 0.6, leatherNavyMat, tp.x - 1.45, 0.65, tp.z); // Backrest

    createBox(0.6, 0.5, 0.6, leatherNavyMat, tp.x + 1.2, 0.25, tp.z);
    createBox(0.1, 0.9, 0.6, leatherNavyMat, tp.x + 1.45, 0.65, tp.z);

    // Overhead Pendant Lamp
    createBox(0.3, 0.2, 0.3, brassMat, tp.x, 3.2, tp.z);
  });

  // Wine Display Rack
  createBox(0.6, 3.5, 4.0, glassMat, 24.6, 1.75, 0);

  // --- ROOM 4: CAFÉ & BAKERY FURNITURE ---
  // Barista Counter
  createBox(6.5, 1.1, 1.2, woodFloorMat, 18, 0.55, 15.5);
  createBox(6.6, 0.08, 1.3, marbleFloorMat, 18, 1.12, 15.5);

  // Professional Brass Espresso Machine
  createBox(1.4, 0.7, 0.8, brassMat, 16.5, 1.5, 15.5);
  createBox(0.1, 0.4, 0.1, stainlessMat, 16.2, 1.4, 15.1); // Portafilter

  // Glass Pastry Display Case
  createBox(2.2, 0.8, 0.8, glassMat, 19.5, 1.55, 15.5);

  // Café High Bar Stools
  [-1.5, 0, 1.5].forEach((offset) => {
    createBox(0.1, 0.8, 0.1, brassMat, 18 + offset, 0.4, 17.5);
    createBox(0.5, 0.08, 0.5, leatherNavyMat, 18 + offset, 0.82, 17.5);
  });

  // --- ROOM 5: COMMERCIAL KITCHEN FURNITURE ---
  // Stainless Steel Central Prep Island
  createBox(6.0, 0.95, 2.2, stainlessMat, 18, 0.48, -18);
  // Overhead Exhaust Hood
  createBox(6.2, 0.8, 2.4, stainlessMat, 18, 4.1, -18);

  // Commercial Cooking Range & Stoves
  createBox(4.5, 0.9, 1.2, stainlessMat, 18, 0.45, -24.4);
  // Burner flame accents
  [-1.2, 0, 1.2].forEach((offset) => {
    createBox(0.4, 0.04, 0.4, registerMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8 })), 18 + offset, 0.92, -24.4);
  });

  // Wall-Mounted KDS Screens (Kitchen Display System)
  const kdsMat = registerMat(new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.5,
    roughness: 0.1
  }));
  createBox(1.8, 1.0, 0.08, kdsMat, 18, 2.8, -24.8);

  // --- ROOM 6: EXECUTIVE LOUNGE FURNITURE ---
  // Executive Boardroom Table
  createBox(6.0, 0.85, 2.4, darkWoodMat, -18, 0.43, 18);
  // Leather Executive Chairs
  [-2, 0, 2].forEach((offset) => {
    createBox(0.7, 0.5, 0.7, leatherNavyMat, -18 + offset, 0.25, 16.2);
    createBox(0.7, 0.8, 0.1, leatherNavyMat, -18 + offset, 0.65, 15.9);

    createBox(0.7, 0.5, 0.7, leatherNavyMat, -18 + offset, 0.25, 19.8);
    createBox(0.7, 0.8, 0.1, leatherNavyMat, -18 + offset, 0.65, 20.1);
  });

  // Presentation / Analytics Wall Monitor
  const chartScreenMat = registerMat(new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    emissive: 0x8b5cf6,
    emissiveIntensity: 0.45,
    roughness: 0.2
  }));
  createBox(3.2, 1.8, 0.08, chartScreenMat, -18, 2.8, 24.8);

  // -------------------------------------------------------------
  // 6. INTERACTIVE 3D HOTSPOT BEACONS
  // -------------------------------------------------------------
  const hotspotMeshes: { mesh: THREE.Mesh; areaId: string }[] = [];
  const hotspotRings: THREE.Mesh[] = [];

  HOTEL_AREAS.forEach((area) => {
    const group = new THREE.Group();

    // Central Floating Gem / Diamond
    const gemGeo = registerGeo(new THREE.OctahedronGeometry(0.35, 0));
    const gemMat = registerMat(new THREE.MeshStandardMaterial({
      color: new THREE.Color(area.accentColor),
      emissive: new THREE.Color(area.accentColor),
      emissiveIntensity: 0.7,
      roughness: 0.1,
      metalness: 0.8
    }));
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    gemMesh.userData = { areaId: area.id, isHotspot: true };
    group.add(gemMesh);

    // Pulsating Concentric Ring
    const ringGeo = registerGeo(new THREE.RingGeometry(0.55, 0.65, 32));
    const ringMat = registerMat(new THREE.MeshBasicMaterial({
      color: new THREE.Color(area.accentColor),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    }));
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.userData = { areaId: area.id, isRing: true };
    group.add(ringMesh);
    hotspotRings.push(ringMesh);

    group.position.set(area.hotspotPos[0], area.hotspotPos[1], area.hotspotPos[2]);
    scene.add(group);

    hotspotMeshes.push({ mesh: gemMesh, areaId: area.id });
  });

  // -------------------------------------------------------------
  // 7. ANIMATION LOOP UPDATES
  // -------------------------------------------------------------
  const updateAnimations = (delta: number, time: number) => {
    // Animate Hotspot Beacons (Rotation & Bobbing)
    hotspotMeshes.forEach(({ mesh }, idx) => {
      mesh.rotation.y += delta * 1.5;
      mesh.rotation.x = Math.sin(time * 2 + idx) * 0.2;
      mesh.position.y = Math.sin(time * 3 + idx) * 0.15;
    });

    // Pulsate Rings
    hotspotRings.forEach((ring, idx) => {
      const scale = 1.0 + Math.sin(time * 3 + idx) * 0.25;
      ring.scale.set(scale, scale, 1);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(time * 3 + idx) * 0.3;
    });
  };

  // Cleanup handler
  const cleanup = () => {
    geometriesToDispose.forEach(g => g.dispose());
    materialsToDispose.forEach(m => m.dispose());
  };

  return {
    scene,
    hotspotMeshes,
    updateAnimations,
    cleanup
  };
}
