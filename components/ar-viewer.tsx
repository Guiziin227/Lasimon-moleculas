"use client";

import { getAtomConfig } from "@/lib/atom-config";
import { parsePDB } from "@/lib/pdb-parser";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface ARViewerProps {
  pdbData: string;
}

const MARKER_IMAGE_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20tela%202025-06-20%20124759-bRbEioGOryXhjbZQVPYCU4UfStt1Dn.png";

export default function ARViewer({ pdbData }: ARViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const moleculeGroupRef = useRef<THREE.Group | null>(null);
  const [markerDetected, setMarkerDetected] = useState(false);
  const [stats, setStats] = useState({ atoms: 0, bonds: 0 });
  const [cameraGranted, setCameraGranted] = useState(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rotationVelocityRef = useRef({ x: 0, y: 0 });

  const detectMarker = (canvas: HTMLCanvasElement): boolean => {
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let darkPixels = 0;
      let whitePixels = 0;
      const totalPixels = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;

        if (brightness < 50) darkPixels++;
        if (brightness > 200) whitePixels++;
      }

      const darkRatio = darkPixels / totalPixels;
      const whiteRatio = whitePixels / totalPixels;

      return (
        darkRatio > 0.3 && whiteRatio > 0.15 && darkRatio + whiteRatio > 0.5
      );
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              ?.play()
              .catch((err) => console.error("[v0] Play error:", err));
            setCameraGranted(true);
          };
        }
      } catch (error) {
        console.error("[v0] Camera access error:", error);
        setCameraGranted(false);
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

    const heavyAtoms = atoms.filter((atom) => atom.element !== "H");

    const moleculeGroup = new THREE.Group();
    scene.add(moleculeGroup);
    moleculeGroupRef.current = moleculeGroup;
    moleculeGroup.visible = false;

    const SCALE = 0.8;
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);

    heavyAtoms.forEach((atom) => {
      const config = getAtomConfig(atom.element);
      const material = new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: 0.4,
        metalness: 0.6,
      });

      const mesh = new THREE.Mesh(sphereGeometry, material);
      mesh.position.set(atom.x * SCALE, atom.y * SCALE, atom.z * SCALE);
      mesh.scale.set(
        config.radius * 0.35,
        config.radius * 0.35,
        config.radius * 0.35
      );
      moleculeGroup.add(mesh);
    });

    const heavyAtomIndices = new Set(heavyAtoms.map((atom) => atom.index));
    const validBonds = bonds.filter(
      (bond) =>
        heavyAtomIndices.has(bond.atom1) && heavyAtomIndices.has(bond.atom2)
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

        const cylinderGeometry = new THREE.CylinderGeometry(
          0.2,
          0.2,
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

    setStats({ atoms: heavyAtoms.length, bonds: validBonds.length });

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

  useEffect(() => {
    if (!videoRef.current || !detectionCanvasRef.current || !cameraGranted)
      return;

    const detectionCanvas = detectionCanvasRef.current;
    const ctx = detectionCanvas.getContext("2d");
    if (!ctx) return;

    detectionIntervalRef.current = setInterval(() => {
      if (
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        detectionCanvas.width = videoRef.current.videoWidth;
        detectionCanvas.height = videoRef.current.videoHeight;

        ctx.drawImage(
          videoRef.current,
          0,
          0,
          detectionCanvas.width,
          detectionCanvas.height
        );
        const detected = detectMarker(detectionCanvas);
        setMarkerDetected(detected);

        if (moleculeGroupRef.current) {
          moleculeGroupRef.current.visible = detected;
          if (detected) {
            moleculeGroupRef.current.rotation.y += 0.002;
          }
        }
      }
    }, 100);

    return () => {
      if (detectionIntervalRef.current)
        clearInterval(detectionIntervalRef.current);
    };
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

      <canvas ref={detectionCanvasRef} className="hidden" />

      <div ref={containerRef} className="absolute inset-0" />

      {markerDetected && (
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/70 text-white p-3 rounded-lg font-mono text-xs sm:text-sm z-10">
          <div className="font-bold mb-1">Molécula ATP</div>
          <div>Átomos: {stats.atoms}</div>
          <div>Ligações: {stats.bonds}</div>
        </div>
      )}

      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
        <div
          className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all ${
            markerDetected
              ? "bg-green-500 shadow-lg shadow-green-500"
              : "bg-red-500"
          }`}
        />
      </div>

      {!cameraGranted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-gray-900 text-white p-6 rounded-lg text-center max-w-xs">
            <div className="font-bold mb-2">Permissão de Câmera</div>
            <div className="text-sm mb-4">
              Clique em permitir para usar a câmera
            </div>
            <button
              onClick={async () => {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                    audio: false,
                  });
                  if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setCameraGranted(true);
                  }
                } catch (error) {
                  console.error("[v0] Camera error:", error);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium"
            >
              Permitir Câmera
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-center px-4 py-3 rounded-lg text-xs sm:text-sm max-w-xs z-10">
        {markerDetected ? (
          <>
            <div className="font-bold text-green-400">Marcador detectado!</div>
            <div className="text-gray-300 mt-1">
              Arraste para girar • Pinça para zoom
            </div>
          </>
        ) : (
          <>
            <div>Posicione o marcador na câmera</div>
            <div className="text-gray-400 text-xs mt-1">
              Aguardando detecção...
            </div>
          </>
        )}
      </div>
    </div>
  );
}
