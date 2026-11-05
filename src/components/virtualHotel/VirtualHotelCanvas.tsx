import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { HotelArea, HOTEL_AREAS } from './virtualHotelData';
import { buildHotelScene, SceneObjects } from './buildHotelScene';

interface VirtualHotelCanvasProps {
  onSelectHotspot: (area: HotelArea) => void;
  currentAreaId: string;
  onAreaChange: (area: HotelArea) => void;
  isTouring: boolean;
  onUpdateCameraPos: (pos: [number, number, number]) => void;
}

export const VirtualHotelCanvas: React.FC<VirtualHotelCanvasProps> = ({
  onSelectHotspot,
  currentAreaId,
  onAreaChange,
  isTouring,
  onUpdateCameraPos
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragDistRef = useRef(0);
  const previousPointerPosRef = useRef({ x: 0, y: 0 });

  // Camera angles (Euler: yaw & pitch)
  const yawRef = useRef(0);
  const pitchRef = useRef(0);

  // Transition / Lerp state
  const isTransitioningRef = useRef(false);
  const transitionStartPosRef = useRef(new THREE.Vector3());
  const transitionEndPosRef = useRef(new THREE.Vector3());
  const transitionStartTargetRef = useRef(new THREE.Vector3());
  const transitionEndTargetRef = useRef(new THREE.Vector3());
  const transitionProgressRef = useRef(1);
  const currentTargetRef = useRef(new THREE.Vector3(0, 1.6, -1));

  // Key state for WASD walking
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Tour state
  const tourIndexRef = useRef(0);
  const tourTimerRef = useRef(0);

  // Current area ref
  const currentAreaIdRef = useRef(currentAreaId);
  currentAreaIdRef.current = currentAreaId;

  // Function to initiate smooth camera fly/lerp to an area
  const flyToArea = useCallback((area: HotelArea, instant: boolean = false) => {
    const endPos = new THREE.Vector3(...area.cameraPos);
    const endTarget = new THREE.Vector3(...area.targetPos);

    if (instant) {
      transitionStartPosRef.current.copy(endPos);
      transitionEndPosRef.current.copy(endPos);
      transitionStartTargetRef.current.copy(endTarget);
      transitionEndTargetRef.current.copy(endTarget);
      currentTargetRef.current.copy(endTarget);
      transitionProgressRef.current = 1;
      isTransitioningRef.current = false;

      // Compute yaw and pitch towards target
      const dir = new THREE.Vector3().subVectors(endTarget, endPos).normalize();
      yawRef.current = Math.atan2(dir.x, dir.z);
      pitchRef.current = Math.asin(Math.max(-0.9, Math.min(0.9, dir.y)));
      return;
    }

    transitionStartPosRef.current.copy(transitionEndPosRef.current);
    transitionEndPosRef.current.copy(endPos);

    transitionStartTargetRef.current.copy(currentTargetRef.current);
    transitionEndTargetRef.current.copy(endTarget);

    transitionProgressRef.current = 0;
    isTransitioningRef.current = true;
  }, []);

  // When currentAreaId changes externally (e.g. from HUD teleport pills)
  useEffect(() => {
    const targetArea = HOTEL_AREAS.find(a => a.id === currentAreaId);
    if (targetArea) {
      flyToArea(targetArea, false);
    }
  }, [currentAreaId, flyToArea]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const { scene, hotspotMeshes, updateAnimations, cleanup } = buildHotelScene();

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 150);
    const initialArea = HOTEL_AREAS.find(a => a.id === currentAreaIdRef.current) || HOTEL_AREAS[0];
    camera.position.set(...initialArea.cameraPos);
    transitionStartPosRef.current.copy(camera.position);
    transitionEndPosRef.current.copy(camera.position);

    currentTargetRef.current.set(...initialArea.targetPos);
    transitionStartTargetRef.current.copy(currentTargetRef.current);
    transitionEndTargetRef.current.copy(currentTargetRef.current);
    camera.lookAt(currentTargetRef.current);

    // Initial angles
    const initDir = new THREE.Vector3().subVectors(currentTargetRef.current, camera.position).normalize();
    yawRef.current = Math.atan2(initDir.x, initDir.z);
    pitchRef.current = Math.asin(Math.max(-0.9, Math.min(0.9, initDir.y)));

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // 2. Pointer & Touch Event Handlers for Looking
    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      dragDistRef.current = 0;
      previousPointerPosRef.current = { x: e.clientX, y: e.clientY };
      container.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      // Calculate normalized mouse coords for hover checks
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousPointerPosRef.current.x;
        const deltaY = e.clientY - previousPointerPosRef.current.y;
        dragDistRef.current += Math.abs(deltaX) + Math.abs(deltaY);

        // Turn off camera interpolation if user manually drags
        if (isTransitioningRef.current && dragDistRef.current > 10) {
          isTransitioningRef.current = false;
        }

        const sensitivity = 0.003;
        yawRef.current -= deltaX * sensitivity;
        pitchRef.current -= deltaY * sensitivity;

        // Clamp pitch so camera cannot flip upside down
        pitchRef.current = Math.max(-1.15, Math.min(1.15, pitchRef.current));

        previousPointerPosRef.current = { x: e.clientX, y: e.clientY };
      } else {
        // Hotspot hover detection
        raycaster.setFromCamera(mouse, camera);
        const candidates = hotspotMeshes.map(h => h.mesh);
        const intersects = raycaster.intersectObjects(candidates, true);
        if (intersects.length > 0) {
          container.style.cursor = 'pointer';
        } else {
          container.style.cursor = 'grab';
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      isDraggingRef.current = false;
      container.style.cursor = 'grab';

      // If user barely moved the pointer, treat as click / tap
      if (dragDistRef.current < 8) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const candidates = hotspotMeshes.map(h => h.mesh);
        const intersects = raycaster.intersectObjects(candidates, true);

        if (intersects.length > 0) {
          // Identify which hotspot was clicked
          let clickedMesh: THREE.Object3D | null = intersects[0].object;
          while (clickedMesh && !clickedMesh.userData?.areaId && clickedMesh.parent) {
            clickedMesh = clickedMesh.parent;
          }

          const areaId = clickedMesh?.userData?.areaId;
          if (areaId) {
            const foundArea = HOTEL_AREAS.find(a => a.id === areaId);
            if (foundArea) {
              onSelectHotspot(foundArea);
            }
          }
        }
      }
    };

    // 3. Keyboard Walking (WASD / Arrows)
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = true;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        // Cancel automated camera transition on manual move
        isTransitioningRef.current = false;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };

    // Attach listeners
    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // 4. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 5. Animation Loop
    let clock = new THREE.Clock();
    let animationFrameId: number;
    let lastAreaCheckTime = 0;

    const smoothStep = (t: number) => t * t * (3 - 2 * t);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      // Update pulsating beacons and lighting
      updateAnimations(delta, elapsedTime);

      // Guided Tour Autopilot logic
      if (isTouring) {
        tourTimerRef.current += delta;
        if (tourTimerRef.current > 8.5) {
          tourTimerRef.current = 0;
          tourIndexRef.current = (tourIndexRef.current + 1) % HOTEL_AREAS.length;
          const nextArea = HOTEL_AREAS[tourIndexRef.current];
          onAreaChange(nextArea);
          flyToArea(nextArea, false);
        }
      }

      // Smooth Camera Lerping (Transitions)
      if (isTransitioningRef.current) {
        transitionProgressRef.current += delta * 0.95; // ~1.05s flight
        const t = Math.min(1, transitionProgressRef.current);
        const ease = smoothStep(t);

        camera.position.lerpVectors(
          transitionStartPosRef.current,
          transitionEndPosRef.current,
          ease
        );

        currentTargetRef.current.lerpVectors(
          transitionStartTargetRef.current,
          transitionEndTargetRef.current,
          ease
        );

        camera.lookAt(currentTargetRef.current);

        // Sync yaw and pitch with current target
        const dir = new THREE.Vector3().subVectors(currentTargetRef.current, camera.position).normalize();
        yawRef.current = Math.atan2(dir.x, dir.z);
        pitchRef.current = Math.asin(Math.max(-0.9, Math.min(0.9, dir.y)));

        if (t >= 1) {
          isTransitioningRef.current = false;
        }
      } else {
        // Keyboard First-Person Walking
        const moveSpeed = 6.0; // units per second
        const keys = keysPressedRef.current;

        // Compute forward and right directional vectors from yaw
        const forward = new THREE.Vector3(Math.sin(yawRef.current), 0, Math.cos(yawRef.current));
        const right = new THREE.Vector3(Math.cos(yawRef.current), 0, -Math.sin(yawRef.current));

        let moveVector = new THREE.Vector3();

        if (keys['KeyW'] || keys['ArrowUp']) moveVector.add(forward);
        if (keys['KeyS'] || keys['ArrowDown']) moveVector.sub(forward);
        if (keys['KeyD'] || keys['ArrowRight']) moveVector.add(right);
        if (keys['KeyA'] || keys['ArrowLeft']) moveVector.sub(right);

        if (moveVector.lengthSq() > 0) {
          moveVector.normalize();
          camera.position.addScaledVector(moveVector, moveSpeed * delta);

          // Restrict movement within hotel architectural floor boundaries
          camera.position.x = Math.max(-25, Math.min(25, camera.position.x));
          camera.position.z = Math.max(-25, Math.min(25, camera.position.z));
        }

        // Maintain comfortable eye height
        camera.position.y = 2.2;

        // Apply mouse look direction
        const cosPitch = Math.cos(pitchRef.current);
        const lookDir = new THREE.Vector3(
          Math.sin(yawRef.current) * cosPitch,
          Math.sin(pitchRef.current),
          Math.cos(yawRef.current) * cosPitch
        );

        currentTargetRef.current.copy(camera.position).add(lookDir);
        camera.lookAt(currentTargetRef.current);
      }

      // Check which hotel room the camera is currently closest to
      if (elapsedTime - lastAreaCheckTime > 0.3) {
        lastAreaCheckTime = elapsedTime;
        onUpdateCameraPos([camera.position.x, camera.position.y, camera.position.z]);

        let closestArea = HOTEL_AREAS[0];
        let closestDistSq = Infinity;

        HOTEL_AREAS.forEach(area => {
          const dx = camera.position.x - area.cameraPos[0];
          const dz = camera.position.z - area.cameraPos[2];
          const distSq = dx * dx + dz * dz;
          if (distSq < closestDistSq) {
            closestDistSq = distSq;
            closestArea = area;
          }
        });

        if (closestArea.id !== currentAreaIdRef.current && closestDistSq < 150) {
          currentAreaIdRef.current = closestArea.id;
          onAreaChange(closestArea);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 6. Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      resizeObserver.disconnect();
      cleanup();
      renderer.dispose();
      if (container.contains(domElem)) {
        container.removeChild(domElem);
      }
    };
  }, [flyToArea, isTouring, onAreaChange, onSelectHotspot, onUpdateCameraPos]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full select-none cursor-grab active:cursor-grabbing bg-[#0a0c10]"
      style={{ touchAction: 'none' }}
    />
  );
};

export default VirtualHotelCanvas;
