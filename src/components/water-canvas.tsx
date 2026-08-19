import { useEffect, useRef } from "react";
import type { WorldHandle } from "@/lib/water/types";

export function WaterCanvas({
  onReady,
}: {
  onReady: (handle: WorldHandle) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let handle: WorldHandle | null = null;

    void import("@/lib/water/world").then(({ WaterWorld }) => {
      if (disposed || !canvasRef.current) return;
      new WaterWorld(canvasRef.current, {
        onReady: (api) => {
          if (disposed) {
            api.dispose();
            return;
          }
          handle = api;
          onReady(api);
        },
      });
    });

    return () => {
      disposed = true;
      handle?.dispose();
    };
  }, [onReady]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none"
      aria-label="Interactive lagoon"
    />
  );
}
