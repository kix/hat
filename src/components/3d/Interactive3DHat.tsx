import { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';
import { vibrate } from '../../utils/haptics';

interface Interactive3DHatProps {
  interactive?: boolean;
  size?: number | string;
  showParticles?: boolean;
  onHatClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const Interactive3DHat = memo(function Interactive3DHat({
  interactive = true,
  size = 280,
  showParticles = true,
  onHatClick,
  style,
  className,
}: Interactive3DHatProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hatGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0.25, y: -0.3 });
  const currentRotationRef = useRef({ x: 0.25, y: -0.3 });
  const bounceAnimRef = useRef({ scale: 1, velocity: 0, tipAngle: 0, tipVelocity: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = typeof size === 'number' ? size : container.clientWidth || 280;
    const height = typeof size === 'number' ? size : container.clientHeight || 280;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 512;
    keyLight.shadow.mapSize.height = 512;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xcc5de8, 3.2); // Grape/purple rim glow
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x4dabf7, 2.0, 10); // Cyan fill
    fillLight.position.set(2, -2, 3);
    scene.add(fillLight);

    // 4. Procedural 3D Top Hat Construction
    const hatGroup = new THREE.Group();
    scene.add(hatGroup);
    hatGroupRef.current = hatGroup;

    // Hat Felt Material
    const feltMaterial = new THREE.MeshStandardMaterial({
      color: 0x181a24,
      roughness: 0.65,
      metalness: 0.15,
    });

    // Satin Ribbon Band Material
    const ribbonMaterial = new THREE.MeshStandardMaterial({
      color: 0xae3ec9, // Iconic Grape purple
      roughness: 0.25,
      metalness: 0.45,
    });

    // Gold Buckle Material
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xfcc419,
      metalness: 0.85,
      roughness: 0.2,
    });

    // A) Hat Crown (Cylinder with taper)
    const crownGeo = new THREE.CylinderGeometry(0.92, 0.82, 1.4, 36, 1, false);
    const crown = new THREE.Mesh(crownGeo, feltMaterial);
    crown.position.y = 0.7;
    crown.castShadow = true;
    crown.receiveShadow = true;
    hatGroup.add(crown);

    // Crown Top Cap
    const topCapGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.04, 36);
    const topCap = new THREE.Mesh(topCapGeo, feltMaterial);
    topCap.position.y = 1.4;
    hatGroup.add(topCap);

    // B) Hat Brim (Disk + Torus for curled edge)
    const brimGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.04, 48);
    const brim = new THREE.Mesh(brimGeo, feltMaterial);
    brim.position.y = 0.02;
    brim.castShadow = true;
    hatGroup.add(brim);

    const brimRimGeo = new THREE.TorusGeometry(1.58, 0.04, 16, 48);
    brimRimGeo.rotateX(Math.PI / 2);
    const brimRim = new THREE.Mesh(brimRimGeo, feltMaterial);
    brimRim.position.y = 0.03;
    hatGroup.add(brimRim);

    // C) Ribbon Band around crown base
    const ribbonGeo = new THREE.CylinderGeometry(0.84, 0.83, 0.28, 36);
    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMaterial);
    ribbon.position.y = 0.16;
    hatGroup.add(ribbon);

    // D) Golden Buckle on ribbon
    const buckleOuterGeo = new THREE.BoxGeometry(0.12, 0.32, 0.38);
    const buckleOuter = new THREE.Mesh(buckleOuterGeo, goldMaterial);
    buckleOuter.position.set(0.83, 0.16, 0);
    hatGroup.add(buckleOuter);

    // E) Floating folded 3D paper notes / slips hovering around
    const paperGroup = new THREE.Group();
    hatGroup.add(paperGroup);

    const paperGeo = new THREE.PlaneGeometry(0.35, 0.22);
    const paperMat1 = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    const paperMat2 = new THREE.MeshStandardMaterial({
      color: 0xffec99,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });

    const papers: Array<{ mesh: THREE.Mesh; orbitSpeed: number; orbitRadius: number; orbitAngle: number; floatY: number; phase: number }> = [];

    for (let i = 0; i < 6; i++) {
      const pMesh = new THREE.Mesh(paperGeo, i % 2 === 0 ? paperMat1 : paperMat2);
      const angle = (i / 6) * Math.PI * 2;
      const radius = 1.35 + Math.random() * 0.4;
      pMesh.position.set(Math.cos(angle) * radius, 0.8 + (Math.random() - 0.5) * 0.6, Math.sin(angle) * radius);
      pMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      pMesh.castShadow = true;
      paperGroup.add(pMesh);

      papers.push({
        mesh: pMesh,
        orbitSpeed: 0.008 + Math.random() * 0.006,
        orbitRadius: radius,
        orbitAngle: angle,
        floatY: pMesh.position.y,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // F) Floating Magic Sparkles / Particles
    let particleSystem: THREE.Points | null = null;
    if (showParticles) {
      const particleCount = 45;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const colorOptions = [
        new THREE.Color(0xae3ec9),
        new THREE.Color(0x4dabf7),
        new THREE.Color(0xfcc419),
        new THREE.Color(0x38d9a9),
      ];

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 4;
        positions[i * 3 + 1] = Math.random() * 3.5 - 0.5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 4;

        const col = colorOptions[Math.floor(Math.random() * colorOptions.length)];
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const particleMat = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });

      particleSystem = new THREE.Points(particleGeo, particleMat);
      scene.add(particleSystem);
    }

    // 5. Interaction Listeners
    const handlePointerDown = (e: PointerEvent) => {
      if (!interactive) return;
      isDraggingRef.current = true;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!interactive) return;
      if (isDraggingRef.current) {
        const dx = e.clientX - prevMousePosRef.current.x;
        const dy = e.clientY - prevMousePosRef.current.y;
        targetRotationRef.current.y += dx * 0.012;
        targetRotationRef.current.x = Math.max(-0.4, Math.min(0.8, targetRotationRef.current.x + dy * 0.012));
        prevMousePosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    const handleClick = () => {
      // Hat tip & bounce pulse
      bounceAnimRef.current.velocity = 0.22;
      bounceAnimRef.current.tipVelocity = 0.35;
      vibrate(15);
      onHatClick?.();
    };

    // Parallax on mouse hover when not dragging
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!interactive || isDraggingRef.current) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetRotationRef.current.y = -0.3 + nx * 0.4;
      targetRotationRef.current.x = 0.25 + ny * 0.25;
    };

    // Mobile Gyroscope Parallax
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (!interactive || isDraggingRef.current || e.gamma === null || e.beta === null) return;
      const gamma = Math.max(-30, Math.min(30, e.gamma)); // left-to-right
      const beta = Math.max(-30, Math.min(30, e.beta - 45)); // front-to-back
      targetRotationRef.current.y = -0.3 + (gamma / 30) * 0.5;
      targetRotationRef.current.x = 0.25 + (beta / 30) * 0.3;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    domElem.addEventListener('click', handleClick);
    window.addEventListener('mousemove', handleWindowMouseMove);

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleDeviceOrientation);
    }

    // 6. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth rotation interpolation
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.08;

      // Spring physics for bounce
      const b = bounceAnimRef.current;
      b.scale += b.velocity;
      b.velocity += (1 - b.scale) * 0.2;
      b.velocity *= 0.82;

      b.tipAngle += b.tipVelocity;
      b.tipVelocity += (0 - b.tipAngle) * 0.2;
      b.tipVelocity *= 0.82;

      if (hatGroupRef.current) {
        // Floating hover
        const floatOffset = Math.sin(elapsedTime * 2.2) * 0.08;
        hatGroupRef.current.position.y = floatOffset;
        hatGroupRef.current.rotation.x = currentRotationRef.current.x + b.tipAngle;
        hatGroupRef.current.rotation.y = currentRotationRef.current.y;
        hatGroupRef.current.rotation.z = Math.sin(elapsedTime * 1.5) * 0.03 + b.tipAngle * 0.5;
        hatGroupRef.current.scale.set(b.scale, b.scale, b.scale);
      }

      // Orbiting papers
      papers.forEach((p) => {
        p.orbitAngle += p.orbitSpeed;
        p.mesh.position.x = Math.cos(p.orbitAngle) * p.orbitRadius;
        p.mesh.position.z = Math.sin(p.orbitAngle) * p.orbitRadius;
        p.mesh.position.y = p.floatY + Math.sin(elapsedTime * 2.5 + p.phase) * 0.12;
        p.mesh.rotation.y += 0.015;
        p.mesh.rotation.x += 0.01;
      });

      // Sparkles rotation
      if (particleSystem) {
        particleSystem.rotation.y = elapsedTime * 0.1;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = entry.contentRect.width;
        const newH = entry.contentRect.height;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });

    if (container) resizeObserver.observe(container);

    // 8. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      domElem.removeEventListener('click', handleClick);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
      resizeObserver.disconnect();

      if (container.contains(domElem)) {
        container.removeChild(domElem);
      }

      // Dispose Three.js objects
      crownGeo.dispose();
      topCapGeo.dispose();
      brimGeo.dispose();
      brimRimGeo.dispose();
      ribbonGeo.dispose();
      buckleOuterGeo.dispose();
      paperGeo.dispose();
      feltMaterial.dispose();
      ribbonMaterial.dispose();
      goldMaterial.dispose();
      paperMat1.dispose();
      paperMat2.dispose();
      renderer.dispose();
    };
  }, [interactive, size, showParticles, onHatClick]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        cursor: interactive ? 'grab' : 'default',
        userSelect: 'none',
        margin: '0 auto',
        ...style,
      }}
    />
  );
});
