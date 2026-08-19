import { o as __toESM } from "../_runtime.mjs";
import { R as require_react, _ as Link, y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Play, i as RotateCcw, n as User, o as Pause, s as CloudRain, t as Wind } from "../_libs/lucide-react.mjs";
import { r as signOut, t as authClient } from "./client-C3_ZmG5o.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-_SNSACFu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled (default) -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	const { data, isPending } = authClient.useSession();
	const user = data?.user;
	return {
		user: user ? {
			id: user.id,
			displayName: user.name ?? null,
			primaryEmail: user.email ?? null,
			profileImageUrl: user.image ?? null,
			isDevFallback: false
		} : null,
		isPending
	};
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
/** Render children only when a user is present (real session, or the disabled-auth dev user). */
function SignedIn({ children }) {
	const { user } = useCurrentUserState();
	return user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children }) : null;
}
/**
* Render children only once we KNOW the visitor is signed out (`isPending` has
* cleared and there is no user). Hidden while the session is still loading.
*/
function SignedOut({ children }) {
	const { user, isPending } = useCurrentUserState();
	if (isPending || user) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of).
*/
function UserButton() {
	const user = useCurrentUser();
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => void signOut(),
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline",
				children: "Sign out"
			})
		]
	});
}
function Overlay({ world }) {
	const [paused, setPaused] = (0, import_react.useState)(false);
	const [rain, setRain] = (0, import_react.useState)(false);
	const [wind, setWind] = (0, import_react.useState)(true);
	const { isPending } = useCurrentUserState();
	(0, import_react.useEffect)(() => {
		world?.setPaused(paused);
	}, [world, paused]);
	(0, import_react.useEffect)(() => {
		world?.setRain(rain);
	}, [world, rain]);
	(0, import_react.useEffect)(() => {
		world?.setWind(wind);
	}, [world, wind]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-0 z-10 text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-start justify-between gap-4 p-4 sm:p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-w-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-3xl font-medium tracking-display text-fg sm:text-4xl",
						children: "Lagoon"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 max-w-[16rem] text-sm leading-snug text-muted sm:max-w-none",
						children: "Draw on the water. Drag the glass sphere. Drag the sky to look around."
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-auto",
					children: isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-9 w-9 animate-pulse rounded-full bg-fg/10" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedIn, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-xl border border-border bg-bg/55 px-3 py-2 backdrop-blur-sm [&_button]:text-muted [&_span]:text-fg",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {})
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedOut, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/login",
						className: "inline-flex h-11 items-center gap-2 rounded-full border border-border bg-bg/55 px-4 text-sm font-medium text-fg backdrop-blur-sm transition-opacity duration-(--motion-quick) hover:opacity-90",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, {
							className: "size-4",
							strokeWidth: 1.75
						}), "Sign in"]
					}) })] })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-auto absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2 sm:bottom-6 sm:left-6 sm:right-auto",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
						pressed: rain,
						onClick: () => setRain((v) => !v),
						label: "Rain",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudRain, {
							className: "size-4",
							strokeWidth: 1.75
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
						pressed: wind,
						onClick: () => setWind((v) => !v),
						label: "Wind",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wind, {
							className: "size-4",
							strokeWidth: 1.75
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
						pressed: paused,
						onClick: () => setPaused((v) => !v),
						label: paused ? "Paused" : "Pause",
						children: paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
							className: "size-4",
							strokeWidth: 1.75
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, {
							className: "size-4",
							strokeWidth: 1.75
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => world?.reset(),
						className: "inline-flex h-11 items-center gap-2 rounded-full border border-border bg-bg/55 px-4 text-sm font-medium text-fg backdrop-blur-sm transition-opacity duration-(--motion-quick) hover:opacity-90",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {
							className: "size-4",
							strokeWidth: 1.75
						}), "Reset"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "absolute bottom-4 right-4 hidden max-w-[14rem] text-right text-xs leading-relaxed text-subtle sm:block sm:bottom-6 sm:right-6",
				children: "Space pause · R rain · N wind · G gravity · hold L to aim the sun"
			})
		]
	});
}
function Toggle({ pressed, onClick, label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		"aria-pressed": pressed,
		onClick,
		className: "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium backdrop-blur-sm transition-[background,opacity,border-color] duration-(--motion-quick) " + (pressed ? "border-border-strong bg-fg text-accent-fg" : "border-border bg-bg/55 text-fg hover:opacity-90"),
		children: [children, label]
	});
}
function WaterCanvas({ onReady }) {
	const canvasRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!canvasRef.current) return;
		let disposed = false;
		let handle = null;
		import("./world-DJCjwgo4.mjs").then(({ WaterWorld }) => {
			if (disposed || !canvasRef.current) return;
			new WaterWorld(canvasRef.current, { onReady: (api) => {
				if (disposed) {
					api.dispose();
					return;
				}
				handle = api;
				onReady(api);
			} });
		});
		return () => {
			disposed = true;
			handle?.dispose();
		};
	}, [onReady]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref: canvasRef,
		className: "absolute inset-0 h-full w-full touch-none",
		"aria-label": "Interactive lagoon"
	});
}
function Home() {
	const [world, setWorld] = (0, import_react.useState)(null);
	const onReady = (0, import_react.useCallback)((handle) => {
		setWorld(handle);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative h-dvh w-full overflow-hidden bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WaterCanvas, { onReady }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay, { world })]
	});
}
//#endregion
export { Home as component };
