type ARStatus =
  | "idle"
  | "requesting-camera"
  | "loading"
  | "scanning"
  | "found"
  | "error";

interface ARStatusOverlayProps {
  status: ARStatus;
  errorMessage?: string;
}

export function ARStatusOverlay({
  status,
  errorMessage,
}: ARStatusOverlayProps) {
  if (status === "idle") return null;

  return (
    <>
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
    </>
  );
}
