"use client";

import { getAtomConfig } from "@/lib/atom-config";
import { parsePDB } from "@/lib/pdb-parser";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface ARViewerProps {
  pdbData: string;
}

export default function ARViewer({ pdbData }: ARViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const moleculeGroupRef = useRef<THREE.Group | null>(null);
  const arSourceRef = useRef<any>(null);
  const arContextRef = useRef<any>(null);
  const markerControlsRef = useRef<any>(null);

  const [markerDetected, setMarkerDetected] = useState(false);
  const [stats, setStats] = useState({ atoms: 0, bonds: 0 });
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState("");
  const animationIdRef = useRef<number | undefined>(undefined);

  // Inicializar THREE.js e AR
  useEffect(() => {
    if (!containerRef.current) return;

    const initAR = async () => {
      try {
        // Criar cena THREE.js
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Criar câmera
        const camera = new THREE.Camera();
        cameraRef.current = camera;
        scene.add(camera);

        // Criar renderer
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
        });
        renderer.setClearColor(new THREE.Color("lightgrey"), 0);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.position = "absolute";
        renderer.domElement.style.top = "0px";
        renderer.domElement.style.left = "0px";
        containerRef.current!.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Luzes
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // Criar grupo marcador
        const markerRoot = new THREE.Group();
        scene.add(markerRoot);

        // Criar molécula
        const { atoms, bonds } = parsePDB(pdbData);
        const moleculeGroup = createMolecule(atoms, bonds);
        moleculeGroupRef.current = moleculeGroup;
        markerRoot.add(moleculeGroup);

        // Inicializar AR.js source (câmera)
        const arSource = new (window as any).THREEx.ArToolkitSource({
          sourceType: "webcam",
          sourceWidth: 1280,
          sourceHeight: 960,
        });

        arSource.init(() => {
          setCameraReady(true);
          setTimeout(() => {
            onResize();
          }, 1000);
        });

        arSourceRef.current = arSource;

        // Inicializar AR.js context
        const arContext = new (window as any).THREEx.ArToolkitContext({
          cameraParametersUrl: "/camera_para.dat",
          detectionMode: "mono",
          patternRatio: 0.9,
        });

        arContext.init(() => {
          camera.projectionMatrix.copy(arContext.getProjectionMatrix());
        });

        arContextRef.current = arContext;

        // Configurar marcador (ancora.patt)
        const markerControls = new (window as any).THREEx.ArMarkerControls(
          arContext,
          markerRoot,
          {
            type: "pattern",
            patternUrl: "/ancora.patt",
            changeMatrixMode: "cameraTransformMatrix",
          }
        );

        markerControlsRef.current = markerControls;

        // Resize handler
        window.addEventListener("resize", onResize);

        // Iniciar loop de animação
        animate();

        setStats({ atoms: atoms.length, bonds: bonds.length });
      } catch (err: any) {
        console.error("Erro ao inicializar AR:", err);
        setError(err.message || "Erro ao inicializar AR");
      }
    };

    // Carregar AR.js antes de inicializar
    const loadARjs = () => {
      if ((window as any).THREEx) {
        initAR();
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://raw.githack.com/AR-js-org/AR.js/master/three.js/build/ar.js";
      script.onload = () => initAR();
      script.onerror = () => setError("Erro ao carregar AR.js");
      document.body.appendChild(script);
    };

    loadARjs();

    return () => {
      window.removeEventListener("resize", onResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (arSourceRef.current?.domElement) {
        const video = arSourceRef.current.domElement;
        if (video.srcObject) {
          const tracks = (video.srcObject as MediaStream).getTracks();
          tracks.forEach((track) => track.stop());
        }
      }
      if (
        rendererRef.current &&
        containerRef.current?.contains(rendererRef.current.domElement)
      ) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [pdbData]);

  const createMolecule = (atoms: any[], bonds: any[]) => {
    const group = new THREE.Group();
    const SCALE = 5; // Escala maior para visualização AR

    // Criar geometria de esfera (reutilizar)
    const sphereGeometry = new THREE.SphereGeometry(1, 16, 16);

    // Renderizar TODOS os átomos
    atoms.forEach((atom) => {
      const config = getAtomConfig(atom.element);

      // Converter cor de string hexadecimal para número
      const colorValue =
        typeof config.color === "string"
          ? parseInt(config.color.replace("0x", ""), 16)
          : config.color;

      const material = new THREE.MeshStandardMaterial({
        color: colorValue,
        roughness: 0.3,
        metalness: 0.5,
      });

      const mesh = new THREE.Mesh(sphereGeometry, material);
      mesh.position.set(atom.x * SCALE, atom.y * SCALE, atom.z * SCALE);

      // Ajustar tamanho - hidrogênio menor
      const radiusScale = atom.element === "H" ? 0.15 : 0.25;
      mesh.scale.set(
        config.radius * radiusScale,
        config.radius * radiusScale,
        config.radius * radiusScale
      );

      group.add(mesh);
    });

    // Criar cilindros para ligações
    bonds.forEach((bond) => {
      const atom1 = atoms.find((a) => a.index === bond.atom1);
      const atom2 = atoms.find((a) => a.index === bond.atom2);

      if (atom1 && atom2) {
        const pos1 = new THREE.Vector3(
          atom1.x * SCALE,
          atom1.y * SCALE,
          atom1.z * SCALE
        );
        const pos2 = new THREE.Vector3(
          atom2.x * SCALE,
          atom2.y * SCALE,
          atom2.z * SCALE
        );

        const distance = pos1.distanceTo(pos2);
        const midpoint = new THREE.Vector3()
          .addVectors(pos1, pos2)
          .multiplyScalar(0.5);

        // Cilindro fino para ligações
        const bondRadius =
          atom1.element === "H" || atom2.element === "H" ? 0.05 : 0.1;
        const cylinderGeometry = new THREE.CylinderGeometry(
          bondRadius,
          bondRadius,
          distance,
          8
        );

        const material = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          roughness: 0.2,
          metalness: 0.7,
        });

        const cylinder = new THREE.Mesh(cylinderGeometry, material);
        cylinder.position.copy(midpoint);
        cylinder.lookAt(pos2);
        cylinder.rotateX(Math.PI / 2);

        group.add(cylinder);
      }
    });

    // Centralizar molécula
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.sub(center);

    return group;
  };

  const onResize = () => {
    if (!arSourceRef.current || !rendererRef.current || !arContextRef.current)
      return;

    arSourceRef.current.onResizeElement();
    arSourceRef.current.copyElementSizeTo(rendererRef.current.domElement);

    if (arContextRef.current.arController !== null) {
      arSourceRef.current.copyElementSizeTo(
        arContextRef.current.arController.canvas
      );
    }
  };

  const animate = () => {
    animationIdRef.current = requestAnimationFrame(animate);

    if (!arSourceRef.current || !arContextRef.current || !rendererRef.current)
      return;

    if (arSourceRef.current.ready === false) return;

    // Atualizar AR context
    arContextRef.current.update(arSourceRef.current.domElement);

    // Detectar marcador
    const isVisible = markerControlsRef.current?.object3d?.visible || false;
    setMarkerDetected(isVisible);

    // Rotação automática suave quando marcador detectado
    if (moleculeGroupRef.current && isVisible) {
      moleculeGroupRef.current.rotation.y += 0.01;
    }

    // Renderizar
    rendererRef.current.render(sceneRef.current!, cameraRef.current!);
  };

  return (
    <div className="w-screen h-screen relative bg-black overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Indicador de status */}
      <div className="absolute top-4 left-4 z-10">
        <div
          className={`w-4 h-4 rounded-full transition-all ${
            markerDetected
              ? "bg-green-500 shadow-lg shadow-green-500"
              : "bg-red-500"
          }`}
        />
      </div>

      {/* Info da molécula */}
      {markerDetected && (
        <div className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-lg font-mono text-sm z-10">
          <div className="font-bold mb-1">Molécula ATP</div>
          <div>Átomos: {stats.atoms}</div>
          <div>Ligações: {stats.bonds}</div>
        </div>
      )}

      {/* Mensagem de instrução */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-center px-4 py-3 rounded-lg text-sm max-w-sm z-10">
        {!cameraReady ? (
          <>
            <div className="font-bold">🎥 Inicializando câmera...</div>
            <div className="text-xs text-gray-300 mt-1">Aguarde um momento</div>
          </>
        ) : markerDetected ? (
          <>
            <div className="font-bold text-green-400">
              ✅ Marcador detectado!
            </div>
            <div className="text-xs text-gray-300 mt-1">
              Molécula visível em AR
            </div>
          </>
        ) : (
          <>
            <div className="font-bold">🎯 Aponte para o marcador</div>
            <div className="text-xs text-gray-300 mt-1">
              Use o arquivo ancora.patt impresso
            </div>
          </>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-red-900 text-white p-6 rounded-lg text-center max-w-sm mx-4">
            <div className="text-4xl mb-3">❌</div>
            <div className="font-bold text-lg mb-2">Erro</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}
