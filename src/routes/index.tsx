import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Overlay } from "@/components/overlay";
import { WaterCanvas } from "@/components/water-canvas";
import type { WorldHandle } from "@/lib/water/types";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [world, setWorld] = useState<WorldHandle | null>(null);
  const onReady = useCallback((handle: WorldHandle) => {
    setWorld(handle);
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <WaterCanvas onReady={onReady} />
      <Overlay world={world} />
    </main>
  );
}
