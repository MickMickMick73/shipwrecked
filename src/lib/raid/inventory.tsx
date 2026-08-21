import { useEffect, useRef, useState } from "react";
import { CON_N, HIDEOUT_STOCK, item, RARITY_TINT, type InvSlot } from "./items";
import type { BagId, HudSnap, NeonRaid } from "./game";

export function ItemIcon({ defId, className = "" }: { defId: string; className?: string }) {
  const d = item(defId);
  return (
    <img src={d.icon} alt={d.name} draggable={false} className={`pointer-events-none select-none object-contain ${className}`} />
  );
}

function slotEl(t: EventTarget | null): HTMLElement | null {
  return (t instanceof Element ? t : null)?.closest("[data-inv-slot]") as HTMLElement | null;
}

export function useInventoryPointer(game: NeonRaid | null) {
  useEffect(() => {
    if (!game) return;
    let start: { x: number; y: number; bag: BagId; index: number } | null = null;
    let moved = false;

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = slotEl(e.target);
      if (!el?.dataset.bag || el.dataset.index == null) return;
      const bag = el.dataset.bag as BagId;
      const index = Number(el.dataset.index);
      if (game.drag) {
        game.dropTo(bag, index);
        start = null;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      start = { x: e.clientX, y: e.clientY, bag, index };
      moved = false;
      if (bag !== "consumable" && game.bagOf(bag)[index]) game.beginDrag(bag, index);
    };

    const move = (e: PointerEvent) => {
      if (!start) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
        moved = true;
        if (!game.drag && game.bagOf(start.bag)[start.index]) game.beginDrag(start.bag, start.index);
      }
      const ghost = document.getElementById("inv-ghost");
      if (ghost && game.drag) {
        ghost.style.transform = `translate(${e.clientX - 22}px, ${e.clientY - 22}px)`;
        ghost.style.opacity = "1";
      }
    };

    const up = (e: PointerEvent) => {
      const el = slotEl(document.elementFromPoint(e.clientX, e.clientY));
      if (moved && game.drag) {
        if (el?.dataset.bag && el.dataset.index != null) game.dropTo(el.dataset.bag as BagId, Number(el.dataset.index));
        else game.cancelDrag();
        start = null;
        moved = false;
        return;
      }
      if (!moved && start?.bag === "consumable" && !game.drag) game.tapHotbar(start.index);
      start = null;
      moved = false;
    };

    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") game.cancelDrag();
    };

    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      window.removeEventListener("keydown", key);
    };
  }, [game]);
}

function SlotCell({
  slot,
  bag,
  index,
  selected,
  weapon,
  hotkey,
  game,
}: {
  slot: InvSlot;
  bag: BagId;
  index: number;
  selected?: boolean;
  weapon?: boolean;
  hotkey?: string;
  game: NeonRaid;
}) {
  const def = slot ? item(slot.def) : null;
  return (
    <div
      data-inv-slot="1"
      data-bag={bag}
      data-index={String(index)}
      draggable={!!slot}
      onDragStart={(e) => {
        if (!slot) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", `${bag}:${index}`);
        e.dataTransfer.effectAllowed = "move";
        game.beginDrag(bag, index);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        game.dropTo(bag, index);
      }}
      onDragEnd={() => game.cancelDrag()}
      className={`relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-surface/80 ${
        weapon ? "border-cyan ring-1 ring-cyan" : selected ? "border-magenta/70" : def ? RARITY_TINT[def.rarity] : "border-border"
      }`}
    >
      {def && slot ? (
        <>
          <ItemIcon defId={def.id} className="h-[85%] w-[85%]" />
          <span className="absolute bottom-0 right-0.5 font-mono text-[9px] text-fg">
            {item(slot.def).stack > 1 || slot.qty > 1 ? slot.qty : ""}
          </span>
        </>
      ) : (
        <span className="absolute inset-1 rounded-sm border border-dashed border-border/80" />
      )}
      {hotkey && <span className="absolute left-0.5 top-0 font-mono text-[9px] text-subtle">{hotkey}</span>}
    </div>
  );
}

