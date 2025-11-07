"use client";

import { useRef, useState } from "react";
import { ARMoleculeRenderer } from "./ar-molecule-renderer";
import { ARStatusOverlay } from "./ar-status-overlay";
import { ARWelcomeScreen } from "./ar-welcome-screen";

type ARStatus =
  | "idle"
  | "requesting-camera"
  | "loading"
  | "scanning"
  | "found"
  | "error";

export function ARMoleculeViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ARStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [mindARLoaded, setMindARLoaded] = useState(true); // Simplificado para true
  const handleStartAR = () => {
    setStatus("requesting-camera");
  };

  const handleStatusChange = (newStatus: ARStatus) => {
    setStatus(newStatus);
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ position: "relative" }}
      />

      {status === "idle" && (
        <ARWelcomeScreen
          mindARLoaded={mindARLoaded}
          onStartAR={handleStartAR}
        />
      )}

      <ARStatusOverlay status={status} errorMessage={errorMessage} />

      <ARMoleculeRenderer
        containerRef={containerRef}
        status={status}
        mindARLoaded={mindARLoaded}
        onStatusChange={handleStatusChange}
        onError={handleError}
      />
    </div>
  );
}
