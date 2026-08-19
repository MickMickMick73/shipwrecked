import { _ as Link, y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as ArrowLeft } from "../_libs/lucide-react.mjs";
import { n as GROK_PROVIDERS } from "./router-s-6MzCZO.mjs";
import { n as signIn } from "./client-C3_ZmG5o.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-DZyzgbtr.js
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-dvh place-items-center bg-bg px-6 text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/",
					className: "mb-8 inline-flex items-center gap-2 text-sm text-muted transition-opacity duration-(--motion-quick) hover:opacity-80",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, {
						className: "size-4",
						strokeWidth: 1.75
					}), "Back to the lagoon"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl font-medium tracking-display",
					children: "Sign in"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm leading-relaxed text-muted",
					children: "Keep a place on the water. Sign in with Google or X."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 space-y-3",
					children: GROK_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => void signIn(p.providerId, { callbackURL: "/" }),
						className: "h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm font-medium text-fg transition-opacity duration-(--motion-quick) hover:opacity-90",
						children: ["Continue with ", p.label]
					}, p.providerId))
				})
			]
		})
	});
}
//#endregion
export { Login as component };