export function HotbarBar({ hud, game }: { hud: HudSnap; game: NeonRaid }) {
  const slots = hud.consumable.length >= CON_N ? hud.consumable : [...hud.consumable, ...Array.from({ length: CON_N - hud.consumable.length }, () => null)];
  return (
    <div className="pointer-events-auto mx-auto flex w-max max-w-full items-end justify-center gap-2">
      <GearSlot label="WEP" hint="LMB fires" bag="weapon" slot={hud.weapon} index={0} game={game} />
      <GearSlot label="ARM" hint={hud.armorMax ? `${hud.armorHp}/${hud.armorMax} plates` : "soaks hits"} bag="armor" slot={hud.armor} index={0} game={game} />
      <GearSlot label="MOD" hint="upgrades gun" bag="mod" slot={hud.mod} index={0} game={game} />
      <div className="mx-1 h-12 w-px bg-border" />
      {slots.slice(0, CON_N).map((slot, i) => (
        <div key={i} className="w-11">
          <p className="mb-0.5 text-center font-mono text-[9px] text-subtle">{i + 1}</p>
          <div className="h-11 w-11">
            <SlotCell slot={slot} bag="consumable" index={i} selected={hud.equipped === i} game={game} />
          </div>
        </div>
      ))}
    </div>
  );
}

function GearSlot({
  label,
  hint,
  bag,
  slot,
  index,
  game,
}: {
  label: string;
  hint: string;
  bag: BagId;
  slot: InvSlot;
  index: number;
  game: NeonRaid;
}) {
  return (
    <div className="w-14">
      <p className="text-center font-mono text-[9px] tracking-[0.18em] text-cyan">{label}</p>
      <div className="h-12 w-12 mx-auto">
        <SlotCell slot={slot} bag={bag} index={index} game={game} />
      </div>
      <p className="mt-0.5 text-center text-[9px] leading-tight text-subtle">{hint}</p>
    </div>
  );
}

