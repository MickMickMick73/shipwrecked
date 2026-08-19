import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CloudRain, Pause, Play, RotateCcw, User, Wind } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { WorldHandle } from "@/lib/water/types";

export function Overlay({ world }: { world: WorldHandle | null }) {
  const [paused, setPaused] = useState(false);
  const [rain, setRain] = useState(false);
  const [wind, setWind] = useState(true);
  const { isPending } = useCurrentUserState();

  useEffect(() => {
    world?.setPaused(paused);
  }, [world, paused]);
  useEffect(() => {
    world?.setRain(rain);
  }, [world, rain]);
  useEffect(() => {
    world?.setWind(wind);
  }, [world, wind]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-fg">
      <header className="flex items-start justify-between gap-4 p-4 sm:p-6">
        <div className="max-w-sm">
          <p className="font-display text-3xl font-medium tracking-display text-fg sm:text-4xl">
            Lagoon
          </p>
          <p className="mt-1 max-w-[16rem] text-sm leading-snug text-muted sm:max-w-none">
            Draw on the water. Drag the glass sphere. Drag the sky to look around.
          </p>
        </div>
        <div className="pointer-events-auto">
          {isPending ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-fg/10" />
          ) : (
            <>
              <SignedIn>
                <div className="rounded-xl border border-border bg-bg/55 px-3 py-2 backdrop-blur-sm [&_button]:text-muted [&_span]:text-fg">
                  <UserButton />
                </div>
              </SignedIn>
              <SignedOut>
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-bg/55 px-4 text-sm font-medium text-fg backdrop-blur-sm transition-opacity duration-(--motion-quick) hover:opacity-90"
                >
                  <User className="size-4" strokeWidth={1.75} />
                  Sign in
                </Link>
              </SignedOut>
            </>
          )}
        </div>
      </header>

      <div className="pointer-events-auto absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2 sm:bottom-6 sm:left-6 sm:right-auto">
        <Toggle pressed={rain} onClick={() => setRain((v) => !v)} label="Rain">
          <CloudRain className="size-4" strokeWidth={1.75} />
        </Toggle>
        <Toggle pressed={wind} onClick={() => setWind((v) => !v)} label="Wind">
          <Wind className="size-4" strokeWidth={1.75} />
        </Toggle>
        <Toggle pressed={paused} onClick={() => setPaused((v) => !v)} label={paused ? "Paused" : "Pause"}>
          {paused ? <Play className="size-4" strokeWidth={1.75} /> : <Pause className="size-4" strokeWidth={1.75} />}
        </Toggle>
        <button
          type="button"
          onClick={() => world?.reset()}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-bg/55 px-4 text-sm font-medium text-fg backdrop-blur-sm transition-opacity duration-(--motion-quick) hover:opacity-90"
        >
          <RotateCcw className="size-4" strokeWidth={1.75} />
          Reset
        </button>
      </div>

      <p className="absolute bottom-4 right-4 hidden max-w-[14rem] text-right text-xs leading-relaxed text-subtle sm:block sm:bottom-6 sm:right-6">
        Space pause · R rain · N wind · G gravity · hold L to aim the sun
      </p>
    </div>
  );
}

function Toggle({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={
        "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium backdrop-blur-sm transition-[background,opacity,border-color] duration-(--motion-quick) " +
        (pressed
          ? "border-border-strong bg-fg text-accent-fg"
          : "border-border bg-bg/55 text-fg hover:opacity-90")
      }
    >
      {children}
      {label}
    </button>
  );
}
