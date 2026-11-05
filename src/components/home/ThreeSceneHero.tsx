import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeSceneHeroProps {
  className?: string;
}

export default function ThreeSceneHero({ className = '' }: ThreeSceneHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Warm & Cool Ambient Hospitality Lighting
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.6);
    scene.add(ambientLight);

    const skyPoint = new THREE.PointLight(0x38bdf8, 2.5, 30);
    skyPoint.position.set(6, 6, 4);
    scene.add(skyPoint);

    const goldPoint = new THREE.PointLight(0xf59e0b, 2.0, 25);
    goldPoint.position.set(-6, -4, 3);
    scene.add(goldPoint);

    // Luxury Architectural Wave Mesh (Ground Lattice)
    const gridCols = 45;
    const gridRows = 30;
    const gridCount = gridCols * gridRows;
    const planeGeo = new THREE.PlaneGeometry(28, 18, gridCols - 1, gridRows - 1);
    planeGeo.rotateX(-Math.PI / 2.3);
    planeGeo.translate(0, -3.2, -2);

    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x0e1726,
      wireframe: true,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.35
    });
    const groundGrid = new THREE.Mesh(planeGeo, planeMat);
    scene.add(groundGrid);

    // Ambient Luxury Starlight & Golden Embers
    const particleCount = 220;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 24;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 12;
      particleScales[i] = Math.random() * 0.05 + 0.02;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xbae6fd,
      size: 0.05,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Floating Golden Accent Light Rings
    const ringGeo = new THREE.TorusGeometry(5.2, 0.015, 16, 120);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd97706,
      transparent: true,
      opacity: 0.25
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.8;
    ringMesh.position.set(0, -1, -3);
    scene.add(ringMesh);

    // Mouse Parallax Interaction
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 0.8;
      targetY = y * 0.6;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth mouse easing
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      camera.position.x = currentX;
      camera.position.y = 1.5 - currentY;
      camera.lookAt(0, 0, 0);

      if (!prefersReducedMotion) {
        // Subtle wave effect on the grid vertices
        const posAttr = planeGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const u = i % gridCols;
          const v = Math.floor(i / gridCols);
          const zVal = Math.sin(time * 0.8 + u * 0.3) * 0.35 + Math.cos(time * 0.6 + v * 0.4) * 0.25;
          posAttr.setZ(i, zVal);
        }
        posAttr.needsUpdate = true;

        // Slow ring rotation
        ringMesh.rotation.z = time * 0.04;
        particleSystem.rotation.y = time * 0.02;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      planeGeo.dispose();
      planeMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
    />
  );
}