function Grid({
  slots,
  bag,
  game,
  cols,
  toBar,
}: {
  slots: InvSlot[];
  bag: BagId;
  game: NeonRaid;
  cols: number;
  toBar?: boolean;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {slots.map((slot, i) => (
        <div key={`${bag}-${i}`} className="relative">
          <SlotCell slot={slot} bag={bag} index={i} game={game} />
          {toBar && slot && (
            <button
              type="button"
              className="absolute -right-1 -top-1 z-10 h-5 rounded-sm bg-cyan px-1 font-mono text-[9px] font-semibold text-cyan-fg"
              onClick={(e) => {
                e.stopPropagation();
                game.sendToHotbar(bag, i);
              }}
            >
              +
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function InvGhost({ game }: { game: NeonRaid }) {
  const ref = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState<string | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const d = game.drag;
      const id = d ? game.bagOf(d.from)[d.index]?.def ?? null : null;
      setHeld((prev) => (prev === id ? prev : id));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game]);
  return (
    <>
      <div
        id="inv-ghost"
        ref={ref}
        className="pointer-events-none fixed left-0 top-0 z-50 h-11 w-11 overflow-hidden rounded-md border border-cyan bg-surface/90 shadow-lg"
        style={{ opacity: held ? 1 : 0, transform: "translate(-80px,-80px)" }}
      >
        {held ? <ItemIcon defId={held} className="h-full w-full" /> : null}
      </div>
      {held && (
        <p className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-cyan bg-bg/80 px-3 py-1 font-mono text-[11px] text-cyan">
          Drop on WEP / ARM / MOD / 1–4 · Esc cancel
        </p>
      )}
    </>
  );
}

export function HideoutPanel({ hud, game }: { hud: HudSnap; game: NeonRaid }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid grid-rows-[auto_minmax(0,1fr)] gap-3 p-4 pb-36 sm:p-5 sm:pb-40">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-cyan">{hud.district}</p>
          <p className="font-display text-4xl font-semibold tracking-display text-fg sm:text-5xl">NEON RAID</p>
          <p className="mt-2 text-sm text-muted">
            <span className="text-cyan">{hud.missionTitle}</span> — {hud.missionBrief}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
            Lv {hud.level} · {hud.credits} pts banked
          </p>
          <p className="mt-1 font-mono text-[11px] text-subtle">
            {hud.extracts} extracts · {hud.deaths} losses
          </p>
          <div className="ml-auto mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-cyan" style={{ width: `${Math.min(100, (hud.xp / hud.xpNext) * 100)}%` }} />
          </div>
        </div>
      </header>

      <div className="grid min-h-0 gap-3 md:grid-cols-[220px_minmax(0,1fr)_240px]">
        <div className="pointer-events-auto flex min-h-0 flex-col rounded-lg border border-border bg-bg/80 p-3 backdrop-blur-sm">
          <p className="text-sm leading-relaxed text-muted">
          Click a stash item, then a labelled slot. Weapons go on WEP, vests on ARM, chips on MOD, stims/nades on 1–4.
          </p>
          <div className="mt-auto flex flex-col gap-2 pt-3">
            <button
              type="button"
              className="h-11 rounded-full bg-cyan px-5 text-sm font-semibold text-cyan-fg"
              onClick={() => game.startRun(hud.seed)}
            >
              Jack in
            </button>
            <button
              type="button"
              className="h-10 rounded-full border border-border bg-surface px-5 text-sm text-fg"
              onClick={() => game.rerollSeed()}
            >
              New seed
            </button>
            <p className="text-[11px] leading-relaxed text-subtle">WEP mouse-fires · ARM soaks hits · MOD chips the gun · 1–4 uses stims/nades</p>
          </div>
        </div>

        <div className="pointer-events-auto min-h-0 overflow-auto rounded-lg border border-border bg-bg/80 p-3 backdrop-blur-sm">
          <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-cyan">Stash</p>
          <Grid slots={hud.stash} bag="stash" game={game} cols={5} toBar />
        </div>

        <div className="pointer-events-auto min-h-0 overflow-auto rounded-lg border border-border bg-bg/80 p-3 backdrop-blur-sm">
          <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-cyan">Requisitions</p>
          <div className="grid grid-cols-3 gap-1.5 md:grid-cols-2">
            {HIDEOUT_STOCK.map((id) => {
              const d = item(id);
              const locked = hud.level < d.unlock;
              const broke = hud.credits < d.price;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={locked || broke}
                  onClick={() => game.buyHideout(id)}
                  className="rounded-md border border-border bg-surface p-1 text-left disabled:opacity-40"
                >
                  <ItemIcon defId={id} className="mx-auto h-10 w-10 rounded" />
                  <p className="mt-1 truncate text-[10px] text-fg">{d.name}</p>
                  <p className="font-mono text-[10px] text-subtle">{locked ? `Lv ${d.unlock}` : `${d.price}`}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RunInventory({ hud, game }: { hud: HudSnap; game: NeonRaid }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-bg/70 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan">Raid bag · not banked yet</p>
          <button type="button" className="text-xs text-muted" onClick={() => game.closeModal()}>
            Close
          </button>
        </div>
        <Grid slots={hud.bag} bag="bag" game={game} cols={6} toBar />
        <p className="mb-2 mt-4 text-[10px] uppercase tracking-[0.22em] text-subtle">Loadout</p>
        <HotbarBar hud={hud} game={game} />
        <p className="mt-3 font-mono text-[11px] text-muted">Unextracted loot {hud.lootValue} pts</p>
      </div>
    </div>
  );
}

export function ShopPanel({ hud, game }: { hud: HudSnap; game: NeonRaid }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-bg/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan">Street vendor · spend run pts</p>
          <button type="button" className="text-xs text-muted" onClick={() => game.closeModal()}>
            Close
          </button>
        </div>
        <p className="mb-3 font-mono text-xs text-muted">{hud.score} pts on you</p>
        <div className="grid grid-cols-5 gap-2">
          {hud.shopStock.map((row) => {
            const d = item(row.def);
            const broke = hud.score < row.price;
            return (
              <button
                key={row.def}
                type="button"
                disabled={broke}
                onClick={() => game.buyShop(row.def)}
                className="rounded-md border border-border bg-bg p-1 disabled:opacity-40"
              >
                <ItemIcon defId={d.id} className="mx-auto h-14 w-14 rounded" />
                <p className="mt-1 truncate text-[10px] text-fg">{d.name}</p>
                <p className="font-mono text-[10px] text-cyan">{row.price}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { CON_N };
