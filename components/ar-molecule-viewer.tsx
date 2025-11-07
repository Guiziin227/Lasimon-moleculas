"use client";

import { ATP_PDB_DATA } from "@/lib/atp-data";
import { createMoleculeFromPDB, parsePDB } from "@/lib/pdb-parser";
import { useEffect, useRef, useState } from "react";
import type { Camera, Group, Scene, WebGLRenderer } from "three";

import { Button } from "./ui/Button";

type ThreeLib = typeof import("three");

export function ARMoleculeViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    "idle" | "requesting-camera" | "loading" | "scanning" | "found" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [mindARLoaded, setMindARLoaded] = useState(false);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const moleculeRef = useRef<Group | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const touchStartRef = useRef<{
    x: number;
    y: number;
    distance: number;
  } | null>(null);
  const rotationRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scaleRef = useRef<number>(1);
  const markerDetectedRef = useRef<boolean>(false);
  const mindARRef = useRef<any>(null);
  const anchorRef = useRef<any>(null);
  const MindARThreeRef = useRef<any>(null);
  const threeLibRef = useRef<ThreeLib | null>(null);

  // Carregar MindAR dinamicamente
  useEffect(() => {
    const loadMindAR = async () => {
      try {
        console.log("[AR] Carregando MindAR via import map...");

        // Usar eval para importar do import map (workaround para Next.js)
        const module = await eval('import("mindar-image-three")');
        const threeModule = (await eval('import("three")')) as ThreeLib;

        MindARThreeRef.current = module.MindARThree;
        threeLibRef.current = threeModule;

        setMindARLoaded(true);
        console.log("[AR] MindAR carregado com sucesso!");
      } catch (error) {
        console.error("[AR] Erro ao carregar MindAR:", error);
        setErrorMessage("Erro ao carregar MindAR. Verifique sua conexão.");
      }
    };

    loadMindAR();
  }, []);

  const stopAR = () => {
    console.log("[AR] Parando AR...");

    // Parar animação
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Parar MindAR
    if (mindARRef.current) {
      try {
        mindARRef.current.stop();
        console.log("[AR] MindAR parado");
      } catch (error) {
        console.error("[AR] Erro ao parar MindAR:", error);
      }
    }

    // Parar TODAS as tracks de vídeo para liberar a câmera
    if (containerRef.current) {
      const videos = containerRef.current.querySelectorAll("video");
      videos.forEach((video) => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach((track) => {
            track.stop();
            console.log("[AR] Câmera liberada:", track.label);
          });
          video.srcObject = null;
        }
      });
    }

    // Limpar container
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    setStatus("idle");
    console.log("[AR] AR parado e câmera liberada!");
  };

  const startAR = async () => {
    try {
      setStatus("requesting-camera");
      console.log("[AR] Iniciando processo de AR...");

      if (!containerRef.current) {
        throw new Error("Container não encontrado");
      }

      if (!MindARThreeRef.current) {
        console.error("[AR] MindAR não está carregado");
        throw new Error(
          "MindAR ainda não foi carregado. Aguarde alguns segundos e tente novamente."
        );
      }

      console.log("[AR] MindAR disponível, iniciando configuração...");

      setStatus("loading");
      console.log("[AR] Criando instância do MindAR...");

      // Verificar se o arquivo targets.mind existe
      try {
        const response = await fetch("/targets.mind");
        if (!response.ok) {
          throw new Error(
            `Arquivo targets.mind não encontrado (HTTP ${response.status})`
          );
        }
        const blob = await response.blob();
        console.log(
          "[AR] Arquivo targets.mind encontrado, tamanho:",
          blob.size,
          "bytes"
        );

        if (blob.size < 100) {
          throw new Error("Arquivo targets.mind muito pequeno ou corrompido");
        }
      } catch (error) {
        console.error("[AR] Erro ao verificar targets.mind:", error);
        throw new Error(
          "Arquivo targets.mind não encontrado ou inacessível. " +
            "Certifique-se de que o arquivo está em public/targets.mind"
        );
      }

      // Inicializar MindAR com configuração
      const mindarThree = new MindARThreeRef.current({
        container: containerRef.current,
        imageTargetSrc: "/targets.mind",
      });

      console.log("[AR] Instância MindAR criada");

      mindARRef.current = mindarThree;
      console.log("[AR] MindAR inicializado");

      const { renderer, scene, camera } = mindarThree;
      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;

      const threeLib = threeLibRef.current;

      if (!threeLib) {
        throw new Error(
          "Three.js não foi carregado via import map. Recarregue a página e tente novamente."
        );
      }

      console.log("[AR] Three.js revision:", threeLib.REVISION);

      console.log("[AR] Renderer, Scene e Camera configurados");

      // Criar âncora para a molécula
      const anchor = mindarThree.addAnchor(0);
      anchorRef.current = anchor;

      console.log("[AR] Âncora criada, group.visible:", anchor.group.visible);

      // Criar molécula
      const pdbData = parsePDB(ATP_PDB_DATA);
      const molecule = createMoleculeFromPDB(pdbData, threeLib);

      console.log("[AR] Molécula criada, children:", molecule.children.length);

      // Ajustar tamanho da molécula para visualização em AR
      molecule.scale.set(0.2, 0.2, 0.2);
      molecule.position.set(0, 0, 0);

      // Molécula começa visível (MindAR controla visibilidade automaticamente)
      molecule.visible = true;

      // Forçar visibilidade de cada átomo
      molecule.traverse((child: any) => {
        child.visible = true;
        if (child.material) {
          child.material.visible = true;
        }
      });

      anchor.group.add(molecule);
      moleculeRef.current = molecule;

      console.log("[AR] Molécula adicionada à âncora");
      console.log("[AR] Âncora group children:", anchor.group.children.length);
      console.log(
        "[AR] Âncora group.visible após adicionar molécula:",
        anchor.group.visible
      );

      // Iluminação FORTE para ver bem a molécula
      const ambientLight = new threeLib.AmbientLight(0xffffff, 1.2); // Aumentado de 0.8 para 1.2
      scene.add(ambientLight);

      const directionalLight = new threeLib.DirectionalLight(0xffffff, 1.0); // Aumentado de 0.6 para 1.0
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      // Adicionar luz adicional de trás
      const backLight = new threeLib.DirectionalLight(0xffffff, 0.5);
      backLight.position.set(-1, -1, -1);
      scene.add(backLight);

      // Configurar eventos de detecção do marcador
      anchor.onTargetFound = () => {
        console.log("[AR] Marcador detectado!");
        markerDetectedRef.current = true;
        setStatus("found");

        if (moleculeRef.current) {
          console.log("[AR] Molécula está presente e deve aparecer");
          console.log("[AR] Molécula visível:", moleculeRef.current.visible);
          console.log(
            "[AR] Molécula children:",
            moleculeRef.current.children.length
          );
          console.log("[AR] Molécula position:", moleculeRef.current.position);
          console.log("[AR] Molécula scale:", moleculeRef.current.scale);
          console.log("[AR] Anchor group visible:", anchor.group.visible);
          console.log(
            "[AR] Anchor group children:",
            anchor.group.children.length
          );
          console.log("[AR] Anchor group position:", anchor.group.position);
          console.log("[AR] Anchor group matrix:", anchor.group.matrix);

          // Verificar câmera
          if (cameraRef.current) {
            console.log("[AR] Camera position:", cameraRef.current.position);
            console.log("[AR] Camera rotation:", cameraRef.current.rotation);
          }

          // Verificar renderizador
          if (rendererRef.current) {
            console.log("[AR] Renderer info:", rendererRef.current.info.render);
            console.log(
              "[AR] Renderer autoClear:",
              rendererRef.current.autoClear
            );
          }

          // Verificar cada átomo
          moleculeRef.current.children.forEach((child, i) => {
            if (i < 5) {
              // Mostrar apenas os primeiros 5
              console.log(`[AR] Átomo ${i}:`, {
                visible: child.visible,
                type: child.type,
                material: (child as any).material?.visible,
              });
            }
          });
        }
      };

      anchor.onTargetLost = () => {
        console.log("[AR] Marcador perdido");
        markerDetectedRef.current = false;
        setStatus("scanning");
      };

      setStatus("scanning");
      console.log("[AR] Iniciando detecção de marcador...");

      // Iniciar MindAR
      try {
        console.log("[AR] Chamando mindarThree.start()...");
        console.log("[AR] Arquivo de marcador:", "/targets.mind");

        await mindarThree.start().catch((err: any) => {
          console.error("[AR] Erro interno do mindarThree.start():", err);
          console.error("[AR] Tipo do erro:", typeof err);
          console.error("[AR] Nome do erro:", err?.name);
          console.error("[AR] Mensagem do erro:", err?.message);
          console.error("[AR] Stack:", err?.stack);

          const normalizedError =
            err instanceof Error
              ? err
              : err && typeof err === "object" && "message" in err
              ? (err as Error)
              : new Error(
                  "MindAR.start() falhou sem detalhes. Verifique permissões e uso da câmera."
                );

          throw normalizedError;
        });

        console.log(
          "[AR] MindAR.start() completou - câmera ativa e pronta para detectar marcador"
        );

        // Verificar se o canvas foi criado
        const canvas = renderer.domElement;
        console.log("[AR] Canvas criado:", canvas.width, "x", canvas.height);
        console.log("[AR] Canvas parent:", canvas.parentElement);

        // Verificar se há vídeo
        const video = containerRef.current?.querySelector("video");
        if (video) {
          console.log(
            "[AR] Elemento de vídeo encontrado:",
            video.videoWidth,
            "x",
            video.videoHeight
          );
          console.log("[AR] Vídeo está tocando:", !video.paused);

          // Forçar vídeo a ficar visível e atrás do canvas
          video.style.position = "absolute";
          video.style.top = "0";
          video.style.left = "0";
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.objectFit = "cover";
          video.style.zIndex = "1";

          console.log("[AR] Estilos de vídeo aplicados");
        } else {
          console.warn("[AR] Nenhum elemento de vídeo encontrado!");
        }

        // Garantir que o canvas fique transparente por cima do vídeo
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.zIndex = "10";

        console.log("[AR] Estilos de canvas aplicados");

        console.log("[AR] Inicialização completa!");

        // CRÍTICO: Iniciar o loop de renderização do MindAR manualmente
        console.log("[AR] Iniciando loop de renderização MindAR...");

        const renderLoop = () => {
          animationIdRef.current = requestAnimationFrame(renderLoop);

          // Rotacionar molécula quando marcador detectado
          if (moleculeRef.current && markerDetectedRef.current) {
            moleculeRef.current.rotation.y += 0.01;
          }

          // Renderizar usando MindAR
          renderer.render(scene, camera);
        };

        renderLoop();
        console.log("[AR] Loop de renderização ativo!");
      } catch (error) {
        console.error("[AR] Erro ao iniciar MindAR:", error);

        // Verificar se é erro de câmera
        if (error instanceof Error) {
          // Erro de permissão negada
          if (error.name === "NotAllowedError") {
            throw new Error(
              "PERMISSÃO NEGADA!\n\n" +
                "A câmera foi bloqueada.\n\n" +
                "SOLUÇÃO:\n" +
                "1. Clique no ícone de cadeado/câmera na barra de endereço\n" +
                "2. Selecione 'Permitir' para câmera\n" +
                "3. Recarregue a página"
            );
          }

          // Erro de dispositivo em uso
          if (
            error.name === "NotReadableError" ||
            error.message?.includes("Device in use") ||
            error.message?.includes("allocate videosource")
          ) {
            throw new Error(
              "CÂMERA EM USO!\n\n" +
                "A câmera está sendo usada por outro aplicativo.\n\n" +
                "SOLUÇÕES:\n" +
                "1. Feche outras abas do navegador usando a câmera\n" +
                "2. Feche apps como Zoom, Teams, Skype, Discord\n" +
                "3. Feche o navegador completamente e reabra\n" +
                "4. Se persistir, reinicie o computador\n\n" +
                "Apenas um aplicativo pode usar a câmera por vez"
            );
          }

          if (error.message) {
            throw error;
          }
        }

        throw new Error(
          "ERRO: O arquivo targets.mind está corrompido ou inválido!\n\n" +
            "SOLUÇÃO:\n" +
            "1. Acesse: https://hiukim.github.io/mind-ar-js-doc/tools/compile\n" +
            "2. Faça upload da sua imagem marcadora\n" +
            "3. Clique em 'Start' para compilar\n" +
            "4. Baixe o arquivo 'targets.mind'\n" +
            "5. Renomeie o arquivo para 'targets.mind' se necessário\n" +
            "6. Substitua o arquivo em public/targets.mind\n\n" +
            "A imagem deve ter bom contraste e detalhes distintos."
        );
      }

      // Loop de renderização já foi iniciado acima após mindarThree.start()
      // Event listeners para interações touch no canvas
      const canvas = renderer.domElement;

      const handleTouchStart = (e: TouchEvent) => {
        if (!markerDetectedRef.current) return;
        e.preventDefault();

        if (e.touches.length === 1) {
          // Toque único para rotação
          touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            distance: 0,
          };
        } else if (e.touches.length === 2) {
          // Dois dedos para zoom
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          touchStartRef.current = {
            x: 0,
            y: 0,
            distance: Math.sqrt(dx * dx + dy * dy),
          };
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!markerDetectedRef.current || !touchStartRef.current) return;
        e.preventDefault();

        if (e.touches.length === 1 && touchStartRef.current.distance === 0) {
          // Rotação com toque único
          const deltaX = e.touches[0].clientX - touchStartRef.current.x;
          const deltaY = e.touches[0].clientY - touchStartRef.current.y;

          rotationRef.current.y += deltaX * 0.01;
          rotationRef.current.x += deltaY * 0.01;

          // Limitar rotação X
          rotationRef.current.x = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, rotationRef.current.x)
          );

          touchStartRef.current.x = e.touches[0].clientX;
          touchStartRef.current.y = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          // Zoom com pinça
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const scale = distance / touchStartRef.current.distance;
          scaleRef.current *= scale;

          // Limitar escala
          scaleRef.current = Math.max(0.5, Math.min(3, scaleRef.current));

          touchStartRef.current.distance = distance;
        }
      };

      const handleTouchEnd = () => {
        touchStartRef.current = null;
      };

      canvas.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });
      canvas.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      canvas.addEventListener("touchend", handleTouchEnd);

      // Comentado temporariamente - MindAR gerencia o resize automaticamente
      // const handleResize = () => {
      //   if (cameraRef.current && rendererRef.current) {
      //     const camera = cameraRef.current as THREE.PerspectiveCamera;
      //     camera.aspect = window.innerWidth / window.innerHeight;
      //     camera.updateProjectionMatrix();
      //     rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      //   }
      // };
      // window.addEventListener("resize", handleResize);
    } catch (err) {
      console.error("[AR] Erro ao inicializar AR:", err);
      setErrorMessage(
        `Erro: ${err instanceof Error ? err.message : String(err)}`
      );
      setStatus("error");
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup completo para liberar a câmera
      console.log("[AR] Limpando recursos...");

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
        console.log("[AR] Animação cancelada");
      }

      if (mindARRef.current) {
        try {
          mindARRef.current.stop();
          console.log("[AR] MindAR parado");
        } catch (error) {
          console.error("[AR] Erro ao parar MindAR:", error);
        }
        mindARRef.current = null;
      }

      // Parar todas as tracks de vídeo para liberar a câmera
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log("[AR] Track de vídeo parada:", track.kind);
        });
        videoRef.current.srcObject = null;
      }

      // Procurar e parar TODOS os elementos de vídeo no container
      if (containerRef.current) {
        const videos = containerRef.current.querySelectorAll("video");
        videos.forEach((video) => {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((track) => {
              track.stop();
              console.log("[AR] Track adicional parada:", track.kind);
            });
            video.srcObject = null;
          }
        });
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
        console.log("[AR] Renderer descartado");
      }

      console.log("[AR] Limpeza completa!");
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ position: "relative" }}
      />
      {status === "idle" && (
        <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-blue-900 to-purple-900 p-4">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">
                Visualizador Molecular AR
              </h1>
              <p className="text-white/80 mb-6">
                Veja a molécula de ATP em 3D com sua câmera
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6 text-white text-sm text-left">
              <p className="font-semibold mb-2">Instruções:</p>
              <ol className="space-y-1 text-white/80">
                <li>1. Clique em "Iniciar AR" abaixo</li>
                <li>2. Permita o acesso à câmera</li>
                <li>3. Aponte para o marcador impresso</li>
                <li>4. A molécula aparecerá em 3D</li>
                <li>5. Use 1 dedo para girar, 2 dedos para zoom</li>
              </ol>
            </div>

            {!mindARLoaded && (
              <div className="bg-yellow-500/20 backdrop-blur-sm rounded-lg p-3 mb-4 text-yellow-200 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-200 border-t-transparent" />
                  <span>Carregando MindAR...</span>
                </div>
                <p className="text-xs mt-2 text-yellow-300/80">
                  Se demorar muito, verifique sua conexão
                </p>
              </div>
            )}

            {mindARLoaded && (
              <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-3 mb-4 text-green-200 text-sm text-center">
                MindAR pronto!
              </div>
            )}

            <Button
              onClick={startAR}
              size="lg"
              disabled={!mindARLoaded}
              className="w-full bg-white text-blue-900 hover:bg-white/90 font-semibold mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mindARLoaded ? "Iniciar AR" : "Aguardando MindAR..."}
            </Button>

            <a
              href="/LOGO.png"
              download
              className="text-white/80 text-sm underline hover:text-white"
            >
              Baixar marcador para impressão
            </a>
          </div>
        </div>
      )}
      {/* Status overlay */}
      {(status === "requesting-camera" ||
        status === "loading" ||
        status === "scanning" ||
        status === "found") && (
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-3">
            {status === "requesting-camera" && (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Solicitando acesso à câmera...</span>
              </div>
            )}
            {status === "loading" && (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Iniciando AR...</span>
              </div>
            )}
            {status === "scanning" && (
              <div>
                <p className="font-semibold">Procurando marcador...</p>
                <p className="text-sm text-white/80 mt-1">
                  Aponte a câmera para o marcador impresso
                </p>
              </div>
            )}
            {status === "found" && (
              <div>
                <p className="font-semibold">Molécula de ATP</p>
                <p className="text-sm text-white/80 mt-1">
                  Adenosina Trifosfato
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Error overlay */}
      {status === "error" && (
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="bg-red-600/90 backdrop-blur-sm text-white px-4 py-3">
            <p className="font-semibold">Erro</p>
            <p className="text-sm mt-1 whitespace-pre-line">{errorMessage}</p>
          </div>
        </div>
      )}
      {/* Instructions */}
      {status === "found" && (
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none z-10">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-sm max-w-md mx-auto">
            <p className="font-semibold mb-2">Controles:</p>
            <p className="text-white/80 text-xs">
              - 1 dedo: Girar molécula
              <br />- 2 dedos (pinça): Zoom in/out
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
