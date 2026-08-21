import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-opacity duration-(--motion-quick) hover:opacity-80"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Back to the raid
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-display">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">Keep a name on the grid. Google or X.</p>
        <div className="mt-8 space-y-3">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => void signIn(p.providerId, { callbackURL: "/" })}
                className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm font-medium text-fg transition-opacity duration-(--motion-quick) hover:opacity-90"
              >
                Continue with {p.label}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
      </div>
    </main>
  );
}
