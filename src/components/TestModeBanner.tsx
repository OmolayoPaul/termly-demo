export function TestModeBanner() {
  return (
    <div className="sticky top-0 z-[100] w-full bg-yellow-300 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-yellow-900 shadow">
      🟡 Demo Mode — Payments simulated with real Nomba flow. Switch to LIVE credentials for real transactions.
    </div>
  );
}

export function NombaFooter() {
  return (
    <footer className="border-t border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
      Powered by{" "}
      <span className="font-semibold text-foreground">Nomba</span> · Termly © {new Date().getFullYear()}
    </footer>
  );
}

export function SecuredByNomba({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-success/30 bg-success-soft px-3 py-1 text-xs font-medium text-success ${className}`}
    >
      <span>🔒</span> Secured by Nomba
    </div>
  );
}