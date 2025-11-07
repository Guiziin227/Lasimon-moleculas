import { Button } from "./ui/Button";

interface ARWelcomeScreenProps {
  mindARLoaded: boolean;
  onStartAR: () => void;
}

export function ARWelcomeScreen({
  mindARLoaded,
  onStartAR,
}: ARWelcomeScreenProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 bg-blue-900/70 backdrop-blur-sm p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Visualizador Molecular AR
          </h1>
          <p className="text-white/80 mb-6">
            Veja a molécula de ATP em 3D com sua câmera
          </p>
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
          onClick={onStartAR}
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
  );
}
