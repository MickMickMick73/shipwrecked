import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RaidCanvas } from "@/components/raid-canvas";
import { RaidHud } from "@/lib/raid/hud";
import type { NeonRaid } from "@/lib/raid/game";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [game, setGame] = useState<NeonRaid | null>(null);
  const onReady = useCallback((g: NeonRaid) => setGame(g), []);
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <RaidCanvas onReady={onReady} />
      <RaidHud game={game} />
    </main>
  );
}
