import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AgentNode {
  id: number;
  name: string;
  suspicionScore: number;
}

interface CyberGlobe3DProps {
  agents?: AgentNode[];
  onSelectAgent?: (agentId: number) => void;
  selectedAgentId?: number | null;
  height?: string;
}

export const CyberGlobe3D: React.FC<CyberGlobe3DProps> = ({
  agents = [
    { id: 1, name: 'Agent U1 (Marketing)', suspicionScore: 0.87 },
    { id: 2, name: 'Agent U2 (Billing)', suspicionScore: 0.42 },
    { id: 3, name: 'Agent U3 (Analytics)', suspicionScore: 0.13 },
  ],
  onSelectAgent,
  selectedAgentId,
  height = '400px'
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const heightPx = container.clientHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 1000);
    camera.position.set(0, 3, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 3, 50);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Central Globe (Distributor T)
    const globeGeo = new THREE.IcosahedronGeometry(1.8, 2);
    const globeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globeMesh);

    // Core nucleus
    const coreGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Background Particle Starfield
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 400;
    const posArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 30;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.5,
    });
    const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particlesMesh);

    // Agent Nodes Orbiting
    const agentMeshes: Array<{ id: number; mesh: THREE.Mesh; angle: number; radius: number }> = [];
    const numAgents = agents.length;
    const linesGroup = new THREE.Group();
    scene.add(linesGroup);

    agents.forEach((ag, idx) => {
      const angle = (idx / numAgents) * Math.PI * 2;
      const radius = 4.2;

      // Color based on suspicion score
      let colorHex = 0x10b981; // Green
      if (ag.suspicionScore >= 0.7) colorHex = 0xef4444; // Rose
      else if (ag.suspicionScore >= 0.3) colorHex = 0xf59e0b; // Amber

      const nodeGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);

      nodeMesh.position.x = Math.cos(angle) * radius;
      nodeMesh.position.z = Math.sin(angle) * radius;
      nodeMesh.position.y = (Math.random() - 0.5) * 1.5;

      scene.add(nodeMesh);
      agentMeshes.push({ id: ag.id, mesh: nodeMesh, angle, radius });

      // Connection beam to center
      const lineMat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.4,
      });
      const points = [new THREE.Vector3(0, 0, 0), nodeMesh.position];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeo, lineMat);
      linesGroup.add(line);
    });

    // Leak Target Threat Node (Red Pulse)
    const leakGeo = new THREE.OctahedronGeometry(0.5);
    const leakMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, wireframe: true });
    const leakMesh = new THREE.Mesh(leakGeo, leakMat);
    leakMesh.position.set(-3.5, 2, 2.5);
    scene.add(leakMesh);

    // Mouse Controls
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / heightPx) * 2 + 1;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Raycasting for node clicks
    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseVector.x = ((e.clientX - rect.left) / width) * 2 - 1;
      mouseVector.y = -((e.clientY - rect.top) / heightPx) * 2 + 1;

      raycaster.setFromCamera(mouseVector, camera);
      const intersects = raycaster.intersectObjects(agentMeshes.map((a) => a.mesh));

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const found = agentMeshes.find((a) => a.mesh === hitMesh);
        if (found && onSelectAgent) {
          onSelectAgent(found.id);
        }
      }
    };

    container.addEventListener('click', handleClick);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate central globe
      globeMesh.rotation.y += 0.005;
      globeMesh.rotation.x += 0.002;
      coreMesh.rotation.y -= 0.008;

      leakMesh.rotation.y += 0.02;
      leakMesh.rotation.z += 0.01;

      // Rotate particle field
      particlesMesh.rotation.y += 0.0005;

      // Mouse camera sway
      targetRotationY = mouseX * 0.5;
      targetRotationX = mouseY * 0.5;
      scene.rotation.y += (targetRotationY - scene.rotation.y) * 0.05;
      scene.rotation.x += (targetRotationX - scene.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [agents, onSelectAgent]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-slate-950/80 border border-slate-800 shadow-2xl">
      <div ref={mountRef} style={{ height }} className="w-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D HUD Badge */}
      <div className="absolute top-4 left-4 pointer-events-none bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 space-y-1">
        <div className="flex items-center gap-2 text-sky-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
          <span>3D DATA DISTRIBUTION NETWORK</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Center: Distributor T | Orbiting Nodes: Recipient Agents | Red: Threat Leak S
        </p>
      </div>

      <div className="absolute bottom-4 right-4 pointer-events-none text-[10px] font-mono text-slate-500 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
        Click node to inspect agent
      </div>
    </div>
  );
};
