import { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';

export const Spatial3DCanvas = memo(function Spatial3DCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);

    container.appendChild(renderer.domElement);

    // Floating 3D Papers in background
    const paperCount = 18;
    const paperGroup = new THREE.Group();
    scene.add(paperGroup);

    const paperGeo = new THREE.PlaneGeometry(0.6, 0.4);
    const paperMaterials = [
      new THREE.MeshBasicMaterial({ color: 0xae3ec9, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
      new THREE.MeshBasicMaterial({ color: 0x4dabf7, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
      new THREE.MeshBasicMaterial({ color: 0xfcc419, transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
    ];

    const paperObjects: Array<{
      mesh: THREE.Mesh;
      vx: number;
      vy: number;
      rotSpeedX: number;
      rotSpeedY: number;
      initialZ: number;
    }> = [];

    for (let i = 0; i < paperCount; i++) {
      const mat = paperMaterials[i % paperMaterials.length];
      const mesh = new THREE.Mesh(paperGeo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6 - 2
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      paperGroup.add(mesh);

      paperObjects.push({
        mesh,
        vx: (Math.random() - 0.5) * 0.003,
        vy: 0.002 + Math.random() * 0.004,
        rotSpeedX: (Math.random() - 0.5) * 0.008,
        rotSpeedY: (Math.random() - 0.5) * 0.008,
        initialZ: mesh.position.z,
      });
    }

    // Parallax mouse movement
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetParallaxX = (e.clientX / window.innerWidth - 0.5) * 1.5;
      targetParallaxY = -(e.clientY / window.innerHeight - 0.5) * 1.5;
    };

    window.addEventListener('mousemove', handleMouseMove);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      currentParallaxX += (targetParallaxX - currentParallaxX) * 0.05;
      currentParallaxY += (targetParallaxY - currentParallaxY) * 0.05;

      camera.position.x = currentParallaxX;
      camera.position.y = currentParallaxY;
      camera.lookAt(0, 0, 0);

      paperObjects.forEach((item) => {
        item.mesh.position.y += item.vy;
        item.mesh.position.x += item.vx;
        item.mesh.rotation.x += item.rotSpeedX;
        item.mesh.rotation.y += item.rotSpeedY;

        if (item.mesh.position.y > 6) {
          item.mesh.position.y = -6;
          item.mesh.position.x = (Math.random() - 0.5) * 14;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      paperGeo.dispose();
      paperMaterials.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="spatial-3d-background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden',
      }}
    />
  );
});
