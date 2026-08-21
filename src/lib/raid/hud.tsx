import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { NeonRaid } from "./game";
import type { HudSnap } from "./game";
import { HideoutPanel, HotbarBar, InvGhost, RunInventory, ShopPanel, useInventoryPointer } from "./inventory";

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="h-9 w-9 animate-pulse rounded-full bg-surface" />;
  return user ? (
    <UserButton />
  ) : (
    <Link
      to="/login"
      className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-3 text-xs font-medium text-muted"
    >
      Sign in
    </Link>
  );
}

export function RaidHud({ game }: { game: NeonRaid | null }) {
  const [hud, setHud] = useState<HudSnap | null>(game?.snap() ?? null);
  useInventoryPointer(game);
  useEffect(() => {
    if (!game) return;
    return game.onHud(setHud);
  }, [game]);

  if (!hud || !game) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex items-end p-6">
        <p className="font-display text-4xl text-fg">NEON RAID</p>
      </div>
    );
  }

  const chrome = (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-40 px-2 sm:bottom-3">
      <div className="mx-auto w-max max-w-full rounded-lg border border-border bg-bg/90 p-1.5 shadow-lg backdrop-blur-sm">
        <HotbarBar hud={hud} game={game} />
      </div>
    </div>
  );

  if (hud.phase === "hideout") {
    return (
      <>
        <div className="pointer-events-auto absolute right-4 top-4 z-50">
          <AuthSlot />
        </div>
        <HideoutPanel hud={hud} game={game} />
        {chrome}
        <InvGhost game={game} />
      </>
    );
  }

  if (hud.phase === "dead") {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-bg/55 p-6">
        <div className="max-w-sm text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-magenta">Signal lost</p>
          <p className="mt-2 font-display text-4xl text-fg">Flatlined</p>
          <p className="mt-3 text-muted">
            Raid loot dumped. Vault is intact. {hud.score} pts died on the street.
          </p>
          <button
            type="button"
            className="pointer-events-auto mt-6 h-11 rounded-full bg-cyan px-6 text-sm font-semibold text-cyan-fg"
            onClick={() => game.goHideout()}
          >
            Return to hideout
          </button>
        </div>
      </div>
    );
  }

  if (hud.phase === "extracted") {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-bg/55 p-6">
        <div className="max-w-sm text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-cyan">Clean extract</p>
          <p className="mt-2 font-display text-4xl text-fg">Banked</p>
          <p className="mt-3 text-muted">
            Loot in the vault. {hud.credits} pts on the books. Level {hud.level}.
          </p>
          {hud.leveled && <p className="mt-2 text-sm text-cyan">Level up.</p>}
          <button
            type="button"
            className="pointer-events-auto mt-6 h-11 rounded-full bg-cyan px-6 text-sm font-semibold text-cyan-fg"
            onClick={() => game.goHideout()}
          >
            Hideout
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 sm:p-5">
        <div>
          <div className="flex gap-1">
            {Array.from({ length: hud.hpMax }).map((_, i) => (
              <span key={i} className={`block h-2.5 w-5 rounded-sm ${i < hud.hp ? "bg-cyan" : "bg-surface"}`} />
            ))}
          </div>
          {hud.armorMax > 0 && (
            <div className="mt-1 flex gap-1">
              {Array.from({ length: hud.armorMax }).map((_, i) => (
                <span key={i} className={`block h-1.5 w-5 rounded-sm ${i < hud.armorHp ? "bg-magenta" : "bg-surface"}`} />
              ))}
            </div>
          )}
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-muted">
            {hud.score.toString().padStart(6, "0")}
            {hud.combo > 1 ? `  ×${hud.combo}` : ""}
            {hud.lootValue > 0 ? `  loot ${hud.lootValue}` : ""}
          </p>
          <div className="mt-2 h-1 w-36 overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-magenta" style={{ width: `${Math.min(100, (hud.xp / hud.xpNext) * 100)}%` }} />
          </div>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle">
          Lv {hud.level} · {hud.district}
        </p>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-3 z-20 w-[min(420px,70vw)] -translate-x-1/2 sm:top-5">
        <p className="text-center text-[10px] uppercase tracking-[0.22em] text-cyan">{hud.missionTitle}</p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
          <div
            className={`h-full ${hud.missionDone ? "bg-cyan" : "bg-magenta"}`}
            style={{ width: `${Math.min(100, (hud.missionCur / Math.max(1, hud.missionTarget)) * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-center font-mono text-[11px] text-muted">
          {hud.missionLabel} {hud.missionCur}/{hud.missionTarget}
          {hud.missionDone ? " · extract ready" : ""}
        </p>
      </div>

      {hud.briefing && (
        <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-bg/75 p-4">
          <div className="w-full max-w-lg rounded-lg border border-cyan bg-surface p-6 shadow-lg">
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan">{hud.district} · Level {hud.level}</p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-display text-fg">{hud.missionTitle}</p>
            <p className="mt-3 text-base text-fg">{hud.missionBrief}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{hud.missionHow}</p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">
              WEP mouse-fires · 1–4 stims/nades · ARM soaks hits
            </p>
            <button
              type="button"
              className="mt-5 h-11 rounded-full bg-cyan px-6 text-sm font-semibold text-cyan-fg"
              onClick={() => game.dismissBriefing()}
            >
              Deploy
            </button>
            <p className="mt-2 text-[11px] text-subtle">Click, Space, or WASD also starts the raid.</p>
          </div>
        </div>
      )}
      {hud.prompt && !hud.briefing && (
        <p className="pointer-events-none absolute bottom-32 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border bg-bg/70 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-cyan">
          {hud.prompt}
        </p>
      )}

      {chrome}

      {hud.modal === "inv" && <RunInventory hud={hud} game={game} />}
      {hud.modal === "shop" && <ShopPanel hud={hud} game={game} />}
      <InvGhost game={game} />
      <TouchPad game={game} prompt={hud.prompt} />
    </>
  );
}

function TouchPad({ game, prompt }: { game: NeonRaid | null; prompt: string }) {
  const moveRef = useRef<HTMLDivElement>(null);
  if (!game) return null;
  const aim = (e: { clientX: number }, el: HTMLDivElement) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    game.setStick(x * 2 - 1);
  };
  return (
    <div className="pointer-events-none absolute inset-0 z-30 sm:hidden">
      <div
        ref={moveRef}
        className="pointer-events-auto absolute bottom-4 left-4 h-28 w-36 rounded-2xl border border-border bg-surface/60"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          aim(e, moveRef.current!);
        }}
        onPointerMove={(e) => {
          if (e.buttons) aim(e, moveRef.current!);
        }}
        onPointerUp={() => game.setStick(0)}
        onPointerCancel={() => game.setStick(0)}
      />
      <div className="pointer-events-auto absolute bottom-4 right-4 flex gap-2">
        {prompt && (
          <button
            type="button"
            className="h-16 w-16 rounded-full border border-cyan bg-surface/80 text-[11px] font-semibold uppercase tracking-wide text-cyan"
            onPointerDown={() => game.setInteract(true)}
            onPointerUp={() => game.setInteract(false)}
            onPointerCancel={() => game.setInteract(false)}
          >
            Use
          </button>
        )}
        <button
          type="button"
          className="h-16 w-16 rounded-full border border-border bg-surface/80 text-[11px] font-semibold uppercase tracking-wide text-fg"
          onPointerDown={() => game.setJump(true, true)}
          onPointerUp={() => game.setJump(false)}
          onPointerCancel={() => game.setJump(false)}
        >
          Jump
        </button>
        <button
          type="button"
          className="h-16 w-16 rounded-full bg-cyan text-[11px] font-semibold uppercase tracking-wide text-cyan-fg"
          onPointerDown={() => game.setShoot(true)}
          onPointerUp={() => game.setShoot(false)}
          onPointerCancel={() => game.setShoot(false)}
        >
          Fire
        </button>
      </div>
    </div>
  );
}


