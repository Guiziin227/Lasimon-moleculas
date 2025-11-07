"use client";

import { useEffect } from "react";

export function MindARScriptLoader() {
  useEffect(() => {
    // Verificar se o script já foi carregado
    const existingScript = document.querySelector(
      'script[src*="mindar-image-three"]'
    );
    if (existingScript) {
      console.log("[MindAR] Script já está presente no DOM");
      return;
    }

    // Criar e adicionar o script dinamicamente como módulo
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js";
    script.type = "module"; // IMPORTANTE: Carregar como módulo ES
    script.async = true;

    script.onload = () => {
      console.log("[MindAR] Script carregado com sucesso via CDN");
      // Aguardar um pouco para o MindAR estar disponível
      setTimeout(() => {
        // @ts-ignore
        if (window.MINDAR) {
          console.log("[MindAR] Biblioteca disponível globalmente");
        } else {
          console.warn(
            "[MindAR] Script carregou mas MINDAR não está no window"
          );
        }
      }, 100);
    };

    script.onerror = () => {
      console.error("[MindAR] Erro ao carregar script do CDN");
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: remover script ao desmontar (opcional)
      // document.head.removeChild(script);
    };
  }, []);

  return null; // Este componente não renderiza nada visualmente
}
