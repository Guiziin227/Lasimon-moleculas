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
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const moleculeGroupRef = useRef<THREE.Group | null>(null);
  const rotationVelocityRef = useRef({ x: 0, y: 0 });
  const [markerDetected, setMarkerDetected] = useState(false);
  const [stats, setStats] = useState({ atoms: 0, bonds: 0 });
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");

  // Inicialização da câmera com retry
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const initCamera = async () => {
      try {
        // Parar qualquer stream existente
        if (videoRef.current?.srcObject) {
          const tracks = (
            videoRef.current.srcObject as MediaStream
          ).getTracks();
          tracks.forEach((track) => track.stop());
        }

        const constraints = {
          video: {
            facingMode: "environment",
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          // Garantir que o vídeo vai carregar
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("webkit-playsinline", "true");

          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current?.play();
              setCameraGranted(true);
              setCameraError("");
              console.log("✅ Câmera inicializada com sucesso");
            } catch (err) {
              console.error("Erro ao dar play:", err);
              if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(initCamera, 1000);
              } else {
                setCameraError("Não foi possível iniciar a câmera");
              }
            }
          };

          videoRef.current.onerror = (error) => {
            console.error("Erro no vídeo:", error);
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(initCamera, 1000);
            } else {
              setCameraError("Erro ao carregar vídeo da câmera");
            }
          };
        }
      } catch (error: any) {
        console.error("❌ Erro ao acessar câmera:", error);
        setCameraError(error?.message || "Erro desconhecido ao acessar câmera");

        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Tentando novamente... (${retryCount}/${maxRetries})`);
          setTimeout(initCamera, 1500);
        }
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

  // Renderização da cena 3D com TODOS os átomos
  useEffect(() => {
    if (!containerRef.current || !cameraGranted) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 100;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.touchAction = "none";
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    const { atoms, bonds } = parsePDB(pdbData);

    // MOSTRAR TODOS OS ÁTOMOS, incluindo hidrogênio
    const allAtoms = atoms; // Não filtrar mais!

    const moleculeGroup = new THREE.Group();
    scene.add(moleculeGroup);
    moleculeGroupRef.current = moleculeGroup;
    moleculeGroup.visible = false;

    const SCALE = 0.8;
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);

    // Renderizar TODOS os átomos
    allAtoms.forEach((atom) => {
      const config = getAtomConfig(atom.element);
      const material = new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: 0.4,
        metalness: 0.6,
      });

      const mesh = new THREE.Mesh(sphereGeometry, material);
      mesh.position.set(atom.x * SCALE, atom.y * SCALE, atom.z * SCALE);

      // Ajustar tamanho - hidrogênio é menor
      const radiusMultiplier = atom.element === "H" ? 0.25 : 0.35;
      mesh.scale.set(
        config.radius * radiusMultiplier,
        config.radius * radiusMultiplier,
        config.radius * radiusMultiplier
      );
      moleculeGroup.add(mesh);
    });

    // Renderizar todas as ligações
    const allAtomIndices = new Set(allAtoms.map((atom) => atom.index));
    const validBonds = bonds.filter(
      (bond) => allAtomIndices.has(bond.atom1) && allAtomIndices.has(bond.atom2)
    );

    validBonds.forEach((bond) => {
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

        // Ligações mais finas para hidrogênio
        const bondRadius =
          atom1.element === "H" || atom2.element === "H" ? 0.1 : 0.2;
        const cylinderGeometry = new THREE.CylinderGeometry(
          bondRadius,
          bondRadius,
          distance * 0.65,
          12
        );
        const material = new THREE.MeshStandardMaterial({
          color: 0xaaaaaa,
          roughness: 0.2,
          metalness: 0.8,
          emissive: 0x333333,
        });
        const cylinder = new THREE.Mesh(cylinderGeometry, material);

        cylinder.position.copy(midpoint);
        cylinder.lookAt(pos2);
        cylinder.rotateX(Math.PI / 2);

        moleculeGroup.add(cylinder);
      }
    });

    setStats({ atoms: allAtoms.length, bonds: validBonds.length });

    // Sempre mostrar a molécula quando a câmera estiver pronta
    moleculeGroup.visible = true;

    let isDragging = false;
    let previousTouch = { x: 0, y: 0 };
    let touchDistance = 0;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        isDragging = true;
        previousTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        rotationVelocityRef.current = { x: 0, y: 0 };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchDistance = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDragging && moleculeGroupRef.current) {
        const deltaX = e.touches[0].clientX - previousTouch.x;
        const deltaY = e.touches[0].clientY - previousTouch.y;

        rotationVelocityRef.current.y = deltaX * 0.015;
        rotationVelocityRef.current.x = deltaY * 0.015;

        moleculeGroupRef.current.rotation.y += rotationVelocityRef.current.y;
        moleculeGroupRef.current.rotation.x += rotationVelocityRef.current.x;

        previousTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDistance = Math.sqrt(dx * dx + dy * dy);
        const deltaDistance = newDistance - touchDistance;

        if (cameraRef.current) {
          cameraRef.current.position.z -= deltaDistance * 0.2;
          cameraRef.current.position.z = Math.max(
            40,
            Math.min(200, cameraRef.current.position.z)
          );
        }

        touchDistance = newDistance;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      isDragging = false;
    };

    const animate = () => {
      requestAnimationFrame(animate);

      if (moleculeGroupRef.current && !isDragging) {
        moleculeGroupRef.current.rotation.y +=
          rotationVelocityRef.current.y * 0.95;
        moleculeGroupRef.current.rotation.x +=
          rotationVelocityRef.current.x * 0.95;

        rotationVelocityRef.current.x *= 0.98;
        rotationVelocityRef.current.y *= 0.98;

        // Rotação automática suave
        moleculeGroupRef.current.rotation.y += 0.002;
      }

      rendererRef.current?.render(scene, camera);
    };
    animate();

    rendererRef.current?.domElement.addEventListener(
      "touchstart",
      onTouchStart
    );
    rendererRef.current?.domElement.addEventListener("touchmove", onTouchMove);
    rendererRef.current?.domElement.addEventListener("touchend", onTouchEnd);

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      rendererRef.current?.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      rendererRef.current?.domElement.removeEventListener(
        "touchstart",
        onTouchStart
      );
      rendererRef.current?.domElement.removeEventListener(
        "touchmove",
        onTouchMove
      );
      rendererRef.current?.domElement.removeEventListener(
        "touchend",
        onTouchEnd
      );
      if (containerRef.current?.contains(rendererRef.current?.domElement!)) {
        containerRef.current?.removeChild(rendererRef.current?.domElement!);
      }
    };
  }, [pdbData, cameraGranted]);

  // Atualizar estado de marcador detectado (sempre verdadeiro quando câmera estiver ativa)
  useEffect(() => {
    if (cameraGranted) {
      setMarkerDetected(true);
    }
  }, [cameraGranted]);

  return (
    <div className="w-screen h-screen relative bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        autoPlay
        muted
      />

      <div ref={containerRef} className="absolute inset-0" />

      {cameraGranted && (
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/70 text-white p-3 rounded-lg font-mono text-xs sm:text-sm z-10">
          <div className="font-bold mb-1">Molécula ATP</div>
          <div>Átomos: {stats.atoms}</div>
          <div>Ligações: {stats.bonds}</div>
        </div>
      )}

      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
        <div
          className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all ${
            cameraGranted
              ? "bg-green-500 shadow-lg shadow-green-500"
              : "bg-red-500"
          }`}
        />
      </div>

      {!cameraGranted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-gray-900 text-white p-6 rounded-lg text-center max-w-sm mx-4">
            <div className="text-4xl mb-3">📹</div>
            <div className="font-bold text-lg mb-2">Permissão de Câmera</div>
            <div className="text-sm mb-4 text-gray-300">
              {cameraError ||
                "Precisamos acessar sua câmera para exibir a molécula em realidade aumentada"}
            </div>
            <button
              onClick={async () => {
                try {
                  setCameraError("");
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
                    await videoRef.current.play();
                    setCameraGranted(true);
                  }
                } catch (error: any) {
                  console.error("Erro na câmera:", error);
                  setCameraError(error?.message || "Erro ao acessar câmera");
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Permitir Câmera
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-center px-4 py-3 rounded-lg text-xs sm:text-sm max-w-xs z-10">
        {cameraGranted ? (
          <>
            <div className="font-bold text-green-400">✅ Molécula visível!</div>
            <div className="text-gray-300 mt-1">
              Arraste para girar • Pinça para zoom
            </div>
          </>
        ) : (
          <>
            <div>Aguardando permissão da câmera</div>
            <div className="text-gray-400 text-xs mt-1">
              Clique no botão acima
            </div>
          </>
        )}
      </div>
    </div>
  );
}
