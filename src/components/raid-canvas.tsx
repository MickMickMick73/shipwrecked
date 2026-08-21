import { useEffect, useRef } from "react";
import { NeonRaid } from "@/lib/raid/game";

export function RaidCanvas({
  onReady,
}: {
  onReady: (game: NeonRaid) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const fit = () => {
      const w = parent?.clientWidth ?? window.innerWidth;
      const h = parent?.clientHeight ?? window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    fit();
    const game = new NeonRaid(canvas);
    (window as unknown as { __raid?: NeonRaid }).__raid = game;
    void game.boot().then(() => onReady(game));
    const ro = new ResizeObserver(fit);
    if (parent) ro.observe(parent);
    window.addEventListener("resize", fit);
    return () => {
      game.destroy();
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [onReady]);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 h-full w-full touch-none bg-bg"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
