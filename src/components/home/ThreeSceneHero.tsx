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
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 9);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Ambient & Point Lighting
    const ambientLight = new THREE.AmbientLight(0x6366f1, 0.8);
    scene.add(ambientLight);

    const primaryLight = new THREE.PointLight(0x38bdf8, 3, 20);
    primaryLight.position.set(5, 5, 5);
    scene.add(primaryLight);

    const accentLight = new THREE.PointLight(0xa855f7, 2.5, 20);
    accentLight.position.set(-5, -3, 3);
    scene.add(accentLight);

    const goldLight = new THREE.PointLight(0xf59e0b, 1.5, 15);
    goldLight.position.set(0, 4, -2);
    scene.add(goldLight);

    // Group for all rotating 3D elements
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Central Architectural Crystal (Icosahedron)
    const crystalGeo = new THREE.IcosahedronGeometry(2.2, 1);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e1b4b,
      emissive: 0x312e81,
      emissiveIntensity: 0.3,
      roughness: 0.15,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      wireframe: false,
      transparent: true,
      opacity: 0.85
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    mainGroup.add(crystalMesh);

    // 2. Wireframe Cage Layer
    const wireframeGeo = new THREE.IcosahedronGeometry(2.35, 1);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    const wireframeMesh = new THREE.Mesh(wireframeGeo, wireframeMat);
    mainGroup.add(wireframeMesh);

    // 3. Orbital Concentric Rings (Representing Hospitality Network & PMS Nodes)
    const ringGeo1 = new THREE.TorusGeometry(3.6, 0.02, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.4
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 3;
    mainGroup.add(ringMesh1);

    const ringGeo2 = new THREE.TorusGeometry(4.3, 0.015, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.3
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -Math.PI / 4;
    ringMesh2.rotation.y = Math.PI / 6;
    mainGroup.add(ringMesh2);

    // 4. Floating Satellites (Mini hotel modules)
    const satellites: THREE.Mesh[] = [];
    const satCount = 6;
    const satGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const satMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.4
    });

    for (let i = 0; i < satCount; i++) {
      const sat = new THREE.Mesh(satGeo, satMat);
      const angle = (i / satCount) * Math.PI * 2;
      const radius = 3.6;
      sat.position.set(
        Math.cos(angle) * radius,
        (Math.sin(angle * 2) * 0.8),
        Math.sin(angle) * radius
      );
      satellites.push(sat);
      mainGroup.add(sat);
    }

    // 5. Ambient Star / Data Particles
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 20;
      particlePositions[i + 1] = (Math.random() - 0.5) * 16;
      particlePositions[i + 2] = (Math.random() - 0.5) * 16;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Mouse Parallax Interaction
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 1.2;
      targetY = y * 1.0;
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

    window.addEventListener('resize', handleResize);

    // Pause rendering when hero is out of viewport to preserve 100% GPU performance
    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.05 });
    observer.observe(container);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse easing
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;

      if (!prefersReducedMotion) {
        // Continuous gentle rotation
        crystalMesh.rotation.y += delta * 0.25;
        crystalMesh.rotation.x += delta * 0.12;

        wireframeMesh.rotation.y -= delta * 0.18;
        wireframeMesh.rotation.z += delta * 0.1;

        ringMesh1.rotation.z += delta * 0.15;
        ringMesh2.rotation.z -= delta * 0.12;

        // Animate floating satellites
        satellites.forEach((sat, idx) => {
          const speed = 0.4 + idx * 0.05;
          const angle = elapsedTime * speed + (idx / satCount) * Math.PI * 2;
          const radius = 3.6 + Math.sin(elapsedTime + idx) * 0.3;
          sat.position.x = Math.cos(angle) * radius;
          sat.position.z = Math.sin(angle) * radius;
          sat.position.y = Math.sin(angle * 2) * 0.6;
          sat.rotation.x += delta * 1.2;
          sat.rotation.y += delta * 1.5;
        });

        // Drift particle system
        particleSystem.rotation.y += delta * 0.03;
      }

      // Parallax camera tilt
      camera.position.x = currentX * 2.5;
      camera.position.y = 2 - currentY * 2.0;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Clean up on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose geometries and materials
      crystalGeo.dispose();
      crystalMat.dispose();
      wireframeGeo.dispose();
      wireframeMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      satGeo.dispose();
      satMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
