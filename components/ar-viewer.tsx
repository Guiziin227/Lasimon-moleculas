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
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const moleculeGroupRef = useRef<THREE.Group | null>(null);

  const [markerDetected, setMarkerDetected] = useState(false);
  const [stats, setStats] = useState({ atoms: 0, bonds: 0 });
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState("");
  const animationIdRef = useRef<number | undefined>(undefined);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detectar marcador via análise de imagem MELHORADA
  const detectMarker = (canvas: HTMLCanvasElement): boolean => {
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;

      const width = canvas.width;
      const height = canvas.height;

      // Analisar apenas região central (onde o marcador deve estar)
      const centerX = width / 2;
      const centerY = height / 2;
      const regionSize = Math.min(width, height) * 0.4; // 40% do centro

      const startX = Math.floor(centerX - regionSize / 2);
      const startY = Math.floor(centerY - regionSize / 2);
      const endX = Math.floor(centerX + regionSize / 2);
      const endY = Math.floor(centerY + regionSize / 2);

      const imageData = ctx.getImageData(
        startX,
        startY,
        regionSize,
        regionSize
      );
      const data = imageData.data;

      let veryDarkPixels = 0;
      let veryWhitePixels = 0;
      let edgeTransitions = 0;
      const totalPixels = data.length / 4;
      let lastBrightness = 0;

      // Análise avançada: contraste + transições de borda (padrão de marcador)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;

        // Pixels muito escuros (< 40) e muito claros (> 215)
        if (brightness < 40) veryDarkPixels++;
        if (brightness > 215) veryWhitePixels++;

        // Contar transições bruscas (bordas do marcador)
        if (i > 0) {
          const diff = Math.abs(brightness - lastBrightness);
          if (diff > 100) edgeTransitions++;
        }
        lastBrightness = brightness;
      }

      const veryDarkRatio = veryDarkPixels / totalPixels;
      const veryWhiteRatio = veryWhitePixels / totalPixels;
      const transitionRatio = edgeTransitions / totalPixels;

      // Marcador precisa ter:
      // 1. Muito preto E muito branco (alto contraste)
      // 2. Muitas transições de borda (padrão definido)
      // 3. Proporções específicas
      const hasHighContrast = veryDarkRatio > 0.3 && veryWhiteRatio > 0.3;
      const hasPattern = transitionRatio > 0.15; // Muitas bordas
      const hasBalance = Math.abs(veryDarkRatio - veryWhiteRatio) < 0.25; // Equilibrado

      const isMarker = hasHighContrast && hasPattern && hasBalance;

      // Debug (remover depois)
      if (isMarker) {
        console.log("🎯 Marcador detectado!", {
          dark: veryDarkRatio.toFixed(2),
          white: veryWhiteRatio.toFixed(2),
          edges: transitionRatio.toFixed(2),
        });
      }

      return isMarker;
    } catch (err) {
      console.error("Erro na detecção:", err);
      return false;
    }
  };

  // Inicializar câmera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("webkit-playsinline", "true");

          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current?.play();
              setCameraReady(true);
              console.log("✅ Câmera inicializada");
            } catch (err) {
              console.error("Erro ao iniciar vídeo:", err);
              setError("Erro ao iniciar câmera");
            }
          };
        }
      } catch (err: any) {
        console.error("Erro ao acessar câmera:", err);
        setError(err?.message || "Erro ao acessar câmera");
      }
    };

    initCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Criar molécula 3D - CORRIGIDO com escala maior e centralização
  const createMolecule = (atoms: any[], bonds: any[]) => {
    const group = new THREE.Group();
    const SCALE = 2.5; // Escala maior!

    const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);

    console.log(
      `📊 Criando molécula: ${atoms.length} átomos, ${bonds.length} ligações`
    );

    // Renderizar TODOS os átomos
    atoms.forEach((atom) => {
      const config = getAtomConfig(atom.element);

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

      // Tamanhos proporcionais
      const radiusScale = atom.element === "H" ? 0.25 : 0.35;
      mesh.scale.set(
        config.radius * radiusScale,
        config.radius * radiusScale,
        config.radius * radiusScale
      );

      group.add(mesh);
    });

    // Criar cilindros para ligações - USANDO DADOS DO PDB!
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

        // Cilindros mais visíveis
        const bondRadius =
          atom1.element === "H" || atom2.element === "H" ? 0.12 : 0.2;
        const cylinderGeometry = new THREE.CylinderGeometry(
          bondRadius,
          bondRadius,
          distance,
          12
        );

        const material = new THREE.MeshStandardMaterial({
          color: 0xaaaaaa,
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

    // CENTRALIZAR a molécula no grupo
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());

    // Mover todos os objetos para centralizar
    group.children.forEach((child) => {
      child.position.sub(center);
    });

    console.log(`✅ Molécula criada e centralizada`);

    return group;
  };

  // Inicializar cena 3D
  useEffect(() => {
    if (!containerRef.current || !cameraReady) return;

    try {
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Câmera ajustada para molécula maior
      const camera = new THREE.PerspectiveCamera(
        60, // FOV menor = menos distorção
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 100); // Mais longe para ver completa
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.top = "0";
      renderer.domElement.style.left = "0";
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Iluminação melhorada
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);

      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
      directionalLight1.position.set(10, 10, 10);
      scene.add(directionalLight1);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
      directionalLight2.position.set(-10, -10, -10);
      scene.add(directionalLight2);

      const { atoms, bonds } = parsePDB(pdbData);
      const moleculeGroup = createMolecule(atoms, bonds);
      moleculeGroupRef.current = moleculeGroup;
      moleculeGroup.visible = false; // Oculto até detectar marcador
      moleculeGroup.position.set(0, 0, 0); // Centro da cena
      scene.add(moleculeGroup);

      setStats({ atoms: atoms.length, bonds: bonds.length });

      // Animação suave
      const animate = () => {
        animationIdRef.current = requestAnimationFrame(animate);

        if (moleculeGroupRef.current && markerDetected) {
          // Rotação mais lenta e suave
          moleculeGroupRef.current.rotation.y += 0.008;
          moleculeGroupRef.current.rotation.x += 0.003;
        }

        renderer.render(scene, camera);
      };
      animate();

      // Resize
      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", handleResize);

      console.log("✅ Cena 3D inicializada");

      return () => {
        window.removeEventListener("resize", handleResize);
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
        if (containerRef.current?.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
      };
    } catch (err: any) {
      console.error("Erro ao criar cena:", err);
      setError(err.message);
    }
  }, [pdbData, cameraReady]);

  // Detecção contínua de marcador
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    detectionIntervalRef.current = setInterval(() => {
      if (
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        const detected = detectMarker(canvas);
        setMarkerDetected(detected);

        if (moleculeGroupRef.current) {
          moleculeGroupRef.current.visible = detected;
        }
      }
    }, 100);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [cameraReady]);

  return (
    <div className="w-screen h-screen relative bg-black overflow-hidden">
      {/* Vídeo da câmera */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        autoPlay
        muted
      />

      {/* Canvas para detecção (oculto) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Cena 3D */}
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
        {error ? (
          <>
            <div className="font-bold text-red-400">❌ Erro</div>
            <div className="text-xs text-gray-300 mt-1">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-3 py-1 bg-blue-600 rounded text-xs"
            >
              Recarregar
            </button>
          </>
        ) : !cameraReady ? (
          <>
            <div className="font-bold">🎥 Inicializando câmera...</div>
            <div className="text-xs text-gray-300 mt-1">Aguarde</div>
          </>
        ) : markerDetected ? (
          <>
            <div className="font-bold text-green-400">
              ✅ Marcador detectado!
            </div>
            <div className="text-xs text-gray-300 mt-1">
              Molécula visível • Cores e ligações corretas
            </div>
          </>
        ) : (
          <>
            <div className="font-bold">🎯 Aponte para o marcador</div>
            <div className="text-xs text-gray-300 mt-1">
              Use ancora.patt impresso (preto e branco)
            </div>
          </>
        )}
      </div>
    </div>
  );
}
